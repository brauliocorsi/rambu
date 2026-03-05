import { ClipboardList, User, Check, X, CheckCircle2, Clock, XCircle, ShieldCheck, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useTaskInstanceByMessageId, useUpdateTaskStatus } from "@/hooks/useTaskInstances";
import { useTaskAssignees, useUpdateAssigneeStatus, type TaskAssignee } from "@/hooks/useTaskAssignees";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { FilePreview } from "@/components/message/FilePreview";

const statusConfig = {
  pending: { label: "Pendente", icon: Clock, className: "bg-yellow-500/10 text-yellow-600 border-yellow-500/30" },
  approved: { label: "Aprovada", icon: CheckCircle2, className: "bg-green-500/10 text-green-600 border-green-500/30" },
  rejected: { label: "Rejeitada", icon: XCircle, className: "bg-destructive/10 text-destructive border-destructive/30" },
  completed: { label: "Concluída", icon: CheckCircle2, className: "bg-primary/10 text-primary border-primary/30" },
};

interface Props {
  messageId: string;
}

export function TaskCard({ messageId }: Props) {
  const { data: task, isLoading } = useTaskInstanceByMessageId(messageId);
  const updateStatus = useUpdateTaskStatus();
  const { user } = useAuth();

  // Fetch multi-assignees
  const { data: assignees = [] } = useTaskAssignees(task?.id || null);
  const updateAssigneeStatus = useUpdateAssigneeStatus();

  if (isLoading || !task) return null;

  const status = statusConfig[task.status];
  const StatusIcon = status.icon;
  
  const hasMultiAssignees = assignees.length > 1;
  const isAssignee = assignees.some((a) => a.user_id === user?.id);
  const myAssignment = assignees.find((a) => a.user_id === user?.id);
  const allCompleted = assignees.length > 0 && assignees.every((a) => a.status === "completed");
  const completedCount = assignees.filter((a) => a.status === "completed").length;

  // Fallback: single assignee (backward compat)
  const isLegacyAssigned = !hasMultiAssignees && assignees.length <= 1 && task.assigned_to && user?.id === task.assigned_to;
  const canAct = task.requires_approval && task.status === "pending" && user?.id !== task.created_by;
  
  // For multi-assign: user can complete their own assignment
  const canCompleteMyPart = task.status === "pending" && isAssignee && myAssignment?.status === "pending";
  // Legacy single-assign
  const canComplete = task.status === "pending" && isLegacyAssigned && assignees.length === 0;
  const canReject = task.status === "pending" && (isLegacyAssigned || isAssignee);

  // Auto-complete task when all assignees complete
  const shouldAutoComplete = allCompleted && task.status === "pending" && assignees.length > 0;

  return (
    <div className="mt-2 rounded-xl border border-border bg-card p-3 max-w-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <ClipboardList className="h-4 w-4 text-primary" />
          <span className="text-xs font-semibold text-primary">{task.template?.name}</span>
        </div>
        <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", status.className)}>
          <StatusIcon className="h-3 w-3 mr-0.5" />
          {status.label}
        </Badge>
      </div>

      {/* Field values */}
      <div className="space-y-1.5 mb-2">
        {task.field_values?.map((fv) => (
          <div key={fv.id} className="text-xs">
            <span className="text-muted-foreground">{fv.field?.label}: </span>
            {fv.field?.field_type === "attachment" && fv.file_url ? (
              <FilePreview url={fv.file_url} name={fv.file_name || "arquivo"} type="application/octet-stream" compact />
            ) : fv.field?.field_type === "number" ? (
              <span className="font-medium">{fv.value_number ?? "-"}</span>
            ) : (
              <span className="font-medium">{fv.value_text || "-"}</span>
            )}
          </div>
        ))}
      </div>

      {/* Multi-assignees display */}
      {assignees.length > 0 && (
        <div className="mb-2 space-y-1">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Users className="h-3 w-3" />
            <span>Atribuído a {assignees.length} pessoa{assignees.length > 1 ? "s" : ""}</span>
            {hasMultiAssignees && (
              <span className="text-[10px] ml-1">
                ({completedCount}/{assignees.length} concluído{completedCount !== 1 ? "s" : ""})
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-1">
            {assignees.map((a) => (
              <Badge
                key={a.id}
                variant="outline"
                className={cn(
                  "text-[10px] px-1.5 py-0 flex items-center gap-1",
                  a.status === "completed"
                    ? "bg-green-500/10 text-green-600 border-green-500/30"
                    : "bg-secondary/50"
                )}
              >
                <Avatar className="h-3.5 w-3.5">
                  <AvatarImage src={a.profile?.avatar_url || undefined} />
                  <AvatarFallback className="text-[7px]">
                    {(a.profile?.display_name || "U").charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <span>{a.profile?.display_name || "Usuário"}</span>
                {a.status === "completed" && <CheckCircle2 className="h-3 w-3" />}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Legacy single assigned to (no multi-assignees) */}
      {assignees.length === 0 && task.assigned_profile && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
          <User className="h-3 w-3" />
          <span>Atribuído a </span>
          <Avatar className="h-4 w-4">
            <AvatarImage src={task.assigned_profile.avatar_url || undefined} />
            <AvatarFallback className="text-[8px]">
              {(task.assigned_profile.display_name || "U").charAt(0)}
            </AvatarFallback>
          </Avatar>
          <span className="font-medium">{task.assigned_profile.display_name}</span>
        </div>
      )}

      {/* Approval badge */}
      {task.requires_approval && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
          <ShieldCheck className="h-3 w-3" />
          <span>Requer aprovação</span>
        </div>
      )}

      {/* Action buttons */}
      {(canAct || canComplete || canCompleteMyPart || canReject || shouldAutoComplete) && (
        <div className="flex items-center gap-1.5 pt-1 border-t border-border mt-1">
          {canAct && (
            <>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs text-green-600 hover:text-green-700 hover:bg-green-500/10"
                onClick={() => updateStatus.mutate({ taskId: task.id, status: "approved" })}
                disabled={updateStatus.isPending}
              >
                <Check className="h-3 w-3 mr-1" />
                Aprovar
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
            </>
          )}
          {canCompleteMyPart && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs text-primary hover:bg-primary/10"
              onClick={() => {
                updateAssigneeStatus.mutate(
                  { assigneeId: myAssignment!.id, status: "completed", taskInstanceId: task.id },
                );
              }}
              disabled={updateAssigneeStatus.isPending}
            >
              <CheckCircle2 className="h-3 w-3 mr-1" />
              {hasMultiAssignees ? "Concluir minha parte" : "Concluir"}
            </Button>
          )}
          {canComplete && (
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
          )}
          {shouldAutoComplete && user?.id === task.created_by && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs text-green-600 hover:bg-green-500/10"
              onClick={() => updateStatus.mutate({ taskId: task.id, status: "completed" })}
              disabled={updateStatus.isPending}
            >
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Todos concluíram – Finalizar
            </Button>
          )}
          {canReject && !canAct && (
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
          )}
        </div>
      )}
    </div>
  );
}
