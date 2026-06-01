import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Download,
  FileSpreadsheet,
  Filter,
  Search,
  Send,
  ShieldAlert,
} from "lucide-react";
import { NavLink } from "react-router";
import { useUser } from "../context/UserContext";
import { SignaturePad } from "../components/autoevaluacion/SignaturePad";
import {
  EstadoBadge,
  ModuloHero,
  ProgressPanel,
  StatCard,
} from "../components/autoevaluacion/AutoevaluacionUI";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import {
  crearCampania,
  cerrarCampania,
  enviarAutoevaluacion,
  exportarAsignacionExcel,
  exportarCampaniaExcel,
  exportarCampaniaPorCarreraExcel,
  getAutoevaluacionDetalle,
  getCampaniaExportRows,
  getCampanias,
  getDashboardJefeCarrera,
  getDashboardSecretaria,
  getMisAsignaciones,
  lanzarCampania,
  registrarAdvertencia,
  responderAutoevaluacion,
  resolveDocenteIdByDni,
} from "../services/autoevaluacionService";
import type {
  AsignacionEvaluacion,
  AutoevaluacionDetalle,
  CampaniaEvaluacion,
  DashboardJefeCarrera,
  DashboardSecretaria,
  PreguntaEvaluacion,
} from "../types/autoevaluacion";

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

type DocenteFormValues = Record<string, string | boolean>;
type EstadoFiltro = "todos" | "pendiente" | "completada" | "vencida";
type ConfirmationState = {
  idAsignacion: string;
  asignatura: string;
  campania: string;
  fecha: string;
};

function formatDate(value: string | null | undefined): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("es-AR");
}

function resolveCampaignName(
  campaigns: CampaniaEvaluacion[],
  idCampania: string,
): string {
  return campaigns.find((item) => item.idCampania === idCampania)?.nombre ?? "Campana";
}

function parseTipoFromDescripcion(descripcion: string | null): string {
  const raw = (descripcion ?? "").toLowerCase();
  if (raw.includes("1er_semestre")) return "1er_semestre";
  if (raw.includes("2do_semestre")) return "2do_semestre";
  if (raw.includes("anual")) return "anual";
  return "sin_tipo";
}

function isTextQuestion(question: PreguntaEvaluacion): boolean {
  const kind = question.tipoRespuesta.toLowerCase();
  return kind.includes("texto") || kind.includes("abierta");
}

function getHumanErrorMessage(raw: string): string {
  const normalized = raw.toLowerCase();
  if (normalized.includes("row-level security") || normalized.includes("policy")) {
    return "No tiene permisos para esta accion en este momento. Contacte a Secretaria Academica.";
  }
  if (normalized.includes("network") || normalized.includes("fetch")) {
    return "No pudimos conectarnos con el servidor. Verifique su conexion e intente nuevamente.";
  }
  return "No pudimos guardar las respuestas. Intente nuevamente.";
}

function CompletionScreen({
  confirmation,
  onDownload,
  onBack,
}: {
  confirmation: ConfirmationState;
  onDownload: () => void;
  onBack: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="border-emerald-200 bg-emerald-50/50 shadow-sm">
        <CardContent className="pt-8 pb-8">
          <div className="max-w-2xl mx-auto text-center space-y-6">
            <div className="mx-auto w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-slate-900">Evaluacion completada</h3>
              <p className="text-slate-600 mt-2">
                Su evaluacion fue enviada correctamente y quedo bloqueada para edicion.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
              <InfoMini label="Asignatura" value={confirmation.asignatura} />
              <InfoMini label="Campana" value={confirmation.campania} />
              <InfoMini label="Fecha de envio" value={confirmation.fecha} />
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              <Button type="button" onClick={onDownload}>
                <Download className="w-4 h-4" /> Descargar Excel
              </Button>
              <Button type="button" variant="outline" onClick={onBack}>
                Volver al listado
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function InfoMini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-emerald-200 bg-white px-3 py-2">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="text-sm font-semibold text-slate-900 mt-1">{value}</p>
    </div>
  );
}

