begin;

select plan(30);

select has_table('public', 'campanias_evaluacion', 'existe tabla de campanias de autoevaluacion');
select has_table('public', 'asignaciones_evaluacion', 'existe tabla de asignaciones de autoevaluacion');
select has_table('public', 'formularios_evaluacion', 'existe tabla de formularios de autoevaluacion');
select has_table('public', 'preguntas_evaluacion', 'existe tabla de preguntas de autoevaluacion');
select has_table('public', 'respuestas_evaluacion', 'existe tabla de respuestas de autoevaluacion');

select has_column('public', 'campanias_evaluacion', 'estado', 'campanias tienen estado');
select has_column('public', 'campanias_evaluacion', 'fecha_inicio', 'campanias tienen fecha de inicio');
select has_column('public', 'campanias_evaluacion', 'fecha_fin', 'campanias tienen fecha de fin');
select has_column('public', 'asignaciones_evaluacion', 'id_docente', 'asignaciones usan id_docente');
select has_column('public', 'asignaciones_evaluacion', 'estado', 'asignaciones tienen estado');
select has_column('public', 'respuestas_evaluacion', 'id_pregunta', 'respuestas apuntan a preguntas');
select has_column('public', 'respuestas_evaluacion', 'respuesta', 'respuestas guardan valor');

select col_not_null('public', 'campanias_evaluacion', 'nombre', 'campania requiere nombre');
select col_not_null('public', 'asignaciones_evaluacion', 'id_docente', 'asignacion requiere docente');
select col_not_null('public', 'asignaciones_evaluacion', 'id_asignatura', 'asignacion requiere asignatura');
select col_not_null('public', 'preguntas_evaluacion', 'id_formulario', 'pregunta requiere formulario');

select isnt(
  exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'asignaciones_evaluacion'
      and column_name = 'dni'
  ),
  true,
  'asignaciones no relacionan por DNI'
);

select lives_ok(
  $$
    insert into public.campanias_evaluacion (id_campania, nombre, estado, fecha_inicio, fecha_fin, descripcion, id_carrera)
    values ('tap-campania', 'Campania pgTAP', 'borrador', current_date, current_date + 30, 'tipo:test', null)
    on conflict (id_campania) do update set estado = excluded.estado
  $$,
  'permite crear campania en borrador'
);

select lives_ok(
  $$
    update public.campanias_evaluacion
    set estado = 'activa'
    where id_campania = 'tap-campania'
  $$,
  'permite lanzar campania'
);

select results_eq(
  $$ select estado from public.campanias_evaluacion where id_campania = 'tap-campania' $$,
  $$ values ('activa'::text) $$,
  'campania lanzada queda activa'
);

select lives_ok(
  $$
    insert into public.asignaciones_evaluacion (id_asignacion, id_campania, id_docente, id_asignatura, estado)
    values ('tap-asignacion', 'tap-campania', 'e2e-docente-1', 'e2e-matematica-ii', 'pendiente')
    on conflict (id_asignacion) do update set estado = excluded.estado
  $$,
  'permite crear asignacion pendiente'
);

select results_eq(
  $$ select estado from public.asignaciones_evaluacion where id_asignacion = 'tap-asignacion' $$,
  $$ values ('pendiente'::text) $$,
  'asignacion inicia pendiente'
);

select lives_ok(
  $$
    insert into public.respuestas_evaluacion (id_asignacion, id_pregunta, respuesta)
    values ('tap-asignacion', 'e2e-pregunta-1', 'si')
  $$,
  'permite registrar respuesta'
);

select results_eq(
  $$ select count(*)::integer from public.respuestas_evaluacion where id_asignacion = 'tap-asignacion' $$,
  $$ values (1) $$,
  'respuesta queda asociada a la asignacion'
);

select lives_ok(
  $$
    update public.asignaciones_evaluacion
    set estado = 'completada'
    where id_asignacion = 'tap-asignacion'
  $$,
  'permite marcar evaluacion completada'
);

select results_eq(
  $$ select estado from public.asignaciones_evaluacion where id_asignacion = 'tap-asignacion' $$,
  $$ values ('completada'::text) $$,
  'evaluacion completada queda bloqueable por estado'
);

select todo_start('RLS se endurecera cuando queden definidos los roles productivos finales');
select policies_are('public', 'campanias_evaluacion', array[]::name[], 'RLS futura para campanias documentada');
select policies_are('public', 'asignaciones_evaluacion', array[]::name[], 'RLS futura para asignaciones documentada');
select policies_are('public', 'respuestas_evaluacion', array[]::name[], 'RLS futura para respuestas documentada');
select todo_end();

select hasnt_column('public', 'respuestas_evaluacion', 'dni', 'respuestas tampoco relacionan por DNI');
select finish();

rollback;
