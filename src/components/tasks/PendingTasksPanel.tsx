import { ClipboardList, Clock, User, Hash, CheckCircle2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { usePendingTasks, PendingTask } from "@/hooks/usePendingTasks";
import { useUpdateTaskStatus } from "@/hooks/useTaskInstances";
import { useWorkspaceContext } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/hooks/useAuth";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface PendingTasksPanelProps {
  onNavigateToChannel?: (channelId: string) => void;
  className?: string;
}

export function PendingTasksPanel({ onNavigateToChannel, className }: PendingTasksPanelProps) {
  const { currentWorkspace } = useWorkspaceContext();
  const { user } = useAuth();
  const { data: tasks = [], isLoading } = usePendingTasks(currentWorkspace?.id || null);
  const updateStatus = useUpdateTaskStatus();

  const myTasks = tasks.filter(t => t.assigned_to === user?.id);
  const createdTasks = tasks.filter(t => t.created_by === user?.id && t.assigned_to !== user?.id);

  const renderTask = (task: PendingTask) => {
    const isAssigned = task.assigned_to === user?.id;
    const timeAgo = formatDistanceToNow(new Date(task.created_at), { addSuffix: true, locale: ptBR });

    return (
      <div
        key={task.id}
        className={cn(
          "p-3 rounded-xl border border-border bg-card/50 space-y-2 transition-colors hover:bg-card",
          isAssigned && "border-l-2 border-l-primary"
        )}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 min-w-0">
            <ClipboardList className="h-3.5 w-3.5 text-primary shrink-0" />
            <span className="text-sm font-semibold truncate">{task.template_name}</span>
          </div>
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-yellow-500/10 text-yellow-600 border-yellow-500/30 shrink-0">
            <Clock className="h-3 w-3 mr-0.5" />
            Pendente
          </Badge>
        </div>

        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <button
            onClick={() => onNavigateToChannel?.(task.channel_id)}
            className="flex items-center gap-1 hover:text-primary transition-colors"
          >
            <Hash className="h-3 w-3" />
            <span>{task.channel_name}</span>
          </button>
          {task.assigned_name && (
            <span className="flex items-center gap-1">
              <User className="h-3 w-3" />
              {task.assigned_name}
            </span>
          )}
        </div>

        <div className="text-[11px] text-muted-foreground">
          {isAssigned ? `Criada por ${task.creator_name || "alguém"}` : `Atribuída a ${task.assigned_name || "ninguém"}`}
          {" · "}{timeAgo}
        </div>

        {/* Quick actions for assigned user */}
        {isAssigned && (
          <div className="flex items-center gap-1.5 pt-1 border-t border-border">
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs text-primary hover:bg-primary/10"
              onClick={() => updateStatus.mutate({ taskId: task.id, status: "completed" })}
              disabled={updateStatus.isPending}
            >
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Concluir
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs text-destructive hover:bg-destructive/10"
              onClick={() => updateStatus.mutate({ taskId: task.id, status: "rejected" })}
              disabled={updateStatus.isPending}
            >
              <X className="h-3 w-3 mr-1" />
              Rejeitar
            </Button>
          </div>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className={cn("p-4 flex items-center justify-center", className)}>
        <div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className={cn("p-6 text-center", className)}>
        <ClipboardList className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
        <p className="text-sm text-muted-foreground">Nenhuma tarefa pendente</p>
      </div>
    );
  }

  return (
    <ScrollArea className={cn("max-h-96", className)}>
      <div className="p-3 space-y-4">
        {/* Tasks assigned to me */}
        {myTasks.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">
              Atribuídas a mim ({myTasks.length})
            </p>
            {myTasks.map(renderTask)}
          </div>
        )}

        {/* Tasks I created */}
        {createdTasks.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">
              Criadas por mim ({createdTasks.length})
            </p>
            {createdTasks.map(renderTask)}
          </div>
        )}
      </div>
    </ScrollArea>
  );
}
