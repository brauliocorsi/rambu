import { useState } from "react";
import { motion } from "framer-motion";
import {
  MailQuestion,
  Clock,
  Copy,
  Forward,
  Reply,
  Smile,
  Pencil,
  Trash2,
  MessageCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { formatMentionsForDisplay } from "@/hooks/useMentions";
import { RemindMeDialog } from "./RemindMeDialog";
import { ForwardMessageDialog } from "./ForwardMessageDialog";

const REACTION_EMOJIS = ["👍", "❤️", "😂", "🔥", "👀", "🎉"];

interface MessageActionsMenuProps {
  messageId: string;
  messageContent: string;
  messageCreatedAt: string;
  isOwn: boolean;
  messageType: "channel" | "dm" | "group";
  contextId: string; // channelId, dmId, or groupId
  senderName?: string;
  onMarkAsUnread?: () => void;
  onReply?: () => void;
  onOpenThread?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onAddReaction?: (emoji: string) => void;
  showThread?: boolean;
  threadCount?: number;
}

export function MessageActionsMenu({
  messageId,
  messageContent,
  messageCreatedAt,
  isOwn,
  messageType,
  contextId,
  senderName,
  onMarkAsUnread,
  onReply,
  onOpenThread,
  onEdit,
  onDelete,
  onAddReaction,
  showThread = false,
  threadCount = 0,
}: MessageActionsMenuProps) {
  const [showReactions, setShowReactions] = useState(false);
  const [showRemindDialog, setShowRemindDialog] = useState(false);
  const [showForwardDialog, setShowForwardDialog] = useState(false);

  const handleCopy = async () => {
    try {
      const plainText = formatMentionsForDisplay(messageContent);
      await navigator.clipboard.writeText(plainText);
      toast.success("Mensagem copiada!");
    } catch {
      toast.error("Erro ao copiar mensagem");
    }
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.1 }}
        className="flex items-center gap-px self-start bg-card/90 backdrop-blur-sm rounded-lg border border-border/50 shadow-sm p-px"
      >
        {/* Reactions */}
        <div className="relative">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 rounded-md"
            onClick={() => setShowReactions(!showReactions)}
            title="Adicionar reação"
          >
            <Smile className="h-3.5 w-3.5" />
          </Button>

          {showReactions && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute bottom-full left-0 mb-1 flex gap-1 bg-card rounded-xl shadow-lg border border-border p-1 z-20"
            >
              {REACTION_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => {
                    onAddReaction?.(emoji);
                    setShowReactions(false);
                  }}
                  className="p-1.5 text-base hover:bg-secondary rounded-lg transition-colors"
                >
                  {emoji}
                </button>
              ))}
            </motion.div>
          )}
        </div>

        {/* Reply */}
        {onReply && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 rounded-md"
            onClick={onReply}
            title="Responder"
          >
            <Reply className="h-3.5 w-3.5" />
          </Button>
        )}

        {/* Thread */}
        {showThread && onOpenThread && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 rounded-md relative"
            onClick={onOpenThread}
            title="Abrir thread"
          >
            <MessageCircle className="h-3.5 w-3.5" />
            {threadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[9px] rounded-full h-3.5 min-w-3.5 flex items-center justify-center px-0.5">
                {threadCount}
              </span>
            )}
          </Button>
        )}

        {/* Mark as unread - only for other people's messages */}
        {!isOwn && onMarkAsUnread && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 rounded-md"
            onClick={onMarkAsUnread}
            title="Marcar como não lido"
          >
            <MailQuestion className="h-3.5 w-3.5" />
          </Button>
        )}

        {/* Remind me later */}
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 rounded-md"
          onClick={() => setShowRemindDialog(true)}
          title="Lembrar-me depois"
        >
          <Clock className="h-3.5 w-3.5" />
        </Button>

        {/* Copy */}
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 rounded-md"
          onClick={handleCopy}
          title="Copiar mensagem"
        >
          <Copy className="h-3.5 w-3.5" />
        </Button>

        {/* Forward */}
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 rounded-md"
          onClick={() => setShowForwardDialog(true)}
          title="Encaminhar"
        >
          <Forward className="h-3.5 w-3.5" />
        </Button>

        {/* Edit - only for own messages */}
        {isOwn && onEdit && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-lg"
            onClick={onEdit}
            title="Editar"
          >
            <Pencil className="h-4 w-4" />
          </Button>
        )}

        {/* Delete - only for own messages */}
        {isOwn && onDelete && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-lg text-destructive hover:text-destructive"
            onClick={onDelete}
            title="Deletar"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </motion.div>

      {/* Remind Me Dialog */}
      <RemindMeDialog
        open={showRemindDialog}
        onOpenChange={setShowRemindDialog}
        messageId={messageType === "channel" ? messageId : undefined}
        dmMessageId={messageType === "dm" ? messageId : undefined}
        groupMessageId={messageType === "group" ? messageId : undefined}
      />

      {/* Forward Dialog */}
      <ForwardMessageDialog
        open={showForwardDialog}
        onOpenChange={setShowForwardDialog}
        messageContent={messageContent}
        senderName={senderName}
      />
    </>
  );
}
