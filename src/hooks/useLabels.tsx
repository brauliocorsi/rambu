import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export interface UserLabel {
  id: string;
  user_id: string;
  name: string;
  color: string;
  created_at: string;
}

export interface LabelAssignment {
  id: string;
  label_id: string;
  user_id: string;
  channel_id: string | null;
  dm_id: string | null;
  group_id: string | null;
}

export function useLabels() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["user-labels", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("user_labels")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data || []) as UserLabel[];
    },
    enabled: !!user,
  });
}

export function useLabelAssignments() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["label-assignments", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("label_assignments")
        .select("*");
      if (error) throw error;
      return (data || []) as LabelAssignment[];
    },
    enabled: !!user,
  });
}

export function useCreateLabel() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ name, color }: { name: string; color: string }) => {
      if (!user) throw new Error("Not authenticated");
      const { error, data } = await supabase
        .from("user_labels")
        .insert({ user_id: user.id, name, color })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["user-labels"] });
      toast.success("Etiqueta criada");
    },
    onError: (e: any) => toast.error(e.message || "Erro ao criar etiqueta"),
  });
}

export function useDeleteLabel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("user_labels").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["user-labels"] });
      qc.invalidateQueries({ queryKey: ["label-assignments"] });
      toast.success("Etiqueta removida");
    },
  });
}

export function useAssignLabel() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (params: {
      labelId: string;
      channelId?: string;
      dmId?: string;
      groupId?: string;
    }) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase.from("label_assignments").insert({
        user_id: user.id,
        label_id: params.labelId,
        channel_id: params.channelId ?? null,
        dm_id: params.dmId ?? null,
        group_id: params.groupId ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["label-assignments"] }),
    onError: (e: any) => toast.error(e.message || "Erro ao atribuir etiqueta"),
  });
}

export function useUnassignLabel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (assignmentId: string) => {
      const { error } = await supabase.from("label_assignments").delete().eq("id", assignmentId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["label-assignments"] }),
  });
}