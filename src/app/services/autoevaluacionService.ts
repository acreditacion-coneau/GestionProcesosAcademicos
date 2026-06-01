import * as XLSX from "xlsx";
import { supabase } from "../../lib/supabaseClient";
import type {
  AdvertenciaInput,
  AsignacionEvaluacion,
  AutoevaluacionDetalle,
  CampaniaCreateInput,
  CampaniaEvaluacion,
  DashboardJefeCarrera,
  DashboardSecretaria,
  ExportRow,
  FormularioEvaluacion,
  PreguntaEvaluacion,
  RespuestaEvaluacion,
} from "../types/autoevaluacion";

type GenericRow = Record<string, unknown>;

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

function nowIso() {
  return new Date().toISOString();
}

function isBloqueadaEstado(estado: string): boolean {
  const value = estado.trim().toLowerCase();
  return value === "completada" || value === "enviada" || value === "cerrada";
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
    if (!id) continue;
    result.set(id, normalizeString(row, ["nombre"], "Sin carrera"));
  }

  return result;
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

  const { data, error } = await supabase
    .from("asignaciones_evaluacion")
    .select("id_asignacion,id_campania,id_docente,id_asignatura,estado,created_at")
    .eq("id_docente", idDocente)
    .order("created_at", { ascending: false })
    .limit(2000);

  if (error) throw error;

  const rows = (data ?? []) as GenericRow[];
  const asignaturaIds = rows.map((row) => normalizeString(row, ["id_asignatura"]));
  const asignaturasById = await getAsignaturasByIds(asignaturaIds);
  const carrerasById = await getCarrerasByIds(
    Array.from(asignaturasById.values()).map((item) => item.idCarrera),
  );

  return rows.map((row) => {
    const idAsignatura = normalizeString(row, ["id_asignatura"]);
    const asignaturaData = asignaturasById.get(idAsignatura);
    return {
      idAsignacion: normalizeString(row, ["id_asignacion"]),
      idCampania: normalizeString(row, ["id_campania"]),
      idDocente: normalizeString(row, ["id_docente"]),
      idAsignatura,
      estado: normalizeString(row, ["estado"], "pendiente"),
      createdAt: normalizeString(row, ["created_at"], nowIso()),
      asignatura: asignaturaData?.nombre ?? "Asignatura",
      carrera: carrerasById.get(asignaturaData?.idCarrera ?? "") ?? "Sin carrera",
    };
  });
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

  const { data: asignacionRaw, error: asignacionError } = await supabase
    .from("asignaciones_evaluacion")
    .select("id_asignacion,id_campania,id_docente,id_asignatura,estado,created_at")
    .eq("id_asignacion", idAsignacion)
    .maybeSingle();

  if (asignacionError) throw asignacionError;
  if (!asignacionRaw) return null;

  const baseAsignacion = await getMisAsignaciones(normalizeString(asignacionRaw as GenericRow, ["id_docente"]));
  const asignacion = baseAsignacion.find((item) => item.idAsignacion === idAsignacion);
  if (!asignacion) return null;

  const formularios = await getFormulariosParaAsignacion(asignacion.idDocente, asignacion.idAsignatura);
  const preguntas = await getPreguntasPorFormularios(formularios.map((item) => item.idFormulario));

  const { data: respuestasRaw, error: respuestasError } = await supabase
    .from("respuestas_evaluacion")
    .select("id_respuesta,id_asignacion,id_pregunta,respuesta,created_at")
    .eq("id_asignacion", idAsignacion)
    .limit(5000);

  if (respuestasError) throw respuestasError;
  const respuestas = ((respuestasRaw ?? []) as GenericRow[]).map(mapRespuestaRow);

  return {
    asignacion,
    formularios,
    preguntas,
    respuestas,
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

export async function enviarAutoevaluacion(idAsignacion: string): Promise<void> {
  const detalle = await getAutoevaluacionDetalle(idAsignacion);
  if (!detalle) throw new Error("Asignacion no encontrada.");
  if (detalle.bloqueada) throw new Error("La evaluacion ya fue enviada.");

  const { error } = await supabase
    .from("asignaciones_evaluacion")
    .update({ estado: "completada" })
    .eq("id_asignacion", idAsignacion);

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
  const { error } = await supabase
    .from("campanias_evaluacion")
    .update({ estado: "activa" })
    .eq("id_campania", idCampania);

  if (error) throw error;
}

export async function cerrarCampania(idCampania: string): Promise<void> {
  const { error } = await supabase
    .from("campanias_evaluacion")
    .update({ estado: "cerrada" })
    .eq("id_campania", idCampania);

  if (error) throw error;
}

export async function registrarAdvertencia(input: AdvertenciaInput, actor = "Sistema"): Promise<void> {
  // El esquema operativo actual del modulo se limita a las 5 tablas core.
  // La persistencia de advertencias administrativas se implementa en una iteracion posterior.
  void input;
  void actor;
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
    result.set(id, `${nombre} ${apellido}`.trim() || id);
  }

  return result;
}

