-- catalog.sql – Precarga de datos estáticos (ADR‑03)
-- Alcance: Provincia Pichincha, Cantón Rumiñahui.
-- Los datos deben ser verificados con fuentes oficiales (padrón electoral).

BEGIN;

-- 1. ORGANIZACIONES (5 organizaciones políticas)
INSERT INTO public.organizacion (id, nombre) VALUES
    (uuid_generate_v4(), 'Organizacion A'),
    (uuid_generate_v4(), 'Organizacion B'),
    (uuid_generate_v4(), 'Organizacion C'),
    (uuid_generate_v4(), 'Organizacion D'),
    (uuid_generate_v4(), 'Organizacion E')
ON CONFLICT (nombre) DO NOTHING;

-- 2. CANDIDATOS (por dignidad)
INSERT INTO public.candidato (id, organizacion_id, dignidad, nombre)
SELECT uuid_generate_v4(), o.id, d.dignidad, CONCAT(d.prefijo, o.nombre)
FROM public.organizacion AS o
CROSS JOIN (VALUES
    ('alcaldia', 'Candidato Alcaldia '),
    ('prefectura', 'Candidato Prefectura ')
) AS d(dignidad, prefijo)
WHERE o.nombre IN ('Organizacion A', 'Organizacion B', 'Organizacion C',
                   'Organizacion D', 'Organizacion E')
ON CONFLICT (organizacion_id, dignidad) DO NOTHING;

-- 3. RECINTOS y JRV (ejemplo reducido – 3 recintos, cada uno 2 JRV)
CREATE UNIQUE INDEX IF NOT EXISTS idx_recinto_provincia_canton_nombre
    ON public.recinto (provincia, canton, nombre);

INSERT INTO public.recinto (id, provincia, canton, nombre)
VALUES
    (uuid_generate_v4(), 'Pichincha', 'Rumiñahui', 'Recinto Central'),
    (uuid_generate_v4(), 'Pichincha', 'Rumiñahui', 'Recinto Norte'),
    (uuid_generate_v4(), 'Pichincha', 'Rumiñahui', 'Recinto Sur')
ON CONFLICT (provincia, canton, nombre) DO NOTHING;

-- Obtener IDs de recintos para crear JRV
WITH rec AS (
    SELECT id FROM public.recinto
    WHERE provincia = 'Pichincha' AND canton = 'Rumiñahui'
      AND nombre IN ('Recinto Central', 'Recinto Norte', 'Recinto Sur')
)
INSERT INTO public.jrv (id, recinto_id, numero)
SELECT uuid_generate_v4(), r.id, n
FROM rec r, generate_series(1,2) AS n
ON CONFLICT (recinto_id, numero) DO NOTHING;

-- 4. VERSIONADO del catálogo (tabla de control)
CREATE TABLE IF NOT EXISTS public.catalog_version (
    id uuid primary key default uuid_generate_v4(),
    version integer not null,
    applied_at timestamp with time zone default now()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_catalog_version_version
    ON public.catalog_version (version);

INSERT INTO public.catalog_version (version) VALUES (1)
ON CONFLICT (version) DO NOTHING;

COMMIT;
