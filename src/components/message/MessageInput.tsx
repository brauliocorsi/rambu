import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Paperclip, Image, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSendMessage } from "@/hooks/useMessages";
import { useFileUpload, UploadedFile } from "@/hooks/useFileUpload";
import { useCreateScheduledMessage } from "@/hooks/useScheduledMessages";
import { parseMentions } from "@/hooks/useMentions";
import { FilePreview } from "./FilePreview";
import { Progress } from "@/components/ui/progress";
import { useProfile } from "@/hooks/useProfile";
import { useQuickReplies } from "@/hooks/useQuickReplies";
import { EmojiPicker } from "./EmojiPicker";
import { ScheduleMessageDialog } from "./ScheduleMessageDialog";
import { ScheduledMessagesList } from "./ScheduledMessagesList";
import { MentionInput, MentionInputRef } from "./MentionInput";

interface MessageInputProps {
  channelId: string;
  channelName: string;
  replyTo?: string;
  onCancelReply?: () => void;
  onTyping?: (displayName: string) => void;
  onStopTyping?: () => void;
}

export function MessageInput({ 
  channelId, 
  channelName, 
  replyTo, 
  onCancelReply,
  onTyping,
  onStopTyping,
}: MessageInputProps) {
  const [message, setMessage] = useState("");
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [attachedFile, setAttachedFile] = useState<UploadedFile | null>(null);
  const inputRef = useRef<MentionInputRef>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sendMessage = useSendMessage();
  const createScheduledMessage = useCreateScheduledMessage();
  const { uploadFile, isUploading, progress } = useFileUpload();
  const { data: profile } = useProfile();
  const { getSuggestions, findByShortcut } = useQuickReplies();
  
  const quickReplySuggestions = getSuggestions(message);

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
      
      // Check if we should use a quick reply
      const quickReply = findByShortcut(message);
      if (quickReply) {
        setMessage(quickReply.content);
        return;
      }
      
      handleSend();
    }
    
    // Tab to select quick reply suggestion
    if (e.key === "Tab" && quickReplySuggestions.length > 0) {
      e.preventDefault();
      setMessage(quickReplySuggestions[0].content);
      setShowQuickReplies(false);
    }
    
    // Escape to close suggestions
    if (e.key === "Escape") {
      setShowQuickReplies(false);
    }
  };

  const addEmoji = (emoji: string) => {
    setMessage((prev) => prev + emoji);
    inputRef.current?.focus();
  };
  
  const handleInputChange = (value: string) => {
    setMessage(value);
    
    // Show quick replies if message starts with /
    setShowQuickReplies(value.startsWith('/') && value.length > 0);
    
    // Notify typing
    if (value.trim() && onTyping && profile?.display_name) {
      onTyping(profile.display_name);
    } else if (!value.trim() && onStopTyping) {
      onStopTyping();
    }
  };

  const handleSchedule = async (scheduledDate: Date) => {
    if (!message.trim() && !attachedFile) return;

    await createScheduledMessage.mutateAsync({
      channelId,
      content: message.trim() || (attachedFile ? `📎 ${attachedFile.name}` : ""),
      scheduledAt: scheduledDate,
      fileUrl: attachedFile?.url,
      fileType: attachedFile?.type,
      fileName: attachedFile?.name,
    });

    setMessage("");
    setAttachedFile(null);
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

      {/* Quick Replies Suggestions */}
      <AnimatePresence>
        {showQuickReplies && quickReplySuggestions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="mb-2 bg-popover border border-border rounded-lg shadow-lg p-1"
          >
            {quickReplySuggestions.map((qr) => (
              <button
                key={qr.id}
                onClick={() => {
                  setMessage(qr.content);
                  setShowQuickReplies(false);
                  inputRef.current?.focus();
                }}
                className="w-full text-left px-3 py-2 hover:bg-secondary rounded-md transition-colors"
              >
                <span className="font-mono text-xs text-primary mr-2">{qr.shortcut}</span>
                <span className="text-sm text-muted-foreground truncate">{qr.content}</span>
              </button>
            ))}
            <div className="px-3 py-1 text-xs text-muted-foreground border-t border-border mt-1 pt-1">
              Pressione Tab para usar • Esc para fechar
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quick Emoji Picker - legacy, replaced by EmojiPicker component */}

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

        <EmojiPicker onSelect={addEmoji} />

        <Button
          variant="ghost"
          size="icon"
          className="rounded-xl shrink-0"
          onClick={() => setShowScheduleDialog(true)}
          disabled={!message.trim() && !attachedFile}
          title="Agendar mensagem"
        >
          <Clock className="h-5 w-5 text-muted-foreground" />
        </Button>

        <ScheduledMessagesList />

        <MentionInput
          ref={inputRef}
          value={message}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onBlur={() => onStopTyping?.()}
          placeholder={`Mensagem em #${channelName}`}
          className="w-full h-12 px-4 rounded-xl bg-secondary border-0 focus:outline-none focus:ring-2 focus:ring-primary/50 placeholder:text-muted-foreground"
        />

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

      {/* Schedule Dialog */}
      <ScheduleMessageDialog
        open={showScheduleDialog}
        onOpenChange={setShowScheduleDialog}
        onSchedule={handleSchedule}
        messagePreview={message || attachedFile?.name}
      />
    </div>
  );
}
