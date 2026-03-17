import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, MessageSquare } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Message } from "@/hooks/useMessages";
import { useThreadMessages, useSendThreadMessage, ThreadMessage } from "@/hooks/useThreadMessages";
import { useAuth } from "@/hooks/useAuth";
import { MentionInput, MentionInputRef } from "./MentionInput";
import { formatMentionsForDisplay } from "@/hooks/useMentions";
import { cn } from "@/lib/utils";

interface ThreadPanelProps {
  parentMessage: Message;
  onClose: () => void;
}

export function ThreadPanel({ parentMessage, onClose }: ThreadPanelProps) {
  const { user } = useAuth();
  const [replyContent, setReplyContent] = useState("");
  const { data: threadMessages = [], isLoading } = useThreadMessages(parentMessage.id);
  const sendThreadMessage = useSendThreadMessage();
  const inputRef = useRef<MentionInputRef>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const parentDisplayName = parentMessage.profile?.display_name || "Usuário";
  const parentTime = format(new Date(parentMessage.created_at), "HH:mm", { locale: ptBR });

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [threadMessages.length]);

  const handleSend = async () => {
    if (!replyContent.trim()) return;

    await sendThreadMessage.mutateAsync({
      parentMessageId: parentMessage.id,
      content: replyContent.trim(),
    });

    setReplyContent("");
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <motion.div
      initial={{ x: "100%", opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: "100%", opacity: 0 }}
      transition={{ type: "spring", damping: 25, stiffness: 200 }}
      className="w-80 lg:w-96 border-l border-border bg-card flex flex-col h-full"
    >
      {/* Header */}
      <div className="h-14 border-b border-border flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Thread</h3>
          <span className="text-sm text-muted-foreground">
            {threadMessages.length} {threadMessages.length === 1 ? "resposta" : "respostas"}
          </span>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} className="rounded-lg">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        {/* Parent Message */}
        <div className="p-4 border-b border-border bg-secondary/30">
          <div className="flex gap-3">
            <Avatar className="h-9 w-9 shrink-0">
              <AvatarImage src={parentMessage.profile?.avatar_url || undefined} />
              <AvatarFallback className="text-sm gradient-primary text-white">
                {parentDisplayName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-semibold text-sm">{parentDisplayName}</span>
                <span className="text-xs text-muted-foreground">{parentTime}</span>
              </div>
              <p className="text-sm whitespace-pre-wrap break-words">
                {formatMentionsForDisplay(parentMessage.content)}
              </p>
            </div>
          </div>
        </div>

        {/* Thread Messages */}
        <div className="py-2">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full"
              />
            </div>
          ) : threadMessages.length === 0 ? (
            <div className="text-center py-8 px-4 text-muted-foreground">
              <p className="text-sm">Nenhuma resposta ainda.</p>
              <p className="text-xs mt-1">Seja o primeiro a responder!</p>
            </div>
          ) : (
            threadMessages.map((message) => (
              <ThreadMessageItem
                key={message.id}
                message={message}
                isOwn={message.user_id === user?.id}
              />
            ))
          )}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      {/* Reply Input */}
      <div className="p-3 border-t border-border">
        <div className="flex gap-2">
          <MentionInput
            ref={inputRef}
            value={replyContent}
            onChange={setReplyContent}
            onKeyDown={handleKeyDown}
            placeholder="Responder na thread..."
            className="flex-1 h-10 px-3 rounded-xl bg-secondary border-0 focus:outline-none focus:ring-2 focus:ring-primary/50 placeholder:text-muted-foreground text-sm"
          />
          <Button
            size="icon"
            className="h-10 w-10 rounded-xl gradient-primary text-white shrink-0"
            disabled={!replyContent.trim() || sendThreadMessage.isPending}
            onClick={handleSend}
          >
            {sendThreadMessage.isPending ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="h-4 w-4 border-2 border-white border-t-transparent rounded-full"
              />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

function ThreadMessageItem({
  message,
  isOwn,
}: {
  message: ThreadMessage;
  isOwn: boolean;
}) {
  const displayName = message.profile?.display_name || "Usuário";
  const time = format(new Date(message.created_at), "HH:mm", { locale: ptBR });

  return (
    <div className={cn("group flex gap-3 px-4 py-2 hover:bg-secondary/50 transition-colors")}>
      <Avatar className="h-7 w-7 shrink-0">
        <AvatarImage src={message.profile?.avatar_url || undefined} />
        <AvatarFallback className="text-xs gradient-primary text-white">
          {displayName.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="font-semibold text-sm">{displayName}</span>
          <span className="text-xs text-muted-foreground">{time}</span>
          {message.is_edited && (
            <span className="text-xs text-muted-foreground">(editado)</span>
          )}
        </div>
        <p className="text-sm whitespace-pre-wrap break-words">
          {formatMentionsForDisplay(message.content)}
        </p>
      </div>
    </div>
  );
}
