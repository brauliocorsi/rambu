import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface MentionFeedItem {
  id: string;
  message_id: string | null;
  dm_message_id: string | null;
  thread_message_id: string | null;
  mentioned_user_id: string;
  created_at: string;
  // Joined data
  message?: {
    id: string;
    content: string;
    created_at: string;
    channel_id: string;
    user_id: string;
    channel?: {
      id: string;
      name: string;
    };
    profile?: {
      display_name: string | null;
      avatar_url: string | null;
    };
  };
  dm_message?: {
    id: string;
    content: string;
    created_at: string;
    dm_id: string;
    user_id: string;
    profile?: {
      display_name: string | null;
      avatar_url: string | null;
    };
  };
  thread_message?: {
    id: string;
    content: string;
    created_at: string;
    parent_message_id: string;
    user_id: string;
    profile?: {
      display_name: string | null;
      avatar_url: string | null;
    };
  };
}

export function useMentionsFeed() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["mentions-feed", user?.id],
    queryFn: async () => {
      if (!user) return [];

      // Fetch mentions for channel messages
      const { data: channelMentions, error: channelError } = await supabase
        .from("message_mentions")
        .select(`
          id,
          message_id,
          dm_message_id,
          thread_message_id,
          mentioned_user_id,
          created_at,
          message:messages!message_mentions_message_id_fkey(
            id,
            content,
            created_at,
            channel_id,
            user_id,
            channel:channels!messages_channel_id_fkey(id, name),
            profile:profiles!messages_user_id_fkey(display_name, avatar_url)
          )
        `)
        .eq("mentioned_user_id", user.id)
        .not("message_id", "is", null)
        .order("created_at", { ascending: false })
        .limit(50);

      if (channelError) throw channelError;

      // Fetch mentions for DM messages
      const { data: dmMentions, error: dmError } = await supabase
        .from("message_mentions")
        .select(`
          id,
          message_id,
          dm_message_id,
          thread_message_id,
          mentioned_user_id,
          created_at,
          dm_message:dm_messages!message_mentions_dm_message_id_fkey(
            id,
            content,
            created_at,
            dm_id,
            user_id,
            profile:profiles!dm_messages_user_id_fkey(display_name, avatar_url)
          )
        `)
        .eq("mentioned_user_id", user.id)
        .not("dm_message_id", "is", null)
        .order("created_at", { ascending: false })
        .limit(50);

      if (dmError) throw dmError;

      // Fetch mentions for thread messages
      const { data: threadMentions, error: threadError } = await supabase
        .from("message_mentions")
        .select(`
          id,
          message_id,
          dm_message_id,
          thread_message_id,
          mentioned_user_id,
          created_at,
          thread_message:thread_messages!message_mentions_thread_message_id_fkey(
            id,
            content,
            created_at,
            parent_message_id,
            user_id,
            profile:profiles!thread_messages_user_id_fkey(display_name, avatar_url)
          )
        `)
        .eq("mentioned_user_id", user.id)
        .not("thread_message_id", "is", null)
        .order("created_at", { ascending: false })
        .limit(50);

      if (threadError) throw threadError;

      // Combine and sort all mentions
      const allMentions = [
        ...(channelMentions || []),
        ...(dmMentions || []),
        ...(threadMentions || []),
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      return allMentions as unknown as MentionFeedItem[];
    },
    enabled: !!user,
  });
}

export function useUnreadMentionsCount() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["mentions-count", user?.id],
    queryFn: async () => {
      if (!user) return 0;

      const { count, error } = await supabase
        .from("message_mentions")
        .select("id", { count: "exact", head: true })
        .eq("mentioned_user_id", user.id);

      if (error) throw error;
      return count || 0;
    },
    enabled: !!user,
  });
}

export function useDeleteMention() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (mentionId: string) => {
      const { error } = await supabase
        .from("message_mentions")
        .delete()
        .eq("id", mentionId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mentions-feed", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["mentions-count", user?.id] });
    },
  });
}
