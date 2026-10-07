# Bandeiras, regiões e vínculos do consultor — Sprint 4

Migration: `supabase/migrations/20261007120000_operators_regions.sql` (aplicação remota só com autorização).
Contexto: `REGIONS_DOCUMENTS_AND_ACTIONS.md` (D34–D39).

## Tabelas

| Tabela | Função |
|--------|--------|
| `operators` | Bandeiras por organização (`name`, `code` imutável, `status`, `notes`). Seeds: LeCard, Pluxee, Ticket, VR, ValeCard (D12) para organizações existentes. |
| `regions` | Regiões/cidades por organização (`name`, `state` UF opcional, `status`, `notes`). Estrutura definitiva depende de Q25. |
| `consultant_operators` | N:N consultor ↔ bandeira (D35). PK `(consultant_id, operator_id)`. |
| `consultant_regions` | N:N consultor ↔ região (D34). PK `(consultant_id, region_id)`. |

- Nomes únicos por organização (case-insensitive); código da bandeira único e imutável.
- Vínculos usam FKs compostas `(…_id, organization_id)` → mesmo tenant garantido pelo banco.
- Só é possível vincular bandeira/região **ativa**. Inativar depois mantém o vínculo (exibido como "inativa").
- Sem DELETE em `operators`/`regions` (inativar). Vínculos podem ser removidos (auditado).

## Permissões

| Ação | admin | operator | consultant |
|------|:-----:|:--------:|:----------:|
| Ver bandeiras e regiões | sim | sim | sim |
| Criar/editar/inativar bandeira ou região | sim | não | não |
| Ver vínculos de consultores | org | org | só os próprios |
| Adicionar/remover vínculo | sim | sim | não |

RLS no banco (`is_org_admin`, `has_org_role`, `current_consultant_id()`); menus só escondem.

## Regras de escrita

- INSERT autenticado: `created_by = auth.uid()`, `created_at`/`updated_at = now()`; `organization_id` deve ser a organização ativa.
- `auth.uid()` nulo (service_role/SQL Editor/seeds): contexto confiável; valem integridade e status ativo do alvo do vínculo.
- Imutáveis: `id`, `organization_id`, `created_at`, `created_by`, `code`.

## Auditoria

| Evento | Metadata |
|--------|----------|
| `operator.created` / `region.created` | `{status}` |
| `operator.activated` / `.deactivated` (idem region) | `{from_status, to_status}` |
| `operator.updated` / `region.updated` | `{changed_fields}` (só nomes) |
| `consultant.operator_linked` / `_unlinked` | `{operator_id}` |
| `consultant.region_linked` / `_unlinked` | `{region_id}` |

## Telas

- `/operadoras` (menu "Bandeiras", admin): cadastro, edição e inativação.
- `/regioes` (admin): cadastro, edição e inativação.
- Detalhe do consultor: card "Regiões e bandeiras atendidas" (admin/operator gerenciam).
- Lista de consultores: filtros por região e bandeira; coluna com vínculos.

## Fora desta sprint

Planos, campos dinâmicos, tipos de documento e motivos de pendência (originalmente "Configuração de operadoras") passam para a sprint de contratos, onde são usados.

## Testes RLS (com fixtures, após aplicação)

1. operator tenta INSERT/UPDATE em `operators`/`regions` → negado (RLS).
2. consultant lê `operators`/`regions` → OK; INSERT → negado.
3. consultant lê `consultant_operators` → só linhas com o próprio `consultant_id`.
4. operator vincula bandeira inativa → erro "Bandeira inativa ou inexistente".
5. Vínculo com consultor de outra organização → violação de FK composta.
6. UPDATE de `code` → erro de imutabilidade.
7. anon → sem acesso a nenhuma das 4 tabelas.
