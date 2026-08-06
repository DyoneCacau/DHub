# Sprint 2.1 — Harden auth permissions

**Status:** migration local criada; **não** aplicada no remoto.  
**Arquivo:** `supabase/migrations/20260806120200_harden_auth_permissions.sql`  
**Rollback (exemplo):** `supabase/rollback/20260806120200_rollback_harden_auth_permissions.sql.example`

Não edita `20260806120000_*` nem `20260806120100_*`.

---

## 1. Conteúdo da migration

Ver arquivo integral em `supabase/migrations/20260806120200_harden_auth_permissions.sql` (transação `begin`/`commit`, idempotente via `create or replace`, `drop trigger if exists`, `revoke`/`grant`).

---

## 2. Grants de tabela — antes (remoto auditado) × depois (esperado)

| Tabela | Antes (`authenticated`) | Depois (`authenticated`) | `anon` |
|--------|-------------------------|--------------------------|--------|
| `organizations` | ALL | SELECT, UPDATE (tabela) | nenhum |
| `profiles` | ALL | SELECT (tabela) + UPDATE (`full_name`, `avatar_url`) | nenhum |
| `organization_members` | ALL | SELECT | nenhum |
| `audit_logs` | ALL | SELECT | nenhum |

`service_role` / `postgres` permanecem com privilégios de owner/admin (não revogados nesta migration).

### Grants por coluna e PostgREST

`GRANT UPDATE (full_name, avatar_url)` é compatível com:

```ts
supabase.from("profiles").update({ full_name, avatar_url }).eq("id", user.id).select("*")
```

- UPDATE só nas colunas concedidas.
- `select("*")` usa SELECT de tabela (todas as colunas legíveis pela RLS).
- Tentativa de PATCH em `email`/`id`/`created_at` falha por privilégio **ou** é barrada pelo trigger.

---

## 3. Funções e EXECUTE — esperado após migration

| Função | EXECUTE `anon` | EXECUTE `authenticated` | Notas |
|--------|----------------|-------------------------|-------|
| `has_active_membership` | não | sim | helper RLS |
| `has_org_role` | não | sim | helper RLS |
| `is_org_admin` | não | sim | helper RLS |
| `is_active_member_of_any_org` | não | sim | helper RLS |
| `handle_new_user` | não | não | só trigger |
| `audit_organization_member_changes` | não | não | só trigger |
| `set_updated_at` | não | não | só trigger |
| `enforce_profile_self_update` | não | não | só trigger |
| `enforce_organization_immutable_columns` | não | não | só trigger (novo) |

### Confirmação técnica (PostgreSQL)

`EXECUTE` na função de trigger é exigido na **criação** do trigger (papel dono). No **disparo** em runtime, o PostgreSQL **não** revalida `EXECUTE` do role que fez o DML. Portanto, revogar `EXECUTE` de `anon`/`authenticated` nas funções de trigger é seguro e recomendado.

Todas as funções SECURITY DEFINER passam a `search_path = public, pg_temp`.

---

## 4. Default privileges encontrados (remoto, leitura)

Consultado em `pg_default_acl`:

| Grantor (role criador) | Schema | Tipo | Destinatários típicos |
|------------------------|--------|------|------------------------|
| **`postgres`** | `public` | tables (`r`) | ALL → postgres, **anon**, **authenticated**, service_role |
| **`postgres`** | `public` | functions (`f`) | EXECUTE → postgres, **anon**, **authenticated**, service_role |
| **`postgres`** | `public` | sequences (`S`) | rwU → idem |
| `supabase_admin` | `public` | r/f/S | espelho semelhante |

**Causa do drift:** objetos Sprint 2 têm owner `postgres`. Ao criar tabelas/funções, os *default privileges* de `postgres` em `public` concedem ALL/EXECUTE automaticamente a `anon` e `authenticated`. O `REVOKE … FROM anon, public` da migration inicial não removeu o ALL de `authenticated`, e o EXECUTE específico a `anon` sobreviveu ao `REVOKE FROM PUBLIC`.

