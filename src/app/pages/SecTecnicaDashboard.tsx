import { useUser } from "../context/UserContext";
import { Link } from "react-router";
import { ListTodo, UserCheck, ChevronRight } from "lucide-react";

export function SecTecnicaDashboard() {
  const { user } = useUser();

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Secretaría Técnica</h1>
        <p className="text-slate-500 mt-2 text-lg font-light">
          Panel de control para {user.nombre}. Verificación de Adscriptos y alta en Laravel.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-slate-100">
          <div className="bg-[#e9d5ff] text-[#4c1d95] px-6 py-4 flex justify-between items-center cursor-pointer transition-colors">
            <h3 className="text-base font-bold tracking-wide flex items-center gap-2">
              <UserCheck className="w-6 h-6" /> Módulo Adscriptos
            </h3>
          </div>
          
          <div className="p-6 flex flex-col items-center justify-between hover:bg-slate-50/50 transition-colors gap-4">
            <p className="text-sm text-slate-500 text-center">
              Gestione las verificaciones de planta docente y el alta de Adscriptos en Laravel (Fase 3 y 6).
            </p>
            <Link
              to="/adscriptos"
              className="flex items-center justify-center gap-2 bg-white hover:bg-slate-50 text-[#4c1d95] font-medium text-sm px-6 py-2.5 rounded-xl border border-slate-200 shadow-sm shrink-0 transition-all hover:shadow hover:border-slate-300"
            >
              Abrir Módulo de Adscriptos <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}