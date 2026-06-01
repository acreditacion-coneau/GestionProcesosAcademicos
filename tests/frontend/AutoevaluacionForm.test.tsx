import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AutoevaluacionForm } from "../../src/app/pages/AutoevaluacionForm";
import {
  asignacionCompletada,
  asignacionPendiente,
  campaniaActiva,
  dashboardJefe,
  dashboardSecretaria,
  detalleCompletado,
  detallePendiente,
  docenteUser,
  jefeCarreraUser,
  secretariaUser,
} from "../factories/autoevaluacion";
import { renderWithRouter } from "../utils/render";

const authMock = vi.hoisted(() => ({
  user: {
    nombre: "Carlos",
    apellido: "Gomez",
    dni: "12345678",
    carrera: "Arquitectura",
    cargo: "Auxiliar",
    materia: "Matematica II",
    rol: "DOCENTE",
    email: "c.gomez@faud.edu.ar",
    idDocente: "docente-1",
  },
}));

const serviceMock = vi.hoisted(() => ({
  cerrarCampania: vi.fn(),
  crearCampania: vi.fn(),
  enviarAutoevaluacion: vi.fn(),
  exportarAsignacionExcel: vi.fn(),
  exportarCampaniaExcel: vi.fn(),
  exportarCampaniaPorCarreraExcel: vi.fn(),
  getAutoevaluacionDetalle: vi.fn(),
  getCampaniaExportRows: vi.fn(),
  getCampanias: vi.fn(),
  getDashboardJefeCarrera: vi.fn(),
  getDashboardSecretaria: vi.fn(),
  getMisAsignaciones: vi.fn(),
  lanzarCampania: vi.fn(),
  registrarAdvertencia: vi.fn(),
  responderAutoevaluacion: vi.fn(),
  resolveDocenteIdByDni: vi.fn(),
}));

vi.mock("../../src/app/context/UserContext", () => ({
  useUser: () => ({ user: authMock.user }),
}));

vi.mock("../../src/app/services/autoevaluacionService", () => serviceMock);

vi.mock("../../src/app/components/autoevaluacion/SignaturePad", () => ({
  SignaturePad: ({ disabled, onChange }: { disabled?: boolean; onChange: (value: string) => void }) => (
    <button type="button" disabled={disabled} onClick={() => onChange("data:image/png;base64,test")}>
      Firmar para test
    </button>
  ),
}));

function setUser(nextUser: typeof authMock.user) {
  authMock.user = nextUser;
}

async function openPendingEvaluation() {
  renderWithRouter(<AutoevaluacionForm />);
  await screen.findByText("Matematica II");
  await userEvent.click(screen.getByRole("button", { name: /iniciar evaluacion/i }));
  await screen.findByText("Formulario docente");
}

async function completeFirstForm() {
  await userEvent.click(screen.getAllByRole("button", { name: "Si" })[0]);
  await userEvent.type(
    screen.getByPlaceholderText("Escriba su respuesta"),
    "Se realizaron consultas semanales y seguimiento por comision.",
  );
  await userEvent.click(screen.getByRole("button", { name: /siguiente formulario/i }));
}

beforeEach(() => {
  setUser(docenteUser as typeof authMock.user);
  serviceMock.getMisAsignaciones.mockResolvedValue([asignacionPendiente]);
  serviceMock.getCampanias.mockResolvedValue([campaniaActiva]);
  serviceMock.getAutoevaluacionDetalle.mockResolvedValue(detallePendiente);
  serviceMock.getDashboardJefeCarrera.mockResolvedValue(dashboardJefe);
  serviceMock.getDashboardSecretaria.mockResolvedValue(dashboardSecretaria);
  serviceMock.getCampaniaExportRows.mockResolvedValue([]);
  serviceMock.crearCampania.mockResolvedValue(campaniaActiva);
  serviceMock.lanzarCampania.mockResolvedValue(undefined);
  serviceMock.responderAutoevaluacion.mockResolvedValue(undefined);
  serviceMock.enviarAutoevaluacion.mockResolvedValue(undefined);
});

