-- Sprint 4: bandeiras (operadoras), regiões e vínculos do consultor.
-- Aplicação remota somente com autorização explícita.
-- Revisão: docs/OPERATORS_AND_REGIONS.md

begin;

create type public.catalog_status as enum ('active', 'inactive');

-- ---------------------------------------------------------------------------
-- operators (bandeiras)
-- ---------------------------------------------------------------------------

create table public.operators (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  code text not null,
  status public.catalog_status not null default 'active',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id),
  constraint operators_name_not_empty check (char_length(trim(name)) > 0),
  constraint operators_code_format check (code ~ '^[a-z0-9][a-z0-9_-]*$'),
  constraint operators_org_code_unique unique (organization_id, code)
);

create unique index operators_org_name_uidx on public.operators (organization_id, lower(name));
create unique index operators_id_org_uidx on public.operators (id, organization_id);
create index operators_org_status_idx on public.operators (organization_id, status);

-- ---------------------------------------------------------------------------
-- regions
-- ---------------------------------------------------------------------------

create table public.regions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  state text,
  status public.catalog_status not null default 'active',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id),
  constraint regions_name_not_empty check (char_length(trim(name)) > 0),
  constraint regions_state_len check (state is null or char_length(state) = 2)
);

create unique index regions_org_name_uidx on public.regions (organization_id, lower(name));
create unique index regions_id_org_uidx on public.regions (id, organization_id);
create index regions_org_status_idx on public.regions (organization_id, status);

-- ---------------------------------------------------------------------------
-- Vínculos N:N do consultor (mesmo tenant via FKs compostas)
-- ---------------------------------------------------------------------------

create table public.consultant_operators (
  organization_id uuid not null,
  consultant_id uuid not null,
  operator_id uuid not null,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles (id),
  primary key (consultant_id, operator_id),
  constraint consultant_operators_consultant_fkey
    foreign key (consultant_id, organization_id)
    references public.consultants (id, organization_id) on delete cascade,
  constraint consultant_operators_operator_fkey
    foreign key (operator_id, organization_id)
    references public.operators (id, organization_id) on delete cascade
);

create index consultant_operators_operator_idx on public.consultant_operators (operator_id);
create index consultant_operators_org_idx on public.consultant_operators (organization_id);

create table public.consultant_regions (
  organization_id uuid not null,
  consultant_id uuid not null,
  region_id uuid not null,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles (id),
  primary key (consultant_id, region_id),
  constraint consultant_regions_consultant_fkey
    foreign key (consultant_id, organization_id)
    references public.consultants (id, organization_id) on delete cascade,
  constraint consultant_regions_region_fkey
    foreign key (region_id, organization_id)
    references public.regions (id, organization_id) on delete cascade
);

create index consultant_regions_region_idx on public.consultant_regions (region_id);
create index consultant_regions_org_idx on public.consultant_regions (organization_id);

-- ---------------------------------------------------------------------------
-- Normalização
-- ---------------------------------------------------------------------------

create or replace function public.normalize_operator_row()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.name := trim(new.name);
  new.code := lower(trim(new.code));
  new.notes := nullif(trim(coalesce(new.notes, '')), '');
  return new;
end;
$$;

create or replace function public.normalize_region_row()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.name := trim(new.name);
  new.state := nullif(upper(trim(coalesce(new.state, ''))), '');
  new.notes := nullif(trim(coalesce(new.notes, '')), '');
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Regras de escrita (operators / regions)
-- auth.uid() null = contexto confiável (service_role/postgres, seeds): anon não tem grants
-- nestas tabelas e todo JWT authenticated possui sub.
-- ---------------------------------------------------------------------------

create or replace function public.enforce_catalog_write_rules()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_org uuid;
begin
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
    new.created_by := v_uid;
    new.created_at := now();
    new.updated_at := now();
  end if;

  return new;
end;
$$;

create or replace function public.enforce_catalog_immutable_columns()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.id is distinct from old.id then
    raise exception 'Não é permitido alterar o id';
  end if;
  if new.organization_id is distinct from old.organization_id then
    raise exception 'Não é permitido alterar organization_id';
  end if;
  if new.created_at is distinct from old.created_at then
    raise exception 'Não é permitido alterar created_at';
  end if;
  if new.created_by is distinct from old.created_by then
    raise exception 'Não é permitido alterar created_by';
  end if;
  if (to_jsonb(new) ->> 'code') is distinct from (to_jsonb(old) ->> 'code') then
    raise exception 'Não é permitido alterar o código da bandeira';
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Regras dos vínculos (consultant_operators / consultant_regions)
-- ---------------------------------------------------------------------------

create or replace function public.enforce_consultant_link_rules()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_org uuid;
  v_status public.catalog_status;
