import { AlertTriangle, X } from "lucide-react";
import { useState } from "react";

interface PendingAlertProps {
  titulo: string;
  mensaje: string;
  dismissible?: boolean;
  className?: string;
}

/**
 * Yellow minimalist alert for in-page pending action notices.
 * Shown to each role when they have a task awaiting action.
 */
export function PendingAlert({ titulo, mensaje, dismissible = true, className = "" }: PendingAlertProps) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  return (
    <div className={`flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 animate-in fade-in duration-300 ${className}`}>
      <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-amber-800">{titulo}</p>
        <p className="text-xs text-amber-700 mt-0.5 leading-relaxed">{mensaje}</p>
      </div>
      {dismissible && (
        <button
          onClick={() => setDismissed(true)}
          className="text-amber-400 hover:text-amber-600 transition-colors shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
