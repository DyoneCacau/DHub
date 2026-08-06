-- Sprint 2: autenticação, organização, membership e auditoria.
-- Sem segredos. Aplicação remota somente com autorização explícita.
-- Revisão: docs/MIGRATION_REVIEW_SPRINT2.md

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

create type public.app_role as enum ('admin', 'operator', 'consultant');
create type public.membership_status as enum ('active', 'inactive');
create type public.organization_status as enum ('active', 'inactive');

-- ---------------------------------------------------------------------------
-- organizations
-- ---------------------------------------------------------------------------

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null,
  status public.organization_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint organizations_slug_unique unique (slug),
  constraint organizations_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

create index organizations_status_idx on public.organizations (status);

-- ---------------------------------------------------------------------------
-- profiles (1:1 com auth.users)
-- ---------------------------------------------------------------------------
-- Nota: email em profiles é cópia para exibição/contato e pode divergir
-- do e-mail canônico em auth.users. A autenticação usa auth.users.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  email text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index profiles_email_idx on public.profiles (email);

-- ---------------------------------------------------------------------------
-- organization_members
-- ---------------------------------------------------------------------------

create table public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.app_role not null,
  status public.membership_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id),
  constraint organization_members_org_user_unique unique (organization_id, user_id)
);

create index organization_members_user_idx on public.organization_members (user_id);
create index organization_members_org_status_idx
  on public.organization_members (organization_id, status);
create index organization_members_user_status_idx
  on public.organization_members (user_id, status);

-- ---------------------------------------------------------------------------
-- audit_logs
-- ---------------------------------------------------------------------------

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  actor_id uuid references public.profiles (id),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint audit_logs_action_not_empty check (char_length(trim(action)) > 0)
);

create index audit_logs_org_created_idx
  on public.audit_logs (organization_id, created_at desc);

-- ---------------------------------------------------------------------------
-- updated_at helper
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger organizations_set_updated_at
  before update on public.organizations
  for each row execute function public.set_updated_at();

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger organization_members_set_updated_at
  before update on public.organization_members
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Auth helpers (security definer, search_path fixo)
-- Finalidade: evitar recursão de RLS ao checar membership/papel.
-- ---------------------------------------------------------------------------

create or replace function public.has_active_membership(p_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
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
set search_path = public
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
set search_path = public
as $$
  select public.has_org_role(p_organization_id, array['admin']::public.app_role[]);
$$;

create or replace function public.is_active_member_of_any_org()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members m
    where m.user_id = auth.uid()
      and m.status = 'active'
  );
$$;

revoke all on function public.has_active_membership(uuid) from public;
revoke all on function public.has_org_role(uuid, public.app_role[]) from public;
revoke all on function public.is_org_admin(uuid) from public;
revoke all on function public.is_active_member_of_any_org() from public;

grant execute on function public.has_active_membership(uuid) to authenticated;
grant execute on function public.has_org_role(uuid, public.app_role[]) to authenticated;
grant execute on function public.is_org_admin(uuid) to authenticated;
grant execute on function public.is_active_member_of_any_org() to authenticated;

-- ---------------------------------------------------------------------------
-- Profile bootstrap from auth.users
-- Não cria membership. Não confia em role em raw_user_meta_data.
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
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

revoke all on function public.handle_new_user() from public;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Audit trigger for organization_members
-- ---------------------------------------------------------------------------

create or replace function public.audit_organization_member_changes()
returns trigger
language plpgsql
security definer
set search_path = public
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

revoke all on function public.audit_organization_member_changes() from public;

create trigger organization_members_audit
  after insert or update on public.organization_members
  for each row execute function public.audit_organization_member_changes();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.organization_members enable row level security;
alter table public.audit_logs enable row level security;

-- organizations
create policy organizations_select_member
  on public.organizations
  for select
  to authenticated
  using (public.has_active_membership(id));

create policy organizations_update_admin
  on public.organizations
  for update
  to authenticated
  using (public.is_org_admin(id))
  with check (public.is_org_admin(id));

-- sem INSERT/DELETE pelo cliente autenticado (bootstrap via SQL revisado)

-- profiles
create policy profiles_select_self
  on public.profiles
  for select
  to authenticated
  using (id = auth.uid());

create policy profiles_select_org_admin
  on public.profiles
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.organization_members target
      where target.user_id = profiles.id
        and public.is_org_admin(target.organization_id)
    )
  );

create policy profiles_update_self
  on public.profiles
  for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- organization_members
create policy members_select_self
  on public.organization_members
  for select
  to authenticated
  using (user_id = auth.uid());

create policy members_select_admin
  on public.organization_members
  for select
  to authenticated
  using (public.is_org_admin(organization_id));

create policy members_select_operator_readonly
  on public.organization_members
  for select
  to authenticated
  using (
    public.has_org_role(organization_id, array['operator']::public.app_role[])
  );

-- escrita de memberships: somente via bootstrap/SQL (sem INSERT/UPDATE pelo client nesta sprint)

-- audit_logs
create policy audit_logs_select_admin
  on public.audit_logs
  for select
  to authenticated
  using (public.is_org_admin(organization_id));

-- sem INSERT/UPDATE/DELETE pelo client; trigger security definer grava

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------

revoke all on table public.organizations from anon, public;
revoke all on table public.profiles from anon, public;
revoke all on table public.organization_members from anon, public;
revoke all on table public.audit_logs from anon, public;

grant select, update on table public.organizations to authenticated;
grant select, update on table public.profiles to authenticated;
grant select on table public.organization_members to authenticated;
grant select on table public.audit_logs to authenticated;

-- anon: nenhum acesso às tabelas da aplicação
