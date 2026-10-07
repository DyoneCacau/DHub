-- Sprint: Operações e Ações (ações de bandeira, despesas e comprovantes).
-- Aplicação remota somente com autorização explícita.
-- Revisão: docs/OPERATIONS_AND_ACTIONS.md
-- Acesso exclusivo de admin (D38).

begin;

create type public.action_status as enum ('planned', 'in_progress', 'completed', 'cancelled');
create type public.expense_status as enum ('planned', 'paid', 'cancelled');

-- ---------------------------------------------------------------------------
-- expense_types (catálogo configurável)
-- ---------------------------------------------------------------------------

create table public.expense_types (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  status public.catalog_status not null default 'active',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id),
  constraint expense_types_name_not_empty check (char_length(trim(name)) > 0)
);

create unique index expense_types_org_name_uidx on public.expense_types (organization_id, lower(name));
create unique index expense_types_id_org_uidx on public.expense_types (id, organization_id);

-- ---------------------------------------------------------------------------
-- actions
-- ---------------------------------------------------------------------------

create table public.actions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  title text not null,
  operator_id uuid,
  region_id uuid,
  city text,
  starts_on date not null,
  ends_on date,
  status public.action_status not null default 'planned',
  budget_amount numeric(12, 2),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id),
  constraint actions_title_not_empty check (char_length(trim(title)) > 0),
  constraint actions_period_valid check (ends_on is null or ends_on >= starts_on),
  constraint actions_budget_non_negative check (budget_amount is null or budget_amount >= 0),
  constraint actions_operator_fkey
    foreign key (operator_id, organization_id) references public.operators (id, organization_id),
  constraint actions_region_fkey
    foreign key (region_id, organization_id) references public.regions (id, organization_id)
);

create unique index actions_id_org_uidx on public.actions (id, organization_id);
create index actions_org_starts_on_idx on public.actions (organization_id, starts_on desc);
create index actions_org_status_idx on public.actions (organization_id, status);
create index actions_operator_idx on public.actions (operator_id) where operator_id is not null;
create index actions_region_idx on public.actions (region_id) where region_id is not null;

-- ---------------------------------------------------------------------------
-- action_participants (N:N ação ↔ consultor)
-- ---------------------------------------------------------------------------

create table public.action_participants (
  organization_id uuid not null,
  action_id uuid not null,
  consultant_id uuid not null,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles (id),
  primary key (action_id, consultant_id),
  constraint action_participants_action_fkey
    foreign key (action_id, organization_id)
    references public.actions (id, organization_id) on delete cascade,
  constraint action_participants_consultant_fkey
    foreign key (consultant_id, organization_id)
    references public.consultants (id, organization_id) on delete cascade
);

create index action_participants_consultant_idx on public.action_participants (consultant_id);

-- ---------------------------------------------------------------------------
-- action_expenses
-- ---------------------------------------------------------------------------

create table public.action_expenses (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  action_id uuid not null,
  expense_type_id uuid not null,
  consultant_id uuid,
  supplier text,
  description text,
  expense_date date,
  planned_amount numeric(12, 2),
  actual_amount numeric(12, 2),
  payment_method text,
  status public.expense_status not null default 'planned',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id),
  constraint action_expenses_amounts_non_negative check (
    (planned_amount is null or planned_amount >= 0)
    and (actual_amount is null or actual_amount >= 0)
  ),
  constraint action_expenses_action_fkey
    foreign key (action_id, organization_id)
    references public.actions (id, organization_id) on delete cascade,
  constraint action_expenses_type_fkey
    foreign key (expense_type_id, organization_id)
    references public.expense_types (id, organization_id),
  constraint action_expenses_consultant_fkey
    foreign key (consultant_id, organization_id)
    references public.consultants (id, organization_id)
);

