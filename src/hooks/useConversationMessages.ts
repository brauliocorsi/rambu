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
import { normalizeMessage } from "@/lib/conversation/normalizeMessage";
import type {
  ConversationMessage,
  ConversationRef,
} from "@/types/conversation";

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
    return rawMessages.map((m) => normalizeMessage(ref, m));
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