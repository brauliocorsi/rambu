import { useEffect, useRef, useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useNotificationPreferences } from "./useProfile";
import { useWorkspaceContext } from "@/contexts/WorkspaceContext";

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
  const { data: notifPrefs } = useNotificationPreferences();
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [isSupported, setIsSupported] = useState(false);
  const channelMessagesRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const channelDMsRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Check support and permission on mount
  useEffect(() => {
    if ("Notification" in window) {
      setIsSupported(true);
      setPermission(Notification.permission);
    }

    // Preload notification sound
    audioRef.current = new Audio();
    audioRef.current.src = "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleVUCBhmT3vLw2JxqMQYnkvL58deeb0YYIXK84+7m2rN1MB0XfLrm8+jl3sV+MR4bcLDk9uzp5dvQhDYhI3y36PHt6+Xf2Io7JyaBtu3x7uvl39+MPCkph7js8O3r5d/fiz0rKoe46/Dt6+Xf34s9KymHuOvw7evl39+LPSsph7jr8O3r5d/fiz0rKYe46/Dt6+Xf34s9KymHuOvw7evl39+LPSsph7jr8O3r5d/fiz0rKYe46/Dt6+Xf34s9KymHuOvw7evl39+LPSsph7jr8O3r5d/fiz0rKYe46/Dt6+Xf34s9KymHuOvw7evl39+LPSsph7jr8O3r5d/fiz0rKYe46/Dt6+Xf34s9KymHuOvw7evl39+LPSsph7jr8O3r5d/fiz0rKYe46/Dt6+Xf34s9KymHuOvw7evl39+LPQ==";
    
    return () => {
      audioRef.current = null;
    };
  }, []);

  // Request permission
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

  // Play notification sound
  const playSound = useCallback(() => {
    if (notifPrefs?.sound_enabled && audioRef.current) {
      audioRef.current.volume = (notifPrefs.sound_volume || 0.5) * 0.3;
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
    }
  }, [notifPrefs?.sound_enabled, notifPrefs?.sound_volume]);

  // Show notification
  const showNotification = useCallback(
    ({ title, body, icon, tag, onClick }: NotificationOptions) => {
      // Don't show if tab is visible
      if (document.visibilityState === "visible") return;
      
      // Don't show if permission not granted
      if (permission !== "granted") return;

      try {
        const notification = new Notification(title, {
          body,
          icon: icon || "/icons/icon-192x192.png",
          tag,
          badge: "/icons/icon-72x72.png",
          silent: true, // We'll handle sound ourselves
        });

        playSound();

        notification.onclick = () => {
          window.focus();
          notification.close();
          onClick?.();
        };

        // Auto close after 5 seconds
        setTimeout(() => notification.close(), 5000);
      } catch (error) {
        console.error("Error showing notification:", error);
      }
    },
    [permission, playSound]
  );

  // Subscribe to real-time messages for notifications
  useEffect(() => {
    if (!user || !currentWorkspace?.id || permission !== "granted") return;

    // Subscribe to channel messages
    channelMessagesRef.current = supabase
      .channel("global-messages-notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        async (payload) => {
          // Skip own messages
          if (payload.new.user_id === user.id) return;
          
          // Skip if tab is visible
          if (document.visibilityState === "visible") return;

          // Check if channel notifications are enabled
          if (!notifPrefs?.channel_notifications) return;

          // Get sender profile and channel info
          const [{ data: senderProfile }, { data: channel }] = await Promise.all([
            supabase
              .from("profiles")
              .select("display_name, avatar_url")
              .eq("id", payload.new.user_id)
              .single(),
            supabase
              .from("channels")
              .select("name, workspace_id")
              .eq("id", payload.new.channel_id)
              .single(),
          ]);

          // Only notify for current workspace
          if (channel?.workspace_id !== currentWorkspace.id) return;

          const senderName = senderProfile?.display_name || "Alguém";
          const channelName = channel?.name || "canal";
          const content = payload.new.content?.substring(0, 100) || "";

          showNotification({
            title: `${senderName} em #${channelName}`,
            body: content,
            icon: senderProfile?.avatar_url || undefined,
            tag: `channel-${payload.new.channel_id}`,
          });
        }
      )
      .subscribe();

    // Subscribe to DM messages
    channelDMsRef.current = supabase
      .channel("global-dm-notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "dm_messages",
        },
        async (payload) => {
          // Skip own messages
          if (payload.new.user_id === user.id) return;
          
          // Skip if tab is visible
          if (document.visibilityState === "visible") return;

          // Check if DM notifications are enabled
          if (!notifPrefs?.dm_notifications) return;

          // Get sender profile and verify DM belongs to user
          const [{ data: senderProfile }, { data: dm }] = await Promise.all([
            supabase
              .from("profiles")
              .select("display_name, avatar_url")
              .eq("id", payload.new.user_id)
              .single(),
            supabase
              .from("direct_messages")
              .select("user1_id, user2_id, workspace_id")
              .eq("id", payload.new.dm_id)
              .single(),
          ]);

          // Only notify if user is participant and in current workspace
          if (!dm) return;
          if (dm.user1_id !== user.id && dm.user2_id !== user.id) return;
          if (dm.workspace_id !== currentWorkspace.id) return;

          const senderName = senderProfile?.display_name || "Alguém";
          const content = payload.new.content?.substring(0, 100) || "";

          showNotification({
            title: `Nova mensagem de ${senderName}`,
            body: content,
            icon: senderProfile?.avatar_url || undefined,
            tag: `dm-${payload.new.dm_id}`,
          });
        }
      )
      .subscribe();

    return () => {
      if (channelMessagesRef.current) {
        supabase.removeChannel(channelMessagesRef.current);
      }
      if (channelDMsRef.current) {
        supabase.removeChannel(channelDMsRef.current);
      }
    };
  }, [user?.id, currentWorkspace?.id, permission, notifPrefs, showNotification]);

  return {
    isSupported,
    permission,
    isEnabled: permission === "granted",
    requestPermission,
    showNotification,
  };
}
