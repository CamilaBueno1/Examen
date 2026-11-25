-- Ejecutar en el esquema Examen después de aplicar la migración.
-- Los datos de prueba son aislados y se descartan al final.
begin;
do $pruebas$
declare
  recinto_a uuid := gen_random_uuid();
  recinto_b uuid := gen_random_uuid();
  jrv_1 uuid := gen_random_uuid();
  jrv_2 uuid := gen_random_uuid();
  jrv_3 uuid := gen_random_uuid();
  jrv_ajena uuid := gen_random_uuid();
  cuenta_coordinador uuid := gen_random_uuid();
  cuenta_a uuid := gen_random_uuid();
  cuenta_b uuid := gen_random_uuid();
  cuenta_provincial uuid := gen_random_uuid();
  coordinador uuid := gen_random_uuid();
  veedor_a uuid := gen_random_uuid();
  veedor_b uuid := gen_random_uuid();
  provincial uuid := gen_random_uuid();
  cuenta_pendiente uuid := gen_random_uuid();
  veedor_pendiente uuid := gen_random_uuid();
  acta_anterior uuid := gen_random_uuid();
  operacion_anterior uuid := gen_random_uuid();
  ruta_foto text;
  foto_anterior uuid;
  anterior uuid;
  votos_anteriores jsonb;
  version_anterior integer;
