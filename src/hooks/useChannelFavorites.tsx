import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export interface ChannelFavorite {
  id: string;
  user_id: string;
  channel_id: string;
  created_at: string;
}

export function useChannelFavorites(workspaceId: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["channel-favorites", user?.id, workspaceId],
    queryFn: async () => {
      if (!user || !workspaceId) return [];

      const { data, error } = await supabase
        .from("channel_favorites")
        .select(`
          *,
          channel:channels!inner(id, workspace_id)
        `)
        .eq("user_id", user.id)
        .eq("channel.workspace_id", workspaceId);

      if (error) throw error;
      return data as unknown as ChannelFavorite[];
    },
    enabled: !!user && !!workspaceId,
  });
}

export function useFavoriteChannelIds(workspaceId: string | null) {
  const { data: favorites = [] } = useChannelFavorites(workspaceId);
  return favorites.map((f) => f.channel_id);
}

export function useToggleChannelFavorite() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ channelId, isFavorite }: { channelId: string; isFavorite: boolean }) => {
      if (!user) throw new Error("Not authenticated");

      if (isFavorite) {
        // Remove from favorites
        const { error } = await supabase
          .from("channel_favorites")
          .delete()
          .eq("user_id", user.id)
          .eq("channel_id", channelId);

        if (error) throw error;
      } else {
        // Check if already exists first
        const { data: existing } = await supabase
          .from("channel_favorites")
          .select("id")
          .eq("user_id", user.id)
          .eq("channel_id", channelId)
          .maybeSingle();

        if (existing) {
          // Already exists, just return success
          return { channelId, isFavorite: true };
        }

        // Add to favorites
        const { error } = await supabase
          .from("channel_favorites")
          .insert({
            user_id: user.id,
            channel_id: channelId,
          });

        if (error) throw error;
      }

      return { channelId, isFavorite: !isFavorite };
    },
    onSuccess: (result, { isFavorite }) => {
      queryClient.invalidateQueries({ queryKey: ["channel-favorites"] });
      // Only show toast if something changed
      if (result.isFavorite !== isFavorite || isFavorite) {
        toast.success(isFavorite ? "Removido dos favoritos" : "Adicionado aos favoritos");
      }
    },
    onError: (error: any) => {
      // Ignore duplicate key errors
      if (error?.code === "23505") {
        queryClient.invalidateQueries({ queryKey: ["channel-favorites"] });
        return;
      }
      toast.error(error.message || "Erro ao atualizar favoritos");
    },
  });
}
