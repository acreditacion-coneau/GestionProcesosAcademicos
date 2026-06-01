import { useMemo, useState } from "react";
import { useUser } from "../context/UserContext";
import { useTramites } from "../context/TramitesContext";
import { Briefcase, Search, Filter, Clock, CheckCircle2, FileText } from "lucide-react";

function estadoBadge(estado: string) {
  if (estado === "finalizada") return "bg-emerald-100 text-emerald-800 border-emerald-200";
  if (estado === "rechazada" || estado === "cancelada") return "bg-rose-100 text-rose-800 border-rose-200";
  if (estado === "en_revision") return "bg-violet-100 text-violet-800 border-violet-200";
  if (estado === "aprobada") return "bg-teal-100 text-teal-800 border-teal-200";
  return "bg-amber-100 text-amber-800 border-amber-200";
}

export function AdscriptosFlow() {
  const { user } = useUser();
  const { tramites, loading } = useTramites();
  const [search, setSearch] = useState("");
  const [filtro, setFiltro] = useState<"todos" | "pendientes" | "cerrados">("pendientes");

  const adscriptos = useMemo(() => {
    return tramites.filter((t) => t.tipoSolicitud.toLowerCase().includes("adscripto"));
  }, [tramites]);

  const visibles = useMemo(() => {
    const query = search.trim().toLowerCase();
    return adscriptos.filter((item) => {
      const isPendiente = item.estadoSolicitud !== "finalizada" && item.estadoSolicitud !== "rechazada" && item.estadoSolicitud !== "cancelada";
      const byFiltro =
        filtro === "todos" ? true : filtro === "pendientes" ? isPendiente : !isPendiente;

      const alumno = item.alumnosPropuestos.map((a) => a.nombreCompleto).join(" ").toLowerCase();
      const bySearch =
        !query ||
        item.idSolicitud.toLowerCase().includes(query) ||
        item.materia.toLowerCase().includes(query) ||
        item.carrera.toLowerCase().includes(query) ||
        alumno.includes(query);

      return byFiltro && bySearch;
    });
  }, [adscriptos, filtro, search]);

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-100">
        <div className="flex items-center gap-3 mb-2">
          <span className="bg-indigo-100 text-indigo-800 text-xs font-bold px-2.5 py-1 rounded-md tracking-wide">Modulo adscriptos</span>
          <span className="text-slate-400 text-sm font-medium">
            Usuario activo: {user.nombre} {user.apellido ?? ""}
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">Solicitudes de ayudante adscripto</h1>
        <p className="text-slate-500 mt-2">
          Workflow institucional: Docente - Jefatura de carrera - Secretaria tecnica - Secretaria academica.
        </p>
      </div>

      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-md">
          <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por ID, alumno, materia o carrera..."
            className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-500" />
          <select
            value={filtro}
            onChange={(e) => setFiltro(e.target.value as "todos" | "pendientes" | "cerrados")}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
          >
            <option value="pendientes">Pendientes</option>
            <option value="cerrados">Cerrados</option>
            <option value="todos">Todos</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center text-slate-500">
          Cargando solicitudes...
        </div>
      ) : visibles.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center">
          <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3 opacity-60" />
          <h3 className="text-lg font-semibold text-slate-700">No hay solicitudes para mostrar</h3>
          <p className="text-slate-500 text-sm mt-1">Ajuste los filtros o espere nuevas cargas.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {visibles.map((tramite) => (
            <div key={tramite.idSolicitud} className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-slate-100">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-mono bg-slate-100 text-slate-600 px-2 py-1 rounded border border-slate-200">{tramite.idSolicitud}</span>
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full border ${estadoBadge(tramite.estadoSolicitud)}`}>
                      {tramite.estadoSolicitud}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-slate-400" />
                    {tramite.materia || "Sin materia"}
                  </h3>
                  <p className="text-sm text-slate-500 mt-1">
                    {tramite.carrera} - Año: {tramite.anioCarrera || "-"} - Régimen: {tramite.regimen}
                  </p>
                  <p className="text-sm text-slate-600 mt-2">
                    Alumno(s): {tramite.alumnosPropuestos.map((a) => `${a.nombreCompleto} (${a.dni})`).join(" | ") || "Sin alumnos"}
                  </p>
                </div>
                <div className="md:text-right">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Responsable actual</p>
                  <p className="text-sm font-semibold text-slate-800">{tramite.responsableActual.replace(/_/g, " ")}</p>
                  <p className="text-xs text-slate-500 mt-2 inline-flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {new Date(tramite.fechaUltimaActualizacion).toLocaleDateString("es-AR")}
                  </p>
                </div>
              </div>

              <div className="mt-4 border-t border-slate-100 pt-3">
                <p className="text-xs uppercase tracking-wide text-slate-500 mb-2">Adjuntos</p>
                {tramite.documentos.length === 0 ? (
                  <p className="text-sm text-slate-500">Sin archivos adjuntos.</p>
                ) : (
                  <div className="space-y-1">
                    {tramite.documentos.map((doc) => (
                      <a
                        key={doc.id}
                        href={doc.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-800 mr-3"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        {doc.nombre}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
