import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export interface Message {
  id: string;
  channel_id: string;
  user_id: string;
  content: string;
  reply_to: string | null;
  is_edited: boolean;
  file_url: string | null;
  file_type: string | null;
  file_name: string | null;
  created_at: string;
  updated_at: string;
  profile?: {
    display_name: string | null;
    avatar_url: string | null;
  };
  reactions?: MessageReaction[];
}

export interface MessageReaction {
  id: string;
  message_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
}

export function useMessages(channelId: string | null) {
  const queryClient = useQueryClient();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const query = useQuery({
    queryKey: ["messages", channelId],
    queryFn: async () => {
      if (!channelId) return [];
      
      const { data, error } = await supabase
        .from("messages")
        .select(`
          *,
          profile:profiles!messages_user_id_fkey(display_name, avatar_url)
        `)
        .eq("channel_id", channelId)
        .order("created_at", { ascending: true })
        .limit(100);

      if (error) throw error;
      return data as unknown as Message[];
    },
    enabled: !!channelId,
  });

  // Real-time subscription
  useEffect(() => {
    if (!channelId) return;

    channelRef.current = supabase
      .channel(`messages:${channelId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
          filter: `channel_id=eq.${channelId}`,
        },
        async (payload) => {
          if (payload.eventType === "INSERT") {
            // Fetch the new message with profile
            const { data } = await supabase
              .from("messages")
              .select(`
                *,
                profile:profiles!messages_user_id_fkey(display_name, avatar_url)
              `)
              .eq("id", payload.new.id)
              .single();
            
            if (data) {
              queryClient.setQueryData(
                ["messages", channelId],
                (old: Message[] | undefined) => [...(old || []), data as unknown as Message]
              );
            }
          } else if (payload.eventType === "UPDATE") {
            queryClient.setQueryData(
              ["messages", channelId],
              (old: Message[] | undefined) =>
                old?.map((msg) =>
                  msg.id === payload.new.id ? { ...msg, ...payload.new } : msg
                )
            );
          } else if (payload.eventType === "DELETE") {
            queryClient.setQueryData(
              ["messages", channelId],
              (old: Message[] | undefined) =>
                old?.filter((msg) => msg.id !== payload.old.id)
            );
          }
        }
      )
      .subscribe();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [channelId, queryClient]);

  return query;
}

export function useSendMessage() {
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ 
      channelId, 
      content,
      replyTo,
      fileUrl,
      fileType,
      fileName,
    }: { 
      channelId: string; 
      content: string;
      replyTo?: string;
      fileUrl?: string;
      fileType?: string;
      fileName?: string;
    }) => {
      if (!user) throw new Error("Not authenticated");

      // Insert the message
      const { data, error } = await supabase
        .from("messages")
        .insert({
          channel_id: channelId,
          user_id: user.id,
          content,
          reply_to: replyTo || null,
          file_url: fileUrl || null,
          file_type: fileType || null,
          file_name: fileName || null,
        })
        .select()
        .single();

      if (error) throw error;

      // Parse and create mentions
      const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g;
      const mentions: string[] = [];
      let match;
      
      while ((match = mentionRegex.exec(content)) !== null) {
        mentions.push(match[2]); // User ID is in second capture group
      }

      if (mentions.length > 0 && data) {
        const mentionInserts = mentions.map((userId) => ({
          message_id: data.id,
          mentioned_user_id: userId,
        }));

        await supabase.from("message_mentions").insert(mentionInserts);
      }

      return data;
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao enviar mensagem");
    },
  });
}

export function useMessageReactions(messageId: string) {
  return useQuery({
    queryKey: ["reactions", messageId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("message_reactions")
        .select("*")
        .eq("message_id", messageId);

      if (error) throw error;
      return data as MessageReaction[];
    },
    enabled: !!messageId,
  });
}

export function useToggleReaction() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ messageId, emoji, channelId }: { messageId: string; emoji: string; channelId: string }) => {
      if (!user) throw new Error("Not authenticated");

      // Check if reaction exists
      const { data: existing } = await supabase
        .from("message_reactions")
        .select("id")
        .eq("message_id", messageId)
        .eq("user_id", user.id)
        .eq("emoji", emoji)
        .single();

      if (existing) {
        // Remove reaction
        await supabase
          .from("message_reactions")
          .delete()
          .eq("id", existing.id);
      } else {
        // Add reaction
        await supabase
          .from("message_reactions")
          .insert({
            message_id: messageId,
            user_id: user.id,
            emoji,
          });
      }

      return { messageId, channelId };
    },
    onSuccess: (_, { messageId, channelId }) => {
      queryClient.invalidateQueries({ queryKey: ["reactions", messageId] });
      queryClient.invalidateQueries({ queryKey: ["messages", channelId] });
    },
  });
}

export function useEditMessage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ messageId, content, channelId }: { messageId: string; content: string; channelId: string }) => {
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("messages")
        .update({ content, is_edited: true })
        .eq("id", messageId)
        .eq("user_id", user.id);

      if (error) throw error;
      return { messageId, channelId };
    },
    onSuccess: (_, { channelId }) => {
      queryClient.invalidateQueries({ queryKey: ["messages", channelId] });
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao editar mensagem");
    },
  });
}

export function useDeleteMessage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ messageId, channelId }: { messageId: string; channelId: string }) => {
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("messages")
        .delete()
        .eq("id", messageId)
        .eq("user_id", user.id);

      if (error) throw error;
      return { messageId, channelId };
    },
    onSuccess: (_, { channelId }) => {
      queryClient.invalidateQueries({ queryKey: ["messages", channelId] });
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao deletar mensagem");
    },
  });
}
