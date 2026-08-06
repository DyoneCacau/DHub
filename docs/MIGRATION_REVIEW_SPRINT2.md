# Revisão de Migration — Sprint 2 (Auth / Tenant)

**Escopo:** apenas arquivos locais em `supabase/migrations/`.  
**Autorização remota:** qualquer `db push` / rollback remoto exige aprovação explícita.

## Aviso sobre o estado remoto

Em 2026-08-06 as migrations abaixo foram aplicadas no projeto DHub durante um passo intermediário da sessão (`supabase db push`), **antes** da instrução de não aplicar remotamente ainda.

- Local e remote estavam alinhados naquele momento.
- **Nenhum push adicional** deve ser feito sem nova autorização.
- Se a intenção era manter o remoto intacto até esta revisão, avaliar o **plano de rollback** abaixo.

## Arquivos SQL

| Arquivo | Finalidade |
|---------|------------|
| `supabase/migrations/20260806120000_init_auth_tenant.sql` | Enums, tabelas, índices, helpers, triggers, RLS, grants |
| `supabase/migrations/20260806120100_profile_update_guard.sql` | Trigger que preserva `profiles.id` e `profiles.email` |
| `supabase/migrations/20260806120200_harden_auth_permissions.sql` | Sprint 2.1: grants mínimos, EXECUTE, default privileges, colunas (local; aguarda auth remota) |
| `supabase/bootstrap/first_admin.sql.example` | Bootstrap manual (comentado; sem segredos) |
| `supabase/rollback/20260806120000_rollback_auth_tenant.sql.example` | Rollback completo (exemplo; não executar sem autorização) |
| `supabase/rollback/20260806120200_rollback_harden_auth_permissions.sql.example` | Rollback só dos grants/endurecimento 2.1 |
| `docs/HARDEN_AUTH_PERMISSIONS_SPRINT21.md` | Revisão detalhada da 2.1 |

---

## Tabelas

### `organizations`

| Coluna | Tipo | Notas |
|--------|------|-------|
| id | uuid PK | `gen_random_uuid()` |
| name | text not null | |
| slug | text not null | unique + check formato kebab |
| status | organization_status | `active` \| `inactive` |
| created_at / updated_at | timestamptz | |

Índice: `(status)`.

### `profiles`

| Coluna | Tipo | Notas |
|--------|------|-------|
| id | uuid PK | FK `auth.users(id)` ON DELETE CASCADE |
| full_name | text | opcional |
| email | text | **cópia de exibição**; auth canônico em `auth.users` |
| avatar_url | text | |
| created_at / updated_at | timestamptz | |

Índice: `(email)`. Sem senha.

### `organization_members`

| Coluna | Tipo | Notas |
|--------|------|-------|
| id | uuid PK | |
| organization_id | uuid FK | cascade |
| user_id | uuid FK → profiles | cascade |
| role | app_role | `admin` \| `operator` \| `consultant` |
| status | membership_status | `active` \| `inactive` |
| created_by | uuid FK profiles | nullable |
| created_at / updated_at | timestamptz | |

Unique: `(organization_id, user_id)`.  
Índices: user; (org, status); (user, status).

### `audit_logs`

| Coluna | Tipo | Notas |
|--------|------|-------|
| id | uuid PK | |
| organization_id | uuid FK | |
| actor_id | uuid FK profiles | nullable (bootstrap SQL) |
| action | text | check não vazio |
| entity_type / entity_id | text / uuid | |
| metadata | jsonb | sem senha/token |
| created_at | timestamptz | |

Índice: `(organization_id, created_at desc)`.

---

## Enums

- `app_role`: admin, operator, consultant  
- `membership_status`: active, inactive  
- `organization_status`: active, inactive  

---

## Funções

| Função | security | Finalidade |
|--------|----------|------------|
| `set_updated_at` | invoker | `updated_at = now()` |
| `has_active_membership(org)` | **definer** + `search_path=public` | membership ativa do `auth.uid()` |
| `has_org_role(org, roles[])` | **definer** | papel ativo |
| `is_org_admin(org)` | **definer** | atalho admin |
| `is_active_member_of_any_org()` | **definer** | qualquer org ativa |
| `handle_new_user` | **definer** | cria/atualiza profile; **não** cria membership nem lê role de metadata |
| `audit_organization_member_changes` | **definer** | audit create/role/status |
| `enforce_profile_self_update` | invoker | bloqueia mudança de id; força email imutável |

