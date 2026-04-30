import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import { getProfesoresFromSupabase, loginByDni } from "../services/authService";
import { hasSupabaseConfig } from "../../lib/supabaseClient";

export type Role = "DOCENTE" | "DOCENTE_RESPONSABLE" | "JEFE_CARRERA" | "SECRETARIA" | "ADMINISTRATIVO" | "SEC_TECNICA";
export type Carrera = "Arquitectura" | "Lic. en Diseño de Interiores" | "Diseño Industrial" | "Lic. en Gestión Eficiente de la Energía" | "Todas";
export type Cargo = "Titular" | "Asociado" | "Adjunto" | "Auxiliar" | "Ayudante" | "Adscripto" | "Administrativo";

export interface AcademicDesignation {
  id?: string;
  carrera: string;
  asignatura: string;
  cargo: string;
  rolSistema: string;
  academicRole: "DOCENTE" | "DOCENTE_RESPONSABLE";
}

export interface User {
  idDocente?: string;
  nombre: string;
  dni: string;
  carrera: Carrera;
  cargo: Cargo;
  materia: string;
  rol: Role;
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
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
  hasAnyResponsableDesignacion: () => boolean;
  isResponsableForAsignatura: (asignatura?: string) => boolean;
  selectedDesignacionId: string | null;
  setSelectedDesignacionId: (id: string | null) => void;
  selectedDesignacion: AcademicDesignation | null;
  isSelectedDesignacionResponsable: () => boolean;
}

const ADMIN_DNI = "admin";
const ADMIN_PASSWORD = "ucasal2022";

const adminUser: User = {
  nombre: "Administrador",
  dni: ADMIN_DNI,
  carrera: "Todas",
  cargo: "Administrativo",
  materia: "-",
  rol: "ADMINISTRATIVO",
  email: "admin@faud.edu.ar",
};

