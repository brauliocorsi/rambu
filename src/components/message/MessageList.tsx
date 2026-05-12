import { useRef, useEffect, useCallback, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Hash, Loader2 } from "lucide-react";
import { Message } from "@/hooks/useMessages";
import { MessageBubble } from "./MessageBubble";
import { MessageListSkeleton } from "@/components/ui/skeletons";
import { TypingIndicator } from "./TypingIndicator";
import { useLayoutPreferences } from "@/hooks/useLayoutPreferences";
import { useViewMode } from "@/contexts/ViewModeContext";
import { ScrollToBottomButton } from "./ScrollToBottomButton";
import { useRecordMessageView, useMessageViewCounts } from "@/hooks/useMessageViews";
import { format, isToday, isYesterday, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";

interface TypingUser {
  userId: string;
  displayName: string;
}

interface MessageListProps {
  messages: Message[];
  channelId: string;
  channelName: string;
  isLoading: boolean;
  isFetchingMore?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
  onReply?: (messageId: string) => void;
  onOpenThread?: (message: Message) => void;
  typingUsers?: TypingUser[];
}

// Helper to format day separator
function formatDaySeparator(date: Date): string {
  if (isToday(date)) return "Hoje";
  if (isYesterday(date)) return "Ontem";
  return format(date, "EEEE, d 'de' MMMM", { locale: ptBR });
}

// Group messages by day
function groupMessagesByDay(messages: Message[]): { date: Date; messages: Message[] }[] {
  const groups: { date: Date; messages: Message[] }[] = [];
  const seen = new Set<string>();

  messages.forEach((message) => {
    // Dedupe messages by id to avoid React duplicate-key warnings
    if (seen.has(message.id)) return;
    seen.add(message.id);

    const messageDate = new Date(message.created_at);
    const lastGroup = groups[groups.length - 1];
    
    if (lastGroup && isSameDay(lastGroup.date, messageDate)) {
      lastGroup.messages.push(message);
    } else {
      groups.push({ date: messageDate, messages: [message] });
    }
  });
  
  return groups;
}

export function MessageList({ 
  messages, 
  channelId, 
  channelName, 
  isLoading, 
  isFetchingMore,
  hasMore,
  onLoadMore,
  onReply, 
  onOpenThread,
  typingUsers = [],
}: MessageListProps) {
  const { preferences } = useLayoutPreferences();
  const { isMobile } = useViewMode();
  const containerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const topRef = useRef<HTMLDivElement>(null);
  const isNearBottomRef = useRef(true);
  const prevMessagesLengthRef = useRef(0);
  const prevScrollHeightRef = useRef(0);
  const isLoadingMoreRef = useRef(false);
  const rafScrollRef = useRef<number | null>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);

  // Check if user is near bottom (within 150px)
  const checkIfNearBottom = useCallback(() => {
    if (!containerRef.current) return true;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    return scrollHeight - scrollTop - clientHeight < 150;
  }, []);

  // Track scroll position and detect scroll to top for infinite loading
  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;

    const nearBottom = checkIfNearBottom();
    if (isNearBottomRef.current !== nearBottom) {
      isNearBottomRef.current = nearBottom;
      setShowScrollButton(!nearBottom);
    }
    
    // Load more when scrolling near top
    if (hasMore && onLoadMore && !isFetchingMore && !isLoadingMoreRef.current) {
      const { scrollTop } = containerRef.current;
      if (scrollTop < 48) {
        isLoadingMoreRef.current = true;
        prevScrollHeightRef.current = containerRef.current.scrollHeight;
        onLoadMore();
      }
    }
  }, [checkIfNearBottom, hasMore, onLoadMore, isFetchingMore]);

  const wasLoadingRef = useRef(true);

  // Maintain scroll position after loading more messages
  useEffect(() => {
    if (isLoadingMoreRef.current && containerRef.current && !isFetchingMore) {
      const newScrollHeight = containerRef.current.scrollHeight;
      const scrollDiff = newScrollHeight - prevScrollHeightRef.current;
      containerRef.current.scrollTop += scrollDiff;
      prevScrollHeightRef.current = newScrollHeight;
      isLoadingMoreRef.current = false;
    }
  }, [messages.length, isFetchingMore]);

  // Scroll to bottom
  const scrollToBottom = useCallback((behavior: ScrollBehavior = isMobile ? "auto" : "smooth") => {
    if (rafScrollRef.current) {
      cancelAnimationFrame(rafScrollRef.current);
    }

    rafScrollRef.current = requestAnimationFrame(() => {
      if (containerRef.current) {
        if (behavior === "instant" || behavior === "auto") {
          containerRef.current.scrollTop = containerRef.current.scrollHeight;
        } else {
          bottomRef.current?.scrollIntoView({ behavior });
        }
      }
    });
  }, [isMobile]);

  // Scroll to bottom when loading finishes
  useEffect(() => {
    if (isLoading) {
      wasLoadingRef.current = true;
    } else if (wasLoadingRef.current) {
      wasLoadingRef.current = false;
      const doScroll = () => {
        if (containerRef.current) {
          containerRef.current.scrollTop = containerRef.current.scrollHeight;
        }
      };
      requestAnimationFrame(() => requestAnimationFrame(doScroll));
      const t1 = setTimeout(doScroll, 100);
      const t2 = setTimeout(doScroll, 300);
      const t3 = setTimeout(doScroll, 600);
      return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
    }
  }, [isLoading]);

  // Reset refs when channel changes
  useEffect(() => {
    isNearBottomRef.current = true;
    prevMessagesLengthRef.current = 0;
    prevScrollHeightRef.current = 0;
    isLoadingMoreRef.current = false;
    wasLoadingRef.current = true;
    setShowScrollButton(false);
  }, [channelId]);

  useEffect(() => {
    return () => {
      if (rafScrollRef.current) {
        cancelAnimationFrame(rafScrollRef.current);
      }
    };
  }, []);

  // Auto-scroll on new messages only if user is near bottom
  useEffect(() => {
    if (messages.length > prevMessagesLengthRef.current && !isLoadingMoreRef.current && isNearBottomRef.current) {
      scrollToBottom(isMobile ? "auto" : "smooth");
    }
    prevMessagesLengthRef.current = messages.length;
  }, [messages.length, scrollToBottom, isMobile]);

  // Always group messages by day so date separators are visible in any mode
  const messageGroups = useMemo(() => groupMessagesByDay(messages), [messages]);

  // Record views for visible messages
  const visibleMessageIds = useMemo(() => messages.map(m => m.id).filter(id => !id.startsWith("temp-")), [messages]);
  useRecordMessageView(visibleMessageIds, channelId);

  // Fetch view counts for all visible messages
  const { data: viewCounts = {} } = useMessageViewCounts(visibleMessageIds);

  if (isLoading) {
    return <MessageListSkeleton count={8} />;
  }

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-4 text-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="h-16 w-16 rounded-full gradient-primary-soft flex items-center justify-center mb-4"
        >
          <Hash className="h-8 w-8 text-primary" />
        </motion.div>
        <h3 className="font-bold text-lg">Início de #{channelName}</h3>
        <p className="text-sm text-muted-foreground max-w-xs mt-1">
          Este é o início do canal. Envie a primeira mensagem!
        </p>
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
        {/* Loading more indicator */}
        {isFetchingMore && (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            <span className="ml-2 text-sm text-muted-foreground">Carregando mensagens...</span>
          </div>
        )}

        {/* Top sentinel for scroll detection */}
        <div ref={topRef} className="h-1" />

        {/* Channel start message - only show when no more messages to load */}
        {!hasMore && (
          <div className="text-center py-8 px-4">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="h-12 w-12 rounded-full gradient-primary-soft flex items-center justify-center mx-auto mb-3"
            >
              <Hash className="h-6 w-6 text-primary" />
            </motion.div>
            <h3 className="font-bold">Início de #{channelName}</h3>
            <p className="text-sm text-muted-foreground">Este é o começo deste canal.</p>
          </div>
        )}

        {/* Messages with day separators */}
        {messageGroups.map((group, groupIndex) => (
            <div key={`day-${format(group.date, "yyyy-MM-dd")}-${groupIndex}`} data-day={format(group.date, "yyyy-MM-dd")}>
              {/* Day separator */}
              <div className="flex items-center gap-3 px-4 py-3 sticky top-0 z-10 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs font-semibold text-foreground/80 px-3 py-1 bg-secondary rounded-full shadow-sm">
                  {formatDaySeparator(group.date)}
                </span>
                <div className="flex-1 h-px bg-border" />
              </div>
              
              {/* Messages for this day */}
              {group.messages.map((message) => (
                <MessageBubble
                  key={message.id}
                  message={message}
                  channelId={channelId}
                  onReply={onReply}
                  onOpenThread={onOpenThread}
                  slackMode={preferences.slackMode}
                  density={preferences.density}
                  viewData={viewCounts[message.id]}
                />
              ))}
            </div>
        ))}

        {/* Typing Indicator */}
        {typingUsers.length > 0 && (
          <TypingIndicator typingUsers={typingUsers} />
        )}

        <div ref={bottomRef} className="h-1" />
      </div>

      {/* Scroll to bottom button */}
      <ScrollToBottomButton
        visible={showScrollButton}
        onClick={() => scrollToBottom("instant")}
      />
    </div>
  );
}
