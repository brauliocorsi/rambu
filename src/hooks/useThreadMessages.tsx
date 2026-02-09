import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export interface ThreadMessage {
  id: string;
  parent_message_id: string;
  user_id: string;
  content: string;
  is_edited: boolean;
  created_at: string;
  updated_at: string;
  profile?: {
    display_name: string | null;
    avatar_url: string | null;
  };
}

export function useThreadMessages(parentMessageId: string | null) {
  const queryClient = useQueryClient();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const query = useQuery({
    queryKey: ["thread_messages", parentMessageId],
    queryFn: async () => {
      if (!parentMessageId) return [];

      const { data, error } = await supabase
        .from("thread_messages")
        .select(`
          *,
          profile:profiles!thread_messages_user_id_fkey(display_name, avatar_url)
        `)
        .eq("parent_message_id", parentMessageId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data as unknown as ThreadMessage[];
    },
    enabled: !!parentMessageId,
  });

  // Real-time subscription for thread messages
  useEffect(() => {
    if (!parentMessageId) return;

    channelRef.current = supabase
      .channel(`thread:${parentMessageId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "thread_messages",
          filter: `parent_message_id=eq.${parentMessageId}`,
        },
        async (payload) => {
          if (payload.eventType === "INSERT") {
            const { data } = await supabase
              .from("thread_messages")
              .select(`
                *,
                profile:profiles!thread_messages_user_id_fkey(display_name, avatar_url)
              `)
              .eq("id", payload.new.id)
              .single();

            if (data) {
              queryClient.setQueryData(
                ["thread_messages", parentMessageId],
                (old: ThreadMessage[] | undefined) => [...(old || []), data as unknown as ThreadMessage]
              );
            }
          } else if (payload.eventType === "UPDATE") {
            queryClient.setQueryData(
              ["thread_messages", parentMessageId],
              (old: ThreadMessage[] | undefined) =>
                old?.map((msg) =>
                  msg.id === payload.new.id ? { ...msg, ...payload.new } : msg
                )
            );
          } else if (payload.eventType === "DELETE") {
            queryClient.setQueryData(
              ["thread_messages", parentMessageId],
              (old: ThreadMessage[] | undefined) =>
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
  }, [parentMessageId, queryClient]);

  return query;
}

export function useSendThreadMessage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      parentMessageId,
      content,
    }: {
      parentMessageId: string;
      content: string;
    }) => {
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("thread_messages")
        .insert({
          parent_message_id: parentMessageId,
          user_id: user.id,
          content,
        })
        .select()
        .single();

      if (error) throw error;

      // Parse and create mentions
      const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g;
      const mentions: string[] = [];
      let match;
      
      while ((match = mentionRegex.exec(content)) !== null) {
        mentions.push(match[2]);
      }

      if (mentions.length > 0 && data) {
        const mentionInserts = mentions.map((userId) => ({
          thread_message_id: data.id,
          mentioned_user_id: userId,
        }));

        await supabase.from("message_mentions").insert(mentionInserts);
      }

      return data;
    },
    onSuccess: (_, { parentMessageId }) => {
      queryClient.invalidateQueries({ queryKey: ["thread_messages", parentMessageId] });
      queryClient.invalidateQueries({ queryKey: ["messages"] });
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao enviar resposta");
    },
  });
}

export function useEditThreadMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      messageId,
      content,
      parentMessageId,
    }: {
      messageId: string;
      content: string;
      parentMessageId: string;
    }) => {
      const { error } = await supabase
        .from("thread_messages")
        .update({ content, is_edited: true })
        .eq("id", messageId);

      if (error) throw error;
      return { parentMessageId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["thread_messages", data.parentMessageId] });
      toast.success("Mensagem editada");
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao editar mensagem");
    },
  });
}

export function useDeleteThreadMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      messageId,
      parentMessageId,
    }: {
      messageId: string;
      parentMessageId: string;
    }) => {
      const { error } = await supabase
        .from("thread_messages")
        .delete()
        .eq("id", messageId);

      if (error) throw error;
      return { parentMessageId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["thread_messages", data.parentMessageId] });
      queryClient.invalidateQueries({ queryKey: ["messages"] });
      toast.success("Mensagem removida");
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao remover mensagem");
    },
  });
}
