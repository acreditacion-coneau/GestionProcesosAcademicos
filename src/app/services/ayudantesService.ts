// ============================================================
// AYUDANTES SERVICE — Backend-ready service layer
// All functions return Promises for drop-in API replacement.
// Replace the mock implementations with real fetch/axios calls.
// ============================================================

import type { TramiteAyudante, FaseTramite, AlumnoPostulante, HistorialEntry, CarreraOption, RegimenTipo } from "../types/tramites";

// ── Helpers ──────────────────────────────────────────────────
function generateId(): string {
  return `AYD-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

function now(): string {
  return new Date().toISOString();
}

// ── Seed data for prototype ───────────────────────────────────
const SEED_TRAMITES: TramiteAyudante[] = [
  {
    id: "AYD-SEED-001",
    fechaSolicitud: "2026-03-15",
    carrera: "Arquitectura",
    anioCarrera: "2do",
    asignatura: "Diseño Arquitectónico I",
    regimen: "Semestral",
    responsableNombre: "Dra. Ana Sánchez",
    responsableDni: "23456789",
    responsableEmail: "a.sanchez@faud.edu.ar",
    alumnos: [{ nombre: "María López", dni: "45678901" }],
    faseActual: "FASE_2_VERIFICACION",
    historial: [
      {
        fecha: "2026-03-15T10:00:00Z",
        fase: "FASE_1_SOLICITUD",
        actor: "Dra. Ana Sánchez",
        rolActor: "DOCENTE_RESPONSABLE",
        accion: "Solicitud creada",
      },
    ],
    createdAt: "2026-03-15T10:00:00Z",
    updatedAt: "2026-03-15T10:00:00Z",
  },
  {
    id: "AYD-SEED-002",
    fechaSolicitud: "2026-04-01",
    carrera: "Diseño Industrial",
    anioCarrera: "3ro",
    asignatura: "Morfología",
    regimen: "Anual",
    responsableNombre: "Dra. Ana Sánchez",
    responsableDni: "23456789",
    responsableEmail: "a.sanchez@faud.edu.ar",
    alumnos: [{ nombre: "Lucas Fernández", dni: "46789012" }],
    fichaAcademica: "ficha_lucas_fernandez.pdf",
    notaAlumno: 9.2,
    verificadoPor: "Admin Mesa de Ayuda",
    fechaVerificacion: "2026-04-02T14:00:00Z",
    faseActual: "FASE_3_VALIDACION_JEFE",
    historial: [
      {
        fecha: "2026-04-01T09:00:00Z",
        fase: "FASE_1_SOLICITUD",
        actor: "Dra. Ana Sánchez",
        rolActor: "DOCENTE_RESPONSABLE",
        accion: "Solicitud creada",
      },
      {
        fecha: "2026-04-02T14:00:00Z",
        fase: "FASE_2_VERIFICACION",
        actor: "Admin Mesa de Ayuda",
        rolActor: "ADMINISTRATIVO",
        accion: "Verificación completada. Ficha adjunta. Nota: 9.2",
      },
    ],
    createdAt: "2026-04-01T09:00:00Z",
    updatedAt: "2026-04-02T14:00:00Z",
  },
  {
    id: "AYD-SEED-003",
    fechaSolicitud: "2026-02-10",
    carrera: "Arquitectura",
    anioCarrera: "4to",
    asignatura: "Proyecto Urbano",
    regimen: "Anual",
    responsableNombre: "Dra. Ana Sánchez",
    responsableDni: "23456789",
    responsableEmail: "a.sanchez@faud.edu.ar",
    alumnos: [{ nombre: "Valentina Ríos", dni: "44567890" }],
    fichaAcademica: "ficha_valentina_rios.pdf",
    notaAlumno: 8.5,
    verificadoPor: "Admin Mesa de Ayuda",
    fechaVerificacion: "2026-02-11T11:00:00Z",
    aprobadoJefeInicio: true,
    comentarioJefeInicio: "Alumna apta, excelente historial académico.",
    fechaVistoBuenoInicio: "2026-02-12T09:30:00Z",
    rfInicio: "RF-2026-015",
    fechaRfInicio: "2026-02-13T16:00:00Z",
    faseActual: "FASE_5_INFORME_DOCENTE",
    historial: [
      { fecha: "2026-02-10T08:00:00Z", fase: "FASE_1_SOLICITUD", actor: "Dra. Ana Sánchez", rolActor: "DOCENTE_RESPONSABLE", accion: "Solicitud creada" },
      { fecha: "2026-02-11T11:00:00Z", fase: "FASE_2_VERIFICACION", actor: "Admin Mesa de Ayuda", rolActor: "ADMINISTRATIVO", accion: "Verificación completada. Nota: 8.5" },
      { fecha: "2026-02-12T09:30:00Z", fase: "FASE_3_VALIDACION_JEFE", actor: "Arq. Roberto Díaz", rolActor: "JEFE_CARRERA", accion: "Visto Bueno otorgado. Alumna apta." },
      { fecha: "2026-02-13T16:00:00Z", fase: "FASE_4_INICIO_SECRETARIA", actor: "Secretaría Académica", rolActor: "SECRETARIA", accion: "RF de Inicio emitida: RF-2026-015" },
    ],
    createdAt: "2026-02-10T08:00:00Z",
    updatedAt: "2026-02-13T16:00:00Z",
  },
  {
    id: "AYD-SEED-004",
    fechaSolicitud: "2026-01-20",
    carrera: "Arquitectura",
    anioCarrera: "3ro",
    asignatura: "Diseño Arquitectónico II",
    regimen: "Anual",
    responsableNombre: "Dra. Ana Sánchez",
    responsableDni: "23456789",
    responsableEmail: "a.sanchez@faud.edu.ar",
    alumnos: [{ nombre: "Tomás Herrera", dni: "43456789" }],
    fichaAcademica: "ficha_tomas_herrera.pdf",
    notaAlumno: 8.0,
    verificadoPor: "Admin Mesa de Ayuda",
    fechaVerificacion: "2026-01-21T10:00:00Z",
    aprobadoJefeInicio: true,
    comentarioJefeInicio: "Aprobado.",
    fechaVistoBuenoInicio: "2026-01-22T09:00:00Z",
    rfInicio: "RF-2026-008",
    fechaRfInicio: "2026-01-23T15:00:00Z",
    informeDesempeno: "El alumno Tomás Herrera demostró un desempeño excelente durante el cursado. Participó activamente en todas las clases prácticas, colaboró con los estudiantes y cumplió con todas las tareas asignadas.",
    fechaInforme: "2026-07-02T12:00:00Z",
    faseActual: "FASE_6_CIERRE_JEFE",
    historial: [
      { fecha: "2026-01-20T08:00:00Z", fase: "FASE_1_SOLICITUD", actor: "Dra. Ana Sánchez", rolActor: "DOCENTE_RESPONSABLE", accion: "Solicitud creada" },
      { fecha: "2026-01-21T10:00:00Z", fase: "FASE_2_VERIFICACION", actor: "Admin Mesa de Ayuda", rolActor: "ADMINISTRATIVO", accion: "Verificación OK. Nota: 8.0" },
      { fecha: "2026-01-22T09:00:00Z", fase: "FASE_3_VALIDACION_JEFE", actor: "Arq. Roberto Díaz", rolActor: "JEFE_CARRERA", accion: "Visto Bueno otorgado." },
      { fecha: "2026-01-23T15:00:00Z", fase: "FASE_4_INICIO_SECRETARIA", actor: "Secretaría Académica", rolActor: "SECRETARIA", accion: "RF de Inicio emitida: RF-2026-008" },
      { fecha: "2026-07-02T12:00:00Z", fase: "FASE_5_INFORME_DOCENTE", actor: "Dra. Ana Sánchez", rolActor: "DOCENTE_RESPONSABLE", accion: "Informe de desempeño cargado." },
    ],
    createdAt: "2026-01-20T08:00:00Z",
    updatedAt: "2026-07-02T12:00:00Z",
  },
];

// ── In-memory store (replace with DB in production) ───────────
let tramitesStore: TramiteAyudante[] = [...SEED_TRAMITES];

// ── CRUD Operations ───────────────────────────────────────────

/**
 * GET all tramites
 * Backend: GET /api/ayudantes/tramites
 */
export async function getTramites(): Promise<TramiteAyudante[]> {
  await new Promise(r => setTimeout(r, 50)); // simulate latency
  return [...tramitesStore];
}

/**
 * GET tramites by rol (filter for current user)
 * Backend: GET /api/ayudantes/tramites?fase=...&rol=...
 */
export async function getTramitesByFase(fase: FaseTramite): Promise<TramiteAyudante[]> {
  await new Promise(r => setTimeout(r, 50));
  return tramitesStore.filter(t => t.faseActual === fase);
}

/**
 * GET tramites by docente DNI
 * Backend: GET /api/ayudantes/tramites?responsableDni=...
 */
export async function getTramitesByResponsable(dni: string): Promise<TramiteAyudante[]> {
  await new Promise(r => setTimeout(r, 50));
  return tramitesStore.filter(t => t.responsableDni === dni);
}

/**
 * POST create new tramite (Phase 1)
 * Backend: POST /api/ayudantes/tramites
 */
export async function crearTramite(data: {
  carrera: CarreraOption;
  anioCarrera: string;
  asignatura: string;
  regimen: RegimenTipo;
  responsableNombre: string;
  responsableDni: string;
  responsableEmail: string;
  alumnos: AlumnoPostulante[];
}): Promise<TramiteAyudante> {
  await new Promise(r => setTimeout(r, 100));
  const timestamp = now();
  const nuevo: TramiteAyudante = {
    id: generateId(),
    fechaSolicitud: new Date().toISOString().split("T")[0],
    ...data,
    faseActual: "FASE_2_VERIFICACION",
    historial: [{
      fecha: timestamp,
      fase: "FASE_1_SOLICITUD",
      actor: data.responsableNombre,
      rolActor: "DOCENTE_RESPONSABLE",
      accion: "Solicitud creada y enviada a verificación administrativa.",
    }],
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  tramitesStore = [...tramitesStore, nuevo];
  return nuevo;
}

/**
 * PATCH advance tramite to next phase (generic)
 * Backend: PATCH /api/ayudantes/tramites/:id
 */
async function actualizarTramite(id: string, updates: Partial<TramiteAyudante>, historialEntry: HistorialEntry): Promise<TramiteAyudante> {
  await new Promise(r => setTimeout(r, 100));
  const idx = tramitesStore.findIndex(t => t.id === id);
  if (idx === -1) throw new Error(`Trámite ${id} no encontrado`);
  const updated: TramiteAyudante = {
    ...tramitesStore[idx],
    ...updates,
    historial: [...tramitesStore[idx].historial, historialEntry],
    updatedAt: now(),
  };
  tramitesStore = tramitesStore.map(t => t.id === id ? updated : t);
  return updated;
}

/** Phase 2: Administrativo verifica y adjunta ficha */
export async function verificarTramite(id: string, datos: {
  fichaAcademica: string;
  notaAlumno: number;
  verificadoPor: string;
}): Promise<TramiteAyudante> {
  return actualizarTramite(id, {
    ...datos,
    fechaVerificacion: now(),
    faseActual: "FASE_3_VALIDACION_JEFE",
  }, {
    fecha: now(),
    fase: "FASE_2_VERIFICACION",
    actor: datos.verificadoPor,
    rolActor: "ADMINISTRATIVO",
    accion: `Verificación completada. Ficha adjunta: ${datos.fichaAcademica}. Nota acreditada: ${datos.notaAlumno}`,
  });
}

/** Phase 3: Jefe de Carrera valida o rechaza */
export async function validarJefeInicio(id: string, datos: {
  aprobado: boolean;
  comentario: string;
  jefeNombre: string;
}): Promise<TramiteAyudante> {
  return actualizarTramite(id, {
    aprobadoJefeInicio: datos.aprobado,
    comentarioJefeInicio: datos.comentario,
    fechaVistoBuenoInicio: now(),
    faseActual: datos.aprobado ? "FASE_4_INICIO_SECRETARIA" : "RECHAZADO",
  }, {
    fecha: now(),
    fase: "FASE_3_VALIDACION_JEFE",
    actor: datos.jefeNombre,
    rolActor: "JEFE_CARRERA",
    accion: datos.aprobado
      ? `Visto Bueno otorgado. ${datos.comentario}`
      : `Solicitud rechazada. Motivo: ${datos.comentario}`,
  });
}

/** Phase 4: Secretaría emite RF de Inicio */
export async function emitirRfInicio(id: string, datos: {
  rfInicio: string;
  secretariaNombre: string;
}): Promise<TramiteAyudante> {
  return actualizarTramite(id, {
    rfInicio: datos.rfInicio,
    fechaRfInicio: now(),
    rfInicioUrl: `https://portal.faud.edu.ar/resoluciones/${datos.rfInicio}.pdf`,
    faseActual: "FASE_5_INFORME_DOCENTE",
  }, {
    fecha: now(),
    fase: "FASE_4_INICIO_SECRETARIA",
    actor: datos.secretariaNombre,
    rolActor: "SECRETARIA",
    accion: `RF de Inicio emitida: ${datos.rfInicio}. Documento incorporado al legajo del trámite.`,
  });
}

