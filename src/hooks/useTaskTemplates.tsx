import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export interface TaskTemplateField {
  id: string;
  template_id: string;
  field_type: "text" | "number" | "textarea" | "attachment";
  label: string;
  is_required: boolean;
  position: number;
}

export interface TaskTemplate {
  id: string;
  workspace_id: string;
  created_by: string;
  name: string;
  description: string | null;
  created_at: string;
  fields?: TaskTemplateField[];
}

export function useTaskTemplates(workspaceId: string | null) {
  return useQuery({
    queryKey: ["task-templates", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data, error } = await supabase
        .from("task_templates")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as TaskTemplate[];
    },
    enabled: !!workspaceId,
  });
}

export function useTaskTemplateWithFields(templateId: string | null) {
  return useQuery({
    queryKey: ["task-template-fields", templateId],
    queryFn: async () => {
      if (!templateId) return null;
      const [templateRes, fieldsRes] = await Promise.all([
        supabase.from("task_templates").select("*").eq("id", templateId).single(),
        supabase.from("task_template_fields").select("*").eq("template_id", templateId).order("position"),
      ]);
      if (templateRes.error) throw templateRes.error;
      if (fieldsRes.error) throw fieldsRes.error;
      return {
        ...templateRes.data,
        fields: fieldsRes.data,
      } as TaskTemplate & { fields: TaskTemplateField[] };
    },
    enabled: !!templateId,
  });
}

export function useCreateTaskTemplate() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      workspaceId,
      name,
      description,
      fields,
      defaultAssignees,
      checklistItems,
    }: {
      workspaceId: string;
      name: string;
      description?: string;
      fields: Omit<TaskTemplateField, "id" | "template_id">[];
      defaultAssignees?: string[];
      checklistItems?: string[];
    }) => {
      if (!user) throw new Error("Not authenticated");

      const { data: template, error: templateError } = await supabase
        .from("task_templates")
        .insert({
          workspace_id: workspaceId,
          created_by: user.id,
          name,
          description: description || null,
          checklist_items: checklistItems && checklistItems.length > 0 ? checklistItems : [],
        })
        .select()
        .single();

      if (templateError) throw templateError;

      if (fields.length > 0) {
        const { error: fieldsError } = await supabase
          .from("task_template_fields")
          .insert(
            fields.map((f, i) => ({
              template_id: template.id,
              field_type: f.field_type,
              label: f.label,
              is_required: f.is_required,
              position: i,
            }))
          );
        if (fieldsError) throw fieldsError;
      }

      // Save default assignees
      if (defaultAssignees && defaultAssignees.length > 0) {
        await supabase.from("task_template_assignees").insert(
          defaultAssignees.map(userId => ({
            template_id: template.id,
            user_id: userId,
          }))
        );
      }

      return template;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["task-templates", vars.workspaceId] });
      toast.success("Fluxo de tarefa criado!");
    },
    onError: () => {
      toast.error("Erro ao criar fluxo de tarefa");
    },
  });
}

export function useDeleteTaskTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ templateId, workspaceId }: { templateId: string; workspaceId: string }) => {
      const { error } = await supabase.from("task_templates").delete().eq("id", templateId);
      if (error) throw error;
      return workspaceId;
    },
    onSuccess: (workspaceId) => {
      queryClient.invalidateQueries({ queryKey: ["task-templates", workspaceId] });
      toast.success("Fluxo removido");
    },
    onError: () => {
      toast.error("Erro ao remover fluxo");
    },
  });
}
