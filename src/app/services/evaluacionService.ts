import { supabase } from "../../lib/supabaseClient";

export type AsignacionEvaluacion = {
  id_asignacion: number;
  id_campania: number | null;
  id_docente: string;
  id_evaluador: string;
  rol_evaluador: "jefe_carrera" | "responsable_catedra";
  id_formulario: number;
  estado: "pendiente" | "completada" | "vencida";
  id_asignatura: string | null;
  firma_base64: string | null;
  completed_at: string | null;
  nombre_docente: string;
  apellido_docente: string;
  nombre_asignatura: string;
  cargo_docente: string;
};

export type PreguntaEvaluacion = {
  id_pregunta: number;
  id_formulario: number;
  pregunta: string;
  tipo_respuesta: string;
  obligatoria: boolean;
  orden: number;
};

export async function getAsignacionesEvaluador(
  idEvaluador: string,
  rolEvaluador?: "jefe_carrera" | "responsable_catedra",
  idAsignatura?: string
): Promise<AsignacionEvaluacion[]> {
  try {
    let query = supabase
      .from("asignaciones_evaluacion")
      .select("*")
      .eq("id_evaluador", Number(idEvaluador));

    if (rolEvaluador) {
      query = query.eq("rol_evaluador", rolEvaluador);
    }

    if (idAsignatura) {
      query = query.eq("id_asignatura", Number(idAsignatura));
    }

    const { data: asignaciones, error } = await query;

    if (error || !asignaciones) {
      console.warn("getAsignacionesEvaluador error:", error);
      return [];
    }

    const docenteIds = [...new Set(asignaciones.map((a) => a.id_docente).filter(Boolean))];
    const asignaturaIds = [...new Set(asignaciones.map((a) => a.id_asignatura).filter(Boolean))];
    const [docentesRes, asignaturasRes, designacionesRes] = await Promise.all([
      docenteIds.length > 0
        ? supabase.from("docentes").select("id_docente, nombre, apellido").in("id_docente", docenteIds)
        : Promise.resolve({ data: [] as { id_docente: string; nombre: string; apellido: string }[], error: null }),
      asignaturaIds.length > 0
        ? supabase.from("asignaturas").select("id_asignatura, nombre").in("id_asignatura", asignaturaIds)
        : Promise.resolve({ data: [] as { id_asignatura: string; nombre: string }[], error: null }),
      docenteIds.length > 0
        ? supabase.from("designaciones").select("id_docente, id_asignatura, cargo").in("id_docente", docenteIds)
        : Promise.resolve({ data: [] as { id_docente: string; id_asignatura: string; cargo: string }[], error: null }),
    ]);

    const docenteMap = new Map((docentesRes.data ?? []).map((d) => [d.id_docente, d]));
    const asignaturaMap = new Map((asignaturasRes.data ?? []).map((a) => [a.id_asignatura, a]));

    const JERARQUIA_CARGOS = [
      "Titular", "Asociado", "Adjunto a Cargo", "Adjunto",
      "Auxiliar", "Auxiliar Docente", "Ayudante", "Adscripto",
    ];

    const designacionMap = new Map<string, { id_asignatura: string; cargo: string }>();
    for (const a of asignaciones) {
      const match = (designacionesRes.data ?? []).find(
        (d) =>
          String(d.id_docente) === String(a.id_docente) &&
          (a.id_asignatura
            ? String(d.id_asignatura) === String(a.id_asignatura)
            : Boolean(d.id_asignatura)),
      );
      if (match) {
        const existing = designacionMap.get(a.id_docente);
        if (!existing) {
          designacionMap.set(a.id_docente, { id_asignatura: match.id_asignatura, cargo: match.cargo ?? "" });
        } else {
          const idxExisting = JERARQUIA_CARGOS.indexOf(existing.cargo);
          const idxNew = JERARQUIA_CARGOS.indexOf(match.cargo ?? "");
          const rankExisting = idxExisting === -1 ? JERARQUIA_CARGOS.length : idxExisting;
          const rankNew = idxNew === -1 ? JERARQUIA_CARGOS.length : idxNew;
          if (rankNew < rankExisting) {
            designacionMap.set(a.id_docente, { id_asignatura: match.id_asignatura, cargo: match.cargo ?? "" });
          }
        }
      }
    }

    const nuevosIds = [...new Set([...designacionMap.values()].map((v) => v.id_asignatura))].filter(
      (id) => !asignaturaMap.has(id),
    );
    if (nuevosIds.length > 0) {
      const { data: nuevasAsig } = await supabase
        .from("asignaturas")
        .select("id_asignatura, nombre")
        .in("id_asignatura", nuevosIds);
      for (const a of nuevasAsig ?? []) {
        asignaturaMap.set(a.id_asignatura, a);
      }
    }

    return asignaciones.map((a) => {
      const docente = docenteMap.get(a.id_docente);
      const designacionEntry = designacionMap.get(a.id_docente);
      const asignaturaId = a.id_asignatura ?? designacionEntry?.id_asignatura ?? null;
      const asignatura = asignaturaId ? asignaturaMap.get(asignaturaId) : undefined;
      return {
        ...a,
        nombre_docente: docente?.nombre ?? "",
        apellido_docente: docente?.apellido ?? "",
        nombre_asignatura: asignatura?.nombre ?? "",
        cargo_docente: designacionEntry?.cargo ?? "",
      };
    });
  } catch (err) {
    console.warn("getAsignacionesEvaluador exception:", err);
    return [];
  }
}