/** Phase 5: Docente sube informe de desempeño */
export async function subirInformeDesempeno(id: string, datos: {
  informeDesempeno: string;
  docenteNombre: string;
}): Promise<TramiteAyudante> {
  return actualizarTramite(id, {
    informeDesempeno: datos.informeDesempeno,
    fechaInforme: now(),
    faseActual: "FASE_6_CIERRE_JEFE",
  }, {
    fecha: now(),
    fase: "FASE_5_INFORME_DOCENTE",
    actor: datos.docenteNombre,
    rolActor: "DOCENTE_RESPONSABLE",
    accion: "Informe de desempeño cargado.",
  });
}

/** Phase 6: Jefe de Carrera aprueba cierre o lo devuelve */
export async function validarJefeCierre(id: string, datos: {
  aprobado: boolean;
  comentario: string;
  jefeNombre: string;
}): Promise<TramiteAyudante> {
  return actualizarTramite(id, {
    aprobadoJefeFinal: datos.aprobado,
    comentarioJefeFinal: datos.comentario,
    fechaVistoBuenoCierre: now(),
    faseActual: datos.aprobado ? "FASE_7_CIERRE_SECRETARIA" : "FASE_5_INFORME_DOCENTE",
  }, {
    fecha: now(),
    fase: "FASE_6_CIERRE_JEFE",
    actor: datos.jefeNombre,
    rolActor: "JEFE_CARRERA",
    accion: datos.aprobado
      ? `Cierre aprobado. ${datos.comentario}`
      : `Informe devuelto para corrección. Motivo: ${datos.comentario}`,
  });
}