begin
  if tg_table_name = 'consultant_operators' then
    select o.status into v_status
    from public.operators o
    where o.id = (to_jsonb(new) ->> 'operator_id')::uuid;
    if v_status is distinct from 'active'::public.catalog_status then
      raise exception 'Bandeira inativa ou inexistente';
    end if;
  else
    select r.status into v_status
    from public.regions r
    where r.id = (to_jsonb(new) ->> 'region_id')::uuid;
    if v_status is distinct from 'active'::public.catalog_status then
      raise exception 'Região inativa ou inexistente';
    end if;
  end if;

  if v_uid is null then
    return new;
  end if;

  v_org := public.current_active_organization_id();
  if v_org is null then
    raise exception 'Organização ativa indefinida (nenhuma ou múltiplas memberships ativas)';
  end if;
  if new.organization_id is distinct from v_org then
    raise exception 'organization_id inválido para a membership ativa';
  end if;

  new.created_by := v_uid;
  new.created_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Auditoria
-- ---------------------------------------------------------------------------

create or replace function public.audit_catalog_changes()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_entity text := case tg_table_name when 'operators' then 'operator' else 'region' end;
  v_changed text[];
begin
  if tg_op = 'INSERT' then
    insert into public.audit_logs (organization_id, actor_id, action, entity_type, entity_id, metadata)
    values (
      new.organization_id, auth.uid(), v_entity || '.created', v_entity, new.id,
      jsonb_build_object('status', new.status)
    );
    return new;
  end if;

  if new.status is distinct from old.status then
    insert into public.audit_logs (organization_id, actor_id, action, entity_type, entity_id, metadata)
    values (
      new.organization_id, auth.uid(),
      v_entity || case when new.status = 'active' then '.activated' else '.deactivated' end,
      v_entity, new.id,
      jsonb_build_object('from_status', old.status, 'to_status', new.status)
    );
  end if;

  select coalesce(array_agg(n.key order by n.key), '{}')
  into v_changed
  from jsonb_each(to_jsonb(new)) n
  where n.key <> 'updated_at'
    and n.value is distinct from (to_jsonb(old) -> n.key);

  if coalesce(array_length(v_changed, 1), 0) > 0 then
    insert into public.audit_logs (organization_id, actor_id, action, entity_type, entity_id, metadata)
    values (
      new.organization_id, auth.uid(), v_entity || '.updated', v_entity, new.id,
      jsonb_build_object('changed_fields', to_jsonb(v_changed))
    );
  end if;

  return new;
end;
$$;

create or replace function public.audit_consultant_link_changes()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_row jsonb := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  v_kind text := case tg_table_name when 'consultant_operators' then 'operator' else 'region' end;
  v_org uuid := (v_row ->> 'organization_id')::uuid;
begin
  -- Exclusão em cascata da organização: não há onde registrar.
  if not exists (select 1 from public.organizations o where o.id = v_org) then
    return null;
  end if;

  insert into public.audit_logs (organization_id, actor_id, action, entity_type, entity_id, metadata)
  values (
    v_org,
    auth.uid(),
    'consultant.' || v_kind || case when tg_op = 'DELETE' then '_unlinked' else '_linked' end,
    'consultant',
    (v_row ->> 'consultant_id')::uuid,
    jsonb_build_object(v_kind || '_id', v_row ->> (v_kind || '_id'))
  );
  return null;
end;
$$;

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

create trigger operators_normalize
  before insert or update on public.operators
  for each row execute function public.normalize_operator_row();

create trigger operators_write_rules
  before insert or update on public.operators
  for each row execute function public.enforce_catalog_write_rules();

create trigger operators_immutable
  before update on public.operators
  for each row execute function public.enforce_catalog_immutable_columns();

create trigger operators_set_updated_at
  before update on public.operators
  for each row execute function public.set_updated_at();

create trigger operators_audit
  after insert or update on public.operators
  for each row execute function public.audit_catalog_changes();

create trigger regions_normalize
  before insert or update on public.regions
  for each row execute function public.normalize_region_row();

create trigger regions_write_rules
  before insert or update on public.regions
  for each row execute function public.enforce_catalog_write_rules();

create trigger regions_immutable
  before update on public.regions
  for each row execute function public.enforce_catalog_immutable_columns();

create trigger regions_set_updated_at
  before update on public.regions
  for each row execute function public.set_updated_at();

create trigger regions_audit
  after insert or update on public.regions
  for each row execute function public.audit_catalog_changes();

create trigger consultant_operators_rules
  before insert on public.consultant_operators
  for each row execute function public.enforce_consultant_link_rules();

create trigger consultant_operators_audit
  after insert or delete on public.consultant_operators
  for each row execute function public.audit_consultant_link_changes();

create trigger consultant_regions_rules
  before insert on public.consultant_regions
  for each row execute function public.enforce_consultant_link_rules();

