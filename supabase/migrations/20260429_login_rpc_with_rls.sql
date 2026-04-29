-- Login seguro con RLS habilitado: acceso por RPC, no lectura directa de tablas desde anon.
-- Ejecutar en Supabase SQL Editor.

alter table if exists public.docentes enable row level security;
alter table if exists public.designacioens enable row level security;
alter table if exists public.designaciones enable row level security;

drop policy if exists "docentes_select_login_anon" on public.docentes;
drop policy if exists "designacioens_select_login_anon" on public.designacioens;
drop policy if exists "designaciones_select_login_anon" on public.designaciones;

create or replace function public.login_docente_by_dni(p_dni text)
returns table (
  id_docente text,
  dni text,
  nombre text,
  apellido text,
  nombre_completo text,
  email text,
  carrera text,
  cargo text,
  materia text,
  rol_sistema text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_dni text := regexp_replace(coalesce(p_dni, ''), '\\D', '', 'g');
begin
  return query
  with docente_base as (
    select
      coalesce(to_jsonb(d)->>'id_docente', to_jsonb(d)->>'docente_id', to_jsonb(d)->>'id')::text as id_docente,
      regexp_replace(
        coalesce(to_jsonb(d)->>'dni', to_jsonb(d)->>'DNI', to_jsonb(d)->>'documento', ''),
        '\\D',
        '',
        'g'
      ) as dni,
      coalesce(to_jsonb(d)->>'nombre', to_jsonb(d)->>'first_name', '')::text as nombre,
      coalesce(to_jsonb(d)->>'apellido', to_jsonb(d)->>'last_name', '')::text as apellido,
      trim(
        coalesce(to_jsonb(d)->>'nombre', to_jsonb(d)->>'first_name', '')
        || ' '
        || coalesce(to_jsonb(d)->>'apellido', to_jsonb(d)->>'last_name', '')
      )::text as nombre_completo,
      coalesce(to_jsonb(d)->>'email', to_jsonb(d)->>'correo', to_jsonb(d)->>'mail', '')::text as email,
      coalesce(to_jsonb(d)->>'carrera', to_jsonb(d)->>'departamento', '')::text as carrera,
      coalesce(to_jsonb(d)->>'cargo', to_jsonb(d)->>'puesto', to_jsonb(d)->>'categoria', '')::text as cargo,
      coalesce(to_jsonb(d)->>'materia', to_jsonb(d)->>'asignatura', '')::text as materia
    from public.docentes d
    where regexp_replace(
      coalesce(to_jsonb(d)->>'dni', to_jsonb(d)->>'DNI', to_jsonb(d)->>'documento', ''),
      '\\D',
      '',
      'g'
    ) = v_dni
    limit 1
  ),
  rol_lookup as (
    select
      coalesce(to_jsonb(ds)->>'rol_sistema', to_jsonb(ds)->>'rol', to_jsonb(ds)->>'role') as rol_sistema
    from public.designacioens ds
    join docente_base db on db.id_docente = coalesce(to_jsonb(ds)->>'id_docente', to_jsonb(ds)->>'docente_id', '')
    union all
    select
      coalesce(to_jsonb(dz)->>'rol_sistema', to_jsonb(dz)->>'rol', to_jsonb(dz)->>'role') as rol_sistema
    from public.designaciones dz
    join docente_base db on db.id_docente = coalesce(to_jsonb(dz)->>'id_docente', to_jsonb(dz)->>'docente_id', '')
  )
  select
    db.id_docente,
    db.dni,
    db.nombre,
    db.apellido,
    db.nombre_completo,
    db.email,
    db.carrera,
    db.cargo,
    db.materia,
    coalesce((select rl.rol_sistema from rol_lookup rl where rl.rol_sistema is not null limit 1), 'DOCENTE') as rol_sistema
  from docente_base db;
end;
$$;

revoke all on function public.login_docente_by_dni(text) from public;
grant execute on function public.login_docente_by_dni(text) to anon, authenticated;
