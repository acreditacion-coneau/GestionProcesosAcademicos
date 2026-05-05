import { hasSupabaseConfig, supabase } from "../../lib/supabaseClient";
import type { AcademicDesignation, Cargo, Carrera, GlobalRole, User } from "../context/UserContext";
import { mapGlobalRoleToAppRole } from "../context/UserContext";

type GenericRow = Record<string, unknown>;

const QUERY_TIMEOUT_MS = Number(import.meta.env.VITE_SUPABASE_TIMEOUT_MS ?? 2500);

function normalizeDniInput(dni: string | number): string {
  return String(dni).trim().replace(/[.\s]/g, "");
}

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
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function normalizeGlobalRole(rawRole: string): GlobalRole {
  const role = normalizeToken(rawRole);
  const allowed: GlobalRole[] = [
    "decano",
    "secretaria_academica",
    "secretaria_tecnica",
    "jefe_carrera",
    "responsable_extension",
    "responsable_investigacion",
    "administrativo",
    "docente",
  ];
  return allowed.includes(role as GlobalRole) ? (role as GlobalRole) : "docente";
}

function normalizeAcademicRole(rawRole: string): "DOCENTE" | "DOCENTE_RESPONSABLE" {
  const role = normalizeToken(rawRole);
  return role.includes("responsable") ? "DOCENTE_RESPONSABLE" : "DOCENTE";
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

function mapDesignacionRowToAcademicDesignation(row: GenericRow, index: number, idDocente: string): AcademicDesignation {
  const rolSistema = getString(row, ["rol_sistema"], "docente");
  const asignatura = getString(row, ["asignatura"], "");
  const stableFallbackId = `designaciones-${idDocente}-${index}-${asignatura || "sin_asignatura"}-${rolSistema || "docente"}`;

  return {
    id: getString(row, ["id_designacion", "id"], stableFallbackId),
    carrera: getString(row, ["carrera"], "Todas"),
    asignatura,
    cargo: getString(row, ["cargo"], ""),
    rolSistema,
    academicRole: normalizeAcademicRole(rolSistema),
  };
}

function mapUsuarioRowToUser(row: GenericRow): User | null {
  const dni = getString(row, ["dni"], "").replace(/\D/g, "");
  if (!dni) return null;

  const nombre = getString(row, ["nombre"], "");
  const apellido = getString(row, ["apellido"], "");
  if (!nombre) return null;

  const globalRole = normalizeGlobalRole(getString(row, ["rol_global", "rol", "role"], "docente"));

  return {
    idUsuario: getString(row, ["id_usuario"], "") || undefined,
    idDocente: getString(row, ["id_docente"], "") || undefined,
    nombre,
    apellido,
    dni,
    carrera: "Todas",
    cargo: "Administrativo",
    materia: "-",
    rol: mapGlobalRoleToAppRole(globalRole),
    globalRole,
    email: getString(row, ["email"], `${dni}@faud.edu.ar`) || `${dni}@faud.edu.ar`,
    designaciones: [],
  };
}

async function resolveAcademicDesignaciones(user: User): Promise<AcademicDesignation[]> {
  const idDocente = user.idDocente?.trim() ?? "";
  if (!idDocente) return [];

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), QUERY_TIMEOUT_MS);

  try {
    const { data, error } = await supabase
      .from("designaciones")
      .select("*")
      .eq("id_docente", idDocente)
      .abortSignal(controller.signal);

    if (error) {
      if (!isRecoverableError(error)) {
        console.warn("No se pudo resolver designaciones:", error);
      }
      return [];
    }

    console.log("Designaciones cargadas:", { idDocente, data });

    return ((data ?? []) as GenericRow[]).map((row, index) =>
      mapDesignacionRowToAcademicDesignation(row, index, idDocente),
    );
  } finally {
    clearTimeout(timer);
  }
}

async function enrichUserWithDesignaciones(user: User): Promise<User> {
  const designaciones = await resolveAcademicDesignaciones(user);
  const first = designaciones[0];

  return {
    ...user,
    carrera: normalizeCarrera(first?.carrera || user.carrera),
    cargo: normalizeCargo(first?.cargo || user.cargo),
    materia: first?.asignatura || user.materia,
    designaciones,
  };
}

