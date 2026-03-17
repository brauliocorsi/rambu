

## Plano: Auto-atribuição em Templates + Tarefas com Checklist Recorrentes

### Contexto Atual
O sistema de tarefas permite criar templates com campos dinâmicos e atribuir manualmente a membros ao enviar. Não existe conceito de auto-atribuição no template nem checklists ou recorrência.

---

### 1. Auto-atribuição em Templates de Tarefa

**Objetivo:** Ao criar um template, o criador pode pré-configurar pessoas que serão automaticamente atribuídas sempre que o fluxo for usado.

**Database:**
- Nova tabela `task_template_assignees` com colunas: `id`, `template_id` (ref task_templates), `user_id`, `created_at`
- RLS: template creator pode inserir/deletar; workspace members podem ler

**UI - CreateTaskTemplateDialog:**
- Adicionar seção "Auto-atribuição" com lista de membros do workspace (checkboxes), similar ao que já existe no TaskFormDialog
- Guardar os user_ids selecionados na nova tabela ao criar o template

**UI - TaskFormDialog:**
- Ao abrir um template que tem auto-assignees, pré-preencher `selectedAssignees` com esses users
- O utilizador ainda pode adicionar/remover antes de enviar

**Hooks:**
- `useTaskTemplateAssignees(templateId)` — busca assignees pré-configurados
- Atualizar `useCreateTaskTemplate` para aceitar `defaultAssignees: string[]`

---

### 2. Tarefas com Checklist Programadas e Recorrentes

**Objetivo:** Criar tarefas que contêm uma lista de itens (checklist) e que podem ser agendadas e repetidas automaticamente.

**Database:**
- Nova tabela `task_checklist_items`: `id`, `task_instance_id`, `label` (text), `is_checked` (bool default false), `checked_by` (uuid nullable), `checked_at` (timestamptz nullable), `position` (int), `created_at`
- RLS: channel members podem ler; assignees e creator podem update (check/uncheck)

- Nova tabela `task_recurrence_rules`: `id`, `template_id`, `channel_id`, `created_by`, `cron_expression` (text — ex: "0 9 * * 1" para segunda às 9h), `auto_assignees` (jsonb array de user_ids), `is_active` (bool default true), `next_run_at` (timestamptz), `last_run_at` (timestamptz nullable), `created_at`
- RLS: creator pode CRUD; workspace members podem ler

- Adicionar campo `checklist_items` (jsonb) na tabela `task_templates` para guardar items default do checklist no template

**UI - CreateTaskTemplateDialog:**
- Nova seção "Checklist" onde o utilizador pode adicionar itens de checklist ao template (similar aos campos dinâmicos)
- Toggle "Tarefa recorrente" com opções: diária, semanal (selecionar dia), mensal (selecionar dia do mês), ou cron personalizado
- Selector de canal e hora de envio

**UI - TaskCard:**
- Renderizar checklist com checkboxes interativos
- Barra de progresso mostrando X/Y itens concluídos
- Cada item mostra quem marcou e quando

**UI - TaskFormDialog:**
- Mostrar checklist items pré-configurados do template (editáveis antes de enviar)
- Permitir adicionar/remover items antes de submeter

**Edge Function - process-recurring-tasks:**
- Nova edge function que roda via cron (a cada minuto)
- Busca regras de recorrência ativas onde `next_run_at <= now()`
- Para cada regra: cria uma nova task_instance com os checklist items, envia mensagem no canal, atribui aos auto-assignees
- Atualiza `next_run_at` baseado na expressão cron

---

### Ficheiros a criar/editar

**Novos:**
- Migration SQL (tabelas + RLS)
- `src/hooks/useTaskTemplateAssignees.tsx`
- `src/hooks/useTaskChecklist.tsx`
- `src/hooks/useTaskRecurrence.tsx`
- `supabase/functions/process-recurring-tasks/index.ts`

**Editar:**
- `src/components/tasks/CreateTaskTemplateDialog.tsx` — auto-assignees + checklist items + recorrência
- `src/components/tasks/TaskFormDialog.tsx` — pré-preencher assignees + mostrar checklist editável
- `src/components/tasks/TaskCard.tsx` — renderizar checklist interativo
- `src/hooks/useTaskTemplates.tsx` — incluir checklist_items no template
- `src/hooks/useTaskInstances.tsx` — criar checklist items ao criar instância
- `supabase/config.toml` — registrar nova edge function

