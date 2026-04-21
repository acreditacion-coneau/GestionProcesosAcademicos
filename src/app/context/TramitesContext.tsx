import React, { createContext, useContext, useState, type ReactNode } from "react";
import { format } from "date-fns";
import type { Notificacion } from "../types/tramites";
import { emailService } from "../services/emailService";

export type Role = "DOCENTE" | "DOCENTE_RESPONSABLE" | "ADMINISTRATIVO" | "JEFE_CARRERA" | "SECRETARIA" | "SEC_TECNICA";
export type Status = "PENDIENTE" | "EN_REVISION" | "OBSERVADO" | "RECHAZADO" | "DEVUELTO" | "APROBADO" | "FINALIZADO";

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
  materia: string;
  alumno: string;
  nota: number;
  faseActual: number;
  estado: Status;
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
  crearTramite: (data: Partial<Tramite>) => Promise<void>;
  avanzarFase: (id: string, accion: string, comentario?: string, nuevoDoc?: Documento) => Promise<void>;
  rechazarTramite: (id: string, motivo: string) => Promise<void>;
  devolverTramite: (id: string, observaciones: string, faseDestino: number) => Promise<void>;
  notificaciones: Notificacion[];
  unreadCount: (rol: Role) => number;
  marcarLeida: (id: string) => void;
  marcarTodasLeidas: (rol: Role) => void;
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

const getNombreFase = (fase: number) => {
  const fases = [
    "Solicitud Docente",
    "Revisión Administrativa",
    "Aval Jefatura",
    "RF de Inicio",
    "Informe Docente",
    "Revisión Cierre",
    "RF de Cierre",
    "Carga SAT",
    "Finalizado",
  ];

  return fases[fase - 1] || "Finalizado";
};

const seedTramites: Tramite[] = [
  {
    id: "AYD-SEED-001",
    materia: "Análisis Matemático II",
    alumno: "Juan Pérez",
    nota: 9,
    faseActual: 2,
    estado: "EN_REVISION",
    responsableActual: "ADMINISTRATIVO",
    documentos: [],
    fechaCreacion: new Date(Date.now() - 15 * 86400000).toISOString(),
    fechaUltimaActualizacion: new Date(Date.now() - 14 * 86400000).toISOString(),
    historial: [
      {
        id: "1",
        fecha: new Date(Date.now() - 15 * 86400000).toISOString(),
        actor: "Prof. Gomez",
        rol: "DOCENTE",
        accion: "Creación de Solicitud",
        tipo: "USUARIO",
      },
    ],
  },
  {
    id: "AYD-SEED-002",
    materia: "Física I",
    alumno: "María Torres",
    nota: 8,
    faseActual: 3,
    estado: "PENDIENTE",
    responsableActual: "JEFE_CARRERA",
    documentos: [{ id: "d1", nombre: "Ficha_Academica.pdf", tipo: "FICHA", fecha: new Date(Date.now() - 3 * 86400000).toISOString(), url: "#" }],
    fechaCreacion: new Date(Date.now() - 10 * 86400000).toISOString(),
    fechaUltimaActualizacion: new Date(Date.now() - 3 * 86400000).toISOString(),
    historial: [
      {
        id: "1",
        fecha: new Date(Date.now() - 10 * 86400000).toISOString(),
        actor: "Prof. Sanchez",
        rol: "DOCENTE",
        accion: "Creación de Solicitud",
        tipo: "USUARIO",
      },
      {
        id: "2",
        fecha: new Date(Date.now() - 3 * 86400000).toISOString(),
        actor: "Mesa de Ayuda",
        rol: "ADMINISTRATIVO",
        accion: "Aprobación de Ficha",
        tipo: "USUARIO",
      },
    ],
  },
];

const TramitesContext = createContext<TramitesContextType | undefined>(undefined);

function createId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
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

