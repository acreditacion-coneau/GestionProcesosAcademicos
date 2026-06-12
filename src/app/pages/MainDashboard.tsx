import { useUser } from "../context/UserContext";
import { TeacherDashboard } from "./TeacherDashboard";
import { JefeCarreraDashboard } from "./JefeCarreraDashboard";
import { ResponsableCatedraDashboard } from "./ResponsableCatedraDashboard";
import { SecretariaDashboard } from "./SecretariaDashboard";
import { AdministrativoDashboard } from "./AdministrativoDashboard";
import { SecTecnicaDashboard } from "./SecTecnicaDashboard";
import { AdminDashboard } from "./AdminDashboard";

export function MainDashboard() {
  const { user, isAdmin } = useUser();

  if (isAdmin) {
    return <AdminDashboard />;
  }

  switch (user.rol) {
    case "DECANO":
      return <AdminDashboard />;
    case "DOCENTE":
      return <TeacherDashboard />;
    case "DOCENTE_RESPONSABLE":
      return <ResponsableCatedraDashboard />;
    case "JEFE_CARRERA":
      return <JefeCarreraDashboard />;
    case "SECRETARIA":
    case "RESPONSABLE_EXTENSION":
    case "RESPONSABLE_INVESTIGACION":
      return <SecretariaDashboard />;
    case "ADMINISTRATIVO":
      return <AdministrativoDashboard />;
    case "SEC_TECNICA":
      return <SecTecnicaDashboard />;
    default:
      return <TeacherDashboard />;
  }
}