create unique index action_expenses_id_org_uidx on public.action_expenses (id, organization_id);
create index action_expenses_action_idx on public.action_expenses (action_id);
create index action_expenses_org_date_idx on public.action_expenses (organization_id, expense_date desc);
create index action_expenses_type_idx on public.action_expenses (expense_type_id);
create index action_expenses_consultant_idx on public.action_expenses (consultant_id)
  where consultant_id is not null;

-- ---------------------------------------------------------------------------
-- expense_attachments (comprovantes no bucket privado action-receipts)
-- ---------------------------------------------------------------------------

create table public.expense_attachments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  expense_id uuid not null,
  storage_path text not null,
  file_name text not null,
  mime_type text not null,
  size_bytes bigint not null,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles (id),
  constraint expense_attachments_path_unique unique (storage_path),
  constraint expense_attachments_file_name_not_empty check (char_length(trim(file_name)) > 0),
  constraint expense_attachments_mime_allowed check (
    mime_type in ('application/pdf', 'image/jpeg', 'image/png', 'image/webp')
  ),
  constraint expense_attachments_size_valid check (size_bytes > 0 and size_bytes <= 10485760),
  constraint expense_attachments_expense_fkey
    foreign key (expense_id, organization_id)
    references public.action_expenses (id, organization_id) on delete cascade
);

create index expense_attachments_expense_idx on public.expense_attachments (expense_id);

-- ---------------------------------------------------------------------------
-- Normalização
-- ---------------------------------------------------------------------------

create or replace function public.normalize_expense_type_row()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.name := trim(new.name);
  new.notes := nullif(trim(coalesce(new.notes, '')), '');
  return new;
end;
$$;

create or replace function public.normalize_action_row()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.title := trim(new.title);
  new.city := nullif(trim(coalesce(new.city, '')), '');
  new.notes := nullif(trim(coalesce(new.notes, '')), '');
  return new;
end;
$$;

create or replace function public.normalize_action_expense_row()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.supplier := nullif(trim(coalesce(new.supplier, '')), '');
  new.description := nullif(trim(coalesce(new.description, '')), '');
  new.payment_method := nullif(trim(coalesce(new.payment_method, '')), '');
  new.notes := nullif(trim(coalesce(new.notes, '')), '');
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Regras de escrita
-- Tabelas com updated_at reutilizam enforce_catalog_write_rules() e
-- enforce_catalog_immutable_columns() (Sprint 4), que só dependem de
-- organization_id, created_at, created_by e updated_at.
-- ---------------------------------------------------------------------------

-- Linhas filhas sem updated_at (participantes, comprovantes).
-- auth.uid() null = contexto confiável (service_role/postgres).
create or replace function public.enforce_org_child_insert_rules()
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
  if new.organization_id is distinct from v_org then
    raise exception 'organization_id inválido para a membership ativa';
  end if;

  new.created_by := v_uid;
  new.created_at := now();
  return new;
end;
$$;

create or replace function public.enforce_action_expense_rules()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_type_status public.catalog_status;
begin
  if tg_op = 'UPDATE' and new.action_id is distinct from old.action_id then
    raise exception 'Não é permitido mover a despesa para outra ação';
  end if;

  if tg_op = 'INSERT' or new.expense_type_id is distinct from old.expense_type_id then
    select t.status into v_type_status
    from public.expense_types t
    where t.id = new.expense_type_id;
    if v_type_status is distinct from 'active'::public.catalog_status then
      raise exception 'Tipo de despesa inativo ou inexistente';
    end if;
  end if;

  return new;
end;
$$;

create or replace function public.enforce_expense_attachment_path()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_action uuid;
begin
  select e.action_id into v_action
  from public.action_expenses e
  where e.id = new.expense_id;

  if v_action is null then
    raise exception 'Despesa não encontrada';
  end if;

  if new.storage_path like '%..%'
     or new.storage_path not like new.organization_id::text || '/actions/' || v_action::text || '/%' then
    raise exception 'Caminho do comprovante inválido';
  end if;

  new.file_name := trim(new.file_name);
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Auditoria genérica (sem valores; só status e nomes de campos)
-- tg_argv[0] = entity_type
-- ---------------------------------------------------------------------------

