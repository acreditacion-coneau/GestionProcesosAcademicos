import { hasSupabaseConfig, supabase } from "../../lib/supabaseClient";
import type { AcademicDesignation, Cargo, Carrera, Role, User } from "../context/UserContext";

type GenericRow = Record<string, unknown>;

const QUERY_TIMEOUT_MS = Number(import.meta.env.VITE_SUPABASE_TIMEOUT_MS ?? 2500);
const configuredRolesTable = (import.meta.env.VITE_SUPABASE_ROLES_TABLE ?? "designaciones").trim();
const ROLES_TABLE_CANDIDATES = Array.from(new Set([configuredRolesTable, "designaciones", "designacioens"]));
const USER_TABLE_CANDIDATES = ["usuarios", "users", "profiles", "perfiles"];

function getString(row: GenericRow, keys: string[], fallback = ""): string {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" || typeof value === "bigint") return String(value);
  }
  return fallback;
}

function normalizeToken(raw: string): string {
  return raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function normalizeGeneralRole(rawRole: string): Role {
  const role = normalizeToken(rawRole);
  const map: Record<string, Role> = {
    DOCENTE: "DOCENTE",
    DOCENTE_RESPONSABLE: "DOCENTE",
    RESPONSABLE: "DOCENTE",
    RESPONSABLE_CATEDRA: "DOCENTE",
    RESPONSABLE_DE_CATEDRA: "DOCENTE",
    JEFE_CARRERA: "JEFE_CARRERA",
    JEFE_DE_CARRERA: "JEFE_CARRERA",
    SECRETARIA: "SECRETARIA",
    SECRETARIA_ACADEMICA: "SECRETARIA",
    ADMINISTRATIVO: "ADMINISTRATIVO",
    SEC_TECNICA: "SEC_TECNICA",
    SECRETARIA_TECNICA: "SEC_TECNICA",
  };
  return map[role] ?? "DOCENTE";
}

function normalizeAcademicRole(rawRole: string): "DOCENTE" | "DOCENTE_RESPONSABLE" {
  const role = normalizeToken(rawRole);
  if (role.includes("RESPONSABLE")) return "DOCENTE_RESPONSABLE";
  return "DOCENTE";
}

function normalizeCarrera(rawCarrera: string): Carrera {
  const carrera = rawCarrera.toLowerCase();
  if (carrera.includes("arquitectura")) return "Arquitectura";
  if (carrera.includes("interiores")) return "Lic. en Diseño de Interiores";
  if (carrera.includes("industrial")) return "Diseño Industrial";
  if (carrera.includes("energ")) return "Lic. en Gestión Eficiente de la Energía";
  return "Todas";
}

function normalizeCargo(rawCargo: string): Cargo {
  const cargo = rawCargo.toLowerCase();
  if (cargo.includes("titular")) return "Titular";
  if (cargo.includes("asociado")) return "Asociado";
  if (cargo.includes("adjunto")) return "Adjunto";
  if (cargo.includes("auxiliar")) return "Auxiliar";
  if (cargo.includes("ayudante")) return "Ayudante";
  if (cargo.includes("adscrip")) return "Adscripto";
  return "Administrativo";
}

function isRecoverableError(error: unknown): boolean {
  const code = (error as { code?: string })?.code;
  if (code && ["42P01", "42703", "PGRST205", "42501"].includes(code)) return true;

  const message = (error as { message?: string })?.message?.toLowerCase() ?? "";
  return (
    message.includes("relation")
    || message.includes("column")
    || message.includes("permission denied")
    || message.includes("does not exist")
    || message.includes("forbidden")
  );
}

function mapDocenteRowToUser(row: GenericRow): User | null {
  const dni = getString(row, ["dni", "documento", "DNI"], "").replace(/\D/g, "");
  if (!dni) return null;

  const nombre = getString(row, ["nombre"], "");
  const apellido = getString(row, ["apellido"], "");
  const nombreCompleto = `${nombre} ${apellido}`.trim();
  if (!nombreCompleto) return null;

  return {
    idDocente: getString(row, ["id_docente", "id"], "") || undefined,
    nombre: nombreCompleto,
    dni,
    carrera: "Todas",
    cargo: "Auxiliar",
    materia: "-",
    rol: "DOCENTE",
    email: getString(row, ["email", "E_mail", "correo", "mail"], `${dni}@faud.edu.ar`) || `${dni}@faud.edu.ar`,
    designaciones: [],
  };
}

function mapRpcRowToUser(row: GenericRow): User | null {
  const dni = getString(row, ["dni"], "").replace(/\D/g, "");
  if (!dni) return null;

  const nombreCompleto = getString(row, ["nombre_completo"], "");
  const nombre = nombreCompleto || `${getString(row, ["nombre"], "")} ${getString(row, ["apellido"], "")}`.trim();
  if (!nombre) return null;

  return {
    idDocente: getString(row, ["id_docente"], "") || undefined,
    nombre,
    dni,
    carrera: normalizeCarrera(getString(row, ["carrera"], "Todas")),
    cargo: normalizeCargo(getString(row, ["cargo"], "Docente")),
    materia: getString(row, ["materia", "asignatura"], "-") || "-",
    rol: "DOCENTE",
    email: getString(row, ["email"], `${dni}@faud.edu.ar`) || `${dni}@faud.edu.ar`,
    designaciones: [],
  };
}

async function loginByDniRpc(dni: string): Promise<User | null> {
  const { data, error } = await supabase.rpc("login_docente_by_dni", { p_dni: dni });
  if (error) {
    throw new Error(`No se pudo ejecutar login seguro por RPC: ${error.message}`);
  }

  if (!Array.isArray(data) || data.length === 0) return null;
  return mapRpcRowToUser((data[0] ?? {}) as GenericRow);
}

async function findDocenteByDni(dni: string): Promise<User | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), QUERY_TIMEOUT_MS);

  try {
    const { data, error } = await supabase
      .from("docentes")
      .select("*")
      .eq("dni", dni)
      .limit(1)
      .abortSignal(controller.signal)
      .maybeSingle();

    if (error) {
      if (isRecoverableError(error)) return null;
      return null;
    }

    if (!data) return null;
    return mapDocenteRowToUser(data as GenericRow);
  } finally {
    clearTimeout(timer);
  }
}

