import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import { getProfesoresFromSupabase, loginByDni } from "../services/authService";
import { hasSupabaseConfig, supabase } from "../../lib/supabaseClient";

export type GlobalRole =
  | "decano"
  | "secretaria_academica"
  | "secretaria_tecnica"
  | "jefe_carrera"
  | "responsable_extension"
  | "responsable_investigacion"
  | "administrativo"
  | "docente";

export type Role =
  | "DECANO"
  | "DOCENTE"
  | "DOCENTE_RESPONSABLE"
  | "JEFE_CARRERA"
  | "SECRETARIA"
  | "ADMINISTRATIVO"
  | "SEC_TECNICA"
  | "RESPONSABLE_EXTENSION"
  | "RESPONSABLE_INVESTIGACION";

export type Carrera = "Arquitectura" | "Lic. en Diseño de Interiores" | "Diseño Industrial" | "Lic. en Gestión Eficiente de la Energía" | "Todas";
export type Cargo = "Titular" | "Asociado" | "Adjunto" | "Auxiliar" | "Ayudante" | "Adscripto" | "Administrativo";
export type EntryMode = "institutional" | "academic" | null;
export type AccessMode =
  | { tipo: "institucional"; rol: GlobalRole }
  | { tipo: "academico"; materias: AcademicDesignation[] };

export interface AcademicDesignation {
  id?: string;
  carrera: string;
  asignatura: string;
  cargo: string;
  rolSistema: string;
  academicRole: "DOCENTE" | "DOCENTE_RESPONSABLE";
}

export interface User {
  idUsuario?: string;
  idDocente?: string;
  nombre: string;
  apellido?: string;
  dni: string;
  carrera: Carrera;
  cargo: Cargo;
  materia: string;
  rol: Role;
  globalRole?: GlobalRole;
  email: string;
  designaciones?: AcademicDesignation[];
}

