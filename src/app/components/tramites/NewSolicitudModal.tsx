import React, { useEffect, useMemo, useRef, useState } from "react";
import { useTramites } from "../../context/TramitesContext";
import { useUser } from "../../context/UserContext";
import { differenceInDays, format } from "date-fns";
import { AlertCircle, Plus, Save, Trash2, X } from "lucide-react";
import { hasSupabaseConfig, supabase } from "../../../lib/supabaseClient";

interface ModalProps {
  onClose: () => void;
}

type AlumnoForm = {
  nombreCompleto: string;
  dni: string;
  sexoGramatical: "F" | "M";
};

type GenericRow = Record<string, unknown>;

type CarreraOption = {
  id: string;
  nombre: string;
};

type AsignaturaOption = {
  id: string;
  nombre: string;
  anio: string;
  regimen: "Semestral" | "Anual";
  idCarrera: string;
};

function getString(row: GenericRow, keys: string[], fallback = ""): string {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" || typeof value === "bigint") return String(value);
  }
  return fallback;
}

function normalizeYearLabel(raw: string): string {
  const yearNumber = Number.parseInt(raw.replace(/\D/g, ""), 10);
  if (!Number.isFinite(yearNumber)) return raw.trim();
  if (yearNumber === 1) return "1ro";
  if (yearNumber === 2) return "2do";
  if (yearNumber === 3) return "3ro";
  if (yearNumber === 4) return "4to";
  if (yearNumber === 5) return "5to";
  return String(yearNumber);
}

function normalizeRegimen(raw: string): "Semestral" | "Anual" {
  return raw.toLowerCase().includes("anual") ? "Anual" : "Semestral";
}

