

# Plano de Implementação: Funcionalidades Faltantes do ChatFlow

## Resumo da Situação Atual

Após análise completa do código, identifiquei que várias funcionalidades existem apenas como **botões visuais sem ação** (placeholders). As seguintes features precisam ser implementadas:

| Feature | Status Atual |
|---------|-------------|
| Configurações | Botão sem ação |
| Notificações (tela) | Apenas visual estático |
| Modo Escuro | Botão sem ação |
| Edição de Perfil | Botão sem ação |
| Troca de Foto | Não implementado |
| Busca de Mensagens | Não implementado |
| Convite via Link | Não implementado |
| Novo Workspace (Home) | Botão sem ação |
| Gestão de Workspace | Não implementado |
| Sistema de Roles/Permissões | Parcial (apenas admin/member básico) |

---

## Fase 1: Sistema de Tema (Modo Escuro)

**Arquivos a criar/modificar:**
- `src/contexts/ThemeContext.tsx` - Novo contexto para gerenciar tema
- `src/App.tsx` - Integrar ThemeProvider
- `src/components/app/MainApp.tsx` - Conectar toggle ao contexto

**Implementação:**
- Usar `next-themes` (já instalado) para gerenciar dark/light mode
- Persistir preferência no localStorage
- Aplicar classe `.dark` no HTML root

---

## Fase 2: Tela de Configurações Completa

**Arquivos a criar/modificar:**
- `src/components/settings/SettingsView.tsx` - Tela principal
- `src/components/settings/NotificationSettings.tsx` - Preferências de notificação
- `src/components/settings/ProfileSettings.tsx` - Edição de perfil e foto
- `src/hooks/useProfile.tsx` - Hook para atualizar perfil

**Funcionalidades:**
- Toggle de modo escuro funcional
- Configurações de notificações (som, badges, etc.)
- Edição de nome de exibição
- Upload de foto de perfil (usando o bucket existente)
- Status personalizado

---

## Fase 3: Busca de Mensagens

**Arquivos a criar/modificar:**
- `src/components/search/SearchDialog.tsx` - Modal de busca global
- `src/hooks/useSearch.tsx` - Hook para buscar mensagens e usuários
- Atualizar `Header.tsx` e `DesktopApp.tsx` para conectar busca

**Funcionalidades:**
- Busca em mensagens de canais
- Busca em DMs
- Busca de usuários/membros
- Filtros por canal/data

---

## Fase 4: Sistema de Convites por Link

**Arquivos a criar/modificar:**
- `supabase/migrations/...` - Tabela `workspace_invites`
- `src/components/workspace/InviteLinkDialog.tsx` - Gerar/gerenciar links
- `src/pages/JoinWorkspace.tsx` - Página para aceitar convites
- `src/hooks/useWorkspaceInvites.tsx` - Lógica de convites

**Schema da tabela:**
```text
workspace_invites:
- id (uuid)
- workspace_id (uuid)
- invite_code (text, único)
- created_by (uuid)
- expires_at (timestamp)
- max_uses (integer)
- uses_count (integer)
- is_active (boolean)
```

---

## Fase 5: Gestão de Workspace e Sistema de Permissões

**Arquivos a criar/modificar:**
- `supabase/migrations/...` - Expandir roles (owner, admin, member)
- `src/components/workspace/WorkspaceSettingsDialog.tsx` - Configurações do workspace
- `src/components/workspace/MemberManagementDialog.tsx` - Gerenciar membros
- `src/hooks/useWorkspacePermissions.tsx` - Verificar permissões

**Sistema de Roles:**
```text
Roles disponíveis:
- owner: Criador do workspace (pode tudo, incluindo deletar)
- admin: Pode gerenciar membros, canais, promover outros admins
- member: Pode participar de canais, enviar mensagens

Permissões:
- Criar canais: owner, admin
- Gerenciar membros: owner, admin  
- Promover admins: owner
- Criar workspaces: todos os usuários autenticados
- Editar workspace: owner, admin
- Deletar workspace: owner apenas
```

**Componentes de UI:**
- Lista de membros com roles
- Botões de promover/rebaixar
- Botão de remover membro
- Transferir ownership

---

## Fase 6: Conectar Botões da Home

**Arquivos a modificar:**
- `src/components/app/MainApp.tsx` - HomeView

**Ações:**
- "Nova Mensagem" → Abrir NewDMDialog
- "Convidar" → Abrir InviteLinkDialog
- "Novo Workspace" → Abrir CreateWorkspaceDialog

---

## Detalhes Técnicos

### Atualizações de Banco de Dados

```text
1. Tabela workspace_invites (nova):
   - id, workspace_id, invite_code, created_by
   - expires_at, max_uses, uses_count, is_active
   - RLS: admins podem criar/gerenciar

2. Tabela workspace_members (atualização):
   - Adicionar role 'owner' ao enum workspace_role
   - Migrar criadores existentes para 'owner'

3. Funções helper:
   - is_workspace_owner(workspace_id)
   - get_user_workspace_role(workspace_id)
```

### Fluxo de Permissões

O sistema irá verificar permissões em tempo real usando funções SQL `SECURITY DEFINER` para evitar recursão de RLS:

```text
is_workspace_owner(id) → boolean
is_workspace_admin(id) → boolean (inclui owner)
can_manage_members(id) → boolean
can_create_channels(id) → boolean
```

### Upload de Foto de Perfil

Reutilizar o bucket `message-attachments` ou criar um bucket dedicado `avatars`:
- Limite de 2MB para fotos de perfil
- Formatos aceitos: JPEG, PNG, WebP
- Atualizar campo `avatar_url` na tabela `profiles`

---

## Ordem de Implementação Recomendada

1. **Fase 1** - Modo Escuro (rápido, alto impacto visual)
2. **Fase 2** - Configurações e Perfil (funcionalidades do usuário)
3. **Fase 6** - Conectar botões Home (quick wins)
4. **Fase 5** - Sistema de Permissões (base para outras features)
5. **Fase 4** - Convites por Link (depende de permissões)
6. **Fase 3** - Busca de Mensagens (feature completa)

---

## Estimativa de Complexidade

| Fase | Complexidade | Arquivos Novos | Migrações |
|------|--------------|----------------|-----------|
| 1 | Baixa | 1 | 0 |
| 2 | Média | 4 | 0 |
| 3 | Média | 2 | 0 |
| 4 | Alta | 4 | 1 |
| 5 | Alta | 3 | 1 |
| 6 | Baixa | 0 | 0 |

