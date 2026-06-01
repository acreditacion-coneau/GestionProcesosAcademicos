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
  const aliases: Record<string, GlobalRole> = {
    jefe_de_carrera: "jefe_carrera",
    secretaria_academica: "secretaria_academica",
    secretaria_tecnica: "secretaria_tecnica",
    responsable_de_catedra: "responsable",
    responsable_catedra: "responsable",
  };
  const normalized = aliases[role] ?? role;
  const allowed: GlobalRole[] = [
    "decano",
    "secretaria_academica",
    "secretaria_tecnica",
    "jefe_carrera",
    "responsable_extension",
    "responsable_investigacion",
    "administrativo",
    "responsable",
    "docente",
    "ayudante_alumno",
    "ayudante_adscripto",
  ];
  return allowed.includes(normalized as GlobalRole) ? (normalized as GlobalRole) : "docente";
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

function mapDesignacionRowToAcademicDesignation(
  row: GenericRow,
  index: number,
  idDocente: string,
  asignaturasById?: Map<string, GenericRow>,
  carrerasById?: Map<string, GenericRow>,
): AcademicDesignation {
  const idAsignatura = getString(row, ["id_asignatura"], "");
  const asignaturaRow = idAsignatura ? asignaturasById?.get(idAsignatura) : undefined;
  const idCarrera = getString(row, ["id_carrera"], "") || getString(asignaturaRow ?? {}, ["id_carrera"], "");
  const carreraRow = idCarrera ? carrerasById?.get(idCarrera) : undefined;
  const rolSistema = getString(row, ["rol_sistema", "rol", "role"], "docente");
  const asignatura = getString(row, ["asignatura", "materia"], "") || getString(asignaturaRow ?? {}, ["nombre"], "");
  const stableFallbackId = `designaciones-${idDocente}-${index}-${asignatura || "sin_asignatura"}-${rolSistema || "docente"}`;

  return {
    id: getString(row, ["id_designacion", "id"], stableFallbackId),
    idAsignatura: idAsignatura || undefined,
    idCarrera: idCarrera || undefined,
    carrera: getString(row, ["carrera"], "") || getString(carreraRow ?? {}, ["nombre"], "Todas"),
    asignatura,
    cargo: getString(row, ["cargo"], ""),
    rolSistema,
    academicRole: normalizeAcademicRole(rolSistema),
  };
}

function getIdDocenteFromRow(row: GenericRow): string {
  return getString(row, ["id_docente", "docente_id", "idDocente", "id"], "");
}

function mapInlineDesignacionFromUserRow(row: GenericRow, idDocente: string): AcademicDesignation[] {
  const asignatura = getString(row, ["asignatura", "materia"], "");
  const rolSistema = getString(row, ["rol_sistema", "rol_academico"], "");
  const cargo = getString(row, ["cargo"], "");
  const carrera = getString(row, ["carrera"], "");

  if (!asignatura && !rolSistema && !cargo && !carrera) return [];

  return [
    mapDesignacionRowToAcademicDesignation(
      {
        id: getString(row, ["id_designacion", "designacion_id"], ""),
        id_docente: idDocente,
        carrera,
        asignatura,
        cargo,
        rol_sistema: rolSistema || "docente",
      },
      0,
      idDocente,
    ),
  ];
}

function mapUsuarioRowToUser(row: GenericRow): User | null {
  const dni = getString(row, ["dni"], "").replace(/\D/g, "");
  if (!dni) return null;

  const nombre = getString(row, ["nombre"], "");
  const apellido = getString(row, ["apellido"], "");
  if (!nombre) return null;

  const globalRole = normalizeGlobalRole(getString(row, ["rol_global", "global_role", "rol", "role"], "docente"));
  const idDocente = getIdDocenteFromRow(row) || undefined;
  const designaciones = idDocente ? mapInlineDesignacionFromUserRow(row, idDocente) : [];

  return {
    idUsuario: getString(row, ["id_usuario"], "") || undefined,
    idDocente,
    nombre,
    apellido,
    dni,
    carrera: "Todas",
    cargo: "Administrativo",
    materia: "-",
    rol: mapGlobalRoleToAppRole(globalRole),
    globalRole,
    email: getString(row, ["email"], `${dni}@faud.edu.ar`) || `${dni}@faud.edu.ar`,
    designaciones,
  };
}

