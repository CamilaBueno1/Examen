begin;

alter table public.recinto
    add column if not exists latitud double precision check (latitud between -90 and 90),
    add column if not exists longitud double precision check (longitud between -180 and 180);

create or replace function public.mesas_autorizadas()
returns table (jrv_id uuid, numero integer, recinto_id uuid, recinto text,
               latitud double precision, longitud double precision)
language sql stable security definer
set search_path = ''
as $$
    select j.id, j.numero, r.id, r.nombre::text, r.latitud, r.longitud
    from public.profile p
    join public.recinto r on r.provincia = 'Pichincha' and r.canton = 'Rumiñahui'
    join public.jrv j on j.recinto_id = r.id
    where p.auth_uid = auth.uid()
      and p.activo
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
$$;

revoke all on function public.mesas_autorizadas() from public, anon;
grant execute on function public.mesas_autorizadas() to authenticated;

alter table public.foto_acta add column if not exists evidencia_respaldada boolean not null default false;

create or replace function public.avance_electoral()
returns table (recinto_id uuid, recinto text, jrv_total bigint, jrv_reportadas bigint,
               jrv_respaldadas bigint, alcaldia_recibidas bigint, prefectura_recibidas bigint)
language sql stable security definer
set search_path = ''
as $$
    with mesas as (
        select m.* from public.mesas_autorizadas() m
        where exists (
            select 1 from public.profile p where p.auth_uid = auth.uid()
              and p.activo and p.rol in ('provincial', 'coordinador_recinto')
        )
    ), vigentes as (
        select distinct on (a.jrv_id, a.dignidad) a.id, a.jrv_id, a.dignidad
        from public.acta a join mesas m on m.jrv_id = a.jrv_id
        order by a.jrv_id, a.dignidad, a.version desc, a.actualizado_en desc nulls last, a.id
    ), por_mesa as (
        select m.recinto_id, m.recinto, m.jrv_id,
          count(v.id) as recibidas,
          count(v.id) filter (where exists (
              select 1 from public.foto_acta f where f.acta_id = v.id and f.evidencia_respaldada
          )) as respaldadas,
          count(v.id) filter (where v.dignidad = 'alcaldia') as alcaldia,
          count(v.id) filter (where v.dignidad = 'prefectura') as prefectura
        from mesas m left join vigentes v on v.jrv_id = m.jrv_id
        group by m.recinto_id, m.recinto, m.jrv_id
    )
    select p.recinto_id, p.recinto, count(*),
      count(*) filter (where p.recibidas = 2), count(*) filter (where p.respaldadas = 2),
      count(*) filter (where p.alcaldia = 1), count(*) filter (where p.prefectura = 1)
    from por_mesa p group by p.recinto_id, p.recinto order by p.recinto, p.recinto_id;
$$;

revoke all on function public.avance_electoral() from public, anon;
grant execute on function public.avance_electoral() to authenticated;

commit;
