export type PdfFieldKey =
  | "numero_resolucion"
  | "fecha_legal"
  | "visto_solicitud"
  | "considerando_requisitos"
  | "articulo_1"
  | "articulo_3";

export interface PdfFieldBounds {
  pageIndex: number;
  x: number;
  y: number;
  yTop: number;
  fieldHeight: number;
  maxWidth: number;
  maxLines: number;
  fontSize: number;
  lineHeight: number;
}

const A4_PAGE_HEIGHT = 841.89;

function toPdfBottomY(yTop: number, fieldHeight: number): number {
  return A4_PAGE_HEIGHT - yTop - fieldHeight;
}

export const FIELD_MAP: Record<PdfFieldKey, PdfFieldBounds> = {
  numero_resolucion: {
    pageIndex: 0,
    x: 232,
    yTop: 81.89,
    fieldHeight: 12,
    y: toPdfBottomY(81.89, 12),
    maxWidth: 165,
    maxLines: 1,
    fontSize: 12,
    lineHeight: 12,
  },
  fecha_legal: {
    pageIndex: 0,
    x: 163,
    yTop: 151.89,
    fieldHeight: 24,
    y: toPdfBottomY(151.89, 24),
    maxWidth: 370,
    maxLines: 2,
    fontSize: 10,
    lineHeight: 12,
  },
  visto_solicitud: {
    pageIndex: 0,
    x: 72,
    yTop: 171.89,
    fieldHeight: 60,
    y: toPdfBottomY(171.89, 60),
    maxWidth: 454,
    maxLines: 5,
    fontSize: 10,
    lineHeight: 12,
  },
  considerando_requisitos: {
    pageIndex: 0,
    x: 72,
    yTop: 231.89,
    fieldHeight: 48,
    y: toPdfBottomY(231.89, 48),
    maxWidth: 454,
    maxLines: 4,
    fontSize: 10,
    lineHeight: 12,
  },
  articulo_1: {
    pageIndex: 0,
    x: 72,
    yTop: 291.89,
    fieldHeight: 84,
    y: toPdfBottomY(291.89, 84),
    maxWidth: 454,
    maxLines: 7,
    fontSize: 10,
    lineHeight: 12,
  },
  articulo_3: {
    pageIndex: 0,
    x: 72,
    yTop: 395.89,
    fieldHeight: 36,
    y: toPdfBottomY(395.89, 36),
    maxWidth: 454,
    maxLines: 3,
    fontSize: 10,
    lineHeight: 12,
  },
};