Execute em helpers: **revoke public**, **grant authenticated** (exceto triggers internos).

---

## Triggers

| Trigger | Tabela | Evento |
|---------|--------|--------|
| `organizations_set_updated_at` | organizations | before update |
| `profiles_set_updated_at` | profiles | before update |
| `organization_members_set_updated_at` | organization_members | before update |
| `on_auth_user_created` | auth.users | after insert → profile |
| `organization_members_audit` | organization_members | after insert/update → audit_logs |
| `profiles_enforce_self_update` | profiles | before update → guarda id/email |

---

## Políticas RLS

RLS **habilitado** nas 4 tabelas. Sem policies para `anon`. Sem `using (true)`.

### organizations

| Op | Policy | Regra |
|----|--------|-------|
| SELECT | `organizations_select_member` | `has_active_membership(id)` |
| UPDATE | `organizations_update_admin` | `is_org_admin(id)` |
| INSERT/DELETE | — | só via SQL privilegiado / bootstrap |

### profiles

| Op | Policy | Regra |
|----|--------|-------|
| SELECT | `profiles_select_self` | `id = auth.uid()` |
| SELECT | `profiles_select_org_admin` | admin da org do membro |
| UPDATE | `profiles_update_self` | self (+ trigger email/id) |
| INSERT | — | trigger `handle_new_user` |

### organization_members

| Op | Policy | Regra |
|----|--------|-------|
| SELECT | `members_select_self` | própria linha |
| SELECT | `members_select_admin` | admin da org |
| SELECT | `members_select_operator_readonly` | operator da org (leitura) |
| INSERT/UPDATE/DELETE | — | sem policy client (anti-autoelevação nesta sprint) |

### audit_logs

| Op | Policy | Regra |
|----|--------|-------|
| SELECT | `audit_logs_select_admin` | `is_org_admin(organization_id)` |
| INSERT | — | trigger security definer |

---

## Grants e Revokes

```text
REVOKE ALL ON tables FROM anon, public
GRANT SELECT, UPDATE ON organizations, profiles TO authenticated
GRANT SELECT ON organization_members, audit_logs TO authenticated

REVOKE ALL ON helper functions FROM public
GRANT EXECUTE ON has_* / is_* TO authenticated
```

`anon` não recebe acesso às tabelas da aplicação.

---

## Riscos revisados

| Risco | Mitigação / residual |
|-------|----------------------|
| Autoelevação de papel | Sem UPDATE client em memberships |
| Role em `raw_user_meta_data` | Ignorado no trigger de profile |
| Recursão RLS | Helpers security definer |
| Email editável | Trigger força `new.email := old.email` |
| Operator lista membros | Intencional (leitura); não altera papel |
| Table owner bypass RLS | Melhoria futura: `FORCE ROW LEVEL SECURITY` (não aplicada) |
| Push remoto precoce | Já ocorreu uma vez; novos pushes bloqueados até autorização |

---

## Plano de rollback

Arquivo: `supabase/rollback/20260806120000_rollback_auth_tenant.sql.example`

Ordem:

1. Drop policies (4 tabelas)  
2. Drop triggers (incl. `on_auth_user_created` em `auth.users`)  
3. Drop functions  
4. Drop tables: `audit_logs` → `organization_members` → `profiles` → `organizations`  
5. Drop enums  
6. Remover entradas em `supabase_migrations.schema_migrations` se o fluxo CLI exigir (via `supabase migration repair` / processo oficial)

**Não executar rollback sem autorização explícita.**  
Rollback apaga dados de tenant/auth app (não apaga `auth.users` automaticamente, exceto se houver cascata ao dropar profiles — `profiles` FK cascade from auth.users; dropar profiles **não** remove auth.users).

---

## Checklist pré-autorização (remoto)

- [x] SQL revisado localmente  
- [x] Tabelas / enums / FKs / índices documentados  
- [x] Funções e triggers documentados  
- [x] RLS documentada  
- [x] Grants/revokes documentados  
- [x] Rollback example versionado  
- [x] lint / typecheck / build  
- [ ] Autorização explícita para **manter** o remoto como está **ou** para **rollback**  
- [ ] Autorização explícita para **novo** `db push` (se houver migration nova)  
- [ ] Bootstrap do primeiro admin (manual)  
