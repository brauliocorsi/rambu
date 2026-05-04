import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export type SavedMessageTarget = {
  message_id?: string;
  dm_message_id?: string;
  group_message_id?: string;
};

export interface SavedMessage {
  id: string;
  user_id: string;
  message_id: string | null;
  dm_message_id: string | null;
  group_message_id: string | null;
  saved_at: string;
}

export function useSavedMessages() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["saved-messages", user?.id],
    queryFn: async () => {
      if (!user) return [] as SavedMessage[];
      const { data, error } = await supabase
        .from("saved_messages")
        .select("*")
        .order("saved_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as SavedMessage[];
    },
    enabled: !!user,
  });
}

export function useIsMessageSaved(target: SavedMessageTarget) {
  const { data } = useSavedMessages();
  if (!data) return false;
  return data.some(
    (s) =>
      (target.message_id && s.message_id === target.message_id) ||
      (target.dm_message_id && s.dm_message_id === target.dm_message_id) ||
      (target.group_message_id && s.group_message_id === target.group_message_id),
  );
}

export function useToggleSavedMessage() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (target: SavedMessageTarget) => {
      if (!user) throw new Error("Not authenticated");

      // Lookup existing
      const col = target.message_id
        ? "message_id"
        : target.dm_message_id
        ? "dm_message_id"
        : "group_message_id";
      const value =
        target.message_id || target.dm_message_id || target.group_message_id!;

      let q = supabase
        .from("saved_messages")
        .select("id")
        .eq("user_id", user.id);
      if (col === "message_id") q = q.eq("message_id", value);
      else if (col === "dm_message_id") q = q.eq("dm_message_id", value);
      else q = q.eq("group_message_id", value);
      const { data: existing } = await q.maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("saved_messages")
          .delete()
          .eq("id", existing.id);
        if (error) throw error;
        return { saved: false };
      } else {
        const { error } = await supabase.from("saved_messages").insert({
          user_id: user.id,
          message_id: target.message_id ?? null,
          dm_message_id: target.dm_message_id ?? null,
          group_message_id: target.group_message_id ?? null,
        });
        if (error) throw error;
        return { saved: true };
      }
    },
    onSuccess: ({ saved }) => {
      qc.invalidateQueries({ queryKey: ["saved-messages"] });
      toast.success(saved ? "Mensagem salva" : "Mensagem removida dos salvos");
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao salvar"),
  });
}