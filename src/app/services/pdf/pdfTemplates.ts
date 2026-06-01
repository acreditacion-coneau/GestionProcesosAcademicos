export const RF_INICIO_TEMPLATE_URL =
  (import.meta.env.VITE_RF_INICIO_TEMPLATE_PDF_URL ?? "").trim() || "/templates/rf-inicio-template.pdf";

export async function loadInstitutionalTemplatePdf(): Promise<ArrayBuffer> {
  const response = await fetch(RF_INICIO_TEMPLATE_URL);
  if (!response.ok) {
    throw new Error(`No se pudo cargar la plantilla institucional (${response.status}).`);
  }
  return response.arrayBuffer();
}

function sanitizeFileToken(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toUpperCase();
}

export function buildDefaultPdfName(params: {
  asignatura: string;
  fechaSolicitud: string;
}): string {
  const year = Number.isNaN(new Date(params.fechaSolicitud).getTime())
    ? new Date().getFullYear()
    : new Date(params.fechaSolicitud).getFullYear();
  const materia = sanitizeFileToken(params.asignatura || "ASIGNATURA");
  return `RF_INICIO_AYUDANTIA_${materia}_${year}.pdf`;
}
