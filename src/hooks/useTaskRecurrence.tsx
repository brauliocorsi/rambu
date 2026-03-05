import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export interface TaskRecurrenceRule {
  id: string;
  template_id: string;
  channel_id: string;
  created_by: string;
  cron_expression: string;
  auto_assignees: string[];
  is_active: boolean;
  next_run_at: string;
  last_run_at: string | null;
  created_at: string;
}

export function useTaskRecurrenceRules(templateId: string | null) {
  return useQuery({
    queryKey: ["task-recurrence-rules", templateId],
    queryFn: async () => {
      if (!templateId) return [];
      const { data, error } = await supabase
        .from("task_recurrence_rules")
        .select("*")
        .eq("template_id", templateId);
      if (error) throw error;
      return (data || []).map(r => ({
        ...r,
        auto_assignees: Array.isArray(r.auto_assignees) ? r.auto_assignees : [],
      })) as TaskRecurrenceRule[];
    },
    enabled: !!templateId,
  });
}

export function useCreateRecurrenceRule() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (params: {
      templateId: string;
      channelId: string;
      cronExpression: string;
      autoAssignees: string[];
      nextRunAt: string;
    }) => {
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("task_recurrence_rules")
        .insert({
          template_id: params.templateId,
          channel_id: params.channelId,
          created_by: user.id,
          cron_expression: params.cronExpression,
          auto_assignees: params.autoAssignees,
          next_run_at: params.nextRunAt,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["task-recurrence-rules", vars.templateId] });
      toast.success("Recorrência configurada!");
    },
    onError: () => toast.error("Erro ao configurar recorrência"),
  });
}
