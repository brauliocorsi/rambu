import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DirectMessage, DMMessage } from "@/hooks/useDirectMessages";
import { useInfiniteDMMessages } from "@/hooks/useInfiniteDMMessages";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useTypingIndicator } from "@/hooks/useTypingIndicator";
import { useLayoutPreferences } from "@/hooks/useLayoutPreferences";
import { useViewMode } from "@/contexts/ViewModeContext";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { TypingIndicator } from "@/components/message/TypingIndicator";
import { DMMessageBubble } from "./DMMessageBubble";
import { ConversationComposer } from "@/components/conversation/ConversationComposer";
import { ScrollToBottomButton } from "@/components/message/ScrollToBottomButton";
import { useRecordDMMessageView, useDMMessageViewCounts } from "@/hooks/useMessageViews";
import { format, isToday, isYesterday, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";

interface DMChatViewProps {
  dm: DirectMessage;
  onBack: () => void;
}

export function DMChatView({ dm, onBack }: DMChatViewProps) {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const { preferences } = useLayoutPreferences();
  const { isMobile } = useViewMode();
  const { messages, isLoading, isFetchingMore, hasMore, loadMore } = useInfiniteDMMessages(dm.id);
  const { typingUsers, sendTypingStart, sendTypingStop } = useTypingIndicator(dm.id, true);
  const [replyTo, setReplyTo] = useState<string | undefined>();
  const containerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const isNearBottomRef = useRef(true);
  const prevMessagesLengthRef = useRef(0);
  const prevScrollHeightRef = useRef(0);
  const isLoadingMoreRef = useRef(false);
  const rafScrollRef = useRef<number | null>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);

  // Track message views
  const visibleMessageIds = useMemo(() => messages.map(m => m.id).filter(id => !id.startsWith("temp-")), [messages]);
  useRecordDMMessageView(visibleMessageIds, dm.id);
  const { data: dmViewCounts = {} } = useDMMessageViewCounts(visibleMessageIds);

  const otherUser = dm.other_user;
  const displayName = otherUser?.display_name || "Usuário";

  // Check if user is near bottom
  const checkIfNearBottom = useCallback(() => {
    if (!containerRef.current) return true;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    return scrollHeight - scrollTop - clientHeight < 150;
  }, []);

  // Track scroll position
  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;

    const nearBottom = checkIfNearBottom();
    if (isNearBottomRef.current !== nearBottom) {
      isNearBottomRef.current = nearBottom;
      setShowScrollButton(!nearBottom);
    }
    
    // Load more when scrolling near top
    if (hasMore && !isFetchingMore && !isLoadingMoreRef.current) {
      const { scrollTop } = containerRef.current;
      if (scrollTop < 48) {
        isLoadingMoreRef.current = true;
        prevScrollHeightRef.current = containerRef.current.scrollHeight;
        loadMore();
      }
    }
  }, [checkIfNearBottom, hasMore, loadMore, isFetchingMore]);

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

  const wasLoadingRef = useRef(true);

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

  // Scroll to bottom when loading finishes (initial load or DM switch)
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

  // Reset refs when DM changes
  useEffect(() => {
    isNearBottomRef.current = true;
    prevMessagesLengthRef.current = 0;
    prevScrollHeightRef.current = 0;
    isLoadingMoreRef.current = false;
    wasLoadingRef.current = true;
    setShowScrollButton(false);
  }, [dm.id]);

  useEffect(() => {
    return () => {
      if (rafScrollRef.current) {
        cancelAnimationFrame(rafScrollRef.current);
      }
    };
  }, []);

  // Auto-scroll on new messages
  useEffect(() => {
    if (messages.length > prevMessagesLengthRef.current && !isLoadingMoreRef.current && isNearBottomRef.current) {
      scrollToBottom(isMobile ? "auto" : "smooth");
    }
    prevMessagesLengthRef.current = messages.length;
  }, [messages.length, scrollToBottom, isMobile]);

  // Helper to format day separator
  const formatDaySeparator = (date: Date): string => {
    if (isToday(date)) return "Hoje";
    if (isYesterday(date)) return "Ontem";
    return format(date, "EEEE, d 'de' MMMM", { locale: ptBR });
  };

  // Always group messages by day for date separators
  const messageGroups = useMemo(() => {
    const groups: { date: Date; messages: DMMessage[] }[] = [];
    messages.forEach((message) => {
      const messageDate = new Date(message.created_at);
      const lastGroup = groups[groups.length - 1];
      
      if (lastGroup && isSameDay(lastGroup.date, messageDate)) {
        lastGroup.messages.push(message);
      } else {
        groups.push({ date: messageDate, messages: [message] });
      }
    });
    return groups;
  }, [messages]);

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

      {/* Messages */}
      <div className="flex-1 min-h-0 relative overflow-hidden">
        <div 
          ref={containerRef}
          onScroll={handleScroll}
          className="absolute inset-0 overflow-y-auto py-4 overscroll-contain"
        >
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <LoadingSpinner size="lg" />
          </div>
        ) : messages.length === 0 ? (
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
        ) : (
          <>
            {/* Loading more indicator */}
            {isFetchingMore && (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">Carregando mensagens...</span>
              </div>
            )}

            {/* Conversation start - only show when no more messages */}
            {!hasMore && (
              <div className="text-center py-8 px-4">
                <Avatar className="h-12 w-12 mx-auto mb-3">
                  <AvatarImage src={otherUser?.avatar_url || undefined} />
                  <AvatarFallback className="gradient-primary text-white">
                    {displayName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <h3 className="font-bold">{displayName}</h3>
                <p className="text-sm text-muted-foreground">Início da conversa</p>
              </div>
            )}

            {/* Messages with day separators */}
            {messageGroups.map((group, groupIndex) => (
                <div key={`${group.date.toISOString()}-${group.messages[0]?.id ?? groupIndex}-${groupIndex}`}>
                  {/* Day separator */}
                  <div className="flex items-center gap-3 px-4 py-3 sticky top-0 z-10 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                    <div className="flex-1 h-px bg-border" />
                    <span className="text-xs font-semibold text-foreground/80 px-3 py-1 bg-secondary rounded-full shadow-sm">
                      {formatDaySeparator(group.date)}
                    </span>
                    <div className="flex-1 h-px bg-border" />
                  </div>
                  
                  {/* Messages for this day */}
                  {group.messages.map((msg) => (
                    <DMMessageBubble 
                      key={msg.id} 
                      message={msg} 
                      dmId={dm.id}
                      onReply={setReplyTo}
                      slackMode={preferences.slackMode}
                      density={preferences.density}
                      viewData={dmViewCounts[msg.id]}
                    />
                  ))}
                </div>
            ))}

            {/* Typing Indicator */}
            {typingUsers.length > 0 && (
              <TypingIndicator typingUsers={typingUsers} />
            )}
          </>
        )}
        <div ref={bottomRef} />
        </div>

        {/* Scroll to bottom button */}
        <ScrollToBottomButton
          visible={showScrollButton}
          onClick={() => scrollToBottom("instant")}
        />
      </div>
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
