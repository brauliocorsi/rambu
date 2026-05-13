import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface WorkspaceBan {
  id: string;
  workspace_id: string;
  user_id: string;
  banned_by: string;
  reason: string | null;
  banned_at: string;
  profile?: {
    display_name: string | null;
    avatar_url: string | null;
  };
}

export function useWorkspaceBans(workspaceId: string | null) {
  return useQuery({
    queryKey: ["workspace_bans", workspaceId],
    queryFn: async (): Promise<WorkspaceBan[]> => {
      if (!workspaceId) return [];
      const { data, error } = await supabase
        .from("workspace_bans")
        .select(`*, profile:profiles!workspace_bans_user_id_fkey (display_name, avatar_url)`)
        .eq("workspace_id", workspaceId)
        .order("banned_at", { ascending: false });
      if (error) {
        // FK may not exist as named — fallback without join
        const { data: data2 } = await supabase
          .from("workspace_bans")
          .select("*")
          .eq("workspace_id", workspaceId)
          .order("banned_at", { ascending: false });
        return (data2 || []) as any;
      }
      return (data || []).map((b: any) => ({ ...b, profile: b.profile })) as WorkspaceBan[];
    },
    enabled: !!workspaceId,
  });
}

export function useBanUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      workspaceId,
      targetUserId,
      reason,
    }: {
      workspaceId: string;
      targetUserId: string;
      reason?: string;
    }) => {
      const { data, error } = await supabase.functions.invoke("admin-ban-user", {
        body: { workspace_id: workspaceId, target_user_id: targetUserId, reason },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["workspace_members", vars.workspaceId] });
      queryClient.invalidateQueries({ queryKey: ["workspace_bans", vars.workspaceId] });
      toast.success("Usuário banido do workspace");
    },
    onError: (e: any) => toast.error(e.message || "Erro ao banir usuário"),
  });
}

export function useUnbanUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ workspaceId, targetUserId }: { workspaceId: string; targetUserId: string }) => {
      const { data, error } = await supabase.functions.invoke("admin-unban-user", {
        body: { workspace_id: workspaceId, target_user_id: targetUserId },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["workspace_bans", vars.workspaceId] });
      toast.success("Usuário desbanido");
    },
    onError: (e: any) => toast.error(e.message || "Erro ao desbanir"),
  });
}

export function useDeleteUserAccount() {
  return useMutation({
    mutationFn: async ({ targetUserId }: { targetUserId?: string } = {}) => {
      const { data, error } = await supabase.functions.invoke("admin-delete-user", {
        body: { target_user_id: targetUserId },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
    },
    onSuccess: () => toast.success("Conta excluída permanentemente"),
    onError: (e: any) => toast.error(e.message || "Erro ao excluir conta"),
  });
}