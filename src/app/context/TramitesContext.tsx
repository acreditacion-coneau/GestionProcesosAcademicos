import React, { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { format } from "date-fns";
import type { Notificacion } from "../types/tramites";
import { emailService } from "../services/emailService";
import { archiveDocument } from "../services/archivoService";
import { hasSupabaseConfig, supabase } from "../../lib/supabaseClient";
import { useUser } from "./UserContext";

export type Role =
  | "DECANO"
  | "DOCENTE"
  | "DOCENTE_RESPONSABLE"
  | "ADMINISTRATIVO"
  | "JEFE_CARRERA"
  | "SECRETARIA"
  | "SEC_TECNICA"
  | "RESPONSABLE_EXTENSION"
  | "RESPONSABLE_INVESTIGACION"
  | "AYUDANTE_ALUMNO"
  | "AYUDANTE_ADSCRIPTO";

export type Status = "PENDIENTE" | "EN_REVISION" | "OBSERVADO" | "RECHAZADO" | "DEVUELTO" | "APROBADO" | "FINALIZADO";
export type EstadoSolicitud = "pendiente" | "en_revision" | "aprobada" | "rechazada" | "finalizada" | "cancelada";
export type Carrera = string;
export type Regimen = "Semestral" | "Anual";

export interface AlumnoPropuesto {
  nombreCompleto: string;
  dni: string;
  sexoGramatical: "F" | "M";
}

export interface Documento {
  id: string;
  nombre: string;
  tipo: "FICHA" | "INFORME" | "RF_INICIO" | "RF_CIERRE" | "CV" | "OTRO";
  fecha: string;
  url: string;
}

export interface Evento {
  id: string;
  fecha: string;
  actor: string;
  rol: Role;
  accion: string;
  comentario?: string;
  tipo: "SISTEMA" | "USUARIO" | "EMAIL";
}

export interface Tramite {
  id: string;
  idSolicitud: string;
  tipoSolicitud: string;
  materia: string;
  alumno: string;
  nota: number;
  notaAprobacion: number;
  fechaSolicitud: string;
  carrera: Carrera;
  anioCarrera: string;
  regimen: Regimen;
  alumnosPropuestos: AlumnoPropuesto[];
  faseActual: number;
  estado: Status;
  estadoSolicitud: EstadoSolicitud;
  responsableActual: Role;
  documentos: Documento[];
  historial: Evento[];
  fechaCreacion: string;
  fechaUltimaActualizacion: string;
}

export interface CicloConfig {
  inicioClases: string;
  finSemestre: string;
}

interface TramitesContextType {
  tramites: Tramite[];
  rolActivo: Role;
  setRolActivo: (rol: Role) => void;
  cicloConfig: CicloConfig;
  setCicloConfig: (config: CicloConfig) => void;
  crearTramite: (data: {
    carrera: Carrera;
    idCarrera?: string;
    anioCarrera: string;
    materia: string;
    idAsignatura?: string;
    regimen: Regimen;
    tipoSolicitud?: "ayudante_alumno" | "ayudante_adscripto";
    notaAprobacion: number;
    alumnosPropuestos: AlumnoPropuesto[];
    adjuntos?: File[];
  }) => Promise<void>;
  avanzarFase: (id: string, accion: string, comentario?: string, nuevoDoc?: Documento) => Promise<void>;
  rechazarTramite: (id: string, motivo: string) => Promise<void>;
  devolverTramite: (id: string, observaciones: string, faseDestino: number) => Promise<void>;
  notificaciones: Notificacion[];
  unreadCount: (rol: Role) => number;
  marcarLeida: (id: string) => void;
  marcarTodasLeidas: (rol: Role) => void;
  loading: boolean;
  error: string | null;
}

type GenericRow = Record<string, unknown>;

type SolicitudMeta = {
  notaAprobacion?: number;
  alumnos?: AlumnoPropuesto[];
  workflowStep?: number;
};

const TramitesContext = createContext<TramitesContextType | undefined>(undefined);

function createId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function getString(row: GenericRow, keys: string[], fallback = ""): string {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" || typeof value === "bigint") return String(value);
  }
  return fallback;
}

function getNumber(row: GenericRow, keys: string[], fallback = 0): number {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string") {
      const parsed = Number.parseFloat(value);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return fallback;
}

function splitNombreCompleto(nombreCompleto: string) {
  const normalized = nombreCompleto.trim().replace(/\s+/g, " ");
  if (!normalized) return { nombre: "", apellido: "" };
  const parts = normalized.split(" ");
  if (parts.length === 1) return { nombre: parts[0], apellido: "" };
  const apellido = parts.slice(-1).join(" ");
  const nombre = parts.slice(0, -1).join(" ");
  return { nombre, apellido };
}

function normalizeYearLabel(raw: string): string {
  const yearNumber = Number.parseInt(raw.replace(/\D/g, ""), 10);
  if (!Number.isFinite(yearNumber)) return raw.trim();
  if (yearNumber === 1) return "1ro";
  if (yearNumber === 2) return "2do";
  if (yearNumber === 3) return "3ro";
  if (yearNumber === 4) return "4to";
  if (yearNumber === 5) return "5to";
  return String(yearNumber);
}

function normalizeRegimen(raw: string): Regimen {
  return raw.toLowerCase().includes("anual") ? "Anual" : "Semestral";
}

