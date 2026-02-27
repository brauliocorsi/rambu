

# Plano: Melhorar Fluidez do Sistema e Fluxo de Notificações

## Problemas Identificados

### 1. Erros no Console
- **ForwardMessageDialog** precisa de `React.forwardRef()` -- o React avisa que refs estao sendo passadas para um componente funcional sem suporte

### 2. Performance das Notificações e Unread Counts
- **useUnreadFeed**: faz queries sequenciais em loop (N+1 queries) para cada canal, DM e grupo -- causa lentidao significativa
- **useUnreadChannelCounts** e **useUnreadDMCounts**: tambem fazem N queries paralelas individuais (uma por canal/DM)
- **useDirectMessages**: faz N+1 queries sequenciais (uma query por DM para buscar perfil + ultima mensagem)

### 3. Fluxo de Notificações -- Gaps
- **Notificações de grupo DM**: o hook `useBrowserNotifications` nao monitora `dm_group_messages`, entao mensagens em grupos nao geram som nem notificação externa
- **Invalidação de cache incompleta**: ao receber nova DM, o `direct-messages` query nao e invalidado (a lista de DMs nao atualiza a ultima mensagem)
- **Notificação duplicada em DMs**: o trigger `notify_on_dm_message` cria notificação in-app E o realtime hook tambem dispara notificação push -- pode resultar em duplicação

### 4. Fluidez da Interface
- **Realtime no useInfiniteMessages**: o `setTimeout` de 500ms para invalidar queries apos INSERT e uma solução fragil que causa re-renders desnecessarios
- **Scroll para baixo**: ao receber nova mensagem pode nao rolar automaticamente se o usuario estiver lendo mensagens antigas

---

## Mudanças Planejadas

### A. Corrigir warning de ref no ForwardMessageDialog
- Adicionar `React.forwardRef` ao componente `ForwardMessageDialog`

### B. Otimizar queries de contagem de nao-lidas
- **useNotifications.tsx**: Consolidar as queries de `useUnreadChannelCounts` para usar batch counting (buscar todas as contagens em menos roundtrips)
- **useDirectMessages.tsx**: Buscar perfis e ultimas mensagens com JOINs em vez de N queries individuais

### C. Completar o fluxo de notificações
- **useBrowserNotifications.tsx**: Adicionar subscription para `dm_group_messages` para que grupos tambem gerem som e notificação
- Invalidar query `direct-messages` ao receber nova DM para atualizar a lista na sidebar
- Invalidar `unread-feed` ao receber novas mensagens para o feed de nao-lidas atualizar automaticamente

### D. Remover invalidação fragil
- **useInfiniteMessages.tsx**: Remover o `setTimeout` de 500ms que faz invalidação redundante -- a atualização otimista do cache ja e suficiente

### E. Melhorar fluidez do DM realtime
- **useDirectMessages.tsx (useDMMessages)**: Adicionar deduplicação na subscription realtime (evitar mensagens duplicadas por otimistic update + realtime)

---

## Detalhes Tecnicos

### Arquivos a modificar:
1. `src/components/message/ForwardMessageDialog.tsx` -- forwardRef
2. `src/hooks/useBrowserNotifications.tsx` -- adicionar channel para dm_group_messages + invalidar direct-messages e unread-feed
3. `src/hooks/useInfiniteMessages.tsx` -- remover setTimeout fallback
4. `src/hooks/useDirectMessages.tsx` -- deduplicação no realtime de DM messages, otimizar fetch com JOINs
5. `src/hooks/useNotifications.tsx` -- invalidar mais queries no realtime

### Impacto esperado:
- Menos queries ao banco (redução de N+1)
- Notificações funcionando para todos os tipos de chat (canal, DM, grupo)
- Sem warnings no console
- Transições mais suaves sem re-fetches desnecessarios
- Feed de nao-lidas atualizado em tempo real

