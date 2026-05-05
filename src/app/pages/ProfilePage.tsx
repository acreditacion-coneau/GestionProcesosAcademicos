import { BriefcaseBusiness, GraduationCap, UserCircle } from "lucide-react";
import { useUser } from "../context/UserContext";

const ROLE_LABELS: Record<string, string> = {
  decano: "Decano",
  secretaria_academica: "Secretaria Academica",
  secretaria_tecnica: "Secretaria Tecnica",
  jefe_carrera: "Jefe de Carrera",
  responsable_extension: "Responsable de Extension",
  responsable_investigacion: "Responsable de Investigacion",
  administrativo: "Administrativo",
  docente: "Docente",
};

export function ProfilePage() {
  const { user } = useUser();
  const designaciones = user.designaciones ?? [];

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <section className="bg-white border border-slate-100 shadow-sm rounded-2xl p-6 md:p-7">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-800 flex items-center justify-center">
            <UserCircle className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{user.nombre} {user.apellido ?? ""}</h1>
            <p className="text-sm text-slate-500 mt-1">{user.email}</p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="rounded-xl border border-slate-200 p-4">
            <p className="text-xs uppercase tracking-wide font-semibold text-slate-500">DNI</p>
            <p className="mt-1 font-semibold text-slate-900">{user.dni}</p>
          </div>
          <div className="rounded-xl border border-slate-200 p-4">
            <p className="text-xs uppercase tracking-wide font-semibold text-slate-500">Rol institucional</p>
            <p className="mt-1 font-semibold text-slate-900">{ROLE_LABELS[user.globalRole ?? "docente"] ?? user.globalRole}</p>
          </div>
          <div className="rounded-xl border border-slate-200 p-4">
            <p className="text-xs uppercase tracking-wide font-semibold text-slate-500">Rol activo</p>
            <p className="mt-1 font-semibold text-slate-900">{user.rol}</p>
          </div>
          <div className="rounded-xl border border-slate-200 p-4">
            <p className="text-xs uppercase tracking-wide font-semibold text-slate-500">ID docente</p>
            <p className="mt-1 font-semibold text-slate-900">{user.idDocente ?? "No asociado"}</p>
          </div>
        </div>
      </section>

      {user.idDocente && (
        <section className="bg-white border border-slate-100 shadow-sm rounded-2xl p-6 md:p-7">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-blue-800" />
            <h2 className="text-lg font-bold text-slate-900">Materias asignadas</h2>
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
            {designaciones.map((designacion, index) => (
              <div key={designacion.id ?? `${designacion.asignatura}-${index}`} className="rounded-xl border border-slate-200 p-4">
                <div className="flex items-start gap-2">
                  <BriefcaseBusiness className="w-4 h-4 text-slate-500 mt-0.5" />
                  <div>
                    <p className="font-semibold text-slate-900">{designacion.asignatura || "Sin asignatura"}</p>
                    <p className="text-xs text-slate-500 mt-1">
                      {designacion.carrera || "Sin carrera"} - {designacion.cargo || "Sin cargo"} - {designacion.rolSistema}
                    </p>
                  </div>
                </div>
              </div>
            ))}

            {designaciones.length === 0 && (
              <p className="text-sm text-slate-500">No hay designaciones cargadas para este docente.</p>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