function aggregateEstadoCounts(asignaciones: AsignacionEvaluacion[]) {
  const pendientes = asignaciones.filter((item) => item.estado.toLowerCase() === "pendiente").length;
  const completadas = asignaciones.filter((item) => item.estado.toLowerCase() === "completada").length;
  const vencidas = asignaciones.filter((item) => item.estado.toLowerCase() === "vencida").length;
  return { pendientes, completadas, vencidas };
}

export async function getDashboardJefeCarrera(): Promise<DashboardJefeCarrera> {
  const campanias = await getCampanias();
  const campaniaActiva = campanias.find((item) => item.estado.toLowerCase() === "activa") ?? campanias[0] ?? null;

  if (!campaniaActiva) {
    return {
      totalDocentes: 0,
      pendientes: 0,
      completadas: 0,
      vencidas: 0,
      porcentajeCompletado: 0,
      detalle: [],
    };
  }

  const { data, error } = await supabase
    .from("asignaciones_evaluacion")
    .select("id_asignacion,id_campania,id_docente,id_asignatura,estado,created_at")
    .eq("id_campania", campaniaActiva.idCampania)
    .limit(10000);

  if (error) throw error;

  const base = await Promise.all(
    ((data ?? []) as GenericRow[]).map(async (row) => {
      const idDocente = normalizeString(row, ["id_docente"]);
      const idAsignatura = normalizeString(row, ["id_asignatura"]);
      const asignaturas = await getAsignaturasByIds([idAsignatura]);
      const carreras = await getCarrerasByIds(Array.from(asignaturas.values()).map((item) => item.idCarrera));
      const asignatura = asignaturas.get(idAsignatura);
      return {
        idAsignacion: normalizeString(row, ["id_asignacion"]),
        idCampania: normalizeString(row, ["id_campania"]),
        idDocente,
        idAsignatura,
        estado: normalizeString(row, ["estado"], "pendiente"),
        createdAt: normalizeString(row, ["created_at"], nowIso()),
        asignatura: asignatura?.nombre ?? "Asignatura",
        carrera: carreras.get(asignatura?.idCarrera ?? "") ?? "Sin carrera",
      } as AsignacionEvaluacion;
    }),
  );

  const docentesById = await getDocentesByIds(base.map((item) => item.idDocente));
  const { pendientes, completadas, vencidas } = aggregateEstadoCounts(base);

  return {
    totalDocentes: new Set(base.map((item) => item.idDocente)).size,
    pendientes,
    completadas,
    vencidas,
    porcentajeCompletado: base.length === 0 ? 0 : Math.round((completadas / base.length) * 100),
    detalle: base.map((item) => ({
      idAsignacion: item.idAsignacion,
      docente: docentesById.get(item.idDocente) ?? item.idDocente,
      asignatura: item.asignatura,
      estado: item.estado,
      fechaEnvio: item.estado.toLowerCase() === "completada" ? item.createdAt : null,
    })),
  };
}

export async function getDashboardSecretaria(): Promise<DashboardSecretaria> {
  const [campanias, asignacionesAll] = await Promise.all([
    getCampanias(),
    (async () => {
      const { data, error } = await supabase
        .from("asignaciones_evaluacion")
        .select("id_asignacion,id_campania,id_docente,id_asignatura,estado,created_at")
        .limit(20000);
      if (error) throw error;
      return (data ?? []) as GenericRow[];
    })(),
  ]);

  const mapped = await Promise.all(
    asignacionesAll.map(async (row) => {
      const idDocente = normalizeString(row, ["id_docente"]);
      const idAsignatura = normalizeString(row, ["id_asignatura"]);
      const asignaturas = await getAsignaturasByIds([idAsignatura]);
      const carreras = await getCarrerasByIds(Array.from(asignaturas.values()).map((item) => item.idCarrera));
      const asignatura = asignaturas.get(idAsignatura);
      return {
        idAsignacion: normalizeString(row, ["id_asignacion"]),
        idCampania: normalizeString(row, ["id_campania"]),
        idDocente,
        idAsignatura,
        estado: normalizeString(row, ["estado"], "pendiente"),
        createdAt: normalizeString(row, ["created_at"], nowIso()),
        asignatura: asignatura?.nombre ?? "Asignatura",
        carrera: carreras.get(asignatura?.idCarrera ?? "") ?? "Sin carrera",
      } as AsignacionEvaluacion;
    }),
  );

  const { pendientes, completadas, vencidas } = aggregateEstadoCounts(mapped);

  return {
    campanias,
    totalAsignaciones: mapped.length,
    pendientes,
    completadas,
    vencidas,
    advertencias: 0,
    auditoriaReciente: [],
  };
}