describe("Autoevaluacion docente", () => {
  it("renderiza el dashboard docente con estados visuales y acciones", async () => {
    renderWithRouter(<AutoevaluacionForm />);

    expect(await screen.findByText("Mis autoevaluaciones")).toBeInTheDocument();
    expect(screen.getByText("Matematica II")).toBeInTheDocument();
    expect(screen.getByText("Pendiente")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /iniciar evaluacion/i })).toBeInTheDocument();
  });

  it("divide la evaluacion en formularios consecutivos sin categorias internas", async () => {
    await openPendingEvaluation();

    expect(screen.getByText("Formulario 1 de 2")).toBeInTheDocument();
    expect(screen.getByText("1. Cumplio con la planificacion prevista?")).toBeInTheDocument();
    expect(screen.getByText("2. Describa las acciones de acompanamiento realizadas.")).toBeInTheDocument();
    expect(screen.queryByText(/Planificacion academica/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/El equipo conto con recursos suficientes/i)).not.toBeInTheDocument();
  });

  it("bloquea el avance si faltan respuestas obligatorias del formulario actual", async () => {
    await openPendingEvaluation();
    await userEvent.click(screen.getByRole("button", { name: /siguiente formulario/i }));

    expect(screen.getByText(/complete las preguntas obligatorias de este formulario/i)).toBeInTheDocument();
    expect(screen.getAllByText(/complete esta pregunta para continuar/i)).toHaveLength(2);
  });

  it("permite responder SI/NO/A veces, avanzar al segundo formulario y registrar observaciones", async () => {
    await openPendingEvaluation();
    await completeFirstForm();

    expect(screen.getByText("Formulario 2 de 2")).toBeInTheDocument();
    expect(screen.getByText("1. El equipo conto con recursos suficientes?")).toBeInTheDocument();

    await userEvent.click(screen.getAllByRole("button", { name: "No" })[0]);
    await userEvent.click(screen.getAllByRole("button", { name: /\+ agregar observacion/i })[0]);
    await userEvent.type(screen.getByPlaceholderText("Observacion opcional"), "Falto equipamiento especifico.");
    await userEvent.type(screen.getByPlaceholderText("Escriba su respuesta"), "Se solicita mejorar la disponibilidad de aulas taller.");
    await userEvent.click(screen.getByRole("button", { name: /firmar para test/i }));
    await userEvent.click(screen.getByRole("checkbox"));
    await userEvent.click(screen.getByRole("button", { name: /enviar evaluacion/i }));

    await waitFor(() => expect(serviceMock.responderAutoevaluacion).toHaveBeenCalledTimes(1));
    expect(serviceMock.responderAutoevaluacion.mock.calls[0][1]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          idPregunta: "pregunta-3",
          respuesta: "no\nObs: Falto equipamiento especifico.",
        }),
      ]),
    );
    expect(serviceMock.enviarAutoevaluacion).toHaveBeenCalledWith("asignacion-1");
    expect(await screen.findByText("Evaluacion completada")).toBeInTheDocument();
  });

  it("bloquea la edicion de una evaluacion completada", async () => {
    serviceMock.getMisAsignaciones.mockResolvedValue([asignacionCompletada]);
    serviceMock.getAutoevaluacionDetalle.mockResolvedValue(detalleCompletado);

    renderWithRouter(<AutoevaluacionForm />);
    await screen.findByText("Matematica II");
    await userEvent.click(screen.getByRole("button", { name: /visualizar respuestas/i }));
    await screen.findByText("Formulario docente");

    expect(screen.getAllByRole("button", { name: "Si" })[0]).toBeDisabled();
    expect(screen.getByRole("button", { name: /siguiente formulario/i })).toBeDisabled();
  });
});

describe("Paneles institucionales de autoevaluacion", () => {
  it("permite al jefe de carrera crear y lanzar campanias", async () => {
    setUser(jefeCarreraUser as typeof authMock.user);
    const borrador = { ...campaniaActiva, estado: "borrador", nombre: "Campania borrador" };
    serviceMock.getCampanias.mockResolvedValue([borrador]);

    renderWithRouter(<AutoevaluacionForm />);
    await screen.findByText("Panel Jefe de Carrera");

    await userEvent.type(screen.getByPlaceholderText("Nombre de campana"), "Autoevaluacion anual 2026");
    await userEvent.click(screen.getByRole("button", { name: /crear campana/i }));
    await waitFor(() => expect(serviceMock.crearCampania).toHaveBeenCalled());

    const campaignCard = screen
      .getAllByText("Campania borrador")
      .map((element) => element.closest("article"))
      .find(Boolean);
    expect(campaignCard).not.toBeNull();
    await userEvent.click(within(campaignCard as HTMLElement).getByRole("button", { name: /lanzar/i }));
    expect(serviceMock.lanzarCampania).toHaveBeenCalledWith(campaniaActiva.idCampania);
  });

  it("renderiza el dashboard de secretaria con completadas y pendientes", async () => {
    setUser(secretariaUser as typeof authMock.user);

    renderWithRouter(<AutoevaluacionForm />);
    await screen.findByText("Panel Secretaria Academica");

    expect(screen.getByText("Asignaciones")).toBeInTheDocument();
    expect(screen.getByText("Pendientes")).toBeInTheDocument();
    expect(screen.getByText("Completadas")).toBeInTheDocument();
    expect(screen.getAllByText("Autoevaluacion 2026 - 1er semestre").length).toBeGreaterThan(0);
  });
});
