import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Paperclip, X, Clock, Smile, Mic, Image, Plus, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MentionInput } from "@/components/message/MentionInput";
import { FilePreview } from "@/components/message/FilePreview";
import { AudioRecordingIndicator } from "@/components/message/AudioRecordingIndicator";
import { useSendDMMessage, useDMMessageById } from "@/hooks/useDirectMessages";
import { useCreateScheduledMessage } from "@/hooks/useScheduledMessages";
import { useFileUpload, UploadedFile } from "@/hooks/useFileUpload";
import { useFilePasteDrop } from "@/hooks/useFilePasteDrop";
import { useQuickReplies } from "@/hooks/useQuickReplies";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { formatMentionsForDisplay } from "@/hooks/useMentions";
import { TaskPicker } from "@/components/tasks/TaskPicker";
import { TaskFormDialog } from "@/components/tasks/TaskFormDialog";
import { CreateTaskTemplateDialog } from "@/components/tasks/CreateTaskTemplateDialog";
import { useWorkspaceContext } from "@/contexts/WorkspaceContext";
import { type TaskTemplate } from "@/hooks/useTaskTemplates";
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
import { Progress } from "@/components/ui/progress";
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
  const [attachedFiles, setAttachedFiles] = useState<UploadedFile[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [time, setTime] = useState("09:00");
  const [showCalendar, setShowCalendar] = useState(false);
  const [showMobileActions, setShowMobileActions] = useState(false);
  const [selectedTaskTemplate, setSelectedTaskTemplate] = useState<TaskTemplate | null>(null);
  const [showCreateTemplate, setShowCreateTemplate] = useState(false);
  const { currentWorkspace } = useWorkspaceContext();
  const inputRef = useRef<{ focus: () => void }>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const sendMessage = useSendDMMessage();
  const scheduleMessage = useCreateScheduledMessage();
  const { uploadFiles } = useFileUpload();

  const handleFilesAdded = useCallback((files: UploadedFile[]) => {
    setAttachedFiles((prev) => [...prev, ...files]);
  }, []);

  const { handlePaste, handleDragOver, handleDrop, isUploading, progress, maxFiles } = useFilePasteDrop({
    attachedFiles,
    onFilesAdded: handleFilesAdded,
  });
  const { quickReplies } = useQuickReplies();
  const { data: replyMessage } = useDMMessageById(replyTo || null);
  const { 
    isRecording, 
    isPaused, 
    recordingTime, 
    startRecording, 
    stopRecording, 
    pauseRecording, 
    resumeRecording, 
    cancelRecording 
  } = useAudioRecorder();

  // Focus input when replying
  useEffect(() => {
    if (replyTo) {
      inputRef.current?.focus();
    }
  }, [replyTo]);

  const handleSend = async () => {
    if ((!message.trim() && attachedFiles.length === 0) || sendMessage.isPending) return;

    const firstFile = attachedFiles[0];
    const content = firstFile 
      ? message.trim() || `📎 ${firstFile.name}` 
      : message.trim();

    await sendMessage.mutateAsync({
      dmId,
      content,
      replyTo,
      fileUrl: firstFile?.url,
      fileType: firstFile?.type,
      fileName: firstFile?.name,
    });

    // Send additional files as separate messages
    for (let i = 1; i < attachedFiles.length; i++) {
      const file = attachedFiles[i];
      await sendMessage.mutateAsync({
        dmId,
        content: `📎 ${file.name}`,
        fileUrl: file.url,
        fileType: file.type,
        fileName: file.name,
      });
    }

    setMessage("");
    setAttachedFiles([]);
    onCancelReply?.();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const totalFiles = attachedFiles.length + files.length;
    if (totalFiles > maxFiles) {
      toast.error(`Máximo de ${maxFiles} arquivos por vez`);
      return;
    }

    const uploaded = await uploadFiles(files);
    if (uploaded.length > 0) {
      setAttachedFiles((prev) => [...prev, ...uploaded]);
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleRemoveFile = (index: number) => {
    setAttachedFiles((prev) => prev.filter((_, i) => i !== index));
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

  const handleStartRecording = async () => {
    try {
      await startRecording();
    } catch (error) {
      toast.error("Não foi possível acessar o microfone. Verifique as permissões.");
    }
  };

  const handleStopRecording = async () => {
    const audioBlob = await stopRecording();
    if (audioBlob) {
      const audioFile = new File([audioBlob], `audio-${Date.now()}.webm`, { 
        type: 'audio/webm' 
      });
      
      const uploaded = await uploadFiles([audioFile]);
      if (uploaded.length > 0) {
        await sendMessage.mutateAsync({
          dmId,
          content: "🎤 Mensagem de áudio",
          replyTo,
          fileUrl: uploaded[0].url,
          fileType: uploaded[0].type,
          fileName: uploaded[0].name,
        });
        onCancelReply?.();
      }
    }
  };

  return (
    <div
      className="px-2 py-2 md:px-4 md:py-3 border-t border-border bg-background"
      onPaste={handlePaste}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
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

      {/* Upload progress */}
      <AnimatePresence>
        {isUploading && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-3 bg-secondary/50 rounded-xl p-3"
          >
            <div className="flex items-center gap-2 text-sm text-foreground mb-2">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full"
              />
              <span className="font-medium">Enviando arquivo... {progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Files Preview */}
      <AnimatePresence>
        {attachedFiles.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="mb-3"
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-medium text-primary">
                ✓ {attachedFiles.length} arquivo{attachedFiles.length > 1 ? "s" : ""} anexado{attachedFiles.length > 1 ? "s" : ""}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {attachedFiles.map((file, index) => (
                <FilePreview
                  key={`${file.url}-${index}`}
                  url={file.url}
                  name={file.name}
                  type={file.type}
                  onRemove={() => handleRemoveFile(index)}
                  compact
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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

      {/* Audio Recording Indicator */}
      <AnimatePresence>
        {isRecording && (
          <AudioRecordingIndicator
            recordingTime={recordingTime}
            isPaused={isPaused}
            onStop={handleStopRecording}
            onPause={pauseRecording}
            onResume={resumeRecording}
            onCancel={cancelRecording}
            className="mb-3"
          />
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

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.pdf,.doc,.docx,.txt"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-xl"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            <Paperclip className="h-5 w-5 text-muted-foreground" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-xl"
            onClick={() => setShowSchedule(true)}
            title="Agendar mensagem"
          >
            <Clock className="h-5 w-5 text-muted-foreground" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-xl"
            onClick={handleStartRecording}
            disabled={isRecording || isUploading}
            title="Gravar áudio"
          >
            <Mic className="h-5 w-5 text-muted-foreground" />
          </Button>

          {currentWorkspace && (
            <TaskPicker
              workspaceId={currentWorkspace.id}
              onSelectTemplate={(template) => setSelectedTaskTemplate(template)}
              onCreateNew={() => setShowCreateTemplate(true)}
            />
          )}
        </div>

        {/* Mobile action button - dropdown */}
        <div className="relative flex md:hidden shrink-0">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.pdf,.doc,.docx,.txt"
            multiple
            onChange={handleFileSelect}
            className="hidden md:hidden"
          />
          <Button
            variant="ghost"
            size="icon"
            className="rounded-xl h-9 w-9"
            onClick={() => setShowMobileActions(!showMobileActions)}
          >
            <Plus className={`h-5 w-5 text-muted-foreground transition-transform ${showMobileActions ? "rotate-45" : ""}`} />
          </Button>

          <AnimatePresence>
            {showMobileActions && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 10 }}
                className="absolute bottom-full left-0 mb-2 flex flex-col gap-1 bg-popover border border-border rounded-xl shadow-lg p-1.5 z-50"
              >
                <button
                  onClick={() => { setShowEmojis(!showEmojis); setShowMobileActions(false); }}
                  className="flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg hover:bg-secondary transition-colors"
                >
                  <Smile className="h-4 w-4 text-muted-foreground" />
                  <span>Emoji</span>
                </button>
                <button
                  onClick={() => { fileInputRef.current?.click(); setShowMobileActions(false); }}
                  disabled={isUploading}
                  className="flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg hover:bg-secondary transition-colors disabled:opacity-50"
                >
                  <Paperclip className="h-4 w-4 text-muted-foreground" />
                  <span>Anexar arquivo</span>
                </button>
                <button
                  onClick={() => { setShowSchedule(true); setShowMobileActions(false); }}
                  className="flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg hover:bg-secondary transition-colors"
                >
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>Agendar</span>
                </button>
                <button
                  onClick={() => { handleStartRecording(); setShowMobileActions(false); }}
                  disabled={isRecording || isUploading}
                  className="flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg hover:bg-secondary transition-colors disabled:opacity-50"
                >
                  <Mic className="h-4 w-4 text-muted-foreground" />
                  <span>Gravar áudio</span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
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
          disabled={(!message.trim() && attachedFiles.length === 0) || sendMessage.isPending || isUploading}
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
      {/* Task Form and Create Template for DMs */}
      {currentWorkspace && (
        <>
          <TaskFormDialog
            open={!!selectedTaskTemplate}
            onClose={() => setSelectedTaskTemplate(null)}
            template={selectedTaskTemplate}
            dmId={dmId}
          />
          <CreateTaskTemplateDialog
            open={showCreateTemplate}
            onClose={() => setShowCreateTemplate(false)}
            workspaceId={currentWorkspace.id}
          />
        </>
      )}
    </div>
  );
}
