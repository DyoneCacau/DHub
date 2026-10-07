-- Sprint 3: consultores e lojistas (merchants).
-- Aplicação remota somente com autorização explícita.
-- Revisão: docs/CONSULTANTS_AND_MERCHANTS.md

begin;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

create type public.consultant_status as enum ('active', 'inactive');
create type public.merchant_status as enum ('active', 'inactive');

-- ---------------------------------------------------------------------------
-- Helpers de contexto (membership única ativa)
-- ---------------------------------------------------------------------------

-- Retorna a organização somente quando há exatamente uma membership ativa.
-- Zero ou várias → null (fail closed, sem escolha arbitrária e sem exceção dentro de RLS).
create or replace function public.current_active_organization_id()
returns uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select case when count(*) = 1 then (array_agg(m.organization_id))[1] end
  from public.organization_members m
  where m.user_id = auth.uid()
    and m.status = 'active';
$$;

revoke all on function public.current_active_organization_id() from public, anon;
grant execute on function public.current_active_organization_id() to authenticated;

-- ---------------------------------------------------------------------------
-- consultants
-- ---------------------------------------------------------------------------

create table public.consultants (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid references public.profiles (id) on delete set null,
  full_name text not null,
  email text,
  phone text,
  document text,
  status public.consultant_status not null default 'active',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id),
  constraint consultants_full_name_not_empty check (char_length(trim(full_name)) > 0),
  constraint consultants_org_user_unique unique (organization_id, user_id)
);

-- UNIQUE (organization_id, user_id) allows multiple NULLs in PostgreSQL.
comment on constraint consultants_org_user_unique on public.consultants is
  'No máximo um consultor operacional por user_id dentro da organização; user_id null permitido várias vezes.';

-- Suporte a FK composta merchants → consultants (mesmo tenant)
create unique index consultants_id_org_uidx
  on public.consultants (id, organization_id);

create index consultants_org_status_idx on public.consultants (organization_id, status);
create index consultants_org_full_name_idx on public.consultants (organization_id, full_name);
create index consultants_user_id_idx on public.consultants (user_id)
  where user_id is not null;

-- ---------------------------------------------------------------------------
-- merchants
-- ---------------------------------------------------------------------------

create table public.merchants (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  consultant_id uuid not null,
  legal_name text not null,
  trade_name text,
  document text,
  email text,
  phone text,
  whatsapp text,
  status public.merchant_status not null default 'active',
  postal_code text,
  street text,
  number text,
  complement text,
  district text,
  city text,
  state text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id),
  constraint merchants_legal_name_not_empty check (char_length(trim(legal_name)) > 0),
  constraint merchants_state_len check (state is null or char_length(state) <= 2),
  constraint merchants_consultant_org_fkey
    foreign key (consultant_id, organization_id)
    references public.consultants (id, organization_id)
);

comment on constraint merchants_consultant_org_fkey on public.merchants is
  'Garante merchants.organization_id = consultants.organization_id via FK composta.';

create index merchants_consultant_id_idx on public.merchants (consultant_id);
create index merchants_org_status_idx on public.merchants (organization_id, status);
create index merchants_org_legal_name_idx on public.merchants (organization_id, legal_name);
create index merchants_org_trade_name_idx on public.merchants (organization_id, trade_name)
  where trade_name is not null;
create index merchants_org_document_idx on public.merchants (organization_id, document)
  where document is not null and document <> '';
create index merchants_org_city_idx on public.merchants (organization_id, city)
  where city is not null;
create index merchants_org_state_idx on public.merchants (organization_id, state)
  where state is not null;
create index merchants_created_at_idx on public.merchants (created_at desc);

-- Sem unique rígido de document (Q17 / duplicidade ainda aberta).

-- ---------------------------------------------------------------------------
-- Helpers que dependem das tabelas
-- ---------------------------------------------------------------------------

create or replace function public.current_consultant_id()
returns uuid
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_org uuid;
  v_id uuid;
