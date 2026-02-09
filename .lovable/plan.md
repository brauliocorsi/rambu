
# Plano: Melhorar Experiencia de Mensagens em Tempo Real

## Problemas Identificados

Analisando o codigo atual, identifiquei os seguintes problemas:

1. **Envio sem feedback instantaneo** - Quando o usuario envia uma mensagem, ela so aparece apos a confirmacao do servidor + evento realtime
2. **Delay perceptivel** - O fluxo atual e: enviar -> esperar servidor -> esperar realtime -> buscar profile -> atualizar UI
3. **Possivel duplicacao** - Se o realtime chegar antes da mutacao terminar, pode haver comportamento inconsistente
4. **Scroll nao automatico** - Em alguns casos o chat nao rola automaticamente para a nova mensagem

## Solucao Proposta

Implementar **Optimistic Updates** para que a mensagem apareca instantaneamente ao enviar, e sincronizar com o servidor em background.

---

## Alteracoes Tecnicas

### 1. Hook `useMessages.tsx` - Adicionar Optimistic Update

**Modificar `useSendMessage()`:**
- Adicionar `onMutate` para inserir mensagem temporaria na lista antes do servidor responder
- Adicionar `onError` para reverter a mensagem se houver erro
- Adicionar `onSettled` para garantir sincronizacao
- Evitar duplicacao quando realtime chegar

```typescript
export function useSendMessage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: profile } = useProfile();

  return useMutation({
    mutationFn: async ({ channelId, content, ... }) => {
      // ... codigo existente
    },
    onMutate: async (variables) => {
      // Cancelar refetches pendentes
      await queryClient.cancelQueries({ queryKey: ["infinite-messages", variables.channelId] });
      
      // Snapshot do estado anterior
      const previousMessages = queryClient.getQueryData(["infinite-messages", variables.channelId]);
      
      // Mensagem temporaria com ID otimista
      const optimisticMessage = {
        id: `temp-${Date.now()}`,
        channel_id: variables.channelId,
        user_id: user.id,
        content: variables.content,
        created_at: new Date().toISOString(),
        profile: {
          display_name: profile?.display_name,
          avatar_url: profile?.avatar_url,
        },
        _isOptimistic: true, // Flag para identificar
      };
      
      // Adicionar mensagem otimista
      queryClient.setQueryData(["infinite-messages", variables.channelId], (old) => {
        // ... adicionar ao final da ultima pagina
      });
      
      return { previousMessages };
    },
    onError: (err, variables, context) => {
      // Reverter para estado anterior
      queryClient.setQueryData(
        ["infinite-messages", variables.channelId],
        context?.previousMessages
      );
    },
    onSettled: (data, error, variables) => {
      // Remover mensagem otimista e deixar realtime cuidar
      // Ou substituir pelo dado real
    },
  });
}
```

### 2. Hook `useInfiniteMessages.tsx` - Evitar Duplicacao

**Modificar callback de INSERT:**
```typescript
if (payload.eventType === "INSERT") {
  // Verificar se ja existe (pode ser mensagem otimista)
  const existingMessages = queryClient.getQueryData(["infinite-messages", channelId]);
  
  // Se a mensagem ja existe (mesmo conteudo, mesmo user, recente), ignorar
  // Ou substituir mensagem otimista pelo dado real
}
```

### 3. Hook `useSendDMMessage` - Mesmo Tratamento

Aplicar as mesmas melhorias ao hook de DMs em `useDirectMessages.tsx`

### 4. Hook `useInfiniteDMMessages.tsx` - Evitar Duplicacao

Mesma logica de deduplicacao para mensagens DM

### 5. MessageList e DMChatView - Melhorar Auto-Scroll

Garantir que o scroll para baixo seja suave e imediato ao enviar:

```typescript
// Ao detectar nova mensagem do proprio usuario, sempre rolar
if (newMessage.user_id === currentUserId) {
  scrollToBottom("smooth");
}
```

---

## Fluxo Apos Alteracoes

```text
ANTES:
[Usuario clica Enviar] --> [Espera servidor ~200ms] --> [Espera realtime ~100ms] --> [Fetch profile] --> [Exibe mensagem]
Total: ~400-500ms de delay

DEPOIS:
[Usuario clica Enviar] --> [Mensagem aparece INSTANTANEAMENTE] --> [Servidor confirma em background]
Total: 0ms de delay percebido
```

---

## Resumo de Arquivos a Alterar

| Arquivo | Alteracao |
|---------|-----------|
| `src/hooks/useMessages.tsx` | Adicionar optimistic updates em `useSendMessage`; usar profile cacheado |
| `src/hooks/useInfiniteMessages.tsx` | Adicionar logica de deduplicacao; substituir mensagem otimista pelo dado real |
| `src/hooks/useDirectMessages.tsx` | Adicionar optimistic updates em `useSendDMMessage` |
| `src/hooks/useInfiniteDMMessages.tsx` | Adicionar logica de deduplicacao para DMs |

---

## Beneficios

1. **Feedback instantaneo** - Mensagem aparece no momento do clique
2. **Experiencia fluida** - Sem delays visiveis
3. **Sincronizacao segura** - Se houver erro, mensagem e removida automaticamente
4. **Sem duplicacao** - Sistema inteligente evita mensagens duplicadas
5. **Scroll automatico** - Chat sempre rola para a mensagem mais recente ao enviar
