import { useMemo } from "react";
import { ArrowLeft, Users, MoreHorizontal, UserPlus, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DMGroup, useDMGroupMessages, useLeaveGroup } from "@/hooks/useDMGroups";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useTypingIndicator } from "@/hooks/useTypingIndicator";
import { useWorkspaceContext } from "@/contexts/WorkspaceContext";
import { useLayoutPreferences } from "@/hooks/useLayoutPreferences";
import { ConversationComposer } from "@/components/conversation/ConversationComposer";
import { ConversationMessageList } from "@/components/conversation/ConversationMessageList";
import { normalizeMessage } from "@/lib/conversation/normalizeMessage";

interface GroupChatViewProps {
  group: DMGroup;
  onBack: () => void;
}

export function GroupChatView({ group, onBack }: GroupChatViewProps) {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const { currentWorkspace } = useWorkspaceContext();
  const { preferences } = useLayoutPreferences();
  const { messages, isLoading, isFetchingMore, hasMore, loadMore } = useDMGroupMessages(group.id);
  const { typingUsers, sendTypingStart, sendTypingStop } = useTypingIndicator(`group:${group.id}`, true);
  const leaveGroup = useLeaveGroup();

  // Get group display name
  const getGroupName = () => {
    if (group.name) return group.name;
    const memberNames = (group.members || [])
      .filter(m => m.user_id !== user?.id)
      .map(m => m.profile?.display_name || "Usuário")
      .slice(0, 3);
    if (memberNames.length <= 3) return memberNames.join(", ");
    return `${memberNames.slice(0, 2).join(", ")} e +${(group.members?.length || 0) - 3}`;
  };

  const groupName = getGroupName();

  // Normaliza mensagens cruas de grupo para `ConversationMessage`
  // (controlled mode da camada unificada). Mantém `useDMGroupMessages`
  // como única fonte de dados.
  const conversationRef = useMemo(
    () => ({
      type: "group" as const,
      id: group.id,
      workspaceId: currentWorkspace?.id,
      displayName: groupName,
    }),
    [group.id, currentWorkspace?.id, groupName],
  );
  const conversationMessages = useMemo(
    () => messages.map((m) => normalizeMessage(conversationRef, m)),
    [messages, conversationRef],
  );

  const handleLeaveGroup = () => {
    if (!currentWorkspace) return;
    leaveGroup.mutate({ groupId: group.id, workspaceId: currentWorkspace.id });
    onBack();
  };

  const groupEmptyState = (
    <div className="flex flex-col items-center justify-center h-full text-center p-4">
      <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
        <Users className="h-8 w-8 text-primary" />
      </div>
      <h3 className="font-bold text-lg">{groupName}</h3>
      <p className="text-sm text-muted-foreground mt-1">
        Comece uma conversa em grupo!
      </p>
    </div>
  );

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-border">
        <Button variant="ghost" size="icon" className="rounded-xl" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        
        {/* Group Avatar Stack */}
        <div className="relative h-10 w-10">
          <div className="absolute inset-0 flex items-center justify-center bg-primary/10 rounded-full">
            <Users className="h-5 w-5 text-primary" />
          </div>
        </div>
        
        <div className="flex-1 min-w-0">
          <h2 className="font-bold truncate">{groupName}</h2>
          <p className="text-xs text-muted-foreground">
            {group.members?.length || 0} membros
          </p>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-xl">
              <MoreHorizontal className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>
              <UserPlus className="h-4 w-4 mr-2" />
              Adicionar membro
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleLeaveGroup} className="text-destructive">
              <LogOut className="h-4 w-4 mr-2" />
              Sair do grupo
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Messages — camada unificada em modo controlled */}
      <ConversationMessageList
        conversation={conversationRef}
        messages={conversationMessages}
        isLoading={isLoading}
        isFetchingMore={isFetchingMore}
        hasMore={hasMore}
        onLoadMore={loadMore}
        typingUsers={typingUsers}
        conversationName={groupName}
        emptyState={groupEmptyState}
        slackMode={preferences.slackMode}
        density={preferences.density}
      />

      {/* Input */}
      <ConversationComposer
        conversation={{
          type: "group",
          id: group.id,
          workspaceId: currentWorkspace?.id,
          displayName: groupName,
        }}
        onTyping={() => profile?.display_name && sendTypingStart(profile.display_name)}
        onStopTyping={sendTypingStop}
      />
    </div>
  );
}
