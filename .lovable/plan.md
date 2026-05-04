# Plano de Melhorias Rambu (sem IA)

São ~30 melhorias. Para evitar uma única entrega monstruosa (alto risco de regressão), proponho dividir em **5 fases incrementais**. Cada fase é entregue, testada e só então passamos à seguinte.

## Fase 1 — UX de mensagens (alto impacto, baixo risco)
1. **Edição inline + histórico** — coluna `edited_at` + tabela `message_edits`; tooltip "(editado)" mostra versão anterior
2. **Status de entrega 3 estados** — ✓ enviado / ✓✓ entregue / ✓✓ azul lido (já temos read receipts, falta diferenciar "entregue")
3. **Swipe-to-reply mobile** — gesto horizontal na bolha de mensagem
4. **Pré-visualização de links (OG)** — edge function `fetch-og-metadata`; cache em `link_previews`; card abaixo da mensagem
5. **Mensagens fixadas (pinned)** — coluna `pinned_at` + painel lateral por canal/DM
6. **Bookmarks (mensagens salvas)** — tabela `saved_messages`; nova view "Salvas"
7. **Drafts persistentes por canal** — `localStorage` keyed por `channelId`/`dmId`
8. **Mensagens efêmeras** — `expires_at`; cron edge function deleta expiradas; toggle no input

## Fase 2 — Mobile / PWA / Offline
9. **Modo offline-first com fila de envio** — IndexedDB (Dexie) guarda mensagens pendentes, retry com backoff
10. **Indicador de conexão** — banner topo: "Offline" / "Reconectando..." / "Online"
11. **Background sync** — service worker pré-carrega últimas mensagens ao receber push
12. **Share Target API** — manifest + handler `/share` para receber texto/imagens de outros apps

## Fase 3 — Organização & produtividade
13. **Quick switcher Cmd+K / Ctrl+K** — modal fuzzy-search sobre canais, DMs, membros (já existe SearchDialog, expandir)
14. **Filtros avançados de busca** — chips: autor, data, tipo de anexo, canal
15. **Snooze de canais** — `snooze_until` em `channel_notification_preferences`; opções rápidas (1h, amanhã, segunda)
16. **Marcadores/labels em mensagens** — tabela `message_labels` (importante, decisão, ação)
17. **Reactions com long-press picker (mobile)** — seletor radial estilo iMessage
18. **Confirmação de leitura expandida** — popover lista quem leu + quando

## Fase 4 — Performance & arquitetura
19. **Virtualização da lista** — `@tanstack/react-virtual` em `MessageList`
20. **Compressão de vídeo client-side** — `@ffmpeg/ffmpeg` WASM antes do upload (vídeos > 5MB)
21. **Service Worker cache de avatares/mídia** — estratégia stale-while-revalidate
22. **Métricas de saúde realtime** — heartbeat + auto-reconnect visual

## Fase 5 — Segurança & polimento
23. **2FA via TOTP** — Supabase Auth MFA + UI de setup com QR
24. **Logs de auditoria do workspace** — tabela `audit_logs` + view admin
25. **Permissões granulares por canal** — expandir `channel_role` (viewer, poster, admin)
26. **Retenção configurável de mensagens** — config por workspace + cron de limpeza
27. **Temas customizáveis** — accent color por workspace (CSS vars dinâmicas)
28. **Acessibilidade total por teclado** — focus rings, navegação setas, ARIA labels

---

## Detalhes técnicos (resumo por fase)

**Fase 1** — migrações:
```sql
ALTER TABLE messages ADD edited_at timestamptz, pinned_at timestamptz, expires_at timestamptz, delivered_at timestamptz;
CREATE TABLE message_edits (id, message_id, previous_content, edited_at);
CREATE TABLE saved_messages (user_id, message_id, dm_message_id, saved_at);
CREATE TABLE link_previews (url PK, title, description, image_url, fetched_at);
```
Edge functions: `fetch-og-metadata`, `delete-expired-messages` (cron 5min).

**Fase 2** — bibliotecas: `dexie`, `workbox-background-sync`. Estrutura: hook `useOfflineQueue` intercepta `useSendMessage` quando `!navigator.onLine`.

**Fase 3** — `cmdk` (já em shadcn). Migração: `ALTER TABLE channel_notification_preferences ADD snooze_until timestamptz;`

**Fase 4** — `@tanstack/react-virtual`, `@ffmpeg/ffmpeg`, `@ffmpeg/util`. Estimar +2MB no bundle (lazy-loaded).

**Fase 5** — Supabase Auth MFA já suportado; UI custom. Migrações: `audit_logs`, expansão de `channel_role` enum.

---

## Estratégia de entrega
- **Esta resposta entrega apenas a Fase 1** (8 melhorias) para garantir qualidade.
- Após validação, prossigo automaticamente Fase 2 → 5 em mensagens seguintes, sem nova aprovação (a menos que peça pausa).
- Cada fase termina com nota explicando o que foi feito e como testar.

## Sem incluir
- Itens 10, 11, 12 e 32–34 da lista original (transcrição, tradução, resumo IA, smart replies, detecção de tarefas, reescrever tom) — todos dependem de IA, conforme pedido.

Posso começar pela Fase 1?
