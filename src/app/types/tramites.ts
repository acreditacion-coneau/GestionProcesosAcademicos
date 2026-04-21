// ============================================================
// TYPES — Circuito de Designación de Ayudantes
// Ready for backend connection: replace service layer functions
// with real API calls. These types mirror the DB schema.
// ============================================================

export type Role = "DOCENTE" | "DOCENTE_RESPONSABLE" | "JEFE_CARRERA" | "SECRETARIA" | "ADMINISTRATIVO" | "SEC_TECNICA";

export type FaseTramite =
  | "FASE_1_SOLICITUD"        // Docente responsable carga datos
  | "FASE_2_VERIFICACION"     // Administrativo verifica y adjunta ficha
  | "FASE_3_VALIDACION_JEFE"  // Jefe de carrera da visto bueno inicial
  | "FASE_4_INICIO_SECRETARIA"// Secretaría emite RF de Inicio
  | "FASE_5_INFORME_DOCENTE"  // Docente sube informe de desempeño
  | "FASE_6_CIERRE_JEFE"      // Jefe de carrera aprueba informe final
  | "FASE_7_CIERRE_SECRETARIA"// Secretaría emite RF de Cierre
  | "FASE_8_SAT"              // Jefe de carrera carga en sistema SAT
  | "COMPLETADO"
  | "RECHAZADO";

export type RegimenTipo = "Semestral" | "Anual";
export type CarreraOption = "Arquitectura" | "Lic. en Diseño de Interiores" | "Diseño Industrial" | "Lic. en Gestión Eficiente de la Energía";

export interface AlumnoPostulante {
  nombre: string;
  dni: string;
}

export interface HistorialEntry {
  fecha: string;        // ISO string
  fase: FaseTramite;
  actor: string;        // nombre del actor
  rolActor: Role;
  accion: string;       // descripción de lo realizado
}

export interface TramiteAyudante {
  id: string;           // UUID — backend generates this

  // ── Fase 1: Datos del docente y solicitud ──
  fechaSolicitud: string;
  carrera: CarreraOption;
  anioCarrera: string;
  asignatura: string;
  regimen: RegimenTipo;
  responsableNombre: string;
  responsableDni: string;
  responsableEmail: string;
  alumnos: AlumnoPostulante[];

  // ── Fase 2: Verificación administrativa ──
  fichaAcademica?: string;      // file name / URL
  notaAlumno?: number;          // nota verificada en ficha
  verificadoPor?: string;       // nombre del admin
  fechaVerificacion?: string;

  // ── Fase 3: Validación Jefe de Carrera ──
  aprobadoJefeInicio?: boolean;
  comentarioJefeInicio?: string;
  fechaVistoBuenoInicio?: string;

  // ── Fase 4: RF de Inicio ──
  rfInicio?: string;            // número de resolución
  fechaRfInicio?: string;
  rfInicioUrl?: string;         // URL del PDF

  // ── Fase 5: Informe de desempeño ──
  informeDesempeno?: string;    // texto o URL archivo
  fechaInforme?: string;

  // ── Fase 6: Aprobación cierre Jefe ──
  aprobadoJefeFinal?: boolean;
  comentarioJefeFinal?: string;
  fechaVistoBuenoCierre?: string;

  // ── Fase 7: RF de Cierre ──
  rfCierre?: string;
  fechaRfCierre?: string;
  rfCierreUrl?: string;

  // ── Fase 8: Carga SAT ──
  cargadoSAT?: boolean;
  fechaCargaSAT?: string;

  // ── Meta ──
  faseActual: FaseTramite;
  historial: HistorialEntry[];
  createdAt: string;
  updatedAt: string;
}

// ── Notificaciones ──
export type TipoNotificacion = "alerta" | "info" | "exito";

export interface Notificacion {
  id: string;
  tipo: TipoNotificacion;
  titulo: string;
  mensaje: string;
  tramiteId?: string;
  rolDestino: Role;           // role that should see this
  destinatarioEmail?: string;
  fecha: string;
  leida: boolean;
}

// ── Email payload (ready for backend) ──
export interface EmailPayload {
  to: string;
  subject: string;
  body: string;
  tramiteId?: string;
}

// ── Phase metadata (labels, colors, actors) ──
export const FASE_META: Record<FaseTramite, {
  label: string;
  rolResponsable: Role;
  descripcion: string;
  color: string;
}> = {
  FASE_1_SOLICITUD:         { label: "Fase 1 — Solicitud",                 rolResponsable: "DOCENTE_RESPONSABLE", descripcion: "Responsable de cátedra carga la solicitud",          color: "#3b82f6" },
  FASE_2_VERIFICACION:      { label: "Fase 2 — Verificación",              rolResponsable: "ADMINISTRATIVO",      descripcion: "Administrativo verifica y adjunta ficha académica", color: "#8b5cf6" },
  FASE_3_VALIDACION_JEFE:   { label: "Fase 3 — Validación Jefe",           rolResponsable: "JEFE_CARRERA",        descripcion: "Jefe de carrera revisa el perfil y aprueba",       color: "#f59e0b" },
  FASE_4_INICIO_SECRETARIA: { label: "Fase 4 — RF de Inicio",              rolResponsable: "SECRETARIA",          descripcion: "Secretaría emite la Resolución de Inicio",         color: "#10b981" },
  FASE_5_INFORME_DOCENTE:   { label: "Fase 5 — Informe de Desempeño",      rolResponsable: "DOCENTE_RESPONSABLE", descripcion: "Docente sube informe al finalizar el cursado",     color: "#3b82f6" },
  FASE_6_CIERRE_JEFE:       { label: "Fase 6 — Validación Cierre",         rolResponsable: "JEFE_CARRERA",        descripcion: "Jefe de carrera revisa el informe final",          color: "#f59e0b" },
  FASE_7_CIERRE_SECRETARIA: { label: "Fase 7 — RF de Cierre",              rolResponsable: "SECRETARIA",          descripcion: "Secretaría emite la Resolución de Cierre",         color: "#10b981" },
  FASE_8_SAT:               { label: "Fase 8 — Carga SAT",                 rolResponsable: "JEFE_CARRERA",        descripcion: "Jefe de carrera carga en sistema SAT externo",     color: "#f59e0b" },
  COMPLETADO:               { label: "Completado",                          rolResponsable: "JEFE_CARRERA",        descripcion: "Trámite finalizado exitosamente",                  color: "#10b981" },
  RECHAZADO:                { label: "Rechazado",                           rolResponsable: "JEFE_CARRERA",        descripcion: "Trámite desestimado",                              color: "#ef4444" },
};

export const FASES_ORDERED: FaseTramite[] = [
  "FASE_1_SOLICITUD",
  "FASE_2_VERIFICACION",
  "FASE_3_VALIDACION_JEFE",
  "FASE_4_INICIO_SECRETARIA",
  "FASE_5_INFORME_DOCENTE",
  "FASE_6_CIERRE_JEFE",
  "FASE_7_CIERRE_SECRETARIA",
  "FASE_8_SAT",
  "COMPLETADO",
];