function normalizeText(raw: string): string {
  return raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export const NewSolicitudModal: React.FC<ModalProps> = ({ onClose }) => {
  const { user, selectedDesignacion, isSelectedDesignacionResponsable } = useUser();
  const { crearTramite, cicloConfig } = useTramites();

  const [error, setError] = useState("");
  const [carreras, setCarreras] = useState<CarreraOption[]>([]);
  const [asignaturas, setAsignaturas] = useState<AsignaturaOption[]>([]);
  const [materiasFiltradas, setMateriasFiltradas] = useState<AsignaturaOption[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogError, setCatalogError] = useState("");

  const [selectedCarreraId, setSelectedCarreraId] = useState("");
  const [carrera, setCarrera] = useState("");
  const [carreraBusqueda, setCarreraBusqueda] = useState("");
  const [showCarreraOptions, setShowCarreraOptions] = useState(false);

  const [selectedAsignaturaId, setSelectedAsignaturaId] = useState("");
  const [asignatura, setAsignatura] = useState("");
  const [materiaBusqueda, setMateriaBusqueda] = useState("");
  const [showMateriaOptions, setShowMateriaOptions] = useState(false);

  const [anioCarrera, setAnioCarrera] = useState("");
  const [regimen, setRegimen] = useState<"" | "Semestral" | "Anual">("");
  const [notaAprobacion, setNotaAprobacion] = useState("");
  const [alumnos, setAlumnos] = useState<AlumnoForm[]>([{ nombreCompleto: "", dni: "", sexoGramatical: "F" }]);
  const [submitting, setSubmitting] = useState(false);

  const carreraOptionsRef = useRef<HTMLDivElement>(null);
  const materiaOptionsRef = useRef<HTMLDivElement>(null);
  const didInitialPrefillRef = useRef(false);

  const fechaSolicitud = useMemo(() => format(new Date(), "dd/MM/yyyy"), []);
  const isAcademicDocente = user.rol === "DOCENTE" || user.rol === "DOCENTE_RESPONSABLE";
  const canSubmitForAcademicRole = !isAcademicDocente || isSelectedDesignacionResponsable();
  const responsableDesignaciones = useMemo(
    () => (user.designaciones ?? []).filter((designacion) => designacion.academicRole === "DOCENTE_RESPONSABLE"),
    [user.designaciones],
  );

  const diasDesdeInicio = differenceInDays(new Date(), new Date(cicloConfig.inicioClases));
  const fueraDeTermino = diasDesdeInicio > 15;

  const carrerasBuscadas = useMemo(() => {
    const query = carreraBusqueda.trim().toLowerCase();
    if (!query) return carreras;
    return carreras.filter((item) => item.nombre.toLowerCase().includes(query));
  }, [carreras, carreraBusqueda]);

  const materiasBuscadas = useMemo(() => {
    const query = materiaBusqueda.trim().toLowerCase();
    if (!query) return materiasFiltradas;
    return materiasFiltradas.filter((item) => item.nombre.toLowerCase().includes(query));
  }, [materiasFiltradas, materiaBusqueda]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (carreraOptionsRef.current && !carreraOptionsRef.current.contains(target)) setShowCarreraOptions(false);
      if (materiaOptionsRef.current && !materiaOptionsRef.current.contains(target)) setShowMateriaOptions(false);
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    let active = true;

    const loadCatalogs = async () => {
      if (!hasSupabaseConfig) {
        setCarreras([]);
        setAsignaturas([]);
        setMateriasFiltradas([]);
        return;
      }

      setCatalogLoading(true);
      setCatalogError("");

      const [carrerasRes, asignaturasRes] = await Promise.all([
        supabase
          .from("carreras")
          .select("id_carrera,nombre")
          .order("nombre", { ascending: true })
          .limit(1000),
        supabase
          .from("asignaturas")
          .select("id_asignatura,nombre,anio,regimen,id_carrera")
          .order("nombre", { ascending: true })
          .limit(5000),
      ]);

      if (!active) return;

      if (carrerasRes.error) {
        setCatalogError(`No se pudieron cargar carreras: ${carrerasRes.error.message}`);
        setCatalogLoading(false);
        return;
      }

      if (asignaturasRes.error) {
        setCatalogError(`No se pudieron cargar asignaturas: ${asignaturasRes.error.message}`);
        setCatalogLoading(false);
        return;
      }

      const carrerasRows = (carrerasRes.data ?? []) as GenericRow[];
      const asignaturasRows = (asignaturasRes.data ?? []) as GenericRow[];

      const mappedCarreras = carrerasRows
        .map((row) => {
          const id = getString(row, ["id_carrera", "id"], "");
          const nombre = getString(row, ["nombre"], "");
          if (!id || !nombre) return null;
          return { id, nombre } satisfies CarreraOption;
        })
        .filter((item): item is CarreraOption => Boolean(item));

      const mappedAsignaturas = asignaturasRows
        .map((row) => {
          const id = getString(row, ["id_asignatura", "id"], "");
          const nombre = getString(row, ["nombre"], "");
          const idCarrera = getString(row, ["id_carrera"], "");
          if (!id || !nombre || !idCarrera) return null;

          return {
            id,
            nombre,
            anio: normalizeYearLabel(getString(row, ["anio", "año"], "")),
            regimen: normalizeRegimen(getString(row, ["regimen"], "Semestral")),
            idCarrera,
          } satisfies AsignaturaOption;
        })
        .filter((item): item is AsignaturaOption => Boolean(item));

      setCarreras(mappedCarreras);
      setAsignaturas(mappedAsignaturas);
      setCatalogLoading(false);
    };

    loadCatalogs();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!selectedCarreraId) {
      setMateriasFiltradas([]);
      return;
    }
    const baseMaterias = asignaturas.filter((item) => item.idCarrera === selectedCarreraId);
    if (!isAcademicDocente) {
      setMateriasFiltradas(baseMaterias);
      return;
    }

    const selectedCarreraNombre = carreras.find((item) => item.id === selectedCarreraId)?.nombre ?? "";
    const responsableIds = new Set(responsableDesignaciones.map((item) => item.idAsignatura).filter(Boolean));
    const responsableKeys = new Set(
      responsableDesignaciones.map(
        (item) => `${normalizeText(item.carrera)}::${normalizeText(item.asignatura)}`,
      ),
    );

    const filtered = baseMaterias.filter((item) => {
      if (responsableIds.has(item.id)) return true;
      const key = `${normalizeText(selectedCarreraNombre)}::${normalizeText(item.nombre)}`;
      return responsableKeys.has(key);
    });

    setMateriasFiltradas(filtered);
  }, [asignaturas, carreras, selectedCarreraId, isAcademicDocente, responsableDesignaciones]);

  useEffect(() => {
    if (didInitialPrefillRef.current) return;
    if (carreras.length === 0 || asignaturas.length === 0) return;

    const sourceDesignacion = selectedDesignacion?.academicRole === "DOCENTE_RESPONSABLE"
      ? selectedDesignacion
      : responsableDesignaciones[0] ?? selectedDesignacion;
    if (!sourceDesignacion) return;

    const designacionCarrera = sourceDesignacion.carrera?.trim() ?? "";
    const designacionAsignatura = sourceDesignacion.asignatura?.trim() ?? "";

    if (!designacionCarrera && !designacionAsignatura) {
      didInitialPrefillRef.current = true;
      return;
    }

    const matchedCarrera = designacionCarrera
      ? carreras.find((item) => item.nombre.trim().toLowerCase() === designacionCarrera.toLowerCase())
      : undefined;

    if (!matchedCarrera) {
      didInitialPrefillRef.current = true;
      return;
    }

    setSelectedCarreraId(matchedCarrera.id);
    setCarrera(matchedCarrera.nombre);
    setCarreraBusqueda(matchedCarrera.nombre);

    if (designacionAsignatura) {
      const matchedAsignatura = asignaturas.find(
        (item) =>
          item.idCarrera === matchedCarrera.id
          && normalizeText(item.nombre) === normalizeText(designacionAsignatura),
      );

      if (matchedAsignatura) {
        setSelectedAsignaturaId(matchedAsignatura.id);
        setAsignatura(matchedAsignatura.nombre);
        setMateriaBusqueda(matchedAsignatura.nombre);
        setAnioCarrera(matchedAsignatura.anio);
        setRegimen(matchedAsignatura.regimen);
      }
    }

    didInitialPrefillRef.current = true;
  }, [selectedDesignacion, responsableDesignaciones, carreras, asignaturas]);

  const resetMateriaStep = () => {
    setSelectedAsignaturaId("");
    setAsignatura("");
    setMateriaBusqueda("");
    setAnioCarrera("");
    setRegimen("");
    setShowMateriaOptions(false);
  };

  const handleCarreraSelect = (nextCarrera: CarreraOption) => {
    setSelectedCarreraId(nextCarrera.id);
    setCarrera(nextCarrera.nombre);
    setCarreraBusqueda(nextCarrera.nombre);
    setShowCarreraOptions(false);
    resetMateriaStep();
  };

  const handleMateriaSelect = (materia: AsignaturaOption) => {
    setSelectedAsignaturaId(materia.id);
    setAsignatura(materia.nombre);
    setMateriaBusqueda(materia.nombre);
    setAnioCarrera(materia.anio);
    setRegimen(materia.regimen);
    setShowMateriaOptions(false);
  };

  const handleNotaBlur = () => {
    if (!notaAprobacion.trim()) return;
    const nota = Number.parseFloat(notaAprobacion);
    if (Number.isFinite(nota) && nota < 8) {
      const message = "La nota debe ser igual o mayor a 8.";
      setError(message);
      window.alert(message);
    }
  };

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

    if (isAcademicDocente && !selectedDesignacion) {
      setError("Debe seleccionar una designación activa antes de crear la solicitud.");
      return;
    }

    if (!canSubmitForAcademicRole) {
      setError("Solo una designación con rol_sistema = 'responsable' puede crear solicitudes.");
      return;
    }

    if (fueraDeTermino) {
      setError(`Han pasado ${diasDesdeInicio} días desde el inicio de clases. El límite es 15 días.`);
      return;
    }

    const alumnosValidos = alumnos
      .map((a) => ({ nombreCompleto: a.nombreCompleto.trim(), dni: a.dni.trim(), sexoGramatical: a.sexoGramatical }))
      .filter((a) => a.nombreCompleto && a.dni);
    const nota = Number.parseFloat(notaAprobacion);

    if (!selectedCarreraId || !carrera || !selectedAsignaturaId || !anioCarrera || !asignatura.trim() || !regimen) {
      setError("Complete todos los campos académicos obligatorios de forma secuencial.");
      return;
    }

    if (!Number.isFinite(nota) || nota < 8) {
      const message = "La nota de aprobación debe ser mayor o igual a 8. Puede ingresar decimales, por ejemplo 8, 8.1 o 8.01.";
      setError(message);
      window.alert(message);
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
        carrera,
        idCarrera: selectedCarreraId,
        anioCarrera,
        materia: asignatura.trim(),
        idAsignatura: selectedAsignaturaId,
        regimen,
        tipoSolicitud: "ayudante_alumno",
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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[80] flex items-start justify-center px-3 sm:px-4 pt-20 sm:pt-24 pb-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[calc(100dvh-5rem)] sm:max-h-[calc(100dvh-6rem)] flex flex-col animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-5 border-b border-gray-100 shrink-0">
          <h2 className="text-xl font-semibold text-gray-900">Nueva Solicitud de Ayudantía</h2>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-5 overflow-y-auto">
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

          {catalogError && (
            <div className="bg-red-50 text-red-700 p-3 rounded-md text-sm border border-red-100 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" /> {catalogError}
            </div>
          )}

          {isAcademicDocente && selectedDesignacion && !canSubmitForAcademicRole && (
            <div className="bg-amber-50 text-amber-800 p-3 rounded-md text-sm border border-amber-100 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              La asignatura activa es <strong>{selectedDesignacion.asignatura || "Sin asignatura"}</strong> con rol{" "}
              <strong>{selectedDesignacion.rolSistema}</strong>. Cambie la designación activa a una de tipo{" "}
              <strong>responsable</strong> para poder enviar la solicitud.
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

            <div className="space-y-1 md:col-span-1" ref={carreraOptionsRef}>
              <label className="text-sm font-medium text-gray-700">Carrera *</label>
              <div className="relative">
                <input
                  type="text"
                  value={carreraBusqueda}
                  onFocus={() => {
                    if (!isAcademicDocente) setShowCarreraOptions(true);
                  }}
                  onChange={(e) => {
                    if (isAcademicDocente) return;
                    setCarreraBusqueda(e.target.value);
                    setSelectedCarreraId("");
                    setCarrera("");
                    resetMateriaStep();
                    setShowCarreraOptions(true);
                  }}
                  placeholder={isAcademicDocente ? "Carrera autocompletada" : "Seleccionar carrera"}
                  readOnly={isAcademicDocente}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                />
                {!isAcademicDocente && showCarreraOptions && (
                  <div className="absolute z-20 mt-1 w-full rounded-md border border-gray-200 bg-white shadow-lg max-h-56 overflow-y-auto">
                    {catalogLoading ? (
                      <p className="px-3 py-2 text-sm text-gray-500">Cargando carreras...</p>
                    ) : carrerasBuscadas.length === 0 ? (
                      <p className="px-3 py-2 text-sm text-gray-500">No hay carreras disponibles</p>
                    ) : (
                      carrerasBuscadas.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onMouseDown={(event) => {
                            event.preventDefault();
                            handleCarreraSelect(item);
                          }}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 transition-colors"
                        >
                          {item.nombre}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>

            {selectedCarreraId && (
              <div className="space-y-1 md:col-span-2" ref={materiaOptionsRef}>
                <label className="text-sm font-medium text-gray-700">Materia *</label>
                <div className="relative">
                  <input
                    type="text"
                    value={materiaBusqueda}
                    onFocus={() => setShowMateriaOptions(true)}
                    onChange={(e) => {
                      setMateriaBusqueda(e.target.value);
                      setSelectedAsignaturaId("");
                      setAsignatura("");
                      setAnioCarrera("");
                      setRegimen("");
                      setShowMateriaOptions(true);
                    }}
                    placeholder="Buscar materia..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  />
                  {showMateriaOptions && (
                    <div className="absolute z-20 mt-1 w-full rounded-md border border-gray-200 bg-white shadow-lg max-h-56 overflow-y-auto">
                      {catalogLoading ? (
                        <p className="px-3 py-2 text-sm text-gray-500">Cargando materias...</p>
                      ) : materiasBuscadas.length === 0 ? (
                        <p className="px-3 py-2 text-sm text-gray-500">No hay materias para esta carrera</p>
                      ) : (
                        materiasBuscadas.map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            onMouseDown={(event) => {
                              event.preventDefault();
                              handleMateriaSelect(item);
                            }}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 transition-colors"
                          >
                            {item.nombre}
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {selectedAsignaturaId && (
              <>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Año de la carrera *</label>
                  <input
                    type="text"
                    value={anioCarrera}
                    readOnly
                    disabled
                    className="w-full px-3 py-2 border border-gray-200 bg-gray-50 rounded-md text-gray-600"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Régimen *</label>
                  <input
                    type="text"
                    value={regimen}
                    readOnly
                    disabled
                    className="w-full px-3 py-2 border border-gray-200 bg-gray-50 rounded-md text-gray-600"
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
                    onBlur={handleNotaBlur}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    placeholder="Ej: 8.00"
                  />
                </div>
              </>
            )}
          </div>

          {isAcademicDocente && selectedCarreraId && materiasFiltradas.length === 0 && (
            <div className="bg-amber-50 text-amber-800 p-3 rounded-md text-sm border border-amber-100 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              No hay materias con rol responsable para la carrera seleccionada.
            </div>
          )}

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
              disabled={fueraDeTermino || submitting || !canSubmitForAcademicRole}
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