begin
  v_org := public.current_active_organization_id();
  if v_org is null then
    return null;
  end if;

  select c.id
  into v_id
  from public.consultants c
  where c.organization_id = v_org
    and c.user_id = auth.uid()
  limit 1;

  return v_id;
end;
$$;

revoke all on function public.current_consultant_id() from public, anon;
grant execute on function public.current_consultant_id() to authenticated;

-- ---------------------------------------------------------------------------
-- Normalização e imutabilidade
-- ---------------------------------------------------------------------------

create or replace function public.normalize_consultant_row()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.full_name := trim(new.full_name);
  new.email := nullif(lower(trim(coalesce(new.email, ''))), '');
  new.phone := nullif(regexp_replace(coalesce(new.phone, ''), '\D', '', 'g'), '');
  new.document := nullif(upper(regexp_replace(coalesce(new.document, ''), '[^0-9A-Za-z]', '', 'g')), '');
  new.notes := nullif(trim(coalesce(new.notes, '')), '');
  return new;
end;
$$;

create or replace function public.normalize_merchant_row()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.legal_name := trim(new.legal_name);
  new.trade_name := nullif(trim(coalesce(new.trade_name, '')), '');
  new.email := nullif(lower(trim(coalesce(new.email, ''))), '');
  new.phone := nullif(regexp_replace(coalesce(new.phone, ''), '\D', '', 'g'), '');
  new.whatsapp := nullif(regexp_replace(coalesce(new.whatsapp, ''), '\D', '', 'g'), '');
  new.document := nullif(upper(regexp_replace(coalesce(new.document, ''), '[^0-9A-Za-z]', '', 'g')), '');
  new.postal_code := nullif(regexp_replace(coalesce(new.postal_code, ''), '\D', '', 'g'), '');
  new.street := nullif(trim(coalesce(new.street, '')), '');
  new.number := nullif(trim(coalesce(new.number, '')), '');
  new.complement := nullif(trim(coalesce(new.complement, '')), '');
  new.district := nullif(trim(coalesce(new.district, '')), '');
  new.city := nullif(trim(coalesce(new.city, '')), '');
  new.state := nullif(upper(trim(coalesce(new.state, ''))), '');
  new.notes := nullif(trim(coalesce(new.notes, '')), '');
  return new;
end;
$$;

create or replace function public.enforce_consultant_immutable_columns()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.id is distinct from old.id then
    raise exception 'Não é permitido alterar o id do consultor';
  end if;
  if new.organization_id is distinct from old.organization_id then
    raise exception 'Não é permitido alterar organization_id do consultor';
  end if;
  if new.created_at is distinct from old.created_at then
    raise exception 'Não é permitido alterar created_at do consultor';
  end if;
  if new.created_by is distinct from old.created_by then
    raise exception 'Não é permitido alterar created_by do consultor';
  end if;
  return new;
end;
$$;

create or replace function public.enforce_merchant_immutable_columns()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.id is distinct from old.id then
    raise exception 'Não é permitido alterar o id do lojista';
  end if;
  if new.organization_id is distinct from old.organization_id then
    raise exception 'Não é permitido alterar organization_id do lojista';
  end if;
  if new.created_at is distinct from old.created_at then
    raise exception 'Não é permitido alterar created_at do lojista';
  end if;
  if new.created_by is distinct from old.created_by then
    raise exception 'Não é permitido alterar created_by do lojista';
  end if;
  return new;
end;
$$;

-- Preenche/valida tenant e consultor; consultor ativo na criação.
-- auth.uid() null = contexto confiável (service_role/postgres): anon não tem grants nestas tabelas
-- e todo JWT authenticated possui sub. Nesse contexto só valem as regras de integridade.
create or replace function public.enforce_merchant_consultant_rules()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_org uuid;
  v_consultant_only boolean := false;
  v_self uuid;
  v_consultant_org uuid;
  v_consultant_status public.consultant_status;
