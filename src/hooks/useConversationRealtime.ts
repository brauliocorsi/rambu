/**
 * Façade de realtime.
 *
 * Hoje os hooks `useInfiniteMessages`, `useInfiniteDMMessages` e
 * `useDMGroupMessages` já abrem o canal de Realtime correspondente,
 * fazem fetch de profile isolado do payload e agendam revalidação.
 * Para evitar duplicar assinaturas (que causariam eventos duplos),
 * este hook é uma **fachada inerte** quando usado em conjunto com
 * `useConversationMessages`. Ele expõe o `ConversationRef` ativo e
 * uma flag `isSubscribed` para componentes que precisem reagir.
 *
 * Em uma fase futura, podemos mover toda a lógica de subscribe
 * para cá e remover dos hooks de leitura.
 */
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { ConversationRef } from "@/types/conversation";

export interface UseConversationRealtimeResult {
  isSubscribed: boolean;
  ref: ConversationRef | null;
}

export function useConversationRealtime(
  ref: ConversationRef | null,
): UseConversationRealtimeResult {
  const [isSubscribed, setSubscribed] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!ref) {
      setSubscribed(false);
      return;
    }
    setSubscribed(true);

    // Reconcile cache quando a aba volta a ficar visível ou a rede
    // reconecta. A assinatura postgres_changes em si é gerida pelos
    // hooks de leitura — aqui forçamos um refetch incremental para
    // recuperar mensagens perdidas durante desconexões curtas.
    const key =
      ref.type === "channel"
        ? ["infinite-messages", ref.id]
        : ref.type === "dm"
          ? ["infinite-dm-messages", ref.id]
          : ["dm-group-messages", ref.id];

    const resync = () => {
      if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
      queryClient.invalidateQueries({ queryKey: key, exact: false });
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") resync();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", resync);

    return () => {
      setSubscribed(false);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", resync);
    };
  }, [ref?.type, ref?.id, queryClient]);

  return { isSubscribed, ref };
}