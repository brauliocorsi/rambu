import { useState, useRef } from "react";
import { X, Check, CornerDownRight } from "lucide-react";
import { ReadReceiptIndicator } from "@/components/message/ReadReceiptIndicator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { DMMessage, useEditDMMessage, useDeleteDMMessage, useDMMessageById } from "@/hooks/useDirectMessages";
import { useRetryDMMessage } from "@/hooks/useDirectMessages";
import { MessageStatusIndicator, type MessageStatus } from "@/components/message/MessageStatusIndicator";
import { useMarkDMAsUnread } from "@/hooks/useMarkAsUnread";
import { formatMentionsForDisplay } from "@/hooks/useMentions";
import { MessageContent } from "@/components/message/MessageContent";
import { FilePreview } from "@/components/message/FilePreview";
import { MessageActionsMenu } from "@/components/message/MessageActionsMenu";
import { LinkPreviewCard } from "@/components/message/LinkPreviewCard";
import { EmojiPicker } from "@/components/message/EmojiPicker";
import { useDMMessageReactions, useToggleDMReaction } from "@/hooks/useDMReactions";
import { useSwipeToReply } from "@/hooks/useSwipeToReply";
import { CornerUpLeft } from "lucide-react";
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

import type { MessageDensity } from "@/hooks/useLayoutPreferences";

// Density-based styles
const densityStyles = {
  compact: {
    container: "py-0.5",
    avatar: "h-7 w-7",
  },
  normal: {
    container: "py-1.5",
    avatar: "h-9 w-9",
  },
  comfortable: {
    container: "py-3",
    avatar: "h-10 w-10",
  },
};

interface DMMessageBubbleProps {
  message: DMMessage;
  dmId: string;
  onReply?: (messageId: string) => void;
  slackMode?: boolean;
  density?: MessageDensity;
  viewData?: { count: number; viewers: { user_id: string; display_name: string | null; avatar_url: string | null }[] };
}

