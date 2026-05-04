/**
 * Lightweight IndexedDB-backed queue for messages composed while offline.
 * Replays via a registered sender function when the browser comes back online.
 */
import { supabase } from "@/integrations/supabase/client";

const DB_NAME = "rambu-offline";
const STORE = "outgoing";
const VERSION = 1;

export type OutgoingScope = "channel" | "dm" | "group" | "thread";

export interface QueuedMessage {
  id: string;
  scope: OutgoingScope;
  conversationId: string;
  payload: {
    content: string;
    replyTo?: string | null;
    fileUrl?: string | null;
    fileType?: string | null;
    fileName?: string | null;
    expiresAt?: string | null;
  };
  attempts: number;
  createdAt: number;
  lastError?: string | null;
  userId: string;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => Promise<T> | T): Promise<T> {
  const db = await openDB();
  return new Promise<T>((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const s = t.objectStore(STORE);
    Promise.resolve(fn(s))
      .then((res) => {
        t.oncomplete = () => resolve(res);
        t.onerror = () => reject(t.error);
      })
      .catch(reject);
  });
}

export async function enqueueMessage(msg: Omit<QueuedMessage, "id" | "attempts" | "createdAt">) {
  const item: QueuedMessage = {
    ...msg,
    id: `q-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    attempts: 0,
    createdAt: Date.now(),
  };
  await tx("readwrite", (s) => {
    s.put(item);
    return null;
  });
  notify();
  return item;
}

export async function listQueue(): Promise<QueuedMessage[]> {
  return tx("readonly", (s) =>
    new Promise<QueuedMessage[]>((resolve, reject) => {
      const req = s.getAll();
      req.onsuccess = () => resolve((req.result as QueuedMessage[]) ?? []);
      req.onerror = () => reject(req.error);
    }),
  );
}

export async function removeFromQueue(id: string) {
  await tx("readwrite", (s) => {
    s.delete(id);
    return null;
  });
  notify();
}

export async function bumpAttempt(id: string, error: string) {
  await tx("readwrite", (s) => {
    return new Promise<void>((resolve, reject) => {
      const req = s.get(id);
      req.onsuccess = () => {
        const it = req.result as QueuedMessage | undefined;
        if (!it) return resolve();
        it.attempts += 1;
        it.lastError = error.slice(0, 200);
        s.put(it);
        resolve();
      };
      req.onerror = () => reject(req.error);
    });
  });
  notify();
}

const listeners = new Set<() => void>();
export function subscribeQueue(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
function notify() {
  listeners.forEach((cb) => cb());
}

/** Insert a queued message via Supabase based on its scope. */
async function sendOne(msg: QueuedMessage): Promise<void> {
  const base = {
    content: msg.payload.content,
    file_url: msg.payload.fileUrl ?? null,
    file_type: msg.payload.fileType ?? null,
    file_name: msg.payload.fileName ?? null,
    expires_at: msg.payload.expiresAt ?? null,
  };
  if (msg.scope === "channel") {
    const { error } = await supabase.from("messages").insert({
      channel_id: msg.conversationId,
      user_id: msg.userId,
      reply_to: msg.payload.replyTo ?? null,
      ...base,
    });
    if (error) throw error;
  } else if (msg.scope === "dm") {
    const { error } = await supabase.from("dm_messages").insert({
      dm_id: msg.conversationId,
      user_id: msg.userId,
      reply_to: msg.payload.replyTo ?? null,
      ...base,
    });
    if (error) throw error;
  } else if (msg.scope === "group") {
    const { error } = await supabase.from("dm_group_messages").insert({
      group_id: msg.conversationId,
      user_id: msg.userId,
      reply_to: msg.payload.replyTo ?? null,
      ...base,
    });
    if (error) throw error;
  } else {
    throw new Error(`Unsupported scope ${msg.scope}`);
  }
}

let flushing = false;
export async function flushQueue(): Promise<{ sent: number; failed: number }> {
  if (flushing || !navigator.onLine) return { sent: 0, failed: 0 };
  flushing = true;
  let sent = 0;
  let failed = 0;
  try {
    const items = (await listQueue()).sort((a, b) => a.createdAt - b.createdAt);
    for (const it of items) {
      // Exponential backoff: skip if too many attempts in current burst
      if (it.attempts >= 5) continue;
      try {
        await sendOne(it);
        await removeFromQueue(it.id);
        sent++;
      } catch (e: any) {
        await bumpAttempt(it.id, e?.message ?? "send error");
        failed++;
      }
    }
  } finally {
    flushing = false;
  }
  return { sent, failed };
}

/** Wire global flush on online + interval. Call once at app boot. */
export function setupOfflineFlusher() {
  const trigger = () => void flushQueue();
  window.addEventListener("online", trigger);
  // Periodic retry while online (covers transient server errors)
  const interval = window.setInterval(() => {
    if (navigator.onLine) trigger();
  }, 30_000);
  // First attempt shortly after boot
  setTimeout(trigger, 2000);
  return () => {
    window.removeEventListener("online", trigger);
    window.clearInterval(interval);
  };
}