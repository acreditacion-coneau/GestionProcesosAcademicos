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

    const designacionMap = new Map<string, { id_asignatura: string; cargo: string }>();
    for (const a of asignaciones) {
      const match = (designacionesRes.data ?? []).find(
        (d) =>
          String(d.id_docente) === String(a.id_docente) &&
          (a.id_asignatura
            ? String(d.id_asignatura) === String(a.id_asignatura)
            : Boolean(d.id_asignatura)),
      );
      if (match && !designacionMap.has(a.id_docente)) {
        designacionMap.set(a.id_docente, {
          id_asignatura: match.id_asignatura,
          cargo: match.cargo ?? "",
        });
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
