import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const BUCKET = "message-attachments";
const PUBLIC_MARKER = `/storage/v1/object/public/${BUCKET}/`;
const EXPIRES_IN = 3600; // 1h
const SAFETY_MS = 5 * 60 * 1000; // renova 5min antes de expirar

type CacheEntry = { url: string; expiresAt: number };
const cache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<string>>();

/** Extrai o caminho do objeto a partir de uma URL pública legada do bucket. */
export function getAttachmentPath(url: string | null | undefined): string | null {
  if (!url) return null;
  const idx = url.indexOf(PUBLIC_MARKER);
  if (idx === -1) return null;
  const raw = url.slice(idx + PUBLIC_MARKER.length).split("?")[0];
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

/**
 * Converte uma URL do bucket privado numa URL assinada de curta duração.
 * URLs externas (ou já assinadas) são devolvidas inalteradas.
 */
export async function signStorageUrl(url: string | null | undefined): Promise<string> {
  if (!url) return "";
  const path = getAttachmentPath(url);
  if (!path) return url;

  const now = Date.now();
  const cached = cache.get(path);
  if (cached && cached.expiresAt - SAFETY_MS > now) return cached.url;

  const pending = inflight.get(path);
  if (pending) return pending;

  const promise = (async () => {
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, EXPIRES_IN);
    if (error || !data?.signedUrl) return url;
    cache.set(path, { url: data.signedUrl, expiresAt: now + EXPIRES_IN * 1000 });
    return data.signedUrl;
  })().finally(() => inflight.delete(path));

  inflight.set(path, promise);
  return promise;
}

/** Hook: devolve a URL pronta para uso em <img>, <video>, downloads, etc. */
export function useSignedUrl(url: string | null | undefined): string {
  const [resolved, setResolved] = useState(() => (getAttachmentPath(url) ? "" : url || ""));

  useEffect(() => {
    let active = true;
    if (!url) {
      setResolved("");
      return;
    }
    const path = getAttachmentPath(url);
    if (!path) {
      setResolved(url);
      return;
    }
    const cached = cache.get(path);
    if (cached && cached.expiresAt - SAFETY_MS > Date.now()) {
      setResolved(cached.url);
      return;
    }
    setResolved("");
    signStorageUrl(url).then((signed) => {
      if (active) setResolved(signed);
    });
    return () => {
      active = false;
    };
  }, [url]);

  return resolved;
}
