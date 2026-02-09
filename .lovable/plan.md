

# Plano de Implementação: Ações de Mensagem, Membros Online e Upload Múltiplo

## Resumo

Este plano implementa três funcionalidades principais:
1. **Botões de ação nas mensagens**: marcar como não lido, lembrar para depois, copiar e encaminhar
2. **Visualização de membros online no header do canal**
3. **Upload de até 5 arquivos simultâneos**

---

## 1. Botões de Ação nas Mensagens

### Funcionalidades
- **Marcar como não lido**: Atualiza o `last_read_at` para antes da mensagem selecionada
- **Lembrar-me depois**: Cria um lembrete com agendamento (1h, 3h, amanhã)
- **Copiar mensagem**: Copia o conteúdo para a área de transferência
- **Encaminhar mensagem**: Abre dialog para selecionar destino (canal/DM)

### Componentes Afetados
- `MessageBubble.tsx` - Canais
- `DMMessageBubble.tsx` - Mensagens diretas
- `GroupChatView.tsx` - Grupos

### Design Visual
Os botões aparecerão no hover junto com os existentes (reação, responder, thread):
- `MailQuestion` - Marcar como não lido
- `Clock` - Lembrar depois
- `Copy` - Copiar
- `Forward` - Encaminhar

### Nova Tabela de Banco de Dados

```text
message_reminders
├── id (uuid, PK)
├── user_id (uuid, FK → profiles)
├── message_id (uuid, nullable) - para mensagens de canal
├── dm_message_id (uuid, nullable) - para DMs
├── group_message_id (uuid, nullable) - para grupos
├── remind_at (timestamp)
├── is_completed (boolean, default false)
├── created_at (timestamp)
```

---

## 2. Visualização de Membros Online no Header do Canal

### Funcionalidade
- Botão de membros no header do canal que expande para mostrar lista
- Membros online aparecem primeiro com indicador de status
- Utiliza dados existentes de `useChannelMembers` e `usePresence`

### Componentes Afetados
- Criar `ChannelMembersPopover.tsx` - novo componente
- Modificar o header nas views de canal para incluir o popover

### Design Visual
```text
[# Canal Nome]  [🔍] [👥 5 online] [⚙️]
                       ↓ (click)
     ┌─────────────────────────────┐
     │ 👤 João Silva      🟢 Online │
     │ 👤 Maria Santos    🟢 Online │
     │ 👤 Pedro Costa     🟡 Ausente│
     │ 👤 Ana Lima        ⚫ Offline│
     └─────────────────────────────┘
```

---

## 3. Upload de Múltiplos Arquivos (até 5)

### Funcionalidade
- Permitir seleção de até 5 arquivos simultaneamente
- Mostrar preview de todos os arquivos selecionados
- Upload em paralelo ou sequencial
- Validação de limite (erro se tentar mais de 5)

### Componentes Afetados
- `MessageInput.tsx` - Canais
- `DMMessageInput.tsx` - DMs
- `useFileUpload.tsx` - Hook de upload

### Alterações no Input
- Adicionar `multiple` ao input de arquivo
- Gerenciar array de `UploadedFile[]` ao invés de único arquivo
- Grid de previews com botão de remover individual

---

## Detalhes Técnicos

### 1. Hook para Marcar como Não Lido

```typescript
// Novo hook: useMarkAsUnread.tsx
function useMarkChannelAsUnread() {
  // Atualiza channel_read_status.last_read_at 
  // para 1 segundo antes do created_at da mensagem
}

function useMarkDMAsUnread() {
  // Mesmo conceito para dm_read_status
}
```

### 2. Hook para Lembretes

```typescript
// Novo hook: useMessageReminders.tsx
function useCreateReminder() {
  // Insere na tabela message_reminders
}

function useReminders() {
  // Lista lembretes pendentes do usuário
}
```

### 3. Dialog de Encaminhar Mensagem

```typescript
// Novo componente: ForwardMessageDialog.tsx
// - Lista canais e DMs disponíveis
// - Permite selecionar destino
// - Envia mensagem com prefixo "[Encaminhado de @user]"
```

### 4. Modificação do useFileUpload

```typescript
// Alteração para suportar múltiplos arquivos
function useFileUpload() {
  const uploadFiles = async (files: File[]): Promise<UploadedFile[]> => {
    // Validar limite de 5 arquivos
    // Upload em paralelo com Promise.all
    // Retornar array de arquivos enviados
  };
}
```

---

## Arquivos a Criar

| Arquivo | Descrição |
|---------|-----------|
| `src/hooks/useMarkAsUnread.tsx` | Hook para marcar mensagens como não lidas |
| `src/hooks/useMessageReminders.tsx` | Hook para gerenciar lembretes |
| `src/components/message/MessageActionsMenu.tsx` | Menu de ações compartilhado |
| `src/components/message/ForwardMessageDialog.tsx` | Dialog para encaminhar |
| `src/components/message/RemindMeDialog.tsx` | Dialog para agendar lembrete |
| `src/components/channel/ChannelMembersPopover.tsx` | Popover de membros online |

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/components/message/MessageBubble.tsx` | Adicionar botões de ação |
| `src/components/dm/DMMessageBubble.tsx` | Adicionar botões de ação |
| `src/components/dm/GroupChatView.tsx` | Adicionar botões de ação |
| `src/components/message/MessageInput.tsx` | Suporte a múltiplos arquivos |
| `src/components/dm/DMMessageInput.tsx` | Suporte a múltiplos arquivos |
| `src/hooks/useFileUpload.tsx` | Função para upload múltiplo |
| `src/hooks/useMessages.tsx` | Integrar envio de múltiplos arquivos |

## Migração de Banco de Dados

```sql
-- Tabela de lembretes de mensagem
CREATE TABLE public.message_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  message_id UUID REFERENCES public.messages(id) ON DELETE CASCADE,
  dm_message_id UUID REFERENCES public.dm_messages(id) ON DELETE CASCADE,
  group_message_id UUID REFERENCES public.dm_group_messages(id) ON DELETE CASCADE,
  remind_at TIMESTAMP WITH TIME ZONE NOT NULL,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  CONSTRAINT message_reminder_one_type CHECK (
    (message_id IS NOT NULL)::int + 
    (dm_message_id IS NOT NULL)::int + 
    (group_message_id IS NOT NULL)::int = 1
  )
);

-- RLS Policies
ALTER TABLE public.message_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own reminders"
  ON public.message_reminders
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Índices
CREATE INDEX idx_message_reminders_user ON public.message_reminders(user_id);
CREATE INDEX idx_message_reminders_remind_at ON public.message_reminders(remind_at) WHERE is_completed = false;
```

---

## Ordem de Implementação

1. **Migração do banco** - Criar tabela `message_reminders`
2. **Hooks** - `useMarkAsUnread`, `useMessageReminders`
3. **Componentes de ação** - `MessageActionsMenu`, `ForwardMessageDialog`, `RemindMeDialog`
4. **Integrar nas bolhas** - `MessageBubble`, `DMMessageBubble`, grupos
5. **Membros online** - `ChannelMembersPopover` e integração no header
6. **Upload múltiplo** - Modificar `useFileUpload` e inputs

