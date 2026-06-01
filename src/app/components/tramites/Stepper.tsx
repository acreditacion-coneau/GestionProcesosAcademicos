import React from "react";
import { Check } from "lucide-react";
import { cn } from "../../../lib/utils";
import { Tramite } from "../../context/TramitesContext";

interface StepperProps {
  tramite: Tramite;
}

function isAdscripto(tipoSolicitud: string) {
  return tipoSolicitud.toLowerCase().includes("adscripto");
}

function getSteps(tramite: Tramite) {
  if (isAdscripto(tramite.tipoSolicitud)) {
    return [
      { key: "fase_1", label: "Solicitud Responsable" },
      { key: "fase_2", label: "Secretaria Tecnica" },
      { key: "fase_3", label: "Jefatura de Carrera" },
      { key: "fase_4", label: "Secretaria Academica" },
      { key: "fase_5", label: "Finalizada" },
    ] as const;
  }

  return [
    { key: "fase_1", label: "Solicitud Responsable" },
    { key: "fase_2", label: "Verificacion Administrativo" },
    { key: "fase_3", label: "Validacion Jefe" },
    { key: "fase_4", label: "Resolucion Inicio Secretaria" },
    { key: "fase_5", label: "Informe Responsable" },
    { key: "fase_6", label: "Validacion Cierre Jefe" },
    { key: "fase_7", label: "Resolucion Final Secretaria" },
    { key: "fase_8", label: "Carga SAT Jefe" },
    { key: "fase_9", label: "Finalizada" },
  ] as const;
}

function getCurrentIndex(tramite: Tramite, steps: ReadonlyArray<{ key: string; label: string }>) {
  if (tramite.estadoSolicitud === "rechazada" || tramite.estadoSolicitud === "cancelada") {
    return 0;
  }
  if (tramite.estadoSolicitud === "finalizada") {
    return steps.length - 1;
  }
  const faseFromWorkflow = Math.max(1, Math.min(tramite.faseActual, steps.length));
  return faseFromWorkflow - 1;
}

export const Stepper: React.FC<StepperProps> = ({ tramite }) => {
  const steps = getSteps(tramite);
  const currentIndex = getCurrentIndex(tramite, steps);

  return (
    <div className="w-full overflow-x-auto pb-4 custom-scrollbar">
      <div className="flex items-center min-w-[560px] lg:min-w-full">
        {steps.map((step, index) => {
          const done = index < currentIndex || tramite.estadoSolicitud === "finalizada";
          const current = index === currentIndex && tramite.estadoSolicitud !== "finalizada";

          return (
            <React.Fragment key={step.key}>
              <div className="flex flex-col items-center w-40 shrink-0 group relative">
                <div
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center text-sm transition-all duration-300 z-10",
                    done ? "bg-green-600 text-white" : current ? "bg-blue-600 text-white shadow-md ring-4 ring-blue-100" : "bg-gray-200 text-gray-500",
                  )}
                >
                  {done ? <Check className="w-5 h-5" /> : <span>{index + 1}</span>}
                </div>
                <span
                  className={cn(
                    "mt-3 text-xs text-center max-w-[130px] leading-tight transition-colors duration-300",
                    done ? "text-green-700 font-medium" : current ? "text-blue-700 font-bold" : "text-gray-500 font-medium",
                  )}
                >
                  {step.label}
                </span>
              </div>

              {index < steps.length - 1 && (
                <div className="flex-1 px-1 flex items-center mb-6">
                  <div className={cn("h-[3px] w-full transition-all duration-300 rounded-full", done ? "bg-green-500" : "bg-gray-200")} />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
