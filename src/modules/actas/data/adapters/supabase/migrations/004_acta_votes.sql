-- Guía: Define una tabla de conteos por organización en un script auxiliar de actas.

-- 004_acta_votes.sql
-- Votes table for actas (one row per organization per acta)

CREATE TABLE IF NOT EXISTS votos_acta (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    acta_id uuid NOT NULL REFERENCES actas(id) ON DELETE CASCADE,
    organizacion_id uuid NOT NULL REFERENCES organizaciones(id) ON DELETE RESTRICT,
    votos integer NOT NULL CHECK (votos >= 0),
    UNIQUE (acta_id, organizacion_id)
);

-- Ensure that an acta has exactly 5 organization vote rows, plus optional blancos/nulos stored elsewhere.
-- Simple check: count of rows must be >=5; more complex validation will be done in application/trigger.
