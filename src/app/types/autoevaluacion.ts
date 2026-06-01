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
  fechaRespuesta?: string | null;
  completedAt?: string | null;
  firmaHash?: string | null;
  firmaBase64?: string | null;
  firmadaAt?: string | null;
  docenteNombre?: string;
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
  totalAsignaciones: number;
  pendientes: number;
  completadas: number;
  vencidas: number;
  porcentajeCompletado: number;
  detalle: Array<{
    idAsignacion: string;
    docente: string;
    carrera: string;
    asignatura: string;
    estado: EstadoAsignacion;
    fechaEnvio: string | null;
    fechaRespuesta?: string | null;
  }>;
  porAsignatura: Array<{
    asignatura: string;
    completadas: number;
    pendientes: number;
    vencidas: number;
  }>;
}

export interface DashboardSecretaria {
  campanias: CampaniaEvaluacion[];
  totalAsignaciones: number;
  pendientes: number;
  completadas: number;
  vencidas: number;
  advertencias: number;
  porcentajeCompletado?: number;
  porEstado?: Array<{ estado: string; cantidad: number }>;
  auditoriaReciente: Array<{
    id: string;
    accion: string;
    actor: string;
    createdAt: string;
  }>;
}

export interface SecretariaAutoevaluacionRow {
  idAsignacion: string;
  docente: string;
  asignatura: string;
  carrera: string;
  estado: EstadoAsignacion;
  fechaRespuesta: string | null;
  firma: "Firmada" | "Sin firma";
  firmaHash?: string | null;
}

export interface SecretariaCarreraProgress {
  carrera: string;
  total: number;
  completadas: number;
  pendientes: number;
  vencidas: number;
  porcentajeCompletado: number;
}

export interface SecretariaAutoevaluacionDashboard {
  campanias: CampaniaEvaluacion[];
  campaniaActiva: CampaniaEvaluacion | null;
  totalAsignaciones: number;
  completadas: number;
  pendientes: number;
  vencidas: number;
  porcentajeCompletado: number;
  porcentajeCompletadoVista: number | null;
  porEstado: Array<{ estado: "Completadas" | "Pendientes" | "Vencidas"; cantidad: number }>;
  porCarrera: SecretariaCarreraProgress[];
  docentes: SecretariaAutoevaluacionRow[];
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
  respuestas: string;
  observaciones: string;
  firma: string;
  firmaHash?: string | null;
  cantidadRespuestas: number;
}

export interface CompletarAutoevaluacionInput {
  firmaHash: string;
  firmaBase64: string;
}
