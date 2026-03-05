

# Tarefas com Fluxos Personalizados nos Canais

## Conceito

Sistema de **templates de tarefas** (fluxos) reutilizaveis com campos customizaveis. O usuario cria um template uma vez e pode invoca-lo em qualquer canal para preencher um formulario estruturado que gera uma tarefa visivel no chat.

## Estrutura de Dados (5 novas tabelas)

### 1. `task_templates` - Templates de fluxo
- `id`, `workspace_id`, `created_by`, `name`, `description`, `created_at`

### 2. `task_template_fields` - Campos do template
- `id`, `template_id`, `field_type` (text, number, textarea, attachment), `label`, `is_required`, `position`

### 3. `task_instances` - Tarefas criadas a partir de templates
- `id`, `template_id`, `channel_id`, `created_by`, `assigned_to` (nullable), `status` (pending, approved, rejected, completed), `requires_approval`, `reminder_at`, `message_id` (referencia a mensagem no chat), `created_at`

### 4. `task_field_values` - Valores preenchidos
- `id`, `task_instance_id`, `template_field_id`, `value_text`, `value_number`, `file_url`, `file_name`

### 5. `task_approvals` - Historico de aprovacoes/rejeicoes
- `id`, `task_instance_id`, `user_id`, `action` (approved/rejected), `comment`, `created_at`

## Componentes a Criar

### Gerenciamento de Templates
- `src/components/tasks/CreateTaskTemplateDialog.tsx` - Dialog para criar/editar templates com campos dinamicos (arrastar para reordenar)
- `src/components/tasks/TaskTemplateList.tsx` - Lista de templates do workspace
- `src/hooks/useTaskTemplates.tsx` - CRUD de templates e campos

### Invocacao no Chat
- `src/components/tasks/TaskFormDialog.tsx` - Dialog com formulario dinamico baseado no template selecionado (campos text, number, textarea, upload). Opcoes de atribuir usuario, pedir aprovacao, e definir lembrete.
- `src/components/tasks/TaskPicker.tsx` - Seletor de templates (aparece ao digitar `/tarefa` ou via botao no MessageInput)

### Exibicao no Chat
- `src/components/tasks/TaskCard.tsx` - Card especial renderizado dentro do MessageBubble quando a mensagem tem uma tarefa associada. Mostra campos preenchidos, status, botoes de aprovar/rejeitar.

### Hooks
- `src/hooks/useTaskInstances.tsx` - Criar tarefas, buscar por canal, aprovar/rejeitar, completar

## Fluxo do Usuario

1. **Criar template**: Menu do workspace ou canal → "Criar Fluxo de Tarefa" → Define nome + campos (texto, numero, descricao, anexo) → Salva
2. **Usar no chat**: No MessageInput, botao de tarefas ou `/tarefa` → Seleciona template → Preenche formulario → Opcionalmente atribui usuario e pede aprovacao → Envia
3. **Mensagem especial**: No chat aparece um card com os dados preenchidos, status, e botoes de acao
4. **Aprovar/Rejeitar**: Usuario atribuido ou qualquer membro com permissao pode aprovar/rejeitar direto no card

## Integracao com MessageInput

Adicionar botao de "Tarefas" (icone ClipboardList) ao lado dos botoes existentes (Anexar, Emoji, Agendar, Audio). Ao clicar, abre o TaskPicker para selecionar um template.

## Arquivos a Criar
1. `src/hooks/useTaskTemplates.tsx`
2. `src/hooks/useTaskInstances.tsx`
3. `src/components/tasks/CreateTaskTemplateDialog.tsx`
4. `src/components/tasks/TaskTemplateList.tsx`
5. `src/components/tasks/TaskFormDialog.tsx`
6. `src/components/tasks/TaskPicker.tsx`
7. `src/components/tasks/TaskCard.tsx`

## Arquivos a Modificar
1. `src/components/message/MessageInput.tsx` - Adicionar botao de tarefas
2. `src/components/message/MessageBubble.tsx` - Renderizar TaskCard quando mensagem tem tarefa
3. `src/components/dm/DMMessageInput.tsx` - Opcional: suporte em DMs
4. `src/components/app/views/ChannelsView.tsx` - Acesso ao gerenciamento de templates

## Migracoes SQL
- Criar as 5 tabelas com RLS policies (apenas membros do workspace podem ver/criar templates; apenas participantes do canal veem tarefas)
- Enum `task_status` (pending, approved, rejected, completed)
- Enum `task_field_type` (text, number, textarea, attachment)

## Escopo Inicial Recomendado

Dado a complexidade, sugiro implementar em 2 fases:

**Fase 1** (esta implementacao):
- Tabelas + RLS
- CRUD de templates com campos
- Formulario de preenchimento no chat
- TaskCard no MessageBubble
- Atribuicao a usuario

**Fase 2** (futuro):
- Aprovacao/rejeicao com historico
- Lembretes integrados
- Dashboard de tarefas pendentes
- Filtros e busca de tarefas