async function resolveGeneralRole(user: User): Promise<Role> {
  const idDocente = user.idDocente?.trim() ?? "";
  const dni = user.dni.replace(/\D/g, "");

  for (const tableName of USER_TABLE_CANDIDATES) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), QUERY_TIMEOUT_MS);

    try {
      const attempts = [
        idDocente ? supabase.from(tableName).select("rol").eq("id_docente", idDocente).limit(1) : null,
        dni ? supabase.from(tableName).select("rol").eq("dni", dni).limit(1) : null,
        user.email ? supabase.from(tableName).select("rol").eq("email", user.email).limit(1) : null,
      ].filter(Boolean);

      for (const attempt of attempts) {
        const { data, error } = await attempt!.abortSignal(controller.signal).maybeSingle();
        if (error) {
          if (isRecoverableError(error)) continue;
          continue;
        }
        if (!data) continue;

        const rol = getString(data as GenericRow, ["rol"], "");
        if (!rol) continue;
        return normalizeGeneralRole(rol);
      }
    } catch (error) {
      if (!isRecoverableError(error)) {
        console.warn(`No se pudo resolver rol general en ${tableName}:`, error);
      }
    } finally {
      clearTimeout(timer);
    }
  }

  return "DOCENTE";
}

async function resolveAcademicDesignaciones(user: User): Promise<AcademicDesignation[]> {
  const idDocente = user.idDocente?.trim() ?? "";
  if (!idDocente) return [];

  for (const tableName of ROLES_TABLE_CANDIDATES) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), QUERY_TIMEOUT_MS);

    try {
      const { data, error } = await supabase
        .from(tableName)
        .select("*")
        .eq("id_docente", idDocente)
        .abortSignal(controller.signal);

      if (error) {
        if (isRecoverableError(error)) continue;
        continue;
      }

      const designaciones = ((data ?? []) as GenericRow[]).map((row) => {
        const rolSistema = getString(row, ["rol_sistema", "rol", "role"], "docente");
        return {
          id: getString(row, ["id"], "") || undefined,
          carrera: getString(row, ["carrera"], user.carrera),
          asignatura: getString(row, ["asignatura"], ""),
          cargo: getString(row, ["cargo"], ""),
          rolSistema,
          academicRole: normalizeAcademicRole(rolSistema),
        } satisfies AcademicDesignation;
      });

      if (designaciones.length > 0) return designaciones;
    } catch (error) {
      if (!isRecoverableError(error)) {
        console.warn(`No se pudo resolver designaciones en ${tableName}:`, error);
      }
    } finally {
      clearTimeout(timer);
    }
  }

  return [];
}

async function enrichUserWithRoles(user: User): Promise<User> {
  const [rolGeneral, designaciones] = await Promise.all([
    resolveGeneralRole(user),
    resolveAcademicDesignaciones(user),
  ]);

  const materiaPrimaria = designaciones[0]?.asignatura?.trim();
  const carreraPrimaria = designaciones[0]?.carrera?.trim();
  const cargoPrimario = designaciones[0]?.cargo?.trim();

  return {
    ...user,
    rol: rolGeneral,
    materia: materiaPrimaria || user.materia,
    carrera: normalizeCarrera(carreraPrimaria || user.carrera),
    cargo: normalizeCargo(cargoPrimario || user.cargo),
    designaciones,
  };
}

function dedupeUsers(users: User[]): User[] {
  const seen = new Set<string>();
  const unique: User[] = [];

  for (const user of users) {
    if (!seen.has(user.dni)) {
      seen.add(user.dni);
      unique.push(user);
    }
  }

  return unique;
}

export async function loginByDni(dni: string): Promise<User | null> {
  if (!hasSupabaseConfig) return null;

  const cleanDni = dni.replace(/\D/g, "");
  if (!cleanDni) return null;

  let baseUser: User | null = null;
  let rpcErrorMessage = "";

  try {
    baseUser = await loginByDniRpc(cleanDni);
  } catch (error) {
    rpcErrorMessage = error instanceof Error ? error.message : "Fallo desconocido en RPC de login.";
  }

  if (!baseUser) {
    baseUser = await findDocenteByDni(cleanDni);
  }

  if (!baseUser) {
    if (rpcErrorMessage) throw new Error(rpcErrorMessage);
    return null;
  }

  return enrichUserWithRoles(baseUser);
}

export async function getProfesoresFromSupabase(): Promise<User[]> {
  if (!hasSupabaseConfig) return [];

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), QUERY_TIMEOUT_MS);

  try {
    const { data, error } = await supabase
      .from("docentes")
      .select("*")
      .limit(1000)
      .abortSignal(controller.signal);

    if (error) {
      if (!isRecoverableError(error)) {
        console.warn("No se pudo cargar docentes desde Supabase:", error);
      }
      return [];
    }

    const docentesBase = dedupeUsers(((data ?? []) as GenericRow[])
      .map((row) => mapDocenteRowToUser(row))
      .filter((item): item is User => Boolean(item)));

    const enriched = await Promise.all(docentesBase.map((docente) => enrichUserWithRoles(docente)));
    return enriched;
  } finally {
    clearTimeout(timer);
  }
}
