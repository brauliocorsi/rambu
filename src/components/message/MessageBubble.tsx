import { useState } from "react";
import { motion } from "framer-motion";
import { Reply, Smile, MessageSquare } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { Message, useToggleReaction, useMessageReactions } from "@/hooks/useMessages";
import { formatMentionsForDisplay } from "@/hooks/useMentions";
import { FilePreview } from "./FilePreview";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface MessageBubbleProps {
  message: Message;
  channelId: string;
  onReply?: (messageId: string) => void;
  onOpenThread?: (message: Message) => void;
}

const REACTION_EMOJIS = ["👍", "❤️", "😂", "🔥", "👀", "🎉"];

export function MessageBubble({ message, channelId, onReply, onOpenThread }: MessageBubbleProps) {
  const { user } = useAuth();
  const [showActions, setShowActions] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const toggleReaction = useToggleReaction();
  const { data: reactions = [] } = useMessageReactions(message.id);

  const isOwn = user?.id === message.user_id;
  const displayName = message.profile?.display_name || "Usuário";
  const time = format(new Date(message.created_at), "HH:mm", { locale: ptBR });
  const hasFile = message.file_url && message.file_type && message.file_name;
  const threadCount = (message as any).thread_count || 0;

  // Group reactions by emoji
  const groupedReactions = reactions.reduce((acc, r) => {
    acc[r.emoji] = (acc[r.emoji] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const userReactions = reactions
    .filter((r) => r.user_id === user?.id)
    .map((r) => r.emoji);

  const handleReaction = (emoji: string) => {
    toggleReaction.mutate({ messageId: message.id, emoji, channelId });
    setShowReactions(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("group flex gap-3 px-4 py-2 hover:bg-secondary/50 transition-colors", isOwn && "flex-row-reverse")}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => {
        setShowActions(false);
        setShowReactions(false);
      }}
    >
      {/* Avatar */}
      <Avatar className="h-9 w-9 shrink-0">
        <AvatarImage src={message.profile?.avatar_url || undefined} />
        <AvatarFallback className="text-sm gradient-primary text-white">
          {displayName.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>

      {/* Content */}
      <div className={cn("flex-1 max-w-[75%]", isOwn && "flex flex-col items-end")}>
        {/* Header */}
        <div className={cn("flex items-center gap-2 mb-1", isOwn && "flex-row-reverse")}>
          <span className="font-semibold text-sm">{displayName}</span>
          <span className="text-xs text-muted-foreground">{time}</span>
          {message.is_edited && (
            <span className="text-xs text-muted-foreground">(editado)</span>
          )}
        </div>

        {/* File attachment */}
        {hasFile && (
          <div className="mb-2">
            <FilePreview
              url={message.file_url!}
              name={message.file_name!}
              type={message.file_type!}
            />
          </div>
        )}

        {/* Message bubble - only show if there's actual text content beyond just the file indicator */}
        {message.content && !message.content.startsWith("📎 ") && (
          <div
            className={cn(
              "px-4 py-2 rounded-2xl inline-block",
              isOwn
                ? "bg-primary text-primary-foreground rounded-br-md"
                : "bg-secondary text-secondary-foreground rounded-bl-md"
            )}
          >
            <p className="text-sm whitespace-pre-wrap break-words">
              {formatMentionsForDisplay(message.content)}
            </p>
          </div>
        )}

        {/* Thread indicator */}
        {threadCount > 0 && (
          <button
            onClick={() => onOpenThread?.(message)}
            className="flex items-center gap-1 mt-1 text-xs text-primary hover:underline"
          >
            <MessageSquare className="h-3 w-3" />
            <span>{threadCount} {threadCount === 1 ? "resposta" : "respostas"}</span>
          </button>
        )}

        {/* Reactions */}
        {Object.keys(groupedReactions).length > 0 && (
          <div className={cn("flex flex-wrap gap-1 mt-1", isOwn && "justify-end")}>
            {Object.entries(groupedReactions).map(([emoji, count]) => (
              <button
                key={emoji}
                onClick={() => handleReaction(emoji)}
                className={cn(
                  "flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition-colors",
                  userReactions.includes(emoji)
                    ? "bg-primary/20 text-primary"
                    : "bg-secondary hover:bg-secondary/80"
                )}
              >
                <span>{emoji}</span>
                <span>{count}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      {showActions && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex items-center gap-1 self-start"
        >
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-lg"
              onClick={() => setShowReactions(!showReactions)}
            >
              <Smile className="h-4 w-4" />
            </Button>

            {showReactions && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute bottom-full left-0 mb-1 flex gap-1 bg-card rounded-xl shadow-lg border border-border p-1 z-10"
              >
                {REACTION_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => handleReaction(emoji)}
                    className="p-1.5 text-base hover:bg-secondary rounded-lg transition-colors"
                  >
                    {emoji}
                  </button>
                ))}
              </motion.div>
            )}
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-lg"
            onClick={() => onReply?.(message.id)}
            title="Responder"
          >
            <Reply className="h-4 w-4" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-lg"
            onClick={() => onOpenThread?.(message)}
            title="Abrir thread"
          >
            <MessageSquare className="h-4 w-4" />
          </Button>
        </motion.div>
      )}
    </motion.div>
  );
}
