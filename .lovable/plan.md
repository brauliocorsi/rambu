## Fase C — Envio com retry visível

O código já tem `client_msg_id`, dedup por `client_msg_id` no realtime e optimistic update nos três fluxos (canal, DM, grupo). Vou **somar** estado visual e retry **sem reescrever** os hooks de envio.

### Estratégia

Manter os hooks atuais (`useMessages`, `useDirectMessages`, `useDMGroups`) e:

1. **Marcar a mensagem otimista** com `_status: "pending" | "uploading" | "failed" | "sent"` e `_retry: { content, replyTo, mentions, attachments?, conversationKind }` no objeto otimista (campos privados, não vão pro DB).
2. **No `onError` da mutation**: em vez de só toast, fazer `setQueryData` mudando `_status` da mensagem com aquele `client_msg_id` para `"failed"` e guardando o payload em `_retry`. Não remover do cache.
3. **No `onSuccess`/realtime dedup**: já substitui pela versão real — comportamento atual preservado.
4. **Loja de retry em memória** (`src/lib/pendingRetries.ts`): mapa `client_msg_id → payload` para sobreviver a invalidações de query (sessão atual). Quando o usuário clica "Tentar novamente", reinjeta a mensagem otimista (mesmo `client_msg_id`) e chama o mutate de novo.

### Arquivos a alterar (mínimos)

**Novo:**
- `src/lib/pendingRetries.ts` — store em memória + helpers (`saveRetry`, `getRetry`, `clearRetry`, `listRetries(conversationKey)`).
- `src/components/message/MessageStatusIndicator.tsx` — componente compartilhado: render `pending` / `uploading` / `failed + botão`.

**Editar (cirurgicamente):**
- `src/hooks/useMessages.tsx` — `onError`: marcar otimista como `failed` em vez de remover; expor `retryMessage(clientMsgId)`.
- `src/hooks/useDirectMessages.tsx` — idem.
- `src/hooks/useDMGroups.tsx` — idem.
- `src/components/message/MessageBubble.tsx` — renderizar `<MessageStatusIndicator>` quando `_status` presente.
- `src/components/dm/DMMessageBubble.tsx` — idem.
- `src/components/dm/GroupChatView.tsx` (ou bubble equivalente) — idem.

### Regras de segurança

- Campos `_status`/`_retry` ficam **apenas no cliente** (prefixo `_`); nunca enviados ao Supabase.
- Dedup por `client_msg_id` continua mandando: se realtime/insert confirmar, optimistic vira `sent` e perde `_retry`.
- Retry reusa o **mesmo `client_msg_id`** para evitar duplicação se a versão antiga tiver chegado tarde no realtime (o insert deduplica server-side se houver unique index; se não houver, o dedup do client cobre).
- Não toco em: realtime, push, edge functions, RLS, áudio, anexos (uso pipeline existente), reply, mentions, scheduled, drafts.
- Fallback offline (IndexedDB queue) em `useMessages` permanece intocado.

### UI

Linha discreta abaixo do conteúdo da bolha (mesmo container, sem mexer no layout):
- `pending` → texto `Enviando…` em `muted-foreground` 10px.
- `uploading` → `Carregando anexo…`.
- `failed` → `Falha ao enviar` + botão linkado `Tentar novamente`.
- `sent` → nada.

### Testes manuais (que vou pedir pra você rodar)

Canal/DM/Grupo, em cada: enviar online, enviar offline (DevTools → throttle), retry, anexo simulado fail, áudio fail. Validar que realtime não duplica.

### Riscos

- Se o usuário fechar a aba, mensagens `failed` somem (store em memória) — fora do escopo desta fase, fica para offline-queue futura.
- Retry de anexo só funciona se o `File` original ainda estiver em memória. Se não estiver (refresh), mostro aviso pedindo re-selecionar.
- Edição da bolha em `MessageBubble` é mínima, mas se houver paths com bubble customizado (poll, task card) que ignoram filhos extras, o indicador pode não aparecer ali — vou checar e adicionar onde precisar.

Confirma que posso implementar dessa forma?