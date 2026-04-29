import { hasSupabaseConfig, supabase } from "../../lib/supabaseClient";
import type { Cargo, Carrera, Role, User } from "../context/UserContext";

type GenericRow = Record<string, unknown>;

const DEFAULT_TABLES = ["docentes", "docente", "profesores", "usuarios", "profiles", "perfiles"];
const DEFAULT_DNI_COLUMNS = ["dni", "documento", "nro_dni", "numero_dni", "n_documento", "documento_numero"];
const QUERY_TIMEOUT_MS = Number(import.meta.env.VITE_SUPABASE_TIMEOUT_MS ?? 2500);

const configuredUsersTable = (import.meta.env.VITE_SUPABASE_USERS_TABLE ?? "").trim();
const configuredDniColumn = (import.meta.env.VITE_SUPABASE_DNI_COLUMN ?? "").trim();
const configuredRolesTable = (import.meta.env.VITE_SUPABASE_ROLES_TABLE ?? "").trim();

function uniqueNonEmpty(values: string[]): string[] {
  return values.filter((value, idx, arr): value is string => Boolean(value) && arr.indexOf(value) === idx);
}

const tableCandidates = uniqueNonEmpty([
  configuredUsersTable,
  configuredUsersTable.toLowerCase(),
  configuredUsersTable.toUpperCase(),
  ...DEFAULT_TABLES,
]);

const dniColumnCandidates = uniqueNonEmpty([
  configuredDniColumn,
  configuredDniColumn.toLowerCase(),
  configuredDniColumn.toUpperCase(),
  ...DEFAULT_DNI_COLUMNS,
]);

const ignoredDbCodes = new Set(["42P01", "42703", "PGRST205", "42501"]);
const rolesTableCandidates = uniqueNonEmpty([
  configuredRolesTable,
  configuredRolesTable.toLowerCase(),
  configuredRolesTable.toUpperCase(),
  "designacioens",
  "designaciones",
]);

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
  const role = rawRole
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  const map: Record<string, Role> = {
    DOCENTE: "DOCENTE",
    DOCENTE_RESPONSABLE: "DOCENTE_RESPONSABLE",
    RESPONSABLE_CATEDRA: "DOCENTE_RESPONSABLE",
    RESPONSABLE_DE_CATEDRA: "DOCENTE_RESPONSABLE",
    RESPONSABLEDECATEDRA: "DOCENTE_RESPONSABLE",
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

  const nombreCompuesto = `${getString(row, ["nombre", "first_name"], "").trim()} ${getString(
    row,
    ["apellido", "last_name"],
    "",
  ).trim()}`.trim();
  const nombre =
    getString(row, ["nombre_completo", "full_name", "display_name"]) ||
    nombreCompuesto ||
    "";

  // Evita usuarios "vacíos" que terminan apareciendo como "Docente" repetido.
  if (!nombre || nombre.toLowerCase() === "docente") {
    return null;
  }

  const rol = normalizeRole(getString(row, ["rol", "role", "perfil", "tipo_usuario", "funcion"], "DOCENTE"));
  const carrera = normalizeCarrera(getString(row, ["carrera", "departamento", "carrera_nombre"], "Todas"));
  const cargo = normalizeCargo(getString(row, ["cargo", "puesto", "categoria"], "Administrativo"));

  const idDocente = getString(row, ["id_docente", "docente_id", "id"], "");

  return {
    idDocente: idDocente || undefined,
    nombre,
    dni,
    carrera,
    cargo,
    materia: getString(row, ["materia", "asignatura"], "-") || "-",
    rol,
    email: getString(row, ["email", "correo", "mail"], `${dni}@faud.edu.ar`) || `${dni}@faud.edu.ar`,
  };
}

function mapRpcRowToUser(row: GenericRow): User | null {
  const dni = getString(row, ["dni"], "").replace(/\D/g, "");
  if (!dni) return null;

  const nombreCompuesto = `${getString(row, ["nombre"], "").trim()} ${getString(row, ["apellido"], "").trim()}`.trim();
  const nombre = getString(row, ["nombre_completo"], "") || nombreCompuesto;
  if (!nombre) return null;

  return {
    idDocente: getString(row, ["id_docente"], "") || undefined,
    nombre,
    dni,
    carrera: normalizeCarrera(getString(row, ["carrera"], "Todas")),
    cargo: normalizeCargo(getString(row, ["cargo"], "Administrativo")),
    materia: getString(row, ["materia", "asignatura"], "-") || "-",
    rol: normalizeRole(getString(row, ["rol_sistema", "rol"], "DOCENTE")),
    email: getString(row, ["email"], `${dni}@faud.edu.ar`) || `${dni}@faud.edu.ar`,
  };
}

async function loginByDniRpc(dni: string): Promise<User | null> {
  const { data, error } = await supabase.rpc("login_docente_by_dni", { p_dni: dni });
  if (error) {
    throw new Error(`No se pudo ejecutar login seguro por RPC: ${error.message}`);
  }

  if (!Array.isArray(data) || data.length === 0) {
    return null;
  }

  return mapRpcRowToUser((data[0] ?? {}) as GenericRow);
}