begin
  if v_uid is not null then
    v_org := public.current_active_organization_id();
    if v_org is null then
      raise exception 'Organização ativa indefinida (nenhuma ou múltiplas memberships ativas)';
    end if;
    v_consultant_only :=
      public.has_org_role(v_org, array['consultant']::public.app_role[])
      and not public.has_org_role(v_org, array['admin', 'operator']::public.app_role[]);
  end if;

  if tg_op = 'INSERT' then
    if v_uid is not null then
      if v_consultant_only then
        v_self := public.current_consultant_id();
        if v_self is null then
          raise exception 'Consultor operacional não vinculado ao usuário autenticado';
        end if;
        new.consultant_id := v_self;
        new.organization_id := v_org;
      elsif new.organization_id is distinct from v_org then
        raise exception 'organization_id inválido para a membership ativa';
      end if;

      new.created_by := v_uid;
      new.created_at := now();
      new.updated_at := now();
    end if;

    select c.organization_id, c.status
    into v_consultant_org, v_consultant_status
    from public.consultants c
    where c.id = new.consultant_id;

    if v_consultant_org is null then
      raise exception 'Consultor responsável não encontrado';
    end if;
    if v_consultant_org is distinct from new.organization_id then
      raise exception 'Consultor e lojista devem pertencer à mesma organização';
    end if;
    if v_consultant_status is distinct from 'active'::public.consultant_status then
      raise exception 'Consultor responsável deve estar ativo para criar lojista';
    end if;
  end if;

  if tg_op = 'UPDATE' then
    if v_consultant_only then
      if new.consultant_id is distinct from old.consultant_id then
        raise exception 'Consultor não pode transferir lojista';
      end if;
      if new.consultant_id is distinct from public.current_consultant_id() then
        raise exception 'Consultor só pode alterar os próprios lojistas';
      end if;
    end if;

    if new.consultant_id is distinct from old.consultant_id then
      select c.organization_id, c.status
      into v_consultant_org, v_consultant_status
      from public.consultants c
      where c.id = new.consultant_id;

      if v_consultant_org is distinct from new.organization_id then
        raise exception 'Novo consultor deve pertencer à mesma organização';
      end if;
      if v_consultant_status is distinct from 'active'::public.consultant_status then
        raise exception 'Novo consultor responsável deve estar ativo';
      end if;
    end if;
  end if;

  return new;
end;
$$;

create or replace function public.enforce_consultant_write_rules()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_org uuid;
  v_user_changed boolean;
begin
  v_user_changed := new.user_id is not null
    and (tg_op = 'INSERT' or new.user_id is distinct from old.user_id);

  if v_user_changed and not exists (
    select 1
    from public.organization_members m
    where m.organization_id = new.organization_id
      and m.user_id = new.user_id
      and m.status = 'active'
  ) then
    raise exception 'Usuário vinculado deve ser membro ativo da organização';
  end if;

  -- auth.uid() null = contexto confiável (service_role/postgres, cascata ON DELETE SET NULL).
  if v_uid is null then
    return new;
  end if;

  v_org := public.current_active_organization_id();
  if v_org is null then
    raise exception 'Organização ativa indefinida (nenhuma ou múltiplas memberships ativas)';
  end if;

  if tg_op = 'INSERT' then
    if new.organization_id is distinct from v_org then
      raise exception 'organization_id inválido para a membership ativa';
    end if;
    if new.user_id is not null and not public.is_org_admin(v_org) then
      raise exception 'Somente administrador pode vincular usuário ao consultor';
    end if;
    new.created_by := v_uid;
    new.created_at := now();
    new.updated_at := now();
  end if;

  if tg_op = 'UPDATE'
     and new.user_id is distinct from old.user_id
     and not public.is_org_admin(v_org) then
    raise exception 'Somente administrador pode alterar vínculo de usuário do consultor';
  end if;

  return new;
end;
$$;

create trigger consultants_normalize
  before insert or update on public.consultants
  for each row execute function public.normalize_consultant_row();

create trigger consultants_write_rules
  before insert or update on public.consultants
  for each row execute function public.enforce_consultant_write_rules();

