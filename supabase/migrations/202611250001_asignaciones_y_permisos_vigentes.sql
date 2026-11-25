-- Los índices únicos parciales existentes se conservan. No se modifica historial.
begin;

CREATE OR REPLACE FUNCTION public.mesas_autorizadas()
 RETURNS TABLE(jrv_id uuid, numero integer, recinto_id uuid, recinto text, latitud double precision, longitud double precision)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
    select j.id, j.numero, r.id, r.nombre::text, r.latitud, r.longitud
    from public.profile p
    join public.recinto r on r.provincia = 'Pichincha' and r.canton = 'Rumiñahui'
    join public.jrv j on j.recinto_id = r.id
    where p.auth_uid = auth.uid()
      and p.activo and p.estado_cuenta = 'ACTIVE'
      and (
          p.rol = 'provincial'
          or (p.rol = 'coordinador_recinto' and exists (
              select 1 from public.asignacion_coordinador_recinto c
              where c.coordinador_id = p.id and c.recinto_id = r.id
                and c.desde <= now() and c.hasta is null
          ))
          or (p.rol = 'veedor' and exists (
              select 1 from public.asignacion_veedor a
              where a.veedor_id = p.id and a.jrv_id = j.id
                and a.desde <= now() and a.hasta is null
          ))
      )
    order by r.nombre, j.numero, j.id;
$function$;

