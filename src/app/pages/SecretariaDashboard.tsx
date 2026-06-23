import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  Download,
  Eye,
  FileSpreadsheet,
  FileText,
  Filter,
  Loader2,
  RefreshCw,
  Search,
  UserCircle,
  XCircle,
} from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip as RechartsTooltip } from "recharts";
import {
  exportarAsignacionExcel,
  exportarCampaniaExcel,
  getAutoevaluacionDetalle,
  getSecretariaAutoevaluacionDashboard,
} from "../services/autoevaluacionService";
import type {
  AutoevaluacionDetalle,
  CampaniaEvaluacion,
  EstadoAsignacion,
  SecretariaAutoevaluacionDashboard,
  SecretariaAutoevaluacionRow,
} from "../types/autoevaluacion";
import { exportarEvaluacionesDocentesExcel, getResumenEvaluacionesPorCarrera, getDetalleEvaluacionesCarrera, getRespuestasEvaluacionDocente, type ResumenCarrera, type DetalleDocenteEvaluado, type RespuestaEvaluacionDetalle } from "../services/evaluacionService";

const STATUS_COLORS: Record<string, string> = {
  Completadas: "#10b981",
  Pendientes: "#f59e0b",
  Vencidas: "#e11d48",
};

function estadoNormalizado(estado: string): string {
  return estado.trim().toLowerCase();
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("es-AR");
}

function getCampaniaYear(campania: CampaniaEvaluacion): string {
  const base = campania.fechaInicio || campania.createdAt;
  const date = new Date(base);
  if (!Number.isNaN(date.getTime())) return String(date.getFullYear());
  const match = campania.nombre.match(/\b(20\d{2})\b/);
  return match?.[1] ?? "-";
}

function getEstadoBadgeClass(estado: EstadoAsignacion): string {
  const normalized = estadoNormalizado(estado);
  if (normalized === "completada") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (normalized === "vencida") return "bg-rose-50 text-rose-700 border-rose-200";
  return "bg-amber-50 text-amber-700 border-amber-200";
}

function getEstadoLabel(estado: EstadoAsignacion): string {
  const normalized = estadoNormalizado(estado);
  if (normalized === "completada") return "Completada";
  if (normalized === "vencida") return "Vencida";
  return "Pendiente";
}

