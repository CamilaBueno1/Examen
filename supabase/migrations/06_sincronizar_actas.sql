-- Guía: Define recepción idempotente, respaldo privado de fotos, resultados y notificaciones.

begin;

create table if not exists electoral_privado.operaciones_acta (
    operacion uuid primary key,
    autor uuid not null references auth.users(id),
    acta_id uuid not null references public.acta(id),
    datos jsonb not null
);

create or replace function public.recibir_acta(operacion uuid, datos jsonb)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare
    actor uuid;
    anterior electoral_privado.operaciones_acta%rowtype;
    mesa uuid := (datos->>'jrvId')::uuid;
    cargo public.dignidad_type := (datos->>'dignidad')::public.dignidad_type;
    blancos int := (datos->>'votosBlancos')::int;
    nulos int := (datos->>'votosNulos')::int;
    total int := (datos->>'totalSufragantes')::int;
    conteo jsonb;
    numero_conteos bigint;
    numero_organizaciones bigint;
    suma bigint;
    todos_validos boolean;
    resultado uuid;
begin
    select p.id into actor from public.profile p
      where p.auth_uid = auth.uid() and p.activo and p.rol = 'veedor';
    if actor is null or mesa is null or cargo is null or operacion is null then
        raise exception 'PERMISO_REVOCADO';
    end if;

    -- Mismo orden de bloqueo que el reemplazo de un veedor.
    perform 1 from public.jrv j where j.id = mesa for update;
    if not exists (select 1 from public.mesas_autorizadas() m where m.jrv_id = mesa) then
        raise exception 'PERMISO_REVOCADO';
    end if;

    select o.* into anterior from electoral_privado.operaciones_acta o where o.operacion = recibir_acta.operacion;
    if found then
        if anterior.autor <> auth.uid() or anterior.datos <> datos then
            raise exception 'OPERACION_INCOMPATIBLE';
        end if;
        return anterior.acta_id;
    end if;

    if (datos->>'lat')::double precision not between -90 and 90
        or (datos->>'lon')::double precision not between -180 and 180
        or not (datos ?& array['lat','lon','accuracy','capturedAt','calidadFoto'])
        or datos->>'lat' is null or datos->>'lon' is null or datos->>'accuracy' is null
        or (datos->>'accuracy')::double precision < 0
        or datos->>'capturedAt' is null or datos->>'calidadFoto' is null
        or datos->>'calidadFoto' not in ('buena','dudosa') then
        raise exception 'EVIDENCIA_INVALIDA';
    end if;

    select count(*), count(distinct organizacion.id), sum(v.votos),
           bool_and(v.votos is not null and v.votos >= 0),
           jsonb_object_agg(v."organizacionId"::text, v.votos)
    into numero_conteos, numero_organizaciones, suma, todos_validos, conteo
    from jsonb_to_recordset(datos->'votos') as v("organizacionId" uuid, votos int)
    join public.organizacion organizacion on organizacion.id = v."organizacionId";
    if jsonb_array_length(datos->'votos') is distinct from 5
        or numero_conteos <> 5 or numero_organizaciones <> 5 or todos_validos is distinct from true
        or blancos is null or nulos is null or total is null or least(blancos,nulos,total) < 0
        or suma + blancos + nulos <> total then
        raise exception 'VOTOS_INVALIDOS';
    end if;
    if exists (select 1 from public.acta a where a.jrv_id = mesa and a.dignidad = cargo) then
        raise exception 'CONFLICTO_VERSION';
    end if;

    insert into public.acta (jrv_id, dignidad, votos, blancos, nulos, sufragantes, creado_por)
    values (mesa, cargo, conteo || jsonb_build_object('total', suma), blancos, nulos, total, actor)
    returning id into resultado;
    insert into electoral_privado.operaciones_acta values (operacion, auth.uid(), resultado, datos);
    return resultado;
end;
$$;

insert into storage.buckets (id, name, public)
values ('actas-privadas', 'actas-privadas', false)
on conflict (id) do nothing;

do $$ begin
    if exists (select 1 from storage.buckets where id = 'actas-privadas' and public) then
        raise exception 'El bucket actas-privadas debe tener acceso privado';
    end if;
end $$;

create or replace function public.puede_subir_evidencia(ruta text)
returns boolean language sql stable security definer set search_path = ''
as $$
    select exists (
        select 1 from electoral_privado.operaciones_acta o
        join public.acta a on a.id = o.acta_id
        join public.mesas_autorizadas() m on m.jrv_id = a.jrv_id
        where o.autor = auth.uid() and ruta = o.autor::text || '/' || o.acta_id::text || '.jpg'
    );
