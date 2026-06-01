import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { CicloConfig, Tramite } from "../context/TramitesContext";

type SexoGramatical = "F" | "M";

export interface RfInicioAlumno {
  nombreCompleto: string;
  dni: string;
  sexoGramatical: SexoGramatical;
}

export interface RfInicioPayload {
  rfNumero: string;
  fechaSolicitud: string;
  fechaInicioCiclo: string;
  materia: string;
  anioCarrera: string;
  carrera: string;
  regimen: "Semestral" | "Anual";
  alumnos: RfInicioAlumno[];
}

const MONTHS_ES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

function parseIsoDate(dateLike: string) {
  const parsed = new Date(dateLike);
  if (Number.isNaN(parsed.getTime())) return new Date();
  return parsed;
}

function formatFechaLegal(dateLike: string) {
  const d = parseIsoDate(dateLike);
  return `${d.getDate()} dias del mes de ${MONTHS_ES[d.getMonth()]} de ${d.getFullYear()}`;
}

function formatFechaLarga(dateLike: string) {
  const d = parseIsoDate(dateLike);
  return `${d.getDate()} de ${MONTHS_ES[d.getMonth()]} de ${d.getFullYear()}`;
}

function formatDni(dni: string) {
  const digits = dni.replace(/\D/g, "");
  if (!digits) return dni;
  const normalized = digits.padStart(8, "0");
  return `${normalized.slice(0, 2)}.${normalized.slice(2, 5)}.${normalized.slice(5)}`;
}

function formatNombreLegal(nombreCompleto: string) {
  return nombreCompleto.trim().toUpperCase();
}

function formatAlumnoLegal(alumno: RfInicioAlumno) {
  return `${formatNombreLegal(alumno.nombreCompleto)} - DNI ${formatDni(alumno.dni)}`;
}

function joinListadoAlumnos(alumnos: RfInicioAlumno[]) {
  if (alumnos.length === 0) return "";
  const formatted = alumnos.map(formatAlumnoLegal);
  if (formatted.length === 1) return formatted[0];
  if (formatted.length === 2) return `${formatted[0]} y ${formatted[1]}`;
  return `${formatted.slice(0, -1).join(", ")} y ${formatted[formatted.length - 1]}`;
}

function normalizeAnioLegal(raw: string) {
  const lower = raw.trim().toLowerCase();
  if (lower.includes("1")) return "1er ano";
  if (lower.includes("2")) return "2do ano";
  if (lower.includes("3")) return "3er ano";
  if (lower.includes("4")) return "4to ano";
  if (lower.includes("5")) return "5to ano";
  return raw.trim();
}

function buildNumeroResolucionDefault(fechaSolicitud: string) {
  const year = parseIsoDate(fechaSolicitud).getFullYear();
  return `${year}`;
}

function buildPluralTokens(alumnos: RfInicioAlumno[]) {
  const plural = alumnos.length !== 1;
  return {
    deElLos: plural ? "de los" : "del",
    ayudanteAyudantes: plural ? "Ayudantes Alumnos" : "Ayudante Alumno",
    losAlumnos: plural ? "los alumnos" : "el alumno",
    cumpleCumplen: plural ? "cumplen" : "cumple",
    designarElLos: plural ? "DESIGNAR a los alumnos" : "DESIGNAR al alumno",
  };
}

function cleanPayload(payload: RfInicioPayload): RfInicioPayload {
  const alumnos = payload.alumnos
    .map((alumno) => ({
      nombreCompleto: alumno.nombreCompleto.trim(),
      dni: alumno.dni.replace(/\D/g, ""),
      sexoGramatical: alumno.sexoGramatical === "F" ? "F" : "M",
    }))
    .filter((alumno) => alumno.nombreCompleto && alumno.dni);

  return {
    rfNumero: payload.rfNumero.trim() || buildNumeroResolucionDefault(payload.fechaSolicitud),
    fechaSolicitud: payload.fechaSolicitud,
    fechaInicioCiclo: payload.fechaInicioCiclo,
    materia: payload.materia.trim(),
    anioCarrera: normalizeAnioLegal(payload.anioCarrera),
    carrera: payload.carrera.trim(),
    regimen: payload.regimen,
    alumnos,
  };
}

export function buildRfInicioPayload(
  tramite: Tramite,
  cicloConfig: CicloConfig,
  rfNumero?: string,
): RfInicioPayload {
  return cleanPayload({
    rfNumero: rfNumero?.trim() || "",
    fechaSolicitud: tramite.fechaSolicitud,
    fechaInicioCiclo: cicloConfig.inicioClases,
    materia: tramite.materia,
    anioCarrera: tramite.anioCarrera,
    carrera: tramite.carrera,
    regimen: tramite.regimen,
    alumnos: (tramite.alumnosPropuestos ?? []).map((alumno) => ({
      nombreCompleto: alumno.nombreCompleto,
      dni: alumno.dni,
      sexoGramatical: alumno.sexoGramatical ?? "M",
    })),
  });
}

