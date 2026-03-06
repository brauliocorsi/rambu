import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export interface TaskFieldValue {
  id: string;
  task_instance_id: string;
  template_field_id: string;
  value_text: string | null;
  value_number: number | null;
  file_url: string | null;
  file_name: string | null;
  field?: {
    label: string;
    field_type: string;
  };
}

export interface TaskInstance {
  id: string;
  template_id: string;
  channel_id: string;
  created_by: string;
  assigned_to: string | null;
  status: "pending" | "approved" | "rejected" | "completed";
  requires_approval: boolean;
  reminder_at: string | null;
  message_id: string | null;
  created_at: string;
  template?: {
    name: string;
    description: string | null;
  };
  field_values?: TaskFieldValue[];
  creator_profile?: {
    display_name: string | null;
    avatar_url: string | null;
  };
  assigned_profile?: {
    display_name: string | null;
    avatar_url: string | null;
  };
}

export function useTaskInstanceByMessageId(messageId: string | null) {
  const query = useQuery({
    queryKey: ["task-instance-by-message", messageId],
    queryFn: async () => {
      if (!messageId) return null;
      
      const { data: instance, error } = await supabase
        .from("task_instances")
        .select("*")
        .eq("message_id", messageId)
        .maybeSingle();

      if (error) throw error;
      if (!instance) return null;

      // Fetch template info
      const { data: template } = await supabase
        .from("task_templates")
        .select("name, description")
        .eq("id", instance.template_id)
        .single();

      // Fetch field values with field labels
      const { data: fieldValues } = await supabase
        .from("task_field_values")
        .select("*")
        .eq("task_instance_id", instance.id);

      // Fetch field definitions for labels
      const { data: fieldDefs } = await supabase
        .from("task_template_fields")
        .select("id, label, field_type")
        .eq("template_id", instance.template_id);

      const fieldMap = new Map(fieldDefs?.map((f) => [f.id, f]) || []);

      // Fetch profiles
      const [creatorRes, assignedRes] = await Promise.all([
        supabase.from("profiles").select("display_name, avatar_url").eq("id", instance.created_by).single(),
        instance.assigned_to
          ? supabase.from("profiles").select("display_name, avatar_url").eq("id", instance.assigned_to).single()
          : Promise.resolve({ data: null }),
      ]);

      return {
        ...instance,
        template: template || { name: "Fluxo", description: null },
        field_values: (fieldValues || []).map((fv) => ({
          ...fv,
          field: fieldMap.get(fv.template_field_id) || { label: "Campo", field_type: "text" },
        })),
        creator_profile: creatorRes.data,
        assigned_profile: assignedRes.data,
      } as TaskInstance;
    },
    enabled: !!messageId,
    refetchInterval: (query) => {
      return query.state.data === null ? 2000 : false;
    },
  });

  return query;
}

export function useCreateTaskInstance() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      templateId,
      channelId,
      dmId,
      assignedTo,
      requiresApproval,
      requireChecklistComplete,
      reminderAt,
      messageId,
      fieldValues,
    }: {
      templateId: string;
      channelId?: string;
      dmId?: string;
      assignedTo?: string;
      requiresApproval?: boolean;
      requireChecklistComplete?: boolean;
      reminderAt?: string;
      messageId: string;
      fieldValues: {
        templateFieldId: string;
        valueText?: string;
        valueNumber?: number;
        fileUrl?: string;
        fileName?: string;
      }[];
    }) => {
      if (!user) throw new Error("Not authenticated");

      const { data: instance, error: instanceError } = await supabase
        .from("task_instances")
        .insert({
          template_id: templateId,
          channel_id: channelId || null,
          dm_id: dmId || null,
          created_by: user.id,
          assigned_to: assignedTo || null,
          requires_approval: requiresApproval || false,
          require_checklist_complete: requireChecklistComplete || false,
          reminder_at: reminderAt || null,
          message_id: messageId,
          status: "pending",
        } as any)
        .select()
        .single();

      if (instanceError) throw instanceError;

      if (fieldValues.length > 0) {
        const { error: valuesError } = await supabase
          .from("task_field_values")
          .insert(
            fieldValues.map((fv) => ({
              task_instance_id: instance.id,
              template_field_id: fv.templateFieldId,
              value_text: fv.valueText || null,
              value_number: fv.valueNumber ?? null,
              file_url: fv.fileUrl || null,
              file_name: fv.fileName || null,
            }))
          );
        if (valuesError) throw valuesError;
      }

      return instance;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task-instance-by-message"] });
    },
    onError: () => {
      toast.error("Erro ao criar tarefa");
    },
  });
}

export function useUpdateTaskStatus() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      taskId,
      status,
      comment,
    }: {
      taskId: string;
      status: "approved" | "rejected" | "completed";
      comment?: string;
    }) => {
      if (!user) throw new Error("Not authenticated");

      const { error: updateError } = await supabase
        .from("task_instances")
        .update({ status })
        .eq("id", taskId);

      if (updateError) throw updateError;

      // Create approval/observation record
      if (status === "approved" || status === "rejected" || (status === "completed" && comment)) {
        const { error: approvalError } = await supabase
          .from("task_approvals")
          .insert({
            task_instance_id: taskId,
            user_id: user.id,
            action: status,
            comment: comment || null,
          });
        if (approvalError) throw approvalError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task-instance-by-message"] });
      toast.success("Status da tarefa atualizado!");
    },
    onError: () => {
      toast.error("Erro ao atualizar tarefa");
    },
  });
}