create or replace function public.audit_row_changes()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_entity text := tg_argv[0];
  v_new jsonb := to_jsonb(new);
  v_changed text[];
begin
  if tg_op = 'INSERT' then
    insert into public.audit_logs (organization_id, actor_id, action, entity_type, entity_id, metadata)
    values (
      new.organization_id, auth.uid(), v_entity || '.created', v_entity, new.id,
      jsonb_build_object('status', v_new -> 'status')
    );
    return new;
  end if;

  if (v_new ->> 'status') is distinct from (to_jsonb(old) ->> 'status') then
    insert into public.audit_logs (organization_id, actor_id, action, entity_type, entity_id, metadata)
    values (
      new.organization_id, auth.uid(), v_entity || '.status_changed', v_entity, new.id,
      jsonb_build_object('from_status', to_jsonb(old) -> 'status', 'to_status', v_new -> 'status')
    );
  end if;

  select coalesce(array_agg(n.key order by n.key), '{}')
  into v_changed
  from jsonb_each(v_new) n
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

-- tg_argv: [0] prefixo do evento, [1] entity_type do pai, [2] coluna do id do pai,
-- [3] coluna registrada na metadata.
create or replace function public.audit_child_row_changes()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_row jsonb := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
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
    tg_argv[0] || case when tg_op = 'DELETE' then '_removed' else '_added' end,
    tg_argv[1],
    (v_row ->> tg_argv[2])::uuid,
    jsonb_build_object(tg_argv[3], v_row ->> tg_argv[3])
  );
  return null;
end;
$$;

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

create trigger expense_types_normalize
  before insert or update on public.expense_types
  for each row execute function public.normalize_expense_type_row();
create trigger expense_types_write_rules
  before insert or update on public.expense_types
  for each row execute function public.enforce_catalog_write_rules();
create trigger expense_types_immutable
  before update on public.expense_types
  for each row execute function public.enforce_catalog_immutable_columns();
create trigger expense_types_set_updated_at
  before update on public.expense_types
  for each row execute function public.set_updated_at();
create trigger expense_types_audit
  after insert or update on public.expense_types
  for each row execute function public.audit_row_changes('expense_type');

create trigger actions_normalize
  before insert or update on public.actions
  for each row execute function public.normalize_action_row();
create trigger actions_write_rules
  before insert or update on public.actions
  for each row execute function public.enforce_catalog_write_rules();
create trigger actions_immutable
  before update on public.actions
  for each row execute function public.enforce_catalog_immutable_columns();
create trigger actions_set_updated_at
  before update on public.actions
  for each row execute function public.set_updated_at();
create trigger actions_audit
  after insert or update on public.actions
  for each row execute function public.audit_row_changes('action');

create trigger action_participants_rules
  before insert on public.action_participants
  for each row execute function public.enforce_org_child_insert_rules();
create trigger action_participants_audit
  after insert or delete on public.action_participants
  for each row execute function public.audit_child_row_changes(
    'action.participant', 'action', 'action_id', 'consultant_id'
  );

create trigger action_expenses_normalize
  before insert or update on public.action_expenses
  for each row execute function public.normalize_action_expense_row();
create trigger action_expenses_rules
  before insert or update on public.action_expenses
  for each row execute function public.enforce_action_expense_rules();
create trigger action_expenses_write_rules
  before insert or update on public.action_expenses
  for each row execute function public.enforce_catalog_write_rules();
create trigger action_expenses_immutable
  before update on public.action_expenses
  for each row execute function public.enforce_catalog_immutable_columns();
create trigger action_expenses_set_updated_at
  before update on public.action_expenses
  for each row execute function public.set_updated_at();
