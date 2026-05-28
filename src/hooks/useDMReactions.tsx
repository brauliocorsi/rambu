import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export interface DMReaction {
  id: string;
  message_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
}

export function useDMMessageReactions(messageId: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!messageId) return;
    const channel = supabase
      .channel(`dm-reactions-${messageId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "dm_message_reactions",
          filter: `message_id=eq.${messageId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["dm-reactions", messageId] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [messageId, queryClient]);

  return useQuery({
    queryKey: ["dm-reactions", messageId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dm_message_reactions")
        .select("*")
        .eq("message_id", messageId);
      if (error) throw error;
      return data as DMReaction[];
    },
    enabled: !!messageId,
  });
}

export function useToggleDMReaction() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      messageId,
      emoji,
    }: {
      messageId: string;
      emoji: string;
      dmId?: string;
    }) => {
      if (!user) throw new Error("Not authenticated");

      const { data: existing } = await supabase
        .from("dm_message_reactions")
        .select("id")
        .eq("message_id", messageId)
        .eq("user_id", user.id)
        .eq("emoji", emoji)
        .maybeSingle();

      if (existing) {
        await supabase.from("dm_message_reactions").delete().eq("id", existing.id);
      } else {
        await supabase.from("dm_message_reactions").insert({
          message_id: messageId,
          user_id: user.id,
          emoji,
        });
      }
      return { messageId };
    },
    onSuccess: (_, { messageId }) => {
      queryClient.invalidateQueries({ queryKey: ["dm-reactions", messageId] });
    },
    onError: () => toast.error("Erro ao reagir à mensagem"),
  });
}