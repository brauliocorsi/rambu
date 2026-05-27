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
import { normalizeMessage } from "@/lib/conversation/normalizeMessage";

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
      messages.map((m) => normalizeMessage(conversationRef, m)),
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
      <div className="flex items-center gap-3 px-3 sm:px-4 py-2.5 border-b border-border/70 bg-card/60 backdrop-blur supports-[backdrop-filter]:bg-card/50">
        <Button variant="ghost" size="icon" className="rounded-lg h-9 w-9 shrink-0" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="relative shrink-0">
          <Avatar className="h-10 w-10 rounded-lg">
            <AvatarImage src={otherUser?.avatar_url || undefined} />
            <AvatarFallback className="rounded-lg bg-primary/15 text-primary font-semibold">
              {displayName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          {otherUser?.status === "online" && (
            <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-[hsl(var(--online))] ring-2 ring-card" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-[15px] font-semibold leading-tight truncate">{displayName}</h2>
          <p className="text-xs text-muted-foreground leading-tight">
            {otherUser?.status === "online" ? "Online agora" : "Offline"}
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