create trigger action_expenses_audit
  after insert or update on public.action_expenses
  for each row execute function public.audit_row_changes('expense');

create trigger expense_attachments_path
  before insert on public.expense_attachments
  for each row execute function public.enforce_expense_attachment_path();
create trigger expense_attachments_rules
  before insert on public.expense_attachments
  for each row execute function public.enforce_org_child_insert_rules();
create trigger expense_attachments_audit
  after insert or delete on public.expense_attachments
  for each row execute function public.audit_child_row_changes(
    'expense.attachment', 'expense', 'expense_id', 'id'
  );

revoke all on function public.normalize_expense_type_row() from public, anon, authenticated;
revoke all on function public.normalize_action_row() from public, anon, authenticated;
revoke all on function public.normalize_action_expense_row() from public, anon, authenticated;
revoke all on function public.enforce_org_child_insert_rules() from public, anon, authenticated;
revoke all on function public.enforce_action_expense_rules() from public, anon, authenticated;
revoke all on function public.enforce_expense_attachment_path() from public, anon, authenticated;
revoke all on function public.audit_row_changes() from public, anon, authenticated;
revoke all on function public.audit_child_row_changes() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Views (security_invoker → RLS das tabelas base)
-- ---------------------------------------------------------------------------

create or replace view public.actions_with_totals
with (security_invoker = true)
as
select
  a.*,
  (
    select count(*)::integer
    from public.action_participants p
    where p.action_id = a.id
  ) as participant_count,
  coalesce((
    select sum(e.planned_amount)
    from public.action_expenses e
    where e.action_id = a.id
      and e.status <> 'cancelled'
  ), 0)::numeric(12, 2) as planned_total,
  coalesce((
    select sum(e.actual_amount)
    from public.action_expenses e
    where e.action_id = a.id
      and e.status = 'paid'
  ), 0)::numeric(12, 2) as paid_total
from public.actions a;

create or replace view public.action_expense_report
with (security_invoker = true)
as
select
  e.id as expense_id,
  e.organization_id,
  e.action_id,
  a.title as action_title,
  a.operator_id,
  a.region_id,
  e.expense_type_id,
  e.status,
  e.expense_date,
  date_trunc('month', coalesce(e.expense_date, a.starts_on))::date as reference_month,
  e.planned_amount,
  e.actual_amount
from public.action_expenses e
join public.actions a on a.id = e.action_id;

-- ---------------------------------------------------------------------------
-- RLS (somente admin — D38)
-- ---------------------------------------------------------------------------

alter table public.expense_types enable row level security;
alter table public.actions enable row level security;
alter table public.action_participants enable row level security;
alter table public.action_expenses enable row level security;
alter table public.expense_attachments enable row level security;

create policy expense_types_select_admin
  on public.expense_types for select to authenticated
  using (public.is_org_admin(organization_id));
create policy expense_types_insert_admin
  on public.expense_types for insert to authenticated
  with check (
    public.is_org_admin(organization_id)
    and organization_id = public.current_active_organization_id()
  );
create policy expense_types_update_admin
  on public.expense_types for update to authenticated
  using (public.is_org_admin(organization_id))
  with check (public.is_org_admin(organization_id));

create policy actions_select_admin
  on public.actions for select to authenticated
  using (public.is_org_admin(organization_id));
create policy actions_insert_admin
  on public.actions for insert to authenticated
  with check (
    public.is_org_admin(organization_id)
    and organization_id = public.current_active_organization_id()
  );
create policy actions_update_admin
  on public.actions for update to authenticated
  using (public.is_org_admin(organization_id))
  with check (public.is_org_admin(organization_id));

create policy action_participants_select_admin
  on public.action_participants for select to authenticated
  using (public.is_org_admin(organization_id));
create policy action_participants_insert_admin
  on public.action_participants for insert to authenticated
  with check (
    public.is_org_admin(organization_id)
    and organization_id = public.current_active_organization_id()
  );
