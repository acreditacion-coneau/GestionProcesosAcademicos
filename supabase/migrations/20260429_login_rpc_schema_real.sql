-- Login con RLS habilitado usando RPC segura
-- Esquema real:
-- docentes(id_docente, nombre, apellido, dni, email)
-- designaciones(id, id_docente, carrera, asignatura, cargo, rol_sistema)

alter table if exists public.docentes enable row level security;
alter table if exists public.designaciones enable row level security;

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
  select
    d.id_docente::text,
    regexp_replace(coalesce(d.dni::text, ''), '\\D', '', 'g') as dni,
    coalesce(d.nombre, '')::text as nombre,
    coalesce(d.apellido, '')::text as apellido,
    trim(coalesce(d.nombre, '') || ' ' || coalesce(d.apellido, ''))::text as nombre_completo,
    coalesce(d.email, '')::text as email,
    coalesce(des.carrera, '')::text as carrera,
    coalesce(des.cargo, '')::text as cargo,
    coalesce(des.asignatura, '')::text as materia,
    coalesce(des.rol_sistema, 'DOCENTE')::text as rol_sistema
  from public.docentes d
  left join lateral (
    select de.carrera, de.asignatura, de.cargo, de.rol_sistema
    from public.designaciones de
    where de.id_docente = d.id_docente
    order by de.id desc
    limit 1
  ) des on true
  where regexp_replace(coalesce(d.dni::text, ''), '\\D', '', 'g') = v_dni
  limit 1;
end;
$$;

revoke all on function public.login_docente_by_dni(text) from public;
grant execute on function public.login_docente_by_dni(text) to anon, authenticated;
