import { useState } from "react";
import { ArrowLeft, Upload, FileText, Download } from "lucide-react";
import { Link } from "react-router";

type Seguro = {
  id: number;
  destino: string;
  fecha: string;
  estado: "Pendiente" | "Aprobado";
};

export function SegurosForm() {
  const [destino, setDestino] = useState("");
  const [fecha, setFecha] = useState("");
  const [archivo, setArchivo] = useState<File | null>(null);
  
  const [misSeguros, setMisSeguros] = useState<Seguro[]>([
    { id: 1, destino: "Reserva Ecológica Costanera Sur", fecha: "2026-05-15", estado: "Aprobado" },
    { id: 2, destino: "Planta Potabilizadora San Martín", fecha: "2026-06-10", estado: "Pendiente" },
  ]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setArchivo(e.target.files[0]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (destino && fecha && archivo) {
      const nuevo: Seguro = {
        id: Date.now(),
        destino,
        fecha,
        estado: "Pendiente",
      };
      setMisSeguros([nuevo, ...misSeguros]);
      setDestino("");
      setFecha("");
      setArchivo(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white p-8 md:p-12 rounded-2xl shadow-sm border border-slate-100">
        <Link to="/" className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-800 mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4 mr-1" /> Volver al inicio
        </Link>
        
        <h2 className="text-3xl font-bold text-slate-900 mb-2">Seguros de Campo</h2>
        <p className="text-slate-500 mb-8 pb-6 border-b border-slate-100">
          Solicite la póliza de seguro para salidas de campo subiendo el listado de alumnos en formato Excel.
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Destino de la salida</label>
              <input
                type="text"
                required
                value={destino}
                onChange={(e) => setDestino(e.target.value)}
                placeholder="Ej. Museo de Ciencias Naturales"
                className="w-full bg-white border border-slate-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Fecha programada</label>
              <input
                type="date"
                required
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none text-slate-700"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-2">Listado de Alumnos (Excel)</label>
              <div className="flex items-center justify-center w-full">
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-slate-300 border-dashed rounded-xl cursor-pointer bg-slate-50 hover:bg-slate-100 hover:border-blue-400 transition-colors">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <Upload className="w-8 h-8 text-slate-400 mb-3" />
                    <p className="text-sm text-slate-500">
                      <span className="font-medium text-blue-600">Haga clic para subir</span> o arrastre el archivo
                    </p>
                    <p className="text-xs text-slate-400 mt-1">XLS, XLSX hasta 10MB</p>
                    {archivo && (
                      <p className="text-sm font-medium text-slate-800 mt-2 flex items-center gap-1 bg-white px-3 py-1 rounded shadow-sm">
                        <FileText className="w-4 h-4 text-blue-600" /> {archivo.name}
                      </p>
                    )}
                  </div>
                  <input type="file" className="hidden" accept=".xlsx, .xls" onChange={handleFileChange} />
                </label>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <button
              type="submit"
              disabled={!destino || !fecha || !archivo}
              className="bg-blue-900 text-white font-medium py-3 px-8 rounded-xl hover:bg-blue-800 focus:ring-4 focus:ring-blue-100 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Solicitar Seguro
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
        <h3 className="text-xl font-bold text-slate-900 mb-6">Mis Solicitudes de Seguro</h3>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th scope="col" className="px-6 py-4 rounded-tl-lg font-semibold">ID Ref.</th>
                <th scope="col" className="px-6 py-4 font-semibold">Destino</th>
                <th scope="col" className="px-6 py-4 font-semibold">Fecha Salida</th>
                <th scope="col" className="px-6 py-4 font-semibold">Estado</th>
                <th scope="col" className="px-6 py-4 rounded-tr-lg font-semibold text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {misSeguros.map((seguro) => (
                <tr key={seguro.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4 font-medium text-slate-900">#{seguro.id.toString().slice(-4)}</td>
                  <td className="px-6 py-4 text-slate-700">{seguro.destino}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{new Date(seguro.fecha + 'T00:00:00').toLocaleDateString()}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${
                      seguro.estado === 'Aprobado' 
                        ? 'bg-green-50 text-green-700 border-green-200' 
                        : 'bg-amber-50 text-amber-700 border-amber-200'
                    }`}>
                      {seguro.estado === 'Aprobado' ? (
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500 mr-1.5"></div>
                      ) : (
                        <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-1.5 animate-pulse"></div>
                      )}
                      {seguro.estado}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {seguro.estado === 'Aprobado' ? (
                      <button className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg border border-blue-200">
                        <Download className="w-4 h-4 mr-1.5" /> Póliza PDF
                      </button>
                    ) : (
                      <span className="text-slate-400 text-sm">No disponible</span>
                    )}
                  </td>
                </tr>
              ))}
              {misSeguros.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                    No hay solicitudes de seguros registradas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
