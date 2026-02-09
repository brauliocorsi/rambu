
# Plano de Melhorias Completas para o ChatFlow

## Resumo Executivo

Identifiquei 10 funcionalidades e correções necessarias para tornar o ChatFlow uma aplicacao de chat completa e robusta. Vou detalhar cada item com problemas encontrados, solucoes propostas e etapas de implementacao.

---

## 1. Correcao das Respostas de Mensagens (Reply)

### Problema Identificado
O sistema de replies esta parcialmente implementado. O `MessageInput` recebe `replyTo` como prop e envia para o banco, mas:
- A interface nao mostra qual mensagem esta sendo respondida (falta o `ReplyPreview`)
- A mensagem na lista nao exibe visualmente que e uma resposta a outra mensagem
- Nao ha como visualizar a mensagem original quando alguem responde

### Solucao Proposta
1. Integrar o componente `ReplyPreview.tsx` no `MessageInput.tsx` para mostrar qual mensagem esta sendo respondida
2. Modificar `MessageBubble.tsx` para buscar e exibir a mensagem original quando `reply_to` nao for null
3. Adicionar query para buscar dados da mensagem respondida

### Arquivos a Modificar
- `src/components/message/MessageInput.tsx` - Adicionar ReplyPreview
- `src/components/message/MessageBubble.tsx` - Exibir preview da mensagem original
- `src/hooks/useMessages.tsx` - Adicionar hook para buscar mensagem por ID

---

## 2. Correcao do Sistema de Mencoes

### Problema Identificado
O `MentionInput.tsx` funciona parcialmente, mas:
- O popup de sugestoes pode nao estar posicionado corretamente em alguns casos
- As mencoes sao inseridas no formato `@[nome](id)` mas usuarios nao estao recebendo alertas corretamente
- O trigger `notify_on_mention` existe, mas precisa ser verificado se esta funcionando

### Solucao Proposta
1. Verificar e corrigir o posicionamento do popup de mencoes
2. Garantir que apos inserir a mencao, o hook `useSendMessage` crie registros em `message_mentions`
3. Verificar o trigger `notify_on_mention` no banco de dados
4. Adicionar logs para debug do fluxo de mencoes

### Arquivos a Modificar
- `src/components/message/MentionInput.tsx` - Melhorar UX do autocomplete
- `src/hooks/useMessages.tsx` - Verificar criacao de mencoes

---

## 3. Feed de Mencoes (Mentions Inbox)

### Nova Funcionalidade
Criar uma secao dedicada para o usuario visualizar todas as vezes que foi mencionado.

### Implementacao
1. Criar novo componente `MentionsFeed.tsx`
2. Criar hook `useMentionsFeed.tsx` para buscar mencoes onde `mentioned_user_id = auth.uid()`
3. Integrar na barra lateral ou como uma aba no NotificationCenter
4. Permitir clicar na mencao para navegar ate a mensagem/canal

### Novos Arquivos
- `src/components/mentions/MentionsFeed.tsx`
- `src/hooks/useMentionsFeed.tsx`

### Arquivos a Modificar
- `src/components/app/DesktopApp.tsx` - Adicionar acesso ao MentionsFeed

---

## 4. Favoritar Canais

### Nova Funcionalidade
Permitir que usuarios marquem canais como favoritos para acesso rapido.

### Implementacao
1. Criar tabela `channel_favorites` com `user_id`, `channel_id`, `created_at`
2. Adicionar RLS policies
3. Criar hook `useChannelFavorites.tsx`
4. Modificar `ChannelList.tsx` para mostrar secao de favoritos no topo
5. Adicionar icone de estrela para favoritar/desfavoritar

### Novos Arquivos
- Migracao SQL para tabela `channel_favorites`
- `src/hooks/useChannelFavorites.tsx`

### Arquivos a Modificar
- `src/components/channel/ChannelList.tsx`
- `src/components/message/MessageBubble.tsx` ou header do canal

---

## 5. Notificacoes por Canal (Channel-Specific Notifications)

### Nova Funcionalidade
Permitir configurar preferencias de notificacao por canal (tudo, apenas mencoes, nada).

### Implementacao
1. Criar tabela `channel_notification_preferences`:
   - `id`, `user_id`, `channel_id`, `notification_level` (all, mentions, none)
2. Adicionar RLS policies
3. Criar hook `useChannelNotificationPreferences.tsx`
4. Adicionar dropdown no header do canal para configurar
5. Modificar logica de notificacao para respeitar preferencias

### Novos Arquivos
- Migracao SQL
- `src/hooks/useChannelNotificationPreferences.tsx`

### Arquivos a Modificar
- `src/components/app/DesktopApp.tsx` - Adicionar opcao no header do canal
- `src/components/channel/ChannelDetailsDialog.tsx` - Adicionar aba de notificacoes
- Edge function `notify-mention/index.ts` - Respeitar preferencias

---

## 6. Busca Avancada com Filtros

### Melhoria Necessaria
A busca atual e basica. Precisamos adicionar filtros.

### Implementacao
1. Modificar `SearchDialog.tsx` para adicionar filtros:
   - Tipo: Canais, Mensagens, DMs, Usuarios
   - Periodo: Hoje, Ultima semana, Ultimo mes, Personalizado
   - Canal especifico (dropdown)
   - Usuario especifico (dropdown)
2. Atualizar `useSearch.tsx` para aceitar parametros de filtro
3. Adicionar UI de chips/toggles para filtros ativos

