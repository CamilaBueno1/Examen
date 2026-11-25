-- Guía: Define las tablas iniciales y las reglas de cuadratura y versión.

-- 01_init.sql – PostgreSQL schema for Control Electoral
-- Generated per ADR‑02 (Supabase/PostgreSQL backend) and ADR‑03 (precarga catalog) 

-- ==== USERS & AUTH ==== 
-- Supabase Auth manages the auth table; we add a profile table linked to auth.uid()
create table if not exists public.profile (
    id uuid primary key default gen_random_uuid(),
    auth_uid uuid not null unique,
    cedula varchar(20) not null unique,
    nombres varchar(100) not null,
    apellidos varchar(100) not null,
    telefono varchar(20),
    email varchar(255) not null unique,
    rol varchar(20) not null check (rol in ('provincial','coordinador_recinto','veedor')),
    activo boolean not null default false,
    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone default now()
);

-- ==== TERRITORIO ==== 
create table if not exists public.recinto (
    id uuid primary key default gen_random_uuid(),
    provincia varchar(100) not null,
    canton varchar(100) not null,
    nombre varchar(150) not null,
    created_at timestamp with time zone default now()
);

create table if not exists public.jrv (
    id uuid primary key default gen_random_uuid(),
    recinto_id uuid not null references public.recinto(id) on delete cascade,
    numero integer not null,
    unique (recinto_id, numero)
);

-- ==== ORGANIZACIONES & CANDIDATURAS ==== 
create table if not exists public.organizacion (
    id uuid primary key default gen_random_uuid(),
    nombre varchar(150) not null unique
);

create table if not exists public.candidato (
    id uuid primary key default gen_random_uuid(),
    organizacion_id uuid not null references public.organizacion(id) on delete cascade,
    dignidad varchar(20) not null check (dignidad in ('alcaldia','prefectura')),
    nombre varchar(150) not null,
    unique (organizacion_id, dignidad)
);

-- ==== ASIGNACIONES (historicas) ==== 
create table if not exists public.asignacion_veedor (
    id uuid primary key default gen_random_uuid(),
    jrv_id uuid not null references public.jrv(id) on delete cascade,
    veedor_id uuid not null references public.profile(id) on delete cascade,
    desde timestamp with time zone not null,
    hasta timestamp with time zone,
    motivo varchar(250),
    asignado_por uuid not null references public.profile(id)
);

create unique index if not exists idx_asignacion_veedor_jrv_vigente
    on public.asignacion_veedor (jrv_id) where hasta is null;

create table if not exists public.asignacion_coordinador_recinto (
    id uuid primary key default gen_random_uuid(),
    recinto_id uuid not null references public.recinto(id) on delete cascade,
    coordinador_id uuid not null references public.profile(id) on delete cascade,
    desde timestamp with time zone not null,
    hasta timestamp with time zone,
    motivo varchar(250),
    asignado_por uuid not null references public.profile(id)
);

create unique index if not exists idx_asignacion_coordinador_recinto_vigente
    on public.asignacion_coordinador_recinto (recinto_id) where hasta is null;

-- ==== ACTAS ==== 
do $$
declare
    etiquetas text[];
begin
    if not exists (
        select 1
        from pg_type t
        join pg_namespace n on n.oid = t.typnamespace
        where n.nspname = 'public' and t.typname = 'dignidad_type'
    ) then
        create type public.dignidad_type as enum ('alcaldia','prefectura');
    else
        select array_agg(e.enumlabel::text order by e.enumsortorder)
        into etiquetas
        from pg_enum e
        join pg_type t on t.oid = e.enumtypid
        join pg_namespace n on n.oid = t.typnamespace
        where n.nspname = 'public' and t.typname = 'dignidad_type';

        if etiquetas is distinct from array['alcaldia','prefectura']::text[] then
            raise exception 'public.dignidad_type ya existe con valores distintos';
        end if;
    end if;
end;
$$;

create table if not exists public.acta (
    id uuid primary key default gen_random_uuid(),
    jrv_id uuid not null references public.jrv(id) on delete cascade,
    dignidad public.dignidad_type not null,
    -- votos por organización (5 organizaciones esperadas)
    votos jsonb not null,
    blancos integer not null check (blancos >= 0),
    nulos integer not null check (nulos >= 0),
    sufragantes integer not null check (sufragantes >= 0),
    version integer not null default 1,
    creado_por uuid not null references public.profile(id),
    creado_en timestamp with time zone default now(),
    actualizado_en timestamp with time zone default now()
);

-- ==== FOTOGRAFÍAS ==== 
create table if not exists public.foto_acta (
    id uuid primary key default gen_random_uuid(),
    acta_id uuid not null references public.acta(id) on delete cascade,
    storage_path varchar(500) not null,
    lat double precision,
    lng double precision,
    precision_m double precision,
    captura_at timestamp with time zone,
    calidad varchar(20) check (calidad in ('buena','dudosa','mala')),
    created_at timestamp with time zone default now()
);

-- ==== INDICES ==== 
create index if not exists idx_acta_jrv_dignidad on public.acta (jrv_id, dignidad);

-- ==== CONSTRAINTS DE INTEGRIDAD (ADR‑07) ==== 
-- Suma de votos + blancos + nulos debe coincidir con sufragantes
create or replace function public.validar_suma_acta() returns trigger language plpgsql as $$
begin
    if ( ( (new.votos->>'total')::int + new.blancos + new.nulos ) <> new.sufragantes ) then
        raise exception 'La suma de votos, blancos y nulos no coincide con sufragantes';
    end if;
    return new;
end;$$;

drop trigger if exists trg_validar_suma on public.acta;
create trigger trg_validar_suma before insert or update on public.acta
for each row execute function public.validar_suma_acta();

-- ==== VERSIONADO DE ACTAS (optimistic lock) ==== 
create or replace function public.increment_version() returns trigger language plpgsql as $$
begin
    new.version = old.version + 1;
    new.actualizado_en = now();
    return new;
end;$$;

drop trigger if exists trg_increment_version on public.acta;
create trigger trg_increment_version before update on public.acta
for each row when (OLD.version = NEW.version)
execute function public.increment_version();

-- RLS is enabled and scoped by the later versioned migrations; do not apply
-- the obsolete standalone policies.sql.