function normalizeEstadoSolicitud(raw: string): EstadoSolicitud {
  const value = raw.toLowerCase().trim();
  if (value === "pendiente") return "pendiente";
  if (value === "en_revision") return "en_revision";
  if (value === "aprobada") return "aprobada";
  if (value === "rechazada") return "rechazada";
  if (value === "finalizada") return "finalizada";
  if (value === "cancelada") return "cancelada";
  return "pendiente";
}

function estadoToStatus(estado: EstadoSolicitud): Status {
  if (estado === "finalizada") return "FINALIZADO";
  if (estado === "rechazada" || estado === "cancelada") return "RECHAZADO";
  if (estado === "en_revision") return "EN_REVISION";
  if (estado === "aprobada") return "APROBADO";
  return "PENDIENTE";
}

function isAdscripto(tipo: string): boolean {
  const token = tipo.toLowerCase();
  return token.includes("adscripto");
}

function getWorkflowRolesByTipo(tipo: string): Role[] {
  if (isAdscripto(tipo)) {
    return ["JEFE_CARRERA", "SEC_TECNICA", "SECRETARIA"];
  }
  return [
    "ADMINISTRATIVO",
    "JEFE_CARRERA",
    "SECRETARIA",
    "DOCENTE_RESPONSABLE",
    "JEFE_CARRERA",
    "SECRETARIA",
    "JEFE_CARRERA",
  ];
}

function getMaxWorkflowStep(tipo: string): number {
  return getWorkflowRolesByTipo(tipo).length + 1;
}

function fallbackStepFromEstado(tipo: string, estado: EstadoSolicitud): number {
  if (estado === "finalizada") return getMaxWorkflowStep(tipo) + 1;
  if (estado === "rechazada" || estado === "cancelada") return 3;
  if (isAdscripto(tipo)) {
    if (estado === "pendiente") return 2;
    if (estado === "en_revision") return 3;
    if (estado === "aprobada") return 4;
    return 2;
  }
  if (estado === "pendiente") return 2;
  if (estado === "en_revision") return 3;
  if (estado === "aprobada") return 7;
  return 2;
}

function extractWorkflowStep(historial: Evento[]): number | null {
  for (let index = historial.length - 1; index >= 0; index -= 1) {
    const action = historial[index]?.accion ?? "";
    const match = action.match(/WF_STEP_(\d+)/i);
    if (match) {
      const parsed = Number.parseInt(match[1], 10);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return null;
}

function resolveWorkflowStep(tipo: string, estado: EstadoSolicitud, meta?: SolicitudMeta, historial?: Evento[]): number {
  if (typeof meta?.workflowStep === "number" && Number.isFinite(meta.workflowStep)) {
    return meta.workflowStep;
  }
  const fromHistorial = historial ? extractWorkflowStep(historial) : null;
  if (fromHistorial) return fromHistorial;
  return fallbackStepFromEstado(tipo, estado);
}

function workflowEstadoFromStep(tipo: string, step: number): EstadoSolicitud {
  const maxStep = getMaxWorkflowStep(tipo);
  if (step > maxStep) return "finalizada";
  if (step >= maxStep) return "aprobada";
  if (step <= 2) return "pendiente";
  return "en_revision";
}

function getResponsablePorWorkflow(tipo: string, step: number, estado: EstadoSolicitud): Role {
  if (estado === "finalizada" || estado === "rechazada" || estado === "cancelada") {
    return "DOCENTE_RESPONSABLE";
  }
  const roles = getWorkflowRolesByTipo(tipo);
  const index = Math.min(Math.max(step - 2, 0), roles.length - 1);
  return roles[index];
}

function getNextWorkflowStep(tipo: string, step: number): number {
  const maxStep = getMaxWorkflowStep(tipo);
  return Math.min(step + 1, maxStep + 1);
}

function parseObservacionesMeta(raw: string): SolicitudMeta {
  if (!raw.trim()) return {};
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const nota = typeof parsed.notaAprobacion === "number" ? parsed.notaAprobacion : undefined;
    const workflowStep = typeof parsed.workflowStep === "number" ? parsed.workflowStep : undefined;
    const alumnosRaw = Array.isArray(parsed.alumnos) ? parsed.alumnos : [];
    const alumnos = alumnosRaw
      .map((item) => {
        const row = item as Record<string, unknown>;
        const nombreCompleto = typeof row.nombreCompleto === "string" ? row.nombreCompleto.trim() : "";
        const dni = typeof row.dni === "string" ? row.dni.trim() : "";
        const sexo = row.sexoGramatical === "M" ? "M" : "F";
        if (!nombreCompleto || !dni) return null;
        return { nombreCompleto, dni, sexoGramatical: sexo } as AlumnoPropuesto;
      })
      .filter((item): item is AlumnoPropuesto => Boolean(item));

    return { notaAprobacion: nota, workflowStep, alumnos };
  } catch {
    return {};
  }
}

function buildEvento(actor: string, rol: Role, accion: string, comentario?: string, tipo: Evento["tipo"] = "USUARIO"): Evento {
  return {
    id: createId("evt"),
    fecha: new Date().toISOString(),
    actor,
    rol,
    accion,
    comentario,
    tipo,
  };
}

function cleanDni(raw: string): string {
  return raw.replace(/\D/g, "");
}

function mapCategoriaToDocumentoTipo(raw: string): Documento["tipo"] {
  const token = raw.toUpperCase();
  if (token.includes("FICHA")) return "FICHA";
  if (token.includes("INFORME")) return "INFORME";
  if (token.includes("RF_INICIO")) return "RF_INICIO";
  if (token.includes("RF_CIERRE")) return "RF_CIERRE";
  if (token.includes("CV")) return "CV";
  return "OTRO";
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)));
}