export async function getPreguntasByFormulario(idFormulario: number): Promise<PreguntaEvaluacion[]> {
  try {
    const { data, error } = await supabase
      .from("preguntas_evaluacion")
      .select("*")
      .eq("id_formulario", idFormulario)
      .order("orden", { ascending: true });

    if (error) {
      console.warn("getPreguntasByFormulario error:", error);
      return [];
    }
    return data ?? [];
  } catch (err) {
    console.warn("getPreguntasByFormulario exception:", err);
    return [];
  }
}

async function sha256Hex(input: string): Promise<string> {
  if (typeof crypto !== "undefined" && crypto.subtle) {
    const encoded = new TextEncoder().encode(input);
    const buffer = await crypto.subtle.digest("SHA-256", encoded);
    return Array.from(new Uint8Array(buffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) + hash) ^ input.charCodeAt(i);
    hash = hash >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

// ── Tipos nuevos ──────────────────────────────────────────────────────────────

export type ResumenCarrera = {
  idCarrera: number;
  carrera: string;
  total: number;
  completadas: number;
  pendientes: number;
  vencidas: number;
  conAlerta: number;
  pctCompletado: number;
};

export type DetalleDocenteEvaluado = {
  idDocente: number;
  nombre: string;
  apellido: string;
  email: string | null;
  evaluacionesCompletadas: number;
  evaluacionesPendientes: number;
  evaluacionesVencidas: number;
  totalNegativos: number;
  tieneAlerta: boolean;
};

type ExportDocenteEvaluacion = Pick<
  DetalleDocenteEvaluado,
  | "idDocente"
  | "nombre"
  | "apellido"
  | "email"
  | "evaluacionesCompletadas"
  | "evaluacionesPendientes"
  | "evaluacionesVencidas"
  | "totalNegativos"
  | "tieneAlerta"
>;

// ── RPCs ──────────────────────────────────────────────────────────────────────

export async function getResumenEvaluacionesPorCarrera(): Promise<ResumenCarrera[]> {
  try {
    const { data, error } = await supabase.rpc("get_resumen_evaluaciones_por_carrera");
    if (error || !data) {
      console.warn("getResumenEvaluacionesPorCarrera error:", error);
      return [];
    }
    return (data as Array<Record<string, unknown>>).map((r) => ({
      idCarrera: Number(r.id_carrera),
      carrera: String(r.carrera ?? ""),
      total: Number(r.total ?? 0),
      completadas: Number(r.completadas ?? 0),
      pendientes: Number(r.pendientes ?? 0),
      vencidas: Number(r.vencidas ?? 0),
      conAlerta: Number(r.con_alerta ?? 0),
      pctCompletado: Number(r.pct_completado ?? 0),
    }));
  } catch (err) {
    console.warn("getResumenEvaluacionesPorCarrera exception:", err);
    return [];
  }
}

export async function getDetalleEvaluacionesCarrera(idCarrera: number): Promise<DetalleDocenteEvaluado[]> {
  try {
    const { data, error } = await supabase.rpc("get_detalle_evaluaciones_carrera", {
      p_id_carrera: idCarrera,
    });
    if (error || !data) {
      console.warn("getDetalleEvaluacionesCarrera error:", error);
      return [];
    }
    return (data as Array<Record<string, unknown>>).map((r) => ({
      idDocente: Number(r.id_docente),
      nombre: String(r.nombre ?? ""),
      apellido: String(r.apellido ?? ""),
      email: r.email ? String(r.email) : null,
      evaluacionesCompletadas: Number(r.evaluaciones_completadas ?? 0),
      evaluacionesPendientes: Number(r.evaluaciones_pendientes ?? 0),
      evaluacionesVencidas: Number(r.evaluaciones_vencidas ?? 0),
      totalNegativos: Number(r.total_negativos ?? 0),
      tieneAlerta: Boolean(r.tiene_alerta),
    }));
  } catch (err) {
    console.warn("getDetalleEvaluacionesCarrera exception:", err);
    return [];
  }
}

export type RespuestaEvaluacionDetalle = {
  idAsignacion: number;
  idFormulario: number;
  nombreFormulario: string;
  idPregunta: number;
  pregunta: string;
  respuesta: string;
  observacion: string | null;
  polaridadPositiva: boolean;
};

export async function getRespuestasEvaluacionDocente(
  idDocente: number
): Promise<RespuestaEvaluacionDetalle[]> {
  try {
    const { data, error } = await supabase
      .from("respuestas_evaluacion")
      .select(`
        id_respuesta,
        id_asignacion,
        respuesta,
        observacion,
        id_pregunta,
        preguntas_evaluacion (
          pregunta,
          id_formulario,
          polaridad_positiva
        ),
        asignaciones_evaluacion!inner (
          id_docente
        )
      `)
      .eq("asignaciones_evaluacion.id_docente", idDocente);

    if (error || !data) {
      console.warn("getRespuestasEvaluacionDocente error:", error);
      return [];
    }

    const NOMBRE_FORMULARIO: Record<number, string> = {
      1: "Evaluación de Desempeño",
      2: "Evaluación de Desempeño",
      3: "Informe Institucional",
      4: "Informe Institucional",
    };

    return (data as Array<Record<string, unknown>>).map((r) => {
      const pregunta = r.preguntas_evaluacion as Record<string, unknown> | null;
      const idFormulario = Number(pregunta?.id_formulario ?? 0);
      return {
        idAsignacion: Number(r.id_asignacion),
        idFormulario,
        nombreFormulario: NOMBRE_FORMULARIO[idFormulario] ?? `Formulario ${idFormulario}`,
        idPregunta: Number(r.id_pregunta),
        pregunta: String(pregunta?.pregunta ?? ""),
        respuesta: String(r.respuesta ?? ""),
        observacion: r.observacion ? String(r.observacion) : null,
        polaridadPositiva: Boolean(pregunta?.polaridad_positiva ?? true),
      };
    });
  } catch (err) {
    console.warn("getRespuestasEvaluacionDocente exception:", err);
    return [];
  }
}

async function loadXlsx() {
  return import("xlsx");
}

function getEstadoEvaluacionDocente(docente: ExportDocenteEvaluacion): string {
  if (docente.evaluacionesPendientes > 0) return "Con pendientes";
  if (docente.evaluacionesCompletadas > 0) return "Completada";
  if (docente.evaluacionesVencidas > 0) return "Vencida";
  return "Sin evaluaciones";
}

function sanitizeFilePart(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80) || "evaluaciones";
}

export async function exportarEvaluacionesDocentesExcel(
  docentes: ExportDocenteEvaluacion[],
  carrera: string,
): Promise<void> {
  const XLSX = await loadXlsx();
  const respuestasPorDocente = await Promise.all(
    docentes.map(async (docente) => ({
      docente,
      respuestas: await getRespuestasEvaluacionDocente(docente.idDocente),
    })),
  );

  const rows = respuestasPorDocente.flatMap(({ docente, respuestas }) => {
    const base = {
      Docente: `${docente.apellido}, ${docente.nombre}`,
      Email: docente.email ?? "",
      Carrera: carrera,
      Estado: getEstadoEvaluacionDocente(docente),
      "Evaluaciones completadas": docente.evaluacionesCompletadas,
      "Evaluaciones pendientes": docente.evaluacionesPendientes,
      "Evaluaciones vencidas": docente.evaluacionesVencidas,
      "Respuestas negativas": docente.totalNegativos,
      Alerta: docente.tieneAlerta ? "Si" : "No",
    };

    if (respuestas.length === 0) {
      return [{
        ...base,
        Formulario: "",
        Pregunta: "",
        Respuesta: "",
        Observacion: "",
      }];
    }

    return respuestas.map((respuesta) => ({
      ...base,
      Formulario: respuesta.nombreFormulario || `Formulario ${respuesta.idFormulario}`,
      Pregunta: respuesta.pregunta,
      Respuesta: respuesta.respuesta,
      Observacion: respuesta.observacion ?? "",
    }));
  });

  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(workbook, worksheet, "Evaluaciones");
  XLSX.writeFile(workbook, `evaluaciones_${sanitizeFilePart(carrera)}.xlsx`);
}

export async function lanzarCampania(params: {
  p_nombre: string;
  p_fecha_limite: string;
  p_creada_por: number;
  p_semestre: number;
  p_anio: number;
}): Promise<{ ok: boolean; id_campania?: number; error?: string }> {
  try {
    const { data, error } = await supabase.rpc("lanzar_campania", params);
    if (error) {
      const msg = error.message ?? String(error);
      if (msg.includes("YA_EXISTE_CAMPANIA_ACTIVA")) {
        return { ok: false, error: "YA_EXISTE_CAMPANIA_ACTIVA" };
      }
      return { ok: false, error: msg };
    }
    return { ok: true, id_campania: data as number | undefined };
  } catch (err) {
    console.warn("lanzarCampania exception:", err);
    return { ok: false, error: "EXCEPTION" };
  }
}

export async function getNotificaciones(idUsuario: number): Promise<Array<{
  id: number;
  titulo: string;
  mensaje: string | null;
  tipo: "info" | "alerta" | "exito";
  leida: boolean;
  id_campania: string | null;
  accion_url: string | null;
  created_at: string;
}>> {
  try {
    const { data, error } = await supabase
      .from("notificaciones")
      .select("id, titulo, mensaje, tipo, leida, id_campania, accion_url, created_at")
      .eq("id_usuario", idUsuario)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error || !data) {
      console.warn("getNotificaciones error:", error);
      return [];
    }
    return data;
  } catch (err) {
    console.warn("getNotificaciones exception:", err);
    return [];
  }
}

