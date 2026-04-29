import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { AlumnoPropuesto, CicloConfig, Tramite } from "../context/TramitesContext";

type SexoGramatical = "F" | "M";

export interface RfInicioPayload {
  rfNumero: string;
  fechaSolicitud: string;
  fechaInicioCiclo: string;
  materia: string;
  anioCarrera: string;
  carrera: string;
  regimen: "Semestral" | "Anual";
  alumnos: Array<{
    nombreCompleto: string;
    dni: string;
    sexoGramatical: SexoGramatical;
  }>;
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
  return `${d.getDate()} días del mes de ${MONTHS_ES[d.getMonth()]} de ${d.getFullYear()}`;
}

function formatFechaLarga(dateLike: string) {
  const d = parseIsoDate(dateLike);
  return `${d.getDate()} de ${MONTHS_ES[d.getMonth()]} de ${d.getFullYear()}`;
}

function formatDni(dni: string) {
  const digits = dni.replace(/\D/g, "");
  if (!digits) return dni;
  return Number(digits).toLocaleString("es-AR");
}

function formatNombreLegal(nombreCompleto: string) {
  const value = nombreCompleto.trim();
  if (!value) return "";
  if (value.includes(",")) return value.toUpperCase();
  return value.toUpperCase();
}

function formatAlumnoLegal(alumno: RfInicioPayload["alumnos"][number]) {
  return `${formatNombreLegal(alumno.nombreCompleto)} – DNI ${formatDni(alumno.dni)}`;
}

function joinListadoAlumnos(alumnos: RfInicioPayload["alumnos"]) {
  if (alumnos.length === 0) return "";
  const formatted = alumnos.map(formatAlumnoLegal);
  if (formatted.length === 1) return formatted[0];
  if (formatted.length === 2) return `${formatted[0]} y ${formatted[1]}`;
  return `${formatted.slice(0, -1).join(", ")} y ${formatted[formatted.length - 1]}`;
}

function getSexoGrupo(alumnos: RfInicioPayload["alumnos"]): SexoGramatical {
  if (alumnos.length === 0) return "M";
  const allF = alumnos.every((a) => a.sexoGramatical === "F");
  return allF ? "F" : "M";
}

function buildGeneroTexto(alumnos: RfInicioPayload["alumnos"]) {
  const cantidad = alumnos.length;
  const sexoGrupo = getSexoGrupo(alumnos);
  const plural = cantidad !== 1;

  const deLosElLaLas = plural
    ? sexoGrupo === "F"
      ? "de las"
      : "de los"
    : sexoGrupo === "F"
      ? "de la"
      : "del";

  const los = plural ? (sexoGrupo === "F" ? "las" : "los") : sexoGrupo === "F" ? "la" : "el";
  const alumnosPalabra = plural ? (sexoGrupo === "F" ? "alumnas" : "alumnos") : sexoGrupo === "F" ? "alumna" : "alumno";
  const ayudantesAlumnos = plural
    ? sexoGrupo === "F"
      ? "Ayudantes Alumnas"
      : "Ayudantes Alumnos"
    : sexoGrupo === "F"
      ? "Ayudante Alumna"
      : "Ayudante Alumno";

  return {
    deLosElLaLas,
    los,
    alumnosPalabra,
    ayudantesAlumnos,
  };
}

export function buildRfInicioPayload(
  tramite: Tramite,
  cicloConfig: CicloConfig,
  rfNumero?: string,
): RfInicioPayload {
  const normalizedAlumnos = tramite.alumnosPropuestos.map((alumno) => ({
    nombreCompleto: alumno.nombreCompleto,
    dni: alumno.dni,
    sexoGramatical: alumno.sexoGramatical ?? "M",
  }));

  return {
    rfNumero: rfNumero?.trim() || "65/2026",
    fechaSolicitud: tramite.fechaSolicitud,
    fechaInicioCiclo: cicloConfig.inicioClases,
    materia: tramite.materia,
    anioCarrera: tramite.anioCarrera,
    carrera: tramite.carrera,
    regimen: tramite.regimen,
    alumnos: normalizedAlumnos,
  };
}

function buildRfInicioLegalText(payload: RfInicioPayload) {
  const fechaLegal = formatFechaLegal(payload.fechaSolicitud);
  const fechaInicio = formatFechaLarga(payload.fechaInicioCiclo);
  const regimen = payload.regimen.toLowerCase();
  const alumnosListado = joinListadoAlumnos(payload.alumnos);
  const genero = buildGeneroTexto(payload.alumnos);

  return [
    `RESOLUCIÓN N°${payload.rfNumero}`,
    "",
    `En la Facultad de Arquitectura y Urbanismo, Campo Castañares, sito en la ciudad de Salta, Capital de la Provincia del mismo nombre, República Argentina, sede de LA UNIVERSIDAD CATÓLICA DE SALTA, a los ${fechaLegal}.`,
    "",
    `La presentación efectuada por la cátedra de ${payload.materia} correspondiente a ${payload.anioCarrera} año de la carrera de ${payload.carrera}, solicitando la designación ${genero.deLosElLaLas} estudiantes ${alumnosListado} como ${genero.ayudantesAlumnos}, y;`,
    "",
    `Que ${genero.los} ${genero.alumnosPalabra} cuya designación se solicita cumple/n con los requisitos exigidos por la Resolución Rectoral N°1193/22.`,
    "",
    `Artículo 1°: DESIGNAR a ${genero.los} ${genero.alumnosPalabra} ${alumnosListado}, como ${genero.ayudantesAlumnos} en la asignatura de ${payload.materia} correspondiente a ${payload.anioCarrera} año, cursado ${regimen}, de la carrera de ${payload.carrera}, a partir del día ${fechaInicio}.`,
    "",
    `Artículo 3°: NOTIFICAR a los docentes de la cátedra ${payload.materia} y alumnos interesados. Regístrese y archívese.`,
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

export async function emitirRfInicioDesdeTemplatePdf(payload: RfInicioPayload) {
  const lines = buildRfInicioLegalText(payload);
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
      size: line.startsWith("RESOLUCIÓN") ? 12 : 10,
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
