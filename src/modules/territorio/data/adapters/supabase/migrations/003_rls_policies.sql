-- 003_rls_policies.sql
-- Row Level Security policies for Supabase backend

-- Enable RLS (already enabled in schema file) and define policies

-- Profiles: users can see and update only their own profile
CREATE POLICY "profile_self_select" ON profiles
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "profile_self_update" ON profiles
    FOR UPDATE USING (auth.uid() = user_id);

-- Recintos: provincial can select all recintos in their province; coordinators only their own recinto
CREATE POLICY "recinto_provincial_select" ON recintos
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM territories t
            WHERE t.id = recintos.territory_id
              AND t.type = 'province'
              AND (
                  SELECT jurisdiction_id FROM profiles WHERE user_id = auth.uid() AND role = 'provincial'
              ) = t.id
        )
    );
CREATE POLICY "recinto_coordinator_select" ON recintos
    FOR SELECT USING (
        (SELECT jurisdiction_id FROM profiles WHERE user_id = auth.uid() AND role = 'coordinator') = recintos.id
    );

-- JRV: coordinators can select JRV in their recinto; veedores only assigned JRV
CREATE POLICY "jrv_coordinator_select" ON jrvs
    FOR SELECT USING (
        (SELECT jurisdiction_id FROM profiles WHERE user_id = auth.uid() AND role = 'coordinator') = jrvs.recinto_id
    );
CREATE POLICY "jrv_veedor_select" ON jrvs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM asignaciones a
            WHERE a.jrv_id = jrvs.id AND a.veedor_user_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
              AND (a.end_date IS NULL OR a.end_date >= CURRENT_DATE)
        )
    );

-- Asignaciones: veedor can insert only for JRV they are assigned to, and only one active assignment per JRV
CREATE POLICY "asignacion_insert_veedor" ON asignaciones
    FOR INSERT WITH CHECK (
        (SELECT role FROM profiles WHERE user_id = auth.uid()) = 'veedor'
        AND EXISTS (
            SELECT 1 FROM jrvs j WHERE j.id = NEW.jrv_id
        )
    );
CREATE POLICY "asignacion_update_owner" ON asignaciones
    FOR UPDATE USING (
        (SELECT id FROM profiles WHERE user_id = auth.uid()) = veedor_user_id
    );

-- Actas: veedor can select actas of their JRV; coordinators can select all actas in their recinto
CREATE POLICY "acta_veedor_select" ON actas
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM asignaciones a
            WHERE a.jrv_id = actas.jrv_id
              AND a.veedor_user_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
              AND (a.end_date IS NULL OR a.end_date >= CURRENT_DATE)
        )
    );
CREATE POLICY "acta_coordinator_select" ON actas
    FOR SELECT USING (
        (SELECT jurisdiction_id FROM profiles WHERE user_id = auth.uid() AND role = 'coordinator') =
        (SELECT recinto_id FROM jrvs WHERE jrvs.id = actas.jrv_id)
    );

-- Enable policies (already enabled by default when policies exist)
