import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Hash, Loader2, MessageCircle, Users } from "lucide-react";
import { format } from "date-fns";
import { useConversationMessages } from "@/hooks/useConversationMessages";
import { useConversationRealtime } from "@/hooks/useConversationRealtime";
import { ConversationMessageBubble } from "./ConversationMessageBubble";
import { ScrollToBottomButton } from "@/components/message/ScrollToBottomButton";
import { TypingIndicator } from "@/components/message/TypingIndicator";
import { MessageListSkeleton } from "@/components/ui/skeletons";
import {
  formatDaySeparator,
  groupMessagesByDay,
} from "@/lib/conversation/messageGrouping";
import type { ConversationRef } from "@/types/conversation";
import type { MessageDensity } from "@/hooks/useLayoutPreferences";
import type { ConversationMessage } from "@/types/conversation";

interface TypingUser {
  userId: string;
  displayName: string;
}

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
  /**
   * Nome amigável da conversa (#canal, nome do contato, nome do grupo)
   * para header "início da conversa" e empty state. Se não vier, cai
   * para `conversation.displayName`. Sem fetch extra.
   */
  conversationName?: string;
  /** Lista opcional de usuários digitando. Sem subscription interna. */
  typingUsers?: TypingUser[];
  /**
   * Modo controlled — quando `messages` é fornecido, a lista NÃO
   * chama `useConversationMessages` internamente, evitando hook
   * duplicado quando o pai (ex.: `ConversationView`) é o dono dos
   * dados. Se `messages` for `undefined`, o hook interno é usado
   * (compatibilidade com consumidores standalone).
   */
  messages?: ConversationMessage[];
  isLoading?: boolean;
  isFetchingMore?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
}

