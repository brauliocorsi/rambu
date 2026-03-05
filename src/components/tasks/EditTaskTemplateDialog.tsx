import { useState, useEffect } from "react";
import { ClipboardList, Plus, X, GripVertical, Type, Hash, AlignLeft, Paperclip, Users, CheckSquare } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useTaskTemplateWithFields, useUpdateTaskTemplate, type TaskTemplateField } from "@/hooks/useTaskTemplates";
import { useTaskTemplateAssignees } from "@/hooks/useTaskTemplateAssignees";
import { useWorkspaceMembers } from "@/hooks/useWorkspaceMembers";

type FieldDraft = Omit<TaskTemplateField, "id" | "template_id">;

const fieldTypeLabels = {
  text: "Texto",
  number: "Número",
  textarea: "Descrição",
  attachment: "Anexo",
};

const fieldTypeIcons = {
  text: Type,
  number: Hash,
  textarea: AlignLeft,
  attachment: Paperclip,
};

interface Props {
  open: boolean;
  onClose: () => void;
  templateId: string;
  workspaceId: string;
}

export function EditTaskTemplateDialog({ open, onClose, templateId, workspaceId }: Props) {
  const { data: templateWithFields } = useTaskTemplateWithFields(open ? templateId : null);
  const { data: templateAssignees = [] } = useTaskTemplateAssignees(open ? templateId : null);
  const { data: members = [] } = useWorkspaceMembers(workspaceId);
  const updateTemplate = useUpdateTaskTemplate();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [fields, setFields] = useState<FieldDraft[]>([]);
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
  const [checklistItems, setChecklistItems] = useState<string[]>([]);

  useEffect(() => {
    if (templateWithFields) {
      setName(templateWithFields.name);
      setDescription(templateWithFields.description || "");
      setFields(
        (templateWithFields.fields || []).map((f) => ({
          field_type: f.field_type,
          label: f.label,
          is_required: f.is_required,
          position: f.position,
        }))
      );
      const cl = (templateWithFields as any)?.checklist_items;
      setChecklistItems(Array.isArray(cl) ? cl.filter((i: any) => typeof i === "string" && i.trim()) : []);
    }
  }, [templateWithFields]);

  useEffect(() => {
    setSelectedAssignees(templateAssignees.map((a) => a.user_id));
  }, [templateAssignees]);

  const addField = () => setFields((prev) => [...prev, { field_type: "text", label: "", is_required: false, position: prev.length }]);
  const removeField = (index: number) => setFields((prev) => prev.filter((_, i) => i !== index));
  const updateField = (index: number, updates: Partial<FieldDraft>) => {
    setFields((prev) => prev.map((f, i) => (i === index ? { ...f, ...updates } : f)));
  };
  const toggleAssignee = (userId: string) => {
    setSelectedAssignees((prev) => prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]);
  };

  const handleSubmit = async () => {
    if (!name.trim()) return;
    const validFields = fields.filter((f) => f.label.trim());
    const validChecklist = checklistItems.filter((c) => c.trim());
    if (validFields.length === 0 && validChecklist.length === 0) return;

    await updateTemplate.mutateAsync({
      templateId,
      workspaceId,
      name: name.trim(),
      description: description.trim() || undefined,
      fields: validFields,
      defaultAssignees: selectedAssignees,
      checklistItems: validChecklist,
    });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-primary" />
            Editar Fluxo de Tarefa
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Nome do fluxo</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1" />
          </div>

          <div>
            <Label>Descrição (opcional)</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1" rows={2} />
          </div>

          {/* Fields */}
          <div>
            <Label className="mb-2 block">Campos do formulário (opcional)</Label>
            <div className="space-y-2">
              {fields.map((field, index) => {
                const Icon = fieldTypeIcons[field.field_type];
                return (
                  <div key={index} className="flex items-center gap-2 p-2 rounded-lg border border-border bg-secondary/30">
                    <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                    <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                    <Input value={field.label} onChange={(e) => updateField(index, { label: e.target.value })} placeholder="Nome do campo" className="flex-1 h-8 text-sm" />
                    <Select value={field.field_type} onValueChange={(v) => updateField(index, { field_type: v as FieldDraft["field_type"] })}>
                      <SelectTrigger className="w-28 h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(fieldTypeLabels).map(([key, label]) => (
                          <SelectItem key={key} value={key} className="text-xs">{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="flex items-center gap-1">
                      <Switch checked={field.is_required} onCheckedChange={(v) => updateField(index, { is_required: v })} className="scale-75" />
                      <span className="text-xs text-muted-foreground whitespace-nowrap">Obrig.</span>
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => removeField(index)}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                );
              })}
            </div>
            <Button variant="outline" size="sm" className="mt-2 w-full rounded-lg" onClick={addField}>
              <Plus className="h-4 w-4 mr-1" />
              Adicionar campo
            </Button>
          </div>

          {/* Auto-assign */}
          <div>
            <Label className="flex items-center gap-1.5 mb-2">
              <Users className="h-3.5 w-3.5" />
              Auto-atribuição (opcional)
            </Label>
            {selectedAssignees.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {selectedAssignees.map((userId) => {
                  const member = members.find((m) => m.user_id === userId);
                  return (
                    <Badge key={userId} variant="secondary" className="flex items-center gap-1 pr-1">
                      <Avatar className="h-4 w-4">
                        <AvatarImage src={member?.profile?.avatar_url || undefined} />
                        <AvatarFallback className="text-[8px]">{(member?.profile?.display_name || "U").charAt(0)}</AvatarFallback>
                      </Avatar>
                      <span className="text-xs">{member?.profile?.display_name || "Usuário"}</span>
                      <button onClick={() => toggleAssignee(userId)} className="ml-0.5 rounded-full hover:bg-muted p-0.5">
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  );
                })}
              </div>
            )}
            <ScrollArea className="max-h-48 border rounded-lg">
              <div className="p-1">
                {members.map((m) => (
                  <label key={m.user_id} className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-secondary/50 cursor-pointer">
                    <Checkbox checked={selectedAssignees.includes(m.user_id)} onCheckedChange={() => toggleAssignee(m.user_id)} />
                    <Avatar className="h-5 w-5">
                      <AvatarImage src={m.profile?.avatar_url || undefined} />
                      <AvatarFallback className="text-[8px]">{(m.profile?.display_name || "U").charAt(0)}</AvatarFallback>
                    </Avatar>
                    <span className="text-sm">{m.profile?.display_name || "Usuário"}</span>
                  </label>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Checklist */}
          <div>
            <Label className="flex items-center gap-1.5 mb-2">
              <CheckSquare className="h-3.5 w-3.5" />
              Checklist (opcional)
            </Label>
            <div className="space-y-1.5">
              {checklistItems.map((item, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input value={item} onChange={(e) => setChecklistItems(prev => prev.map((it, i) => i === index ? e.target.value : it))} placeholder={`Item ${index + 1}`} className="flex-1 h-8 text-sm" />
                  <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => setChecklistItems(prev => prev.filter((_, i) => i !== index))}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
            <Button variant="outline" size="sm" className="mt-2 w-full rounded-lg" onClick={() => setChecklistItems(prev => [...prev, ""])}>
              <Plus className="h-4 w-4 mr-1" />
              Adicionar item
            </Button>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={onClose}>Cancelar</Button>
            <Button
              onClick={handleSubmit}
              disabled={!name.trim() || (fields.every((f) => !f.label.trim()) && checklistItems.every((c) => !c.trim())) || updateTemplate.isPending}
              className="gradient-primary text-white"
            >
              {updateTemplate.isPending ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
