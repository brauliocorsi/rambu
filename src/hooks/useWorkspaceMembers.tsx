import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export interface WorkspaceMember {
  id: string;
  user_id: string;
  workspace_id: string;
  role: "admin" | "member";
  joined_at: string;
  invited_by: string | null;
  profile?: {
    display_name: string | null;
    avatar_url: string | null;
  };
}

export function useWorkspaceMembers(workspaceId: string | null) {
  return useQuery({
    queryKey: ["workspace_members", workspaceId],
    queryFn: async (): Promise<WorkspaceMember[]> => {
      if (!workspaceId) return [];

      const { data, error } = await supabase
        .from("workspace_members")
        .select(`
          *,
          profiles!workspace_members_user_id_fkey (
            display_name,
            avatar_url
          )
        `)
        .eq("workspace_id", workspaceId)
        .order("joined_at", { ascending: true });

      if (error) throw error;
      
      return (data || []).map((member) => ({
        ...member,
        profile: member.profiles as { display_name: string | null; avatar_url: string | null } | undefined,
      }));
    },
    enabled: !!workspaceId,
  });
}

export function useUpdateMemberRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      memberId,
      workspaceId,
      newRole,
    }: {
      memberId: string;
      workspaceId: string;
      newRole: "admin" | "member";
    }) => {
      const { error } = await supabase
        .from("workspace_members")
        .update({ role: newRole })
        .eq("id", memberId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["workspace_members", variables.workspaceId] });
      toast.success("Função atualizada!");
    },
    onError: (error) => {
      console.error("Erro ao atualizar função:", error);
      toast.error("Erro ao atualizar função do membro");
    },
  });
}

export function useRemoveMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      memberId,
      workspaceId,
    }: {
      memberId: string;
      workspaceId: string;
    }) => {
      const { error } = await supabase
        .from("workspace_members")
        .delete()
        .eq("id", memberId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["workspace_members", variables.workspaceId] });
      toast.success("Membro removido");
    },
    onError: (error) => {
      console.error("Erro ao remover membro:", error);
      toast.error("Erro ao remover membro");
    },
  });
}

export function useCurrentUserRole(workspaceId: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["user_role", workspaceId, user?.id],
    queryFn: async (): Promise<"admin" | "member" | null> => {
      if (!workspaceId || !user?.id) return null;

      const { data, error } = await supabase
        .from("workspace_members")
        .select("role")
        .eq("workspace_id", workspaceId)
        .eq("user_id", user.id)
        .single();

      if (error) return null;
      return data?.role as "admin" | "member" || null;
    },
    enabled: !!workspaceId && !!user?.id,
  });
}
