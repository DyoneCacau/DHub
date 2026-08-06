# Plano de testes RLS — Sprint 2

Executar **após** aplicar migrations em um projeto de desenvolvimento. Não usar dados reais da operação.

## Preparação

Criar no Auth (Dashboard), sem versionar senhas:

| Usuário | Papel pretendido |
|---------|------------------|
| admin_a | admin org A |
| operator_a | operator org A |
| consultant_a | consultant org A |
| admin_b | admin org B |
| orphan | autenticado sem membership |
| inactive_a | membership inactive org A |

Criar orgs `org-a` e `org-b` + memberships via SQL de bootstrap revisado.

## Casos

| # | Caso | Esperado |
|---|------|----------|
| 1 | Anônimo SELECT organizations | 0 linhas / negado |
| 2 | orphan SELECT organizations | 0 linhas |
| 3 | admin_a SELECT organizations | somente org A |
| 4 | admin_a SELECT org B | 0 linhas |
| 5 | consultant_a SELECT organization_members | somente própria membership |
| 6 | operator_a SELECT organization_members | membros da org A (leitura) |
| 7 | operator_a UPDATE organization_members.role | negado (sem policy de update) |
| 8 | consultant_a UPDATE próprio role | negado |
| 9 | admin_a UPDATE membership em org B | negado |
| 10 | inactive_a SELECT organizations | 0 (membership inativa) |
| 11 | usuário UPDATE próprio full_name | permitido |
| 12 | usuário UPDATE próprio email via profiles | email permanece (trigger) |
| 13 | operator_a SELECT audit_logs | 0 / negado |
| 14 | consultant_a SELECT audit_logs | 0 / negado |
| 15 | admin_a SELECT audit_logs | somente org A |
| 16 | admin_a SELECT audit_logs org B | 0 |

## Sprint 2.1 — grants / endurecimento

Executar **após** aplicar `20260806120200_harden_auth_permissions.sql` (somente com autorização).

| # | Caso | Esperado |
|---|------|----------|
| H1 | anon EXECUTE helpers (`has_active_membership`, etc.) | permission denied |
| H2 | authenticated EXECUTE helpers | permitido |
| H3 | authenticated EXECUTE funções de trigger | permission denied |
| H4 | authenticated INSERT/DELETE nas 4 tabelas | negado |
| H5 | UPDATE próprio `full_name` / `avatar_url` | permitido |
| H6 | UPDATE próprio `email` / `created_at` / `id` | negado |
| H7 | operator UPDATE/DELETE membership | negado |
| H8 | alteração privilegiada de membership | audit_logs via trigger |
| H9 | login + SELECT própria membership | OK |
| H10 | admin lista membros (UI usuários) | OK |

Detalhes: `docs/HARDEN_AUTH_PERMISSIONS_SPRINT21.md`.

## Exemplo SQL (como authenticated)

Usar client com JWT do usuário (SQL Editor com role authenticated não simula JWT completo). Preferir script local com `@supabase/supabase-js` e usuários de teste, ou Table Editor policies.

## Frontend (manual)

Ver checklist em `docs/SUPABASE_SETUP.md` e README Sprint 2:

- sem sessão → `/login`
- com membership ativa → dashboard
- sem membership / inativa → bloqueio
- papel insuficiente → `/acesso-negado`
- logout limpa sessão

## Frontend (unitário mínimo sugerido)

Sem instalar runner nesta sprint (evitar suíte excessiva). Prioridades se adicionar Vitest depois:

- `mapAuthError` mensagens amigáveis;
- `safeRedirectPath` / open redirect;
- `getNavigationForRole` por papel;
- validação Zod de env (sem valores reais).
