begin;

alter table public.recinto
  add column if not exists parroquia varchar(100) not null default 'Sin especificar';

create unique index if not exists idx_recinto_provincia_canton_nombre
  on public.recinto (provincia, canton, nombre);

alter table public.profile
  add column if not exists estado_cuenta varchar(12) not null default 'PENDING';

update public.profile
set estado_cuenta = case when activo then 'ACTIVE' else 'PENDING' end
where estado_cuenta = 'PENDING';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'profile_estado_cuenta_check'
      and conrelid = 'public.profile'::regclass
  ) then
    alter table public.profile
      add constraint profile_estado_cuenta_check
      check (estado_cuenta in ('PENDING', 'ACTIVE', 'DISABLED'));
  end if;
end;
$$;

create or replace function public.registrar_recinto(
  nombre text,
  parroquia text,
  numero_jrv integer
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid;
  nuevo_recinto uuid;
begin
  select p.id into actor
  from public.profile p
  where p.auth_uid = auth.uid()
    and p.activo
    and p.estado_cuenta = 'ACTIVE'
    and p.rol = 'provincial';

  if actor is null then
    raise exception 'PERMISO_REVOCADO';
  end if;
  if char_length(trim(nombre)) not between 2 and 150
      or char_length(trim(parroquia)) not between 2 and 100
      or numero_jrv not between 1 and 200 then
    raise exception 'DATOS_RECINTO_INVALIDOS';
  end if;

  insert into public.recinto (provincia, canton, parroquia, nombre)
  values ('Pichincha', 'Rumiñahui', trim(parroquia), trim(nombre))
  returning id into nuevo_recinto;

  insert into public.jrv (recinto_id, numero)
  select nuevo_recinto, n
  from generate_series(1, numero_jrv) as n;

  return nuevo_recinto;
end;
$$;

revoke all on function public.registrar_recinto(text, text, integer) from public, anon;
grant execute on function public.registrar_recinto(text, text, integer) to authenticated;

create or replace function public.activar_perfil_primer_acceso()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from electoral_privado.primer_acceso s using auth.users u
  where s.auth_uid = auth.uid()
    and u.id = s.auth_uid
    and s.session_id = (auth.jwt()->>'session_id')::uuid
    and s.vence_en > now()
    and s.huella_clave <> sha256(convert_to(u.encrypted_password, 'UTF8'));
  if not found then
    raise exception 'Falta acreditar el código de correo y el cambio de contraseña';
  end if;

  update public.profile
  set activo = true, estado_cuenta = 'ACTIVE', updated_at = now()
  where auth_uid = auth.uid() and estado_cuenta = 'PENDING';
  if not found then
    raise exception 'No existe un perfil pendiente para activar';
  end if;
end;
$$;

revoke all on function public.activar_perfil_primer_acceso() from public, anon;
grant execute on function public.activar_perfil_primer_acceso() to authenticated;

create or replace function public.crear_veedor_asignacion(
  p_veedor_id uuid,
  p_jrv_id uuid,
  p_actor_id uuid,
  p_motivo text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  recinto_actual uuid;
begin
  if char_length(trim(p_motivo)) not between 1 and 250 or p_motivo is null then
    raise exception 'MOTIVO_INVALIDO';
  end if;

  select j.recinto_id into recinto_actual
  from public.jrv j
  where j.id = p_jrv_id
  for update;
  if recinto_actual is null
      or not exists (
        select 1 from public.profile actor
        join public.asignacion_coordinador_recinto c on c.coordinador_id = actor.id
        where actor.id = p_actor_id and actor.rol = 'coordinador_recinto'
          and actor.activo and actor.estado_cuenta = 'ACTIVE'
          and c.recinto_id = recinto_actual and c.hasta is null and c.desde <= now()
      )
      or not exists (
        select 1 from public.profile veedor
        where veedor.id = p_veedor_id and veedor.rol = 'veedor'
          and not veedor.activo and veedor.estado_cuenta = 'PENDING'
      ) then
    raise exception 'PERMISO_REVOCADO';
  end if;

  update public.asignacion_veedor
  set hasta = clock_timestamp()
  where jrv_id = p_jrv_id and hasta is null;

  insert into public.asignacion_veedor (jrv_id, veedor_id, desde, motivo, asignado_por)
  values (p_jrv_id, p_veedor_id, clock_timestamp(), trim(p_motivo), p_actor_id);
end;
$$;

revoke all on function public.crear_veedor_asignacion(uuid, uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.crear_veedor_asignacion(uuid, uuid, uuid, text) to service_role;

create or replace function public.crear_coordinador_asignacion(
  p_coordinador_id uuid,
  p_recinto_id uuid,
  p_actor_id uuid,
  p_motivo text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if char_length(trim(p_motivo)) not between 1 and 250 or p_motivo is null
      or not exists (
        select 1 from public.profile actor
        where actor.id = p_actor_id and actor.rol = 'provincial'
          and actor.activo and actor.estado_cuenta = 'ACTIVE'
      )
      or not exists (
        select 1 from public.recinto r
        where r.id = p_recinto_id and r.provincia = 'Pichincha' and r.canton = 'Rumiñahui'
      )
      or not exists (
        select 1 from public.profile coordinador
        where coordinador.id = p_coordinador_id and coordinador.rol = 'coordinador_recinto'
          and not coordinador.activo and coordinador.estado_cuenta = 'PENDING'
      ) then
    raise exception 'PERMISO_REVOCADO';
  end if;

  perform 1 from public.recinto r where r.id = p_recinto_id for update;
  update public.asignacion_coordinador_recinto
  set hasta = clock_timestamp()
  where recinto_id = p_recinto_id and hasta is null;

  insert into public.asignacion_coordinador_recinto
    (recinto_id, coordinador_id, desde, motivo, asignado_por)
  values
    (p_recinto_id, p_coordinador_id, clock_timestamp(), trim(p_motivo), p_actor_id);
end;
$$;

revoke all on function public.crear_coordinador_asignacion(uuid, uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.crear_coordinador_asignacion(uuid, uuid, uuid, text) to service_role;

create or replace function public.desactivar_cuenta(p_perfil_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor public.profile%rowtype;
  objetivo public.profile%rowtype;
begin
  select p.* into actor
  from public.profile p
  where p.auth_uid = auth.uid() and p.activo and p.estado_cuenta = 'ACTIVE';
  select p.* into objetivo
  from public.profile p
  where p.id = p_perfil_id
  for update;

  if actor.id is null or objetivo.id is null or objetivo.activo is false
      or not (
        (actor.rol = 'provincial'
          and objetivo.rol = 'coordinador_recinto'
          and exists (
            select 1 from public.asignacion_coordinador_recinto c
            join public.recinto r on r.id = c.recinto_id
            where c.coordinador_id = objetivo.id
              and r.provincia = 'Pichincha' and r.canton = 'Rumiñahui'
          ))
        or (actor.rol = 'coordinador_recinto'
          and objetivo.rol = 'veedor'
          and exists (
            select 1 from public.asignacion_veedor v
            join public.jrv j on j.id = v.jrv_id
            join public.asignacion_coordinador_recinto c on c.recinto_id = j.recinto_id
            where v.veedor_id = objetivo.id and c.coordinador_id = actor.id
          ))
      ) then
    raise exception 'PERMISO_REVOCADO';
  end if;

  if objetivo.rol = 'veedor' then
    perform 1 from public.jrv j
    join public.asignacion_veedor v on v.jrv_id = j.id
    where v.veedor_id = objetivo.id and v.hasta is null
    order by j.id
    for update of j;
    update public.asignacion_veedor
    set hasta = clock_timestamp()
    where veedor_id = objetivo.id and hasta is null;
  else
    perform 1 from public.jrv j
    join public.asignacion_coordinador_recinto c on c.recinto_id = j.recinto_id
    where c.coordinador_id = objetivo.id and c.hasta is null
    order by j.id
    for update of j;
    update public.asignacion_coordinador_recinto
    set hasta = clock_timestamp()
    where coordinador_id = objetivo.id and hasta is null;
  end if;

  update public.profile
  set activo = false, estado_cuenta = 'DISABLED', updated_at = now()
  where id = objetivo.id;
end;
$$;

revoke all on function public.desactivar_cuenta(uuid) from public, anon;
grant execute on function public.desactivar_cuenta(uuid) to authenticated;

commit;
