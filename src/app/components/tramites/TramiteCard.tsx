import React, { useState } from 'react';
import { Tramite, useTramites } from '../../context/TramitesContext';
import { useUser } from '../../context/UserContext';
import { Stepper } from './Stepper';
import { ValidationPanel } from './ValidationPanel';
import { ChevronDown, ChevronUp, Clock, User, BookOpen, FileText, CheckCircle2, AlertCircle, History, Download } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { format, differenceInDays } from 'date-fns';

export const TramiteCard: React.FC<{ tramite: Tramite }> = ({ tramite }) => {
  const [expanded, setExpanded] = useState(false);
  const { rolActivo } = useTramites();
  const { user } = useUser();
  
  const diasEnSistema = differenceInDays(new Date(), new Date(tramite.fechaCreacion));
  const diasEnFaseActual = differenceInDays(new Date(), new Date(tramite.fechaUltimaActualizacion));
  
  // SLA Logic Mock (Simple: > 10 days = vencido, > 5 days = proximo a vencer)
  let slaText = 'En término';
  let slaColor = 'bg-green-100 text-green-800 border-green-200';
  
  if (diasEnFaseActual > 10) {
    slaText = 'Vencido';
    slaColor = 'bg-red-100 text-red-800 border-red-200';
  } else if (diasEnFaseActual > 5) {
    slaText = 'Próximo a vencer';
    slaColor = 'bg-yellow-100 text-yellow-800 border-yellow-200';
  }

  const isResponsable = tramite.responsableActual === rolActivo && tramite.estado !== 'FINALIZADO';
  const alumnosResumen = tramite.alumnosPropuestos.length > 1
    ? `${tramite.alumnosPropuestos[0]?.nombreCompleto} +${tramite.alumnosPropuestos.length - 1}`
    : (tramite.alumnosPropuestos[0]?.nombreCompleto || tramite.alumno);
  const historialVisible = user.rol === "DOCENTE_RESPONSABLE"
    ? tramite.historial.filter(
        (evt) =>
          evt.rol === "DOCENTE_RESPONSABLE" ||
          evt.actor.toLowerCase().includes(user.nombre.toLowerCase()) ||
          evt.actor.toLowerCase().includes(user.dni),
      )
    : tramite.historial;

  return (
    <div className={cn(
      "bg-white rounded-xl shadow-sm border transition-all duration-200 mb-4",
      isResponsable ? "border-blue-300 shadow-md ring-1 ring-blue-100" : "border-gray-200 hover:shadow-md"
    )}>
      {/* HEADER SUMMARY */}
      <div 
        className="p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center cursor-pointer gap-4"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-xs font-mono bg-gray-100 text-gray-600 px-2 py-1 rounded border border-gray-200">
              {tramite.id}
            </span>
            <span className={cn("text-xs px-2.5 py-1 rounded-full border font-medium", slaColor)}>
              {slaText}
            </span>
            {isResponsable && (
              <span className="flex items-center text-xs font-medium text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200">
                <AlertCircle className="w-3.5 h-3.5 mr-1" />
                Tu turno
              </span>
            )}
            <span className={cn(
              "text-xs px-2.5 py-1 rounded-full border font-medium",
              tramite.estado === 'RECHAZADO' ? "bg-red-50 text-red-700 border-red-200" :
              tramite.estado === 'DEVUELTO' ? "bg-orange-50 text-orange-700 border-orange-200" :
              tramite.estado === 'FINALIZADO' ? "bg-green-50 text-green-700 border-green-200" :
              "bg-gray-50 text-gray-700 border-gray-200"
            )}>
              {tramite.estado.replace('_', ' ')}
            </span>
          </div>
          
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-gray-400" />
            {tramite.materia}
          </h3>
          <p className="text-sm text-gray-500 flex items-center gap-4 mt-1">
            <span className="flex items-center"><User className="w-4 h-4 mr-1" /> Alumno(s): {alumnosResumen}</span>
            <span className="flex items-center"><CheckCircle2 className="w-4 h-4 mr-1" /> Nota: {tramite.nota}</span>
            <span className="flex items-center"><Clock className="w-4 h-4 mr-1" /> {diasEnFaseActual} días en fase actual</span>
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {tramite.carrera} · {tramite.anioCarrera} · {tramite.regimen} · Solicitud: {format(new Date(tramite.fechaSolicitud), "dd/MM/yyyy")}
          </p>
        </div>
        
        <div className="flex items-center gap-4 sm:border-l sm:pl-4 border-gray-200">
          <div className="text-right hidden sm:block">
            <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Responsable Actual</p>
            <p className="text-sm font-medium text-gray-900">{tramite.responsableActual.replace('_', ' ')}</p>
          </div>
          <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
            {expanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* EXPANDED CONTENT */}
      {expanded && (
        <div className="border-t border-gray-100 p-5 bg-gray-50/50 rounded-b-xl animate-in slide-in-from-top-2 duration-300">
          
          {/* STEPPER */}
          {user.rol !== "DOCENTE_RESPONSABLE" && (
            <div className="mb-8">
              <h4 className="text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wider">Progreso del Trámite</h4>
              <Stepper tramite={tramite} />
            </div>
          )}

          {/* ACTION PANEL */}
          {tramite.estado !== 'FINALIZADO' && <ValidationPanel tramiteId={tramite.id} />}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            
            {/* DOCUMENTS */}
            <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
              <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                <FileText className="w-4 h-4 mr-2" /> Documentación Adjunta
              </h4>
              {tramite.documentos.length === 0 ? (
                <p className="text-sm text-gray-500 italic text-center py-4 bg-gray-50 rounded border border-dashed border-gray-200">
                  No hay documentos adjuntos aún.
                </p>
              ) : (
                <ul className="space-y-2">
                  {tramite.documentos.map(doc => {
                    // Restringir RF_INICIO al estudiante (acá simulamos con el rolDocente que no lo vea si no corresponde, pero la consigna dice "no visible al alumno hasta habilitación", nosotros somos Docentes/Admins, así que lo vemos).
                    return (
                      <li key={doc.id} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-md border border-gray-100 group">
                        <div className="flex items-center gap-2 overflow-hidden">
                          <FileText className="w-4 h-4 text-blue-500 shrink-0" />
                          <div className="truncate">
                            <p className="text-sm font-medium text-gray-700 truncate">{doc.nombre}</p>
                            <p className="text-xs text-gray-400">{format(new Date(doc.fecha), 'dd/MM/yyyy HH:mm')} - {doc.tipo}</p>
                          </div>
                        </div>
                        <a href={doc.url} download={doc.nombre} 
                           className="text-blue-600 hover:text-blue-800 p-1 opacity-0 group-hover:opacity-100 transition-opacity" 
                           title="Descargar">
                          <Download className="w-4 h-4" />
                        </a>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {/* HISTORY TIMELINE */}
            <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm max-h-80 overflow-y-auto custom-scrollbar">
              <h4 className="text-sm font-semibold text-gray-700 mb-4 flex items-center sticky top-0 bg-white z-10 pb-2 border-b border-gray-100">
                <History className="w-4 h-4 mr-2" /> Historial y Trazabilidad
              </h4>
              <div className="space-y-4 pl-2">
                {historialVisible.map((evt, idx) => (
                  <div key={evt.id} className="relative pl-6 pb-2">
                    {/* Timeline line */}
                    {idx !== historialVisible.length - 1 && (
                      <div className="absolute left-1.5 top-3 bottom-0 w-px bg-gray-200" />
                    )}
                    {/* Dot */}
                    <div className={cn(
                      "absolute left-0 top-1.5 w-3 h-3 rounded-full border-2",
                      evt.tipo === 'EMAIL' ? "bg-yellow-100 border-yellow-500" :
                      evt.tipo === 'SISTEMA' ? "bg-gray-100 border-gray-400" :
                      "bg-blue-100 border-blue-500"
                    )} />
                    
                    <div className="text-sm">
                      <p className="font-medium text-gray-900">{evt.accion}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {format(new Date(evt.fecha), 'dd/MM HH:mm')} • {evt.actor} ({evt.rol.replace('_', ' ')})
                      </p>
                      {evt.comentario && (
                        <div className="mt-1.5 p-2 bg-gray-50 border border-gray-100 rounded text-xs text-gray-600 italic">
                          "{evt.comentario}"
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {historialVisible.length === 0 && (
                  <p className="text-xs text-gray-500 italic">No hay eventos de trazabilidad asociados a su participación.</p>
                )}
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};
