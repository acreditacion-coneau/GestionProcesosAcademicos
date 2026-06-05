-- Ensure unique constraint on asignaciones_evaluacion
-- This allows the activate_campaign function to safely insert without duplicating evaluations

alter table if exists public.asignaciones_evaluacion
add constraint asignaciones_evaluacion_campania_docente_asignatura_unique
unique (id_campania, id_docente, id_asignatura);
