-- Sprint: Contratos e documentos (recebimento pelo escritório).
-- Revisão: docs/CONTRACTS_AND_DOCUMENTS.md (D55–D61).
-- Fase 1: somente escritório (admin/operator) acessa; consultor sem acesso (D55).
-- Modelo flexível: sem unique lojista+bandeira (D22/Q01); plano opcional em texto (Q02).

begin;

create type public.contract_status as enum (
  'draft',
  'awaiting_review',
  'pending_correction',
  'corrected',
  'approved',
  'registered_at_operator',
  'active',
  'rejected',
  'cancelled',
  'inactive'
);

create type public.pendency_status as enum ('open', 'resolved', 'cancelled');

-- Suporte a FK composta contracts → merchants (mesmo tenant)
create unique index if not exists merchants_id_org_uidx on public.merchants (id, organization_id);

-- D50: região = UF; no máximo uma região ativa por UF na organização
create unique index regions_org_state_active_uidx
  on public.regions (organization_id, state)
  where status = 'active' and state is not null;

-- ---------------------------------------------------------------------------
-- intake_channels (canais de recebimento: WhatsApps por bandeira — D56)
-- ---------------------------------------------------------------------------

create table public.intake_channels (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  channel_type text not null default 'whatsapp',
  operator_id uuid,
  phone_label text,
  status public.catalog_status not null default 'active',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id),
  constraint intake_channels_name_valid check (char_length(trim(name)) between 2 and 80),
  constraint intake_channels_type_valid check (channel_type in ('whatsapp', 'email', 'presencial', 'outro')),
  constraint intake_channels_phone_len check (phone_label is null or char_length(phone_label) <= 40),
  constraint intake_channels_operator_fkey
    foreign key (operator_id, organization_id)
    references public.operators (id, organization_id)
);

create unique index intake_channels_org_name_uidx on public.intake_channels (organization_id, lower(name));
create unique index intake_channels_id_org_uidx on public.intake_channels (id, organization_id);

-- ---------------------------------------------------------------------------
-- contracts
-- consultant_id e region_id são derivados do lojista (snapshot) — D57/D49/D50.
-- reference_month = mês da data de assinatura (D48).
-- ---------------------------------------------------------------------------

create table public.contracts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  merchant_id uuid not null,
  operator_id uuid not null,
  consultant_id uuid not null,
  region_id uuid,
  signed_on date not null,
  reference_month date not null,
  plan_name text,
  status public.contract_status not null default 'awaiting_review',
  status_note text,
  status_changed_at timestamptz not null default now(),
  received_at timestamptz not null default now(),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id),
  constraint contracts_plan_len check (plan_name is null or char_length(plan_name) <= 120),
  constraint contracts_status_note_len check (status_note is null or char_length(status_note) <= 1000),
  constraint contracts_merchant_fkey
    foreign key (merchant_id, organization_id)
    references public.merchants (id, organization_id),
  constraint contracts_operator_fkey
    foreign key (operator_id, organization_id)
    references public.operators (id, organization_id),
  constraint contracts_consultant_fkey
    foreign key (consultant_id, organization_id)
    references public.consultants (id, organization_id),
  constraint contracts_region_fkey
    foreign key (region_id, organization_id)
    references public.regions (id, organization_id)
);

create unique index contracts_id_org_uidx on public.contracts (id, organization_id);
create index contracts_org_status_received_idx on public.contracts (organization_id, status, received_at);
create index contracts_folder_idx
  on public.contracts (organization_id, region_id, consultant_id, operator_id, reference_month);
create index contracts_merchant_idx on public.contracts (merchant_id);
create index contracts_consultant_idx on public.contracts (consultant_id);

-- ---------------------------------------------------------------------------
-- contract_status_history (append-only; só triggers escrevem)
-- ---------------------------------------------------------------------------

create table public.contract_status_history (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  contract_id uuid not null,
  from_status public.contract_status,
  to_status public.contract_status not null,
  changed_by uuid references public.profiles (id),
  note text,
  changed_at timestamptz not null default now(),
  constraint contract_status_history_contract_fkey
    foreign key (contract_id, organization_id)
    references public.contracts (id, organization_id) on delete cascade
);

create index contract_status_history_contract_idx
  on public.contract_status_history (contract_id, changed_at);