create trigger consultants_immutable
  before update on public.consultants
  for each row execute function public.enforce_consultant_immutable_columns();

create trigger consultants_set_updated_at
  before update on public.consultants
  for each row execute function public.set_updated_at();

create trigger merchants_normalize
  before insert or update on public.merchants
  for each row execute function public.normalize_merchant_row();

create trigger merchants_consultant_rules
  before insert or update on public.merchants
  for each row execute function public.enforce_merchant_consultant_rules();

create trigger merchants_immutable
  before update on public.merchants
  for each row execute function public.enforce_merchant_immutable_columns();

create trigger merchants_set_updated_at
  before update on public.merchants
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Auditoria (sem PII sensível)
-- ---------------------------------------------------------------------------

create or replace function public.audit_consultant_changes()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_action text;
  v_changed text[] := '{}';
begin
  if tg_op = 'INSERT' then
    insert into public.audit_logs (organization_id, actor_id, action, entity_type, entity_id, metadata)
    values (
      new.organization_id,
      auth.uid(),
      'consultant.created',
      'consultant',
      new.id,
      jsonb_build_object('status', new.status, 'has_user_link', new.user_id is not null)
    );
    return new;
  end if;

  if tg_op = 'UPDATE' then
    if new.status is distinct from old.status then
      v_action := case
        when new.status = 'active' then 'consultant.activated'
        else 'consultant.deactivated'
      end;
      insert into public.audit_logs (organization_id, actor_id, action, entity_type, entity_id, metadata)
      values (
        new.organization_id,
        auth.uid(),
        v_action,
        'consultant',
        new.id,
        jsonb_build_object('from_status', old.status, 'to_status', new.status)
      );
    end if;

    if new.user_id is distinct from old.user_id then
      v_action := case
        when new.user_id is null then 'consultant.user_unlinked'
        when old.user_id is null then 'consultant.user_linked'
        else 'consultant.user_changed'
      end;
      insert into public.audit_logs (organization_id, actor_id, action, entity_type, entity_id, metadata)
      values (
        new.organization_id,
        auth.uid(),
        v_action,
        'consultant',
        new.id,
        jsonb_build_object(
          'had_user', old.user_id is not null,
          'has_user', new.user_id is not null
        )
      );
    end if;

    if new.full_name is distinct from old.full_name then
      v_changed := array_append(v_changed, 'full_name');
    end if;
    if new.email is distinct from old.email then
      v_changed := array_append(v_changed, 'email');
    end if;
    if new.phone is distinct from old.phone then
      v_changed := array_append(v_changed, 'phone');
    end if;
    if new.document is distinct from old.document then
      v_changed := array_append(v_changed, 'document');
    end if;
    if new.notes is distinct from old.notes then
      v_changed := array_append(v_changed, 'notes');
    end if;
    if new.status is distinct from old.status then
      v_changed := array_append(v_changed, 'status');
    end if;
    if new.user_id is distinct from old.user_id then
      v_changed := array_append(v_changed, 'user_id');
    end if;

    if coalesce(array_length(v_changed, 1), 0) > 0 then
      insert into public.audit_logs (organization_id, actor_id, action, entity_type, entity_id, metadata)
      values (
        new.organization_id,
        auth.uid(),
        'consultant.updated',
        'consultant',
        new.id,
        jsonb_build_object('changed_fields', to_jsonb(v_changed))
      );
    end if;

    return new;
  end if;

  return null;
end;
$$;

create or replace function public.audit_merchant_changes()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_action text;
  v_changed text[] := '{}';
