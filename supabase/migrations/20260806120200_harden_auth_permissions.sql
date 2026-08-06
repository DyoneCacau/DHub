-- Sprint 2.1: menor privilégio (grants) + endurecimento de colunas/funções.
-- Não altera as migrations já aplicadas (…120000 / …120100).
-- Aplicação remota somente com autorização explícita.
-- Revisão: docs/HARDEN_AUTH_PERMISSIONS_SPRINT21.md

begin;

-- ---------------------------------------------------------------------------
-- 1) Helpers SECURITY DEFINER: search_path = public, pg_temp
-- ---------------------------------------------------------------------------

create or replace function public.has_active_membership(p_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.organization_members m
    where m.organization_id = p_organization_id
      and m.user_id = auth.uid()
      and m.status = 'active'
  );
$$;

create or replace function public.has_org_role(
  p_organization_id uuid,
  p_roles public.app_role[]
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.organization_members m
    where m.organization_id = p_organization_id
      and m.user_id = auth.uid()
      and m.status = 'active'
      and m.role = any (p_roles)
  );
$$;

create or replace function public.is_org_admin(p_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select public.has_org_role(p_organization_id, array['admin']::public.app_role[]);
$$;

create or replace function public.is_active_member_of_any_org()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.organization_members m
    where m.user_id = auth.uid()
      and m.status = 'active'
  );
$$;

-- ---------------------------------------------------------------------------
-- 2) Funções de trigger (sem EXECUTE para anon/authenticated)
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    new.email
  )
  on conflict (id) do update
    set email = excluded.email,
        updated_at = now();
  return new;
end;
$$;

create or replace function public.audit_organization_member_changes()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_action text;
  v_org uuid;
  v_entity uuid;
begin
  if tg_op = 'INSERT' then
    v_action := 'membership.created';
    v_org := new.organization_id;
    v_entity := new.id;
    insert into public.audit_logs (organization_id, actor_id, action, entity_type, entity_id, metadata)
    values (
      v_org,
      auth.uid(),
      v_action,
      'organization_member',
      v_entity,
      jsonb_build_object(
        'user_id', new.user_id,
        'role', new.role,
        'status', new.status
      )
    );
    return new;
  end if;

  if tg_op = 'UPDATE' then
    v_org := new.organization_id;
    v_entity := new.id;

    if new.role is distinct from old.role then
      insert into public.audit_logs (organization_id, actor_id, action, entity_type, entity_id, metadata)
      values (
        v_org,
        auth.uid(),
        'membership.role_changed',
        'organization_member',
        v_entity,
        jsonb_build_object(
          'user_id', new.user_id,
          'from_role', old.role,
          'to_role', new.role
        )
      );
    end if;

    if new.status is distinct from old.status then
      v_action := case
        when new.status = 'active' then 'membership.activated'
        else 'membership.deactivated'
      end;
      insert into public.audit_logs (organization_id, actor_id, action, entity_type, entity_id, metadata)
      values (
        v_org,
        auth.uid(),
        v_action,
        'organization_member',
        v_entity,
        jsonb_build_object(
          'user_id', new.user_id,
          'from_status', old.status,
          'to_status', new.status
        )
      );
    end if;

    return new;
  end if;

  return null;
end;
$$;

-- profiles: somente full_name / avatar_url editáveis pelo cliente;
-- id / email / created_at imutáveis; updated_at fica com set_updated_at.
create or replace function public.enforce_profile_self_update()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.id is distinct from old.id then
    raise exception 'Não é permitido alterar o id do perfil';
  end if;

  if new.created_at is distinct from old.created_at then
    raise exception 'Não é permitido alterar created_at do perfil';
  end if;

  -- e-mail de autenticação não é editável por este caminho
  new.email := old.email;

  return new;
end;
$$;

-- organizations: id e created_at imutáveis; name/slug/status/updated_at legítimos.
create or replace function public.enforce_organization_immutable_columns()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.id is distinct from old.id then
    raise exception 'Não é permitido alterar o id da organização';
  end if;

  if new.created_at is distinct from old.created_at then
    raise exception 'Não é permitido alterar created_at da organização';
  end if;

  return new;
end;
$$;

drop trigger if exists organizations_enforce_immutable on public.organizations;

create trigger organizations_enforce_immutable
  before update on public.organizations
  for each row execute function public.enforce_organization_immutable_columns();

-- ---------------------------------------------------------------------------
-- 3) EXECUTE: revogar amplo, conceder só helpers a authenticated
-- Nota PG: EXECUTE em função de trigger é exigido na CREATE TRIGGER (owner),
-- não no disparo em runtime pelo role autenticado.
-- ---------------------------------------------------------------------------

revoke all on function public.has_active_membership(uuid) from public, anon, authenticated;
revoke all on function public.has_org_role(uuid, public.app_role[]) from public, anon, authenticated;
revoke all on function public.is_org_admin(uuid) from public, anon, authenticated;
revoke all on function public.is_active_member_of_any_org() from public, anon, authenticated;

revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.audit_organization_member_changes() from public, anon, authenticated;
revoke all on function public.set_updated_at() from public, anon, authenticated;
revoke all on function public.enforce_profile_self_update() from public, anon, authenticated;
revoke all on function public.enforce_organization_immutable_columns() from public, anon, authenticated;

grant execute on function public.has_active_membership(uuid) to authenticated;
grant execute on function public.has_org_role(uuid, public.app_role[]) to authenticated;
grant execute on function public.is_org_admin(uuid) to authenticated;
grant execute on function public.is_active_member_of_any_org() to authenticated;

-- ---------------------------------------------------------------------------
-- 4) Grants de tabela: menor privilégio
-- ---------------------------------------------------------------------------

revoke all on table public.organizations from public, anon, authenticated;
revoke all on table public.profiles from public, anon, authenticated;
revoke all on table public.organization_members from public, anon, authenticated;
revoke all on table public.audit_logs from public, anon, authenticated;

grant select, update on table public.organizations to authenticated;

-- SELECT na tabela; UPDATE apenas nas colunas pessoais.
-- PostgREST/supabase-js: .update({ full_name, avatar_url }).select('*')
-- funciona (SELECT em todas as colunas + UPDATE nas colunas concedidas).
grant select on table public.profiles to authenticated;
grant update (full_name, avatar_url) on table public.profiles to authenticated;

grant select on table public.organization_members to authenticated;
grant select on table public.audit_logs to authenticated;

-- ---------------------------------------------------------------------------
-- 5) Default privileges (somente role criador postgres em public)
-- Causa do ALL/EXECUTE amplo: ALTER DEFAULT PRIVILEGES do papel postgres
-- (e espelho supabase_admin) em schema public.
-- Não alterar defaults de supabase_admin / outros papéis nesta migration.
-- ---------------------------------------------------------------------------

alter default privileges for role postgres in schema public
  revoke all on tables from public, anon, authenticated;

alter default privileges for role postgres in schema public
  revoke all on sequences from public, anon, authenticated;

alter default privileges for role postgres in schema public
  revoke all on functions from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 6) Policy operator (decisão Sprint 2.1)
-- Alternativa 3: manter members_select_operator_readonly temporariamente.
-- Justificativa: /configuracoes/usuarios é admin-only no frontend; a policy
-- cobre o caso RLS_TEST_PLAN #6 e um futuro UI de operador. Remoção ou view
-- mínima fica para sprint dedicada (documentado em HARDEN_AUTH…).
-- ---------------------------------------------------------------------------

commit;
