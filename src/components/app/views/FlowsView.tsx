import { useState } from "react";
import { ClipboardList, Clock, CheckCircle2, Plus, Hash, User, MessageSquare } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useWorkspaceContext } from "@/contexts/WorkspaceContext";
import { TaskTemplateList } from "@/components/tasks/TaskTemplateList";
import { CreateTaskTemplateDialog } from "@/components/tasks/CreateTaskTemplateDialog";
import { useWorkspaceTasks, type WorkspaceTask } from "@/hooks/useWorkspaceTasks";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface FlowsViewProps {
  onSelectChannel?: (channelId: string) => void;
}

function TaskListItem({ task, onSelectChannel }: { task: WorkspaceTask; onSelectChannel?: (id: string) => void }) {
  const statusConfig = {
    pending: { label: "Pendente", variant: "outline" as const, className: "text-amber-600 border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800" },
    completed: { label: "Concluído", variant: "outline" as const, className: "text-emerald-600 border-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800" },
    approved: { label: "Aprovado", variant: "outline" as const, className: "text-emerald-600 border-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800" },
    rejected: { label: "Rejeitado", variant: "outline" as const, className: "text-destructive border-destructive/30 bg-destructive/10" },
  };

  const config = statusConfig[task.status] || statusConfig.pending;

  return (
    <div className="flex items-start gap-3 p-3 rounded-xl border border-border hover:bg-secondary/30 transition-colors">
      <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
        <ClipboardList className="h-4 w-4 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="font-medium text-sm truncate">{task.template_name}</span>
          <Badge variant={config.variant} className={`text-[10px] px-1.5 py-0 h-5 ${config.className}`}>
            {config.label}
          </Badge>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {task.channel_name ? (
            <button
              onClick={() => onSelectChannel?.(task.channel_id!)}
              className="flex items-center gap-1 hover:text-foreground transition-colors"
            >
              <Hash className="h-3 w-3" />
              {task.channel_name}
            </button>
          ) : task.dm_label ? (
            <span className="flex items-center gap-1">
              <MessageSquare className="h-3 w-3" />
              {task.dm_label}
            </span>
          ) : null}
          {task.assigned_name && (
            <span className="flex items-center gap-1">
              <User className="h-3 w-3" />
              {task.assigned_name}
            </span>
          )}
          <span>{format(new Date(task.created_at), "dd MMM", { locale: ptBR })}</span>
        </div>
      </div>
    </div>
  );
}

export function FlowsView({ onSelectChannel }: FlowsViewProps) {
  const { currentWorkspace } = useWorkspaceContext();
  const [showCreate, setShowCreate] = useState(false);
  const [activeTab, setActiveTab] = useState("templates");

  const { data: pendingTasks = [], isLoading: loadingPending } = useWorkspaceTasks(
    currentWorkspace?.id || null,
    "pending"
  );
  const { data: completedTasks = [], isLoading: loadingCompleted } = useWorkspaceTasks(
    currentWorkspace?.id || null,
    "completed"
  );

  if (!currentWorkspace) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        Selecione um workspace
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-primary" />
          Fluxos de Tarefa
        </h2>
        <Button size="sm" onClick={() => setShowCreate(true)} className="gradient-primary text-white rounded-lg">
          <Plus className="h-4 w-4 mr-1" />
          Novo Fluxo
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
        <TabsList className="mx-4 mt-3 grid w-auto grid-cols-3">
          <TabsTrigger value="templates" className="text-xs">
            <ClipboardList className="h-3.5 w-3.5 mr-1" />
            Templates
          </TabsTrigger>
          <TabsTrigger value="pending" className="text-xs relative">
            <Clock className="h-3.5 w-3.5 mr-1" />
            Pendentes
            {pendingTasks.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">{pendingTasks.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="completed" className="text-xs">
            <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
            Concluídos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="flex-1 min-h-0 mt-0">
          <ScrollArea className="h-full">
            <div className="p-4">
              <TaskTemplateList
                workspaceId={currentWorkspace.id}
                onCreateNew={() => setShowCreate(true)}
              />
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="pending" className="flex-1 min-h-0 mt-0">
          <ScrollArea className="h-full">
            <div className="p-4 space-y-2">
              {loadingPending ? (
                <p className="text-sm text-muted-foreground text-center py-8">Carregando...</p>
              ) : pendingTasks.length === 0 ? (
                <div className="text-center py-8">
                  <Clock className="h-10 w-10 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Nenhuma tarefa pendente</p>
                </div>
              ) : (
                pendingTasks.map((task) => (
                  <TaskListItem key={task.id} task={task} onSelectChannel={onSelectChannel} />
                ))
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="completed" className="flex-1 min-h-0 mt-0">
          <ScrollArea className="h-full">
            <div className="p-4 space-y-2">
              {loadingCompleted ? (
                <p className="text-sm text-muted-foreground text-center py-8">Carregando...</p>
              ) : completedTasks.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle2 className="h-10 w-10 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Nenhuma tarefa concluída</p>
                </div>
              ) : (
                completedTasks.map((task) => (
                  <TaskListItem key={task.id} task={task} onSelectChannel={onSelectChannel} />
                ))
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>

      <CreateTaskTemplateDialog
        open={showCreate}
        onClose={() => setShowCreate(false)}
        workspaceId={currentWorkspace.id}
      />
    </div>
  );
}
