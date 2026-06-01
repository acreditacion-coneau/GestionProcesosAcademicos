import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Download,
  Eye,
  FileSpreadsheet,
  Loader2,
  Search,
  Send,
  ShieldAlert,
} from "lucide-react";
import { NavLink } from "react-router";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
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
  cerrarCampania,
  crearCampania,
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

const ESTADO_OPTIONS = ["todos", "pendiente", "completada", "vencida"] as const;
const CHART_COLORS = ["#10b981", "#f59e0b", "#ef4444"];

type DocenteFormValues = Record<string, string | boolean>;
type EstadoFiltro = typeof ESTADO_OPTIONS[number];
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

function getYear(value: string | null | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value.slice(0, 4) : String(date.getFullYear());
}

function resolveCampaign(campaigns: CampaniaEvaluacion[], idCampania: string): CampaniaEvaluacion | undefined {
  return campaigns.find((item) => item.idCampania === idCampania);
}

function resolveCampaignName(campaigns: CampaniaEvaluacion[], idCampania: string): string {
  return resolveCampaign(campaigns, idCampania)?.nombre ?? "Campana";
}

function parseTipoFromDescripcion(descripcion: string | null): string {
  const raw = (descripcion ?? "").toLowerCase();
  if (raw.includes("1er_semestre")) return "1er semestre";
  if (raw.includes("2do_semestre")) return "2do semestre";
  if (raw.includes("anual")) return "Anual";
  return "Sin tipo";
}

function isTextQuestion(question: PreguntaEvaluacion): boolean {
  const kind = question.tipoRespuesta.toLowerCase();
  return kind.includes("texto") || kind.includes("abierta");
}

function getHumanErrorMessage(raw: string): string {
  const normalized = raw.toLowerCase();
  if (normalized.includes("row-level security") || normalized.includes("policy") || normalized.includes("permission")) {
    return "No tiene permisos para esta accion en este momento. Contacte a Secretaria Academica.";
  }
  if (normalized.includes("network") || normalized.includes("fetch") || normalized.includes("abort")) {
    return "No pudimos conectarnos con Supabase. Verifique su conexion e intente nuevamente.";
  }
  if (normalized.includes("firma")) {
    return "La firma digital es obligatoria para completar la evaluacion.";
  }
  if (normalized.includes("completar_asignacion")) {
    return "No se pudo completar la evaluacion con la RPC institucional.";
  }
  return raw || "No pudimos completar la operacion. Intente nuevamente.";
}

function getEstadoEfectivo(asignacion: AsignacionEvaluacion, campanias: CampaniaEvaluacion[]): string {
  const estado = asignacion.estado.toLowerCase();
  if (estado === "vencida" || estado === "completada") return estado;
  const campania = resolveCampaign(campanias, asignacion.idCampania);
  if (!campania?.fechaFin || estado !== "pendiente") return estado;
  const fin = new Date(`${campania.fechaFin}T23:59:59`);
  return Number.isFinite(fin.getTime()) && fin.getTime() < Date.now() ? "vencida" : estado;
}

function dataUrlToBase64(dataUrl: string): string {
  return dataUrl.includes(",") ? dataUrl.split(",")[1] ?? "" : dataUrl;
}

async function sha256Hex(value: string): Promise<string> {
  if (!crypto?.subtle) {
    let hash = 0;
    for (let index = 0; index < value.length; index += 1) {
      hash = ((hash << 5) - hash + value.charCodeAt(index)) | 0;
    }
    return `fallback-${Math.abs(hash)}`;
  }

  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function StatusMessage({ message }: { message: string }) {
  if (!message) return null;
  const ok = message.toLowerCase().includes("correctamente");
  return (
    <p
      aria-live="polite"
      className={`text-sm rounded-lg px-3 py-2 border ${
        ok
          ? "text-emerald-700 border-emerald-200 bg-emerald-50"
          : "text-rose-700 border-rose-200 bg-rose-50"
      }`}
    >
      {message}
    </p>
  );
}

function LoadingBlock({ label = "Cargando informacion..." }: { label?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 text-slate-500 flex items-center gap-2">
      <Loader2 className="w-4 h-4 animate-spin" />
      <span className="text-sm">{label}</span>
    </div>
  );
}

function EmptyState({ children }: { children: string }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/70 text-center text-slate-500 py-10 px-4">
      {children}
    </div>
  );
}

