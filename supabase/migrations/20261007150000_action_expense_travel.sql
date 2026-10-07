-- Detalhes de viagem nas despesas das ações (período, origem/destino, reserva)
-- e novos tipos de despesa. Ver docs/OPERATIONS_AND_ACTIONS.md (D52–D54).

alter table public.action_expenses
  add column period_start date,
  add column period_end date,
  add column origin text,
  add column destination text,
  add column booking_code text,
  add constraint action_expenses_period_valid check (
    period_start is null or period_end is null or period_end >= period_start
  ),
  add constraint action_expenses_travel_lengths check (
    (origin is null or char_length(origin) <= 120)
    and (destination is null or char_length(destination) <= 120)
    and (booking_code is null or char_length(booking_code) <= 60)
  );

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
  new.origin := nullif(trim(coalesce(new.origin, '')), '');
  new.destination := nullif(trim(coalesce(new.destination, '')), '');
  new.booking_code := nullif(upper(trim(coalesce(new.booking_code, ''))), '');
  return new;
end;
$$;

revoke all on function public.normalize_action_expense_row() from public, anon, authenticated;

-- Colunas novas só no final (create or replace view não permite reordenar).
-- Mês de referência: data da despesa, senão início do período, senão início da ação.
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
  date_trunc('month', coalesce(e.expense_date, e.period_start, a.starts_on))::date as reference_month,
  e.planned_amount,
  e.actual_amount,
  e.consultant_id,
  e.supplier,
  e.description,
  e.payment_method,
  e.period_start,
  e.period_end,
  e.origin,
  e.destination,
  e.booking_code,
  a.status as action_status
from public.action_expenses e
join public.actions a on a.id = e.action_id;

revoke all on public.action_expense_report from public, anon, authenticated;
grant select on public.action_expense_report to authenticated;

insert into public.expense_types (organization_id, name)
select o.id, v.name
from public.organizations o
cross join (
  values
    ('Hospedagem / Hotel'),
    ('Alimentação'),
    ('Táxi / Uber / transporte local')
) as v (name)
on conflict do nothing;
