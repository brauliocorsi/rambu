import { useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspaceContext } from "@/contexts/WorkspaceContext";
import { 
  useWorkspaceMembers, 
  useUpdateMemberRole, 
  useRemoveMember,
  useCurrentUserRole,
} from "@/hooks/useWorkspaceMembers";
import {
  useWorkspaceBans,
  useBanUser,
  useUnbanUser,
  useDeleteUserAccount,
} from "@/hooks/useWorkspaceBans";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Users,
  MoreVertical,
  Shield,
  ShieldCheck,
  UserMinus,
  Crown,
  Loader2,
  Ban,
  Trash2,
  RotateCcw,
} from "lucide-react";

interface MemberManagementDialogProps {
  open: boolean;
  onClose: () => void;
}

export function MemberManagementDialog({ open, onClose }: MemberManagementDialogProps) {
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspaceContext();
  const { data: members = [], isLoading } = useWorkspaceMembers(currentWorkspace?.id || null);
  const { data: currentUserRole } = useCurrentUserRole(currentWorkspace?.id || null);
  const { data: bans = [], isLoading: bansLoading } = useWorkspaceBans(currentWorkspace?.id || null);
  const updateRole = useUpdateMemberRole();
  const removeMember = useRemoveMember();
  const banUser = useBanUser();
  const unbanUser = useUnbanUser();
  const deleteAccount = useDeleteUserAccount();

  const [memberToRemove, setMemberToRemove] = useState<{ id: string; user_id: string; name: string } | null>(null);
  const [memberToBan, setMemberToBan] = useState<{ user_id: string; name: string } | null>(null);
  const [memberToDelete, setMemberToDelete] = useState<{ user_id: string; name: string } | null>(null);
  const [banReason, setBanReason] = useState("");
  const [confirmName, setConfirmName] = useState("");

  const isAdmin = currentUserRole === "admin";
  const isCreator = currentWorkspace?.created_by === user?.id;

  const handleUpdateRole = (memberId: string, newRole: "admin" | "member") => {
    if (!currentWorkspace?.id) return;
    updateRole.mutate({ memberId, workspaceId: currentWorkspace.id, newRole });
  };

  const handleRemoveMember = () => {
    if (!memberToRemove || !currentWorkspace?.id) return;
    removeMember.mutate(
      { memberId: memberToRemove.id, workspaceId: currentWorkspace.id },
      { onSuccess: () => setMemberToRemove(null) }
    );
  };

  const handleBan = () => {
    if (!memberToBan || !currentWorkspace?.id) return;
    banUser.mutate(
      { workspaceId: currentWorkspace.id, targetUserId: memberToBan.user_id, reason: banReason || undefined },
      {
        onSuccess: () => {
          setMemberToBan(null);
          setBanReason("");
        },
      }
    );
  };

  const handleDelete = () => {
    if (!memberToDelete) return;
    if (confirmName.trim() !== memberToDelete.name.trim()) return;
    deleteAccount.mutate(
      { targetUserId: memberToDelete.user_id },
      {
        onSuccess: () => {
          setMemberToDelete(null);
          setConfirmName("");
        },
      }
    );
  };

  const getRoleBadge = (role: string, isWorkspaceCreator: boolean) => {
    if (isWorkspaceCreator) {
      return (
        <Badge variant="default" className="bg-gradient-to-r from-[hsl(var(--warning))] to-accent">
          <Crown className="h-3 w-3 mr-1" />
          Criador
        </Badge>
      );
    }
    if (role === "admin") {
      return (
        <Badge variant="secondary" className="bg-primary/10 text-primary">
          <ShieldCheck className="h-3 w-3 mr-1" />
          Admin
        </Badge>
      );
    }
    return (
      <Badge variant="outline">
        Membro
      </Badge>
    );
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
        <DialogContent className="sm:max-w-lg rounded-2xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Gerenciar Membros
            </DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="members" className="flex-1 flex flex-col min-h-0">
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="members">Membros ({members.length})</TabsTrigger>
              <TabsTrigger value="bans">Banidos ({bans.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="members" className="flex-1 min-h-0 mt-4">
              {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : (
              <ScrollArea className="h-[400px]">
                <div className="space-y-2">
                  {members.map((member, index) => {
                    const isCreatorMember = member.user_id === currentWorkspace?.created_by;
                    const isSelf = member.user_id === user?.id;
                    const canManage = (isAdmin || isCreator) && !isCreatorMember && !isSelf;

                    return (
                      <motion.div
                        key={member.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.02 }}
                        className="flex items-center justify-between p-3 rounded-xl hover:bg-secondary/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={member.profile?.avatar_url || undefined} />
                            <AvatarFallback className="bg-primary/10 text-primary">
                              {(member.profile?.display_name || "?").charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium">
                                {member.profile?.display_name || "Usuário"}
                              </p>
                              {isSelf && (
                                <span className="text-xs text-muted-foreground">(você)</span>
                              )}
                            </div>
                            {getRoleBadge(member.role, isCreatorMember)}
                          </div>
                        </div>

                        {canManage && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="rounded-xl">
                              {member.role === "member" ? (
                                <DropdownMenuItem
                                  onClick={() => handleUpdateRole(member.id, "admin")}
                                  className="rounded-lg"
                                >
                                  <Shield className="h-4 w-4 mr-2" />
                                  Promover a Admin
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem
                                  onClick={() => handleUpdateRole(member.id, "member")}
                                  className="rounded-lg"
                                >
                                  <Shield className="h-4 w-4 mr-2" />
                                  Rebaixar a Membro
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem
                                onClick={() => setMemberToRemove({ id: member.id, user_id: member.user_id, name: member.profile?.display_name || "Usuário" })}
                                className="rounded-lg text-destructive focus:text-destructive"
                              >
                                <UserMinus className="h-4 w-4 mr-2" />
                                Remover
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => setMemberToBan({ user_id: member.user_id, name: member.profile?.display_name || "Usuário" })}
                                className="rounded-lg text-destructive focus:text-destructive"
                              >
                                <Ban className="h-4 w-4 mr-2" />
                                Banir do workspace
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => setMemberToDelete({ user_id: member.user_id, name: member.profile?.display_name || "Usuário" })}
                                className="rounded-lg text-destructive focus:text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Excluir conta (irreversível)
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
            </TabsContent>

            <TabsContent value="bans" className="flex-1 min-h-0 mt-4">
              {bansLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : bans.length === 0 ? (
                <div className="text-center py-12 text-sm text-muted-foreground">
                  Nenhum usuário banido.
                </div>
              ) : (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-2">
                    {bans.map((ban) => (
                      <div key={ban.id} className="flex items-center justify-between p-3 rounded-xl bg-destructive/5">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={ban.profile?.avatar_url || undefined} />
                            <AvatarFallback className="bg-destructive/10 text-destructive">
                              {(ban.profile?.display_name || "?").charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="font-medium truncate">{ban.profile?.display_name || "Usuário"}</p>
                            {ban.reason && (
                              <p className="text-xs text-muted-foreground truncate">Motivo: {ban.reason}</p>
                            )}
                          </div>
                        </div>
                        {(isAdmin || isCreator) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="rounded-lg"
                            onClick={() => currentWorkspace?.id && unbanUser.mutate({ workspaceId: currentWorkspace.id, targetUserId: ban.user_id })}
                            disabled={unbanUser.isPending}
                          >
                            <RotateCcw className="h-4 w-4 mr-1" />
                            Desbanir
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!memberToRemove} onOpenChange={() => setMemberToRemove(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Remover membro?</AlertDialogTitle>
            <AlertDialogDescription>
              {memberToRemove?.name} perderá acesso a todos os canais e DMs do workspace. Poderá entrar de novo via convite.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveMember}
              className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {removeMember.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Remover"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* BAN dialog */}
      <AlertDialog open={!!memberToBan} onOpenChange={(o) => { if (!o) { setMemberToBan(null); setBanReason(""); } }}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Banir {memberToBan?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              O usuário será removido do workspace e <strong>não poderá entrar novamente</strong>, mesmo via convite, até ser desbanido.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Label htmlFor="ban-reason">Motivo (opcional)</Label>
            <Input id="ban-reason" value={banReason} onChange={(e) => setBanReason(e.target.value)} placeholder="Ex: spam, comportamento abusivo" className="rounded-xl" />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleBan} disabled={banUser.isPending} className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {banUser.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Banir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* DELETE ACCOUNT dialog */}
      <AlertDialog open={!!memberToDelete} onOpenChange={(o) => { if (!o) { setMemberToDelete(null); setConfirmName(""); } }}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir conta de {memberToDelete?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Ação <strong>irreversível</strong>. A conta será apagada permanentemente; o histórico de mensagens permanece como "Usuário removido". Requer privilégio de super-administrador.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Label htmlFor="confirm-name">Digite "{memberToDelete?.name}" para confirmar</Label>
            <Input id="confirm-name" value={confirmName} onChange={(e) => setConfirmName(e.target.value)} className="rounded-xl" />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteAccount.isPending || confirmName.trim() !== memberToDelete?.name}
              className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteAccount.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Excluir definitivamente"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
