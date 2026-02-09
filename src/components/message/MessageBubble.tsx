import { useState } from "react";
import { motion } from "framer-motion";
import { Reply, Smile, MessageSquare, Pencil, Trash2, X, Check } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { Message, useToggleReaction, useMessageReactions, useEditMessage, useDeleteMessage } from "@/hooks/useMessages";
import { formatMentionsForDisplay } from "@/hooks/useMentions";
import { FilePreview } from "./FilePreview";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  
  const toggleReaction = useToggleReaction();
  const editMessage = useEditMessage();
  const deleteMessage = useDeleteMessage();
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

  const handleEdit = async () => {
    if (!editContent.trim() || editContent === message.content) {
      setIsEditing(false);
      setEditContent(message.content);
      return;
    }

    await editMessage.mutateAsync({
      messageId: message.id,
      content: editContent.trim(),
      channelId,
    });
    setIsEditing(false);
  };

  const handleDelete = async () => {
    await deleteMessage.mutateAsync({
      messageId: message.id,
      channelId,
    });
    setShowDeleteDialog(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleEdit();
    } else if (e.key === "Escape") {
      setIsEditing(false);
      setEditContent(message.content);
    }
  };

  return (
    <>
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

          {/* Message bubble - editing mode */}
          {isEditing ? (
            <div className="w-full">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full px-4 py-2 rounded-xl bg-secondary border border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none text-sm"
                rows={2}
                autoFocus
              />
              <div className="flex items-center gap-2 mt-2">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2"
                  onClick={() => {
                    setIsEditing(false);
                    setEditContent(message.content);
                  }}
                >
                  <X className="h-4 w-4 mr-1" />
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  className="h-7 px-2"
                  onClick={handleEdit}
                  disabled={editMessage.isPending}
                >
                  <Check className="h-4 w-4 mr-1" />
                  Salvar
                </Button>
              </div>
            </div>
          ) : (
            /* Message bubble - display mode */
            message.content && !message.content.startsWith("📎 ") && (
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
            )
          )}

          {/* Thread indicator */}
          {threadCount > 0 && !isEditing && (
            <button
              onClick={() => onOpenThread?.(message)}
              className="flex items-center gap-1 mt-1 text-xs text-primary hover:underline"
            >
              <MessageSquare className="h-3 w-3" />
              <span>{threadCount} {threadCount === 1 ? "resposta" : "respostas"}</span>
            </button>
          )}

          {/* Reactions */}
          {Object.keys(groupedReactions).length > 0 && !isEditing && (
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
        {showActions && !isEditing && (
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

            {/* Edit and Delete for own messages */}
            {isOwn && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded-lg"
                  onClick={() => {
                    setIsEditing(true);
                    setEditContent(message.content);
                  }}
                  title="Editar"
                >
                  <Pencil className="h-4 w-4" />
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded-lg text-destructive hover:text-destructive"
                  onClick={() => setShowDeleteDialog(true)}
                  title="Deletar"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </>
            )}
          </motion.div>
        )}
      </motion.div>

      {/* Delete confirmation dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deletar mensagem?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A mensagem será permanentemente removida.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMessage.isPending ? "Deletando..." : "Deletar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
