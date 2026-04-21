import React, { useState } from 'react';
import { useTramites, Documento } from '../../context/TramitesContext';
import { Check, X, FileUp, AlertTriangle, Send, Download, Clock } from 'lucide-react';
import { format } from 'date-fns';

interface ValidationPanelProps {
  tramiteId: string;
}

export const ValidationPanel: React.FC<ValidationPanelProps> = ({ tramiteId }) => {
  const { tramites, rolActivo, cicloConfig, avanzarFase, rechazarTramite, devolverTramite } = useTramites();
  const tramite = tramites.find(t => t.id === tramiteId);
  const [observaciones, setObservaciones] = useState('');
  const [archivo, setArchivo] = useState<File | null>(null);
  const [cumpleRequisitos, setCumpleRequisitos] = useState<boolean | null>(null);

  if (!tramite) return null;

  const handleAvanzar = () => {
    let nuevoDoc: Documento | undefined = undefined;
    if (archivo) {
      nuevoDoc = {
        id: Math.random().toString(36).substr(2, 9),
        nombre: archivo.name,
        tipo: tramite.faseActual === 2 ? 'FICHA' : tramite.faseActual === 5 ? 'INFORME' : 'OTRO',
        fecha: new Date().toISOString(),
        url: URL.createObjectURL(archivo)
      };
    }
    
    // Simulate API Call
    avanzarFase(tramite.id, 'Aprobó fase actual', observaciones, nuevoDoc);
    setObservaciones('');
    setArchivo(null);
    setCumpleRequisitos(null);
  };

  const handleRechazar = () => {
    if (!observaciones) return alert("Debe ingresar un motivo para rechazar.");
    rechazarTramite(tramite.id, observaciones);
  };

  const handleDevolver = () => {
    if (!observaciones) return alert("Debe ingresar un motivo para devolver.");
    devolverTramite(tramite.id, observaciones, tramite.faseActual - 1);
  };

  const generarPDF = (tipo: string) => {
    const docContent = `Resolución de ${tipo}\nTrámite: ${tramite.id}\nMateria: ${tramite.materia}\nAlumno: ${tramite.alumno}\nFecha: ${format(new Date(), 'dd/MM/yyyy')}`;
    const blob = new Blob([docContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `RF_${tipo}_${tramite.id}.pdf`;
    a.click();
    
    const nuevoDoc: Documento = {
      id: Math.random().toString(36).substr(2, 9),
      nombre: `RF_${tipo}_${tramite.id}.pdf`,
      tipo: tipo === 'Inicio' ? 'RF_INICIO' : 'RF_CIERRE',
      fecha: new Date().toISOString(),
      url
    };
    avanzarFase(tramite.id, `Emisión de RF ${tipo}`, '', nuevoDoc);
  };

  const isResponsable = tramite.responsableActual === rolActivo;
  
  if (!isResponsable && tramite.estado !== 'FINALIZADO') {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-md p-4 mt-4 flex items-start text-gray-500">
        <Clock className="w-5 h-5 mr-2 mt-0.5 text-gray-400" />
        <p className="text-sm">
          Este trámite se encuentra en la fase <strong>{tramite.faseActual}</strong> y está a la espera de la acción del <strong>{tramite.responsableActual.replace('_', ' ')}</strong>.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white border-2 border-yellow-100 rounded-lg p-5 mt-4 shadow-sm animate-in fade-in slide-in-from-bottom-2">
      <h4 className="font-semibold text-gray-900 flex items-center mb-4">
        <AlertTriangle className="w-5 h-5 text-yellow-500 mr-2" />
        Acción Requerida - Fase {tramite.faseActual}
      </h4>

      {/* RENDER FOR ADMIN - FASE 2 */}
      {rolActivo === 'ADMINISTRATIVO' && tramite.faseActual === 2 && (
        <div className="space-y-4">
          <div className="bg-blue-50 p-3 rounded-md border border-blue-100">
            <p className="text-sm text-blue-800 font-medium mb-2">Checklist de Validación (Automático)</p>
            <label className="flex items-center space-x-2 text-sm text-gray-700">
              <input type="checkbox" className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" 
                     checked={archivo !== null} readOnly />
              <span>Verificar expediente y datos del alumno en SAG</span>
            </label>
            <label className="flex items-center space-x-2 text-sm text-gray-700 mt-2">
              <input type="checkbox" className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" 
                     checked={archivo !== null && tramite.nota >= 7} readOnly />
              <span>Validar nota de la materia (Nota actual: {tramite.nota} - Mínimo 7)</span>
            </label>
          </div>

          <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-700 mb-1">Subir Ficha Académica (PDF)</label>
            <input type="file" accept=".pdf" className="text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              onChange={(e) => setArchivo(e.target.files?.[0] || null)} />
          </div>

          <textarea className="w-full text-sm rounded-md border-gray-300 p-2 border focus:ring-2 focus:ring-blue-500" 
            placeholder="Observaciones (obligatorio para devolver o rechazar)"
            rows={2} value={observaciones} onChange={e => setObservaciones(e.target.value)} />

          <div className="flex gap-2">
            <button disabled={!archivo || tramite.nota < 7} onClick={handleAvanzar}
              className="bg-green-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed">
              <Check className="w-4 h-4 inline mr-1" /> Aprobar y Enviar
            </button>
            <button onClick={handleDevolver} disabled={!observaciones}
              className="bg-yellow-500 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed">
              <Clock className="w-4 h-4 inline mr-1" /> Devolver al Docente
            </button>
          </div>
        </div>
      )}

      {/* RENDER FOR JEFE DE CARRERA - FASE 3, 6, 8 */}
      {rolActivo === 'JEFE_CARRERA' && [3, 6, 8].includes(tramite.faseActual) && (
        <div className="space-y-4">
          {tramite.faseActual === 3 && (
            <p className="text-sm text-gray-600">Por favor, revise la ficha académica adjunta y decida si avala la designación de inicio.</p>
          )}
          {tramite.faseActual === 6 && (
            <p className="text-sm text-gray-600">Por favor, revise el informe de desempeño final subido por el docente y decida si lo aprueba.</p>
          )}
          {tramite.faseActual === 8 && (
            <div className="bg-blue-50 p-3 rounded-md border border-blue-100 mb-4">
              <p className="text-sm text-blue-800 font-medium">Paso Final: Carga en SAT</p>
              <p className="text-xs text-blue-700 mt-1">Haga clic en el botón de abajo una vez que haya cargado los datos en el sistema SAT externo.</p>
            </div>
          )}

          {tramite.faseActual !== 8 && (
            <textarea className="w-full text-sm rounded-md border-gray-300 p-2 border focus:ring-2 focus:ring-blue-500" 
              placeholder="Motivo de rechazo (obligatorio si decide rechazar. Se enviará por email al Docente)"
              rows={3} value={observaciones} onChange={e => setObservaciones(e.target.value)} />
          )}

          <div className="flex gap-2">
            <button onClick={handleAvanzar}
              className="bg-green-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-green-700">
              <Check className="w-4 h-4 inline mr-1" /> {tramite.faseActual === 8 ? 'Confirmar Carga en SAT' : (tramite.faseActual === 3 ? 'Avalar Inicio' : 'Aprobar Informe Final')}
            </button>
            {tramite.faseActual !== 8 && (
              <button onClick={handleRechazar} disabled={!observaciones}
                className="bg-red-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed">
                <X className="w-4 h-4 inline mr-1" /> Rechazar Solicitud
              </button>
            )}
          </div>
        </div>
      )}

      {/* RENDER FOR SEC. ACADEMICA - FASE 4 y 7 */}
      {rolActivo === 'SECRETARIA' && (tramite.faseActual === 4 || tramite.faseActual === 7) && (
        <div className="space-y-4">
          <p className="text-sm text-gray-600">Generar y adjuntar Resolución de Facultad correspondiente a esta etapa.</p>
          
          <div className="bg-gray-100 p-4 rounded-md border border-gray-200 shadow-inner">
            <h5 className="text-xs font-bold text-gray-500 mb-2 uppercase">Previsualización del Documento</h5>
            <div className="bg-white p-6 border border-gray-300 rounded shadow-sm text-center">
              <h2 className="text-lg font-bold">Resolución de {tramite.faseActual === 4 ? 'Inicio' : 'Cierre'}</h2>
              <div className="text-sm mt-4 text-left space-y-2">
                <p><strong>Trámite ID:</strong> {tramite.id}</p>
                <p><strong>Materia:</strong> {tramite.materia}</p>
                <p><strong>Alumno:</strong> {tramite.alumno}</p>
                <p><strong>Fecha de Emisión:</strong> {format(new Date(), 'dd/MM/yyyy')}</p>
              </div>
            </div>
          </div>

          <button onClick={() => generarPDF(tramite.faseActual === 4 ? 'Inicio' : 'Cierre')}
            className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700">
            <Download className="w-4 h-4 inline mr-1" /> 
            Emitir y Descargar RF de {tramite.faseActual === 4 ? 'Inicio' : 'Cierre'}
          </button>
        </div>
      )}

      {/* RENDER FOR DOCENTE - FASE 5 */}
      {rolActivo === 'DOCENTE' && tramite.faseActual === 5 && (
        <div className="space-y-4">
          <div className="bg-yellow-50 p-3 rounded-md border border-yellow-200">
            <p className="text-sm text-yellow-800">
              <strong>Aviso:</strong> Este formulario se habilita al finalizar el ciclo lectivo ({format(new Date(cicloConfig.finSemestre), 'dd/MM/yyyy')}).
            </p>
          </div>
          <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-700 mb-1">Subir Informe Final (PDF)</label>
            <input type="file" accept=".pdf" className="text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              onChange={(e) => setArchivo(e.target.files?.[0] || null)} />
          </div>
          <button disabled={!archivo} onClick={handleAvanzar}
            className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed">
            <Send className="w-4 h-4 inline mr-1" /> Enviar Informe Final
          </button>
        </div>
      )}
    </div>
  );
};
