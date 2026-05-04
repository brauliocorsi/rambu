import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Paperclip, Image, Clock, Mic, Plus, ClipboardList, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSendMessage, useMessageById } from "@/hooks/useMessages";
import { useFileUpload, UploadedFile } from "@/hooks/useFileUpload";
import { useFilePasteDrop } from "@/hooks/useFilePasteDrop";
import { useCreateScheduledMessage } from "@/hooks/useScheduledMessages";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { FilePreview } from "./FilePreview";
import { Progress } from "@/components/ui/progress";
import { useProfile } from "@/hooks/useProfile";
import { useQuickReplies } from "@/hooks/useQuickReplies";
import { EmojiPicker } from "./EmojiPicker";
import { ScheduleMessageDialog } from "./ScheduleMessageDialog";
import { MentionInput, MentionInputRef } from "./MentionInput";
import { ReplyPreview } from "./ReplyPreview";
import { AudioRecordingIndicator } from "./AudioRecordingIndicator";
import { TaskPicker } from "@/components/tasks/TaskPicker";
import { TaskFormDialog } from "@/components/tasks/TaskFormDialog";
import { CreateTaskTemplateDialog } from "@/components/tasks/CreateTaskTemplateDialog";
import { useWorkspaceContext } from "@/contexts/WorkspaceContext";
import { type TaskTemplate } from "@/hooks/useTaskTemplates";
import { CreatePollDialog } from "@/components/poll/CreatePollDialog";
import { MarkdownToolbar } from "./MarkdownToolbar";
import { MessageContent } from "./MessageContent";
import { toast } from "sonner";

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
  const [showMobileActions, setShowMobileActions] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<UploadedFile[]>([]);
  const inputRef = useRef<MentionInputRef>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const sendMessage = useSendMessage();
  const createScheduledMessage = useCreateScheduledMessage();
  const { currentWorkspace } = useWorkspaceContext();
  const [selectedTaskTemplate, setSelectedTaskTemplate] = useState<TaskTemplate | null>(null);
  const [showCreateTemplate, setShowCreateTemplate] = useState(false);
  const [showPollDialog, setShowPollDialog] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // Insert markdown formatting around selection or at cursor
  const handleInsertMarkdown = useCallback((prefix: string, suffix: string, placeholder?: string) => {
    // For links, just insert the placeholder
    if (!prefix && !suffix) {
      setMessage((prev) => prev + (placeholder || ""));
      inputRef.current?.focus();
      return;
    }
    const text = prefix + (placeholder || "") + suffix;
    setMessage((prev) => prev + text);
    inputRef.current?.focus();
  }, []);

  const handleFilesAdded = useCallback((files: UploadedFile[]) => {
    setAttachedFiles((prev) => [...prev, ...files]);
  }, []);

  const { handlePaste, handleDragOver, handleDrop, isUploading, progress, maxFiles, currentFileIndex, totalFiles, currentFileName } = useFilePasteDrop({
    attachedFiles,
    onFilesAdded: handleFilesAdded,
  });

  const { uploadFiles } = useFileUpload();
  const { data: profile } = useProfile();
  const { getSuggestions, findByShortcut } = useQuickReplies();
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
  
  const quickReplySuggestions = getSuggestions(message);

  const handleSend = async () => {
    if (!message.trim() && attachedFiles.length === 0) return;

    // Send message with first file, then additional files as separate messages
    const firstFile = attachedFiles[0];
    
    await sendMessage.mutateAsync({
      channelId,
      content: message.trim() || (firstFile ? `📎 ${firstFile.name}` : ""),
      replyTo,
      fileUrl: firstFile?.url,
      fileType: firstFile?.type,
      fileName: firstFile?.name,
    });

    // Send additional files as separate messages
    for (let i = 1; i < attachedFiles.length; i++) {
      const file = attachedFiles[i];
      await sendMessage.mutateAsync({
        channelId,
        content: `📎 ${file.name}`,
        fileUrl: file.url,
        fileType: file.type,
        fileName: file.name,
      });
    }

    setMessage("");
    setAttachedFiles([]);
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
    if (!message.trim() && attachedFiles.length === 0) return;

    const firstFile = attachedFiles[0];
    
    await createScheduledMessage.mutateAsync({
      channelId,
      content: message.trim() || (firstFile ? `📎 ${firstFile.name}` : ""),
      scheduledAt: scheduledDate,
      fileUrl: firstFile?.url,
      fileType: firstFile?.type,
      fileName: firstFile?.name,
    });

    setMessage("");
    setAttachedFiles([]);
    inputRef.current?.focus();
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const totalFiles = attachedFiles.length + files.length;
    if (totalFiles > maxFiles) {
      return; // Error is shown in uploadFiles
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

  useEffect(() => {
    inputRef.current?.focus();
  }, [channelId]);

  // Fetch message being replied to
  const { data: replyMessage } = useMessageById(replyTo || null);

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
      // Convert blob to file and upload
      const audioFile = new File([audioBlob], `audio-${Date.now()}.webm`, { 
        type: 'audio/webm' 
      });
      
      const uploaded = await uploadFiles([audioFile]);
      if (uploaded.length > 0) {
        await sendMessage.mutateAsync({
          channelId,
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
      ref={containerRef}
      className="sticky bottom-0 z-40 shrink-0 safe-bottom border-t border-border bg-background/95 px-2 py-2 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:px-4 md:py-3"
      onPaste={handlePaste}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Reply Preview */}
      <AnimatePresence>
        {replyTo && replyMessage && (
          <ReplyPreview
            message={replyMessage}
            onCancel={() => onCancelReply?.()}
          />
        )}
      </AnimatePresence>
      {/* Upload progress */}
      <AnimatePresence>
        {isUploading && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-3 bg-secondary/60 border border-border rounded-xl p-3"
          >
            <div className="flex items-center justify-between gap-2 text-sm mb-2">
              <div className="flex items-center gap-2 min-w-0">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full shrink-0"
                />
                <span className="font-medium shrink-0">Enviando</span>
                {totalFiles > 1 && (
                  <span className="text-xs text-muted-foreground shrink-0">
                    ({currentFileIndex}/{totalFiles})
                  </span>
                )}
                {currentFileName && (
                  <span className="text-xs text-muted-foreground truncate">— {currentFileName}</span>
                )}
              </div>
              <span className="text-xs font-semibold text-primary tabular-nums shrink-0">{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Attached files preview */}
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

      <div className="flex items-end gap-1.5 md:gap-2">
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt,.xls,.xlsx"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />

        {/* Action buttons - hidden on mobile, shown in a compact row */}
        <div className="hidden md:flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-lg shrink-0 h-9 w-9"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            title="Anexar arquivo"
          >
            <Paperclip className="h-4.5 w-4.5 text-muted-foreground" />
          </Button>

          <EmojiPicker onSelect={addEmoji} />

          {currentWorkspace && (
            <TaskPicker
              workspaceId={currentWorkspace.id}
              onSelectTemplate={setSelectedTaskTemplate}
              onCreateNew={() => setShowCreateTemplate(true)}
            />
          )}

          <Button
            variant="ghost"
            size="icon"
            className="rounded-lg shrink-0 h-9 w-9"
            onClick={() => setShowPollDialog(true)}
            title="Criar enquete"
          >
            <BarChart3 className="h-4.5 w-4.5 text-muted-foreground" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="rounded-lg shrink-0 h-9 w-9"
            onClick={() => setShowScheduleDialog(true)}
            disabled={!message.trim() && attachedFiles.length === 0}
            title="Agendar mensagem"
          >
            <Clock className="h-4.5 w-4.5 text-muted-foreground" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="rounded-lg shrink-0 h-9 w-9"
            onClick={handleStartRecording}
            disabled={isRecording || isUploading}
            title="Gravar áudio"
          >
            <Mic className="h-4.5 w-4.5 text-muted-foreground" />
          </Button>
        </div>

        {/* Mobile action button - dropdown */}
        <div className="flex md:hidden items-center gap-0.5 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-lg h-9 w-9"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            <Paperclip className="h-4.5 w-4.5 text-muted-foreground" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="rounded-lg h-9 w-9"
            onClick={handleStartRecording}
            disabled={isRecording || isUploading}
          >
            <Mic className="h-4.5 w-4.5 text-muted-foreground" />
          </Button>

          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              className="rounded-lg h-9 w-9"
              onClick={() => setShowMobileActions(!showMobileActions)}
            >
              <Plus className={`h-4.5 w-4.5 text-muted-foreground transition-transform duration-200 ${showMobileActions ? "rotate-45" : ""}`} />
            </Button>

            <AnimatePresence>
              {showMobileActions && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowMobileActions(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    transition={{ duration: 0.15 }}
                    className="absolute bottom-full right-0 mb-2 flex flex-col min-w-[160px] bg-popover border border-border rounded-xl shadow-xl p-1 z-50"
                  >
                    {currentWorkspace && (
                      <button
                        onClick={() => { setShowMobileActions(false); setShowCreateTemplate(true); }}
                        className="flex items-center gap-2.5 px-3 py-2 text-sm rounded-lg hover:bg-secondary/80 active:bg-secondary transition-colors"
                      >
                        <ClipboardList className="h-4 w-4 text-muted-foreground" />
                        <span>Tarefas</span>
                      </button>
                    )}
                    <button
                      onClick={() => { setShowPollDialog(true); setShowMobileActions(false); }}
                      className="flex items-center gap-2.5 px-3 py-2 text-sm rounded-lg hover:bg-secondary/80 active:bg-secondary transition-colors"
                    >
                      <BarChart3 className="h-4 w-4 text-muted-foreground" />
                      <span>Enquete</span>
                    </button>
                    <button
                      onClick={() => { setShowScheduleDialog(true); setShowMobileActions(false); }}
                      disabled={!message.trim() && attachedFiles.length === 0}
                      className="flex items-center gap-2.5 px-3 py-2 text-sm rounded-lg hover:bg-secondary/80 active:bg-secondary transition-colors disabled:opacity-50"
                    >
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>Agendar</span>
                    </button>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Input field with formatting toolbar */}
        <div className="flex-1 min-w-0 flex flex-col">
          {showPreview && message.trim() ? (
            <div className="min-h-[40px] md:min-h-[44px] max-h-28 overflow-y-auto px-3 py-2.5 rounded-xl bg-secondary/50 border border-dashed border-border text-sm">
              <MessageContent content={message} className="text-sm" />
            </div>
          ) : (
            <MentionInput
              ref={inputRef}
              value={message}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              onBlur={() => onStopTyping?.()}
              placeholder={`Mensagem em #${channelName}`}
              className="w-full min-h-[40px] md:min-h-[44px] max-h-28 px-3 py-2.5 rounded-xl bg-secondary border-0 focus:outline-none focus:ring-2 focus:ring-primary/50 placeholder:text-muted-foreground text-sm md:text-base resize-none"
            />
          )}
          {/* Formatting toolbar - below input, subtle */}
          <div className="hidden md:flex mt-0.5">
            <MarkdownToolbar
              onInsert={handleInsertMarkdown}
              showPreview={showPreview}
              onTogglePreview={() => setShowPreview(!showPreview)}
              hasContent={!!message.trim()}
            />
          </div>
        </div>

        <Button
          size="icon"
          className="h-10 w-10 md:h-11 md:w-11 rounded-xl gradient-primary text-white shrink-0 press-scale"
          disabled={(!message.trim() && attachedFiles.length === 0) || sendMessage.isPending || isUploading}
          onClick={handleSend}
        >
          {sendMessage.isPending ? (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="h-4.5 w-4.5 border-2 border-white border-t-transparent rounded-full"
            />
          ) : (
            <Send className="h-4.5 w-4.5" />
          )}
        </Button>
      </div>

      {/* Schedule Dialog */}
      <ScheduleMessageDialog
        open={showScheduleDialog}
        onOpenChange={setShowScheduleDialog}
        onSchedule={handleSchedule}
        messagePreview={message || attachedFiles.map(f => f.name).join(", ")}
      />

      {/* Poll Dialog */}
      <CreatePollDialog
        open={showPollDialog}
        onClose={() => setShowPollDialog(false)}
        channelId={channelId}
      />

      {/* Task Form Dialog */}
      <TaskFormDialog
        open={!!selectedTaskTemplate}
        onClose={() => setSelectedTaskTemplate(null)}
        template={selectedTaskTemplate}
        channelId={channelId}
      />

      {/* Create Template Dialog */}
      {currentWorkspace && (
        <CreateTaskTemplateDialog
          open={showCreateTemplate}
          onClose={() => setShowCreateTemplate(false)}
          workspaceId={currentWorkspace.id}
        />
      )}
    </div>
  );
}
