import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Paperclip, X, Clock, Smile } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MentionInput } from "@/components/message/MentionInput";
import { FilePreview } from "@/components/message/FilePreview";
import { useSendDMMessage, useDMMessageById } from "@/hooks/useDirectMessages";
import { useCreateScheduledMessage } from "@/hooks/useScheduledMessages";
import { useFileUpload, UploadedFile } from "@/hooks/useFileUpload";
import { useQuickReplies } from "@/hooks/useQuickReplies";
import { formatMentionsForDisplay } from "@/hooks/useMentions";
import { toast } from "sonner";
import { format, addHours, addDays, setHours, setMinutes } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar, Reply } from "lucide-react";
import { cn } from "@/lib/utils";

interface DMMessageInputProps {
  dmId: string;
  otherUserName: string;
  replyTo?: string;
  onCancelReply?: () => void;
  onTyping?: () => void;
  onStopTyping?: () => void;
}

const QUICK_EMOJIS = ["👍", "❤️", "😂", "🔥", "👀", "🎉", "💯", "✨"];

const QUICK_SCHEDULE_OPTIONS = [
  { label: "Em 1 hora", getValue: () => addHours(new Date(), 1) },
  { label: "Em 3 horas", getValue: () => addHours(new Date(), 3) },
  { label: "Amanhã às 9h", getValue: () => setMinutes(setHours(addDays(new Date(), 1), 9), 0) },
  { label: "Amanhã às 14h", getValue: () => setMinutes(setHours(addDays(new Date(), 1), 14), 0) },
];

