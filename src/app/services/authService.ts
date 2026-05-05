import { hasSupabaseConfig, supabase } from "../../lib/supabaseClient";
import type { AcademicDesignation, Cargo, Carrera, Role, User } from "../context/UserContext";

type GenericRow = Record<string, unknown>;

const QUERY_TIMEOUT_MS = Number(import.meta.env.VITE_SUPABASE_TIMEOUT_MS ?? 2500);
const configuredRolesTable = (import.meta.env.VITE_SUPABASE_ROLES_TABLE ?? "designaciones").trim();
const ROLES_TABLE_CANDIDATES = Array.from(new Set([configuredRolesTable, "designaciones", "designacioens"]));

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

function mapDesignacionRowToAcademicDesignation(
  row: GenericRow,
  index: number,
  idDocente: string,
  fallbackCarrera: string,
): AcademicDesignation {
  const rolSistema = getString(row, ["rol_sistema"], "docente");
  const asignatura = getString(row, ["asignatura"], "");
  const carrera = getString(row, ["carrera"], fallbackCarrera);
  const cargo = getString(row, ["cargo"], "");
  const stableFallbackId = `designaciones-${idDocente}-${index}-${asignatura || "sin_asignatura"}-${rolSistema || "docente"}`;

  return {
    id: getString(row, ["id_designacion"], stableFallbackId),
    carrera,
    asignatura,
    cargo,
    rolSistema,
    academicRole: normalizeAcademicRole(rolSistema),
  };
}

function getGeneralRoleFromDesignaciones(designaciones: AcademicDesignation[]): Role {
  return designaciones.some((designacion) => designacion.academicRole === "DOCENTE_RESPONSABLE")
    ? "DOCENTE_RESPONSABLE"
    : "DOCENTE";
}

function applyDesignacionesToUser(user: User, designaciones: AcademicDesignation[]): User {
  const materiaPrimaria = designaciones[0]?.asignatura?.trim();
  const carreraPrimaria = designaciones[0]?.carrera?.trim();
  const cargoPrimario = designaciones[0]?.cargo?.trim();

  return {
    ...user,
    rol: getGeneralRoleFromDesignaciones(designaciones),
    materia: materiaPrimaria || user.materia,
    carrera: normalizeCarrera(carreraPrimaria || user.carrera),
    cargo: normalizeCargo(cargoPrimario || user.cargo),
    designaciones,
  };
}

function mapDocenteRowWithDesignacionesToUser(row: GenericRow): User | null {
  const user = mapDocenteRowToUser(row);
  if (!user) return null;

  const rows = Array.isArray(row.designaciones) ? row.designaciones : [];
  const designaciones = rows.map((designacion, index) =>
    mapDesignacionRowToAcademicDesignation(designacion as GenericRow, index, user.idDocente ?? user.dni, user.carrera),
  );

  return applyDesignacionesToUser(user, designaciones);
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

    if (error) return null;

    if (!data) return null;
    const docente = mapDocenteRowToUser(data as GenericRow);
    return docente ? enrichUserWithRoles(docente) : null;
  } finally {
    clearTimeout(timer);
  }
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

      const designaciones = ((data ?? []) as GenericRow[]).map((row, index) =>
        mapDesignacionRowToAcademicDesignation(row, index, idDocente, user.carrera),
      );

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
  const designaciones = await resolveAcademicDesignaciones(user);
  return applyDesignacionesToUser(user, designaciones);
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

  let baseUser = await findDocenteByDni(cleanDni);
  let rpcErrorMessage = "";

  if (!baseUser) {
    try {
      baseUser = await loginByDniRpc(cleanDni);
    } catch (error) {
      rpcErrorMessage = error instanceof Error ? error.message : "Fallo desconocido en RPC de login.";
    }
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
      .select("*, designaciones(*)")
      .order("apellido", { ascending: true })
      .order("nombre", { ascending: true })
      .limit(5000)
      .abortSignal(controller.signal);

    if (error) {
      if (isRecoverableError(error)) {
        return getProfesoresFromSupabaseFallback();
      }

      console.warn("No se pudo cargar docentes desde Supabase:", error);
      return [];
    }

    const docentesBase = dedupeUsers(((data ?? []) as GenericRow[])
      .map((row) => mapDocenteRowWithDesignacionesToUser(row))
      .filter((item): item is User => Boolean(item)));

    return docentesBase;
  } finally {
    clearTimeout(timer);
  }
}

async function getProfesoresFromSupabaseFallback(): Promise<User[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), QUERY_TIMEOUT_MS);

  try {
    const [docentesResult, designacionesResult] = await Promise.all([
      supabase
        .from("docentes")
        .select("*")
        .order("apellido", { ascending: true })
        .order("nombre", { ascending: true })
        .limit(5000)
        .abortSignal(controller.signal),
      supabase
        .from("designaciones")
        .select("*")
        .limit(10000)
        .abortSignal(controller.signal),
    ]);

    if (docentesResult.error) {
      if (!isRecoverableError(docentesResult.error)) {
        console.warn("No se pudo cargar docentes desde Supabase:", docentesResult.error);
      }
      return [];
    }

    const designacionesByDocente = new Map<string, GenericRow[]>();
    if (!designacionesResult.error) {
      for (const row of (designacionesResult.data ?? []) as GenericRow[]) {
        const idDocente = getString(row, ["id_docente"], "");
        if (!idDocente) continue;

        const rows = designacionesByDocente.get(idDocente) ?? [];
        rows.push(row);
        designacionesByDocente.set(idDocente, rows);
      }
    } else if (!isRecoverableError(designacionesResult.error)) {
      console.warn("No se pudo cargar designaciones desde Supabase:", designacionesResult.error);
    }

    return dedupeUsers(((docentesResult.data ?? []) as GenericRow[])
      .map((row) => {
        const user = mapDocenteRowToUser(row);
        if (!user) return null;

        const rows = designacionesByDocente.get(user.idDocente ?? "") ?? [];
        const designaciones = rows.map((designacion, index) =>
          mapDesignacionRowToAcademicDesignation(designacion, index, user.idDocente ?? user.dni, user.carrera),
        );
        return applyDesignacionesToUser(user, designaciones);
      })
      .filter((item): item is User => Boolean(item)));
  } finally {
    clearTimeout(timer);
  }
}
