import React, { useEffect, useState } from "react";
import { useTramites, type Documento } from "../../context/TramitesContext";
import { useUser } from "../../context/UserContext";
import { Check, X, AlertTriangle, Clock, Upload } from "lucide-react";
import { archiveDocument } from "../../services/archivoService";
import {
  buildRfInicioDraftFromSupabase,
  generateRfInicioPdf,
  uploadAndRegisterRfInicioPdf,
  type RfInicioPdfDraft,
} from "../../services/pdf/pdfGenerator";
import { createPdfDownload, usePdfFileName, usePdfPreview } from "../../services/pdf/pdfPreview";
import { PDFEditorForm } from "../pdf/PDFEditorForm";
import { PDFPreviewModal } from "../pdf/PDFPreviewModal";

interface ValidationPanelProps {
  tramiteId: string;
}

function rolLabel(rol: string): string {
  if (rol === "JEFE_CARRERA") return "Jefatura de Carrera";
  if (rol === "SECRETARIA") return "Secretaria Academica";
  if (rol === "SEC_TECNICA") return "Secretaria Tecnica";
  if (rol === "DOCENTE_RESPONSABLE") return "Docente responsable";
  return rol.replace(/_/g, " ");
}

function categoriaPorArchivo(fileName: string, tipoSolicitud: string) {
  const file = fileName.toLowerCase();
  if (file.includes("cv") || tipoSolicitud.includes("adscripto")) return "CV" as const;
  if (file.includes("informe")) return "INFORME" as const;
  if (file.includes("ficha")) return "FICHA" as const;
  if (file.includes("rf_inicio")) return "RF_INICIO" as const;
  if (file.includes("rf_cierre")) return "RF_CIERRE" as const;
  return "OTRO" as const;
}

function categoriaPorRol(rol: string, faseActual: number, tipoSolicitud: string) {
  if (rol === "ADMINISTRATIVO") return "FICHA" as const;
  if (rol === "DOCENTE_RESPONSABLE") return "INFORME" as const;
  if (rol === "SECRETARIA") return faseActual >= 7 ? "RF_CIERRE" as const : "RF_INICIO" as const;
  if (rol === "SEC_TECNICA" && tipoSolicitud.toLowerCase().includes("adscripto")) return "CV" as const;
  return "OTRO" as const;
}

