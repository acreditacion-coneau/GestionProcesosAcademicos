import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { CheckCircle2, GraduationCap } from "lucide-react";
import { useUser } from "../context/UserContext";

export function DesignacionSelectionPage() {
  const navigate = useNavigate();
  const { user, selectedDesignacionId, confirmDesignacionSelection } = useUser();
  const designaciones = user.designaciones ?? [];

  const defaultId = selectedDesignacionId ?? designaciones[0]?.id ?? "";
  const [localSelectedId, setLocalSelectedId] = useState(defaultId);

  const activeDesignacion = useMemo(
    () => designaciones.find((designacion) => designacion.id === localSelectedId) ?? null,
    [designaciones, localSelectedId],
  );

  const handleContinue = () => {
    if (!localSelectedId) return;
    confirmDesignacionSelection(localSelectedId);
    navigate("/", { replace: true });
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 sm:p-8">
      <div className="w-full max-w-3xl rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
        <div className="bg-blue-900 text-white p-6 sm:p-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold leading-tight">Seleccione la materia activa</h1>
              <p className="text-blue-100 text-sm mt-1">
                Bienvenido, {user.nombre}. Elegí con qué designación vas a trabajar en esta sesión.
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 sm:p-8">
          <div className="space-y-3">
            {designaciones.map((designacion, index) => {
              const optionId = designacion.id ?? `${designacion.asignatura}-${index}`;
              const isSelected = localSelectedId === optionId;
              const roleLabel = designacion.academicRole === "DOCENTE_RESPONSABLE" ? "Responsable de Cátedra" : "Docente";

              return (
                <label
                  key={optionId}
                  className={`block rounded-xl border-2 p-4 cursor-pointer transition-colors ${
                    isSelected ? "border-blue-600 bg-blue-50" : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="radio"
                      name="designacion"
                      value={optionId}
                      checked={isSelected}
                      onChange={() => setLocalSelectedId(optionId)}
                      className="mt-1"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-900">
                        {designacion.asignatura || "Sin asignatura"}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        Carrera: {designacion.carrera || "Sin carrera"} · Cargo: {designacion.cargo || "Sin cargo"}
                      </p>
                      <p className="text-xs mt-1">
                        <span className={`font-semibold ${designacion.academicRole === "DOCENTE_RESPONSABLE" ? "text-emerald-700" : "text-slate-600"}`}>
                          Rol: {roleLabel}
                        </span>
                      </p>
                    </div>
                    {isSelected && <CheckCircle2 className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />}
                  </div>
                </label>
              );
            })}
          </div>

          <div className="mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <p className="text-xs text-slate-500">
              {activeDesignacion
                ? `Designación seleccionada: ${activeDesignacion.asignatura || "Sin asignatura"} (${activeDesignacion.rolSistema}).`
                : "Seleccione una designación para continuar."}
            </p>
            <button
              type="button"
              onClick={handleContinue}
              disabled={!localSelectedId}
              className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-sm font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
            >
              Continuar al portal
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
