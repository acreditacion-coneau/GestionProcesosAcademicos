import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { hasSupabaseConfig, supabase } from "../../../lib/supabaseClient";
import type { CicloConfig, Tramite } from "../../context/TramitesContext";
import { FIELD_MAP, type PdfFieldKey } from "./pdfFieldMap";
import { buildDefaultPdfName, loadInstitutionalTemplatePdf } from "./pdfTemplates";

const BUCKET_DOCUMENTOS = "documentos";

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

export interface RfInicioAlumnoDraft {
  nombre: string;
  apellido: string;
  dni: string;
  sexoGramatical: "F" | "M";
}

export interface RfInicioPdfDraft {
  idSolicitud: string;
  numeroResolucion: string;
  nombrePdf: string;
  fechaSolicitud: string;
  fechaInicioCiclo: string;
  asignatura: string;
  anioAsignatura: string;
  carrera: string;
  regimen: "Anual" | "Semestral";
  alumnos: RfInicioAlumnoDraft[];
}

export interface GeneratePdfOptions {
  debug?: boolean;
}

export interface GeneratedPdfResult {
  blob: Blob;
  fileName: string;
  draft: RfInicioPdfDraft;
}

interface SupabaseRow {
  [key: string]: unknown;
}

function asText(value: unknown, fallback = ""): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "bigint") return String(value);
  return fallback;
}

function asDateIso(value: unknown, fallbackIso: string): string {
  const raw = asText(value, fallbackIso);
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return fallbackIso;
  return parsed.toISOString();
}

function normalizeRegimen(raw: string): "Anual" | "Semestral" {
  return raw.toLowerCase().includes("anual") ? "Anual" : "Semestral";
}

function normalizeAnio(raw: string): string {
  const number = Number.parseInt(raw.replace(/\D/g, ""), 10);
  if (!Number.isFinite(number)) return raw.trim();
  if (number === 1) return "1er ano";
  if (number === 2) return "2do ano";
  if (number === 3) return "3er ano";
  if (number === 4) return "4to ano";
  if (number === 5) return "5to ano";
  return `${number}to ano`;
}

function safeDate(input: string): Date {
  const parsed = new Date(input);
  if (Number.isNaN(parsed.getTime())) return new Date();
  return parsed;
}

function formatFechaLegal(iso: string): string {
  const date = safeDate(iso);
  return `${date.getDate()} dias del mes de ${MONTHS_ES[date.getMonth()]} de ${date.getFullYear()}`;
}

function formatFechaLarga(iso: string): string {
  const date = safeDate(iso);
  return `${date.getDate()} de ${MONTHS_ES[date.getMonth()]} de ${date.getFullYear()}`;
}

function formatDni(dni: string): string {
  const digits = dni.replace(/\D/g, "");
  if (!digits) return dni;
  const padded = digits.padStart(8, "0");
  return `${padded.slice(0, 2)}.${padded.slice(2, 5)}.${padded.slice(5)}`;
}

function splitFullName(fullName: string): { nombre: string; apellido: string } {
  const clean = fullName.trim().replace(/\s+/g, " ");
  if (!clean) return { nombre: "", apellido: "" };
  const parts = clean.split(" ");
  if (parts.length === 1) return { nombre: parts[0], apellido: "" };
  return {
    nombre: parts.slice(0, -1).join(" "),
    apellido: parts.slice(-1).join(" "),
  };
}

function normalizeAlumno(alumno: Partial<RfInicioAlumnoDraft>): RfInicioAlumnoDraft {
  const nombre = asText(alumno.nombre, "");
  const apellido = asText(alumno.apellido, "");
  const dni = asText(alumno.dni, "").replace(/\D/g, "");
  return {
    nombre,
    apellido,
    dni,
    sexoGramatical: alumno.sexoGramatical === "F" ? "F" : "M",
  };
}

function cleanDraft(draft: RfInicioPdfDraft): RfInicioPdfDraft {
  const alumnos = draft.alumnos
    .map(normalizeAlumno)
    .filter((alumno) => (alumno.nombre || alumno.apellido) && alumno.dni)
    .slice(0, 2);

  return {
    ...draft,
    numeroResolucion: draft.numeroResolucion.trim(),
    nombrePdf: draft.nombrePdf.trim(),
    asignatura: draft.asignatura.trim(),
    anioAsignatura: normalizeAnio(draft.anioAsignatura),
    carrera: draft.carrera.trim(),
    regimen: normalizeRegimen(draft.regimen),
    alumnos,
  };
}

