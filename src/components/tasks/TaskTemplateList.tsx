import { ClipboardList, Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTaskTemplates, useDeleteTaskTemplate } from "@/hooks/useTaskTemplates";
import { cn } from "@/lib/utils";

interface Props {
  workspaceId: string;
  onCreateNew: () => void;
}

export function TaskTemplateList({ workspaceId, onCreateNew }: Props) {
  const { data: templates = [], isLoading } = useTaskTemplates(workspaceId);
  const deleteTemplate = useDeleteTaskTemplate();

  if (isLoading) {
    return <div className="text-sm text-muted-foreground p-4">Carregando...</div>;
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-sm font-semibold flex items-center gap-1.5">
          <ClipboardList className="h-4 w-4 text-primary" />
          Fluxos de Tarefa
        </h3>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onCreateNew}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {templates.length === 0 ? (
        <div className="text-center py-6">
          <p className="text-sm text-muted-foreground mb-2">Nenhum fluxo criado</p>
          <Button variant="outline" size="sm" onClick={onCreateNew}>
            <Plus className="h-4 w-4 mr-1" />
            Criar primeiro fluxo
          </Button>
        </div>
      ) : (
        <div className="space-y-1">
          {templates.map((t) => (
            <div
              key={t.id}
              className="flex items-center justify-between p-2 rounded-lg hover:bg-secondary/50 transition-colors group"
            >
              <div className="min-w-0 flex-1">
                <span className="text-sm font-medium">{t.name}</span>
                {t.description && (
                  <p className="text-xs text-muted-foreground truncate">{t.description}</p>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-destructive"
                onClick={() => {
                  if (confirm(`Remover fluxo "${t.name}"?`)) {
                    deleteTemplate.mutate({ templateId: t.id, workspaceId });
                  }
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
