import React from 'react';
import { Check, Clock, AlertTriangle, FileText, Download } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { format, differenceInDays } from 'date-fns';
import { Tramite, Status, useTramites } from '../../context/TramitesContext';

interface StepperProps {
  tramite: Tramite;
}

const FASES = [
  { id: 1, label: 'Solicitud Docente' },
  { id: 2, label: 'Revisión Administrativa' },
  { id: 3, label: 'Aval Jefatura' },
  { id: 4, label: 'RF de Inicio' },
  { id: 5, label: 'Informe Docente' },
  { id: 6, label: 'Revisión Cierre' },
  { id: 7, label: 'RF de Cierre' },
  { id: 8, label: 'Carga SAT' },
  { id: 9, label: 'Finalizado' },
];

export const Stepper: React.FC<StepperProps> = ({ tramite }) => {
  const { cicloConfig } = useTramites();
  
  return (
    <div className="w-full overflow-x-auto pb-4 custom-scrollbar">
      <div className="flex items-center min-w-[800px] lg:min-w-full">
        {FASES.map((fase, index) => {
          const isCompleted = tramite.faseActual > fase.id || tramite.estado === 'FINALIZADO';
          const isCurrent = tramite.faseActual === fase.id && tramite.estado !== 'FINALIZADO';
          const isRejected = isCurrent && tramite.estado === 'RECHAZADO';
          const isReturned = isCurrent && tramite.estado === 'DEVUELTO';

          let stepColorClass = 'bg-gray-200 text-gray-500';
          let textColorClass = 'text-gray-500 font-medium';
          
          if (isCompleted) {
            stepColorClass = 'bg-green-600 text-white';
            textColorClass = 'text-green-700 font-medium';
          } else if (isRejected) {
            stepColorClass = 'bg-red-600 text-white';
            textColorClass = 'text-red-600 font-bold';
          } else if (isReturned) {
            stepColorClass = 'bg-yellow-500 text-white';
            textColorClass = 'text-yellow-600 font-bold';
          } else if (isCurrent) {
            stepColorClass = 'bg-blue-600 text-white shadow-md ring-4 ring-blue-100';
            textColorClass = 'text-blue-700 font-bold';
          }

          return (
            <React.Fragment key={fase.id}>
              <div className="flex flex-col items-center w-32 shrink-0 group relative">
                {/* Visual Step Indicator */}
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center text-sm transition-all duration-300 z-10",
                  stepColorClass
                )}>
                  {isCompleted ? <Check className="w-5 h-5" /> : 
                   isRejected ? <AlertTriangle className="w-5 h-5" /> :
                   isReturned ? <Clock className="w-5 h-5" /> :
                   <span>{fase.id}</span>}
                </div>
                
                {/* Step Label */}
                <span className={cn(
                  "mt-3 text-xs text-center max-w-[100px] leading-tight transition-colors duration-300 flex flex-col gap-1 items-center",
                  textColorClass
                )}>
                  <span>{fase.label}</span>
                  {fase.id === 5 && tramite.faseActual <= 5 && tramite.estado !== 'FINALIZADO' && (
                    <span className="text-[10px] text-gray-400 font-normal bg-gray-100 px-1.5 py-0.5 rounded shadow-sm border border-gray-200">
                      Se abre: {format(new Date(cicloConfig.finSemestre), 'dd/MM/yyyy')}
                    </span>
                  )}
                </span>
                
                {/* Active Indicator Dot */}
                {isCurrent && (
                  <div className="absolute -top-2 bg-blue-600 w-2 h-2 rounded-full animate-bounce" />
                )}
              </div>
              
              {/* Connector Line */}
              {index < FASES.length - 1 && (
                <div className="flex-1 px-1 flex items-center mb-6">
                  <div className={cn(
                    "h-[3px] w-full transition-all duration-300 rounded-full",
                    tramite.faseActual > fase.id ? "bg-green-500" : "bg-gray-200"
                  )} />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
