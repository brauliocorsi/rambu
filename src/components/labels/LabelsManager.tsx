import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2 } from "lucide-react";
import { useLabels, useCreateLabel, useDeleteLabel } from "@/hooks/useLabels";

const PRESET_COLORS = ["#6366f1", "#22c55e", "#ef4444", "#eab308", "#06b6d4", "#a855f7", "#f97316"];

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function LabelsManager({ open, onOpenChange }: Props) {
  const { data: labels = [] } = useLabels();
  const createLabel = useCreateLabel();
  const deleteLabel = useDeleteLabel();
  const [name, setName] = useState("");
  const [color, setColor] = useState(PRESET_COLORS[0]);

  const submit = () => {
    if (!name.trim()) return;
    createLabel.mutate({ name: name.trim(), color }, { onSuccess: () => setName("") });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl max-w-md">
        <DialogHeader>
          <DialogTitle>Etiquetas</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex gap-2">
              <Input
                placeholder="Nome da etiqueta"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submit()}
                className="rounded-xl"
              />
              <Button onClick={submit} className="rounded-xl" disabled={!name.trim()}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex gap-2 flex-wrap">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className="h-7 w-7 rounded-full border-2 transition-transform"
                  style={{ backgroundColor: c, borderColor: color === c ? "hsl(var(--foreground))" : "transparent" }}
                />
              ))}
            </div>
          </div>

          <div className="space-y-2 max-h-72 overflow-y-auto">
            {labels.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhuma etiqueta criada</p>
            ) : (
              labels.map((label) => (
                <div key={label.id} className="flex items-center justify-between p-2 rounded-xl bg-muted/40">
                  <Badge style={{ backgroundColor: label.color, color: "white" }} className="rounded-md">
                    {label.name}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 rounded-lg text-destructive"
                    onClick={() => deleteLabel.mutate(label.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}