-- ---------------------------------------------------------------------------
-- contract_submissions (remessas: cada recebimento de fotos/arquivos)
-- ---------------------------------------------------------------------------

create table public.contract_submissions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  contract_id uuid not null,
  kind text not null default 'initial',
  channel_id uuid,
  received_at timestamptz not null default now(),
  notes text,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles (id),
  constraint contract_submissions_kind_valid check (kind in ('initial', 'correction', 'complement')),
  constraint contract_submissions_notes_len check (notes is null or char_length(notes) <= 1000),
  constraint contract_submissions_contract_fkey
    foreign key (contract_id, organization_id)
    references public.contracts (id, organization_id) on delete cascade,
  constraint contract_submissions_channel_fkey
    foreign key (channel_id, organization_id)
    references public.intake_channels (id, organization_id)
);

create unique index contract_submissions_id_org_uidx on public.contract_submissions (id, organization_id);
create index contract_submissions_contract_idx on public.contract_submissions (contract_id, received_at);
create index contract_submissions_channel_idx on public.contract_submissions (channel_id)
  where channel_id is not null;

-- ---------------------------------------------------------------------------
-- contract_documents (arquivos no bucket privado contract-documents)
-- Nunca excluídos: arquivo errado é descartado com motivo (D59).
-- ---------------------------------------------------------------------------

create table public.contract_documents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  contract_id uuid not null,
  submission_id uuid not null,
  storage_path text not null,
  file_name text not null,
  mime_type text not null,
  size_bytes bigint not null,
  sha256 text not null,
  discarded_at timestamptz,
  discarded_by uuid references public.profiles (id),
  discard_reason text,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles (id),
  constraint contract_documents_path_unique unique (storage_path),
  constraint contract_documents_file_name_valid check (char_length(trim(file_name)) between 1 and 255),
  constraint contract_documents_mime_allowed check (
    mime_type in ('application/pdf', 'image/jpeg', 'image/png', 'image/webp')
  ),
  constraint contract_documents_size_valid check (size_bytes > 0 and size_bytes <= 10485760),
  constraint contract_documents_sha256_valid check (sha256 ~ '^[0-9a-f]{64}$'),
  constraint contract_documents_discard_valid check (
    discarded_at is null
    or (discard_reason is not null and char_length(discard_reason) between 3 and 500)
  ),
  constraint contract_documents_contract_fkey
    foreign key (contract_id, organization_id)
    references public.contracts (id, organization_id) on delete cascade,
  constraint contract_documents_submission_fkey
    foreign key (submission_id, organization_id)
    references public.contract_submissions (id, organization_id) on delete cascade
);

create unique index contract_documents_contract_sha_uidx
  on public.contract_documents (contract_id, sha256)
  where discarded_at is null;
create index contract_documents_org_sha_idx on public.contract_documents (organization_id, sha256);
create index contract_documents_submission_idx on public.contract_documents (submission_id);

-- ---------------------------------------------------------------------------
-- contract_pendencies
-- ---------------------------------------------------------------------------

create table public.contract_pendencies (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  contract_id uuid not null,
  reason text not null,
  status public.pendency_status not null default 'open',
  resolution_note text,
  resolved_at timestamptz,
  resolved_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id),
  constraint contract_pendencies_reason_valid check (char_length(trim(reason)) between 3 and 500),
  constraint contract_pendencies_resolution_len check (
    resolution_note is null or char_length(resolution_note) <= 1000
  ),
  constraint contract_pendencies_contract_fkey
    foreign key (contract_id, organization_id)
    references public.contracts (id, organization_id) on delete cascade
);

create index contract_pendencies_contract_idx on public.contract_pendencies (contract_id, status);
create index contract_pendencies_org_status_idx on public.contract_pendencies (organization_id, status);

-- ---------------------------------------------------------------------------
-- Normalização
-- ---------------------------------------------------------------------------

create or replace function public.normalize_intake_channel_row()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.name := trim(new.name);
  new.channel_type := lower(trim(new.channel_type));
  new.phone_label := nullif(trim(coalesce(new.phone_label, '')), '');
  new.notes := nullif(trim(coalesce(new.notes, '')), '');
  return new;
end;
$$;

