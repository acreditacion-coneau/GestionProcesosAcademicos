import { useState } from "react";
import { useNavigate } from "react-router";
import { useUser } from "../context/UserContext";
import { User, Lock, Eye, EyeOff, ArrowRight } from "lucide-react";

export function LoginPage() {
  const navigate = useNavigate();
  const { loginWithCredentials, isLoading } = useUser();

  const [dni, setDni] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage("");

    const result = await loginWithCredentials(dni, password);

    setIsSubmitting(false);

    if (!result.ok) {
      setErrorMessage(result.error ?? "No se pudo iniciar sesión.");
      return;
    }

    navigate("/", { replace: true });
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans text-slate-800">
      <div className="w-full md:w-1/2 relative flex flex-col items-center justify-center p-12 bg-blue-900 overflow-hidden min-h-[40vh] md:min-h-screen">
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1769283998994-f8f892a90dc9?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhcmNoaXRlY3R1cmUlMjB1bml2ZXJzaXR5JTIwYnVpbGRpbmclMjBmYWNhZGUlMjBkYXJrfGVufDF8fHx8MTc3NjI2MDgzMHww&ixlib=rb-4.1.0&q=80&w=1080"
            alt="Facultad de Arquitectura"
            className="w-full h-full object-cover mix-blend-overlay opacity-50"
          />
          <div className="absolute inset-0 bg-blue-900/80 mix-blend-multiply" />
        </div>

        <div className="relative z-10 text-center animate-in fade-in slide-in-from-bottom-4 duration-700">
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-4 tracking-tight">Gestiones FAU</h1>
          <p className="text-xl md:text-2xl text-blue-100 font-light">Portal Docente y Administrativo</p>
        </div>
      </div>

      <div className="w-full md:w-1/2 bg-white flex items-center justify-center p-8 sm:p-12 lg:p-24 shadow-2xl z-10">
        <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-500 delay-150">
          <div className="mb-10 text-center md:text-left">
            <h2 className="text-3xl font-bold text-slate-900 mb-2 tracking-tight">Bienvenido al portal</h2>
            <p className="text-slate-500">Ingrese sus credenciales para continuar.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Número de DNI o usuario</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <User className={`h-5 w-5 ${errorMessage ? "text-red-500" : "text-slate-400"}`} />
                </div>
                <input
                  type="text"
                  value={dni}
                  onChange={(e) => {
                    setDni(e.target.value);
                    if (errorMessage) setErrorMessage("");
                  }}
                  className={`block w-full pl-11 pr-4 py-3.5 border-2 rounded-xl bg-slate-50 text-slate-900 transition-colors focus:outline-none focus:ring-0 ${
                    errorMessage
                      ? "border-red-400 focus:border-red-500 bg-red-50"
                      : "border-slate-200 focus:border-blue-600 focus:bg-white"
                  }`}
                  placeholder="Ej: 12345678 o admin"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Contraseña</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errorMessage) setErrorMessage("");
                  }}
                  className="block w-full pl-11 pr-12 py-3.5 border-2 border-slate-200 rounded-xl bg-slate-50 text-slate-900 transition-colors focus:outline-none focus:ring-0 focus:border-blue-600 focus:bg-white"
                  placeholder="Ingrese su contraseña"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 transition-colors focus:outline-none"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {errorMessage ? (
              <p className="text-sm text-red-500 font-medium">{errorMessage}</p>
            ) : (
              <p className="text-sm text-slate-500">
                Usuarios: contraseña igual al DNI. Admin: usuario <strong>admin</strong> y contraseña <strong>ucasal2022</strong>.
              </p>
            )}

            <button
              type="submit"
              disabled={isSubmitting || isLoading}
              className="w-full flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-700 text-white font-bold text-lg px-6 py-4 rounded-xl shadow-lg shadow-orange-600/20 transition-all hover:-translate-y-0.5 mt-4 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0"
            >
              {isSubmitting ? "Validando credenciales..." : "Ingresar al Sistema"}
              <ArrowRight className="w-5 h-5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
