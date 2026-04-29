import { useState } from "react";
import { useUser } from "../context/UserContext";
import { useTramites } from "../context/TramitesContext";
import { Link } from "react-router";
import {
  FileSearch, CheckCheck, Clock, ChevronRight, AlertTriangle,
  ListTodo, Bell, FileText, X
} from "lucide-react";
import { PendingAlert } from "../components/PendingAlert";

type Solicitud = {
  id: number;
  tipo: string;
  responsable: string;
  alumno: string;
  dni: string;
  nota: number;
  estado: "Pendiente V1" | "Pendiente V2" | "RF Generada" | "Rechazado";
};

export function AdministrativoDashboard() {
  const { user } = useUser();
  const { tramites, notificaciones } = useTramites();

  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([
    { id: 301, tipo: "Ayudante", responsable: "Arq. Mario B.", alumno: "Juan Pérez", dni: "44555666", nota: 8.5, estado: "Pendiente V1" },
    { id: 302, tipo: "Adscripto", responsable: "Lic. Clara M.", alumno: "Ana López", dni: "42111222", nota: 6.5, estado: "Pendiente V1" },
  ]);

  const procesarSolicitud = (id: number, currentEstado: string, nota: number) => {
    setSolicitudes((prev) => prev.map(s => {
      if (s.id === id) {
        if (nota < 8) return { ...s, estado: "Rechazado" };
        if (currentEstado === "Pendiente V1") return { ...s, estado: "Pendiente V2" };
        if (currentEstado === "Pendiente V2") return { ...s, estado: "RF Generada" };
      }
      return s;
    }));
  };

  const rechazarSolicitud = (id: number) => {
    setSolicitudes((prev) => prev.map(s => s.id === id ? { ...s, estado: "Rechazado" } : s));
  };

  const pendientes = tramites.filter(
    (t) => t.responsableActual === "ADMINISTRATIVO" && t.estado !== "FINALIZADO" && t.estado !== "RECHAZADO",
  );
  const procesados = tramites.filter(
    (t) => t.responsableActual !== "ADMINISTRATIVO" && t.historial.some((evento) => evento.rol === "ADMINISTRATIVO"),
  );
  const myNotifs = notificaciones.filter(n => n.rolDestino === "ADMINISTRATIVO" && !n.leida);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8">
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Mesa de Ayuda</h1>
        <p className="text-slate-500 mt-2">Bienvenida, {user.nombre}. Gestione las verificaciones de solicitudes de ayudantía.</p>
      </div>

      {/* Alerts */}
      {myNotifs.length > 0 && (
        <PendingAlert
          titulo={`${myNotifs.length} notificación${myNotifs.length > 1 ? "es" : ""} pendiente${myNotifs.length > 1 ? "s" : ""}`}
          mensaje={myNotifs[0].mensaje}
          dismissible={false}
        />
      )}

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-amber-100 shadow-sm p-5 flex items-center gap-4">
          <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <p className="text-sm text-slate-500">Pendientes de verificar</p>
            <p className="text-2xl font-black text-amber-600">{pendientes.length}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 flex items-center gap-4">
          <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center shrink-0">
            <CheckCheck className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <p className="text-sm text-slate-500">Verificados</p>
            <p className="text-2xl font-black text-emerald-600">{procesados.length}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 flex items-center gap-4">
          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
            <ListTodo className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <p className="text-sm text-slate-500">Total trámites activos</p>
            <p className="text-2xl font-black text-blue-900">{tramites.filter(t => t.faseActual !== "COMPLETADO" && t.faseActual !== "RECHAZADO").length}</p>
          </div>
        </div>
      </div>

      {/* Main action */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="bg-violet-50 border-b border-violet-100 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-violet-200 rounded-full flex items-center justify-center">
              <FileSearch className="w-4 h-4 text-violet-700" />
            </div>
            <div>
              <h3 className="font-bold text-violet-900">Verificación de Solicitudes</h3>
              <p className="text-xs text-violet-700">Fase 2 del circuito de designación de ayudantes</p>
            </div>
          </div>
          {pendientes.length > 0 && (
            <span className="bg-amber-400 text-amber-900 text-xs font-bold px-3 py-1 rounded-full">
              {pendientes.length} pendiente{pendientes.length > 1 ? "s" : ""}
            </span>
          )}
        </div>

        <div className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 font-semibold">Trámite</th>
                  <th className="px-4 py-3 font-semibold">Responsable</th>
                  <th className="px-4 py-3 font-semibold">Alumno</th>
                  <th className="px-4 py-3 font-semibold text-center">Nota</th>
                  <th className="px-4 py-3 font-semibold">Estado</th>
                  <th className="px-4 py-3 font-semibold text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {solicitudes.map((sol) => (
                  <tr key={sol.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-4 font-medium text-slate-900">{sol.tipo}</td>
                    <td className="px-4 py-4 text-slate-700">{sol.responsable}</td>
                    <td className="px-4 py-4 text-slate-700">
                      <div>{sol.alumno}</div>
                      <div className="text-xs text-slate-400">DNI: {sol.dni}</div>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className={`inline-flex items-center justify-center min-w-[32px] px-2 py-1 rounded text-xs font-bold border ${
                        sol.nota >= 8 ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-rose-50 text-rose-700 border-rose-200"
                      }`}>
                        {sol.nota}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-xs font-semibold px-2 py-1 rounded bg-slate-100 text-slate-700 border border-slate-200">
                        {sol.estado}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right">
                      {(sol.estado === "Pendiente V1" || sol.estado === "Pendiente V2") && (
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => procesarSolicitud(sol.id, sol.estado, sol.nota)} className="text-xs font-medium text-violet-700 bg-violet-50 hover:bg-violet-100 px-3 py-1.5 rounded-lg border border-violet-200 transition-colors" title="Aprobar Paso">
                            {sol.estado === "Pendiente V1" ? "Verificar 1" : "Verificar 2 y PDF"}
                          </button>
                          <button onClick={() => rechazarSolicitud(sol.id)} className="p-1.5 text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors border border-rose-200" title="Rechazar">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                      {sol.estado === "RF Generada" && <span className="text-emerald-600 bg-emerald-50 px-2 py-1 rounded text-xs font-semibold">Generada</span>}
                      {sol.estado === "Rechazado" && <span className="text-rose-600 bg-rose-50 px-2 py-1 rounded text-xs font-semibold">Rechazada</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Notifications quick view */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-slate-500" />
            <h3 className="font-semibold text-slate-800">Notificaciones recientes</h3>
          </div>
          <Link to="/notificaciones" className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1">
            Ver todas <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
        <div className="divide-y divide-slate-50">
          {notificaciones.filter(n => n.rolDestino === "ADMINISTRATIVO").slice(0, 3).map(n => (
            <div key={n.id} className={`px-6 py-3 flex items-start gap-3 ${!n.leida ? "bg-amber-50/40" : ""}`}>
              {n.tipo === "alerta" ? <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" /> : <CheckCheck className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />}
              <div>
                <p className={`text-sm ${!n.leida ? "font-semibold text-slate-800" : "text-slate-600"}`}>{n.titulo}</p>
                <p className="text-xs text-slate-400 mt-0.5">{n.mensaje}</p>
              </div>
            </div>
          ))}
          {notificaciones.filter(n => n.rolDestino === "ADMINISTRATIVO").length === 0 && (
            <div className="px-6 py-6 text-center text-slate-400 text-sm">Sin notificaciones</div>
          )}
        </div>
      </div>
    </div>
  );
}
