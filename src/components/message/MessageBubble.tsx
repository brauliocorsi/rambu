import { useState, memo } from "react";
import { X, Check, CornerDownRight, MessageSquare } from "lucide-react";
import { ReadReceiptIndicator } from "./ReadReceiptIndicator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { Message, useToggleReaction, useMessageReactions, useEditMessage, useDeleteMessage, useMessageById } from "@/hooks/useMessages";
import { useRetryChannelMessage } from "@/hooks/useMessages";
import { MessageStatusIndicator, type MessageStatus } from "./MessageStatusIndicator";
import { useMarkChannelAsUnread } from "@/hooks/useMarkAsUnread";
import { formatMentionsForDisplay } from "@/hooks/useMentions";
import { MessageContent } from "./MessageContent";
import { FilePreview } from "./FilePreview";
import { MessageActionsMenu } from "./MessageActionsMenu";
import { LinkPreviewCard } from "./LinkPreviewCard";
import { useSwipeToReply } from "@/hooks/useSwipeToReply";
import { CornerUpLeft } from "lucide-react";
import { TaskCard } from "@/components/tasks/TaskCard";
import { PollCard } from "@/components/poll/PollCard";
import { Pin } from "lucide-react";
import { Timer } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useMessageEditHistory } from "@/hooks/useMessageEditHistory";
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

interface MessageBubbleProps {
  message: Message;
  channelId: string;
  onReply?: (messageId: string) => void;
  onOpenThread?: (message: Message) => void;
  slackMode?: boolean;
  density?: MessageDensity;
  viewData?: { count: number; viewers: { user_id: string; display_name: string | null; avatar_url: string | null }[] };
}

const densityStyles = {
  compact: { container: "py-0.5", avatar: "h-7 w-7", text: "text-sm" },
  normal: { container: "py-1.5", avatar: "h-9 w-9", text: "text-sm" },
  comfortable: { container: "py-3", avatar: "h-10 w-10", text: "text-base" },
};

