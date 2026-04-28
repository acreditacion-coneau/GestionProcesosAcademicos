import { useState } from "react";
import { Link } from "react-router";
import { useUser } from "../context/UserContext";
import { useLayoutState } from "../context/LayoutContext";
import { 
  ListTodo, List, ChevronDown, ChevronUp, ChevronRight,
  UserCheck, ShieldAlert, ClipboardList, FolderOpen, Check
} from "lucide-react";

type Solicitud = {
  id: number;
  tipo: string;
  docenteResponsable: string;
  alumno: string;
  fecha: string;
  estado: "Pendiente Jefe" | "Enviado Secretaría";
};

type Seguro = {
  id: number;
  docente: string;
  destino: string;
  fechaSalida: string;
  estado: "Pendiente" | "Aprobado";
};

export function JefeCarreraDashboard() {
  const { user } = useUser();
  const { isSidebarCollapsed } = useLayoutState();
  const [activeFilter, setActiveFilter] = useState("all");
  const [categoriesOpen, setCategoriesOpen] = useState(true);

  // States
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([
    { id: 201, tipo: "Ayudante", docenteResponsable: "Arq. Mario Bros", alumno: "Luigi P.", fecha: "2026-05-10", estado: "Pendiente Jefe" },
    { id: 202, tipo: "Adscripto", docenteResponsable: "Lic. Clara M.", alumno: "Juan D.", fecha: "2026-05-12", estado: "Pendiente Jefe" },
  ]);

  const [seguros, setSeguros] = useState<Seguro[]>([
    { id: 101, docente: "Arq. Roberto Díaz", destino: "Visita a Obra Central", fechaSalida: "2026-05-20", estado: "Pendiente" },
    { id: 102, docente: "Dra. Ana Sánchez", destino: "Planta Industrial", fechaSalida: "2026-05-25", estado: "Aprobado" },
  ]);

  const [evaluacionEnviada, setEvaluacionEnviada] = useState(false);

  const [openCards, setOpenCards] = useState<Record<string, boolean>>({
    designaciones: true,
    seguros: true,
    autoevaluacion: true,
    repositorios: true,
  });

  const toggleCard = (id: string) => {
    setOpenCards(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const darVistoBuenoDesignacion = (id: number) => {
    setSolicitudes(solicitudes.map(s => s.id === id ? { ...s, estado: "Enviado Secretaría" } : s));
  };

  const darVistoBuenoSeguro = (id: number) => {
    setSeguros(seguros.map(s => s.id === id ? { ...s, estado: "Aprobado" } : s));
  };

  const enviarAutoevaluacion = () => {
    setEvaluacionEnviada(true);
    setTimeout(() => setEvaluacionEnviada(false), 5000);
  };

  const menuData = [
    {
      id: "designaciones",
      title: "Designaciones",
      headerColor: "bg-[#eef2c6] text-[#5c661a]",
      iconColor: "text-[#5c661a]",
      icon: <UserCheck className="w-6 h-6" />
    },
    {
      id: "seguros",
      title: "Solicitudes de Seguros",
      headerColor: "bg-[#c6e4e3] text-[#2c5f5d]",
      iconColor: "text-[#2c5f5d]",
      icon: <ShieldAlert className="w-6 h-6" />
    },
    {
      id: "autoevaluacion",
      title: "Lanzamiento Autoevaluación",
      headerColor: "bg-[#d9d6f4] text-[#423b8f]",
      iconColor: "text-[#423b8f]",
      icon: <ClipboardList className="w-6 h-6" />
    },
    {
      id: "repositorios",
      title: "Repositorios",
      headerColor: "bg-[#d6e8f9] text-[#2b5a8c]",
      iconColor: "text-[#2b5a8c]",
      icon: <FolderOpen className="w-6 h-6" />
    }
  ];

  return (
    <div className="flex flex-col xl:flex-row gap-6 xl:gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Sidebar Minimalista */}
      <aside
        className={`w-full xl:shrink-0 flex flex-col gap-2 transition-all duration-300 ease-in-out ${
          isSidebarCollapsed
            ? "xl:w-0 xl:opacity-0 xl:-translate-x-3 xl:pointer-events-none overflow-hidden"
            : "xl:w-72 xl:opacity-100"
        }`}
      >
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 mb-2">
          <h2 className="font-bold text-slate-800 text-lg mb-1">Categorías</h2>
          <p className="text-xs text-slate-500">Filtre por tipo de gestión</p>
        </div>

        <button 
          onClick={() => setActiveFilter("all")}
          className={`flex items-center gap-3 px-5 py-3.5 rounded-xl text-sm font-medium transition-colors ${activeFilter === "all" ? "bg-slate-800 text-white" : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-100 shadow-sm"}`}
        >
          <ListTodo className="w-4 h-4" />
          Todo el Panel
        </button>
        
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
          <button 
            onClick={() => setCategoriesOpen(!categoriesOpen)}
            className="flex items-center justify-between w-full px-5 py-3.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <List className="w-4 h-4 text-slate-400" />
              Ámbitos
            </div>
            {categoriesOpen ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
          </button>
          
          {categoriesOpen && (
            <div className="flex flex-col border-t border-slate-50 py-2">
              {menuData.map(group => (
                <button 
                  key={group.id}
                  onClick={() => setActiveFilter(group.id)}
                  className={`text-left pl-12 pr-4 py-2.5 text-sm transition-colors ${activeFilter === group.id ? "text-blue-700 font-medium bg-blue-50/50" : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"}`}
                >
                  {group.title}
                </button>
              ))}
            </div>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 pb-12">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
              Jefatura de Carrera
            </h1>
            <p className="text-slate-500 mt-2 text-lg font-light">
              {user.carrera} - Gestione los Vistos Buenos y el lanzamiento de procesos.
            </p>
          </div>
        </div>
        
        <div className="space-y-6">
          
          {/* Card: Designaciones */}
          {(activeFilter === "all" || activeFilter === "designaciones") && (
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-slate-100">
              <div 
                className={`${menuData[0].headerColor} px-6 py-4 flex justify-between items-center cursor-pointer transition-colors`}
                onClick={() => toggleCard("designaciones")}
              >
                <h3 className="text-base font-bold tracking-wide flex items-center gap-2">
                  {menuData[0].icon} Designaciones Pendientes
                </h3>
                {openCards.designaciones ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </div>
              
              {openCards.designaciones && (
                <div className="p-6">
                  <p className="text-sm text-slate-500 mb-4">Otorgue el Visto Bueno a las solicitudes enviadas por los Responsables de Cátedra.</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <Link to="/ayudantes" className="bg-[#eef2c6]/30 border border-[#eef2c6] p-4 rounded-xl flex items-center justify-between hover:bg-[#eef2c6]/60 transition-colors">
                      <div>
                        <h4 className="font-bold text-[#5c661a]">Módulo Ayudantes Alumnos</h4>
                        <p className="text-xs text-[#5c661a]/80 mt-1">Verificar solicitudes de estudiantes</p>
                      </div>
                      <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-sm">
                        <ChevronRight className="w-4 h-4 text-[#5c661a]" />
                      </div>
                    </Link>
                    <Link to="/adscriptos" className="bg-[#eef2c6]/30 border border-[#eef2c6] p-4 rounded-xl flex items-center justify-between hover:bg-[#eef2c6]/60 transition-colors">
                      <div>
                        <h4 className="font-bold text-[#5c661a]">Módulo Adscriptos</h4>
                        <p className="text-xs text-[#5c661a]/80 mt-1">Verificar solicitudes de profesionales</p>
                      </div>
                      <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-sm">
                        <ChevronRight className="w-4 h-4 text-[#5c661a]" />
                      </div>
                    </Link>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-600 border-t border-slate-100">
                      <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                        <tr>
                          <th className="px-4 py-3 font-semibold">Trámite</th>
                          <th className="px-4 py-3 font-semibold">Responsable</th>
                          <th className="px-4 py-3 font-semibold">Postulante</th>
                          <th className="px-4 py-3 font-semibold text-right">Acción</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {solicitudes.map((sol) => (
                          <tr key={sol.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-4 py-4 font-medium text-slate-900">{sol.tipo}</td>
                            <td className="px-4 py-4 text-slate-700">{sol.docenteResponsable}</td>
                            <td className="px-4 py-4 text-slate-700">{sol.alumno}</td>
                            <td className="px-4 py-4 text-right">
                              {sol.estado === "Pendiente Jefe" ? (
                                <button
                                  onClick={() => darVistoBuenoDesignacion(sol.id)}
                                  className="inline-flex items-center gap-1.5 text-sm font-medium text-[#5c661a] bg-[#eef2c6]/50 hover:bg-[#eef2c6] px-3 py-1.5 rounded-lg border border-[#d2d99d] transition-colors"
                                >
                                  <Check className="w-4 h-4" /> Visto Bueno
                                </button>
                              ) : (
                                <span className="text-xs font-semibold text-green-600 bg-green-50 px-2 py-1 rounded border border-green-200">
                                  Aprobado
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Card: Seguros */}
          {(activeFilter === "all" || activeFilter === "seguros") && (
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-slate-100">
              <div 
                className={`${menuData[1].headerColor} px-6 py-4 flex justify-between items-center cursor-pointer transition-colors`}
                onClick={() => toggleCard("seguros")}
              >
                <h3 className="text-base font-bold tracking-wide flex items-center gap-2">
                  {menuData[1].icon} Solicitudes de Seguros
                </h3>
                {openCards.seguros ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </div>
              
              {openCards.seguros && (
                <div className="p-6">
                  <p className="text-sm text-slate-500 mb-4">Verifique y apruebe las salidas a campo y coberturas de seguro.</p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-600 border-t border-slate-100">
                      <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                        <tr>
                          <th className="px-4 py-3 font-semibold">Docente</th>
                          <th className="px-4 py-3 font-semibold">Destino</th>
                          <th className="px-4 py-3 font-semibold">Fecha Salida</th>
                          <th className="px-4 py-3 font-semibold text-right">Acción</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {seguros.map((seg) => (
                          <tr key={seg.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-4 py-4 font-medium text-slate-900">{seg.docente}</td>
                            <td className="px-4 py-4 text-slate-700">{seg.destino}</td>
                            <td className="px-4 py-4 text-slate-700">{seg.fechaSalida}</td>
                            <td className="px-4 py-4 text-right">
                              {seg.estado === "Pendiente" ? (
                                <button
                                  onClick={() => darVistoBuenoSeguro(seg.id)}
                                  className="inline-flex items-center gap-1.5 text-sm font-medium text-[#2c5f5d] bg-[#c6e4e3]/50 hover:bg-[#c6e4e3] px-3 py-1.5 rounded-lg border border-[#9fcbcb] transition-colors"
                                >
                                  <Check className="w-4 h-4" /> Aprobar
                                </button>
                              ) : (
                                <span className="text-xs font-semibold text-green-600 bg-green-50 px-2 py-1 rounded border border-green-200">
                                  Aprobado
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Card: Autoevaluación */}
          {(activeFilter === "all" || activeFilter === "autoevaluacion") && (
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-slate-100">
              <div 
                className={`${menuData[2].headerColor} px-6 py-4 flex justify-between items-center cursor-pointer transition-colors`}
                onClick={() => toggleCard("autoevaluacion")}
              >
                <h3 className="text-base font-bold tracking-wide flex items-center gap-2">
                  {menuData[2].icon} Lanzamiento de Autoevaluación
                </h3>
                {openCards.autoevaluacion ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </div>
              
              {openCards.autoevaluacion && (
                <div className="p-6 flex flex-col sm:flex-row items-center gap-6">
                  <div className="flex-1">
                    <p className="text-sm text-slate-600 leading-relaxed mb-2">
                      Inicie el proceso de autoevaluación obligatoria. Esto notificará a todos los Responsables de Cátedra de <strong>{user.carrera}</strong> para que completen sus informes y lo deriven a sus equipos.
                    </p>
                    {evaluacionEnviada && (
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-green-700 bg-green-50 px-2.5 py-1 rounded border border-green-200">
                        <Check className="w-3 h-3" /> Formularios distribuidos con éxito
                      </span>
                    )}
                  </div>
                  <button
                    onClick={enviarAutoevaluacion}
                    disabled={evaluacionEnviada}
                    className="shrink-0 flex items-center justify-center gap-2 bg-[#423b8f] text-white font-medium py-2.5 px-6 rounded-xl hover:bg-[#342f74] transition-all shadow-sm disabled:opacity-50"
                  >
                    Enviar a Cátedras <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Card: Repositorios */}
          {(activeFilter === "all" || activeFilter === "repositorios") && (
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-slate-100">
              <div 
                className={`${menuData[3].headerColor} px-6 py-4 flex justify-between items-center cursor-pointer transition-colors`}
                onClick={() => toggleCard("repositorios")}
              >
                <h3 className="text-base font-bold tracking-wide flex items-center gap-2">
                  {menuData[3].icon} Acceso a Repositorios
                </h3>
                {openCards.repositorios ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </div>
              
              {openCards.repositorios && (
                <div className="p-6 flex flex-col sm:flex-row items-center justify-between gap-6 hover:bg-slate-50/50 transition-colors">
                  <div>
                    <h4 className="font-semibold text-slate-800 text-lg mb-1">Repositorio General de {user.carrera}</h4>
                    <p className="text-sm text-slate-500">Acceda al Drive con la documentación, programas y normativas de su carrera.</p>
                  </div>
                  <a
                    href={`https://drive.google.com/drive/u/0/search?q=${encodeURIComponent(user.carrera)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 bg-white hover:bg-slate-50 text-[#2b5a8c] font-medium text-sm px-6 py-2.5 rounded-xl border border-slate-200 shadow-sm shrink-0 transition-all hover:shadow hover:border-slate-300"
                  >
                    Abrir Drive <ChevronRight className="w-4 h-4" />
                  </a>
                  </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}



