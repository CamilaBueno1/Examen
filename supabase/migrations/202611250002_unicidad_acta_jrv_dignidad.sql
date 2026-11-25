begin;

-- El índice rechaza duplicados preexistentes sin modificar el historial.
create unique index if not exists uq_acta_jrv_dignidad
    on public.acta (jrv_id, dignidad);

drop index if exists public.idx_acta_jrv_dignidad;

commit;