interface UserContextType {
  user: User;
  setUser: (user: User) => void;
  cyclePersona: () => void;
  setPersonaIndex: (index: number) => void;
  personas: User[];
  isAdmin: boolean;
  loginWithCredentials: (dni: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  isLoading: boolean;
  hasAnyResponsableDesignacion: () => boolean;
  isResponsableForAsignatura: (asignatura?: string) => boolean;
  selectedDesignacionId: string | null;
  setSelectedDesignacionId: (id: string | null) => void;
  needsDesignacionSelection: boolean;
  confirmDesignacionSelection: (id: string) => void;
  confirmInstitutionalMode: () => void;
  entryMode: EntryMode;
  accessModes: AccessMode[];
  selectedDesignacion: AcademicDesignation | null;
  isSelectedDesignacionResponsable: () => boolean;
}

const ADMIN_DNI = "admin";
const ADMIN_PASSWORD = "ucasal2022";

export function mapGlobalRoleToAppRole(role?: GlobalRole): Role {
  switch (role) {
    case "decano":
      return "DECANO";
    case "secretaria_academica":
      return "SECRETARIA";
    case "secretaria_tecnica":
      return "SEC_TECNICA";
    case "jefe_carrera":
      return "JEFE_CARRERA";
    case "responsable_extension":
      return "RESPONSABLE_EXTENSION";
    case "responsable_investigacion":
      return "RESPONSABLE_INVESTIGACION";
    case "administrativo":
      return "ADMINISTRATIVO";
    case "docente":
    default:
      return "DOCENTE";
  }
}

const adminUser: User = {
  nombre: "Administrador",
  apellido: "",
  dni: ADMIN_DNI,
  carrera: "Todas",
  cargo: "Administrativo",
  materia: "-",
  rol: "DECANO",
  globalRole: "decano",
  email: "admin@faud.edu.ar",
};

const fallbackPersonas: User[] = [
  {
    nombre: "Carlos",
    apellido: "Gomez",
    dni: "12345678",
    carrera: "Arquitectura",
    cargo: "Auxiliar",
    materia: "Matematica II",
    rol: "DOCENTE",
    globalRole: "docente",
    email: "c.gomez@faud.edu.ar",
    idDocente: "demo-docente-1",
    designaciones: [
      {
        id: "demo-designacion-docente",
        carrera: "Arquitectura",
        asignatura: "Matematica II",
        cargo: "Auxiliar",
        rolSistema: "docente",
        academicRole: "DOCENTE",
      },
    ],
  },
  {
    nombre: "Ana",
    apellido: "Sanchez",
    dni: "23456789",
    carrera: "Diseno Industrial",
    cargo: "Titular",
    materia: "Morfologia",
    rol: "DOCENTE_RESPONSABLE",
    globalRole: "docente",
    email: "a.sanchez@faud.edu.ar",
    idDocente: "demo-docente-2",
    designaciones: [
      {
        id: "demo-designacion-responsable",
        carrera: "Diseno Industrial",
        asignatura: "Morfologia",
        cargo: "Titular",
        rolSistema: "responsable",
        academicRole: "DOCENTE_RESPONSABLE",
      },
    ],
  },
  {
    nombre: "Decano",
    apellido: "FAUD",
    dni: "90000001",
    carrera: "Todas",
    cargo: "Administrativo",
    materia: "-",
    rol: "DECANO",
    globalRole: "decano",
    email: "decano@faud.edu.ar",
  },
  {
    nombre: "Secretaria",
    apellido: "Academica",
    dni: "45678901",
    carrera: "Todas",
    cargo: "Administrativo",
    materia: "-",
    rol: "SECRETARIA",
    globalRole: "secretaria_academica",
    email: "secretaria.academica@faud.edu.ar",
  },
  {
    nombre: "Secretaria",
    apellido: "Tecnica",
    dni: "67890123",
    carrera: "Todas",
    cargo: "Administrativo",
    materia: "-",
    rol: "SEC_TECNICA",
    globalRole: "secretaria_tecnica",
    email: "sec.tecnica@faud.edu.ar",
  },
  {
    nombre: "Responsable",
    apellido: "Extension",
    dni: "90000002",
    carrera: "Todas",
    cargo: "Administrativo",
    materia: "-",
    rol: "RESPONSABLE_EXTENSION",
    globalRole: "responsable_extension",
    email: "extension@faud.edu.ar",
  },
  {
    nombre: "Responsable",
    apellido: "Investigacion",
    dni: "90000003",
    carrera: "Todas",
    cargo: "Administrativo",
    materia: "-",
    rol: "RESPONSABLE_INVESTIGACION",
    globalRole: "responsable_investigacion",
    email: "investigacion@faud.edu.ar",
  },
];

function mergeUniqueUsers(...groups: User[][]): User[] {
  const seen = new Set<string>();
  const result: User[] = [];

  for (const group of groups) {
    for (const user of group) {
      if (!seen.has(user.dni)) {
        seen.add(user.dni);
        result.push(user);
      }
    }
  }

  return result;
}

function sortPersonas(users: User[]): User[] {
  return [...users].sort((a, b) => `${a.apellido ?? ""} ${a.nombre}`.localeCompare(`${b.apellido ?? ""} ${b.nombre}`, "es", { sensitivity: "base" }));
}

function normalizeDniInput(value: string): string {
  return String(value).trim().replace(/[.\s]/g, "");
}

function buildAccessModesForUser(target: User): AccessMode[] {
  const modes: AccessMode[] = [];
  const designaciones = target.designaciones ?? [];

  if (target.globalRole && target.globalRole !== "docente") {
    modes.push({ tipo: "institucional", rol: target.globalRole });
  }

  if (target.idDocente && designaciones.length > 0) {
    modes.push({ tipo: "academico", materias: designaciones });
  }

  if (modes.length === 0) {
    modes.push({ tipo: "institucional", rol: target.globalRole ?? "docente" });
  }

  return modes;
}

const initialUsers = mergeUniqueUsers([adminUser], fallbackPersonas);
const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [personas, setPersonas] = useState<User[]>(sortPersonas(initialUsers));
  const [user, setUserState] = useState<User>(adminUser);
  const [selectedDesignacionId, setSelectedDesignacionIdState] = useState<string | null>(null);
  const [hasConfirmedEntryMode, setHasConfirmedEntryMode] = useState(false);
  const [entryMode, setEntryMode] = useState<EntryMode>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const isAdmin = user.rol === "DECANO" || user.dni === ADMIN_DNI;

  const personasWithoutAdmin = useMemo(() => personas.filter((p) => p.dni !== ADMIN_DNI), [personas]);
  const accessModes = useMemo(() => buildAccessModesForUser(user), [user]);

