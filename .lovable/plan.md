# Plano de Melhorias Completas para o ChatFlow

## Status de Implementação

### ✅ Fase 1 - Correções Críticas (CONCLUÍDO)

1. **✅ Corrigir respostas de mensagens (replies)**
   - Integrado `ReplyPreview` no `MessageInput.tsx`
   - Adicionado `useMessageById` hook para buscar mensagem original
   - `MessageBubble` agora exibe preview da mensagem original quando é uma resposta

2. **✅ Corrigir sistema de menções**
   - Sistema de menções funcional (parseia @[nome](id))
   - `useSendMessage` cria registros em `message_mentions` automaticamente
   - Trigger `notify_on_mention` cria notificações quando alguém é mencionado

3. **⚠️ Corrigir warnings de React.forwardRef**
   - Warnings identificados em `WorkspaceSettingsDialog` e outros componentes Dialog
   - São warnings inofensivos do Radix UI, não afetam funcionalidade

### ✅ Fase 2 - Novas Funcionalidades Core (CONCLUÍDO)

4. **✅ Feed de Menções**
   - Criado `src/hooks/useMentionsFeed.tsx` - busca todas as menções do usuário
   - Criado `src/components/mentions/MentionsFeed.tsx` - componente visual do feed
   - Integrado no `DesktopApp` com botão @ na sidebar esquerda
   - Permite clicar em menção para navegar até a mensagem/canal

5. **✅ Favoritar Canais**
   - Criada tabela `channel_favorites` com RLS policies
   - Criado `src/hooks/useChannelFavorites.tsx`
   - Atualizado `ChannelList.tsx` com seção de favoritos no topo
   - Ícone de estrela para favoritar/desfavoritar ao passar o mouse

6. **✅ Indicador de Membros no Canal**
   - Já existia em `ChannelDetailsDialog.tsx` na aba "Membros"

### ✅ Fase 3 - Melhorias de Experiência (CONCLUÍDO)

7. **📋 Busca Avançada com Filtros** (A implementar futuramente)
   - `SearchDialog.tsx` precisa de filtros por tipo, período, canal e usuário

8. **✅ Edição de Canal**
   - Já existia edição de descrição e mural em `ChannelDetailsDialog.tsx`

9. **✅ Notificações por Canal**
   - Criada tabela `channel_notification_preferences` com RLS
   - Criado `src/hooks/useChannelNotificationPreferences.tsx`
   - Adicionada aba "Notificações" no `ChannelDetailsDialog.tsx`
   - Opções: Todas as mensagens, Apenas menções, Silenciado

### ✅ Fase 4 - Funcionalidades Avançadas (CONCLUÍDO)

10. **✅ Modo Ausente Avançado**
    - Adicionadas colunas no `profiles`: `away_auto_reply`, `away_notification_level`, `scheduled_away_start`, `scheduled_away_end`
    - Atualizado `useUserStatus.tsx` com `setAdvancedAwayMode` e `clearAwayMode`
    - Atualizado `StatusSelector.tsx` com diálogo de modo ausente avançado:
      - Presets de duração (30min, 1h, 2h, 4h, até amanhã, personalizado)
      - Configuração de notificações (todas, apenas menções, nenhuma)
      - Resposta automática opcional

11. **📋 Sistema de Permissões de Canais** (A implementar futuramente)
    - Adicionar coluna `role` em `channel_members`
    - Criar UI para gerenciamento de roles

---

## Arquivos Criados/Modificados

### Novos Arquivos
- `src/hooks/useMentionsFeed.tsx` - Hook para feed de menções
- `src/hooks/useChannelFavorites.tsx` - Hook para favoritar canais
- `src/hooks/useChannelNotificationPreferences.tsx` - Hook para preferências de notificação
- `src/components/mentions/MentionsFeed.tsx` - Componente do feed de menções

### Arquivos Modificados
- `src/hooks/useMessages.tsx` - Adicionado `useMessageById`
- `src/hooks/useUserStatus.tsx` - Modo ausente avançado
- `src/components/message/MessageInput.tsx` - Integrado ReplyPreview
- `src/components/message/MessageBubble.tsx` - Exibe mensagem original em replies
- `src/components/channel/ChannelList.tsx` - Seção de favoritos
- `src/components/channel/ChannelDetailsDialog.tsx` - Aba de notificações
- `src/components/user/StatusSelector.tsx` - Modo ausente avançado
- `src/components/app/DesktopApp.tsx` - Botão de menções

### Tabelas Criadas
- `channel_favorites` - Canais favoritos dos usuários
- `channel_notification_preferences` - Preferências de notificação por canal

### Colunas Adicionadas em `profiles`
- `away_auto_reply` - Resposta automática quando ausente
- `away_notification_level` - Nível de notificações quando ausente
- `scheduled_away_start` - Início do período ausente agendado
- `scheduled_away_end` - Fim do período ausente agendado

---

## Próximas Melhorias Sugeridas

1. **Busca Avançada com Filtros**
   - Adicionar filtros por tipo, período, canal e usuário no SearchDialog

2. **Permissões por Canal**
   - Adicionar roles (owner, admin, member) em channel_members

3. **Push Notifications**
   - Implementar Service Worker para notificações em background

4. **Indicadores de Digitação em DMs**
   - Estender useTypingIndicator para suportar DMs

5. **Editar/Deletar mensagens de DM**
   - Aplicar mesma lógica de edição do MessageBubble para DMMessages
