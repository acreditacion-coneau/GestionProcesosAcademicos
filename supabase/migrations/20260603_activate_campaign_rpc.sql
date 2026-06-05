-- Create activate_campaign RPC function
-- This function activates a campaign and automatically generates evaluation assignments
-- from teacher designations for the associated degree program.

create or replace function public.activate_campaign(p_campaign_id text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_campaign_id text;
  v_carrera_id text;
  v_success bool := false;
  v_generated_count int := 0;
begin
  -- Validate campaign exists and is in draft status
  select id_campania, id_carrera into v_campaign_id, v_carrera_id
  from public.campanias_evaluacion
  where id_campania = p_campaign_id;

  if v_campaign_id is null then
    return json_build_object(
      'success', false,
      'message', 'Campaign not found',
      'generated_count', 0
    );
  end if;

  -- Generate evaluation assignments from designaciones
  -- Only for designations in the campaign's carrera
  insert into public.asignaciones_evaluacion (
    id_campania,
    id_docente,
    id_asignatura,
    estado
  )
  select
    p_campaign_id,
    d.id_docente,
    d.id_asignatura,
    'pendiente'::text
  from public.designaciones d
  inner join public.asignaturas a on d.id_asignatura = a.id_asignatura
  where a.id_carrera = v_carrera_id
  and not exists (
    select 1
    from public.asignaciones_evaluacion ae
    where ae.id_campania = p_campaign_id
    and ae.id_docente = d.id_docente
    and ae.id_asignatura = d.id_asignatura
  )
  on conflict (id_campania, id_docente, id_asignatura) 
  do nothing;

  -- Count generated assignments
  select count(*)::int into v_generated_count
  from public.asignaciones_evaluacion
  where id_campania = p_campaign_id;

  -- Update campaign status to active
  update public.campanias_evaluacion
  set estado = 'activa'
  where id_campania = p_campaign_id;

  v_success := true;

  return json_build_object(
    'success', v_success,
    'message', 'Campaign activated successfully',
    'generated_count', v_generated_count,
    'campaign_id', p_campaign_id
  );
exception
  when others then
    return json_build_object(
      'success', false,
      'message', SQLERRM,
      'generated_count', 0
    );
end;
$$;

-- Grant execute permission to authenticated users
grant execute on function public.activate_campaign(text) to authenticated;
grant execute on function public.activate_campaign(text) to anon;
