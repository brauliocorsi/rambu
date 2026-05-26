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

/**
 * Returns true when the attachment URL (if any) can be safely re-sent.
 * Blob URLs, object URLs, and data URIs are session-bound and will be
 * invalid for the recipient — caller should ask the user to reattach.
 */
export function isAttachmentReusable(payload: RetryPayload | undefined): boolean {
  if (!payload) return false;
  const url = payload.fileUrl;
  if (!url) return true; // text-only is always reusable
  const lower = url.toLowerCase();
  if (lower.startsWith("blob:") || lower.startsWith("data:")) return false;
  // Anything persisted (https://..., supabase storage path) is reusable.
  return true;
}