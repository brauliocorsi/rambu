import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { useConversationMessages } from "@/hooks/useConversationMessages";
import { useConversationRealtime } from "@/hooks/useConversationRealtime";
import { ConversationMessageBubble } from "./ConversationMessageBubble";
import { ScrollToBottomButton } from "@/components/message/ScrollToBottomButton";
import type { ConversationRef } from "@/types/conversation";
import type { MessageDensity } from "@/hooks/useLayoutPreferences";

/**
 * Lista unificada de mensagens. Segue as regras de scroll do projeto:
 * absolute inset-0, overscroll-contain, scrollTop = scrollHeight no
 * autoscroll, detecao de topo (<48px) para loadMore().
 */
interface ConversationMessageListProps {
  conversation: ConversationRef;
  onReply?: (messageId: string) => void;
  onOpenThread?: (message: any) => void;
  slackMode?: boolean;
  density?: MessageDensity;
  emptyState?: React.ReactNode;
}

export function ConversationMessageList({
  conversation,
  onReply,
  onOpenThread,
  slackMode,
  density,
  emptyState,
}: ConversationMessageListProps) {
  const { messages, isLoading, isFetchingMore, hasMore, loadMore } =
    useConversationMessages(conversation);
  useConversationRealtime(conversation);

  const containerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const isNearBottomRef = useRef(true);
  const prevLenRef = useRef(0);
  const prevHeightRef = useRef(0);
  const loadingMoreRef = useRef(false);
  const [showScrollBtn, setShowScrollBtn] = useState(false);

  const checkNearBottom = useCallback(() => {
    const el = containerRef.current;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight < 150;
  }, []);

  const handleScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const near = checkNearBottom();
    if (near !== isNearBottomRef.current) {
      isNearBottomRef.current = near;
      setShowScrollBtn(!near);
    }
    if (hasMore && !isFetchingMore && !loadingMoreRef.current && el.scrollTop < 48) {
      loadingMoreRef.current = true;
      prevHeightRef.current = el.scrollHeight;
      loadMore();
    }
  }, [checkNearBottom, hasMore, isFetchingMore, loadMore]);

  useEffect(() => {
    if (loadingMoreRef.current && containerRef.current && !isFetchingMore) {
      const el = containerRef.current;
      const diff = el.scrollHeight - prevHeightRef.current;
      el.scrollTop += diff;
      prevHeightRef.current = el.scrollHeight;
      loadingMoreRef.current = false;
    }
  }, [messages.length, isFetchingMore]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    if (
      messages.length > prevLenRef.current &&
      !loadingMoreRef.current &&
      isNearBottomRef.current
    ) {
      el.scrollTop = el.scrollHeight;
    }
    prevLenRef.current = messages.length;
  }, [messages.length]);

  useEffect(() => {
    isNearBottomRef.current = true;
    prevLenRef.current = 0;
    prevHeightRef.current = 0;
    loadingMoreRef.current = false;
    setShowScrollBtn(false);
  }, [conversation.type, conversation.id]);

  return (
    <div className="flex-1 min-h-0 relative overflow-hidden">
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="absolute inset-0 overflow-y-auto py-4 overscroll-contain"
      >
        {isFetchingMore && (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}

        {isLoading
          ? null
          : messages.length === 0
          ? emptyState ?? null
          : messages.map((m) => (
              <ConversationMessageBubble
                key={m.id}
                message={m}
                onReply={onReply}
                onOpenThread={onOpenThread}
                slackMode={slackMode}
                density={density}
              />
            ))}
        <div ref={bottomRef} />
      </div>
      <ScrollToBottomButton
        visible={showScrollBtn}
        onClick={() => {
          const el = containerRef.current;
          if (el) el.scrollTop = el.scrollHeight;
        }}
      />
    </div>
  );
}