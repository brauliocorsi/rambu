/**
 * Camada unificada de conversa (frontend-only).
 *
 * Permite que canais (`messages`), DMs (`dm_messages`) e grupos
 * (`dm_group_messages`) sejam consumidos por um único conjunto de
 * componentes e hooks. Nenhum componente que usa esses tipos pode
 * saber diretamente qual tabela está por trás — toda a lógica
 * específica vive nos hooks `useConversation*`.
 */

export type ConversationType = "channel" | "dm" | "group";

/**
 * Identifica uma conversa de forma agnóstica à tabela de origem.
 * - channel: `id` = channel_id, `workspaceId` recomendado
 * - dm:      `id` = dm_id, `otherUserId` opcional (display/typing)
 * - group:   `id` = group_id, `workspaceId` recomendado
 */
export interface ConversationRef {
  type: ConversationType;
  id: string;
  workspaceId?: string;
  otherUserId?: string;
  /** Nome amigável para exibir no header/composer (#canal, nome do contato, etc.) */
  displayName?: string;
}

export interface ConversationProfile {
  display_name: string | null;
  avatar_url: string | null;
}

export interface ConversationAttachment {
  url: string;
  name: string | null;
  type: string | null;
}

export interface ConversationReaction {
  id: string;
  user_id: string;
  emoji: string;
  created_at: string;
}

export interface ConversationReadReceipt {
  user_id: string;
  read_at: string;
}

/**
 * Formato normalizado de mensagem usado pela camada de conversa.
 * `_raw` preserva o payload original (Message / DMMessage / DMGroupMessage)
 * para que wrappers legados continuem funcionando sem perda de informação.
 */
export interface ConversationMessage {
  id: string;
  conversationRef: ConversationRef;
  authorId: string;
  authorProfile?: ConversationProfile;
  content: string;
  attachment?: ConversationAttachment;
  audioUrl?: string;
  replyToId?: string | null;
  mentions?: string[];
  isEdited?: boolean;
  editedAt?: string | null;
  reactions?: ConversationReaction[];
  readBy?: ConversationReadReceipt[];
  scheduledFor?: string | null;
  clientMsgId?: string | null;
  createdAt: string;
  updatedAt: string;
  /** Payload original — usado pelos wrappers que ainda dependem de Message/DMMessage. */
  _raw: any;
}

export interface SendConversationMessageInput {
  content: string;
  replyTo?: string;
  fileUrl?: string;
  fileType?: string;
  fileName?: string;
  /** Apenas channel suporta agendamento por hora. */
  scheduledFor?: Date | null;
  /** Mantido externamente para dedup determinístico com realtime. */
  clientMsgId?: string;
}

export interface EditConversationMessageInput {
  messageId: string;
  content: string;
}

/**
 * Helpers de tipo — facilitam guardas em consumidores.
 */
export const isChannelRef = (r: ConversationRef) => r.type === "channel";
export const isDmRef = (r: ConversationRef) => r.type === "dm";
export const isGroupRef = (r: ConversationRef) => r.type === "group";

/** Chave estável para memoização / React Query. */
export const conversationRefKey = (r: ConversationRef) => `${r.type}:${r.id}`;