import { useState } from "react";
import { useUser } from "../context/UserContext";
import { Link } from "react-router";
import { useLayoutState } from "../context/LayoutContext";
import { 
  ListTodo, List, ChevronDown, ChevronUp, ChevronRight,
  UserPlus, UserCheck, FileText, ShieldAlert, ClipboardList, FolderOpen
} from "lucide-react";

export function TeacherDashboard() {
  const { user } = useUser();
  const { isSidebarCollapsed } = useLayoutState();
  const isResponsable = user.rol === "DOCENTE_RESPONSABLE";

  const [activeFilter, setActiveFilter] = useState("all");
  const [categoriesOpen, setCategoriesOpen] = useState(true);

  const [openCards, setOpenCards] = useState<Record<string, boolean>>({
    academico: true,
    administrativo: true,
    autoevaluacion: true,
    repositorios: true,
  });

  const toggleCard = (id: string) => {
    setOpenCards(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const menuData = [
    {
      id: "academico",
      title: "Ámbito Académico",
      headerColor: "bg-[#eef2c6] text-[#5c661a]", // Pastel olive/yellow
      iconColor: "text-[#5c661a]",
      items: [
        {
          id: "ayudantes",
          number: 1,
          title: "Pedido de Ayudante Alumno",
          description: "Formulario para solicitudes de auxiliares.",
          icon: <UserPlus className="w-6 h-6" />,
          link: "/ayudantes",
          isExternal: false,
          requiresResponsable: true
        },
        {
          id: "adscriptos",
          number: 2,
          title: "Solicitar Adscriptos",
          description: "Consultar aulas y profesores conocidos.",
          icon: <UserCheck className="w-6 h-6" />,
          link: "/adscriptos",
          isExternal: false,
          requiresResponsable: true
        }
      ]
    },
    {
      id: "administrativo",
      title: "Ámbito Administrativo",
      headerColor: "bg-[#c6e4e3] text-[#2c5f5d]", // Pastel teal
      iconColor: "text-[#2c5f5d]",
      items: [
        {
          id: "actividad-rf",
          number: 3,
          title: "Registrar Actividad",
          description: "Acceso al portal de Resoluciones de Facultad.",
          icon: <FileText className="w-6 h-6" />,
          link: "https://www.google.com/search?q=resoluciones+facultad",
          isExternal: true,
          requiresResponsable: false
        },
        {
          id: "seguros",
          number: 4,
          title: "Solicitud de Seguros",
          description: "Gestione las pólizas para las salidas a campo.",
          icon: <ShieldAlert className="w-6 h-6" />,
          link: "/seguros",
          isExternal: false,
          requiresResponsable: false
        }
      ]
    },
    {
      id: "autoevaluacion",
      title: "Autoevaluación Docente",
      headerColor: "bg-[#d9d6f4] text-[#423b8f]", // Pastel purple/indigo
      iconColor: "text-[#423b8f]",
      items: [
        {
          id: "autoevaluacion-form",
          number: 5,
          title: "Autoevaluación Docente",
          description: "Complete la encuesta obligatoria de desempeño.",
          icon: <ClipboardList className="w-6 h-6" />,
          link: "/autoevaluacion",
          isExternal: false,
          requiresResponsable: false
        }
      ]
    },
    {
      id: "repositorios",
      title: "Repositorios",
      headerColor: "bg-[#d6e8f9] text-[#2b5a8c]", // Pastel blue
      iconColor: "text-[#2b5a8c]",
      items: [
        {
          id: "repositorios-view",
          number: 6,
          title: "Repositorios",
          description: "Modificar y subir programas de cátedra.",
          icon: <FolderOpen className="w-6 h-6" />,
          link: "/repositorios",
          isExternal: false,
          requiresResponsable: false
        }
      ]
    }
  ];

  const filteredData = menuData.map(group => {
    return {
      ...group,
      items: group.items.filter(item => {
        if (item.requiresResponsable && !isResponsable) return false;
        if (activeFilter !== "all" && activeFilter !== group.id) return false;
        return true;
      })
    };
  }).filter(group => group.items.length > 0);

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
          <p className="text-xs text-slate-500">Filtre las tareas según el ámbito</p>
        </div>

        <button 
          onClick={() => setActiveFilter("all")}
          className={`flex items-center gap-3 px-5 py-3.5 rounded-xl text-sm font-medium transition-colors ${activeFilter === "all" ? "bg-slate-800 text-white" : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-100 shadow-sm"}`}
        >
          <ListTodo className="w-4 h-4" />
          Todas las Tareas
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

      {/* Main Content Area - Integrated directly into the page flow */}
      <div className="flex-1 min-w-0 pb-12">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
              Mis Tareas Activas
            </h1>
            <p className="text-slate-500 mt-2 text-lg font-light">
              Gestione sus trámites y autoevaluaciones desde un solo lugar.
            </p>
          </div>
        </div>
        
        <div className="space-y-6">
          {filteredData.map(group => (
            <div key={group.id} className="bg-white rounded-2xl shadow-sm overflow-hidden border border-slate-100">
              <div 
                className={`${group.headerColor} px-6 py-4 flex justify-between items-center cursor-pointer transition-colors`}
                onClick={() => toggleCard(group.id)}
              >
                <h3 className="text-base font-bold tracking-wide">{group.title}</h3>
                {openCards[group.id] ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </div>
              
              {openCards[group.id] && (
                <div className="divide-y divide-slate-100">
                  {group.items.map((item) => {
                    const ButtonTag = item.isExternal ? 'a' : Link;
                    const linkProps = item.isExternal ? { href: item.link, target: "_blank", rel: "noopener noreferrer" } : { to: item.link };
                    
                    return (
                      <div key={item.id} className="p-6 flex flex-col sm:flex-row sm:items-center justify-between hover:bg-slate-50/50 transition-colors gap-6 group">
                        <div className="flex items-start sm:items-center gap-5">
                          <div className={`w-14 h-14 flex items-center justify-center shrink-0 rounded-full bg-slate-50 border border-slate-100 ${group.iconColor} group-hover:scale-105 transition-transform shadow-sm`}>
                            {item.icon}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-bold text-slate-400 text-sm">#{item.number}</span>
                              <span className="font-semibold text-slate-800 text-lg">{item.title}</span>
                            </div>
                            <p className="text-sm text-slate-500 leading-relaxed">{item.description}</p>
                          </div>
                        </div>
                        <ButtonTag
                          {...linkProps}
                          className="flex items-center justify-center gap-2 bg-white hover:bg-slate-50 text-slate-700 font-medium text-sm px-6 py-2.5 rounded-xl border border-slate-200 shadow-sm shrink-0 transition-all hover:shadow hover:border-slate-300"
                        >
                          Iniciar <ChevronRight className="w-4 h-4" />
                        </ButtonTag>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
