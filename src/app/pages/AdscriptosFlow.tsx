import { useState } from 'react';
import { useUser } from '../context/UserContext';
import { 
  FileText, CheckCircle2, ChevronRight, Download, Filter, 
  Search, Paperclip, User, Clock, AlertTriangle, Briefcase, Plus
} from 'lucide-react';

export type FaseAdscripto = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

export interface TramiteAdscripto {
  id: string;
  adscripto: string;
  dni: string;
  materia: string;
  docente: string;
  faseActual: FaseAdscripto;
  estado: "PENDIENTE" | "COMPLETADO" | "RECHAZADO";
  cvAdjunto: boolean;
}

const FASES = [
  { id: 1, nombre: "SOLICITUD & CV", actor: "Profe" },
  { id: 2, nombre: "VISTO BUENO 1", actor: "Jefe" },
  { id: 3, nombre: "VERIFICACIÓN", actor: "Sec. Técnica" },
  { id: 4, nombre: "DOC. LEGAJO", actor: "Admin" },
  { id: 5, nombre: "RF INICIO", actor: "Sec. Académica" },
  { id: 6, nombre: "ALTA LARAVEL", actor: "Sec. Técnica" },
  { id: 7, nombre: "INFORME FINAL", actor: "Profe" },
  { id: 8, nombre: "VISTO BUENO 2", actor: "Jefe" },
  { id: 9, nombre: "RF CIERRE", actor: "Sec. Académica" }
];

const mockTramites: TramiteAdscripto[] = [
  { id: "ADS-001", adscripto: "Arq. Martina Gómez", dni: "30123456", materia: "Diseño Arquitectónico I", docente: "Dra. Ana Sánchez", faseActual: 2, estado: "PENDIENTE", cvAdjunto: true },
  { id: "ADS-002", adscripto: "Lic. Pablo Ruiz", dni: "29876543", materia: "Historia del Arte", docente: "Carlos Gómez", faseActual: 3, estado: "PENDIENTE", cvAdjunto: true },
  { id: "ADS-003", adscripto: "DI. Laura Vega", dni: "32456789", materia: "Morfología", docente: "Dra. Ana Sánchez", faseActual: 5, estado: "PENDIENTE", cvAdjunto: true },
  { id: "ADS-004", adscripto: "Arq. Tomás Silva", dni: "28345678", materia: "Proyecto Urbano", docente: "Arq. Roberto Díaz", faseActual: 8, estado: "PENDIENTE", cvAdjunto: true },
];

