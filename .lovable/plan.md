
# Plano: Badges, Fluidez de Mensagens e Realtime

## Problemas Identificados

### 1. Badges nao somem ao entrar na conversa
- No **mobile (DMsView)**, o `markAsRead` e chamado corretamente, mas a invalidacao da query `unread-dm-counts` pode demorar ate 30s para refletir na UI porque `staleTime: 10000` e `refetchInterval: 30000`.
- Apos o `markAsRead.mutate()`, a invalidacao ocorre no `onSuccess`, mas o componente de lista (DMList, ChannelList) pode ja ter sido desmontado (usuario entrou no chat), entao a query invalidada nao refetch imediatamente.
- **Solucao**: Atualizar o cache de unread counts **otimisticamente** ao entrar na conversa (setar count para 0 localmente antes mesmo da mutacao completar).

### 2. Badges sobrepondo texto nos canais
- No `SortableChannel` (CategoryManager), o badge e o nome do canal estao no mesmo `flex` container com `truncate` no nome, mas o badge nao tem `shrink-0`, entao em canais com nomes longos o badge pode ser empurrado ou sobrepor.
- No `ChannelList`, mesmo problema: badge e `ChevronRight` competem por espaço.
- **Solucao**: Adicionar `shrink-0` ao `UnreadBadge` e garantir `min-w-0` no texto + `shrink-0` nos elementos de badge/icone.

### 3. Texto variando formatacao apos envio
- O problema e que a mensagem otimista (temp-) nao tem `profile` completo e quando o realtime chega com os dados reais, o `MessageBubble` re-renderiza com dados diferentes, causando um "flash" visual.
- Alem disso, o `motion.div` com `initial={{ opacity: 0, y: 10 }}` re-anima cada vez que o ID muda (de temp- para real), causando a mensagem "pular".
- **Solucao**: 
  - Usar `layoutId` no motion.div para transicao suave quando o ID muda.
  - Melhor: usar `key` estavel baseado no conteudo+timestamp para evitar re-mount.
  - Remover animacao de entrada para mensagens otimistas (ja aparecem instantaneamente).

### 4. Realtime com setTimeout de 500ms no DM
- `useInfiniteDMMessages` ainda tem o `setTimeout` de 500ms (linha 115-117) que causa refetch desnecessario e possivel duplicacao visual.
- **Solucao**: Remover o setTimeout, confiar na atualizacao otimista do cache.

---

## Mudancas Planejadas

### A. Badges - Limpeza otimista ao entrar na conversa
**Arquivos**: `src/hooks/useNotifications.tsx`
- No `useMarkChannelAsRead`, adicionar `onMutate` que seta otimisticamente `unreadCounts[channelId] = 0` no cache da query `unread-channel-counts`.
- No `useMarkDMAsRead`, idem para `unread-dm-counts`.
- Isso fara o badge sumir instantaneamente ao entrar na conversa.

### B. Badges - Layout correto nos canais
**Arquivos**: `src/components/channel/CategoryManager.tsx`, `src/components/channel/ChannelList.tsx`
- Adicionar `shrink-0` ao componente `UnreadBadge` e aos icones de favorito/chevron.
- Garantir que o `span` do nome do canal tenha `min-w-0 truncate flex-1`.

### C. Mensagens - Estabilizar renderizacao apos envio
**Arquivos**: `src/components/message/MessageBubble.tsx`, `src/components/dm/DMMessageBubble.tsx`
- Remover `initial={{ opacity: 0, y: 10 }}` para mensagens com ID temporario (startsWith "temp-"), evitando re-animacao quando o ID real chega.
- Alternativa: trocar `motion.div` por `div` simples e usar CSS transition para hover, mantendo a UI estavel.

### D. Realtime DM - Remover setTimeout
**Arquivo**: `src/hooks/useInfiniteDMMessages.tsx`
- Remover o `setTimeout` de 500ms (linhas 115-117) que causa invalidacao redundante.

### E. Invalidacao mais agressiva apos envio
**Arquivos**: `src/hooks/useMessages.tsx`, `src/hooks/useDirectMessages.tsx`
- No `onSuccess` do `useSendMessage` e `useSendDMMessage`, invalidar tambem `unread-channel-counts` / `unread-dm-counts` para que outros usuarios vejam o badge atualizado.

---

## Resumo de Arquivos

1. `src/hooks/useNotifications.tsx` - limpeza otimista de badges
2. `src/components/channel/CategoryManager.tsx` - layout de badges
3. `src/components/channel/ChannelList.tsx` - layout de badges
4. `src/components/message/MessageBubble.tsx` - estabilizar animacao
5. `src/components/dm/DMMessageBubble.tsx` - estabilizar animacao
6. `src/hooks/useInfiniteDMMessages.tsx` - remover setTimeout
7. `src/hooks/useMessages.tsx` - invalidacao apos envio
8. `src/hooks/useDirectMessages.tsx` - invalidacao apos envio
