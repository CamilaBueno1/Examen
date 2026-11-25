-- Guía: Reserva las operaciones administrativas de alta al rol de servicio.

begin;

grant select, insert, delete on table public.profile to service_role;
grant select on table public.recinto, public.jrv, public.asignacion_coordinador_recinto to service_role;

commit;