  useEffect(() => {
    let active = true;
    const loadingWatchdog = setTimeout(() => {
      if (active) setIsLoading(false);
    }, 2500);

    async function loadUsuarios() {
      try {
        const usuariosRaw = await getProfesoresFromSupabase();
        if (!active) return;

        const usuarios = usuariosRaw.filter((item) => Boolean(item.nombre.trim()));
        const merged = sortPersonas(hasSupabaseConfig
          ? mergeUniqueUsers([adminUser], usuarios, fallbackPersonas)
          : mergeUniqueUsers([adminUser], usuarios, fallbackPersonas));
        setPersonas(merged);

        if (!isAuthenticated) {
          setUserState(merged.find((u) => u.dni !== ADMIN_DNI) ?? adminUser);
        }
      } catch (error) {
        console.warn("No se pudo cargar usuarios desde Supabase:", error);
      } finally {
        clearTimeout(loadingWatchdog);
        if (active) setIsLoading(false);
      }
    }

    loadUsuarios();

    return () => {
      active = false;
      clearTimeout(loadingWatchdog);
    };
  }, [isAuthenticated]);

  const applyInstitutionalRole = (target: User): User => ({
    ...target,
    rol: mapGlobalRoleToAppRole(target.globalRole),
    materia: "-",
  });

  const applyAcademicRole = (target: User, designation?: AcademicDesignation): User => ({
    ...target,
    rol: designation?.academicRole ?? "DOCENTE",
    materia: designation?.asignatura || target.materia,
    carrera: designation?.carrera ? (designation.carrera as Carrera) : target.carrera,
    cargo: designation?.cargo ? (designation.cargo as Cargo) : target.cargo,
  });

  const activatePersonaForDemo = (persona: User) => {
    const firstDesignation = persona.designaciones?.[0];
    const nextUser = firstDesignation ? applyAcademicRole(persona, firstDesignation) : applyInstitutionalRole(persona);
    setUserState(nextUser);
    setSelectedDesignacionIdState(firstDesignation?.id ?? null);
    setEntryMode(firstDesignation ? "academic" : "institutional");
    setHasConfirmedEntryMode(true);
    setIsAuthenticated(true);
  };

  const cyclePersona = () => {
    if (personasWithoutAdmin.length === 0) return;
    const currentIndex = personasWithoutAdmin.findIndex((p) => p.dni === user.dni);
    const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % personasWithoutAdmin.length : 0;
    activatePersonaForDemo(personasWithoutAdmin[nextIndex]);
  };

  const setPersonaIndex = (index: number) => {
    const persona = personas[index];
    if (persona) activatePersonaForDemo(persona);
  };

  const setUser = (nextUser: User) => {
    setUserState(nextUser);
    setSelectedDesignacionIdState(null);
    setHasConfirmedEntryMode(false);
    setEntryMode(null);
    setIsAuthenticated(true);
    setPersonas((prev) => sortPersonas(mergeUniqueUsers(prev, [nextUser])));
  };

  const loginWithCredentials = async (rawDni: string, rawPassword: string): Promise<{ ok: boolean; error?: string }> => {
    const dniInput = normalizeDniInput(rawDni);
    const passwordInput = normalizeDniInput(rawPassword);
    console.log("Login DNI normalizado:", dniInput);

    if (!dniInput) return { ok: false, error: "Ingrese un DNI o usuario." };
    if (!passwordInput) return { ok: false, error: "Ingrese una contrasena." };

    if (dniInput.toLowerCase() === ADMIN_DNI) {
      if (passwordInput !== ADMIN_PASSWORD) return { ok: false, error: "Credenciales de administrador invalidas." };
      setUserState(adminUser);
      setSelectedDesignacionIdState(null);
      setHasConfirmedEntryMode(true);
      setEntryMode("institutional");
      setIsAuthenticated(true);
      setPersonas((prev) => sortPersonas(mergeUniqueUsers([adminUser], prev)));
      return { ok: true };
    }

    const normalizedDni = dniInput;
    if (!normalizedDni || !/^\d+$/.test(normalizedDni)) return { ok: false, error: "Ingrese un DNI valido (solo numeros)." };
    if (passwordInput !== normalizedDni) return { ok: false, error: "Por ahora, la contrasena es el mismo DNI." };

    const fallback = hasSupabaseConfig ? null : personas.find((p) => p.dni === normalizedDni) ?? fallbackPersonas.find((p) => p.dni === normalizedDni);
    let usuarioSupabase: User | null = null;
    let loginErrorMessage = "";

    try {
      usuarioSupabase = await loginByDni(normalizedDni);
    } catch (error) {
      loginErrorMessage = error instanceof Error ? error.message : "No se pudo validar el DNI en Supabase.";
      console.warn("No se pudo consultar Supabase en login por DNI:", error);
    }

    const loggedUser = usuarioSupabase ?? fallback;
    if (!loggedUser) {
      return { ok: false, error: loginErrorMessage || "DNI no encontrado en la tabla usuarios." };
    }

    const modes = buildAccessModesForUser(loggedUser);
    console.log("Modos de acceso detectados:", modes);

    if (modes.length > 1) {
      setUserState(loggedUser);
      setSelectedDesignacionIdState(null);
      setHasConfirmedEntryMode(false);
      setEntryMode(null);
    } else {
      const [singleMode] = modes;
      if (singleMode.tipo === "academico") {
        const selected = singleMode.materias[0];
        setUserState(applyAcademicRole(loggedUser, selected));
        setSelectedDesignacionIdState(selected?.id ?? null);
        setEntryMode("academic");
      } else {
        setUserState(applyInstitutionalRole(loggedUser));
        setSelectedDesignacionIdState(null);
        setEntryMode("institutional");
      }
      setHasConfirmedEntryMode(true);
    }

    setIsAuthenticated(true);
    setPersonas((prev) => sortPersonas(mergeUniqueUsers(prev, [loggedUser])));
    return { ok: true };
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setIsAuthenticated(false);
    setHasConfirmedEntryMode(false);
    setEntryMode(null);
    setSelectedDesignacionIdState(null);
  };