begin
  insert into auth.users (id, email)
  select id, id::text || '@asignaciones.example.invalid'
  from unnest(array[cuenta_coordinador, cuenta_a, cuenta_b, cuenta_provincial, cuenta_pendiente]) id;

  insert into public.profile (id, auth_uid, cedula, nombres, apellidos, email, rol, activo, estado_cuenta)
  select v.id, v.cuenta, left(translate(v.id::text, 'abcdef-', '1234560'), 10),
    'Prueba', 'Asignaciones', v.cuenta::text || '@asignaciones.example.invalid',
    v.rol, v.activo, case when v.activo then 'ACTIVE' else 'PENDING' end
  from (values (coordinador, cuenta_coordinador, 'coordinador_recinto', true),
    (veedor_a, cuenta_a, 'veedor', true), (veedor_b, cuenta_b, 'veedor', true),
    (provincial, cuenta_provincial, 'provincial', true),
    (veedor_pendiente, cuenta_pendiente, 'veedor', false)) v (id, cuenta, rol, activo);

  insert into public.recinto (id, provincia, canton, nombre, parroquia, latitud, longitud)
  values (recinto_a, 'Pichincha', 'Rumiñahui', 'Prueba A ' || recinto_a, 'Prueba', 0, 0),
         (recinto_b, 'Pichincha', 'Rumiñahui', 'Prueba B ' || recinto_b, 'Prueba', 0, 0);
  insert into public.jrv (id, recinto_id, numero)
  values (jrv_1, recinto_a, 1), (jrv_2, recinto_a, 2),
         (jrv_3, recinto_a, 3), (jrv_ajena, recinto_b, 1);
  insert into public.asignacion_coordinador_recinto (recinto_id, coordinador_id, desde, asignado_por)
  values (recinto_a, coordinador, now() - interval '2 days', provincial);
  begin
    insert into public.asignacion_coordinador_recinto (recinto_id, coordinador_id, desde, asignado_por)
    values (recinto_a, coordinador, now() - interval '1 day', provincial);
    raise exception 'Se permitió otro coordinador vigente';
  exception when unique_violation then null;
  end;

  -- Vincula los veedores al equipo antes de usar la operación de asignación.
  insert into public.asignacion_veedor (jrv_id, veedor_id, desde, hasta, asignado_por)
  values (jrv_2, veedor_a, now() - interval '2 days', now() - interval '1 day', coordinador),
         (jrv_3, veedor_b, now() - interval '2 days', null, coordinador);

  perform set_config('request.jwt.claim.sub', cuenta_coordinador::text, true);
  set local role authenticated;
  perform public.cambiar_veedor_jrv(jrv_1, veedor_a, 'Primera asignación', null);
  select id into strict anterior from public.asignacion_veedor
    where jrv_id = jrv_1 and hasta is null and veedor_id = veedor_a;
  begin
    perform public.cambiar_veedor_jrv(jrv_1, veedor_b, 'Intento simultáneo', null);
    raise exception 'Se permitió asignar a una JRV ocupada';
  exception when raise_exception then
    if sqlerrm <> 'JRV_OCUPADA' then raise; end if;
  end;
  perform public.cambiar_veedor_jrv(jrv_2, veedor_a, 'Segunda JRV', null);
  if (select count(*) from public.asignacion_veedor where veedor_id = veedor_a and hasta is null) <> 2 then
    raise exception 'El veedor A no conservó las dos JRV';
  end if;
  reset role;

  begin
    insert into public.asignacion_veedor (jrv_id, veedor_id, desde, asignado_por)
    values (jrv_1, veedor_b, now(), coordinador);
    raise exception 'El índice permitió dos veedores vigentes';
  exception when unique_violation then null;
  end;
  begin
    perform public.crear_veedor_asignacion(veedor_pendiente, jrv_1, coordinador, 'Alta de prueba');
    raise exception 'El alta sustituyó al responsable vigente sin confirmación';
  exception when raise_exception then
    if sqlerrm <> 'JRV_OCUPADA' then raise; end if;
  end;

  insert into public.acta (id, jrv_id, dignidad, votos, blancos, nulos, sufragantes, creado_por)
  values (acta_anterior, jrv_1, 'alcaldia', '{"total":0}', 0, 0, 0, veedor_a)
  returning votos, version into votos_anteriores, version_anterior;
  begin
    insert into public.acta (jrv_id, dignidad, votos, blancos, nulos, sufragantes, creado_por)
    values (jrv_1, 'alcaldia', '{"total":0}', 0, 0, 0, veedor_a);
    raise exception 'El índice permitió duplicar un acta de la misma JRV y dignidad';
  exception when unique_violation then
    null;
  end;
  insert into public.acta (jrv_id, dignidad, votos, blancos, nulos, sufragantes, creado_por)
  values (jrv_1, 'prefectura', '{"total":0}', 0, 0, 0, veedor_a);
  ruta_foto := cuenta_a::text || '/' || acta_anterior::text || '.jpg';
  insert into electoral_privado.operaciones_acta (operacion, autor, acta_id, datos)
  values (operacion_anterior, cuenta_a, acta_anterior, '{}');
  insert into public.foto_acta (acta_id, storage_path, calidad)
  values (acta_anterior, ruta_foto, 'buena')
  returning id into foto_anterior;
  set local role authenticated;
  if not exists (select 1 from public.actas_vigentes_autorizadas() a
                 where a.id = acta_anterior and a.evidencia = 'EVIDENCIA_RECIBIDA') then
    raise exception 'Una foto sin validar debe figurar como recibida';
  end if;
  perform public.validar_evidencia_recinto(foto_anterior);
  if not exists (select 1 from public.actas_vigentes_autorizadas() a
                 where a.id = acta_anterior and a.evidencia = 'EVIDENCIA_RESPALDADA') then
    raise exception 'La foto validada debe figurar como respaldada';
  end if;
  perform set_config('request.jwt.claim.sub', cuenta_a::text, true);
  begin
    perform public.validar_evidencia_recinto(foto_anterior);
    raise exception 'El veedor pudo validar una foto de su mesa';
  exception when raise_exception then
    if sqlerrm <> 'PERMISO_REVOCADO' then raise; end if;
  end;
  perform set_config('request.jwt.claim.sub', cuenta_coordinador::text, true);
  perform public.cambiar_veedor_jrv(jrv_1, veedor_b, 'Reemplazo en JRV 1', anterior);
  if (select count(*) from public.asignacion_veedor where jrv_id = jrv_1 and hasta is null) <> 1
      or not exists (select 1 from public.asignacion_veedor where jrv_id = jrv_1 and veedor_id = veedor_b and hasta is null)
      or not exists (select 1 from public.asignacion_veedor where jrv_id = jrv_2 and veedor_id = veedor_a and hasta is null)
      or not exists (select 1 from public.asignacion_veedor where id = anterior and hasta is not null) then
    raise exception 'El reemplazo alteró otra JRV o perdió historial';
  end if;
  begin
    perform public.cambiar_veedor_jrv(jrv_1, veedor_a, 'Selección desactualizada', anterior);
    raise exception 'Se aceptó un reemplazo sobre una asignación desactualizada';
  exception when raise_exception then
    if sqlerrm <> 'ASIGNACION_CAMBIO' then raise; end if;
  end;
  begin
    perform public.cambiar_veedor_jrv(jrv_ajena, veedor_a, 'JRV de otro recinto', null);
    raise exception 'El coordinador modificó otro recinto';
  exception when raise_exception then
    if sqlerrm <> 'PERMISO_REVOCADO' then raise; end if;
  end;
  reset role;

  -- now() es fijo en esta transacción de prueba. Vuelve visibles las nuevas filas
  -- sintéticas para las comprobaciones que en la app ocurren tras el commit.
  update public.asignacion_veedor set desde = now() - interval '1 second'
    where jrv_id in (jrv_1, jrv_2) and hasta is null;

  perform set_config('request.jwt.claim.sub', cuenta_a::text, true);
  set local role authenticated;
  if exists (select 1 from public.jrv where id = jrv_1)
      or exists (select 1 from public.acta where id = acta_anterior)
      or exists (select 1 from public.actas_vigentes_autorizadas() a where a.id = acta_anterior)
      or exists (select 1 from public.foto_acta where acta_id = acta_anterior)
      or public.puede_leer_evidencia(ruta_foto)
      or public.puede_subir_evidencia(ruta_foto)
      or not exists (select 1 from public.jrv where id = jrv_2) then
    raise exception 'Visibilidad incorrecta tras revocar a A';
  end if;
  begin
    perform public.corregir_acta(acta_anterior, version_anterior, 'Corrección revocada', '{}');
    raise exception 'El veedor reemplazado corrigió el acta';
  exception when raise_exception then
    if sqlerrm <> 'PERMISO_REVOCADO' then raise; end if;
  end;
  begin
    perform public.registrar_evidencia(operacion_anterior);
    raise exception 'El veedor reemplazado registró evidencia';
  exception when raise_exception then
    if sqlerrm <> 'PERMISO_REVOCADO' then raise; end if;
  end;
  begin
    perform public.recibir_acta(gen_random_uuid(), jsonb_build_object('jrvId', jrv_1, 'dignidad', 'alcaldia'));
    raise exception 'La operación offline revocada fue aceptada';
  exception when raise_exception then
    if sqlerrm <> 'PERMISO_REVOCADO' then raise; end if;
  end;
  reset role;

  perform set_config('request.jwt.claim.sub', cuenta_b::text, true);
  set local role authenticated;
  if exists (select 1 from public.jrv where id in (jrv_2, jrv_ajena))
      or not exists (select 1 from public.acta where id = acta_anterior)
      or not public.puede_leer_evidencia(ruta_foto) then
    raise exception 'Visibilidad incorrecta de B';
  end if;
  begin
    update public.acta set version = version + 1 where id = acta_anterior;
    raise exception 'Se aceptó una edición directa que omite el historial';
  exception when insufficient_privilege then null;
  end;
  reset role;

  perform set_config('request.jwt.claim.sub', cuenta_provincial::text, true);
  set local role authenticated;
  if not exists (select 1 from public.acta where id = acta_anterior) then
    raise exception 'El provincial no pudo consultar su jurisdicción';
  end if;
  begin
    perform public.corregir_acta(acta_anterior, version_anterior, 'Corrección provincial', '{}');
    raise exception 'Se permitió editar al provincial';
  exception when raise_exception then
    if sqlerrm <> 'PERMISO_REVOCADO' then raise; end if;
  end;
  reset role;

  if not exists (select 1 from public.acta a where a.id = acta_anterior
      and a.creado_por = veedor_a and a.version = version_anterior and a.votos = votos_anteriores) then
    raise exception 'Se alteró el acta o su autoría';
  end if;

  select id into strict anterior from public.asignacion_veedor
    where jrv_id = jrv_3 and hasta is null;
  perform public.crear_veedor_asignacion_confirmada(
    veedor_pendiente, jrv_3, coordinador, 'Reemplazo durante el alta', anterior);
  if not exists (select 1 from public.asignacion_veedor
      where jrv_id = jrv_3 and veedor_id = veedor_pendiente and hasta is null)
    or not exists (select 1 from public.asignacion_veedor where id = anterior and hasta is not null) then
    raise exception 'El alta confirmada no conservó el historial';
  end if;
  perform set_config('request.jwt.claim.sub', cuenta_pendiente::text, true);
  set local role authenticated;
  if exists (select 1 from public.jrv where id = jrv_3) then
    raise exception 'El titular pendiente pudo acceder';
  end if;
  reset role;
end;
$pruebas$;
select '10 escenarios de asignación, acceso y revocación comprobados' as resultado;
rollback;
