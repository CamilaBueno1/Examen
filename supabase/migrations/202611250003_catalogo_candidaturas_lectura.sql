begin;

alter table public.candidato enable row level security;
revoke select on public.candidato from public, anon;
revoke select (id, organizacion_id, dignidad, nombre) on public.candidato from public, anon;
grant select (id, organizacion_id, dignidad, nombre) on public.candidato to authenticated;

create policy candidaturas_lectura on public.candidato
    for select to authenticated using (true);

create policy candidaturas_requieren_perfil_activo on public.candidato
    as restrictive for select to authenticated using (
        exists (
            select 1 from public.profile p
            where p.auth_uid = (select auth.uid()) and p.activo and p.estado_cuenta = 'ACTIVE'
        )
    );

commit;
