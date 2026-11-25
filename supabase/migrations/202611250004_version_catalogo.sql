begin;

create table if not exists public.catalog_version (
    id uuid primary key default gen_random_uuid(),
    version integer not null,
    applied_at timestamptz default now()
);
create unique index if not exists idx_catalog_version_version on public.catalog_version (version);
alter table public.catalog_version enable row level security;
revoke all on public.catalog_version from public, anon, authenticated;
grant select (version) on public.catalog_version to authenticated;

create policy catalog_version_lectura on public.catalog_version
    for select to authenticated using (true);
create policy catalog_version_perfil_activo on public.catalog_version
    as restrictive for select to authenticated using (
        exists (
            select 1 from public.profile p
            where p.auth_uid = (select auth.uid()) and p.activo and p.estado_cuenta = 'ACTIVE'
        )
    );

create function electoral_privado.avanzar_version_catalogo()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
    lock table public.catalog_version in share row exclusive mode;
    insert into public.catalog_version (version)
    select coalesce(max(version), 0) + 1 from public.catalog_version;
    return null;
end;
$$;

revoke all on function electoral_privado.avanzar_version_catalogo() from public, anon, authenticated;
create trigger version_organizacion after insert or update or delete on public.organizacion
    for each row execute function electoral_privado.avanzar_version_catalogo();
create trigger version_candidato after insert or update or delete on public.candidato
    for each row execute function electoral_privado.avanzar_version_catalogo();

commit;
