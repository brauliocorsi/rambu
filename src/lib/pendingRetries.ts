/**
 * In-memory store for failed message payloads so the user can retry them
 * for the duration of the current session. Survives query invalidations
 * but not page reloads (out of scope for Fase C).
 */

export type RetryKind = "channel" | "dm" | "group";

export interface RetryPayload {
  kind: RetryKind;
  conversationId: string;
  content: string;
  replyTo?: string | null;
  fileUrl?: string | null;
  fileType?: string | null;
  fileName?: string | null;
  expiresAt?: string | null;
}

const store = new Map<string, RetryPayload>();

export function saveRetry(clientMsgId: string, payload: RetryPayload): void {
  store.set(clientMsgId, payload);
}

export function getRetry(clientMsgId: string): RetryPayload | undefined {
  return store.get(clientMsgId);
}

export function clearRetry(clientMsgId: string): void {
  store.delete(clientMsgId);
}