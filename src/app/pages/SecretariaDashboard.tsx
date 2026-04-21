import { useState } from "react";
import { useUser } from "../context/UserContext";
import { Check, X, FileText, Activity, Search, Filter, BookOpen, UserCircle, Eye, Mail, ArrowUpRight, ArrowDownRight, FileSpreadsheet, Download } from "lucide-react";
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer } from "recharts";
import * as XLSX from "xlsx";

type Solicitud = {
  id: number;
  tipo: string;
  responsable: string;
  alumno: string;
  dni: string;
  nota: number;
  estado: "Pendiente V1" | "Pendiente V2" | "RF Generada" | "Rechazado";
};

type ResolucionPDF = {
  id: string;
  titulo: string;
  fecha: string;
  carrera: string;
  estado: "Vigente" | "Superadas";
  feedback: string | null;
};

type Evaluacion = {
  id: number;
  nombre: string;
  cargo: string;
  asignatura: string;
  alertas: number;
};

// --- Isolated chart sub-components to prevent cross-chart React key conflicts ---
const donutDataStatic = [
  { id: 'saludable', name: 'Saludable', value: 85, color: '#10b981' },
  { id: 'precaucion', name: 'Precaución', value: 20, color: '#f59e0b' },
  { id: 'critico', name: 'Crítico', value: 15, color: '#e11d48' },
];

const gaugeDataStatic = [
  { id: 'completado', name: 'Completado', value: 75, color: '#1e3a8a' },
  { id: 'pendiente', name: 'Pendiente', value: 25, color: '#e2e8f0' },
];

const barDataStatic = [
  { id: '1ro', year: '1ro', alertas: 12 },
  { id: '2do', year: '2do', alertas: 8 },
  { id: '3ro', year: '3ro', alertas: 18 },
  { id: 'talleres', year: 'Talleres', alertas: 5 },
];

