import React from "react";

interface PDFPreviewModalProps {
  open: boolean;
  onClose: () => void;
  previewUrl: string | null;
  title?: string;
  debugMode?: boolean;
  onToggleDebugMode?: (value: boolean) => void;
}

export const PDFPreviewModal: React.FC<React.PropsWithChildren<PDFPreviewModalProps>> = ({
  open,
  onClose,
  previewUrl,
  title = "Previsualizacion PDF",
  debugMode = false,
  onToggleDebugMode,
  children,
}) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-6xl rounded-lg bg-white shadow-xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
          <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
          <div className="flex items-center gap-3">
            {onToggleDebugMode && (
              <label className="inline-flex items-center gap-2 text-xs text-gray-700">
                <input
                  type="checkbox"
                  checked={debugMode}
                  onChange={(e) => onToggleDebugMode(e.target.checked)}
                />
                Ver coordenadas (debug)
              </label>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-700"
            >
              Cerrar
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[370px_1fr] gap-0 h-[78vh]">
          <div className="border-r border-gray-200 overflow-y-auto p-4">{children}</div>
          <div className="bg-gray-100 p-3">
            {previewUrl ? (
              <iframe title="Preview PDF" src={previewUrl} className="h-full w-full rounded border bg-white" />
            ) : (
              <div className="h-full w-full rounded border border-dashed border-gray-300 bg-white flex items-center justify-center text-sm text-gray-500">
                Genera una previsualizacion para ver el PDF.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
