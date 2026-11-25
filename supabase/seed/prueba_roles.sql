-- Guía: Prepara datos de demostración para probar permisos de los tres roles.

-- SOLO PARA PRUEBAS en un proyecto desechable, después de catalog.sql.
-- Los correos y cédulas son ficticios; no usar cuentas ni datos personales reales.
-- Crear y confirmar previamente los tres usuarios en Authentication > Users.
begin;

do $$
declare
    correo_provincial constant text := 'provincial-prueba@example.test';
    correo_recinto constant text := 'recinto-prueba@example.test';
    correo_veedor constant text := 'veedor-prueba@example.test';
    cuenta record;
    usuario uuid;
    provincial uuid;
    coordinador uuid;
    veedor uuid;
    recinto_prueba uuid;
    mesa_prueba uuid;
begin
    for cuenta in select * from (values
        (correo_provincial, '1700000019', 'Provincial', 'provincial'),
        (correo_recinto, '1700000027', 'Recinto', 'coordinador_recinto'),
        (correo_veedor, '1700000035', 'Veedor', 'veedor')
    ) as t(correo, cedula, nombre, rol)
    loop
        select id into usuario from auth.users
        where lower(email) = lower(cuenta.correo) and email_confirmed_at is not null;
        if usuario is null then
            raise exception 'Falta crear y confirmar la cuenta %', cuenta.correo;
        end if;

        insert into public.profile (auth_uid, cedula, nombres, apellidos, email, rol, activo, estado_cuenta)
        values (usuario, cuenta.cedula, cuenta.nombre, 'Prueba', cuenta.correo, cuenta.rol, true, 'ACTIVE')
        on conflict (auth_uid) do update set estado_cuenta = 'ACTIVE'
        where public.profile.rol = excluded.rol and public.profile.activo;

        if not exists (select 1 from public.profile p
                       where p.auth_uid = usuario and p.rol = cuenta.rol and p.activo) then
            raise exception 'La cuenta % ya tiene un perfil incompatible', cuenta.correo;
        end if;
    end loop;

    select id into strict provincial from public.profile where lower(email) = lower(correo_provincial);
    select id into strict coordinador from public.profile where lower(email) = lower(correo_recinto);
    select id into strict veedor from public.profile where lower(email) = lower(correo_veedor);
    select id into strict recinto_prueba from public.recinto
      where provincia = 'Pichincha' and canton = 'Rumiñahui' and nombre = 'Recinto Central';
    select id into strict mesa_prueba from public.jrv
      where recinto_id = recinto_prueba and numero = 1;

    insert into public.asignacion_coordinador_recinto (recinto_id, coordinador_id, desde, asignado_por)
    values (recinto_prueba, coordinador, now(), provincial)
    on conflict (recinto_id) where hasta is null do nothing;

    insert into public.asignacion_veedor (jrv_id, veedor_id, desde, asignado_por)
    values (mesa_prueba, veedor, now(), coordinador)
    on conflict (jrv_id) where hasta is null do nothing;

    if not exists (select 1 from public.asignacion_coordinador_recinto
                   where recinto_id = recinto_prueba and coordinador_id = coordinador and hasta is null)
        or not exists (select 1 from public.asignacion_veedor
                       where jrv_id = mesa_prueba and veedor_id = veedor and hasta is null) then
        raise exception 'El recinto o la JRV ya tienen una asignación vigente incompatible';
    end if;
end;
$$;

commit;
