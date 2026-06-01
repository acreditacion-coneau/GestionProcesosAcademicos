import { hasSupabaseConfig, supabase } from "../../lib/supabaseClient";

export type TipoDocumentoArchivo = "FICHA" | "INFORME" | "RF_INICIO" | "RF_CIERRE" | "CV" | "OTRO";

interface ArchiveParams {
  idSolicitud: string;
  tipo: TipoDocumentoArchivo;
  fileName: string;
  blob: Blob;
  actor: string;
  idUsuario?: string;
}

interface ArchivedDocumentResult {
  url: string;
  storagePath: string;
  source: "supabase";
}

const DOCUMENTOS_BUCKET = "documentos";

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[^\w.\-]+/g, "_");
}

function isPdfFile(blob: Blob, fileName: string) {
  const normalizedName = fileName.toLowerCase();
  return blob.type === "application/pdf" || normalizedName.endsWith(".pdf");
}

function mapTipoDocumento(tipo: TipoDocumentoArchivo): string {
  if (tipo === "FICHA") return "ficha_academica";
  if (tipo === "INFORME") return "informe_desempeno";
  if (tipo === "RF_INICIO") return "resolucion_inicio";
  if (tipo === "RF_CIERRE") return "resolucion_final";
  if (tipo === "CV") return "cv";
  return "otro";
}

function normalizeUserIdForFk(idUsuario?: string): number | string | null {
  if (!idUsuario) return null;
  if (/^\d+$/.test(idUsuario)) return Number.parseInt(idUsuario, 10);
  return idUsuario;
}

function isRecoverableError(error: unknown): boolean {
  const code = (error as { code?: string })?.code;
  if (code && ["42P01", "42703", "PGRST205", "42501"].includes(code)) return true;
  const message = (error as { message?: string })?.message?.toLowerCase() ?? "";
  return message.includes("relation")
    || message.includes("column")
    || message.includes("does not exist")
    || message.includes("permission denied")
    || message.includes("forbidden");
}

export async function archiveDocument(params: ArchiveParams): Promise<ArchivedDocumentResult> {
  if (!hasSupabaseConfig) {
    throw new Error("Supabase no esta configurado. No se puede subir el documento.");
  }

  if (!isPdfFile(params.blob, params.fileName)) {
    throw new Error("Solo se permiten archivos PDF.");
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const safeFileName = sanitizeFileName(params.fileName);
  const storagePath = `${params.idSolicitud}/${timestamp}_${safeFileName}`;

  const { error: uploadError } = await supabase.storage
    .from(DOCUMENTOS_BUCKET)
    .upload(storagePath, params.blob, {
      contentType: "application/pdf",
      upsert: true,
    });

  if (uploadError) {
    throw new Error(`No se pudo subir el PDF a Supabase Storage: ${uploadError.message}`);
  }

  const publicUrl = supabase.storage.from(DOCUMENTOS_BUCKET).getPublicUrl(storagePath).data.publicUrl;
  const userIdFk = normalizeUserIdForFk(params.idUsuario);

  const insertNew = await supabase.from("documentos_solicitud").insert({
    id_solicitud: params.idSolicitud,
    tipo_documento: mapTipoDocumento(params.tipo),
    nombre_archivo: params.fileName,
    ruta_storage: storagePath,
    subido_por: userIdFk,
    fecha_subida: new Date().toISOString(),
  });

  if (insertNew.error && !isRecoverableError(insertNew.error)) {
    throw new Error(`No se pudo registrar documento en documentos_solicitud: ${insertNew.error.message}`);
  }

  if (insertNew.error && isRecoverableError(insertNew.error)) {
    const { data: archivoInsertado, error: insertArchivoError } = await supabase
      .from("archivos")
      .insert({
        nombre_original: params.fileName,
        nombre_storage: storagePath,
        bucket: DOCUMENTOS_BUCKET,
        url_publica: publicUrl,
        tipo_mime: "application/pdf",
        tamaño: params.blob.size,
        categoria: params.tipo,
        entidad_tipo: "solicitud",
        entidad_id: params.idSolicitud,
        subido_por: userIdFk ?? params.actor,
        id_usuario: userIdFk,
        created_at: new Date().toISOString(),
      })
      .select("id_archivo")
      .single();

    if (insertArchivoError || !archivoInsertado) {
      throw new Error(`El PDF se subio al bucket pero fallo el registro en tabla archivos: ${insertArchivoError?.message ?? "sin detalle"}`);
    }

    const idArchivo = (archivoInsertado as { id_archivo?: string }).id_archivo;
    if (!idArchivo) {
      throw new Error("No se pudo obtener id_archivo luego de registrar el documento.");
    }

    const { error: linkError } = await supabase.from("solicitudes_archivos").insert({
      id_solicitud: params.idSolicitud,
      id_archivo: idArchivo,
      created_at: new Date().toISOString(),
    });

    if (linkError) {
      throw new Error(`El PDF se registro en archivos pero fallo el vinculo en solicitudes_archivos: ${linkError.message}`);
    }
  }

  return {
    url: publicUrl,
    storagePath,
    source: "supabase",
  };
}
