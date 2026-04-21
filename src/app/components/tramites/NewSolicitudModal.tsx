import React, { useState } from 'react';
import { useTramites } from '../../context/TramitesContext';
import { differenceInDays } from 'date-fns';
import { AlertCircle, X, Check, Save } from 'lucide-react';
import { cn } from '../../../lib/utils';

interface ModalProps {
  onClose: () => void;
}

export const NewSolicitudModal: React.FC<ModalProps> = ({ onClose }) => {
  const { crearTramite, cicloConfig } = useTramites();
  const [formData, setFormData] = useState({ materia: '', alumno: '', nota: '' });
  const [error, setError] = useState('');

  const diasDesdeInicio = differenceInDays(new Date(), new Date(cicloConfig.inicioClases));
  const fueraDeTermino = diasDesdeInicio > 15;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (fueraDeTermino) {
      setError(`Han pasado ${diasDesdeInicio} días desde el inicio de clases. El límite es 15 días.`);
      return;
    }
    
    const notaNum = parseInt(formData.nota, 10);
    if (isNaN(notaNum) || notaNum < 7) {
      setError('La nota debe ser numérica y mayor o igual a 7.');
      return;
    }

    if (!formData.materia || !formData.alumno) {
      setError('Todos los campos son obligatorios.');
      return;
    }

    crearTramite({
      materia: formData.materia,
      alumno: formData.alumno,
      nota: notaNum
    });
    
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="text-xl font-semibold text-gray-900">Nueva Designación</h2>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          
          {fueraDeTermino ? (
            <div className="bg-red-50 text-red-800 p-4 rounded-lg border border-red-200 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
              <div className="text-sm">
                <p className="font-semibold">Plazo Vencido</p>
                <p className="mt-1">Han pasado {diasDesdeInicio} días desde el inicio de clases ({cicloConfig.inicioClases}). El plazo máximo reglamentario es de 15 días.</p>
                <p className="mt-2 text-xs opacity-80">Por favor, comuníquese con Mesa de Ayuda o Secretaría Académica para solicitar una excepción.</p>
              </div>
            </div>
          ) : (
            <>
              {error && (
                <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm border border-red-100 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" /> {error}
                </div>
              )}
              
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Materia</label>
                <input type="text" value={formData.materia} onChange={e => setFormData({ ...formData, materia: e.target.value })}
                       className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                       placeholder="Ej: Análisis Matemático I" />
              </div>
              
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Alumno (Nombre y Apellido)</label>
                <input type="text" value={formData.alumno} onChange={e => setFormData({ ...formData, alumno: e.target.value })}
                       className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                       placeholder="Ej: Pérez, Juan" />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Nota Final de la Materia</label>
                <input type="number" min="7" max="10" value={formData.nota} onChange={e => setFormData({ ...formData, nota: e.target.value })}
                       className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                       placeholder="Mínimo 7" />
                <p className="text-xs text-gray-500 mt-1">Requisito reglamentario: El alumno debe tener aprobada la materia con nota igual o mayor a 7.</p>
              </div>
            </>
          )}
          
          <div className="pt-4 border-t border-gray-100 flex justify-end gap-3 mt-6">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={fueraDeTermino} className="px-4 py-2 text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-md transition-colors flex items-center gap-2">
              <Save className="w-4 h-4" /> Iniciar Trámite
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
