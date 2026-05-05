import { useAuditLogs } from "@/hooks/useAuditLogs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Shield } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  workspaceId: string | null;
}

const ACTION_LABELS: Record<string, string> = {
  workspace_updated: "Atualizou o workspace",
  workspace_deleted: "Excluiu o workspace",
  channel_created: "Criou um canal",
  channel_deleted: "Excluiu um canal",
  member_invited: "Convidou um membro",
  member_removed: "Removeu um membro",
  retention_changed: "Alterou retenção de mensagens",
  accent_color_changed: "Alterou cor do workspace",
};

export function AuditLogsDialog({ open, onClose, workspaceId }: Props) {
  const { data: logs = [], isLoading } = useAuditLogs(open ? workspaceId : null);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" /> Logs de auditoria
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="h-[60vh]">
          {isLoading ? (
            <p className="text-sm text-muted-foreground p-4">Carregando…</p>
          ) : logs.length === 0 ? (
            <p className="text-sm text-muted-foreground p-4 text-center">
              Nenhuma ação registrada ainda.
            </p>
          ) : (
            <ul className="space-y-2 p-1">
              {logs.map((l) => (
                <li key={l.id} className="flex gap-3 p-3 rounded-xl bg-secondary/40">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={l.actor?.avatar_url || undefined} />
                    <AvatarFallback className="text-xs">
                      {(l.actor?.display_name || "?").charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">
                      <span className="font-medium">{l.actor?.display_name || "Usuário"}</span>{" "}
                      <span className="text-muted-foreground">
                        {ACTION_LABELS[l.action] || l.action}
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(l.created_at), { addSuffix: true, locale: ptBR })}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}