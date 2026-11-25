begin;

alter table public.organizacion enable row level security;
revoke select on public.organizacion from public, anon;
revoke select (id, nombre) on public.organizacion from public, anon;
grant select (id, nombre) on public.organizacion to authenticated;

drop policy if exists organizaciones_solo_perfil_activo on public.organizacion;
drop policy if exists organizaciones_requieren_perfil_activo on public.organizacion;
create policy organizaciones_solo_perfil_activo on public.organizacion
    for select to authenticated
    using (true);

create policy organizaciones_requieren_perfil_activo on public.organizacion
    as restrictive for select to authenticated
    using (
        exists (
            select 1 from public.profile p
            where p.auth_uid = (select auth.uid())
              and p.activo
              and p.estado_cuenta = 'ACTIVE'
        )
    );

commit;
