import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface TaskChecklistItem {
  id: string;
  task_instance_id: string;
  label: string;
  is_checked: boolean;
  checked_by: string | null;
  checked_at: string | null;
  assigned_to: string | null;
  position: number;
  created_at: string;
  checker_profile?: {
    display_name: string | null;
  };
  assignee_profile?: {
    display_name: string | null;
    avatar_url: string | null;
  };
}

export function useTaskChecklist(taskInstanceId: string | null) {
  return useQuery({
    queryKey: ["task-checklist", taskInstanceId],
    queryFn: async () => {
      if (!taskInstanceId) return [];
      const { data, error } = await supabase
        .from("task_checklist_items")
        .select("*")
        .eq("task_instance_id", taskInstanceId)
        .order("position");
      if (error) throw error;

      // Fetch all relevant profile IDs (checkers + assignees)
      const profileIds = new Set<string>();
      (data || []).forEach(i => {
        if (i.checked_by) profileIds.add(i.checked_by);
        if (i.assigned_to) profileIds.add(i.assigned_to);
      });

      let profileMap = new Map<string, { display_name: string | null; avatar_url: string | null }>();
      if (profileIds.size > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, display_name, avatar_url")
          .in("id", [...profileIds]);
        profiles?.forEach(p => profileMap.set(p.id, { display_name: p.display_name, avatar_url: p.avatar_url }));
      }

      return (data || []).map(item => ({
        ...item,
        checker_profile: item.checked_by
          ? { display_name: profileMap.get(item.checked_by)?.display_name || null }
          : undefined,
        assignee_profile: item.assigned_to
          ? profileMap.get(item.assigned_to) || { display_name: null, avatar_url: null }
          : undefined,
      })) as TaskChecklistItem[];
    },
    enabled: !!taskInstanceId,
  });
}

export function useToggleChecklistItem() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ itemId, isChecked, taskInstanceId }: { itemId: string; isChecked: boolean; taskInstanceId: string }) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("task_checklist_items")
        .update({
          is_checked: isChecked,
          checked_by: isChecked ? user.id : null,
          checked_at: isChecked ? new Date().toISOString() : null,
        })
        .eq("id", itemId);
      if (error) throw error;
      return taskInstanceId;
    },
    onSuccess: (taskInstanceId) => {
      queryClient.invalidateQueries({ queryKey: ["task-checklist", taskInstanceId] });
    },
  });
}
