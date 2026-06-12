import { createBrowserRouter, Navigate } from "react-router";
import { Layout } from "./components/Layout";
import { MainDashboard } from "./pages/MainDashboard";
import { Dashboard } from "./pages/Dashboard";
import { AdscriptosFlow } from "./pages/AdscriptosFlow";
import { AutoevaluacionForm } from "./pages/AutoevaluacionForm";
import { SegurosForm } from "./pages/SegurosForm";
import { RepositoriosView } from "./pages/RepositoriosView";
import { NotificacionesPage } from "./pages/NotificacionesPage";
import { LoginPage } from "./pages/LoginPage";
import { DesignacionSelectionPage } from "./pages/DesignacionSelectionPage";
import { ProfilePage } from "./pages/ProfilePage";
import { EvaluacionDocentePage } from "./pages/EvaluacionDocentePage";
import { useUser } from "./context/UserContext";
import type { Role } from "./context/UserContext";

const ROLES_BLOQUEADOS: Role[] = ["DOCENTE"];

function AccesoBloqueado() {
  const { user, logout } = useUser();
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center space-y-5">
        <div className="mx-auto w-14 h-14 rounded-full bg-rose-100 flex items-center justify-center">
          <svg className="w-7 h-7 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Acceso no habilitado</h1>
          <p className="text-sm text-slate-500 mt-2">
            Su cuenta ({user.nombre} {user.apellido ?? ""}) no tiene acceso al sistema de gestión académica.
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Si considera que esto es un error, comuníquese con la Secretaría Académica.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void logout()}
          className="w-full px-4 py-2 rounded-lg bg-slate-100 text-slate-700 text-sm font-medium hover:bg-slate-200 transition-colors"
        >
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}

function AuthGuardLayout() {
  const { isAuthenticated, isLoading, needsDesignacionSelection, user } = useUser();

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center text-slate-500">Cargando...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (needsDesignacionSelection) {
    return <Navigate to="/seleccionar-designacion" replace />;
  }

  const tieneDesignacionResponsable = (user.designaciones ?? []).some(
    (d) => d.academicRole === "DOCENTE_RESPONSABLE"
  );
  if (ROLES_BLOQUEADOS.includes(user.rol) && !tieneDesignacionResponsable) {
    return <AccesoBloqueado />;
  }

  return <Layout />;
}

function LoginRoute() {
  const { isAuthenticated, isLoading, needsDesignacionSelection } = useUser();

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center text-slate-500">Cargando...</div>;
  }

  if (isAuthenticated) {
    return <Navigate to={needsDesignacionSelection ? "/seleccionar-designacion" : "/"} replace />;
  }

  return <LoginPage />;
}

function DesignacionSelectionRoute() {
  const { isAuthenticated, isLoading, needsDesignacionSelection } = useUser();

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center text-slate-500">Cargando...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!needsDesignacionSelection) {
    return <Navigate to="/" replace />;
  }

  return <DesignacionSelectionPage />;
}

export const router = createBrowserRouter([
  {
    path: "/login",
    Component: LoginRoute,
  },
  {
    path: "/seleccionar-designacion",
    Component: DesignacionSelectionRoute,
  },
  {
    path: "/",
    Component: AuthGuardLayout,
    children: [
      {
        index: true,
        Component: MainDashboard,
      },
      {
        path: "ayudantes",
        Component: Dashboard,
      },
      {
        path: "adscriptos",
        Component: AdscriptosFlow,
      },
      {
        path: "autoevaluacion",
        Component: AutoevaluacionForm,
      },
      {
        path: "seguros",
        Component: SegurosForm,
      },
      {
        path: "repositorios",
        Component: RepositoriosView,
      },
      {
        path: "notificaciones",
        Component: NotificacionesPage,
      },
      {
        path: "perfil",
        Component: ProfilePage,
      },
      {
        path: "evaluacion-docente",
        Component: EvaluacionDocentePage,
      },
    ],
  },
]);