export function DMMessageInput({ dmId, otherUserName, replyTo, onCancelReply, onTyping, onStopTyping }: DMMessageInputProps) {
  const [message, setMessage] = useState("");
  const [showEmojis, setShowEmojis] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [time, setTime] = useState("09:00");
  const [showCalendar, setShowCalendar] = useState(false);
  const inputRef = useRef<{ focus: () => void }>(null);
  
  const sendMessage = useSendDMMessage();
  const scheduleMessage = useCreateScheduledMessage();
  const { uploadFile, isUploading } = useFileUpload();
  const { quickReplies } = useQuickReplies();
  const { data: replyMessage } = useDMMessageById(replyTo || null);

  // Focus input when replying
  useEffect(() => {
    if (replyTo) {
      inputRef.current?.focus();
    }
  }, [replyTo]);

  const handleSend = async () => {
    if ((!message.trim() && !uploadedFile) || sendMessage.isPending) return;

    const content = uploadedFile 
      ? message.trim() || `📎 ${uploadedFile.name}` 
      : message.trim();

    await sendMessage.mutateAsync({
      dmId,
      content,
      replyTo,
      fileUrl: uploadedFile?.url,
      fileType: uploadedFile?.type,
      fileName: uploadedFile?.name,
    });

    setMessage("");
    setUploadedFile(null);
    onCancelReply?.();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Arquivo muito grande. Máximo 10MB.");
      return;
    }

    const result = await uploadFile(file);
    if (result) {
      setUploadedFile(result);
    }
  };

  const addEmoji = (emoji: string) => {
    setMessage((prev) => prev + emoji);
    setShowEmojis(false);
    inputRef.current?.focus();
  };

  // Handle quick replies and typing indicator
  const handleMessageChange = (value: string) => {
    // Notify typing
    if (value.trim() && onTyping) {
      onTyping();
    } else if (!value.trim() && onStopTyping) {
      onStopTyping();
    }
    
    // Check for quick reply shortcuts
    if (value.startsWith("/")) {
      const shortcut = value.slice(0).toLowerCase();
      const quickReply = quickReplies.find(
        (qr) => qr.shortcut.toLowerCase() === shortcut
      );
      if (quickReply) {
        setMessage(quickReply.content);
        return;
      }
    }
    setMessage(value);
  };

  const handleSchedule = async (date: Date) => {
    if (!message.trim()) {
      toast.error("Digite uma mensagem para agendar");
      return;
    }

    await scheduleMessage.mutateAsync({
      dmId,
      content: message.trim(),
      scheduledAt: date,
    });

    setMessage("");
    setShowSchedule(false);
    setSelectedDate(undefined);
  };

  const handleQuickSchedule = (getValue: () => Date) => {
    handleSchedule(getValue());
  };

  const handleCustomSchedule = () => {
    if (!selectedDate) return;
    
    const [hours, minutes] = time.split(":").map(Number);
    const scheduledDate = setMinutes(setHours(selectedDate, hours), minutes);
    
    if (scheduledDate <= new Date()) {
      toast.error("Selecione uma data futura");
      return;
    }
    
    handleSchedule(scheduledDate);
  };

  return (
    <div className="p-3 md:p-4 border-t border-border bg-background">
      {/* Reply Preview */}
      {replyMessage && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          className="flex items-center gap-2 px-4 py-2 bg-secondary/50 border-l-2 border-primary rounded-r-lg mb-2"
        >
          <Reply className="h-4 w-4 text-primary shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-primary font-medium">
              Respondendo a {replyMessage.profile?.display_name || "Usuário"}
            </p>
            <p className="text-sm text-muted-foreground truncate">
              {formatMentionsForDisplay(replyMessage.content)}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 rounded-lg shrink-0"
            onClick={onCancelReply}
          >
            <X className="h-3 w-3" />
          </Button>
        </motion.div>
      )}

      {/* File Preview */}
      {uploadedFile && (
        <div className="mb-3 relative inline-block">
          <FilePreview
            url={uploadedFile.url}
            name={uploadedFile.name}
            type={uploadedFile.type}
          />
          <Button
            size="icon"
            variant="destructive"
            className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
            onClick={() => setUploadedFile(null)}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}

      {/* Emoji picker */}
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

      {/* Input Area */}
      <div className="flex items-end gap-2">
        {/* Left actions */}
        <div className="hidden md:flex items-center gap-1 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-xl"
            onClick={() => setShowEmojis(!showEmojis)}
          >
            <Smile className="h-5 w-5 text-muted-foreground" />
          </Button>

          <label>
            <input
              type="file"
              className="hidden"
              onChange={handleFileSelect}
              disabled={isUploading}
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-xl"
              disabled={isUploading}
              asChild
            >
              <span>
                <Paperclip className="h-5 w-5 text-muted-foreground" />
              </span>
            </Button>
          </label>

          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-xl"
            onClick={() => setShowSchedule(true)}
            title="Agendar mensagem"
          >
            <Clock className="h-5 w-5 text-muted-foreground" />
          </Button>
        </div>

        {/* Mobile action - only file attachment */}
        <div className="flex md:hidden items-center shrink-0">
          <label>
            <input
              type="file"
              className="hidden"
              onChange={handleFileSelect}
              disabled={isUploading}
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-xl"
              disabled={isUploading}
              asChild
            >
              <span>
                <Paperclip className="h-5 w-5 text-muted-foreground" />
              </span>
            </Button>
          </label>
        </div>

        {/* Message Input */}
        <div className="flex-1 min-w-0">
          <MentionInput
            ref={inputRef}
            value={message}
            onChange={handleMessageChange}
            onKeyDown={handleKeyDown}
            placeholder={`Mensagem para ${otherUserName}`}
            className="w-full min-h-[44px] md:min-h-[48px] max-h-32 px-4 py-3 rounded-xl bg-secondary border-0 focus:outline-none focus:ring-2 focus:ring-primary/50 text-base resize-none"
          />
        </div>

        {/* Send Button */}
        <Button
          size="icon"
          className="h-11 w-11 md:h-12 md:w-12 rounded-xl gradient-primary text-white shrink-0"
          disabled={(!message.trim() && !uploadedFile) || sendMessage.isPending || isUploading}
          onClick={handleSend}
        >
          {sendMessage.isPending || isUploading ? (
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

      {/* Schedule Message Dialog */}
      <Dialog open={showSchedule} onOpenChange={setShowSchedule}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Agendar Mensagem
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {message && (
              <div className="p-3 bg-secondary/50 rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Mensagem:</p>
                <p className="text-sm line-clamp-2">{message}</p>
              </div>
            )}

            <div>
              <Label className="text-sm text-muted-foreground mb-2 block">
                Opções Rápidas
              </Label>
              <div className="grid grid-cols-2 gap-2">
                {QUICK_SCHEDULE_OPTIONS.map((option) => (
                  <Button
                    key={option.label}
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuickSchedule(option.getValue)}
                    className="justify-start"
                    disabled={!message.trim() || scheduleMessage.isPending}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  ou escolha data e hora
                </span>
              </div>
            </div>

            <div className="flex gap-2">
              <Popover open={showCalendar} onOpenChange={setShowCalendar}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "flex-1 justify-start text-left font-normal",
                      !selectedDate && "text-muted-foreground"
                    )}
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    {selectedDate
                      ? format(selectedDate, "dd/MM/yyyy", { locale: ptBR })
                      : "Selecionar data"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => {
                      setSelectedDate(date);
                      setShowCalendar(false);
                    }}
                    disabled={(date) => date < new Date()}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>

              <Input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-28"
              />
            </div>

            {selectedDate && (
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setSelectedDate(undefined)}>
                  Limpar
                </Button>
                <Button 
                  onClick={handleCustomSchedule} 
                  className="gradient-primary text-white"
                  disabled={!message.trim() || scheduleMessage.isPending}
                >
                  Agendar
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
