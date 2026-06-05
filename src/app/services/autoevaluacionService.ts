import { supabase } from "../../lib/supabaseClient";
import type {
  AdvertenciaInput,
  AsignacionEvaluacion,
  AutoevaluacionDetalle,
  CampaniaCreateInput,
  CampaniaEvaluacion,
  CompletarAutoevaluacionInput,
  DashboardJefeCarrera,
  DashboardSecretaria,
  ExportRow,
  FormularioEvaluacion,
  PreguntaEvaluacion,
  RespuestaEvaluacion,
  SecretariaAutoevaluacionDashboard,
  SecretariaCarreraProgress,
} from "../types/autoevaluacion";

type GenericRow = Record<string, unknown>;

const ASIGNACION_SELECT_BASE = "id_asignacion,id_campania,id_docente,id_asignatura,estado,created_at";
const ASIGNACION_SELECT_FULL = `${ASIGNACION_SELECT_BASE},fecha_respuesta,completed_at,firma_hash,firma_base64,firmada_at`;
const ASIGNACION_SELECT_SECRETARIA = `${ASIGNACION_SELECT_FULL},docente:docentes(id_docente,nombre,apellido),asignatura:asignaturas(id_asignatura,nombre,carrera:carreras(id_carrera,nombre))`;

function normalizeString(row: GenericRow, keys: string[], fallback = ""): string {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" || typeof value === "bigint") return String(value);
  }
  return fallback;
}

function normalizeBoolean(row: GenericRow, keys: string[], fallback = false): boolean {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "boolean") return value;
  }
  return fallback;
}

function isRecoverableColumnError(error: unknown): boolean {
  const code = (error as { code?: string })?.code;
  const message = (error as { message?: string })?.message?.toLowerCase() ?? "";
  return code === "42703" || message.includes("column") || message.includes("schema cache");
}

function nowIso() {
  return new Date().toISOString();
}

function estadoNormalizado(estado: string): string {
  return estado.trim().toLowerCase();
}

function isBloqueadaEstado(estado: string): boolean {
  const value = estadoNormalizado(estado);
  return value === "completada" || value === "enviada" || value === "cerrada";
}

function isVencida(asignacion: AsignacionEvaluacion, campania?: CampaniaEvaluacion): boolean {
  if (estadoNormalizado(asignacion.estado) === "vencida") return true;
  if (estadoNormalizado(asignacion.estado) !== "pendiente") return false;
  if (!campania?.fechaFin) return false;
  const fin = new Date(`${campania.fechaFin}T23:59:59`);
  return Number.isFinite(fin.getTime()) && fin.getTime() < Date.now();
}

function mapCampaniaRow(row: GenericRow): CampaniaEvaluacion {
  return {
    idCampania: normalizeString(row, ["id_campania"]),
    nombre: normalizeString(row, ["nombre"], "Campana"),
    estado: normalizeString(row, ["estado"], "borrador"),
    fechaInicio: normalizeString(row, ["fecha_inicio"], ""),
    fechaFin: normalizeString(row, ["fecha_fin"], "") || null,
    descripcion: normalizeString(row, ["descripcion"], "") || null,
    idCarrera: normalizeString(row, ["id_carrera"], "") || null,
    createdAt: normalizeString(row, ["created_at"], nowIso()),
  };
}

function mapFormularioRow(row: GenericRow): FormularioEvaluacion {
  return {
    idFormulario: Number(normalizeString(row, ["id_formulario"], "0")),
    nombre: normalizeString(row, ["nombre"], "Formulario"),
    descripcion: normalizeString(row, ["descripcion"], ""),
    activo: normalizeBoolean(row, ["activo"], true),
  };
}

function mapPreguntaRow(row: GenericRow): PreguntaEvaluacion {
  return {
    idPregunta: normalizeString(row, ["id_pregunta"]),
    idFormulario: Number(normalizeString(row, ["id_formulario"], "0")),
    orden: Number(normalizeString(row, ["orden"], "0")),
    pregunta: normalizeString(row, ["pregunta"], ""),
    tipoRespuesta: normalizeString(row, ["tipo_respuesta"], "opcion"),
    obligatoria: normalizeBoolean(row, ["obligatoria"], true),
    activa: normalizeBoolean(row, ["activa"], true),
  };
}

function mapRespuestaRow(row: GenericRow): RespuestaEvaluacion {
  return {
    idRespuesta: normalizeString(row, ["id_respuesta"], "") || undefined,
    idAsignacion: normalizeString(row, ["id_asignacion"]),
    idPregunta: normalizeString(row, ["id_pregunta"]),
    respuesta: normalizeString(row, ["respuesta"], ""),
    createdAt: normalizeString(row, ["created_at"], "") || undefined,
  };
}

