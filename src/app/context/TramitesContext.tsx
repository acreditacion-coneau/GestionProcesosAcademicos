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

function splitNombreCompleto(nombreCompleto: string) {
  const normalized = nombreCompleto.trim().replace(/\s+/g, " ");
  if (!normalized) return { nombre: "", apellido: "" };
  const parts = normalized.split(" ");
  if (parts.length === 1) return { nombre: parts[0], apellido: "" };
  const apellido = parts.slice(-1).join(" ");
  const nombre = parts.slice(0, -1).join(" ");
  return { nombre, apellido };
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

function mapEstadoToFase(estado: EstadoSolicitud): number {
  if (estado === "creada") return 2;
  if (estado === "en_verificacion") return 3;
  if (estado === "aprobada_jefe") return 4;
  if (estado === "en_secretaria") return 5;
  if (estado === "finalizada") return 9;
  if (estado === "rechazada") return 3;
  return 2;
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
    solicitudAlumnosRows: GenericRow[],
    alumnosCatalogRows: GenericRow[],
    documentosRows: GenericRow[],
    asignaturasRows: GenericRow[],
  ): Tramite[] => {
    return solicitudes.map((row) => {
      const idSolicitud = getString(row, ["id_solicitud", "id"], "");
      const estadoSolicitud = normalizeEstadoSolicitud(getString(row, ["estado"], "creada"));
      const faseActual = mapEstadoToFase(estadoSolicitud);
      const idAsignatura = getString(row, ["id_asignatura"], "");
      const asignatura = asignaturasRows.find((item) => getString(item, ["id_asignatura"]) === idAsignatura);

      const alumnos = solicitudAlumnosRows
        .filter((link) => getString(link, ["id_solicitud"]) === idSolicitud)
        .map((link) => {
          const idAlumno = getString(link, ["id_alumno"], "");
          const alumno = alumnosCatalogRows.find((item) => getString(item, ["id_alumno"]) === idAlumno);
          if (!alumno) return null;

          const nombre = getString(alumno, ["nombre"], "");
          const apellido = getString(alumno, ["apellido"], "");
          const nombreCompleto = `${nombre} ${apellido}`.trim();

          return {
            nombreCompleto,
            dni: getString(alumno, ["dni"], ""),
            sexoGramatical: "M" as const,
          };
        })
        .filter((item): item is AlumnoPropuesto => Boolean(item));

      const documentos = documentosRows
        .filter((doc) => getString(doc, ["id_solicitud"]) === idSolicitud)
        .map((doc) => ({
          id: getString(doc, ["id_documento", "id"], createId("doc")),
          nombre: `${getString(doc, ["tipo"], "Documento")}.pdf`,
          tipo: (getString(doc, ["tipo"], "OTRO") as Documento["tipo"]),
          fecha: getString(doc, ["fecha_subida", "created_at"], new Date().toISOString()),
          url: getString(doc, ["url_archivo", "url"], "#"),
        }));

      const materia = getString(asignatura ?? {}, ["nombre"], "");
      const carrera = getString(asignatura ?? {}, ["carrera"], "Arquitectura") as Carrera;
      const anioCarrera = getString(asignatura ?? {}, ["anio"], "");
      const regimen = getString(asignatura ?? {}, ["regimen"], "Semestral") as Regimen;
      const fechaSolicitud = getString(row, ["fecha_solicitud", "created_at"], new Date().toISOString());
      const createdAt = getString(row, ["created_at", "fecha_solicitud"], new Date().toISOString());

      return {
        id: idSolicitud,
        idSolicitud,
        materia,
        alumno: alumnos[0]?.nombreCompleto ?? "",
        nota: 8,
        notaAprobacion: 8,
        fechaSolicitud,
        carrera,
        anioCarrera,
        regimen,
        alumnosPropuestos: alumnos,
        faseActual,
        estado: estadoToStatus(estadoSolicitud),
        estadoSolicitud,
        responsableActual: getResponsablePorFase(faseActual),
        documentos,
        historial: [
          buildEvento("Sistema", "DOCENTE_RESPONSABLE", "Solicitud registrada en Supabase", `Estado: ${estadoSolicitud}`, "SISTEMA"),
        ],
        fechaCreacion: createdAt,
        fechaUltimaActualizacion: createdAt,
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
      const asignaturaIds = solicitudes.map((row) => getString(row, ["id_asignatura"], "")).filter(Boolean);

      let solicitudAlumnosRows: GenericRow[] = [];
      let alumnosCatalogRows: GenericRow[] = [];
      let documentosRows: GenericRow[] = [];
      let asignaturasRows: GenericRow[] = [];

      if (solicitudIds.length > 0) {
        const [solicitudAlumnosRes, documentosRes] = await Promise.all([
          supabase.from("solicitud_alumnos").select("*").in("id_solicitud", solicitudIds),
          supabase.from("documentos").select("*").in("id_solicitud", solicitudIds),
        ]);

        if (solicitudAlumnosRes.error) {
          throw new Error(`No se pudo consultar solicitud_alumnos: ${solicitudAlumnosRes.error.message}`);
        }

        if (documentosRes.error) {
          throw new Error(`No se pudo consultar documentos: ${documentosRes.error.message}`);
        }

        solicitudAlumnosRows = (solicitudAlumnosRes.data ?? []) as GenericRow[];
        documentosRows = (documentosRes.data ?? []) as GenericRow[];

        const alumnoIds = solicitudAlumnosRows.map((row) => getString(row, ["id_alumno"], "")).filter(Boolean);
        if (alumnoIds.length > 0) {
          const { data: alumnosData, error: alumnosError } = await supabase
            .from("alumnos")
            .select("*")
            .in("id_alumno", alumnoIds);

          if (alumnosError) {
            throw new Error(`No se pudo consultar alumnos: ${alumnosError.message}`);
          }

          alumnosCatalogRows = (alumnosData ?? []) as GenericRow[];
        }
      }

      if (asignaturaIds.length > 0) {
        const { data: asignaturasData, error: asignaturasError } = await supabase
          .from("asignaturas")
          .select("*")
          .in("id_asignatura", asignaturaIds);

        if (asignaturasError) {
          throw new Error(`No se pudo consultar asignaturas: ${asignaturasError.message}`);
        }

        asignaturasRows = (asignaturasData ?? []) as GenericRow[];
      }

      setTramites(mapRowsToTramites(solicitudes, solicitudAlumnosRows, alumnosCatalogRows, documentosRows, asignaturasRows));
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
    if (user.idDocente?.trim()) return user.idDocente;

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
      throw new Error(`No se encontró id_docente para el usuario autenticado. ${docenteError?.message ?? ""}`.trim());
    }

    return getString(data as GenericRow, ["id_docente"], "");
  };

  const resolveOrCreateAsignaturaId = async (data: {
    carrera: Carrera;
    anioCarrera: string;
    materia: string;
    regimen: Regimen;
  }) => {
    const { data: existing, error: selectError } = await supabase
      .from("asignaturas")
      .select("id_asignatura")
      .eq("nombre", data.materia)
      .eq("carrera", data.carrera)
      .eq("anio", data.anioCarrera)
      .eq("regimen", data.regimen)
      .limit(1)
      .maybeSingle();

    if (selectError) {
      throw new Error(`No se pudo consultar asignaturas: ${selectError.message}`);
    }

    if (existing) {
      return getString(existing as GenericRow, ["id_asignatura"], "");
    }

    const { data: inserted, error: insertError } = await supabase
      .from("asignaturas")
      .insert({
        nombre: data.materia,
        carrera: data.carrera,
        anio: data.anioCarrera,
        regimen: data.regimen,
        created_at: new Date().toISOString(),
      })
      .select("id_asignatura")
      .single();

    if (insertError || !inserted) {
      throw new Error(`No se pudo crear asignatura: ${insertError?.message ?? "sin detalle"}`);
    }

    return getString(inserted as GenericRow, ["id_asignatura"], "");
  };

  const resolveOrCreateAlumnoId = async (alumno: AlumnoPropuesto) => {
    const dni = alumno.dni.replace(/\D/g, "");
    const { nombre, apellido } = splitNombreCompleto(alumno.nombreCompleto);

    const { data: existing, error: selectError } = await supabase
      .from("alumnos")
      .select("id_alumno")
      .eq("dni", dni)
      .limit(1)
      .maybeSingle();

    if (selectError) {
      throw new Error(`No se pudo consultar alumnos: ${selectError.message}`);
    }

    if (existing) {
      return getString(existing as GenericRow, ["id_alumno"], "");
    }

    const { data: inserted, error: insertError } = await supabase
      .from("alumnos")
      .insert({
        nombre,
        apellido,
        dni,
        email: `alumno.${dni}@sin-email.local`,
        created_at: new Date().toISOString(),
      })
      .select("id_alumno")
      .single();

    if (insertError || !inserted) {
      throw new Error(`No se pudo crear alumno: ${insertError?.message ?? "sin detalle"}`);
    }

    return getString(inserted as GenericRow, ["id_alumno"], "");
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
    const idAsignatura = await resolveOrCreateAsignaturaId(data);

    const { data: insertedSolicitud, error: insertSolicitudError } = await supabase
      .from("solicitud_ayudante")
      .insert({
        fecha_solicitud: new Date().toISOString(),
        estado: "creada",
        id_docente: idDocente,
        id_asignatura: idAsignatura,
        observaciones: `Solicitud creada desde portal. Nota declarada: ${data.notaAprobacion}`,
        created_at: new Date().toISOString(),
      })
      .select("id_solicitud")
      .single();

    if (insertSolicitudError || !insertedSolicitud) {
      throw new Error(`No se pudo insertar la solicitud en Supabase: ${insertSolicitudError?.message ?? "sin detalle"}`);
    }

    const idSolicitud = getString(insertedSolicitud as GenericRow, ["id_solicitud"], "");

    const linksPayload = [] as Array<{ id_solicitud: string; id_alumno: string; created_at: string }>;
    for (const alumno of data.alumnosPropuestos) {
      const idAlumno = await resolveOrCreateAlumnoId(alumno);
      linksPayload.push({
        id_solicitud: idSolicitud,
        id_alumno: idAlumno,
        created_at: new Date().toISOString(),
      });
    }

    const { error: insertLinksError } = await supabase.from("solicitud_alumnos").insert(linksPayload);
    if (insertLinksError) {
      throw new Error(`La solicitud se creó, pero falló el vínculo en solicitud_alumnos: ${insertLinksError.message}`);
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
    if (!tramite) throw new Error("No se encontró el trámite a actualizar.");

    if (tramite.estadoSolicitud === "finalizada" || tramite.estadoSolicitud === "rechazada") {
      throw new Error("El trámite ya está cerrado y no admite cambios.");
    }

    let nextEstado: EstadoSolicitud = tramite.estadoSolicitud;
    if (tramite.estadoSolicitud === "creada") nextEstado = "en_verificacion";
    else if (tramite.estadoSolicitud === "en_verificacion") nextEstado = "aprobada_jefe";
    else if (tramite.estadoSolicitud === "aprobada_jefe") nextEstado = "en_secretaria";
    else if (tramite.estadoSolicitud === "en_secretaria") nextEstado = "finalizada";

    const { error: updateError } = await supabase
      .from("solicitud_ayudante")
      .update({
        estado: nextEstado,
        observaciones: comentario?.trim() || null,
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
      rolDestino: getResponsablePorFase(mapEstadoToFase(nextEstado)),
    });

    await loadTramites();
  };

  const rechazarTramite = async (id: string, motivo: string) => {
    const tramite = tramites.find((t) => t.id === id || t.idSolicitud === id);
    if (!tramite) throw new Error("No se encontró el trámite a rechazar.");

    const { error: updateError } = await supabase
      .from("solicitud_ayudante")
      .update({ estado: "rechazada", observaciones: motivo })
      .eq("id_solicitud", tramite.idSolicitud);

    if (updateError) {
      throw new Error(`No se pudo marcar como rechazada la solicitud: ${updateError.message}`);
    }

    await emailService.sendNotification("docente@uni.edu.ar", "DOCENTE_RESPONSABLE", `Trámite rechazado: ${id}`, `Motivo: ${motivo}`);

    await loadTramites();
  };

  const devolverTramite = async (id: string, observaciones: string, _faseDestino: number) => {
    const tramite = tramites.find((t) => t.id === id || t.idSolicitud === id);
    if (!tramite) throw new Error("No se encontró el trámite a devolver.");

    const { error: updateError } = await supabase
      .from("solicitud_ayudante")
      .update({ estado: "creada", observaciones })
      .eq("id_solicitud", tramite.idSolicitud);

    if (updateError) {
      throw new Error(`No se pudo devolver el trámite: ${updateError.message}`);
    }

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