create or replace function public.normalize_contract_row()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.reference_month := date_trunc('month', new.signed_on)::date;
  new.plan_name := nullif(trim(coalesce(new.plan_name, '')), '');
  new.status_note := nullif(trim(coalesce(new.status_note, '')), '');
  new.notes := nullif(trim(coalesce(new.notes, '')), '');
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Workflow de status (CONTRACT_WORKFLOW.md; ajuste D58: corrected é conferível)
-- ---------------------------------------------------------------------------

create or replace function public.contract_transition_allowed(
  p_from public.contract_status,
  p_to public.contract_status
)
returns boolean
language sql
immutable
set search_path = public, pg_temp
as $$
  select case p_from
    when 'draft' then p_to in ('awaiting_review', 'cancelled')
    when 'awaiting_review' then p_to in ('pending_correction', 'approved', 'rejected', 'cancelled')
    when 'pending_correction' then p_to in ('corrected', 'cancelled')
    when 'corrected' then p_to in ('awaiting_review', 'pending_correction', 'approved', 'rejected', 'cancelled')
    when 'approved' then p_to in ('registered_at_operator', 'rejected', 'cancelled')
    when 'registered_at_operator' then p_to in ('active', 'cancelled')
    when 'active' then p_to in ('inactive', 'cancelled')
    else false
  end;
$$;

create or replace function public.enforce_contract_rules()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_consultant uuid;
  v_state text;
  v_operator_status public.catalog_status;
begin
  if tg_op = 'INSERT' or new.merchant_id is distinct from old.merchant_id then
    select m.consultant_id, upper(m.state)
    into v_consultant, v_state
    from public.merchants m
    where m.id = new.merchant_id
      and m.organization_id = new.organization_id;

    if v_consultant is null then
      raise exception 'Lojista não encontrado';
    end if;

    new.consultant_id := v_consultant;
    new.region_id := (
      select r.id
      from public.regions r
      where r.organization_id = new.organization_id
        and r.status = 'active'
        and r.state = v_state
    );
  else
    new.consultant_id := old.consultant_id;
    new.region_id := old.region_id;

    -- Região ainda indefinida: tenta de novo (UF do lojista pode ter sido preenchida depois)
    if old.region_id is null then
      new.region_id := (
        select r.id
        from public.regions r
        join public.merchants m on m.id = new.merchant_id
        where r.organization_id = new.organization_id
          and r.status = 'active'
          and r.state = upper(m.state)
      );
    end if;
  end if;

  if tg_op = 'INSERT' or new.operator_id is distinct from old.operator_id then
    select o.status into v_operator_status
    from public.operators o
    where o.id = new.operator_id;
    if v_operator_status is distinct from 'active'::public.catalog_status then
      raise exception 'Bandeira inativa ou inexistente';
    end if;
  end if;

  if tg_op = 'INSERT' then
    if new.status not in ('draft', 'awaiting_review') then
      raise exception 'Contrato deve iniciar como rascunho ou aguardando conferência';
    end if;
    new.status_changed_at := now();
    return new;
  end if;

  if new.status is distinct from old.status then
    if not public.contract_transition_allowed(old.status, new.status) then
      raise exception 'Transição de status inválida: % → %', old.status, new.status;
    end if;

    if new.status = 'pending_correction' and not exists (
      select 1 from public.contract_pendencies p
      where p.contract_id = new.id and p.status = 'open'
    ) then
      raise exception 'Abra ao menos uma pendência antes de marcar pendente de correção';
    end if;

    if new.status = 'approved' and exists (
      select 1 from public.contract_pendencies p
      where p.contract_id = new.id and p.status = 'open'
    ) then
      raise exception 'Resolva as pendências abertas antes de aprovar';
    end if;

    new.status_changed_at := now();
  else
    new.status_note := old.status_note;
    new.status_changed_at := old.status_changed_at;
  end if;

  if new.received_at is distinct from old.received_at then
    raise exception 'Não é permitido alterar a data de recebimento';
  end if;

  return new;
end;
$$;

create or replace function public.log_contract_status()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'INSERT' or new.status is distinct from old.status then
    insert into public.contract_status_history (
      organization_id, contract_id, from_status, to_status, changed_by, note
    )
    values (
      new.organization_id,
      new.id,
      case when tg_op = 'UPDATE' then old.status end,
      new.status,
      auth.uid(),
      new.status_note
    );
  end if;
  return null;