export const TramitesProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [tramites, setTramites] = useState<Tramite[]>(seedTramites);
  const [rolActivo, setRolActivo] = useState<Role>("DOCENTE");
  const [cicloConfig, setCicloConfig] = useState<CicloConfig>({
    inicioClases: format(new Date(new Date().getFullYear(), 2, 1), "yyyy-MM-dd"),
    finSemestre: format(new Date(new Date().getFullYear(), 6, 15), "yyyy-MM-dd"),
  });
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);

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

  const crearTramite = async (data: Partial<Tramite>) => {
    const nuevoTramite: Tramite = {
      id: `AYD-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`,
      materia: data.materia || "",
      alumno: data.alumno || "",
      nota: data.nota || 7,
      faseActual: 2,
      estado: "PENDIENTE",
      responsableActual: "ADMINISTRATIVO",
      documentos: [],
      historial: [buildEvento(`Prof. ${rolActivo}`, rolActivo, "Creación de Solicitud", "Solicitud iniciada correctamente", "USUARIO")],
      fechaCreacion: new Date().toISOString(),
      fechaUltimaActualizacion: new Date().toISOString(),
    };

    setTramites((prev) => [nuevoTramite, ...prev]);

    crearNotificacion({
      tipo: "info",
      titulo: "Nuevo trámite para verificación",
      mensaje: `${nuevoTramite.id}: revisar solicitud de ${nuevoTramite.alumno}.`,
      tramiteId: nuevoTramite.id,
      rolDestino: "ADMINISTRATIVO",
      destinatarioEmail: "admin@uni.edu.ar",
    });

    await emailService.sendNotification(
      "admin@uni.edu.ar",
      "ADMINISTRATIVO",
      `Nuevo trámite de Ayudantía: ${nuevoTramite.id}`,
      `Se creó una nueva solicitud para ${nuevoTramite.alumno} en ${nuevoTramite.materia}.`,
    );
  };

  const avanzarFase = async (id: string, accion: string, comentario?: string, nuevoDoc?: Documento) => {
    let notificationTarget: Role | null = null;
    let notificationMessage = "";

    setTramites((prev) =>
      prev.map((tramite) => {
        if (tramite.id !== id) {
          return tramite;
        }

        const historial = [buildEvento(`Usuario ${rolActivo}`, rolActivo, accion, comentario), ...tramite.historial];
        const documentos = nuevoDoc ? [...tramite.documentos, nuevoDoc] : tramite.documentos;
        const siguienteFase = tramite.faseActual + 1;

        if (siguienteFase <= 8) {
          const nuevoResponsable = getResponsablePorFase(siguienteFase);
          notificationTarget = nuevoResponsable;
          notificationMessage = `El trámite ${id} avanzó a ${getNombreFase(siguienteFase)}.`;

          return {
            ...tramite,
            faseActual: siguienteFase,
            responsableActual: nuevoResponsable,
            estado: "PENDIENTE",
            documentos,
            historial,
            fechaUltimaActualizacion: new Date().toISOString(),
          };
        }

        notificationTarget = null;
        notificationMessage = `El trámite ${id} finalizó correctamente.`;

        return {
          ...tramite,
          faseActual: 9,
          estado: "FINALIZADO",
          documentos,
          historial,
          fechaUltimaActualizacion: new Date().toISOString(),
        };
      }),
    );

    if (notificationTarget) {
      crearNotificacion({
        tipo: "info",
        titulo: "Trámite requiere acción",
        mensaje: notificationMessage,
        tramiteId: id,
        rolDestino: notificationTarget,
      });

      await emailService.sendNotification(
        "next_role@uni.edu.ar",
        notificationTarget,
        `Trámite requiere su acción: ${id}`,
        notificationMessage,
      );
      return;
    }

    crearNotificacion({
      tipo: "exito",
      titulo: "Trámite completado",
      mensaje: notificationMessage,
      tramiteId: id,
      rolDestino: "JEFE_CARRERA",
    });
  };

  const rechazarTramite = async (id: string, motivo: string) => {
    setTramites((prev) =>
      prev.map((tramite) => {
        if (tramite.id !== id) {
          return tramite;
        }

        return {
          ...tramite,
          estado: "RECHAZADO",
          historial: [buildEvento(`Usuario ${rolActivo}`, rolActivo, "Trámite rechazado", motivo), ...tramite.historial],
          fechaUltimaActualizacion: new Date().toISOString(),
        };
      }),
    );

    crearNotificacion({
      tipo: "alerta",
      titulo: `Trámite rechazado: ${id}`,
      mensaje: `Su solicitud fue rechazada. Motivo: ${motivo}`,
      tramiteId: id,
      rolDestino: "DOCENTE_RESPONSABLE",
      destinatarioEmail: "docente@uni.edu.ar",
    });

    await emailService.sendNotification("docente@uni.edu.ar", "DOCENTE_RESPONSABLE", `Trámite rechazado: ${id}`, `Motivo: ${motivo}`);
  };

  const devolverTramite = async (id: string, observaciones: string, faseDestino: number) => {
    const faseCorregida = Math.max(1, Math.min(faseDestino, 8));

    setTramites((prev) =>
      prev.map((tramite) => {
        if (tramite.id !== id) {
          return tramite;
        }

        return {
          ...tramite,
          estado: "DEVUELTO",
          faseActual: faseCorregida,
          responsableActual: getResponsablePorFase(faseCorregida),
          historial: [
            buildEvento(`Usuario ${rolActivo}`, rolActivo, "Trámite devuelto para corrección", observaciones),
            ...tramite.historial,
          ],
          fechaUltimaActualizacion: new Date().toISOString(),
        };
      }),
    );

    crearNotificacion({
      tipo: "alerta",
      titulo: `Trámite devuelto: ${id}`,
      mensaje: `Se devolvió a ${getNombreFase(faseCorregida)}. Observaciones: ${observaciones}`,
      tramiteId: id,
      rolDestino: getResponsablePorFase(faseCorregida),
    });
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
