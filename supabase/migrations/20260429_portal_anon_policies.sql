-- Políticas mínimas para que el frontend con anon key funcione con RLS habilitado.
-- IMPORTANTE: esto prioriza funcionamiento. Para seguridad fuerte hay que migrar a Supabase Auth real.

alter table if exists public.solicitud_ayudante enable row level security;
alter table if exists public.solicitud_alumnos enable row level security;
alter table if exists public.alumnos enable row level security;
alter table if exists public.asignaturas enable row level security;
alter table if exists public.documentos enable row level security;

-- solicitud_ayudante
DROP POLICY IF EXISTS "solicitud_ayudante_select_anon" ON public.solicitud_ayudante;
DROP POLICY IF EXISTS "solicitud_ayudante_insert_anon" ON public.solicitud_ayudante;
DROP POLICY IF EXISTS "solicitud_ayudante_update_anon" ON public.solicitud_ayudante;

CREATE POLICY "solicitud_ayudante_select_anon" ON public.solicitud_ayudante
FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "solicitud_ayudante_insert_anon" ON public.solicitud_ayudante
FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "solicitud_ayudante_update_anon" ON public.solicitud_ayudante
FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

-- solicitud_alumnos
DROP POLICY IF EXISTS "solicitud_alumnos_select_anon" ON public.solicitud_alumnos;
DROP POLICY IF EXISTS "solicitud_alumnos_insert_anon" ON public.solicitud_alumnos;

CREATE POLICY "solicitud_alumnos_select_anon" ON public.solicitud_alumnos
FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "solicitud_alumnos_insert_anon" ON public.solicitud_alumnos
FOR INSERT TO anon, authenticated WITH CHECK (true);

-- alumnos
DROP POLICY IF EXISTS "alumnos_select_anon" ON public.alumnos;
DROP POLICY IF EXISTS "alumnos_insert_anon" ON public.alumnos;

CREATE POLICY "alumnos_select_anon" ON public.alumnos
FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "alumnos_insert_anon" ON public.alumnos
FOR INSERT TO anon, authenticated WITH CHECK (true);

-- asignaturas
DROP POLICY IF EXISTS "asignaturas_select_anon" ON public.asignaturas;
DROP POLICY IF EXISTS "asignaturas_insert_anon" ON public.asignaturas;

CREATE POLICY "asignaturas_select_anon" ON public.asignaturas
FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "asignaturas_insert_anon" ON public.asignaturas
FOR INSERT TO anon, authenticated WITH CHECK (true);

-- documentos
DROP POLICY IF EXISTS "documentos_select_anon" ON public.documentos;
DROP POLICY IF EXISTS "documentos_insert_anon" ON public.documentos;

CREATE POLICY "documentos_select_anon" ON public.documentos
FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "documentos_insert_anon" ON public.documentos
FOR INSERT TO anon, authenticated WITH CHECK (true);
