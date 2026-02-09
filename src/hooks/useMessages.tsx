import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useProfile } from "./useProfile";
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
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      // Reverse to show oldest first in display
      return (data as unknown as Message[]).reverse();
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

// Hook to fetch a single message by ID (for replies)
export function useMessageById(messageId: string | null) {
  return useQuery({
    queryKey: ["message", messageId],
    queryFn: async () => {
      if (!messageId) return null;
      
      const { data, error } = await supabase
        .from("messages")
        .select(`
          *,
          profile:profiles!messages_user_id_fkey(display_name, avatar_url)
        `)
        .eq("id", messageId)
        .single();

      if (error) throw error;
      return data as unknown as Message;
    },
    enabled: !!messageId,
  });
}

export function useSendMessage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: profile } = useProfile();

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
    onMutate: async (variables) => {
      if (!user) return;

      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["infinite-messages", variables.channelId] });

      // Snapshot previous value
      const previousMessages = queryClient.getQueryData(["infinite-messages", variables.channelId]);

      // Create optimistic message with temp ID
      const optimisticMessage: Message = {
        id: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        channel_id: variables.channelId,
        user_id: user.id,
        content: variables.content,
        reply_to: variables.replyTo || null,
        is_edited: false,
        file_url: variables.fileUrl || null,
        file_type: variables.fileType || null,
        file_name: variables.fileName || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        profile: {
          display_name: profile?.display_name || null,
          avatar_url: profile?.avatar_url || null,
        },
      };

      // Optimistically update infinite messages
      queryClient.setQueryData(
        ["infinite-messages", variables.channelId],
        (oldData: any) => {
          if (!oldData) return oldData;
          const newPages = [...oldData.pages];
          if (newPages.length > 0) {
            newPages[newPages.length - 1] = {
              ...newPages[newPages.length - 1],
              messages: [...newPages[newPages.length - 1].messages, optimisticMessage],
            };
          }
          return { ...oldData, pages: newPages };
        }
      );

      // Also update legacy messages query if exists
      queryClient.setQueryData(
        ["messages", variables.channelId],
        (old: Message[] | undefined) => [...(old || []), optimisticMessage]
      );

      return { previousMessages, optimisticId: optimisticMessage.id };
    },
    onError: (error: any, variables, context) => {
      // Rollback on error
      if (context?.previousMessages) {
        queryClient.setQueryData(
          ["infinite-messages", variables.channelId],
          context.previousMessages
        );
      }
      toast.error(error.message || "Erro ao enviar mensagem");
    },
    onSuccess: (data, variables, context) => {
      // Replace optimistic message with real one
      if (data && context?.optimisticId) {
        queryClient.setQueryData(
          ["infinite-messages", variables.channelId],
          (oldData: any) => {
            if (!oldData) return oldData;
            return {
              ...oldData,
              pages: oldData.pages.map((page: any) => ({
                ...page,
                messages: page.messages.map((msg: Message) =>
                  msg.id === context.optimisticId
                    ? { ...msg, id: data.id, created_at: data.created_at, updated_at: data.updated_at }
                    : msg
                ),
              })),
            };
          }
        );

        // Also update legacy query
        queryClient.setQueryData(
          ["messages", variables.channelId],
          (old: Message[] | undefined) =>
            old?.map((msg) =>
              msg.id === context.optimisticId
                ? { ...msg, id: data.id, created_at: data.created_at, updated_at: data.updated_at }
                : msg
            )
        );
      }
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
