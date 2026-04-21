import { useUser } from "../context/UserContext";
import { ArrowLeft, HardDrive, FileBadge, FolderGit2 } from "lucide-react";
import { Link } from "react-router";

export function RepositoriosView() {
  const { user } = useUser();

  return (
    <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white p-8 md:p-12 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center text-center">
        <div className="w-full flex justify-start">
          <Link to="/" className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-800 mb-6 transition-colors">
            <ArrowLeft className="w-4 h-4 mr-1" /> Volver al inicio
          </Link>
        </div>
        
        <div className="w-20 h-20 bg-blue-50 text-blue-900 rounded-3xl flex items-center justify-center mb-6 shadow-inner border border-blue-100">
          <HardDrive className="w-10 h-10" />
        </div>
        
        <h2 className="text-3xl font-bold text-slate-900 mb-3">Repositorios Académicos</h2>
        <p className="text-slate-500 max-w-lg mx-auto mb-10 text-lg">
          Acceda al material bibliográfico, actas de cátedra y recursos compartidos asignados a su carrera.
        </p>

        <div className="w-full max-w-md bg-slate-50 border border-slate-100 p-6 rounded-2xl">
          <div className="flex items-center justify-center gap-2 mb-4">
            <FileBadge className="w-5 h-5 text-slate-400" />
            <span className="text-sm font-semibold text-slate-500 uppercase tracking-wider">
              Carrera Asignada
            </span>
          </div>
          <p className="text-xl font-medium text-slate-800 mb-2 border-b border-slate-200 pb-2">
            {user.carrera}
          </p>
          <p className="text-sm font-semibold text-slate-600 mb-8 pb-2">
            Materia: <span className="font-normal">{user.materia}</span>
          </p>
          
          {user.carrera === "Todas" ? (
            <div className="w-full flex items-center justify-center py-4 px-6 bg-slate-800 text-white rounded-xl shadow-lg border border-slate-700">
              <FolderGit2 className="w-6 h-6 mr-3 text-slate-300" />
              Acceso Restringido - Seleccione una Carrera
            </div>
          ) : (
            <a 
              href={`https://drive.google.com/drive/u/0/search?q=${encodeURIComponent(user.carrera + " " + user.materia)}`}
              target="_blank" 
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center py-4 px-6 bg-blue-900 text-white rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all group font-semibold text-lg border border-blue-800"
            >
              <FolderGit2 className="w-6 h-6 mr-3 text-blue-200 group-hover:text-white transition-colors" />
              Drive {user.carrera} - {user.materia}
            </a>
          )}
        </div>
        
        <p className="text-xs text-slate-400 mt-8 max-w-sm">
          Si necesita acceso a repositorios de otras carreras, por favor contacte al área de Secretaría Académica.
        </p>
      </div>
    </div>
  );
}
