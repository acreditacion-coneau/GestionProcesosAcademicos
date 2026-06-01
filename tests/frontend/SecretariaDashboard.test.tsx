import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SecretariaDashboard } from "../../src/app/pages/SecretariaDashboard";
import type { SecretariaAutoevaluacionDashboard } from "../../src/app/types/autoevaluacion";
import { campaniaActiva, detalleCompletado } from "../factories/autoevaluacion";
import { renderWithRouter } from "../utils/render";

const segundaCampania = {
  ...campaniaActiva,
  idCampania: "campania-2026-2",
  nombre: "Autoevaluacion 2026 - 2do semestre",
  estado: "cerrada",
  fechaInicio: "2026-08-01",
  fechaFin: "2026-11-30",
};

const dashboardBase: SecretariaAutoevaluacionDashboard = {
  campanias: [campaniaActiva, segundaCampania],
  campaniaActiva,
  totalAsignaciones: 3,
  completadas: 1,
  pendientes: 1,
  vencidas: 1,
  porcentajeCompletado: 33,
  porcentajeCompletadoVista: 40,
  porEstado: [
    { estado: "Completadas", cantidad: 1 },
    { estado: "Pendientes", cantidad: 1 },
    { estado: "Vencidas", cantidad: 1 },
  ],
  porCarrera: [
    {
      carrera: "Arquitectura",
      total: 2,
      completadas: 1,
      pendientes: 1,
      vencidas: 0,
      porcentajeCompletado: 50,
    },
  ],
  docentes: [
    {
      idAsignacion: "asignacion-completada",
      docente: "Ana Sanchez",
      asignatura: "Morfologia",
      carrera: "Arquitectura",
      estado: "completada",
      fechaRespuesta: "2026-03-10T12:00:00.000Z",
      firma: "Firmada",
      firmaHash: "hash-test",
    },
    {
      idAsignacion: "asignacion-pendiente",
      docente: "Carlos Gomez",
      asignatura: "Matematica II",
      carrera: "Arquitectura",
      estado: "pendiente",
      fechaRespuesta: null,
      firma: "Sin firma",
    },
  ],
};

const serviceMock = vi.hoisted(() => ({
  exportarAsignacionExcel: vi.fn(),
  exportarCampaniaExcel: vi.fn(),
  getAutoevaluacionDetalle: vi.fn(),
  getSecretariaAutoevaluacionDashboard: vi.fn(),
}));

vi.mock("../../src/app/services/autoevaluacionService", () => serviceMock);

beforeEach(() => {
  serviceMock.exportarAsignacionExcel.mockResolvedValue(undefined);
  serviceMock.exportarCampaniaExcel.mockResolvedValue(undefined);
  serviceMock.getAutoevaluacionDetalle.mockResolvedValue(detalleCompletado);
  serviceMock.getSecretariaAutoevaluacionDashboard.mockImplementation(async (idCampania?: string) => ({
    ...dashboardBase,
    campaniaActiva: idCampania === segundaCampania.idCampania ? segundaCampania : campaniaActiva,
  }));
});

describe("SecretariaDashboard Centro de Mando", () => {
  it("renderiza KPIs, selector dinamico, filtros y acciones con datos reales del servicio", async () => {
    renderWithRouter(<SecretariaDashboard />);

    expect(await screen.findByText("Centro de Mando - Autoevaluaciones")).toBeInTheDocument();
    expect(screen.getByText("Docentes convocados")).toBeInTheDocument();
    expect(screen.getAllByText("Completadas").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Pendientes").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Vencidas").length).toBeGreaterThan(0);
    expect(screen.getByText("Estado de Autoevaluaciones")).toBeInTheDocument();
    expect(screen.getByText("Cumplimiento por Carrera")).toBeInTheDocument();

    const selector = screen.getByRole("combobox", { name: /seleccionar campa/i });
    await userEvent.selectOptions(selector, segundaCampania.idCampania);
    await waitFor(() => expect(serviceMock.getSecretariaAutoevaluacionDashboard).toHaveBeenCalledWith(segundaCampania.idCampania));

    await userEvent.selectOptions(screen.getByRole("combobox", { name: /filtrar por estado/i }), "pendiente");
    expect(screen.getByText("Carlos Gomez")).toBeInTheDocument();
    expect(screen.queryByText("Ana Sanchez")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /exportar excel$/i }));
    expect(serviceMock.exportarCampaniaExcel).toHaveBeenCalled();

    await userEvent.click(screen.getByRole("button", { name: /ver respuestas de carlos gomez/i }));
    expect(await screen.findByText("Respuestas enviadas")).toBeInTheDocument();
  });
});
