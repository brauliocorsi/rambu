import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export type ChannelRole = "owner" | "admin" | "member";

export interface ChannelMember {
  id: string;
  user_id: string;
  channel_id: string;
  role: ChannelRole;
  joined_at: string;
  profile?: {
    id: string;
    display_name: string | null;
    avatar_url: string | null;
    status: string | null;
    last_seen: string | null;
  };
}

export function useChannelMembers(channelId: string | null) {
  return useQuery({
    queryKey: ["channel-members-with-roles", channelId],
    queryFn: async (): Promise<ChannelMember[]> => {
      if (!channelId) return [];

      const { data, error } = await supabase
        .from("channel_members")
        .select(`
          id,
          user_id,
          channel_id,
          role,
          joined_at,
          profiles:user_id (
            id,
            display_name,
            avatar_url,
            status,
            last_seen
          )
        `)
        .eq("channel_id", channelId)
        .order("role", { ascending: true })
        .order("joined_at", { ascending: true });

      if (error) throw error;
      
      return (data || []).map((member: any) => ({
        id: member.id,
        user_id: member.user_id,
        channel_id: member.channel_id,
        role: member.role as ChannelRole,
        joined_at: member.joined_at,
        profile: member.profiles as ChannelMember["profile"],
      }));
    },
    enabled: !!channelId,
  });
}

export function useCurrentChannelRole(channelId: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["channel-role", channelId, user?.id],
    queryFn: async (): Promise<ChannelRole | null> => {
      if (!channelId || !user?.id) return null;

      const { data, error } = await supabase
        .from("channel_members")
        .select("role")
        .eq("channel_id", channelId)
        .eq("user_id", user.id)
        .single();

      if (error) return null;
      return data?.role as ChannelRole || null;
    },
    enabled: !!channelId && !!user?.id,
  });
}

export function useUpdateChannelMemberRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      memberId,
      channelId,
      newRole,
    }: {
      memberId: string;
      channelId: string;
      newRole: ChannelRole;
    }) => {
      const { error } = await supabase
        .from("channel_members")
        .update({ role: newRole })
        .eq("id", memberId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["channel-members-with-roles", variables.channelId] });
      queryClient.invalidateQueries({ queryKey: ["channel-members", variables.channelId] });
      toast.success("Função atualizada!");
    },
    onError: (error: any) => {
      console.error("Erro ao atualizar função:", error);
      toast.error("Erro ao atualizar função do membro");
    },
  });
}

export function useRemoveChannelMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      memberId,
      channelId,
    }: {
      memberId: string;
      channelId: string;
    }) => {
      const { error } = await supabase
        .from("channel_members")
        .delete()
        .eq("id", memberId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["channel-members-with-roles", variables.channelId] });
      queryClient.invalidateQueries({ queryKey: ["channel-members", variables.channelId] });
      queryClient.invalidateQueries({ queryKey: ["channels"] });
      toast.success("Membro removido do canal");
    },
    onError: (error: any) => {
      console.error("Erro ao remover membro:", error);
      toast.error("Erro ao remover membro do canal");
    },
  });
}

export function useAddChannelMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      channelId,
      userId,
      role = "member",
    }: {
      channelId: string;
      userId: string;
      role?: ChannelRole;
    }) => {
      const { error } = await supabase
        .from("channel_members")
        .insert({
          channel_id: channelId,
          user_id: userId,
          role,
        });

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["channel-members-with-roles", variables.channelId] });
      queryClient.invalidateQueries({ queryKey: ["channel-members", variables.channelId] });
      queryClient.invalidateQueries({ queryKey: ["channels"] });
      toast.success("Membro adicionado ao canal");
    },
    onError: (error: any) => {
      console.error("Erro ao adicionar membro:", error);
      toast.error("Erro ao adicionar membro ao canal");
    },
  });
}

export function getRoleLabel(role: ChannelRole): string {
  switch (role) {
    case "owner":
      return "Dono";
    case "admin":
      return "Admin";
    case "member":
      return "Membro";
    default:
      return "Membro";
  }
}

export function getRoleBadgeVariant(role: ChannelRole): "default" | "secondary" | "outline" {
  switch (role) {
    case "owner":
      return "default";
    case "admin":
      return "secondary";
    case "member":
      return "outline";
    default:
      return "outline";
  }
}
