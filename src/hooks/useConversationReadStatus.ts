/**
 * Façade unificada de leitura/marcação por conversa.
 *
 * - channel: usa channel_read_status (via useMarkChannelAsRead / Unread)
 * - dm:      usa dm_read_status (via useMarkDMAsRead / Unread)
 * - group:   ainda não tem tabela de read status no banco; expomos
 *            no-ops para preservar a API e documentamos o comportamento.
 *
 * Regras de auto-mark (quando `autoMark` está habilitado):
 *  - só dispara se a conversa está ativa (ref não nula);
 *  - só dispara se a aba/janela está visível;
 *  - debounce de ~500ms para evitar marcações em sequência;
 *  - troca rápida de conversas cancela o timer pendente e descarta
 *    chamadas em vôo cuja conversa não bate mais com a ativa
 *    (evita marcar a conversa errada como lida);
 *  - reage a visibilitychange/focus para remark ao voltar para a aba;
 *  - se `hasUnread === false`, NÃO dispara (evita escritas desnecessárias);
 *  - se `hasUnread` é undefined, marca de forma otimista ao abrir
 *    (mantém o comportamento atual do app).
 *
 * O hook nunca dispara em loop: cada conversa só marca uma vez por ciclo
 * (abertura, retorno-à-aba, mudança de hasUnread de false→true).
 */
import { useCallback, useEffect, useRef } from "react";
import {
  useMarkChannelAsRead,
  useMarkDMAsRead,
} from "./useNotifications";
import {
  useMarkChannelAsUnread,
  useMarkDMAsUnread,
} from "./useMarkAsUnread";
import type { ConversationRef } from "@/types/conversation";

interface Options {
  /** Quando true, dispara markAsRead automaticamente respeitando as regras acima. */
  autoMark?: boolean;
  /** Sinal opcional indicando se a conversa tem mensagens não lidas. */
  hasUnread?: boolean;
  /** Atraso do debounce em ms. Padrão 500. */
  debounceMs?: number;
}

function refKey(ref: ConversationRef | null): string | null {
  return ref ? `${ref.type}:${ref.id}` : null;
}

export function useConversationReadStatus(
  ref: ConversationRef | null,
  options: Options = {},
) {
  const { autoMark = false, hasUnread, debounceMs = 500 } = options;

  const markChannelRead = useMarkChannelAsRead();
  const markChannelUnread = useMarkChannelAsUnread();
  const markDMRead = useMarkDMAsRead();
  const markDMUnread = useMarkDMAsUnread();

  // Refs estáveis para callbacks usados em effects sem causar re-render loops.
  const activeKeyRef = useRef<string | null>(null);
  const lastMarkedKeyRef = useRef<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Atualiza ref da conversa ativa imediatamente para que mutations em vôo
  // possam validar contra o id atual antes de aplicar efeitos colaterais.
  useEffect(() => {
    activeKeyRef.current = refKey(ref);
  }, [ref?.type, ref?.id]);

  const markRefAsRead = useCallback(
    (targetRef: ConversationRef) => {
      // Guard final: só marca se a conversa-alvo ainda é a ativa.
      if (refKey(targetRef) !== activeKeyRef.current) return;
      lastMarkedKeyRef.current = refKey(targetRef);
      if (targetRef.type === "channel") markChannelRead.mutate(targetRef.id);
      else if (targetRef.type === "dm") markDMRead.mutate(targetRef.id);
      // group: sem tabela de read_status — no-op intencional.
    },
    [markChannelRead, markDMRead],
  );

  const scheduleMark = useCallback(
    (targetRef: ConversationRef) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        if (typeof document !== "undefined" && document.visibilityState !== "visible") {
          // janela não está visível: adia para o próximo focus/visibilitychange
          return;
        }
        markRefAsRead(targetRef);
      }, debounceMs);
    },
    [debounceMs, markRefAsRead],
  );

  // markAsRead manual (sem debounce, mas ainda respeita conversa ativa).
  const markAsRead = useCallback(() => {
    if (!ref) return;
    markRefAsRead(ref);
  }, [ref, markRefAsRead]);

  const markAsUnread = useCallback(
    (messageCreatedAt?: string) => {
      if (!ref) return;
      if (ref.type === "channel" && messageCreatedAt) {
        return markChannelUnread.mutate({ channelId: ref.id, messageCreatedAt });
      }
      if (ref.type === "dm" && messageCreatedAt) {
        return markDMUnread.mutate({ dmId: ref.id, messageCreatedAt });
      }
    },
    [ref, markChannelUnread, markDMUnread],
  );

  // Auto-mark: dispara quando a conversa muda, quando hasUnread vai p/ true,
  // ou quando a aba volta a ficar visível.
  useEffect(() => {
    if (!autoMark || !ref) {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      return;
    }
    // Se hasUnread é explicitamente false, evita escrita desnecessária.
    if (hasUnread === false) return;
    // Reset do "last marked" quando a conversa muda permite remarcar na próxima
    // entrada (ex.: usuário voltou para a mesma conversa após ler outra).
    if (lastMarkedKeyRef.current !== refKey(ref) || hasUnread === true) {
      scheduleMark(ref);
    }
  }, [autoMark, ref?.type, ref?.id, hasUnread, scheduleMark]);

  // Re-tenta quando a aba volta a ficar visível ou ganha foco.
  useEffect(() => {
    if (!autoMark) return;
    const onVisible = () => {
      if (typeof document === "undefined") return;
      if (document.visibilityState !== "visible") return;
      const current = ref;
      if (!current) return;
      if (hasUnread === false) return;
      scheduleMark(current);
    };
    window.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      window.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [autoMark, ref?.type, ref?.id, hasUnread, scheduleMark]);

  // Limpa timer ao desmontar.
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return {
    markAsRead,
    markAsUnread,
    isPending:
      markChannelRead.isPending ||
      markDMRead.isPending ||
      markChannelUnread.isPending ||
      markDMUnread.isPending,
  };
}