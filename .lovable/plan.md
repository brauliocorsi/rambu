
# Plano: Adicionar Lembretes no Modo Desktop

## Problema
No modo desktop, não existe acesso à visualização de lembretes. O botão com ícone de relógio (`Clock`) mostra apenas mensagens agendadas para envio, não os lembretes de mensagens.

## Solução
Adicionar um botão na barra lateral esquerda do desktop que abre um popover com o feed de lembretes, similar aos botões de Menções e Não Lidas.

---

## Alterações

### Arquivo: `src/components/app/DesktopApp.tsx`

**Adicionar imports:**
```typescript
import { Bell } from "lucide-react";
import { useReminders } from "@/hooks/useMessageReminders";
import { RemindersFeed } from "@/components/reminders/RemindersFeed";
```

**Adicionar estado:**
```typescript
const [showReminders, setShowReminders] = useState(false);
const { data: pendingReminders = [] } = useReminders();
```

**Adicionar botão com Popover na barra lateral:**
```text
Posição: Após o botão de Mensagens Agendadas (ScheduledMessagesList)

[🌙] Theme toggle
[@ ] Menções
[📥] Não Lidas  
[⏰] Agendadas     ← botão existente
[🔔] Lembretes    ← NOVO BOTÃO
[🔔] Notificações
[⚙️] Configurações
```

**Estrutura do novo botão:**
- Ícone: `Bell`
- Badge: Quantidade de lembretes pendentes
- Ao clicar: Abre popover com `RemindersFeed`

---

## Design Visual

```text
[🔔] Lembretes (3)
       ↓ (click)
┌──────────────────────────────────┐
│ 🔔 Lembretes                     │
├──────────────────────────────────┤
│ [Pendentes] [Concluídos]        │
│                                  │
│ 📝 João em #geral               │
│    "Mensagem importante..."      │
│    ⏰ Em 2 horas                 │
│                                  │
│ 📝 Maria (DM)                   │
│    "Não esquecer de..."          │
│    ⏰ Amanhã às 09:00            │
└──────────────────────────────────┘
```

---

## Código a Adicionar

Na barra lateral, logo após `ScheduledMessagesList`:

```tsx
{/* Reminders Button */}
<Popover open={showReminders} onOpenChange={setShowReminders}>
  <PopoverTrigger asChild>
    <Button
      variant="ghost"
      size="icon"
      className="rounded-xl relative"
    >
      <Bell className="h-5 w-5" />
      {pendingReminders.length > 0 && (
        <span className="absolute -top-1 -right-1">
          <UnreadBadge count={pendingReminders.length} size="sm" />
        </span>
      )}
    </Button>
  </PopoverTrigger>
  <PopoverContent side="right" align="start" className="w-96 p-0 rounded-xl">
    <RemindersFeed />
  </PopoverContent>
</Popover>
```

---

## Resumo de Alterações

| Arquivo | Alteração |
|---------|-----------|
| `src/components/app/DesktopApp.tsx` | Adicionar import de `Bell`, `useReminders`, `RemindersFeed`; adicionar estado `showReminders`; adicionar botão Popover para lembretes |

---

## Resultado Esperado
- Botão de sino (🔔) aparece na barra lateral do desktop
- Badge mostra quantidade de lembretes pendentes
- Ao clicar, abre popover com abas de pendentes/concluídos
- Usuário pode editar ou deletar lembretes diretamente do popover
