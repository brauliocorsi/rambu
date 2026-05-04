import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export type PinScope =
  | { type: "channel"; id: string }
  | { type: "dm"; id: string }
  | { type: "group"; id: string };

function tableFor(scope: PinScope) {
  if (scope.type === "channel") return "messages" as const;
  if (scope.type === "dm") return "dm_messages" as const;
  return "dm_group_messages" as const;
}

function fkColumn(scope: PinScope) {
  if (scope.type === "channel") return "channel_id" as const;
  if (scope.type === "dm") return "dm_id" as const;
  return "group_id" as const;
}

export function usePinnedMessages(scope: PinScope | null) {
  return useQuery({
    queryKey: ["pinned-messages", scope?.type, scope?.id],
    queryFn: async () => {
      if (!scope) return [];
      const table = tableFor(scope);
      const fk = fkColumn(scope);
      const { data, error } = await (supabase as any)
        .from(table)
        .select("*, profile:profiles!inner(display_name, avatar_url)")
        .eq(fk, scope.id)
        .not("pinned_at", "is", null)
        .order("pinned_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!scope,
  });
}

export function useTogglePin(scope: PinScope) {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ messageId, currentlyPinned }: { messageId: string; currentlyPinned: boolean }) => {
      if (!user) throw new Error("Not authenticated");
      const table = tableFor(scope);
      const update = currentlyPinned
        ? { pinned_at: null, pinned_by: null }
        : { pinned_at: new Date().toISOString(), pinned_by: user.id };
      const { error } = await (supabase as any).from(table).update(update).eq("id", messageId);
      if (error) throw error;
      return { pinned: !currentlyPinned };
    },
    onSuccess: ({ pinned }) => {
      qc.invalidateQueries({ queryKey: ["pinned-messages", scope.type, scope.id] });
      toast.success(pinned ? "Mensagem fixada" : "Mensagem desafixada");
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao fixar"),
  });
}