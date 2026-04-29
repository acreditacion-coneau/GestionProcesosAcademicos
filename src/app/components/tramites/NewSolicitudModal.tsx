import React, { useMemo, useState } from "react";
import { useTramites } from "../../context/TramitesContext";
import { useUser } from "../../context/UserContext";
import { differenceInDays, format } from "date-fns";
import { AlertCircle, Plus, Save, Trash2, X } from "lucide-react";

interface ModalProps {
  onClose: () => void;
}

type AlumnoForm = {
  nombreCompleto: string;
  dni: string;
  sexoGramatical: "F" | "M";
};

const YEAR_OPTIONS = ["1ro", "2do", "3ro", "4to", "5to"];

export const NewSolicitudModal: React.FC<ModalProps> = ({ onClose }) => {
  const { user } = useUser();
  const { crearTramite, cicloConfig } = useTramites();
  const [error, setError] = useState("");
  const [carrera, setCarrera] = useState(user.carrera === "Todas" ? "Arquitectura" : user.carrera);
  const [anioCarrera, setAnioCarrera] = useState("");
  const [asignatura, setAsignatura] = useState(user.materia === "-" ? "" : user.materia);
  const [regimen, setRegimen] = useState<"Semestral" | "Anual">("Semestral");
  const [notaAprobacion, setNotaAprobacion] = useState("");
  const [alumnos, setAlumnos] = useState<AlumnoForm[]>([{ nombreCompleto: "", dni: "", sexoGramatical: "F" }]);
  const [submitting, setSubmitting] = useState(false);

  const fechaSolicitud = useMemo(() => format(new Date(), "dd/MM/yyyy"), []);

  const diasDesdeInicio = differenceInDays(new Date(), new Date(cicloConfig.inicioClases));
  const fueraDeTermino = diasDesdeInicio > 15;

  const addAlumno = () => {
    if (alumnos.length >= 2) {
      setError("Una solicitud puede incluir como máximo 2 alumnos.");
      return;
    }
    setAlumnos((prev) => [...prev, { nombreCompleto: "", dni: "", sexoGramatical: "F" }]);
  };

  const removeAlumno = (index: number) => {
    setAlumnos((prev) => (prev.length === 1 ? prev : prev.filter((_, idx) => idx !== index)));
  };

  const updateAlumno = (index: number, field: keyof AlumnoForm, value: string) => {
    setAlumnos((prev) => prev.map((a, idx) => (idx === index ? { ...a, [field]: value } : a)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (fueraDeTermino) {
      setError(`Han pasado ${diasDesdeInicio} días desde el inicio de clases. El límite es 15 días.`);
      return;
    }

    const alumnosValidos = alumnos
      .map((a) => ({ nombreCompleto: a.nombreCompleto.trim(), dni: a.dni.trim(), sexoGramatical: a.sexoGramatical }))
      .filter((a) => a.nombreCompleto && a.dni);
    const nota = Number.parseFloat(notaAprobacion);

    if (!carrera || !anioCarrera || !asignatura.trim() || !regimen) {
      setError("Complete todos los campos obligatorios de la solicitud.");
      return;
    }
    if (!Number.isFinite(nota) || nota < 8) {
      setError("La nota de aprobación debe ser numérica y mayor o igual a 8.");
      return;
    }

    if (alumnosValidos.length === 0) {
      setError("Debe cargar al menos un alumno con nombre completo y DNI.");
      return;
    }

    if (alumnosValidos.length > 2) {
      setError("Una solicitud puede incluir como máximo 2 alumnos.");
      return;
    }

    if (alumnosValidos.length !== alumnos.length) {
      setError("Revise la lista de alumnos: hay filas incompletas.");
      return;
    }

    setSubmitting(true);
    try {
      await crearTramite({
        carrera: carrera as "Arquitectura" | "Lic. en Diseño de Interiores" | "Diseño Industrial" | "Lic. en Gestión Eficiente de la Energía",
        anioCarrera,
        materia: asignatura.trim(),
        regimen,
        notaAprobacion: nota,
        alumnosPropuestos: alumnosValidos,
      });
      onClose();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "No se pudo enviar la solicitud.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="text-xl font-semibold text-gray-900">Nueva Solicitud de Ayudantía</h2>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          {fueraDeTermino && (
            <div className="bg-red-50 text-red-800 p-4 rounded-lg border border-red-200 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
              <div className="text-sm">
                <p className="font-semibold">Plazo vencido</p>
                <p className="mt-1">
                  Han pasado {diasDesdeInicio} días desde el inicio de clases ({cicloConfig.inicioClases}). El plazo máximo reglamentario es de 15 días.
                </p>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 text-red-700 p-3 rounded-md text-sm border border-red-100 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" /> {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Fecha de la solicitud</label>
              <input
                type="text"
                value={fechaSolicitud}
                readOnly
                className="w-full px-3 py-2 border border-gray-200 bg-gray-50 rounded-md text-gray-600"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Carrera *</label>
              <select
                value={carrera}
                onChange={(e) => setCarrera(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              >
                <option value="Arquitectura">Arquitectura</option>
                <option value="Lic. en Diseño de Interiores">Lic. en Diseño de Interiores</option>
                <option value="Diseño Industrial">Diseño Industrial</option>
                <option value="Lic. en Gestión Eficiente de la Energía">Lic. en Gestión Eficiente de la Energía</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Año de la carrera *</label>
              <select
                value={anioCarrera}
                onChange={(e) => setAnioCarrera(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              >
                <option value="">Seleccionar…</option>
                {YEAR_OPTIONS.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Régimen *</label>
              <div className="flex items-center gap-5 py-2">
                {(["Semestral", "Anual"] as const).map((opcion) => (
                  <label key={opcion} className="inline-flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                    <input
                      type="radio"
                      checked={regimen === opcion}
                      onChange={() => setRegimen(opcion)}
                    />
                    {opcion}
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-1 md:col-span-2">
              <label className="text-sm font-medium text-gray-700">Asignatura *</label>
              <input
                type="text"
                value={asignatura}
                onChange={(e) => setAsignatura(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                placeholder="Ej: Diseño 1"
              />
            </div>

            <div className="space-y-1 md:col-span-2">
              <label className="text-sm font-medium text-gray-700">Nota con la que aprobó la materia *</label>
              <input
                type="number"
                min="8"
                step="0.01"
                value={notaAprobacion}
                onChange={(e) => setNotaAprobacion(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                placeholder="Ej: 8.00"
              />
            </div>
          </div>

          <div className="border rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-800">Alumnos propuestos *</h3>
              <button
                type="button"
                onClick={addAlumno}
                disabled={alumnos.length >= 2}
                className="inline-flex items-center gap-1 text-sm text-blue-700 hover:text-blue-800 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="w-4 h-4" />
                Agregar alumno
              </button>
            </div>

            {alumnos.map((alumno, index) => (
              <div key={`alumno-${index}`} className="grid grid-cols-1 md:grid-cols-[1fr_220px_160px_auto] gap-3 items-end">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-600">Nombre completo</label>
                  <input
                    type="text"
                    value={alumno.nombreCompleto}
                    onChange={(e) => updateAlumno(index, "nombreCompleto", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    placeholder="Apellido y Nombre"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-600">DNI</label>
                  <input
                    type="text"
                    value={alumno.dni}
                    onChange={(e) => updateAlumno(index, "dni", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    placeholder="Sin puntos"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-600">Sexo</label>
                  <select
                    value={alumno.sexoGramatical}
                    onChange={(e) => updateAlumno(index, "sexoGramatical", e.target.value as "F" | "M")}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  >
                    <option value="F">Femenino</option>
                    <option value="M">Masculino</option>
                  </select>
                </div>
                <button
                  type="button"
                  onClick={() => removeAlumno(index)}
                  disabled={alumnos.length === 1}
                  className="h-10 px-3 text-sm text-rose-600 hover:bg-rose-50 rounded-md border border-rose-200 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          <div className="pt-4 border-t border-gray-100 flex justify-end gap-3 mt-6">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md transition-colors">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={fueraDeTermino || submitting}
              className="px-4 py-2 text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-md transition-colors flex items-center gap-2"
            >
              <Save className="w-4 h-4" /> Enviar solicitud
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
