// ============================================================
// AYUDANTES FLOW — Role-aware view for the full 7-phase circuit
// Each role sees only their relevant actions and queue.
// ============================================================

import { useState, useEffect } from "react";
import { Link } from "react-router";
import {
  ArrowLeft, CheckCircle2, XCircle, ChevronDown, ChevronUp,
  FileText, Upload, Eye, Clock, AlertTriangle, User,
  CheckCheck, Plus, FileSpreadsheet, ExternalLink, Loader2,
  History, ChevronRight, RotateCcw,
} from "lucide-react";
import { useUser } from "../context/UserContext";
import { useTramites } from "../context/TramitesContext";
import { PendingAlert } from "../components/PendingAlert";
import type { TramiteAyudante, FaseTramite, CarreraOption, RegimenTipo } from "../types/tramites";
import { FASE_META, FASES_ORDERED } from "../types/tramites";

// ── Helpers ────────────────────────────────────────────────────

function fmtDate(iso?: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function FaseStep({ fase, active, done }: { fase: FaseTramite; active: boolean; done: boolean }) {
  const meta = FASE_META[fase];
  if (fase === "RECHAZADO" || fase === "COMPLETADO") return null;
  return (
    <div className={`flex flex-col items-center text-center w-14 shrink-0`}>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${
        done ? "bg-emerald-500 border-emerald-500 text-white" :
        active ? "bg-blue-900 border-blue-900 text-white scale-110" :
        "bg-white border-slate-200 text-slate-400"
      }`}>
        {done ? <CheckCheck className="w-3.5 h-3.5" /> : FASES_ORDERED.indexOf(fase) + 1}
      </div>
      <p className={`text-[9px] leading-tight mt-1 ${active ? "text-blue-900 font-semibold" : done ? "text-emerald-700" : "text-slate-400"}`}>
        {meta.label.replace(/Fase \d+ — /, "")}
      </p>
    </div>
  );
}

function TramiteTracker({ tramite }: { tramite: TramiteAyudante }) {
  const fases: FaseTramite[] = [
    "FASE_1_SOLICITUD", "FASE_2_VERIFICACION", "FASE_3_VALIDACION_JEFE",
    "FASE_4_INICIO_SECRETARIA", "FASE_5_INFORME_DOCENTE", "FASE_6_CIERRE_JEFE",
    "FASE_7_CIERRE_SECRETARIA", "FASE_8_SAT",
  ];
  const currentIdx = FASES_ORDERED.indexOf(tramite.faseActual);

  return (
    <div className="bg-slate-50 rounded-xl p-4 overflow-x-auto">
      <div className="flex items-center gap-1 min-w-max">
        {fases.map((f, i) => (
          <div key={f} className="flex items-center">
            <FaseStep fase={f} active={tramite.faseActual === f} done={currentIdx > i && tramite.faseActual !== "RECHAZADO"} />
            {i < fases.length - 1 && (
              <div className={`w-5 h-0.5 mx-0.5 rounded ${currentIdx > i && tramite.faseActual !== "RECHAZADO" ? "bg-emerald-400" : "bg-slate-200"}`} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function FaseBadge({ fase }: { fase: FaseTramite }) {
  const colors: Partial<Record<FaseTramite, string>> = {
    FASE_1_SOLICITUD: "bg-blue-100 text-blue-800 border-blue-200",
    FASE_2_VERIFICACION: "bg-violet-100 text-violet-800 border-violet-200",
    FASE_3_VALIDACION_JEFE: "bg-amber-100 text-amber-800 border-amber-200",
    FASE_4_INICIO_SECRETARIA: "bg-teal-100 text-teal-800 border-teal-200",
    FASE_5_INFORME_DOCENTE: "bg-blue-100 text-blue-800 border-blue-200",
    FASE_6_CIERRE_JEFE: "bg-amber-100 text-amber-800 border-amber-200",
    FASE_7_CIERRE_SECRETARIA: "bg-teal-100 text-teal-800 border-teal-200",
    FASE_8_SAT: "bg-amber-100 text-amber-800 border-amber-200",
    COMPLETADO: "bg-emerald-100 text-emerald-800 border-emerald-200",
    RECHAZADO: "bg-rose-100 text-rose-800 border-rose-200",
  };
  return (
    <span className={`inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full border ${colors[fase] ?? "bg-slate-100 text-slate-600 border-slate-200"}`}>
      {FASE_META[fase]?.label ?? fase}
    </span>
  );
}

function Historial({ historial }: { historial: TramiteAyudante["historial"] }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button onClick={() => setOpen(o => !o)} className="flex items-center gap-2 text-xs text-slate-500 hover:text-slate-700 font-medium mb-2">
        <History className="w-3.5 h-3.5" />
        Historial del trámite
        {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>
      {open && (
        <div className="space-y-2 border-l-2 border-slate-100 pl-3 ml-2">
          {historial.map((h, i) => (
            <div key={i} className="relative">
              <div className="absolute -left-[17px] top-1 w-3 h-3 rounded-full bg-slate-200 border-2 border-white" />
              <p className="text-xs font-semibold text-slate-700">{h.accion}</p>
              <p className="text-xs text-slate-400">{h.actor} · {fmtDate(h.fecha)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Role-specific views ────────────────────────────────────────

// DOCENTE_RESPONSABLE — Phase 1 (create) + Phase 5 (informe) + track own tramites
function DocenteView() {
  const { user } = useUser();
  const { tramites, actionCrearTramite, actionSubirInforme, loading } = useTramites();

  const misTramites = tramites.filter(t => t.responsableDni === user.dni);
  const pendingInforme = misTramites.filter(t => t.faseActual === "FASE_5_INFORME_DOCENTE");

  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  // Form state
  const [carrera, setCarrera] = useState<CarreraOption>("Arquitectura");
  const [anio, setAnio] = useState("");
  const [asignatura, setAsignatura] = useState(user.materia);
  const [regimen, setRegimen] = useState<RegimenTipo>("Semestral");
  const [alumnoNombre, setAlumnoNombre] = useState("");
  const [alumnoDni, setAlumnoDni] = useState("");

  // Informe state
  const [informeTexto, setInformeTexto] = useState<Record<string, string>>({});
  const [submittingInforme, setSubmittingInforme] = useState<string | null>(null);

  const handleCrear = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await actionCrearTramite({
        carrera,
        anioCarrera: anio,
        asignatura,
        regimen,
        responsableNombre: user.nombre,
        responsableDni: user.dni,
        responsableEmail: user.email,
        alumnos: [{ nombre: alumnoNombre, dni: alumnoDni }],
      });
      setSuccessMsg("Solicitud enviada. El equipo administrativo recibirá una notificación.");
      setShowForm(false);
      setAlumnoNombre(""); setAlumnoDni("");
      setTimeout(() => setSuccessMsg(""), 5000);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubirInforme = async (tramiteId: string) => {
    const texto = informeTexto[tramiteId];
    if (!texto?.trim()) return;
    setSubmittingInforme(tramiteId);
    try {
      await actionSubirInforme(tramiteId, { informeDesempeno: texto, docenteNombre: user.nombre });
      setInformeTexto(p => ({ ...p, [tramiteId]: "" }));
    } finally {
      setSubmittingInforme(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Pending alerts */}
      {pendingInforme.length > 0 && (
        <PendingAlert
          titulo={`${pendingInforme.length === 1 ? "Hay 1 informe pendiente" : `Hay ${pendingInforme.length} informes pendientes`} de carga`}
          mensaje="El ciclo de ayudantía finalizó y debe cargar el informe de desempeño del alumno. Sin este informe el trámite queda estancado."
          dismissible={false}
        />
      )}

      {successMsg && (
        <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 animate-in fade-in duration-300">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <p className="text-sm text-emerald-800 font-medium">{successMsg}</p>
        </div>
      )}

      {/* New request button */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-slate-800">Mis Designaciones de Ayudantes</h3>
        <button
          onClick={() => setShowForm(o => !o)}
          className="flex items-center gap-2 bg-blue-900 hover:bg-blue-800 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" /> Nueva solicitud
        </button>
      </div>

      {/* Phase 1 form */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-in slide-in-from-top-2 duration-300">
          <div className="bg-blue-50 border-b border-blue-100 px-6 py-4 flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-900 rounded-full flex items-center justify-center text-white text-xs font-bold">1</div>
            <div>
              <h4 className="font-bold text-blue-900">Fase 1 — Nueva Solicitud de Ayudantía</h4>
              <p className="text-xs text-blue-700">Complete los datos. Los campos del docente se autocompletan.</p>
            </div>
          </div>
          <form onSubmit={handleCrear} className="p-6 space-y-6">
            {/* Docente data (readonly) */}
            <div className="bg-slate-50 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-slate-500 mb-1 block">Docente responsable</label>
                <input disabled value={user.nombre} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-500 cursor-not-allowed" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 mb-1 block">DNI</label>
                <input disabled value={user.dni} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-500 cursor-not-allowed" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">Carrera *</label>
                <select value={carrera} onChange={e => setCarrera(e.target.value as CarreraOption)} required className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-500">
                  <option value="Arquitectura">Arquitectura</option>
                  <option value="Lic. en Diseño de Interiores">Lic. en Diseño de Interiores</option>
                  <option value="Diseño Industrial">Diseño Industrial</option>
                  <option value="Lic. en Gestión Eficiente de la Energía">Lic. en Gestión Eficiente de la Energía</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">Año de la carrera *</label>
                <select value={anio} onChange={e => setAnio(e.target.value)} required className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-500">
                  <option value="">Seleccionar…</option>
                  {["1ro", "2do", "3ro", "4to", "5to"].map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs font-semibold text-slate-600 mb-1 block">Asignatura *</label>
                <input value={asignatura} onChange={e => setAsignatura(e.target.value)} required placeholder="Ej. Diseño Arquitectónico I" className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">Régimen *</label>
                <div className="flex gap-3">
                  {(["Semestral", "Anual"] as RegimenTipo[]).map(r => (
                    <label key={r} className="flex items-center gap-2 cursor-pointer">
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${regimen === r ? "border-blue-600" : "border-slate-300"}`}>
                        {regimen === r && <div className="w-2 h-2 bg-blue-600 rounded-full" />}
                      </div>
                      <input type="radio" className="sr-only" checked={regimen === r} onChange={() => setRegimen(r)} />
                      <span className="text-sm text-slate-700">{r}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                <User className="w-4 h-4" /> Alumno postulante
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1 block">Nombre completo *</label>
                  <input value={alumnoNombre} onChange={e => setAlumnoNombre(e.target.value)} required placeholder="Ej. María López" className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1 block">DNI del alumno *</label>
                  <input value={alumnoDni} onChange={e => setAlumnoDni(e.target.value)} required placeholder="Sin puntos ni espacios" className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-500" />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 font-medium">Cancelar</button>
              <button type="submit" disabled={submitting} className="flex items-center gap-2 bg-blue-900 hover:bg-blue-800 text-white text-sm font-medium px-6 py-2.5 rounded-xl transition-colors shadow-sm disabled:opacity-60">
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Enviar solicitud
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tramites list */}
      {loading ? (
        <div className="flex items-center justify-center py-12 text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin mr-2" /> Cargando trámites…
        </div>
      ) : misTramites.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center text-slate-400">
          <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">No tiene trámites de ayudantía activos.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {misTramites.map(t => (
            <TramiteCard key={t.id} tramite={t}>
              {/* Phase 5 action */}
              {t.faseActual === "FASE_5_INFORME_DOCENTE" && (
                <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
                  <PendingAlert
                    titulo="Acción requerida: Informe de desempeño"
                    mensaje={`Cargue el informe de desempeño del alumno ${t.alumnos[0]?.nombre}. Fecha límite: ${t.regimen === "Semestral" ? "1 de julio" : "1 de diciembre"}.`}
                    dismissible={false}
                  />
                  <textarea
                    value={informeTexto[t.id] ?? ""}
                    onChange={e => setInformeTexto(p => ({ ...p, [t.id]: e.target.value }))}
                    rows={4}
                    placeholder="Describa detalladamente el desempeño del alumno durante el período de ayudantía…"
                    className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-500 resize-none"
                  />
                  <div className="flex justify-end">
                    <button
                      onClick={() => handleSubirInforme(t.id)}
                      disabled={!informeTexto[t.id]?.trim() || submittingInforme === t.id}
                      className="flex items-center gap-2 bg-blue-900 hover:bg-blue-800 text-white text-sm font-medium px-5 py-2 rounded-xl transition-colors disabled:opacity-50"
                    >
                      {submittingInforme === t.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                      Subir informe
                    </button>
                  </div>
                </div>
              )}
            </TramiteCard>
          ))}
        </div>
      )}
    </div>
  );
}