export const ValidationPanel: React.FC<ValidationPanelProps> = ({ tramiteId }) => {
  const { tramites, rolActivo, avanzarFase, rechazarTramite, devolverTramite, cicloConfig } = useTramites();
  const { user } = useUser();
  const tramite = tramites.find((t) => t.id === tramiteId);

  const [observaciones, setObservaciones] = useState("");
  const [archivo, setArchivo] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [rfDraft, setRfDraft] = useState<RfInicioPdfDraft | null>(null);
  const [rfBlob, setRfBlob] = useState<Blob | null>(null);
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [pdfDebug, setPdfDebug] = useState(false);
  const [isPreparingPdf, setIsPreparingPdf] = useState(false);

  const cerrado = !tramite
    || tramite.estadoSolicitud === "finalizada"
    || tramite.estadoSolicitud === "rechazada"
    || tramite.estadoSolicitud === "cancelada";
  const isResponsable = Boolean(tramite) && !cerrado && tramite.responsableActual === rolActivo;
  const categoriaEsperada = tramite ? categoriaPorRol(rolActivo, tramite.faseActual, tramite.tipoSolicitud) : ("OTRO" as const);
  const requierePdf = categoriaEsperada !== "OTRO";
  const requiereRfInicioAutomatico = rolActivo === "SECRETARIA" && categoriaEsperada === "RF_INICIO";

  const previewUrl = usePdfPreview(rfBlob);
  const fileName = usePdfFileName(rfDraft?.nombrePdf ?? "RF_INICIO_AYUDANTIA.pdf");

  useEffect(() => {
    let alive = true;
    if (!tramite || !requiereRfInicioAutomatico) return;

    setIsPreparingPdf(true);
    setError("");

    buildRfInicioDraftFromSupabase({
      idSolicitud: tramite.idSolicitud,
      tramiteFallback: tramite,
      cicloConfigFallback: cicloConfig,
    })
      .then((draft) => {
        if (!alive) return;
        setRfDraft(draft);
      })
      .catch((loadError) => {
        if (!alive) return;
        setError(loadError instanceof Error ? loadError.message : "No se pudieron preparar los datos de la resolucion.");
      })
      .finally(() => {
        if (!alive) return;
        setIsPreparingPdf(false);
      });

    return () => {
      alive = false;
    };
  }, [tramite, requiereRfInicioAutomatico, cicloConfig]);

  const generatePdfDraft = async (debugMode: boolean = false) => {
    if (!rfDraft) throw new Error("No hay datos para generar el PDF.");
    if (!rfDraft.numeroResolucion.trim()) throw new Error("Debe ingresar el numero de resolucion.");

    const generated = await generateRfInicioPdf({
      ...rfDraft,
      nombrePdf: fileName,
    }, debugMode);

    setRfBlob(generated.blob);
    setRfDraft(generated.draft);
    return generated;
  };

  const handleGeneratePdf = async () => {
    setError("");
    setIsPreparingPdf(true);
    try {
      await generatePdfDraft(pdfDebug);
    } catch (pdfError) {
      setError(pdfError instanceof Error ? pdfError.message : "No se pudo generar el PDF.");
    } finally {
      setIsPreparingPdf(false);
    }
  };

  const handlePreviewPdf = async () => {
    setError("");
    setIsPreparingPdf(true);
    try {
      await generatePdfDraft(pdfDebug);
      setShowPdfModal(true);
    } catch (pdfError) {
      setError(pdfError instanceof Error ? pdfError.message : "No se pudo previsualizar el PDF.");
    } finally {
      setIsPreparingPdf(false);
    }
  };

  const handleDownloadPdf = async () => {
    setError("");
    setIsPreparingPdf(true);
    try {
      const generated = await generatePdfDraft(false);
      createPdfDownload(generated.blob, generated.fileName);
    } catch (downloadError) {
      setError(downloadError instanceof Error ? downloadError.message : "No se pudo descargar el PDF.");
    } finally {
      setIsPreparingPdf(false);
    }
  };

  const handleAprobar = async () => {
    setError("");
    setIsSubmitting(true);
    try {
      if (!tramite) throw new Error("No se encontro el tramite.");
      let nuevoDoc: Documento | undefined;

      if (requierePdf && !archivo && !requiereRfInicioAutomatico) {
        throw new Error("Debe adjuntar el PDF obligatorio para esta fase.");
      }

      if (rolActivo === "JEFE_CARRERA" && !observaciones.trim()) {
        throw new Error("Debe dejar observaciones en la validacion del Jefe de Carrera.");
      }

      if (requiereRfInicioAutomatico) {
        const generated = await generatePdfDraft(false);
        const archived = await uploadAndRegisterRfInicioPdf({
          generated,
          idUsuario: user.idUsuario,
        });

        nuevoDoc = {
          id: Math.random().toString(36).slice(2, 9),
          nombre: generated.fileName,
          tipo: "RF_INICIO",
          fecha: new Date().toISOString(),
          url: archived.publicUrl,
        };
      } else if (archivo) {
        const isPdf = archivo.type === "application/pdf" || archivo.name.toLowerCase().endsWith(".pdf");
        if (!isPdf) throw new Error("Solo se permiten archivos PDF.");

        const archived = await archiveDocument({
          idSolicitud: tramite.idSolicitud,
          tipo: categoriaEsperada === "OTRO" ? categoriaPorArchivo(archivo.name, tramite.tipoSolicitud) : categoriaEsperada,
          fileName: archivo.name,
          blob: archivo,
          actor: rolActivo,
          idUsuario: user.idUsuario,
        });

        nuevoDoc = {
          id: Math.random().toString(36).slice(2, 9),
          nombre: archivo.name,
          tipo: categoriaEsperada === "OTRO" ? categoriaPorArchivo(archivo.name, tramite.tipoSolicitud) : categoriaEsperada,
          fecha: new Date().toISOString(),
          url: archived.url,
        };
      }

      await avanzarFase(tramite.id, "avance_workflow", observaciones, nuevoDoc);
      setObservaciones("");
      setArchivo(null);
      setRfBlob(null);
      setShowPdfModal(false);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "No se pudo avanzar la solicitud.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRechazar = async () => {
    if (!tramite) {
      setError("No se encontro el tramite.");
      return;
    }
    if (!observaciones.trim()) {
      setError("Debe indicar un motivo para rechazar.");
      return;
    }
    setError("");
    setIsSubmitting(true);
    try {
      await rechazarTramite(tramite.id, observaciones.trim());
      setObservaciones("");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "No se pudo rechazar la solicitud.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDevolver = async () => {
    if (!tramite) {
      setError("No se encontro el tramite.");
      return;
    }
    if (!observaciones.trim()) {
      setError("Debe indicar observaciones para devolver.");
      return;
    }
    setError("");
    setIsSubmitting(true);
    try {
      await devolverTramite(tramite.id, observaciones.trim(), Math.max(1, tramite.faseActual - 1));
      setObservaciones("");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "No se pudo devolver la solicitud.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!tramite) return null;

  if (!isResponsable) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-md p-4 mt-4 flex items-start text-gray-600">
        <Clock className="w-5 h-5 mr-2 mt-0.5 text-gray-400" />
        {cerrado ? (
          <p className="text-sm">La solicitud se encuentra cerrada.</p>
        ) : (
          <p className="text-sm">
            Esta solicitud esta en manos de <strong>{rolLabel(tramite.responsableActual)}</strong>.
          </p>
        )}
      </div>
    );
  }

  return (
    <>
      <div className="bg-white border-2 border-yellow-100 rounded-lg p-5 mt-4 shadow-sm animate-in fade-in slide-in-from-bottom-2">
        <h4 className="font-semibold text-gray-900 flex items-center mb-4">
          <AlertTriangle className="w-5 h-5 text-yellow-500 mr-2" />
          Accion requerida - {rolLabel(rolActivo)}
        </h4>

        {error && (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="space-y-4">
          {!requiereRfInicioAutomatico && (
            <div className="flex flex-col">
              <label className="text-sm font-medium text-gray-700 mb-1">
                Adjuntar PDF {requierePdf ? "(obligatorio)" : "(opcional)"}
              </label>
              <input
                type="file"
                accept=".pdf,application/pdf"
                className="text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                onChange={(e) => setArchivo(e.target.files?.[0] || null)}
              />
              {archivo && (
                <p className="text-xs text-gray-500 mt-1 inline-flex items-center gap-1">
                  <Upload className="w-3.5 h-3.5" />
                  {archivo.name}
                </p>
              )}
            </div>
          )}

          {requiereRfInicioAutomatico && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 space-y-3">
              <p className="text-sm font-semibold text-blue-900">Resolucion de Inicio automatica</p>
              <p className="text-xs text-blue-700">
                El sistema genera el PDF institucional desde plantilla oficial, sin adjuntar archivo manual.
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setShowPdfModal(true)}
                  className="rounded-md border border-blue-300 bg-white px-3 py-2 text-xs font-medium text-blue-700"
                  disabled={isPreparingPdf || !rfDraft}
                >
                  Editar Datos
                </button>
                <button
                  type="button"
                  onClick={handleGeneratePdf}
                  className="rounded-md border border-blue-300 bg-white px-3 py-2 text-xs font-medium text-blue-700 disabled:opacity-50"
                  disabled={isPreparingPdf || !rfDraft}
                >
                  {isPreparingPdf ? "Generando..." : "Generar PDF"}
                </button>
                <button
                  type="button"
                  onClick={handlePreviewPdf}
                  className="rounded-md border border-blue-300 bg-white px-3 py-2 text-xs font-medium text-blue-700 disabled:opacity-50"
                  disabled={isPreparingPdf || !rfDraft}
                >
                  Previsualizar
                </button>
                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  className="rounded-md border border-blue-300 bg-white px-3 py-2 text-xs font-medium text-blue-700 disabled:opacity-50"
                  disabled={isPreparingPdf || !rfDraft}
                >
                  Descargar PDF
                </button>
              </div>
            </div>
          )}

          <textarea
            className="w-full text-sm rounded-md border-gray-300 p-2 border focus:ring-2 focus:ring-blue-500"
            placeholder="Observaciones"
            rows={3}
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
          />

          <div className="flex flex-wrap gap-2">
            <button
              disabled={isSubmitting || isPreparingPdf}
              onClick={handleAprobar}
              className="bg-green-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-green-700 disabled:opacity-50"
            >
              <Check className="w-4 h-4 inline mr-1" /> Aprobar y continuar
            </button>
            <button
              disabled={isSubmitting || !observaciones.trim()}
              onClick={handleDevolver}
              className="bg-yellow-500 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-yellow-600 disabled:opacity-50"
            >
              <Clock className="w-4 h-4 inline mr-1" /> Devolver
            </button>
            <button
              disabled={isSubmitting || !observaciones.trim()}
              onClick={handleRechazar}
              className="bg-red-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-red-700 disabled:opacity-50"
            >
              <X className="w-4 h-4 inline mr-1" /> Rechazar
            </button>
          </div>
        </div>
      </div>

      <PDFPreviewModal
        open={showPdfModal && Boolean(requiereRfInicioAutomatico && rfDraft)}
        onClose={() => setShowPdfModal(false)}
        previewUrl={previewUrl}
        title="Editor y previsualizacion - RF Inicio"
        debugMode={pdfDebug}
        onToggleDebugMode={setPdfDebug}
      >
        {rfDraft && (
          <PDFEditorForm
            draft={rfDraft}
            onChange={setRfDraft}
            loading={isPreparingPdf}
            onGenerate={handleGeneratePdf}
            onPreview={handlePreviewPdf}
            onDownload={handleDownloadPdf}
          />
        )}
      </PDFPreviewModal>
    </>
  );
};
