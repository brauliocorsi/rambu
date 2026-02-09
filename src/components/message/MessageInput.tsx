import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Smile, Paperclip, X, Image } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSendMessage } from "@/hooks/useMessages";
import { useFileUpload, UploadedFile } from "@/hooks/useFileUpload";
import { FilePreview } from "./FilePreview";
import { Progress } from "@/components/ui/progress";

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
  const [attachedFile, setAttachedFile] = useState<UploadedFile | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sendMessage = useSendMessage();
  const { uploadFile, isUploading, progress } = useFileUpload();

  const handleSend = async () => {
    if (!message.trim() && !attachedFile) return;

    await sendMessage.mutateAsync({
      channelId,
      content: message.trim() || (attachedFile ? `📎 ${attachedFile.name}` : ""),
      replyTo,
      fileUrl: attachedFile?.url,
      fileType: attachedFile?.type,
      fileName: attachedFile?.name,
    });

    setMessage("");
    setAttachedFile(null);
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

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const uploaded = await uploadFile(file);
    if (uploaded) {
      setAttachedFile(uploaded);
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  useEffect(() => {
    inputRef.current?.focus();
  }, [channelId]);

  return (
    <div className="p-4 border-t border-border bg-background">
      {/* Upload progress */}
      <AnimatePresence>
        {isUploading && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-3"
          >
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Image className="h-4 w-4" />
              <span>Enviando arquivo...</span>
            </div>
            <Progress value={progress} className="h-1" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Attached file preview */}
      <AnimatePresence>
        {attachedFile && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="mb-3"
          >
            <FilePreview
              url={attachedFile.url}
              name={attachedFile.name}
              type={attachedFile.type}
              onRemove={() => setAttachedFile(null)}
              compact
            />
          </motion.div>
        )}
      </AnimatePresence>

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
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.pdf,.doc,.docx,.txt"
          onChange={handleFileSelect}
          className="hidden"
        />

        <Button
          variant="ghost"
          size="icon"
          className="rounded-xl shrink-0"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
        >
          <Paperclip className="h-5 w-5 text-muted-foreground" />
        </Button>

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
          disabled={(!message.trim() && !attachedFile) || sendMessage.isPending || isUploading}
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