function mapAsignacionRow(
  row: GenericRow,
  asignaturasById: Map<string, { nombre: string; idCarrera: string }>,
  carrerasById: Map<string, string>,
): AsignacionEvaluacion {
  const idAsignatura = normalizeString(row, ["id_asignatura"]);
  const asignaturaData = asignaturasById.get(idAsignatura);
  const fechaRespuesta = normalizeString(row, ["fecha_respuesta", "completed_at"], "") || null;
  const completedAt = normalizeString(row, ["completed_at", "fecha_respuesta"], "") || null;

  return {
    idAsignacion: normalizeString(row, ["id_asignacion"]),
    idCampania: normalizeString(row, ["id_campania"]),
    idDocente: normalizeString(row, ["id_docente"]),
    idAsignatura,
    estado: normalizeString(row, ["estado"], "pendiente"),
    createdAt: normalizeString(row, ["created_at"], nowIso()),
    fechaRespuesta,
    completedAt,
    firmaHash: normalizeString(row, ["firma_hash"], "") || null,
    firmaBase64: normalizeString(row, ["firma_base64"], "") || null,
    firmadaAt: normalizeString(row, ["firmada_at"], "") || null,
    asignatura: asignaturaData?.nombre ?? "Asignatura",
    carrera: carrerasById.get(asignaturaData?.idCarrera ?? "") ?? "Sin carrera",
  };
}

function getNestedRow(row: GenericRow, keys: string[]): GenericRow | null {
  for (const key of keys) {
    const value = row[key];
    if (Array.isArray(value)) {
      const first = value[0];
      if (first && typeof first === "object") return first as GenericRow;
    }
    if (value && typeof value === "object") return value as GenericRow;
  }
  return null;
}

function mapSecretariaAsignacionRow(row: GenericRow): AsignacionEvaluacion {
  const idAsignatura = normalizeString(row, ["id_asignatura"]);
  const docente = getNestedRow(row, ["docente", "docentes"]);
  const asignatura = getNestedRow(row, ["asignatura", "asignaturas"]);
  const carrera = asignatura ? getNestedRow(asignatura, ["carrera", "carreras"]) : null;
  const fechaRespuesta = normalizeString(row, ["fecha_respuesta", "completed_at"], "") || null;
  const completedAt = normalizeString(row, ["completed_at", "fecha_respuesta"], "") || null;
  const nombreDocente = docente
    ? `${normalizeString(docente, ["nombre"], "")} ${normalizeString(docente, ["apellido"], "")}`.trim()
    : "";

  return {
    idAsignacion: normalizeString(row, ["id_asignacion"]),
    idCampania: normalizeString(row, ["id_campania"]),
    idDocente: normalizeString(row, ["id_docente"]),
    idAsignatura,
    estado: normalizeString(row, ["estado"], "pendiente"),
    createdAt: normalizeString(row, ["created_at"], nowIso()),
    fechaRespuesta,
    completedAt,
    firmaHash: normalizeString(row, ["firma_hash"], "") || null,
    firmaBase64: normalizeString(row, ["firma_base64"], "") || null,
    firmadaAt: normalizeString(row, ["firmada_at"], "") || null,
    asignatura: asignatura ? normalizeString(asignatura, ["nombre"], idAsignatura || "Asignatura") : idAsignatura || "Asignatura",
    carrera: carrera ? normalizeString(carrera, ["nombre"], "Sin carrera") : "Sin carrera",
    docenteNombre: nombreDocente,
  };
}

async function getAsignaturasByIds(ids: string[]): Promise<Map<string, { nombre: string; idCarrera: string }>> {
  const uniqueIds = Array.from(new Set(ids.filter(Boolean)));
  const result = new Map<string, { nombre: string; idCarrera: string }>();
  if (uniqueIds.length === 0) return result;

  const { data, error } = await supabase
    .from("asignaturas")
    .select("id_asignatura,nombre,id_carrera")
    .in("id_asignatura", uniqueIds);

  if (error) throw error;

  for (const row of (data ?? []) as GenericRow[]) {
    const id = normalizeString(row, ["id_asignatura"]);
    if (!id) continue;
    result.set(id, {
      nombre: normalizeString(row, ["nombre"], "Asignatura"),
      idCarrera: normalizeString(row, ["id_carrera"], ""),
    });
  }

  return result;
}

async function getCarrerasByIds(ids: string[]): Promise<Map<string, string>> {
  const uniqueIds = Array.from(new Set(ids.filter(Boolean)));
  const result = new Map<string, string>();
  if (uniqueIds.length === 0) return result;

  const { data, error } = await supabase
    .from("carreras")
    .select("id_carrera,nombre")
    .in("id_carrera", uniqueIds);

  if (error) throw error;

  for (const row of (data ?? []) as GenericRow[]) {
    const id = normalizeString(row, ["id_carrera"]);
    if (id) result.set(id, normalizeString(row, ["nombre"], "Sin carrera"));
  }

  return result;
}

