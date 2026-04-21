import { useState } from "react";
import { useUser } from "../context/UserContext";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { Link } from "react-router";

export function AyudantesForm({ titulo = "Designación Ayudantes" }: { titulo?: string }) {
  const { user } = useUser();
  const [success, setSuccess] = useState(false);
  const [alumnoNombre, setAlumnoNombre] = useState("");
  const [alumnoDni, setAlumnoDni] = useState("");
  const [alumnoNota, setAlumnoNota] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (alumnoNombre && alumnoDni && alumnoNota) {
      const nota = parseFloat(alumnoNota);
      if (nota < 7) {
        setError("El promedio académico debe ser igual o superior a 7.");
        return;
      }

      setSuccess(true);
      setAlumnoNombre("");
      setAlumnoDni("");
      setAlumnoNota("");
      setTimeout(() => setSuccess(false), 5000);
    }
  };

  return (
    <div className="max-w-3xl mx-auto bg-white p-8 md:p-12 rounded-2xl shadow-sm border border-slate-100 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Link to="/" className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-800 mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4 mr-1" />
        Volver al inicio
      </Link>
      
      <h2 className="text-3xl font-bold text-slate-900 mb-8 pb-4 border-b border-slate-100">
        Formulario de {titulo}
      </h2>

      {success && (
        <div className="mb-8 p-4 bg-blue-50 text-blue-800 border border-blue-200 rounded-xl flex items-center animate-in fade-in">
          <CheckCircle2 className="w-6 h-6 mr-3 text-blue-600" />
          <div>
            <h4 className="font-semibold">Enviado con éxito a la Jefatura</h4>
            <p className="text-sm">La solicitud está pendiente del Visto Bueno del Jefe de Carrera.</p>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-8 p-4 bg-red-50 text-red-800 border border-red-200 rounded-xl flex items-center animate-in fade-in">
          <div className="w-6 h-6 mr-3 text-red-600 flex items-center justify-center font-bold">!</div>
          <div>
            <h4 className="font-semibold">Error de Validación</h4>
            <p className="text-sm">{error}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="bg-slate-50 p-6 rounded-xl border border-slate-100">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Datos del Docente (Autocompletado)</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Nombre y Apellido</label>
              <input
                type="text"
                disabled
                value={user.nombre}
                className="w-full bg-slate-100 text-slate-500 border border-slate-200 rounded-lg px-4 py-3 cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">DNI</label>
              <input
                type="text"
                disabled
                value={user.dni}
                className="w-full bg-slate-100 text-slate-500 border border-slate-200 rounded-lg px-4 py-3 cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Carrera</label>
              <input
                type="text"
                disabled
                value={user.carrera}
                className="w-full bg-slate-100 text-slate-500 border border-slate-200 rounded-lg px-4 py-3 cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Asignatura (Cargo)</label>
              <input
                type="text"
                disabled
                value={user.cargo}
                className="w-full bg-slate-100 text-slate-500 border border-slate-200 rounded-lg px-4 py-3 cursor-not-allowed"
              />
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Datos del Alumno Postulante</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Nombre Completo</label>
              <input
                type="text"
                required
                value={alumnoNombre}
                onChange={(e) => setAlumnoNombre(e.target.value)}
                placeholder="Ej. María López"
                className="w-full bg-white border border-slate-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">DNI del Alumno</label>
              <input
                type="text"
                required
                value={alumnoDni}
                onChange={(e) => setAlumnoDni(e.target.value)}
                placeholder="Sin puntos ni espacios"
                className="w-full bg-white border border-slate-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nota Promedio</label>
              <input
                type="number"
                min="1"
                max="10"
                step="0.01"
                required
                value={alumnoNota}
                onChange={(e) => setAlumnoNota(e.target.value)}
                placeholder="Ej. 8.5"
                className="w-full bg-white border border-slate-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
              />
            </div>
          </div>
        </div>

        <div className="pt-6 border-t border-slate-100 flex justify-end">
          <button
            type="submit"
            className="bg-blue-900 text-white font-medium py-3 px-8 rounded-xl hover:bg-blue-800 focus:ring-4 focus:ring-blue-100 transition-all shadow-sm"
          >
            Enviar Solicitud
          </button>
        </div>
      </form>
    </div>
  );
}
