# Plano de testes RLS — Consultores e lojistas (Sprint 3)

Executar **após** aplicar `20260806130000_consultants_merchants.sql` em ambiente de desenvolvimento.  
**Não** usar nem apagar dados reais da Prime Service.

Pré-requisito: fixtures fictícias (org A/B, admin/operator/consultant A/B, consultores e lojistas).

## Isolamento de organização

| # | Caso | Esperado |
|---|------|----------|
| C1 | admin A SELECT consultants/merchants B | 0 |
| C2 | operator A SELECT B | 0 |
| C3 | consultant A SELECT B | 0 |

## Consultants

| # | Caso | Esperado |
|---|------|----------|
| C4 | admin A lista consultants A | todos da org |
| C5 | operator A lista consultants A | todos da org |
| C6 | consultant A SELECT consultants | só o próprio (`user_id`) |
| C7 | consultant A INSERT consultant | negado |
| C8 | consultant A UPDATE status | negado |
| C9 | operator A UPDATE `user_id` | negado (trigger) |
| C10 | admin A vincula user já ligado | unique violation |

## Merchants

| # | Caso | Esperado |
|---|------|----------|
| C11 | admin/operator A listam merchants A | todos |
| C12 | consultant A lista | só `consultant_id` próprio |
| C13 | consultant A cria merchant | `consultant_id` forçado a si |
| C14 | consultant A UPDATE `consultant_id` | negado |
| C15 | consultant A lê merchant de outro consultor | 0 |
| C16 | merchant com consultant de outra org | FK/trigger falha |
| C17 | INSERT/UPDATE outro tenant | falha |
| C18 | DELETE client | sem policy / falha |

Detalhes: `docs/CONSULTANTS_AND_MERCHANTS.md`.