function DocenteAutoevaluacion() {
  const { user } = useUser();

  const [docenteId, setDocenteId] = useState<string>(user.idDocente ?? "");
  const [asignaciones, setAsignaciones] = useState<AsignacionEvaluacion[]>([]);
  const [campanias, setCampanias] = useState<CampaniaEvaluacion[]>([]);
  const [detalle, setDetalle] = useState<AutoevaluacionDetalle | null>(null);
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [search, setSearch] = useState("");
  const [filtroEstado, setFiltroEstado] = useState<EstadoFiltro>("todos");
  const [observacionOpen, setObservacionOpen] = useState<Record<string, boolean>>({});
  const [observaciones, setObservaciones] = useState<Record<string, string>>({});
  const [confirmation, setConfirmation] = useState<ConfirmationState | null>(null);
  const [currentFormIndex, setCurrentFormIndex] = useState(0);

  const questionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const { register, handleSubmit, reset, formState, setValue, watch } =
    useForm<DocenteFormValues>({ mode: "onChange" });

  useEffect(() => {
    let active = true;

    async function resolve() {
      if (user.idDocente) {
        setDocenteId(user.idDocente);
        return;
      }

      try {
        const found = await resolveDocenteIdByDni(user.dni);
        if (active) setDocenteId(found ?? "");
      } catch {
        if (active) setDocenteId("");
      }
    }

    void resolve();

    return () => {
      active = false;
    };
  }, [user.idDocente, user.dni]);

  const loadData = async () => {
    if (!docenteId) {
      setAsignaciones([]);
      setCampanias([]);
      return;
    }

    const [nextAsignaciones, nextCampanias] = await Promise.all([
      getMisAsignaciones(docenteId),
      getCampanias(),
    ]);

    setAsignaciones(nextAsignaciones);
    setCampanias(nextCampanias);
  };

  useEffect(() => {
    void loadData();
  }, [docenteId]);

  const openAsignacion = async (idAsignacion: string) => {
    const nextDetalle = await getAutoevaluacionDetalle(idAsignacion);
    setDetalle(nextDetalle);
    setSignatureDataUrl(null);
    setStatusMessage("");
    setSubmitAttempted(false);
    setConfirmation(null);
    setObservacionOpen({});
    setObservaciones({});
    setCurrentFormIndex(0);

    if (!nextDetalle) {
      reset({});
      return;
    }

    const defaults: DocenteFormValues = { __declaracion: false };
    for (const respuesta of nextDetalle.respuestas) {
      defaults[respuesta.idPregunta] = respuesta.respuesta;
    }
    reset(defaults);
  };

  const orderedQuestions = useMemo(() => {
    return (detalle?.preguntas ?? [])
      .slice()
      .sort((a, b) => a.idFormulario - b.idFormulario || a.orden - b.orden);
  }, [detalle?.preguntas]);

  const formSteps = useMemo(() => {
    const formularios = (detalle?.formularios ?? [])
      .slice()
      .sort((a, b) => a.idFormulario - b.idFormulario);
    const formularioIds = new Set(formularios.map((formulario) => formulario.idFormulario));

    const steps = formularios
      .map((formulario) => ({
        formulario,
        questions: orderedQuestions.filter(
          (question) => question.idFormulario === formulario.idFormulario,
        ),
      }))
      .filter((step) => step.questions.length > 0);

    const preguntasSinFormulario = orderedQuestions.filter(
      (question) => !formularioIds.has(question.idFormulario),
    );

    if (preguntasSinFormulario.length > 0) {
      steps.push({
        formulario: {
          idFormulario: 0,
          nombre: "Formulario complementario",
          descripcion: "",
          activo: true,
        },
        questions: preguntasSinFormulario,
      });
    }

    return steps.length > 0
      ? steps
      : [
          {
            formulario: {
              idFormulario: 0,
              nombre: "Formulario",
              descripcion: "",
              activo: true,
            },
            questions: orderedQuestions,
          },
        ];
  }, [detalle?.formularios, orderedQuestions]);

  const safeCurrentFormIndex = Math.min(currentFormIndex, Math.max(formSteps.length - 1, 0));
  const currentStep = formSteps[safeCurrentFormIndex];
  const currentQuestions = currentStep?.questions ?? [];
  const isLastFormStep = safeCurrentFormIndex >= formSteps.length - 1;

  const values = watch();

  const answeredCount = useMemo(() => {
    return orderedQuestions.filter((question) => {
      return String(values[question.idPregunta] ?? "").trim().length > 0;
    }).length;
  }, [orderedQuestions, values]);

  const progressPercentage = orderedQuestions.length === 0
    ? 0
    : (answeredCount / orderedQuestions.length) * 100;

  const firstMissingIndex = useMemo(() => {
    return currentQuestions.findIndex((question) => {
      return question.obligatoria && !String(values[question.idPregunta] ?? "").trim();
    });
  }, [currentQuestions, values]);

  const currentQuestionNumber = currentQuestions.length === 0
    ? 0
    : firstMissingIndex >= 0
      ? firstMissingIndex + 1
      : currentQuestions.length;

  const missingRequiredIds = useMemo(() => {
    return orderedQuestions
      .filter((question) => question.obligatoria && !String(values[question.idPregunta] ?? "").trim())
      .map((question) => question.idPregunta);
  }, [orderedQuestions, values]);

  const currentMissingRequiredIds = useMemo(() => {
    return currentQuestions
      .filter((question) => question.obligatoria && !String(values[question.idPregunta] ?? "").trim())
      .map((question) => question.idPregunta);
  }, [currentQuestions, values]);

  const filteredAsignaciones = useMemo(() => {
    const query = search.trim().toLowerCase();

    return asignaciones
      .filter((item) => filtroEstado === "todos" || item.estado.toLowerCase() === filtroEstado)
      .filter((item) => {
        if (!query) return true;
        const campania = resolveCampaignName(campanias, item.idCampania).toLowerCase();
        return item.asignatura.toLowerCase().includes(query) || campania.includes(query);
      });
  }, [asignaciones, filtroEstado, search, campanias]);

  const handleAutoSelect = (question: PreguntaEvaluacion, value: string) => {
    setValue(question.idPregunta, value, {
      shouldValidate: true,
      shouldDirty: true,
      shouldTouch: true,
    });

    if (submitAttempted) {
      setSubmitAttempted(false);
    }

    const currentIndex = currentQuestions.findIndex((item) => item.idPregunta === question.idPregunta);
    const next = currentQuestions[currentIndex + 1];
    if (next?.idPregunta) {
      questionRefs.current[next.idPregunta]?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  };

  const toggleObservation = (questionId: string) => {
    setObservacionOpen((prev) => ({ ...prev, [questionId]: !prev[questionId] }));
  };

  const handleNextForm = () => {
    setSubmitAttempted(true);

    if (currentMissingRequiredIds.length > 0) {
      setStatusMessage("Complete las preguntas obligatorias de este formulario para continuar.");
      questionRefs.current[currentMissingRequiredIds[0]]?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
      return;
    }

    setStatusMessage("");
    setSubmitAttempted(false);
    setCurrentFormIndex((prev) => Math.min(prev + 1, formSteps.length - 1));
  };

  const handlePreviousForm = () => {
    setStatusMessage("");
    setSubmitAttempted(false);
    setCurrentFormIndex((prev) => Math.max(prev - 1, 0));
  };

  const onSubmit = handleSubmit(async (formValues) => {
    if (!detalle) return;

    setSubmitAttempted(true);

    if (detalle.bloqueada) {
      setStatusMessage("Esta evaluacion ya fue enviada y solo puede visualizarse.");
      return;
    }

    if (missingRequiredIds.length > 0) {
      setStatusMessage("Hay preguntas obligatorias sin responder. Revise las marcadas en rojo.");
      return;
    }

    if (formValues.__declaracion !== true) {
      setStatusMessage("Debe aceptar la declaracion jurada antes de enviar.");
      return;
    }

    if (!signatureDataUrl) {
      setStatusMessage("Debe firmar digitalmente antes de enviar.");
      return;
    }

    const respuestas = orderedQuestions.map((question) => {
      const base = String(formValues[question.idPregunta] ?? "").trim();
      const observacion = observaciones[question.idPregunta]?.trim();

      return {
        idAsignacion: detalle.asignacion.idAsignacion,
        idPregunta: question.idPregunta,
        respuesta: observacion ? `${base}\nObs: ${observacion}` : base,
      };
    });

    setIsSubmitting(true);
    setStatusMessage("");

    try {
      await responderAutoevaluacion(detalle.asignacion.idAsignacion, respuestas);
      await enviarAutoevaluacion(detalle.asignacion.idAsignacion);

      const campaignName = resolveCampaignName(campanias, detalle.asignacion.idCampania);
      await loadData();
      await openAsignacion(detalle.asignacion.idAsignacion);

      setConfirmation({
        idAsignacion: detalle.asignacion.idAsignacion,
        asignatura: detalle.asignacion.asignatura,
        campania: campaignName,
        fecha: new Date().toLocaleString("es-AR"),
      });
      setStatusMessage("Su evaluacion fue enviada correctamente.");
    } catch (error) {
      const raw = error instanceof Error ? error.message : "";
      setStatusMessage(getHumanErrorMessage(raw));
    } finally {
      setIsSubmitting(false);
    }
  });

  const canSubmit = useMemo(() => {
    if (!detalle) return false;
    return !detalle.bloqueada && !isSubmitting;
  }, [detalle, isSubmitting]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="space-y-4">
        <NavLink
          to="/"
          className="inline-flex items-center text-sm font-medium text-blue-700 hover:text-blue-900"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Volver al inicio
        </NavLink>

        <ModuloHero
          title="Autoevaluacion docente"
          description="Complete sus autoevaluaciones por asignatura con un flujo guiado, claro y seguro."
        />
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="text-lg">Mis autoevaluaciones</CardTitle>
              <CardDescription>
                Filtre por estado y abra cada evaluacion en formato de tarjetas.
              </CardDescription>
            </div>

            {!docenteId && (
              <Badge className="bg-rose-50 text-rose-700 border-rose-200">
                No se pudo resolver id_docente para el DNI actual
              </Badge>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3">
            <label className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar por asignatura o campana"
                className="pl-9"
              />
            </label>

            <div className="flex flex-wrap gap-2 items-center">
              <Filter className="w-4 h-4 text-slate-500" />
              {(["todos", "pendiente", "completada", "vencida"] as EstadoFiltro[]).map((estado) => (
                <button
                  key={estado}
                  type="button"
                  onClick={() => setFiltroEstado(estado)}
                  className={`px-3 py-1.5 text-xs rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 ${
                    filtroEstado === estado
                      ? "bg-slate-900 text-white border-slate-900"
                      : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  {estado === "todos" ? "Todos" : estado}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredAsignaciones.map((item) => (
              <motion.article
                key={item.idAsignacion}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className="rounded-2xl border border-slate-200 p-4 sm:p-5 bg-white shadow-sm hover:shadow-md transition-all duration-200"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="text-base font-semibold text-slate-900">{item.asignatura}</h4>
                    <p className="text-xs text-slate-500 mt-1">
                      {resolveCampaignName(campanias, item.idCampania)}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      Fecha de asignacion: {formatDate(item.createdAt)}
                    </p>
                  </div>
                  <EstadoBadge estado={item.estado} />
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    onClick={() => void openAsignacion(item.idAsignacion)}
                    className="rounded-xl"
                  >
                    {item.estado.toLowerCase() === "completada"
                      ? "Visualizar respuestas"
                      : "Iniciar evaluacion"}
                    <ChevronRight className="w-4 h-4" />
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => void exportarAsignacionExcel(item.idAsignacion)}
                    className="rounded-xl"
                  >
                    <Download className="w-4 h-4" />
                    Descargar
                  </Button>
                </div>
              </motion.article>
            ))}
          </div>

          {filteredAsignaciones.length === 0 && (
            <div className="text-center text-slate-500 py-10">
              No encontramos autoevaluaciones para los filtros seleccionados.
            </div>
          )}
        </CardContent>
      </Card>

      {detalle && !confirmation && (
        <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <ProgressPanel
            title={`Formulario ${safeCurrentFormIndex + 1} de ${formSteps.length}`}
            subtitle={`Pregunta ${currentQuestionNumber} de ${currentQuestions.length}`}
            value={progressPercentage}
            helper={`${answeredCount} respuestas registradas sobre ${orderedQuestions.length} en total.`}
          />

          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="gap-2">
              <div className="flex flex-wrap gap-2 items-center justify-between">
                <div>
                  <CardTitle className="text-xl">{detalle.asignacion.asignatura}</CardTitle>
                  <CardDescription>
                    Campana: {resolveCampaignName(campanias, detalle.asignacion.idCampania)}
                  </CardDescription>
                </div>
                <EstadoBadge estado={detalle.asignacion.estado} />
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              {submitAttempted && (isLastFormStep ? missingRequiredIds : currentMissingRequiredIds).length > 0 && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-800 text-sm">
                  Faltan {(isLastFormStep ? missingRequiredIds : currentMissingRequiredIds).length} preguntas obligatorias por completar.
                </div>
              )}

              <form onSubmit={onSubmit} className="space-y-8" noValidate>
                <section className="space-y-4">
                  <div className="rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3">
                    <p className="text-xs uppercase text-slate-500">
                      Formulario {safeCurrentFormIndex + 1}
                    </p>
                    <h4 className="text-sm sm:text-base font-semibold text-slate-900">
                      {currentStep?.formulario.nombre ?? "Formulario"}
                    </h4>
                    {currentStep?.formulario.descripcion && (
                      <p className="text-xs sm:text-sm text-slate-600 mt-1">
                        {currentStep.formulario.descripcion}
                      </p>
                    )}
                  </div>

                  <div className="space-y-3">
                    {currentQuestions.map((question, questionIndex) => {
                      const selected = String(values[question.idPregunta] ?? "");
                      const textQuestion = isTextQuestion(question);
                      const hasError = submitAttempted
                        && question.obligatoria
                        && !selected.trim();

                      return (
                        <motion.article
                          key={question.idPregunta}
                          ref={(node) => { questionRefs.current[question.idPregunta] = node; }}
                          initial={{ opacity: 0, y: 10 }}
                          whileInView={{ opacity: 1, y: 0 }}
                          viewport={{ once: true, margin: "-60px" }}
                          transition={{ duration: 0.18 }}
                          className={`rounded-2xl border p-4 sm:p-5 transition-all duration-200 ${
                            hasError
                              ? "border-rose-300 bg-rose-50/40"
                              : "border-slate-200 bg-white hover:shadow-sm"
                          }`}
                        >
                          {!textQuestion && (
                            <input
                              type="hidden"
                              {...register(question.idPregunta, {
                                required: question.obligatoria,
                              })}
                            />
                          )}

                          <div className="flex items-start justify-between gap-3 mb-4">
                            <p className="text-sm sm:text-base font-medium text-slate-900 leading-relaxed">
                              {questionIndex + 1}. {question.pregunta}
                            </p>
                            {question.obligatoria && (
                              <Badge className="bg-slate-100 text-slate-700 border-slate-200">
                                Obligatoria
                              </Badge>
                            )}
                          </div>

                          {textQuestion ? (
                            <Textarea
                              rows={4}
                              disabled={detalle.bloqueada}
                              placeholder="Escriba su respuesta"
                              {...register(question.idPregunta, {
                                required: question.obligatoria,
                              })}
                            />
                          ) : (
                            <div
                              role="radiogroup"
                              aria-label={`Opciones para pregunta ${questionIndex + 1}`}
                              className="grid grid-cols-1 sm:grid-cols-3 gap-2"
                            >
                              {ANSWER_OPTIONS.map((option) => (
                                <button
                                  key={`${question.idPregunta}-${option.value}`}
                                  type="button"
                                  disabled={detalle.bloqueada}
                                  data-active={selected === option.value}
                                  onClick={() => handleAutoSelect(question, option.value)}
                                  className={`h-11 rounded-xl border text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 ${option.className}`}
                                >
                                  {option.label}
                                </button>
                              ))}
                            </div>
                          )}

                          <div className="mt-4">
                            <button
                              type="button"
                              onClick={() => toggleObservation(question.idPregunta)}
                              className="text-xs font-medium text-blue-700 hover:text-blue-900"
                            >
                              {observacionOpen[question.idPregunta]
                                ? "- Ocultar observacion"
                                : "+ Agregar observacion"}
                            </button>

                            <AnimatePresence initial={false}>
                              {observacionOpen[question.idPregunta] && (
                                <motion.div
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: "auto" }}
                                  exit={{ opacity: 0, height: 0 }}
                                  transition={{ duration: 0.2 }}
                                  className="mt-2"
                                >
                                  <Textarea
                                    value={observaciones[question.idPregunta] ?? ""}
                                    onChange={(event) => setObservaciones((prev) => ({
                                      ...prev,
                                      [question.idPregunta]: event.target.value,
                                    }))}
                                    placeholder="Observacion opcional"
                                    rows={2}
                                    disabled={detalle.bloqueada}
                                  />
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>

                          {hasError && (
                            <p className="mt-2 text-xs text-rose-700">
                              Complete esta pregunta para continuar.
                            </p>
                          )}
                        </motion.article>
                      );
                    })}
                  </div>
                </section>

                {isLastFormStep && (
                  <section className="rounded-2xl border border-slate-200 bg-slate-50/50 p-5 space-y-4">
                  <div>
                    <h4 className="font-semibold text-slate-900">
                      Firma digital institucional
                    </h4>
                    <p className="text-sm text-slate-600 mt-1">
                      Declaro que la informacion brindada es veridica.
                    </p>
                  </div>

                  <SignaturePad
                    disabled={detalle.bloqueada}
                    onChange={setSignatureDataUrl}
                  />

                  <AnimatePresence>
                    {signatureDataUrl && (
                      <motion.p
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        className="text-sm text-emerald-700 font-medium"
                      >
                        ✓ Documento firmado correctamente
                      </motion.p>
                    )}
                  </AnimatePresence>

                  <label className="flex items-start gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      disabled={detalle.bloqueada}
                      {...register("__declaracion", { required: true })}
                    />
                    Declaro que la informacion registrada en esta autoevaluacion es veraz.
                  </label>
                  </section>
                )}

                {statusMessage && (
                  <p
                    className={`text-sm rounded-lg px-3 py-2 border ${
                      statusMessage.toLowerCase().includes("correctamente")
                        ? "text-emerald-700 border-emerald-200 bg-emerald-50"
                        : "text-rose-700 border-rose-200 bg-rose-50"
                    }`}
                  >
                    {statusMessage}
                  </p>
                )}

                <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={safeCurrentFormIndex === 0}
                    onClick={handlePreviousForm}
                    className="rounded-xl"
                  >
                    Volver al formulario anterior
                  </Button>

                  {isLastFormStep ? (
                    <Button
                      type="submit"
                      disabled={!canSubmit || formState.isSubmitting}
                      className="rounded-xl"
                    >
                      <Send className="w-4 h-4" />
                      Enviar evaluacion
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      disabled={detalle.bloqueada}
                      onClick={handleNextForm}
                      className="rounded-xl"
                    >
                      Siguiente formulario
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {confirmation && (
        <CompletionScreen
          confirmation={confirmation}
          onDownload={() => void exportarAsignacionExcel(confirmation.idAsignacion)}
          onBack={() => setConfirmation(null)}
        />
      )}
    </div>
  );
}

function JefeAutoevaluacion() {
  const { user } = useUser();

  const [campanias, setCampanias] = useState<CampaniaEvaluacion[]>([]);
  const [dashboard, setDashboard] = useState<DashboardJefeCarrera | null>(null);
  const [loading, setLoading] = useState(true);
  const [newCampaignName, setNewCampaignName] = useState("");
  const [newCampaignType, setNewCampaignType] = useState<
    "1er_semestre" | "2do_semestre" | "anual"
  >("1er_semestre");
  const [selectedCampaniaId, setSelectedCampaniaId] = useState<string>("");
  const [exportRowsCount, setExportRowsCount] = useState<number>(0);
  const [statusMessage, setStatusMessage] = useState<string>("");

  const refresh = async () => {
    setLoading(true);
    try {
      const [nextCampanias, nextDashboard] = await Promise.all([
        getCampanias(),
        getDashboardJefeCarrera(),
      ]);

      setCampanias(nextCampanias);
      setDashboard(nextDashboard);
      setSelectedCampaniaId((prev) => prev || nextCampanias[0]?.idCampania || "");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  useEffect(() => {
    if (!selectedCampaniaId) return;
    void getCampaniaExportRows(selectedCampaniaId).then((rows) => {
      setExportRowsCount(rows.length);
    });
  }, [selectedCampaniaId]);

  const handleCreateCampania = async () => {
    if (!newCampaignName.trim()) return;

    const today = new Date();
    const start = today.toISOString().slice(0, 10);
    const endDate = new Date(today);
    endDate.setMonth(endDate.getMonth() + 4);
    const end = endDate.toISOString().slice(0, 10);

    try {
      await crearCampania({
        nombre: newCampaignName.trim(),
        fechaInicio: start,
        fechaFin: end,
        descripcion: `tipo:${newCampaignType}`,
        idCarrera: null,
      });

      setStatusMessage("Campana creada correctamente.");
      setNewCampaignName("");
      await refresh();
    } catch (error) {
      const raw = error instanceof Error ? error.message : "";
      setStatusMessage(getHumanErrorMessage(raw));
    }
  };

  const handleLaunch = async (idCampania: string) => {
    try {
      await lanzarCampania(idCampania);
      setStatusMessage("Campana lanzada correctamente.");
      await refresh();
    } catch (error) {
      const raw = error instanceof Error ? error.message : "";
      setStatusMessage(getHumanErrorMessage(raw));
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <ModuloHero
        title="Panel Jefe de Carrera"
        description="Configure campanas, controle avances y exporte resultados por carrera."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
        <StatCard title="Total docentes" value={dashboard?.totalDocentes ?? 0} />
        <StatCard title="Pendientes" value={dashboard?.pendientes ?? 0} tone="warning" />
        <StatCard title="Completadas" value={dashboard?.completadas ?? 0} tone="success" />
        <StatCard title="Vencidas" value={dashboard?.vencidas ?? 0} tone="danger" />
        <StatCard title="% completado" value={`${dashboard?.porcentajeCompletado ?? 0}%`} />
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle>Campanas de autoevaluacion</CardTitle>
          <CardDescription>Genere una campana y luego actívela para iniciar asignaciones.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto] gap-3">
            <Input
              value={newCampaignName}
              onChange={(event) => setNewCampaignName(event.target.value)}
              placeholder="Nombre de campana"
            />
            <select
              value={newCampaignType}
              onChange={(event) => {
                setNewCampaignType(event.target.value as "1er_semestre" | "2do_semestre" | "anual");
              }}
              className="h-10 rounded-md border border-slate-200 px-3 text-sm bg-white"
            >
              <option value="1er_semestre">1er_semestre</option>
              <option value="2do_semestre">2do_semestre</option>
              <option value="anual">anual</option>
            </select>
            <Button type="button" onClick={() => void handleCreateCampania()}>
              Crear campana
            </Button>
          </div>

          {statusMessage && (
            <p
              className={`text-sm rounded-lg px-3 py-2 border ${
                statusMessage.toLowerCase().includes("correctamente")
                  ? "text-emerald-700 border-emerald-200 bg-emerald-50"
                  : "text-rose-700 border-rose-200 bg-rose-50"
              }`}
            >
              {statusMessage}
            </p>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {campanias.map((item) => (
              <article key={item.idCampania} className="rounded-2xl border border-slate-200 p-4 bg-white">
                <div className="flex justify-between gap-2 items-start">
                  <div>
                    <h4 className="font-semibold text-slate-900">{item.nombre}</h4>
                    <p className="text-xs text-slate-500 mt-1">Tipo: {parseTipoFromDescripcion(item.descripcion)}</p>
                    <p className="text-xs text-slate-500">Inicio: {formatDate(item.fechaInicio)} · Fin: {formatDate(item.fechaFin)}</p>
                  </div>
                  <EstadoBadge estado={item.estado} />
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {item.estado.toLowerCase() === "borrador" && (
                    <Button type="button" variant="outline" onClick={() => void handleLaunch(item.idCampania)}>
                      Lanzar
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setSelectedCampaniaId(item.idCampania);
                      void exportarCampaniaExcel(item.idCampania);
                    }}
                  >
                    <Download className="w-4 h-4" /> Exportar
                  </Button>
                </div>
              </article>
            ))}
            {!loading && campanias.length === 0 && (
              <div className="text-sm text-slate-500">No hay campanas registradas.</div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle>Seguimiento de docentes</CardTitle>
              <CardDescription>Revise estado de respuesta por asignatura.</CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={selectedCampaniaId}
                onChange={(event) => setSelectedCampaniaId(event.target.value)}
                className="h-10 rounded-md border border-slate-200 px-3 text-sm bg-white"
              >
                {campanias.map((item) => (
                  <option key={item.idCampania} value={item.idCampania}>
                    {item.nombre}
                  </option>
                ))}
              </select>

              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (!selectedCampaniaId) return;
                  void exportarCampaniaPorCarreraExcel(selectedCampaniaId, user.carrera);
                }}
              >
                <FileSpreadsheet className="w-4 h-4" /> Exportar por carrera
              </Button>
            </div>
          </div>
          <p className="text-xs text-slate-500">Registros disponibles para exportar: {exportRowsCount}</p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {(dashboard?.detalle ?? []).map((item) => (
              <article key={item.idAsignacion} className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="font-semibold text-slate-900">{item.docente}</p>
                <p className="text-sm text-slate-600 mt-1">{item.asignatura}</p>
                <div className="mt-2 flex items-center justify-between">
                  <EstadoBadge estado={item.estado} />
                  <span className="text-xs text-slate-500">{formatDate(item.fechaEnvio)}</span>
                </div>
              </article>
            ))}
            {!loading && (dashboard?.detalle ?? []).length === 0 && (
              <div className="text-sm text-slate-500">Sin resultados para la campana activa.</div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SecretariaAutoevaluacion() {
  const { user } = useUser();

  const [dashboard, setDashboard] = useState<DashboardSecretaria | null>(null);
  const [selectedCampaniaId, setSelectedCampaniaId] = useState("");
  const [advertencia, setAdvertencia] = useState("");
  const [statusMessage, setStatusMessage] = useState("");

  const refresh = async () => {
    const next = await getDashboardSecretaria();
    setDashboard(next);
    setSelectedCampaniaId((prev) => prev || next.campanias[0]?.idCampania || "");
  };

  useEffect(() => {
    void refresh();
  }, []);

  const handleCloseCampania = async (idCampania: string) => {
    try {
      await cerrarCampania(idCampania);
      setStatusMessage("Campana cerrada correctamente.");
      await refresh();
    } catch (error) {
      const raw = error instanceof Error ? error.message : "";
      setStatusMessage(getHumanErrorMessage(raw));
    }
  };

  const handleAdvertencia = async () => {
    if (!selectedCampaniaId || !advertencia.trim()) return;

    try {
      await registrarAdvertencia(
        { idCampania: selectedCampaniaId, detalle: advertencia.trim() },
        `${user.nombre} ${user.apellido ?? ""}`.trim(),
      );
      setStatusMessage("Advertencia registrada correctamente.");
      setAdvertencia("");
      await refresh();
    } catch (error) {
      const raw = error instanceof Error ? error.message : "";
      setStatusMessage(getHumanErrorMessage(raw));
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <ModuloHero
        title="Panel Secretaria Academica"
        description="Vista global institucional para seguimiento, cierres y exportaciones."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
        <StatCard title="Campanas" value={dashboard?.campanias.length ?? 0} />
        <StatCard title="Asignaciones" value={dashboard?.totalAsignaciones ?? 0} />
        <StatCard title="Pendientes" value={dashboard?.pendientes ?? 0} tone="warning" />
        <StatCard title="Completadas" value={dashboard?.completadas ?? 0} tone="success" />
        <StatCard title="Advertencias" value={dashboard?.advertencias ?? 0} />
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle>Campanas institucionales</CardTitle>
          <CardDescription>Seleccione, cierre y exporte campanas.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <select
              value={selectedCampaniaId}
              onChange={(event) => setSelectedCampaniaId(event.target.value)}
              className="h-10 rounded-md border border-slate-200 px-3 text-sm bg-white"
            >
              {(dashboard?.campanias ?? []).map((item) => (
                <option key={item.idCampania} value={item.idCampania}>
                  {item.nombre}
                </option>
              ))}
            </select>

            <Button
              type="button"
              variant="outline"
              onClick={() => {
                if (!selectedCampaniaId) return;
                void exportarCampaniaExcel(selectedCampaniaId);
              }}
            >
              <Download className="w-4 h-4" /> Exportar campana
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {(dashboard?.campanias ?? []).map((item) => (
              <article key={item.idCampania} className="rounded-2xl border border-slate-200 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-slate-900">{item.nombre}</p>
                    <p className="text-xs text-slate-500 mt-1">Tipo: {parseTipoFromDescripcion(item.descripcion)}</p>
                    <p className="text-xs text-slate-500">Inicio: {formatDate(item.fechaInicio)} · Fin: {formatDate(item.fechaFin)}</p>
                  </div>
                  <EstadoBadge estado={item.estado} />
                </div>

                <div className="mt-3 flex gap-2">
                  {item.estado.toLowerCase() === "activa" && (
                    <Button type="button" variant="outline" onClick={() => void handleCloseCampania(item.idCampania)}>
                      Cerrar
                    </Button>
                  )}
                  <Button type="button" variant="outline" onClick={() => setSelectedCampaniaId(item.idCampania)}>
                    Seleccionar
                  </Button>
                </div>
              </article>
            ))}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3">
            <h4 className="font-semibold text-slate-900">Registrar advertencia</h4>
            <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-2">
              <Input
                value={advertencia}
                onChange={(event) => setAdvertencia(event.target.value)}
                placeholder="Detalle de advertencia institucional"
              />
              <Button type="button" onClick={() => void handleAdvertencia()}>
                <ShieldAlert className="w-4 h-4" /> Registrar
              </Button>
            </div>
            <p className="text-xs text-slate-500">Nota: si la tabla de observaciones no admite escritura desde el cliente, esta accion puede requerir backend con permisos ampliados.</p>
          </div>

          {statusMessage && (
            <p
              className={`text-sm rounded-lg px-3 py-2 border ${
                statusMessage.toLowerCase().includes("correctamente")
                  ? "text-emerald-700 border-emerald-200 bg-emerald-50"
                  : "text-rose-700 border-rose-200 bg-rose-50"
              }`}
            >
              {statusMessage}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export function AutoevaluacionForm() {
  const { user } = useUser();

  if (user.rol === "DOCENTE" || user.rol === "DOCENTE_RESPONSABLE") {
    return <DocenteAutoevaluacion />;
  }

  if (user.rol === "JEFE_CARRERA") {
    return <JefeAutoevaluacion />;
  }

  if (
    user.rol === "SECRETARIA"
    || user.rol === "SEC_TECNICA"
    || user.rol === "DECANO"
    || user.rol === "RESPONSABLE_EXTENSION"
    || user.rol === "RESPONSABLE_INVESTIGACION"
  ) {
    return <SecretariaAutoevaluacion />;
  }

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardContent className="py-10 text-center space-y-3">
        <ClipboardList className="w-10 h-10 text-slate-400 mx-auto" />
        <h2 className="text-xl font-semibold text-slate-800">Modulo de Autoevaluacion</h2>
        <p className="text-slate-500">Este rol no tiene permisos sobre el modulo.</p>
      </CardContent>
    </Card>
  );
}
