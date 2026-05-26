# Refatoração: Camada Unificada de Conversa

Hoje existem três implementações paralelas de chat — canais (`messages`), DMs (`dm_messages`) e grupos (`dm_group_messages`) — cada uma com seus próprios hooks, componentes de bolha, input, lista e lógica de realtime/read receipts. O objetivo é introduzir uma **camada frontend única** que abstrai a tabela de origem e é reutilizada pelos três fluxos, sem mexer no banco.

## 1. Tipo unificado (`src/types/conversation.ts`)

```ts
export type ConversationType = "channel" | "dm" | "group";

export interface ConversationRef {
  type: ConversationType;
  id: string;                 // channel_id | dm_id | group_id
  workspaceId?: string;       // necessário p/ channel/group
  otherUserId?: string;       // necessário p/ dm
}

export interface ConversationMessage {
  id: string;
  conversationRef: ConversationRef;
  authorId: string;
  authorProfile?: { display_name; avatar_url; ... };
  content: string;
  attachments: Attachment[];
  audioUrl?: string;
  replyToId?: string;
  replyToPreview?: { authorName; content; };
  mentions: string[];
  editedAt?: string;
  deletedAt?: string;
  reactions: Reaction[];
  readBy: ReadReceipt[];
  scheduledFor?: string;
  createdAt: string;
  // flags p/ wrappers visuais existentes
  _raw: any;                  // payload original p/ retrocompatibilidade
}
```

Inclui também `SendMessageInput`, `Attachment`, `Reaction`, `ReadReceipt`, `EditMessageInput` — mesma forma para os 3 tipos.

## 2. Hooks unificados (`src/hooks/`)

Cada hook recebe `ConversationRef` e despacha internamente para a implementação correta. Reaproveitam os hooks existentes por dentro (sem duplicar SQL):

- **`useConversationMessages(ref, opts)`** — wrapper sobre `useInfiniteMessages` (channel) e `useInfiniteDMMessages` (dm/group). Retorna `{ messages: ConversationMessage[], loadMore, hasMore, isLoading }` já normalizado via um `normalizeMessage(ref, raw)`.
- **`useSendConversationMessage(ref)`** — wrapper sobre `useMessages.sendMessage`, `useDirectMessages.sendMessage` e `useDMGroups.sendMessage`. Mesma assinatura `(input: SendMessageInput) => Promise<...>`. Cuida de optimistic update, edit, delete, react, schedule, reply.
- **`useConversationRealtime(ref)`** — assina a tabela certa (`messages` / `dm_messages` / `dm_group_messages`), aplica `INSERT/UPDATE/DELETE` ao cache do React Query usado por `useConversationMessages`, e respeita o padrão atual de fetch de perfil isolado + revalidação 1200 ms (regra de memória).
- **`useConversationReadStatus(ref)`** — unifica leitura/marcação. Internamente reusa `markChannelAsRead`, `markDMAsRead`, `markGroupAsRead` que já existem. Expõe `markAsRead()`, `markAsUnread()`, `readReceipts(messageId)`.

Os hooks legados continuam exportados; novos hooks são fachadas, sem reescrever queries.

## 3. Componentes unificados (`src/components/conversation/`)

