export type CampaniaEstado = "borrador" | "activa" | "cerrada" | "archivada" | string;

export type EstadoAsignacion = "pendiente" | "completada" | "vencida" | string;

export interface CampaniaEvaluacion {
  idCampania: string;
  nombre: string;
  estado: CampaniaEstado;
  fechaInicio: string;
  fechaFin: string | null;
  descripcion: string | null;
  idCarrera: string | null;
  createdAt: string;
}

export interface AsignacionEvaluacion {
  idAsignacion: string;
  idCampania: string;
  idDocente: string;
  idAsignatura: string;
  estado: EstadoAsignacion;
  createdAt: string;
  asignatura: string;
  carrera: string;
}

export interface FormularioEvaluacion {
  idFormulario: number;
  nombre: string;
  descripcion: string;
  activo: boolean;
}

export interface PreguntaEvaluacion {
  idPregunta: string;
  idFormulario: number;
  orden: number;
  pregunta: string;
  tipoRespuesta: string;
  obligatoria: boolean;
  activa: boolean;
}

export interface RespuestaEvaluacion {
  idRespuesta?: string;
  idAsignacion: string;
  idPregunta: string;
  respuesta: string;
  createdAt?: string;
}

export interface AutoevaluacionDetalle {
  asignacion: AsignacionEvaluacion;
  formularios: FormularioEvaluacion[];
  preguntas: PreguntaEvaluacion[];
  respuestas: RespuestaEvaluacion[];
  bloqueada: boolean;
}

export interface DashboardJefeCarrera {
  totalDocentes: number;
  pendientes: number;
  completadas: number;
  vencidas: number;
  porcentajeCompletado: number;
  detalle: Array<{
    idAsignacion: string;
    docente: string;
    asignatura: string;
    estado: EstadoAsignacion;
    fechaEnvio: string | null;
  }>;
}

export interface DashboardSecretaria {
  campanias: CampaniaEvaluacion[];
  totalAsignaciones: number;
  pendientes: number;
  completadas: number;
  vencidas: number;
  advertencias: number;
  auditoriaReciente: Array<{
    id: string;
    accion: string;
    actor: string;
    createdAt: string;
  }>;
}

export interface CampaniaCreateInput {
  nombre: string;
  fechaInicio: string;
  fechaFin: string;
  descripcion?: string;
  idCarrera?: string | null;
}

export interface AdvertenciaInput {
  idCampania: string;
  detalle: string;
}

export interface ExportRow {
  campania: string;
  docente: string;
  carrera: string;
  asignatura: string;
  estado: EstadoAsignacion;
  fechaEnvio: string | null;
  cantidadRespuestas: number;
}
