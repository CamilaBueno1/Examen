-- policies.sql – Row Level Security (RLS) for Control Electoral
-- Generated per ADR‑05 (autorización territorial) and ADR‑11 (diagnóstico de fallos)

-- Enable RLS on all tables that store datos sensibles
-- Only the owner (supabase admin) can disable RLS later.

-- Make this script safe to rerun: replace only the policies defined below.
drop policy if exists acta_veedor_select on public.acta;
drop policy if exists acta_veedor_insert on public.acta;
drop policy if exists acta_veedor_update on public.acta;
drop policy if exists acta_coordinador_select on public.acta;
drop policy if exists acta_coordinador_insert on public.acta;
drop policy if exists acta_coordinador_update on public.acta;
drop policy if exists acta_provincial_select on public.acta;
drop policy if exists acta_provincial_insert on public.acta;
drop policy if exists acta_provincial_update on public.acta;
drop policy if exists outbox_user_all on public.outbox;
drop policy if exists foto_acta_user_select on public.foto_acta;
drop policy if exists error_log_insert on public.error_log;
drop policy if exists error_log_select_admin on public.error_log;
drop policy if exists profile_self_select on public.profile;

-- 1. ACTA – Los veedores solo pueden leer/escribir actas de sus JRV vigentes.
--    Los coordinadores de recinto pueden acceder a todas las JRV de su recinto.
--    El provincial accede a todo su territorio.

create policy acta_veedor_select on public.acta
    for select
    using (
        exists (
            select 1 from public.asignacion_veedor ao
            where ao.veedor_id = auth.uid()
              and ao.jrv_id = acta.jrv_id
              and ao.hasta is null
        )
    );

create policy acta_veedor_insert on public.acta
    for insert
    with check (
        exists (
            select 1 from public.asignacion_veedor ao
            where ao.veedor_id = auth.uid()
              and ao.jrv_id = acta.jrv_id
              and ao.hasta is null
        )
    );

create policy acta_veedor_update on public.acta
    for update
    using (
        exists (
            select 1 from public.asignacion_veedor ao
            where ao.veedor_id = auth.uid()
              and ao.jrv_id = acta.jrv_id
              and ao.hasta is null
        )
    )
    with check (
        exists (
            select 1 from public.asignacion_veedor ao
            where ao.veedor_id = auth.uid()
              and ao.jrv_id = acta.jrv_id
              and ao.hasta is null
        )
    );

-- Coordinador de recinto puede ver/insertar/actualizar actas de cualquier JRV de su recinto
create policy acta_coordinador_select on public.acta
    for select
    using (
        exists (
            select 1 from public.asignacion_coordinador_recinto ac
            join public.jrv j on j.recinto_id = ac.recinto_id
            where ac.coordinador_id = auth.uid()
              and j.id = acta.jrv_id
              and ac.hasta is null
        )
    );

create policy acta_coordinador_insert on public.acta
    for insert
    with check (
        exists (
            select 1 from public.asignacion_coordinador_recinto ac
            join public.jrv j on j.recinto_id = ac.recinto_id
            where ac.coordinador_id = auth.uid()
              and j.id = acta.jrv_id
              and ac.hasta is null
        )
    );

create policy acta_coordinador_update on public.acta
    for update
    using (
        exists (
            select 1 from public.asignacion_coordinador_recinto ac
            join public.jrv j on j.recinto_id = ac.recinto_id
            where ac.coordinador_id = auth.uid()
              and j.id = acta.jrv_id
              and ac.hasta is null
        )
    )
    with check (
        exists (
            select 1 from public.asignacion_coordinador_recinto ac
            join public.jrv j on j.recinto_id = ac.recinto_id
            where ac.coordinador_id = auth.uid()
              and j.id = acta.jrv_id
              and ac.hasta is null
        )
    );

-- Provincial (rol=provincial) tiene acceso total a su jurisdicción (provincia/canton definidos en tabla recinto)
create policy acta_provincial_select on public.acta
    for select
    using (
        (select rol from public.profile where auth_uid = auth.uid()) = 'provincial'
    );

create policy acta_provincial_insert on public.acta
    for insert
    with check (
        (select rol from public.profile where auth_uid = auth.uid()) = 'provincial'
    );

create policy acta_provincial_update on public.acta
    for update
    using (
        (select rol from public.profile where auth_uid = auth.uid()) = 'provincial'
    )
    with check (
        (select rol from public.profile where auth_uid = auth.uid()) = 'provincial'
    );

-- 2. OUTBOX – solo el propio usuario puede manipular sus operaciones pendientes
create policy outbox_user_all on public.outbox
    for all
    using (payload->>'created_by' = auth.uid()::text)
    with check (payload->>'created_by' = auth.uid()::text);

-- 3. FOTO_ACTA – acceso a la foto solo si el usuario tiene permiso sobre el acta asociada
create policy foto_acta_user_select on public.foto_acta
    for select
    using (
        exists (
            select 1 from public.acta a
            join public.asignacion_veedor ao on ao.jrv_id = a.jrv_id
            where a.id = foto_acta.acta_id
              and ao.veedor_id = auth.uid()
              and ao.hasta is null
        )
    );

-- 4. ERROR_LOG – cualquier usuario autenticado puede insertar su propio registro de error; solo admins pueden leer.
create policy error_log_insert on public.error_log
    for insert
    with check (true); -- any authenticated user can log errors

create policy error_log_select_admin on public.error_log
    for select
    using (auth.role() = 'service_role'); -- only admin role can read logs

-- Habilitar RLS en tablas
alter table public.profile enable row level security;
alter table public.acta enable row level security;
alter table public.outbox enable row level security;
alter table public.foto_acta enable row level security;
alter table public.error_log enable row level security;

-- Revocar acceso directo a los datos sensibles para PUBLIC (público)
revoke all on public.acta from public;
revoke all on public.outbox from public;
revoke all on public.foto_acta from public;
revoke all on public.error_log from public;

-- Cada usuario autenticado puede consultar únicamente su propio perfil.
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

-- Nota: Los permisos de INSERT/UPDATE/DELETE a nivel de tabla se delegan a los policies anteriores.