function MessageBubbleInner({ message, channelId, onReply, onOpenThread, slackMode = false, density = "normal", viewData }: MessageBubbleProps) {
  const { user } = useAuth();
  const [showActions, setShowActions] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  
  const toggleReaction = useToggleReaction();
  const editMessage = useEditMessage();
  const deleteMessage = useDeleteMessage();
  const retrySend = useRetryChannelMessage();
  const markAsUnread = useMarkChannelAsUnread();
  const { data: reactions = [] } = useMessageReactions(message.id);
  const { data: originalMessage } = useMessageById(message.reply_to);

  const isOwn = user?.id === message.user_id;
  const displayName = message.profile?.display_name || "Usuário";
  const time = format(new Date(message.created_at), "HH:mm", { locale: ptBR });
  const hasFile = message.file_url && message.file_type && message.file_name;
  const threadCount = (message as any).thread_count || 0;
  const isTaskMessage = message.content.startsWith("📋 ");
  const isPollMessage = message.content.startsWith("📊 ");
  const isPinned = !!(message as any).pinned_at;
  const expiresAt = (message as any).expires_at as string | null | undefined;
  const expiresLabel = expiresAt ? formatRelativeExpiry(expiresAt) : null;

  const groupedReactions = reactions.reduce((acc, r) => {
    acc[r.emoji] = (acc[r.emoji] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const userReactions = reactions
    .filter((r) => r.user_id === user?.id)
    .map((r) => r.emoji);

  const handleReaction = (emoji: string) => {
    toggleReaction.mutate({ messageId: message.id, emoji, channelId });
  };

  const handleMarkAsUnread = () => {
    markAsUnread.mutate({ channelId, messageCreatedAt: message.created_at });
  };

  const handleEdit = async () => {
    if (!editContent.trim() || editContent === message.content) {
      setIsEditing(false);
      setEditContent(message.content);
      return;
    }
    await editMessage.mutateAsync({ messageId: message.id, content: editContent.trim(), channelId });
    setIsEditing(false);
  };

  const handleDelete = async () => {
    await deleteMessage.mutateAsync({ messageId: message.id, channelId });
    setShowDeleteDialog(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleEdit(); }
    else if (e.key === "Escape") { setIsEditing(false); setEditContent(message.content); }
  };

  const useSlackLayout = slackMode;
  const styles = densityStyles[density];

  const { offset, triggered, bind } = useSwipeToReply(
    onReply ? () => onReply(message.id) : undefined,
  );

  return (
    <>
      <div className="relative" {...bind}>
        {/* Reply hint while swiping */}
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
        style={offset ? { transform: `translateX(${offset}px)`, transition: offset === 0 ? "transform 200ms ease" : undefined } : { transition: "transform 200ms ease" }}
        className={cn(
          "group relative flex gap-3 px-4 hover:bg-muted/40 transition-colors duration-150",
          styles.container,
          !useSlackLayout && isOwn && "flex-row-reverse"
        )}
        onMouseEnter={() => setShowActions(true)}
        onMouseLeave={() => setShowActions(false)}
      >
        <Avatar className={cn(styles.avatar, "shrink-0 mt-0.5 ring-1 ring-border/60")}>
          <AvatarImage src={message.profile?.avatar_url || undefined} />
          <AvatarFallback className="text-sm gradient-primary text-primary-foreground font-medium">
            {displayName.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>

        <div className={cn("flex-1 min-w-0", !useSlackLayout && isOwn && "flex flex-col items-end")}>
          <div className={cn("flex items-baseline gap-2 mb-0.5", !useSlackLayout && isOwn && "flex-row-reverse")}>
            <span className="font-semibold text-sm tracking-tight">{displayName}</span>
            <span className="font-mono text-[11px] text-muted-foreground tabular-nums">{time}</span>
            {message.is_edited && (
              <EditedTooltip messageId={message.id} scope="channel" />
            )}
            {isPinned && (
              <span className="inline-flex items-center gap-0.5 text-xs text-primary" title="Mensagem fixada">
                <Pin className="h-3 w-3 fill-current" />
              </span>
            )}
            {expiresLabel && (
              <span className="inline-flex items-center gap-0.5 text-xs text-amber-500" title={`Expira ${expiresLabel}`}>
                <Timer className="h-3 w-3" />
                <span>{expiresLabel}</span>
              </span>
            )}
          </div>

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
                "flex items-start gap-2 mb-2 p-2 rounded-lg bg-muted/60 border-l-[3px] border-primary cursor-pointer hover:bg-muted transition-colors text-left",
                !useSlackLayout && isOwn && "border-r-[3px] border-l-0"
              )}
            >
              <CornerDownRight className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                <span className="text-xs font-medium text-primary">{originalMessage.profile?.display_name || "Usuário"}</span>
                <p className="text-xs text-muted-foreground truncate">{formatMentionsForDisplay(originalMessage.content)}</p>
              </div>
            </button>
          )}

          {hasFile && (
            <div className="mb-2">
              <FilePreview url={message.file_url!} name={message.file_name!} type={message.file_type!} />
            </div>
          )}

          {isEditing ? (
            <div className="w-full">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full px-3 py-2 rounded-xl bg-secondary border border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none text-sm"
                rows={2}
                autoFocus
              />
              <div className="flex items-center gap-2 mt-1.5">
                <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => { setIsEditing(false); setEditContent(message.content); }}>
                  <X className="h-3 w-3 mr-1" />Cancelar
                </Button>
                <Button size="sm" className="h-7 px-2 text-xs" onClick={handleEdit} disabled={editMessage.isPending}>
                  <Check className="h-3 w-3 mr-1" />Salvar
                </Button>
              </div>
            </div>
          ) : (
            message.content && !message.content.startsWith("📎 ") && (
                useSlackLayout ? (
                <>
                  <MessageContent content={message.content} className="text-sm" />
                  <LinkPreviewCard content={message.content} />
                </>
              ) : (
                <>
                  <div className={cn(
                    "px-3.5 py-2 rounded-bubble inline-block max-w-[85%] transition-shadow",
                    isOwn
                      ? "bg-primary text-primary-foreground rounded-br-md shadow-[0_2px_8px_-2px_hsl(var(--primary)/0.35)]"
                      : "bg-card text-card-foreground border border-border/60 rounded-bl-md shadow-xs-token"
                  )}>
                    <MessageContent content={message.content} className="text-sm" />
                  </div>
                  <LinkPreviewCard content={message.content} />
                </>
              )
            )
          )}

          {isTaskMessage && <TaskCard messageId={message.id} />}
          {isPollMessage && <PollCard messageId={message.id} />}

          {threadCount > 0 && !isEditing && (
            <button onClick={() => onOpenThread?.(message)} className="flex items-center gap-1 mt-1 text-xs text-primary hover:underline">
              <MessageSquare className="h-3 w-3" />
              <span>{threadCount} {threadCount === 1 ? "resposta" : "respostas"}</span>
            </button>
          )}

          {Object.keys(groupedReactions).length > 0 && !isEditing && (
            <div className={cn("flex flex-wrap gap-1 mt-1", !useSlackLayout && isOwn && "justify-end")}>
              {Object.entries(groupedReactions).map(([emoji, count]) => (
                <button
                  key={emoji}
                  onClick={() => handleReaction(emoji)}
                  className={cn(
                    "flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition-all duration-150 hover:scale-105 active:scale-95",
                    userReactions.includes(emoji)
                      ? "bg-primary/15 text-primary border-primary/30"
                      : "bg-muted/60 hover:bg-muted border-border/60 text-foreground"
                  )}
                >
                  <span>{emoji}</span><span className="font-mono tabular-nums">{count}</span>
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
              type="channel"
              viewerCount={viewData?.count || 0}
              viewers={viewData?.viewers || []}
              isPending={message.id.startsWith("temp-")}
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
              messageType="channel"
              contextId={channelId}
              senderName={displayName}
              isPinned={isPinned}
              onMarkAsUnread={handleMarkAsUnread}
              onReply={() => onReply?.(message.id)}
              onOpenThread={() => onOpenThread?.(message)}
              onEdit={() => { setIsEditing(true); setEditContent(message.content); }}
              onDelete={() => setShowDeleteDialog(true)}
              onAddReaction={handleReaction}
              showThread
              threadCount={threadCount}
            />
          </div>
        )}
        </div>
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deletar mensagem?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleteMessage.isPending ? "Deletando..." : "Deletar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export const MessageBubble = memo(MessageBubbleInner);

function formatRelativeExpiry(iso: string): string | null {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return null;
  const m = Math.round(ms / 60000);
  if (m < 60) return `em ${m}m`;
  const h = Math.round(m / 60);
  if (h < 24) return `em ${h}h`;
  const d = Math.round(h / 24);
  return `em ${d}d`;
}

function EditedTooltip({ messageId, scope }: { messageId: string; scope: "channel" | "dm" | "group" }) {
  const [open, setOpen] = useState(false);
  const { data: history } = useMessageEditHistory(messageId, scope, open);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
        >
          (editado)
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3 text-xs space-y-2">
        <div className="font-semibold">Histórico de edições</div>
        {!history || history.length === 0 ? (
          <div className="text-muted-foreground">Sem versões anteriores.</div>
        ) : (
          history.map((h) => (
            <div key={h.id} className="border-l-2 border-primary/40 pl-2">
              <div className="text-muted-foreground mb-0.5">
                {format(new Date(h.edited_at), "dd/MM HH:mm", { locale: ptBR })}
              </div>
              <div className="whitespace-pre-wrap break-words">{h.previous_content}</div>
            </div>
          ))
        )}
      </PopoverContent>
    </Popover>
  );
}