async function loginUsuarioByDniRpc(dni: string): Promise<User | null> {
  const pDni = normalizeDniInput(dni);
  console.log("DNI enviado:", pDni);

  const dniClean = String(dni)
  .replace(/\./g, '')
  .trim();

console.log("DNI ingresado:", dni);
console.log("DNI limpio:", dniClean);

const { data, error } = await supabase.rpc('login_usuario_by_dni', {
  p_dni: dniClean
});

console.log("Respuesta RPC:", data);
console.log("Primer elemento:", JSON.stringify(data[0]));
console.log("Error RPC:", error);

  if (error) {
    throw error;
  }

  if (!data || (Array.isArray(data) && data.length === 0)) {
    throw new Error("DNI no encontrado");
  }

  const userRow = Array.isArray(data) ? data[0] : data;
  const row = { ...(userRow ?? {}), dni } as GenericRow;
  return mapUsuarioRowToUser(row);
}

async function findUsuarioByDni(dni: string): Promise<User | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), QUERY_TIMEOUT_MS);

  try {
    const { data, error } = await supabase
      .from("usuarios")
      .select("id_usuario,nombre,apellido,email,dni,rol,id_docente")
      .eq("dni", dni)
      .limit(1)
      .abortSignal(controller.signal)
      .maybeSingle();

    if (error) return null;
    return data ? mapUsuarioRowToUser(data as GenericRow) : null;
  } finally {
    clearTimeout(timer);
  }
}

export async function loginByDni(dni: string): Promise<User | null> {
  if (!hasSupabaseConfig) return null;

  const cleanDni = normalizeDniInput(dni);
  if (!cleanDni) return null;

  let baseUser: User | null = null;
  let rpcErrorMessage = "";

  try {
    baseUser = await loginUsuarioByDniRpc(cleanDni);
  } catch (error) {
    rpcErrorMessage = error instanceof Error ? error.message : "Fallo desconocido en RPC de login.";
  }

  if (!baseUser) {
    baseUser = await findUsuarioByDni(cleanDni);
  }

  if (!baseUser) {
    if (rpcErrorMessage) throw new Error(rpcErrorMessage);
    return null;
  }

  return enrichUserWithDesignaciones(baseUser);
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

export async function getProfesoresFromSupabase(): Promise<User[]> {
  if (!hasSupabaseConfig) return [];

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), QUERY_TIMEOUT_MS);

  try {
    const [usuariosResult, designacionesResult] = await Promise.all([
      supabase
        .from("usuarios")
        .select("id_usuario,nombre,apellido,email,dni,rol,id_docente")
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

    if (usuariosResult.error) {
      if (!isRecoverableError(usuariosResult.error)) {
        console.warn("No se pudo cargar usuarios desde Supabase:", usuariosResult.error);
      }
      return [];
    }

    const designacionesByDocente = new Map<string, AcademicDesignation[]>();
    if (!designacionesResult.error) {
      for (const row of (designacionesResult.data ?? []) as GenericRow[]) {
        const idDocente = getString(row, ["id_docente"], "");
        if (!idDocente) continue;

        const rows = designacionesByDocente.get(idDocente) ?? [];
        rows.push(mapDesignacionRowToAcademicDesignation(row, rows.length, idDocente));
        designacionesByDocente.set(idDocente, rows);
      }
    } else if (!isRecoverableError(designacionesResult.error)) {
      console.warn("No se pudo cargar designaciones desde Supabase:", designacionesResult.error);
    }

    const usuarios = ((usuariosResult.data ?? []) as GenericRow[])
      .map((row) => mapUsuarioRowToUser(row))
      .filter((item): item is User => Boolean(item))
      .map((user) => {
        const designaciones = designacionesByDocente.get(user.idDocente ?? "") ?? [];
        const first = designaciones[0];
        return {
          ...user,
          carrera: normalizeCarrera(first?.carrera || user.carrera),
          cargo: normalizeCargo(first?.cargo || user.cargo),
          materia: first?.asignatura || user.materia,
          designaciones,
        };
      });

    return dedupeUsers(usuarios);
  } finally {
    clearTimeout(timer);
  }
}