/** Phase 7: Secretaría emite RF de Cierre */
export async function emitirRfCierre(id: string, datos: {
  rfCierre: string;
  secretariaNombre: string;
}): Promise<TramiteAyudante> {
  return actualizarTramite(id, {
    rfCierre: datos.rfCierre,
    fechaRfCierre: now(),
    rfCierreUrl: `https://portal.faud.edu.ar/resoluciones/${datos.rfCierre}.pdf`,
    faseActual: "FASE_8_SAT",
  }, {
    fecha: now(),
    fase: "FASE_7_CIERRE_SECRETARIA",
    actor: datos.secretariaNombre,
    rolActor: "SECRETARIA",
    accion: `RF de Cierre emitida: ${datos.rfCierre}.`,
  });
}

/** Phase 8: Jefe de Carrera confirma carga en SAT */
export async function confirmarCargaSAT(id: string, datos: {
  jefeNombre: string;
}): Promise<TramiteAyudante> {
  return actualizarTramite(id, {
    cargadoSAT: true,
    fechaCargaSAT: now(),
    faseActual: "COMPLETADO",
  }, {
    fecha: now(),
    fase: "FASE_8_SAT",
    actor: datos.jefeNombre,
    rolActor: "JEFE_CARRERA",
    accion: "Información cargada en sistema SAT externo. Trámite completado.",
  });
}