function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-slate-100 ${className}`} />;
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-8 text-center">
      <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
        <FileText className="w-6 h-6" />
      </div>
      <h3 className="mt-4 text-base font-bold text-slate-800">{title}</h3>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-rose-100 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-rose-600 mt-0.5" />
        <div>
          <h3 className="font-bold text-slate-800">No se pudo cargar el Centro de Mando</h3>
          <p className="text-sm text-slate-500 mt-1">{message}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={onRetry}
        className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50"
      >
        <RefreshCw className="w-4 h-4" />
        Reintentar
      </button>
    </div>
  );
}

function KpiCard({
  label,
  value,
  tone = "blue",
}: {
  label: string;
  value: string | number;
  tone?: "blue" | "green" | "amber" | "rose";
}) {
  const toneClass = {
    blue: "text-[#1e3a8a]",
    green: "text-emerald-600",
    amber: "text-amber-500",
    rose: "text-rose-600",
  }[tone];

  return (
    <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 flex flex-col justify-between min-h-[132px]">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <div className="mt-2 flex items-baseline gap-2">
        <span className={`text-4xl font-black ${toneClass}`}>{value}</span>
      </div>
      <p className="text-xs text-slate-500 font-medium mt-3">Datos de la campaña seleccionada</p>
    </div>
  );
}

function DonutChart({ data, total }: { data: SecretariaAutoevaluacionDashboard["porEstado"]; total: number }) {
  return (
    <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 flex flex-col h-[320px]">
      <h3 className="text-sm font-bold text-slate-700 mb-2">Estado de Autoevaluaciones</h3>
      <div className="flex-1 relative">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={2}
              dataKey="cantidad"
              nameKey="estado"
              isAnimationActive={false}
            >
              {data.map((entry) => (
                <Cell key={`donut-cell-${entry.estado}`} fill={STATUS_COLORS[entry.estado]} />
              ))}
            </Pie>
            <RechartsTooltip contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }} />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-2">
          <span className="text-3xl font-black text-slate-800">{total}</span>
          <span className="text-xs text-slate-500 font-medium">Total</span>
        </div>
      </div>
      <div className="flex flex-wrap justify-center gap-4 mt-2">
        {data.map((item) => (
          <div key={`legend-${item.estado}`} className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: STATUS_COLORS[item.estado] }} />
            <span className="text-xs text-slate-600">{item.estado}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function GaugeChart({ porcentaje }: { porcentaje: number }) {
  const safeValue = Math.max(0, Math.min(100, Math.round(porcentaje)));
  const gaugeData = [
    { id: "completado", name: "Completado", value: safeValue, color: "#1e3a8a" },
    { id: "pendiente", name: "Pendiente", value: 100 - safeValue, color: "#e2e8f0" },
  ];

  return (
    <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 flex flex-col h-[320px]">
      <h3 className="text-sm font-bold text-slate-700 mb-2">Progreso de la Campaña</h3>
      <div className="flex-1 relative flex flex-col items-center justify-center">
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={gaugeData}
              cx="50%"
              cy="100%"
              startAngle={180}
              endAngle={0}
              innerRadius={80}
              outerRadius={110}
              dataKey="value"
              nameKey="name"
              stroke="none"
              isAnimationActive={false}
            >
              {gaugeData.map((entry) => (
                <Cell key={`gauge-cell-${entry.id}`} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute top-[60%] flex flex-col items-center">
          <span className="text-4xl font-black text-[#1e3a8a]">{safeValue}%</span>
          <span className="text-sm text-slate-500 font-medium">Completado</span>
        </div>
      </div>
    </div>
  );
}

function CarreraBarChart({ data }: { data: SecretariaAutoevaluacionDashboard["porCarrera"] }) {
  const chartData = data.slice(0, 8);

  return (
    <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 flex flex-col h-[320px]">
      <h3 className="text-sm font-bold text-slate-700 mb-4">Cumplimiento por Carrera</h3>
      {chartData.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-sm text-slate-500 text-center px-4">
          No hay carreras con asignaciones en esta campaña.
        </div>
      ) : (
        <div className="flex-1 flex flex-col justify-end gap-3 overflow-hidden">
          {chartData.map((entry) => (
            <div key={entry.carrera} className="flex items-center gap-3 min-w-0">
              <span className="text-xs text-slate-500 w-20 shrink-0 text-right truncate" title={entry.carrera}>
                {entry.carrera}
              </span>
              <div className="flex-1 bg-slate-100 rounded-full h-6 overflow-hidden">
                <div
                  className="h-full rounded-full bg-emerald-500 flex items-center justify-end pr-2 transition-all duration-500 min-w-[2px]"
                  style={{ width: `${Math.max(0, Math.min(100, entry.porcentajeCompletado))}%` }}
                >
                  {entry.porcentajeCompletado > 20 && (
                    <span className="text-xs font-bold text-white">{entry.porcentajeCompletado}%</span>
                  )}
                </div>
              </div>
              {entry.porcentajeCompletado <= 20 && (
                <span className="text-xs font-bold text-slate-600 w-9 shrink-0">{entry.porcentajeCompletado}%</span>
              )}
            </div>
          ))}
        </div>
      )}
      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
        <span className="text-xs text-slate-400">0%</span>
        <span className="text-xs text-slate-400">Porcentaje completado</span>
        <span className="text-xs text-slate-400">100%</span>
      </div>
    </div>
  );
}

function RespuestasModal({ detalle, onClose }: { detalle: AutoevaluacionDetalle; onClose: () => void }) {
  const respuestasByPregunta = new Map(detalle.respuestas.map((respuesta) => [respuesta.idPregunta, respuesta.respuesta]));

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 p-4 flex items-center justify-center">
      <div className="bg-white rounded-xl shadow-xl border border-slate-100 w-full max-w-4xl max-h-[88vh] overflow-hidden flex flex-col">
        <div className="p-5 border-b border-slate-100 flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-slate-800">Respuestas enviadas</h3>
            <p className="text-sm text-slate-500 mt-1">
              {detalle.asignacion.asignatura} - {detalle.asignacion.carrera}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
            aria-label="Cerrar respuestas"
          >
            <XCircle className="w-5 h-5" />
          </button>
        </div>
        <div className="overflow-y-auto p-5 divide-y divide-slate-100">
          {detalle.preguntas.map((pregunta) => (
            <div key={pregunta.idPregunta} className="py-4 first:pt-0">
              <p className="text-sm font-semibold text-slate-800">{pregunta.pregunta}</p>
              <p className="text-sm text-slate-600 mt-2 whitespace-pre-wrap">
                {respuestasByPregunta.get(pregunta.idPregunta) || "Sin respuesta registrada."}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function SecretariaDashboard() {
  const [activeTab, setActiveTab] = useState<"tramites" | "archivo" | "evaluacion_docente">("evaluacion_docente");
  const [searchTermArchivo, setSearchTermArchivo] = useState("");
  const [searchTermSemaforo, setSearchTermSemaforo] = useState("");
  const [filterEstado, setFilterEstado] = useState("Todos");
  const [selectedCampaniaId, setSelectedCampaniaId] = useState("");
  const [dashboard, setDashboard] = useState<SecretariaAutoevaluacionDashboard | null>(null);
  const [isLoadingDashboard, setIsLoadingDashboard] = useState(false);
  const [dashboardError, setDashboardError] = useState("");
  const [selectedDetalle, setSelectedDetalle] = useState<AutoevaluacionDetalle | null>(null);
  const [isLoadingDetalle, setIsLoadingDetalle] = useState(false);
  const [resumenCarreras, setResumenCarreras] = useState<ResumenCarrera[]>([]);
  const [isLoadingEvalDoc, setIsLoadingEvalDoc] = useState(false);
  const [selectedCarrera, setSelectedCarrera] = useState<ResumenCarrera | null>(null);
  const [detalleDocentes, setDetalleDocentes] = useState<DetalleDocenteEvaluado[]>([]);
  const [isLoadingDetalleEval, setIsLoadingDetalleEval] = useState(false);
  const [filtroEstadoEval, setFiltroEstadoEval] = useState("todos");
  const [searchEval, setSearchEval] = useState("");
  const [recordatoriosEnviados, setRecordatoriosEnviados] = useState<Set<number>>(new Set());
  const [modalDocente, setModalDocente] = useState<DetalleDocenteEvaluado | null>(null);
  const [respuestasModal, setRespuestasModal] = useState<RespuestaEvaluacionDetalle[]>([]);
  const [isLoadingModal, setIsLoadingModal] = useState(false);
  const [formularioSeleccionado, setFormularioSeleccionado] = useState<number | null>(null);

  const loadDashboard = useCallback(async (idCampania?: string) => {
    setIsLoadingDashboard(true);
    setDashboardError("");
    try {
      const data = await getSecretariaAutoevaluacionDashboard(idCampania);
      setDashboard(data);
      if (!idCampania && data.campaniaActiva?.idCampania) {
        setSelectedCampaniaId(data.campaniaActiva.idCampania);
      }
    } catch (error) {
      setDashboardError(error instanceof Error ? error.message : "Error desconocido al consultar Supabase.");
    } finally {
      setIsLoadingDashboard(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard(selectedCampaniaId || undefined);
  }, [loadDashboard, selectedCampaniaId]);

  useEffect(() => {
    if (activeTab !== "evaluacion_docente") return;
    setIsLoadingEvalDoc(true);
    getResumenEvaluacionesPorCarrera()
      .then(setResumenCarreras)
      .finally(() => setIsLoadingEvalDoc(false));
  }, [activeTab]);

  const filteredDocentes = useMemo(() => {
    const rows = dashboard?.docentes ?? [];
    const search = searchTermSemaforo.trim().toLowerCase();
    const estado = filterEstado.toLowerCase();

    return rows.filter((row) => {
      const matchesSearch = !search
        || row.docente.toLowerCase().includes(search)
        || row.asignatura.toLowerCase().includes(search);
      const matchesEstado = filterEstado === "Todos" || estadoNormalizado(row.estado) === estado;
      return matchesSearch && matchesEstado;
    });
  }, [dashboard?.docentes, filterEstado, searchTermSemaforo]);

  const handleChangeCampania = (idCampania: string) => {
    setSelectedCampaniaId(idCampania);
    setSearchTermSemaforo("");
    setFilterEstado("Todos");
  };

  const handleVerRespuestas = async (row: SecretariaAutoevaluacionRow) => {
    setIsLoadingDetalle(true);
    setDashboardError("");
    try {
      const detalle = await getAutoevaluacionDetalle(row.idAsignacion);
      if (!detalle) throw new Error("No se encontraron respuestas para la asignación seleccionada.");
      setSelectedDetalle(detalle);
    } catch (error) {
      setDashboardError(error instanceof Error ? error.message : "No se pudieron cargar las respuestas.");
    } finally {
      setIsLoadingDetalle(false);
    }
  };

  const handleExportarAsignacion = async (row: SecretariaAutoevaluacionRow) => {
    try {
      await exportarAsignacionExcel(row.idAsignacion);
    } catch (error) {
      setDashboardError(error instanceof Error ? error.message : "No se pudo exportar la autoevaluación.");
    }
  };

  const handleSeleccionarCarrera = async (r: ResumenCarrera) => {
    setSelectedCarrera(r);
    setDetalleDocentes([]);
    setFiltroEstadoEval("todos");
    setSearchEval("");
    setIsLoadingDetalleEval(true);
    try {
      const data = await getDetalleEvaluacionesCarrera(r.idCarrera);
      setDetalleDocentes(data);
    } finally {
      setIsLoadingDetalleEval(false);
    }
  };

  const handleVerEvaluacion = async (docente: DetalleDocenteEvaluado) => {
    setModalDocente(docente);
    setFormularioSeleccionado(null);
    setRespuestasModal([]);
    setIsLoadingModal(true);
    try {
      const data = await getRespuestasEvaluacionDocente(docente.idDocente);
      setRespuestasModal(data);
      const formularios = [...new Set(data.map((r) => r.idFormulario))].sort();
      if (formularios.length === 1) setFormularioSeleccionado(formularios[0]);
    } finally {
      setIsLoadingModal(false);
    }
  };

  const handleRecordatorio = (idDocente: number) => {
    setRecordatoriosEnviados((prev) => new Set([...prev, idDocente]));
  };

  const handleExportarEvaluaciones = async (docentes: DetalleDocenteEvaluado[]) => {
    if (!selectedCarrera || docentes.length === 0) return;
    try {
      await exportarEvaluacionesDocentesExcel(docentes, selectedCarrera.carrera);
    } catch (error) {
      setDashboardError(error instanceof Error ? error.message : "No se pudo exportar la evaluacion docente.");
    }
  };

  const filteredEvaluacionDocentes = useMemo(() => {
    return detalleDocentes
      .filter((docente) => {
        if (filtroEstadoEval === "pendiente") return docente.evaluacionesPendientes > 0;
        if (filtroEstadoEval === "completada") {
          return docente.evaluacionesPendientes === 0 && docente.evaluacionesCompletadas > 0;
        }
        if (filtroEstadoEval === "alerta") return docente.tieneAlerta;
        return true;
      })
      .filter((docente) => {
        const query = searchEval.trim().toLowerCase();
        if (!query) return true;
        return (
          docente.apellido.toLowerCase().includes(query) ||
          docente.nombre.toLowerCase().includes(query)
        );
      });
  }, [detalleDocentes, filtroEstadoEval, searchEval]);

  const handleExportarCampania = async () => {
    const idCampania = dashboard?.campaniaActiva?.idCampania;
    if (!idCampania) return;
    try {
      await exportarCampaniaExcel(idCampania);
    } catch (error) {
      setDashboardError(error instanceof Error ? error.message : "No se pudo exportar la campaña.");
    }
  };

  return (
    <div className="space-y-6 bg-slate-50 min-h-screen p-4 md:p-8 animate-in fade-in duration-500 font-sans">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-2">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight">
            Secretaría Académica
          </h2>
          <p className="text-slate-500 mt-2 text-sm font-medium">
            Verificación de datos, resoluciones y control de gestión.
          </p>
        </div>

        <div className="flex bg-white p-1 rounded-xl shadow-sm border border-slate-200 w-fit max-w-full overflow-x-auto">
          <button onClick={() => setActiveTab("tramites")} className={`px-5 py-2 font-medium text-sm rounded-lg transition-colors whitespace-nowrap ${activeTab === "tramites" ? "bg-slate-100 text-slate-900" : "text-slate-500 hover:text-slate-800"}`}>
            Trámites Pendientes
          </button>
          <button onClick={() => setActiveTab("archivo")} className={`px-5 py-2 font-medium text-sm rounded-lg transition-colors whitespace-nowrap ${activeTab === "archivo" ? "bg-slate-100 text-slate-900" : "text-slate-500 hover:text-slate-800"}`}>
            Archivo de RFs
          </button>
<button onClick={() => setActiveTab("evaluacion_docente")} className={`px-5 py-2 font-medium text-sm rounded-lg transition-colors whitespace-nowrap ${activeTab === "evaluacion_docente" ? "bg-slate-100 text-slate-900" : "text-slate-500 hover:text-slate-800"}`}>
            Evaluaciones Docentes
          </button>
        </div>
      </div>

      {activeTab === "tramites" && (
        <div className="bg-white p-6 md:p-8 rounded-xl shadow-sm border border-slate-100 flex flex-col gap-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-blue-50 text-blue-900 p-3 rounded-lg">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-800">Panel de Procesos (Ayudantes y Adscriptos)</h3>
              <p className="text-sm text-slate-500">Gestione y evalúe las designaciones en curso y pendientes de resolución.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center text-center gap-4 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center">
                <UserCircle className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-slate-800 text-lg">Módulo Ayudantes Alumnos</h4>
                <p className="text-slate-500 text-sm mt-1">Gestione el circuito de 8 fases para estudiantes.</p>
              </div>
              <Link to="/ayudantes" className="mt-2 w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors">
                Ingresar al Módulo
              </Link>
            </div>

            <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center text-center gap-4 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-purple-100 text-purple-700 rounded-full flex items-center justify-center">
                <BookOpen className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-slate-800 text-lg">Módulo Adscriptos Profesionales</h4>
                <p className="text-slate-500 text-sm mt-1">Gestione el circuito de 9 fases de control estricto.</p>
              </div>
              <Link to="/adscriptos" className="mt-2 w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors">
                Ingresar al Módulo
              </Link>
            </div>
          </div>

          <EmptyState title="Sin datos de procesos en este panel" description="El Centro de Mando de Autoevaluaciones usa datos reales de campañas y asignaciones." />
        </div>
      )}

      {activeTab === "archivo" && (
        <div className="bg-white p-6 md:p-8 rounded-xl shadow-sm border border-slate-100 flex flex-col">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="bg-blue-50 text-blue-900 p-3 rounded-lg">
                <BookOpen className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-800">Archivo de Resoluciones (RFs)</h3>
                <p className="text-sm text-slate-500">Consulte el historial y feedback de designaciones Vigentes o Superadas.</p>
              </div>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar RF..."
                value={searchTermArchivo}
                onChange={(event) => setSearchTermArchivo(event.target.value)}
                className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm w-full md:w-64 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              />
            </div>
          </div>

          <EmptyState title="Sin resoluciones cargadas" description="No hay datos reales disponibles para esta sección en el contexto actual." />
        </div>
      )}


{activeTab === "evaluacion_docente" && (
        <div className="space-y-6">

          {/* Header */}
          <div className="bg-white px-6 py-4 rounded-xl shadow-sm border border-slate-100">
            <h2 className="text-2xl font-bold text-slate-800">Evaluaciones Docentes</h2>
            <p className="text-sm text-slate-500 mt-1">Seguimiento según Res. FAU 25/2026.</p>
          </div>


{/* Dos widgets: progreso por carrera + docentes con alerta */}
          {!isLoadingEvalDoc && resumenCarreras.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

              {/* Widget 1: Progreso por carrera */}
              <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100">
                <h3 className="text-sm font-bold text-slate-700 mb-4">Progreso por carrera</h3>
                <div className="space-y-4">
                  {resumenCarreras.map((r) => (
                    <div key={r.idCarrera}>
                      <div className="flex justify-between text-xs text-slate-600 mb-1">
                        <span className="font-medium truncate max-w-[70%]">{r.carrera}</span>
                        <span className="font-bold">{r.pctCompletado}%</span>
                      </div>
                      <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                          style={{ width: `${r.pctCompletado}%` }}
                        />
                      </div>
                      <div className="flex gap-3 mt-1 text-xs text-slate-400">
                        <span>{r.completadas} completadas</span>
                        <span>{r.pendientes} pendientes</span>
                        {r.vencidas > 0 && <span className="text-rose-500">{r.vencidas} vencidas</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Widget 2: Docentes con alerta */}
              <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100">
                <h3 className="text-sm font-bold text-slate-700 mb-4">Docentes con alerta</h3>
                {resumenCarreras.every((r) => r.conAlerta === 0) ? (
                  <div className="flex flex-col items-center justify-center h-32 text-slate-400 text-sm">
                    Sin alertas registradas
                  </div>
                ) : (
                  <div className="space-y-2">
                    {detalleDocentes
                      .filter((d) => d.tieneAlerta)
                      .slice(0, 8)
                      .map((d) => (
                        <div key={d.idDocente} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                          <div>
                            <p className="text-sm font-semibold text-slate-800">{d.apellido}, {d.nombre}</p>
                            <p className="text-xs text-slate-400">{d.totalNegativos} respuestas negativas</p>
                          </div>
                          <span className="text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">
                            Alerta
                          </span>
                        </div>
                      ))}
                    {detalleDocentes.filter((d) => d.tieneAlerta).length === 0 && selectedCarrera === null && (
                      <p className="text-xs text-slate-400 text-center py-4">Seleccioná una carrera para ver las alertas</p>
                    )}
                  </div>
                )}
              </div>

            </div>
          )}

          {/* Cards por carrera */}
          {isLoadingEvalDoc ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-36 bg-slate-100 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {resumenCarreras.map((r) => {
                const isSelected = selectedCarrera?.idCarrera === r.idCarrera;
                return (
                  <button
                    key={r.idCarrera}
                    type="button"
                    onClick={() => void handleSeleccionarCarrera(r)}
                    className={`text-left p-5 rounded-xl border shadow-sm transition-all ${
                      isSelected
                        ? "border-[#1e3a8a] bg-[#1e3a8a]/5 ring-2 ring-[#1e3a8a]/20"
                        : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-md"
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <p className="text-sm font-bold text-slate-800 leading-snug">{r.carrera}</p>
                      {r.conAlerta > 0 && (
                        <span className="text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded-full shrink-0 ml-2">
                          {r.conAlerta} alerta{r.conAlerta > 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                    <div className="flex justify-between text-xs text-slate-500 mb-2">
                      <span>{r.completadas} evaluados</span>
                      <span className="font-semibold text-slate-700">{r.pctCompletado}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                        style={{ width: `${r.pctCompletado}%` }}
                      />
                    </div>
                    <div className="mt-3 flex gap-3 text-xs">
                      <span className="text-amber-600 font-medium">{r.pendientes} pend.</span>
                      {r.vencidas > 0 && <span className="text-rose-600 font-medium">{r.vencidas} venc.</span>}
                      <span className="text-slate-400">{r.total} total</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Tabla detalle */}
          {selectedCarrera && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                <KpiCard label="Total docentes" value={selectedCarrera.total} tone="blue" />
                <KpiCard label="Evaluados" value={selectedCarrera.completadas} tone="green" />
                <KpiCard label="Pendientes" value={selectedCarrera.pendientes} tone="amber" />
                <KpiCard label="Con alerta" value={selectedCarrera.conAlerta} tone="rose" />
              </div>
              <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-800">{selectedCarrera.carrera}</h3>
                  <p className="text-sm text-slate-500 mt-1">Detalle de docentes evaluados</p>
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                  <div className="relative w-full sm:w-56">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Buscar docente..."
                      value={searchEval}
                      onChange={(e) => setSearchEval(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-[#1e3a8a]"
                    />
                  </div>
                  <select
                    value={filtroEstadoEval}
                    onChange={(e) => setFiltroEstadoEval(e.target.value)}
                    className="w-full sm:w-40 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-[#1e3a8a]"
                  >
                    <option value="todos">Todos</option>
                    <option value="pendiente">Con pendientes</option>
                    <option value="completada">Completados</option>
                    <option value="alerta">Con alerta</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => void handleExportarEvaluaciones(filteredEvaluacionDocentes)}
                    disabled={filteredEvaluacionDocentes.length === 0}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Download className="w-4 h-4" />
                    Exportar
                  </button>
                </div>
              </div>

              {isLoadingDetalleEval ? (
                <div className="p-8 flex items-center justify-center gap-2 text-slate-500 text-sm">
                  <Loader2 className="w-4 h-4 animate-spin" /> Cargando...
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-slate-600">
                    <thead className="bg-slate-50/50 text-xs uppercase text-slate-500 font-semibold border-b border-slate-100">
                      <tr>
                        <th className="px-6 py-4">Docente</th>
                        <th className="px-6 py-4">Email</th>
                        <th className="px-6 py-4">Estado</th>
                        <th className="px-6 py-4">Negativos</th>
                        <th className="px-6 py-4">Alerta</th>
                        <th className="px-6 py-4 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredEvaluacionDocentes.map((d) => (
                          <tr key={d.idDocente} className={`transition-colors hover:bg-slate-50/50 ${d.tieneAlerta ? "bg-rose-50/20" : ""}`}>
                            <td className="px-6 py-4">
                              <p className="font-bold text-slate-800">{d.apellido}, {d.nombre}</p>
                            </td>
                            <td className="px-6 py-4 text-slate-500 text-xs">{d.email ?? <span className="text-slate-300 italic">sin email</span>}</td>
                            <td className="px-6 py-4">
                              <div className="text-xs space-y-0.5">
                                {d.evaluacionesCompletadas > 0 && (
                                  <span className="inline-block bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full font-bold mr-1">
                                    {d.evaluacionesCompletadas} completada{d.evaluacionesCompletadas > 1 ? "s" : ""}
                                  </span>
                                )}
                                {d.evaluacionesPendientes > 0 && (
                                  <span className="inline-block bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full font-bold mr-1">
                                    {d.evaluacionesPendientes} pendiente{d.evaluacionesPendientes > 1 ? "s" : ""}
                                  </span>
                                )}
                                {d.evaluacionesVencidas > 0 && (
                                  <span className="inline-block bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded-full font-bold">
                                    {d.evaluacionesVencidas} vencida{d.evaluacionesVencidas > 1 ? "s" : ""}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              {d.totalNegativos > 0 ? (
                                <span className="font-bold text-rose-600">{d.totalNegativos}</span>
                              ) : (
                                <span className="text-slate-300">—</span>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              {d.tieneAlerta ? (
                                <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">
                                  ⚠ Alerta
                                </span>
                              ) : (
                                <span className="text-slate-300">—</span>
                              )}
                            </td>
                            <td className="px-6 py-4 text-right">
                              {d.evaluacionesCompletadas > 0 && (
                                <button
                                  type="button"
                                  onClick={() => void handleVerEvaluacion(d)}
                                  title="Ver evaluaciones"
                                  className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors border-slate-200 text-slate-600 hover:bg-slate-50 mr-2"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  Ver
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => handleRecordatorio(d.idDocente)}
                                disabled={!d.email || recordatoriosEnviados.has(d.idDocente)}
                                title={!d.email ? "Sin email registrado" : recordatoriosEnviados.has(d.idDocente) ? "Recordatorio enviado" : "Enviar recordatorio"}
                                className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors disabled:opacity-40 disabled:cursor-not-allowed border-slate-200 text-slate-600 hover:bg-slate-50"
                              >
                                {recordatoriosEnviados.has(d.idDocente) ? "✓ Enviado" : "Recordatorio"}
                              </button>
                              <button
                                type="button"
                                onClick={() => void handleExportarEvaluaciones([d])}
                                title="Exportar evaluacion"
                                className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors border-slate-200 text-slate-600 hover:bg-slate-50 ml-2"
                              >
                                <FileSpreadsheet className="w-3.5 h-3.5" />
                                Excel
                              </button>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

        </div>
      )}

      {isLoadingDetalle && (
        <div className="fixed inset-0 z-50 bg-slate-900/20 p-4 flex items-center justify-center">
          <div className="bg-white rounded-xl shadow-xl border border-slate-100 px-5 py-4 flex items-center gap-3 text-slate-600">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm font-medium">Cargando respuestas...</span>
          </div>
        </div>
      )}
      {selectedDetalle && <RespuestasModal detalle={selectedDetalle} onClose={() => setSelectedDetalle(null)} />}

      {modalDocente && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 p-4 flex items-center justify-center">
          <div className="bg-white rounded-xl shadow-xl border border-slate-100 w-full max-w-3xl max-h-[88vh] overflow-hidden flex flex-col">
            <div className="p-5 border-b border-slate-100 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-slate-800">
                  {modalDocente.apellido}, {modalDocente.nombre}
                </h3>
                <p className="text-sm text-slate-500 mt-1">Evaluaciones completadas</p>
              </div>
              <button
                type="button"
                onClick={() => { setModalDocente(null); setFormularioSeleccionado(null); setRespuestasModal([]); }}
                className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <div className="overflow-y-auto p-5 flex flex-col gap-4">
              {isLoadingModal ? (
                <div className="flex items-center justify-center gap-2 py-8 text-slate-500 text-sm">
                  <Loader2 className="w-4 h-4 animate-spin" /> Cargando respuestas...
                </div>
              ) : respuestasModal.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-8">No hay respuestas registradas.</p>
              ) : (
                <>
                  <div className="flex flex-wrap gap-2">
                    {[...new Set(respuestasModal.map((r) => r.idFormulario))].sort().map((idForm) => {
                      const nombre = respuestasModal.find((r) => r.idFormulario === idForm)?.nombreFormulario ?? `F${idForm}`;
                      return (
                        <button
                          key={idForm}
                          type="button"
                          onClick={() => setFormularioSeleccionado(idForm)}
                          className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                            formularioSeleccionado === idForm
                              ? "bg-[#1e3a8a] text-white border-[#1e3a8a]"
                              : "bg-white text-slate-700 border-slate-200 hover:border-slate-300"
                          }`}
                        >
                          F{idForm} — {nombre}
                        </button>
                      );
                    })}
                  </div>
                  {formularioSeleccionado !== null && (
                    <div className="divide-y divide-slate-100">
                      {respuestasModal
                        .filter((r) => r.idFormulario === formularioSeleccionado)
                        .map((r) => {
                          const esNegativo =
                            (r.polaridadPositiva && r.respuesta === "no") ||
                            (!r.polaridadPositiva && r.respuesta === "si");
                          return (
                            <div key={r.idPregunta} className="py-4 first:pt-0 flex items-start justify-between gap-4">
                              <p className="text-sm text-slate-700 flex-1">{r.pregunta}</p>
                              <div className="flex flex-col items-end gap-1 shrink-0">
                                <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${
                                  esNegativo
                                    ? "bg-rose-50 text-rose-700 border-rose-200"
                                    : "bg-emerald-50 text-emerald-700 border-emerald-200"
                                }`}>
                                  {r.respuesta.toUpperCase()}
                                </span>
                                {r.observacion && (
                                  <p className="text-xs text-slate-400 text-right max-w-[200px]">{r.observacion}</p>
                                )}
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
