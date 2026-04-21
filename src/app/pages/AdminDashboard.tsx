import { useMemo, useState } from "react";
import { Layers, ShieldCheck } from "lucide-react";
import { TeacherDashboard } from "./TeacherDashboard";
import { JefeCarreraDashboard } from "./JefeCarreraDashboard";
import { SecretariaDashboard } from "./SecretariaDashboard";
import { SecTecnicaDashboard } from "./SecTecnicaDashboard";
import { AdministrativoDashboard } from "./AdministrativoDashboard";
import { useUser } from "../context/UserContext";

type AdminViewKey = "docente" | "jefe" | "secretaria" | "tecnica" | "mesa";

const VIEW_CONFIG: Array<{ key: AdminViewKey; label: string; hint: string }> = [
  { key: "docente", label: "Vista Docente", hint: "Carga y gestión de tareas docentes" },
  { key: "jefe", label: "Vista Jefe de Carrera", hint: "Validaciones y aprobaciones de carrera" },
  { key: "secretaria", label: "Vista Secretaría Académica", hint: "Resoluciones y seguimiento académico" },
  { key: "tecnica", label: "Vista Secretaría Técnica", hint: "Operación técnica y adscriptos" },
  { key: "mesa", label: "Vista Mesa de Ayuda", hint: "Verificación administrativa de trámites" },
];

function RenderAdminView({ view }: { view: AdminViewKey }) {
  switch (view) {
    case "docente":
      return <TeacherDashboard />;
    case "jefe":
      return <JefeCarreraDashboard />;
    case "secretaria":
      return <SecretariaDashboard />;
    case "tecnica":
      return <SecTecnicaDashboard />;
    case "mesa":
      return <AdministrativoDashboard />;
    default:
      return <TeacherDashboard />;
  }
}

export function AdminDashboard() {
  const { user, personas } = useUser();
  const [activeView, setActiveView] = useState<AdminViewKey>("docente");

  const totalDocentes = useMemo(() => personas.filter((p) => p.rol === "DOCENTE").length, [personas]);
  const totalResponsables = useMemo(() => personas.filter((p) => p.rol === "DOCENTE_RESPONSABLE").length, [personas]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <section className="bg-white border border-slate-100 shadow-sm rounded-2xl p-6 md:p-7">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-7 h-7 text-blue-800" />
              Panel Administrador
            </h1>
            <p className="text-slate-500 mt-1">
              {user.nombre} - acceso completo habilitado para todas las vistas del sistema.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-blue-50 text-blue-900 border border-blue-100 rounded-xl px-4 py-3">
              <p className="text-xs uppercase tracking-wide font-semibold">Docentes</p>
              <p className="text-xl font-black">{totalDocentes}</p>
            </div>
            <div className="bg-indigo-50 text-indigo-900 border border-indigo-100 rounded-xl px-4 py-3">
              <p className="text-xs uppercase tracking-wide font-semibold">Responsables</p>
              <p className="text-xl font-black">{totalResponsables}</p>
            </div>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-2">
          {VIEW_CONFIG.map((view) => (
            <button
              key={view.key}
              onClick={() => setActiveView(view.key)}
              className={`text-left rounded-xl border px-4 py-3 transition-all ${
                activeView === view.key
                  ? "border-blue-300 bg-blue-50 shadow-sm"
                  : "border-slate-200 bg-white hover:bg-slate-50"
              }`}
            >
              <p className={`text-sm font-semibold ${activeView === view.key ? "text-blue-900" : "text-slate-800"}`}>
                {view.label}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">{view.hint}</p>
            </button>
          ))}
        </div>
      </section>

      <section className="bg-white border border-slate-100 shadow-sm rounded-2xl overflow-hidden">
        <div className="px-6 py-3 border-b border-slate-100 bg-slate-50 flex items-center gap-2 text-slate-600 text-sm font-medium">
          <Layers className="w-4 h-4" />
          Simulación activa: {VIEW_CONFIG.find((view) => view.key === activeView)?.label}
        </div>
        <div className="p-4 md:p-6">
          <RenderAdminView view={activeView} />
        </div>
      </section>
    </div>
  );
}
