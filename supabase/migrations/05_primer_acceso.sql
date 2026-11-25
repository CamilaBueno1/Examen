-- Guía: Añade estados de cuenta y las operaciones de activación inicial.

begin;

create schema if not exists electoral_privado;
revoke all on schema electoral_privado from public, anon, authenticated;

create table if not exists electoral_privado.primer_acceso (
    auth_uid uuid primary key references auth.users(id) on delete cascade,
    session_id uuid not null,
    huella_clave bytea not null,
    vence_en timestamptz not null
);

create or replace function public.preparar_primer_acceso()
returns void language plpgsql security definer set search_path = ''
as $$
declare
    sesion uuid := (auth.jwt()->>'session_id')::uuid;
begin
    if auth.uid() is null or sesion is null or not exists (
        select 1 from jsonb_array_elements(coalesce(auth.jwt()->'amr', '[]'::jsonb)) as m
        where m.value->>'method' = 'otp'
          and (m.value->>'timestamp')::bigint >= extract(epoch from now() - interval '10 minutes')
    ) then
        raise exception 'Verifica un código de correo reciente antes del primer acceso';
    end if;

    insert into electoral_privado.primer_acceso (auth_uid, session_id, huella_clave, vence_en)
    select u.id, sesion, sha256(convert_to(u.encrypted_password, 'UTF8')), now() + interval '10 minutes'
    from auth.users u join public.profile p on p.auth_uid = u.id
    where u.id = auth.uid() and u.email_confirmed_at is not null and not p.activo
      and u.encrypted_password is not null
    on conflict (auth_uid) do update
      set session_id = excluded.session_id, huella_clave = excluded.huella_clave,
          vence_en = excluded.vence_en;
    if not found then
        raise exception 'No se encontró un primer acceso pendiente para esta cuenta';
    end if;
end;
$$;

create or replace function public.activar_perfil_primer_acceso()
returns void language plpgsql security definer set search_path = ''
as $$
begin
    delete from electoral_privado.primer_acceso s using auth.users u
    where s.auth_uid = auth.uid() and u.id = s.auth_uid
      and s.session_id = (auth.jwt()->>'session_id')::uuid
      and s.vence_en > now()
      and s.huella_clave <> sha256(convert_to(u.encrypted_password, 'UTF8'));
    if not found then
        raise exception 'Falta acreditar el código de correo y el cambio de contraseña';
    end if;

    update public.profile p set activo = true, updated_at = now() where p.auth_uid = auth.uid() and not p.activo;
    if not found then
        raise exception 'No existe un perfil pendiente para activar';
    end if;
end;
$$;

revoke all on function public.preparar_primer_acceso() from public, anon;
revoke all on function public.activar_perfil_primer_acceso() from public, anon;
grant execute on function public.preparar_primer_acceso() to authenticated;
grant execute on function public.activar_perfil_primer_acceso() to authenticated;

commit;
