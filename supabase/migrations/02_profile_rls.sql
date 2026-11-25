-- Guía: Establece las políticas iniciales de acceso a perfiles.

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

commit;