const fallbackPersonas: User[] = [
  {
    nombre: "Carlos Gómez",
    dni: "12345678",
    carrera: "Arquitectura",
    cargo: "Auxiliar",
    materia: "Matemática II",
    rol: "DOCENTE",
    email: "c.gomez@faud.edu.ar",
  },
  {
    nombre: "Dra. Ana Sánchez",
    dni: "23456789",
    carrera: "Diseño Industrial",
    cargo: "Titular",
    materia: "Morfología",
    rol: "DOCENTE_RESPONSABLE",
    email: "a.sanchez@faud.edu.ar",
  },
  {
    nombre: "Arq. Roberto Díaz",
    dni: "34567890",
    carrera: "Arquitectura",
    cargo: "Titular",
    materia: "Proyecto Urbano",
    rol: "JEFE_CARRERA",
    email: "jefe.carrera@faud.edu.ar",
  },
  {
    nombre: "Secretaría Académica",
    dni: "45678901",
    carrera: "Todas",
    cargo: "Administrativo",
    materia: "-",
    rol: "SECRETARIA",
    email: "secretaria.academica@faud.edu.ar",
  },
  {
    nombre: "Laura Méndez",
    dni: "56789012",
    carrera: "Todas",
    cargo: "Administrativo",
    materia: "-",
    rol: "ADMINISTRATIVO",
    email: "admin.mesa@faud.edu.ar",
  },
  {
    nombre: "Secretaría Técnica",
    dni: "67890123",
    carrera: "Todas",
    cargo: "Administrativo",
    materia: "-",
    rol: "SEC_TECNICA",
    email: "sec.tecnica@faud.edu.ar",
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
  const admin = users.filter((user) => user.dni === ADMIN_DNI);
  const others = users
    .filter((user) => user.dni !== ADMIN_DNI)
    .sort((a, b) => a.nombre.localeCompare(b.nombre, "es", { sensitivity: "base" }));

  return [...admin, ...others];
}

const initialUsers = mergeUniqueUsers([adminUser], fallbackPersonas);
const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [personas, setPersonas] = useState<User[]>(sortPersonas(initialUsers));
  const [user, setUserState] = useState<User>(initialUsers[1] ?? initialUsers[0]);
  const [selectedDesignacionId, setSelectedDesignacionId] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const isAdmin = user.dni === ADMIN_DNI;

  const personasWithoutAdmin = useMemo(() => personas.filter((p) => p.dni !== ADMIN_DNI), [personas]);

  useEffect(() => {
    let active = true;
    const loadingWatchdog = setTimeout(() => {
      if (active) {
        setIsLoading(false);
      }
    }, 2500);

    async function loadProfesores() {
      try {
        const profesoresRaw = await getProfesoresFromSupabase();
        if (!active) return;

        const profesores = profesoresRaw.filter((profesor) => {
          const nombre = profesor.nombre.trim().toLowerCase();
          return Boolean(nombre) && nombre !== "docente";
        });

        const merged = sortPersonas(mergeUniqueUsers([adminUser], profesores, fallbackPersonas));
        setPersonas(merged);

        if (!isAuthenticated) {
          const firstNonAdmin = merged.find((u) => u.dni !== ADMIN_DNI);
          if (firstNonAdmin) {
            setUserState(firstNonAdmin);
          }
        }
      } catch (error) {
        console.warn("No se pudo cargar docentes desde Supabase:", error);
      } finally {
        clearTimeout(loadingWatchdog);
        if (active) {
          setIsLoading(false);
        }
      }
    }

    loadProfesores();

    return () => {
      active = false;
      clearTimeout(loadingWatchdog);
    };
  }, [isAuthenticated]);

  const cyclePersona = () => {
    if (personasWithoutAdmin.length === 0) return;

    setUserState((prev) => {
      const currentIndex = personasWithoutAdmin.findIndex((p) => p.dni === prev.dni);
      const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % personasWithoutAdmin.length : 0;
      return personasWithoutAdmin[nextIndex];
    });
    setIsAuthenticated(true);
  };

  const setPersonaIndex = (index: number) => {
    const persona = personas[index];
    if (!persona) return;
    setUserState(persona);
    setIsAuthenticated(true);
  };

  const setUser = (nextUser: User) => {
    setUserState(nextUser);
    setIsAuthenticated(true);
    setPersonas((prev) => sortPersonas(mergeUniqueUsers(prev, [nextUser])));
  };

  const loginWithCredentials = async (rawDni: string, rawPassword: string): Promise<{ ok: boolean; error?: string }> => {
    const dniInput = rawDni.trim();
    const passwordInput = rawPassword.trim();

    if (!dniInput) {
      return { ok: false, error: "Ingrese un DNI o usuario." };
    }

    if (!passwordInput) {
      return { ok: false, error: "Ingrese una contraseña." };
    }

    if (dniInput.toLowerCase() === ADMIN_DNI) {
      if (passwordInput !== ADMIN_PASSWORD) {
        return { ok: false, error: "Credenciales de administrador inválidas." };
      }

      setUserState(adminUser);
      setIsAuthenticated(true);
      setPersonas((prev) => sortPersonas(mergeUniqueUsers([adminUser], prev)));
      return { ok: true };
    }

    const normalizedDni = dniInput.replace(/\D/g, "");
    if (!normalizedDni) {
      return { ok: false, error: "Ingrese un DNI válido (solo números)." };
    }

    if (passwordInput !== normalizedDni) {
      return { ok: false, error: "Por ahora, la contraseña es el mismo DNI." };
    }

    const docenteFallback = personas.find((p) => p.dni === normalizedDni) ?? fallbackPersonas.find((p) => p.dni === normalizedDni);
    if (!hasSupabaseConfig && !docenteFallback) {
      return {
        ok: false,
        error: "Falta configurar Supabase (VITE_SUPABASE_ANON_KEY) para validar DNIs de la base de datos.",
      };
    }

    let docenteSupabase: User | null = null;
    let loginErrorMessage = "";
    try {
      docenteSupabase = await loginByDni(normalizedDni);
    } catch (error) {
      loginErrorMessage = error instanceof Error ? error.message : "No se pudo validar el DNI en Supabase.";
      console.warn("No se pudo consultar Supabase en login por DNI:", error);
    }
    const docente = docenteSupabase ?? docenteFallback;

    if (!docente) {
      return {
        ok: false,
        error: loginErrorMessage || "DNI no encontrado en la tabla docentes (o la política RLS no permite leer ese registro).",
      };
    }

    setUserState(docente);
    setIsAuthenticated(true);
    setPersonas((prev) => sortPersonas(mergeUniqueUsers(prev, [docente])));
    return { ok: true };
  };

  const logout = () => {
    setIsAuthenticated(false);
  };

  const selectedDesignacion = useMemo(() => {
    const designaciones = user.designaciones ?? [];
    if (designaciones.length === 0) return null;
    if (!selectedDesignacionId) return designaciones[0];
    return designaciones.find((designacion) => designacion.id === selectedDesignacionId) ?? designaciones[0];
  }, [user.designaciones, selectedDesignacionId]);

  useEffect(() => {
    const designaciones = user.designaciones ?? [];
    if (designaciones.length === 0) {
      if (selectedDesignacionId !== null) {
        setSelectedDesignacionId(null);
      }
      return;
    }

    if (selectedDesignacionId && designaciones.some((designacion) => designacion.id === selectedDesignacionId)) {
      return;
    }

    setSelectedDesignacionId(designaciones[0].id ?? null);
  }, [user.designaciones, selectedDesignacionId]);

  const hasAnyResponsableDesignacion = () => {
    return (user.designaciones ?? []).some((designacion) => designacion.academicRole === "DOCENTE_RESPONSABLE");
  };

  const isResponsableForAsignatura = (asignatura?: string) => {
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
    if (!selectedDesignacion) return false;
    return selectedDesignacion.academicRole === "DOCENTE_RESPONSABLE";
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