function DonutChart() {
  return (
    <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 flex flex-col h-[320px]">
      <h3 className="text-sm font-bold text-slate-700 mb-2">Nivel de Riesgo (Docentes)</h3>
      <div className="flex-1 relative">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={donutDataStatic}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={2}
              dataKey="value"
              nameKey="name"
              isAnimationActive={false}
            >
              {donutDataStatic.map((entry) => (
                <Cell key={`donut-cell-${entry.id}`} fill={entry.color} />
              ))}
            </Pie>
            <RechartsTooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-2">
          <span className="text-3xl font-black text-slate-800">120</span>
          <span className="text-xs text-slate-500 font-medium">Total</span>
        </div>
      </div>
      <div className="flex justify-center gap-4 mt-2">
        {donutDataStatic.map((d) => (
          <div key={`legend-${d.id}`} className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }}></div>
            <span className="text-xs text-slate-600">{d.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function GaugeChart() {
  return (
    <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 flex flex-col h-[320px]">
      <h3 className="text-sm font-bold text-slate-700 mb-2">Progreso de la Campaña</h3>
      <div className="flex-1 relative flex flex-col items-center justify-center">
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={gaugeDataStatic}
              cx="50%"
              cy="100%"
              startAngle={180}
              endAngle={0}
              innerRadius={80}
              outerRadius={110}
              paddingAngle={0}
              dataKey="value"
              nameKey="name"
              stroke="none"
              isAnimationActive={false}
            >
              {gaugeDataStatic.map((entry) => (
                <Cell key={`gauge-cell-${entry.id}`} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute top-[60%] flex flex-col items-center">
          <span className="text-4xl font-black text-[#1e3a8a]">75%</span>
          <span className="text-sm text-slate-500 font-medium">Completado</span>
        </div>
      </div>
    </div>
  );
}

function AlertasBarChart() {
  const maxValue = Math.max(...barDataStatic.map(d => d.alertas));

  return (
    <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 flex flex-col h-[320px]">
      <h3 className="text-sm font-bold text-slate-700 mb-4">Alertas por Año Académico</h3>
      <div className="flex-1 flex flex-col justify-end gap-3">
        {barDataStatic.map((entry) => {
          const pct = maxValue > 0 ? (entry.alertas / maxValue) * 100 : 0;
          return (
            <div key={`bar-row-${entry.id}`} className="flex items-center gap-3">
              <span className="text-xs text-slate-500 w-12 shrink-0 text-right">{entry.year}</span>
              <div className="flex-1 bg-slate-100 rounded-full h-6 overflow-hidden">
                <div
                  className="h-full rounded-full bg-amber-400 flex items-center justify-end pr-2 transition-all duration-500"
                  style={{ width: `${pct}%` }}
                >
                  {pct > 20 && (
                    <span className="text-xs font-bold text-white">{entry.alertas}</span>
                  )}
                </div>
              </div>
              {pct <= 20 && (
                <span className="text-xs font-bold text-slate-600 w-5 shrink-0">{entry.alertas}</span>
              )}
            </div>
          );
        })}
      </div>
      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
        <span className="text-xs text-slate-400">0</span>
        <span className="text-xs text-slate-400">Alertas por año</span>
        <span className="text-xs text-slate-400">{maxValue}</span>
      </div>
    </div>
  );
}

// Mock autoevaluación data per teacher
type RespuestaAutoevaluacion = {
  dimension: string;
  indicador: string;
  planillaA: string;
  planillaB: string;
  puntaje: number;
  observaciones: string;
};

const mockAutoevaluaciones: Record<number, RespuestaAutoevaluacion[]> = {
  1: [
    { dimension: "Docencia", indicador: "Preparación de clases", planillaA: "Siempre", planillaB: "Casi siempre", puntaje: 4, observaciones: "Revisión de materiales semanalmente" },
    { dimension: "Docencia", indicador: "Uso de recursos didácticos", planillaA: "Casi siempre", planillaB: "A veces", puntaje: 3, observaciones: "Se incorporaron TICs en 2025" },
    { dimension: "Investigación", indicador: "Producción académica", planillaA: "A veces", planillaB: "Nunca", puntaje: 1, observaciones: "Sin publicaciones en el período" },
    { dimension: "Extensión", indicador: "Participación en proyectos", planillaA: "Siempre", planillaB: "Siempre", puntaje: 5, observaciones: "Coord. proyecto extensión FAUD" },
    { dimension: "Gestión", indicador: "Asistencia a reuniones", planillaA: "A veces", planillaB: "A veces", puntaje: 2, observaciones: "Conflicto de horarios reportado" },
  ],
  2: [
    { dimension: "Docencia", indicador: "Preparación de clases", planillaA: "Siempre", planillaB: "Siempre", puntaje: 5, observaciones: "Material actualizado cada cuatrimestre" },
    { dimension: "Docencia", indicador: "Uso de recursos didácticos", planillaA: "Siempre", planillaB: "Casi siempre", puntaje: 4, observaciones: "Laboratorios virtuales incorporados" },
    { dimension: "Investigación", indicador: "Producción académica", planillaA: "Casi siempre", planillaB: "Casi siempre", puntaje: 4, observaciones: "2 ponencias en congreso 2025" },
    { dimension: "Extensión", indicador: "Participación en proyectos", planillaA: "Siempre", planillaB: "Siempre", puntaje: 5, observaciones: "Voluntario activo" },
    { dimension: "Gestión", indicador: "Asistencia a reuniones", planillaA: "Siempre", planillaB: "Siempre", puntaje: 5, observaciones: "" },
  ],
  3: [
    { dimension: "Docencia", indicador: "Preparación de clases", planillaA: "Casi siempre", planillaB: "Siempre", puntaje: 4, observaciones: "" },
    { dimension: "Docencia", indicador: "Uso de recursos didácticos", planillaA: "A veces", planillaB: "Casi siempre", puntaje: 3, observaciones: "En proceso de capacitación TIC" },
    { dimension: "Investigación", indicador: "Producción académica", planillaA: "A veces", planillaB: "A veces", puntaje: 2, observaciones: "1 artículo en revisión" },
    { dimension: "Extensión", indicador: "Participación en proyectos", planillaA: "Casi siempre", planillaB: "A veces", puntaje: 3, observaciones: "" },
    { dimension: "Gestión", indicador: "Asistencia a reuniones", planillaA: "Casi siempre", planillaB: "Casi siempre", puntaje: 3, observaciones: "" },
  ],
  4: [
    { dimension: "Docencia", indicador: "Preparación de clases", planillaA: "A veces", planillaB: "Nunca", puntaje: 1, observaciones: "Situación en seguimiento" },
    { dimension: "Docencia", indicador: "Uso de recursos didácticos", planillaA: "Nunca", planillaB: "Nunca", puntaje: 0, observaciones: "Sin evidencias" },
    { dimension: "Investigación", indicador: "Producción académica", planillaA: "Nunca", planillaB: "Nunca", puntaje: 0, observaciones: "" },
    { dimension: "Extensión", indicador: "Participación en proyectos", planillaA: "A veces", planillaB: "Nunca", puntaje: 1, observaciones: "" },
    { dimension: "Gestión", indicador: "Asistencia a reuniones", planillaA: "Nunca", planillaB: "Nunca", puntaje: 0, observaciones: "Ausencias reiteradas" },
  ],
  5: [
    { dimension: "Docencia", indicador: "Preparación de clases", planillaA: "Siempre", planillaB: "Siempre", puntaje: 5, observaciones: "" },
    { dimension: "Docencia", indicador: "Uso de recursos didácticos", planillaA: "Siempre", planillaB: "Siempre", puntaje: 5, observaciones: "Modelo de innovación pedagógica" },
    { dimension: "Investigación", indicador: "Producción académica", planillaA: "Siempre", planillaB: "Siempre", puntaje: 5, observaciones: "3 publicaciones ISI 2025" },
    { dimension: "Extensión", indicador: "Participación en proyectos", planillaA: "Siempre", planillaB: "Siempre", puntaje: 5, observaciones: "Directora proyecto extensión" },
    { dimension: "Gestión", indicador: "Asistencia a reuniones", planillaA: "Siempre", planillaB: "Siempre", puntaje: 5, observaciones: "" },
  ],
  6: [
    { dimension: "Docencia", indicador: "Preparación de clases", planillaA: "Casi siempre", planillaB: "A veces", puntaje: 2, observaciones: "Demoras en entrega de materiales" },
    { dimension: "Docencia", indicador: "Uso de recursos didácticos", planillaA: "A veces", planillaB: "A veces", puntaje: 2, observaciones: "" },
    { dimension: "Investigación", indicador: "Producción académica", planillaA: "Casi siempre", planillaB: "Casi siempre", puntaje: 4, observaciones: "Tesis doctoral en curso" },
    { dimension: "Extensión", indicador: "Participación en proyectos", planillaA: "A veces", planillaB: "A veces", puntaje: 2, observaciones: "" },
    { dimension: "Gestión", indicador: "Asistencia a reuniones", planillaA: "Casi siempre", planillaB: "A veces", puntaje: 2, observaciones: "" },
  ],
};

export function SecretariaDashboard() {
  const { user } = useUser();
  const [activeTab, setActiveTab] = useState<"tramites" | "archivo" | "semaforo">("semaforo");

  // --- TAB 1: TRÁMITES ---
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([
    { id: 301, tipo: "Ayudante", responsable: "Arq. Mario B.", alumno: "Juan Pérez", dni: "44555666", nota: 8.5, estado: "Pendiente V1" },
    { id: 302, tipo: "Adscripto", responsable: "Lic. Clara M.", alumno: "Ana López", dni: "42111222", nota: 6.5, estado: "Pendiente V1" },
  ]);

  const procesarSolicitud = (id: number, currentEstado: string, nota: number) => {
    setSolicitudes(solicitudes.map(s => {
      if (s.id === id) {
        if (nota < 7) return { ...s, estado: "Rechazado" };
        if (currentEstado === "Pendiente V1") return { ...s, estado: "Pendiente V2" };
        if (currentEstado === "Pendiente V2") return { ...s, estado: "RF Generada" };
      }
      return s;
    }));
  };

  const rechazarSolicitud = (id: number) => {
    setSolicitudes(solicitudes.map(s => s.id === id ? { ...s, estado: "Rechazado" } : s));
  };

  // --- TAB 2: ARCHIVO ---
  const [searchTermArchivo, setSearchTermArchivo] = useState("");
  const [resoluciones] = useState<ResolucionPDF[]>([
    { id: "RF-2025-014", titulo: "Desig. Ayudante - Gómez", fecha: "2025-03-10", carrera: "Arquitectura", estado: "Superadas", feedback: "Excelente desempeño, se recomienda renovación." },
    { id: "RF-2026-042", titulo: "Desig. Adscripto - Ruiz", fecha: "2026-02-15", carrera: "Diseño Ind.", estado: "Vigente", feedback: null },
    { id: "RF-2025-089", titulo: "Desig. Ayudante - Díaz", fecha: "2025-07-20", carrera: "Lic. Interiores", estado: "Superadas", feedback: "Cumplió tareas parcialmente." },
  ]);

  const filteredResoluciones = resoluciones.filter(r => 
    r.titulo.toLowerCase().includes(searchTermArchivo.toLowerCase()) || 
    r.id.toLowerCase().includes(searchTermArchivo.toLowerCase())
  );

  // --- TAB 3: CENTRO DE MANDO (SEMÁFORO) ---
  const [searchTermSemaforo, setSearchTermSemaforo] = useState("");
  const [filterRiesgo, setFilterRiesgo] = useState("Todos");
  
  const [evaluaciones] = useState<Evaluacion[]>([
    { id: 1, nombre: "Laura Martínez", cargo: "Titular", asignatura: "Matemática", alertas: 3 },
    { id: 2, nombre: "Carlos Gómez", cargo: "Auxiliar", asignatura: "Física", alertas: 0 },
    { id: 3, nombre: "Ana Sánchez", cargo: "JTP", asignatura: "Química", alertas: 1 },
    { id: 4, nombre: "Pedro Ruiz", cargo: "Adscripto", asignatura: "Biología", alertas: 4 },
    { id: 5, nombre: "Julieta Paz", cargo: "Titular", asignatura: "Diseño II", alertas: 0 },
    { id: 6, nombre: "Martín Fierro", cargo: "Ayudante", asignatura: "Estructuras", alertas: 2 },
  ]);

  // Chart Data — kept for reference but now used in isolated sub-components above
  const donutData = donutDataStatic;
  const gaugeData = gaugeDataStatic;
  const barData = barDataStatic;

  // Helper functions for Semaforo UI
  const getPillStyle = (alertas: number) => {
    if (alertas >= 3) return "bg-rose-100 text-rose-800 border-rose-200";
    if (alertas >= 1) return "bg-amber-100 text-amber-800 border-amber-200";
    return "bg-emerald-100 text-emerald-800 border-emerald-200";
  };

  const getStatusText = (alertas: number) => {
    if (alertas >= 3) return "Crítico";
    if (alertas >= 1) return "Precaución";
    return "Saludable";
  };

  const filteredEvaluaciones = evaluaciones.filter(ev => {
    const matchesSearch = ev.nombre.toLowerCase().includes(searchTermSemaforo.toLowerCase());
    const status = getStatusText(ev.alertas);
    const matchesFilter = filterRiesgo === "Todos" || status === filterRiesgo;
    return matchesSearch && matchesFilter;
  });

  // --- EXCEL DOWNLOAD FUNCTIONS ---
  const buildWorkbook = (ev: Evaluacion) => {
    const wb = XLSX.utils.book_new();
    const respuestas = mockAutoevaluaciones[ev.id] ?? [];

    // Sheet 1: Datos del docente
    const infoData = [
      ["AUTOEVALUACIÓN DOCENTE 2026 – Portal Docente FAUD"],
      [],
      ["Nombre completo", ev.nombre],
      ["Cargo", ev.cargo],
      ["Asignatura", ev.asignatura],
      ["Estado de riesgo", getStatusText(ev.alertas)],
      ["N° de alertas", ev.alertas],
      ["Fecha de descarga", new Date().toLocaleDateString("es-AR")],
    ];
    const wsInfo = XLSX.utils.aoa_to_sheet(infoData);
    wsInfo["!cols"] = [{ wch: 28 }, { wch: 40 }];
    XLSX.utils.book_append_sheet(wb, wsInfo, "Datos Docente");

    // Sheet 2: Planilla A
    const planillaAHeader = [["Dimensión", "Indicador", "Respuesta (Planilla A)", "Puntaje", "Observaciones"]];
    const planillaARows = respuestas.map(r => [r.dimension, r.indicador, r.planillaA, r.puntaje, r.observaciones]);
    const wsA = XLSX.utils.aoa_to_sheet([...planillaAHeader, ...planillaARows]);
    wsA["!cols"] = [{ wch: 18 }, { wch: 35 }, { wch: 20 }, { wch: 10 }, { wch: 40 }];
    XLSX.utils.book_append_sheet(wb, wsA, "Planilla A");

    // Sheet 3: Planilla B
    const planillaBHeader = [["Dimensión", "Indicador", "Respuesta (Planilla B)", "Puntaje", "Observaciones"]];
    const planillaBRows = respuestas.map(r => [r.dimension, r.indicador, r.planillaB, r.puntaje, r.observaciones]);
    const wsB = XLSX.utils.aoa_to_sheet([...planillaBHeader, ...planillaBRows]);
    wsB["!cols"] = [{ wch: 18 }, { wch: 35 }, { wch: 20 }, { wch: 10 }, { wch: 40 }];
    XLSX.utils.book_append_sheet(wb, wsB, "Planilla B");

    // Sheet 4: Comparativa
    const compHeader = [["Dimensión", "Indicador", "Planilla A", "Planilla B", "Puntaje", "Divergencia", "Observaciones"]];
    const compRows = respuestas.map(r => [
      r.dimension,
      r.indicador,
      r.planillaA,
      r.planillaB,
      r.puntaje,
      r.planillaA !== r.planillaB ? "Sí" : "No",
      r.observaciones,
    ]);
    const wsComp = XLSX.utils.aoa_to_sheet([...compHeader, ...compRows]);
    wsComp["!cols"] = [{ wch: 18 }, { wch: 35 }, { wch: 16 }, { wch: 16 }, { wch: 10 }, { wch: 12 }, { wch: 40 }];
    XLSX.utils.book_append_sheet(wb, wsComp, "Comparativa");

    return wb;
  };

  const handleDownloadExcel = (ev: Evaluacion) => {
    const wb = buildWorkbook(ev);
    const filename = `Autoevaluacion_${ev.nombre.replace(/\s+/g, "_")}_2026.xlsx`;
    XLSX.writeFile(wb, filename);
  };

  const handleDownloadAllExcel = () => {
    const wb = XLSX.utils.book_new();

    // Summary sheet
    const summaryHeader = [["Nombre", "Cargo", "Asignatura", "Estado", "N° Alertas"]];
    const summaryRows = filteredEvaluaciones.map(ev => [
      ev.nombre,
      ev.cargo,
      ev.asignatura,
      getStatusText(ev.alertas),
      ev.alertas,
    ]);
    const wsSummary = XLSX.utils.aoa_to_sheet([...summaryHeader, ...summaryRows]);
    wsSummary["!cols"] = [{ wch: 28 }, { wch: 16 }, { wch: 26 }, { wch: 14 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(wb, wsSummary, "Resumen General");

    // One sheet per teacher (comparativa)
    filteredEvaluaciones.forEach(ev => {
      const respuestas = mockAutoevaluaciones[ev.id] ?? [];
      const header = [["Dimensión", "Indicador", "Planilla A", "Planilla B", "Puntaje", "Divergencia"]];
      const rows = respuestas.map(r => [
        r.dimension,
        r.indicador,
        r.planillaA,
        r.planillaB,
        r.puntaje,
        r.planillaA !== r.planillaB ? "Sí" : "No",
      ]);
      const ws = XLSX.utils.aoa_to_sheet([...header, ...rows]);
      ws["!cols"] = [{ wch: 16 }, { wch: 30 }, { wch: 16 }, { wch: 16 }, { wch: 10 }, { wch: 12 }];
      // Sheet name max 31 chars, sanitize
      const sheetName = ev.nombre.substring(0, 28).replace(/[:\\/?*[\]]/g, "");
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
    });

    XLSX.writeFile(wb, `Autoevaluaciones_Completas_2026.xlsx`);
  };

  return (
    <div className="space-y-6 bg-slate-50 min-h-screen p-4 md:p-8 animate-in fade-in duration-500 font-sans">
      
      {/* Header & Navigation Integration */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-2">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight">
            Secretaría Académica
          </h2>
          <p className="text-slate-500 mt-2 text-sm font-medium">
            Verificación de datos, resoluciones y control de gestión.
          </p>
        </div>
        
        {/* Tabs styled as soft pills */}
        <div className="flex bg-white p-1 rounded-xl shadow-sm border border-slate-200 w-fit">
          <button onClick={() => setActiveTab("tramites")} className={`px-5 py-2 font-medium text-sm rounded-lg transition-colors ${activeTab === "tramites" ? "bg-slate-100 text-slate-900" : "text-slate-500 hover:text-slate-800"}`}>
            Trámites Pendientes
          </button>
          <button onClick={() => setActiveTab("archivo")} className={`px-5 py-2 font-medium text-sm rounded-lg transition-colors ${activeTab === "archivo" ? "bg-slate-100 text-slate-900" : "text-slate-500 hover:text-slate-800"}`}>
            Archivo de RFs
          </button>
          <button onClick={() => setActiveTab("semaforo")} className={`px-5 py-2 font-medium text-sm rounded-lg transition-colors ${activeTab === "semaforo" ? "bg-slate-100 text-slate-900" : "text-slate-500 hover:text-slate-800"}`}>
            Centro de Mando
          </button>
        </div>
      </div>

      {/* --- TAB 1 CONTENT: TRÁMITES --- */}
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
              <a href="/ayudantes" className="mt-2 w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors">
                Ingresar al Módulo
              </a>
            </div>

            <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center text-center gap-4 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-purple-100 text-purple-700 rounded-full flex items-center justify-center">
                <BookOpen className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-slate-800 text-lg">Módulo Adscriptos Profesionales</h4>
                <p className="text-slate-500 text-sm mt-1">Gestione el circuito de 9 fases de control estricto.</p>
              </div>
              <a href="/adscriptos" className="mt-2 w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors">
                Ingresar al Módulo
              </a>
            </div>
          </div>
        </div>
      )}

      {/* --- TAB 2 CONTENT: ARCHIVO --- */}
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
                onChange={(e) => setSearchTermArchivo(e.target.value)}
                className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm w-full md:w-64 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              />
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 font-semibold">N° Resolución</th>
                  <th className="px-4 py-3 font-semibold">Título</th>
                  <th className="px-4 py-3 font-semibold">Carrera</th>
                  <th className="px-4 py-3 font-semibold">Estado</th>
                  <th className="px-4 py-3 font-semibold text-right">Feedback Docente</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredResoluciones.map((rf) => (
                  <tr key={rf.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-4 font-medium text-slate-900">{rf.id}</td>
                    <td className="px-4 py-4 text-slate-700">{rf.titulo}</td>
                    <td className="px-4 py-4 text-slate-700">{rf.carrera}</td>
                    <td className="px-4 py-4">
                      <span className={`px-2 py-1 rounded text-xs font-medium border ${rf.estado === "Vigente" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-100 text-slate-600 border-slate-200"}`}>
                        {rf.estado}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right">
                      {rf.feedback ? (
                        <div className="text-xs text-slate-500 italic text-left p-2 bg-slate-50 rounded border border-slate-100 line-clamp-2">
                          "{rf.feedback}"
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">Pendiente</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- TAB 3 CONTENT: CENTRO DE MANDO (SEMÁFORO) --- */}
      {activeTab === "semaforo" && (
        <div className="space-y-6">
          {/* Header Dashboard */}
          <div className="bg-white px-6 py-4 rounded-xl shadow-sm border border-slate-100 flex flex-col md:flex-row items-center justify-between gap-4">
            <h1 className="text-2xl font-bold text-slate-800">Centro de Mando - Autoevaluación 2026</h1>
            <div className="flex items-center gap-4 w-full md:w-auto">
              <div className="relative flex-1 md:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar global..."
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-[#1e3a8a]"
                />
              </div>
              <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center shrink-0">
                <UserCircle className="w-6 h-6 text-slate-500" />
              </div>
            </div>
          </div>

          {/* KPIs Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 flex flex-col justify-between">
              <p className="text-sm font-medium text-slate-500">Tasa de Participación</p>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-4xl font-black text-[#1e3a8a]">85</span>
                <span className="text-lg text-slate-400">/120</span>
              </div>
              <p className="text-xs text-emerald-600 font-medium flex items-center gap-1 mt-3">
                <ArrowUpRight className="w-3 h-3" /> 15% vs año pasado
              </p>
            </div>
            
            <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 flex flex-col justify-between">
              <p className="text-sm font-medium text-slate-500">Casos Críticos Activos</p>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-4xl font-black text-rose-600">15</span>
                <span className="text-sm text-slate-400 ml-1">docentes</span>
              </div>
              <p className="text-xs text-rose-600 font-medium flex items-center gap-1 mt-3">
                <ArrowUpRight className="w-3 h-3" /> 2 nuevos esta semana
              </p>
            </div>
            
            <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 flex flex-col justify-between">
              <p className="text-sm font-medium text-slate-500">Promedio Alertas/Docente</p>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-4xl font-black text-[#1e3a8a]">1.4</span>
              </div>
              <p className="text-xs text-emerald-600 font-medium flex items-center gap-1 mt-3">
                <ArrowDownRight className="w-3 h-3" /> 0.3 menos que 2025
              </p>
            </div>
            
            <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 flex flex-col justify-between">
              <p className="text-sm font-medium text-slate-500">Evaluaciones Pendientes</p>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-4xl font-black text-amber-500">35</span>
              </div>
              <p className="text-xs text-slate-500 font-medium flex items-center gap-1 mt-3">
                En plazo límite de entrega
              </p>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <DonutChart />
            <GaugeChart />
            <AlertasBarChart />
          </div>

          {/* Interactive Table (Vitamizada) */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            
            {/* Table Top Bar */}
            <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <h3 className="text-lg font-bold text-slate-800">Detalle de Docentes</h3>
              <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                <div className="relative w-full sm:w-64">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Buscar profesor..."
                    value={searchTermSemaforo}
                    onChange={(e) => setSearchTermSemaforo(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-[#1e3a8a] transition-all"
                  />
                </div>
                <div className="relative w-full sm:w-48">
                  <Filter className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <select 
                    value={filterRiesgo}
                    onChange={(e) => setFilterRiesgo(e.target.value)}
                    className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-[#1e3a8a] appearance-none cursor-pointer"
                  >
                    <option value="Todos">Todos los niveles</option>
                    <option value="Saludable">Saludable</option>
                    <option value="Precaución">Precaución</option>
                    <option value="Crítico">Crítico</option>
                  </select>
                </div>
                <button
                  onClick={handleDownloadAllExcel}
                  title="Descargar todas las autoevaluaciones en Excel"
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-sm font-medium transition-colors shrink-0 whitespace-nowrap"
                >
                  <Download className="w-4 h-4" />
                  Exportar todo
                </button>
              </div>
            </div>

            {/* Table Content */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50/50 text-xs uppercase text-slate-500 font-semibold border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-4">Docente</th>
                    <th className="px-6 py-4">Cargo</th>
                    <th className="px-6 py-4">Asignatura</th>
                    <th className="px-6 py-4">Estado</th>
                    <th className="px-6 py-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredEvaluaciones.map((ev) => {
                    const statusStr = getStatusText(ev.alertas);
                    return (
                      <tr key={ev.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4 font-bold text-slate-800">{ev.nombre}</td>
                        <td className="px-6 py-4 text-slate-600">{ev.cargo}</td>
                        <td className="px-6 py-4 text-slate-600">{ev.asignatura}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border ${getPillStyle(ev.alertas)}`}>
                            {statusStr} ({ev.alertas} Alertas)
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-3">
                            <button className="text-slate-400 hover:text-[#1e3a8a] transition-colors p-1" title="Ver Respuestas">
                              <Eye className="w-5 h-5" />
                            </button>
                            <button className="text-slate-400 hover:text-[#1e3a8a] transition-colors p-1" title="Enviar Recordatorio">
                              <Mail className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => handleDownloadExcel(ev)}
                              title="Descargar autoevaluación en Excel"
                              className="text-slate-400 hover:text-emerald-600 transition-colors p-1"
                            >
                              <FileSpreadsheet className="w-5 h-5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredEvaluaciones.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                        No se encontraron docentes con los filtros aplicados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            
          </div>
        </div>
      )}

    </div>
  );
}