export function AdscriptosFlow() {
  const { user } = useUser();
  const [tramites, setTramites] = useState(mockTramites);
  const [filtro, setFiltro] = useState("pendientes");

  const getActorMeta = (fase: number) => {
    switch(fase) {
      case 1: case 7: return { label: "Docente", badge: "bg-slate-100 text-slate-800 border-slate-200" };
      case 2: case 8: return { label: "Jefe de Carrera", badge: "bg-blue-100 text-blue-800 border-blue-200" };
      case 3: case 6: return { label: "Sec. Técnica", badge: "bg-purple-100 text-purple-800 border-purple-200" };
      case 4: return { label: "Administrativo", badge: "bg-orange-100 text-orange-800 border-orange-200" };
      case 5: case 9: return { label: "Sec. Académica", badge: "bg-green-100 text-green-800 border-green-200" };
      default: return { label: "", badge: "" };
    }
  };

  const getActionLabel = (fase: number) => {
    switch(fase) {
      case 1: return "Cargar Solicitud";
      case 2: return "Avalar Solicitud";
      case 3: return "Verificar Planta Docente";
      case 4: return "Solicitar Documentación";
      case 5: return "Emitir RF Inicio";
      case 6: return "Confirmar Alta en Laravel";
      case 7: return "Subir Informe Final";
      case 8: return "Avalar Cierre";
      case 9: return "Emitir RF Cierre";
      default: return "Ver Detalle";
    }
  };

  const isRelevantForUser = (fase: number) => {
    if (user.rol === "DOCENTE" || user.rol === "DOCENTE_RESPONSABLE") return fase === 1 || fase === 7;
    if (user.rol === "JEFE_CARRERA") return fase === 2 || fase === 8;
    if (user.rol === "SEC_TECNICA") return fase === 3 || fase === 6;
    if (user.rol === "ADMINISTRATIVO") return fase === 4;
    if (user.rol === "SECRETARIA") return fase === 5 || fase === 9;
    return true; // fallback
  };

  const filteredTramites = tramites.filter(t => {
    if (filtro === "pendientes") return isRelevantForUser(t.faseActual);
    if (filtro === "rechazados") return t.estado === "RECHAZADO";
    return true;
  });

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header */}
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 flex justify-between items-center">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="bg-indigo-100 text-indigo-800 text-xs font-bold px-2.5 py-1 rounded-md tracking-wide">Módulo Adscriptos</span>
            <span className="text-slate-400 text-sm font-medium">Ciclo Lectivo 2026</span>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Solicitud de Adscriptos</h1>
          <p className="text-slate-500 mt-2 text-lg font-light">
            Gestione el alta y evaluación de profesionales adscriptos. El circuito consta de 9 fases obligatorias.
          </p>
        </div>
        {(user.rol === "DOCENTE" || user.rol === "DOCENTE_RESPONSABLE") && (
          <button className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-5 py-3 rounded-xl transition-colors shadow-sm">
            <Plus className="w-5 h-5" /> Nueva Solicitud
          </button>
        )}
      </div>

      {/* Stepper Visual */}
      {user.rol !== "DOCENTE_RESPONSABLE" && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 overflow-x-auto">
          <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
            <Briefcase className="w-4 h-4" /> Flujo Académico de Adscriptos
          </h3>
          <div className="flex items-center min-w-max pb-2">
            {FASES.map((fase, idx) => (
              <div key={fase.id} className="flex items-center">
                <div className="flex flex-col items-center w-24">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm border-2 z-10 transition-colors
                    ${isRelevantForUser(fase.id) ? "bg-indigo-600 border-indigo-600 text-white shadow-md scale-110" : "bg-white border-slate-200 text-slate-400"}
                  `}>
                    {fase.id}
                  </div>
                  <div className="mt-3 text-center">
                    <p className={`text-[10px] font-bold leading-tight uppercase ${isRelevantForUser(fase.id) ? "text-indigo-700" : "text-slate-500"}`}>{fase.nombre}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{fase.actor}</p>
                  </div>
                </div>
                {idx < FASES.length - 1 && (
                  <div className={`w-12 h-1 -mx-2 rounded-full mb-8 ${idx < FASES.length - 1 && isRelevantForUser(fase.id) ? "bg-indigo-100" : "bg-slate-100"}`} />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-6">
        
        {/* Sidebar Filters */}
        <div className="w-full lg:w-64 shrink-0 flex flex-col gap-3">
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
            <h2 className="font-bold text-slate-800 text-sm mb-4 uppercase tracking-wider flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400" /> Filtros
            </h2>
            <div className="space-y-2">
              <button 
                onClick={() => setFiltro("pendientes")}
                className={`w-full text-left px-4 py-2.5 rounded-xl text-sm transition-colors ${filtro === "pendientes" ? "bg-indigo-50 text-indigo-700 font-bold" : "text-slate-600 hover:bg-slate-50 font-medium"}`}
              >
                Mis Trámites Pendientes
              </button>
              <button 
                onClick={() => setFiltro("todos")}
                className={`w-full text-left px-4 py-2.5 rounded-xl text-sm transition-colors ${filtro === "todos" ? "bg-indigo-50 text-indigo-700 font-bold" : "text-slate-600 hover:bg-slate-50 font-medium"}`}
              >
                Todos los Trámites
              </button>
              <button 
                onClick={() => setFiltro("materia")}
                className={`w-full text-left px-4 py-2.5 rounded-xl text-sm transition-colors flex items-center justify-between ${filtro === "materia" ? "bg-indigo-50 text-indigo-700 font-bold" : "text-slate-600 hover:bg-slate-50 font-medium"}`}
              >
                Filtrar por Materia <ChevronRight className="w-3 h-3 opacity-50" />
              </button>
              <button 
                onClick={() => setFiltro("rechazados")}
                className={`w-full text-left px-4 py-2.5 rounded-xl text-sm transition-colors ${filtro === "rechazados" ? "bg-indigo-50 text-indigo-700 font-bold" : "text-slate-600 hover:bg-slate-50 font-medium"}`}
              >
                Ver Rechazados
              </button>
            </div>
          </div>
          
          <button className="flex items-center justify-center gap-2 bg-white text-slate-700 hover:bg-slate-50 hover:text-indigo-700 text-sm font-semibold py-3 px-4 rounded-2xl border border-slate-200 shadow-sm transition-all w-full">
            <Download className="w-4 h-4" /> Descargar Consolidado
          </button>
        </div>

        {/* Main List */}
        <div className="flex-1 space-y-4">
          <div className="relative mb-6">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-slate-400" />
            </div>
            <input 
              type="text" 
              className="block w-full pl-11 pr-4 py-3 border-0 rounded-2xl leading-5 bg-white shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 sm:text-sm transition-shadow" 
              placeholder="Buscar por DNI, Nombre del Profesional o Materia..." 
            />
          </div>

          {filteredTramites.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center">
              <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3 opacity-50" />
              <h3 className="text-lg font-bold text-slate-700">No hay trámites pendientes</h3>
              <p className="text-slate-500 text-sm mt-1">Usted está al día con sus tareas.</p>
            </div>
          ) : (
            filteredTramites.map(tramite => {
              const meta = getActorMeta(tramite.faseActual);
              const accion = getActionLabel(tramite.faseActual);
              const isRelevant = isRelevantForUser(tramite.faseActual);
              const faseData = FASES.find(f => f.id === tramite.faseActual);

              return (
                <div key={tramite.id} className={`bg-white rounded-2xl p-5 sm:p-6 shadow-sm border transition-all ${isRelevant ? "border-indigo-200 shadow-indigo-100/50" : "border-slate-100"}`}>
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
                    
                    {/* Info Adscripto */}
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 rounded">
                          ID: {tramite.id}
                        </span>
                        <span className="px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 rounded flex items-center gap-1">
                          <User className="w-3 h-3" /> Profesional
                        </span>
                      </div>
                      
                      <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                        {tramite.adscripto}
                      </h3>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-1 mt-3">
                        <p className="text-sm text-slate-600"><strong className="text-slate-500 font-medium">DNI:</strong> {tramite.dni}</p>
                        <p className="text-sm text-slate-600"><strong className="text-slate-500 font-medium">Materia:</strong> {tramite.materia}</p>
                        <p className="text-sm text-slate-600"><strong className="text-slate-500 font-medium">Responsable:</strong> {tramite.docente}</p>
                      </div>

                      {tramite.cvAdjunto && (
                        <button className="mt-4 flex items-center gap-1.5 text-sm font-semibold text-indigo-600 hover:text-indigo-800 transition-colors">
                          <Paperclip className="w-4 h-4" /> Ver CV Adjunto
                        </button>
                      )}
                    </div>

                    {/* Status & Action */}
                    <div className="flex flex-col items-start md:items-end gap-4 border-t md:border-t-0 md:border-l border-slate-100 pt-4 md:pt-0 md:pl-6 min-w-[240px]">
                      
                      <div className="flex flex-col md:items-end w-full">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                          Estado del Trámite
                        </span>
                        <div className="flex items-center gap-2">
                          <span className={`px-3 py-1 text-xs font-bold rounded-full border ${meta.badge}`}>
                            En {meta.label}
                          </span>
                        </div>
                        <p className="text-sm font-semibold text-slate-700 mt-2">
                          Paso {tramite.faseActual} / 9: <span className="text-slate-500 font-normal">{faseData?.nombre}</span>
                        </p>
                      </div>

                      <button 
                        disabled={!isRelevant}
                        className={`w-full flex items-center justify-center gap-2 text-sm font-bold py-3 px-5 rounded-xl transition-all shadow-sm
                          ${isRelevant 
                            ? "bg-indigo-600 hover:bg-indigo-700 text-white" 
                            : "bg-slate-50 text-slate-400 cursor-not-allowed border border-slate-200"
                          }
                        `}
                      >
                        {accion}
                        {isRelevant && <ChevronRight className="w-4 h-4" />}
                      </button>

                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  );
}
