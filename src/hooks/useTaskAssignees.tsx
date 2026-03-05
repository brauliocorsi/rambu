import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface TaskAssignee {
  id: string;
  task_instance_id: string;
  user_id: string;
  status: string;
  completed_at: string | null;
  created_at: string;
  profile?: {
    display_name: string | null;
    avatar_url: string | null;
  };
}

export function useTaskAssignees(taskInstanceId: string | null) {
  return useQuery({
    queryKey: ["task-assignees", taskInstanceId],
    queryFn: async () => {
      if (!taskInstanceId) return [];

      const { data, error } = await supabase
        .from("task_assignees")
        .select("*")
        .eq("task_instance_id", taskInstanceId)
        .order("created_at");

      if (error) throw error;
      if (!data || data.length === 0) return [];

      // Fetch profiles
      const userIds = data.map((a) => a.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url")
        .in("id", userIds);

      const profileMap = new Map(profiles?.map((p) => [p.id, p]) || []);

      return data.map((a) => ({
        ...a,
        profile: profileMap.get(a.user_id) || null,
      })) as TaskAssignee[];
    },
    enabled: !!taskInstanceId,
  });
}

export function useUpdateAssigneeStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      assigneeId,
      status,
      taskInstanceId,
    }: {
      assigneeId: string;
      status: "completed" | "pending";
      taskInstanceId: string;
    }) => {
      const { error } = await supabase
        .from("task_assignees")
        .update({
          status,
          completed_at: status === "completed" ? new Date().toISOString() : null,
        })
        .eq("id", assigneeId);

      if (error) throw error;

      // Check if all assignees completed - auto-complete the task
      if (status === "completed") {
        const { data: allAssignees } = await supabase
          .from("task_assignees")
          .select("status")
          .eq("task_instance_id", taskInstanceId);

        const allDone = allAssignees?.every((a) => a.status === "completed");
        if (allDone) {
          await supabase
            .from("task_instances")
            .update({ status: "completed" })
            .eq("id", taskInstanceId);
        }
      }
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["task-assignees", vars.taskInstanceId] });
      queryClient.invalidateQueries({ queryKey: ["task-instance-by-message"] });
      queryClient.invalidateQueries({ queryKey: ["pending-tasks"] });
      toast.success("Status atualizado!");
    },
    onError: () => {
      toast.error("Erro ao atualizar status");
    },
  });
}
