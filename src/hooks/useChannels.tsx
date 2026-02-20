import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export interface Channel {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  is_private: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export function useChannels(workspaceId: string | null) {
  return useQuery({
    queryKey: ["channels", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      
      const { data, error } = await supabase
        .from("channels")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data as Channel[];
    },
    enabled: !!workspaceId,
  });
}

export function useCreateChannel() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ 
      workspaceId, 
      name, 
      description, 
      isPrivate 
    }: { 
      workspaceId: string; 
      name: string; 
      description?: string; 
      isPrivate?: boolean;
    }) => {
      if (!user) throw new Error("Not authenticated");

      // Create channel
      const { data: channel, error: channelError } = await supabase
        .from("channels")
        .insert({
          workspace_id: workspaceId,
          name: name.toLowerCase().replace(/\s+/g, "-"),
          description: description || null,
          is_private: isPrivate || false,
          created_by: user.id,
        })
        .select()
        .single();

      if (channelError) throw channelError;

      // Note: the database trigger auto_add_channel_creator automatically adds
      // the creator as 'owner' for all channels, so no manual insert needed.

      return channel as Channel;
    },
    onSuccess: (_, { workspaceId }) => {
      queryClient.invalidateQueries({ queryKey: ["channels", workspaceId] });
      toast.success("Canal criado com sucesso! 🎉");
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao criar canal");
    },
  });
}

export function useJoinChannel() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ channelId, workspaceId }: { channelId: string; workspaceId: string }) => {
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("channel_members")
        .insert({
          channel_id: channelId,
          user_id: user.id,
        });

      if (error) throw error;
      return { channelId, workspaceId };
    },
    onSuccess: (_, { workspaceId }) => {
      queryClient.invalidateQueries({ queryKey: ["channels", workspaceId] });
      toast.success("Você entrou no canal! 👋");
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao entrar no canal");
    },
  });
}

export function useDeleteChannel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ channelId, workspaceId }: { channelId: string; workspaceId: string }) => {
      const { error } = await supabase
        .from("channels")
        .delete()
        .eq("id", channelId);

      if (error) throw error;
      return { channelId, workspaceId };
    },
    onSuccess: (_, { workspaceId }) => {
      queryClient.invalidateQueries({ queryKey: ["channels", workspaceId] });
      toast.success("Canal removido com sucesso!");
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao remover canal");
    },
  });
}
