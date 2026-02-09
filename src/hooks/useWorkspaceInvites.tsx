import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export interface WorkspaceInvite {
  id: string;
  workspace_id: string;
  invite_code: string;
  created_by: string;
  expires_at: string | null;
  max_uses: number | null;
  uses_count: number;
  is_active: boolean;
  created_at: string;
}

function generateInviteCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export function useWorkspaceInvites(workspaceId: string | null) {
  return useQuery({
    queryKey: ["workspace_invites", workspaceId],
    queryFn: async (): Promise<WorkspaceInvite[]> => {
      if (!workspaceId) return [];

      const { data, error } = await supabase
        .from("workspace_invites")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!workspaceId,
  });
}

export function useCreateInvite() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      workspaceId,
      expiresInDays,
      maxUses,
    }: {
      workspaceId: string;
      expiresInDays?: number;
      maxUses?: number;
    }): Promise<WorkspaceInvite> => {
      if (!user?.id) throw new Error("Usuário não autenticado");

      const inviteCode = generateInviteCode();
      const expiresAt = expiresInDays
        ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString()
        : null;

      const { data, error } = await supabase
        .from("workspace_invites")
        .insert({
          workspace_id: workspaceId,
          invite_code: inviteCode,
          created_by: user.id,
          expires_at: expiresAt,
          max_uses: maxUses || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["workspace_invites", variables.workspaceId] });
      toast.success("Link de convite criado!");
    },
    onError: (error) => {
      console.error("Erro ao criar convite:", error);
      toast.error("Erro ao criar link de convite");
    },
  });
}

export function useDeactivateInvite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ inviteId, workspaceId }: { inviteId: string; workspaceId: string }) => {
      const { error } = await supabase
        .from("workspace_invites")
        .update({ is_active: false })
        .eq("id", inviteId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["workspace_invites", variables.workspaceId] });
      toast.success("Convite desativado");
    },
    onError: (error) => {
      console.error("Erro ao desativar convite:", error);
      toast.error("Erro ao desativar convite");
    },
  });
}

export function useInviteByCode(code: string | null) {
  return useQuery({
    queryKey: ["workspace_invite", code],
    queryFn: async () => {
      if (!code) return null;

      const { data, error } = await supabase
        .from("workspace_invites")
        .select(`
          *,
          workspaces (
            id,
            name,
            description,
            icon_url
          )
        `)
        .eq("invite_code", code)
        .eq("is_active", true)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!code,
  });
}

export function useJoinWorkspace() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (inviteCode: string) => {
      if (!user?.id) throw new Error("Usuário não autenticado");

      // Get invite details
      const { data: invite, error: inviteError } = await supabase
        .from("workspace_invites")
        .select("*")
        .eq("invite_code", inviteCode)
        .eq("is_active", true)
        .single();

      if (inviteError || !invite) throw new Error("Convite inválido ou expirado");

      // Check if expired
      if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
        throw new Error("Convite expirado");
      }

      // Check max uses
      if (invite.max_uses && invite.uses_count >= invite.max_uses) {
        throw new Error("Convite esgotado");
      }

      // Check if already a member
      const { data: existing } = await supabase
        .from("workspace_members")
        .select("id")
        .eq("workspace_id", invite.workspace_id)
        .eq("user_id", user.id)
        .single();

      if (existing) {
        throw new Error("Você já é membro deste workspace");
      }

      // Join workspace
      const { error: joinError } = await supabase
        .from("workspace_members")
        .insert({
          workspace_id: invite.workspace_id,
          user_id: user.id,
          role: "member",
          invited_by: invite.created_by,
        });

      if (joinError) throw joinError;

      // Increment uses count
      await supabase
        .from("workspace_invites")
        .update({ uses_count: invite.uses_count + 1 })
        .eq("id", invite.id);

      return invite.workspace_id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspaces"] });
      toast.success("Você entrou no workspace!");
    },
    onError: (error: Error) => {
      console.error("Erro ao entrar no workspace:", error);
      toast.error(error.message || "Erro ao entrar no workspace");
    },
  });
}