export function ConversationMessageList({
  conversation,
  onReply,
  onOpenThread,
  slackMode,
  density,
  emptyState,
  conversationName,
  typingUsers = [],
  messages: controlledMessages,
  isLoading: controlledIsLoading,
  isFetchingMore: controlledIsFetchingMore,
  hasMore: controlledHasMore,
  onLoadMore,
}: ConversationMessageListProps) {
  const isControlled = controlledMessages !== undefined;
  const internal = useConversationMessages(isControlled ? null : conversation);
  const messages = isControlled ? controlledMessages! : internal.messages;
  const isLoading = isControlled
    ? Boolean(controlledIsLoading)
    : internal.isLoading;
  const isFetchingMore = isControlled
    ? Boolean(controlledIsFetchingMore)
    : internal.isFetchingMore;
  const hasMore = isControlled
    ? Boolean(controlledHasMore)
    : internal.hasMore;
  const loadMore = isControlled ? onLoadMore ?? (() => {}) : internal.loadMore;
  // Façade de realtime (visibility/online resync) sempre ativa para a
  // conversa exibida — não duplica subscription, é só refetch hook.
  useConversationRealtime(conversation);

  const containerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const isNearBottomRef = useRef(true);
  const prevLenRef = useRef(0);
  const prevHeightRef = useRef(0);
  const loadingMoreRef = useRef(false);
  const wasLoadingRef = useRef(true);
  const [showScrollBtn, setShowScrollBtn] = useState(false);

  const checkNearBottom = useCallback(() => {
    const el = containerRef.current;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight < 200;
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
    wasLoadingRef.current = true;
    setShowScrollBtn(false);
  }, [conversation.type, conversation.id]);

  // Scroll to bottom when initial load finishes (open conversation)
  useEffect(() => {
    if (isLoading) {
      wasLoadingRef.current = true;
      return;
    }
    if (wasLoadingRef.current) {
      wasLoadingRef.current = false;
      const doScroll = () => {
        if (containerRef.current) {
          containerRef.current.scrollTop = containerRef.current.scrollHeight;
        }
      };
      requestAnimationFrame(() => requestAnimationFrame(doScroll));
      const t1 = setTimeout(doScroll, 100);
      const t2 = setTimeout(doScroll, 300);
      return () => { clearTimeout(t1); clearTimeout(t2); };
    }
  }, [isLoading]);

  // ResizeObserver: keep pinned to bottom when content grows (images/audio
  // render, keyboard resize) — only if the user was already near bottom.
  // Coalesce bursts via rAF: em conversas com muitas mídias o RO dispara
  // várias vezes no mesmo frame; queremos no máximo 1 scroll efetivo/frame.
  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    let rafId: number | null = null;
    const schedule = () => {
      if (rafId != null) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        if (loadingMoreRef.current) return;
        if (isNearBottomRef.current) {
          el.scrollTop = el.scrollHeight;
        }
      });
    };
    const ro = new ResizeObserver(() => {
      if (loadingMoreRef.current) return;
      schedule();
    });
    ro.observe(el);
    const inner = el.firstElementChild as HTMLElement | null;
    if (inner) ro.observe(inner);
    return () => {
      ro.disconnect();
      if (rafId != null) cancelAnimationFrame(rafId);
    };
  }, [conversation.type, conversation.id]);

  // Re-anchor on mobile keyboard open/close
  useEffect(() => {
    if (typeof window === "undefined" || !window.visualViewport) return;
    const vv = window.visualViewport;
    const onResize = () => {
      const el = containerRef.current;
      if (!el) return;
      if (isNearBottomRef.current && !loadingMoreRef.current) {
        el.scrollTop = el.scrollHeight;
      }
    };
    vv.addEventListener("resize", onResize);
    return () => vv.removeEventListener("resize", onResize);
  }, []);

  const displayName = conversationName ?? conversation.displayName ?? "";
  const isChannel = conversation.type === "channel";
  const isGroup = conversation.type === "group";
  const messageGroups = useMemo(() => groupMessagesByDay(messages), [messages]);

  if (isLoading) {
    return <MessageListSkeleton count={8} />;
  }

  if (messages.length === 0) {
    if (emptyState) {
      return <>{emptyState}</>;
    }
    const Icon = isChannel ? Hash : isGroup ? Users : MessageCircle;
    const title = isChannel
      ? displayName
        ? `Início de #${displayName}`
        : "Início do canal"
      : isGroup
        ? displayName
          ? `Início de ${displayName}`
          : "Início do grupo"
        : displayName
          ? `Conversa com ${displayName}`
          : "Início da conversa";
    const subtitle = isChannel
      ? "Este é o início do canal. Envie a primeira mensagem!"
      : isGroup
        ? "Diga olá ao grupo. Envie a primeira mensagem!"
        : "Envie a primeira mensagem para começar.";
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-4 text-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="h-16 w-16 rounded-full gradient-primary-soft flex items-center justify-center mb-4"
        >
          <Icon className="h-8 w-8 text-primary" />
        </motion.div>
        <h3 className="font-bold text-lg">{title}</h3>
        <p className="text-sm text-muted-foreground max-w-xs mt-1">{subtitle}</p>
      </div>
    );
  }

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

        {/* Header "início da conversa" quando não há mais histórico */}
        {!hasMore && (
          <div className="text-center py-8 px-4">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="h-12 w-12 rounded-full gradient-primary-soft flex items-center justify-center mx-auto mb-3"
            >
              {isChannel ? (
                <Hash className="h-6 w-6 text-primary" />
              ) : isGroup ? (
                <Users className="h-6 w-6 text-primary" />
              ) : (
                <MessageCircle className="h-6 w-6 text-primary" />
              )}
            </motion.div>
            <h3 className="font-bold">
              {isChannel
                ? displayName
                  ? `Início de #${displayName}`
                  : "Início do canal"
                : isGroup
                  ? displayName
                    ? `Início de ${displayName}`
                    : "Início do grupo"
                  : displayName
                    ? `Conversa com ${displayName}`
                    : "Início da conversa"}
            </h3>
            <p className="text-sm text-muted-foreground">
              {isChannel
                ? "Este é o começo deste canal."
                : isGroup
                  ? "Este é o começo deste grupo."
                  : "Este é o começo desta conversa."}
            </p>
          </div>
        )}

        {/* Mensagens agrupadas por dia com separadores sticky */}
        {messageGroups.map((group, groupIndex) => (
          <div
            key={`day-${format(group.date, "yyyy-MM-dd")}-${groupIndex}`}
            data-day={format(group.date, "yyyy-MM-dd")}
          >
            <div className="flex items-center gap-3 px-4 py-3 sticky top-0 z-10 backdrop-blur supports-[backdrop-filter]:bg-background/60">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs font-semibold text-foreground/80 px-3 py-1 bg-secondary rounded-full shadow-sm">
                {formatDaySeparator(group.date)}
              </span>
              <div className="flex-1 h-px bg-border" />
            </div>
            {group.messages.map((m) => (
              <ConversationMessageBubble
                key={m.id}
                message={m}
                onReply={onReply}
                onOpenThread={onOpenThread}
                slackMode={slackMode}
                density={density}
              />
            ))}
          </div>
        ))}

        {typingUsers.length > 0 && <TypingIndicator typingUsers={typingUsers} />}

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