-- Guía: Define consulta autorizada, validación fotográfica, corrección e historial de versiones.

begin;

-- Las escrituras pasan por RPC para conservar ámbito, versión e historial.
revoke insert, update, delete on public.acta, public.foto_acta,
    public.asignacion_veedor, public.asignacion_coordinador_recinto from public, anon, authenticated;
revoke select on public.asignacion_veedor, public.asignacion_coordinador_recinto from public, anon, authenticated;
alter table public.acta enable row level security;
alter table public.foto_acta enable row level security;

create table if not exists electoral_privado.historial_acta (
    id uuid primary key default gen_random_uuid(),
    acta_id uuid not null references public.acta(id),
    version_previa int not null,
    autor_id uuid not null references public.profile(id),
    motivo text not null check (char_length(motivo) between 1 and 250),
    anteriores jsonb not null,
    fecha timestamptz not null default now(),
    unique (acta_id, version_previa)
);

create or replace function public.actas_vigentes_autorizadas()
returns table (id uuid, jrv_id uuid, numero int, recinto text, dignidad text, version int,
    blancos int, nulos int, sufragantes int, conteos jsonb, evidencia text,
    foto_id uuid, storage_path text, lat double precision, lon double precision,
    precision_m double precision, captura_at timestamptz, recinto_lat double precision, recinto_lon double precision)
language sql stable security definer set search_path = ''
as $$
    select distinct on (a.jrv_id, a.dignidad) a.id, a.jrv_id, m.numero, m.recinto, a.dignidad::text,
      a.version, a.blancos, a.nulos, a.sufragantes,
      (select jsonb_agg(jsonb_build_object('id', o.id, 'nombre', o.nombre, 'votos', a.votos->o.id::text)
                       order by o.nombre) from public.organizacion o),
      case when f.id is null then 'EVIDENCIA_PENDIENTE'
           when f.evidencia_respaldada then 'EVIDENCIA_RESPALDADA'
           when f.calidad = 'dudosa' then 'EN_REVISION'
           else 'EVIDENCIA_RECIBIDA' end,
      f.id, f.storage_path::text, f.lat, f.lng, f.precision_m, f.captura_at, m.latitud, m.longitud
    from public.acta a join public.mesas_autorizadas() m on m.jrv_id = a.jrv_id
    left join lateral (
      select photo.* from public.foto_acta photo where photo.acta_id = a.id
      order by photo.evidencia_respaldada desc, photo.created_at desc nulls last, photo.id limit 1
    ) f on true
    order by a.jrv_id, a.dignidad, a.version desc, a.actualizado_en desc nulls last, a.id;
$$;

create or replace function public.puede_leer_evidencia(ruta text)
returns boolean language sql stable security definer set search_path = ''
as $$
    select exists (
        select 1 from public.foto_acta f join public.acta a on a.id = f.acta_id
        join public.mesas_autorizadas() m on m.jrv_id = a.jrv_id where f.storage_path = ruta
    );
$$;
drop policy if exists actas_privadas_lectura on storage.objects;
create policy actas_privadas_lectura on storage.objects for select to authenticated
using (bucket_id = 'actas-privadas' and public.puede_leer_evidencia(name));

create or replace function public.validar_evidencia_recinto(foto uuid)
returns void language plpgsql security definer set search_path = ''
as $$
begin
    update public.foto_acta f set evidencia_respaldada = true
    from public.acta a join public.mesas_autorizadas() m on m.jrv_id = a.jrv_id
    where f.id = foto and f.acta_id = a.id and exists (
      select 1 from public.profile p where p.auth_uid = auth.uid() and p.activo and p.rol = 'coordinador_recinto'
    );
    if not found then raise exception 'PERMISO_REVOCADO'; end if;
end;
$$;

