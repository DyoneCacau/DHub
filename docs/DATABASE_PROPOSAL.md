# DHub — Proposta de Banco de Dados

**Tipo:** proposta arquitetural (Sprint 0 / 0.1). **Sem SQL e sem migrations.**

Princípios: multi-tenant por `organization_id`; contrato ≠ recarga; configuração > hard-code; RLS obrigatório; UUID como PK sugerida.

**Legenda:** decisão confirmada ≠ proposta ≠ hipótese ≠ questão aberta (`OPEN_QUESTIONS.md` / `DECISION_LOG.md`).

---

## Convenções gerais

| Tema | Proposta |
|------|----------|
| PK | `uuid` (`gen_random_uuid()`) |
| Tenant | Coluna `organization_id` em toda tabela operacional |
| Timestamps | `created_at`, `updated_at` |
| Soft delete / inativação | Preferir `status`/`is_active`/`deactivated_at` em cadastros; históricos append-only sem delete |
| Auth | `profiles.id` alinhado a `auth.users.id` (Supabase) |
| Enums | PostgreSQL enums ou tabelas de domínio; valores de status em `CONTRACT_WORKFLOW.md` / `RECHARGE_WORKFLOW.md` |

---

## Tabelas propostas

### `organizations`

| Item | Conteúdo |
|------|----------|
| Finalidade | Tenant raiz |
| Colunas principais | `id`, `name`, `slug`, `is_active`, timestamps |
| PK | `id` |
| FKs | — |
| Constraints | `slug` único |
| Índices | `slug` |
| Soft delete | `is_active` / `deactivated_at` |
| Multi-tenant | É o tenant |
| Riscos | Múltiplas orgs futuras exigem membership bem modelado |

### `profiles`

| Item | Conteúdo |
|------|----------|
| Finalidade | Perfil de aplicação ligado ao Auth |
| Colunas principais | `id` (= auth user), `full_name`, `email`, `phone`, `is_active`, timestamps |
| PK | `id` |
| FKs | `id` → `auth.users` |
| Constraints | e-mail único se armazenado aqui |
| Índices | `email` |
| Soft delete | `is_active` |
| Multi-tenant | Via `organization_members` |
| Riscos | Duplicar dados do Auth; manter sync |

### `organization_members`

| Item | Conteúdo |
|------|----------|
| Finalidade | Vínculo usuário↔org + papel |
| Colunas principais | `id`, `organization_id`, `profile_id`, `role` (`admin`\|`operator`\|`consultant`), `is_active`, timestamps |
| PK | `id` |
| FKs | `organization_id`, `profile_id` |
| Constraints | Único (`organization_id`, `profile_id`); check de `role` |
| Índices | (`organization_id`, `role`), `profile_id` |
| Soft delete | `is_active` |
| Multi-tenant | Núcleo da autorização |
| Riscos | Usuário em múltiplas orgs; papel único por membership |

### `consultants`

| Item | Conteúdo |
|------|----------|
| Finalidade | Entidade operacional do consultor |
| Colunas principais | `id`, `organization_id`, `profile_id` (nullable se pré-cadastro), `code`, `name`, `is_active`, timestamps |
| PK | `id` |
| FKs | `organization_id`, `profile_id` |
| Constraints | Único (`organization_id`, `profile_id`) quando preenchido; único código por org se houver |
| Índices | (`organization_id`, `is_active`), `profile_id` |
| Soft delete | `is_active` |
| Multi-tenant | `organization_id` |
| Riscos | Consultor sem usuário; troca de profile |

### `merchants`

| Item | Conteúdo |
|------|----------|
| Finalidade | Lojista único por organização |
| Colunas principais | `id`, `organization_id`, `consultant_id`, dados cadastrais (a confirmar), `is_active`, timestamps |
| PK | `id` |
| FKs | `organization_id`, `consultant_id` → `consultants` |
| Constraints | Unicidade de identificador de negócio (CNPJ/CPF?) **a confirmar**; não unique por operadora |
| Índices | (`organization_id`, `consultant_id`); índice do identificador legal quando definido |
| Soft delete | `is_active` |
| Multi-tenant | `organization_id` |
| Riscos | Critério de deduplicação ainda aberto; dados sensíveis (LGPD) |

### `merchant_consultant_history`

| Item | Conteúdo |
|------|----------|
| Finalidade | Histórico de responsável |
| Colunas principais | `id`, `organization_id`, `merchant_id`, `consultant_id`, `started_at`, `ended_at`, `changed_by`, `reason` |
| PK | `id` |
| FKs | merchant, consultant, organization, changed_by→profiles |
| Constraints | `ended_at` null = período atual (no máximo um aberto — a validar) |
| Índices | (`merchant_id`, `started_at`) |
| Soft delete | Não (append) |
| Multi-tenant | `organization_id` |
| Riscos | Regras de transferência não confirmadas |

