import React, { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { format } from "date-fns";
import type { Notificacion } from "../types/tramites";
import { emailService } from "../services/emailService";
import { hasSupabaseConfig, supabase } from "../../lib/supabaseClient";
import { useUser } from "./UserContext";

export type Role = "DOCENTE" | "DOCENTE_RESPONSABLE" | "ADMINISTRATIVO" | "JEFE_CARRERA" | "SECRETARIA" | "SEC_TECNICA";
export type Status = "PENDIENTE" | "EN_REVISION" | "OBSERVADO" | "RECHAZADO" | "DEVUELTO" | "APROBADO" | "FINALIZADO";
export type EstadoSolicitud = "creada" | "en_verificacion" | "aprobada_jefe" | "en_secretaria" | "finalizada" | "rechazada";
export type Carrera = "Arquitectura" | "Lic. en Diseño de Interiores" | "Diseño Industrial" | "Lic. en Gestión Eficiente de la Energía";
export type Regimen = "Semestral" | "Anual";

export interface AlumnoPropuesto {
  nombreCompleto: string;
  dni: string;
  sexoGramatical: "F" | "M";
}

export interface Documento {
  id: string;
  nombre: string;
  tipo: "FICHA" | "INFORME" | "RF_INICIO" | "RF_CIERRE" | "OTRO";
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
    anioCarrera: string;
    materia: string;
    regimen: Regimen;
    notaAprobacion: number;
    alumnosPropuestos: AlumnoPropuesto[];
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
type RolSupabase = "docente" | "administrativo" | "jefe_carrera" | "secretaria";

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
    if (typeof value === "string" && value.trim()) {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return fallback;
}

function normalizeEstadoSolicitud(raw: string): EstadoSolicitud {
  const value = raw.toLowerCase().trim();
  if (value === "creada") return "creada";
  if (value === "en_verificacion") return "en_verificacion";
  if (value === "aprobada_jefe") return "aprobada_jefe";
  if (value === "en_secretaria") return "en_secretaria";
  if (value === "finalizada") return "finalizada";
  if (value === "rechazada") return "rechazada";
  return "creada";
}

function estadoToStatus(estado: EstadoSolicitud): Status {
  if (estado === "finalizada") return "FINALIZADO";
  if (estado === "rechazada") return "RECHAZADO";
  if (estado === "en_verificacion" || estado === "aprobada_jefe") return "EN_REVISION";
  return "PENDIENTE";
}

const getResponsablePorFase = (fase: number): Role => {
  switch (fase) {
    case 1:
      return "DOCENTE_RESPONSABLE";
    case 2:
      return "ADMINISTRATIVO";
    case 3:
      return "JEFE_CARRERA";
    case 4:
      return "SECRETARIA";
    case 5:
      return "DOCENTE_RESPONSABLE";
    case 6:
      return "JEFE_CARRERA";
    case 7:
      return "SECRETARIA";
    case 8:
      return "JEFE_CARRERA";
    default:
      return "DOCENTE_RESPONSABLE";
  }
};

function mapEstadoToFase(estado: EstadoSolicitud): number {
  if (estado === "creada") return 2;
  if (estado === "en_verificacion") return 3;
  if (estado === "aprobada_jefe") return 4;
  if (estado === "en_secretaria") return 5;
  if (estado === "finalizada") return 9;
  if (estado === "rechazada") return 3;
  return 2;
}

function mapRoleToSupabase(role: Role): RolSupabase {
  if (role === "ADMINISTRATIVO") return "administrativo";
  if (role === "JEFE_CARRERA") return "jefe_carrera";
  if (role === "SECRETARIA") return "secretaria";
  return "docente";
}

function assertTransitionByRole(rol: RolSupabase, from: EstadoSolicitud, to: EstadoSolicitud) {
  const allowed: Record<RolSupabase, Partial<Record<EstadoSolicitud, EstadoSolicitud[]>>> = {
    docente: {
      creada: [],
      en_verificacion: [],
      aprobada_jefe: [],
      en_secretaria: [],
      finalizada: [],
      rechazada: [],
    },
    administrativo: {
      creada: ["en_verificacion", "rechazada"],
    },
    jefe_carrera: {
      en_verificacion: ["aprobada_jefe", "rechazada"],
      en_secretaria: ["finalizada", "rechazada"],
    },
    secretaria: {
      aprobada_jefe: ["en_secretaria", "rechazada"],
      en_secretaria: ["en_secretaria", "rechazada"],
    },
  };

  const possible = allowed[rol][from] ?? [];
  if (!possible.includes(to)) {
    throw new Error(`El rol ${rol} no puede cambiar el estado de ${from} a ${to}.`);
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

function buildEstadoByNextPhase(nextPhase: number, currentEstado: EstadoSolicitud): EstadoSolicitud {
  if (nextPhase <= 2) return "creada";
  if (nextPhase === 3) return "en_verificacion";
  if (nextPhase === 4) return "aprobada_jefe";
  if (nextPhase >= 5 && nextPhase <= 8) return "en_secretaria";
  if (nextPhase >= 9) return "finalizada";
  return currentEstado;
}

function mapRowToAlumno(row: GenericRow): AlumnoPropuesto {
  const sexoRaw = getString(row, ["sexo_gramatical", "sexo", "genero"], "M").toUpperCase();
  const sexoGramatical: "F" | "M" = sexoRaw === "F" ? "F" : "M";

  return {
    nombreCompleto: getString(row, ["nombre_completo", "alumno_nombre", "nombre"], ""),
    dni: getString(row, ["dni", "documento", "nro_dni"], ""),
    sexoGramatical,
  };
}

export const TramitesProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useUser();
  const [tramites, setTramites] = useState<Tramite[]>([]);
  const [rolActivo, setRolActivo] = useState<Role>("DOCENTE");
  const [cicloConfig, setCicloConfig] = useState<CicloConfig>({
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

  const mapRowsToTramites = (
    solicitudes: GenericRow[],
    alumnosRows: GenericRow[],
    documentosRows: GenericRow[],
  ): Tramite[] => {
    return solicitudes.map((row) => {
      const idSolicitud = getString(row, ["id_solicitud", "id"], "");
      const estadoSolicitud = normalizeEstadoSolicitud(getString(row, ["estado"], "creada"));
      const faseActualRaw = getNumber(row, ["fase_actual"], 0);
      const faseActual = faseActualRaw > 0 ? faseActualRaw : mapEstadoToFase(estadoSolicitud);
      const alumnos = alumnosRows
        .filter((alumno) => getString(alumno, ["id_solicitud"]) === idSolicitud)
        .map(mapRowToAlumno);

      const documentos = documentosRows
        .filter((doc) => getString(doc, ["id_solicitud"]) === idSolicitud)
        .map((doc) => ({
          id: getString(doc, ["id_documento", "id"], createId("doc")),
          nombre: getString(doc, ["archivo_nombre", "nombre_archivo", "nombre"], "Documento"),
          tipo: (getString(doc, ["tipo_documento", "tipo"], "OTRO") as Documento["tipo"]),
          fecha: getString(doc, ["creado_en", "created_at"], new Date().toISOString()),
          url: getString(doc, ["url"], "#"),
        }));

      const historialData = row.historial_json;
      const historial: Evento[] = Array.isArray(historialData)
        ? (historialData as GenericRow[]).map((evt) => ({
            id: getString(evt, ["id"], createId("evt")),
            fecha: getString(evt, ["fecha"], new Date().toISOString()),
            actor: getString(evt, ["actor"], "Sistema"),
            rol: (getString(evt, ["rol"], "DOCENTE_RESPONSABLE") as Role),
            accion: getString(evt, ["accion"], "Actualización"),
            comentario: getString(evt, ["comentario"]),
            tipo: (getString(evt, ["tipo"], "SISTEMA") as Evento["tipo"]),
          }))
        : [
            buildEvento(
              "Sistema",
              "DOCENTE_RESPONSABLE",
              "Solicitud creada en Supabase",
              `Estado actual: ${estadoSolicitud}`,
              "SISTEMA",
            ),
          ];

      const materia = getString(row, ["materia", "asignatura"], "");
      const fechaSolicitud = getString(row, ["fecha_solicitud", "created_at"], new Date().toISOString());
      const createdAt = getString(row, ["created_at", "fecha_solicitud"], new Date().toISOString());
      const updatedAt = getString(row, ["updated_at", "created_at"], createdAt);
      const notaAprobacion = getNumber(row, ["nota_aprobacion"], 0);

      return {
        id: idSolicitud,
        idSolicitud,
        materia,
        alumno: alumnos[0]?.nombreCompleto ?? "",
        nota: notaAprobacion,
        notaAprobacion,
        fechaSolicitud,
        carrera: (getString(row, ["carrera"], "Arquitectura") as Carrera),
        anioCarrera: getString(row, ["anio_carrera", "anio"], ""),
        regimen: (getString(row, ["regimen"], "Semestral") as Regimen),
        alumnosPropuestos: alumnos,
        faseActual,
        estado: estadoToStatus(estadoSolicitud),
        estadoSolicitud,
        responsableActual: getResponsablePorFase(faseActual),
        documentos,
        historial,
        fechaCreacion: createdAt,
        fechaUltimaActualizacion: updatedAt,
      };
    });
  };

  const loadTramites = async () => {
    if (!hasSupabaseConfig) {
      setTramites([]);
      setError("Supabase no está configurado. Defina VITE_SUPABASE_PROJECT_ID y VITE_SUPABASE_ANON_KEY.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data: solicitudesData, error: solicitudesError } = await supabase
        .from("solicitud_ayudante")
        .select("*")
        .order("created_at", { ascending: false });

      if (solicitudesError) {
        throw new Error(`No se pudo consultar solicitud_ayudante: ${solicitudesError.message}`);
      }

      const solicitudes = (solicitudesData ?? []) as GenericRow[];
      const solicitudIds = solicitudes.map((row) => getString(row, ["id_solicitud", "id"], "")).filter(Boolean);

      let alumnosRows: GenericRow[] = [];
      let documentosRows: GenericRow[] = [];

      if (solicitudIds.length > 0) {
        const [alumnosRes, documentosRes] = await Promise.all([
          supabase.from("solicitud_alumnos").select("*").in("id_solicitud", solicitudIds),
          supabase.from("documentos").select("*").in("id_solicitud", solicitudIds),
        ]);

        if (alumnosRes.error) {
          throw new Error(`No se pudo consultar solicitud_alumnos: ${alumnosRes.error.message}`);
        }

        if (documentosRes.error) {
          throw new Error(`No se pudo consultar documentos: ${documentosRes.error.message}`);
        }

        alumnosRows = (alumnosRes.data ?? []) as GenericRow[];
        documentosRows = (documentosRes.data ?? []) as GenericRow[];
      }

      setTramites(mapRowsToTramites(solicitudes, alumnosRows, documentosRows));
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : "No se pudieron cargar los trámites.";
      setError(message);
      setTramites([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTramites();
  }, []);

  const resolveDocenteId = async () => {
    if (user.idDocente?.trim()) {
      return user.idDocente;
    }

    const dni = user.dni.replace(/\D/g, "");
    if (!dni) {
      throw new Error("No se pudo resolver id_docente: usuario sin DNI válido.");
    }

    const { data, error: docenteError } = await supabase
      .from("docentes")
      .select("id_docente")
      .eq("dni", dni)
      .limit(1)
      .maybeSingle();

    if (docenteError || !data) {
      throw new Error("No se encontró id_docente para el usuario autenticado.");
    }

    const docenteId = getString(data as GenericRow, ["id_docente"], "");
    if (!docenteId) {
      throw new Error("El registro de docente no contiene id_docente válido.");
    }

    return docenteId;
  };

  const crearTramite = async (data: {
    carrera: Carrera;
    anioCarrera: string;
    materia: string;
    regimen: Regimen;
    notaAprobacion: number;
    alumnosPropuestos: AlumnoPropuesto[];
  }) => {
    if (!hasSupabaseConfig) {
      throw new Error("Supabase no está configurado.");
    }

    if (data.alumnosPropuestos.length === 0) {
      throw new Error("Debe cargar al menos un alumno.");
    }

    if (data.alumnosPropuestos.length > 2) {
      throw new Error("Una solicitud puede tener máximo 2 alumnos.");
    }

    const idDocente = await resolveDocenteId();

    const payload = {
      id_docente: idDocente,
      carrera: data.carrera,
      anio_carrera: data.anioCarrera,
      asignatura: data.materia,
      regimen: data.regimen,
      nota_aprobacion: data.notaAprobacion,
      estado: "creada" as EstadoSolicitud,
      fase_actual: 2,
      fecha_solicitud: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data: insertedSolicitud, error: insertSolicitudError } = await supabase
      .from("solicitud_ayudante")
      .insert(payload)
      .select("id_solicitud")
      .single();

    if (insertSolicitudError || !insertedSolicitud) {
      throw new Error(`No se pudo insertar la solicitud en Supabase: ${insertSolicitudError?.message ?? "sin detalle"}`);
    }

    const idSolicitud = getString(insertedSolicitud as GenericRow, ["id_solicitud"], "");

    const alumnosPayload = data.alumnosPropuestos.map((alumno) => ({
      id_solicitud: idSolicitud,
      nombre_completo: alumno.nombreCompleto,
      dni: alumno.dni,
      sexo_gramatical: alumno.sexoGramatical,
      created_at: new Date().toISOString(),
    }));

    const { error: insertAlumnosError } = await supabase.from("solicitud_alumnos").insert(alumnosPayload);

    if (insertAlumnosError) {
      throw new Error(`La solicitud se creó, pero falló el alta de alumnos en solicitud_alumnos: ${insertAlumnosError.message}`);
    }

    crearNotificacion({
      tipo: "info",
      titulo: "Nuevo trámite para verificación",
      mensaje: `${idSolicitud}: revisar solicitud de ${data.carrera} - ${data.anioCarrera}.`,
      tramiteId: idSolicitud,
      rolDestino: "ADMINISTRATIVO",
      destinatarioEmail: "admin@uni.edu.ar",
    });

    await emailService.sendNotification(
      "admin@uni.edu.ar",
      "ADMINISTRATIVO",
      `Nuevo trámite de Ayudantía: ${idSolicitud}`,
      `Se creó una nueva solicitud para ${data.materia} (${data.carrera} - ${data.anioCarrera}).`,
    );

    await loadTramites();
  };

  const avanzarFase = async (id: string, accion: string, comentario?: string, _nuevoDoc?: Documento) => {
    const tramite = tramites.find((t) => t.id === id || t.idSolicitud === id);
    if (!tramite) {
      throw new Error("No se encontró el trámite a actualizar.");
    }

    if (tramite.estadoSolicitud === "finalizada" || tramite.estadoSolicitud === "rechazada") {
      throw new Error("El trámite ya está cerrado y no admite cambios.");
    }

    if (tramite.responsableActual !== rolActivo) {
      throw new Error("El rol actual no está habilitado para esta acción.");
    }

    const nextPhase = Math.min(tramite.faseActual + 1, 9);
    const nextEstado = buildEstadoByNextPhase(nextPhase, tramite.estadoSolicitud);

    if (nextEstado !== tramite.estadoSolicitud) {
      assertTransitionByRole(mapRoleToSupabase(rolActivo), tramite.estadoSolicitud, nextEstado);
    }

    const { error: updateError } = await supabase
      .from("solicitud_ayudante")
      .update({
        fase_actual: nextPhase,
        estado: nextEstado,
        updated_at: new Date().toISOString(),
      })
      .eq("id_solicitud", tramite.idSolicitud);

    if (updateError) {
      throw new Error(`No se pudo actualizar estado de solicitud_ayudante: ${updateError.message}`);
    }

    crearNotificacion({
      tipo: "info",
      titulo: "Trámite actualizado",
      mensaje: `${id}: ${accion}. Estado actual: ${nextEstado}.`,
      tramiteId: id,
      rolDestino: getResponsablePorFase(nextPhase),
    });

    if (comentario?.trim()) {
      crearNotificacion({
        tipo: "info",
        titulo: "Comentario de gestión",
        mensaje: comentario,
        tramiteId: id,
        rolDestino: getResponsablePorFase(nextPhase),
      });
    }

    await loadTramites();
  };

  const rechazarTramite = async (id: string, motivo: string) => {
    const tramite = tramites.find((t) => t.id === id || t.idSolicitud === id);
    if (!tramite) {
      throw new Error("No se encontró el trámite a rechazar.");
    }

    assertTransitionByRole(mapRoleToSupabase(rolActivo), tramite.estadoSolicitud, "rechazada");

    const { error: updateError } = await supabase
      .from("solicitud_ayudante")
      .update({
        estado: "rechazada",
        updated_at: new Date().toISOString(),
      })
      .eq("id_solicitud", tramite.idSolicitud);

    if (updateError) {
      throw new Error(`No se pudo marcar como rechazada la solicitud: ${updateError.message}`);
    }

    crearNotificacion({
      tipo: "alerta",
      titulo: `Trámite rechazado: ${id}`,
      mensaje: `Motivo: ${motivo}`,
      tramiteId: id,
      rolDestino: "DOCENTE_RESPONSABLE",
      destinatarioEmail: "docente@uni.edu.ar",
    });

    await emailService.sendNotification("docente@uni.edu.ar", "DOCENTE_RESPONSABLE", `Trámite rechazado: ${id}`, `Motivo: ${motivo}`);

    await loadTramites();
  };

  const devolverTramite = async (id: string, observaciones: string, faseDestino: number) => {
    const tramite = tramites.find((t) => t.id === id || t.idSolicitud === id);
    if (!tramite) {
      throw new Error("No se encontró el trámite a devolver.");
    }

    if (!["ADMINISTRATIVO", "JEFE_CARRERA", "SECRETARIA"].includes(rolActivo)) {
      throw new Error("Solo roles administrativos pueden devolver solicitudes.");
    }

    const faseCorregida = Math.max(2, Math.min(faseDestino, 8));
    const estadoDestino = buildEstadoByNextPhase(faseCorregida, tramite.estadoSolicitud);

    const { error: updateError } = await supabase
      .from("solicitud_ayudante")
      .update({
        fase_actual: faseCorregida,
        estado: estadoDestino,
        updated_at: new Date().toISOString(),
      })
      .eq("id_solicitud", tramite.idSolicitud);

    if (updateError) {
      throw new Error(`No se pudo devolver el trámite: ${updateError.message}`);
    }

    crearNotificacion({
      tipo: "alerta",
      titulo: `Trámite devuelto: ${id}`,
      mensaje: observaciones,
      tramiteId: id,
      rolDestino: getResponsablePorFase(faseCorregida),
    });

    await loadTramites();
  };

  return (
    <TramitesContext.Provider
      value={{
        tramites,
        rolActivo,
        setRolActivo,
        cicloConfig,
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
      }}
    >
      {children}
    </TramitesContext.Provider>
  );
};

export const useTramites = () => {
  const context = useContext(TramitesContext);
  if (!context) {
    throw new Error("useTramites must be used within TramitesProvider");
  }

  return context;
};
