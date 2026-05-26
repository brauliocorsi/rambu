/**
 * Cache keys reutilizáveis para a Camada Unificada de Conversa.
 *
 * IMPORTANTE: as keys aqui são exatamente as mesmas usadas pelos
 * hooks legados (`useInfiniteMessages`, `useInfiniteDMMessages`,
 * `useDMGroupMessages`, `useUnreadChannelCounts`, etc.). Reusar as
 * mesmas keys garante que invalidations feitas via a façade afetem
 * o cache populado pelos hooks antigos — sem duplicar queries.
 *
 * Nunca altere o formato sem checar os call sites correspondentes:
 *   - src/hooks/useInfiniteMessages.tsx           ["messages-infinite", channelId]
 *   - src/hooks/useInfiniteDMMessages.tsx         ["dm-messages-infinite", dmId]
 *   - src/hooks/useDMGroups.tsx                   ["dm-group-messages", groupId]
 *   - src/hooks/useNotifications.tsx              ["unread-channel-counts", ws] / ["unread-dm-counts", ws]
 *   - src/hooks/useUnreadFeed.tsx                 ["unread-feed", user, ws]
 */
import type { ConversationRef } from "@/types/conversation";

export const conversationKeys = {
  // Listas de mensagens (mesmas keys dos hooks legados).
  channelMessages: (channelId: string) =>
    ["messages-infinite", channelId] as const,
  dmMessages: (dmId: string) => ["dm-messages-infinite", dmId] as const,
  groupMessages: (groupId: string) => ["dm-group-messages", groupId] as const,

  /** Dispatcher pela `ref` — útil em invalidações genéricas. */
  messages: (ref: ConversationRef) => {
    switch (ref.type) {
      case "channel":
        return conversationKeys.channelMessages(ref.id);
      case "dm":
        return conversationKeys.dmMessages(ref.id);
      case "group":
        return conversationKeys.groupMessages(ref.id);
    }
  },

  // Contadores de não-lidas (parciais — `setQueriesData({ queryKey })`
  // acerta todas as variantes com workspaceId/userId).
  unreadChannelCounts: () => ["unread-channel-counts"] as const,
  unreadDMCounts: () => ["unread-dm-counts"] as const,
  unreadFeed: () => ["unread-feed"] as const,

  // Recibos de leitura.
  channelViews: (messageId: string) => ["message-views", messageId] as const,
  dmViews: (dmMessageId: string) => ["dm-message-views", dmMessageId] as const,
};

export type ConversationKey = ReturnType<
  (typeof conversationKeys)[keyof typeof conversationKeys]
>;