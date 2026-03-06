import { useState, useEffect } from "react";
import { ClipboardList, ShieldCheck, X, CheckSquare, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { MemberSelector } from "@/components/tasks/MemberSelector";
import { useTaskTemplateWithFields, type TaskTemplate } from "@/hooks/useTaskTemplates";
import { useTaskTemplateAssignees } from "@/hooks/useTaskTemplateAssignees";
import { useCreateTaskInstance } from "@/hooks/useTaskInstances";
import { useSendMessage } from "@/hooks/useMessages";
import { useWorkspaceMembers } from "@/hooks/useWorkspaceMembers";
import { useWorkspaceContext } from "@/contexts/WorkspaceContext";
import { useFileUpload } from "@/hooks/useFileUpload";
import { FilePreview } from "@/components/message/FilePreview";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  open: boolean;
  onClose: () => void;
  template: TaskTemplate | null;
  channelId?: string;
  dmId?: string;
}

export function TaskFormDialog({ open, onClose, template, channelId, dmId }: Props) {
  const { data: templateWithFields } = useTaskTemplateWithFields(template?.id || null);
  const { data: templateAssignees = [] } = useTaskTemplateAssignees(template?.id || null);
  const { currentWorkspace } = useWorkspaceContext();
  const { data: members = [] } = useWorkspaceMembers(currentWorkspace?.id || null);
  const createTaskInstance = useCreateTaskInstance();
  const sendMessage = useSendMessage();
  const { uploadFiles } = useFileUpload();

  const [fieldValues, setFieldValues] = useState<Record<string, { text?: string; number?: number; fileUrl?: string; fileName?: string }>>({});
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
  const [requiresApproval, setRequiresApproval] = useState(false);
  const [checklistItems, setChecklistItems] = useState<string[]>([]);

  // Reset form and pre-fill from template defaults
  useEffect(() => {
    if (template) {
      setFieldValues({});
      setRequiresApproval(false);
      // Pre-fill assignees from template defaults
      setSelectedAssignees(templateAssignees.map(a => a.user_id));
      // Pre-fill checklist from template
      const templateChecklist = (templateWithFields as any)?.checklist_items;
      if (Array.isArray(templateChecklist)) {
        setChecklistItems(templateChecklist.filter((i: any) => typeof i === "string" && i.trim()));
      } else {
        setChecklistItems([]);
      }
    }
  }, [template?.id, templateAssignees, templateWithFields]);

  const fields = templateWithFields?.fields || [];

  const updateFieldValue = (fieldId: string, updates: typeof fieldValues[string]) => {
    setFieldValues((prev) => ({
      ...prev,
      [fieldId]: { ...prev[fieldId], ...updates },
    }));
  };

  const handleFileUpload = async (fieldId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    const uploaded = await uploadFiles(files);
    if (uploaded.length > 0) {
      updateFieldValue(fieldId, {
        fileUrl: uploaded[0].url,
        fileName: uploaded[0].name,
      });
    }
  };

  const toggleAssignee = (userId: string) => {
    setSelectedAssignees((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleSubmit = async () => {
    if (!template || !templateWithFields) return;

    // Validate required fields
    for (const field of fields) {
      if (field.is_required) {
        const val = fieldValues[field.id];
        if (field.field_type === "attachment") {
          if (!val?.fileUrl) return;
        } else if (field.field_type === "number") {
          if (val?.number === undefined || val?.number === null) return;
        } else {
          if (!val?.text?.trim()) return;
        }
      }
    }

    // Build summary for chat message
    const fieldSummary = fields.length > 0
      ? fields
          .map((f) => {
            const val = fieldValues[f.id];
            if (f.field_type === "number") return `**${f.label}:** ${val?.number ?? "-"}`;
            if (f.field_type === "attachment") return `**${f.label}:** ${val?.fileName || "-"}`;
            return `**${f.label}:** ${val?.text || "-"}`;
          })
          .join("\n")
      : "";

    const assigneeNames = selectedAssignees
      .map((id) => members.find((m) => m.user_id === id)?.profile?.display_name || "Usuário")
      .join(", ");

    const assigneeInfo = selectedAssignees.length > 0
      ? `\n👥 **Atribuído a:** ${assigneeNames}`
      : "";

    const checklistInfo = checklistItems.length > 0
      ? `\n✅ **Checklist:** ${checklistItems.length} item(ns)`
      : "";

    const messageContent = `📋 **${template.name}**${fieldSummary ? "\n" + fieldSummary : ""}${assigneeInfo}${checklistInfo}`;

    // Send the message first
    let messageId: string;
    if (dmId) {
      // Send as DM message
      const { useSendDMMessage } = await import("@/hooks/useDirectMessages");
      // We need to use supabase directly here since we can't use hooks dynamically
      const { data: dmMsg, error: dmErr } = await supabase
        .from("dm_messages")
        .insert({
          dm_id: dmId,
          user_id: (await supabase.auth.getUser()).data.user?.id!,
          content: messageContent,
        })
        .select()
        .single();
      if (dmErr) throw dmErr;
      messageId = dmMsg.id;
      // Update last_message_at
      await supabase
        .from("direct_messages")
        .update({ last_message_at: new Date().toISOString() })
        .eq("id", dmId);
    } else if (channelId) {
      const message = await sendMessage.mutateAsync({
        channelId,
        content: messageContent,
      });
      messageId = message.id;
    } else {
      return;
    }

    // Create the task instance (use first assignee for backward compat)
    const instance = await createTaskInstance.mutateAsync({
      templateId: template.id,
      channelId: channelId || undefined,
      dmId: dmId || undefined,
      assignedTo: selectedAssignees[0] || undefined,
      requiresApproval,
      messageId,
      fieldValues: fields.map((f) => ({
        templateFieldId: f.id,
        valueText: fieldValues[f.id]?.text || undefined,
        valueNumber: fieldValues[f.id]?.number,
        fileUrl: fieldValues[f.id]?.fileUrl || undefined,
        fileName: fieldValues[f.id]?.fileName || undefined,
      })),
    });

    // Add all assignees to task_assignees table
    if (selectedAssignees.length > 0) {
      await supabase.from("task_assignees").insert(
        selectedAssignees.map((userId) => ({
          task_instance_id: instance.id,
          user_id: userId,
        }))
      );
    }

    // Create checklist items
    const validChecklist = checklistItems.filter(c => c.trim());
    if (validChecklist.length > 0) {
      await supabase.from("task_checklist_items").insert(
        validChecklist.map((label, i) => ({
          task_instance_id: instance.id,
          label: label.trim(),
          position: i,
        }))
      );
    }

    onClose();
  };

  if (!template) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-primary" />
            {template.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Dynamic fields */}
          {fields.map((field) => (
            <div key={field.id}>
              <Label className="flex items-center gap-1">
                {field.label}
                {field.is_required && <span className="text-destructive">*</span>}
              </Label>

              {field.field_type === "text" && (
                <Input
                  value={fieldValues[field.id]?.text || ""}
                  onChange={(e) => updateFieldValue(field.id, { text: e.target.value })}
                  className="mt-1"
                  placeholder={`Insira ${field.label.toLowerCase()}`}
                />
              )}

              {field.field_type === "number" && (
                <Input
                  type="number"
                  value={fieldValues[field.id]?.number ?? ""}
                  onChange={(e) => updateFieldValue(field.id, { number: e.target.value ? Number(e.target.value) : undefined })}
                  className="mt-1"
                  placeholder="0"
                />
              )}

              {field.field_type === "textarea" && (
                <Textarea
                  value={fieldValues[field.id]?.text || ""}
                  onChange={(e) => updateFieldValue(field.id, { text: e.target.value })}
                  className="mt-1"
                  placeholder={`Insira ${field.label.toLowerCase()}`}
                  rows={3}
                />
              )}

              {field.field_type === "attachment" && (
                <div className="mt-1">
                  {fieldValues[field.id]?.fileUrl ? (
                    <div className="flex items-center gap-2">
                      <FilePreview
                        url={fieldValues[field.id]!.fileUrl!}
                        name={fieldValues[field.id]!.fileName!}
                        type="application/octet-stream"
                        compact
                        onRemove={() => updateFieldValue(field.id, { fileUrl: undefined, fileName: undefined })}
                      />
                    </div>
                  ) : (
                    <Input
                      type="file"
                      onChange={(e) => handleFileUpload(field.id, e)}
                      className="mt-1"
                    />
                  )}
                </div>
              )}
            </div>
          ))}

          {/* Multi-assign to users */}
          <MemberSelector
            members={members}
            selectedAssignees={selectedAssignees}
            toggleAssignee={toggleAssignee}
            label="Atribuir a (selecione um ou mais)"
          />

          {/* Checklist items */}
          {checklistItems.length > 0 && (
            <div>
              <Label className="flex items-center gap-1.5 mb-2">
                <CheckSquare className="h-3.5 w-3.5" />
                Checklist
              </Label>
              <div className="space-y-1.5">
                {checklistItems.map((item, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      value={item}
                      onChange={(e) => {
                        setChecklistItems(prev => prev.map((it, i) => i === index ? e.target.value : it));
                      }}
                      placeholder={`Item ${index + 1}`}
                      className="flex-1 h-8 text-sm"
                    />
                    <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => {
                      setChecklistItems(prev => prev.filter((_, i) => i !== index));
                    }}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="mt-2 w-full rounded-lg"
                onClick={() => setChecklistItems(prev => [...prev, ""])}
              >
                <Plus className="h-4 w-4 mr-1" />
                Adicionar item
              </Button>
            </div>
          )}

          {/* Requires approval */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
            <Label className="flex items-center gap-1.5 cursor-pointer">
              <ShieldCheck className="h-4 w-4 text-primary" />
              Pedir aprovação
            </Label>
            <Switch checked={requiresApproval} onCheckedChange={setRequiresApproval} />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createTaskInstance.isPending}
              className="gradient-primary text-white"
            >
              {createTaskInstance.isPending ? "Enviando..." : "Enviar Tarefa"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