CREATE OR REPLACE FUNCTION public.cambiar_veedor_jrv(mesa uuid, veedor uuid, razon text, asignacion_esperada uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
    actor uuid;
    recinto_actual uuid;
    asignacion_actual uuid;
    veedor_anterior uuid;
    instante timestamptz;
begin
    select p.id into actor from public.profile p
    where p.auth_uid = auth.uid() and p.activo and p.estado_cuenta = 'ACTIVE' and p.rol = 'coordinador_recinto';
    if actor is null or char_length(trim(razon)) not between 1 and 250 or razon is null then
        raise exception 'Se requiere un coordinador activo y un motivo válido';
    end if;

    select j.recinto_id into recinto_actual
    from public.jrv j
    join public.recinto r on r.id = j.recinto_id
    join public.asignacion_coordinador_recinto c on c.recinto_id = j.recinto_id
    where j.id = mesa and r.provincia = 'Pichincha' and r.canton = 'Rumiñahui'
      and c.coordinador_id = actor and c.hasta is null and c.desde <= now()
    for update of j, c;
    if recinto_actual is null then
        raise exception 'PERMISO_REVOCADO';
    end if;

    if not exists (
        select 1 from public.profile p
        where p.id = veedor and p.activo and p.estado_cuenta = 'ACTIVE' and p.rol = 'veedor'
          and exists (
            select 1 from public.asignacion_veedor a join public.jrv j on j.id = a.jrv_id
            where a.veedor_id = p.id and j.recinto_id = recinto_actual
          )
    ) then
        raise exception 'El veedor no pertenece al equipo de tu recinto';
    end if;

    select a.id, a.veedor_id into asignacion_actual, veedor_anterior from public.asignacion_veedor a
      where a.jrv_id = mesa and a.hasta is null;
    if asignacion_actual is distinct from asignacion_esperada then
        if asignacion_esperada is null then raise exception 'JRV_OCUPADA'; end if;
        raise exception 'ASIGNACION_CAMBIO';
    end if;
    if veedor_anterior = veedor then return; end if;

    instante := clock_timestamp();
    update public.asignacion_veedor a set hasta = instante
      where a.id = asignacion_actual and a.hasta is null;
    insert into public.asignacion_veedor (jrv_id, veedor_id, desde, motivo, asignado_por)
      values (mesa, veedor, instante, trim(razon), actor);
end;
$function$;

CREATE OR REPLACE FUNCTION public.crear_veedor_asignacion_confirmada(
  p_veedor_id uuid, p_jrv_id uuid, p_actor_id uuid, p_motivo text, p_asignacion_esperada uuid
)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  recinto_actual uuid;
  asignacion_actual uuid;
  instante timestamptz;
begin
  if char_length(trim(p_motivo)) not between 1 and 250 or p_motivo is null then
    raise exception 'MOTIVO_INVALIDO';
  end if;

  select j.recinto_id into recinto_actual
  from public.jrv j
  join public.recinto r on r.id = j.recinto_id
  where j.id = p_jrv_id and r.provincia = 'Pichincha' and r.canton = 'Rumiñahui'
  for update of j;
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

  select a.id into asignacion_actual from public.asignacion_veedor a
  where a.jrv_id = p_jrv_id and a.hasta is null;
  if asignacion_actual is distinct from p_asignacion_esperada then
    if p_asignacion_esperada is null then raise exception 'JRV_OCUPADA'; end if;
    raise exception 'ASIGNACION_CAMBIO';
  end if;

  instante := clock_timestamp();
  update public.asignacion_veedor set hasta = instante
  where id = asignacion_actual and hasta is null;
  insert into public.asignacion_veedor (jrv_id, veedor_id, desde, motivo, asignado_por)
  values (p_jrv_id, p_veedor_id, instante, trim(p_motivo), p_actor_id);
end;
$function$;

create or replace function public.crear_veedor_asignacion(
  p_veedor_id uuid, p_jrv_id uuid, p_actor_id uuid, p_motivo text
)
returns void language sql security invoker set search_path = ''
as $$
  select public.crear_veedor_asignacion_confirmada(p_veedor_id, p_jrv_id, p_actor_id, p_motivo, null);
$$;

CREATE OR REPLACE FUNCTION public.historial_veedor_recinto()
 RETURNS TABLE(id uuid, jrv_id uuid, veedor_id uuid, veedor text, activo boolean, desde timestamp with time zone, hasta timestamp with time zone, motivo text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
    select a.id, a.jrv_id, a.veedor_id, concat_ws(' ', v.nombres, v.apellidos),
      coalesce(v.activo and v.estado_cuenta = 'ACTIVE', false), a.desde, a.hasta, a.motivo::text
    from public.asignacion_veedor a
    join public.mesas_autorizadas() m on m.jrv_id = a.jrv_id
    join public.profile v on v.id = a.veedor_id
    where exists (
      select 1 from public.profile p
      where p.auth_uid = auth.uid() and p.activo and p.estado_cuenta = 'ACTIVE' and p.rol = 'coordinador_recinto'
    )
    order by a.desde desc, a.id;
$function$;

create or replace function public.puede_subir_evidencia(ruta text)
returns boolean language plpgsql volatile security definer set search_path = ''
as $$
declare
    mesa uuid;
begin
    select a.jrv_id into mesa
    from electoral_privado.operaciones_acta o
    join public.acta a on a.id = o.acta_id
    where o.autor = auth.uid() and ruta = o.autor::text || '/' || o.acta_id::text || '.jpg';
    if not found then return false; end if;

    -- La política de Storage comparte el bloqueo de la JRV con el reemplazo.
    perform 1 from public.jrv j where j.id = mesa for share;
    return found and exists (select 1 from public.mesas_autorizadas() m where m.jrv_id = mesa);
end;
$$;

CREATE OR REPLACE FUNCTION public.registrar_evidencia(operacion uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
    registro electoral_privado.operaciones_acta%rowtype;
    mesa uuid;
    ruta text;
    calidad text;
begin
    select o.* into registro from electoral_privado.operaciones_acta o
      where o.operacion = registrar_evidencia.operacion and o.autor = auth.uid();
    if not found then raise exception 'PERMISO_REVOCADO'; end if;
    select a.jrv_id into mesa from public.acta a where a.id = registro.acta_id;
    perform 1 from public.jrv j where j.id = mesa for update;
    if not found then raise exception 'PERMISO_REVOCADO'; end if;
    -- Serializa reintentos de evidencia de una misma operación tras bloquear la JRV.
    perform 1 from electoral_privado.operaciones_acta o
      where o.operacion = registrar_evidencia.operacion for update;
    ruta := registro.autor::text || '/' || registro.acta_id::text || '.jpg';
    if not public.puede_subir_evidencia(ruta) then raise exception 'PERMISO_REVOCADO'; end if;
    if not exists (select 1 from storage.objects o where o.bucket_id = 'actas-privadas' and o.name = ruta) then
        raise exception 'EVIDENCIA_PENDIENTE';
    end if;
    calidad := registro.datos->>'calidadFoto';
    if not exists (select 1 from public.foto_acta f where f.acta_id = registro.acta_id and f.storage_path = ruta) then
        insert into public.foto_acta (acta_id, storage_path, lat, lng, precision_m, captura_at, calidad)
        values (registro.acta_id, ruta, (registro.datos->>'lat')::double precision,
                (registro.datos->>'lon')::double precision, (registro.datos->>'accuracy')::double precision,
                (registro.datos->>'capturedAt')::timestamptz, calidad);
    end if;
    return case when calidad = 'dudosa' then 'EN_REVISION' else 'EVIDENCIA_RECIBIDA' end;
end;
$function$;

-- El cliente anterior solo puede dar de alta una JRV libre.
create or replace function public.asignar_veedor_recinto(mesa uuid, veedor uuid, razon text)
returns void language sql security invoker set search_path = ''
as $$
    select public.cambiar_veedor_jrv(mesa, veedor, razon, null);
$$;

revoke execute on function public.cambiar_veedor_jrv(uuid, uuid, text, uuid) from public, anon;
grant execute on function public.cambiar_veedor_jrv(uuid, uuid, text, uuid) to authenticated;
revoke execute on function public.crear_veedor_asignacion(uuid, uuid, uuid, text)
  from public, anon, authenticated;
grant execute on function public.crear_veedor_asignacion(uuid, uuid, uuid, text) to service_role;
revoke execute on function public.crear_veedor_asignacion_confirmada(uuid, uuid, uuid, text, uuid)
  from public, anon, authenticated;
grant execute on function public.crear_veedor_asignacion_confirmada(uuid, uuid, uuid, text, uuid)
  to service_role;

create or replace function public.recinto_electoral_autorizado(recinto uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.profile p
    join public.recinto r on r.id = recinto
    where p.auth_uid = auth.uid() and p.activo and p.estado_cuenta = 'ACTIVE'
      and r.provincia = 'Pichincha' and r.canton = 'Rumiñahui'
      and (
        p.rol = 'provincial'
        or (p.rol = 'coordinador_recinto' and exists (
          select 1 from public.asignacion_coordinador_recinto c
          where c.coordinador_id = p.id and c.recinto_id = r.id
            and c.desde <= now() and c.hasta is null
        ))
        or (p.rol = 'veedor' and exists (
          select 1 from public.mesas_autorizadas() m where m.recinto_id = r.id
        ))
      )
  );
$$;
revoke execute on function public.recinto_electoral_autorizado(uuid) from public, anon;
grant execute on function public.recinto_electoral_autorizado(uuid) to authenticated;

alter table public.jrv enable row level security;
alter table public.recinto enable row level security;
alter table public.asignacion_veedor enable row level security;
alter table public.asignacion_coordinador_recinto enable row level security;

-- La app escribe exclusivamente a través de las RPC que conservan el historial.
revoke select, insert, update, delete, truncate on
  public.jrv, public.recinto, public.asignacion_veedor,
  public.asignacion_coordinador_recinto, public.acta, public.foto_acta
  from public, anon, authenticated;
grant select on public.jrv, public.recinto, public.asignacion_veedor,
  public.asignacion_coordinador_recinto, public.acta, public.foto_acta to authenticated;

drop policy if exists acta_veedor_select on public.acta;
drop policy if exists acta_veedor_insert on public.acta;
drop policy if exists acta_veedor_update on public.acta;
drop policy if exists acta_coordinador_select on public.acta;
drop policy if exists acta_coordinador_insert on public.acta;
drop policy if exists acta_coordinador_update on public.acta;
drop policy if exists acta_provincial_select on public.acta;
drop policy if exists acta_provincial_insert on public.acta;
drop policy if exists acta_provincial_update on public.acta;
drop policy if exists foto_acta_user_select on public.foto_acta;

create policy jrv_ambito_vigente on public.jrv for select to authenticated
using (id in (select m.jrv_id from public.mesas_autorizadas() m));
create policy recinto_ambito_vigente on public.recinto for select to authenticated
using (public.recinto_electoral_autorizado(id));
create policy acta_ambito_vigente on public.acta for select to authenticated
using (jrv_id in (select m.jrv_id from public.mesas_autorizadas() m));
create policy foto_acta_ambito_vigente on public.foto_acta for select to authenticated
using (exists (select 1 from public.acta a where a.id = foto_acta.acta_id));

create policy asignacion_veedor_ambito on public.asignacion_veedor for select to authenticated
using (
  jrv_id in (select m.jrv_id from public.mesas_autorizadas() m)
  and exists (
    select 1 from public.profile p
    where p.auth_uid = auth.uid() and p.activo and p.estado_cuenta = 'ACTIVE'
      and (p.rol in ('provincial', 'coordinador_recinto')
        or (p.rol = 'veedor' and p.id = veedor_id and hasta is null and desde <= now()))
  )
);

create policy asignacion_coordinador_ambito on public.asignacion_coordinador_recinto
for select to authenticated using (
  public.recinto_electoral_autorizado(recinto_id)
  and exists (
    select 1 from public.profile p
    where p.auth_uid = auth.uid() and p.activo and p.estado_cuenta = 'ACTIVE'
      and (p.rol = 'provincial' or (p.rol = 'coordinador_recinto' and p.id = coordinador_id))
  )
);

commit;
