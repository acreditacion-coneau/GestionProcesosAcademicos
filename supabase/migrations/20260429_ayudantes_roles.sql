-- Control de roles para flujo de ayudante alumno
-- Ejecutar en Supabase SQL Editor o vía `supabase db push`.

alter table public.solicitud_ayudante enable row level security;
alter table public.solicitud_alumnos enable row level security;
alter table public.documentos enable row level security;

-- Limpieza de políticas previas (idempotente)
drop policy if exists "solicitud_ayudante_select_roles" on public.solicitud_ayudante;
drop policy if exists "solicitud_ayudante_insert_docente" on public.solicitud_ayudante;
drop policy if exists "solicitud_ayudante_update_administrativo" on public.solicitud_ayudante;
drop policy if exists "solicitud_ayudante_update_jefe" on public.solicitud_ayudante;
drop policy if exists "solicitud_ayudante_update_secretaria" on public.solicitud_ayudante;

drop policy if exists "solicitud_alumnos_select_roles" on public.solicitud_alumnos;
drop policy if exists "solicitud_alumnos_insert_docente" on public.solicitud_alumnos;

drop policy if exists "documentos_select_roles" on public.documentos;
drop policy if exists "documentos_insert_roles" on public.documentos;

-- Claim esperado en JWT: role_app = docente | administrativo | jefe_carrera | secretaria
-- En frontend, mapear rol a ese claim.

create policy "solicitud_ayudante_select_roles"
on public.solicitud_ayudante
for select
using ((auth.jwt() ->> 'role_app') in ('docente', 'administrativo', 'jefe_carrera', 'secretaria'));

create policy "solicitud_ayudante_insert_docente"
on public.solicitud_ayudante
for insert
with check ((auth.jwt() ->> 'role_app') = 'docente');

create policy "solicitud_ayudante_update_administrativo"
on public.solicitud_ayudante
for update
using ((auth.jwt() ->> 'role_app') = 'administrativo')
with check (
  (auth.jwt() ->> 'role_app') = 'administrativo'
  and estado in ('en_verificacion', 'rechazada')
);

create policy "solicitud_ayudante_update_jefe"
on public.solicitud_ayudante
for update
using ((auth.jwt() ->> 'role_app') = 'jefe_carrera')
with check (
  (auth.jwt() ->> 'role_app') = 'jefe_carrera'
  and estado in ('aprobada_jefe', 'finalizada', 'rechazada')
);

create policy "solicitud_ayudante_update_secretaria"
on public.solicitud_ayudante
for update
using ((auth.jwt() ->> 'role_app') = 'secretaria')
with check (
  (auth.jwt() ->> 'role_app') = 'secretaria'
  and estado in ('en_secretaria', 'rechazada')
);

create policy "solicitud_alumnos_select_roles"
on public.solicitud_alumnos
for select
using ((auth.jwt() ->> 'role_app') in ('docente', 'administrativo', 'jefe_carrera', 'secretaria'));

create policy "solicitud_alumnos_insert_docente"
on public.solicitud_alumnos
for insert
with check ((auth.jwt() ->> 'role_app') = 'docente');

create policy "documentos_select_roles"
on public.documentos
for select
using ((auth.jwt() ->> 'role_app') in ('docente', 'administrativo', 'jefe_carrera', 'secretaria'));

create policy "documentos_insert_roles"
on public.documentos
for insert
with check ((auth.jwt() ->> 'role_app') in ('administrativo', 'jefe_carrera', 'secretaria', 'docente'));