function isRecoverableError(error: unknown): boolean {
  const code = (error as { code?: string })?.code;
  if (code && ["42P01", "42703", "PGRST205", "42501"].includes(code)) return true;
  const message = (error as { message?: string })?.message?.toLowerCase() ?? "";
  return message.includes("relation")
    || message.includes("column")
    || message.includes("does not exist")
    || message.includes("permission denied")
    || message.includes("forbidden");
}

export const TramitesProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useUser();
  const [tramites, setTramites] = useState<Tramite[]>([]);
  const [rolActivo, setRolActivo] = useState<Role>("DOCENTE");
  const [cicloConfigState, setCicloConfigState] = useState<CicloConfig>({
    inicioClases: format(new Date(new Date().getFullYear(), 2, 1), "yyyy-MM-dd"),
    finSemestre: format(new Date(new Date().getFullYear(), 6, 15), "yyyy-MM-dd"),
  });
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const crearNotificacion = (data: Omit<Notificacion, "id" | "fecha" | "leida">) => {
    const notif: Notificacion = {
      id: createId("notif"),
      fecha: new Date().toISOString(),
      leida: false,
      ...data,
    };
    setNotificaciones((prev) => [notif, ...prev]);
  };

  const unreadCount = (rol: Role) => notificaciones.filter((n) => n.rolDestino === rol && !n.leida).length;

  const marcarLeida = (id: string) => {
    setNotificaciones((prev) => prev.map((n) => (n.id === id ? { ...n, leida: true } : n)));
  };

  const marcarTodasLeidas = (rol: Role) => {
    setNotificaciones((prev) => prev.map((n) => (n.rolDestino === rol ? { ...n, leida: true } : n)));
  };

  const persistCicloConfig = async (config: CicloConfig) => {
    if (!hasSupabaseConfig) return;
    const nowIso = new Date().toISOString();

    const { error: upsertError } = await supabase.from("configuracion_sistema").upsert(
      [
        {
          clave: "inicio_clases",
          valor: config.inicioClases,
          descripcion: "Inicio de clases del ciclo lectivo",
          updated_at: nowIso,
        },
        {
          clave: "fin_semestre",
          valor: config.finSemestre,
          descripcion: "Fin del semestre/ciclo",
          updated_at: nowIso,
        },
      ],
      { onConflict: "clave" },
    );

    if (upsertError) {
      throw new Error(`No se pudo guardar configuracion_sistema: ${upsertError.message}`);
    }
  };

  const setCicloConfig = (config: CicloConfig) => {
    setCicloConfigState(config);
    persistCicloConfig(config).catch((configError) => {
      const message = configError instanceof Error ? configError.message : "No se pudo persistir la configuracion.";
      setError(message);
    });
  };

  const loadCicloConfig = async () => {
    if (!hasSupabaseConfig) return;

    const { data, error: cfgError } = await supabase
      .from("configuracion_sistema")
      .select("clave,valor")
      .in("clave", ["inicio_clases", "fin_semestre", "inicioClases", "finSemestre"]);

    if (cfgError) {
      throw new Error(`No se pudo cargar configuracion_sistema: ${cfgError.message}`);
    }

    const rows = (data ?? []) as GenericRow[];
    const byKey = new Map<string, string>();
    for (const row of rows) {
      const key = getString(row, ["clave"], "").toLowerCase();
      const value = getString(row, ["valor"], "");
      if (!key || !value) continue;
      byKey.set(key, value);
    }

    const inicioClases = byKey.get("inicio_clases") || byKey.get("inicioclases") || cicloConfigState.inicioClases;
    const finSemestre = byKey.get("fin_semestre") || byKey.get("finsemestre") || cicloConfigState.finSemestre;

    setCicloConfigState({ inicioClases, finSemestre });
  };

  const fetchSolicitudesWithFallback = async () => {
    const orderCandidates = ["fecha_creacion", "fecha_actualizacion"];
    let lastError: unknown = null;

    for (const orderBy of orderCandidates) {
      const result = await supabase
        .from("solicitudes")
        .select("*")
        .order(orderBy, { ascending: false });

      if (!result.error) return result;
      if (!isRecoverableError(result.error)) {
        throw new Error(`No se pudo consultar solicitudes: ${result.error.message}`);
      }
      lastError = result.error;
    }

    const fallback = await supabase.from("solicitudes").select("*");
    if (fallback.error) {
      throw new Error(`No se pudo consultar solicitudes: ${fallback.error.message}`);
    }
    if (lastError) {
      console.warn("Se consulto solicitudes sin orden por incompatibilidad de columnas:", lastError);
    }
    return fallback;
  };

  const updateSolicitudWithFallback = async (idSolicitud: string, fields: Record<string, unknown>) => {
    const nowIso = new Date().toISOString();
    const candidates: Record<string, unknown>[] = [
      { ...fields, updated_at: nowIso },
      { ...fields, fecha_actualizacion: nowIso },
      { ...fields },
    ];

    let recoverableFailure = false;
    for (const payload of candidates) {
      const { error: updateError } = await supabase
        .from("solicitudes")
        .update(payload)
        .eq("id_solicitud", idSolicitud);

      if (!updateError) return;
      if (!isRecoverableError(updateError)) {
        throw new Error(`No se pudo actualizar solicitudes: ${updateError.message}`);
      }
      recoverableFailure = true;
    }

    if (recoverableFailure) {
      throw new Error("No se pudo actualizar solicitudes con columnas compatibles.");
    }
  };

  const loadTramites = async () => {
    if (!hasSupabaseConfig) {
      setTramites([]);
      setError("Supabase no esta configurado. Defina VITE_SUPABASE_PROJECT_ID y VITE_SUPABASE_ANON_KEY.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await loadCicloConfig();

      const { data: solicitudesData } = await fetchSolicitudesWithFallback();

      const solicitudes = (solicitudesData ?? []) as GenericRow[];
      if (solicitudes.length === 0) {
        setTramites([]);
        return;
      }

      const solicitudIds = unique(solicitudes.map((row) => getString(row, ["id_solicitud"], "")));
      const asignaturaIds = unique(solicitudes.map((row) => getString(row, ["id_asignatura"], "")));
      const carreraIdsFromSolicitud = unique(solicitudes.map((row) => getString(row, ["id_carrera"], "")));

      const [asignaturasRes, carrerasRes, historialRes, postulantesRes, documentosSolicitudRes] = await Promise.all([
        asignaturaIds.length > 0
          ? supabase
              .from("asignaturas")
              .select("id_asignatura,nombre,anio,regimen,id_carrera")
              .in("id_asignatura", asignaturaIds)
          : Promise.resolve({ data: [], error: null }),
        carreraIdsFromSolicitud.length > 0
          ? supabase
              .from("carreras")
              .select("id_carrera,nombre")
              .in("id_carrera", carreraIdsFromSolicitud)
          : Promise.resolve({ data: [], error: null }),
        supabase
          .from("historial_solicitudes")
          .select("*")
          .in("id_solicitud", solicitudIds)
          .order("fecha", { ascending: true }),
        supabase
          .from("solicitud_postulantes")
          .select("*")
          .in("id_solicitud", solicitudIds),
        supabase
          .from("documentos_solicitud")
          .select("*")
          .in("id_solicitud", solicitudIds),
      ]);

      if (asignaturasRes.error) throw new Error(`No se pudo consultar asignaturas: ${asignaturasRes.error.message}`);
      if (carrerasRes.error) throw new Error(`No se pudo consultar carreras: ${carrerasRes.error.message}`);
      if (historialRes.error) throw new Error(`No se pudo consultar historial_solicitudes: ${historialRes.error.message}`);
      if (postulantesRes.error && !isRecoverableError(postulantesRes.error)) {
        throw new Error(`No se pudo consultar solicitud_postulantes: ${postulantesRes.error.message}`);
      }

      const documentosSolicitudRows = documentosSolicitudRes.error
        ? []
        : (documentosSolicitudRes.data ?? []) as GenericRow[];
      const documentosSolicitudById = new Map<string, GenericRow[]>();
      for (const row of documentosSolicitudRows) {
        const idSolicitud = getString(row, ["id_solicitud"], "");
        if (!idSolicitud) continue;
        const bucket = documentosSolicitudById.get(idSolicitud) ?? [];
        bucket.push(row);
        documentosSolicitudById.set(idSolicitud, bucket);
      }

      let archivosRows: GenericRow[] = [];
      if (documentosSolicitudRes.error && isRecoverableError(documentosSolicitudRes.error)) {
        const { data: linksData, error: linksError } = await supabase
          .from("solicitudes_archivos")
          .select("id_solicitud,id_archivo")
          .in("id_solicitud", solicitudIds);
        if (linksError) throw new Error(`No se pudo consultar solicitudes_archivos: ${linksError.message}`);
        const linksRows = (linksData ?? []) as GenericRow[];
        const archivoIds = unique(linksRows.map((row) => getString(row, ["id_archivo"], "")));
        if (archivoIds.length > 0) {
          const archivosRes = await supabase
            .from("archivos")
            .select("*")
            .in("id_archivo", archivoIds);
          if (archivosRes.error) throw new Error(`No se pudo consultar archivos: ${archivosRes.error.message}`);
          archivosRows = (archivosRes.data ?? []) as GenericRow[];
        }
        for (const link of linksRows) {
          const idSolicitud = getString(link, ["id_solicitud"], "");
          const idArchivo = getString(link, ["id_archivo"], "");
          const archivo = archivosRows.find((item) => getString(item, ["id_archivo"], "") === idArchivo);
          if (!idSolicitud || !archivo) continue;
          const bucket = documentosSolicitudById.get(idSolicitud) ?? [];
          bucket.push({
            id_documento: getString(archivo, ["id_archivo"], ""),
            id_solicitud: idSolicitud,
            tipo_documento: getString(archivo, ["categoria"], "otro"),
            nombre_archivo: getString(archivo, ["nombre_original"], "Documento.pdf"),
            ruta_storage: getString(archivo, ["nombre_storage"], ""),
            url_publica: getString(archivo, ["url_publica"], ""),
            fecha_subida: getString(archivo, ["created_at"], new Date().toISOString()),
          });
          documentosSolicitudById.set(idSolicitud, bucket);
        }
      } else if (documentosSolicitudRes.error) {
        throw new Error(`No se pudo consultar documentos_solicitud: ${documentosSolicitudRes.error.message}`);
      }

      const asignaturasRows = (asignaturasRes.data ?? []) as GenericRow[];
      const carrerasRows = (carrerasRes.data ?? []) as GenericRow[];
      const historialRows = (historialRes.data ?? []) as GenericRow[];
      const postulantesRows = postulantesRes.error ? [] : (postulantesRes.data ?? []) as GenericRow[];

      const carrerasById = new Map<string, GenericRow>();
      for (const row of carrerasRows) {
        carrerasById.set(getString(row, ["id_carrera"], ""), row);
      }

      for (const asig of asignaturasRows) {
        const idCarrera = getString(asig, ["id_carrera"], "");
        if (idCarrera && !carrerasById.has(idCarrera)) {
          carrerasById.set(idCarrera, { id_carrera: idCarrera, nombre: "" });
        }
      }

      const missingCarreraIds = Array.from(carrerasById.entries())
        .filter(([, row]) => !getString(row, ["nombre"], ""))
        .map(([id]) => id);

      if (missingCarreraIds.length > 0) {
        const missingRes = await supabase
          .from("carreras")
          .select("id_carrera,nombre")
          .in("id_carrera", missingCarreraIds);

        if (!missingRes.error) {
          for (const row of (missingRes.data ?? []) as GenericRow[]) {
            carrerasById.set(getString(row, ["id_carrera"], ""), row);
          }
        }
      }

      const asignaturasById = new Map<string, GenericRow>();
      for (const row of asignaturasRows) {
        asignaturasById.set(getString(row, ["id_asignatura"], ""), row);
      }

      const postulantesBySolicitud = new Map<string, AlumnoPropuesto[]>();
      for (const row of postulantesRows) {
        const idSolicitud = getString(row, ["id_solicitud"], "");
        if (!idSolicitud) continue;
        const nombre = getString(row, ["nombre"], "");
        const apellido = getString(row, ["apellido"], "");
        const dni = cleanDni(getString(row, ["dni"], ""));
        if (!nombre && !apellido && !dni) continue;
        const bucket = postulantesBySolicitud.get(idSolicitud) ?? [];
        bucket.push({
          nombreCompleto: `${nombre} ${apellido}`.trim(),
          dni,
          sexoGramatical: "F",
        });
        postulantesBySolicitud.set(idSolicitud, bucket);
      }

      const archivosBySolicitud = new Map<string, Documento[]>();
      for (const [idSolicitud, docs] of documentosSolicitudById.entries()) {
        const list = archivosBySolicitud.get(idSolicitud) ?? [];
        for (const doc of docs) {
          const storagePath = getString(doc, ["ruta_storage", "nombre_storage"], "");
          const publicUrl = getString(doc, ["url_publica"], "");
          const url = publicUrl || (storagePath
            ? supabase.storage.from("documentos").getPublicUrl(storagePath).data.publicUrl
            : "#");
          list.push({
            id: getString(doc, ["id_documento", "id_archivo", "id"], createId("doc")),
            nombre: getString(doc, ["nombre_archivo", "nombre_original"], "Documento.pdf"),
            tipo: mapCategoriaToDocumentoTipo(getString(doc, ["tipo_documento", "categoria"], "OTRO")),
            fecha: getString(doc, ["fecha_subida", "created_at"], new Date().toISOString()),
            url,
          });
        }
        archivosBySolicitud.set(idSolicitud, list);
      }

      const historialBySolicitud = new Map<string, Evento[]>();
      for (const row of historialRows) {
        const idSolicitud = getString(row, ["id_solicitud"], "");
        if (!idSolicitud) continue;
        const list = historialBySolicitud.get(idSolicitud) ?? [];

        const estadoAnterior = getString(row, ["estado_anterior"], "");
        const estadoNuevo = getString(row, ["estado_nuevo"], "");
        const accionBase = getString(row, ["accion"], "Actualizacion de solicitud");
        const accion = estadoAnterior || estadoNuevo
          ? `${accionBase} (${estadoAnterior || "-"} -> ${estadoNuevo || "-"})`
          : accionBase;

        list.push({
          id: getString(row, ["id_historial"], createId("hist")),
          fecha: getString(row, ["fecha"], new Date().toISOString()),
          actor: getString(row, ["usuario_accion", "realizado_por"], "Sistema"),
          rol: "DOCENTE_RESPONSABLE",
          accion,
          comentario: getString(row, ["observacion"], ""),
          tipo: "SISTEMA",
        });
        historialBySolicitud.set(idSolicitud, list);
      }

      const mappedTramites: Tramite[] = solicitudes.map((row) => {
        const idSolicitud = getString(row, ["id_solicitud"], "");
        const tipoSolicitud = getString(row, ["tipo_solicitud", "tipo"], "ayudante_alumno");
        const estadoSolicitud = normalizeEstadoSolicitud(getString(row, ["estado"], "pendiente"));
        const idAsignatura = getString(row, ["id_asignatura"], "");
        const idCarrera = getString(row, ["id_carrera"], "");

        const asignatura = asignaturasById.get(idAsignatura);
        const carreraFromAsignatura = getString(asignatura ?? {}, ["id_carrera"], "");
        const carrera = carrerasById.get(idCarrera || carreraFromAsignatura);

        const materia = getString(asignatura ?? {}, ["nombre"], "");
        const carreraNombre = getString(carrera ?? {}, ["nombre"], "Sin carrera");
        const anioCarrera = normalizeYearLabel(getString(asignatura ?? {}, ["anio"], ""));
        const regimen = normalizeRegimen(getString(asignatura ?? {}, ["regimen"], "Semestral"));

        const nombreAlumno = getString(row, ["nombre_alumno", "nombre"], "");
        const apellidoAlumno = getString(row, ["apellido_alumno", "apellido"], "");
        const dniAlumno = cleanDni(getString(row, ["dni_alumno", "dni"], ""));
        const observacionesRaw = getString(row, ["observaciones"], "");
        const meta = parseObservacionesMeta(observacionesRaw);

        const alumnosFromTable = postulantesBySolicitud.get(idSolicitud) ?? [];
        const alumnosFromMeta = meta.alumnos ?? [];
        const alumnosPropuestos = alumnosFromTable.length > 0
          ? alumnosFromTable
          : alumnosFromMeta.length > 0
          ? alumnosFromMeta
          : (nombreAlumno || dniAlumno)
            ? [{ nombreCompleto: `${nombreAlumno} ${apellidoAlumno}`.trim(), dni: dniAlumno, sexoGramatical: "F" as const }]
            : [];

        const notaAprobacion = meta.notaAprobacion ?? getNumber(row, ["nota_aprobacion"], 8);

        const fechaSolicitud = getString(row, ["fecha_creacion", "fecha_actualizacion"], new Date().toISOString());
        const createdAt = getString(row, ["fecha_creacion", "fecha_actualizacion"], fechaSolicitud);
        const updatedAt = getString(row, ["fecha_actualizacion", "updated_at"], createdAt);

        const historial = historialBySolicitud.get(idSolicitud) ?? [
          buildEvento("Sistema", "DOCENTE_RESPONSABLE", "WF_STEP_1_CREATED", `Estado: ${estadoSolicitud}`, "SISTEMA"),
        ];
        const faseActual = resolveWorkflowStep(tipoSolicitud, estadoSolicitud, meta, historial);
        const responsableActual = getResponsablePorWorkflow(tipoSolicitud, faseActual, estadoSolicitud);

        return {
          id: idSolicitud,
          idSolicitud,
          tipoSolicitud,
          materia,
          alumno: alumnosPropuestos[0]?.nombreCompleto ?? `${nombreAlumno} ${apellidoAlumno}`.trim(),
          nota: notaAprobacion,
          notaAprobacion,
          fechaSolicitud,
          carrera: carreraNombre,
          anioCarrera,
          regimen,
          alumnosPropuestos,
          faseActual,
          estado: estadoToStatus(estadoSolicitud),
          estadoSolicitud,
          responsableActual,
          documentos: archivosBySolicitud.get(idSolicitud) ?? [],
          historial,
          fechaCreacion: createdAt,
          fechaUltimaActualizacion: updatedAt,
        };
      });

      setTramites(mappedTramites);
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : "No se pudieron cargar los tramites.";
      setError(message);
      setTramites([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTramites();
  }, []);

  const resolveCarreraIdByNombre = async (carrera: string): Promise<string> => {
    const { data, error: carreraError } = await supabase
      .from("carreras")
      .select("id_carrera,nombre")
      .ilike("nombre", carrera.trim())
      .limit(1)
      .maybeSingle();

    if (carreraError || !data) {
      throw new Error(`No se encontro la carrera seleccionada. ${carreraError?.message ?? ""}`.trim());
    }

    return getString(data as GenericRow, ["id_carrera"], "");
  };

  const resolveAsignaturaId = async (params: {
    idAsignatura?: string;
    materia: string;
    idCarrera: string;
  }): Promise<string> => {
    if (params.idAsignatura?.trim()) return params.idAsignatura;

    const { data, error: asignaturaError } = await supabase
      .from("asignaturas")
      .select("id_asignatura")
      .eq("nombre", params.materia)
      .eq("id_carrera", params.idCarrera)
      .limit(1)
      .maybeSingle();

    if (asignaturaError || !data) {
      throw new Error(`No se encontro la asignatura seleccionada. ${asignaturaError?.message ?? ""}`.trim());
    }

    return getString(data as GenericRow, ["id_asignatura"], "");
  };

  const normalizeUserIdForFk = (): number | string | null => {
    if (!user.idUsuario) return null;
    if (/^\d+$/.test(user.idUsuario)) return Number.parseInt(user.idUsuario, 10);
    return user.idUsuario;
  };

  const appendHistorial = async (params: {
    idSolicitud: string;
    accion: string;
    observacion?: string | null;
    estadoAnterior?: string | null;
    estadoNuevo?: string | null;
    fechaIso: string;
  }) => {
    const userIdFk = normalizeUserIdForFk();
    const payloadNew = {
      id_solicitud: params.idSolicitud,
      accion: params.accion,
      observacion: params.observacion ?? null,
      usuario_accion: userIdFk,
      fecha: params.fechaIso,
    };

    const insertNew = await supabase.from("historial_solicitudes").insert(payloadNew);
    if (!insertNew.error) return;
    if (!isRecoverableError(insertNew.error)) {
      throw new Error(`No se pudo registrar historial_solicitudes: ${insertNew.error.message}`);
    }

    const payloadLegacy = {
      id_solicitud: params.idSolicitud,
      accion: params.accion,
      estado_anterior: params.estadoAnterior ?? null,
      estado_nuevo: params.estadoNuevo ?? null,
      observacion: params.observacion ?? null,
      realizado_por: userIdFk ?? user.dni,
      fecha: params.fechaIso,
    };
    const insertLegacy = await supabase.from("historial_solicitudes").insert(payloadLegacy);
    if (insertLegacy.error) {
      throw new Error(`No se pudo registrar historial_solicitudes: ${insertLegacy.error.message}`);
    }
  };

  const crearTramite = async (data: {
    carrera: Carrera;
    idCarrera?: string;
    anioCarrera: string;
    materia: string;
    idAsignatura?: string;
    regimen: Regimen;
    tipoSolicitud?: "ayudante_alumno" | "ayudante_adscripto";
    notaAprobacion: number;
    alumnosPropuestos: AlumnoPropuesto[];
    adjuntos?: File[];
  }) => {
    if (!hasSupabaseConfig) {
      throw new Error("Supabase no esta configurado.");
    }

    if (data.alumnosPropuestos.length === 0) {
      throw new Error("Debe cargar al menos un alumno.");
    }

    if (data.alumnosPropuestos.length > 2) {
      throw new Error("Una solicitud puede tener maximo 2 alumnos.");
    }

    const idCarrera = data.idCarrera?.trim() || (await resolveCarreraIdByNombre(data.carrera));
    const idAsignatura = await resolveAsignaturaId({
      idAsignatura: data.idAsignatura,
      materia: data.materia.trim(),
      idCarrera,
    });

    const nowIso = new Date().toISOString();
    const primerAlumno = data.alumnosPropuestos[0];
    const { nombre, apellido } = splitNombreCompleto(primerAlumno.nombreCompleto);

    const observacionesMeta = {
      notaAprobacion: data.notaAprobacion,
      alumnos: data.alumnosPropuestos,
    } satisfies SolicitudMeta;

    const tipoSolicitud = data.tipoSolicitud ?? "ayudante_alumno";
    const responsableFk = user.idDocente && /^\d+$/.test(user.idDocente) ? Number.parseInt(user.idDocente, 10) : user.idDocente ?? null;
    const userIdFk = normalizeUserIdForFk();

    let insertData: GenericRow | null = null;

    const insertNew = await supabase
      .from("solicitudes")
      .insert({
        tipo_solicitud: tipoSolicitud,
        id_asignatura: idAsignatura,
        id_responsable: responsableFk,
        estado: "pendiente",
        fecha_creacion: nowIso,
        fecha_actualizacion: nowIso,
        periodo: data.regimen,
        anio_academico: data.anioCarrera,
        observaciones: JSON.stringify({ ...observacionesMeta, workflowStep: 2 }),
      })
      .select("id_solicitud")
      .single();

    if (!insertNew.error && insertNew.data) {
      insertData = insertNew.data as GenericRow;
    } else {
      if (!isRecoverableError(insertNew.error)) {
        throw new Error(`No se pudo crear la solicitud: ${insertNew.error?.message ?? "sin detalle"}`);
      }
      const insertLegacy = await supabase
        .from("solicitudes")
        .insert({
          tipo: tipoSolicitud,
          estado: "pendiente",
          nombre_alumno: nombre,
          apellido_alumno: apellido,
          dni_alumno: cleanDni(primerAlumno.dni),
          email_alumno: "",
          legajo: null,
          id_carrera: idCarrera,
          id_asignatura: idAsignatura,
          asunto: `Solicitud ${tipoSolicitud.replace(/_/g, " ")} - ${data.materia.trim()}`,
          descripcion: `Solicitud creada desde portal FAU para ${data.materia.trim()} (${data.anioCarrera} - ${data.regimen}).`,
          observaciones: JSON.stringify({ ...observacionesMeta, workflowStep: 2 }),
          creado_por: userIdFk,
          fecha_creacion: nowIso,
          fecha_actualizacion: nowIso,
        })
        .select("id_solicitud")
        .single();

      if (insertLegacy.error || !insertLegacy.data) {
        throw new Error(`No se pudo crear la solicitud: ${insertLegacy.error?.message ?? "sin detalle"}`);
      }
      insertData = insertLegacy.data as GenericRow;
    }
    const idSolicitud = getString(insertData, ["id_solicitud"], "");

    const postulantesPayload = data.alumnosPropuestos.map((alumno) => {
      const [firstName, ...lastNameParts] = alumno.nombreCompleto.trim().split(" ");
      const apellidoAlumno = lastNameParts.length > 0 ? lastNameParts.join(" ") : "";
      return {
        id_solicitud: idSolicitud,
        nombre: firstName || alumno.nombreCompleto.trim(),
        apellido: apellidoAlumno,
        dni: cleanDni(alumno.dni),
        email: null,
        telefono: null,
        estado: "pendiente",
      };
    });

    const insertPostulantes = await supabase.from("solicitud_postulantes").insert(postulantesPayload);
    if (insertPostulantes.error && !isRecoverableError(insertPostulantes.error)) {
      throw new Error(`No se pudo guardar solicitud_postulantes: ${insertPostulantes.error.message}`);
    }

    await appendHistorial({
      idSolicitud,
      accion: "WF_STEP_1_CREATED",
      estadoAnterior: null,
      estadoNuevo: "pendiente",
      observacion: `Creada por ${user.nombre} ${user.apellido ?? ""}`.trim(),
      fechaIso: nowIso,
    });

    if (Array.isArray(data.adjuntos) && data.adjuntos.length > 0) {
      for (const file of data.adjuntos) {
        await archiveDocument({
          idSolicitud,
          tipo: file.name.toLowerCase().includes("cv") ? "CV" : "OTRO",
          fileName: file.name,
          blob: file,
          actor: user.rol,
          idUsuario: user.idUsuario,
        });
      }
    }

    const rolDestino = getResponsablePorWorkflow(tipoSolicitud, 2, "pendiente");

    crearNotificacion({
      tipo: "info",
      titulo: "Nueva solicitud para revision",
      mensaje: `${idSolicitud}: ${data.materia.trim()} - ${data.carrera}`,
      tramiteId: idSolicitud,
      rolDestino,
      destinatarioEmail: "mesa@faud.edu.ar",
    });

    await emailService.sendNotification(
      "mesa@faud.edu.ar",
      rolDestino,
      `Nueva solicitud ${idSolicitud}`,
      `Se creo una solicitud ${tipoSolicitud.replace(/_/g, " ")} para ${data.materia.trim()}.`,
    );

    await loadTramites();
  };

  const avanzarFase = async (id: string, accion: string, comentario?: string, _nuevoDoc?: Documento) => {
    const tramite = tramites.find((t) => t.id === id || t.idSolicitud === id);
    if (!tramite) throw new Error("No se encontro el tramite a actualizar.");

    if (tramite.estadoSolicitud === "finalizada" || tramite.estadoSolicitud === "rechazada" || tramite.estadoSolicitud === "cancelada") {
      throw new Error("El tramite ya esta cerrado y no admite cambios.");
    }

    const nextStep = getNextWorkflowStep(tramite.tipoSolicitud, tramite.faseActual);
    const nextEstado = workflowEstadoFromStep(tramite.tipoSolicitud, nextStep);
    const nowIso = new Date().toISOString();

    const mergedMeta = {
      notaAprobacion: tramite.notaAprobacion,
      alumnos: tramite.alumnosPropuestos,
      workflowStep: nextStep,
    } satisfies SolicitudMeta;

    await updateSolicitudWithFallback(tramite.idSolicitud, {
      estado: nextEstado,
      observaciones: JSON.stringify(mergedMeta),
    });

    await appendHistorial({
      idSolicitud: tramite.idSolicitud,
      accion: `WF_STEP_${nextStep}_${(accion.trim() || "AVANCE").toUpperCase()}`,
      estadoAnterior: tramite.estadoSolicitud,
      estadoNuevo: nextEstado,
      observacion: comentario?.trim() || null,
      fechaIso: nowIso,
    });

    if (nextEstado !== "finalizada" && nextEstado !== "rechazada" && nextEstado !== "cancelada") {
      const siguienteRol = getResponsablePorWorkflow(tramite.tipoSolicitud, nextStep, nextEstado);
      crearNotificacion({
        tipo: "info",
        titulo: "Solicitud actualizada",
        mensaje: `${tramite.idSolicitud}: avance de fase ${tramite.faseActual} a ${nextStep}.`,
        tramiteId: tramite.idSolicitud,
        rolDestino: siguienteRol,
      });
    }

    await loadTramites();
  };

  const rechazarTramite = async (id: string, motivo: string) => {
    const tramite = tramites.find((t) => t.id === id || t.idSolicitud === id);
    if (!tramite) throw new Error("No se encontro el tramite a rechazar.");

    const nowIso = new Date().toISOString();
    await updateSolicitudWithFallback(tramite.idSolicitud, {
      estado: "rechazada",
      observaciones: motivo,
    });

    await appendHistorial({
      idSolicitud: tramite.idSolicitud,
      accion: `WF_STEP_${tramite.faseActual}_RECHAZO`,
      estadoAnterior: tramite.estadoSolicitud,
      estadoNuevo: "rechazada",
      observacion: motivo,
      fechaIso: nowIso,
    });

    await loadTramites();
  };

  const devolverTramite = async (id: string, observaciones: string, _faseDestino: number) => {
    const tramite = tramites.find((t) => t.id === id || t.idSolicitud === id);
    if (!tramite) throw new Error("No se encontro el tramite a devolver.");

    const nowIso = new Date().toISOString();
    const rollbackStep = Math.max(2, tramite.faseActual - 1);
    const rollbackMeta = {
      notaAprobacion: tramite.notaAprobacion,
      alumnos: tramite.alumnosPropuestos,
      workflowStep: rollbackStep,
    } satisfies SolicitudMeta;

    await updateSolicitudWithFallback(tramite.idSolicitud, {
      estado: "pendiente",
      observaciones: JSON.stringify(rollbackMeta),
    });

    await appendHistorial({
      idSolicitud: tramite.idSolicitud,
      accion: `WF_STEP_${tramite.faseActual}_DEVOLUCION`,
      estadoAnterior: tramite.estadoSolicitud,
      estadoNuevo: "pendiente",
      observacion: observaciones,
      fechaIso: nowIso,
    });

    await loadTramites();
  };

  const contextValue = useMemo(
    () => ({
      tramites,
      rolActivo,
      setRolActivo,
      cicloConfig: cicloConfigState,
      setCicloConfig,
      crearTramite,
      avanzarFase,
      rechazarTramite,
      devolverTramite,
      notificaciones,
      unreadCount,
      marcarLeida,
      marcarTodasLeidas,
      loading,
      error,
    }),
    [tramites, rolActivo, cicloConfigState, notificaciones, loading, error],
  );

  return <TramitesContext.Provider value={contextValue}>{children}</TramitesContext.Provider>;
};

export const useTramites = () => {
  const context = useContext(TramitesContext);
  if (!context) {
    throw new Error("useTramites must be used within TramitesProvider");
  }
  return context;
};
