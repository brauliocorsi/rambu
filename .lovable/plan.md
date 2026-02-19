
## Mover badge de contagem para cima do avatar nas DMs

### O que muda
O badge de mensagens nao lidas sera movido da area ao lado do nome para ficar posicionado no canto superior direito do avatar do usuario na lista de DMs.

### Detalhes tecnicos

**Arquivo: `src/components/dm/DMListWithArchive.tsx`**

1. Remover o `UnreadBadge` de dentro do bloco de texto (linha 102), onde atualmente aparece ao lado do nome e horario.

2. Adicionar o `UnreadBadge` como overlay posicionado absolutamente sobre o container do avatar (linha 83-96). O container `div.shrink-0` passara a ter `position: relative`, e o badge sera posicionado com `absolute -top-1 -right-1` para ficar no canto superior direito do avatar, similar a notificacoes de apps de mensagens como WhatsApp.

Estrutura resultante do avatar:
```text
+------------------+
|  [badge]         |  <-- badge no canto superior direito
|   +----------+   |
|   |  Avatar  |   |
|   +----------+   |
|      [status]    |  <-- indicador de online/offline permanece
+------------------+
```

Nenhum outro arquivo precisa ser alterado.
