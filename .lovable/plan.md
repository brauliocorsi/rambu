## Modernização UI/UX — Rambu

Direção: **Slack/Discord moderno** — densidade equilibrada, sidebar marcante com identidade colorida por contexto (azul/verde/roxo), tipografia profissional, microinterações em molas suaves, glassmorphism mais sutil e sombras em camadas.

---

### 1. Novos tokens globais (`src/index.css` + `tailwind.config.ts`)

- **Tipografia**: trocar `Inter` por par moderno **Geist Sans** (UI/body) + **Geist Mono** (códigos/timestamps). Importar via Google Fonts/CDN. Cabeçalhos com `tracking-tight` e `font-medium` (não bold pesado).
- **Paleta refinada (HSL)**:
  - Light: `--background 0 0% 99%`, `--foreground 240 10% 8%`, `--muted 240 5% 96%`, `--border 240 6% 91%`.
  - Dark: `--background 240 12% 6%`, `--card 240 12% 9%`, `--muted 240 8% 14%`, `--border 240 8% 16%` — base mais profunda, próxima ao Discord/Linear.
  - **Primary** mantém roxo (262 83% 58%) mas com `--primary-glow` para halos.
  - Cores de contexto promovidas a tokens semânticos: `--channel 217 91% 60%` (azul), `--dm 142 71% 45%` (verde), `--group 262 83% 58%` (roxo). Cada uma com `-foreground`, `-soft` (10% alpha) e `-glow`.
- **Radius**: reduzir `--radius` de `1rem` para `0.75rem` (mais Slack/Linear) + adicionar `--radius-bubble: 1.125rem`.
- **Sombras em camadas**: `--shadow-xs/sm/md/lg/xl` baseadas em foreground com baixa opacidade + `--shadow-glow-channel/dm/group` para focus rings coloridos.
- **Gradientes**: novos `--gradient-channel`, `--gradient-dm`, `--gradient-group` para headers e avatares.
- **Spacing scale**: novos utilitários `space-tight` para listas densas (sidebar) e `space-cozy` para mensagens.

### 2. Sidebar e navegação (`src/components/app/DesktopApp.tsx`, `MainApp.tsx`, sidebar components)

- Workspace switcher vertical à esquerda (estilo Discord) com avatares quadrados arredondados, indicador ativo (barra vertical primária animada).
- Lista de canais/DMs com:
  - Itens mais densos (h-9, px-2), ícone + nome, badge de unread alinhada à direita com `--primary` sólido e count tabular-nums.
  - Item ativo: fundo `bg-{contexto}-soft`, borda esquerda 3px na cor do contexto, texto `text-foreground font-medium`.
  - Hover: `bg-muted/60` com transição 120ms.
  - Seções colapsáveis com chevron rotacionado (sem Framer Motion, CSS only).
- Header da sidebar: nome do workspace + dropdown, busca global pinada (Cmd+K hint à direita).
- Footer fixo: avatar do usuário + status dot + ações (settings, status).

### 3. Headers e barras de ação

- Header do chat redesenhado: 56px de altura, glass sutil (`backdrop-blur 16px` + 70% opacity), título em `font-medium tracking-tight`, subtítulo de membros/descrição em `text-xs text-muted-foreground`.
- AvatarStack à direita com sobreposição -8px e ring `ring-2 ring-background`.
- Barra de ações: ícones em botões `ghost` 32x32 com hover bg `muted` + tooltip refinado.
- Breadcrumbs sutis quando aplicável (workspace › canal › thread).

### 4. Mensagens e bolhas (`src/components/message/*`)

- **Layout próprio (own)**: bubble com `bg-primary text-primary-foreground`, sombra suave `shadow-md` com tint primary, corner radius assimétrico (`rounded-2xl rounded-br-sm`).
- **Layout outros**: bubble com `bg-card border border-border/50`, hover revela ações (reagir, responder, mais) em barra flutuante acima.
- Avatares 36px com ring sutil, agrupamento de mensagens consecutivas (sem repetir avatar/nome em <5min).
- Timestamps em `font-mono text-[11px] text-muted-foreground` aparecem só no hover do grupo.
- Reações: pills compactas com count, hover scale 1.05, animação spring no toggle.
- Reply preview com barra colorida vertical de 3px na cor do contexto.
- Anexos: thumbnails com radius `--radius-bubble`, overlay com info no hover.
- Indicador "novo" com linha + label centralizado em `bg-background` flutuante.

### 5. Microinterações (equilibradas)

- Spring leve (Framer Motion já presente) só em: abrir modais, toggle de reação, envio de mensagem, swap de canal (fade 120ms).
- Hover states com `transition-colors duration-150`.
- Botões com `active:scale-[0.98]` via `.press-scale`.
- Skip animations em itens otimistas (já implementado).

### 6. Diálogos, modais e empty states

- Padronizar modais com header denso (h-12), divider sutil, footer com botões à direita.
- Empty states com ilustração SVG simples (linhas finas, accent na cor do contexto), título `text-lg font-medium`, descrição `text-sm text-muted-foreground`, CTA primário.
- Telas: lista de canais vazia, sem mensagens no canal, busca sem resultados, notificações limpas.

### 7. Componentes shadcn customizados

- `Button`: nova variant `soft` (bg-{cor}-soft / text-{cor}), variant `ghost` com hover `bg-muted/60`.
- `Badge`: variant `unread` (bg-primary, text-primary-foreground, font-mono tabular-nums, h-5 min-w-5 px-1.5).
- `Tooltip`: delay 300ms, glass + border sutil.
- `Avatar`: ring contextual opcional via prop.

---

### Detalhes técnicos

- **Sem mudança de business logic**: apenas tokens, classes Tailwind, componentes de apresentação.
- **Cores em HSL** via design system; nada de cores hardcoded em componentes.
- **Compatibilidade dark/light** garantida em todos os tokens novos.
- **Performance**: manter memoização de `MessageBubble`; transições só em propriedades GPU-friendly (transform, opacity).
- **Fontes**: `<link>` em `index.html` para Geist; fallback `system-ui`.
- **Sem refactor estrutural**: arquivos existentes mantêm suas responsabilidades; mudanças são em estilo, classes e tokens.

### Ordem de execução

```text
1. Tokens (index.css + tailwind.config.ts) + import de fonte
2. Sidebar (workspace switcher + lista de canais/DMs)
3. Headers e barras de ação
4. Bolhas de mensagem + reações + agrupamento
5. Diálogos + empty states
6. Polimento de microinterações + revisão dark mode
```

Cada etapa será verificada visualmente no preview antes de seguir.