async function getDocentesByIds(ids: string[]): Promise<Map<string, string>> {
  const uniqueIds = Array.from(new Set(ids.filter(Boolean)));
  const result = new Map<string, string>();
  if (uniqueIds.length === 0) return result;

  const { data, error } = await supabase
    .from("docentes")
    .select("id_docente,nombre,apellido")
    .in("id_docente", uniqueIds);

  if (error) throw error;

  for (const row of (data ?? []) as GenericRow[]) {
    const id = normalizeString(row, ["id_docente"]);
    const nombre = normalizeString(row, ["nombre"], "");
    const apellido = normalizeString(row, ["apellido"], "");
    if (id) result.set(id, `${nombre} ${apellido}`.trim() || id);
  }

  return result;
}

async function mapAsignacionesRows(rows: GenericRow[]): Promise<AsignacionEvaluacion[]> {
  const asignaturaIds = rows.map((row) => normalizeString(row, ["id_asignatura"]));
  const asignaturasById = await getAsignaturasByIds(asignaturaIds);
  const carrerasById = await getCarrerasByIds(
    Array.from(asignaturasById.values()).map((item) => item.idCarrera),
  );

  return rows.map((row) => mapAsignacionRow(row, asignaturasById, carrerasById));
}

async function fetchAsignaciones(
  apply: (query: ReturnType<typeof supabase.from>) => ReturnType<typeof supabase.from>,
): Promise<GenericRow[]> {
  const fullQuery = apply(supabase.from("asignaciones_evaluacion").select(ASIGNACION_SELECT_FULL));
  const fullResult = await fullQuery;

  if (!fullResult.error) return (fullResult.data ?? []) as GenericRow[];
  if (!isRecoverableColumnError(fullResult.error)) throw fullResult.error;

  const baseQuery = apply(supabase.from("asignaciones_evaluacion").select(ASIGNACION_SELECT_BASE));
  const baseResult = await baseQuery;
  if (baseResult.error) throw baseResult.error;
  return (baseResult.data ?? []) as GenericRow[];
}

async function fetchAsignacionById(idAsignacion: string): Promise<GenericRow | null> {
  const [row] = await fetchAsignaciones((query) => query.eq("id_asignacion", idAsignacion).limit(1));
  return row ?? null;
}

async function fetchSecretariaAsignaciones(idCampania: string): Promise<AsignacionEvaluacion[]> {
  const joined = await supabase
    .from("asignaciones_evaluacion")
    .select(ASIGNACION_SELECT_SECRETARIA)
    .eq("id_campania", idCampania)
    .limit(20000);

  if (!joined.error) {
    return ((joined.data ?? []) as GenericRow[]).map(mapSecretariaAsignacionRow);
  }

  if (!isRecoverableColumnError(joined.error) && !String(joined.error.message ?? "").toLowerCase().includes("relationship")) {
    throw joined.error;
  }

  const rows = await fetchAsignaciones((query) => query.eq("id_campania", idCampania).limit(20000));
  return mapAsignacionesRows(rows);
}

async function getRespuestasByAsignacionIds(ids: string[]): Promise<Map<string, RespuestaEvaluacion[]>> {
  const uniqueIds = Array.from(new Set(ids.filter(Boolean)));
  const result = new Map<string, RespuestaEvaluacion[]>();
  if (uniqueIds.length === 0) return result;

  const { data, error } = await supabase
    .from("respuestas_evaluacion")
    .select("id_respuesta,id_asignacion,id_pregunta,respuesta,created_at")
    .in("id_asignacion", uniqueIds)
    .limit(50000);

  if (error) throw error;

  for (const row of (data ?? []) as GenericRow[]) {
    const respuesta = mapRespuestaRow(row);
    const current = result.get(respuesta.idAsignacion) ?? [];
    current.push(respuesta);
    result.set(respuesta.idAsignacion, current);
  }

  return result;
}

function aggregateEstadoCounts(asignaciones: AsignacionEvaluacion[], campanias: CampaniaEvaluacion[] = []) {
  const campaniasById = new Map(campanias.map((item) => [item.idCampania, item]));
  const pendientes = asignaciones.filter((item) =>
    estadoNormalizado(item.estado) === "pendiente" && !isVencida(item, campaniasById.get(item.idCampania)),
  ).length;
  const completadas = asignaciones.filter((item) => estadoNormalizado(item.estado) === "completada").length;
  const vencidas = asignaciones.filter((item) => isVencida(item, campaniasById.get(item.idCampania))).length;
  return { pendientes, completadas, vencidas };
}

