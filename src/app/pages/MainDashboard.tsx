import { useUser } from "../context/UserContext";
import { TeacherDashboard } from "./TeacherDashboard";
import { JefeCarreraDashboard } from "./JefeCarreraDashboard";
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
    case "DOCENTE":
    case "DOCENTE_RESPONSABLE":
      return <TeacherDashboard />;
    case "JEFE_CARRERA":
      return <JefeCarreraDashboard />;
    case "SECRETARIA":
      return <SecretariaDashboard />;
    case "ADMINISTRATIVO":
      return <AdministrativoDashboard />;
    case "SEC_TECNICA":
      return <SecTecnicaDashboard />;
    default:
      return <TeacherDashboard />;
  }
}
