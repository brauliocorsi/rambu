# Melhorias no Realtime de Mensagens

## Problemas identificados

1. **Canais Realtime duplicados**: `useMessages` e `useInfiniteMessages` se inscrevem no MESMO nome de canal (`messages:${channelId}`). Quando ambos montam (ou só um), há colisão/conflito de subscribers no Supabase Realtime, causando entregas perdidas e reconexões silenciosas. O mesmo pode acontecer entre `useInfiniteDMMessages` e `useDirectMessages`.

2. **Fetch extra de profile a cada INSERT**: cada nova mensagem dispara `fetchMessageProfile()` (1 round-trip ao banco) antes de renderizar. Em conversas ativas isso adiciona 100–400ms de latência percebida e carga extra no DB.

3. **Revalidação agressiva (`scheduleQuerySync` 1200ms)** após cada INSERT — refaz todo o SELECT de mensagens, podendo sobrescrever estados otimistas e causar "piscadas" / reordenações na UI.

4. **Sem `REPLICA IDENTITY FULL`** nas tabelas de mensagens — `UPDATE`/`DELETE` em realtime entregam apenas a PK, dificultando merges incrementais (ex.: edição de mensagem chega sem `content`).

5. **Dedup frágil em mensagens otimistas**: a comparação por `content + user_id + 5s` falha quando o usuário envia 2 mensagens iguais rapidamente, gerando duplicatas visuais.

6. **Mutation onSuccess não atualiza `profile`**: se o usuário edita o display_name, mensagens recém-enviadas mostram o nome antigo até refresh.

## Mudanças propostas

### 1. Unificar subscriptions (sem mais canais duplicados)
- Criar um hook único `useMessagesRealtime(channelId)` que mantém UMA subscription Supabase por `channelId`, atualiza ambos os caches `["messages", id]` e `["infinite-messages", id]` em uma única callback.
- `useMessages` e `useInfiniteMessages` deixam de criar subscriptions próprias e apenas chamam o novo hook compartilhado (idempotente via ref count global).
- Mesmo padrão para DMs (`useDMMessagesRealtime`) e grupos.

### 2. Cache local de profile (evita round-trip por mensagem)
- Substituir `fetchMessageProfile` por `getProfileCached(userId)` que:
  - Lê primeiro `queryClient.getQueryData(["profile", userId])` e do cache de membros (`workspace-members`, `channel-members`).
  - Só busca no DB em fallback, e armazena no QueryClient com `staleTime: 5min`.
- Resultado: INSERT renderiza imediato com avatar/nome, sem await DB.

### 3. Remover revalidação após INSERT/UPDATE/DELETE
- Tirar `scheduleQuerySync` dos handlers de evento — o `setQueryData` já produz o estado correto. Manter apenas a chamada uma vez ao SUBSCRIBED inicial (catch-up de mensagens perdidas durante reconexão).

### 4. Migração SQL: `REPLICA IDENTITY FULL`
```sql
ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER TABLE public.dm_messages REPLICA IDENTITY FULL;
ALTER TABLE public.dm_group_messages REPLICA IDENTITY FULL;
ALTER TABLE public.thread_messages REPLICA IDENTITY FULL;
ALTER TABLE public.message_reactions REPLICA IDENTITY FULL;
```
Garante que payloads de UPDATE/DELETE tragam a linha inteira.

### 5. Dedup robusto via `client_msg_id`
- Adicionar coluna `client_msg_id uuid` (nullable) em `messages`, `dm_messages`, `dm_group_messages` (índice único parcial por canal).
- Ao enviar: gerar UUID no cliente, usar como `optimisticId` e enviar no INSERT.
- Realtime INSERT compara por `client_msg_id` → dedup determinístico, sem heurística de tempo/conteúdo.

### 6. onSuccess preserva profile correto
- Em `useSendMessage.onSuccess`, manter o `profile` do cache local em vez de copiar do retorno (que vem sem profile).

### 7. Conexão Realtime mais resiliente
- No `supabase/client.ts` (se permitido) ou via `supabase.realtime.setAuth()` — garantir reconexão automática e `heartbeatIntervalMs: 15000` para detectar quedas mais cedo. (Apenas se o client gerado permitir; caso contrário, pular.)

## Ganho esperado
- Latência percebida do envio: de ~500ms → instantânea (otimismo + sem fetch profile).
- Sem mais "piscadas" ou mensagens duplicadas em rajadas.
- Edições/deleções refletem corretamente sem refetch full.
- Sem subscriptions colidindo → entregas estáveis em background.

## Arquivos a editar/criar
- `src/lib/realtimeSync.ts` — adicionar `getProfileCached`, manter helpers.
- `src/hooks/useMessagesRealtime.tsx` (novo) — subscription unificada de canais.
- `src/hooks/useDMMessagesRealtime.tsx` (novo) — idem para DMs.
- `src/hooks/useMessages.tsx`, `useInfiniteMessages.tsx`, `useDirectMessages.tsx`, `useInfiniteDMMessages.tsx`, `useDMGroups.tsx` — usar hooks unificados, adicionar `client_msg_id` no envio, dedup determinístico.
- Nova migration SQL: `REPLICA IDENTITY FULL` + coluna `client_msg_id` + índice único.
