import { motion } from "framer-motion";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { FilePreview } from "@/components/message/FilePreview";
import {
  MessageStatusIndicator,
  type MessageStatus,
} from "@/components/message/MessageStatusIndicator";
import { formatMentionsForDisplay } from "@/hooks/useMentions";
import { useRetryGroupMessage } from "@/hooks/useDMGroups";
import type { DMGroupMessage } from "@/hooks/useDMGroups";
import type { MessageDensity } from "@/hooks/useLayoutPreferences";
import { cn } from "@/lib/utils";

// Mantém os mesmos estilos por densidade que estavam inline em GroupChatView.
const densityStyles = {
  compact: {
    container: "py-0.5",
    avatar: "h-7 w-7",
    standardAvatar: "h-6 w-6",
    spacing: "mb-1",
  },
  normal: {
    container: "py-1.5",
    avatar: "h-9 w-9",
    standardAvatar: "h-8 w-8",
    spacing: "mb-2",
  },
  comfortable: {
    container: "py-3",
    avatar: "h-10 w-10",
    standardAvatar: "h-10 w-10",
    spacing: "mb-3",
  },
} as const;

/**
 * Bubble dedicado a mensagens de grupo (`dm_group_messages`).
 *
 * Extraído do JSX inline original de `GroupChatView` sem alterações de
 * estilo, espaçamento ou comportamento. Suporta os dois modos visuais
 * (slackMode true/false) e usa `useRetryGroupMessage` (mutation real
 * de grupo) — nunca `useEditDMMessage`/`useDeleteDMMessage`.
 *
 * TODO(grupo): edit/delete/reactions/reply ainda não existem para
 * grupos. Quando os hooks `useEditGroupMessage` / `useDeleteGroupMessage`
 * forem criados, adicionar UI aqui (não em DMMessageBubble).
 */
export interface GroupMessageBubbleProps {
  message: DMGroupMessage;
  currentUserId?: string | null;
  slackMode?: boolean;
  density?: MessageDensity;
}

export function GroupMessageBubble({
  message: msg,
  currentUserId,
  slackMode = false,
  density = "normal",
}: GroupMessageBubbleProps) {
  const retryGroupSend = useRetryGroupMessage();
  const styles = densityStyles[density];
  const isOwn = msg.user_id === currentUserId;
  const displayName = msg.profile?.display_name || "Usuário";
  const time = format(new Date(msg.created_at), "HH:mm", { locale: ptBR });
  const status = (msg as any)._status as MessageStatus | undefined;
  const clientMsgId = (msg as any).client_msg_id as string | undefined;
  const onRetry =
    status === "failed" && clientMsgId
      ? () => retryGroupSend(clientMsgId)
      : undefined;

  if (slackMode) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          "flex gap-3 px-4 hover:bg-secondary/50 transition-colors",
          styles.container,
        )}
      >
        <Avatar className={cn(styles.avatar, "shrink-0 mt-0.5")}>
          <AvatarImage src={msg.profile?.avatar_url || undefined} />
          <AvatarFallback className="text-xs gradient-primary text-white">
            {displayName.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 mb-0.5">
            <span className="font-semibold text-sm">{displayName}</span>
            <span className="text-xs text-muted-foreground">{time}</span>
            {msg.is_edited && (
              <span className="text-xs text-muted-foreground">(editado)</span>
            )}
          </div>
          <p className="text-sm whitespace-pre-wrap break-words">
            {formatMentionsForDisplay(msg.content)}
          </p>
          {msg.file_url && msg.file_name && (
            <div className="mt-2">
              <FilePreview
                url={msg.file_url}
                name={msg.file_name}
                type={msg.file_type || ""}
              />
            </div>
          )}
          {isOwn && (
            <MessageStatusIndicator status={status} onRetry={onRetry} />
          )}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "flex px-4",
        styles.spacing,
        isOwn ? "justify-end" : "justify-start",
      )}
    >
      <div className={`flex gap-2 max-w-[85%] ${isOwn ? "flex-row-reverse" : ""}`}>
        {!isOwn && (
          <Avatar className={cn(styles.standardAvatar, "shrink-0")}>
            <AvatarImage src={msg.profile?.avatar_url || undefined} />
            <AvatarFallback className="text-xs gradient-primary text-white">
              {(msg.profile?.display_name || "U").charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        )}
        <div>
          {!isOwn && (
            <p className="text-xs text-muted-foreground mb-1 px-1">
              {msg.profile?.display_name || "Usuário"}
            </p>
          )}
          <div
            className={cn(
              "rounded-2xl px-4 py-2",
              isOwn
                ? "gradient-primary text-white rounded-br-md"
                : "bg-secondary rounded-bl-md",
            )}
          >
            <p className="text-sm whitespace-pre-wrap break-words">
              {formatMentionsForDisplay(msg.content)}
            </p>
            {msg.file_url && msg.file_name && (
              <div className="mt-2">
                <FilePreview
                  url={msg.file_url}
                  name={msg.file_name}
                  type={msg.file_type || ""}
                />
              </div>
            )}
          </div>
          <p
            className={`text-xs text-muted-foreground mt-1 ${isOwn ? "text-right" : ""} px-1`}
          >
            {time}
            {msg.is_edited && " (editado)"}
          </p>
          {isOwn && (
            <MessageStatusIndicator
              status={status}
              onRetry={onRetry}
              className="text-right px-1"
            />
          )}
        </div>
      </div>
    </motion.div>
  );
}