function joinAlumnosLegal(alumnos: RfInicioAlumnoDraft[]): string {
  const list = alumnos.map((alumno) => {
    const apellido = (alumno.apellido || "").trim().toUpperCase();
    const nombre = (alumno.nombre || "").trim().toUpperCase();
    const nombreLegal = apellido && nombre ? `${apellido}, ${nombre}` : `${apellido}${nombre}`.trim();
    return `${nombreLegal} - DNI ${formatDni(alumno.dni)}`;
  });
  if (list.length <= 1) return list[0] ?? "";
  if (list.length === 2) return `${list[0]} y ${list[1]}`;
  return `${list.slice(0, -1).join(", ")} y ${list[list.length - 1]}`;
}

function buildPluralTokens(count: number) {
  const plural = count !== 1;
  return {
    deElLos: plural ? "de los" : "del",
    ayudanteAyudantes: plural ? "Ayudantes Alumnos" : "Ayudante Alumno",
    losAlumnos: plural ? "los alumnos" : "el alumno",
    cumpleCumplen: plural ? "cumplen" : "cumple",
    designarElLos: plural ? "DESIGNAR a los alumnos" : "DESIGNAR al alumno",
  };
}

function mapTextFields(draftInput: RfInicioPdfDraft): Record<PdfFieldKey, string> {
  const draft = cleanDraft(draftInput);
  const alumnosLegal = joinAlumnosLegal(draft.alumnos);
  const plural = buildPluralTokens(draft.alumnos.length);
  const regimen = draft.regimen.toLowerCase();

  return {
    numero_resolucion: `${draft.numeroResolucion}`,
    fecha_legal: formatFechaLegal(draft.fechaSolicitud),
    visto_solicitud:
      `La presentacion efectuada por la catedra de ${draft.asignatura} correspondiente a ${draft.anioAsignatura} de la carrera de ${draft.carrera}, solicitando la designacion ${plural.deElLos} estudiantes ${alumnosLegal} como ${plural.ayudanteAyudantes}, y;`,
    considerando_requisitos:
      `Que ${plural.losAlumnos} cuya designacion se solicita ${plural.cumpleCumplen} con los requisitos exigidos por la Resolucion Rectoral Nro 1193/22.`,
    articulo_1:
      `Articulo 1: ${plural.designarElLos} ${alumnosLegal}, como ${plural.ayudanteAyudantes} en la asignatura de ${draft.asignatura} correspondiente a ${draft.anioAsignatura}, cursado ${regimen}, de la carrera de ${draft.carrera}, a partir del dia ${formatFechaLarga(draft.fechaInicioCiclo)}.`,
    articulo_3:
      `Articulo 3: NOTIFICAR a los docentes de la catedra ${draft.asignatura} y alumnos interesados. Registrese y archivese.`,
  };
}

function wrapTextByWidth(
  text: string,
  maxWidth: number,
  fontSize: number,
  maxLines: number,
  font: StandardFonts | any,
): { lines: string[]; overflow: boolean } {
  const words = text.replace(/\s+/g, " ").trim().split(" ");
  if (words.length === 0) return { lines: [""], overflow: false };

  const lines: string[] = [];
  let current = "";
  let overflow = false;

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    const width = font.widthOfTextAtSize(candidate, fontSize);
    if (width <= maxWidth) {
      current = candidate;
      continue;
    }

    if (current) {
      lines.push(current);
      current = word;
    } else {
      lines.push(word);
      overflow = overflow || font.widthOfTextAtSize(word, fontSize) > maxWidth;
      current = "";
    }

    if (lines.length >= maxLines) {
      overflow = true;
      break;
    }
  }

  if (!overflow && lines.length < maxLines && current) {
    lines.push(current);
  } else if (current) {
    overflow = true;
  }

  if (lines.length <= maxLines) return { lines, overflow };
  return { lines: lines.slice(0, maxLines), overflow: true };
}

function truncateLastLine(line: string, maxWidth: number, fontSize: number, font: StandardFonts | any): string {
  const ellipsis = "...";
  if (font.widthOfTextAtSize(line, fontSize) <= maxWidth) return line;

  let text = line;
  while (text.length > 0) {
    const candidate = `${text}${ellipsis}`;
    if (font.widthOfTextAtSize(candidate, fontSize) <= maxWidth) return candidate;
    text = text.slice(0, -1);
  }
  return ellipsis;
}

