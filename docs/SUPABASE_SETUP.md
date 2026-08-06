# DHub — Setup Supabase (Sprint 2)

## Variáveis de ambiente

Arquivo local (não versionado): `.env.local`

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
```

Arquivo versionável: `.env.example` (valores vazios).

**Nunca** versionar ou colar no chat/docs:

- publishable key real;
- `service_role` / `sb_secret`;
- senha do banco;
- connection string.

O frontend usa **somente** URL + publishable key. Autorização real = RLS.

## Auth no Dashboard Supabase

Configurações recomendadas (ajustar manualmente no projeto):

| Item | Valor sugerido |
|------|----------------|
| Site URL | `http://127.0.0.1:5173` |
| Redirect URLs | `http://127.0.0.1:5173/redefinir-senha`, `http://localhost:5173/redefinir-senha` |
| Enable signups | **Desabilitado** (sem cadastro público) |
| Confirmação de e-mail | Conforme política da organização |
| Política de senha | Mínimo 8 caracteres (alinhado ao formulário) |

A aplicação **não** altera essas configurações remotamente.

## Recuperação de senha

1. Usuário solicita em `/esqueci-senha`.
2. Supabase envia e-mail com link para `/redefinir-senha`.
3. A sessão de recovery é detectada no cliente; a senha é atualizada via `updateUser`.
4. A resposta da solicitação é **sempre genérica** (não revela se o e-mail existe).

## Migrations

Arquivos em `supabase/migrations/`:

1. `20260806120000_init_auth_tenant.sql` — enums, tabelas, helpers, RLS, trigger de perfil, auditoria.
2. `20260806120100_profile_update_guard.sql` — impede alteração de id/email do perfil.

Revisão completa: [`docs/MIGRATION_REVIEW_SPRINT2.md`](./MIGRATION_REVIEW_SPRINT2.md).  
Rollback exemplo: `supabase/rollback/20260806120000_rollback_auth_tenant.sql.example`.

### Política de aplicação remota

- **Não** executar `supabase db push` sem autorização explícita.
- **Não** executar rollback remoto sem autorização explícita.

### Estado conhecido (transparência)

Em 2026-08-06 ocorreu um `db push` na sessão de desenvolvimento que aplicou as duas migrations acima no projeto DHub. A revisão formal e qualquer decisão de **manter** ou **reverter** o remoto ficam sob autorização explícita do responsável.

## Bootstrap do primeiro administrador

Sem tela pública de cadastro admin.

1. Criar usuário no **Supabase Auth** (Dashboard → Users), anotando o UUID.
2. Confirmar que o schema revisado está no ambiente desejado (ou aguardar autorização de push/rollback).
3. Revisar e executar o SQL de exemplo em `supabase/bootstrap/first_admin.sql.example` (substituir placeholders).
4. Confirmar membership `admin` + `active` na organização.
5. Não deixar e-mail/senha no repositório.

## Modelo

- `organizations`
- `profiles` (1:1 `auth.users`; e-mail em profiles é cópia de exibição)
- `organization_members` (papel + status; unique org+user)
- `audit_logs` (membership create/role/status; sem senhas/tokens)

## Multi-membership (provisório)

Se o usuário tiver várias memberships ativas, o app usa a mais recente (`updated_at` desc). Documentar seleção explícita de org em sprint futura.

## Testes de RLS

Ver `docs/RLS_TEST_PLAN.md`.