function buildRfInicioLegalText(payloadInput: RfInicioPayload) {
  const payload = cleanPayload(payloadInput);
  const fechaLegal = formatFechaLegal(payload.fechaSolicitud);
  const fechaInicio = formatFechaLarga(payload.fechaInicioCiclo);
  const regimen = payload.regimen.toLowerCase();
  const alumnosListado = joinListadoAlumnos(payload.alumnos);
  const tokens = buildPluralTokens(payload.alumnos);

  return [
    `RESOLUCION Nro ${payload.rfNumero}`,
    "",
    `En la Facultad de Arquitectura y Urbanismo, Campo Castanares, sito en la ciudad de Salta, Capital de la Provincia del mismo nombre, Republica Argentina, sede de LA UNIVERSIDAD CATOLICA DE SALTA, a los ${fechaLegal}.`,
    "",
    `La presentacion efectuada por la catedra de ${payload.materia} correspondiente a ${payload.anioCarrera} de la carrera de ${payload.carrera}, solicitando la designacion ${tokens.deElLos} estudiantes ${alumnosListado} como ${tokens.ayudanteAyudantes}, y;`,
    "",
    `Que ${tokens.losAlumnos} cuya designacion se solicita ${tokens.cumpleCumplen} con los requisitos exigidos por la Resolucion Rectoral Nro 1193/22.`,
    "",
    `Articulo 1: ${tokens.designarElLos} ${alumnosListado}, como ${tokens.ayudanteAyudantes} en la asignatura de ${payload.materia} correspondiente a ${payload.anioCarrera}, cursado ${regimen}, de la carrera de ${payload.carrera}, a partir del dia ${fechaInicio}.`,
    "",
    `Articulo 3: NOTIFICAR a los docentes de la catedra ${payload.materia} y alumnos interesados. Registrese y archivese.`,
  ];
}

async function loadTemplateBytes(): Promise<ArrayBuffer | null> {
  const templateUrl = (import.meta.env.VITE_RF_INICIO_TEMPLATE_PDF_URL ?? "").trim() || "/templates/rf-inicio-template.pdf";
  try {
    const response = await fetch(templateUrl);
    if (!response.ok) return null;
    return await response.arrayBuffer();
  } catch {
    return null;
  }
}

function createFallbackPdfFromText(lines: string[]) {
  const header = "%PDF-1.4\n";
  const escapedLines = lines.map((line) => line.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)"));
  const textBody = ["BT", "/F1 10 Tf", "45 800 Td", ...escapedLines.map((line, idx) => `${idx === 0 ? "" : "0 -14 Td"}(${line}) Tj`), "ET"].join("\n");
  const stream = `${textBody}\n`;
  const objects = [
    "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n",
    "2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n",
    "3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj\n",
    `4 0 obj << /Length ${stream.length} >> stream\n${stream}endstream endobj\n`,
    "5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj\n",
  ];

  let body = "";
  const offsets: number[] = [0];
  for (const obj of objects) {
    offsets.push((header + body).length);
    body += obj;
  }
  const xrefStart = (header + body).length;
  let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i < offsets.length; i += 1) {
    xref += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  const trailer = `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;
  return new TextEncoder().encode(header + body + xref + trailer);
}

export async function emitirRfInicioDesdeTemplatePdf(payloadInput: RfInicioPayload) {
  const lines = buildRfInicioLegalText(payloadInput);
  const templateBytes = await loadTemplateBytes();

  if (!templateBytes) {
    const bytes = createFallbackPdfFromText(lines);
    return new Blob([bytes], { type: "application/pdf" });
  }

  const pdf = await PDFDocument.load(templateBytes);
  const pages = pdf.getPages();
  const firstPage = pages[0];
  const helvetica = await pdf.embedFont(StandardFonts.Helvetica);

  const marginX = 55;
  let y = firstPage.getHeight() - 90;
  for (const line of lines) {
    firstPage.drawText(line, {
      x: marginX,
      y,
      size: line.startsWith("RESOLUCION") ? 12 : 10,
      font: helvetica,
      color: rgb(0, 0, 0),
      maxWidth: firstPage.getWidth() - 100,
      lineHeight: 12,
    });
    y -= line ? 14 : 10;
    if (y < 60) break;
  }

  const mergedBytes = await pdf.save();
  return new Blob([mergedBytes], { type: "application/pdf" });
}