export function DMMessageBubble({ message, dmId, onReply, slackMode = false, density = "normal", viewData }: DMMessageBubbleProps) {
  const { user } = useAuth();
  const [showActions, setShowActions] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const editMessage = useEditDMMessage();
  const deleteMessage = useDeleteDMMessage();
  const retrySend = useRetryDMMessage();
  const markAsUnread = useMarkDMAsUnread();
  const toggleDMReaction = useToggleDMReaction();
  const { data: reactions = [] } = useDMMessageReactions(message.id);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const lastTapRef = useRef<number>(0);

  const groupedReactions = reactions.reduce((acc, r) => {
    acc[r.emoji] = (acc[r.emoji] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const userReactions = reactions.filter((r) => r.user_id === user?.id).map((r) => r.emoji);

  const handleReaction = (emoji: string) => {
    toggleDMReaction.mutate({ messageId: message.id, emoji, dmId });
  };
  const openEmojiPicker = () => {
    if (isEditing) return;
    setEmojiPickerOpen(true);
  };
  const handleQuickTap = () => {
    const now = Date.now();
    if (now - lastTapRef.current < 350) {
      lastTapRef.current = 0;
      openEmojiPicker();
    } else {
      lastTapRef.current = now;
    }
  };
  
  // Fetch the original message if this is a reply
  const { data: originalMessage } = useDMMessageById(message.reply_to);

  const isOwn = user?.id === message.user_id;
  const displayName = message.profile?.display_name || "Usuário";
  const time = format(new Date(message.created_at), "HH:mm", { locale: ptBR });
  const hasFile = message.file_url && message.file_type && message.file_name;

  const handleEdit = async () => {
    if (!editContent.trim() || editContent === message.content) {
      setIsEditing(false);
      setEditContent(message.content);
      return;
    }

    await editMessage.mutateAsync({
      messageId: message.id,
      content: editContent.trim(),
      dmId,
    });
    setIsEditing(false);
  };

  const handleDelete = async () => {
    await deleteMessage.mutateAsync({
      messageId: message.id,
      dmId,
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

  const handleMarkAsUnread = () => {
    markAsUnread.mutate({ dmId, messageCreatedAt: message.created_at });
  };

  // In Slack mode, all messages are left-aligned
  const useSlackLayout = slackMode;
  const styles = densityStyles[density];
  const { offset, triggered, bind } = useSwipeToReply(
    onReply ? () => onReply(message.id) : undefined,
  );

  return (
    <>
      <div className="relative" {...bind}>
        {offset > 8 && (
          <div
            className={cn(
              "pointer-events-none absolute inset-y-0 left-2 flex items-center transition-opacity",
              triggered ? "text-primary" : "text-muted-foreground",
            )}
            style={{ opacity: Math.min(1, offset / 70) }}
          >
            <CornerUpLeft className="h-5 w-5" />
          </div>
        )}
        <div
        data-message-id={message.id}
        style={{ transform: offset ? `translateX(${offset}px)` : undefined, transition: "transform 200ms ease" }}
        className={cn(
          "group relative flex gap-3 px-4 hover:bg-secondary/50 transition-colors",
          styles.container,
          !useSlackLayout && isOwn && "flex-row-reverse"
        )}
        onMouseEnter={() => setShowActions(true)}
        onMouseLeave={() => setShowActions(false)}
        onDoubleClick={openEmojiPicker}
        onClick={handleQuickTap}
        title="Toque duas vezes para reagir"
      >
        <EmojiPicker
          open={emojiPickerOpen}
          onOpenChange={setEmojiPickerOpen}
          onSelect={(emoji) => handleReaction(emoji)}
          trigger={<span className="absolute left-1/2 top-1/2 h-0 w-0" aria-hidden />}
        />
        {/* Avatar */}
        <Avatar className={cn(styles.avatar, "shrink-0 mt-0.5")}>
          <AvatarImage src={message.profile?.avatar_url || undefined} />
          <AvatarFallback className="text-sm gradient-primary text-white">
            {displayName.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>

        {/* Content */}
        <div className={cn("flex-1 min-w-0", !useSlackLayout && isOwn && "flex flex-col items-end")}>
          {/* Header */}
          <div className={cn("flex items-baseline gap-2 mb-0.5", !useSlackLayout && isOwn && "flex-row-reverse")}>
            <span className="font-semibold text-sm">{displayName}</span>
            <span className="text-xs text-muted-foreground">{time}</span>
            {message.is_edited && (
              <span className="text-xs text-muted-foreground">(editado)</span>
            )}
          </div>

          {/* Reply indicator - show original message */}
          {originalMessage && (
            <button
              onClick={() => {
                const el = document.querySelector(`[data-message-id="${message.reply_to}"]`);
                if (el) {
                  el.scrollIntoView({ behavior: "smooth", block: "center" });
                  el.classList.add("bg-primary/10");
                  setTimeout(() => el.classList.remove("bg-primary/10"), 2000);
                }
              }}
              className={cn(
                "flex items-start gap-2 mb-2 p-2 rounded-lg bg-secondary/50 border-l-2 border-primary/50 cursor-pointer hover:bg-secondary/80 transition-colors text-left",
                !useSlackLayout && isOwn && "border-r-2 border-l-0"
              )}
            >
              <CornerDownRight className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                <span className="text-xs font-medium text-primary">
                  {originalMessage.profile?.display_name || "Usuário"}
                </span>
                <p className="text-xs text-muted-foreground truncate">
                  {formatMentionsForDisplay(originalMessage.content)}
                </p>
              </div>
            </button>
          )}

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
              useSlackLayout ? (
                <>
                  <MessageContent content={message.content} className="text-sm" />
                  <LinkPreviewCard content={message.content} />
                </>
              ) : (
                <>
                  <div
                    className={cn(
                      "px-4 py-2 rounded-2xl inline-block max-w-[85%]",
                      isOwn
                        ? "bg-primary text-primary-foreground rounded-br-md"
                        : "bg-secondary text-secondary-foreground rounded-bl-md"
                    )}
                  >
                    <MessageContent content={message.content} className="text-sm" />
                  </div>
                  <LinkPreviewCard content={message.content} />
                </>
              )
            )
          )}

          {/* Reactions */}
          {Object.keys(groupedReactions).length > 0 && !isEditing && (
            <div className={cn("flex flex-wrap gap-1 mt-1", !useSlackLayout && isOwn && "justify-end")}>
              {Object.entries(groupedReactions).map(([emoji, count]) => (
                <button
                  key={emoji}
                  onClick={() => handleReaction(emoji)}
                  className={cn(
                    "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs border transition-all duration-150 active:scale-95",
                    userReactions.includes(emoji)
                      ? "bg-primary/15 text-primary border-primary/40"
                      : "bg-card hover:bg-muted border-border/70 text-foreground",
                  )}
                >
                  <span>{emoji}</span>
                  <span className="font-mono tabular-nums">{count}</span>
                </button>
              ))}
            </div>
          )}

          {/* Read receipt */}
          {isOwn && !isEditing && (
            <>
            <MessageStatusIndicator
              status={(message as any)._status as MessageStatus | undefined}
              onRetry={
                (message as any)._status === "failed" && message.client_msg_id
                  ? () => retrySend(message.client_msg_id as string)
                  : undefined
              }
              className={!useSlackLayout && isOwn ? "text-right" : ""}
            />
            <ReadReceiptIndicator
              messageId={message.id}
              isOwn={isOwn}
              type="dm"
              viewerCount={viewData?.count || 0}
              viewers={viewData?.viewers || []}
              className={!useSlackLayout && isOwn ? "justify-end" : ""}
            />
            </>
          )}
        </div>

        {/* Actions - positioned absolutely to avoid squeezing content */}
        {showActions && !isEditing && (
          <div className="absolute top-0 right-4 z-10 -translate-y-1/2">
            <MessageActionsMenu
              messageId={message.id}
              messageContent={message.content}
              messageCreatedAt={message.created_at}
              isOwn={isOwn}
              messageType="dm"
              contextId={dmId}
              senderName={displayName}
              onMarkAsUnread={handleMarkAsUnread}
              onReply={() => onReply?.(message.id)}
              onEdit={() => {
                setIsEditing(true);
                setEditContent(message.content);
              }}
              onDelete={() => setShowDeleteDialog(true)}
              onAddReaction={handleReaction}
            />
          </div>
        )}
        </div>
      </div>

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