export async function getCampaniaExportRows(idCampania: string): Promise<ExportRow[]> {
  const { data, error } = await supabase
    .from("asignaciones_evaluacion")
    .select("id_asignacion,id_campania,id_docente,id_asignatura,estado,created_at")
    .eq("id_campania", idCampania)
    .limit(10000);

  if (error) throw error;

  const campania = (await getCampanias()).find((item) => item.idCampania === idCampania);
  const mapped = await Promise.all(
    ((data ?? []) as GenericRow[]).map(async (row) => {
      const idAsignacion = normalizeString(row, ["id_asignacion"]);
      const idDocente = normalizeString(row, ["id_docente"]);
      const idAsignatura = normalizeString(row, ["id_asignatura"]);

      const [docentesById, asignaturasById] = await Promise.all([
        getDocentesByIds([idDocente]),
        getAsignaturasByIds([idAsignatura]),
      ]);
      const asignatura = asignaturasById.get(idAsignatura);
      const carreras = await getCarrerasByIds([asignatura?.idCarrera ?? ""]);

      const { count, error: countError } = await supabase
        .from("respuestas_evaluacion")
        .select("*", { count: "exact", head: true })
        .eq("id_asignacion", idAsignacion);

      if (countError) throw countError;

      return {
        campania: campania?.nombre ?? idCampania,
        docente: docentesById.get(idDocente) ?? idDocente,
        carrera: carreras.get(asignatura?.idCarrera ?? "") ?? "Sin carrera",
        asignatura: asignatura?.nombre ?? "Asignatura",
        estado: normalizeString(row, ["estado"], "pendiente"),
        fechaEnvio: normalizeString(row, ["created_at"], "") || null,
        cantidadRespuestas: count ?? 0,
      } as ExportRow;
    }),
  );

  return mapped;
}

export async function exportarCampaniaExcel(idCampania: string): Promise<void> {
  const rows = await getCampaniaExportRows(idCampania);
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(
    rows.map((row) => ({
      Campania: row.campania,
      Docente: row.docente,
      Carrera: row.carrera,
      Asignatura: row.asignatura,
      Estado: row.estado,
      "Fecha envio": row.fechaEnvio ?? "",
      "Respuestas cargadas": row.cantidadRespuestas,
    })),
  );
  XLSX.utils.book_append_sheet(workbook, worksheet, "Autoevaluaciones");
  XLSX.writeFile(workbook, `autoevaluaciones_${idCampania}.xlsx`);
}

export async function exportarCampaniaPorCarreraExcel(idCampania: string, carrera: string): Promise<void> {
  const rows = (await getCampaniaExportRows(idCampania))
    .filter((row) => row.carrera.trim().toLowerCase() === carrera.trim().toLowerCase());

  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(
    rows.map((row) => ({
      Campania: row.campania,
      Docente: row.docente,
      Carrera: row.carrera,
      Asignatura: row.asignatura,
      Estado: row.estado,
      "Fecha envio": row.fechaEnvio ?? "",
      "Respuestas cargadas": row.cantidadRespuestas,
    })),
  );
  XLSX.utils.book_append_sheet(workbook, worksheet, "Campania por carrera");
  XLSX.writeFile(workbook, `autoevaluaciones_${idCampania}_${carrera.replace(/\s+/g, "_")}.xlsx`);
}

export async function exportarAsignacionExcel(idAsignacion: string): Promise<void> {
  const detalle = await getAutoevaluacionDetalle(idAsignacion);
  if (!detalle) throw new Error("No se encontro la evaluacion seleccionada.");

  const respuestasMap = new Map(detalle.respuestas.map((item) => [item.idPregunta, item.respuesta]));

  const workbook = XLSX.utils.book_new();
  const infoSheet = XLSX.utils.aoa_to_sheet([
    ["Evaluacion Docente"],
    [],
    ["Asignatura", detalle.asignacion.asignatura],
    ["Estado", detalle.asignacion.estado],
    ["Fecha", detalle.asignacion.createdAt],
  ]);
  const respuestasSheet = XLSX.utils.json_to_sheet(
    detalle.preguntas.map((item) => ({
      Formulario: item.idFormulario,
      Orden: item.orden,
      Pregunta: item.pregunta,
      Respuesta: respuestasMap.get(item.idPregunta) ?? "",
    })),
  );

  XLSX.utils.book_append_sheet(workbook, infoSheet, "Resumen");
  XLSX.utils.book_append_sheet(workbook, respuestasSheet, "Respuestas");
  XLSX.writeFile(workbook, `autoevaluacion_${idAsignacion}.xlsx`);
}
