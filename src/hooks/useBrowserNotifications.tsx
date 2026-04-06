import { useEffect, useRef, useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useNotificationPreferences } from "./useProfile";
import { useWorkspaceContext } from "@/contexts/WorkspaceContext";
import { useQueryClient } from "@tanstack/react-query";

interface NotificationOptions {
  title: string;
  body: string;
  icon?: string;
  tag?: string;
  url?: string;
  onClick?: () => void;
}

// Shared audio unlock state — persists across hook instances
let audioUnlocked = false;
let sharedAudioElement: HTMLAudioElement | null = null;

function getOrCreateAudio(): HTMLAudioElement {
  if (!sharedAudioElement) {
    sharedAudioElement = new Audio();
    sharedAudioElement.preload = "auto";
    sharedAudioElement.src = "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3";
  }
  return sharedAudioElement;
}

// Fallback: play a beep using Web Audio API (works even when Audio element fails)
function playWebAudioBeep(volume: number) {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 800;
    osc.type = "sine";
    gain.gain.value = volume * 0.3;
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
    osc.stop(ctx.currentTime + 0.3);
  } catch {
    // Web Audio API not available
  }
}

// Unlock audio on first user interaction (required by iOS Safari and some browsers)
function setupAudioUnlock() {
  if (audioUnlocked) return;

  const unlock = () => {
    if (audioUnlocked) return;
    const audio = getOrCreateAudio();
    // Play + immediately pause to unlock the element
    const p = audio.play();
    if (p) {
      p.then(() => {
        audio.pause();
        audio.currentTime = 0;
        audioUnlocked = true;
      }).catch(() => {
        // Still locked, will retry on next interaction
      });
    }
    // Also unlock Web Audio API
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      ctx.resume().then(() => ctx.close()).catch(() => {});
    } catch {}
  };

  const events = ["click", "touchstart", "keydown"];
  const handler = () => {
    unlock();
    if (audioUnlocked) {
      events.forEach((e) => document.removeEventListener(e, handler, true));
    }
  };
  events.forEach((e) => document.addEventListener(e, handler, true));
}

async function waitForServiceWorkerReady(timeout = 4000): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) return null;

  try {
    return await Promise.race([
      navigator.serviceWorker.ready,
      new Promise<null>((resolve) => window.setTimeout(() => resolve(null), timeout)),
    ]);
  } catch {
    return null;
  }
}

