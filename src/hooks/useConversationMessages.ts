/**
 * Hook unificado de leitura de mensagens.
 *
 * Delega internamente para `useInfiniteMessages` (channel),
 * `useInfiniteDMMessages` (dm) ou `useDMGroupMessages` (group) e
 * normaliza o retorno para `ConversationMessage[]`. Realtime já é
 * gerido por esses hooks subjacentes, então `useConversationRealtime`
 * fica como façade opt-in.
 */
import { useMemo } from "react";
import { useInfiniteMessages } from "./useInfiniteMessages";
import { useInfiniteDMMessages } from "./useInfiniteDMMessages";
import { useDMGroupMessages } from "./useDMGroups";
import type {
  ConversationMessage,
  ConversationRef,
} from "@/types/conversation";

function normalize(ref: ConversationRef, raw: any): ConversationMessage {
  return {
    id: raw.id,
    conversationRef: ref,
    authorId: raw.user_id,
    authorProfile: raw.profile
      ? {
          display_name: raw.profile.display_name ?? null,
          avatar_url: raw.profile.avatar_url ?? null,
        }
      : undefined,
    content: raw.content ?? "",
    attachment: raw.file_url
      ? {
          url: raw.file_url,
          name: raw.file_name ?? null,
          type: raw.file_type ?? null,
        }
      : undefined,
    replyToId: raw.reply_to ?? null,
    isEdited: Boolean(raw.is_edited),
    editedAt: raw.edited_at ?? null,
    scheduledFor: raw.scheduled_for ?? raw.expires_at ?? null,
    clientMsgId: raw.client_msg_id ?? null,
    createdAt: raw.created_at,
    updatedAt: raw.updated_at ?? raw.created_at,
    _raw: raw,
  };
}

export interface UseConversationMessagesResult {
  messages: ConversationMessage[];
  rawMessages: any[];
  isLoading: boolean;
  isFetchingMore: boolean;
  hasMore: boolean;
  loadMore: () => void;
}

export function useConversationMessages(
  ref: ConversationRef | null,
): UseConversationMessagesResult {
  const channelId = ref?.type === "channel" ? ref.id : null;
  const dmId = ref?.type === "dm" ? ref.id : null;
  const groupId = ref?.type === "group" ? ref.id : null;

  const channel = useInfiniteMessages(channelId);
  const dm = useInfiniteDMMessages(dmId);
  const group = useDMGroupMessages(groupId);

  const active = ref?.type === "channel" ? channel : ref?.type === "dm" ? dm : group;

  const rawMessages: any[] = (active as any)?.messages ?? [];

  const messages = useMemo<ConversationMessage[]>(() => {
    if (!ref) return [];
    return rawMessages.map((m) => normalize(ref, m));
  }, [ref, rawMessages]);

  return {
    messages,
    rawMessages,
    isLoading: Boolean((active as any)?.isLoading),
    isFetchingMore: Boolean((active as any)?.isFetchingMore),
    hasMore: Boolean((active as any)?.hasMore),
    loadMore: (active as any)?.loadMore ?? (() => {}),
  };
}