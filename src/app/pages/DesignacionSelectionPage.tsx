import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { CheckCircle2, GraduationCap } from "lucide-react";
import { useUser } from "../context/UserContext";

export function DesignacionSelectionPage() {
  const navigate = useNavigate();
  const { user, confirmDesignacionSelection } = useUser();
  const designaciones = user.designaciones ?? [];
  const [localSelectedId, setLocalSelectedId] = useState("");

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
      <div className="w-full max-w-2xl rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
        <div className="bg-blue-900 text-white p-6 sm:p-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold leading-tight">Seleccione la materia activa</h1>
              <p className="text-blue-100 text-sm mt-1">
                Bienvenido, {user.nombre}. Esta seleccion define el rol para esta sesion.
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 sm:p-8 space-y-5">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Asignatura y rol</label>
            <select
              value={localSelectedId}
              onChange={(event) => setLocalSelectedId(event.target.value)}
              disabled={designaciones.length === 0}
              className="w-full rounded-xl border-2 border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition-colors focus:border-blue-600 focus:bg-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              <option value="">Seleccione una designacion...</option>
              {designaciones.map((designacion, index) => {
                const optionId = designacion.id ?? `${designacion.asignatura}-${index}`;
                return (
                  <option key={optionId} value={optionId}>
                    {designacion.asignatura || "Sin asignatura"} - {designacion.rolSistema || "docente"}
                  </option>
                );
              })}
            </select>
          </div>

          {activeDesignacion && (
            <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-950">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 mt-0.5 text-blue-700 shrink-0" />
                <div>
                  <p className="font-semibold">{activeDesignacion.asignatura || "Sin asignatura"}</p>
                  <p className="text-xs mt-1 text-blue-800">
                    Carrera: {activeDesignacion.carrera || "Sin carrera"} - Rol: {activeDesignacion.rolSistema || "docente"}
                  </p>
                </div>
              </div>
            </div>
          )}

          {designaciones.length === 0 && (
            <p className="text-sm text-red-600 font-medium">
              No se encontraron designaciones para este docente. Revise la tabla designaciones y las politicas de lectura.
            </p>
          )}

          <div className="flex justify-end">
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
