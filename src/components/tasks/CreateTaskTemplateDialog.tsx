import { useState } from "react";
import { ClipboardList, Plus, X, GripVertical, Type, Hash, AlignLeft, Paperclip, Users, CheckSquare, RotateCcw } from "lucide-react";
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
import { useCreateTaskTemplate, type TaskTemplateField } from "@/hooks/useTaskTemplates";
import { useCreateRecurrenceRule } from "@/hooks/useTaskRecurrence";
import { useWorkspaceMembers } from "@/hooks/useWorkspaceMembers";
import { useChannelsByWorkspace } from "@/hooks/useChannelsList";
import { cn } from "@/lib/utils";

type FieldDraft = Omit<TaskTemplateField, "id" | "template_id">;

const fieldTypeIcons = {
  text: Type,
  number: Hash,
  textarea: AlignLeft,
  attachment: Paperclip,
};

const fieldTypeLabels = {
  text: "Texto",
  number: "Número",
  textarea: "Descrição",
  attachment: "Anexo",
};

interface Props {
  open: boolean;
  onClose: () => void;
  workspaceId: string;
}

export function CreateTaskTemplateDialog({ open, onClose, workspaceId }: Props) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [fields, setFields] = useState<FieldDraft[]>([
    { field_type: "text", label: "", is_required: false, position: 0 },
  ]);
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
  const [checklistItems, setChecklistItems] = useState<string[]>([]);
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceType, setRecurrenceType] = useState<"daily" | "weekly" | "monthly">("daily");
  const [recurrenceDay, setRecurrenceDay] = useState("1"); // day of week (0-6) or day of month (1-31)
  const [recurrenceHour, setRecurrenceHour] = useState("09");
  const [recurrenceMinute, setRecurrenceMinute] = useState("00");
  const [recurrenceChannelId, setRecurrenceChannelId] = useState("");

  const createTemplate = useCreateTaskTemplate();
  const createRecurrence = useCreateRecurrenceRule();
  const { data: members = [] } = useWorkspaceMembers(workspaceId);
  const { data: channels = [] } = useChannelsByWorkspace(workspaceId);

  const addField = () => {
    setFields((prev) => [
      ...prev,
      { field_type: "text", label: "", is_required: false, position: prev.length },
    ]);
  };

  const removeField = (index: number) => {
    setFields((prev) => prev.filter((_, i) => i !== index));
  };

  const updateField = (index: number, updates: Partial<FieldDraft>) => {
    setFields((prev) =>
      prev.map((f, i) => (i === index ? { ...f, ...updates } : f))
    );
  };

  const toggleAssignee = (userId: string) => {
    setSelectedAssignees((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const addChecklistItem = () => setChecklistItems((prev) => [...prev, ""]);
  const removeChecklistItem = (index: number) => setChecklistItems((prev) => prev.filter((_, i) => i !== index));
  const updateChecklistItem = (index: number, value: string) => {
    setChecklistItems((prev) => prev.map((item, i) => (i === index ? value : item)));
  };

  const buildCron = () => {
    const h = recurrenceHour;
    const m = recurrenceMinute;
    if (recurrenceType === "daily") return `${m} ${h} * * *`;
    if (recurrenceType === "weekly") return `${m} ${h} * * ${recurrenceDay}`;
    return `${m} ${h} ${recurrenceDay} * *`; // monthly
  };

  const computeNextRun = () => {
    const now = new Date();
    const hour = parseInt(recurrenceHour);
    const minute = parseInt(recurrenceMinute);
    const next = new Date(now);
    next.setHours(hour, minute, 0, 0);
    if (next <= now) next.setDate(next.getDate() + 1);
    return next.toISOString();
  };

  const handleSubmit = async () => {
    if (!name.trim()) return;
    const validFields = fields.filter((f) => f.label.trim());
    const validChecklist = checklistItems.filter((c) => c.trim());
    // Must have at least one field OR one checklist item
    if (validFields.length === 0 && validChecklist.length === 0) return;

    const template = await createTemplate.mutateAsync({
      workspaceId,
      name: name.trim(),
      description: description.trim() || undefined,
      fields: validFields,
      defaultAssignees: selectedAssignees,
      checklistItems: validChecklist,
    });

    // Create recurrence rule if enabled
    if (isRecurring && recurrenceChannelId && template) {
      await createRecurrence.mutateAsync({
        templateId: template.id,
        channelId: recurrenceChannelId,
        cronExpression: buildCron(),
        autoAssignees: selectedAssignees,
        nextRunAt: computeNextRun(),
      });
    }

    // Reset form
    setName("");
    setDescription("");
    setFields([{ field_type: "text", label: "", is_required: false, position: 0 }]);
    setSelectedAssignees([]);
    setChecklistItems([]);
    setIsRecurring(false);
    setRecurrenceChannelId("");
    onClose();
  };

  const weekDays = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-primary" />
            Criar Fluxo de Tarefa
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Nome do fluxo</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Nota de Encomenda"
              className="mt-1"
            />
          </div>

          <div>
            <Label>Descrição (opcional)</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva o propósito deste fluxo..."
              className="mt-1"
              rows={2}
            />
          </div>

          {/* Form Fields */}
          <div>
            <Label className="mb-2 block">Campos do formulário</Label>
            <div className="space-y-2">
              {fields.map((field, index) => {
                const Icon = fieldTypeIcons[field.field_type];
                return (
                  <div
                    key={index}
                    className="flex items-center gap-2 p-2 rounded-lg border border-border bg-secondary/30"
                  >
                    <GripVertical className="h-4 w-4 text-muted-foreground shrink-0 cursor-grab" />
                    <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                    <Input
                      value={field.label}
                      onChange={(e) => updateField(index, { label: e.target.value })}
                      placeholder="Nome do campo"
                      className="flex-1 h-8 text-sm"
                    />
                    <Select
                      value={field.field_type}
                      onValueChange={(v) =>
                        updateField(index, { field_type: v as FieldDraft["field_type"] })
                      }
                    >
                      <SelectTrigger className="w-28 h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(fieldTypeLabels).map(([key, label]) => (
                          <SelectItem key={key} value={key} className="text-xs">
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="flex items-center gap-1">
                      <Switch
                        checked={field.is_required}
                        onCheckedChange={(v) => updateField(index, { is_required: v })}
                        className="scale-75"
                      />
                      <span className="text-xs text-muted-foreground whitespace-nowrap">Obrig.</span>
                    </div>
                    {fields.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0"
                        onClick={() => removeField(index)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
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
                        <AvatarFallback className="text-[8px]">
                          {(member?.profile?.display_name || "U").charAt(0)}
                        </AvatarFallback>
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
                    <Checkbox
                      checked={selectedAssignees.includes(m.user_id)}
                      onCheckedChange={() => toggleAssignee(m.user_id)}
                    />
                    <Avatar className="h-5 w-5">
                      <AvatarImage src={m.profile?.avatar_url || undefined} />
                      <AvatarFallback className="text-[8px]">
                        {(m.profile?.display_name || "U").charAt(0)}
                      </AvatarFallback>
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
                  <Input
                    value={item}
                    onChange={(e) => updateChecklistItem(index, e.target.value)}
                    placeholder={`Item ${index + 1}`}
                    className="flex-1 h-8 text-sm"
                  />
                  <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => removeChecklistItem(index)}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
            <Button variant="outline" size="sm" className="mt-2 w-full rounded-lg" onClick={addChecklistItem}>
              <Plus className="h-4 w-4 mr-1" />
              Adicionar item
            </Button>
          </div>

          {/* Recurrence */}
          <div className="space-y-3 p-3 rounded-lg border border-border bg-secondary/20">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-1.5 cursor-pointer">
                <RotateCcw className="h-4 w-4 text-primary" />
                Tarefa recorrente
              </Label>
              <Switch checked={isRecurring} onCheckedChange={setIsRecurring} />
            </div>

            {isRecurring && (
              <div className="space-y-3">
                <div>
                  <Label className="text-xs">Canal de envio</Label>
                  <Select value={recurrenceChannelId} onValueChange={setRecurrenceChannelId}>
                    <SelectTrigger className="h-8 text-sm mt-1">
                      <SelectValue placeholder="Selecione um canal" />
                    </SelectTrigger>
                    <SelectContent>
                      {channels.map((c) => (
                        <SelectItem key={c.id} value={c.id} className="text-sm">#{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs">Frequência</Label>
                  <Select value={recurrenceType} onValueChange={(v) => setRecurrenceType(v as any)}>
                    <SelectTrigger className="h-8 text-sm mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Diária</SelectItem>
                      <SelectItem value="weekly">Semanal</SelectItem>
                      <SelectItem value="monthly">Mensal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {recurrenceType === "weekly" && (
                  <div>
                    <Label className="text-xs">Dia da semana</Label>
                    <Select value={recurrenceDay} onValueChange={setRecurrenceDay}>
                      <SelectTrigger className="h-8 text-sm mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {weekDays.map((d, i) => (
                          <SelectItem key={i} value={String(i)}>{d}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {recurrenceType === "monthly" && (
                  <div>
                    <Label className="text-xs">Dia do mês</Label>
                    <Input
                      type="number"
                      min={1}
                      max={28}
                      value={recurrenceDay}
                      onChange={(e) => setRecurrenceDay(e.target.value)}
                      className="h-8 text-sm mt-1"
                    />
                  </div>
                )}

                <div className="flex gap-2">
                  <div className="flex-1">
                    <Label className="text-xs">Hora</Label>
                    <Input
                      type="number"
                      min={0}
                      max={23}
                      value={recurrenceHour}
                      onChange={(e) => setRecurrenceHour(e.target.value.padStart(2, "0"))}
                      className="h-8 text-sm mt-1"
                    />
                  </div>
                  <div className="flex-1">
                    <Label className="text-xs">Minuto</Label>
                    <Input
                      type="number"
                      min={0}
                      max={59}
                      value={recurrenceMinute}
                      onChange={(e) => setRecurrenceMinute(e.target.value.padStart(2, "0"))}
                      className="h-8 text-sm mt-1"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!name.trim() || (fields.every((f) => !f.label.trim()) && checklistItems.every((c) => !c.trim())) || createTemplate.isPending}
              className="gradient-primary text-white"
            >
              {createTemplate.isPending ? "Criando..." : "Criar Fluxo"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