create or replace function public.historial_acta_autorizada(acta uuid)
returns table (version int, autor text, motivo text, fecha timestamptz, anteriores jsonb)
language sql stable security definer set search_path = ''
as $$
    select h.version_previa, concat_ws(' ', p.nombres, p.apellidos), h.motivo, h.fecha, h.anteriores
    from electoral_privado.historial_acta h
    join public.acta a on a.id = h.acta_id
    join public.mesas_autorizadas() m on m.jrv_id = a.jrv_id
    join public.profile p on p.id = h.autor_id
    where a.id = acta order by h.version_previa desc;
$$;

create or replace function public.corregir_acta(acta uuid, expected_version int, razon text, datos jsonb)
returns int language plpgsql security definer set search_path = ''
as $$
declare
    anterior public.acta%rowtype;
    mesa uuid;
    actor uuid;
    blancos_nuevo int := (datos->>'blancos')::int;
    nulos_nuevo int := (datos->>'nulos')::int;
    total_nuevo int := (datos->>'sufragantes')::int;
    conteo jsonb;
    numero bigint;
    distintos bigint;
    suma bigint;
    validos boolean;
begin
    select p.id into actor from public.profile p where p.auth_uid = auth.uid() and p.activo
      and p.rol in ('veedor','coordinador_recinto');
    select a.jrv_id into mesa from public.acta a where a.id = acta;
    if actor is null or mesa is null then raise exception 'PERMISO_REVOCADO'; end if;
    perform 1 from public.jrv j where j.id = mesa for update;
    if not exists (select 1 from public.mesas_autorizadas() m where m.jrv_id = mesa) then
      raise exception 'PERMISO_REVOCADO';
    end if;
    select a.* into anterior from public.acta a where a.id = acta for update;
    if not found or anterior.version is distinct from expected_version or exists (
      select 1 from public.acta a where a.jrv_id = anterior.jrv_id and a.dignidad = anterior.dignidad
        and a.id <> anterior.id and a.version >= anterior.version
    ) then raise exception 'CONFLICTO_VERSION'; end if;
    if razon is null or char_length(trim(razon)) not between 1 and 250 then
      raise exception 'MOTIVO_INVALIDO';
    end if;

    select count(*), count(distinct o.id), sum(v.votos), bool_and(v.votos is not null and v.votos >= 0),
           jsonb_object_agg(v.id::text, v.votos)
    into numero, distintos, suma, validos, conteo
    from jsonb_to_recordset(datos->'votos') as v(id uuid, votos int)
    join public.organizacion o on o.id = v.id;
    if jsonb_array_length(datos->'votos') is distinct from 5
        or numero <> 5 or distintos <> 5 or validos is distinct from true
        or blancos_nuevo is null or nulos_nuevo is null or total_nuevo is null
        or least(blancos_nuevo,nulos_nuevo,total_nuevo) < 0
        or suma + blancos_nuevo + nulos_nuevo <> total_nuevo then
        raise exception 'VOTOS_INVALIDOS';
    end if;

    insert into electoral_privado.historial_acta (acta_id, version_previa, autor_id, motivo, anteriores)
    values (acta, anterior.version, actor, trim(razon),
      jsonb_build_object('votos', anterior.votos, 'blancos', anterior.blancos,
                         'nulos', anterior.nulos, 'sufragantes', anterior.sufragantes));
    update public.acta a set votos = conteo || jsonb_build_object('total', suma),
      blancos = blancos_nuevo, nulos = nulos_nuevo, sufragantes = total_nuevo,
      version = anterior.version + 1, actualizado_en = now() where a.id = acta;
    return anterior.version + 1;
end;
$$;

revoke all on function public.actas_vigentes_autorizadas(), public.puede_leer_evidencia(text),
    public.validar_evidencia_recinto(uuid), public.historial_acta_autorizada(uuid),
    public.corregir_acta(uuid, int, text, jsonb) from public, anon;
grant execute on function public.actas_vigentes_autorizadas(), public.puede_leer_evidencia(text),
    public.validar_evidencia_recinto(uuid), public.historial_acta_autorizada(uuid),
    public.corregir_acta(uuid, int, text, jsonb) to authenticated;

commit;
