import { useState, useRef, useEffect } from "react";
import { Bell, X, CheckCheck, AlertTriangle, Info, CheckCircle2, ChevronRight } from "lucide-react";
import { useTramites } from "../context/TramitesContext";
import { useUser } from "../context/UserContext";
import type { Notificacion } from "../types/tramites";
import { Link } from "react-router";

function NotifIcon({ tipo }: { tipo: Notificacion["tipo"] }) {
  if (tipo === "alerta") return <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />;
  if (tipo === "exito") return <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />;
  return <Info className="w-4 h-4 text-blue-500 shrink-0" />;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "justo ahora";
  if (mins < 60) return `hace ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `hace ${hrs} h`;
  return `hace ${Math.floor(hrs / 24)} días`;
}

export function NotificacionesBell() {
  const { user } = useUser();
  const { notificaciones, unreadCount, marcarLeida, marcarTodasLeidas } = useTramites();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const myNotifs = notificaciones.filter(n => n.rolDestino === user.rol);
  const count = unreadCount(user.rol);

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      {/* Bell button */}
      <button
        onClick={() => setOpen(o => !o)}
        className="relative w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors"
        title="Notificaciones"
      >
        <Bell className="w-5 h-5 text-white" />
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-amber-400 text-slate-900 text-xs font-bold rounded-full flex items-center justify-center animate-pulse">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-12 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-slate-600" />
              <span className="font-bold text-slate-800 text-sm">Notificaciones</span>
              {count > 0 && (
                <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2 py-0.5 rounded-full border border-amber-200">
                  {count} nuevas
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {count > 0 && (
                <button
                  onClick={() => marcarTodasLeidas(user.rol)}
                  className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 font-medium"
                >
                  <CheckCheck className="w-3.5 h-3.5" /> Marcar todas
                </button>
              )}
              <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="max-h-[400px] overflow-y-auto divide-y divide-slate-50">
            {myNotifs.length === 0 ? (
              <div className="px-4 py-8 text-center text-slate-400 text-sm">
                No hay notificaciones
              </div>
            ) : (
              myNotifs.map(n => (
                <div
                  key={n.id}
                  className={`flex gap-3 px-4 py-3 hover:bg-slate-50 transition-colors cursor-pointer ${!n.leida ? "bg-amber-50/60" : ""}`}
                  onClick={() => marcarLeida(n.id)}
                >
                  <div className="mt-0.5">
                    <NotifIcon tipo={n.tipo} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-sm ${!n.leida ? "font-semibold text-slate-800" : "font-medium text-slate-600"} leading-snug`}>
                        {n.titulo}
                      </p>
                      {!n.leida && (
                        <span className="w-2 h-2 bg-amber-400 rounded-full shrink-0 mt-1.5" />
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{n.mensaje}</p>
                    <div className="flex items-center justify-between mt-1.5">
                      <span className="text-xs text-slate-400">{timeAgo(n.fecha)}</span>
                      {n.tramiteId && (
                        <Link
                          to="/ayudantes"
                          onClick={() => setOpen(false)}
                          className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-0.5 font-medium"
                        >
                          Ver trámite <ChevronRight className="w-3 h-3" />
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-slate-100 px-4 py-3">
            <Link
              to="/notificaciones"
              onClick={() => setOpen(false)}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center justify-center gap-1"
            >
              Ver todas las notificaciones <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
