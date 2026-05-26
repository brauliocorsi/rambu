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
import type { ConversationRef } from "@/types/conversation";

export interface UseConversationRealtimeResult {
  isSubscribed: boolean;
  ref: ConversationRef | null;
}

export function useConversationRealtime(
  ref: ConversationRef | null,
): UseConversationRealtimeResult {
  const [isSubscribed, setSubscribed] = useState(false);

  useEffect(() => {
    if (!ref) {
      setSubscribed(false);
      return;
    }
    // A assinatura real é feita pelo hook de leitura associado
    // (useConversationMessages -> useInfiniteMessages/etc).
    // Aqui apenas sinalizamos o ciclo de vida para consumidores.
    setSubscribed(true);
    return () => setSubscribed(false);
  }, [ref?.type, ref?.id]);

  return { isSubscribed, ref };
}