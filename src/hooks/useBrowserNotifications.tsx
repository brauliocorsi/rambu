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
  onClick?: () => void;
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
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if ("Notification" in window) {
      setIsSupported(true);
      setPermission(Notification.permission);
    }

    audioRef.current = new Audio("https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3");
    audioRef.current.preload = "auto";

    return () => {
      audioRef.current = null;
    };
  }, []);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!isSupported) return false;
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result === "granted";
    } catch (error) {
      console.error("Error requesting notification permission:", error);
      return false;
    }
  }, [isSupported]);

  const playSound = useCallback(() => {
    if (notifPrefs?.sound_enabled && audioRef.current) {
      audioRef.current.volume = (notifPrefs.sound_volume || 0.5) * 0.3;
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
    }
  }, [notifPrefs?.sound_enabled, notifPrefs?.sound_volume]);

  const showNotification = useCallback(
    ({ title, body, icon, tag, onClick }: NotificationOptions) => {
      try {
        const notification = new Notification(title, {
          body,
          icon: icon || "/icons/icon-192x192.png",
          tag,
          badge: "/icons/icon-72x72.png",
          silent: true,
        });
        notification.onclick = () => {
          window.focus();
          notification.close();
          onClick?.();
        };
        setTimeout(() => notification.close(), 5000);
      } catch (error) {
        console.error("Error showing notification:", error);
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
          if (!notifPrefs?.channel_notifications) return;

          const [{ data: senderProfile }, { data: channel }] = await Promise.all([
            supabase.from("profiles").select("display_name, avatar_url").eq("id", payload.new.user_id).single(),
            supabase.from("channels").select("name, workspace_id").eq("id", payload.new.channel_id).single(),
          ]);

          if (channel?.workspace_id !== currentWorkspace.id) return;

          playSound();

          if (document.visibilityState !== "visible" && permission === "granted") {
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
          if (!notifPrefs?.dm_notifications) return;

          const [{ data: senderProfile }, { data: dm }] = await Promise.all([
            supabase.from("profiles").select("display_name, avatar_url").eq("id", payload.new.user_id).single(),
            supabase.from("direct_messages").select("user1_id, user2_id, workspace_id").eq("id", payload.new.dm_id).single(),
          ]);

          if (!dm) return;
          if (dm.user1_id !== user.id && dm.user2_id !== user.id) return;
          if (dm.workspace_id !== currentWorkspace.id) return;

          playSound();

          if (document.visibilityState !== "visible" && permission === "granted") {
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
        }
      )
      .subscribe();

    return () => {
      if (channelMessagesRef.current) supabase.removeChannel(channelMessagesRef.current);
      if (channelDMsRef.current) supabase.removeChannel(channelDMsRef.current);
    };
  }, [user?.id, currentWorkspace?.id, notifPrefs, showNotification, playSound, permission]);

  return {
    isSupported,
    permission,
    isEnabled: permission === "granted",
    requestPermission,
    showNotification,
  };
}
