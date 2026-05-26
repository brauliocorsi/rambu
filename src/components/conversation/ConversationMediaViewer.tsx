import { useCallback, useState } from "react";
import { ImageLightbox } from "@/components/message/ImageLightbox";
import type { ConversationMessage } from "@/types/conversation";

/**
 * Visualizador de midia unificado para a camada de conversa.
 * Hoje suporta imagens via ImageLightbox; videos e arquivos continuam
 * sendo tratados inline pelos bubbles (VideoPlayer, FilePreview).
 */
interface ConversationMediaViewerProps {
  messages: ConversationMessage[];
}

export function useConversationMediaViewer(messages: ConversationMessage[]) {
  const [openId, setOpenId] = useState<string | null>(null);

  const open = useCallback((m: ConversationMessage) => {
    if (m.attachment?.type?.startsWith("image/")) {
      setOpenId(m.id);
    }
  }, []);

  const close = useCallback(() => setOpenId(null), []);

  const current = openId
    ? messages.find((m) => m.id === openId)
    : null;

  const viewer =
    current && current.attachment?.url ? (
      <ImageLightbox
        open
        onClose={close}
        url={current.attachment.url}
        name={current.attachment.name ?? "image"}
      />
    ) : null;

  return { open, close, viewer };
}

export function ConversationMediaViewer({ messages }: ConversationMediaViewerProps) {
  const { viewer } = useConversationMediaViewer(messages);
  return <>{viewer}</>;
}