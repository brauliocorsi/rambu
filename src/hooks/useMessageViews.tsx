import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface MessageView {
  id: string;
  message_id?: string;
  dm_message_id?: string;
  user_id: string;
  viewed_at: string;
  profile?: {
    display_name: string | null;
    avatar_url: string | null;
  };
}

// Record view for channel message
export function useRecordMessageView(messageIds: string[], channelId: string | null) {
  const { user } = useAuth();

  useEffect(() => {
    if (!user || !channelId || messageIds.length === 0) return;

    const record = async () => {
      // Upsert views for visible messages (ignore conflicts)
      const rows = messageIds
        .filter(id => !id.startsWith("temp-"))
        .map(id => ({
          message_id: id,
          user_id: user.id,
        }));

      if (rows.length === 0) return;

      await (supabase as any)
        .from("message_views")
        .upsert(rows, { onConflict: "message_id,user_id", ignoreDuplicates: true });
    };

    const timer = setTimeout(record, 500);
    return () => clearTimeout(timer);
  }, [messageIds.join(","), user?.id, channelId]);
}

// Record view for DM message
export function useRecordDMMessageView(messageIds: string[], dmId: string | null) {
  const { user } = useAuth();

  useEffect(() => {
    if (!user || !dmId || messageIds.length === 0) return;

    const record = async () => {
      const rows = messageIds
        .filter(id => !id.startsWith("temp-"))
        .map(id => ({
          dm_message_id: id,
          user_id: user.id,
        }));

      if (rows.length === 0) return;

      await (supabase as any)
        .from("dm_message_views")
        .upsert(rows, { onConflict: "dm_message_id,user_id", ignoreDuplicates: true });
    };

    const timer = setTimeout(record, 500);
    return () => clearTimeout(timer);
  }, [messageIds.join(","), user?.id, dmId]);
}

// Fetch views for a channel message
export function useMessageViews(messageId: string | null) {
  return useQuery({
    queryKey: ["message-views", messageId],
    queryFn: async () => {
      if (!messageId) return [];
      const { data, error } = await (supabase as any)
        .from("message_views")
        .select("*, profile:profiles!message_views_user_id_fkey(display_name, avatar_url)")
        .eq("message_id", messageId)
        .order("viewed_at", { ascending: true });
      if (error) throw error;
      return data as MessageView[];
    },
    enabled: !!messageId,
  });
}

// Fetch views for a DM message
export function useDMMessageViews(dmMessageId: string | null) {
  return useQuery({
    queryKey: ["dm-message-views", dmMessageId],
    queryFn: async () => {
      if (!dmMessageId) return [];
      const { data, error } = await (supabase as any)
        .from("dm_message_views")
        .select("*, profile:profiles!dm_message_views_user_id_fkey(display_name, avatar_url)")
        .eq("dm_message_id", dmMessageId)
        .order("viewed_at", { ascending: true });
      if (error) throw error;
      return data as MessageView[];
    },
    enabled: !!dmMessageId,
  });
}

// Fetch view counts for multiple messages at once (channel)
export function useMessageViewCounts(messageIds: string[]) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["message-view-counts", messageIds.sort().join(",")],
    queryFn: async () => {
      if (messageIds.length === 0) return {};
      const { data, error } = await (supabase as any)
        .from("message_views")
        .select("message_id, user_id, profile:profiles!message_views_user_id_fkey(display_name, avatar_url)")
        .in("message_id", messageIds);
      if (error) throw error;
      
      const counts: Record<string, { count: number; viewers: { user_id: string; display_name: string | null; avatar_url: string | null }[] }> = {};
      for (const row of data) {
        // Skip the sender's own view
        if (row.user_id === user?.id) continue;
        if (!counts[row.message_id]) {
          counts[row.message_id] = { count: 0, viewers: [] };
        }
        counts[row.message_id].count++;
        counts[row.message_id].viewers.push({
          user_id: row.user_id,
          display_name: row.profile?.display_name,
          avatar_url: row.profile?.avatar_url,
        });
      }
      return counts;
    },
    enabled: messageIds.length > 0,
    refetchInterval: 10000, // Refresh every 10s
  });
}

// Fetch view counts for multiple DM messages at once
export function useDMMessageViewCounts(messageIds: string[]) {
  return useQuery({
    queryKey: ["dm-message-view-counts", messageIds.sort().join(",")],
    queryFn: async () => {
      if (messageIds.length === 0) return {};
      const { data, error } = await (supabase as any)
        .from("dm_message_views")
        .select("dm_message_id, user_id, profile:profiles!dm_message_views_user_id_fkey(display_name, avatar_url)")
        .in("dm_message_id", messageIds);
      if (error) throw error;
      
      const counts: Record<string, { count: number; viewers: { user_id: string; display_name: string | null; avatar_url: string | null }[] }> = {};
      for (const row of data) {
        if (!counts[row.dm_message_id]) {
          counts[row.dm_message_id] = { count: 0, viewers: [] };
        }
        counts[row.dm_message_id].count++;
        counts[row.dm_message_id].viewers.push({
          user_id: row.user_id,
          display_name: row.profile?.display_name,
          avatar_url: row.profile?.avatar_url,
        });
      }
      return counts;
    },
    enabled: messageIds.length > 0,
    refetchInterval: 10000,
  });
}