### `operators`

| Item | Conteúdo |
|------|----------|
| Finalidade | Cadastro de operadoras |
| Colunas principais | `id`, `organization_id`, `code`, `name`, `is_active`, timestamps |
| PK | `id` |
| FKs | `organization_id` |
| Constraints | Único (`organization_id`, `code`) |
| Índices | (`organization_id`, `is_active`) |
| Soft delete | `is_active` |
| Multi-tenant | Por org (catálogo pode ser seed inicial) |
| Riscos | Operadoras globais vs por org — preferir por org para isolamento |

### `operator_plans`

| Item | Conteúdo |
|------|----------|
| Finalidade | Planos/configurações por operadora |
| Colunas principais | `id`, `organization_id`, `operator_id`, `name`, `code`, `is_active`, metadados de prazo (quando confirmados), timestamps |
| PK | `id` |
| FKs | operator, organization |
| Constraints | Único (`operator_id`, `code`) |
| Índices | (`operator_id`, `is_active`) |
| Soft delete | `is_active` |
| Multi-tenant | `organization_id` |
| Riscos | Relação plano↔contrato ainda aberta |

### `field_definitions`

| Item | Conteúdo |
|------|----------|
| Finalidade | Catálogo de campos dinâmicos |
| Colunas principais | `id`, `organization_id`, `key`, `label`, `data_type`, `validation_json`, `is_active` |
| PK | `id` |
| FKs | organization |
| Constraints | Único (`organization_id`, `key`) |
| Índices | (`organization_id`, `key`) |
| Soft delete | `is_active` |
| Multi-tenant | `organization_id` |
| Riscos | Validação excessivamente genérica; tipagem fraca |

### `operator_plan_fields`

| Item | Conteúdo |
|------|----------|
| Finalidade | Quais campos valem para um plano (obrigatório, ordem, visibilidade) |
| Colunas principais | `id`, `organization_id`, `operator_plan_id`, `field_definition_id`, `is_required`, `sort_order`, `applies_to` (contract/recharge — se necessário) |
| PK | `id` |
| FKs | plan, field_definition |
| Constraints | Único (plan, field) |
| Índices | (`operator_plan_id`, `sort_order`) |
| Soft delete | remoção lógica ou delete controlado |
| Multi-tenant | `organization_id` |
| Riscos | Inventar obrigatoriedade sem confirmação de negócio |

### `document_types`

| Item | Conteúdo |
|------|----------|
| Finalidade | Catálogo de tipos documentais |
| Colunas principais | `id`, `organization_id`, `key`, `label`, `is_active` |
| PK | `id` |
| FKs | organization |
| Constraints | Único (`organization_id`, `key`) |
| Índices | key |
| Soft delete | `is_active` |
| Multi-tenant | `organization_id` |
| Riscos | Lista real ainda não confirmada |

### `operator_plan_documents`

| Item | Conteúdo |
|------|----------|
| Finalidade | Documentos exigidos/opcionais por plano |
| Colunas principais | `id`, `organization_id`, `operator_plan_id`, `document_type_id`, `is_required`, `sort_order` |
| PK | `id` |
| FKs | plan, document_type |
| Constraints | Único (plan, document_type) |
| Índices | plan |
| Soft delete | inativação |
| Multi-tenant | `organization_id` |
| Riscos | Requisitos reais desconhecidos |

### `pendency_reasons`

| Item | Conteúdo |
|------|----------|
| Finalidade | Motivos configuráveis de pendência |
| Colunas principais | `id`, `organization_id`, `code`, `label`, `applies_to` (`contract`\|`recharge`\|`both`), `is_active` |
| PK | `id` |
| FKs | organization |
| Constraints | Único (`organization_id`, `code`) |
| Índices | (`organization_id`, `applies_to`) |
| Soft delete | `is_active` |
| Multi-tenant | `organization_id` |
| Riscos | Catálogo ainda não definido pelo negócio |

### `contracts`

