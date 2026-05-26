/**
 * Normalizadores de mensagem para a Camada Unificada de Conversa.
 *
 * Convertem payloads brutos das três tabelas físicas
 * (`messages`, `dm_messages`, `dm_group_messages`) em
 * `ConversationMessage`. Mantêm `_raw` intacto para que wrappers
 * legados (MessageBubble, DMMessageBubble, etc.) continuem funcionando
 * sem perda de informação.
 *
 * Regras:
 * - Funções puras, sem fetch ou side effects.
 * - Aceitam o mesmo shape que vem do Supabase (snake_case).
 * - Campos ausentes viram `null`/`undefined`, nunca `throw`.
 * - O `conversationRef` é injetado pelo chamador para evitar
 *   acoplamento dos normalizadores ao contexto.
 */
import type {
  ConversationAttachment,
  ConversationMessage,
  ConversationProfile,
  ConversationRef,
} from "@/types/conversation";

function pickProfile(raw: any): ConversationProfile | undefined {
  const p = raw?.profile ?? raw?.profiles;
  if (!p) return undefined;
  return {
    display_name: p.display_name ?? null,
    avatar_url: p.avatar_url ?? null,
  };
}

function pickAttachment(raw: any): ConversationAttachment | undefined {
  if (!raw?.file_url) return undefined;
  return {
    url: raw.file_url,
    name: raw.file_name ?? null,
    type: raw.file_type ?? null,
  };
}

function baseNormalize(ref: ConversationRef, raw: any): ConversationMessage {
  return {
    id: raw.id,
    conversationRef: ref,
    authorId: raw.user_id,
    authorProfile: pickProfile(raw),
    content: raw.content ?? "",
    attachment: pickAttachment(raw),
    replyToId: raw.reply_to ?? null,
    isEdited: Boolean(raw.is_edited),
    editedAt: raw.edited_at ?? null,
    scheduledFor: raw.scheduled_for ?? null,
    clientMsgId: raw.client_msg_id ?? null,
    createdAt: raw.created_at,
    updatedAt: raw.updated_at ?? raw.created_at,
    _raw: raw,
  };
}

export function normalizeChannelMessage(
  ref: ConversationRef,
  raw: any,
): ConversationMessage {
  return baseNormalize(ref, raw);
}

export function normalizeDMMessage(
  ref: ConversationRef,
  raw: any,
): ConversationMessage {
  // DMs não suportam scheduled_for; mantemos null explícito.
  return { ...baseNormalize(ref, raw), scheduledFor: null };
}

export function normalizeGroupMessage(
  ref: ConversationRef,
  raw: any,
): ConversationMessage {
  // Grupos não suportam scheduled_for nem reply hoje.
  return {
    ...baseNormalize(ref, raw),
    scheduledFor: null,
    replyToId: raw.reply_to ?? null,
  };
}

/**
 * Dispatcher único — escolhe o normalizador correto pelo `ref.type`.
 */
export function normalizeMessage(
  ref: ConversationRef,
  raw: any,
): ConversationMessage {
  switch (ref.type) {
    case "channel":
      return normalizeChannelMessage(ref, raw);
    case "dm":
      return normalizeDMMessage(ref, raw);
    case "group":
      return normalizeGroupMessage(ref, raw);
  }
}