export function useBrowserNotifications() {
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspaceContext();
  const queryClient = useQueryClient();
  const { data: notifPrefs } = useNotificationPreferences();
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [isSupported, setIsSupported] = useState(false);
  const channelMessagesRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const channelDMsRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const channelGroupDMsRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Use refs for prefs so realtime callbacks always see latest values
  const notifPrefsRef = useRef(notifPrefs);
  const permissionRef = useRef(permission);
  notifPrefsRef.current = notifPrefs;
  permissionRef.current = permission;

  useEffect(() => {
    if ("Notification" in window) {
      setIsSupported(true);
      setPermission(Notification.permission);
    }

    // Setup audio unlock on first user interaction
    setupAudioUnlock();

    // Preload audio
    getOrCreateAudio();

    // Re-check permission when app regains focus (e.g. user changed in iOS Settings)
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && "Notification" in window) {
        setPermission(Notification.permission);
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!isSupported || !("Notification" in window)) return false;

    try {
      await waitForServiceWorkerReady();
      const result = await Notification.requestPermission();
      setPermission(result);
      return result === "granted";
    } catch (error) {
      console.error("Error requesting notification permission:", error);
      return false;
    }
  }, [isSupported]);

  const playSound = useCallback(() => {
    const prefs = notifPrefsRef.current;
    const soundEnabled = prefs?.sound_enabled ?? true;
    const soundVolume = prefs?.sound_volume ?? 0.5;

    if (!soundEnabled) return;

    const audio = getOrCreateAudio();
    audio.volume = soundVolume * 0.3;
    audio.currentTime = 0;
    audio.play().catch(() => {
      // HTMLAudioElement failed (CORS, autoplay policy, etc.) — use Web Audio API fallback
      playWebAudioBeep(soundVolume);
    });
  }, []);

  const showNotification = useCallback(
    ({ title, body, icon, tag, url = "/", onClick }: NotificationOptions) => {
      // Check permission at call time
      if (permissionRef.current !== "granted") return;
      if (notifPrefsRef.current && notifPrefsRef.current.push_notifications === false) return;

      const notifIcon = icon || "/icons/icon-192x192.png";
      const notifOptions = {
        body,
        icon: notifIcon,
        tag,
        badge: "/icons/icon-72x72.png",
        data: { url },
        renotify: true,
        silent: true, // We play our own sound
      };

      // Try Service Worker first (more reliable on macOS Safari & PWAs)
      // Safari may not have .controller on first load, so check .ready instead
      if ("serviceWorker" in navigator) {
        waitForServiceWorkerReady()
          .then((reg) => {
            // Check if showNotification is available (Safari PWA)
            if (reg?.showNotification) {
              return reg.showNotification(title, notifOptions);
            }
            throw new Error("showNotification not available");
          })
          .catch(() => {
            // SW notification failed, fall back to Notification API
            showNativeNotification(title, notifOptions, onClick);
          });
      } else {
        showNativeNotification(title, notifOptions, onClick);
      }
    },
    []
  );

  const showNativeNotification = useCallback(
    (title: string, options: Record<string, any>, onClick?: () => void) => {
      try {
        const notification = new Notification(title, options);
        notification.onclick = () => {
          window.focus();
          notification.close();
          onClick?.();
        };
      } catch {
        // Notification constructor not available
      }
    },
    []
  );

  useEffect(() => {
    if (!user || !currentWorkspace?.id) return;

    channelMessagesRef.current = supabase
      .channel("global-messages-notifications")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        async (payload) => {
          if (payload.new.user_id === user.id) return;

          const prefs = notifPrefsRef.current;
          if (prefs && prefs.channel_notifications === false) return;

          const [{ data: senderProfile }, { data: channel }] = await Promise.all([
            supabase.from("profiles").select("display_name, avatar_url").eq("id", payload.new.user_id).single(),
            supabase.from("channels").select("name, workspace_id").eq("id", payload.new.channel_id).single(),
          ]);

          if (channel?.workspace_id !== currentWorkspace.id) return;

          // Always play sound regardless of tab visibility
          playSound();

          // Show browser notification only when tab is not visible
          if (document.visibilityState !== "visible") {
            showNotification({
              title: `${senderProfile?.display_name || "Alguém"} em #${channel?.name || "canal"}`,
              body: payload.new.content?.substring(0, 100) || "",
              icon: senderProfile?.avatar_url || undefined,
              tag: `channel-${payload.new.channel_id}`,
            });
          }

          queryClient.invalidateQueries({ queryKey: ["notifications", user.id] });
          queryClient.invalidateQueries({ queryKey: ["notifications_count", user.id] });
          queryClient.invalidateQueries({ queryKey: ["unread-channel-counts"] });
          queryClient.invalidateQueries({ queryKey: ["unread-feed"] });
        }
      )
      .subscribe();

    channelDMsRef.current = supabase
      .channel("global-dm-notifications")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "dm_messages" },
        async (payload) => {
          if (payload.new.user_id === user.id) return;

          const prefs = notifPrefsRef.current;
          if (prefs && prefs.dm_notifications === false) return;

          const [{ data: senderProfile }, { data: dm }] = await Promise.all([
            supabase.from("profiles").select("display_name, avatar_url").eq("id", payload.new.user_id).single(),
            supabase.from("direct_messages").select("user1_id, user2_id, workspace_id").eq("id", payload.new.dm_id).single(),
          ]);

          if (!dm) return;
          if (dm.user1_id !== user.id && dm.user2_id !== user.id) return;
          if (dm.workspace_id !== currentWorkspace.id) return;

          // Always play sound regardless of tab visibility
          playSound();

          // Show browser notification only when tab is not visible
          if (document.visibilityState !== "visible") {
            showNotification({
              title: `Nova mensagem de ${senderProfile?.display_name || "Alguém"}`,
              body: payload.new.content?.substring(0, 100) || "",
              icon: senderProfile?.avatar_url || undefined,
              tag: `dm-${payload.new.dm_id}`,
            });
          }

          queryClient.invalidateQueries({ queryKey: ["notifications", user.id] });
          queryClient.invalidateQueries({ queryKey: ["notifications_count", user.id] });
          queryClient.invalidateQueries({ queryKey: ["unread-dm-counts"] });
          queryClient.invalidateQueries({ queryKey: ["unread-feed"] });
          queryClient.invalidateQueries({ queryKey: ["direct-messages"] });
        }
      )
      .subscribe();

    // Subscribe to group DM messages
    channelGroupDMsRef.current = supabase
      .channel("global-group-dm-notifications")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "dm_group_messages" },
        async (payload) => {
          if (payload.new.user_id === user.id) return;

          const prefs = notifPrefsRef.current;
          if (prefs && prefs.dm_notifications === false) return;

          // Verify user is a member of this group
          const { data: membership } = await supabase
            .from("dm_group_members")
            .select("id")
            .eq("group_id", payload.new.group_id)
            .eq("user_id", user.id)
            .maybeSingle();

          if (!membership) return;

          // Check group belongs to current workspace
          const { data: group } = await supabase
            .from("dm_groups")
            .select("name, workspace_id")
            .eq("id", payload.new.group_id)
            .single();

          if (group?.workspace_id !== currentWorkspace.id) return;

          const { data: senderProfile } = await supabase
            .from("profiles")
            .select("display_name, avatar_url")
            .eq("id", payload.new.user_id)
            .single();

          playSound();

          if (document.visibilityState !== "visible") {
            showNotification({
              title: `${senderProfile?.display_name || "Alguém"} em ${group?.name || "Grupo"}`,
              body: payload.new.content?.substring(0, 100) || "",
              icon: senderProfile?.avatar_url || undefined,
              tag: `group-${payload.new.group_id}`,
            });
          }

          queryClient.invalidateQueries({ queryKey: ["notifications", user.id] });
          queryClient.invalidateQueries({ queryKey: ["unread-feed"] });
        }
      )
      .subscribe();

    return () => {
      if (channelMessagesRef.current) supabase.removeChannel(channelMessagesRef.current);
      if (channelDMsRef.current) supabase.removeChannel(channelDMsRef.current);
      if (channelGroupDMsRef.current) supabase.removeChannel(channelGroupDMsRef.current);
    };
  }, [user?.id, currentWorkspace?.id, showNotification, playSound, queryClient]);

  const sendTestNotification = useCallback(async () => {
    if ("serviceWorker" in navigator) {
      try {
        const reg = await waitForServiceWorkerReady();
        if (reg?.showNotification) {
          await reg.showNotification("Rambu", {
            body: "Notificações ativadas com sucesso! 🎉",
            icon: "/icons/icon-192x192.png",
            badge: "/icons/icon-72x72.png",
            data: { url: "/" },
          });
          return true;
        }
      } catch {}
    }
    // Fallback to Notification API
    try {
      new Notification("Rambu", {
        body: "Notificações ativadas com sucesso! 🎉",
        icon: "/icons/icon-192x192.png",
      });
      return true;
    } catch {
      return false;
    }
  }, []);

  return {
    isSupported,
    permission,
    isEnabled: permission === "granted" && (notifPrefs?.push_notifications ?? true),
    requestPermission,
    showNotification,
    sendTestNotification,
  };
}
