import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export interface Workspace {
  id: string;
  name: string;
  description: string | null;
  icon_url: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface WorkspaceMember {
  id: string;
  workspace_id: string;
  user_id: string;
  role: "admin" | "member";
  invited_by: string | null;
  joined_at: string;
  profile?: {
    display_name: string | null;
    avatar_url: string | null;
  };
}

export function useWorkspaces() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["workspaces", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workspaces")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Workspace[];
    },
    enabled: !!user,
  });
}

export function useWorkspaceMembers(workspaceId: string | null) {
  return useQuery({
    queryKey: ["workspace-members", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      
      const { data, error } = await supabase
        .from("workspace_members")
        .select(`
          *,
          profile:profiles!workspace_members_user_id_fkey(display_name, avatar_url)
        `)
        .eq("workspace_id", workspaceId);

      if (error) throw error;
      return data as unknown as WorkspaceMember[];
    },
    enabled: !!workspaceId,
  });
}

export function useCreateWorkspace() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ name, description }: { name: string; description?: string }) => {
      if (!user) throw new Error("Not authenticated");

      // Create workspace
      const { data: workspace, error: workspaceError } = await supabase
        .from("workspaces")
        .insert({
          name,
          description: description || null,
          created_by: user.id,
        })
        .select()
        .single();

      if (workspaceError) throw workspaceError;

      // Add creator as admin
      const { error: memberError } = await supabase
        .from("workspace_members")
        .insert({
          workspace_id: workspace.id,
          user_id: user.id,
          role: "admin",
        });

      if (memberError) throw memberError;

      return workspace as Workspace;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspaces"] });
      toast.success("Workspace criado com sucesso! 🎉");
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao criar workspace");
    },
  });
}

export function useInviteMemberByUserId() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ workspaceId, userId }: { workspaceId: string; userId: string }) => {
      if (!user) throw new Error("Not authenticated");

      // Add member
      const { error } = await supabase
        .from("workspace_members")
        .insert({
          workspace_id: workspaceId,
          user_id: userId,
          role: "member",
          invited_by: user.id,
        });

      if (error) throw error;
    },
    onSuccess: (_, { workspaceId }) => {
      queryClient.invalidateQueries({ queryKey: ["workspace-members", workspaceId] });
      toast.success("Membro adicionado! 📨");
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao adicionar membro");
    },
  });
}
