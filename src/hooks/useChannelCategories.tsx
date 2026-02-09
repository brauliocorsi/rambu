import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export interface ChannelCategory {
  id: string;
  workspace_id: string;
  user_id: string;
  name: string;
  position: number;
  created_at: string;
  updated_at: string;
  channels: string[]; // channel IDs in this category
}

export function useChannelCategories(workspaceId: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["channel-categories", workspaceId, user?.id],
    queryFn: async (): Promise<ChannelCategory[]> => {
      if (!workspaceId || !user?.id) return [];

      // Fetch categories
      const { data: categories, error: catError } = await supabase
        .from("channel_categories")
        .select("*")
        .eq("workspace_id", workspaceId)
        .eq("user_id", user.id)
        .order("position", { ascending: true });

      if (catError) throw catError;

      // Fetch category items for all categories
      const categoryIds = (categories || []).map((c) => c.id);
      
      if (categoryIds.length === 0) {
        return [];
      }

      const { data: items, error: itemsError } = await supabase
        .from("channel_category_items")
        .select("category_id, channel_id, position")
        .in("category_id", categoryIds)
        .order("position", { ascending: true });

      if (itemsError) throw itemsError;

      // Build categories with channel lists
      return (categories || []).map((cat) => ({
        ...cat,
        channels: (items || [])
          .filter((item) => item.category_id === cat.id)
          .map((item) => item.channel_id),
      }));
    },
    enabled: !!workspaceId && !!user?.id,
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      workspaceId,
      name,
    }: {
      workspaceId: string;
      name: string;
    }) => {
      if (!user?.id) throw new Error("Not authenticated");

      // Get max position
      const { data: existing } = await supabase
        .from("channel_categories")
        .select("position")
        .eq("workspace_id", workspaceId)
        .eq("user_id", user.id)
        .order("position", { ascending: false })
        .limit(1);

      const maxPosition = existing?.[0]?.position ?? -1;

      const { data, error } = await supabase
        .from("channel_categories")
        .insert({
          workspace_id: workspaceId,
          user_id: user.id,
          name,
          position: maxPosition + 1,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["channel-categories", variables.workspaceId],
      });
      toast.success("Categoria criada!");
    },
    onError: (error: any) => {
      if (error.code === "23505") {
        toast.error("Já existe uma categoria com esse nome");
      } else {
        toast.error("Erro ao criar categoria");
      }
    },
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      categoryId,
      name,
      workspaceId,
    }: {
      categoryId: string;
      name: string;
      workspaceId: string;
    }) => {
      const { error } = await supabase
        .from("channel_categories")
        .update({ name })
        .eq("id", categoryId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["channel-categories", variables.workspaceId],
      });
      toast.success("Categoria atualizada!");
    },
    onError: () => {
      toast.error("Erro ao atualizar categoria");
    },
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      categoryId,
      workspaceId,
    }: {
      categoryId: string;
      workspaceId: string;
    }) => {
      const { error } = await supabase
        .from("channel_categories")
        .delete()
        .eq("id", categoryId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["channel-categories", variables.workspaceId],
      });
      toast.success("Categoria removida!");
    },
    onError: () => {
      toast.error("Erro ao remover categoria");
    },
  });
}

export function useReorderCategories() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      workspaceId,
      categoryIds,
    }: {
      workspaceId: string;
      categoryIds: string[];
    }) => {
      if (!user?.id) throw new Error("Not authenticated");

      // Update positions for all categories
      const updates = categoryIds.map((id, index) =>
        supabase
          .from("channel_categories")
          .update({ position: index })
          .eq("id", id)
          .eq("user_id", user.id)
      );

      await Promise.all(updates);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["channel-categories", variables.workspaceId],
      });
    },
    onError: () => {
      toast.error("Erro ao reordenar categorias");
    },
  });
}

export function useAddChannelToCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      categoryId,
      channelId,
      workspaceId,
    }: {
      categoryId: string;
      channelId: string;
      workspaceId: string;
    }) => {
      // Get max position in category
      const { data: existing } = await supabase
        .from("channel_category_items")
        .select("position")
        .eq("category_id", categoryId)
        .order("position", { ascending: false })
        .limit(1);

      const maxPosition = existing?.[0]?.position ?? -1;

      const { error } = await supabase.from("channel_category_items").insert({
        category_id: categoryId,
        channel_id: channelId,
        position: maxPosition + 1,
      });

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["channel-categories", variables.workspaceId],
      });
      toast.success("Canal adicionado à categoria!");
    },
    onError: () => {
      toast.error("Erro ao adicionar canal à categoria");
    },
  });
}

export function useRemoveChannelFromCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      categoryId,
      channelId,
      workspaceId,
    }: {
      categoryId: string;
      channelId: string;
      workspaceId: string;
    }) => {
      const { error } = await supabase
        .from("channel_category_items")
        .delete()
        .eq("category_id", categoryId)
        .eq("channel_id", channelId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["channel-categories", variables.workspaceId],
      });
    },
    onError: () => {
      toast.error("Erro ao remover canal da categoria");
    },
  });
}

export function useMoveChannelInCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      categoryId,
      channelIds,
      workspaceId,
    }: {
      categoryId: string;
      channelIds: string[];
      workspaceId: string;
    }) => {
      // Delete existing items and re-insert with new positions
      await supabase
        .from("channel_category_items")
        .delete()
        .eq("category_id", categoryId);

      if (channelIds.length > 0) {
        const items = channelIds.map((channelId, index) => ({
          category_id: categoryId,
          channel_id: channelId,
          position: index,
        }));

        const { error } = await supabase
          .from("channel_category_items")
          .insert(items);

        if (error) throw error;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["channel-categories", variables.workspaceId],
      });
    },
    onError: () => {
      toast.error("Erro ao reordenar canais");
    },
  });
}