create trigger consultant_regions_audit
  after insert or delete on public.consultant_regions
  for each row execute function public.audit_consultant_link_changes();

revoke all on function public.normalize_operator_row() from public, anon, authenticated;
revoke all on function public.normalize_region_row() from public, anon, authenticated;
revoke all on function public.enforce_catalog_write_rules() from public, anon, authenticated;
revoke all on function public.enforce_catalog_immutable_columns() from public, anon, authenticated;
revoke all on function public.enforce_consultant_link_rules() from public, anon, authenticated;
revoke all on function public.audit_catalog_changes() from public, anon, authenticated;
revoke all on function public.audit_consultant_link_changes() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.operators enable row level security;
alter table public.regions enable row level security;
alter table public.consultant_operators enable row level security;
alter table public.consultant_regions enable row level security;

-- operators: leitura para membros ativos; escrita só admin (configuração)
create policy operators_select_member
  on public.operators for select to authenticated
  using (public.has_active_membership(organization_id));

create policy operators_insert_admin
  on public.operators for insert to authenticated
  with check (
    public.is_org_admin(organization_id)
    and organization_id = public.current_active_organization_id()
  );

create policy operators_update_admin
  on public.operators for update to authenticated
  using (public.is_org_admin(organization_id))
  with check (public.is_org_admin(organization_id));

-- regions: idem
create policy regions_select_member
  on public.regions for select to authenticated
  using (public.has_active_membership(organization_id));

create policy regions_insert_admin
  on public.regions for insert to authenticated
  with check (
    public.is_org_admin(organization_id)
    and organization_id = public.current_active_organization_id()
  );

create policy regions_update_admin
  on public.regions for update to authenticated
  using (public.is_org_admin(organization_id))
  with check (public.is_org_admin(organization_id));

-- consultant_operators: escritório gerencia; consultor lê os próprios
create policy consultant_operators_select_office
  on public.consultant_operators for select to authenticated
  using (public.has_org_role(organization_id, array['admin', 'operator']::public.app_role[]));

create policy consultant_operators_select_own
  on public.consultant_operators for select to authenticated
  using (
    public.has_org_role(organization_id, array['consultant']::public.app_role[])
    and consultant_id = public.current_consultant_id()
  );

create policy consultant_operators_insert_office
  on public.consultant_operators for insert to authenticated
  with check (
    public.has_org_role(organization_id, array['admin', 'operator']::public.app_role[])
    and organization_id = public.current_active_organization_id()
  );

create policy consultant_operators_delete_office
  on public.consultant_operators for delete to authenticated
  using (public.has_org_role(organization_id, array['admin', 'operator']::public.app_role[]));

-- consultant_regions: idem
create policy consultant_regions_select_office
  on public.consultant_regions for select to authenticated
  using (public.has_org_role(organization_id, array['admin', 'operator']::public.app_role[]));

create policy consultant_regions_select_own
  on public.consultant_regions for select to authenticated
  using (
    public.has_org_role(organization_id, array['consultant']::public.app_role[])
    and consultant_id = public.current_consultant_id()
  );

create policy consultant_regions_insert_office
  on public.consultant_regions for insert to authenticated
  with check (
    public.has_org_role(organization_id, array['admin', 'operator']::public.app_role[])
    and organization_id = public.current_active_organization_id()
  );

create policy consultant_regions_delete_office
  on public.consultant_regions for delete to authenticated
  using (public.has_org_role(organization_id, array['admin', 'operator']::public.app_role[]));

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------

revoke all on table public.operators from public, anon, authenticated;
revoke all on table public.regions from public, anon, authenticated;
revoke all on table public.consultant_operators from public, anon, authenticated;
revoke all on table public.consultant_regions from public, anon, authenticated;

grant select, insert, update on table public.operators to authenticated;
grant select, insert, update on table public.regions to authenticated;
grant select, insert, delete on table public.consultant_operators to authenticated;
grant select, insert, delete on table public.consultant_regions to authenticated;

-- ---------------------------------------------------------------------------
-- Bandeiras iniciais (D12) para organizações existentes
-- ---------------------------------------------------------------------------

insert into public.operators (organization_id, name, code)
select o.id, v.name, v.code
from public.organizations o
cross join (
  values
    ('LeCard', 'lecard'),
    ('Pluxee', 'pluxee'),
    ('Ticket', 'ticket'),
    ('VR', 'vr'),
    ('ValeCard', 'valecard')
) as v (name, code)
on conflict (organization_id, code) do nothing;

comment on table public.operators is
  'Bandeiras (operadoras de voucher) por organização. Sem tabela por bandeira (D20).';
comment on table public.regions is
  'Regiões/cidades configuráveis por organização (Q25).';
comment on table public.consultant_operators is
  'Bandeiras que o consultor atende (D35).';
comment on table public.consultant_regions is
  'Regiões que o consultor atende (D34).';

commit;
