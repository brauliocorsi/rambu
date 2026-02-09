# Plano: Funcionalidades Avançadas ChatFlow

## Status: Em Progresso ✅

## Fases Implementadas

### ✅ Fase 7: Presença Online/Offline em Tempo Real
- Hook `usePresence.tsx` criado
- Componente `OnlineIndicator.tsx` criado
- `AvatarWithStatus` para mostrar status em avatars
- Integração com DMList
- Heartbeat a cada 30s para atualizar last_seen
- Suporte para status: online, away, busy, offline

### ✅ Fase 1: Typing Indicator
- Hook `useTypingIndicator.tsx` criado
- Componente `TypingIndicator.tsx` atualizado
- Integrado em `DesktopApp.tsx` para canais
- Usa Supabase Realtime Broadcast (sem persistência)
- Debounce de 1 segundo

### ✅ Fase 4: Modo Ausente e DND
- Hook `useUserStatus.tsx` criado
- Componente `StatusSelector.tsx` criado
- Pausa de notificações por tempo determinado
- Mensagem de ausência personalizada

### ✅ Fase 5: Respostas Rápidas
- Hook `useQuickReplies.tsx` criado
- Componente `QuickRepliesSettings.tsx` criado
- Integrado em `MessageInput.tsx`
- Atalhos como /obg -> texto completo
- Autocomplete no input

### ✅ Fase 6: Atalhos de Teclado
- Hook `useKeyboardShortcuts.tsx` criado
- Componente `ShortcutsDialog.tsx` criado
- Atalhos globais configurados:
  - Cmd+K: Busca global
  - Cmd+N: Nova DM
  - Cmd+Shift+N: Novo canal
  - Cmd+/: Ver atalhos
  - Cmd+,: Configurações
  - Esc: Fechar modais

### ✅ Configurações Atualizadas
- Seção de Status adicionada
- Aba de Respostas Rápidas
- Botão de Atalhos

## Banco de Dados Atualizado

```sql
-- Adicionado à tabela profiles:
- last_seen TIMESTAMPTZ
- do_not_disturb BOOLEAN
- dnd_until TIMESTAMPTZ
- away_message TEXT

-- Adicionado à tabela notification_preferences:
- push_notifications BOOLEAN

-- Nova tabela quick_replies criada
-- Realtime habilitado para profiles
```

## Próximas Fases

### 🔲 Fase 2: Push Notifications
- Service Worker para notificações em background
- Integrar Web Notifications API

### 🔲 Fase 3: Gestão de Workspace
- Editar nome, descrição, ícone
- Deletar workspace

### 🔲 Fase 8: Mural do Canal
- Conteúdo fixado no topo
- Histórico de edições

### 🔲 Fase 9: Detalhes do Canal
- Lista de membros
- Ações de convite/saída

### 🔲 Fase 10: Emoji Picker Completo
- Categorias de emojis
- Busca por nome
- Emojis recentes
