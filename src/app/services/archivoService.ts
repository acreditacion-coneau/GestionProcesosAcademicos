import { hasSupabaseConfig, supabase } from "../../lib/supabaseClient";

export type TipoDocumentoArchivo = "FICHA" | "INFORME" | "RF_INICIO" | "RF_CIERRE" | "OTRO";

interface ArchiveParams {
  tramiteId: string;
  tipo: TipoDocumentoArchivo;
  fileName: string;
  blob: Blob;
  actor: string;
}

interface ArchivedDocumentResult {
  url: string;
  storagePath: string;
  source: "supabase" | "local";
}

const LOCAL_ARCHIVE_KEY = "tramites_documentos_archivo_local";
const DEFAULT_BUCKET = (import.meta.env.VITE_SUPABASE_ARCHIVE_BUCKET ?? "tramites-archivo").trim();
const ARCHIVE_TABLE = (import.meta.env.VITE_SUPABASE_ARCHIVE_TABLE ?? "tramites_documentos_archivo").trim();

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[^\w.\-]+/g, "_");
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("No se pudo convertir el archivo a data URL"));
    reader.readAsDataURL(blob);
  });
}

function pushLocalArchiveRecord(record: {
  tramiteId: string;
  tipo: TipoDocumentoArchivo;
  actor: string;
  fileName: string;
  dataUrl: string;
  archivedAt: string;
}) {
  const raw = localStorage.getItem(LOCAL_ARCHIVE_KEY);
  const current = raw ? (JSON.parse(raw) as unknown[]) : [];
  current.push(record);
  localStorage.setItem(LOCAL_ARCHIVE_KEY, JSON.stringify(current));
}

async function archiveInSupabase(params: ArchiveParams): Promise<ArchivedDocumentResult | null> {
  if (!hasSupabaseConfig || !DEFAULT_BUCKET) return null;

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const safeFileName = sanitizeFileName(params.fileName);
  const storagePath = `${params.tramiteId}/${timestamp}_${safeFileName}`;

  const upload = await supabase.storage
    .from(DEFAULT_BUCKET)
    .upload(storagePath, params.blob, {
      contentType: params.blob.type || "application/octet-stream",
      upsert: true,
    });

  if (upload.error) {
    console.warn("No se pudo archivar en Supabase Storage:", upload.error.message);
    return null;
  }

  const publicUrl = supabase.storage.from(DEFAULT_BUCKET).getPublicUrl(storagePath).data.publicUrl;

  if (ARCHIVE_TABLE) {
    const insertPayload = {
      tramite_id: params.tramiteId,
      tipo_documento: params.tipo,
      archivo_nombre: params.fileName,
      storage_path: storagePath,
      url: publicUrl,
      actor: params.actor,
      creado_en: new Date().toISOString(),
    };
    const { error } = await supabase.from(ARCHIVE_TABLE).insert(insertPayload);
    if (error) {
      console.warn("No se pudo insertar metadato de archivo en tabla histórica:", error.message);
    }
  }

  return {
    url: publicUrl,
    storagePath,
    source: "supabase",
  };
}

export async function archiveDocument(params: ArchiveParams): Promise<ArchivedDocumentResult> {
  const supabaseResult = await archiveInSupabase(params);
  if (supabaseResult) return supabaseResult;

  const dataUrl = await blobToDataUrl(params.blob);
  const archivedAt = new Date().toISOString();
  const storagePath = `${params.tramiteId}/${archivedAt}_${sanitizeFileName(params.fileName)}`;

  pushLocalArchiveRecord({
    tramiteId: params.tramiteId,
    tipo: params.tipo,
    actor: params.actor,
    fileName: params.fileName,
    dataUrl,
    archivedAt,
  });

  return {
    url: dataUrl,
    storagePath,
    source: "local",
  };
}
