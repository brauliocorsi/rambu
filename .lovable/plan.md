# Plano de melhoria massiva — Rambu

Vou trabalhar em **5 fases sequenciais**. Cada fase é entregue completa antes da próxima, com validação no preview. Você aprova fase a fase ou tudo de uma vez no final.

---

## Fase 1 — Performance & Realtime (base de tudo)

**Objetivo:** app fluido, mensagens instantâneas, zero travas.

- Unificar `useMessages`/`useInfiniteMessages`/`useInfiniteDMMessages` em hook genérico com cache compartilhado.
- Memoizar agressivamente `MessageBubble`, `DMMessageBubble`, `ChannelList`, `DMList` (React.memo + comparators custom).
- Virtualização da lista de mensagens com `@tanstack/react-virtual` para canais com 1000+ msgs (mantém scroll suave).
- Debounce/throttle em: typing indicator, presence, scroll handlers, search.
- Reduzir queries: prefetch profiles em batch, eliminar N+1 nos channel/DM lists.
- **Realtime resiliente**: reconexão automática com backoff, "channel suspended" recovery, fila offline (`offlineQueue.ts`) com retry exponencial.
- Otimistic updates universais: enviar mensagem aparece em <50ms, com indicador "enviando → enviado → entregue → lido".
- Índices SQL faltantes em `messages(channel_id, created_at DESC)`, `dm_messages(dm_id, created_at DESC)`, `notifications(user_id, is_read)`, etc.

## Fase 2 — Mídia & Uploads

**Objetivo:** envio de qualquer arquivo, rápido e bonito.

- **Vídeo**: thumbnail automático (canvas frame extraction), preview inline, player com controles, compressão opcional (ffmpeg.wasm para vídeos >20MB).
- **Imagem**: lightbox com swipe entre múltiplas, zoom pinch, download, botão fechar SEMPRE visível mobile, navegação por teclado.
- **Áudio**: waveform visual, velocidade 1x/1.5x/2x, scrubbing, transcrição opcional via Lovable AI.
- **Upload progress**: barra real por arquivo + agregada, cancelar upload, retry em falha de rede.
- **Drag & drop universal** em qualquer área de chat.
- **Galeria do canal**: aba "Mídia" lista todas imagens/vídeos/arquivos do canal.

## Fase 3 — Gestão de Usuários & Admin (o pedido principal)

**Objetivo:** controle total sobre quem está e quem sai.

### Backend (migrations + edge functions)
- Nova tabela `workspace_bans` (user_id, workspace_id, banned_by, reason, banned_at).
- Nova tabela `user_roles` (escopo global: super_admin) — separada de profiles, com `has_role()` security definer.
- Coluna `is_deleted` em profiles + trigger que substitui display_name por "Usuário removido" e anonimiza nas mensagens.
- Edge function `admin-delete-user`: usa service_role para deletar de `auth.users` em cascata (irreversível).
- Edge function `admin-ban-user`: insere em workspace_bans + remove acessos + revoga sessões via `auth.admin.signOut`.
- RLS bloqueia reentrada em workspace se user está em `workspace_bans`.

### UI (MemberManagementDialog)
- Menu de ação por membro: **Remover** / **Banir** / **Excluir conta**.
- Modal de confirmação com input "digite o nome para confirmar" para ações destrutivas.
- Aba "Banidos" mostra lista, permite desbanir.
- Atribuição em massa a canais: selecionar membros + selecionar canais + 1 click.
- Audit log expandido com todas ações admin.

### Cadastro de usuários
- Validação de força de senha (zxcvbn), HIBP check ativado.
- Avatar gerado automaticamente (initials + cor) se não fornecer.
- Onboarding pós-signup: nome, foto, fuso horário.
- Convite por link com expiração e limite de usos (já existe — refinar UI).

## Fase 4 — Notificações em Tempo Real (3 problemas)

- **Atraso**: subscription pré-conectada no app boot (não apenas ao abrir chat), heartbeat 30s, reconexão silenciosa.
- **Push/som**: service worker rev., `silent: false`, vibração configurável; desbloqueio sonoro garantido no 1º gesto; fallback audio HTML5 se Web Audio falhar.
- **Badges erradas**: refatorar `useUnreadFeed` para usar `channel_read_status` como fonte única, recalcular via SQL view materializada `unread_counts`, sync otimista + revalidação 1s.
- Centro de notificações com agrupamento (3 mensagens de João em #geral → 1 card).
- Notificação por e-mail opcional para menções quando offline >5min (edge function cron).

## Fase 5 — UX Polish

- Loading skeletons em todos lugares ainda com spinners.
- Estados vazios ilustrados.
- Atalhos de teclado expandidos + dialog `?` para descobrir.
- Tema claro/escuro automático por horário.
- Acessibilidade: ARIA labels, focus trap em modais, contraste AA.
- Pull-to-refresh mobile.
- Animações Framer Motion sutis em transições de view.

---

## Detalhes técnicos

```text
Migrations novas:
  - workspace_bans + RLS + trigger de bloqueio de re-join
  - user_roles + has_role() + is_super_admin()
  - profiles.is_deleted + trigger de anonimização
  - índices: messages, dm_messages, dm_group_messages, notifications
  - view: unread_counts (materialized refresh on insert)

Edge functions novas:
  - admin-delete-user (service_role, valida super_admin)
  - admin-ban-user (insere ban + signOut)
  - admin-unban-user
  - send-mention-email (cron, mencionados offline)

Hooks novos / refatorados:
  - useChatMessages (unificado canal/dm/grupo)
  - useVirtualizedMessages
  - useMediaGallery
  - useAdminActions
  - useWorkspaceBans

Pacotes a adicionar:
  - @tanstack/react-virtual (virtualização)
  - zxcvbn (força de senha)
  - @ffmpeg/ffmpeg + @ffmpeg/util (compressão vídeo opcional, lazy)
```

---

## Como prefere prosseguir?

Posso:
1. **Implementar tudo em sequência** num único loop massivo (várias horas de execução, muitos arquivos alterados).
2. **Aprovar fase por fase** — você revisa cada uma antes da próxima.

Recomendo opção 2 para você validar e dar feedback. Confirme qual prefere e eu inicio pela **Fase 1 — Performance & Realtime**.
