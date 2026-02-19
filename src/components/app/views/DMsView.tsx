import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useWorkspaceContext } from "@/contexts/WorkspaceContext";
import { useDirectMessages, DirectMessage } from "@/hooks/useDirectMessages";
import { useDMGroups, DMGroup } from "@/hooks/useDMGroups";
import { useUnreadDMCounts, useMarkDMAsRead } from "@/hooks/useNotifications";
import { useWorkspaceMembers } from "@/hooks/useWorkspaceMembers";
import { useAuth } from "@/hooks/useAuth";
import { DMChatView } from "@/components/dm/DMChatView";
import { GroupChatView } from "@/components/dm/GroupChatView";
import { DMListWithArchive } from "@/components/dm/DMListWithArchive";
import { WorkspaceUsersList } from "@/components/dm/WorkspaceUsersList";
import { NewDMDialog } from "@/components/dm/NewDMDialog";
import { NewGroupDialog } from "@/components/dm/NewGroupDialog";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  MessageSquare, 
  Plus, 
  Briefcase,
  Users,
  UserPlus,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface DMsViewProps {
  selectedDM: DirectMessage | null;
  onSelectDM: (dm: DirectMessage | null) => void;
}

export function DMsView({ selectedDM, onSelectDM }: DMsViewProps) {
  const { currentWorkspace } = useWorkspaceContext();
  const { user } = useAuth();
  const { data: dms = [], isLoading } = useDirectMessages(currentWorkspace?.id || null);
  const { data: groups = [], isLoading: loadingGroups } = useDMGroups(currentWorkspace?.id || null);
  const { data: unreadCounts = {} } = useUnreadDMCounts(currentWorkspace?.id || null);
  const { data: members = [] } = useWorkspaceMembers(currentWorkspace?.id || null);
  const markAsRead = useMarkDMAsRead();
  const [showNewDM, setShowNewDM] = useState(false);
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<DMGroup | null>(null);

  // Mark DM as read when selected
  useEffect(() => {
    if (selectedDM) {
      markAsRead.mutate(selectedDM.id);
    }
  }, [selectedDM?.id]);

  // Show group chat view
  if (selectedGroup) {
    return <GroupChatView group={selectedGroup} onBack={() => setSelectedGroup(null)} />;
  }

  // Show DM chat view
  if (selectedDM) {
    return <DMChatView dm={selectedDM} onBack={() => onSelectDM(null)} />;
  }

  if (!currentWorkspace) {
    return (
      <div className="p-4">
        <Card className="p-8 rounded-2xl flex flex-col items-center justify-center gap-4">
          <div className="h-16 w-16 rounded-full gradient-primary-soft flex items-center justify-center">
            <Briefcase className="h-8 w-8 text-primary" />
          </div>
          <div className="text-center">
            <h3 className="font-semibold">Nenhum workspace</h3>
            <p className="text-sm text-muted-foreground">Crie um workspace para iniciar conversas!</p>
          </div>
        </Card>
      </div>
    );
  }

  const isLoadingAll = isLoading || loadingGroups;
  const hasNoConversations = dms.length === 0 && groups.length === 0;

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Mensagens</h2>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="icon" variant="ghost" className="rounded-xl">
              <Plus className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setShowNewDM(true)}>
              <UserPlus className="h-4 w-4 mr-2" />
              Nova Conversa
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setShowNewGroup(true)}>
              <Users className="h-4 w-4 mr-2" />
              Novo Grupo
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {isLoadingAll ? (
        <Card className="p-8 rounded-2xl flex items-center justify-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full"
          />
        </Card>
      ) : hasNoConversations ? (
        <Card className="p-8 rounded-2xl flex flex-col items-center justify-center gap-4">
          <div className="h-16 w-16 rounded-full gradient-primary-soft flex items-center justify-center">
            <MessageSquare className="h-8 w-8 text-primary" />
          </div>
          <div className="text-center">
            <h3 className="font-semibold">Nenhuma conversa</h3>
            <p className="text-sm text-muted-foreground">Inicie uma nova conversa!</p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline"
              className="rounded-xl"
              onClick={() => setShowNewGroup(true)}
            >
              <Users className="h-4 w-4 mr-2" />
              Novo Grupo
            </Button>
            <Button 
              className="rounded-xl gradient-primary text-white"
              onClick={() => setShowNewDM(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Nova Mensagem
            </Button>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Workspace Users */}
          <WorkspaceUsersList
            members={members}
            currentUserId={user?.id}
            onSelectUser={(userId) => {
              // Find existing DM with this user or open new DM dialog
              const existingDM = dms.find(
                dm => dm.other_user?.id === userId
              );
              if (existingDM) {
                onSelectDM(existingDM);
              } else {
                setShowNewDM(true);
              }
            }}
          />

          {/* Groups Section */}
          {groups.length > 0 && (
            <Card className="p-2 rounded-2xl">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 py-2 flex items-center gap-1">
                <Users className="h-3 w-3" />
                Grupos
              </p>
              <div className="space-y-1">
                {groups.map((group) => {
                  const groupName = group.name || (group.members || [])
                    .filter(m => m.user_id !== group.created_by)
                    .map(m => m.profile?.display_name || "Usuário")
                    .slice(0, 3)
                    .join(", ");
                  const timeAgo = group.last_message
                    ? formatDistanceToNow(new Date(group.last_message.created_at), {
                        addSuffix: true,
                        locale: ptBR,
                      })
                    : "";

                  return (
                    <motion.button
                      key={group.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      onClick={() => setSelectedGroup(group)}
                      className={cn(
                        "w-full flex items-center gap-3 p-3 rounded-xl transition-colors hover:bg-secondary"
                      )}
                    >
                      <div className="relative h-12 w-12 shrink-0">
                        <div className="absolute inset-0 flex items-center justify-center bg-primary/10 rounded-full">
                          <Users className="h-5 w-5 text-primary" />
                        </div>
                      </div>

                      <div className="flex-1 min-w-0 text-left">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold truncate">{groupName}</span>
                          {timeAgo && (
                            <span className="text-xs text-muted-foreground shrink-0">{timeAgo}</span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground truncate">
                          {group.last_message?.content || `${group.members?.length || 0} membros`}
                        </p>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </Card>
          )}

          {/* DMs Section */}
          <Card className="p-2 rounded-2xl">
            {groups.length > 0 && (
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 py-2 flex items-center gap-1">
                <MessageSquare className="h-3 w-3" />
                Conversas Diretas
              </p>
            )}
            <DMListWithArchive 
              dms={dms} 
              selectedDM={selectedDM} 
              onSelectDM={onSelectDM}
              workspaceId={currentWorkspace.id}
              unreadCounts={unreadCounts}
            />
          </Card>
        </div>
      )}

      <NewDMDialog 
        open={showNewDM} 
        onClose={() => setShowNewDM(false)} 
        onSelectDM={(dm) => {
          onSelectDM(dm);
          setShowNewDM(false);
        }}
      />

      <NewGroupDialog
        open={showNewGroup}
        onClose={() => setShowNewGroup(false)}
        onSelectGroup={(group) => {
          setSelectedGroup(group);
          setShowNewGroup(false);
        }}
      />
    </div>
  );
}
