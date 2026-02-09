import { useState } from "react";
import { motion } from "framer-motion";
import { useWorkspaceContext } from "@/contexts/WorkspaceContext";
import { useWorkspaceInvites, useCreateInvite, useDeactivateInvite } from "@/hooks/useWorkspaceInvites";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Link,
  Copy,
  Plus,
  Trash2,
  Loader2,
  Check,
  Clock,
  Users,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

interface InviteLinkDialogProps {
  open: boolean;
  onClose: () => void;
}

export function InviteLinkDialog({ open, onClose }: InviteLinkDialogProps) {
  const { currentWorkspace } = useWorkspaceContext();
  const { data: invites = [], isLoading } = useWorkspaceInvites(currentWorkspace?.id || null);
  const createInvite = useCreateInvite();
  const deactivateInvite = useDeactivateInvite();

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [expiresIn, setExpiresIn] = useState<string>("7");
  const [maxUses, setMaxUses] = useState<string>("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCreateInvite = () => {
    if (!currentWorkspace?.id) return;

    createInvite.mutate({
      workspaceId: currentWorkspace.id,
      expiresInDays: expiresIn === "never" ? undefined : parseInt(expiresIn),
      maxUses: maxUses ? parseInt(maxUses) : undefined,
    }, {
      onSuccess: () => {
        setShowCreateForm(false);
        setExpiresIn("7");
        setMaxUses("");
      },
    });
  };

  const handleCopyLink = (code: string, inviteId: string) => {
    const link = `${window.location.origin}/join/${code}`;
    navigator.clipboard.writeText(link);
    setCopiedId(inviteId);
    toast.success("Link copiado!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDeactivate = (inviteId: string) => {
    if (!currentWorkspace?.id) return;
    deactivateInvite.mutate({ inviteId, workspaceId: currentWorkspace.id });
  };

  const activeInvites = invites.filter((i) => i.is_active);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-lg rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link className="h-5 w-5" />
            Convidar para {currentWorkspace?.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Create new invite button */}
          {!showCreateForm ? (
            <Button
              className="w-full rounded-xl"
              onClick={() => setShowCreateForm(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Criar Link de Convite
            </Button>
          ) : (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="p-4 border border-border rounded-xl space-y-4"
            >
              <div className="space-y-2">
                <Label>Expira em</Label>
                <Select value={expiresIn} onValueChange={setExpiresIn}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 dia</SelectItem>
                    <SelectItem value="7">7 dias</SelectItem>
                    <SelectItem value="30">30 dias</SelectItem>
                    <SelectItem value="never">Nunca</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Número máximo de usos (opcional)</Label>
                <Input
                  type="number"
                  placeholder="Ilimitado"
                  value={maxUses}
                  onChange={(e) => setMaxUses(e.target.value)}
                  className="rounded-xl"
                  min="1"
                />
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1 rounded-xl"
                  onClick={() => setShowCreateForm(false)}
                >
                  Cancelar
                </Button>
                <Button
                  className="flex-1 rounded-xl"
                  onClick={handleCreateInvite}
                  disabled={createInvite.isPending}
                >
                  {createInvite.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Criar"
                  )}
                </Button>
              </div>
            </motion.div>
          )}

          {/* Active invites */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground">
              Links ativos ({activeInvites.length})
            </h4>

            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : activeInvites.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhum link de convite ativo
              </p>
            ) : (
              <ScrollArea className="max-h-[300px]">
                <div className="space-y-2">
                  {activeInvites.map((invite) => (
                    <motion.div
                      key={invite.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center justify-between p-3 border border-border rounded-xl"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-mono text-sm truncate">
                          {invite.invite_code}
                        </p>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                          {invite.expires_at && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatDistanceToNow(new Date(invite.expires_at), {
                                addSuffix: true,
                                locale: ptBR,
                              })}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {invite.uses_count}
                            {invite.max_uses && ` / ${invite.max_uses}`}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-lg"
                          onClick={() => handleCopyLink(invite.invite_code, invite.id)}
                        >
                          {copiedId === invite.id ? (
                            <Check className="h-4 w-4 text-[hsl(var(--success))]" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-lg text-destructive hover:text-destructive"
                          onClick={() => handleDeactivate(invite.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