end;
$$;

-- ---------------------------------------------------------------------------
-- Remessas
-- ---------------------------------------------------------------------------

create or replace function public.enforce_contract_submission_rules()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_contract_status public.contract_status;
  v_channel_status public.catalog_status;
begin
  select c.status into v_contract_status
  from public.contracts c
  where c.id = new.contract_id;

  if v_contract_status is null then
    raise exception 'Contrato não encontrado';
  end if;

  if v_contract_status in ('rejected', 'cancelled') then
    raise exception 'Contrato encerrado não recebe novos documentos';
  end if;

  if new.kind = 'initial' and exists (
    select 1 from public.contract_submissions s where s.contract_id = new.contract_id
  ) then
    raise exception 'O contrato já possui remessa inicial';
  end if;

  if new.channel_id is not null then
    select ch.status into v_channel_status
    from public.intake_channels ch
    where ch.id = new.channel_id;
    if v_channel_status is distinct from 'active'::public.catalog_status then
      raise exception 'Canal de recebimento inativo ou inexistente';
    end if;
  end if;

  if new.received_at > now() + interval '10 minutes' then
    raise exception 'Data de recebimento no futuro';
  end if;

  new.notes := nullif(trim(coalesce(new.notes, '')), '');
  return new;
end;
$$;

-- Correção recebida: pending_correction → corrected (volta para a fila)
create or replace function public.apply_contract_submission_effects()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.kind = 'correction' then
    update public.contracts
    set status = 'corrected', status_note = 'Correção recebida'
    where id = new.contract_id
      and status = 'pending_correction';
  end if;
  return null;
end;
$$;

-- ---------------------------------------------------------------------------
-- Documentos
-- ---------------------------------------------------------------------------

create or replace function public.enforce_contract_document_rules()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_submission_contract uuid;
begin
  if tg_op = 'INSERT' then
    select s.contract_id into v_submission_contract
    from public.contract_submissions s
    where s.id = new.submission_id;

    if v_submission_contract is distinct from new.contract_id then
      raise exception 'Remessa não pertence ao contrato';
    end if;

    if new.storage_path like '%..%'
       or new.storage_path not like new.organization_id::text || '/contracts/' || new.contract_id::text || '/%' then
      raise exception 'Caminho do documento inválido';
    end if;

    new.file_name := trim(new.file_name);
    new.discarded_at := null;
    new.discarded_by := null;
    new.discard_reason := null;
    return new;
  end if;

  -- UPDATE: somente descarte (uma vez), demais colunas imutáveis
  if old.discarded_at is not null then
    raise exception 'Documento já descartado';
  end if;

  if new.id is distinct from old.id
     or new.organization_id is distinct from old.organization_id
     or new.contract_id is distinct from old.contract_id
     or new.submission_id is distinct from old.submission_id
     or new.storage_path is distinct from old.storage_path
     or new.file_name is distinct from old.file_name
     or new.mime_type is distinct from old.mime_type
     or new.size_bytes is distinct from old.size_bytes
     or new.sha256 is distinct from old.sha256
     or new.created_at is distinct from old.created_at
     or new.created_by is distinct from old.created_by then
    raise exception 'Somente o descarte do documento pode ser registrado';
  end if;

  new.discard_reason := nullif(trim(coalesce(new.discard_reason, '')), '');
  if new.discard_reason is null then
    raise exception 'Informe o motivo do descarte';
  end if;

  new.discarded_at := now();
  new.discarded_by := auth.uid();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Pendências
-- ---------------------------------------------------------------------------

create or replace function public.enforce_contract_pendency_rules()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_contract_status public.contract_status;
begin
  new.reason := trim(new.reason);
  new.resolution_note := nullif(trim(coalesce(new.resolution_note, '')), '');

  if tg_op = 'INSERT' then
    select c.status into v_contract_status
    from public.contracts c
    where c.id = new.contract_id;

    if v_contract_status is null
       or v_contract_status not in ('awaiting_review', 'pending_correction', 'corrected') then
      raise exception 'Só é possível abrir pendência em contrato em conferência';
    end if;

    new.status := 'open';
    new.resolved_at := null;
    new.resolved_by := null;
    return new;
  end if;

  if new.contract_id is distinct from old.contract_id then
    raise exception 'Não é permitido mover a pendência para outro contrato';
  end if;

  if old.status <> 'open' then
    raise exception 'Pendência encerrada não pode ser alterada';
  end if;

  if new.status is distinct from old.status then
    if new.status = 'open' then
      raise exception 'Status de pendência inválido';
    end if;
    new.resolved_at := now();
    new.resolved_by := auth.uid();
  else
    new.resolved_at := null;
    new.resolved_by := null;
  end if;

  return new;