function mergeUsersByDni(users: User[]): User | null {
  if (users.length === 0) return null;

  const seed = users[0];
  const firstInstitutional = users.find((u) => u.globalRole && u.globalRole !== "docente");
  const globalRole = firstInstitutional?.globalRole ?? seed.globalRole ?? "docente";
  const idDocente = users.find((u) => u.idDocente?.trim())?.idDocente ?? seed.idDocente;
  const email = users.find((u) => u.email?.trim())?.email ?? seed.email;

  const mergedDesignaciones = users
    .flatMap((u) => u.designaciones ?? [])
    .reduce<AcademicDesignation[]>((acc, item) => {
      const key = `${item.id ?? ""}|${item.asignatura}|${item.rolSistema}|${item.cargo}|${item.carrera}`;
      if (!acc.some((existing) => `${existing.id ?? ""}|${existing.asignatura}|${existing.rolSistema}|${existing.cargo}|${existing.carrera}` === key)) {
        acc.push(item);
      }
      return acc;
    }, []);

  return {
    ...seed,
    globalRole,
    rol: mapGlobalRoleToAppRole(globalRole),
    idDocente,
    email,
    designaciones: mergedDesignaciones,
  };
}

async function loadCatalogMapsByAsignaturaIds(asignaturaIds: string[]): Promise<{
  asignaturasById: Map<string, GenericRow>;
  carrerasById: Map<string, GenericRow>;
}> {
  const ids = Array.from(new Set(asignaturaIds.filter(Boolean)));
  const asignaturasById = new Map<string, GenericRow>();
  const carrerasById = new Map<string, GenericRow>();

  if (ids.length === 0) {
    return { asignaturasById, carrerasById };
  }

  const { data: asignaturasData, error: asignaturasError } = await supabase
    .from("asignaturas")
    .select("id_asignatura,nombre,id_carrera,anio,regimen")
    .in("id_asignatura", ids);

  if (asignaturasError) {
    if (!isRecoverableError(asignaturasError)) {
      console.warn("No se pudieron cargar asignaturas para designaciones:", asignaturasError);
    }
    return { asignaturasById, carrerasById };
  }

  const asignaturasRows = (asignaturasData ?? []) as GenericRow[];
  for (const row of asignaturasRows) {
    const id = getString(row, ["id_asignatura"], "");
    if (id) asignaturasById.set(id, row);
  }

  const carreraIds = Array.from(new Set(asignaturasRows.map((row) => getString(row, ["id_carrera"], "")).filter(Boolean)));
  if (carreraIds.length === 0) {
    return { asignaturasById, carrerasById };
  }

  const { data: carrerasData, error: carrerasError } = await supabase
    .from("carreras")
    .select("id_carrera,nombre")
    .in("id_carrera", carreraIds);

  if (carrerasError) {
    if (!isRecoverableError(carrerasError)) {
      console.warn("No se pudieron cargar carreras para designaciones:", carrerasError);
    }
    return { asignaturasById, carrerasById };
  }

  for (const row of (carrerasData ?? []) as GenericRow[]) {
    const id = getString(row, ["id_carrera"], "");
    if (id) carrerasById.set(id, row);
  }

  return { asignaturasById, carrerasById };
}

async function resolveAcademicDesignaciones(user: User): Promise<AcademicDesignation[]> {
  const idDocente = user.idDocente?.trim() ?? "";
  if (!idDocente) return [];

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), QUERY_TIMEOUT_MS);

  try {
    const { data, error } = await supabase
      .from("designaciones")
      .select("id,cargo,rol_sistema,id_docente,id_asignatura")
      .eq("id_docente", idDocente)
      .abortSignal(controller.signal);

    if (error) {
      if (!isRecoverableError(error)) {
        console.warn("No se pudo resolver designaciones:", error);
      }
      return [];
    }

    console.log("Designaciones cargadas:", { idDocente, data });

    const rows = (data ?? []) as GenericRow[];
    const asignaturaIds = rows.map((row) => getString(row, ["id_asignatura"], ""));
    const { asignaturasById, carrerasById } = await loadCatalogMapsByAsignaturaIds(asignaturaIds);

    return rows.map((row, index) =>
      mapDesignacionRowToAcademicDesignation(row, index, idDocente, asignaturasById, carrerasById),
    );
  } finally {
    clearTimeout(timer);
  }
}

