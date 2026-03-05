

## Problema

O scroll não vai consistentemente para a última mensagem ao abrir canais, DMs e grupos. O mecanismo atual usa `requestAnimationFrame` duplo + timeout de 150ms, mas isso pode falhar quando o conteúdo demora mais a renderizar (imagens, avatares, etc.). Além disso, o `GroupChatView` ainda usa o método antigo (`scrollIntoView` com timeout de 50ms).

## Plano

### 1. Melhorar scroll inicial em `MessageList.tsx` e `DMChatView.tsx`

- Adicionar múltiplos timeouts escalonados (50ms, 200ms, 500ms) como fallback para garantir que o scroll chegue ao fundo mesmo com conteúdo de carregamento tardio
- Usar `MutationObserver` no container para detectar quando novos elementos DOM são adicionados e re-executar o scroll durante o período inicial de carregamento

### 2. Atualizar `GroupChatView.tsx` com a mesma lógica robusta

- O `GroupChatView` ainda usa `scrollIntoView` com timeout de 50ms — substituir pela mesma lógica de `scrollTop = scrollHeight` com rAF duplo + timeouts escalonados
- Adicionar `ScrollToBottomButton` e `showScrollButton` state (que faltam neste componente)
- Adicionar `wasLoadingRef` pattern igual aos outros componentes

### 3. Abordagem técnica do scroll robusto

Em todos os três componentes, o efeito de scroll inicial será:

```typescript
useEffect(() => {
  if (isLoading) {
    wasLoadingRef.current = true;
  } else if (wasLoadingRef.current) {
    wasLoadingRef.current = false;
    const doScroll = () => {
      if (containerRef.current) {
        containerRef.current.scrollTop = containerRef.current.scrollHeight;
      }
    };
    // Multiple attempts to catch late-rendering content
    requestAnimationFrame(() => requestAnimationFrame(doScroll));
    const t1 = setTimeout(doScroll, 100);
    const t2 = setTimeout(doScroll, 300);
    const t3 = setTimeout(doScroll, 600);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }
}, [isLoading]);
```

### Arquivos a editar
- `src/components/message/MessageList.tsx` — reforçar scroll inicial
- `src/components/dm/DMChatView.tsx` — reforçar scroll inicial  
- `src/components/dm/GroupChatView.tsx` — substituir lógica antiga + adicionar ScrollToBottomButton