end;
$$;

-- Pendência aberta: contrato em conferência → pending_correction
create or replace function public.apply_contract_pendency_effects()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.contracts
  set status = 'pending_correction', status_note = 'Pendência aberta'
  where id = new.contract_id
    and status in ('awaiting_review', 'corrected');
  return null;
end;
$$;

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

create trigger intake_channels_normalize
  before insert or update on public.intake_channels
  for each row execute function public.normalize_intake_channel_row();
create trigger intake_channels_write_rules
  before insert or update on public.intake_channels
  for each row execute function public.enforce_catalog_write_rules();
create trigger intake_channels_immutable
  before update on public.intake_channels
  for each row execute function public.enforce_catalog_immutable_columns();
create trigger intake_channels_set_updated_at
  before update on public.intake_channels
  for each row execute function public.set_updated_at();
create trigger intake_channels_audit
  after insert or update on public.intake_channels
  for each row execute function public.audit_row_changes('intake_channel');

create trigger contracts_normalize
  before insert or update on public.contracts
  for each row execute function public.normalize_contract_row();
create trigger contracts_rules
  before insert or update on public.contracts
  for each row execute function public.enforce_contract_rules();
create trigger contracts_write_rules
  before insert or update on public.contracts
  for each row execute function public.enforce_catalog_write_rules();
create trigger contracts_immutable
  before update on public.contracts
  for each row execute function public.enforce_catalog_immutable_columns();
create trigger contracts_set_updated_at
  before update on public.contracts
  for each row execute function public.set_updated_at();
create trigger contracts_status_history
  after insert or update on public.contracts
  for each row execute function public.log_contract_status();
create trigger contracts_audit
  after insert or update on public.contracts
  for each row execute function public.audit_row_changes('contract');

create trigger contract_submissions_rules
  before insert on public.contract_submissions
  for each row execute function public.enforce_contract_submission_rules();
create trigger contract_submissions_write_rules
  before insert on public.contract_submissions
  for each row execute function public.enforce_org_child_insert_rules();
create trigger contract_submissions_effects
  after insert on public.contract_submissions
  for each row execute function public.apply_contract_submission_effects();
create trigger contract_submissions_audit
  after insert on public.contract_submissions
  for each row execute function public.audit_child_row_changes(
    'contract.submission', 'contract', 'contract_id', 'kind'
  );

create trigger contract_documents_rules
  before insert or update on public.contract_documents
  for each row execute function public.enforce_contract_document_rules();
create trigger contract_documents_write_rules
  before insert on public.contract_documents
  for each row execute function public.enforce_org_child_insert_rules();
create trigger contract_documents_audit
  after insert or update on public.contract_documents
  for each row execute function public.audit_row_changes('contract_document');

create trigger contract_pendencies_rules
  before insert or update on public.contract_pendencies
  for each row execute function public.enforce_contract_pendency_rules();
create trigger contract_pendencies_write_rules
  before insert or update on public.contract_pendencies
  for each row execute function public.enforce_catalog_write_rules();
create trigger contract_pendencies_immutable
  before update on public.contract_pendencies
  for each row execute function public.enforce_catalog_immutable_columns();
create trigger contract_pendencies_set_updated_at
  before update on public.contract_pendencies
  for each row execute function public.set_updated_at();
create trigger contract_pendencies_effects
  after insert on public.contract_pendencies
  for each row execute function public.apply_contract_pendency_effects();
create trigger contract_pendencies_audit
  after insert or update on public.contract_pendencies
  for each row execute function public.audit_row_changes('contract_pendency');

revoke all on function public.normalize_intake_channel_row() from public, anon, authenticated;
revoke all on function public.normalize_contract_row() from public, anon, authenticated;
revoke all on function public.contract_transition_allowed(public.contract_status, public.contract_status)
  from public, anon, authenticated;