function splitRespuestaObservacion(value: string) {
  const [respuesta, ...obsParts] = value.split(/\nObs:\s*/i);
  return {
    respuesta: respuesta.trim(),
    observacion: obsParts.join("\nObs: ").trim(),
  };
}

export async function marcarEvaluacionesVencidas(): Promise<void> {
  const { error } = await supabase.rpc("marcar_evaluaciones_vencidas");
  if (error && !String(error.message ?? "").toLowerCase().includes("does not exist")) throw error;
}

export async function resolveDocenteIdByDni(dni: string): Promise<string | null> {
  const dniClean = dni.trim().replace(/\D/g, "");
  if (!dniClean) return null;

  const { data, error } = await supabase
    .from("docentes")
    .select("id_docente")
    .eq("dni", dniClean)
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return normalizeString(data as GenericRow, ["id_docente"], "") || null;
}

export async function getCampanias(): Promise<CampaniaEvaluacion[]> {
  await marcarEvaluacionesVencidas();

  const { data, error } = await supabase
    .from("campanias_evaluacion")
    .select("id_campania,nombre,estado,fecha_inicio,fecha_fin,descripcion,id_carrera,created_at")
    .order("created_at", { ascending: false })
    .limit(300);

  if (error) throw error;
  return ((data ?? []) as GenericRow[]).map(mapCampaniaRow);
}

export async function getMisAsignaciones(idDocente: string): Promise<AsignacionEvaluacion[]> {
  if (!idDocente.trim()) return [];
  await marcarEvaluacionesVencidas();

  const rows = await fetchAsignaciones((query) =>
    query.eq("id_docente", idDocente).order("created_at", { ascending: false }).limit(2000),
  );
  return mapAsignacionesRows(rows);
}

async function getFormulariosParaAsignacion(idDocente: string, idAsignatura: string): Promise<FormularioEvaluacion[]> {
  const { data: designaciones, error: designacionesError } = await supabase
    .from("designaciones")
    .select("cargo")
    .eq("id_docente", idDocente)
    .eq("id_asignatura", idAsignatura)
    .limit(5);

  if (designacionesError) throw designacionesError;

  const cargoRaw = normalizeString((designaciones?.[0] ?? {}) as GenericRow, ["cargo"], "").toLowerCase();
  const esTitularAdjunto =
    cargoRaw.includes("titular") || cargoRaw.includes("asociado") || cargoRaw.includes("adjunto");
  const preferred = esTitularAdjunto ? [1, 3] : [2, 4];

  const { data, error } = await supabase
    .from("formularios_evaluacion")
    .select("id_formulario,nombre,descripcion,activo")
    .eq("activo", true)
    .in("id_formulario", preferred)
    .order("id_formulario", { ascending: true });

  if (error) throw error;
  const found = ((data ?? []) as GenericRow[]).map(mapFormularioRow);
  if (found.length > 0) return found;

  const { data: allForms, error: allFormsError } = await supabase
    .from("formularios_evaluacion")
    .select("id_formulario,nombre,descripcion,activo")
    .eq("activo", true)
    .order("id_formulario", { ascending: true });

  if (allFormsError) throw allFormsError;
  return ((allForms ?? []) as GenericRow[]).map(mapFormularioRow);
}

async function getPreguntasPorFormularios(idsFormulario: number[]): Promise<PreguntaEvaluacion[]> {
  if (idsFormulario.length === 0) return [];

  const { data, error } = await supabase
    .from("preguntas_evaluacion")
    .select("id_pregunta,id_formulario,orden,pregunta,tipo_respuesta,obligatoria,activa")
    .eq("activa", true)
    .in("id_formulario", idsFormulario)
    .order("id_formulario", { ascending: true })
    .order("orden", { ascending: true });

  if (error) throw error;
  return ((data ?? []) as GenericRow[]).map(mapPreguntaRow);
}

export async function getAutoevaluacionDetalle(idAsignacion: string): Promise<AutoevaluacionDetalle | null> {
  if (!idAsignacion.trim()) return null;

  const asignacionRaw = await fetchAsignacionById(idAsignacion);
  if (!asignacionRaw) return null;

  const [asignacion] = await mapAsignacionesRows([asignacionRaw]);
  if (!asignacion) return null;

  const formularios = await getFormulariosParaAsignacion(asignacion.idDocente, asignacion.idAsignatura);
  const preguntas = await getPreguntasPorFormularios(formularios.map((item) => item.idFormulario));
  const respuestasMap = await getRespuestasByAsignacionIds([idAsignacion]);

  return {
    asignacion,
    formularios,
    preguntas,
    respuestas: respuestasMap.get(idAsignacion) ?? [],
    bloqueada: isBloqueadaEstado(asignacion.estado),
  };
}