function drawField(params: {
  page: any;
  text: string;
  bounds: (typeof FIELD_MAP)[PdfFieldKey];
  font: any;
  debug?: boolean;
  key: PdfFieldKey;
}) {
  const { page, text, bounds, font, debug, key } = params;
  const minFontSize = 7;
  let selectedFontSize = bounds.fontSize;
  let wrapped = wrapTextByWidth(text, bounds.maxWidth, selectedFontSize, bounds.maxLines, font);

  const hasLineOverflow = (lines: string[], fontSize: number) =>
    lines.some((line) => font.widthOfTextAtSize(line, fontSize) > bounds.maxWidth);

  while ((wrapped.overflow || hasLineOverflow(wrapped.lines, selectedFontSize)) && selectedFontSize > minFontSize) {
    selectedFontSize = Math.max(minFontSize, selectedFontSize - 0.5);
    wrapped = wrapTextByWidth(text, bounds.maxWidth, selectedFontSize, bounds.maxLines, font);
  }

  const capped = wrapped.lines.slice(0, bounds.maxLines);
  if (wrapped.overflow && capped.length > 0) {
    const lastIndex = capped.length - 1;
    capped[lastIndex] = truncateLastLine(capped[lastIndex], bounds.maxWidth, selectedFontSize, font);
  }

  capped.forEach((line, index) => {
    page.drawText(line, {
      x: bounds.x,
      y: bounds.y + bounds.fieldHeight - bounds.lineHeight - index * bounds.lineHeight,
      size: selectedFontSize,
      font,
      color: rgb(0, 0, 0),
      maxWidth: bounds.maxWidth,
      lineHeight: bounds.lineHeight,
    });
  });

  if (debug) {
    page.drawRectangle({
      x: bounds.x,
      y: bounds.y,
      width: bounds.maxWidth,
      height: bounds.fieldHeight,
      borderColor: rgb(1, 0, 0),
      borderWidth: 1,
      color: rgb(1, 1, 1),
      opacity: 0,
    });
    page.drawText(key, {
      x: bounds.x,
      y: bounds.y + bounds.fieldHeight + 2,
      size: 6,
      font,
      color: rgb(0.45, 0.45, 0.45),
    });
  }
}

function isRecoverableError(error: unknown): boolean {
  const code = (error as { code?: string })?.code;
  if (code && ["42P01", "42703", "PGRST205", "42501"].includes(code)) return true;
  const message = ((error as { message?: string })?.message ?? "").toLowerCase();
  return message.includes("does not exist") || message.includes("column") || message.includes("relation");
}

async function loadFechaInicioCiclo(fallback?: string): Promise<string> {
  const defaultIso = fallback || new Date(new Date().getFullYear(), 2, 1).toISOString();
  if (!hasSupabaseConfig) return defaultIso;

  const { data, error } = await supabase
    .from("configuracion_sistema")
    .select("clave,valor")
    .in("clave", ["fecha_inicio_ciclo", "inicio_clases", "inicioClases"]);

  if (error) return defaultIso;
  const rows = (data ?? []) as SupabaseRow[];
  const byKey = new Map<string, string>();
  rows.forEach((row) => {
    const key = asText(row.clave).toLowerCase();
    const value = asText(row.valor);
    if (key && value) byKey.set(key, value);
  });

  return byKey.get("fecha_inicio_ciclo") || byKey.get("inicio_clases") || byKey.get("inicioclases") || defaultIso;
}

function defaultNumeroResolucion(iso: string): string {
  const year = safeDate(iso).getFullYear();
  return `65/${year}`;
}