revoke all on function public.enforce_contract_rules() from public, anon, authenticated;
revoke all on function public.log_contract_status() from public, anon, authenticated;
revoke all on function public.enforce_contract_submission_rules() from public, anon, authenticated;
revoke all on function public.apply_contract_submission_effects() from public, anon, authenticated;
revoke all on function public.enforce_contract_document_rules() from public, anon, authenticated;
revoke all on function public.enforce_contract_pendency_rules() from public, anon, authenticated;
revoke all on function public.apply_contract_pendency_effects() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Views (security_invoker: respeitam RLS das tabelas)
-- ---------------------------------------------------------------------------

create or replace view public.contracts_overview
with (security_invoker = true)
as
select
  c.*,
  m.legal_name as merchant_legal_name,
  m.trade_name as merchant_trade_name,
  m.document as merchant_document,
  m.city as merchant_city,
  m.state as merchant_state,
  co.full_name as consultant_name,
  o.name as operator_name,
  r.name as region_name,
  r.state as region_state,
  (
    select count(*)::integer
    from public.contract_pendencies p
    where p.contract_id = c.id and p.status = 'open'
  ) as open_pendency_count,
  (
    select count(*)::integer
    from public.contract_documents d
    where d.contract_id = c.id and d.discarded_at is null
  ) as document_count,
  (
    select max(s.received_at)
    from public.contract_submissions s
    where s.contract_id = c.id
  ) as last_received_at
from public.contracts c
join public.merchants m on m.id = c.merchant_id
join public.consultants co on co.id = c.consultant_id
join public.operators o on o.id = c.operator_id
left join public.regions r on r.id = c.region_id;

create or replace view public.contract_folder_summary
with (security_invoker = true)
as
select
  c.organization_id,
  c.region_id,
  c.consultant_id,
  c.operator_id,
  c.reference_month,
  count(*)::integer as total,
  (count(*) filter (where c.status in ('awaiting_review', 'corrected')))::integer as in_review,
  (count(*) filter (where c.status = 'pending_correction'))::integer as pending
from public.contracts c
group by c.organization_id, c.region_id, c.consultant_id, c.operator_id, c.reference_month;

-- ---------------------------------------------------------------------------
-- RLS — escritório (admin/operator). Canais: escrita só admin.
-- ---------------------------------------------------------------------------

alter table public.intake_channels enable row level security;
alter table public.contracts enable row level security;
alter table public.contract_status_history enable row level security;
alter table public.contract_submissions enable row level security;
alter table public.contract_documents enable row level security;
alter table public.contract_pendencies enable row level security;

create policy intake_channels_select_office
  on public.intake_channels for select to authenticated
  using (public.has_org_role(organization_id, array['admin', 'operator']::public.app_role[]));
create policy intake_channels_insert_admin
  on public.intake_channels for insert to authenticated
  with check (
    public.is_org_admin(organization_id)
    and organization_id = public.current_active_organization_id()
  );
create policy intake_channels_update_admin
  on public.intake_channels for update to authenticated
  using (public.is_org_admin(organization_id))
  with check (public.is_org_admin(organization_id));

create policy contracts_select_office
  on public.contracts for select to authenticated
  using (public.has_org_role(organization_id, array['admin', 'operator']::public.app_role[]));
create policy contracts_insert_office
  on public.contracts for insert to authenticated
  with check (
    public.has_org_role(organization_id, array['admin', 'operator']::public.app_role[])
    and organization_id = public.current_active_organization_id()
  );
create policy contracts_update_office
  on public.contracts for update to authenticated
  using (public.has_org_role(organization_id, array['admin', 'operator']::public.app_role[]))
  with check (public.has_org_role(organization_id, array['admin', 'operator']::public.app_role[]));

create policy contract_status_history_select_office
  on public.contract_status_history for select to authenticated
  using (public.has_org_role(organization_id, array['admin', 'operator']::public.app_role[]));

create policy contract_submissions_select_office
  on public.contract_submissions for select to authenticated
  using (public.has_org_role(organization_id, array['admin', 'operator']::public.app_role[]));
create policy contract_submissions_insert_office
  on public.contract_submissions for insert to authenticated
  with check (
    public.has_org_role(organization_id, array['admin', 'operator']::public.app_role[])
    and organization_id = public.current_active_organization_id()
  );