$$;

drop policy if exists actas_privadas_veedor_insert on storage.objects;
create policy actas_privadas_veedor_insert on storage.objects for insert to authenticated
with check (bucket_id = 'actas-privadas' and public.puede_subir_evidencia(name));

create or replace function public.registrar_evidencia(operacion uuid)
returns text language plpgsql security definer set search_path = ''
as $$
declare
    registro electoral_privado.operaciones_acta%rowtype;
    ruta text;
    calidad text;
begin
    select o.* into registro from electoral_privado.operaciones_acta o
      where o.operacion = registrar_evidencia.operacion and o.autor = auth.uid() for update;
    if not found then raise exception 'PERMISO_REVOCADO'; end if;
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
$$;

revoke all on function public.recibir_acta(uuid, jsonb), public.puede_subir_evidencia(text), public.registrar_evidencia(uuid) from public, anon;
grant execute on function public.recibir_acta(uuid, jsonb), public.puede_subir_evidencia(text), public.registrar_evidencia(uuid) to authenticated;

create or replace function public.resultados_preliminares()
returns table (recinto_id uuid, recinto text, dignidad text, candidato_id uuid,
               candidato text, organizacion text, votos bigint)
language sql stable security definer set search_path = ''
as $$
    with mesas as (
        select m.* from public.mesas_autorizadas() m
        where exists (select 1 from public.profile p
                      where p.auth_uid = auth.uid() and p.activo and p.rol = 'provincial')
    ), vigentes as (
        select distinct on (a.jrv_id, a.dignidad) m.recinto_id, m.recinto, a.dignidad, a.votos
        from public.acta a join mesas m on m.jrv_id = a.jrv_id
        order by a.jrv_id, a.dignidad, a.version desc, a.actualizado_en desc nulls last, a.id
    )
    select v.recinto_id, v.recinto, v.dignidad::text, c.id, c.nombre::text, o.nombre::text,
           sum((v.votos->>o.id::text)::int)
    from vigentes v
    join public.candidato c on c.dignidad = v.dignidad::text
    join public.organizacion o on o.id = c.organizacion_id
    where v.votos->>o.id::text ~ '^[0-9]{1,9}$'
    group by v.recinto_id, v.recinto, v.dignidad, c.id, c.nombre, o.nombre
    order by v.recinto, v.dignidad, sum((v.votos->>o.id::text)::int) desc, c.nombre;
$$;

revoke all on function public.resultados_preliminares() from public, anon;
grant execute on function public.resultados_preliminares() to authenticated;

create table if not exists public.cambio_electoral (
    jrv_id uuid primary key references public.jrv(id) on delete cascade,
    actualizado_en timestamptz not null
);
alter table public.cambio_electoral enable row level security;
revoke all on public.cambio_electoral from anon, authenticated;
grant select on public.cambio_electoral to authenticated;
drop policy if exists cambios_electorales_autorizados on public.cambio_electoral;
create policy cambios_electorales_autorizados on public.cambio_electoral for select to authenticated
using (
    exists (select 1 from public.profile p
            where p.auth_uid = auth.uid() and p.activo and p.rol in ('provincial','coordinador_recinto'))
    and exists (select 1 from public.mesas_autorizadas() m where m.jrv_id = cambio_electoral.jrv_id)
);

create or replace function electoral_privado.notificar_avance()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
    mesa uuid;
begin
    if tg_table_name = 'acta' then
        mesa := new.jrv_id;
    else
        select a.jrv_id into mesa from public.acta a where a.id = new.acta_id;
    end if;
    if mesa is not null then
        insert into public.cambio_electoral (jrv_id, actualizado_en) values (mesa, clock_timestamp())
        on conflict (jrv_id) do update set actualizado_en = excluded.actualizado_en;
    end if;
    return new;
end;
$$;

drop trigger if exists notificar_resultado on public.acta;
create trigger notificar_resultado after insert or update on public.acta
for each row execute function electoral_privado.notificar_avance();
drop trigger if exists notificar_evidencia on public.foto_acta;
create trigger notificar_evidencia after insert or update on public.foto_acta
for each row execute function electoral_privado.notificar_avance();

do $$ begin
    if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
        and not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime'
                        and schemaname = 'public' and tablename = 'cambio_electoral') then
        alter publication supabase_realtime add table public.cambio_electoral;
    end if;
end $$;

commit;
