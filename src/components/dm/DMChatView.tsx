import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Send, Smile } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useDMMessages, useSendDMMessage, DirectMessage, DMMessage } from "@/hooks/useDirectMessages";
import { useAuth } from "@/hooks/useAuth";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface DMChatViewProps {
  dm: DirectMessage;
  onBack: () => void;
}

const QUICK_EMOJIS = ["👍", "❤️", "😂", "🔥", "👀", "🎉", "💯", "✨"];

export function DMChatView({ dm, onBack }: DMChatViewProps) {
  const { user } = useAuth();
  const { data: messages = [], isLoading } = useDMMessages(dm.id);
  const sendMessage = useSendDMMessage();
  const [message, setMessage] = useState("");
  const [showEmojis, setShowEmojis] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const otherUser = dm.other_user;
  const displayName = otherUser?.display_name || "Usuário";

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [dm.id]);

  const handleSend = async () => {
    if (!message.trim()) return;

    await sendMessage.mutateAsync({
      dmId: dm.id,
      content: message.trim(),
    });

    setMessage("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const addEmoji = (emoji: string) => {
    setMessage((prev) => prev + emoji);
    setShowEmojis(false);
    inputRef.current?.focus();
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
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
      <div className="flex-1 overflow-y-auto py-4">
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
            {/* Conversation start */}
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

            {/* Messages */}
            {messages.map((msg) => (
              <DMMessageBubble key={msg.id} message={msg} isOwn={msg.user_id === user?.id} />
            ))}
          </>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-border bg-background">
        <AnimatePresence>
          {showEmojis && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="mb-2 flex gap-1 flex-wrap"
            >
              {QUICK_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => addEmoji(emoji)}
                  className="p-2 text-xl hover:bg-secondary rounded-lg transition-colors"
                >
                  {emoji}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-xl shrink-0"
            onClick={() => setShowEmojis(!showEmojis)}
          >
            <Smile className="h-5 w-5 text-muted-foreground" />
          </Button>

          <input
            ref={inputRef}
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Mensagem para ${displayName}`}
            className="flex-1 h-12 px-4 rounded-xl bg-secondary border-0 focus:outline-none focus:ring-2 focus:ring-primary/50"
          />

          <Button
            size="icon"
            className="h-12 w-12 rounded-xl gradient-primary text-white shrink-0"
            disabled={!message.trim() || sendMessage.isPending}
            onClick={handleSend}
          >
            {sendMessage.isPending ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="h-5 w-5 border-2 border-white border-t-transparent rounded-full"
              />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

function DMMessageBubble({ message, isOwn }: { message: DMMessage; isOwn: boolean }) {
  const displayName = message.profile?.display_name || "Usuário";
  const time = format(new Date(message.created_at), "HH:mm", { locale: ptBR });

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("flex gap-3 px-4 py-2", isOwn && "flex-row-reverse")}
    >
      <Avatar className="h-8 w-8 shrink-0">
        <AvatarImage src={message.profile?.avatar_url || undefined} />
        <AvatarFallback className="text-sm gradient-primary text-white">
          {displayName.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>

      <div className={cn("max-w-[75%]", isOwn && "flex flex-col items-end")}>
        <div className={cn("flex items-center gap-2 mb-1", isOwn && "flex-row-reverse")}>
          <span className="font-semibold text-sm">{displayName}</span>
          <span className="text-xs text-muted-foreground">{time}</span>
        </div>

        <div
          className={cn(
            "px-4 py-2 rounded-2xl inline-block",
            isOwn
              ? "bg-primary text-primary-foreground rounded-br-md"
              : "bg-secondary text-secondary-foreground rounded-bl-md"
          )}
        >
          <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
        </div>
      </div>
    </motion.div>
  );
}
