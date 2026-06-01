import { useEffect } from "react";
import { useUser } from "../context/UserContext";
import { useTramites } from "../context/TramitesContext";
import { Link } from "react-router";
import {
  FileSearch, CheckCheck, Clock, ChevronRight, AlertTriangle,
  ListTodo, Bell, Filter
} from "lucide-react";
import { PendingAlert } from "../components/PendingAlert";
import { TramiteCard } from "../components/tramites/TramiteCard";

export function AdministrativoDashboard() {
  const { user } = useUser();
  const { tramites, notificaciones, loading, error, setRolActivo } = useTramites();

  useEffect(() => {
    setRolActivo("ADMINISTRATIVO");
  }, [setRolActivo]);

  const pendientes = tramites.filter(
    (t) => t.responsableActual === "ADMINISTRATIVO" && t.estado !== "FINALIZADO" && t.estado !== "RECHAZADO",
  );
  const procesados = tramites.filter(
    (t) => t.responsableActual !== "ADMINISTRATIVO" && t.historial.some((evento) => evento.rol === "ADMINISTRATIVO"),
  );
  const myNotifs = notificaciones.filter((n) => n.rolDestino === "ADMINISTRATIVO" && !n.leida);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8">
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Mesa de Ayuda</h1>
        <p className="text-slate-500 mt-2">Bienvenida, {user.nombre}. Gestione las verificaciones de solicitudes de ayudantia.</p>
      </div>

      {myNotifs.length > 0 && (
        <PendingAlert
          titulo={`${myNotifs.length} notificacion${myNotifs.length > 1 ? "es" : ""} pendiente${myNotifs.length > 1 ? "s" : ""}`}
          mensaje={myNotifs[0].mensaje}
          dismissible={false}
        />
      )}

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
            <p className="text-sm text-slate-500">Total tramites activos</p>
            <p className="text-2xl font-black text-blue-900">
              {tramites.filter((t) => t.estado !== "FINALIZADO" && t.estado !== "RECHAZADO").length}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="bg-violet-50 border-b border-violet-100 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-violet-200 rounded-full flex items-center justify-center">
              <FileSearch className="w-4 h-4 text-violet-700" />
            </div>
            <div>
              <h3 className="font-bold text-violet-900">Verificacion de Solicitudes</h3>
              <p className="text-xs text-violet-700">Fase 2 del circuito de designacion de ayudantes</p>
            </div>
          </div>
          {pendientes.length > 0 && (
            <span className="bg-amber-400 text-amber-900 text-xs font-bold px-3 py-1 rounded-full">
              {pendientes.length} pendiente{pendientes.length > 1 ? "s" : ""}
            </span>
          )}
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {loading ? (
            <div className="text-center py-12 text-slate-500">Cargando solicitudes...</div>
          ) : pendientes.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-200">
              <div className="mx-auto h-10 w-10 text-slate-400 mb-3 bg-white rounded-full flex items-center justify-center">
                <Filter className="h-5 w-5" />
              </div>
              <p className="text-sm text-slate-600">No hay solicitudes pendientes para Administrativo.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendientes.map((tramite) => (
                <TramiteCard key={tramite.id} tramite={tramite} />
              ))}
            </div>
          )}

          {procesados.length > 0 && (
            <div className="mt-4 text-xs text-slate-500">
              Verificados por Administrativo: <strong>{procesados.length}</strong>
            </div>
          )}
        </div>
      </div>

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
          {notificaciones.filter((n) => n.rolDestino === "ADMINISTRATIVO").slice(0, 3).map((n) => (
            <div key={n.id} className={`px-6 py-3 flex items-start gap-3 ${!n.leida ? "bg-amber-50/40" : ""}`}>
              {n.tipo === "alerta" ? <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" /> : <CheckCheck className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />}
              <div>
                <p className={`text-sm ${!n.leida ? "font-semibold text-slate-800" : "text-slate-600"}`}>{n.titulo}</p>
                <p className="text-xs text-slate-400 mt-0.5">{n.mensaje}</p>
              </div>
            </div>
          ))}
          {notificaciones.filter((n) => n.rolDestino === "ADMINISTRATIVO").length === 0 && (
            <div className="px-6 py-6 text-center text-slate-400 text-sm">Sin notificaciones</div>
          )}
        </div>
      </div>
    </div>
  );
}
