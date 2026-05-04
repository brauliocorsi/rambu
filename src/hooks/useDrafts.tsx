import { useEffect, useState, useCallback } from "react";

const PREFIX = "rambu:draft:";

/**
 * Persistent message draft per conversation (channel/dm/group), keyed in localStorage.
 * Auto-saves and restores across reloads.
 */
export function useDraft(conversationId: string | null | undefined) {
  const key = conversationId ? `${PREFIX}${conversationId}` : null;
  const [draft, setDraftState] = useState<string>("");

  // Load on mount / id change
  useEffect(() => {
    if (!key) {
      setDraftState("");
      return;
    }
    try {
      setDraftState(localStorage.getItem(key) ?? "");
    } catch {
      setDraftState("");
    }
  }, [key]);

  const setDraft = useCallback(
    (value: string) => {
      setDraftState(value);
      if (!key) return;
      try {
        if (value.trim()) localStorage.setItem(key, value);
        else localStorage.removeItem(key);
      } catch {
        /* noop: quota or private mode */
      }
    },
    [key],
  );

  const clearDraft = useCallback(() => {
    setDraftState("");
    if (!key) return;
    try {
      localStorage.removeItem(key);
    } catch {
      /* noop */
    }
  }, [key]);

  return { draft, setDraft, clearDraft };
}

/** Returns map of conversationId -> draft content (for sidebars badges). */
export function getAllDraftsSnapshot(): Record<string, string> {
  const result: Record<string, string> = {};
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(PREFIX)) {
        const id = k.slice(PREFIX.length);
        const v = localStorage.getItem(k);
        if (v && v.trim()) result[id] = v;
      }
    }
  } catch {
    /* noop */
  }
  return result;
}