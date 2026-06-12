import { useState, useEffect, useMemo, useRef } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, ChevronRight, ClipboardList, Loader2, Send } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { useUser } from "../context/UserContext";
import {
  getAsignacionesEvaluador,
  getPreguntasByFormulario,
  completarAsignacion,
  type AsignacionEvaluacion,
  type PreguntaEvaluacion,
} from "../services/evaluacionService";
import {
  EstadoBadge,
  ModuloHero,
  ProgressPanel,
  StatCard,
} from "../components/autoevaluacion/AutoevaluacionUI";
import { SignaturePad } from "../components/autoevaluacion/SignaturePad";

const ANSWER_OPTIONS = [
  {
    value: "si",
    label: "Si",
    className:
      "border-emerald-200 text-emerald-700 hover:bg-emerald-50 data-[active=true]:bg-emerald-600 data-[active=true]:text-white data-[active=true]:border-emerald-600",
  },
  {
    value: "a_veces",
    label: "A veces",
    className:
      "border-amber-200 text-amber-700 hover:bg-amber-50 data-[active=true]:bg-amber-500 data-[active=true]:text-white data-[active=true]:border-amber-500",
  },
  {
    value: "no",
    label: "No",
    className:
      "border-rose-200 text-rose-700 hover:bg-rose-50 data-[active=true]:bg-rose-600 data-[active=true]:text-white data-[active=true]:border-rose-600",
  },
] as const;

const NOMBRE_FORMULARIO: Record<number, string> = {
  1: "Evaluación de Desempeño",
  2: "Evaluación de Desempeño",
  3: "Informe Institucional de Control de Gestión",
  4: "Informe Institucional de Control de Gestión",
};

function dataUrlToBase64(dataUrl: string): string {
  return dataUrl.includes(",") ? dataUrl.split(",")[1] ?? "" : dataUrl;
}

function getHumanErrorMessage(raw: string): string {
  const normalized = raw.toLowerCase();
  if (
    normalized.includes("row-level security") ||
    normalized.includes("policy") ||
    normalized.includes("permission")
  ) {
    return "No tiene permisos para esta accion en este momento. Contacte a Secretaria Academica.";
  }
  if (
    normalized.includes("network") ||
    normalized.includes("fetch") ||
    normalized.includes("abort")
  ) {
    return "No pudimos conectarnos con Supabase. Verifique su conexion e intente nuevamente.";
  }
  if (normalized.includes("firma")) {
    return "La firma digital es obligatoria para completar la evaluacion.";
  }
  return raw || "No pudimos completar la operacion. Intente nuevamente.";
}

type GrupoDocente = {
  id_docente: string;
  apellido_docente: string;
  nombre_docente: string;
  nombre_asignatura: string;
  cargo_docente?: string;
  asignaciones: AsignacionEvaluacion[];
  estadoGrupo: "completada" | "pendiente" | "vencida";
};

type ExpandedGrupoFormProps = {
  grupo: GrupoDocente;
  asignaciones: AsignacionEvaluacion[];
  preguntasCache: Record<number, PreguntaEvaluacion[]>;
  loadingPreguntas: Record<number, boolean>;
  respuestasMap: Record<number, Record<number, string>>;
  observacionesMap: Record<number, Record<number, string>>;
  obsOpenMap: Record<number, Record<number, boolean>>;
  firma: string | null;
  saving: boolean;
  error: string;
  allAnswered: boolean;
  currentStep: number;
  onNextStep: () => void;
  onPrevStep: () => void;
  onRespuesta: (idAsig: number, idPregunta: number, valor: string) => void;
  onObservacion: (idAsig: number, idPregunta: number, texto: string) => void;
  onToggleObs: (idAsig: number, idPregunta: number) => void;
  onFirma: (dataUrl: string | null) => void;
  onGuardar: () => void;
  onCerrar: () => void;
  setPreguntaRef: (key: string, el: HTMLDivElement | null) => void;
  onSignaturePadMount: (el: HTMLDivElement | null) => void;
  readOnly?: boolean;
};

