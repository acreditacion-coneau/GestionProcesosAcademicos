import { hasSupabaseConfig, supabase } from "../../lib/supabaseClient";

export type TipoDocumentoArchivo = "FICHA" | "INFORME" | "RF_INICIO" | "RF_CIERRE" | "OTRO";

interface ArchiveParams {
  idSolicitud: string;
  tipo: TipoDocumentoArchivo;
  fileName: string;
  blob: Blob;
  actor: string;
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

export async function archiveDocument(params: ArchiveParams): Promise<ArchivedDocumentResult> {
  if (!hasSupabaseConfig) {
    throw new Error("Supabase no está configurado. No se puede subir el documento.");
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

  const { error: insertError } = await supabase.from("documentos").insert({
    id_solicitud: params.idSolicitud,
    tipo_documento: params.tipo,
    archivo_nombre: params.fileName,
    storage_path: storagePath,
    url: publicUrl,
    actor: params.actor,
    creado_en: new Date().toISOString(),
  });

  if (insertError) {
    throw new Error(`El PDF se subió al bucket pero falló el registro en tabla documentos: ${insertError.message}`);
  }

  return {
    url: publicUrl,
    storagePath,
    source: "supabase",
  };
}