  const selectedDesignacion = useMemo(() => {
    const designaciones = user.designaciones ?? [];
    if (!selectedDesignacionId) return null;
    return designaciones.find((designacion) => designacion.id === selectedDesignacionId) ?? null;
  }, [user.designaciones, selectedDesignacionId]);

  const setSelectedDesignacionId = (id: string | null) => {
    if (!id) {
      setSelectedDesignacionIdState(null);
      return;
    }

    const selected = (user.designaciones ?? []).find((designacion) => designacion.id === id);
    if (!selected) return;

    setSelectedDesignacionIdState(selected.id ?? null);
    setEntryMode("academic");
    setUserState((prev) => applyAcademicRole(prev, selected));
  };

  const needsDesignacionSelection = useMemo(() => {
    if (!isAuthenticated || hasConfirmedEntryMode) return false;
    return accessModes.length > 1;
  }, [accessModes, isAuthenticated, hasConfirmedEntryMode]);

  const confirmDesignacionSelection = (id: string) => {
    const selected = (user.designaciones ?? []).find((designacion) => designacion.id === id);
    if (!selected) return;
    console.log("Seleccion de rol academico:", selected);
    setSelectedDesignacionId(selected.id ?? null);
    setEntryMode("academic");
    setHasConfirmedEntryMode(true);
  };

  const confirmInstitutionalMode = () => {
    console.log("Seleccion de rol institucional:", user.globalRole);
    setSelectedDesignacionIdState(null);
    setUserState((prev) => applyInstitutionalRole(prev));
    setEntryMode("institutional");
    setHasConfirmedEntryMode(true);
  };

  const hasAnyResponsableDesignacion = () => {
    if (user.rol === "DECANO") return true;
    return (user.designaciones ?? []).some((designacion) => designacion.academicRole === "DOCENTE_RESPONSABLE");
  };

  const isResponsableForAsignatura = (asignatura?: string) => {
    if (user.rol === "DECANO" || user.rol === "SECRETARIA" || user.rol === "SEC_TECNICA") return true;
    const designaciones = user.designaciones ?? [];
    if (!asignatura?.trim()) {
      return designaciones.some((designacion) => designacion.academicRole === "DOCENTE_RESPONSABLE");
    }

    const normalizedAsignatura = asignatura.trim().toLowerCase();
    return designaciones.some(
      (designacion) =>
        designacion.academicRole === "DOCENTE_RESPONSABLE"
        && designacion.asignatura.trim().toLowerCase() === normalizedAsignatura,
    );
  };

  const isSelectedDesignacionResponsable = () => {
    if (user.rol === "DECANO" || user.rol === "SECRETARIA" || user.rol === "SEC_TECNICA") return true;
    return selectedDesignacion?.academicRole === "DOCENTE_RESPONSABLE";
  };

  return (
    <UserContext.Provider
      value={{
        user,
        setUser,
        cyclePersona,
        setPersonaIndex,
        personas,
        isAdmin,
        loginWithCredentials,
        logout,
        isAuthenticated,
        isLoading,
        hasAnyResponsableDesignacion,
        isResponsableForAsignatura,
        selectedDesignacionId,
        setSelectedDesignacionId,
        needsDesignacionSelection,
        confirmDesignacionSelection,
        confirmInstitutionalMode,
        entryMode,
        accessModes,
        selectedDesignacion,
        isSelectedDesignacionResponsable,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
}
