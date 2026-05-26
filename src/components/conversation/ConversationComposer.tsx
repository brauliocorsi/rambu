import { MessageInput } from "@/components/message/MessageInput";
import { DMMessageInput } from "@/components/dm/DMMessageInput";
import { Button } from "@/components/ui/button";
import { useSendGroupMessage } from "@/hooks/useDMGroups";
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

  if (conversation.type === "group") {
    return (
      <GroupInlineComposer
        groupId={conversation.id}
        displayName={conversation.displayName ?? "grupo"}
        onTyping={onTyping}
        onStopTyping={onStopTyping}
      />
    );
  }

  return <>{groupFallback ?? null}</>;
}

/**
 * Composer inline para grupos — mantém 100% do visual/comportamento
 * que existia inline em GroupChatView (texto + botão enviar).
 * Anexos, áudio e reply ficam fora deste passo (não eram suportados).
 */
function GroupInlineComposer({
  groupId,
  displayName,
  onTyping,
  onStopTyping,
}: {
  groupId: string;
  displayName: string;
  onTyping?: (displayName?: string) => void;
  onStopTyping?: () => void;
}) {
  const sendMessage = useSendGroupMessage();

  const submit = async (input: HTMLInputElement) => {
    const value = input.value.trim();
    if (!value) return;
    input.value = "";
    onStopTyping?.();
    await sendMessage.mutateAsync({ groupId, content: value });
  };

  return (
    <div className="sticky bottom-0 z-40 shrink-0 safe-bottom border-t border-border bg-background/95 p-3 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:p-4">
      <div className="flex items-center gap-2">
        <input
          type="text"
          placeholder={`Mensagem para ${displayName}`}
          className="flex-1 min-h-[44px] px-4 py-3 rounded-xl bg-secondary border-0 focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit(e.currentTarget);
            }
          }}
          onChange={(e) => {
            if (e.target.value.trim()) {
              onTyping?.();
            } else {
              onStopTyping?.();
            }
          }}
          onBlur={onStopTyping}
        />
        <Button
          size="icon"
          className="h-10 w-10 md:h-12 md:w-12 rounded-xl gradient-primary text-white shrink-0"
          onClick={(e) => {
            const input = (e.currentTarget.previousSibling as HTMLInputElement);
            submit(input);
          }}
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
          </svg>
        </Button>
      </div>
    </div>
  );
}