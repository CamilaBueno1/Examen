-- Guía: Carga un catálogo ficticio para pruebas locales y registra su versión inicial.

-- SOLO PARA PRUEBAS: los nombres de organizaciones, candidaturas y recintos son ficticios.
-- No es un padrón electoral ni debe cargarse en un entorno real.
-- Alcance simulado: Provincia Pichincha, Cantón Rumiñahui.

BEGIN;

-- 1. ORGANIZACIONES (5 organizaciones políticas)
INSERT INTO public.organizacion (id, nombre) VALUES
    (gen_random_uuid(), 'Organizacion A'),
    (gen_random_uuid(), 'Organizacion B'),
    (gen_random_uuid(), 'Organizacion C'),
    (gen_random_uuid(), 'Organizacion D'),
    (gen_random_uuid(), 'Organizacion E')
ON CONFLICT (nombre) DO NOTHING;

-- 2. CANDIDATOS (por dignidad)
INSERT INTO public.candidato (id, organizacion_id, dignidad, nombre)
SELECT gen_random_uuid(), o.id, d.dignidad, CONCAT(d.prefijo, o.nombre)
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
    (gen_random_uuid(), 'Pichincha', 'Rumiñahui', 'Recinto Central'),
    (gen_random_uuid(), 'Pichincha', 'Rumiñahui', 'Recinto Norte'),
    (gen_random_uuid(), 'Pichincha', 'Rumiñahui', 'Recinto Sur')
ON CONFLICT (provincia, canton, nombre) DO NOTHING;

-- Obtener IDs de recintos para crear JRV
WITH rec AS (
    SELECT id FROM public.recinto
    WHERE provincia = 'Pichincha' AND canton = 'Rumiñahui'
      AND nombre IN ('Recinto Central', 'Recinto Norte', 'Recinto Sur')
)
INSERT INTO public.jrv (id, recinto_id, numero)
SELECT gen_random_uuid(), r.id, n
FROM rec r, generate_series(1,2) AS n
ON CONFLICT (recinto_id, numero) DO NOTHING;

-- 4. VERSIONADO del catálogo (tabla de control)
CREATE TABLE IF NOT EXISTS public.catalog_version (
    id uuid primary key default gen_random_uuid(),
    version integer not null,
    applied_at timestamp with time zone default now()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_catalog_version_version
    ON public.catalog_version (version);

INSERT INTO public.catalog_version (version) VALUES (1)
ON CONFLICT (version) DO NOTHING;

COMMIT;