begin
  if tg_op = 'INSERT' then
    insert into public.audit_logs (organization_id, actor_id, action, entity_type, entity_id, metadata)
    values (
      new.organization_id,
      auth.uid(),
      'merchant.created',
      'merchant',
      new.id,
      jsonb_build_object(
        'status', new.status,
        'consultant_id', new.consultant_id
      )
    );
    return new;
  end if;

  if tg_op = 'UPDATE' then
    if new.status is distinct from old.status then
      v_action := case
        when new.status = 'active' then 'merchant.activated'
        else 'merchant.deactivated'
      end;
      insert into public.audit_logs (organization_id, actor_id, action, entity_type, entity_id, metadata)
      values (
        new.organization_id,
        auth.uid(),
        v_action,
        'merchant',
        new.id,
        jsonb_build_object('from_status', old.status, 'to_status', new.status)
      );
    end if;

    if new.consultant_id is distinct from old.consultant_id then
      insert into public.audit_logs (organization_id, actor_id, action, entity_type, entity_id, metadata)
      values (
        new.organization_id,
        auth.uid(),
        'merchant.consultant_changed',
        'merchant',
        new.id,
        jsonb_build_object(
          'from_consultant_id', old.consultant_id,
          'to_consultant_id', new.consultant_id
        )
      );
    end if;

    if new.legal_name is distinct from old.legal_name then
      v_changed := array_append(v_changed, 'legal_name');
    end if;
    if new.trade_name is distinct from old.trade_name then
      v_changed := array_append(v_changed, 'trade_name');
    end if;
    if new.document is distinct from old.document then
      v_changed := array_append(v_changed, 'document');
    end if;
    if new.email is distinct from old.email then
      v_changed := array_append(v_changed, 'email');
    end if;
    if new.phone is distinct from old.phone then
      v_changed := array_append(v_changed, 'phone');
    end if;
    if new.whatsapp is distinct from old.whatsapp then
      v_changed := array_append(v_changed, 'whatsapp');
    end if;
    if new.status is distinct from old.status then
      v_changed := array_append(v_changed, 'status');
    end if;
    if new.consultant_id is distinct from old.consultant_id then
      v_changed := array_append(v_changed, 'consultant_id');
    end if;
    if new.city is distinct from old.city
       or new.state is distinct from old.state
       or new.street is distinct from old.street
       or new.number is distinct from old.number
       or new.complement is distinct from old.complement
       or new.district is distinct from old.district
       or new.postal_code is distinct from old.postal_code then
      v_changed := array_append(v_changed, 'address');
    end if;
    if new.notes is distinct from old.notes then
      v_changed := array_append(v_changed, 'notes');
    end if;

    if coalesce(array_length(v_changed, 1), 0) > 0 then
      insert into public.audit_logs (organization_id, actor_id, action, entity_type, entity_id, metadata)
      values (
        new.organization_id,
        auth.uid(),
        'merchant.updated',
        'merchant',
        new.id,
        jsonb_build_object('changed_fields', to_jsonb(v_changed))
      );
    end if;

    return new;
  end if;

  return null;
end;
$$;

create trigger consultants_audit
  after insert or update on public.consultants
  for each row execute function public.audit_consultant_changes();

create trigger merchants_audit
  after insert or update on public.merchants
  for each row execute function public.audit_merchant_changes();

revoke all on function public.normalize_consultant_row() from public, anon, authenticated;
revoke all on function public.normalize_merchant_row() from public, anon, authenticated;
revoke all on function public.enforce_consultant_immutable_columns() from public, anon, authenticated;
revoke all on function public.enforce_merchant_immutable_columns() from public, anon, authenticated;
revoke all on function public.enforce_merchant_consultant_rules() from public, anon, authenticated;
revoke all on function public.enforce_consultant_write_rules() from public, anon, authenticated;
revoke all on function public.audit_consultant_changes() from public, anon, authenticated;
revoke all on function public.audit_merchant_changes() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- View: contagem de lojistas (security_invoker → RLS das tabelas base)
-- ---------------------------------------------------------------------------

create or replace view public.consultants_with_counts
with (security_invoker = true)
as
select
  c.*,
  (
    select count(*)::integer
    from public.merchants m
    where m.consultant_id = c.id
  ) as merchant_count,
  (
    select count(*)::integer
    from public.merchants m
    where m.consultant_id = c.id
      and m.status = 'active'
  ) as active_merchant_count
