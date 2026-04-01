

# Notificações Push no iPhone — Plano de Implementação

## Problema raiz

No iOS (Safari), **notificações push só funcionam quando o app está instalado como PWA** (adicionado à tela inicial). A API `Notification.requestPermission()` é silenciosamente ignorada no Safari mobile comum. Mesmo com o app instalado, o código atual não detecta se está rodando como PWA ou não, e não orienta o usuário de forma inteligente.

## O que será feito

### 1. Criar hook `useIOSNotificationHelper`

Novo hook que centraliza a lógica de diagnóstico para iOS:

- **Detecta se é iOS** via user agent
- **Detecta se está rodando como PWA** (`display-mode: standalone` ou `navigator.standalone`)
- **Detecta se o Service Worker está ativo** e pronto
- Exporta estado: `{ isIOS, isPWA, isServiceWorkerReady, canRequestPermission }`

A lógica: no iOS, `canRequestPermission` só é `true` se `isPWA === true`.

### 2. Refatorar seção de Push no `SettingsView.tsx`

Substituir a seção atual de notificações push por uma versão inteligente com 4 estados:

| Estado | Condição | O que mostra |
|--------|----------|-------------|
| **Não instalado (iOS)** | `isIOS && !isPWA` | Card destacado explicando que precisa instalar o app primeiro, com botão "Como instalar" que leva para `/install` |
| **Permissão não pedida** | `permission === "default"` | Botão grande "Ativar Notificações" que chama `requestPermission()`. Após clicar, envia uma notificação de teste para confirmar |
| **Permissão concedida** | `permission === "granted"` | Badge verde "Ativas" + botão "Enviar notificação de teste" para o usuário confirmar que funciona |
| **Permissão bloqueada** | `permission === "denied"` | Instruções por plataforma (iOS: Ajustes → Rambu; Android: cadeado; Desktop: cadeado) + botão "Tentar novamente" |

### 3. Notificação de teste

Ao ativar com sucesso, disparar imediatamente uma notificação de teste via Service Worker:

```typescript
const reg = await navigator.serviceWorker.ready;
await reg.showNotification("Rambu", {
  body: "Notificações ativadas com sucesso!",
  icon: "/icons/icon-192x192.png",
});
```

Também adicionar um botão permanente "Testar notificação" quando já estiver ativo, para o usuário verificar a qualquer momento.

### 4. Atualizar `useBrowserNotifications.tsx`

- Adicionar função `sendTestNotification()` que dispara uma notificação de teste via SW
- Re-checar `Notification.permission` após chamar `requestPermission()` e após o app voltar ao foco (para captar mudanças feitas nas configurações do sistema)
- Adicionar listener de `visibilitychange` que atualiza o estado `permission` quando o usuário volta ao app (caso tenha ido alterar nas configurações do iOS)

### 5. Atualizar `BrowserNotificationPrompt.tsx`

- No iOS sem PWA: em vez de pedir permissão, mostrar call-to-action para instalar o app primeiro
- No iOS com PWA e permissão default: mostrar o prompt normalmente

## Arquivos modificados

| Arquivo | Ação |
|---------|------|
| `src/hooks/useIOSNotificationHelper.tsx` | Criar (novo) |
| `src/hooks/useBrowserNotifications.tsx` | Editar — adicionar `sendTestNotification`, listener de `visibilitychange` |
| `src/components/settings/SettingsView.tsx` | Editar — refatorar seção push com 4 estados e botão de teste |
| `src/components/notifications/BrowserNotificationPrompt.tsx` | Editar — detectar iOS sem PWA |

## Resultado esperado

- No iPhone com app instalado: botão "Ativar" dispara o prompt do sistema iOS corretamente
- No iPhone sem app instalado: mostra aviso claro de que precisa instalar primeiro
- Após ativar: notificação de teste é enviada imediatamente para confirmar
- Botão "Testar notificação" sempre disponível quando ativo
- Se bloqueado: instruções claras + re-checagem automática ao voltar ao app

