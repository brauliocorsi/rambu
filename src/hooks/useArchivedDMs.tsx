import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export function useArchivedDMIds(workspaceId: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["archived-dms", workspaceId, user?.id],
    queryFn: async (): Promise<string[]> => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("archived_dms")
        .select("dm_id")
        .eq("user_id", user.id);

      if (error) throw error;
      return (data || []).map((item) => item.dm_id);
    },
    enabled: !!user?.id,
  });
}

export function useArchiveDM() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ dmId }: { dmId: string }) => {
      if (!user?.id) throw new Error("Not authenticated");

      const { error } = await supabase.from("archived_dms").insert({
        dm_id: dmId,
        user_id: user.id,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["archived-dms"] });
      queryClient.invalidateQueries({ queryKey: ["direct-messages"] });
      toast.success("Conversa arquivada");
    },
    onError: () => {
      toast.error("Erro ao arquivar conversa");
    },
  });
}

export function useUnarchiveDM() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ dmId }: { dmId: string }) => {
      if (!user?.id) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("archived_dms")
        .delete()
        .eq("dm_id", dmId)
        .eq("user_id", user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["archived-dms"] });
      queryClient.invalidateQueries({ queryKey: ["direct-messages"] });
      toast.success("Conversa restaurada");
    },
    onError: () => {
      toast.error("Erro ao restaurar conversa");
    },
  });
}