export async function responderAutoevaluacion(idAsignacion: string, respuestas: RespuestaEvaluacion[]): Promise<void> {
  const detalle = await getAutoevaluacionDetalle(idAsignacion);
  if (!detalle) throw new Error("Asignacion no encontrada.");
  if (detalle.bloqueada) throw new Error("La evaluacion ya fue enviada y no admite edicion.");

  const respuestasObligatorias = detalle.preguntas.filter((item) => item.obligatoria);
  const missing = respuestasObligatorias.some((pregunta) => {
    const encontrada = respuestas.find((item) => item.idPregunta === pregunta.idPregunta);
    return !encontrada || !encontrada.respuesta.trim();
  });

  if (missing) throw new Error("Debe responder todas las preguntas obligatorias.");

  const { error: deleteError } = await supabase
    .from("respuestas_evaluacion")
    .delete()
    .eq("id_asignacion", idAsignacion);

  if (deleteError) throw deleteError;

  const payload = respuestas.map((item) => ({
    id_asignacion: idAsignacion,
    id_pregunta: item.idPregunta,
    respuesta: item.respuesta,
  }));

  if (payload.length === 0) return;

  const { error: insertError } = await supabase
    .from("respuestas_evaluacion")
    .insert(payload);

  if (insertError) throw insertError;
}

export async function enviarAutoevaluacion(
  idAsignacion: string,
  input: CompletarAutoevaluacionInput,
): Promise<void> {
  if (!input.firmaHash.trim() || !input.firmaBase64.trim()) {
    throw new Error("La firma digital es obligatoria para completar la evaluacion.");
  }

  const { error } = await supabase.rpc("completar_asignacion", {
    p_id_asignacion: idAsignacion,
    p_firma_hash: input.firmaHash,
    p_firma_base64: input.firmaBase64,
  });

  if (error) throw error;
}

export async function crearCampania(input: CampaniaCreateInput): Promise<CampaniaEvaluacion> {
  const payload = {
    nombre: input.nombre,
    estado: "borrador",
    fecha_inicio: input.fechaInicio,
    fecha_fin: input.fechaFin,
    descripcion: input.descripcion ?? null,
    id_carrera: input.idCarrera ?? null,
  };

  const { data, error } = await supabase
    .from("campanias_evaluacion")
    .insert(payload)
    .select("id_campania,nombre,estado,fecha_inicio,fecha_fin,descripcion,id_carrera,created_at")
    .single();

  if (error) throw error;
  return mapCampaniaRow(data as GenericRow);
}

export async function lanzarCampania(idCampania: string): Promise<void> {
  // Call the activate_campaign RPC function which:
  // 1. Sets campaign status to 'activa'
  // 2. Automatically generates evaluation assignments from designaciones
  // 3. Is idempotent (safe to call multiple times)
  const { data, error } = await supabase.rpc("activate_campaign", {
    p_campaign_id: idCampania,
  });

  if (error) {
    throw new Error(`Failed to activate campaign: ${error.message}`);
  }

  // Log the response for debugging
  console.log("Campaign activation result:", data);
}

export async function cerrarCampania(idCampania: string): Promise<void> {
  const { error } = await supabase
    .from("campanias_evaluacion")
    .update({ estado: "cerrada" })
    .eq("id_campania", idCampania);

  if (error) throw error;
}

export async function registrarAdvertencia(input: AdvertenciaInput, actor = "Sistema"): Promise<void> {
  const { error } = await supabase
    .from("advertencias_evaluacion")
    .insert({
      id_campania: input.idCampania,
      detalle: input.detalle,
      actor,
      created_at: new Date().toISOString(),
    });

  if (error) throw error;
}

