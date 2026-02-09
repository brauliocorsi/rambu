import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export function useWorkspaceFavorites() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: favorites = [], isLoading } = useQuery({
    queryKey: ["workspace-favorites", user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from("workspace_favorites")
        .select("workspace_id")
        .eq("user_id", user.id);

      if (error) throw error;
      return data.map(f => f.workspace_id);
    },
    enabled: !!user,
  });

  const toggleFavorite = useMutation({
    mutationFn: async (workspaceId: string) => {
      if (!user) throw new Error("Not authenticated");
      
      const isFavorite = favorites.includes(workspaceId);
      
      if (isFavorite) {
        const { error } = await supabase
          .from("workspace_favorites")
          .delete()
          .eq("user_id", user.id)
          .eq("workspace_id", workspaceId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("workspace_favorites")
          .insert({
            user_id: user.id,
            workspace_id: workspaceId,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspace-favorites"] });
    },
  });

  return {
    favorites,
    isLoading,
    toggleFavorite: toggleFavorite.mutate,
    isFavorite: (workspaceId: string) => favorites.includes(workspaceId),
  };
}
