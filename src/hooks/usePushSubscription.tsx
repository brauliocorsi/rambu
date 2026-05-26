import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import {
  VAPID_PUBLIC_KEY,
  arrayBufferToBase64,
  detectDeviceLabel,
  detectPlatform,
  urlBase64ToUint8Array,
} from "@/lib/pushConfig";

export interface PushDiagnostics {
  serviceWorkerSupported: boolean;
  pushManagerSupported: boolean;
  notificationSupported: boolean;
  permission: NotificationPermission | "unsupported";
  swActive: boolean;
  hasSubscription: boolean;
  endpoint: string | null;
  platform: string;
  isIOS: boolean;
  isStandalone: boolean;
  canActivate: boolean;
  blockerReason: string | null;
}

const SW_PATH = "/sw.js";

async function getRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) return null;
  try {
    const existing = await navigator.serviceWorker.getRegistration();
    if (existing) return existing;
    return await navigator.serviceWorker.register(SW_PATH);
  } catch {
    return null;
  }
}

export function usePushSubscription() {
  const { user } = useAuth();
  const [diag, setDiag] = useState<PushDiagnostics>(() => buildInitialDiag());
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    const d = buildInitialDiag();
    if (d.serviceWorkerSupported) {
      const reg = await navigator.serviceWorker.getRegistration();
      d.swActive = !!reg?.active;
      if (reg) {
        const sub = await reg.pushManager.getSubscription().catch(() => null);
        d.hasSubscription = !!sub;
        d.endpoint = sub?.endpoint ?? null;
      }
    }
    d.canActivate = computeCanActivate(d);
    d.blockerReason = computeBlocker(d);
    setDiag(d);
  }, []);

  useEffect(() => {
    refresh();
    const onVis = () => refresh();
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [refresh]);

  const subscribe = useCallback(async (): Promise<{ ok: boolean; reason?: string }> => {
    if (!user) return { ok: false, reason: "not_authenticated" };
    if (!diag.serviceWorkerSupported || !diag.pushManagerSupported) {
      return { ok: false, reason: "unsupported" };
    }
    if (diag.isIOS && !diag.isStandalone) {
      return { ok: false, reason: "ios_requires_install" };
    }

    setLoading(true);
    try {
      const reg = await getRegistration();
      if (!reg) return { ok: false, reason: "sw_failed" };

      const permission = await Notification.requestPermission();
      if (permission !== "granted") return { ok: false, reason: "permission_denied" };

      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
        });
      }

      const json = sub.toJSON() as any;
      const p256dh = json.keys?.p256dh ?? arrayBufferToBase64(sub.getKey("p256dh"));
      const auth = json.keys?.auth ?? arrayBufferToBase64(sub.getKey("auth"));

      const { error } = await supabase.from("push_subscriptions").upsert(
        {
          user_id: user.id,
          endpoint: sub.endpoint,
          p256dh,
          auth,
          user_agent: navigator.userAgent.slice(0, 500),
          platform: detectPlatform(),
          device_label: detectDeviceLabel(),
          is_active: true,
          failure_count: 0,
        },
        { onConflict: "user_id,endpoint" }
      );

      if (error) return { ok: false, reason: error.message };
      await refresh();
      return { ok: true };
    } catch (e: any) {
      return { ok: false, reason: e?.message ?? "unknown" };
    } finally {
      setLoading(false);
    }
  }, [user, diag, refresh]);

  const unsubscribe = useCallback(async (): Promise<boolean> => {
    if (!user) return false;
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker?.getRegistration?.();
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await supabase
          .from("push_subscriptions")
          .update({ is_active: false })
          .eq("user_id", user.id)
          .eq("endpoint", sub.endpoint);
        await sub.unsubscribe();
      }
      await refresh();
      return true;
    } catch {
      return false;
    } finally {
      setLoading(false);
    }
  }, [user, refresh]);

  const sendTestPush = useCallback(async (): Promise<{ ok: boolean; detail?: string }> => {
    try {
      const { data, error } = await supabase.functions.invoke("send-push-notification", {
        body: { test: true },
      });
      if (error) return { ok: false, detail: error.message };
      return { ok: true, detail: JSON.stringify(data) };
    } catch (e: any) {
      return { ok: false, detail: e?.message ?? "unknown" };
    }
  }, []);

  return { diag, loading, subscribe, unsubscribe, sendTestPush, refresh };
}

function buildInitialDiag(): PushDiagnostics {
  const swSupported = typeof navigator !== "undefined" && "serviceWorker" in navigator;
  const pmSupported = typeof window !== "undefined" && "PushManager" in window;
  const notifSupported = typeof window !== "undefined" && "Notification" in window;
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (typeof navigator !== "undefined" && (navigator as any).platform === "MacIntel" && (navigator as any).maxTouchPoints > 1);
  const isStandalone =
    typeof window !== "undefined" &&
    (window.matchMedia?.("(display-mode: standalone)").matches || (navigator as any).standalone === true);

  const d: PushDiagnostics = {
    serviceWorkerSupported: swSupported,
    pushManagerSupported: pmSupported,
    notificationSupported: notifSupported,
    permission: notifSupported ? Notification.permission : "unsupported",
    swActive: false,
    hasSubscription: false,
    endpoint: null,
    platform: typeof navigator !== "undefined" ? detectPlatform() : "unknown",
    isIOS,
    isStandalone,
    canActivate: false,
    blockerReason: null,
  };
  d.canActivate = computeCanActivate(d);
  d.blockerReason = computeBlocker(d);
  return d;
}

function computeCanActivate(d: PushDiagnostics): boolean {
  if (!d.serviceWorkerSupported || !d.pushManagerSupported || !d.notificationSupported) return false;
  if (d.isIOS && !d.isStandalone) return false;
  if (d.permission === "denied") return false;
  return true;
}

function computeBlocker(d: PushDiagnostics): string | null {
  if (!d.notificationSupported) return "Este navegador não suporta notificações.";
  if (!d.serviceWorkerSupported) return "Service Worker indisponível neste navegador.";
  if (!d.pushManagerSupported) return "Push API indisponível neste navegador.";
  if (d.isIOS && !d.isStandalone) return "No iPhone/iPad, instale o app na Tela Inicial para receber push.";
  if (d.permission === "denied") return "Permissão de notificações foi bloqueada. Habilite nas configurações do navegador.";
  return null;
}