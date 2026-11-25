-- Guía: Confirma automáticamente una foto de calidad buena después de verificar su respaldo privado.
begin;

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
    respaldada boolean;
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
        insert into public.foto_acta (acta_id, storage_path, lat, lng, precision_m, captura_at, calidad, evidencia_respaldada)
        values (registro.acta_id, ruta, (registro.datos->>'lat')::double precision,
                (registro.datos->>'lon')::double precision, (registro.datos->>'accuracy')::double precision,
                (registro.datos->>'capturedAt')::timestamptz, calidad, coalesce(calidad = 'buena', false));
    end if;
    select f.evidencia_respaldada into respaldada
      from public.foto_acta f where f.acta_id = registro.acta_id and f.storage_path = ruta;
    return case when respaldada then 'EVIDENCIA_RESPALDADA'
                when calidad = 'dudosa' then 'EN_REVISION'
                else 'EVIDENCIA_RECIBIDA' end;
end;
$function$;

-- Completa el respaldo de fotografías buenas que ya existen en el bucket.
update public.foto_acta f
set evidencia_respaldada = true
where f.calidad = 'buena' and not f.evidencia_respaldada
  and exists (
    select 1 from storage.objects o where o.bucket_id = 'actas-privadas' and o.name = f.storage_path
  );

commit;
