

# Plano: Confirmar Email do Usuario

## Objetivo
Confirmar manualmente o email do usuario `jorge@upmoveis.pt` para permitir que ele faca login na aplicacao.

## Acao Necessaria

Executar migracao SQL para atualizar o campo `email_confirmed_at` do usuario:

```sql
UPDATE auth.users 
SET email_confirmed_at = now()
WHERE email = 'jorge@upmoveis.pt';
```

## Detalhes Tecnicos

| Campo | Valor |
|-------|-------|
| User ID | bf3683b5-5ba4-4156-831e-33577246aeaf |
| Email | jorge@upmoveis.pt |
| Acao | Definir `email_confirmed_at` para timestamp atual |

## Resultado Esperado

Apos a execucao:
- O usuario podera fazer login normalmente com email e senha
- O campo `email_confirmed_at` tera a data/hora da confirmacao
- Nenhuma outra alteracao sera feita no registro do usuario

## Proximos Passos

Apos confirmar o email, podemos continuar com a implementacao das funcionalidades avancadas:
1. Presenca Online/Offline em tempo real
2. Typing Indicator
3. Modo Ausente e DND
4. E as demais fases do plano

