
# Pagina /install - Instrucoes de Instalacao PWA

## Objetivo
Criar uma pagina publica `/install` com instrucoes visuais passo a passo para instalar o Rambu como PWA no iPhone e Android. A pagina nao exige autenticacao.

## Design da Pagina

A pagina tera:
- Header com logo/nome "Rambu" e botao "Voltar ao Rambu"
- Deteccao automatica do dispositivo (iOS/Android/Desktop) para mostrar as instrucoes relevantes primeiro
- Tabs para alternar entre "iPhone/iPad" e "Android"
- Passos numerados com icones ilustrativos (usando Lucide icons)
- Secao de beneficios da instalacao (notificacoes, acesso rapido, offline)

### Instrucoes iOS (Safari)
1. Abra o Rambu no **Safari** (nao funciona no Chrome/Firefox)
2. Toque no botao **Compartilhar** (icone de quadrado com seta para cima)
3. Role para baixo e toque em **"Adicionar a Tela de Inicio"**
4. Toque em **"Adicionar"** no canto superior direito
5. O Rambu aparecera como app na sua tela inicial

### Instrucoes Android (Chrome)
1. Abra o Rambu no **Chrome**
2. Toque no menu **tres pontos** no canto superior direito
3. Toque em **"Adicionar a tela inicial"** ou **"Instalar app"**
4. Confirme tocando em **"Adicionar"**
5. O Rambu aparecera como app na sua tela inicial

### Secao de Beneficios
- Notificacoes push (mesmo com o app fechado)
- Acesso rapido pela tela inicial
- Experiencia em tela cheia
- Funciona offline

### Para Desktop
Mensagem informando que no desktop basta usar o navegador, com nota sobre o botao de instalar na barra de endereco do Chrome.

## Detalhes Tecnicos

### Arquivos a criar:
1. **`src/pages/InstallPWA.tsx`** - Pagina principal com deteccao de dispositivo, tabs iOS/Android, passos numerados com icones Lucide, animacoes com framer-motion, e design consistente com o tema do Rambu

### Arquivos a modificar:
1. **`src/App.tsx`** - Adicionar rota `/install` (publica, sem autenticacao, fora do `RootContent`)

### Componentes utilizados:
- `Tabs` do Radix UI para alternar iOS/Android
- `Card` para agrupar passos
- `Button` para "Voltar ao Rambu"
- `motion.div` do framer-motion para animacoes de entrada
- Icones Lucide: `Share`, `Plus`, `MoreVertical`, `Download`, `Bell`, `Zap`, `Wifi`, `Smartphone`, `Monitor`, `ArrowLeft`, `ExternalLink`

### Deteccao de dispositivo:
- `navigator.userAgent` para detectar iOS, Android ou Desktop
- Tab padrao sera a do dispositivo detectado
