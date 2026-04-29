import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router';
import { useUser } from '../context/UserContext';
import { useTramites } from '../context/TramitesContext';
import { TramiteCard } from '../components/tramites/TramiteCard';
import { NewSolicitudModal } from '../components/tramites/NewSolicitudModal';
import { ConfiguracionFechasModal } from '../components/tramites/ConfiguracionFechasModal';
import { Plus, Settings, Filter, Search, ArrowLeft } from 'lucide-react';

export const Dashboard: React.FC = () => {
  const { user } = useUser();
  const { tramites, rolActivo, setRolActivo, loading, error } = useTramites();
  const [showNewModal, setShowNewModal] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [filterMode, setFilterMode] = useState<'EN_CURSO' | 'TERMINADOS' | 'PENDIENTES'>('PENDIENTES');
  const [estadoFilter, setEstadoFilter] = useState<'TODOS' | 'creada' | 'en_verificacion' | 'aprobada_jefe' | 'en_secretaria' | 'finalizada' | 'rechazada'>('TODOS');
  const [carreraFilter, setCarreraFilter] = useState<'TODAS' | string>('TODAS');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    let newRol: 'DOCENTE' | 'DOCENTE_RESPONSABLE' | 'ADMINISTRATIVO' | 'JEFE_CARRERA' | 'SECRETARIA' | 'SEC_TECNICA' = 'DOCENTE';
    if (user.rol === 'ADMINISTRATIVO') newRol = 'ADMINISTRATIVO';
    if (user.rol === 'JEFE_CARRERA') newRol = 'JEFE_CARRERA';
    if (user.rol === 'SECRETARIA') newRol = 'SECRETARIA';
    if (user.rol === 'SEC_TECNICA') newRol = 'SEC_TECNICA';
    if (user.rol === 'DOCENTE_RESPONSABLE') newRol = 'DOCENTE_RESPONSABLE';
    if (user.rol === 'DOCENTE') newRol = 'DOCENTE';
    setRolActivo(newRol);
  }, [user.rol, setRolActivo]);

  const carrerasDisponibles = useMemo(() => {
    return Array.from(new Set(tramites.map((t) => t.carrera))).sort((a, b) => a.localeCompare(b, 'es'));
  }, [tramites]);

  const tramitesPorVista = tramites.filter((t) => {
    if (filterMode === 'PENDIENTES') {
      return t.responsableActual === rolActivo && t.estado !== 'FINALIZADO';
    }
    if (filterMode === 'EN_CURSO') {
      return t.estado !== 'FINALIZADO';
    }
    if (filterMode === 'TERMINADOS') {
      return t.estado === 'FINALIZADO';
    }
    return true;
  });

  const misTramites = tramitesPorVista.filter((t) => {
    const query = searchTerm.trim().toLowerCase();
    const matchesSearch = !query
      || t.id.toLowerCase().includes(query)
      || t.materia.toLowerCase().includes(query)
      || t.alumnosPropuestos.some((a) => a.nombreCompleto.toLowerCase().includes(query));
    const matchesEstado = estadoFilter === 'TODOS' || t.estadoSolicitud === estadoFilter;
    const matchesCarrera = carreraFilter === 'TODAS' || t.carrera === carreraFilter;
    return matchesSearch && matchesEstado && matchesCarrera;
  });

  return (
    <div className="min-h-screen bg-gray-50/50">
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* HEADER */}
        <div className="mb-6">
          <Link to="/" className="inline-flex items-center text-sm text-gray-500 hover:text-blue-600 transition-colors mb-4 group">
            <ArrowLeft className="w-4 h-4 mr-1 group-hover:-translate-x-1 transition-transform" />
            Volver al Portal Principal
          </Link>
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Mis Designaciones de Ayudantes</h1>
            <p className="mt-1 text-sm text-gray-500">
              Gestione y realice el seguimiento de las solicitudes de ayudantía de alumnos.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {rolActivo === 'SECRETARIA' && (
              <button 
                onClick={() => setShowConfigModal(true)}
                className="flex items-center justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors"
              >
                <Settings className="w-4 h-4 mr-2 text-gray-500" />
                Configurar Ciclo
              </button>
            )}
            
            {(rolActivo === 'DOCENTE' || rolActivo === 'DOCENTE_RESPONSABLE') && (
              <button 
                onClick={() => setShowNewModal(true)}
                className="flex items-center justify-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4 mr-2" />
                Nueva Solicitud
              </button>
            )}
          </div>
        </div>

        {/* TABS / FILTERS */}
        <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex space-x-1 p-1 bg-gray-100 rounded-md overflow-x-auto w-full sm:w-auto">
            <button 
              onClick={() => setFilterMode('PENDIENTES')}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all whitespace-nowrap flex items-center ${filterMode === 'PENDIENTES' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Pendientes de mi revisión
              {tramites.filter(t => t.responsableActual === rolActivo && t.estado !== 'FINALIZADO').length > 0 && (
                <span className="ml-2 bg-blue-600 text-white text-xs py-0.5 px-2 rounded-full font-bold">
                  {tramites.filter(t => t.responsableActual === rolActivo && t.estado !== 'FINALIZADO').length}
                </span>
              )}
            </button>
            <button 
              onClick={() => setFilterMode('EN_CURSO')}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all whitespace-nowrap ${filterMode === 'EN_CURSO' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              En Curso
            </button>
            <button 
              onClick={() => setFilterMode('TERMINADOS')}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all whitespace-nowrap ${filterMode === 'TERMINADOS' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Terminados
            </button>
          </div>

          <div className="relative w-full sm:w-64">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input 
              type="text" 
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors" 
              placeholder="Buscar por alumno, materia o ID..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm mb-6 grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Filtrar por estado</label>
            <select
              value={estadoFilter}
              onChange={(e) => setEstadoFilter(e.target.value as typeof estadoFilter)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none"
            >
              <option value="TODOS">Todos</option>
              <option value="creada">creada</option>
              <option value="en_verificacion">en_verificacion</option>
              <option value="aprobada_jefe">aprobada_jefe</option>
              <option value="en_secretaria">en_secretaria</option>
              <option value="finalizada">finalizada</option>
              <option value="rechazada">rechazada</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Filtrar por carrera</label>
            <select
              value={carreraFilter}
              onChange={(e) => setCarreraFilter(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none"
            >
              <option value="TODAS">Todas</option>
              {carrerasDisponibles.map((carrera) => (
                <option key={carrera} value={carrera}>
                  {carrera}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* LIST */}
        <div className="space-y-4">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {loading ? (
            <div className="text-center py-16 bg-white rounded-xl border border-dashed border-gray-300">
              <h3 className="text-sm font-medium text-gray-900">Cargando solicitudes desde Supabase...</h3>
            </div>
          ) : misTramites.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-xl border border-dashed border-gray-300">
              <div className="mx-auto h-12 w-12 text-gray-400 mb-4 bg-gray-50 rounded-full flex items-center justify-center">
                <Filter className="h-6 w-6" />
              </div>
              <h3 className="text-sm font-medium text-gray-900">No hay trámites para mostrar</h3>
              <p className="mt-1 text-sm text-gray-500">No se encontraron designaciones con los filtros actuales.</p>
            </div>
          ) : (
            <div className="animate-in fade-in duration-500">
              {misTramites.map(tramite => (
                <TramiteCard key={tramite.id} tramite={tramite} />
              ))}
            </div>
          )}
        </div>

      </main>

      {/* MODALS */}
      {showNewModal && <NewSolicitudModal onClose={() => setShowNewModal(false)} />}
      {showConfigModal && <ConfiguracionFechasModal onClose={() => setShowConfigModal(false)} />}
      
    </div>
  );
};
