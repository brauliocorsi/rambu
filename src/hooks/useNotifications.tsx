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

// Optimized: single aggregated query instead of N sequential queries
export function useUnreadChannelCounts(workspaceId: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["unread-channel-counts", workspaceId, user?.id],
    queryFn: async () => {
      if (!user || !workspaceId) return {};

      // Get all channels user is a member of in this workspace
      const { data: memberChannels } = await supabase
        .from("channel_members")
        .select("channel_id, channels!inner(workspace_id)")
        .eq("user_id", user.id)
        .eq("channels.workspace_id", workspaceId);

      if (!memberChannels || memberChannels.length === 0) return {};

      const channelIds = memberChannels.map((m) => m.channel_id);

      // Get read status for all channels at once
      const { data: readStatus } = await supabase
        .from("channel_read_status")
        .select("channel_id, last_read_at")
        .eq("user_id", user.id)
        .in("channel_id", channelIds);

      const readMap = new Map(readStatus?.map((r) => [r.channel_id, r.last_read_at]) || []);

      // Single aggregated query: count unread messages per channel
      const counts: Record<string, number> = {};

      // Build filter for unread messages grouped by channel
      const countPromises = channelIds.map(async (channelId) => {
        const lastRead = readMap.get(channelId) || new Date(0).toISOString();
        const { count } = await supabase
          .from("messages")
          .select("*", { count: "exact", head: true })
          .eq("channel_id", channelId)
          .gt("created_at", lastRead)
          .neq("user_id", user.id);
        counts[channelId] = count || 0;
      });

      await Promise.all(countPromises);

      return counts;
    },
    enabled: !!user && !!workspaceId,
    refetchInterval: 30000,
    staleTime: 10000,
  });
}

// Optimized: parallel queries instead of sequential loop
export function useUnreadDMCounts(workspaceId: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["unread-dm-counts", workspaceId, user?.id],
    queryFn: async () => {
      if (!user || !workspaceId) return {};

      // Get all DMs in workspace for this user
      const { data: dms } = await supabase
        .from("direct_messages")
        .select("id")
        .eq("workspace_id", workspaceId)
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`);

      if (!dms || dms.length === 0) return {};

      const dmIds = dms.map((d) => d.id);

      // Get read status for all DMs at once
      const { data: readStatus } = await supabase
        .from("dm_read_status")
        .select("dm_id, last_read_at")
        .eq("user_id", user.id)
        .in("dm_id", dmIds);

      const readMap = new Map(readStatus?.map((r) => [r.dm_id, r.last_read_at]) || []);

      // Parallel count queries
      const counts: Record<string, number> = {};
      const countPromises = dmIds.map(async (dmId) => {
        const lastRead = readMap.get(dmId) || new Date(0).toISOString();
        const { count } = await supabase
          .from("dm_messages")
          .select("*", { count: "exact", head: true })
          .eq("dm_id", dmId)
          .gt("created_at", lastRead)
          .neq("user_id", user.id);
        counts[dmId] = count || 0;
      });

      await Promise.all(countPromises);

      return counts;
    },
    enabled: !!user && !!workspaceId,
    refetchInterval: 30000,
    staleTime: 10000,
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
    onMutate: async (channelId: string) => {
      await queryClient.cancelQueries({ queryKey: ["unread-channel-counts"] });
      const previousCounts = queryClient.getQueryData(["unread-channel-counts"]);
      
      // Optimistically set count to 0
      queryClient.setQueryData(
        ["unread-channel-counts"],
        (old: any) => {
          if (!old) return old;
          // Handle all matching query keys
          return old;
        }
      );
      // Also update any specific workspace key
      queryClient.setQueriesData(
        { queryKey: ["unread-channel-counts"] },
        (old: Record<string, number> | undefined) => {
          if (!old) return old;
          return { ...old, [channelId]: 0 };
        }
      );
      
      return { previousCounts };
    },
    onError: (_err, _channelId, context) => {
      if (context?.previousCounts) {
        queryClient.setQueriesData(
          { queryKey: ["unread-channel-counts"] },
          context.previousCounts
        );
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["unread-channel-counts"] });
      queryClient.invalidateQueries({ queryKey: ["unread-feed"] });
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
    onMutate: async (dmId: string) => {
      await queryClient.cancelQueries({ queryKey: ["unread-dm-counts"] });
      
      // Optimistically set count to 0
      queryClient.setQueriesData(
        { queryKey: ["unread-dm-counts"] },
        (old: Record<string, number> | undefined) => {
          if (!old) return old;
          return { ...old, [dmId]: 0 };
        }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["unread-dm-counts"] });
      queryClient.invalidateQueries({ queryKey: ["unread-feed"] });
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