- **`ConversationView.tsx`** — orquestra header (delegado por prop), `ConversationMessageList`, `ConversationComposer`, `ConversationMediaViewer`. Recebe `ref: ConversationRef` + slots `headerSlot`, `sidebarSlot`.
- **`ConversationMessageList.tsx`** — extraído de `MessageList`/lista interna de `DMChatView`/`GroupChatView`. Usa `useConversationMessages` + `useConversationRealtime`. Renderiza `ConversationMessageBubble` (novo, baseado em `MessageBubble`, que já cobre quase tudo). Mantém infinite scroll com `scrollTop = scrollHeight` (regra de memória), skeleton shimmer, scroll-to-bottom, swipe-to-reply, highlight de reply.
- **`ConversationComposer.tsx`** — extraído de `MessageInput`/`DMMessageInput`. Inclui: textarea auto-ajustável, toolbar markdown "Aa" colapsável, mentions, anexos (≤5, compressão JPEG), gravação de áudio com fallback webm/mp4/ogg, reply preview, edição, scheduled messages, drag-and-drop, paste, atalhos. Usa `useSendConversationMessage(ref)`.
- **`ConversationMediaViewer.tsx`** — wrapper sobre `ImageLightbox` + `VideoPlayer` + `FilePreview`. Gerencia estado de visualização de mídia.
- **`ConversationMessageBubble.tsx`** (novo, mesma pasta) — versão única da bolha. `MessageBubble.tsx` e `DMMessageBubble.tsx` viram wrappers finos que normalizam a mensagem e delegam.

## 4. Migração dos pontos de uso

- `MessageInput.tsx` → reduzido a `<ConversationComposer ref={{type:"channel",id:channelId,workspaceId}}/>` preservando props públicas atuais.
- `DMMessageInput.tsx` → idem com `{type:"dm",id:dmId,otherUserId}`.
- `GroupChatView.tsx` → usa `ConversationComposer` com `{type:"group",id:groupId,workspaceId}`. A lista de mensagens local do grupo passa a usar `ConversationMessageList`.
- `MessageBubble.tsx` / `DMMessageBubble.tsx` → wrappers de 10–20 linhas chamando `ConversationMessageBubble`.
- `MessageList.tsx` e a lista interna do `DMChatView`/`GroupChatView` podem permanecer como casca fina (header + `ConversationMessageList`) na primeira fase.

## 5. Regras preservadas

- Visual idêntico — reaproveitamos os mesmos componentes filhos (`AudioPlayer`, `LinkPreviewCard`, `MessageActionsMenu`, `ReadReceiptIndicator`, `ImageLightbox`, etc.).
- Nada removido: áudio, anexos, reply, edição, reações, read receipts, mentions, scheduled, threads, pinned, forward, swipe-to-reply, drafts.
- Sem mudanças de banco / RLS / edge functions.
- Componentes não importam mais `supabase` diretamente para mensagens — somente via hooks de conversa.
- Mantém regras de memória: `h-[100dvh]` + `flex-1 min-h-0`, scroll com `scrollTop = scrollHeight`, sem enter animation em IDs temporários, fetch de profile isolado do payload realtime.

## 6. Ordem de implementação (uma só PR grande)

1. `types/conversation.ts` + normalizadores.
2. Hooks (`useConversationMessages`, `useSendConversationMessage`, `useConversationRealtime`, `useConversationReadStatus`) — delegando aos hooks existentes.
3. `ConversationMessageBubble` + `ConversationMediaViewer`.
4. `ConversationMessageList` + `ConversationComposer` + `ConversationView`.
5. Reduzir `MessageBubble`, `DMMessageBubble`, `MessageInput`, `DMMessageInput`, `MessageList` e parte do `GroupChatView` a wrappers.
6. Verificar build, abrir canal/DM/grupo no preview, validar envio de texto, áudio, anexo, reply, edição, reação, mention, scheduled, read receipt.

## 7. Riscos / pontos de atenção

- **Tamanho**: ~5.000 linhas afetadas. A primeira passada manterá os componentes legados como wrappers para evitar regressões; uma segunda passada (futura) pode removê-los de vez.
- **Realtime**: três canais Supabase distintos continuam existindo; a unificação é apenas na API consumida pelo componente.
- **Optimistic updates**: precisam usar a mesma chave de cache que o hook legado correspondente para não duplicar mensagens.
- **Scheduled / threads / pinned**: ficam fora do composer unificado nesta fase (são panels independentes) — apenas o gatilho `ScheduleMessageDialog` é exposto pelo composer.

Posso seguir e implementar?
