import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface TaskTemplateAssignee {
  id: string;
  template_id: string;
  user_id: string;
  created_at: string;
}

export function useTaskTemplateAssignees(templateId: string | null) {
  return useQuery({
    queryKey: ["task-template-assignees", templateId],
    queryFn: async () => {
      if (!templateId) return [];
      const { data, error } = await supabase
        .from("task_template_assignees")
        .select("*")
        .eq("template_id", templateId);
      if (error) throw error;
      return data as TaskTemplateAssignee[];
    },
    enabled: !!templateId,
  });
}
