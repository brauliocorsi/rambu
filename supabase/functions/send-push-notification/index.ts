import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY") ?? "";
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY") ?? "";
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") ?? "mailto:admin@rambu.app";

let vapidReady = false;
let vapidError: string | null = null;
try {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    vapidError = "VAPID secrets ausentes (VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY)";
  } else {
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
    vapidReady = true;
  }
} catch (e: any) {
  vapidError = `VAPID inválido: ${e?.message ?? "unknown"}`;
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

interface PushPayload {
  title: string;
  body: string;
  url: string;
  tag: string;
  conversationType?: "dm" | "channel" | "group" | "thread" | "task" | "test";
  conversationId?: string;
  workspaceId?: string;
  icon?: string;
}

async function logDelivery(args: {
  notification_id?: string | null;
  user_id: string;
  push_subscription_id?: string | null;
  status: string;
  error_message?: string | null;
  provider_response?: Record<string, unknown> | null;
}) {
  try {
    await admin.from("notification_delivery_logs").insert({
      notification_id: args.notification_id ?? null,
      user_id: args.user_id,
      push_subscription_id: args.push_subscription_id ?? null,
      status: args.status,
      error_message: args.error_message ?? null,
      provider_response: args.provider_response ?? null,
    });
  } catch (_e) {
    // best-effort
  }
}

async function shouldSkipUser(userId: string, type: string, metadata: Record<string, any>): Promise<string | null> {
  // 1. notification_preferences global
  const { data: prefs } = await admin
    .from("notification_preferences")
    .select("push_notifications, dm_notifications, channel_notifications, mention_notifications")
    .eq("user_id", userId)
    .maybeSingle();

  if (prefs?.push_notifications === false) return "push_disabled_global";
  if (type === "dm" && prefs?.dm_notifications === false) return "dm_muted";
  if (type === "mention" && prefs?.mention_notifications === false) return "mention_muted";
  if (type === "group" && prefs?.dm_notifications === false) return "dm_muted";
  if (type === "channel" && prefs?.channel_notifications === false) return "channel_muted_global";

  // 2. DND no profile
  const { data: profile } = await admin
    .from("profiles")
    .select("do_not_disturb, dnd_until")
    .eq("id", userId)
    .maybeSingle();
  if (profile?.do_not_disturb) {
    if (!profile.dnd_until || new Date(profile.dnd_until).getTime() > Date.now()) {
      return "dnd_active";
    }
  }

  // 3. preferências por canal (mention ou mensagem comum de canal)
  if ((type === "mention" || type === "channel") && metadata?.channel_id) {
    const { data: ch } = await admin
      .from("channel_notification_preferences")
      .select("notification_level, snoozed_until")
      .eq("user_id", userId)
      .eq("channel_id", metadata.channel_id)
      .maybeSingle();
    if (ch?.snoozed_until && new Date(ch.snoozed_until).getTime() > Date.now()) {
      return "channel_snoozed";
    }
    if (ch?.notification_level === "none") return "channel_muted";
    // Para mensagem comum em canal, exigir opt-in 'all'.
    if (type === "channel" && ch?.notification_level !== "all") {
      return "channel_not_subscribed_all";
    }
  }

  return null;
}

function buildPayload(notification: any): PushPayload {
  const md = notification.metadata ?? {};
  let url = "/";
  let conversationType: PushPayload["conversationType"] = "dm";
  let conversationId: string | undefined;

  if (notification.type === "dm" && md.dm_id) {
    url = `/?dm=${md.dm_id}`;
    conversationType = "dm";
    conversationId = md.dm_id;
  } else if (notification.type === "group" && md.group_id) {
    url = `/?group=${md.group_id}`;
    conversationType = "group";
    conversationId = md.group_id;
  } else if (notification.type === "mention" && md.channel_id) {
    url = `/?channel=${md.channel_id}`;
    conversationType = "channel";
    conversationId = md.channel_id;
  } else if (notification.type === "channel" && md.channel_id) {
    url = `/?channel=${md.channel_id}`;
    conversationType = "channel";
    conversationId = md.channel_id;
  } else if (notification.type === "mention" && md.dm_message_id) {
    url = "/";
    conversationType = "dm";
  } else if (notification.type === "task_assigned" && md.channel_id) {
    url = `/?channel=${md.channel_id}`;
    conversationType = "task";
    conversationId = md.task_instance_id;
  }

  const tag = `${conversationType}-${conversationId ?? notification.user_id}`;

  return {
    title: notification.title || "Rambu",
    body: notification.body || "Nova notificação",
    url,
    tag,
    conversationType,
    conversationId,
  };
}

async function sendToUser(userId: string, payload: PushPayload, notificationId: string | null) {
  const { data: subs } = await admin
    .from("push_subscriptions")
    .select("*")
    .eq("user_id", userId)
    .eq("is_active", true);

  if (!subs || subs.length === 0) {
    await logDelivery({ notification_id: notificationId, user_id: userId, status: "no_subscription" });
    return { sent: 0, failed: 0 };
  }

  let sent = 0;
  let failed = 0;

  await Promise.all(
    subs.map(async (sub) => {
      try {
        const result = await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          JSON.stringify(payload),
          { TTL: 60 * 60 * 24 }
        );
        sent++;
        await admin
          .from("push_subscriptions")
          .update({ last_success_at: new Date().toISOString(), failure_count: 0 })
          .eq("id", sub.id);
        await logDelivery({
          notification_id: notificationId,
          user_id: userId,
          push_subscription_id: sub.id,
          status: "sent",
          provider_response: { statusCode: result.statusCode },
        });
      } catch (err: any) {
        failed++;
        const status = err?.statusCode;
        const permanent = status === 404 || status === 410;
        const updates: Record<string, unknown> = {
          last_failure_at: new Date().toISOString(),
          failure_count: (sub.failure_count ?? 0) + 1,
        };
        if (permanent) updates.is_active = false;
        await admin.from("push_subscriptions").update(updates).eq("id", sub.id);
        await logDelivery({
          notification_id: notificationId,
          user_id: userId,
          push_subscription_id: sub.id,
          status: permanent ? "expired" : "failed",
          error_message: err?.body || err?.message || "unknown",
          provider_response: status ? { statusCode: status } : null,
        });
      }
    })
  );

  return { sent, failed };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const mode = body.test === true ? "test" : (body.notification_id ? "notification_id" : "unknown");
    console.log(JSON.stringify({
      stage: "request",
      method: req.method,
      mode,
      has_auth: !!req.headers.get("Authorization"),
      vapid_ready: vapidReady,
    }));

    if (!vapidReady) {
      return new Response(JSON.stringify({ ok: false, stage: "secrets", error: vapidError ?? "vapid_not_configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Modo 1: teste manual (autenticado)
    if (body.test === true) {
      const auth = req.headers.get("Authorization");
      if (!auth) {
        return new Response(JSON.stringify({ ok: false, stage: "auth", error: "missing_authorization" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: auth } },
      });
      const { data: userRes } = await userClient.auth.getUser();
      const userId = userRes?.user?.id;
      if (!userId) {
        return new Response(JSON.stringify({ ok: false, stage: "auth", error: "invalid_token" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const payload: PushPayload = {
        title: "Rambu — Teste",
        body: "Notificação de teste enviada com sucesso 🎉",
        url: "/",
        tag: "test",
        conversationType: "test",
      };
      const result = await sendToUser(userId, payload, null);
      if (result.sent === 0 && result.failed === 0) {
        return new Response(JSON.stringify({ ok: false, stage: "subscription", error: "no_active_subscription" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ ok: true, ...result }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Modo 2: dispatch a partir de uma notification row
    // Exige Authorization Bearer == SERVICE_ROLE_KEY (apenas o trigger DB conhece).
    // Isso bloqueia chamadas anônimas com o anon key público.
    const auth = req.headers.get("Authorization") ?? "";
    const expected = `Bearer ${SERVICE_ROLE_KEY}`;
    if (auth !== expected) {
      return new Response(JSON.stringify({ ok: false, stage: "auth", error: "forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const notificationId: string | undefined = body.notification_id;
    if (!notificationId) {
      return new Response(JSON.stringify({ ok: false, stage: "auth", error: "missing_notification_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: notification, error } = await admin
      .from("notifications")
      .select("*")
      .eq("id", notificationId)
      .maybeSingle();

    if (error || !notification) {
      return new Response(JSON.stringify({ ok: false, stage: "database", error: "notification_not_found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Não enviar push pro próprio autor (já filtrado nas triggers, mas double-check)
    const senderId = notification.metadata?.sender_id;
    if (senderId && senderId === notification.user_id) {
      await logDelivery({
        notification_id: notification.id,
        user_id: notification.user_id,
        status: "skipped_self",
      });
      return new Response(JSON.stringify({ ok: true, skipped: "self" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const skip = await shouldSkipUser(notification.user_id, notification.type, notification.metadata ?? {});
    if (skip) {
      await logDelivery({
        notification_id: notification.id,
        user_id: notification.user_id,
        status: `skipped_${skip}`,
      });
      return new Response(JSON.stringify({ ok: true, skipped: skip }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = buildPayload(notification);
    const result = await sendToUser(notification.user_id, payload, notification.id);

    return new Response(JSON.stringify({ ok: true, ...result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("send-push-notification error", err?.message);
    return new Response(JSON.stringify({ ok: false, stage: "webpush", error: err?.message ?? "internal_error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});