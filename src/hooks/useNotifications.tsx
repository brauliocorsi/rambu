import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface NotificationPreferences {
  id: string;
  user_id: string;
  sound_enabled: boolean;
  sound_volume: number;
  dm_notifications: boolean;
  channel_notifications: boolean;
  mention_notifications: boolean;
}

export interface UnreadCount {
  channelId?: string;
  dmId?: string;
  count: number;
}

// Notification sound
const NOTIFICATION_SOUND_URL = "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3";

export function useNotificationPreferences() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["notification-preferences", user?.id],
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await supabase
        .from("notification_preferences")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (error && error.code !== "PGRST116") throw error;

      // Return default if not found
      if (!data) {
        return {
          sound_enabled: true,
          sound_volume: 0.5,
          dm_notifications: true,
          channel_notifications: true,
          mention_notifications: true,
        } as NotificationPreferences;
      }

      return data as NotificationPreferences;
    },
    enabled: !!user,
  });
}

export function useUpdateNotificationPreferences() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (preferences: Partial<NotificationPreferences>) => {
      if (!user) throw new Error("Not authenticated");

      const { data: existing } = await supabase
        .from("notification_preferences")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (existing) {
        const { error } = await supabase
          .from("notification_preferences")
          .update(preferences)
          .eq("user_id", user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("notification_preferences")
          .insert({ user_id: user.id, ...preferences });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notification-preferences", user?.id] });
    },
  });
}

export function useUnreadChannelCounts(workspaceId: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["unread-channel-counts", workspaceId],
    queryFn: async () => {
      if (!user || !workspaceId) return {};

      // Get all channels in workspace
      const { data: channels } = await supabase
        .from("channels")
        .select("id")
        .eq("workspace_id", workspaceId);

      if (!channels) return {};

      // Get read status for each channel
      const { data: readStatus } = await supabase
        .from("channel_read_status")
        .select("channel_id, last_read_at")
        .eq("user_id", user.id);

      const readMap = new Map(readStatus?.map((r) => [r.channel_id, r.last_read_at]) || []);

      // Count unread messages per channel
      const counts: Record<string, number> = {};

      for (const channel of channels) {
        const lastRead = readMap.get(channel.id) || new Date(0).toISOString();

        const { count } = await supabase
          .from("messages")
          .select("*", { count: "exact", head: true })
          .eq("channel_id", channel.id)
          .gt("created_at", lastRead)
          .neq("user_id", user.id);

        counts[channel.id] = count || 0;
      }

      return counts;
    },
    enabled: !!user && !!workspaceId,
    refetchInterval: 30000, // Refresh every 30 seconds
  });
}

export function useUnreadDMCounts(workspaceId: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["unread-dm-counts", workspaceId],
    queryFn: async () => {
      if (!user || !workspaceId) return {};

      // Get all DMs in workspace
      const { data: dms } = await supabase
        .from("direct_messages")
        .select("id")
        .eq("workspace_id", workspaceId);

      if (!dms) return {};

      // Get read status for each DM
      const { data: readStatus } = await supabase
        .from("dm_read_status")
        .select("dm_id, last_read_at")
        .eq("user_id", user.id);

      const readMap = new Map(readStatus?.map((r) => [r.dm_id, r.last_read_at]) || []);

      // Count unread messages per DM
      const counts: Record<string, number> = {};

      for (const dm of dms) {
        const lastRead = readMap.get(dm.id) || new Date(0).toISOString();

        const { count } = await supabase
          .from("dm_messages")
          .select("*", { count: "exact", head: true })
          .eq("dm_id", dm.id)
          .gt("created_at", lastRead)
          .neq("user_id", user.id);

        counts[dm.id] = count || 0;
      }

      return counts;
    },
    enabled: !!user && !!workspaceId,
    refetchInterval: 30000,
  });
}

export function useMarkChannelAsRead() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (channelId: string) => {
      if (!user) throw new Error("Not authenticated");

      const { data: existing } = await supabase
        .from("channel_read_status")
        .select("id")
        .eq("user_id", user.id)
        .eq("channel_id", channelId)
        .single();

      if (existing) {
        await supabase
          .from("channel_read_status")
          .update({ last_read_at: new Date().toISOString() })
          .eq("id", existing.id);
      } else {
        await supabase.from("channel_read_status").insert({
          user_id: user.id,
          channel_id: channelId,
          last_read_at: new Date().toISOString(),
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["unread-channel-counts"] });
    },
  });
}

export function useMarkDMAsRead() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (dmId: string) => {
      if (!user) throw new Error("Not authenticated");

      const { data: existing } = await supabase
        .from("dm_read_status")
        .select("id")
        .eq("user_id", user.id)
        .eq("dm_id", dmId)
        .single();

      if (existing) {
        await supabase
          .from("dm_read_status")
          .update({ last_read_at: new Date().toISOString() })
          .eq("id", existing.id);
      } else {
        await supabase.from("dm_read_status").insert({
          user_id: user.id,
          dm_id: dmId,
          last_read_at: new Date().toISOString(),
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["unread-dm-counts"] });
    },
  });
}

export function useNotificationSound() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { data: preferences } = useNotificationPreferences();

  useEffect(() => {
    audioRef.current = new Audio(NOTIFICATION_SOUND_URL);
    audioRef.current.volume = preferences?.sound_volume || 0.5;

    return () => {
      audioRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (audioRef.current && preferences) {
      audioRef.current.volume = preferences.sound_volume;
    }
  }, [preferences?.sound_volume]);

  const playSound = useCallback(() => {
    if (preferences?.sound_enabled && audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {
        // Ignore autoplay errors
      });
    }
  }, [preferences?.sound_enabled]);

  return { playSound };
}

export function useTotalUnreadCount(workspaceId: string | null) {
  const { data: channelCounts = {} } = useUnreadChannelCounts(workspaceId);
  const { data: dmCounts = {} } = useUnreadDMCounts(workspaceId);

  const totalChannels = Object.values(channelCounts).reduce((a, b) => a + b, 0);
  const totalDMs = Object.values(dmCounts).reduce((a, b) => a + b, 0);

  return {
    channels: totalChannels,
    dms: totalDMs,
    total: totalChannels + totalDMs,
  };
}
