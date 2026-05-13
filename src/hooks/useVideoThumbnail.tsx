import { useEffect, useState } from "react";

// Module-level cache so the same video URL is processed once per session
const cache = new Map<string, string>();
const inflight = new Map<string, Promise<string | null>>();

async function generateThumbnail(url: string): Promise<string | null> {
  if (cache.has(url)) return cache.get(url) ?? null;
  if (inflight.has(url)) return inflight.get(url)!;

  const promise = new Promise<string | null>((resolve) => {
    try {
      const video = document.createElement("video");
      video.crossOrigin = "anonymous";
      video.preload = "metadata";
      video.muted = true;
      (video as any).playsInline = true;
      video.src = url;

      const cleanup = () => {
        video.removeAttribute("src");
        video.load();
      };

      const timeout = window.setTimeout(() => {
        cleanup();
        resolve(null);
      }, 8000);

      video.addEventListener("loadeddata", () => {
        try {
          // Seek a tiny bit in to avoid black first frame
          video.currentTime = Math.min(0.1, (video.duration || 1) / 2);
        } catch {
          // some browsers don't allow setting currentTime before metadata
        }
      });

      video.addEventListener("seeked", () => {
        try {
          const w = video.videoWidth;
          const h = video.videoHeight;
          if (!w || !h) {
            window.clearTimeout(timeout);
            cleanup();
            resolve(null);
            return;
          }
          const maxW = 480;
          const scale = Math.min(1, maxW / w);
          const canvas = document.createElement("canvas");
          canvas.width = Math.round(w * scale);
          canvas.height = Math.round(h * scale);
          const ctx = canvas.getContext("2d");
          if (!ctx) throw new Error("no ctx");
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
          cache.set(url, dataUrl);
          window.clearTimeout(timeout);
          cleanup();
          resolve(dataUrl);
        } catch {
          window.clearTimeout(timeout);
          cleanup();
          resolve(null);
        }
      });

      video.addEventListener("error", () => {
        window.clearTimeout(timeout);
        cleanup();
        resolve(null);
      });
    } catch {
      resolve(null);
    }
  });

  inflight.set(url, promise);
  promise.finally(() => inflight.delete(url));
  return promise;
}

export function useVideoThumbnail(url: string | null | undefined) {
  const [thumbnail, setThumbnail] = useState<string | null>(() =>
    url && cache.has(url) ? cache.get(url) ?? null : null
  );

  useEffect(() => {
    if (!url) {
      setThumbnail(null);
      return;
    }
    let cancelled = false;
    generateThumbnail(url).then((thumb) => {
      if (!cancelled) setThumbnail(thumb);
    });
    return () => {
      cancelled = true;
    };
  }, [url]);

  return thumbnail;
}
