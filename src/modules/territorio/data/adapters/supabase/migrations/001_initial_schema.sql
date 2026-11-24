-- 001_initial_schema.sql
-- Supabase PostgreSQL schema for Control Electoral

-- Users are managed by Supabase Auth (auth.users), we store additional profile data.
CREATE TABLE IF NOT EXISTS profiles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    cedula TEXT NOT NULL UNIQUE,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    phone TEXT,
    role TEXT NOT NULL CHECK (role IN ('provincial','coordinator','veedor')),
    status TEXT NOT NULL CHECK (status IN ('PENDING','ACTIVE','DISABLED')),
    jurisdiction_id uuid, -- province or recinto depending on role
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS territories (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('province','canton','parish')),
    parent_id uuid REFERENCES territories(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS recintos (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    territory_id uuid NOT NULL REFERENCES territories(id) ON DELETE RESTRICT,
    name TEXT NOT NULL,
    address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS jrvs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    recinto_id uuid NOT NULL REFERENCES recintos(id) ON DELETE RESTRICT,
    numero INTEGER NOT NULL,
    UNIQUE (recinto_id, numero),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS organizaciones (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    logo_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS candidaturas (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organizacion_id uuid NOT NULL REFERENCES organizaciones(id) ON DELETE RESTRICT,
    dignidad TEXT NOT NULL CHECK (dignidad IN ('ALCALDE','PREFECTO')),
    nombre_candidato TEXT NOT NULL,
    UNIQUE (organizacion_id, dignidad),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS asignaciones (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    jrv_id uuid NOT NULL REFERENCES jrvs(id) ON DELETE RESTRICT,
    veedor_user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
    start_date DATE NOT NULL,
    end_date DATE,
    UNIQUE (jrv_id, veedor_user_id, start_date),
    CHECK (end_date IS NULL OR end_date >= start_date),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS actas (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    jrv_id uuid NOT NULL REFERENCES jrvs(id) ON DELETE RESTRICT,
    candidatura_id uuid NOT NULL REFERENCES candidaturas(id) ON DELETE RESTRICT,
    votos INTEGER NOT NULL CHECK (votos >= 0),
    vigente BOOLEAN NOT NULL DEFAULT TRUE,
    UNIQUE (jrv_id, candidatura_id, vigente) WHERE vigente,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS correcciones (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    acta_id uuid NOT NULL REFERENCES actas(id) ON DELETE RESTRICT,
    razon TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- RLS policies (to be activated later)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE recintos ENABLE ROW LEVEL SECURITY;
ALTER TABLE jrvs ENABLE ROW LEVEL SECURITY;
ALTER TABLE asignaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE actas ENABLE ROW LEVEL SECURITY;
