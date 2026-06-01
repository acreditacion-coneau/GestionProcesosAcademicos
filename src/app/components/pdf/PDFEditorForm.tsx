import React from "react";
import type { RfInicioPdfDraft } from "../../services/pdf/pdfGenerator";

interface PDFEditorFormProps {
  draft: RfInicioPdfDraft;
  onChange: (next: RfInicioPdfDraft) => void;
  loading: boolean;
  onGenerate: () => void;
  onPreview: () => void;
  onDownload: () => void;
}

export const PDFEditorForm: React.FC<PDFEditorFormProps> = ({
  draft,
  onChange,
  loading,
  onGenerate,
  onPreview,
  onDownload,
}) => {
  const updateField = <K extends keyof RfInicioPdfDraft>(key: K, value: RfInicioPdfDraft[K]) => {
    onChange({ ...draft, [key]: value });
  };

  const updateAlumno = (index: number, key: "nombre" | "apellido" | "dni" | "sexoGramatical", value: string) => {
    const alumnos = draft.alumnos.map((alumno, idx) => {
      if (idx !== index) return alumno;
      if (key === "sexoGramatical") {
        return { ...alumno, sexoGramatical: value === "F" ? "F" : "M" };
      }
      return { ...alumno, [key]: value };
    });
    onChange({ ...draft, alumnos });
  };

  const addAlumno = () => {
    if (draft.alumnos.length >= 2) return;
    onChange({
      ...draft,
      alumnos: [...draft.alumnos, { nombre: "", apellido: "", dni: "", sexoGramatical: "M" }],
    });
  };

  const removeAlumno = (index: number) => {
    if (draft.alumnos.length <= 1) return;
    onChange({
      ...draft,
      alumnos: draft.alumnos.filter((_, idx) => idx !== index),
    });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-semibold text-gray-700">Numero resolucion</label>
          <input
            value={draft.numeroResolucion}
            onChange={(e) => updateField("numeroResolucion", e.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            placeholder="Ej: 65/2026"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-700">Nombre PDF</label>
          <input
            value={draft.nombrePdf}
            onChange={(e) => updateField("nombrePdf", e.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-700">Fecha solicitud</label>
          <input
            type="date"
            value={draft.fechaSolicitud.slice(0, 10)}
            onChange={(e) => updateField("fechaSolicitud", e.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-700">Inicio ciclo</label>
          <input
            type="date"
            value={draft.fechaInicioCiclo.slice(0, 10)}
            onChange={(e) => updateField("fechaInicioCiclo", e.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-700">Asignatura</label>
          <input
            value={draft.asignatura}
            onChange={(e) => updateField("asignatura", e.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-700">Ano</label>
          <input
            value={draft.anioAsignatura}
            onChange={(e) => updateField("anioAsignatura", e.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-700">Carrera</label>
          <input
            value={draft.carrera}
            onChange={(e) => updateField("carrera", e.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-700">Regimen</label>
          <select
            value={draft.regimen}
            onChange={(e) => updateField("regimen", e.target.value === "Anual" ? "Anual" : "Semestral")}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="Anual">Anual</option>
            <option value="Semestral">Semestral</option>
          </select>
        </div>
      </div>

      <div className="rounded-md border border-gray-200 p-3 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-gray-700">Alumnos (maximo 2)</p>
          <button
            type="button"
            onClick={addAlumno}
            disabled={draft.alumnos.length >= 2}
            className="rounded border border-gray-300 px-2 py-1 text-xs text-gray-700 disabled:opacity-40"
          >
            Agregar alumno
          </button>
        </div>

        {draft.alumnos.map((alumno, index) => (
          <div key={`alumno-${index}`} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_160px_120px_auto] gap-2 items-end">
            <div>
              <label className="text-[11px] text-gray-600">Nombre</label>
              <input
                value={alumno.nombre}
                onChange={(e) => updateAlumno(index, "nombre", e.target.value)}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-[11px] text-gray-600">Apellido</label>
              <input
                value={alumno.apellido}
                onChange={(e) => updateAlumno(index, "apellido", e.target.value)}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-[11px] text-gray-600">DNI</label>
              <input
                value={alumno.dni}
                onChange={(e) => updateAlumno(index, "dni", e.target.value)}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-[11px] text-gray-600">Genero</label>
              <select
                value={alumno.sexoGramatical}
                onChange={(e) => updateAlumno(index, "sexoGramatical", e.target.value)}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="M">Masculino</option>
                <option value="F">Femenino</option>
              </select>
            </div>
            <button
              type="button"
              onClick={() => removeAlumno(index)}
              disabled={draft.alumnos.length <= 1}
              className="h-10 rounded border border-rose-200 px-2 text-xs text-rose-600 disabled:opacity-40"
            >
              Quitar
            </button>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onGenerate}
          disabled={loading}
          className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          Generar PDF
        </button>
        <button
          type="button"
          onClick={onPreview}
          disabled={loading}
          className="rounded-md border border-blue-300 bg-white px-3 py-2 text-sm font-medium text-blue-700 disabled:opacity-50"
        >
          Previsualizar
        </button>
        <button
          type="button"
          onClick={onDownload}
          disabled={loading}
          className="rounded-md border border-blue-300 bg-white px-3 py-2 text-sm font-medium text-blue-700 disabled:opacity-50"
        >
          Descargar PDF
        </button>
      </div>
    </div>
  );
};
