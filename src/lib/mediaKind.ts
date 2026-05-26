import { toast } from "sonner";

/**
 * Detecção unificada de tipo de mídia para anexos de chat.
 *
 * Prioridade:
 *   1. MIME type (file_type vindo do banco)
 *   2. Extensão do file_name
 *   3. Extensão derivada do file_url
 *   4. "unknown"
 *
 * Usado por FilePreview, ImageLightbox, VideoPlayer e qualquer outro
 * consumidor para garantir comportamento consistente em canal, DM e grupo.
 */

export type MediaKind =
  | "image"
  | "video"
  | "audio"
  | "pdf"
  | "document"
  | "unknown";

const IMAGE_EXTS = new Set([
  "png", "jpg", "jpeg", "gif", "webp", "bmp", "svg", "avif", "heic", "heif",
]);
const VIDEO_EXTS = new Set([
  "mp4", "mov", "webm", "mkv", "avi", "m4v", "3gp", "ogv",
]);
const AUDIO_EXTS = new Set([
  "mp3", "wav", "ogg", "oga", "m4a", "aac", "flac", "webm", "opus",
]);
const DOC_EXTS = new Set([
  "doc", "docx", "xls", "xlsx", "ppt", "pptx", "csv", "txt", "md",
  "rtf", "odt", "ods", "odp", "zip", "rar", "7z", "tar", "gz", "json", "xml",
]);

function getExt(name?: string | null): string | null {
  if (!name) return null;
  // Remove query/hash before checking extension (for URLs)
  const cleaned = name.split(/[?#]/)[0];
  const dot = cleaned.lastIndexOf(".");
  if (dot < 0 || dot === cleaned.length - 1) return null;
  return cleaned.slice(dot + 1).toLowerCase();
}

export function getMediaKind(
  fileType?: string | null,
  fileName?: string | null,
  fileUrl?: string | null,
): MediaKind {
  // 1) MIME
  if (fileType) {
    const mime = fileType.toLowerCase();
    if (mime.startsWith("image/")) return "image";
    if (mime.startsWith("video/")) return "video";
    if (mime.startsWith("audio/")) return "audio";
    if (mime === "application/pdf") return "pdf";
    if (
      mime.startsWith("application/") ||
      mime.startsWith("text/")
    ) {
      return "document";
    }
  }

  // 2/3) extensão do nome, depois da URL
  const ext = getExt(fileName) ?? getExt(fileUrl);
  if (ext) {
    if (IMAGE_EXTS.has(ext)) return "image";
    if (VIDEO_EXTS.has(ext)) return "video";
    if (AUDIO_EXTS.has(ext)) return "audio";
    if (ext === "pdf") return "pdf";
    if (DOC_EXTS.has(ext)) return "document";
  }

  return "unknown";
}

/**
 * Abre URL externa de forma segura (noopener/noreferrer).
 *
 * Protocolos permitidos:
 *   - http:// / https://
 *   - blob:
 *   - data: limitado a image/*, application/pdf e text/plain
 *
 * Protocolos bloqueados:
 *   - javascript:, data:, file:, ftp:, ssh:, telnet:, mailto:, etc.
 * Se bloqueada, exibe toast discreto sem travar a UI.
 */
export function safeOpenExternal(url: string): void {
  if (!url) return;

  try {
    const parsed = new URL(url);
    const protocol = parsed.protocol.toLowerCase();

    // 1) Permitir http(s) e blob sem restrições
    if (protocol === "http:" || protocol === "https:" || protocol === "blob:") {
      window.open(url, "_blank", "noopener,noreferrer");
      return;
    }

    // 2) data: apenas tipos seguros
    if (protocol === "data:") {
      const dataPrefix = parsed.pathname.toLowerCase(); // ex: "image/png;base64,..."
      const isSafeData =
        dataPrefix.startsWith("image/") ||
        dataPrefix.startsWith("application/pdf") ||
        dataPrefix.startsWith("text/plain");

      if (isSafeData) {
        window.open(url, "_blank", "noopener,noreferrer");
        return;
      }
    }

    // 3) Qualquer outro protocolo é bloqueado silenciosamente com toast
    toast("Este anexo não pode ser aberto com segurança.");
  } catch {
    // URL malformada — não abre
    toast("Este anexo não pode ser aberto com segurança.");
  }
}

/**
 * Placeholder para futura geração de signed URLs.
 * Hoje devolve a URL como está; mantém o ponto de extensão pronto.
 */
export function resolveAttachmentUrl(url: string): string {
  return url;
}