// ADMINISTRATIVO — Phase 2 queue
function AdministrativoView() {
  const { user } = useUser();
  const { tramites, actionVerificar, loading } = useTramites();

  const queue = tramites.filter(t => t.faseActual === "FASE_2_VERIFICACION");
  const processed = tramites.filter(t =>
    t.verificadoPor && t.faseActual !== "FASE_2_VERIFICACION"
  );

  const [submitting, setSubmitting] = useState<string | null>(null);
  const [fichaData, setFichaData] = useState<Record<string, { nota: string; fichaFile: string }>>({});

  const handleVerificar = async (tramiteId: string) => {
    const d = fichaData[tramiteId];
    if (!d?.nota || !d?.fichaFile) return;
    const nota = parseFloat(d.nota);
    if (nota < 8) {
      alert("La ficha académica no acredita nota ≥ 8. El alumno no cumple el requisito.");
      return;
    }
    setSubmitting(tramiteId);
    try {
      await actionVerificar(tramiteId, {
        fichaAcademica: d.fichaFile,
        notaAlumno: nota,
        verificadoPor: user.nombre,
      });
    } finally {
      setSubmitting(null);
    }
  };

  return (
    <div className="space-y-6">
      {queue.length > 0 && (
        <PendingAlert
          titulo={`${queue.length} solicitud${queue.length > 1 ? "es" : ""} pendiente${queue.length > 1 ? "s" : ""} de verificación`}
          mensaje="Debe verificar los datos del alumno contra el sistema y adjuntar la Ficha Académica con la nota ≥ 8."
          dismissible={false}
        />
      )}

      <h3 className="text-lg font-bold text-slate-800">Cola de Verificación — Fase 2</h3>

      {loading ? (
        <div className="flex items-center justify-center py-12 text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin mr-2" /> Cargando…
        </div>
      ) : queue.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center text-slate-400">
          <CheckCheck className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">No hay solicitudes pendientes de verificación.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {queue.map(t => (
            <TramiteCard key={t.id} tramite={t}>
              <div className="mt-4 pt-4 border-t border-slate-100 space-y-4">
                <PendingAlert
                  titulo="Acción requerida: Verificar ficha académica"
                  mensaje="Consulte el sistema académico, descargue/genere la Ficha Académica del alumno (nota ≥ 8) y adjúntela al trámite."
                  dismissible={false}
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-600 mb-1 block">Nombre del archivo / N° de ficha *</label>
                    <input
                      value={fichaData[t.id]?.fichaFile ?? ""}
                      onChange={e => setFichaData(p => ({ ...p, [t.id]: { ...p[t.id], fichaFile: e.target.value } }))}
                      placeholder="Ej. ficha_maria_lopez_2026.pdf"
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 mb-1 block">Nota acreditada en ficha *</label>
                    <input
                      type="number"
                      min="0"
                      max="10"
                      step="0.1"
                      value={fichaData[t.id]?.nota ?? ""}
                      onChange={e => setFichaData(p => ({ ...p, [t.id]: { ...p[t.id], nota: e.target.value } }))}
                      placeholder="Mínimo 8.0"
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <button
                    onClick={() => handleVerificar(t.id)}
                    disabled={!fichaData[t.id]?.fichaFile || !fichaData[t.id]?.nota || submitting === t.id}
                    className="flex items-center gap-2 bg-violet-700 hover:bg-violet-800 text-white text-sm font-medium px-5 py-2 rounded-xl transition-colors disabled:opacity-50"
                  >
                    {submitting === t.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />}
                    Confirmar verificación
                  </button>
                </div>
              </div>
            </TramiteCard>
          ))}
        </div>
      )}

      {processed.length > 0 && (
        <>
          <h3 className="text-base font-semibold text-slate-600 mt-6">Verificados recientemente</h3>
          <div className="space-y-3">
            {processed.slice(0, 3).map(t => (
              <TramiteCard key={t.id} tramite={t} compact />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// JEFE_CARRERA — Phase 3 (inicio) + Phase 6 (cierre) + Phase 8 (SAT)
function JefeCarreraView() {
  const { user } = useUser();
  const { tramites, actionValidarJefeInicio, actionValidarJefeCierre, actionConfirmarSAT, loading } = useTramites();

  const fase3Queue = tramites.filter(t => t.faseActual === "FASE_3_VALIDACION_JEFE");
  const fase6Queue = tramites.filter(t => t.faseActual === "FASE_6_CIERRE_JEFE");
  const fase8Queue = tramites.filter(t => t.faseActual === "FASE_8_SAT");

  const [comentarios, setComentarios] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState<string | null>(null);

  const handleValidarInicio = async (id: string, aprobado: boolean) => {
    setSubmitting(id + "-inicio");
    try {
      await actionValidarJefeInicio(id, { aprobado, comentario: comentarios[id] ?? (aprobado ? "Aprobado." : "Rechazado."), jefeNombre: user.nombre });
      setComentarios(p => { const n = { ...p }; delete n[id]; return n; });
    } finally {
      setSubmitting(null);
    }
  };

  const handleValidarCierre = async (id: string, aprobado: boolean) => {
    setSubmitting(id + "-cierre");
    try {
      await actionValidarJefeCierre(id, { aprobado, comentario: comentarios[`cierre-${id}`] ?? (aprobado ? "Cierre aprobado." : "Informe devuelto."), jefeNombre: user.nombre });
      setComentarios(p => { const n = { ...p }; delete n[`cierre-${id}`]; return n; });
    } finally {
      setSubmitting(null);
    }
  };

  const handleSAT = async (id: string) => {
    setSubmitting(id + "-sat");
    try {
      await actionConfirmarSAT(id, { jefeNombre: user.nombre });
    } finally {
      setSubmitting(null);
    }
  };

  const pendingCount = fase3Queue.length + fase6Queue.length + fase8Queue.length;

  return (
    <div className="space-y-6">
      {pendingCount > 0 && (
        <PendingAlert
          titulo={`Tiene ${pendingCount} acción${pendingCount > 1 ? "es" : ""} pendiente${pendingCount > 1 ? "s" : ""}`}
          mensaje="Hay trámites de ayudantía esperando su intervención. Revise cada sección a continuación."
          dismissible={false}
        />
      )}

      {/* Phase 3 */}
      {fase3Queue.length > 0 && (
        <Section title="Fase 3 — Visto Bueno de Inicio" color="amber" count={fase3Queue.length}>
          {fase3Queue.map(t => (
            <TramiteCard key={t.id} tramite={t}>
              <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
                <p className="text-xs text-slate-500">
                  <strong>Alumno:</strong> {t.alumnos[0]?.nombre} (DNI {t.alumnos[0]?.dni}) · 
                  <strong> Nota acreditada:</strong> {t.notaAlumno ?? "—"} · 
                  <strong> Ficha:</strong> {t.fichaAcademica ?? "—"}
                </p>
                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1 block">Comentario (opcional)</label>
                  <input
                    value={comentarios[t.id] ?? ""}
                    onChange={e => setComentarios(p => ({ ...p, [t.id]: e.target.value }))}
                    placeholder="Observaciones sobre el perfil del alumno…"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500"
                  />
                </div>
                <div className="flex gap-3 justify-end">
                  <button
                    onClick={() => handleValidarInicio(t.id, false)}
                    disabled={submitting === t.id + "-inicio"}
                    className="flex items-center gap-1.5 text-sm font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 px-4 py-2 rounded-xl border border-rose-200 transition-colors disabled:opacity-50"
                  >
                    <XCircle className="w-4 h-4" /> Rechazar
                  </button>
                  <button
                    onClick={() => handleValidarInicio(t.id, true)}
                    disabled={submitting === t.id + "-inicio"}
                    className="flex items-center gap-1.5 text-sm font-medium text-amber-800 bg-amber-50 hover:bg-amber-100 px-4 py-2 rounded-xl border border-amber-200 transition-colors disabled:opacity-50"
                  >
                    {submitting === t.id + "-inicio" ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    Visto Bueno
                  </button>
                </div>
              </div>
            </TramiteCard>
          ))}
        </Section>
      )}

      {/* Phase 6 */}
      {fase6Queue.length > 0 && (
        <Section title="Fase 6 — Aprobación de Cierre" color="amber" count={fase6Queue.length}>
          {fase6Queue.map(t => (
            <TramiteCard key={t.id} tramite={t}>
              <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-xs font-semibold text-slate-600 mb-1">Informe de desempeño cargado:</p>
                  <p className="text-sm text-slate-700 leading-relaxed">{t.informeDesempeno}</p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1 block">Comentario de cierre</label>
                  <input
                    value={comentarios[`cierre-${t.id}`] ?? ""}
                    onChange={e => setComentarios(p => ({ ...p, [`cierre-${t.id}`]: e.target.value }))}
                    placeholder="Observaciones sobre el informe…"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500"
                  />
                </div>
                <div className="flex gap-3 justify-end">
                  <button
                    onClick={() => handleValidarCierre(t.id, false)}
                    disabled={submitting === t.id + "-cierre"}
                    className="flex items-center gap-1.5 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 px-4 py-2 rounded-xl border border-slate-200 transition-colors disabled:opacity-50"
                  >
                    <RotateCcw className="w-4 h-4" /> Devolver
                  </button>
                  <button
                    onClick={() => handleValidarCierre(t.id, true)}
                    disabled={submitting === t.id + "-cierre"}
                    className="flex items-center gap-1.5 text-sm font-medium text-amber-800 bg-amber-50 hover:bg-amber-100 px-4 py-2 rounded-xl border border-amber-200 transition-colors disabled:opacity-50"
                  >
                    {submitting === t.id + "-cierre" ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    Aprobar cierre
                  </button>
                </div>
              </div>
            </TramiteCard>
          ))}
        </Section>
      )}

      {/* Phase 8 */}
      {fase8Queue.length > 0 && (
        <Section title="Fase 8 — Carga en Sistema SAT" color="amber" count={fase8Queue.length}>
          {fase8Queue.map(t => (
            <TramiteCard key={t.id} tramite={t}>
              <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
                <PendingAlert
                  titulo="Último paso: carga en SAT"
                  mensaje="Ingrese al sistema SAT externo y cargue la información de esta ayudantía. Una vez realizado, confirme aquí para cerrar el trámite."
                  dismissible={false}
                />
                <div className="flex items-center justify-between">
                  <a href="https://sat.faud.edu.ar" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 font-medium">
                    <ExternalLink className="w-4 h-4" /> Abrir sistema SAT
                  </a>
                  <button
                    onClick={() => handleSAT(t.id)}
                    disabled={submitting === t.id + "-sat"}
                    className="flex items-center gap-1.5 text-sm font-medium text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-5 py-2 rounded-xl border border-emerald-200 transition-colors disabled:opacity-50"
                  >
                    {submitting === t.id + "-sat" ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCheck className="w-4 h-4" />}
                    Confirmar carga SAT
                  </button>
                </div>
              </div>
            </TramiteCard>
          ))}
        </Section>
      )}

      {pendingCount === 0 && !loading && (
        <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center text-slate-400">
          <CheckCheck className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">No hay trámites pendientes de su intervención.</p>
        </div>
      )}

      {/* All tramites view */}
      <h3 className="text-base font-semibold text-slate-600 mt-2">Todos los trámites activos</h3>
      <div className="space-y-3">
        {tramites.filter(t => t.faseActual !== "COMPLETADO" && t.faseActual !== "RECHAZADO").map(t => (
          <TramiteCard key={t.id} tramite={t} compact />
        ))}
      </div>
    </div>
  );
}

// SECRETARIA — Phase 4 (RF Inicio) + Phase 7 (RF Cierre)
function SecretariaView() {
  const { user } = useUser();
  const { tramites, actionEmitirRfInicio, actionEmitirRfCierre, loading } = useTramites();

  const fase4Queue = tramites.filter(t => t.faseActual === "FASE_4_INICIO_SECRETARIA");
  const fase7Queue = tramites.filter(t => t.faseActual === "FASE_7_CIERRE_SECRETARIA");

  const [rfData, setRfData] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState<string | null>(null);

  const nextRfNum = () => {
    const year = new Date().getFullYear();
    const num = String(Math.floor(Math.random() * 900) + 100);
    return `RF-${year}-${num}`;
  };

  const handleRfInicio = async (id: string) => {
    const rf = rfData[`inicio-${id}`] || nextRfNum();
    setSubmitting(id + "-inicio");
    try {
      await actionEmitirRfInicio(id, { rfInicio: rf, secretariaNombre: user.nombre });
    } finally {
      setSubmitting(null);
    }
  };

  const handleRfCierre = async (id: string) => {
    const rf = rfData[`cierre-${id}`] || nextRfNum();
    setSubmitting(id + "-cierre");
    try {
      await actionEmitirRfCierre(id, { rfCierre: rf, secretariaNombre: user.nombre });
    } finally {
      setSubmitting(null);
    }
  };

  return (
    <div className="space-y-6">
      {(fase4Queue.length > 0 || fase7Queue.length > 0) && (
        <PendingAlert
          titulo={`${fase4Queue.length + fase7Queue.length} resolución${fase4Queue.length + fase7Queue.length > 1 ? "es" : ""} por emitir`}
          mensaje="Hay trámites aprobados que requieren la emisión de Resoluciones de Facultad."
          dismissible={false}
        />
      )}

      {/* Phase 4 */}
      {fase4Queue.length > 0 && (
        <Section title="Fase 4 — Emitir RF de Inicio" color="teal" count={fase4Queue.length}>
          {fase4Queue.map(t => (
            <TramiteCard key={t.id} tramite={t}>
              <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
                <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 text-xs text-amber-800">
                  <strong>⚠ Recordatorio:</strong> La RF de Inicio NO debe compartirse con el alumno hasta completar el ciclo completo.
                </div>
                <div className="flex gap-3 items-end">
                  <div className="flex-1">
                    <label className="text-xs font-semibold text-slate-600 mb-1 block">N° de Resolución (o se genera automático)</label>
                    <input
                      value={rfData[`inicio-${t.id}`] ?? ""}
                      onChange={e => setRfData(p => ({ ...p, [`inicio-${t.id}`]: e.target.value }))}
                      placeholder={`Ej. RF-${new Date().getFullYear()}-0XX`}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500"
                    />
                  </div>
                  <button
                    onClick={() => handleRfInicio(t.id)}
                    disabled={submitting === t.id + "-inicio"}
                    className="flex items-center gap-2 bg-teal-700 hover:bg-teal-800 text-white text-sm font-medium px-5 py-2 rounded-xl transition-colors shrink-0 disabled:opacity-50"
                  >
                    {submitting === t.id + "-inicio" ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                    Emitir RF de Inicio
                  </button>
                </div>
              </div>
            </TramiteCard>
          ))}
        </Section>
      )}

      {/* Phase 7 */}
      {fase7Queue.length > 0 && (
        <Section title="Fase 7 — Emitir RF de Cierre" color="teal" count={fase7Queue.length}>
          {fase7Queue.map(t => (
            <TramiteCard key={t.id} tramite={t}>
              <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
                <div className="flex gap-3 items-end">
                  <div className="flex-1">
                    <label className="text-xs font-semibold text-slate-600 mb-1 block">N° de Resolución de Cierre</label>
                    <input
                      value={rfData[`cierre-${t.id}`] ?? ""}
                      onChange={e => setRfData(p => ({ ...p, [`cierre-${t.id}`]: e.target.value }))}
                      placeholder={`Ej. RF-${new Date().getFullYear()}-0XX`}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500"
                    />
                  </div>
                  <button
                    onClick={() => handleRfCierre(t.id)}
                    disabled={submitting === t.id + "-cierre"}
                    className="flex items-center gap-2 bg-teal-700 hover:bg-teal-800 text-white text-sm font-medium px-5 py-2 rounded-xl transition-colors shrink-0 disabled:opacity-50"
                  >
                    {submitting === t.id + "-cierre" ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                    Emitir RF de Cierre
                  </button>
                </div>
              </div>
            </TramiteCard>
          ))}
        </Section>
      )}

      {fase4Queue.length === 0 && fase7Queue.length === 0 && !loading && (
        <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center text-slate-400">
          <CheckCheck className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">No hay resoluciones pendientes de emisión.</p>
        </div>
      )}
    </div>
  );
}

// ── Shared UI components ───────────────────────────────────────

function Section({ title, color, count, children }: {
  title: string; color: string; count: number; children: React.ReactNode;
}) {
  const colorMap: Record<string, string> = {
    amber: "bg-amber-50 text-amber-900 border-amber-100",
    teal: "bg-teal-50 text-teal-900 border-teal-100",
    blue: "bg-blue-50 text-blue-900 border-blue-100",
  };
  return (
    <div>
      <div className={`flex items-center justify-between px-4 py-2 rounded-t-xl border-b ${colorMap[color] ?? colorMap.blue}`}>
        <h4 className="text-sm font-bold">{title}</h4>
        <span className="text-xs font-semibold bg-white/60 px-2 py-0.5 rounded-full border">{count}</span>
      </div>
      <div className="space-y-3 pt-3">{children}</div>
    </div>
  );
}

function TramiteCard({ tramite: t, children, compact = false }: {
  tramite: TramiteAyudante;
  children?: React.ReactNode;
  compact?: boolean;
}) {
  const [expanded, setExpanded] = useState(!compact);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div
        className="px-5 py-4 flex items-start justify-between gap-3 cursor-pointer hover:bg-slate-50/60 transition-colors"
        onClick={() => setExpanded(o => !o)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-sm font-bold text-slate-800">{t.alumnos[0]?.nombre ?? "Alumno"}</span>
            <FaseBadge fase={t.faseActual} />
            {t.faseActual !== "COMPLETADO" && t.faseActual !== "RECHAZADO" && (
              <span className="text-xs text-slate-400 font-mono">{t.id}</span>
            )}
          </div>
          <p className="text-xs text-slate-500">{t.asignatura} · {t.carrera} · {t.anioCarrera} · {t.regimen}</p>
          {!compact && (
            <p className="text-xs text-slate-400 mt-0.5">Responsable: {t.responsableNombre} · Solicitud: {fmtDate(t.fechaSolicitud)}</p>
          )}
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-slate-400 shrink-0 mt-1" /> : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0 mt-1" />}
      </div>

      {expanded && (
        <div className="px-5 pb-5 space-y-4 border-t border-slate-100 pt-4">
          <TramiteTracker tramite={t} />
          {children}
          <Historial historial={t.historial} />
        </div>
      )}
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────

export function AyudantesFlow() {
  const { user, hasAnyResponsableDesignacion } = useUser();
  const { tramites, notificaciones, marcarLeida } = useTramites();
  const isAcademicResponsable = hasAnyResponsableDesignacion();
  const effectiveRole =
    user.rol === "DOCENTE" || user.rol === "DOCENTE_RESPONSABLE"
      ? (isAcademicResponsable ? "DOCENTE_RESPONSABLE" : "DOCENTE")
      : user.rol;

  // Mark relevant notifications as read when entering the page
  useEffect(() => {
    const visibleRoles = new Set([user.rol, effectiveRole]);
    notificaciones
      .filter(n => visibleRoles.has(n.rolDestino) && !n.leida && n.tramiteId)
      .forEach(n => marcarLeida(n.id));
  }, [user.rol, effectiveRole, notificaciones, marcarLeida]);

  const roleLabels: Record<string, string> = {
    DOCENTE_RESPONSABLE: "Mis Designaciones de Ayudantes",
    ADMINISTRATIVO: "Mesa de Ayuda — Verificaciones",
    JEFE_CARRERA: "Designaciones — Panel Jefatura",
    SECRETARIA: "Designaciones — Panel Secretaría",
    DOCENTE: "Designaciones de Ayudantes",
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <Link to="/" className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-800 mb-4 transition-colors">
          <ArrowLeft className="w-4 h-4 mr-1" /> Volver al inicio
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">
              {roleLabels[effectiveRole] ?? "Designaciones de Ayudantes"}
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Circuito administrativo completo de 7 fases · Todas las partes son notificadas por sistema y email.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-semibold text-slate-600">{user.nombre}</p>
              <p className="text-xs text-slate-400">{effectiveRole}</p>
            </div>
          </div>
        </div>

        {/* Phase legend */}
        <div className="mt-4 flex flex-wrap gap-2">
          {(["DOCENTE_RESPONSABLE", "ADMINISTRATIVO", "JEFE_CARRERA", "SECRETARIA"] as const).map(rol => {
            const colorMap: Record<string, string> = {
              DOCENTE_RESPONSABLE: "bg-blue-100 text-blue-700",
              ADMINISTRATIVO: "bg-violet-100 text-violet-700",
              JEFE_CARRERA: "bg-amber-100 text-amber-700",
              SECRETARIA: "bg-teal-100 text-teal-700",
            };
            const labelMap: Record<string, string> = {
              DOCENTE_RESPONSABLE: "Docente Responsable",
              ADMINISTRATIVO: "Administrativo",
              JEFE_CARRERA: "Jefe de Carrera",
              SECRETARIA: "Secretaría",
            };
            return (
              <span key={rol} className={`text-xs font-medium px-2.5 py-1 rounded-full ${colorMap[rol]}`}>
                {labelMap[rol]}
              </span>
            );
          })}
        </div>
      </div>

      {/* Role-specific content */}
      {effectiveRole === "DOCENTE_RESPONSABLE" && <DocenteView />}
      {effectiveRole === "ADMINISTRATIVO" && <AdministrativoView />}
      {effectiveRole === "JEFE_CARRERA" && <JefeCarreraView />}
      {effectiveRole === "SECRETARIA" && <SecretariaView />}
      {effectiveRole === "DOCENTE" && (
        <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center text-slate-400">
          <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">Solo los Docentes Responsables pueden gestionar designaciones de ayudantes.</p>
        </div>
      )}
    </div>
  );
}
