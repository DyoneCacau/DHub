# Operações e Ações

Módulo para a gerência controlar ações de bandeira (viagens de consultores) e as despesas associadas: passagens aéreas, aluguel de carro, combustível, recarga de cartão combustível/frota, recarga de cartão corporativo, contas etc.

Decisões: D37, D38, D39, D43–D47. Questões abertas relacionadas: Q22, Q23, Q24, Q27, Q28.

Migration: `supabase/migrations/20261007130000_operations_actions.sql` (rollback de referência em `supabase/rollback/20261007130000_rollback_operations_actions.sql.example`).

## Tabelas

| Tabela | Conteúdo | Exclusão |
|--------|----------|----------|
| `expense_types` | Categorias de despesa configuráveis (nome, status ativo/inativo, observações). Seeds: Passagem aérea, Aluguel de carro, Combustível, Recarga de cartão combustível/frota, Recarga de cartão corporativo, Contas, Outros | Sem DELETE; inativar |
| `actions` | Ação: título, bandeira (opcional), região (opcional), cidade, início, fim, status, orçamento, observações | Sem DELETE; status `cancelled` |
| `action_participants` | Consultores que participam da ação (PK `action_id + consultant_id`) | DELETE permitido (admin) |
| `action_expenses` | Despesa: tipo, consultor (opcional), fornecedor, descrição, data, valor previsto, valor realizado, forma de pagamento (texto livre), status, observações | Sem DELETE; status `cancelled` |
| `expense_attachments` | Comprovantes (PDF/JPEG/PNG/WEBP, até 10 MB) vinculados à despesa; arquivo no bucket privado `action-receipts` | DELETE permitido (admin) |

Status de ação: `planned` (planejada) → `in_progress` (em andamento) → `completed` (concluída); `cancelled` (cancelada) a qualquer momento. Status de despesa: `planned` (prevista), `paid` (paga), `cancelled` (cancelada).

Todas as FKs entre essas tabelas (e para `operators`, `regions`, `consultants`) são compostas com `organization_id`, garantindo o mesmo tenant.

## Views

- `actions_with_totals`: ação + `participant_count`, `planned_total` (soma do previsto das despesas não canceladas) e `paid_total` (soma do realizado das despesas pagas).
- `action_expense_report`: despesas não canceladas com dados da ação e `reference_month` = mês da data da despesa (ou do início da ação, se a despesa não tiver data). Usada na lista para "Gastos por bandeira" no mês.

Ambas com `security_invoker = true` (respeitam a RLS das tabelas).

## Permissões (RLS)

- Somente **admin** da organização (`is_org_admin`) lê e escreve em todas as tabelas, views e no bucket. Operator e consultant **não** têm acesso (Q22 em aberto).
- INSERT exige `organization_id = current_active_organization_id()`.
- Grants: `expense_types`, `actions`, `action_expenses` → SELECT/INSERT/UPDATE; `action_participants`, `expense_attachments` → SELECT/INSERT/DELETE. Nada para `anon`.
- Triggers forçam `created_by`, `created_at`, `updated_at` no INSERT autenticado e impedem alterar `id`, `organization_id`, `created_at`, `created_by`.
- Despesa não pode ser movida para outra ação; tipo de despesa precisa estar ativo ao criar/trocar.
- Participante precisa ser consultor da mesma organização (FK composta).

## Storage

- Bucket privado `action-receipts` (limite 10 MB; MIME: `application/pdf`, `image/jpeg`, `image/png`, `image/webp`).
- Caminho: `{organization_id}/actions/{action_id}/{uuid}.{ext}`. Trigger em `expense_attachments` valida que o caminho começa com a org e a ação da despesa e não contém `..`.
- Policies em `storage.objects` (SELECT/INSERT/DELETE): bucket correto, primeira pasta = org ativa e usuário admin dessa org.
- Download por **URL assinada de 60 s**; nada é público.
- Upload: arquivo primeiro, depois a linha; se a linha falhar, o arquivo é removido. Remoção: linha primeiro, depois o arquivo.
- Limites provisórios (10 MB; PDF e imagens) até resposta da Q27.

## Auditoria

Eventos de domínio em `audit_logs` (metadata só com ids, status e nomes de campos alterados; sem valores pessoais):

- `expense_type.created`, `expense_type.updated`, `expense_type.status_changed`
- `action.created`, `action.updated`, `action.status_changed`
- `expense.created`, `expense.updated`, `expense.status_changed`
- `action.participant_added`, `action.participant_removed`
- `expense.attachment_added`, `expense.attachment_removed`

## Frontend

- `/acoes`: lista com filtros (mês — padrão mês atual —, status, bandeira), totais previsto/pago e gastos por bandeira no mês.
- `/acoes/nova`, `/acoes/:actionId/editar`: formulário da ação.
- `/acoes/:actionId`: dados, totais (aviso "Acima do orçamento"), mudança de status, participantes, despesas e comprovantes.
- `/acoes/tipos-despesa`: CRUD de tipos de despesa (inativar em vez de excluir).
- Item de menu "Operações e Ações" visível só para admin; rotas sob `RequireRole` admin.

## Testes de RLS (executar após aplicar a migration)

1. Admin da org A cria ação, participante, despesa e comprovante → sucesso; eventos de auditoria gerados.
2. Operator e consultant da org A: SELECT em `actions`, `action_expenses`, `expense_attachments`, views → 0 linhas; INSERT → negado.
3. Admin da org B: não vê dados da org A; INSERT com `organization_id` da org A → negado.
4. Anon: sem acesso a tabelas, views e bucket.
5. DELETE em `actions`, `action_expenses`, `expense_types` → negado (sem grant).
6. UPDATE de `organization_id`, `created_by`, `action_id` da despesa → erro.
7. Participante com consultor de outra org → erro de FK composta.
8. Despesa com tipo inativo → erro.
9. Comprovante com `storage_path` de outra ação/org ou com `..` → erro; MIME fora da lista ou > 10 MB → erro.
10. Upload no bucket fora da pasta da org ativa ou por não admin → negado; URL assinada expira em 60 s.

## Fora de escopo

Cadastro de cartões (Q23), aprovação/reembolso (Q24), orçamento por bandeira/quem paga (Q28), integração bancária, relatórios financeiros avançados.
