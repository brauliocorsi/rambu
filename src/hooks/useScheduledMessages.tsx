import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export interface ScheduledMessage {
  id: string;
  channel_id: string | null;
  dm_id: string | null;
  user_id: string;
  content: string;
  scheduled_at: string;
  sent_at: string | null;
  is_cancelled: boolean;
  file_url: string | null;
  file_type: string | null;
  file_name: string | null;
  created_at: string;
  updated_at: string;
  channel?: {
    name: string;
  };
}

export function useScheduledMessages() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["scheduled_messages", user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from("scheduled_messages")
        .select(`
          *,
          channel:channels(name)
        `)
        .eq("user_id", user.id)
        .eq("is_cancelled", false)
        .is("sent_at", null)
        .order("scheduled_at", { ascending: true });

      if (error) throw error;
      return data as unknown as ScheduledMessage[];
    },
    enabled: !!user,
  });
}

export function useCreateScheduledMessage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      channelId,
      dmId,
      content,
      scheduledAt,
      fileUrl,
      fileType,
      fileName,
    }: {
      channelId?: string;
      dmId?: string;
      content: string;
      scheduledAt: Date;
      fileUrl?: string;
      fileType?: string;
      fileName?: string;
    }) => {
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("scheduled_messages")
        .insert({
          channel_id: channelId || null,
          dm_id: dmId || null,
          user_id: user.id,
          content,
          scheduled_at: scheduledAt.toISOString(),
          file_url: fileUrl || null,
          file_type: fileType || null,
          file_name: fileName || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scheduled_messages"] });
      toast.success("Mensagem agendada com sucesso!");
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao agendar mensagem");
    },
  });
}

export function useCancelScheduledMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (messageId: string) => {
      const { error } = await supabase
        .from("scheduled_messages")
        .update({ is_cancelled: true })
        .eq("id", messageId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scheduled_messages"] });
      toast.success("Mensagem cancelada");
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao cancelar mensagem");
    },
  });
}

export function useUpdateScheduledMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      messageId,
      content,
      scheduledAt,
    }: {
      messageId: string;
      content?: string;
      scheduledAt?: Date;
    }) => {
      const updates: Record<string, unknown> = {};
      if (content !== undefined) updates.content = content;
      if (scheduledAt !== undefined) updates.scheduled_at = scheduledAt.toISOString();

      const { error } = await supabase
        .from("scheduled_messages")
        .update(updates)
        .eq("id", messageId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scheduled_messages"] });
      toast.success("Mensagem atualizada");
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao atualizar mensagem");
    },
  });
}
