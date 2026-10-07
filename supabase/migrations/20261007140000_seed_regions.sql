-- Regiões = estados (UF) atendidos pela cliente (D50).
-- Não duplica: pula a UF se a organização já tiver região com o mesmo estado.

insert into public.regions (organization_id, name, state)
select o.id, v.name, v.state
from public.organizations o
cross join (
  values
    ('Bahia', 'BA'),
    ('Ceará', 'CE'),
    ('Distrito Federal', 'DF'),
    ('Maranhão', 'MA'),
    ('Pará', 'PA'),
    ('Paraná', 'PR'),
    ('Pernambuco', 'PE'),
    ('Rio de Janeiro', 'RJ'),
    ('Rio Grande do Norte', 'RN'),
    ('Rio Grande do Sul', 'RS'),
    ('Santa Catarina', 'SC'),
    ('São Paulo', 'SP')
) as v (name, state)
where not exists (
  select 1
  from public.regions r
  where r.organization_id = o.id
    and r.state = v.state
)
on conflict do nothing;
