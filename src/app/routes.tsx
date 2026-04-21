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
import { useUser } from "./context/UserContext";

function AuthGuardLayout() {
  const { isAuthenticated, isLoading } = useUser();

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center text-slate-500">Cargando...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Layout />;
}

function LoginRoute() {
  const { isAuthenticated, isLoading } = useUser();

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center text-slate-500">Cargando...</div>;
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <LoginPage />;
}

export const router = createBrowserRouter([
  {
    path: "/login",
    Component: LoginRoute,
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
    ],
  },
]);
