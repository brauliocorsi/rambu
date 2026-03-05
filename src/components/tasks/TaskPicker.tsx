import { ClipboardList, Plus } from "lucide-react";
import { useTaskTemplates, type TaskTemplate } from "@/hooks/useTaskTemplates";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";

interface Props {
  workspaceId: string;
  onSelectTemplate: (template: TaskTemplate) => void;
  onCreateNew: () => void;
}

export function TaskPicker({ workspaceId, onSelectTemplate, onCreateNew }: Props) {
  const { data: templates = [] } = useTaskTemplates(workspaceId);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-xl shrink-0 h-10 w-10"
          title="Tarefas"
        >
          <ClipboardList className="h-5 w-5 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-1" align="start" side="top">
        <div className="px-2 py-1.5">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Fluxos de Tarefa
          </p>
        </div>
        {templates.length === 0 ? (
          <div className="px-2 py-3 text-center">
            <p className="text-xs text-muted-foreground mb-2">Nenhum fluxo criado</p>
            <Button variant="outline" size="sm" className="w-full text-xs" onClick={onCreateNew}>
              <Plus className="h-3 w-3 mr-1" />
              Criar fluxo
            </Button>
          </div>
        ) : (
          <>
            {templates.map((t) => (
              <button
                key={t.id}
                onClick={() => onSelectTemplate(t)}
                className="w-full text-left px-3 py-2 rounded-md hover:bg-secondary text-sm transition-colors flex items-center gap-2"
              >
                <ClipboardList className="h-4 w-4 text-primary shrink-0" />
                <span className="truncate">{t.name}</span>
              </button>
            ))}
            <div className="border-t border-border mt-1 pt-1">
              <button
                onClick={onCreateNew}
                className="w-full text-left px-3 py-2 rounded-md hover:bg-secondary text-sm transition-colors flex items-center gap-2 text-muted-foreground"
              >
                <Plus className="h-4 w-4 shrink-0" />
                <span>Criar novo fluxo</span>
              </button>
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}
