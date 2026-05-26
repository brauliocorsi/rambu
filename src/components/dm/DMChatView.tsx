import { useState, useMemo } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DirectMessage } from "@/hooks/useDirectMessages";
import { useInfiniteDMMessages } from "@/hooks/useInfiniteDMMessages";
import { useProfile } from "@/hooks/useProfile";
import { useTypingIndicator } from "@/hooks/useTypingIndicator";
import { useLayoutPreferences } from "@/hooks/useLayoutPreferences";
import { ConversationMessageList } from "@/components/conversation/ConversationMessageList";
import { ConversationComposer } from "@/components/conversation/ConversationComposer";
import { useRecordDMMessageView, useDMMessageViewCounts } from "@/hooks/useMessageViews";

interface DMChatViewProps {
  dm: DirectMessage;
  onBack: () => void;
}

export function DMChatView({ dm, onBack }: DMChatViewProps) {
  const { data: profile } = useProfile();
  const { preferences } = useLayoutPreferences();
  const { messages, isLoading, isFetchingMore, hasMore, loadMore } = useInfiniteDMMessages(dm.id);
  const { typingUsers, sendTypingStart, sendTypingStop } = useTypingIndicator(dm.id, true);
  const [replyTo, setReplyTo] = useState<string | undefined>();

  // Track message views
  const visibleMessageIds = useMemo(() => messages.map(m => m.id).filter(id => !id.startsWith("temp-")), [messages]);
  useRecordDMMessageView(visibleMessageIds, dm.id);
  const { data: dmViewCounts = {} } = useDMMessageViewCounts(visibleMessageIds);

  const otherUser = dm.other_user;
  const displayName = otherUser?.display_name || "Usuário";

  // Normaliza mensagens DM cruas para `ConversationMessage`
  // (controlled mode da unificada). Mantém a mesma fonte de dados.
  const conversationRef = useMemo(
    () => ({ type: "dm" as const, id: dm.id, otherUserId: otherUser?.id, displayName }),
    [dm.id, otherUser?.id, displayName],
  );
  const conversationMessages = useMemo(
    () =>
      messages.map((m) => ({
        id: m.id,
        content: m.content,
        createdAt: m.created_at,
        userId: m.user_id,
        conversationRef,
        _raw: m,
      })),
    [messages, conversationRef],
  );

  const dmEmptyState = (
    <div className="flex flex-col items-center justify-center h-full text-center p-4">
      <Avatar className="h-16 w-16 mb-4">
        <AvatarImage src={otherUser?.avatar_url || undefined} />
        <AvatarFallback className="text-2xl gradient-primary text-white">
          {displayName.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <h3 className="font-bold text-lg">{displayName}</h3>
      <p className="text-sm text-muted-foreground mt-1">
        Comece uma conversa com {displayName}!
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
        <Avatar className="h-10 w-10">
          <AvatarImage src={otherUser?.avatar_url || undefined} />
          <AvatarFallback className="gradient-primary text-white">
            {displayName.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div>
          <h2 className="font-bold">{displayName}</h2>
          <p className="text-xs text-muted-foreground">
            {otherUser?.status === "online" ? "Online" : "Offline"}
          </p>
        </div>
      </div>

      {/* Messages — camada unificada em modo controlled */}
      <ConversationMessageList
        conversation={conversationRef}
        messages={conversationMessages}
        isLoading={isLoading}
        isFetchingMore={isFetchingMore}
        hasMore={hasMore}
        onLoadMore={loadMore}
        viewDataById={dmViewCounts}
        typingUsers={typingUsers}
        conversationName={displayName}
        emptyState={dmEmptyState}
        onReply={setReplyTo}
        slackMode={preferences.slackMode}
        density={preferences.density}
      />

      {/* Input */}
      <ConversationComposer
        conversation={{
          type: "dm",
          id: dm.id,
          otherUserId: otherUser?.id,
          displayName,
        }}
        replyTo={replyTo}
        onCancelReply={() => setReplyTo(undefined)}
        onTyping={() => profile?.display_name && sendTypingStart(profile.display_name)}
        onStopTyping={sendTypingStop}
      />
    </div>
  );
}