export async function getDashboardJefeCarrera(): Promise<DashboardJefeCarrera> {
  const campanias = await getCampanias();
  const campaniaActiva = campanias.find((item) => estadoNormalizado(item.estado) === "activa") ?? campanias[0] ?? null;

  if (!campaniaActiva) {
    return {
      totalDocentes: 0,
      totalAsignaciones: 0,
      pendientes: 0,
      completadas: 0,
      vencidas: 0,
      porcentajeCompletado: 0,
      detalle: [],
      porAsignatura: [],
    };
  }

  const rows = await fetchAsignaciones((query) =>
    query.eq("id_campania", campaniaActiva.idCampania).limit(10000),
  );
  const base = await mapAsignacionesRows(rows);
  const docentesById = await getDocentesByIds(base.map((item) => item.idDocente));
  const { pendientes, completadas, vencidas } = aggregateEstadoCounts(base, campanias);

  const porAsignaturaMap = new Map<string, { asignatura: string; completadas: number; pendientes: number; vencidas: number }>();
  for (const item of base) {
    const current = porAsignaturaMap.get(item.asignatura) ?? {
      asignatura: item.asignatura,
      completadas: 0,
      pendientes: 0,
      vencidas: 0,
    };
    if (estadoNormalizado(item.estado) === "completada") current.completadas += 1;
    else if (isVencida(item, campanias.find((campania) => campania.idCampania === item.idCampania))) current.vencidas += 1;
    else current.pendientes += 1;
    porAsignaturaMap.set(item.asignatura, current);
  }

  return {
    totalDocentes: new Set(base.map((item) => item.idDocente)).size,
    totalAsignaciones: base.length,
    pendientes,
    completadas,
    vencidas,
    porcentajeCompletado: base.length === 0 ? 0 : Math.round((completadas / base.length) * 100),
    detalle: base.map((item) => ({
      idAsignacion: item.idAsignacion,
      docente: docentesById.get(item.idDocente) ?? item.idDocente,
      carrera: item.carrera,
      asignatura: item.asignatura,
      estado: isVencida(item, campanias.find((campania) => campania.idCampania === item.idCampania)) ? "vencida" : item.estado,
      fechaEnvio: item.fechaRespuesta ?? item.completedAt ?? null,
      fechaRespuesta: item.fechaRespuesta ?? item.completedAt ?? null,
    })),
    porAsignatura: Array.from(porAsignaturaMap.values()),
  };
}

export async function getDashboardSecretaria(): Promise<DashboardSecretaria> {
  const [campanias, rows] = await Promise.all([
    getCampanias(),
    fetchAsignaciones((query) => query.limit(20000)),
  ]);

  const mapped = await mapAsignacionesRows(rows);
  const { pendientes, completadas, vencidas } = aggregateEstadoCounts(mapped, campanias);

  return {
    campanias,
    totalAsignaciones: mapped.length,
    pendientes,
    completadas,
    vencidas,
    advertencias: 0,
    porcentajeCompletado: mapped.length === 0 ? 0 : Math.round((completadas / mapped.length) * 100),
    porEstado: [
      { estado: "Completadas", cantidad: completadas },
      { estado: "Pendientes", cantidad: pendientes },
      { estado: "Vencidas", cantidad: vencidas },
    ],
    auditoriaReciente: [],
  };
}

function toNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

async function getVistaProgresoCampania(idCampania: string): Promise<GenericRow[]> {
  const { data, error } = await supabase
    .from("vista_progreso_campania")
    .select("*")
    .eq("id_campania", idCampania)
    .limit(1000);

  if (error) throw error;
  return (data ?? []) as GenericRow[];
}

function hasCarreraValue(row: GenericRow): boolean {
  return Boolean(normalizeString(row, ["carrera", "nombre_carrera", "carrera_nombre"], ""));
}

function getPorcentajeVista(rows: GenericRow[], fallback: number): number | null {
  if (rows.length === 0) return null;
  const row = rows.find((item) => !hasCarreraValue(item)) ?? null;
  if (row) {
    const value = toNumber(
      row.porcentaje_completado ?? row.porcentaje_cumplimiento ?? row.porcentaje ?? row.progreso,
      Number.NaN,
    );
    return Number.isFinite(value) ? Math.round(value) : fallback;
  }

  const totals = rows.reduce(
    (acc, item) => {
      acc.total += toNumber(item.total ?? item.total_asignaciones ?? item.docentes_convocados);
      acc.completadas += toNumber(item.completadas ?? item.total_completadas);
      return acc;
    },
    { total: 0, completadas: 0 },
  );

  if (totals.total > 0) return Math.round((totals.completadas / totals.total) * 100);
  const value = toNumber(
    rows[0]?.porcentaje_completado ?? rows[0]?.porcentaje_cumplimiento ?? rows[0]?.porcentaje ?? rows[0]?.progreso,
    Number.NaN,
  );
  return Number.isFinite(value) ? Math.round(value) : fallback;
}

function buildCarreraProgressFromAsignaciones(
  asignaciones: AsignacionEvaluacion[],
  campania: CampaniaEvaluacion | null,
): SecretariaCarreraProgress[] {
  const byCarrera = new Map<string, SecretariaCarreraProgress>();

  for (const asignacion of asignaciones) {
    const carrera = asignacion.carrera || "Sin carrera";
    const current = byCarrera.get(carrera) ?? {
      carrera,
      total: 0,
      completadas: 0,
      pendientes: 0,
      vencidas: 0,
      porcentajeCompletado: 0,
    };
    current.total += 1;
    if (estadoNormalizado(asignacion.estado) === "completada") current.completadas += 1;
    else if (isVencida(asignacion, campania ?? undefined)) current.vencidas += 1;
    else current.pendientes += 1;
    current.porcentajeCompletado = current.total === 0
      ? 0
      : Math.round((current.completadas / current.total) * 100);
    byCarrera.set(carrera, current);
  }

  return Array.from(byCarrera.values()).sort((a, b) => b.porcentajeCompletado - a.porcentajeCompletado);
}

