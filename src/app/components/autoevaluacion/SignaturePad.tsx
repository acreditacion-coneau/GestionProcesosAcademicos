import { useRef } from "react";
import { CheckCircle2, PenLine } from "lucide-react";
import SignatureCanvas from "react-signature-canvas";

type SignaturePadProps = {
  disabled?: boolean;
  signed?: boolean;
  onChange: (dataUrl: string | null) => void;
};

export function SignaturePad({ disabled = false, signed = false, onChange }: SignaturePadProps) {
  const signatureRef = useRef<SignatureCanvas | null>(null);

  const handleEnd = () => {
    if (!signatureRef.current || signatureRef.current.isEmpty()) {
      onChange(null);
      return;
    }

    onChange(signatureRef.current.toDataURL("image/png"));
  };

  const handleClear = () => {
    signatureRef.current?.clear();
    onChange(null);
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-4 sm:p-5 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-slate-900">
          <PenLine className="w-4 h-4" />
          <h5 className="font-semibold">Firma digital institucional</h5>
        </div>
        {signed && (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> Documento firmado correctamente
          </span>
        )}
      </div>

      <p className="text-xs text-slate-600">
        Declaro que la informacion brindada es veridica.
      </p>

      <div className="border border-slate-200 rounded-xl bg-slate-50 p-2 sm:p-3">
        <SignatureCanvas
          ref={signatureRef}
          onEnd={handleEnd}
          penColor="#0f172a"
          canvasProps={{
            className: "w-full h-40 rounded-lg bg-white",
          }}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
        <span>Use mouse o touch para firmar.</span>
        <button
          type="button"
          onClick={handleClear}
          className="text-blue-700 hover:text-blue-900 font-medium disabled:opacity-50"
          disabled={disabled}
        >
          Limpiar firma
        </button>
      </div>
    </div>
  );
}