async function enrichUserWithDesignaciones(user: User): Promise<User> {
  const loadedDesignaciones = await resolveAcademicDesignaciones(user);
  const designaciones = loadedDesignaciones.length > 0 ? loadedDesignaciones : (user.designaciones ?? []);
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
  const dniClean = normalizeDniInput(dni);
  const rpcCandidates = ["login_usuario_by_dni", "login_docente_by_dni"];
  let lastError: unknown = null;
  let data: unknown = null;

  for (const rpcName of rpcCandidates) {
    const rpcResult = await supabase.rpc(rpcName, { p_dni: dniClean });
    if (!rpcResult.error) {
      data = rpcResult.data;
      lastError = null;
      break;
    }

    const code = (rpcResult.error as { code?: string })?.code;
    const message = (rpcResult.error as { message?: string })?.message?.toLowerCase() ?? "";
    const functionMissing = code === "42883" || message.includes("does not exist");

    if (functionMissing) {
      lastError = rpcResult.error;
      continue;
    }

    throw rpcResult.error;
  }

  if (lastError) {
    throw lastError;
  }

  if (!data || (Array.isArray(data) && data.length === 0)) {
    throw new Error("DNI no encontrado");
  }

  const userRow = Array.isArray(data) ? data[0] : data;
  const row = { ...(userRow ?? {}), dni: dniClean } as GenericRow;
  return mapUsuarioRowToUser(row);
}

async function findUsuariosByDni(dni: string): Promise<User[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), QUERY_TIMEOUT_MS);

  try {
    const { data, error } = await supabase
      .from("usuarios")
      .select("id_usuario,nombre,apellido,email,dni,rol,id_docente")
      .eq("dni", dni)
      .abortSignal(controller.signal)
      .limit(10);

    if (error) return [];
    return ((data ?? []) as GenericRow[])
      .map((row) => mapUsuarioRowToUser(row))
      .filter((item): item is User => Boolean(item));
  } finally {
    clearTimeout(timer);
  }
}

async function findUsuariosByDocenteId(idDocente: string): Promise<User[]> {
  const docenteId = idDocente.trim();
  if (!docenteId) return [];

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), QUERY_TIMEOUT_MS);

  try {
    const { data, error } = await supabase
      .from("usuarios")
      .select("id_usuario,nombre,apellido,email,dni,rol,id_docente")
      .eq("id_docente", docenteId)
      .abortSignal(controller.signal)
      .limit(20);

    if (error) return [];
    return ((data ?? []) as GenericRow[])
      .map((row) => mapUsuarioRowToUser(row))
      .filter((item): item is User => Boolean(item));
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

  const usersByDni = await findUsuariosByDni(cleanDni);
  const usersByDocente = baseUser?.idDocente ? await findUsuariosByDocenteId(baseUser.idDocente) : [];
  const merged = mergeUsersByDni([...(baseUser ? [baseUser] : []), ...usersByDni, ...usersByDocente]);

  if (!merged) {
    if (rpcErrorMessage) throw new Error(rpcErrorMessage);
    return null;
  }

  return enrichUserWithDesignaciones(merged);
}

function dedupeUsers(users: User[]): User[] {
  const grouped = new Map<string, User[]>();
  for (const user of users) {
    const bucket = grouped.get(user.dni) ?? [];
    bucket.push(user);
    grouped.set(user.dni, bucket);
  }
  return Array.from(grouped.values())
    .map((group) => mergeUsersByDni(group))
    .filter((item): item is User => Boolean(item));
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
        .select("id,cargo,rol_sistema,id_docente,id_asignatura")
        .limit(10000)
        .abortSignal(controller.signal),
    ]);

    if (usuariosResult.error) {
      if (!isRecoverableError(usuariosResult.error)) {
        console.warn("No se pudo cargar usuarios desde Supabase:", usuariosResult.error);
      }
      return [];
    }

    const designacionesRows = (designacionesResult.data ?? []) as GenericRow[];
    const { asignaturasById, carrerasById } = await loadCatalogMapsByAsignaturaIds(
      designacionesRows.map((row) => getString(row, ["id_asignatura"], "")),
    );

    const designacionesByDocente = new Map<string, AcademicDesignation[]>();
    if (!designacionesResult.error) {
      for (const row of designacionesRows) {
        const idDocente = getString(row, ["id_docente"], "");
        if (!idDocente) continue;

        const rows = designacionesByDocente.get(idDocente) ?? [];
        rows.push(mapDesignacionRowToAcademicDesignation(row, rows.length, idDocente, asignaturasById, carrerasById));
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