| Item | Conteúdo |
|------|----------|
| Finalidade | Vínculo lojista↔operadora |
| Colunas principais | `id`, `organization_id`, `merchant_id`, `operator_id`, `operator_plan_id` (nullable até confirmação), `consultant_id` (snapshot do responsável), `status`, datas relevantes, timestamps |
| PK | `id` |
| FKs | merchant, operator, plan, consultant, organization |
| Constraints | Check de `status` conforme proposta de workflow. **Não** há constraint exclusiva confirmada em `merchant_id + operator_id` (nem unique parcial de “ativo”) — ver Q01 |
| Índices | (`organization_id`, `status`), (`merchant_id`), (`consultant_id`), (`operator_id`). Índice parcial/regra de contrato ativo: **apenas questão aberta**, não proposta adotada |
| Soft delete | status `cancelled`/`inactive` preferível a delete |
| Multi-tenant | `organization_id` |
| Riscos | Assumir unicidade por operadora sem confirmação; snapshot vs join do consultor; misturar dados de recarga |

### `contract_field_values`

| Item | Conteúdo |
|------|----------|
| Finalidade | Valores dinâmicos do contrato |
| Colunas principais | `id`, `organization_id`, `contract_id`, `field_definition_id`, `value_text` / `value_json`, timestamps |
| PK | `id` |
| FKs | contract, field_definition |
| Constraints | Único (contract, field) |
| Índices | `contract_id` |
| Soft delete | update in place + audit |
| Multi-tenant | `organization_id` |
| Riscos | Tipagem; busca; LGPD em campos livres |

### `contract_documents`

| Item | Conteúdo |
|------|----------|
| Finalidade | Anexos do contrato |
| Colunas principais | `id`, `organization_id`, `contract_id`, `document_type_id`, `storage_path`, `file_name`, `mime_type`, `uploaded_by`, `uploaded_at`, `status` |
| PK | `id` |
| FKs | contract, document_type, uploaded_by |
| Constraints | path não público |
| Índices | (`contract_id`), (`organization_id`) |
| Soft delete | status / `deleted_at` |
| Multi-tenant | `organization_id` + path namespaced |
| Riscos | Storage sem RLS; links permanentes |

### `contract_reviews`

| Item | Conteúdo |
|------|----------|
| Finalidade | Registros de conferência |
| Colunas principais | `id`, `organization_id`, `contract_id`, `reviewed_by`, `result`, `notes`, `reviewed_at` |
| PK | `id` |
| FKs | contract, reviewed_by |
| Constraints | result em domínio controlado |
| Índices | (`contract_id`, `reviewed_at`) |
| Soft delete | append-only |
| Multi-tenant | `organization_id` |
| Riscos | Sobreposição com status history |

### `contract_pendencies`

| Item | Conteúdo |
|------|----------|
| Finalidade | Pendências do contrato |
| Colunas principais | `id`, `organization_id`, `contract_id`, `pendency_reason_id`, `description`, `status`, `opened_by`, `resolved_by`, `due_at`, timestamps |
| PK | `id` |
| FKs | contract, reason, actors |
| Constraints | status controlado |
| Índices | (`contract_id`, `status`), `due_at` |
| Soft delete | status resolved/cancelled |
| Multi-tenant | `organization_id` |
| Riscos | Prazos (úteis vs corridos) não confirmados |

### `contract_status_history`

| Item | Conteúdo |
|------|----------|
| Finalidade | Histórico de status do contrato |
| Colunas principais | `id`, `organization_id`, `contract_id`, `from_status`, `to_status`, `changed_by`, `note`, `changed_at` |
| PK | `id` |
| FKs | contract, changed_by |
| Constraints | append-only |
| Índices | (`contract_id`, `changed_at`) |
| Soft delete | nunca |
| Multi-tenant | `organization_id` |
| Riscos | Histórico incompleto se update direto sem trigger/service |

### `recharges`

| Item | Conteúdo |
|------|----------|
| Finalidade | Movimentação dentro do contrato |
| Colunas principais | `id`, `organization_id`, `contract_id`, `status`, valores/datas (a confirmar), `requested_by`, timestamps |
| PK | `id` |
| FKs | contract, organization, requested_by |
| Constraints | check status; contract da mesma org |
| Índices | (`contract_id`, `status`), (`organization_id`, `status`) |
| Soft delete | status `cancelled` |
| Multi-tenant | `organization_id` (+ via contract) |
| Riscos | Campos de negócio da recarga não confirmados; confundir com contrato |

### `recharge_status_history`

| Item | Conteúdo |
|------|----------|
| Finalidade | Histórico da recarga |
| Colunas principais | `id`, `organization_id`, `recharge_id`, `from_status`, `to_status`, `changed_by`, `note`, `changed_at` |
| PK | `id` |
| FKs | recharge |
| Constraints | append-only |
| Índices | (`recharge_id`, `changed_at`) |
| Soft delete | nunca |
| Multi-tenant | `organization_id` |
| Riscos | Mesmos do histórico de contrato |

