import { useState, useEffect } from "react";
import { ClipboardList, User, Bell, ShieldCheck } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTaskTemplateWithFields, type TaskTemplate } from "@/hooks/useTaskTemplates";
import { useCreateTaskInstance } from "@/hooks/useTaskInstances";
import { useSendMessage } from "@/hooks/useMessages";
import { useWorkspaceMembers } from "@/hooks/useWorkspaceMembers";
import { useWorkspaceContext } from "@/contexts/WorkspaceContext";
import { useFileUpload } from "@/hooks/useFileUpload";
import { FilePreview } from "@/components/message/FilePreview";

interface Props {
  open: boolean;
  onClose: () => void;
  template: TaskTemplate | null;
  channelId: string;
}

export function TaskFormDialog({ open, onClose, template, channelId }: Props) {
  const { data: templateWithFields } = useTaskTemplateWithFields(template?.id || null);
  const { currentWorkspace } = useWorkspaceContext();
  const { data: members = [] } = useWorkspaceMembers(currentWorkspace?.id || null);
  const createTaskInstance = useCreateTaskInstance();
  const sendMessage = useSendMessage();
  const { uploadFiles } = useFileUpload();

  const [fieldValues, setFieldValues] = useState<Record<string, { text?: string; number?: number; fileUrl?: string; fileName?: string }>>({});
  const [assignedTo, setAssignedTo] = useState<string>("");
  const [requiresApproval, setRequiresApproval] = useState(false);

  // Reset form when template changes
  useEffect(() => {
    if (template) {
      setFieldValues({});
      setAssignedTo("");
      setRequiresApproval(false);
    }
  }, [template?.id]);

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

  const handleSubmit = async () => {
    if (!template || !templateWithFields) return;

    // Validate required fields
    for (const field of fields) {
      if (field.is_required) {
        const val = fieldValues[field.id];
        if (field.field_type === "attachment") {
          if (!val?.fileUrl) {
            return;
          }
        } else if (field.field_type === "number") {
          if (val?.number === undefined || val?.number === null) {
            return;
          }
        } else {
          if (!val?.text?.trim()) {
            return;
          }
        }
      }
    }

    // Build summary for chat message
    const summary = fields
      .map((f) => {
        const val = fieldValues[f.id];
        if (f.field_type === "number") return `**${f.label}:** ${val?.number ?? "-"}`;
        if (f.field_type === "attachment") return `**${f.label}:** ${val?.fileName || "-"}`;
        return `**${f.label}:** ${val?.text || "-"}`;
      })
      .join("\n");

    const messageContent = `📋 **${template.name}**\n${summary}`;

    // Send the message first
    const message = await sendMessage.mutateAsync({
      channelId,
      content: messageContent,
    });

    // Create the task instance linked to the message
    await createTaskInstance.mutateAsync({
      templateId: template.id,
      channelId,
      assignedTo: assignedTo || undefined,
      requiresApproval,
      messageId: message.id,
      fieldValues: fields.map((f) => ({
        templateFieldId: f.id,
        valueText: fieldValues[f.id]?.text || undefined,
        valueNumber: fieldValues[f.id]?.number,
        fileUrl: fieldValues[f.id]?.fileUrl || undefined,
        fileName: fieldValues[f.id]?.fileName || undefined,
      })),
    });

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

          {/* Assign to user */}
          <div>
            <Label className="flex items-center gap-1">
              <User className="h-3.5 w-3.5" />
              Atribuir a (opcional)
            </Label>
            <Select value={assignedTo} onValueChange={setAssignedTo}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Selecionar membro" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Ninguém</SelectItem>
                {members.map((m) => (
                  <SelectItem key={m.user_id} value={m.user_id}>
                    {m.profile?.display_name || "Usuário"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

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