function MetricChart({ data }: { data: Array<{ name: string; value: number }> }) {
  return (
    <div className="h-64 min-w-0">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" outerRadius={82} label>
            {data.map((_, index) => (
              <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
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
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <Card className="border-emerald-200 bg-emerald-50/50 shadow-sm">
        <CardContent className="pt-8 pb-8">
          <div className="max-w-2xl mx-auto text-center space-y-6">
            <div className="mx-auto w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-slate-900">Evaluacion completada</h3>
              <p className="text-slate-600 mt-2">
                La RPC institucional completo la asignacion y bloqueo la edicion.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
              <InfoMini label="Asignatura" value={confirmation.asignatura} />
              <InfoMini label="Campana" value={confirmation.campania} />
              <InfoMini label="Fecha respuesta" value={confirmation.fecha} />
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              <Button type="button" onClick={onDownload}>
                <Download className="w-4 h-4" /> Descargar Excel
              </Button>
              <Button type="button" variant="outline" onClick={onBack}>
                Volver al dashboard
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
    <div className="rounded-xl border border-emerald-200 bg-white px-3 py-2 min-w-0">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="text-sm font-semibold text-slate-900 mt-1 break-words">{value}</p>
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
  const [signatureHash, setSignatureHash] = useState<string>("");
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [search, setSearch] = useState("");
  const [filtroEstado, setFiltroEstado] = useState<EstadoFiltro>("todos");
  const [filtroAnio, setFiltroAnio] = useState("todos");
  const [filtroAsignatura, setFiltroAsignatura] = useState("todos");
  const [observacionOpen, setObservacionOpen] = useState<Record<string, boolean>>({});
  const [observaciones, setObservaciones] = useState<Record<string, string>>({});
  const [confirmation, setConfirmation] = useState<ConfirmationState | null>(null);
  const [currentFormIndex, setCurrentFormIndex] = useState(0);
  const [loadingList, setLoadingList] = useState(false);
  const [loadingDetalle, setLoadingDetalle] = useState(false);

  const questionRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const { register, handleSubmit, reset, formState, setValue, control } =
    useForm<DocenteFormValues>({ mode: "onChange" });
  const values = useWatch({ control }) ?? {};

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

  const loadData = useCallback(async () => {
    if (!docenteId) {
      setAsignaciones([]);
      setCampanias([]);
      return;
    }

    setLoadingList(true);
    try {
      const [nextAsignaciones, nextCampanias] = await Promise.all([
        getMisAsignaciones(docenteId),
        getCampanias(),
      ]);
      setAsignaciones(nextAsignaciones);
      setCampanias(nextCampanias);
    } catch (error) {
      setStatusMessage(getHumanErrorMessage(error instanceof Error ? error.message : ""));
    } finally {
      setLoadingList(false);
    }
  }, [docenteId]);

  useEffect(() => {
    let active = true;
    void loadData().finally(() => {
      if (!active) return;
    });
    return () => {
      active = false;
    };
  }, [loadData]);

  const openAsignacion = async (idAsignacion: string) => {
    setLoadingDetalle(true);
    setStatusMessage("");
    try {
      const nextDetalle = await getAutoevaluacionDetalle(idAsignacion);
      setDetalle(nextDetalle);
      setSignatureDataUrl(nextDetalle?.asignacion.firmaBase64 ? `data:image/png;base64,${nextDetalle.asignacion.firmaBase64}` : null);
      setSignatureHash(nextDetalle?.asignacion.firmaHash ?? "");
      setSubmitAttempted(false);
      setConfirmation(null);
      setObservacionOpen({});
      setObservaciones({});
      setCurrentFormIndex(0);

      if (!nextDetalle) {
        reset({});
        return;
      }

      const defaults: DocenteFormValues = { __declaracion: nextDetalle.bloqueada };
      for (const respuesta of nextDetalle.respuestas) {
        defaults[respuesta.idPregunta] = respuesta.respuesta.replace(/\nObs:\s*.*$/is, "");
      }
      reset(defaults);
    } catch (error) {
      setStatusMessage(getHumanErrorMessage(error instanceof Error ? error.message : ""));
    } finally {
      setLoadingDetalle(false);
    }
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
        questions: orderedQuestions.filter((question) => question.idFormulario === formulario.idFormulario),
      }))
      .filter((step) => step.questions.length > 0);

    const preguntasSinFormulario = orderedQuestions.filter((question) => !formularioIds.has(question.idFormulario));
    if (preguntasSinFormulario.length > 0) {
      steps.push({
        formulario: { idFormulario: 0, nombre: "Formulario complementario", descripcion: "", activo: true },
        questions: preguntasSinFormulario,
      });
    }

    return steps.length > 0
      ? steps
      : [{ formulario: { idFormulario: 0, nombre: "Formulario", descripcion: "", activo: true }, questions: orderedQuestions }];
  }, [detalle?.formularios, orderedQuestions]);

  const safeCurrentFormIndex = Math.min(currentFormIndex, Math.max(formSteps.length - 1, 0));
  const currentStep = formSteps[safeCurrentFormIndex];
  const currentQuestions = currentStep?.questions ?? [];
  const isLastFormStep = safeCurrentFormIndex >= formSteps.length - 1;

  const answeredCount = useMemo(() => {
    return orderedQuestions.filter((question) => String(values[question.idPregunta] ?? "").trim().length > 0).length;
  }, [orderedQuestions, values]);

  const progressPercentage = orderedQuestions.length === 0 ? 0 : (answeredCount / orderedQuestions.length) * 100;
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
  const firstMissingIndex = currentQuestions.findIndex((question) => question.obligatoria && !String(values[question.idPregunta] ?? "").trim());
  const currentQuestionNumber = currentQuestions.length === 0 ? 0 : firstMissingIndex >= 0 ? firstMissingIndex + 1 : currentQuestions.length;

  const anios = useMemo(() => {
    return Array.from(new Set(asignaciones.map((item) => getYear(resolveCampaign(campanias, item.idCampania)?.fechaInicio ?? item.createdAt)).filter(Boolean))).sort().reverse();
  }, [asignaciones, campanias]);
  const asignaturas = useMemo(() => {
    return Array.from(new Set(asignaciones.map((item) => item.asignatura))).sort((a, b) => a.localeCompare(b, "es"));
  }, [asignaciones]);
  const stats = useMemo(() => {
    const completadas = asignaciones.filter((item) => getEstadoEfectivo(item, campanias) === "completada").length;
    const vencidas = asignaciones.filter((item) => getEstadoEfectivo(item, campanias) === "vencida").length;
    const pendientes = asignaciones.filter((item) => getEstadoEfectivo(item, campanias) === "pendiente").length;
    return { pendientes, completadas, vencidas, total: asignaciones.length };
  }, [asignaciones, campanias]);

  const filteredAsignaciones = useMemo(() => {
    const query = search.trim().toLowerCase();
    return asignaciones
      .filter((item) => filtroEstado === "todos" || getEstadoEfectivo(item, campanias) === filtroEstado)
      .filter((item) => filtroAsignatura === "todos" || item.asignatura === filtroAsignatura)
      .filter((item) => {
        if (filtroAnio === "todos") return true;
        const campania = resolveCampaign(campanias, item.idCampania);
        return getYear(campania?.fechaInicio ?? item.createdAt) === filtroAnio;
      })
      .filter((item) => {
        if (!query) return true;
        return item.asignatura.toLowerCase().includes(query);
      });
  }, [asignaciones, campanias, filtroAnio, filtroAsignatura, filtroEstado, search]);

  const handleSignatureChange = async (dataUrl: string | null) => {
    setSignatureDataUrl(dataUrl);
    if (!dataUrl) {
      setSignatureHash("");
      return;
    }
    const base64 = dataUrlToBase64(dataUrl);
    setSignatureHash(await sha256Hex(base64));
  };

  const handleAutoSelect = (question: PreguntaEvaluacion, value: string) => {
    setValue(question.idPregunta, value, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
    if (submitAttempted) setSubmitAttempted(false);

    const currentIndex = currentQuestions.findIndex((item) => item.idPregunta === question.idPregunta);
    const next = currentQuestions[currentIndex + 1];
    if (next?.idPregunta) {
      questionRefs.current[next.idPregunta]?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  const handleNextForm = () => {
    setSubmitAttempted(true);
    if (currentMissingRequiredIds.length > 0) {
      setStatusMessage("Complete las preguntas obligatorias de este formulario para continuar.");
      questionRefs.current[currentMissingRequiredIds[0]]?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setStatusMessage("");
    setSubmitAttempted(false);
    setCurrentFormIndex((prev) => Math.min(prev + 1, formSteps.length - 1));
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

    const firmaBase64 = dataUrlToBase64(signatureDataUrl);
    const finalSignatureHash = signatureHash || await sha256Hex(firmaBase64);
    if (!signatureHash) setSignatureHash(finalSignatureHash);

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
      await enviarAutoevaluacion(detalle.asignacion.idAsignacion, {
        firmaHash: finalSignatureHash,
        firmaBase64,
      });

      const nextDetalle = await getAutoevaluacionDetalle(detalle.asignacion.idAsignacion);
      setDetalle(nextDetalle);
      await loadData();
      setConfirmation({
        idAsignacion: detalle.asignacion.idAsignacion,
        asignatura: detalle.asignacion.asignatura,
        campania: resolveCampaignName(campanias, detalle.asignacion.idCampania),
        fecha: new Date().toLocaleString("es-AR"),
      });
      setStatusMessage("Su evaluacion fue enviada correctamente.");
    } catch (error) {
      setStatusMessage(getHumanErrorMessage(error instanceof Error ? error.message : ""));
    } finally {
      setIsSubmitting(false);
    }
  });

  const canSubmit = Boolean(detalle && !detalle.bloqueada && !isSubmitting);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="space-y-4">
        <NavLink to="/" className="inline-flex items-center text-sm font-medium text-blue-700 hover:text-blue-900">
          <ArrowLeft className="w-4 h-4 mr-1" /> Volver al inicio
        </NavLink>
        <ModuloHero
          title="Autoevaluacion docente"
          description="Dashboard institucional para completar, consultar y exportar autoevaluaciones por asignatura."
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard title="Pendientes" value={stats.pendientes} tone="warning" />
        <StatCard title="Completadas" value={stats.completadas} tone="success" />
        <StatCard title="Vencidas" value={stats.vencidas} tone="danger" />
        <StatCard title="Total" value={stats.total} />
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="text-lg">Mis autoevaluaciones</CardTitle>
              <CardDescription>Filtre por año, estado, asignatura y busque por nombre de asignatura.</CardDescription>
            </div>
            {!docenteId && (
              <Badge className="bg-rose-50 text-rose-700 border-rose-200">
                No se pudo resolver id_docente para el DNI actual
              </Badge>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto_auto] gap-3">
            <label className="relative">
              <span className="sr-only">Buscar asignatura</span>
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar asignatura" className="pl-9" />
            </label>
            <label className="text-sm text-slate-600">
              <span className="sr-only">Filtrar por año</span>
              <select value={filtroAnio} onChange={(event) => setFiltroAnio(event.target.value)} className="h-10 w-full rounded-md border border-slate-200 px-3 bg-white">
                <option value="todos">Todos los años</option>
                {anios.map((anio) => <option key={anio} value={anio}>{anio}</option>)}
              </select>
            </label>
            <label className="text-sm text-slate-600">
              <span className="sr-only">Filtrar por estado</span>
              <select value={filtroEstado} onChange={(event) => setFiltroEstado(event.target.value as EstadoFiltro)} className="h-10 w-full rounded-md border border-slate-200 px-3 bg-white">
                {ESTADO_OPTIONS.map((estado) => <option key={estado} value={estado}>{estado === "todos" ? "Todos los estados" : estado}</option>)}
              </select>
            </label>
            <label className="text-sm text-slate-600">
              <span className="sr-only">Filtrar por asignatura</span>
              <select value={filtroAsignatura} onChange={(event) => setFiltroAsignatura(event.target.value)} className="h-10 w-full rounded-md border border-slate-200 px-3 bg-white">
                <option value="todos">Todas las asignaturas</option>
                {asignaturas.map((asignatura) => <option key={asignatura} value={asignatura}>{asignatura}</option>)}
              </select>
            </label>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {!detalle && <StatusMessage message={statusMessage} />}
          {loadingList ? <LoadingBlock /> : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filteredAsignaciones.map((item) => {
                const estado = getEstadoEfectivo(item, campanias);
                return (
                  <motion.article
                    key={item.idAsignacion}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className="rounded-2xl border border-slate-200 p-4 sm:p-5 bg-white shadow-sm hover:shadow-md transition-all duration-200 min-w-0"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h4 className="text-base font-semibold text-slate-900 break-words">{item.asignatura}</h4>
                        <p className="text-xs text-slate-500 mt-1">{resolveCampaignName(campanias, item.idCampania)}</p>
                        <p className="text-xs text-slate-500 mt-1">
                          Respuesta: {formatDate(item.fechaRespuesta ?? item.completedAt)}
                        </p>
                      </div>
                      <EstadoBadge estado={estado} />
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button type="button" onClick={() => void openAsignacion(item.idAsignacion)} className="rounded-xl">
                        {estado === "completada" ? <Eye className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        {estado === "completada" ? "Ver respuestas enviadas" : "Completar"}
                      </Button>
                      <Button type="button" variant="outline" onClick={() => void exportarAsignacionExcel(item.idAsignacion)} className="rounded-xl">
                        <Download className="w-4 h-4" /> Descargar
                      </Button>
                    </div>
                  </motion.article>
                );
              })}
            </div>
          )}
          {!loadingList && filteredAsignaciones.length === 0 && <EmptyState>No hay autoevaluaciones para los filtros seleccionados.</EmptyState>}
        </CardContent>
      </Card>

      {loadingDetalle && <LoadingBlock label="Cargando formulario..." />}

      {detalle && !confirmation && !loadingDetalle && (
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
                  <CardDescription>Campana: {resolveCampaignName(campanias, detalle.asignacion.idCampania)}</CardDescription>
                </div>
                <EstadoBadge estado={detalle.asignacion.estado} />
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              {submitAttempted && (isLastFormStep ? missingRequiredIds : currentMissingRequiredIds).length > 0 && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-800 text-sm" aria-live="polite">
                  Faltan {(isLastFormStep ? missingRequiredIds : currentMissingRequiredIds).length} preguntas obligatorias por completar.
                </div>
              )}

              <form onSubmit={onSubmit} className="space-y-8" noValidate>
                <section className="space-y-4">
                  <div className="rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3">
                    <p className="text-xs uppercase text-slate-500">Formulario {safeCurrentFormIndex + 1}</p>
                    <h4 className="text-sm sm:text-base font-semibold text-slate-900">{currentStep?.formulario.nombre ?? "Formulario"}</h4>
                    {currentStep?.formulario.descripcion && (
                      <p className="text-xs sm:text-sm text-slate-600 mt-1">{currentStep.formulario.descripcion}</p>
                    )}
                  </div>

                  <div className="space-y-3">
                    {currentQuestions.map((question, questionIndex) => {
                      const selected = String(values[question.idPregunta] ?? "");
                      const textQuestion = isTextQuestion(question);
                      const hasError = submitAttempted && question.obligatoria && !selected.trim();
                      const describedBy = hasError ? `${question.idPregunta}-error` : undefined;

                      return (
                        <motion.article
                          key={question.idPregunta}
                          ref={(node) => { questionRefs.current[question.idPregunta] = node; }}
                          initial={{ opacity: 0, y: 10 }}
                          whileInView={{ opacity: 1, y: 0 }}
                          viewport={{ once: true, margin: "-60px" }}
                          transition={{ duration: 0.18 }}
                          className={`rounded-2xl border p-4 sm:p-5 transition-all duration-200 ${
                            hasError ? "border-rose-300 bg-rose-50/40" : "border-slate-200 bg-white hover:shadow-sm"
                          }`}
                        >
                          {!textQuestion && <input type="hidden" {...register(question.idPregunta, { required: question.obligatoria })} />}
                          <div className="flex items-start justify-between gap-3 mb-4">
                            <label htmlFor={textQuestion ? question.idPregunta : undefined} className="text-sm sm:text-base font-medium text-slate-900 leading-relaxed">
                              {questionIndex + 1}. {question.pregunta}
                            </label>
                            {question.obligatoria && <Badge className="bg-slate-100 text-slate-700 border-slate-200">Obligatoria</Badge>}
                          </div>

                          {textQuestion ? (
                            <Textarea
                              id={question.idPregunta}
                              rows={4}
                              disabled={detalle.bloqueada}
                              aria-invalid={hasError}
                              aria-describedby={describedBy}
                              placeholder="Escriba su respuesta"
                              {...register(question.idPregunta, { required: question.obligatoria })}
                            />
                          ) : (
                            <div role="radiogroup" aria-label={`Opciones para pregunta ${questionIndex + 1}`} className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                              {ANSWER_OPTIONS.map((option) => (
                                <button
                                  key={`${question.idPregunta}-${option.value}`}
                                  type="button"
                                  role="radio"
                                  aria-checked={selected === option.value}
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
                              onClick={() => setObservacionOpen((prev) => ({ ...prev, [question.idPregunta]: !prev[question.idPregunta] }))}
                              className="text-xs font-medium text-blue-700 hover:text-blue-900"
                            >
                              {observacionOpen[question.idPregunta] ? "- Ocultar observacion" : "+ Agregar observacion"}
                            </button>
                            <AnimatePresence initial={false}>
                              {observacionOpen[question.idPregunta] && (
                                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }} className="mt-2">
                                  <Textarea
                                    value={observaciones[question.idPregunta] ?? ""}
                                    onChange={(event) => setObservaciones((prev) => ({ ...prev, [question.idPregunta]: event.target.value }))}
                                    placeholder="Observacion opcional"
                                    rows={2}
                                    disabled={detalle.bloqueada}
                                  />
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                          {hasError && <p id={describedBy} className="mt-2 text-xs text-rose-700">Complete esta pregunta para continuar.</p>}
                        </motion.article>
                      );
                    })}
                  </div>
                </section>

                {isLastFormStep && (
                  <section className="rounded-2xl border border-slate-200 bg-slate-50/50 p-5 space-y-4">
                    <div>
                      <h4 className="font-semibold text-slate-900">Firma digital institucional</h4>
                      <p className="text-sm text-slate-600 mt-1">Declaro que la informacion brindada es veridica.</p>
                    </div>
                    <SignaturePad disabled={detalle.bloqueada} signed={Boolean(signatureDataUrl)} onChange={(value) => void handleSignatureChange(value)} />
                    {signatureDataUrl && (
                      <div className="rounded-xl border border-emerald-200 bg-white p-3 space-y-2">
                        <p className="text-sm text-emerald-700 font-medium">✓ Documento firmado</p>
                        <img src={signatureDataUrl} alt="Vista previa de firma digital" className="h-28 max-w-full rounded-lg border border-slate-200 bg-white object-contain" />
                        <p className="text-xs text-slate-500 break-all">Hash: {signatureHash || "Generando..."}</p>
                      </div>
                    )}
                    <label className="flex items-start gap-2 text-sm text-slate-700">
                      <input type="checkbox" disabled={detalle.bloqueada} {...register("__declaracion", { required: true })} />
                      Declaro que la informacion registrada en esta autoevaluacion es veraz.
                    </label>
                  </section>
                )}

                <StatusMessage message={statusMessage} />

                <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={safeCurrentFormIndex === 0}
                    onClick={() => {
                      setStatusMessage("");
                      setSubmitAttempted(false);
                      setCurrentFormIndex((prev) => Math.max(prev - 1, 0));
                    }}
                    className="rounded-xl"
                  >
                    Volver al formulario anterior
                  </Button>

                  {isLastFormStep ? (
                    <Button type="submit" disabled={!canSubmit || formState.isSubmitting} className="rounded-xl">
                      {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      Enviar evaluacion
                    </Button>
                  ) : (
                    <Button type="button" disabled={detalle.bloqueada} onClick={handleNextForm} className="rounded-xl">
                      Siguiente formulario <ChevronRight className="w-4 h-4" />
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
  const [newCampaignType, setNewCampaignType] = useState<"1er_semestre" | "2do_semestre" | "anual">("1er_semestre");
  const [selectedCampaniaId, setSelectedCampaniaId] = useState<string>("");
  const [exportRowsCount, setExportRowsCount] = useState<number>(0);
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [filtroCarrera, setFiltroCarrera] = useState("todos");
  const [filtroEstado, setFiltroEstado] = useState<EstadoFiltro>("todos");
  const [filtroAsignatura, setFiltroAsignatura] = useState("todos");
  const [search, setSearch] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [nextCampanias, nextDashboard] = await Promise.all([getCampanias(), getDashboardJefeCarrera()]);
      setCampanias(nextCampanias);
      setDashboard(nextDashboard);
      setSelectedCampaniaId((prev) => prev || nextCampanias[0]?.idCampania || "");
    } catch (error) {
      setStatusMessage(getHumanErrorMessage(error instanceof Error ? error.message : ""));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    let active = true;
    if (!selectedCampaniaId) return undefined;
    void getCampaniaExportRows(selectedCampaniaId)
      .then((rows) => {
        if (active) setExportRowsCount(rows.length);
      })
      .catch((error) => {
        if (active) setStatusMessage(getHumanErrorMessage(error instanceof Error ? error.message : ""));
      });
    return () => {
      active = false;
    };
  }, [selectedCampaniaId]);

  const detalle = dashboard?.detalle ?? [];
  const carreras = useMemo(() => Array.from(new Set(detalle.map((item) => item.carrera))).sort(), [detalle]);
  const asignaturas = useMemo(() => Array.from(new Set(detalle.map((item) => item.asignatura))).sort(), [detalle]);
  const filteredDetalle = useMemo(() => {
    const query = search.trim().toLowerCase();
    return detalle
      .filter((item) => filtroCarrera === "todos" || item.carrera === filtroCarrera)
      .filter((item) => filtroEstado === "todos" || item.estado.toLowerCase() === filtroEstado)
      .filter((item) => filtroAsignatura === "todos" || item.asignatura === filtroAsignatura)
      .filter((item) => !query || item.docente.toLowerCase().includes(query) || item.asignatura.toLowerCase().includes(query));
  }, [detalle, filtroAsignatura, filtroCarrera, filtroEstado, search]);

  const chartData = [
    { name: "Completadas", value: dashboard?.completadas ?? 0 },
    { name: "Pendientes", value: dashboard?.pendientes ?? 0 },
    { name: "Vencidas", value: dashboard?.vencidas ?? 0 },
  ];

  const handleCreateCampania = async () => {
    if (!newCampaignName.trim()) return;
    const today = new Date();
    const start = today.toISOString().slice(0, 10);
    const endDate = new Date(today);
    endDate.setMonth(endDate.getMonth() + 4);

    try {
      await crearCampania({
        nombre: newCampaignName.trim(),
        fechaInicio: start,
        fechaFin: endDate.toISOString().slice(0, 10),
        descripcion: `tipo:${newCampaignType}`,
        idCarrera: null,
      });
      setStatusMessage("Campana creada correctamente.");
      setNewCampaignName("");
      await refresh();
    } catch (error) {
      setStatusMessage(getHumanErrorMessage(error instanceof Error ? error.message : ""));
    }
  };

  const handleLaunch = async (idCampania: string) => {
    try {
      await lanzarCampania(idCampania);
      setStatusMessage("Campana lanzada correctamente.");
      await refresh();
    } catch (error) {
      setStatusMessage(getHumanErrorMessage(error instanceof Error ? error.message : ""));
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <ModuloHero title="Panel Jefe de Carrera" description="Control de avance, filtros institucionales y exportacion de resultados." />
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        <StatCard title="Total asignaciones" value={dashboard?.totalAsignaciones ?? 0} />
        <StatCard title="Completadas" value={dashboard?.completadas ?? 0} tone="success" />
        <StatCard title="Pendientes" value={dashboard?.pendientes ?? 0} tone="warning" />
        <StatCard title="Vencidas" value={dashboard?.vencidas ?? 0} tone="danger" />
        <StatCard title="% completado" value={`${dashboard?.porcentajeCompletado ?? 0}%`} />
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle>Campanas de autoevaluacion</CardTitle>
          <CardDescription>Genere una campana y activela para iniciar asignaciones.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto] gap-3">
            <Input value={newCampaignName} onChange={(event) => setNewCampaignName(event.target.value)} placeholder="Nombre de campana" />
            <select value={newCampaignType} onChange={(event) => setNewCampaignType(event.target.value as "1er_semestre" | "2do_semestre" | "anual")} className="h-10 rounded-md border border-slate-200 px-3 text-sm bg-white">
              <option value="1er_semestre">1er semestre</option>
              <option value="2do_semestre">2do semestre</option>
              <option value="anual">Anual</option>
            </select>
            <Button type="button" onClick={() => void handleCreateCampania()}>Crear campana</Button>
          </div>
          <StatusMessage message={statusMessage} />
          {loading ? <LoadingBlock /> : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {campanias.map((item) => (
                <article key={item.idCampania} className="rounded-2xl border border-slate-200 p-4 bg-white min-w-0">
                  <div className="flex justify-between gap-2 items-start">
                    <div className="min-w-0">
                      <h4 className="font-semibold text-slate-900 break-words">{item.nombre}</h4>
                      <p className="text-xs text-slate-500 mt-1">Tipo: {parseTipoFromDescripcion(item.descripcion)}</p>
                      <p className="text-xs text-slate-500">Inicio: {formatDate(item.fechaInicio)} · Fin: {formatDate(item.fechaFin)}</p>
                    </div>
                    <EstadoBadge estado={item.estado} />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {item.estado.toLowerCase() === "borrador" && <Button type="button" variant="outline" onClick={() => void handleLaunch(item.idCampania)}>Lanzar</Button>}
                    <Button type="button" variant="outline" onClick={() => { setSelectedCampaniaId(item.idCampania); void exportarCampaniaExcel(item.idCampania); }}>
                      <Download className="w-4 h-4" /> Exportar
                    </Button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card className="border-slate-200 shadow-sm">
          <CardHeader><CardTitle>Completadas vs pendientes</CardTitle></CardHeader>
          <CardContent><MetricChart data={chartData} /></CardContent>
        </Card>
        <Card className="border-slate-200 shadow-sm">
          <CardHeader><CardTitle>Evolucion por asignatura</CardTitle></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dashboard?.porAsignatura ?? []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="asignatura" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Bar dataKey="completadas" fill="#10b981" />
                <Bar dataKey="pendientes" fill="#f59e0b" />
                <Bar dataKey="vencidas" fill="#ef4444" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle>Seguimiento de docentes</CardTitle>
              <CardDescription>Tabla institucional con filtros por carrera, estado y asignatura.</CardDescription>
            </div>
            <Button type="button" variant="outline" onClick={() => { if (selectedCampaniaId) void exportarCampaniaPorCarreraExcel(selectedCampaniaId, user.carrera); }}>
              <FileSpreadsheet className="w-4 h-4" /> Exportar Excel
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar docente o asignatura" />
            <select value={filtroCarrera} onChange={(event) => setFiltroCarrera(event.target.value)} className="h-10 rounded-md border border-slate-200 px-3 text-sm bg-white">
              <option value="todos">Todas las carreras</option>
              {carreras.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
            <select value={filtroEstado} onChange={(event) => setFiltroEstado(event.target.value as EstadoFiltro)} className="h-10 rounded-md border border-slate-200 px-3 text-sm bg-white">
              {ESTADO_OPTIONS.map((estado) => <option key={estado} value={estado}>{estado === "todos" ? "Todos los estados" : estado}</option>)}
            </select>
            <select value={filtroAsignatura} onChange={(event) => setFiltroAsignatura(event.target.value)} className="h-10 rounded-md border border-slate-200 px-3 text-sm bg-white">
              <option value="todos">Todas las asignaturas</option>
              {asignaturas.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </div>
          <p className="text-xs text-slate-500">Registros disponibles para exportar: {exportRowsCount}</p>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="text-left text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="py-2 pr-3">Docente</th>
                  <th className="py-2 pr-3">Asignatura</th>
                  <th className="py-2 pr-3">Carrera</th>
                  <th className="py-2 pr-3">Estado</th>
                  <th className="py-2 pr-3">Fecha respuesta</th>
                </tr>
              </thead>
              <tbody>
                {filteredDetalle.map((item) => (
                  <tr key={item.idAsignacion} className="border-b border-slate-100">
                    <td className="py-3 pr-3 font-medium text-slate-900">{item.docente}</td>
                    <td className="py-3 pr-3">{item.asignatura}</td>
                    <td className="py-3 pr-3">{item.carrera}</td>
                    <td className="py-3 pr-3"><EstadoBadge estado={item.estado} /></td>
                    <td className="py-3 pr-3">{formatDate(item.fechaRespuesta ?? item.fechaEnvio)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!loading && filteredDetalle.length === 0 && <EmptyState>No hay resultados para los filtros seleccionados.</EmptyState>}
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
  const [loading, setLoading] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState<EstadoFiltro>("todos");
  const [search, setSearch] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const next = await getDashboardSecretaria();
      setDashboard(next);
      setSelectedCampaniaId((prev) => prev || next.campanias[0]?.idCampania || "");
    } catch (error) {
      setStatusMessage(getHumanErrorMessage(error instanceof Error ? error.message : ""));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const campaniasFiltradas = useMemo(() => {
    const query = search.trim().toLowerCase();
    return (dashboard?.campanias ?? [])
      .filter((item) => filtroEstado === "todos" || item.estado.toLowerCase() === filtroEstado)
      .filter((item) => !query || item.nombre.toLowerCase().includes(query));
  }, [dashboard?.campanias, filtroEstado, search]);

  const handleCloseCampania = async (idCampania: string) => {
    try {
      await cerrarCampania(idCampania);
      setStatusMessage("Campana cerrada correctamente.");
      await refresh();
    } catch (error) {
      setStatusMessage(getHumanErrorMessage(error instanceof Error ? error.message : ""));
    }
  };

  const handleAdvertencia = async () => {
    if (!selectedCampaniaId || !advertencia.trim()) return;
    try {
      await registrarAdvertencia({ idCampania: selectedCampaniaId, detalle: advertencia.trim() }, `${user.nombre} ${user.apellido ?? ""}`.trim());
      setStatusMessage("Advertencia registrada correctamente.");
      setAdvertencia("");
      await refresh();
    } catch (error) {
      setStatusMessage(getHumanErrorMessage(error instanceof Error ? error.message : ""));
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <ModuloHero title="Panel Secretaria Academica" description="Vista global institucional para seguimiento, cierres y exportaciones." />
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        <StatCard title="Total campanas" value={dashboard?.campanias.length ?? 0} />
        <StatCard title="Total asignaciones" value={dashboard?.totalAsignaciones ?? 0} />
        <StatCard title="Completadas" value={dashboard?.completadas ?? 0} tone="success" />
        <StatCard title="Pendientes" value={dashboard?.pendientes ?? 0} tone="warning" />
        <StatCard title="Vencidas" value={dashboard?.vencidas ?? 0} tone="danger" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card className="border-slate-200 shadow-sm">
          <CardHeader><CardTitle>Indicadores globales</CardTitle><CardDescription>{dashboard?.porcentajeCompletado ?? 0}% completado institucional</CardDescription></CardHeader>
          <CardContent><MetricChart data={(dashboard?.porEstado ?? []).map((item) => ({ name: item.estado, value: item.cantidad }))} /></CardContent>
        </Card>
        <Card className="border-slate-200 shadow-sm">
          <CardHeader><CardTitle>Exportacion institucional</CardTitle><CardDescription>Descarga completa de campaña en formato .xlsx.</CardDescription></CardHeader>
          <CardContent className="space-y-3">
            <select value={selectedCampaniaId} onChange={(event) => setSelectedCampaniaId(event.target.value)} className="h-10 w-full rounded-md border border-slate-200 px-3 text-sm bg-white">
              {(dashboard?.campanias ?? []).map((item) => <option key={item.idCampania} value={item.idCampania}>{item.nombre}</option>)}
            </select>
            <Button type="button" variant="outline" onClick={() => { if (selectedCampaniaId) void exportarCampaniaExcel(selectedCampaniaId); }}>
              <Download className="w-4 h-4" /> Exportar campana
            </Button>
            <StatusMessage message={statusMessage} />
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="gap-3">
          <div>
            <CardTitle>Campanas institucionales</CardTitle>
            <CardDescription>Seleccione, cierre y monitoree campañas.</CardDescription>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-2">
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar campana" />
            <select value={filtroEstado} onChange={(event) => setFiltroEstado(event.target.value as EstadoFiltro)} className="h-10 rounded-md border border-slate-200 px-3 text-sm bg-white">
              {ESTADO_OPTIONS.map((estado) => <option key={estado} value={estado}>{estado === "todos" ? "Todos los estados" : estado}</option>)}
            </select>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? <LoadingBlock /> : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {campaniasFiltradas.map((item) => (
                <article key={item.idCampania} className="rounded-2xl border border-slate-200 p-4 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900 break-words">{item.nombre}</p>
                      <p className="text-xs text-slate-500 mt-1">Tipo: {parseTipoFromDescripcion(item.descripcion)}</p>
                      <p className="text-xs text-slate-500">Inicio: {formatDate(item.fechaInicio)} · Fin: {formatDate(item.fechaFin)}</p>
                    </div>
                    <EstadoBadge estado={item.estado} />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {item.estado.toLowerCase() === "activa" && <Button type="button" variant="outline" onClick={() => void handleCloseCampania(item.idCampania)}>Cerrar</Button>}
                    <Button type="button" variant="outline" onClick={() => setSelectedCampaniaId(item.idCampania)}>Seleccionar</Button>
                  </div>
                </article>
              ))}
            </div>
          )}
          {!loading && campaniasFiltradas.length === 0 && <EmptyState>No hay campanas para los filtros seleccionados.</EmptyState>}
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3">
            <h4 className="font-semibold text-slate-900">Registrar advertencia</h4>
            <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-2">
              <Input value={advertencia} onChange={(event) => setAdvertencia(event.target.value)} placeholder="Detalle de advertencia institucional" />
              <Button type="button" onClick={() => void handleAdvertencia()}>
                <ShieldAlert className="w-4 h-4" /> Registrar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function AutoevaluacionForm() {
  const { user } = useUser();

  if (user.rol === "DOCENTE" || user.rol === "DOCENTE_RESPONSABLE") return <DocenteAutoevaluacion />;
  if (user.rol === "JEFE_CARRERA") return <JefeAutoevaluacion />;
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