export async function marcarNotificacionLeida(idNotif: number): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("notificaciones")
      .update({ leida: true })
      .eq("id", idNotif);
    return !error;
  } catch (err) {
    console.warn("marcarNotificacionLeida exception:", err);
    return false;
  }
}

export async function marcarTodasNotificacionesLeidas(idUsuario: number): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("notificaciones")
      .update({ leida: true })
      .eq("id_usuario", idUsuario)
      .eq("leida", false);
    return !error;
  } catch (err) {
    console.warn("marcarTodasNotificacionesLeidas exception:", err);
    return false;
  }
}

export async function completarAsignacion(
  idAsignacion: number,
  respuestas: Record<number, string>,
  firmaBase64: string,
  observaciones?: Record<number, string>,
): Promise<boolean> {
  try {
    const firmaHash = await sha256Hex(firmaBase64);

    const insertPayload = Object.entries(respuestas).map(([idPregunta, valor]) => ({
      id_asignacion: idAsignacion,
      id_pregunta: Number(idPregunta),
      respuesta: valor,
      ...(observaciones?.[Number(idPregunta)]?.trim()
        ? { observacion: observaciones[Number(idPregunta)].trim() }
        : {}),
    }));

    if (insertPayload.length > 0) {
      const { error: insertError } = await supabase
        .from("respuestas_evaluacion")
        .insert(insertPayload);
      if (insertError) console.warn("Insert respuestas error:", insertError);
    }

    const { error: rpcError } = await supabase.rpc("completar_asignacion", {
      p_id_asignacion: idAsignacion,
      p_firma_hash: firmaHash,
      p_firma_base64: firmaBase64,
    });

    if (!rpcError) return true;

    console.warn("RPC completar_asignacion falló, usando fallback:", rpcError);

    const { error: updateError } = await supabase
      .from("asignaciones_evaluacion")
      .update({
        estado: "completada",
        firma_base64: firmaBase64,
        firma_hash: firmaHash,
        completed_at: new Date().toISOString(),
      })
      .eq("id_asignacion", idAsignacion);

    if (updateError) {
      console.warn("Update asignacion (fallback) error:", updateError);
      return false;
    }
    return true;
  } catch (err) {
    console.warn("completarAsignacion exception:", err);
    return false;
  }
}