**Comando aplicado na 2.1 (seguro):**

```sql
alter default privileges for role postgres in schema public
  revoke all on tables from public, anon, authenticated;
-- (idem sequences e functions)
```

**Não** alteramos defaults de `supabase_admin` (objetos do Dashboard / papéis internos). Novos objetos via SQL Editor como outro role ainda podem herdar defaults daquele role — documentar e conceder grants explícitos.

---

## 5. Proteção de colunas

| Objeto | Proteção |
|--------|----------|
| `profiles` | Trigger: bloqueia mudança de `id` e `created_at`; força `email = old.email`. Colunas editáveis pelo grant: `full_name`, `avatar_url`. `updated_at` via `set_updated_at`. |
| `organizations` | Novo trigger `organizations_enforce_immutable`: bloqueia `id` e `created_at`. Campos legítimos: `name`, `slug`, `status` (+ `updated_at` sistema). |

---

## 6. Impacto no frontend

| Fluxo | Impacto |
|-------|---------|
| Login / sessão | Nenhum (Auth API). |
| `fetchProfile` / `fetchActiveMembership` / `fetchOrganization` | Continuam com SELECT; RLS inalterada. |
| `updateOwnProfile` (`full_name`, `avatar_url`) | Compatível com grant por coluna. |
| `listOrganizationMembers` | Só em `/configuracoes/usuarios` (**admin**). Sem mudança de UI. |
| Operador listando members via API direta | Continua possível pela policy (ver §7). |

Nenhuma alteração de código frontend é **obrigatória** nesta sprint.

---

## 7. Memberships do operador — decisão

**Alternativa 3 — manter temporariamente** `members_select_operator_readonly`.

| Alternativa | Avaliação |
|-------------|-----------|
| 1. Remover acesso | Reduz superfície; quebraria RLS_TEST_PLAN #6 e qualquer UI futura de operador. Frontend atual **não** usa a listagem como operator. |
| 2. View segura | Ideal a médio prazo (campos mínimos); exige migration + tipos + queries. |
| 3. Manter + justificar | **Escolhida.** UI admin-only; política cobre leitura operacional planejada; endurecimento de grants já remove INSERT/UPDATE/DELETE. |

Próximo passo sugerido (sprint futura): view `organization_member_directory` com colunas mínimas + dropar policy ampla.

---

## 8. Rollback

Arquivo comentado: `supabase/rollback/20260806120200_rollback_harden_auth_permissions.sql.example`.  
Restaura grants pretendidos da Sprint 2 e remove o trigger novo; **não** dropa tabelas. Não executar sem autorização.

---

## 9. Testes (após `db push` autorizado)

| # | Caso | Esperado |
|---|------|----------|
| H1 | `anon` `select has_active_membership(...)` / RPC | permission denied |
| H2 | `authenticated` chama helpers RLS | OK |
| H3 | `authenticated` EXECUTE `handle_new_user` / `set_updated_at` | permission denied |
| H4 | `authenticated` INSERT/DELETE em qualquer das 4 tabelas | negado (privilégio e/ou RLS) |
| H5 | UPDATE `profiles` só `full_name`/`avatar_url` | OK |
| H6 | UPDATE `profiles.email` ou `created_at` | falha (grant e/ou trigger) |
| H7 | operator UPDATE membership | negado |
| H8 | INSERT/UPDATE membership via SQL privilegiado | audit_logs gerado pelo trigger |
| H9 | Login + leitura da própria membership | OK |
| H10 | Admin lista usuários em `/configuracoes/usuarios` | OK |

Ampliar `docs/RLS_TEST_PLAN.md` na mesma entrega.

---

## 10. Restrições desta entrega

- Sem `supabase db push`
- Sem SQL remoto de escrita
- Sem rollback remoto
- Sem bootstrap / usuários
- Sem commit / push Git
