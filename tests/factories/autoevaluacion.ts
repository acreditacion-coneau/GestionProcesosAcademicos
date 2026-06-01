import type {
  AsignacionEvaluacion,
  AutoevaluacionDetalle,
  CampaniaEvaluacion,
  DashboardJefeCarrera,
  DashboardSecretaria,
} from "../../src/app/types/autoevaluacion";

export const docenteUser = {
  nombre: "Carlos",
  apellido: "Gomez",
  dni: "12345678",
  carrera: "Arquitectura",
  cargo: "Auxiliar",
  materia: "Matematica II",
  rol: "DOCENTE",
  globalRole: "docente",
  email: "c.gomez@faud.edu.ar",
  idDocente: "docente-1",
};

export const jefeCarreraUser = {
  ...docenteUser,
  nombre: "Ana",
  apellido: "Sanchez",
  dni: "23456789",
  cargo: "Titular",
  rol: "JEFE_CARRERA",
  idDocente: "docente-jefe-1",
};

export const secretariaUser = {
  ...docenteUser,
  nombre: "Secretaria",
  apellido: "Academica",
  dni: "45678901",
  carrera: "Todas",
  cargo: "Administrativo",
  materia: "-",
  rol: "SECRETARIA",
  idDocente: undefined,
};

export const campaniaActiva: CampaniaEvaluacion = {
  idCampania: "campania-2026-1",
  nombre: "Autoevaluacion 2026 - 1er semestre",
  estado: "activa",
  fechaInicio: "2026-03-01",
  fechaFin: "2026-07-31",
  descripcion: "tipo:1er_semestre",
  idCarrera: "carrera-arq",
  createdAt: "2026-03-01T12:00:00.000Z",
};

export const asignacionPendiente: AsignacionEvaluacion = {
  idAsignacion: "asignacion-1",
  idCampania: campaniaActiva.idCampania,
  idDocente: "docente-1",
  idAsignatura: "matematica-ii",
  estado: "pendiente",
  createdAt: "2026-03-05T12:00:00.000Z",
  asignatura: "Matematica II",
  carrera: "Arquitectura",
};

export const asignacionCompletada: AsignacionEvaluacion = {
  ...asignacionPendiente,
  idAsignacion: "asignacion-completada",
  estado: "completada",
  fechaRespuesta: "2026-03-10T12:00:00.000Z",
  completedAt: "2026-03-10T12:00:00.000Z",
  firmaHash: "hash-test",
  firmaBase64: "ZmlybWE=",
  firmadaAt: "2026-03-10T12:00:00.000Z",
};

export const detallePendiente: AutoevaluacionDetalle = {
  asignacion: asignacionPendiente,
  bloqueada: false,
  formularios: [
    {
      idFormulario: 1,
      nombre: "Formulario docente",
      descripcion: "Autoevaluacion del desempeno docente.",
      activo: true,
    },
    {
      idFormulario: 2,
      nombre: "Formulario institucional",
      descripcion: "Cierre institucional de la autoevaluacion.",
      activo: true,
    },
  ],
  preguntas: [
    {
      idPregunta: "pregunta-1",
      idFormulario: 1,
      orden: 1,
      pregunta: "Cumplio con la planificacion prevista?",
      tipoRespuesta: "opcion",
      obligatoria: true,
      activa: true,
    },
    {
      idPregunta: "pregunta-2",
      idFormulario: 1,
      orden: 2,
      pregunta: "Describa las acciones de acompanamiento realizadas.",
      tipoRespuesta: "texto",
      obligatoria: true,
      activa: true,
    },
    {
      idPregunta: "pregunta-3",
      idFormulario: 2,
      orden: 1,
      pregunta: "El equipo conto con recursos suficientes?",
      tipoRespuesta: "opcion",
      obligatoria: true,
      activa: true,
    },
    {
      idPregunta: "pregunta-4",
      idFormulario: 2,
      orden: 2,
      pregunta: "Indique mejoras para el proximo periodo.",
      tipoRespuesta: "texto",
      obligatoria: true,
      activa: true,
    },
  ],
  respuestas: [],
};

export const detalleCompletado: AutoevaluacionDetalle = {
  ...detallePendiente,
  asignacion: asignacionCompletada,
  bloqueada: true,
  respuestas: [
    {
      idAsignacion: asignacionCompletada.idAsignacion,
      idPregunta: "pregunta-1",
      respuesta: "si",
    },
    {
      idAsignacion: asignacionCompletada.idAsignacion,
      idPregunta: "pregunta-2",
      respuesta: "Se completo el acompanamiento.",
    },
  ],
};

export const dashboardJefe: DashboardJefeCarrera = {
  totalDocentes: 2,
  totalAsignaciones: 2,
  pendientes: 1,
  completadas: 1,
  vencidas: 0,
  porcentajeCompletado: 50,
  detalle: [
    {
      idAsignacion: "asignacion-1",
      docente: "Carlos Gomez",
      carrera: "Arquitectura",
      asignatura: "Matematica II",
      estado: "pendiente",
      fechaEnvio: null,
      fechaRespuesta: null,
    },
    {
      idAsignacion: "asignacion-completada",
      docente: "Ana Sanchez",
      carrera: "Arquitectura",
      asignatura: "Morfologia",
      estado: "completada",
      fechaEnvio: "2026-03-10T12:00:00.000Z",
      fechaRespuesta: "2026-03-10T12:00:00.000Z",
    },
  ],
  porAsignatura: [
    {
      asignatura: "Matematica II",
      completadas: 0,
      pendientes: 1,
      vencidas: 0,
    },
    {
      asignatura: "Morfologia",
      completadas: 1,
      pendientes: 0,
      vencidas: 0,
    },
  ],
};

export const dashboardSecretaria: DashboardSecretaria = {
  campanias: [campaniaActiva],
  totalAsignaciones: 2,
  pendientes: 1,
  completadas: 1,
  vencidas: 0,
  advertencias: 0,
  porcentajeCompletado: 50,
  porEstado: [
    { estado: "Completadas", cantidad: 1 },
    { estado: "Pendientes", cantidad: 1 },
    { estado: "Vencidas", cantidad: 0 },
  ],
  auditoriaReciente: [],
};
