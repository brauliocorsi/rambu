/**
 * Façade unificada para envio / edição / remoção / reação de mensagens.
 * Delega para as mutations já existentes mantendo todo o comportamento
 * de optimistic update, dedup por client_msg_id e fila offline.
 */
import { useCallback } from "react";
import {
  useSendMessage,
  useEditMessage,
  useDeleteMessage,
  useToggleReaction,
} from "./useMessages";
import {
  useSendDMMessage,
  useEditDMMessage,
  useDeleteDMMessage,
} from "./useDirectMessages";
import { useSendGroupMessage } from "./useDMGroups";
import type {
  ConversationRef,
  EditConversationMessageInput,
  SendConversationMessageInput,
} from "@/types/conversation";

export function useSendConversationMessage(ref: ConversationRef | null) {
  const sendChannel = useSendMessage();
  const editChannel = useEditMessage();
  const deleteChannel = useDeleteMessage();
  const toggleChannelReaction = useToggleReaction();

  const sendDM = useSendDMMessage();
  const editDM = useEditDMMessage();
  const deleteDM = useDeleteDMMessage();

  const sendGroup = useSendGroupMessage();

  const send = useCallback(
    async (input: SendConversationMessageInput) => {
      if (!ref) throw new Error("ConversationRef required");
      const common = {
        content: input.content,
        replyTo: input.replyTo,
        fileUrl: input.fileUrl,
        fileType: input.fileType,
        fileName: input.fileName,
        clientMsgId: input.clientMsgId,
      };
      if (ref.type === "channel") {
        return sendChannel.mutateAsync({
          channelId: ref.id,
          expiresAt: input.scheduledFor ?? null,
          ...common,
        });
      }
      if (ref.type === "dm") {
        return sendDM.mutateAsync({ dmId: ref.id, ...common });
      }
      return sendGroup.mutateAsync({ groupId: ref.id, ...common });
    },
    [ref, sendChannel, sendDM, sendGroup],
  );

  const edit = useCallback(
    async ({ messageId, content }: EditConversationMessageInput) => {
      if (!ref) throw new Error("ConversationRef required");
      if (ref.type === "channel") {
        return editChannel.mutateAsync({ messageId, content, channelId: ref.id });
      }
      if (ref.type === "dm") {
        return editDM.mutateAsync({ messageId, content, dmId: ref.id });
      }
      // Groups: edição pelo MessageBubble do grupo ainda não existe na UI;
      // expomos um no-op resolvido para preservar a interface.
      return undefined;
    },
    [ref, editChannel, editDM],
  );

  const remove = useCallback(
    async (messageId: string) => {
      if (!ref) throw new Error("ConversationRef required");
      if (ref.type === "channel") {
        return deleteChannel.mutateAsync({ messageId, channelId: ref.id });
      }
      if (ref.type === "dm") {
        return deleteDM.mutateAsync({ messageId, dmId: ref.id });
      }
      return undefined;
    },
    [ref, deleteChannel, deleteDM],
  );

  const toggleReaction = useCallback(
    async (messageId: string, emoji: string) => {
      if (!ref) throw new Error("ConversationRef required");
      if (ref.type === "channel") {
        return toggleChannelReaction.mutateAsync({
          messageId,
          emoji,
          channelId: ref.id,
        });
      }
      // DMs / groups usam a mesma tabela message_reactions; reaproveitar
      // via canal de cache é responsabilidade do bubble específico.
      return undefined;
    },
    [ref, toggleChannelReaction],
  );

  const isSending =
    sendChannel.isPending || sendDM.isPending || sendGroup.isPending;

  return {
    send,
    edit,
    remove,
    toggleReaction,
    isSending,
  };
}