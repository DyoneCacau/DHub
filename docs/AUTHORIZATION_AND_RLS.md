# DHub — Autorização e RLS

**Tipo:** proposta arquitetural + decisões de perfil confirmadas onde indicado.

Autorização **não pode depender apenas do frontend** (**decisão confirmada**). Enforcement: PostgreSQL RLS (Supabase) + `organization_members.role`.

## Isolamento por organização

- Toda tabela operacional inclui `organization_id`.
- Usuário autenticado só enxerga linhas das orgs em que é membro ativo.
- Funções auxiliares sugeridas (conceituais): `current_profile_id()`, `is_org_member(org_id)`, `org_role(org_id)`, `current_consultant_id()`.

## Tipos de trilha (separação obrigatória)

| Tipo | Exemplos | Quem acessa (consolidado Sprint 0.1) |
|------|----------|--------------------------------------|
| **Histórico operacional** | `contract_status_history`, `recharge_status_history`, reviews/pendências visíveis no fluxo | Admin: todos da org. Operador: necessários ao trabalho na org. Consultor: somente dos próprios lojistas/contratos/recargas |
| **Auditoria técnica** | `audit_logs` (before/after, ator, ação administrativa) | **Somente administrador** da organização. Operador e consultor: **não** |
| **Logs de integração** | `integration_events`, erros de providers | Admin (operacional de integração). Operador: **não automaticamente**. Consultor: não |
| **Logs de segurança** | Auth failures, mudanças de role, desligamentos, acesso a secrets | **Somente administrador** (e processos de segurança). Operador/consultor: não |

## Acesso por perfil

### Administrador (`admin`) — consolidado

| Recurso | Acesso |
|---------|--------|
| Usuários / memberships / configs críticas | Sim |
| Lojistas, contratos, recargas (toda a org) | Sim |
| Conferências, pendências, status, comprovantes | Sim |
| Relatórios | Sim |
| Históricos operacionais | Sim (toda a org) |
| Auditoria técnica completa da organização | **Sim** |
| Logs de integração e segurança | **Sim** (conforme necessidade administrativa) |
| Escrita em `audit_logs` | Não (append via sistema/triggers) |

### Operador administrativo (`operator`) — consolidado

| Recurso | Acesso |
|---------|--------|
| Contratos e recargas (toda a org) | Leitura/atualização operacional |
| Conferências, pendências, status, comprovantes, prazos | Sim |
| Históricos operacionais necessários ao trabalho | **Sim** |
| Configurações críticas | **Não** por padrão |
| Auditoria técnica completa | **Não** |
| Eventos restritos de segurança ou administração | **Não** |
| Logs de integração | **Não** automaticamente |
| Relatórios operacionais | Sim (detalhe de escopo ainda pode ser refinado — não é auditoria) |

### Consultor (`consultant`) — consolidado

| Recurso | Acesso |
|---------|--------|
| Lojistas / contratos / recargas / docs autorizados | Somente os próprios |
| Históricos operacionais autorizados do próprio escopo | **Sim** |
| Auditoria técnica | **Não** |
| Logs de integração / segurança | **Não** |
| Configurações | **Não** |
| Dados de outro consultor | **Negado** |

### Lojista

Sem login no MVP → sem políticas de usuário lojista (**decisão confirmada**).

## Matriz por recurso

### Lojistas / Contratos / Recargas / Documentos

Inalterado em espírito: isolamento por org; consultor por ownership. Detalhes de snapshot vs consultor atual após transferência: **questão aberta** (Q12).

### Relatórios

- Admin: amplo.
- Operador: operacional (não equivale a auditoria técnica).
- Consultor: apenas indicadores dos próprios dados, se houver no MVP.

### Auditoria técnica vs histórico

- **Histórico operacional:** parte do trabalho diário (status, pendências).
- **Auditoria técnica:** investigação/conformidade; leitura só admin; escrita só sistema.

## Políticas (orientação — proposta)

### Leitura (SELECT)

1. Membro ativo da `organization_id`.
2. Se `consultant`, predicado de ownership.
3. Se `operator`, org inteira exceto configs, `audit_logs`, logs de segurança e (por padrão) integração.
4. Se `admin`, org inteira incluindo auditoria técnica.

### Criação / Atualização / Delete

Como na Sprint 0: org coerente; configs só admin; históricos e audit sem UPDATE pelo client; preferir inativação.

## Riscos de escalação de privilégio

| Risco | Mitigação |
|-------|-----------|
| Consultor altera `consultant_id` | Só admin + history |
| IDOR em IDs / storage | RLS + path com org |
| Operador promove a admin no client | UPDATE de `role` só admin |
| Operador lê `audit_logs` via API | Policy nega SELECT para non-admin |
| Service role no frontend | Nunca expor |
| Membership inativo com JWT | Checar `is_active` |

## Estratégia de testes de RLS

Incluir casos explícitos:

- operator **não** SELECT em `audit_logs`;
- operator **sim** SELECT em `contract_status_history` / `recharge_status_history` da org;
- consultant **sim** history do próprio contrato; **não** de outro consultor; **não** `audit_logs`;
- admin SELECT em auditoria da própria org; **não** de outra org.

Demais fixtures da Sprint 0 permanecem válidas.

## Sprint 3 — Consultores e lojistas

Ver `docs/CONSULTANTS_AND_MERCHANTS.md` e migration `20260806130000_consultants_merchants.sql`.

- FK composta garante `merchants.organization_id = consultants.organization_id`.
- Consultant: SELECT próprio consultor; merchants só do próprio `consultant_id`; INSERT merchant força vínculo a si.
- Operator: gestão operacional; **não** altera `consultants.user_id`.
- Admin: gestão completa na org, incluindo vínculo Auth.
- Sem DELETE pelo client; inativação via `status`.
- Auditoria técnica (`audit_logs`) continua só SELECT admin; eventos de domínio via triggers.

## Sprint 4 — Bandeiras, regiões e vínculos

Ver `docs/OPERATORS_AND_REGIONS.md` e migration `20261007120000_operators_regions.sql`.

- `operators`/`regions`: SELECT para membros ativos; INSERT/UPDATE só admin; sem DELETE.
- `consultant_operators`/`consultant_regions`: admin/operator leem, inserem e removem na org; consultant lê só os próprios; FKs compostas garantem mesmo tenant.

## Sprint 5 — Operações e Ações

Ver `docs/OPERATIONS_AND_ACTIONS.md` e migration `20261007130000_operations_actions.sql`.

- `expense_types`, `actions`, `action_participants`, `action_expenses`, `expense_attachments` e views: **somente admin** (`is_org_admin`); operator e consultant sem acesso (Q22).
- INSERT exige org ativa (`current_active_organization_id()`); campos de criação forçados por trigger; colunas imutáveis protegidas.
- Sem DELETE em ações, despesas e tipos (cancelamento/inativação por status); DELETE só em participantes e comprovantes.
- Bucket privado `action-receipts`: policies em `storage.objects` exigem bucket, pasta raiz = org ativa e admin; download por URL assinada (60 s).
