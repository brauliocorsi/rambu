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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
  const updateRole = useUpdateMemberRole();
  const removeMember = useRemoveMember();

  const [memberToRemove, setMemberToRemove] = useState<string | null>(null);

  const isAdmin = currentUserRole === "admin";
  const isCreator = currentWorkspace?.created_by === user?.id;

  const handleUpdateRole = (memberId: string, newRole: "admin" | "member") => {
    if (!currentWorkspace?.id) return;
    updateRole.mutate({ memberId, workspaceId: currentWorkspace.id, newRole });
  };

  const handleRemoveMember = () => {
    if (!memberToRemove || !currentWorkspace?.id) return;
    removeMember.mutate(
      { memberId: memberToRemove, workspaceId: currentWorkspace.id },
      { onSuccess: () => setMemberToRemove(null) }
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
        <DialogContent className="sm:max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Gerenciar Membros
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {members.length} membro{members.length !== 1 ? "s" : ""} em {currentWorkspace?.name}
            </p>

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
                                onClick={() => setMemberToRemove(member.id)}
                                className="rounded-lg text-destructive focus:text-destructive"
                              >
                                <UserMinus className="h-4 w-4 mr-2" />
                                Remover
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
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!memberToRemove} onOpenChange={() => setMemberToRemove(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Remover membro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O membro precisará de um novo convite para entrar novamente.
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
    </>
  );
}
