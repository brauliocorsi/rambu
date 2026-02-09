import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Smile, Paperclip } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSendMessage } from "@/hooks/useMessages";

interface MessageInputProps {
  channelId: string;
  channelName: string;
  replyTo?: string;
  onCancelReply?: () => void;
}

const QUICK_EMOJIS = ["👍", "❤️", "😂", "🔥", "👀", "🎉", "💯", "✨"];

export function MessageInput({ channelId, channelName, replyTo, onCancelReply }: MessageInputProps) {
  const [message, setMessage] = useState("");
  const [showEmojis, setShowEmojis] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const sendMessage = useSendMessage();

  const handleSend = async () => {
    if (!message.trim()) return;

    await sendMessage.mutateAsync({
      channelId,
      content: message.trim(),
      replyTo,
    });

    setMessage("");
    onCancelReply?.();
    inputRef.current?.focus();
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

  useEffect(() => {
    inputRef.current?.focus();
  }, [channelId]);

  return (
    <div className="p-4 border-t border-border bg-background">
      {/* Quick Emoji Picker */}
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

        <div className="flex-1 relative">
          <input
            ref={inputRef}
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Mensagem em #${channelName}`}
            className="w-full h-12 px-4 rounded-xl bg-secondary border-0 focus:outline-none focus:ring-2 focus:ring-primary/50 placeholder:text-muted-foreground"
          />
        </div>

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
  );
}
