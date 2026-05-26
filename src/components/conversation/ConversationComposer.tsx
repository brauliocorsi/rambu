import { MessageInput } from "@/components/message/MessageInput";
import { DMMessageInput } from "@/components/dm/DMMessageInput";
import type { ConversationRef } from "@/types/conversation";

/**
 * Composer unificado de mensagens.
 * Recebe um ConversationRef e renderiza o input apropriado
 * (MessageInput / DMMessageInput) preservando 100% do visual e
 * das funcionalidades: textarea auto-ajustavel, markdown ("Aa"),
 * mentions, anexos com compressao, audio, reply preview,
 * agendamento, drag & drop, paste.
 */
interface ConversationComposerProps {
  conversation: ConversationRef;
  replyTo?: string;
  onCancelReply?: () => void;
  onTyping?: (displayName?: string) => void;
  onStopTyping?: () => void;
  groupFallback?: React.ReactNode;
}

export function ConversationComposer({
  conversation,
  replyTo,
  onCancelReply,
  onTyping,
  onStopTyping,
  groupFallback,
}: ConversationComposerProps) {
  if (conversation.type === "channel") {
    return (
      <MessageInput
        channelId={conversation.id}
        channelName={conversation.displayName ?? "canal"}
        replyTo={replyTo}
        onCancelReply={onCancelReply}
        onTyping={(name) => onTyping?.(name)}
        onStopTyping={onStopTyping}
      />
    );
  }

  if (conversation.type === "dm") {
    return (
      <DMMessageInput
        dmId={conversation.id}
        otherUserName={conversation.displayName ?? ""}
        replyTo={replyTo}
        onCancelReply={onCancelReply}
        onTyping={() => onTyping?.()}
        onStopTyping={onStopTyping}
      />
    );
  }

  return <>{groupFallback ?? null}</>;
}