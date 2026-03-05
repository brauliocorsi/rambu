import { useState } from "react";
import { BarChart3, Plus, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useCreatePoll } from "@/hooks/usePolls";
import { useSendMessage } from "@/hooks/useMessages";

interface Props {
  open: boolean;
  onClose: () => void;
  channelId: string;
}

export function CreatePollDialog({ open, onClose, channelId }: Props) {
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [isMultipleChoice, setIsMultipleChoice] = useState(false);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const createPoll = useCreatePoll();
  const sendMessage = useSendMessage();

  const addOption = () => {
    if (options.length < 10) setOptions([...options, ""]);
  };

  const removeOption = (index: number) => {
    if (options.length > 2) setOptions(options.filter((_, i) => i !== index));
  };

  const updateOption = (index: number, value: string) => {
    const updated = [...options];
    updated[index] = value;
    setOptions(updated);
  };

  const handleSubmit = async () => {
    const trimmedQuestion = question.trim();
    const validOptions = options.map((o) => o.trim()).filter(Boolean);
    if (!trimmedQuestion || validOptions.length < 2) return;

    // Send message first
    const optionsList = validOptions.map((o, i) => `${i + 1}. ${o}`).join("\n");
    const messageContent = `📊 **Enquete: ${trimmedQuestion}**\n${optionsList}`;

    const message = await sendMessage.mutateAsync({
      channelId,
      content: messageContent,
    });

    await createPoll.mutateAsync({
      channelId,
      question: trimmedQuestion,
      options: validOptions,
      isMultipleChoice,
      isAnonymous,
      messageId: message.id,
    });

    // Reset form
    setQuestion("");
    setOptions(["", ""]);
    setIsMultipleChoice(false);
    setIsAnonymous(false);
    onClose();
  };

  const isValid = question.trim() && options.filter((o) => o.trim()).length >= 2;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Criar Enquete
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Pergunta</Label>
            <Input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Qual é a sua pergunta?"
              className="mt-1"
              maxLength={500}
            />
          </div>

          <div className="space-y-2">
            <Label>Opções</Label>
            {options.map((opt, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground w-5 text-center">{i + 1}</span>
                <Input
                  value={opt}
                  onChange={(e) => updateOption(i, e.target.value)}
                  placeholder={`Opção ${i + 1}`}
                  maxLength={200}
                />
                {options.length > 2 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={() => removeOption(i)}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                  </Button>
                )}
              </div>
            ))}
            {options.length < 10 && (
              <Button variant="ghost" size="sm" className="text-xs" onClick={addOption}>
                <Plus className="h-3.5 w-3.5 mr-1" />
                Adicionar opção
              </Button>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
              <Label className="cursor-pointer text-sm">Múltipla escolha</Label>
              <Switch checked={isMultipleChoice} onCheckedChange={setIsMultipleChoice} />
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
              <Label className="cursor-pointer text-sm">Voto anônimo</Label>
              <Switch checked={isAnonymous} onCheckedChange={setIsAnonymous} />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!isValid || createPoll.isPending}
              className="gradient-primary text-white"
            >
              {createPoll.isPending ? "Criando..." : "Criar Enquete"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
