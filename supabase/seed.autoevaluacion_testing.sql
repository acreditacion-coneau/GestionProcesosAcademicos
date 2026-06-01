begin;

insert into public.carreras (id_carrera, nombre)
values
  ('e2e-carrera-arq', 'Arquitectura'),
  ('e2e-carrera-di', 'Diseno Industrial')
on conflict (id_carrera) do update set nombre = excluded.nombre;

insert into public.asignaturas (id_asignatura, nombre, id_carrera)
values
  ('e2e-matematica-ii', 'Matematica II', 'e2e-carrera-arq'),
  ('e2e-morfologia', 'Morfologia', 'e2e-carrera-di')
on conflict (id_asignatura) do update
set nombre = excluded.nombre,
    id_carrera = excluded.id_carrera;

insert into public.docentes (id_docente, nombre, apellido, dni, email)
values
  ('e2e-docente-1', 'Carlos', 'Gomez', '12345678', 'c.gomez@faud.edu.ar'),
  ('e2e-jefe-1', 'Ana', 'Sanchez', '23456789', 'a.sanchez@faud.edu.ar'),
  ('e2e-secretaria-1', 'Secretaria', 'Academica', '45678901', 'secretaria.academica@faud.edu.ar')
on conflict (id_docente) do update
set nombre = excluded.nombre,
    apellido = excluded.apellido,
    dni = excluded.dni,
    email = excluded.email;

insert into public.designaciones (id_designacion, id_docente, id_asignatura, cargo)
values
  ('e2e-designacion-docente-1', 'e2e-docente-1', 'e2e-matematica-ii', 'Auxiliar'),
  ('e2e-designacion-jefe-1', 'e2e-jefe-1', 'e2e-morfologia', 'Titular')
on conflict (id_designacion) do update
set id_docente = excluded.id_docente,
    id_asignatura = excluded.id_asignatura,
    cargo = excluded.cargo;

insert into public.formularios_evaluacion (id_formulario, nombre, descripcion, activo)
values
  (1, 'Formulario docente', 'Autoevaluacion del desempeno docente.', true),
  (2, 'Formulario institucional', 'Cierre institucional de la autoevaluacion.', true)
on conflict (id_formulario) do update
set nombre = excluded.nombre,
    descripcion = excluded.descripcion,
    activo = excluded.activo;

insert into public.preguntas_evaluacion (id_pregunta, id_formulario, orden, pregunta, tipo_respuesta, obligatoria, activa)
values
  ('e2e-pregunta-1', 1, 1, 'Cumplio con la planificacion prevista?', 'opcion', true, true),
  ('e2e-pregunta-2', 1, 2, 'Describa las acciones de acompanamiento realizadas.', 'texto', true, true),
  ('e2e-pregunta-3', 2, 1, 'El equipo conto con recursos suficientes?', 'opcion', true, true),
  ('e2e-pregunta-4', 2, 2, 'Indique mejoras para el proximo periodo.', 'texto', true, true)
on conflict (id_pregunta) do update
set id_formulario = excluded.id_formulario,
    orden = excluded.orden,
    pregunta = excluded.pregunta,
    tipo_respuesta = excluded.tipo_respuesta,
    obligatoria = excluded.obligatoria,
    activa = excluded.activa;

insert into public.campanias_evaluacion (id_campania, nombre, estado, fecha_inicio, fecha_fin, descripcion, id_carrera)
values
  ('e2e-campania-activa', 'Autoevaluacion Testing 2026', 'activa', '2026-03-01', '2026-07-31', 'tipo:1er_semestre', 'e2e-carrera-arq'),
  ('e2e-campania-vencida', 'Autoevaluacion Testing Vencida', 'activa', '2025-03-01', '2025-07-31', 'tipo:1er_semestre', 'e2e-carrera-arq')
on conflict (id_campania) do update
set nombre = excluded.nombre,
    estado = excluded.estado,
    fecha_inicio = excluded.fecha_inicio,
    fecha_fin = excluded.fecha_fin,
    descripcion = excluded.descripcion,
    id_carrera = excluded.id_carrera;

insert into public.asignaciones_evaluacion (id_asignacion, id_campania, id_docente, id_asignatura, estado)
values
  ('e2e-asignacion-pendiente', 'e2e-campania-activa', 'e2e-docente-1', 'e2e-matematica-ii', 'pendiente'),
  ('e2e-asignacion-completada', 'e2e-campania-activa', 'e2e-docente-1', 'e2e-morfologia', 'completada'),
  ('e2e-asignacion-vencida', 'e2e-campania-vencida', 'e2e-docente-1', 'e2e-matematica-ii', 'vencida')
on conflict (id_asignacion) do update
set id_campania = excluded.id_campania,
    id_docente = excluded.id_docente,
    id_asignatura = excluded.id_asignatura,
    estado = excluded.estado;

delete from public.respuestas_evaluacion
where id_asignacion in ('e2e-asignacion-completada');

insert into public.respuestas_evaluacion (id_asignacion, id_pregunta, respuesta)
values
  ('e2e-asignacion-completada', 'e2e-pregunta-1', 'si'),
  ('e2e-asignacion-completada', 'e2e-pregunta-2', 'Se completo el acompanamiento planificado.'),
  ('e2e-asignacion-completada', 'e2e-pregunta-3', 'a_veces'),
  ('e2e-asignacion-completada', 'e2e-pregunta-4', 'Se requiere mejorar disponibilidad de aulas taller.');

commit;