create policy action_participants_delete_admin
  on public.action_participants for delete to authenticated
  using (public.is_org_admin(organization_id));

create policy action_expenses_select_admin
  on public.action_expenses for select to authenticated
  using (public.is_org_admin(organization_id));
create policy action_expenses_insert_admin
  on public.action_expenses for insert to authenticated
  with check (
    public.is_org_admin(organization_id)
    and organization_id = public.current_active_organization_id()
  );
create policy action_expenses_update_admin
  on public.action_expenses for update to authenticated
  using (public.is_org_admin(organization_id))
  with check (public.is_org_admin(organization_id));

create policy expense_attachments_select_admin
  on public.expense_attachments for select to authenticated
  using (public.is_org_admin(organization_id));
create policy expense_attachments_insert_admin
  on public.expense_attachments for insert to authenticated
  with check (
    public.is_org_admin(organization_id)
    and organization_id = public.current_active_organization_id()
  );
create policy expense_attachments_delete_admin
  on public.expense_attachments for delete to authenticated
  using (public.is_org_admin(organization_id));

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------

revoke all on table public.expense_types from public, anon, authenticated;
revoke all on table public.actions from public, anon, authenticated;
revoke all on table public.action_participants from public, anon, authenticated;
revoke all on table public.action_expenses from public, anon, authenticated;
revoke all on table public.expense_attachments from public, anon, authenticated;
revoke all on public.actions_with_totals from public, anon, authenticated;
revoke all on public.action_expense_report from public, anon, authenticated;

grant select, insert, update on table public.expense_types to authenticated;
grant select, insert, update on table public.actions to authenticated;
grant select, insert, delete on table public.action_participants to authenticated;
grant select, insert, update on table public.action_expenses to authenticated;
grant select, insert, delete on table public.expense_attachments to authenticated;
grant select on public.actions_with_totals to authenticated;
grant select on public.action_expense_report to authenticated;

-- ---------------------------------------------------------------------------
-- Storage: bucket privado de comprovantes
-- Caminho: {organization_id}/actions/{action_id}/{uuid}.{ext}
-- Formatos e tamanho provisórios (Q27).
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'action-receipts',
  'action-receipts',
  false,
  10485760,
  array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

create policy action_receipts_select_admin
  on storage.objects for select to authenticated
  using (
    bucket_id = 'action-receipts'
    and (storage.foldername(name))[1] = public.current_active_organization_id()::text
    and public.is_org_admin(public.current_active_organization_id())
  );

create policy action_receipts_insert_admin
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'action-receipts'
    and (storage.foldername(name))[1] = public.current_active_organization_id()::text
    and public.is_org_admin(public.current_active_organization_id())
  );

create policy action_receipts_delete_admin
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'action-receipts'
    and (storage.foldername(name))[1] = public.current_active_organization_id()::text
    and public.is_org_admin(public.current_active_organization_id())
  );

-- ---------------------------------------------------------------------------
-- Tipos de despesa iniciais (informados pela operação; D37/D39)
-- ---------------------------------------------------------------------------

insert into public.expense_types (organization_id, name)
select o.id, v.name
from public.organizations o
cross join (
  values
    ('Passagem aérea'),
    ('Aluguel de carro'),
    ('Combustível'),
    ('Recarga de cartão combustível/frota'),
    ('Recarga de cartão corporativo'),
    ('Contas'),
    ('Outros')
) as v (name)
on conflict do nothing;

comment on table public.actions is
  'Ações de bandeira (Operações e Ações). Somente admin (D38). Cancelar em vez de excluir.';
comment on table public.action_expenses is
  'Despesas da ação: previsto × realizado. Realizado conta apenas status paid.';
comment on table public.expense_attachments is
  'Metadados dos comprovantes; arquivo no bucket privado action-receipts.';

commit;
