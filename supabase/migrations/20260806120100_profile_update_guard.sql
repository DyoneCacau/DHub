-- Impede alteração de id/email do próprio perfil pelo cliente.

create or replace function public.enforce_profile_self_update()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.id is distinct from old.id then
    raise exception 'Não é permitido alterar o id do perfil';
  end if;

  -- e-mail de autenticação não é editável por este caminho
  new.email := old.email;
  return new;
end;
$$;

drop trigger if exists profiles_enforce_self_update on public.profiles;

create trigger profiles_enforce_self_update
  before update on public.profiles
  for each row execute function public.enforce_profile_self_update();