from public.consultants c;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.consultants enable row level security;
alter table public.merchants enable row level security;

-- consultants SELECT
create policy consultants_select_admin_operator
  on public.consultants
  for select
  to authenticated
  using (
    public.has_org_role(organization_id, array['admin', 'operator']::public.app_role[])
  );

create policy consultants_select_self
  on public.consultants
  for select
  to authenticated
  using (
    user_id = auth.uid()
    and public.has_active_membership(organization_id)
  );

-- consultants INSERT (admin/operator)
create policy consultants_insert_admin_operator
  on public.consultants
  for insert
  to authenticated
  with check (
    public.has_org_role(organization_id, array['admin', 'operator']::public.app_role[])
    and organization_id = public.current_active_organization_id()
  );

-- consultants UPDATE
create policy consultants_update_admin
  on public.consultants
  for update
  to authenticated
  using (public.is_org_admin(organization_id))
  with check (public.is_org_admin(organization_id));

create policy consultants_update_operator
  on public.consultants
  for update
  to authenticated
  using (
    public.has_org_role(organization_id, array['operator']::public.app_role[])
    and not public.is_org_admin(organization_id)
  )
  with check (
    public.has_org_role(organization_id, array['operator']::public.app_role[])
    and not public.is_org_admin(organization_id)
  );

-- Sem DELETE client; consultant sem UPDATE nesta sprint (somente leitura do próprio registro).

-- merchants SELECT
create policy merchants_select_admin_operator
  on public.merchants
  for select
  to authenticated
  using (
    public.has_org_role(organization_id, array['admin', 'operator']::public.app_role[])
  );

create policy merchants_select_consultant_own
  on public.merchants
  for select
  to authenticated
  using (
    public.has_org_role(organization_id, array['consultant']::public.app_role[])
    and consultant_id = public.current_consultant_id()
  );

-- merchants INSERT
create policy merchants_insert_admin_operator
  on public.merchants
  for insert
  to authenticated
  with check (
    public.has_org_role(organization_id, array['admin', 'operator']::public.app_role[])
    and organization_id = public.current_active_organization_id()
  );

create policy merchants_insert_consultant_own
  on public.merchants
  for insert
  to authenticated
  with check (
    public.has_org_role(organization_id, array['consultant']::public.app_role[])
    and organization_id = public.current_active_organization_id()
    and consultant_id = public.current_consultant_id()
  );

-- merchants UPDATE
create policy merchants_update_admin_operator
  on public.merchants
  for update
  to authenticated
  using (
    public.has_org_role(organization_id, array['admin', 'operator']::public.app_role[])
  )
  with check (
    public.has_org_role(organization_id, array['admin', 'operator']::public.app_role[])
  );

create policy merchants_update_consultant_own
  on public.merchants
  for update
  to authenticated
  using (
    public.has_org_role(organization_id, array['consultant']::public.app_role[])
    and consultant_id = public.current_consultant_id()
  )
  with check (
    public.has_org_role(organization_id, array['consultant']::public.app_role[])
    and consultant_id = public.current_consultant_id()
  );

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------

revoke all on table public.consultants from public, anon, authenticated;
revoke all on table public.merchants from public, anon, authenticated;

grant select, insert, update on table public.consultants to authenticated;
grant select, insert, update on table public.merchants to authenticated;

revoke all on public.consultants_with_counts from public, anon, authenticated;
grant select on public.consultants_with_counts to authenticated;

comment on table public.consultants is
  'Cadastro operacional de consultores. Distinto de organization_members (acesso ao sistema). user_id opcional.';
comment on table public.merchants is
  'Lojistas (interface). Sem login no MVP. consultant_id = responsável atual.';
comment on column public.consultants.document is
  'Documento opcional nesta sprint. CPF/CNPJ e LGPD: ver docs/SECURITY_AND_LGPD.md e OPEN_QUESTIONS.';
comment on column public.merchants.document is
  'Documento opcional; sem unique rígido (Q17). Frontend avisa possível duplicidade.';

commit;
