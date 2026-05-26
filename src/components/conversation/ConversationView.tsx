import { useState } from "react";
import { ConversationMessageList } from "./ConversationMessageList";
import { ConversationComposer } from "./ConversationComposer";
import { ConversationMediaViewer } from "./ConversationMediaViewer";
import { useConversationMessages } from "@/hooks/useConversationMessages";
import { useLayoutPreferences } from "@/hooks/useLayoutPreferences";
import type { ConversationRef } from "@/types/conversation";

/**
 * Decisão arquitetural: `ConversationView` é o ÚNICO dono dos dados
 * de leitura — chama `useConversationMessages` uma vez e repassa a
 * lista controlada para `ConversationMessageList`. Isso elimina a
 * chamada dupla do hook (uma no view, outra na list) e mantém uma
 * única fonte de verdade para `messages`, usada também pelo
 * `ConversationMediaViewer`. `ConversationMessageList` continua
 * aceitando uso standalone (sem props controladas) por compatibilidade.
 */

/**
 * View unificada de conversa. Compoe header (slot), lista
 * (ConversationMessageList) e composer (ConversationComposer).
 * Para grupos, passe um composerSlot enquanto a migracao nao termina.
 */
interface ConversationViewProps {
  conversation: ConversationRef;
  headerSlot?: React.ReactNode;
  composerSlot?: React.ReactNode;
  emptyState?: React.ReactNode;
  onTyping?: (displayName?: string) => void;
  onStopTyping?: () => void;
}

export function ConversationView({
  conversation,
  headerSlot,
  composerSlot,
  emptyState,
  onTyping,
  onStopTyping,
}: ConversationViewProps) {
  const { preferences } = useLayoutPreferences();
  const { messages, isLoading, isFetchingMore, hasMore, loadMore } =
    useConversationMessages(conversation);
  const [replyTo, setReplyTo] = useState<string | undefined>();

  return (
    <div className="flex flex-col h-[100dvh] min-h-0">
      {headerSlot}
      <ConversationMessageList
        conversation={conversation}
        onReply={setReplyTo}
        slackMode={preferences.slackMode}
        density={preferences.density}
        emptyState={emptyState}
        messages={messages}
        isLoading={isLoading}
        isFetchingMore={isFetchingMore}
        hasMore={hasMore}
        onLoadMore={loadMore}
      />
      {!isLoading && <ConversationMediaViewer messages={messages} />}
      <div className="sticky bottom-0 z-40 shrink-0 safe-bottom border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        {composerSlot ?? (
          <ConversationComposer
            conversation={conversation}
            replyTo={replyTo}
            onCancelReply={() => setReplyTo(undefined)}
            onTyping={onTyping}
            onStopTyping={onStopTyping}
          />
        )}
      </div>
    </div>
  );
}