function mergeCarreraProgressFromView(
  fallback: SecretariaCarreraProgress[],
  rows: GenericRow[],
): SecretariaCarreraProgress[] {
  const fromView = rows
    .map((row) => {
      const carrera = normalizeString(row, ["carrera", "nombre_carrera", "carrera_nombre"], "");
      if (!carrera) return null;
      const total = toNumber(row.total ?? row.total_asignaciones ?? row.docentes_convocados);
      const completadas = toNumber(row.completadas ?? row.total_completadas);
      const pendientes = toNumber(row.pendientes ?? row.total_pendientes);
      const vencidas = toNumber(row.vencidas ?? row.total_vencidas);
      const porcentajeCompletado = Math.round(toNumber(
        row.porcentaje_completado ?? row.porcentaje_cumplimiento ?? row.porcentaje,
        total === 0 ? 0 : (completadas / total) * 100,
      ));

      return {
        carrera,
        total,
        completadas,
        pendientes,
        vencidas,
        porcentajeCompletado,
      } satisfies SecretariaCarreraProgress;
    })
    .filter((item): item is SecretariaCarreraProgress => Boolean(item));

  return fromView.length > 0 ? fromView : fallback;
}

export async function getSecretariaAutoevaluacionDashboard(
  idCampaniaSeleccionada?: string,
): Promise<SecretariaAutoevaluacionDashboard> {
  const campanias = await getCampanias();
  const campaniaActiva =
    campanias.find((item) => item.idCampania === idCampaniaSeleccionada)
    ?? campanias.find((item) => estadoNormalizado(item.estado) === "activa")
    ?? campanias[0]
    ?? null;

  if (!campaniaActiva) {
    return {
      campanias,
      campaniaActiva: null,
      totalAsignaciones: 0,
      completadas: 0,
      pendientes: 0,
      vencidas: 0,
      porcentajeCompletado: 0,
      porcentajeCompletadoVista: null,
      porEstado: [
        { estado: "Completadas", cantidad: 0 },
        { estado: "Pendientes", cantidad: 0 },
        { estado: "Vencidas", cantidad: 0 },
      ],
      porCarrera: [],
      docentes: [],
    };
  }

  const [asignaciones, vistaProgreso] = await Promise.all([
    fetchSecretariaAsignaciones(campaniaActiva.idCampania),
    getVistaProgresoCampania(campaniaActiva.idCampania),
  ]);

  const { pendientes, completadas, vencidas } = aggregateEstadoCounts(asignaciones, [campaniaActiva]);
  const totalAsignaciones = asignaciones.length;
  const porcentajeCompletado = totalAsignaciones === 0 ? 0 : Math.round((completadas / totalAsignaciones) * 100);
  const porCarreraBase = buildCarreraProgressFromAsignaciones(asignaciones, campaniaActiva);

  return {
    campanias,
    campaniaActiva,
    totalAsignaciones,
    completadas,
    pendientes,
    vencidas,
    porcentajeCompletado,
    porcentajeCompletadoVista: getPorcentajeVista(vistaProgreso, porcentajeCompletado),
    porEstado: [
      { estado: "Completadas", cantidad: completadas },
      { estado: "Pendientes", cantidad: pendientes },
      { estado: "Vencidas", cantidad: vencidas },
    ],
    porCarrera: mergeCarreraProgressFromView(porCarreraBase, vistaProgreso),
    docentes: asignaciones.map((item) => ({
      idAsignacion: item.idAsignacion,
      docente: item.docenteNombre || item.idDocente,
      asignatura: item.asignatura,
      carrera: item.carrera,
      estado: isVencida(item, campaniaActiva) ? "vencida" : item.estado,
      fechaRespuesta: item.fechaRespuesta ?? item.completedAt ?? null,
      firma: item.firmaBase64 ? "Firmada" : "Sin firma",
      firmaHash: item.firmaHash,
    })),
  };
}

