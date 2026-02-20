
## Visão Geral das Melhorias

Respondo primeiro sua pergunta sobre Windows: como a aplicação é uma **PWA (Progressive Web App)**, qualquer atualização feita aqui é aplicada automaticamente quando o usuário recarregar o app instalado, seja no Windows, Android ou iOS. Não é necessário reinstalar.

---

## Problemas Identificados

### 1. Notificações Confusas e Duplicadas
O sistema atual tem **três camadas de notificação sobrepostas** sem organização clara:
- `useInAppNotifications` — notificações do banco com sino (Bell)
- `useBrowserNotifications` — notificações browser em tempo real (Realtime)
- `useMentionsFeed` — menções separadas
- `useUnreadFeed` — feed de não lidas

O resultado: o sino (Bell) mostra notificações de canais, menções, e DMs misturados — e o `notify_on_channel_message` ainda notifica **todos os membros do workspace** em vez de apenas os membros do canal!

### 2. Badge de Contagem nos Canais
A `ChannelList` (desktop) já passa `unreadCounts` via props, mas a `CategoryManager` que renderiza os canais precisa exibir os badges corretamente dentro dos grupos de categoria.

### 3. Fluidez
- A `useUnreadChannelCounts` faz N chamadas sequenciais (uma por canal) em vez de uma query agregada — causa lentidão perceptível.

---

## Plano de Implementação

### Parte 1 — Corrigir Fluxo de Notificações (Organizado por Tipo)

**Estrutura clara que será implementada:**

```text
SINO (Bell) = Notificações In-App
├── @menção → tipo "mention"
├── DM recebido → tipo "dm"  
├── Resposta em thread → tipo "thread_reply"
└── Lembrete disparado → tipo "reminder"
(Canais NÃO geram notificação no sino — apenas no badge de não lida)

INBOX (Inbox) = Feed de Não Lidas
├── Canais com mensagens não lidas
├── DMs não lidos
└── Grupos não lidos

@MENÇÕES (AtSign) = Apenas menções diretas ao usuário
```

**Mudança no banco (migration):**
- Corrigir `notify_on_channel_message` para notificar **apenas membros do canal** (não todos do workspace)
- Remover tipo `"channel"` do sino — canais não geram notificação in-app, só atualizam badge de não lida

### Parte 2 — Performance: Unread Counts Otimizado

Substituir N queries sequenciais por **uma única query agregada** com GROUP BY no `useUnreadChannelCounts` e `useUnreadDMCounts`. Isso reduzirá o tempo de carregamento consideravelmente.

**Antes:** Loop com N chamadas individuais (1 por canal)
**Depois:** 1 chamada SQL com `count(*)` agrupado por canal_id

### Parte 3 — Badges de Contagem nos Canais

- **Desktop:** Garantir que o badge aparece na `ChannelList` lateral para cada canal com mensagens não lidas (já existe infraestrutura, ajustar o repasse para `CategoryManager`)
- **Mobile:** Adicionar badge de contagem na aba "Canais" no `MobileNav`, mostrando o total de não lidas dos canais

### Parte 4 — Centro de Notificações Reorganizado

Reorganizar o `NotificationCenter` com **abas por tipo**:
- **Tudo** — todas as notificações ordenadas por data
- **Menções (@)** — apenas menções
- **DMs** — apenas mensagens diretas  
- **Lembretes** — apenas lembretes disparados

Cada aba terá seu próprio badge de contagem e ação de "marcar todas como lidas".

---

## Arquivos a Modificar

**Backend (migrations):**
- Corrigir `notify_on_channel_message` — notificar apenas membros do canal
- Remover notificações in-app de tipo `"channel"` genérico (barulho desnecessário)

**Frontend:**
- `src/hooks/useNotifications.tsx` — otimizar queries de unread counts (N→1 query)
- `src/components/notifications/NotificationCenter.tsx` — adicionar abas por tipo
- `src/components/channel/ChannelList.tsx` — verificar badges de unread (desktop)
- `src/components/app/views/ChannelsView.tsx` — garantir repasse dos unread counts
- `src/components/app/DesktopApp.tsx` — badge no botão de canais da sidebar