create policy contract_documents_select_office
  on public.contract_documents for select to authenticated
  using (public.has_org_role(organization_id, array['admin', 'operator']::public.app_role[]));
create policy contract_documents_insert_office
  on public.contract_documents for insert to authenticated
  with check (
    public.has_org_role(organization_id, array['admin', 'operator']::public.app_role[])
    and organization_id = public.current_active_organization_id()
  );
create policy contract_documents_update_office
  on public.contract_documents for update to authenticated
  using (public.has_org_role(organization_id, array['admin', 'operator']::public.app_role[]))
  with check (public.has_org_role(organization_id, array['admin', 'operator']::public.app_role[]));

create policy contract_pendencies_select_office
  on public.contract_pendencies for select to authenticated
  using (public.has_org_role(organization_id, array['admin', 'operator']::public.app_role[]));
create policy contract_pendencies_insert_office
  on public.contract_pendencies for insert to authenticated
  with check (
    public.has_org_role(organization_id, array['admin', 'operator']::public.app_role[])
    and organization_id = public.current_active_organization_id()
  );
create policy contract_pendencies_update_office
  on public.contract_pendencies for update to authenticated
  using (public.has_org_role(organization_id, array['admin', 'operator']::public.app_role[]))
  with check (public.has_org_role(organization_id, array['admin', 'operator']::public.app_role[]));

-- ---------------------------------------------------------------------------
-- Grants (sem DELETE em nenhuma tabela)
-- ---------------------------------------------------------------------------

revoke all on table public.intake_channels from public, anon, authenticated;
revoke all on table public.contracts from public, anon, authenticated;
revoke all on table public.contract_status_history from public, anon, authenticated;
revoke all on table public.contract_submissions from public, anon, authenticated;
revoke all on table public.contract_documents from public, anon, authenticated;
revoke all on table public.contract_pendencies from public, anon, authenticated;
revoke all on public.contracts_overview from public, anon, authenticated;
revoke all on public.contract_folder_summary from public, anon, authenticated;

grant select, insert, update on table public.intake_channels to authenticated;
grant select, insert, update on table public.contracts to authenticated;
grant select on table public.contract_status_history to authenticated;
grant select, insert on table public.contract_submissions to authenticated;
grant select, insert, update on table public.contract_documents to authenticated;
grant select, insert, update on table public.contract_pendencies to authenticated;
grant select on public.contracts_overview to authenticated;
grant select on public.contract_folder_summary to authenticated;

-- ---------------------------------------------------------------------------
-- Storage: bucket privado de documentos de contrato
-- Caminho: {organization_id}/contracts/{contract_id}/{uuid}.{ext}
-- DELETE só de arquivo órfão (upload cujo registro falhou).
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'contract-documents',
  'contract-documents',
  false,
  10485760,
  array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

create policy contract_documents_storage_select_office
  on storage.objects for select to authenticated
  using (
    bucket_id = 'contract-documents'
    and (storage.foldername(name))[1] = public.current_active_organization_id()::text
    and public.has_org_role(
      public.current_active_organization_id(),
      array['admin', 'operator']::public.app_role[]
    )
  );

create policy contract_documents_storage_insert_office
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'contract-documents'
    and (storage.foldername(name))[1] = public.current_active_organization_id()::text
    and public.has_org_role(
      public.current_active_organization_id(),
      array['admin', 'operator']::public.app_role[]
    )
  );

create policy contract_documents_storage_delete_orphan_office
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'contract-documents'
    and (storage.foldername(name))[1] = public.current_active_organization_id()::text
    and public.has_org_role(
      public.current_active_organization_id(),
      array['admin', 'operator']::public.app_role[]
    )
    and not exists (
      select 1 from public.contract_documents d where d.storage_path = name
    )
  );

comment on table public.contracts is
  'Contrato lojista ↔ bandeira. Pasta: região (UF do lojista) → consultor → bandeira → mês da assinatura.';
comment on table public.contract_submissions is
  'Remessas: cada recebimento de arquivos (canal, data/hora, quem registrou).';
comment on table public.contract_documents is
  'Arquivos do contrato; nunca excluídos, apenas descartados com motivo.';
comment on table public.intake_channels is
  'Canais de recebimento (ex.: WhatsApp por bandeira).';

commit;