function ExpandedGrupoForm({
  grupo,
  asignaciones,
  preguntasCache,
  loadingPreguntas,
  respuestasMap,
  observacionesMap,
  obsOpenMap,
  firma,
  saving,
  error,
  allAnswered,
  currentStep,
  onNextStep,
  onPrevStep,
  onRespuesta,
  onObservacion,
  onToggleObs,
  onFirma,
  onGuardar,
  onCerrar,
  setPreguntaRef,
  onSignaturePadMount,
  readOnly = false,
}: ExpandedGrupoFormProps) {
  const isLoading = asignaciones.some((a) => loadingPreguntas[a.id_asignacion] ?? false);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-slate-500 py-8 text-sm justify-center">
        <Loader2 className="w-4 h-4 animate-spin" /> Cargando preguntas...
      </div>
    );
  }

  const safeStep = Math.min(currentStep, Math.max(asignaciones.length - 1, 0));
  const currentAsig = asignaciones[safeStep];
  if (!currentAsig) return null;

  const preguntas = preguntasCache[currentAsig.id_asignacion] ?? [];
  const isLastStep = safeStep >= asignaciones.length - 1;
  const isFirstStep = safeStep === 0;

  const totalPreguntas = asignaciones.reduce(
    (acc, a) => acc + (preguntasCache[a.id_asignacion]?.length ?? 0),
    0,
  );
  const answeredCount = asignaciones.reduce((acc, a) => {
    const resp = respuestasMap[a.id_asignacion] ?? {};
    return acc + (preguntasCache[a.id_asignacion] ?? []).filter((p) => (resp[p.id_pregunta] ?? "").trim().length > 0).length;
  }, 0);
  const progressPct = totalPreguntas === 0 ? 0 : (answeredCount / totalPreguntas) * 100;

  const currentStepAnswered = preguntas.every(
    (p) => (respuestasMap[currentAsig.id_asignacion]?.[p.id_pregunta] ?? "").trim().length > 0,
  );

  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <ProgressPanel
        title={`Formulario ${safeStep + 1} de ${asignaciones.length}`}
        subtitle={`${grupo.apellido_docente}, ${grupo.nombre_docente}`}
        value={progressPct}
        helper={`${answeredCount} respuestas registradas sobre ${totalPreguntas} en total.`}
      />

      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="gap-2">
          <div className="flex flex-wrap gap-2 items-center justify-between">
            <div>
              <CardTitle className="text-xl">{grupo.apellido_docente}, {grupo.nombre_docente}</CardTitle>
              <CardDescription>{grupo.nombre_asignatura}{grupo.asignaciones[0]?.cargo_docente ? ` · ${grupo.asignaciones[0].cargo_docente}` : ""}</CardDescription>
            </div>
            <EstadoBadge estado={grupo.estadoGrupo} />
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3">
            <p className="text-xs uppercase text-slate-500">Formulario {safeStep + 1}</p>
            <h4 className="text-sm sm:text-base font-semibold text-slate-900">
              {NOMBRE_FORMULARIO[currentAsig.id_formulario] ?? `Formulario ${currentAsig.id_formulario}`}
            </h4>
          </div>

          <div className="space-y-3">
            {preguntas.map((p, idx) => {
              const key = `${currentAsig.id_asignacion}-${p.id_pregunta}`;
              const selected = respuestasMap[currentAsig.id_asignacion]?.[p.id_pregunta] ?? "";
              const isSiNo = p.tipo_respuesta === "SI_NO" || p.tipo_respuesta === "SI_NO_AVECES";
              const showAveces = p.tipo_respuesta === "SI_NO_AVECES";
              return (
                <motion.article
                  key={p.id_pregunta}
                  ref={(node) => setPreguntaRef(key, node)}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: idx * 0.03 }}
                  className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-sm font-medium text-slate-800 flex-1">
                      {idx + 1}. {p.pregunta}
                    </span>
                    {p.obligatoria && (
                      <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded shrink-0">
                        Obligatoria
                      </span>
                    )}
                  </div>

                  {isSiNo ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {ANSWER_OPTIONS.filter((opt) => showAveces || opt.value !== "a_veces").map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          disabled={readOnly}
                          data-active={selected === opt.value}
                          onClick={() => onRespuesta(currentAsig.id_asignacion, p.id_pregunta, opt.value)}
                          className={`h-11 rounded-xl border text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 ${opt.className}`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <textarea
                      value={selected}
                      onChange={(e) => onRespuesta(currentAsig.id_asignacion, p.id_pregunta, e.target.value)}
                      readOnly={readOnly}
                      rows={3}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 resize-none focus:outline-none focus:ring-2 focus:ring-blue-100"
                      placeholder="Escriba su respuesta..."
                    />
                  )}

                  {!readOnly && (
                    <>
                      <button
                        type="button"
                        onClick={() => onToggleObs(currentAsig.id_asignacion, p.id_pregunta)}
                        className="text-xs font-medium text-blue-700 hover:text-blue-900"
                      >
                        {obsOpenMap[currentAsig.id_asignacion]?.[p.id_pregunta]
                          ? "- Ocultar observación"
                          : "+ Agregar observación"}
                      </button>
                      <AnimatePresence initial={false}>
                        {obsOpenMap[currentAsig.id_asignacion]?.[p.id_pregunta] && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.2 }}
                            className="mt-2"
                          >
                            <textarea
                              value={observacionesMap[currentAsig.id_asignacion]?.[p.id_pregunta] ?? ""}
                              onChange={(e) => onObservacion(currentAsig.id_asignacion, p.id_pregunta, e.target.value)}
                              rows={2}
                              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 resize-none focus:outline-none focus:ring-2 focus:ring-blue-100"
                              placeholder="Observación opcional..."
                            />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </>
                  )}
                </motion.article>
              );
            })}
          </div>

          {isLastStep && !readOnly && (
            <section className="rounded-2xl border border-slate-200 bg-slate-50/50 p-5 space-y-4">
              <div>
                <h4 className="font-semibold text-slate-900">Firma digital institucional</h4>
                <p className="text-sm text-slate-600 mt-1">Declaro que la información brindada es verídica.</p>
              </div>
              <div ref={onSignaturePadMount}>
                <SignaturePad signed={!!firma} onChange={onFirma} />
              </div>
              {firma && (
                <div className="rounded-xl border border-emerald-200 bg-white p-3 space-y-2">
                  <p className="text-sm text-emerald-700 font-medium">✓ Documento firmado</p>
                </div>
              )}
            </section>
          )}

          {error && (
            <p className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3">
            <button
              type="button"
              onClick={isFirstStep ? onCerrar : onPrevStep}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              {isFirstStep ? "Cerrar" : "Formulario anterior"}
            </button>

            {isLastStep ? (
              <button
                type="button"
                onClick={onGuardar}
                disabled={saving || !allAnswered || !firma || readOnly}
                className="flex items-center gap-2 text-sm font-medium bg-[#1e3a8a] text-white px-5 py-2.5 rounded-xl hover:bg-[#1e3a8a]/90 transition-colors disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {readOnly ? "Evaluación completada" : "Confirmar Evaluación"}
              </button>
            ) : (
              <button
                type="button"
                onClick={onNextStep}
                disabled={!readOnly && !currentStepAnswered}
                className="flex items-center gap-2 text-sm font-medium bg-[#1e3a8a] text-white px-5 py-2.5 rounded-xl hover:bg-[#1e3a8a]/90 transition-colors disabled:opacity-50"
              >
                Siguiente formulario <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function EvaluacionDocentePage() {
  const { user, selectedDesignacion } = useUser();
  const [asignaciones, setAsignaciones] = useState<AsignacionEvaluacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedDocente, setExpandedDocente] = useState<string | null>(null);
  const [preguntasCache, setPreguntasCache] = useState<Record<number, PreguntaEvaluacion[]>>({});
  const [loadingPreguntas, setLoadingPreguntas] = useState<Record<number, boolean>>({});
  const [respuestasMap, setRespuestasMap] = useState<Record<number, Record<number, string>>>({});
  const [obsOpenMap, setObsOpenMap] = useState<Record<number, Record<number, boolean>>>({});
  const [observacionesMap, setObservacionesMap] = useState<Record<number, Record<number, string>>>(
    {},
  );
  const [firmaDocente, setFirmaDocente] = useState<Record<string, string | null>>({});
  const [savingDocente, setSavingDocente] = useState<string | null>(null);
  const [errorDocente, setErrorDocente] = useState<Record<string, string>>({});
  const [currentFormStep, setCurrentFormStep] = useState<Record<string, number>>({});
  const [search, setSearch] = useState("");
  const [filtroAsignatura, setFiltroAsignatura] = useState("todas");
  const [filtroEstado, setFiltroEstado] = useState("todos");

  const preguntaRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const signaturePadRef = useRef<HTMLDivElement | null>(null);
  const expandedRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!user.idDocente) {
      setLoading(false);
      return;
    }
    const rolEvaluador =
      user.rol === "JEFE_CARRERA"
        ? "jefe_carrera"
        : user.rol === "DOCENTE_RESPONSABLE"
          ? "responsable_catedra"
          : undefined;
    const idAsignatura = user.rol === "DOCENTE_RESPONSABLE" ? selectedDesignacion?.idAsignatura : undefined;
    getAsignacionesEvaluador(user.idDocente, rolEvaluador, idAsignatura).then((data) => {
      setAsignaciones(data);
      setLoading(false);
    });
  }, [user.idDocente, selectedDesignacion?.idAsignatura]);

  useEffect(() => {
    if (expandedDocente === null) return;
    const timer = setTimeout(() => {
      expandedRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
    return () => clearTimeout(timer);
  }, [expandedDocente]);

  const grupos = useMemo((): GrupoDocente[] => {
    const map = new Map<string, AsignacionEvaluacion[]>();
    for (const a of asignaciones) {
      const list = map.get(a.id_docente) ?? [];
      list.push(a);
      map.set(a.id_docente, list);
    }
    return Array.from(map.entries()).map(([id_docente, asigs]) => {
      const ref = asigs[0]!;
      let estadoGrupo: "completada" | "pendiente" | "vencida";
      if (asigs.every((a) => a.estado === "completada")) {
        estadoGrupo = "completada";
      } else if (asigs.some((a) => a.estado === "pendiente")) {
        estadoGrupo = "pendiente";
      } else {
        estadoGrupo = "vencida";
      }
      return {
        id_docente,
        apellido_docente: ref.apellido_docente,
        nombre_docente: ref.nombre_docente,
        nombre_asignatura: ref.nombre_asignatura,
        cargo_docente: asigs[0]?.cargo_docente ?? "",
        asignaciones: asigs,
        estadoGrupo,
      };
    });
  }, [asignaciones]);

  const flatPreguntas = useMemo(() => {
    if (!expandedDocente) return [] as Array<{ id_asignacion: number; id_pregunta: number }>;
    const grupo = grupos.find((g) => g.id_docente === expandedDocente);
    if (!grupo) return [] as Array<{ id_asignacion: number; id_pregunta: number }>;
    const pendientes = [...grupo.asignaciones]
      .filter((a) => a.estado === "pendiente")
      .sort((a, b) => a.id_formulario - b.id_formulario);
    const result: Array<{ id_asignacion: number; id_pregunta: number }> = [];
    for (const asig of pendientes) {
      for (const p of preguntasCache[asig.id_asignacion] ?? []) {
        result.push({ id_asignacion: asig.id_asignacion, id_pregunta: p.id_pregunta });
      }
    }
    return result;
  }, [expandedDocente, grupos, preguntasCache]);

  const total = grupos.length;
  const completadas = grupos.filter((g) => g.estadoGrupo === "completada").length;
  const pendientes = grupos.filter((g) => g.estadoGrupo === "pendiente").length;
  const progressPct = total === 0 ? 0 : (completadas / total) * 100;

  const asignaturasUnicas = useMemo(
    () => Array.from(new Set(grupos.map((g) => g.nombre_asignatura).filter(Boolean))).sort(),
    [grupos],
  );

  const filteredGrupos = useMemo(() => {
    const q = search.trim().toLowerCase();
    return grupos
      .filter((g) => filtroEstado === "todos" || g.estadoGrupo === filtroEstado)
      .filter((g) => filtroAsignatura === "todas" || g.nombre_asignatura === filtroAsignatura)
      .filter((g) => {
        if (!q) return true;
        return (
          g.apellido_docente.toLowerCase().includes(q) ||
          g.nombre_docente.toLowerCase().includes(q)
        );
      });
  }, [grupos, search, filtroEstado, filtroAsignatura]);

  const handleToggleDocente = async (grupo: GrupoDocente) => {
    const { id_docente } = grupo;
    if (expandedDocente === id_docente) {
      setExpandedDocente(null);
      return;
    }
    setExpandedDocente(id_docente);
    setCurrentFormStep((prev) => ({ ...prev, [id_docente]: 0 }));
    const toLoad = grupo.asignaciones.filter((a) => preguntasCache[a.id_asignacion] === undefined);
    if (toLoad.length === 0) return;
    setLoadingPreguntas((prev) => {
      const next = { ...prev };
      for (const a of toLoad) next[a.id_asignacion] = true;
      return next;
    });
    try {
      const results = await Promise.all(
        toLoad.map((a) =>
          getPreguntasByFormulario(a.id_formulario).then(
            (p) => [a.id_asignacion, p] as const,
          ),
        ),
      );
      setPreguntasCache((prev) => {
        const next = { ...prev };
        for (const [id, pregs] of results) next[id] = pregs;
        return next;
      });
    } finally {
      setLoadingPreguntas((prev) => {
        const next = { ...prev };
        for (const a of toLoad) next[a.id_asignacion] = false;
        return next;
      });
    }
  };

  const handleRespuesta = (idAsig: number, idPregunta: number, valor: string) => {
    setRespuestasMap((prev) => ({
      ...prev,
      [idAsig]: { ...(prev[idAsig] ?? {}), [idPregunta]: valor },
    }));
    const key = `${idAsig}-${idPregunta}`;
    const idx = flatPreguntas.findIndex(
      (p) => `${p.id_asignacion}-${p.id_pregunta}` === key,
    );
    if (idx >= 0 && idx < flatPreguntas.length - 1) {
      const next = flatPreguntas[idx + 1]!;
      const nextKey = `${next.id_asignacion}-${next.id_pregunta}`;
      setTimeout(
        () =>
          preguntaRefs.current[nextKey]?.scrollIntoView({ behavior: "smooth", block: "center" }),
        50,
      );
    } else if (idx === flatPreguntas.length - 1) {
      setTimeout(
        () => signaturePadRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }),
        50,
      );
    }
  };

  const handleObservacion = (idAsig: number, idPregunta: number, texto: string) => {
    setObservacionesMap((prev) => ({
      ...prev,
      [idAsig]: { ...(prev[idAsig] ?? {}), [idPregunta]: texto },
    }));
  };

  const toggleObs = (idAsig: number, idPregunta: number) => {
    setObsOpenMap((prev) => ({
      ...prev,
      [idAsig]: {
        ...(prev[idAsig] ?? {}),
        [idPregunta]: !(prev[idAsig]?.[idPregunta] ?? false),
      },
    }));
  };

  const allAnsweredGrupo = (idDocente: string): boolean => {
    const grupo = grupos.find((g) => g.id_docente === idDocente);
    if (!grupo) return false;
    const asigsPendientes = grupo.asignaciones.filter((a) => a.estado === "pendiente");
    if (asigsPendientes.length === 0) return false;
    return asigsPendientes.every((asig) => {
      const pregs = preguntasCache[asig.id_asignacion] ?? [];
      if (pregs.length === 0) return false;
      const resp = respuestasMap[asig.id_asignacion] ?? {};
      return pregs.every((p) => (resp[p.id_pregunta] ?? "").trim().length > 0);
    });
  };

  const handleGuardarGrupo = async (idDocente: string) => {
    const grupo = grupos.find((g) => g.id_docente === idDocente);
    if (!grupo) return;
    const firma = firmaDocente[idDocente] ?? null;
    if (!firma) {
      setErrorDocente((prev) => ({
        ...prev,
        [idDocente]: "Debe firmar digitalmente antes de guardar.",
      }));
      return;
    }
    const asigsPendientes = grupo.asignaciones.filter((a) => a.estado === "pendiente");
    for (const asig of asigsPendientes) {
      const pregs = preguntasCache[asig.id_asignacion] ?? [];
      const resp = respuestasMap[asig.id_asignacion] ?? {};
      if (pregs.some((p) => !(resp[p.id_pregunta] ?? "").trim())) {
        setErrorDocente((prev) => ({
          ...prev,
          [idDocente]: "Complete todas las preguntas antes de confirmar.",
        }));
        return;
      }
    }
    const firmaBase64 = dataUrlToBase64(firma);
    setSavingDocente(idDocente);
    setErrorDocente((prev) => ({ ...prev, [idDocente]: "" }));
    try {
      const results = await Promise.all(
        asigsPendientes.map((asig) =>
          completarAsignacion(
            asig.id_asignacion,
            respuestasMap[asig.id_asignacion] ?? {},
            firmaBase64,
            observacionesMap[asig.id_asignacion] ?? {},
          ),
        ),
      );
      if (results.every(Boolean)) {
        setAsignaciones((prev) =>
          prev.map((a) =>
            asigsPendientes.some((p) => p.id_asignacion === a.id_asignacion)
              ? { ...a, estado: "completada" }
              : a,
          ),
        );
        setExpandedDocente(null);
      } else {
        setErrorDocente((prev) => ({
          ...prev,
          [idDocente]: "No se pudo guardar la evaluacion. Intente nuevamente.",
        }));
      }
    } catch (err) {
      setErrorDocente((prev) => ({
        ...prev,
        [idDocente]: getHumanErrorMessage(err instanceof Error ? err.message : ""),
      }));
    } finally {
      setSavingDocente(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-slate-100 rounded-2xl animate-pulse" />
          ))}
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="px-6 py-4 border-b border-slate-100 flex gap-4">
              <div className="flex-1 h-4 bg-slate-100 rounded animate-pulse" />
              <div className="w-24 h-4 bg-slate-100 rounded animate-pulse" />
              <div className="w-20 h-4 bg-slate-100 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {total > 0 && (
        <div className="sticky top-0 z-10 bg-white border-b border-slate-100 shadow-sm px-6 py-3">
          <p className="text-sm text-slate-700 mb-1.5">
            {completadas} de {total} docentes evaluados
          </p>
          <div
            className="h-2.5 rounded-full bg-teal-100 overflow-hidden"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progressPct)}
          >
            <motion.div
              className="h-full bg-teal-600"
              animate={{ width: `${progressPct}%` }}
              transition={{ type: "spring", stiffness: 120, damping: 20 }}
            />
          </div>
        </div>
      )}

      <ModuloHero
        title="Evaluación Docente"
        description={`${user.carrera} — ${total} docentes asignados`}
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard title="Total" value={total} tone="default" />
        <StatCard title="Completadas" value={completadas} tone="success" />
        <StatCard title="Pendientes" value={pendientes} tone="warning" />
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar docente..."
            className="h-10 rounded-md border border-slate-200 px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
          />
          <select
            value={filtroAsignatura}
            onChange={(e) => setFiltroAsignatura(e.target.value)}
            className="h-10 rounded-md border border-slate-200 px-3 text-sm bg-white"
          >
            <option value="todas">Todas las asignaturas</option>
            {asignaturasUnicas.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            className="h-10 rounded-md border border-slate-200 px-3 text-sm bg-white"
          >
            <option value="todos">Todos</option>
            <option value="pendiente">Pendiente</option>
            <option value="completada">Completada</option>
            <option value="vencida">Vencida</option>
          </select>
        </div>
      </div>

      {grupos.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-12 text-center">
          <ClipboardList className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 text-sm">
            No tiene evaluaciones asignadas para esta campaña.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500 border-b border-slate-100">
              <tr>
                <th className="px-6 py-3 font-semibold">Docente</th>
                <th className="px-6 py-3 font-semibold hidden sm:table-cell">Asignatura</th>
                <th className="px-6 py-3 font-semibold">Estado</th>
                <th className="px-6 py-3 font-semibold text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredGrupos.map((grupo) => (
                <tr
                  key={grupo.id_docente}
                  className={`transition-colors ${
                    grupo.estadoGrupo === "completada"
                      ? "bg-emerald-50/30"
                      : grupo.estadoGrupo === "vencida"
                        ? "bg-rose-50/20"
                        : "hover:bg-slate-50/50"
                  }`}
                >
                  <td className="px-6 py-4">
                    <p className="font-semibold text-slate-900">{grupo.apellido_docente}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {grupo.nombre_docente}{grupo.cargo_docente ? ` · ${grupo.cargo_docente}` : ""}
                    </p>
                  </td>
                  <td className="px-6 py-4 text-slate-700 hidden sm:table-cell">
                    {grupo.nombre_asignatura}
                  </td>
                  <td className="px-6 py-4">
                    <EstadoBadge estado={grupo.estadoGrupo} />
                  </td>
                  <td className="px-6 py-4 text-right">
                    {grupo.estadoGrupo !== "vencida" && (
                      <button
                        type="button"
                        onClick={() => void handleToggleDocente(grupo)}
                        className="inline-flex items-center gap-1.5 text-sm font-medium text-[#7c3a1e] bg-[#fce7d6]/50 hover:bg-[#fce7d6] px-3 py-1.5 rounded-lg border border-[#f5c6a0] transition-colors"
                      >
                        {expandedDocente === grupo.id_docente
                          ? "Cerrar"
                          : grupo.estadoGrupo === "completada"
                            ? "Ver"
                            : "Evaluar"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredGrupos.length === 0 && (
            <div className="py-12 text-center">
              <p className="text-slate-500 text-sm">
                No hay resultados para los filtros seleccionados.
              </p>
            </div>
          )}
        </div>
      )}

      {(() => {
        if (expandedDocente === null) return null;
        const grupo = grupos.find((g) => g.id_docente === expandedDocente);
        if (!grupo) return null;
        const isReadOnly = grupo.estadoGrupo === "completada";
        const asignacionesParaForm = (
          isReadOnly
            ? [...grupo.asignaciones]
            : grupo.asignaciones.filter((a) => a.estado === "pendiente")
        ).sort((a, b) => a.id_formulario - b.id_formulario);
        const step = currentFormStep[expandedDocente] ?? 0;
        return (
          <div ref={expandedRef}>
            <ExpandedGrupoForm
              grupo={grupo}
              asignaciones={asignacionesParaForm}
              preguntasCache={preguntasCache}
              loadingPreguntas={loadingPreguntas}
              respuestasMap={respuestasMap}
              observacionesMap={observacionesMap}
              obsOpenMap={obsOpenMap}
              firma={firmaDocente[expandedDocente] ?? null}
              saving={savingDocente === expandedDocente}
              error={errorDocente[expandedDocente] ?? ""}
              allAnswered={allAnsweredGrupo(expandedDocente)}
              currentStep={step}
              onNextStep={() => setCurrentFormStep((prev) => ({ ...prev, [expandedDocente]: step + 1 }))}
              onPrevStep={() => setCurrentFormStep((prev) => ({ ...prev, [expandedDocente]: Math.max(step - 1, 0) }))}
              onRespuesta={handleRespuesta}
              onObservacion={handleObservacion}
              onToggleObs={toggleObs}
              onFirma={(url) => setFirmaDocente((prev) => ({ ...prev, [expandedDocente]: url }))}
              onGuardar={() => void handleGuardarGrupo(expandedDocente)}
              onCerrar={() => setExpandedDocente(null)}
              setPreguntaRef={(key, el) => { preguntaRefs.current[key] = el; }}
              onSignaturePadMount={(el) => { signaturePadRef.current = el; }}
              readOnly={isReadOnly}
            />
          </div>
        );
      })()}
    </div>
  );
}
