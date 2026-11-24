begin;

alter table public.profile enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'profile'
      and policyname = 'profile_self_select'
  ) then
    create policy profile_self_select on public.profile
      for select
      using (auth_uid = auth.uid());
  end if;
end;
$$;

grant select on public.profile to authenticated;

create or replace function public.activar_perfil_primer_acceso()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profile
  set activo = true,
      updated_at = now()
  where auth_uid = auth.uid();

  if not found then
    raise exception 'No existe un perfil asociado a la sesión actual';
  end if;
end;
$$;

revoke all on function public.activar_perfil_primer_acceso() from public;
grant execute on function public.activar_perfil_primer_acceso() to authenticated;

commit;