### `recharge_receipts`

| Item | Conteúdo |
|------|----------|
| Finalidade | Comprovantes da recarga |
| Colunas principais | `id`, `organization_id`, `recharge_id`, `storage_path`, `file_name`, `uploaded_by`, `uploaded_at` |
| PK | `id` |
| FKs | recharge |
| Constraints | path privado |
| Índices | `recharge_id` |
| Soft delete | `deleted_at` |
| Multi-tenant | `organization_id` |
| Riscos | Formato/obrigatoriedade em aberto |

### `comments`

| Item | Conteúdo |
|------|----------|
| Finalidade | Comentários operacionais |
| Colunas principais | `id`, `organization_id`, `entity_type` (`contract`\|`recharge`), `entity_id`, `author_id`, `body`, `created_at` |
| PK | `id` |
| FKs | author; entity polimórfica (ou FKs nullable tipadas) |
| Constraints | exatamente um alvo |
| Índices | (`entity_type`, `entity_id`) |
| Soft delete | `deleted_at` opcional |
| Multi-tenant | `organization_id` |
| Riscos | Polimorfismo dificulta FK rígida |

### `notifications`

| Item | Conteúdo |
|------|----------|
| Finalidade | Notificações in-app |
| Colunas principais | `id`, `organization_id`, `recipient_profile_id`, `type`, `payload_json`, `read_at`, `created_at` |
| PK | `id` |
| FKs | recipient, organization |
| Constraints | — |
| Índices | (`recipient_profile_id`, `read_at`) |
| Soft delete | retenção com purge |
| Multi-tenant | `organization_id` |
| Riscos | Spam; PII no payload |

### `audit_logs`

| Item | Conteúdo |
|------|----------|
| Finalidade | Auditoria transversal |
| Colunas principais | `id`, `organization_id`, `actor_id`, `action`, `entity_type`, `entity_id`, `before_json`, `after_json`, `ip`, `created_at` |
| PK | `id` |
| FKs | organization, actor |
| Constraints | append-only |
| Índices | (`organization_id`, `created_at`), (`entity_type`, `entity_id`) |
| Soft delete | nunca (retenção política) |
| Multi-tenant | `organization_id` |
| Riscos | Volume; dados sensíveis em JSON; performance |

### `integration_events`

| Item | Conteúdo |
|------|----------|
| Finalidade | Outbox de integrações |
| Colunas principais | `id`, `organization_id`, `provider`, `event_type`, `payload_json`, `idempotency_key`, `status`, `attempts`, `last_error`, `created_at`, `processed_at` |
| PK | `id` |
| FKs | organization |
| Constraints | Único (`organization_id`, `idempotency_key`) |
| Índices | (`status`, `created_at`), provider |
| Soft delete | status terminal |
| Multi-tenant | `organization_id` |
| Riscos | Duplicidade sem idempotência; retries infinitos |

---

## Enums sugeridos (proposta — não finais)

- `member_role`: `admin`, `operator`, `consultant`
- `contract_status`: `draft`, `awaiting_review`, `pending_correction`, `corrected`, `approved`, `registered_at_operator`, `active`, `rejected`, `cancelled`, `inactive` — **sem** `submitted` (ver `CONTRACT_WORKFLOW.md`)
- `recharge_status`: `draft`, `requested`, `processing`, `pending`, `processed`, `completed`, `cancelled`
- `pendency_status`: `open`, `resolved`, `cancelled` (proposta técnica)
- `integration_status`: `pending`, `processing`, `succeeded`, `failed`, `dead_letter`

## Avaliação crítica

1. **Unicidade `merchant_id + operator_id`:** **não** é decisão confirmada. Não adotar unique rígido nem unique parcial de ativo nesta etapa. Permanecer só em `OPEN_QUESTIONS.md` (Q01), cobrindo também renovação, substituição, planos e históricos inativos.
2. **`consultant_id` no contrato:** snapshot é **proposta** para rastreio; fonte de verdade do responsável atual em `merchants.consultant_id`.
3. **Campos dinâmicos:** evitam 15 módulos; UX + Zod a partir da config.
4. **Histórico operacional vs auditoria técnica:** `*_status_history` ≠ `audit_logs` ≠ `integration_events` — permissões em `AUTHORIZATION_AND_RLS.md`.
5. **Reviews vs status history:** atos de conferência ≠ trilha de status.
6. **Storage:** paths com `organization_id`; URLs assinadas; bucket privado.
7. **RLS:** obrigatório em todas as tabelas operacionais.

## Fora desta sprint

SQL, migrations, seeds e conexão Supabase.
