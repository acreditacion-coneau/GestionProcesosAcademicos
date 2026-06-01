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
  const [activeTab, setActiveTab] = useState<"tramites" | "archivo" | "semaforo">("semaforo");
  const [searchTermArchivo, setSearchTermArchivo] = useState("");
  const [searchTermSemaforo, setSearchTermSemaforo] = useState("");
  const [filterEstado, setFilterEstado] = useState("Todos");
  const [selectedCampaniaId, setSelectedCampaniaId] = useState("");
  const [dashboard, setDashboard] = useState<SecretariaAutoevaluacionDashboard | null>(null);
  const [isLoadingDashboard, setIsLoadingDashboard] = useState(false);
  const [dashboardError, setDashboardError] = useState("");
  const [selectedDetalle, setSelectedDetalle] = useState<AutoevaluacionDetalle | null>(null);
  const [isLoadingDetalle, setIsLoadingDetalle] = useState(false);

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
          <button onClick={() => setActiveTab("semaforo")} className={`px-5 py-2 font-medium text-sm rounded-lg transition-colors whitespace-nowrap ${activeTab === "semaforo" ? "bg-slate-100 text-slate-900" : "text-slate-500 hover:text-slate-800"}`}>
            Centro de Mando
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

      {activeTab === "semaforo" && (
        <div className="space-y-6">
          <div className="bg-white px-6 py-4 rounded-xl shadow-sm border border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Centro de Mando - Autoevaluaciones</h1>
              <p className="text-sm text-slate-500 mt-1">
                Campañas dinámicas y seguimiento institucional conectado a Supabase.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
              <select
                value={(selectedCampaniaId || dashboard?.campaniaActiva?.idCampania) ?? ""}
                onChange={(event) => handleChangeCampania(event.target.value)}
                className="w-full sm:w-80 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-[#1e3a8a]"
                aria-label="Seleccionar campaña de autoevaluación"
                disabled={isLoadingDashboard || (dashboard?.campanias.length ?? 0) === 0}
              >
                {(dashboard?.campanias ?? []).map((campania) => (
                  <option key={campania.idCampania} value={campania.idCampania}>
                    {campania.nombre} - {getCampaniaYear(campania)} - {campania.estado}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => void loadDashboard(selectedCampaniaId || dashboard?.campaniaActiva?.idCampania)}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 w-full sm:w-auto"
              >
                <RefreshCw className="w-4 h-4" />
                Actualizar
              </button>
            </div>
          </div>

          {dashboardError && <ErrorState message={dashboardError} onRetry={() => void loadDashboard(selectedCampaniaId || undefined)} />}

          {isLoadingDashboard && !dashboard ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                {Array.from({ length: 5 }).map((_, index) => (
                  <SkeletonBlock key={index} className="h-[132px]" />
                ))}
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {Array.from({ length: 3 }).map((_, index) => (
                  <SkeletonBlock key={index} className="h-[320px]" />
                ))}
              </div>
              <SkeletonBlock className="h-[360px]" />
            </div>
          ) : !dashboard?.campaniaActiva ? (
            <EmptyState title="Sin campañas de autoevaluación" description="Cree o active una campaña para visualizar métricas institucionales." />
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <KpiCard label="Docentes convocados" value={dashboard.totalAsignaciones} />
                <KpiCard label="Completadas" value={dashboard.completadas} tone="green" />
                <KpiCard label="Pendientes" value={dashboard.pendientes} tone="amber" />
                <KpiCard label="Vencidas" value={dashboard.vencidas} tone="rose" />
                <KpiCard label="Cumplimiento" value={`${dashboard.porcentajeCompletado}%`} />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <DonutChart data={dashboard.porEstado} total={dashboard.totalAsignaciones} />
                <GaugeChart porcentaje={dashboard.porcentajeCompletadoVista ?? dashboard.porcentajeCompletado} />
                <CarreraBarChart data={dashboard.porCarrera} />
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-bold text-slate-800">Tabla de docentes</h3>
                    <p className="text-sm text-slate-500 mt-1">
                      {dashboard.campaniaActiva.nombre} - {getCampaniaYear(dashboard.campaniaActiva)} - {dashboard.campaniaActiva.estado}
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                    <div className="relative w-full sm:w-64">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Buscar docente..."
                        value={searchTermSemaforo}
                        onChange={(event) => setSearchTermSemaforo(event.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-[#1e3a8a] transition-all"
                      />
                    </div>
                    <div className="relative w-full sm:w-48">
                      <Filter className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <select
                        value={filterEstado}
                        onChange={(event) => setFilterEstado(event.target.value)}
                        aria-label="Filtrar por estado"
                        className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-[#1e3a8a] appearance-none cursor-pointer"
                      >
                        <option value="Todos">Todos</option>
                        <option value="pendiente">Pendientes</option>
                        <option value="completada">Completadas</option>
                        <option value="vencida">Vencidas</option>
                      </select>
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleExportarCampania()}
                      disabled={!dashboard.campaniaActiva}
                      className="flex items-center gap-2 px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-sm font-medium transition-colors shrink-0 whitespace-nowrap disabled:opacity-50"
                    >
                      <Download className="w-4 h-4" />
                      Exportar Excel
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-slate-600">
                    <thead className="bg-slate-50/50 text-xs uppercase text-slate-500 font-semibold border-b border-slate-100">
                      <tr>
                        <th className="px-6 py-4">Docente</th>
                        <th className="px-6 py-4">Asignatura</th>
                        <th className="px-6 py-4">Estado</th>
                        <th className="px-6 py-4">Fecha respuesta</th>
                        <th className="px-6 py-4">Firma</th>
                        <th className="px-6 py-4 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredDocentes.map((row) => (
                        <tr key={row.idAsignacion} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4">
                            <p className="font-bold text-slate-800">{row.docente}</p>
                            <p className="text-xs text-slate-500 mt-1">{row.carrera}</p>
                          </td>
                          <td className="px-6 py-4 text-slate-600">{row.asignatura}</td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border ${getEstadoBadgeClass(row.estado)}`}>
                              {getEstadoLabel(row.estado)}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-slate-600">{formatDate(row.fechaRespuesta)}</td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${row.firma === "Firmada" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-50 text-slate-500 border-slate-200"}`}>
                              {row.firma === "Firmada" ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                              {row.firma}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-3">
                              <button
                                type="button"
                                onClick={() => void handleVerRespuestas(row)}
                                disabled={isLoadingDetalle}
                                className="text-slate-400 hover:text-[#1e3a8a] transition-colors p-1 disabled:opacity-50"
                                title="Ver respuestas"
                                aria-label={`Ver respuestas de ${row.docente}`}
                              >
                                <Eye className="w-5 h-5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => void handleExportarAsignacion(row)}
                                title="Exportar Excel"
                                aria-label={`Exportar Excel de ${row.docente}`}
                                className="text-slate-400 hover:text-emerald-600 transition-colors p-1"
                              >
                                <FileSpreadsheet className="w-5 h-5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {filteredDocentes.length === 0 && (
                        <tr>
                          <td colSpan={6} className="px-6 py-10 text-center text-slate-500">
                            No se encontraron docentes con los filtros aplicados.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
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
    </div>
  );
}
