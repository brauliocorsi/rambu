import { useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Hash } from "lucide-react";
import { Message } from "@/hooks/useMessages";
import { MessageBubble } from "./MessageBubble";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

interface MessageListProps {
  messages: Message[];
  channelId: string;
  channelName: string;
  isLoading: boolean;
  onReply?: (messageId: string) => void;
  onOpenThread?: (message: Message) => void;
}

export function MessageList({ messages, channelId, channelName, isLoading, onReply, onOpenThread }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
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
    <div className="flex-1 overflow-y-auto py-4">
      {/* Channel start message */}
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

      {/* Messages */}
      {messages.map((message) => (
        <MessageBubble
          key={message.id}
          message={message}
          channelId={channelId}
          onReply={onReply}
          onOpenThread={onOpenThread}
        />
      ))}

      <div ref={bottomRef} />
    </div>
  );
}