export async function getCampaniaExportRows(idCampania: string): Promise<ExportRow[]> {
  const rows = await fetchAsignaciones((query) =>
    query.eq("id_campania", idCampania).limit(10000),
  );
  const asignaciones = await mapAsignacionesRows(rows);
  const [campanias, docentesById, respuestasByAsignacion] = await Promise.all([
    getCampanias(),
    getDocentesByIds(asignaciones.map((item) => item.idDocente)),
    getRespuestasByAsignacionIds(asignaciones.map((item) => item.idAsignacion)),
  ]);
  const campania = campanias.find((item) => item.idCampania === idCampania);

  return asignaciones.map((item) => {
    const respuestas = respuestasByAsignacion.get(item.idAsignacion) ?? [];
    const partes = respuestas.map((respuesta) => splitRespuestaObservacion(respuesta.respuesta));
    return {
      campania: campania?.nombre ?? idCampania,
      docente: docentesById.get(item.idDocente) ?? item.idDocente,
      carrera: item.carrera,
      asignatura: item.asignatura,
      estado: item.estado,
      fechaEnvio: item.fechaRespuesta ?? item.completedAt ?? null,
      respuestas: partes.map((parte) => parte.respuesta).filter(Boolean).join(" | "),
      observaciones: partes.map((parte) => parte.observacion).filter(Boolean).join(" | "),
      firma: item.firmaBase64 ? "Firmada" : "Sin firma",
      firmaHash: item.firmaHash,
      cantidadRespuestas: respuestas.length,
    };
  });
}

async function loadXlsx() {
  return import("xlsx");
}

function exportRowsToWorkbook(rows: ExportRow[], sheetName: string) {
  return rows.map((row) => ({
    Campania: row.campania,
    Docente: row.docente,
    Carrera: row.carrera,
    Asignatura: row.asignatura,
    Estado: row.estado,
    "Fecha respuesta": row.fechaEnvio ?? "",
    Respuestas: row.respuestas,
    Observaciones: row.observaciones,
    Firma: row.firma,
    "Hash firma": row.firmaHash ?? "",
    "Cantidad respuestas": row.cantidadRespuestas,
    Hoja: sheetName,
  }));
}

export async function exportarCampaniaExcel(idCampania: string): Promise<void> {
  const XLSX = await loadXlsx();
  const rows = await getCampaniaExportRows(idCampania);
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(exportRowsToWorkbook(rows, "Autoevaluaciones"));
  XLSX.utils.book_append_sheet(workbook, worksheet, "Autoevaluaciones");
  XLSX.writeFile(workbook, `autoevaluaciones_${idCampania}.xlsx`);
}

export async function exportarCampaniaPorCarreraExcel(idCampania: string, carrera: string): Promise<void> {
  const XLSX = await loadXlsx();
  const rows = (await getCampaniaExportRows(idCampania))
    .filter((row) => row.carrera.trim().toLowerCase() === carrera.trim().toLowerCase());

  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(exportRowsToWorkbook(rows, "Campania por carrera"));
  XLSX.utils.book_append_sheet(workbook, worksheet, "Campania por carrera");
  XLSX.writeFile(workbook, `autoevaluaciones_${idCampania}_${carrera.replace(/\s+/g, "_")}.xlsx`);
}

export async function exportarAsignacionExcel(idAsignacion: string): Promise<void> {
  const XLSX = await loadXlsx();
  const detalle = await getAutoevaluacionDetalle(idAsignacion);
  if (!detalle) throw new Error("No se encontro la evaluacion seleccionada.");

  const respuestasMap = new Map(detalle.respuestas.map((item) => [item.idPregunta, item.respuesta]));
  const workbook = XLSX.utils.book_new();
  const infoSheet = XLSX.utils.aoa_to_sheet([
    ["Evaluacion Docente"],
    [],
    ["Asignatura", detalle.asignacion.asignatura],
    ["Carrera", detalle.asignacion.carrera],
    ["Estado", detalle.asignacion.estado],
    ["Fecha respuesta", detalle.asignacion.fechaRespuesta ?? detalle.asignacion.completedAt ?? ""],
    ["Firma", detalle.asignacion.firmaBase64 ? "Firmada" : "Sin firma"],
    ["Hash firma", detalle.asignacion.firmaHash ?? ""],
  ]);
  const respuestasSheet = XLSX.utils.json_to_sheet(
    detalle.preguntas.map((item) => {
      const parsed = splitRespuestaObservacion(respuestasMap.get(item.idPregunta) ?? "");
      return {
        Formulario: item.idFormulario,
        Orden: item.orden,
        Pregunta: item.pregunta,
        Respuesta: parsed.respuesta,
        Observacion: parsed.observacion,
      };
    }),
  );

  XLSX.utils.book_append_sheet(workbook, infoSheet, "Resumen");
  XLSX.utils.book_append_sheet(workbook, respuestasSheet, "Respuestas");
  XLSX.writeFile(workbook, `autoevaluacion_${idAsignacion}.xlsx`);
}
