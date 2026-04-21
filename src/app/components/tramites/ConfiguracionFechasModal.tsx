import React, { useState } from 'react';
import { useTramites } from '../../context/TramitesContext';
import { X, Calendar, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';

interface ModalProps {
  onClose: () => void;
}

export const ConfiguracionFechasModal: React.FC<ModalProps> = ({ onClose }) => {
  const { cicloConfig, setCicloConfig } = useTramites();
  const [config, setConfig] = useState({
    inicioClases: cicloConfig.inicioClases,
    finSemestre: cicloConfig.finSemestre
  });
  const [success, setSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCicloConfig(config);
    setSuccess(true);
    setTimeout(() => {
      setSuccess(false);
      onClose();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            <Calendar className="w-5 h-5 mr-2 text-blue-500" />
            Configuración de Ciclo
          </h2>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {success && (
            <div className="bg-green-50 text-green-700 p-3 rounded-md text-sm flex items-center border border-green-200">
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Fechas guardadas exitosamente.
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 block">Inicio de Clases</label>
            <input type="date" value={config.inicioClases} onChange={e => setConfig({ ...config, inicioClases: e.target.value })}
                   className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm outline-none" />
            <p className="text-xs text-gray-500 mt-1">El docente tiene 15 días desde esta fecha para solicitar el alta de ayudantes.</p>
          </div>

          <div className="space-y-2 mt-4">
            <label className="text-sm font-medium text-gray-700 block">Fin de Semestre / Año</label>
            <input type="date" value={config.finSemestre} onChange={e => setConfig({ ...config, finSemestre: e.target.value })}
                   className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm outline-none" />
            <p className="text-xs text-gray-500 mt-1">A partir de esta fecha se habilita la subida del Informe Final Docente.</p>
          </div>
          
          <div className="pt-4 flex justify-end gap-3 mt-6">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md">
              Cerrar
            </button>
            <button type="submit" className="px-4 py-2 text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 rounded-md shadow-sm">
              Guardar Cambios
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
