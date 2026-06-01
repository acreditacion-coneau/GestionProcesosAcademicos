import { useEffect, useMemo, useState } from "react";

export function usePdfPreview(blob: Blob | null) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!blob) {
      setUrl((current) => {
        if (current) URL.revokeObjectURL(current);
        return null;
      });
      return;
    }

    const next = URL.createObjectURL(blob);
    setUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return next;
    });

    return () => {
      URL.revokeObjectURL(next);
    };
  }, [blob]);

  return url;
}

export function createPdfDownload(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function usePdfFileName(name: string) {
  return useMemo(() => {
    const clean = name.trim();
    if (!clean) return "RF_INICIO_AYUDANTIA.pdf";
    return clean.toLowerCase().endsWith(".pdf") ? clean : `${clean}.pdf`;
  }, [name]);
}