async function loadStoredResolutionData(idSolicitud: string): Promise<Partial<RfInicioPdfDraft>> {
  if (!hasSupabaseConfig) return {};

  const primary = await supabase
    .from("documentos_solicitud")
    .select("numero_resolucion,nombre_archivo")
    .eq("id_solicitud", idSolicitud)
    .eq("tipo_documento", "resolucion_inicio")
    .order("fecha_subida", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (primary.error && !isRecoverableError(primary.error)) {
    throw new Error(`No se pudo consultar numero de resolucion previo: ${primary.error.message}`);
  }

  if (!primary.error && primary.data) {
    const row = primary.data as SupabaseRow;
    return {
      numeroResolucion: asText(row.numero_resolucion, ""),
      nombrePdf: asText(row.nombre_archivo, ""),
    };
  }

  const fallback = await supabase
    .from("documentos_solicitud")
    .select("nombre_archivo")
    .eq("id_solicitud", idSolicitud)
    .eq("tipo_documento", "resolucion_inicio")
    .order("fecha_subida", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (fallback.error) return {};
  const fileName = asText((fallback.data as SupabaseRow | null)?.nombre_archivo, "");
  return { nombrePdf: fileName };
}

export async function buildRfInicioDraftFromSupabase(params: {
  idSolicitud: string;
  tramiteFallback?: Tramite;
  cicloConfigFallback?: CicloConfig;
}): Promise<RfInicioPdfDraft> {
  const nowIso = new Date().toISOString();
  const fallback = params.tramiteFallback;

  let idAsignatura = "";
  let fechaSolicitud = fallback?.fechaSolicitud || nowIso;
  let asignatura = fallback?.materia || "";
  let anioAsignatura = fallback?.anioCarrera || "";
  let carrera = fallback?.carrera || "";
  let regimen: "Anual" | "Semestral" = fallback?.regimen === "Anual" ? "Anual" : "Semestral";

  const fallbackAlumnos = (fallback?.alumnosPropuestos ?? []).map((alumno) => {
    const split = splitFullName(alumno.nombreCompleto);
    return {
      nombre: split.nombre,
      apellido: split.apellido,
      dni: alumno.dni,
      sexoGramatical: alumno.sexoGramatical,
    } satisfies RfInicioAlumnoDraft;
  });

  let alumnos = fallbackAlumnos;

  if (hasSupabaseConfig) {
    const solicitudRes = await supabase
      .from("solicitudes")
      .select("id_solicitud,id_asignatura,fecha_creacion,fecha_actualizacion")
      .eq("id_solicitud", params.idSolicitud)
      .limit(1)
      .maybeSingle();

    if (solicitudRes.error) {
      throw new Error(`No se pudo cargar la solicitud para PDF: ${solicitudRes.error.message}`);
    }

    if (solicitudRes.data) {
      const row = solicitudRes.data as SupabaseRow;
      idAsignatura = asText(row.id_asignatura, "");
      fechaSolicitud = asDateIso(row.fecha_creacion ?? row.fecha_actualizacion, fechaSolicitud);
    }

    if (idAsignatura) {
      const asigRes = await supabase
        .from("asignaturas")
        .select("id_asignatura,id_carrera,nombre,anio,regimen")
        .eq("id_asignatura", idAsignatura)
        .limit(1)
        .maybeSingle();

      if (asigRes.error) {
        throw new Error(`No se pudo cargar asignatura para PDF: ${asigRes.error.message}`);
      }

      if (asigRes.data) {
        const asig = asigRes.data as SupabaseRow;
        asignatura = asText(asig.nombre, asignatura);
        anioAsignatura = asText(asig.anio, anioAsignatura);
        regimen = normalizeRegimen(asText(asig.regimen, regimen));

        const carreraId = asText(asig.id_carrera, "");
        if (carreraId) {
          const carreraRes = await supabase
            .from("carreras")
            .select("id_carrera,nombre")
            .eq("id_carrera", carreraId)
            .limit(1)
            .maybeSingle();
          if (!carreraRes.error && carreraRes.data) {
            carrera = asText((carreraRes.data as SupabaseRow).nombre, carrera);
          }
        }
      }
    }

    const postulantesRes = await supabase
      .from("solicitud_postulantes")
      .select("nombre,apellido,dni")
      .eq("id_solicitud", params.idSolicitud);

    if (!postulantesRes.error && (postulantesRes.data ?? []).length > 0) {
      alumnos = (postulantesRes.data as SupabaseRow[])
        .map((row) => ({
          nombre: asText(row.nombre),
          apellido: asText(row.apellido),
          dni: asText(row.dni),
          sexoGramatical: "M" as const,
        }))
        .filter((alumno) => (alumno.nombre || alumno.apellido) && alumno.dni);
    }
  }

  const fechaInicioCiclo = await loadFechaInicioCiclo(params.cicloConfigFallback?.inicioClases);
  const previous = await loadStoredResolutionData(params.idSolicitud);

  const numeroResolucion = previous.numeroResolucion?.trim() || defaultNumeroResolucion(fechaSolicitud);
  const nombrePdf = previous.nombrePdf?.trim() || buildDefaultPdfName({ asignatura, fechaSolicitud });

  return cleanDraft({
    idSolicitud: params.idSolicitud,
    numeroResolucion,
    nombrePdf,
    fechaSolicitud,
    fechaInicioCiclo,
    asignatura,
    anioAsignatura,
    carrera,
    regimen,
    alumnos,
  });
}

export async function generateRfInicioPdf(
  draftInput: RfInicioPdfDraft,
  debugMode: boolean = false,
  options?: GeneratePdfOptions,
): Promise<GeneratedPdfResult> {
  const draft = cleanDraft(draftInput);
  if (!draft.numeroResolucion) {
    throw new Error("Debe ingresar numero de resolucion.");
  }
  if (draft.alumnos.length === 0) {
    throw new Error("Debe haber al menos un alumno para generar la resolucion.");
  }

  const templateBytes = await loadInstitutionalTemplatePdf();
  const pdfDoc = await PDFDocument.load(templateBytes);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const fields = mapTextFields(draft);
  (Object.keys(FIELD_MAP) as PdfFieldKey[]).forEach((key) => {
    const bounds = FIELD_MAP[key];
    const page = pdfDoc.getPage(bounds.pageIndex);
    drawField({
      page,
      text: fields[key],
      bounds,
      font,
      debug: debugMode || options?.debug === true,
      key,
    });
  });

  const bytes = await pdfDoc.save();
  return {
    blob: new Blob([bytes], { type: "application/pdf" }),
    fileName: draft.nombrePdf.endsWith(".pdf") ? draft.nombrePdf : `${draft.nombrePdf}.pdf`,
    draft,
  };
}

function normalizeUserIdForFk(idUsuario?: string): number | null {
  if (!idUsuario) return null;
  if (/^\d+$/.test(idUsuario)) return Number.parseInt(idUsuario, 10);
  return null;
}

function sanitizeFileName(fileName: string): string {
  return fileName.replace(/[^A-Za-z0-9_.-]+/g, "_");
}

async function insertDocumentoSolicitudRow(params: {
  idSolicitud: string;
  storagePath: string;
  fileName: string;
  publicUrl: string;
  userId: number | string | null;
  numeroResolucion: string;
}) {
  const payloadPrimary = {
    id_solicitud: params.idSolicitud,
    tipo_documento: "resolucion_inicio",
    nombre_archivo: params.fileName,
    ruta_storage: params.storagePath,
    url_documento: params.publicUrl,
    fecha_generacion: new Date().toISOString(),
    generado_por: params.userId,
    subido_por: params.userId,
    fecha_subida: new Date().toISOString(),
    numero_resolucion: params.numeroResolucion,
  };

  const primaryInsert = await supabase.from("documentos_solicitud").insert(payloadPrimary);
  if (!primaryInsert.error) return;

  if (!isRecoverableError(primaryInsert.error)) {
    throw new Error(`No se pudo registrar PDF en documentos_solicitud: ${primaryInsert.error.message}`);
  }

  const payloadFallback = {
    id_solicitud: params.idSolicitud,
    tipo_documento: "resolucion_inicio",
    nombre_archivo: params.fileName,
    ruta_storage: params.storagePath,
    subido_por: params.userId,
    fecha_subida: new Date().toISOString(),
  };

  const fallbackInsert = await supabase.from("documentos_solicitud").insert(payloadFallback);
  if (fallbackInsert.error) {
    throw new Error(`No se pudo registrar PDF en documentos_solicitud: ${fallbackInsert.error.message}`);
  }
}

export async function uploadAndRegisterRfInicioPdf(params: {
  generated: GeneratedPdfResult;
  idUsuario?: string;
}): Promise<{ publicUrl: string; storagePath: string }> {
  if (!hasSupabaseConfig) {
    throw new Error("Supabase no esta configurado.");
  }

  const cleanFile = sanitizeFileName(params.generated.fileName);
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const storagePath = `resoluciones/inicio/${params.generated.draft.idSolicitud}/${stamp}_${cleanFile}`;

  const uploadRes = await supabase.storage
    .from(BUCKET_DOCUMENTOS)
    .upload(storagePath, params.generated.blob, {
      upsert: true,
      contentType: "application/pdf",
    });

  if (uploadRes.error) {
    throw new Error(`No se pudo subir el PDF al bucket documentos: ${uploadRes.error.message}`);
  }

  const publicUrl = supabase.storage.from(BUCKET_DOCUMENTOS).getPublicUrl(storagePath).data.publicUrl;
  const userId = normalizeUserIdForFk(params.idUsuario);

  await insertDocumentoSolicitudRow({
    idSolicitud: params.generated.draft.idSolicitud,
    storagePath,
    fileName: cleanFile,
    publicUrl,
    userId,
    numeroResolucion: params.generated.draft.numeroResolucion,
  });

  return { publicUrl, storagePath };
}
