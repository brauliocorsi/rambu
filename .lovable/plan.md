## Por que um plano antes de executar

A tarefa pedida toca **sete áreas críticas** simultaneamente (camada unificada, realtime, envio, multimídia, push, read receipts, build). Tentar fazer tudo numa única passada é o cenário com maior risco de regressão — exatamente o que as “regras absolutas” pedem para evitar (não quebrar mobile/desktop, não remover funcionalidades, não declarar sucesso falso).

Quero confirmar **escopo, ordem e cortes seguros** antes de mexer em ~30 arquivos e potencialmente migrações de banco + edge functions + service worker.

## Estado atual (verificado)

Já existe e está em uso parcial:
- `types/conversation.ts`, `useConversationMessages`, `useSendConversationMessage`, `useConversationRealtime`, `useConversationReadStatus`.
- `ConversationComposer`, `ConversationMessageList`, `ConversationMessageBubble`, `ConversationMediaViewer`, `ConversationView`.
- `ConversationComposer` já é usado em `ChannelsView`, `DesktopApp`, `DMChatView`, `GroupChatView` (Fase 1.1 concluída).
- `MessageList`, `MessageBubble`, `DMMessageBubble` ainda são os renderers reais — `ConversationMessageList`/`ConversationMessageBubble` hoje são apenas wrappers finos.

Push hoje:
- `usePushNotifications`, `public/sw.js` existem.
- Não há tabela `push_subscriptions` nem `notification_delivery_logs`; não há edge function `send-push-notification`. Push real está incompleto.

## Plano em fases independentes, cada uma entregável e reversível

Cada fase abaixo termina com app funcional. Posso parar entre fases. **Recomendo executar Fases A→C agora e abrir uma nova sessão para D/E** (push + SW + banco) porque envolve migrações, edge function nova, mudança de SW em produção e diagnóstico iOS — risco diferente e precisa janela própria.

### Fase A — Realtime estável (sem mexer em banco)
- Centralizar a regra “uma subscription por conversa ativa” em `useConversationRealtime`; auditar `useMessages`, `useDirectMessages`, `useDMGroups` para garantir que não abrem canais duplicados quando a view já abriu o seu.
- Dedup determinística por `id` + `client_msg_id` no cache (canal, DM, grupo) antes de aplicar INSERT do realtime.
- Cleanup de subscription ao trocar `conversationId`/`conversationType` (já parcial — formalizar e testar).
- Reconnect: ao `SUBSCRIBED` após disconnect, fetch incremental por `created_at > lastKnown`.
- Throttle de `markAsRead` (≥800ms) e guard “só marca se visível”.
- Sem alteração de SQL/RLS/edge.

### Fase B — Fluxo de envio com estados + retry
- Gerar `client_msg_id` no `useSendConversationMessage` (hoje é passado do composer; centralizar).
- Estados `pending | sent | failed` no `ConversationMessage` (já existe `_raw`; adicionar `deliveryState`).
- Botão discreto de retry no bubble quando `failed` (wrapper, sem trocar visual padrão).
- Anexos: upload antes do insert; falha de upload → mensagem `failed` sem inserir linha.
- Reconciliação por `client_msg_id` (canal e DM já fazem; estender ao grupo).

### Fase C — Multimídia consolidada
- `ConversationMediaViewer` passa a detectar por MIME, fallback extensão.
- Imagem → `ImageLightbox`; vídeo → `VideoPlayer`; áudio → `AudioPlayer` (mantém fallback Safari já existente); PDF → modal/iframe + “abrir em nova aba”; outros → download.
- ESC fecha no desktop, swipe-down fecha no mobile.
- Bubbles (Channel/DM/Group) passam a delegar abertura para o viewer unificado via callback — sem mudar layout do bubble.
- Sem mudança de design.

### Fase D — Push notifications real (precisa banco + edge + SW)
Requer:
- Migração: `push_subscriptions`, `notification_delivery_logs` com GRANTs + RLS (user-only).
- Edge function nova `send-push-notification` (Web Push, VAPID).
- **Necessário**: secrets `VAPID_PUBLIC_KEY` e `VAPID_PRIVATE_KEY` — vou pedir via `add_secret` no início da fase.
- Edge function `notify-message-event` chamada por triggers (DM insert, mention, task assigned) — ou via cron polling de `notifications`, decidir.
- Rewrite controlado de `public/sw.js`: handler `push`, `notificationclick` com foco/abrir, tag por conversa, sem quebrar UpdatePrompt.
- `usePushSubscription` (registrar/atualizar/remover) + painel de diagnóstico em Settings (permissão, SW ativo, subscription, iOS standalone, último sucesso/erro).
- iOS: detectar standalone; se não estiver, mostrar guia em vez de pedir permissão.

### Fase E — Read receipts + não-lidas consistentes
- Consolidar em `useConversationReadStatus` (já existe — preencher gaps).
- Debounce de marcação ao abrir; guard “tab visível + conversa ativa”.
- Optimistic badge clear + revalidação 1200ms (regra já estabelecida).
- Sem mudança de banco.

### Fase F — Build/TS final
- `tsc --noEmit` limpo, imports, query keys, remoção de dead code apenas onde for seguro.

## O que NÃO vou fazer

- Não vou apagar `MessageInput`, `DMMessageInput`, `MessageBubble`, `DMMessageBubble`, `MessageList`, `DMChatView`, `GroupChatView` — continuam como renderers/wrappers.
- Não vou trocar o visual.
- Não vou “simplificar para compilar”.
- Não vou declarar sucesso em fase que não foi validada.

## Decisão que preciso de você

Responda com **uma** das opções:

1. **“Executa A, B, C agora”** — faço as três fases sem tocar em banco/edge/SW; entrego relatório; abrimos nova sessão para D (push) e E (read receipts) com escopo focado.
2. **“Executa só A”** — começo pela mais crítica (realtime) e paro para validar antes de seguir.
3. **“Executa tudo mesmo assim”** — sigo de A a F numa única passada, ciente do risco maior de regressão; nesse caso a Fase D vai exigir que você forneça as chaves VAPID quando eu pedir.
4. **Outra ordem / outro recorte** — me diga qual.

Recomendação: **opção 1**. É a que respeita melhor as “regras absolutas” e me deixa entregar push num passe limpo depois.
