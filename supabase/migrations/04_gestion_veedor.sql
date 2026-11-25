begin;

create or replace function public.historial_veedor_recinto()
returns table (id uuid, jrv_id uuid, veedor_id uuid, veedor text,
               activo boolean, desde timestamptz, hasta timestamptz, motivo text)
language sql stable security definer set search_path = ''
as $$
    select a.id, a.jrv_id, a.veedor_id, concat_ws(' ', v.nombres, v.apellidos),
      v.activo, a.desde, a.hasta, a.motivo::text
    from public.asignacion_veedor a
    join public.mesas_autorizadas() m on m.jrv_id = a.jrv_id
    join public.profile v on v.id = a.veedor_id
    where exists (
      select 1 from public.profile p
      where p.auth_uid = auth.uid() and p.activo and p.rol = 'coordinador_recinto'
    )
    order by a.desde desc, a.id;
$$;

create or replace function public.asignar_veedor_recinto(mesa uuid, veedor uuid, razon text)
returns void language plpgsql security definer set search_path = ''
as $$
declare
    actor uuid;
    recinto_actual uuid;
    veedor_anterior uuid;
    instante timestamptz;
begin
    select p.id into actor from public.profile p
    where p.auth_uid = auth.uid() and p.activo and p.rol = 'coordinador_recinto';
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
        raise exception 'La JRV no corresponde a tu asignación vigente';
    end if;

    if not exists (
        select 1 from public.profile p
        where p.id = veedor and p.activo and p.rol = 'veedor'
          and exists (
            select 1 from public.asignacion_veedor a join public.jrv j on j.id = a.jrv_id
            where a.veedor_id = p.id and j.recinto_id = recinto_actual
          )
    ) then
        raise exception 'El veedor no pertenece al equipo de tu recinto';
    end if;

    select a.veedor_id into veedor_anterior from public.asignacion_veedor a
      where a.jrv_id = mesa and a.hasta is null;
    if veedor_anterior = veedor then return; end if;

    instante := clock_timestamp();
    update public.asignacion_veedor a set hasta = instante
      where a.jrv_id = mesa and a.hasta is null;
    insert into public.asignacion_veedor (jrv_id, veedor_id, desde, motivo, asignado_por)
      values (mesa, veedor, instante, trim(razon), actor);
end;
$$;

revoke all on function public.historial_veedor_recinto() from public, anon;
revoke all on function public.asignar_veedor_recinto(uuid, uuid, text) from public, anon;
grant execute on function public.historial_veedor_recinto() to authenticated;
grant execute on function public.asignar_veedor_recinto(uuid, uuid, text) to authenticated;

commit;
