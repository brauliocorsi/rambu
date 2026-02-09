

# 💬 ChatFlow - App de Mensagens Moderno

Um aplicativo de mensagens que combina o melhor do Slack e WhatsApp, com design vibrante, colorido e focado em mobile.

---

## 🎨 Design & Experiência Visual

### Identidade Visual
- **Paleta vibrante**: Gradientes coloridos (roxo, azul, rosa, laranja)
- **Modo claro padrão** com opção de dark mode
- **Animações fluidas** em todas as interações
- **Ícones modernos** e tipografia clean
- **Efeitos visuais**: Transições suaves, micro-animações ao enviar mensagens

### Layout Mobile-First
- **Navegação inferior** com ícones para: Home, Mensagens Diretas, Canais, Notificações, Perfil
- **Gestos intuitivos**: Swipe para arquivar, responder rápido
- **Cards arredondados** e sombras sutis
- **Botão em Configurações** para alternar para versão desktop completa

---

## 👤 Autenticação & Perfil

### Sistema de Login
- Cadastro com email e senha
- Login social (Google)
- Recuperação de senha por email
- Avatar personalizável e status online/offline

### Perfil do Usuário
- Nome de exibição e bio
- Upload de foto de perfil
- Status personalizado (emoji + texto)
- Preferências de notificação

---

## 🏢 Workspaces (Híbrido)

### Estrutura
- **Workspace principal** criado ao fazer cadastro
- Possibilidade de **criar novos workspaces**
- **Receber convites** para participar de outros workspaces
- **Alternância rápida** entre workspaces com menu lateral

### Gestão
- Administradores podem convidar membros
- Configurações de workspace (nome, ícone, cores)
- Lista de membros com roles (admin, membro)

---

## 📢 Canais

### Tipos de Canais
- **Canais públicos**: Qualquer membro do workspace pode entrar
- **Canais privados**: Apenas por convite

### Funcionalidades
- Criar, editar e arquivar canais
- Descrição e propósito do canal
- Fixar mensagens importantes
- Lista de membros do canal

---

## 💬 Mensagens em Tempo Real

### Funcionalidades Core
- **Mensagens em tempo real** via Supabase Realtime
- **Threads/Respostas**: Responder mensagens específicas criando conversas
- **Mensagens diretas (DMs)**: Conversas privadas 1:1
- **Menções @user**: Notificar usuários específicos
- **Indicador de digitação**: Ver quando alguém está escrevendo

### Conteúdo Rich
- **Emojis**: Picker completo com busca
- **Reações**: Reagir a mensagens com emojis
- **Preview de links**: Mostrar prévia de URLs
- **Formatação**: Negrito, itálico, código

### Compartilhamento de Arquivos
- Upload de imagens e documentos
- Preview de imagens inline
- Download de arquivos

---

## 🔔 Notificações & Sons

### Push Notifications
- Notificações mesmo com app fechado
- Configurável por canal/conversa
- Badge counter no ícone do app

### Sons
- Som ao receber mensagem
- Som ao enviar mensagem
- Configurações de volume e mute
- Sons diferentes para DMs vs canais

### Indicadores Visuais
- Badges de mensagens não lidas
- Destaque visual para menções
- Animação sutil ao receber mensagem

---

## ⚙️ Configurações

### Preferências do App
- **Toggle mobile/desktop view**: Alternar layouts
- Modo escuro/claro
- Tamanho de fonte
- Sons on/off

### Notificações
- Push notifications on/off
- Horário de silêncio
- Configurar por canal

### Conta
- Editar perfil
- Alterar senha
- Sair / Logout

---

## 🛠️ Tecnologias

### Backend (Lovable Cloud)
- **Autenticação**: Supabase Auth com suporte a Google OAuth
- **Banco de dados**: PostgreSQL com realtime subscriptions
- **Storage**: Supabase Storage para arquivos e imagens
- **Edge Functions**: Para push notifications

### Segurança
- Row Level Security (RLS) em todas as tabelas
- Políticas de acesso baseadas em membership
- Funções helper para verificação de permissões

---

## 📋 Ordem de Implementação

1. **Fase 1 - Fundação**: Auth, perfil, estrutura visual, navegação mobile
2. **Fase 2 - Workspaces**: Criar, gerenciar, convidar membros
3. **Fase 3 - Canais**: Criação, listagem, navegação entre canais
4. **Fase 4 - Mensagens**: Envio em tempo real, emojis, reações
5. **Fase 5 - DMs & Threads**: Mensagens diretas e respostas em thread
6. **Fase 6 - Arquivos**: Upload e compartilhamento
7. **Fase 7 - Notificações**: Push notifications, sons, badges
8. **Fase 8 - Refinamentos**: Animações, toggle desktop, polish final