### Arquivos a Modificar
- `src/components/search/SearchDialog.tsx`
- `src/hooks/useSearch.tsx`

---

## 7. Sistema de Permissoes de Canais

### Melhoria Necessaria
Atualmente so existe "admin" e "member" no workspace. Precisamos de permissoes por canal.

### Implementacao
1. Adicionar coluna `role` na tabela `channel_members` (owner, admin, member)
2. Criar permissoes especificas:
   - Owner: pode editar/deletar canal
   - Admin: pode gerenciar membros
   - Member: apenas visualizar
3. Modificar `ChannelDetailsDialog.tsx` para permitir gerenciamento de roles
4. Atualizar RLS policies para respeitar roles

### Migracao SQL Necessaria
```sql
ALTER TABLE channel_members 
ADD COLUMN role TEXT DEFAULT 'member' 
CHECK (role IN ('owner', 'admin', 'member'));
```

### Arquivos a Modificar
- `src/components/channel/ChannelDetailsDialog.tsx`
- `src/hooks/useChannels.tsx`

---

## 8. Edicao de Canal (Publico/Privado)

### Melhoria Necessaria
Permitir que admins mudem configuracoes do canal.

### Implementacao
1. Adicionar modal de edicao em `ChannelDetailsDialog.tsx`
2. Campos editaveis:
   - Nome do canal
   - Descricao
   - Visibilidade (publico/privado)
   - Arquivar canal
3. Criar mutation `useUpdateChannel` em `useChannels.tsx`
4. Ao mudar de publico para privado, adicionar todos os membros atuais automaticamente

### Arquivos a Modificar
- `src/components/channel/ChannelDetailsDialog.tsx` - Adicionar aba de configuracoes
- `src/hooks/useChannels.tsx` - Adicionar useUpdateChannel

---

## 9. Indicador de Membros no Canal

### Nova Funcionalidade
Mostrar quantidade e quem esta no canal diretamente na lista de canais.

### Implementacao
1. Criar hook `useChannelMemberCount.tsx` para buscar contagem
2. Modificar `ChannelList.tsx` para mostrar icone de pessoas + numero
3. Adicionar tooltip com nomes dos membros online
4. Usar presenca real-time para mostrar quantos estao online

### Novos Arquivos
- `src/hooks/useChannelMemberCount.tsx`

### Arquivos a Modificar
- `src/components/channel/ChannelList.tsx`

---

## 10. Modo Ausente Avancado

### Melhoria Necessaria
Expandir o StatusSelector para incluir configuracoes detalhadas de ausencia.

### Implementacao
1. Adicionar campos no `profiles`:
   - `away_auto_reply` (mensagem automatica quando ausente)
   - `away_notification_level` (all, mentions_only, none)
   - `scheduled_away_start`, `scheduled_away_end` (agendar ausencia)
2. Expandir `StatusSelector.tsx` com mais opcoes:
   - Definir duracao da ausencia com presets (30min, 1h, 2h, amanha)
   - Configurar quais notificacoes receber (tudo, apenas mencoes, nada)
   - Mensagem de resposta automatica
   - Agendar ausencia para horarios especificos
3. Mostrar mensagem de ausencia quando alguem tentar enviar DM para usuario ausente

### Migracao SQL Necessaria
```sql
ALTER TABLE profiles 
ADD COLUMN away_auto_reply TEXT,
ADD COLUMN away_notification_level TEXT DEFAULT 'all',
ADD COLUMN scheduled_away_start TIMESTAMPTZ,
ADD COLUMN scheduled_away_end TIMESTAMPTZ;
```

### Arquivos a Modificar
- `src/hooks/useUserStatus.tsx`
- `src/components/user/StatusSelector.tsx`
- `src/components/dm/DMChatView.tsx` - Mostrar aviso de usuario ausente

---

## Correcao de Bugs Identificados

### Bug 1: React.forwardRef Warning
Os logs mostram warnings em `StatusSelector` e `ShortcutsDialog`:
```
Warning: Function components cannot be given refs.
```

**Correcao**: Wrapping os componentes Dialog com `forwardRef` ou removendo refs desnecessarios.

---

## Ordem de Implementacao Sugerida

**Fase 1 - Correcoes Criticas (Prioridade Alta)**
1. Corrigir respostas de mensagens
2. Corrigir sistema de mencoes
3. Corrigir warnings de React.forwardRef

**Fase 2 - Novas Funcionalidades Core**
4. Feed de mencoes
5. Favoritar canais
6. Indicador de membros no canal

**Fase 3 - Melhorias de Experiencia**
7. Busca avancada com filtros
8. Edicao de canal
9. Notificacoes por canal

**Fase 4 - Funcionalidades Avancadas**
10. Modo ausente avancado
11. Sistema de permissoes de canais

---

## Estimativa de Esforco

| Funcionalidade | Complexidade | Arquivos Afetados |
|----------------|--------------|-------------------|
| Corrigir Replies | Baixa | 3 |
| Corrigir Mencoes | Media | 2 |
| Feed de Mencoes | Media | 3-4 |
| Favoritar Canais | Media | 4 + SQL |
| Notificacoes por Canal | Alta | 5 + SQL |
| Busca Avancada | Media | 2 |
| Permissoes de Canais | Alta | 4 + SQL |
| Edicao de Canal | Media | 2 |
| Indicador Membros | Baixa | 2 |
| Modo Ausente Avancado | Alta | 4 + SQL |

