-- 002_seed_pichincha.sql
-- Idempotent seed script for Pichincha catalog (canton Rumiñahui)

-- Insert territories (province, canton, parish hierarchy)
INSERT INTO territories (id, name, type, parent_id)
VALUES 
    ('11111111-1111-1111-1111-111111111111', 'Pichincha', 'province', NULL),
    ('22222222-2222-2222-2222-222222222222', 'Rumiñahui', 'canton', '11111111-1111-1111-1111-111111111111')
ON CONFLICT (id) DO NOTHING;

-- Insert organizations (example five political parties)
INSERT INTO organizaciones (id, name, logo_url)
VALUES 
    ('33333333-3333-3333-3333-333333333333', 'Partido A', NULL),
    ('44444444-4444-4444-4444-444444444444', 'Partido B', NULL),
    ('55555555-5555-5555-5555-555555555555', 'Partido C', NULL),
    ('66666666-6666-6666-6666-666666666666', 'Partido D', NULL),
    ('77777777-7777-7777-7777-777777777777', 'Partido E', NULL)
ON CONFLICT (name) DO NOTHING;

-- Insert candidaturas for alcalde and prefecto for each organization
INSERT INTO candidaturas (id, organizacion_id, dignidad, nombre_candidato)
SELECT gen_random_uuid(), org.id,
    CASE WHEN d = 'ALCALDE' THEN 'ALCALDE' ELSE 'PREFECTO' END,
    CONCAT('Candidato ', d, ' ', org.name)
FROM organizaciones org,
     (VALUES ('ALCALDE'), ('PREFECTO')) AS dignidad(d);

-- Insert recintos (example placeholder)
INSERT INTO recintos (id, territory_id, name, address)
VALUES 
    ('88888888-8888-8888-8888-888888888888', '22222222-2222-2222-2222-222222222222', 'Recinto Central', 'Calle Falsa 123')
ON CONFLICT (id) DO NOTHING;

-- Insert JRV numbers for the recinto (example 1..10)
WITH rec AS (SELECT id FROM recintos WHERE name='Recinto Central')
INSERT INTO jrvs (id, recinto_id, numero)
SELECT gen_random_uuid(), rec.id, n
FROM rec, generate_series(1,10) AS n
ON CONFLICT (recinto_id, numero) DO NOTHING;

-- Note: This script is idempotent – repeated execution will not duplicate rows due to ON CONFLICT handling.
