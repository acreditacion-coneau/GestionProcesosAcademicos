import { useUser } from "../context/UserContext";
import { useTramites } from "../context/TramitesContext";
import { AlertTriangle, Info, CheckCircle2, Bell, CheckCheck, ArrowLeft } from "lucide-react";
import { Link } from "react-router";
import type { Notificacion } from "../types/tramites";

function NotifIcon({ tipo }: { tipo: Notificacion["tipo"] }) {
  if (tipo === "alerta") return <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center shrink-0"><AlertTriangle className="w-4 h-4 text-amber-500" /></div>;
  if (tipo === "exito") return <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center shrink-0"><CheckCircle2 className="w-4 h-4 text-emerald-500" /></div>;
  return <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center shrink-0"><Info className="w-4 h-4 text-blue-500" /></div>;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "justo ahora";
  if (mins < 60) return `hace ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `hace ${hrs}h`;
  return `hace ${Math.floor(hrs / 24)} días`;
}

export function NotificacionesPage() {
  const { user } = useUser();
  const { notificaciones, marcarLeida, marcarTodasLeidas, unreadCount } = useTramites();

  const myNotifs = notificaciones.filter(n => n.rolDestino === user.rol);
  const unread = unreadCount(user.rol);

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <Link to="/" className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-800 mb-4 transition-colors">
          <ArrowLeft className="w-4 h-4 mr-1" /> Volver al inicio
        </Link>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
              <Bell className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Notificaciones</h2>
              <p className="text-sm text-slate-500">{myNotifs.length} notificaciones · {unread} sin leer</p>
            </div>
          </div>
          {unread > 0 && (
            <button
              onClick={() => marcarTodasLeidas(user.rol)}
              className="flex items-center gap-2 text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-xl border border-blue-200 transition-colors"
            >
              <CheckCheck className="w-4 h-4" /> Marcar todas como leídas
            </button>
          )}
        </div>
      </div>

      {myNotifs.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center text-slate-400">
          <Bell className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>No hay notificaciones</p>
        </div>
      ) : (
        <div className="space-y-2">
          {myNotifs.map(n => (
            <div
              key={n.id}
              onClick={() => marcarLeida(n.id)}
              className={`bg-white rounded-2xl border shadow-sm p-5 flex gap-4 cursor-pointer transition-all hover:shadow ${
                !n.leida ? "border-amber-200 bg-amber-50/30" : "border-slate-100"
              }`}
            >
              <NotifIcon tipo={n.tipo} />
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-3">
                  <p className={`text-sm leading-snug ${!n.leida ? "font-semibold text-slate-800" : "font-medium text-slate-600"}`}>
                    {n.titulo}
                  </p>
                  <div className="flex items-center gap-2 shrink-0">
                    {!n.leida && <span className="w-2.5 h-2.5 bg-amber-400 rounded-full" />}
                    <span className="text-xs text-slate-400 whitespace-nowrap">{timeAgo(n.fecha)}</span>
                  </div>
                </div>
                <p className="text-sm text-slate-500 mt-1 leading-relaxed">{n.mensaje}</p>
                {n.tramiteId && (
                  <Link to="/ayudantes" className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium mt-2">
                    Ver trámite {n.tramiteId}
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
