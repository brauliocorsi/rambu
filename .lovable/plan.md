

# Plano de Melhoria Global do Rambu

Este plano aborda melhorias em UX/UI, fluidez, performance, notificações e responsividade em lotes incrementais para evitar quebras.

---

## Fase 1 -- UI Minimalista e Polimento Visual

### 1.1 Navegação Mobile (MobileNav)
- Reduzir de 7 tabs para 5 (remover Home e Reminders, consolidar em Perfil/Notificações)
- Tabs: **DMs**, **Canais**, **Não Lidas**, **Fluxos**, **Perfil**
- Ícones menores, labels opcionais (só no ativo), hitarea maior
- Barra mais fina com blur mais forte

### 1.2 Header simplificado
- Remover animação do título (causa re-render desnecessário a cada mudança)
- Título estático com transição CSS suave em vez de framer-motion
- Adicionar avatar do usuário/canal no header contextual

### 1.3 Tela de Login (AuthForm)
- Fundo com gradiente sutil, card centralizado com glassmorphism
- Transições entre login/signup mais suaves
- Feedback visual melhorado nos inputs (estados focus/error/success)

### 1.4 HomeView -- Redesign minimalista
- Remover seção "Atividade Recente" vazia (placeholder sem função)
- Cards de ação rápida mais sutis, com ícones outline em vez de blocos coloridos
- Workspace switcher integrado no header em vez de inline

### 1.5 ProfileView
- Layout mais limpo, agrupar opções em seções (Conta, Aparência, Sistema)
- Status do usuário editável inline

---

## Fase 2 -- Fluidez e Performance

### 2.1 Reduzir animações excessivas
- Remover `AnimatePresence mode="wait"` no MainApp (causa delay na troca de tabs)
- Usar `CSS transitions` para mudanças de tab em vez de framer-motion mount/unmount
- Manter framer-motion apenas para modais, popovers e micro-interações

### 2.2 MessageBubble otimização
- Memoizar `MessageBubble` com `React.memo` para evitar re-renders em scroll
- Lazy-load `FilePreview`, `TaskCard` e `PollCard` com `React.lazy`
- Remover fetch individual de `useMessageById(reply_to)` em cada bubble -- agrupar no nível da lista

### 2.3 MessageList scroll
- Virtualizar mensagens com `react-virtuoso` ou similar para canais com muitas mensagens
- Remover múltiplos `setTimeout` para scroll (100ms, 300ms, 600ms) -- usar `ResizeObserver` no container

### 2.4 Input de mensagem
- Reduzir re-renders no `MessageInput` -- debounce no `handleInputChange`
- Consolidar estado dos arquivos anexados com `useReducer`

---

## Fase 3 -- Responsividade e Adaptação

### 3.1 Desktop (DesktopApp)
- Sidebar esquerda: tornar collapsible com toggle (16px -> 64px -> 256px)
- Painel de threads: largura responsiva, fecha com Escape
- Empty state central mais clean com menos texto

### 3.2 Mobile
- Transições entre views: deslizar lateral (swipe) em vez de fade
- Input de mensagem: botão de envio maior, área de toque mínima 44px
- Bottom sheet para ações em vez de popover (mais nativo mobile)

### 3.3 Breakpoints intermediários (tablet)
- Layout de 2 colunas para tablets (768-1024px)
- Sidebar flutuante com overlay em tablets portrait

---

## Fase 4 -- Notificações e Comunicação

### 4.1 Toast notifications
- Toasts mais compactos e consistentes
- Agrupar notificações repetidas (ex: "3 novas mensagens de João")
- Posição fixa no canto superior direito, sem empurrar conteúdo

### 4.2 Badges e indicadores
- Animação de pulse sutil nos badges de unread (sem ser intrusivo)
- Dot indicator para itens com atividade recente (além do número)

### 4.3 Tipografia e formatação
- Suporte a Markdown básico nas mensagens (negrito, itálico, código, links)
- Links clicáveis auto-detectados nas mensagens
- Preview de links (Open Graph) inline

---

## Fase 5 -- Detalhes de Qualidade

### 5.1 Estados vazios
- Ilustrações SVG leves para empty states em vez de ícones genéricos
- Copy mais direcionada com CTAs claros

### 5.2 Loading states
- Skeleton screens em vez de spinners para listas (canais, DMs, mensagens)
- Shimmer effect consistente usando a classe `.animate-shimmer` já existente

### 5.3 Micro-interações
- Haptic feedback visual nos botões (scale down no press)
- Transição de cor suave nos hover states
- Indicador de "enviando" mais discreto no input

---

## Ordem de Implementação Sugerida

Dado que são muitas mudanças, recomendo implementar em **3 mensagens**:

1. **Mensagem 1**: Fases 1 + 2 (UI minimalista + performance)
2. **Mensagem 2**: Fase 3 (responsividade)
3. **Mensagem 3**: Fases 4 + 5 (notificações + polish)

### Arquivos principais afetados
- `MobileNav.tsx`, `Header.tsx`, `MainApp.tsx`
- `MessageBubble.tsx`, `MessageList.tsx`, `MessageInput.tsx`
- `DesktopApp.tsx`, `DMChatView.tsx`
- `AuthForm.tsx`, `HomeView.tsx`, `ProfileView.tsx`
- `src/index.css` (novas utility classes)

