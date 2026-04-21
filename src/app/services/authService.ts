import { hasSupabaseConfig, supabase } from "../../lib/supabaseClient";
import type { Cargo, Carrera, Role, User } from "../context/UserContext";

type GenericRow = Record<string, unknown>;

const DEFAULT_TABLES = ["docentes", "docente", "profesores", "usuarios", "profiles", "perfiles"];
const DEFAULT_DNI_COLUMNS = ["dni", "documento", "nro_dni", "numero_dni", "n_documento", "documento_numero"];
const QUERY_TIMEOUT_MS = Number(import.meta.env.VITE_SUPABASE_TIMEOUT_MS ?? 2500);

const configuredUsersTable = (import.meta.env.VITE_SUPABASE_USERS_TABLE ?? "").trim();
const configuredDniColumn = (import.meta.env.VITE_SUPABASE_DNI_COLUMN ?? "").trim();

const tableCandidates = (configuredUsersTable ? [configuredUsersTable] : DEFAULT_TABLES).filter(
  (table, idx, arr): table is string => Boolean(table) && arr.indexOf(table) === idx,
);
const dniColumnCandidates = (configuredDniColumn ? [configuredDniColumn] : DEFAULT_DNI_COLUMNS).filter(
  (column, idx, arr): column is string => Boolean(column) && arr.indexOf(column) === idx,
);

const ignoredDbCodes = new Set(["42P01", "42703", "PGRST205", "42501"]);

function getString(row: GenericRow, keys: string[], fallback = ""): string {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
    if (typeof value === "number" || typeof value === "bigint") {
      return String(value);
    }
  }
  return fallback;
}

function normalizeRole(rawRole: string): Role {
  const role = rawRole.toUpperCase().replace(/\s+/g, "_");
  const map: Record<string, Role> = {
    DOCENTE: "DOCENTE",
    DOCENTE_RESPONSABLE: "DOCENTE_RESPONSABLE",
    RESPONSABLE_CATEDRA: "DOCENTE_RESPONSABLE",
    RESPONSABLE: "DOCENTE_RESPONSABLE",
    JEFE_CARRERA: "JEFE_CARRERA",
    JEFE_DE_CARRERA: "JEFE_CARRERA",
    SECRETARIA: "SECRETARIA",
    SECRETARIA_ACADEMICA: "SECRETARIA",
    SEC_ACADEMICA: "SECRETARIA",
    ADMINISTRATIVO: "ADMINISTRATIVO",
    MESA_DE_AYUDA: "ADMINISTRATIVO",
    MESA_AYUDA: "ADMINISTRATIVO",
    SEC_TECNICA: "SEC_TECNICA",
    SECRETARIA_TECNICA: "SEC_TECNICA",
    TECNICA: "SEC_TECNICA",
  };
  return map[role] ?? "DOCENTE";
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

function mapRowToUser(row: GenericRow): User | null {
  const dni = getString(row, dniColumnCandidates).replace(/\D/g, "");
  if (!dni) return null;

  const nombre =
    getString(row, ["nombre_completo", "full_name", "nombre"]) ||
    `${getString(row, ["nombre"], "").trim()} ${getString(row, ["apellido"], "").trim()}`.trim() ||
    "Docente";

  const rol = normalizeRole(getString(row, ["rol", "role", "perfil", "tipo_usuario", "funcion"], "DOCENTE"));
  const carrera = normalizeCarrera(getString(row, ["carrera", "departamento", "carrera_nombre"], "Todas"));
  const cargo = normalizeCargo(getString(row, ["cargo", "puesto", "categoria"], "Administrativo"));

  return {
    nombre,
    dni,
    carrera,
    cargo,
    materia: getString(row, ["materia", "asignatura"], "-") || "-",
    rol,
    email: getString(row, ["email", "correo", "mail"], `${dni}@faud.edu.ar`) || `${dni}@faud.edu.ar`,
  };
}

function isRecoverableError(error: unknown): boolean {
  const code = (error as { code?: string })?.code;
  if (code && ignoredDbCodes.has(code)) return true;

  const message = (error as { message?: string })?.message?.toLowerCase() ?? "";
  return (
    message.includes("relation") ||
    message.includes("column") ||
    message.includes("permission denied") ||
    message.includes("does not exist") ||
    message.includes("forbidden") ||
    message.includes("network") ||
    message.includes("fetch")
  );
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

async function findByDniInTable(tableName: string, dni: string): Promise<User | null> {
  const dniNumber = Number.parseInt(dni, 10);
  const hasNumericDni = Number.isFinite(dniNumber);

  for (const dniColumn of dniColumnCandidates) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), QUERY_TIMEOUT_MS);

    try {
      const { data, error } = await supabase
        .from(tableName)
        .select("*")
        .eq(dniColumn, dni)
        .limit(1)
        .abortSignal(controller.signal)
        .maybeSingle();

      if (error) {
        if (isRecoverableError(error)) {
          continue;
        }
        continue;
      }

      if (data) {
        const mapped = mapRowToUser(data as GenericRow);
        if (mapped) {
          return mapped;
        }
      }

      if (hasNumericDni) {
        const { data: numericData, error: numericError } = await supabase
          .from(tableName)
          .select("*")
          .eq(dniColumn, dniNumber)
          .limit(1)
          .abortSignal(controller.signal)
          .maybeSingle();

        if (!numericError && numericData) {
          const mappedNumeric = mapRowToUser(numericData as GenericRow);
          if (mappedNumeric) {
            return mappedNumeric;
          }
        }
      }
    } catch (error) {
      if (!isRecoverableError(error)) {
        console.warn(`Consulta falló en ${tableName}.${dniColumn}:`, error);
      }
    } finally {
      clearTimeout(timer);
    }
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), QUERY_TIMEOUT_MS);

  try {
    const { data, error } = await supabase
      .from(tableName)
      .select("*")
      .limit(1000)
      .abortSignal(controller.signal);

    if (!error && data) {
      const matching = data.map((row) => mapRowToUser(row as GenericRow)).find((user) => user?.dni === dni) ?? null;
      if (matching) {
        return matching;
      }
    }
  } catch (error) {
    if (!isRecoverableError(error)) {
      console.warn(`Búsqueda amplia por DNI falló en ${tableName}:`, error);
    }
  } finally {
    clearTimeout(timer);
  }

  return null;
}

export async function loginByDni(dni: string): Promise<User | null> {
  if (!hasSupabaseConfig) return null;

  const cleanDni = dni.replace(/\D/g, "");
  if (!cleanDni) return null;

  for (const tableName of tableCandidates) {
    const user = await findByDniInTable(tableName, cleanDni);
    if (user) return user;
  }

  const docentes = await getProfesoresFromSupabase();
  return docentes.find((docente) => docente.dni === cleanDni) ?? null;
}

export async function getProfesoresFromSupabase(): Promise<User[]> {
  if (!hasSupabaseConfig) return [];

  const collected: User[] = [];

  for (const tableName of tableCandidates) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), QUERY_TIMEOUT_MS);

    try {
      const { data, error } = await supabase
        .from(tableName)
        .select("*")
        .limit(500)
        .abortSignal(controller.signal);

      if (error) {
        if (isRecoverableError(error)) {
          continue;
        }
        continue;
      }

      for (const row of data ?? []) {
        const mapped = mapRowToUser(row as GenericRow);
        if (mapped) {
          collected.push(mapped);
        }
      }
    } catch (error) {
      if (!isRecoverableError(error)) {
        console.warn(`Carga de docentes falló en ${tableName}:`, error);
      }
    } finally {
      clearTimeout(timer);
    }
  }

  return dedupeUsers(collected);
}
