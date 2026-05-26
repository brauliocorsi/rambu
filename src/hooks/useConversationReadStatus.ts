/**
 * Façade unificada de leitura/marcação.
 * - channel: usa channel_read_status (via useMarkChannelAsRead / Unread)
 * - dm:      usa dm_read_status (via useMarkDMAsRead / Unread)
 * - group:   ainda não tem tabela de read status no banco; expomos
 *            no-ops para preservar a API.
 */
import { useCallback } from "react";
import {
  useMarkChannelAsRead,
  useMarkDMAsRead,
} from "./useNotifications";
import {
  useMarkChannelAsUnread,
  useMarkDMAsUnread,
} from "./useMarkAsUnread";
import type { ConversationRef } from "@/types/conversation";

export function useConversationReadStatus(ref: ConversationRef | null) {
  const markChannelRead = useMarkChannelAsRead();
  const markChannelUnread = useMarkChannelAsUnread();
  const markDMRead = useMarkDMAsRead();
  const markDMUnread = useMarkDMAsUnread();

  const markAsRead = useCallback(() => {
    if (!ref) return;
    if (ref.type === "channel") return markChannelRead.mutate(ref.id);
    if (ref.type === "dm") return markDMRead.mutate(ref.id);
    // group: no-op
  }, [ref, markChannelRead, markDMRead]);

  const markAsUnread = useCallback(
    (messageId?: string) => {
      if (!ref) return;
      if (ref.type === "channel" && messageId) {
        return markChannelUnread.mutate({ channelId: ref.id, messageId });
      }
      if (ref.type === "dm" && messageId) {
        return markDMUnread.mutate({ dmId: ref.id, messageId });
      }
    },
    [ref, markChannelUnread, markDMUnread],
  );

  return {
    markAsRead,
    markAsUnread,
    isPending:
      markChannelRead.isPending ||
      markDMRead.isPending ||
      markChannelUnread.isPending ||
      markDMUnread.isPending,
  };
}