async function resolveRoleFromSistema(user: User): Promise<Role | null> {
  if (!hasSupabaseConfig) return null;

  const idDocente = user.idDocente?.trim() ?? "";
  const dni = user.dni.replace(/\D/g, "");

  for (const tableName of rolesTableCandidates) {
    const attempts = [
      idDocente ? supabase.from(tableName).select("*").eq("id_docente", idDocente).limit(1) : null,
      dni ? supabase.from(tableName).select("*").eq("dni", dni).limit(1) : null,
    ].filter(Boolean);

    for (const attempt of attempts) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), QUERY_TIMEOUT_MS);

      try {
        const { data, error } = await attempt!.abortSignal(controller.signal).maybeSingle();
        if (error) {
          if (isRecoverableError(error)) continue;
          continue;
        }
        if (!data) continue;

        const roleRaw = getString(data as GenericRow, ["rol_sistema", "rol", "role", "perfil"], "");
        if (!roleRaw) continue;
        return normalizeRole(roleRaw);
      } catch (error) {
        if (!isRecoverableError(error)) {
          console.warn(`No se pudo resolver rol en ${tableName}:`, error);
        }
      } finally {
        clearTimeout(timer);
      }
    }
  }

  return null;
}

function rolePriority(role: Role): number {
  const priority: Record<Role, number> = {
    DOCENTE: 1,
    DOCENTE_RESPONSABLE: 2,
    ADMINISTRATIVO: 3,
    SECRETARIA: 4,
    SEC_TECNICA: 5,
    JEFE_CARRERA: 6,
  };
  return priority[role] ?? 0;
}

async function resolveRolesForDocentes(docentes: User[]): Promise<Map<string, Role>> {
  const roleByDocenteId = new Map<string, Role>();
  const ids = docentes.map((d) => d.idDocente?.trim() ?? "").filter(Boolean);
  if (ids.length === 0) return roleByDocenteId;

  const uniqueIds = Array.from(new Set(ids));

  for (const tableName of rolesTableCandidates) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), QUERY_TIMEOUT_MS);
    try {
      const { data, error } = await supabase
        .from(tableName)
        .select("*")
        .in("id_docente", uniqueIds)
        .abortSignal(controller.signal);

      if (error) {
        if (isRecoverableError(error)) continue;
        continue;
      }

      for (const raw of (data ?? []) as GenericRow[]) {
        const idDocente = getString(raw, ["id_docente", "docente_id"], "").trim();
        if (!idDocente) continue;
        const roleRaw = getString(raw, ["rol_sistema", "rol", "role", "perfil"], "");
        if (!roleRaw) continue;
        const parsedRole = normalizeRole(roleRaw);
        const current = roleByDocenteId.get(idDocente);
        if (!current || rolePriority(parsedRole) > rolePriority(current)) {
          roleByDocenteId.set(idDocente, parsedRole);
        }
      }

      if (roleByDocenteId.size > 0) {
        return roleByDocenteId;
      }
    } catch (error) {
      if (!isRecoverableError(error)) {
        console.warn(`No se pudo resolver roles masivos en ${tableName}:`, error);
      }
    } finally {
      clearTimeout(timer);
    }
  }

  return roleByDocenteId;
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
  let rpcErrorMessage = "";

  try {
    const userFromRpc = await loginByDniRpc(cleanDni);
    if (userFromRpc) return userFromRpc;
  } catch (error) {
    rpcErrorMessage = error instanceof Error ? error.message : "Fallo desconocido en RPC de login.";
    console.warn("RPC login_docente_by_dni no disponible o falló:", error);
  }

  for (const tableName of tableCandidates) {
    const user = await findByDniInTable(tableName, cleanDni);
    if (user) {
      const roleFromSistema = await resolveRoleFromSistema(user);
      if (roleFromSistema) {
        return { ...user, rol: roleFromSistema };
      }
      return user;
    }
  }

  const docentes = await getProfesoresFromSupabase();
  const docente = docentes.find((item) => item.dni === cleanDni) ?? null;
  if (!docente) {
    if (rpcErrorMessage) {
      throw new Error(rpcErrorMessage);
    }
    return null;
  }
  const roleFromSistema = await resolveRoleFromSistema(docente);
  if (roleFromSistema) {
    return { ...docente, rol: roleFromSistema };
  }
  return docente;
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

  const uniqueDocentes = dedupeUsers(collected);
  const rolesByDocente = await resolveRolesForDocentes(uniqueDocentes);

  return uniqueDocentes.map((docente) => {
    const idDocente = docente.idDocente?.trim() ?? "";
    if (!idDocente) return docente;
    const role = rolesByDocente.get(idDocente);
    if (!role) return docente;
    return { ...docente, rol: role };
  });
}
