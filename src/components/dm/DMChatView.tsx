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
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { TypingIndicator } from "@/components/message/TypingIndicator";
import { DMMessageBubble } from "./DMMessageBubble";
import { DMMessageInput } from "./DMMessageInput";
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
  const { messages, isLoading, isFetchingMore, hasMore, loadMore } = useInfiniteDMMessages(dm.id);
  const { typingUsers, sendTypingStart, sendTypingStop } = useTypingIndicator(dm.id, true);
  const [replyTo, setReplyTo] = useState<string | undefined>();
  const containerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const isNearBottomRef = useRef(true);
  const prevMessagesLengthRef = useRef(0);
  const prevScrollHeightRef = useRef(0);
  const isLoadingMoreRef = useRef(false);

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
    isNearBottomRef.current = checkIfNearBottom();
    
    // Load more when scrolling near top
    if (containerRef.current && hasMore && !isFetchingMore) {
      const { scrollTop } = containerRef.current;
      if (scrollTop < 100) {
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
      containerRef.current.scrollTop = scrollDiff;
      isLoadingMoreRef.current = false;
    }
  }, [messages.length, isFetchingMore]);

  // Auto-scroll on new messages
  useEffect(() => {
    if (messages.length > prevMessagesLengthRef.current && !isLoadingMoreRef.current) {
      if (isNearBottomRef.current) {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      }
    }
    prevMessagesLengthRef.current = messages.length;
  }, [messages.length]);

  // Scroll to bottom on mount
  useEffect(() => {
    isNearBottomRef.current = true;
    prevMessagesLengthRef.current = messages.length;
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "instant" }), 50);
  }, [dm.id]);

  // Helper to format day separator
  const formatDaySeparator = (date: Date): string => {
    if (isToday(date)) return "Hoje";
    if (isYesterday(date)) return "Ontem";
    return format(date, "EEEE, d 'de' MMMM", { locale: ptBR });
  };

  // Group messages by day when in Slack mode
  const messageGroups = useMemo(() => {
    if (!preferences.slackMode) return null;
    
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
  }, [messages, preferences.slackMode]);

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
      <div 
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto py-4 scroll-smooth"
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

            {/* Messages - Slack mode with day separators */}
            {preferences.slackMode && messageGroups ? (
              messageGroups.map((group) => (
                <div key={group.date.toISOString()}>
                  {/* Day separator */}
                  <div className="flex items-center gap-3 px-4 py-3">
                    <div className="flex-1 h-px bg-border" />
                    <span className="text-xs font-medium text-muted-foreground px-2 py-1 bg-secondary rounded-full">
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
                      slackMode
                      density={preferences.density}
                    />
                  ))}
                </div>
              ))
            ) : (
              /* Standard mode */
              messages.map((msg) => (
                <DMMessageBubble 
                  key={msg.id} 
                  message={msg} 
                  dmId={dm.id}
                  onReply={setReplyTo}
                  density={preferences.density}
                />
              ))
            )}

            {/* Typing Indicator */}
            {typingUsers.length > 0 && (
              <TypingIndicator typingUsers={typingUsers} />
            )}
          </>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <DMMessageInput
        dmId={dm.id}
        otherUserName={displayName}
        replyTo={replyTo}
        onCancelReply={() => setReplyTo(undefined)}
        onTyping={() => profile?.display_name && sendTypingStart(profile.display_name)}
        onStopTyping={sendTypingStop}
      />
    </div>
  );
}
