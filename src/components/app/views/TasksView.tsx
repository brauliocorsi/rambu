import { PendingTasksPanel } from "@/components/tasks/PendingTasksPanel";

interface TasksViewProps {
  onSelectChannel?: (channelId: string) => void;
}

export function TasksView({ onSelectChannel }: TasksViewProps) {
  return (
    <div className="p-4">
      <h2 className="text-lg font-bold mb-4">Tarefas Pendentes</h2>
      <PendingTasksPanel
        onNavigateToChannel={onSelectChannel}
        className="max-h-none"
      />
    </div>
  );
}
