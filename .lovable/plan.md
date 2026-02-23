

## Corrigir Realtime de DMs e Barra de Rolagem

### Problemas Identificados

1. **Mensagens recebidas em DM nao aparecem na conversa aberta**: O realtime subscription em `useInfiniteDMMessages` usa cache update manual (`setQueryData`), mas a mensagem pode nao aparecer se o cache ainda nao foi inicializado (ex: `oldData` e `null` quando a query esta em estado `loading`). Alem disso, o `useSendDMMessage` faz optimistic update + o realtime tambem tenta inserir a mesma mensagem, mas a deduplicacao depende de timing.

2. **Scroll nao vai para o fundo ao abrir conversa**: O `useEffect` com `dm.id` faz `setTimeout(() => bottomRef.current?.scrollIntoView(...), 50)` — mas nesse momento os dados podem ainda estar carregando (`isLoading = true`), entao `bottomRef` nao esta renderizado no DOM. O scroll precisa acontecer **apos** as mensagens serem renderizadas.

3. **Scroll nao acompanha mensagens novas recebidas**: O auto-scroll depende de `messages.length` mudar, mas o `prevMessagesLengthRef` pode ficar dessincronizado quando o `dm.id` muda (o ref e atualizado com `messages.length` do DM anterior que pode ser igual ao novo).

### Solucao

#### 1. Corrigir scroll inicial ao abrir conversa (`DMChatView.tsx`)
- Adicionar um efeito que observa `isLoading` passando de `true` para `false` — e nesse momento faz o scroll instantaneo para o fundo.
- Remover o `setTimeout` fragil de 50ms que nem sempre funciona.

#### 2. Garantir scroll ao receber mensagem nova (`DMChatView.tsx`)  
- Resetar `prevMessagesLengthRef` para 0 quando `dm.id` muda, garantindo que qualquer mensagem carregada sera tratada como "nova".
- Usar `requestAnimationFrame` apos a atualizacao de estado para garantir que o DOM ja renderizou antes de scrollar.

#### 3. Tornar realtime mais robusto (`useInfiniteDMMessages.tsx`)
- Alem do cache update manual, tambem fazer `invalidateQueries` como fallback — se o `setQueryData` falhar por qualquer motivo (cache nulo, timing), a invalidacao forca um refetch completo.
- Isso garante que mesmo em cenarios edge (cache nao inicializado, app em background), as mensagens aparecem.

#### 4. Tambem aplicar as mesmas correcoes no canal (`useInfiniteMessages.tsx` e `MessageList.tsx`)
- As mesmas melhorias de robustez serao aplicadas no fluxo de canais para consistencia.

### Arquivos a Modificar

- `src/components/dm/DMChatView.tsx` — corrigir logica de scroll (inicial + novas mensagens)
- `src/hooks/useInfiniteDMMessages.tsx` — adicionar `invalidateQueries` como fallback no realtime
- `src/hooks/useInfiniteMessages.tsx` — mesma melhoria de robustez  
- `src/components/message/MessageList.tsx` — mesma correcao de scroll

### Detalhes Tecnicos

**DMChatView.tsx — scroll corrigido:**
- Novo `useEffect` que detecta `isLoading` transitando para `false` e executa scroll instantaneo
- `prevMessagesLengthRef.current = 0` ao mudar de DM
- Usar `requestAnimationFrame` para scroll apos render

**useInfiniteDMMessages.tsx — realtime robusto:**
- Apos `setQueryData` no INSERT, adicionar `queryClient.invalidateQueries(...)` com um delay curto como safety net
- Isso garante que se o cache manual falhou, os dados sao refrescados

**useInfiniteMessages.tsx — mesma melhoria:**
- Aplicar o mesmo padrao de invalidacao como fallback

