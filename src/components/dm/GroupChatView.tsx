import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Loader2, Users, MoreHorizontal, UserPlus, LogOut } from "lucide-react";
import { ScrollToBottomButton } from "@/components/message/ScrollToBottomButton";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DMGroup, useDMGroupMessages, useSendGroupMessage, useLeaveGroup, DMGroupMessage } from "@/hooks/useDMGroups";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useTypingIndicator } from "@/hooks/useTypingIndicator";
import { useWorkspaceContext } from "@/contexts/WorkspaceContext";
import { useViewMode } from "@/contexts/ViewModeContext";
import { useLayoutPreferences } from "@/hooks/useLayoutPreferences";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { TypingIndicator } from "@/components/message/TypingIndicator";
import { DMMessageInput } from "./DMMessageInput";
import { formatMentionsForDisplay } from "@/hooks/useMentions";
import { format, isToday, isYesterday, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import type { MessageDensity } from "@/hooks/useLayoutPreferences";

// Density-based styles for group messages
const densityStyles = {
  compact: {
    container: "py-0.5",
    avatar: "h-7 w-7",
    standardAvatar: "h-6 w-6",
    spacing: "mb-1",
  },
  normal: {
    container: "py-1.5",
    avatar: "h-9 w-9",
    standardAvatar: "h-8 w-8",
    spacing: "mb-2",
  },
  comfortable: {
    container: "py-3",
    avatar: "h-10 w-10",
    standardAvatar: "h-10 w-10",
    spacing: "mb-3",
  },
};

interface GroupChatViewProps {
  group: DMGroup;
  onBack: () => void;
}

export function GroupChatView({ group, onBack }: GroupChatViewProps) {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const { currentWorkspace } = useWorkspaceContext();
  const { preferences } = useLayoutPreferences();
  const { isMobile } = useViewMode();
  const { messages, isLoading, isFetchingMore, hasMore, loadMore } = useDMGroupMessages(group.id);
  const { typingUsers, sendTypingStart, sendTypingStop } = useTypingIndicator(`group:${group.id}`, true);
  const sendMessage = useSendGroupMessage();
  const leaveGroup = useLeaveGroup();
  const [replyTo, setReplyTo] = useState<string | undefined>();
  const containerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const isNearBottomRef = useRef(true);
  const prevMessagesLengthRef = useRef(0);
  const prevScrollHeightRef = useRef(0);
  const isLoadingMoreRef = useRef(false);
  const wasLoadingRef = useRef(true);
  const rafScrollRef = useRef<number | null>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);

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

  // Auto-scroll on new messages
  useEffect(() => {
    if (messages.length > prevMessagesLengthRef.current && !isLoadingMoreRef.current && isNearBottomRef.current) {
      scrollToBottom(isMobile ? "auto" : "smooth");
    }
    prevMessagesLengthRef.current = messages.length;
  }, [messages.length, scrollToBottom, isMobile]);

  // Reset refs when group changes
  useEffect(() => {
    isNearBottomRef.current = true;
    prevMessagesLengthRef.current = 0;
    prevScrollHeightRef.current = 0;
    isLoadingMoreRef.current = false;
    wasLoadingRef.current = true;
    setShowScrollButton(false);
  }, [group.id]);

  useEffect(() => {
    return () => {
      if (rafScrollRef.current) {
        cancelAnimationFrame(rafScrollRef.current);
      }
    };
  }, []);

  // Helper to format day separator
  const formatDaySeparator = (date: Date): string => {
    if (isToday(date)) return "Hoje";
    if (isYesterday(date)) return "Ontem";
    return format(date, "EEEE, d 'de' MMMM", { locale: ptBR });
  };

  // Group messages by day when in Slack mode
  const messageGroups = useMemo(() => {
    if (!preferences.slackMode) return null;
    
    const groups: { date: Date; messages: DMGroupMessage[] }[] = [];
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

  const handleSendMessage = async (content: string, replyToId?: string) => {
    await sendMessage.mutateAsync({
      groupId: group.id,
      content,
      replyTo: replyToId,
    });
    setReplyTo(undefined);
  };

  const handleLeaveGroup = () => {
    if (!currentWorkspace) return;
    leaveGroup.mutate({ groupId: group.id, workspaceId: currentWorkspace.id });
    onBack();
  };

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
          <h2 className="font-bold truncate">{getGroupName()}</h2>
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
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Users className="h-8 w-8 text-primary" />
            </div>
            <h3 className="font-bold text-lg">{getGroupName()}</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Comece uma conversa em grupo!
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

            {/* Conversation start */}
            {!hasMore && (
              <div className="text-center py-8 px-4">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-bold">{getGroupName()}</h3>
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
                  
                  {/* Messages for this day - Slack style */}
                  {group.messages.map((msg) => {
                    const displayName = msg.profile?.display_name || "Usuário";
                    const time = format(new Date(msg.created_at), "HH:mm", { locale: ptBR });
                    const styles = densityStyles[preferences.density];
                    
                    return (
                      <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={cn("flex gap-3 px-4 hover:bg-secondary/50 transition-colors", styles.container)}
                      >
                        <Avatar className={cn(styles.avatar, "shrink-0 mt-0.5")}>
                          <AvatarImage src={msg.profile?.avatar_url || undefined} />
                          <AvatarFallback className="text-xs gradient-primary text-white">
                            {displayName.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline gap-2 mb-0.5">
                            <span className="font-semibold text-sm">{displayName}</span>
                            <span className="text-xs text-muted-foreground">{time}</span>
                            {msg.is_edited && (
                              <span className="text-xs text-muted-foreground">(editado)</span>
                            )}
                          </div>
                          <p className="text-sm whitespace-pre-wrap break-words">
                            {formatMentionsForDisplay(msg.content)}
                          </p>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              ))
            ) : (
              /* Standard mode */
              messages.map((msg) => {
                const isOwn = msg.user_id === user?.id;
                const styles = densityStyles[preferences.density];
                return (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn("flex px-4", styles.spacing, isOwn ? "justify-end" : "justify-start")}
                  >
                    <div className={`flex gap-2 max-w-[85%] ${isOwn ? "flex-row-reverse" : ""}`}>
                      {!isOwn && (
                        <Avatar className={cn(styles.standardAvatar, "shrink-0")}>
                          <AvatarImage src={msg.profile?.avatar_url || undefined} />
                          <AvatarFallback className="text-xs gradient-primary text-white">
                            {(msg.profile?.display_name || "U").charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      )}
                      <div>
                        {!isOwn && (
                          <p className="text-xs text-muted-foreground mb-1 px-1">
                            {msg.profile?.display_name || "Usuário"}
                          </p>
                        )}
                        <div
                          className={cn(
                            "rounded-2xl px-4 py-2",
                            isOwn
                              ? "gradient-primary text-white rounded-br-md"
                              : "bg-secondary rounded-bl-md"
                          )}
                        >
                          <p className="text-sm whitespace-pre-wrap break-words">
                            {formatMentionsForDisplay(msg.content)}
                          </p>
                        </div>
                        <p className={`text-xs text-muted-foreground mt-1 ${isOwn ? "text-right" : ""} px-1`}>
                          {format(new Date(msg.created_at), "HH:mm", { locale: ptBR })}
                          {msg.is_edited && " (editado)"}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                );
              })
            )}

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

      {/* Custom Input for Group */}
      <div className="sticky bottom-0 z-40 shrink-0 safe-bottom border-t border-border bg-background/95 p-3 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:p-4">
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder={`Mensagem para ${getGroupName()}`}
            className="flex-1 min-h-[44px] px-4 py-3 rounded-xl bg-secondary border-0 focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                const input = e.currentTarget;
                if (input.value.trim()) {
                  handleSendMessage(input.value);
                  input.value = "";
                }
              }
            }}
            onChange={(e) => {
              if (e.target.value.trim() && profile?.display_name) {
                sendTypingStart(profile.display_name);
              } else {
                sendTypingStop();
              }
            }}
            onBlur={sendTypingStop}
          />
          <Button
            size="icon"
            className="h-10 w-10 md:h-12 md:w-12 rounded-xl gradient-primary text-white shrink-0"
            onClick={(e) => {
              const input = (e.currentTarget.previousSibling as HTMLInputElement);
              if (input.value.trim()) {
                handleSendMessage(input.value);
                input.value = "";
              }
            }}
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
            </svg>
          </Button>
        </div>
      </div>
    </div>
  );
}
