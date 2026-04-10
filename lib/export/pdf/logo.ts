import type PDFDocument from "pdfkit";
import SVGtoPDF from "svg-to-pdfkit";
import {
  BACK_LOGO_BOUNDS_MM,
  FRONT_LOGO_BOUNDS_MM,
  SHOPLAZZA_BACK_LOGO_SVG,
  SHOPLAZZA_FRONT_LOGO_SVG,
} from "@/lib/brand/shoplazza";
import {
  SUBOTIZ_BACK_LOGO_SVG,
  SUBOTIZ_FRONT_LOGO_SVG,
} from "@/lib/brand/subotiz";
import { mmToPt } from "@/lib/layout/cardLayout";

type ParsedDataUrl = {
  mimeType: string;
  data: Buffer;
};

function parseDataUrl(value: string): ParsedDataUrl | null {
  const match = value.match(/^data:([^;,]+)?(;base64)?,([\s\S]*)$/);
  if (!match) return null;

  const mimeType = match[1] ?? "application/octet-stream";
  const isBase64 = Boolean(match[2]);
  const raw = match[3] ?? "";
  return {
    mimeType,
    data: isBase64
      ? Buffer.from(raw, "base64")
      : Buffer.from(decodeURIComponent(raw), "utf8"),
  };
}

function fitRect(
  sourceWidth: number,
  sourceHeight: number,
  targetWidth: number,
  targetHeight: number
): { width: number; height: number; xOffset: number; yOffset: number } {
  const scale = Math.min(targetWidth / sourceWidth, targetHeight / sourceHeight);
  const width = sourceWidth * scale;
  const height = sourceHeight * scale;
  return {
    width,
    height,
    xOffset: (targetWidth - width) / 2,
    yOffset: (targetHeight - height) / 2,
  };
}

export function drawTemplateALogo(
  doc: PDFKit.PDFDocument,
  side: "front" | "back"
): void {
  const bounds = side === "front" ? FRONT_LOGO_BOUNDS_MM : BACK_LOGO_BOUNDS_MM;
  const svg = side === "front" ? SHOPLAZZA_FRONT_LOGO_SVG : SHOPLAZZA_BACK_LOGO_SVG;

  SVGtoPDF(doc, svg, mmToPt(bounds.left), mmToPt(bounds.top), {
    width: mmToPt(bounds.width),
    height: mmToPt(bounds.height),
    preserveAspectRatio: "xMidYMid meet",
  });
}

export function drawSubotizLogo(
  doc: PDFKit.PDFDocument,
  side: "front" | "back"
): void {
  const bounds = side === "front" ? FRONT_LOGO_BOUNDS_MM : BACK_LOGO_BOUNDS_MM;
  const svg = side === "front" ? SUBOTIZ_FRONT_LOGO_SVG : SUBOTIZ_BACK_LOGO_SVG;

  SVGtoPDF(doc, svg, mmToPt(bounds.left), mmToPt(bounds.top), {
    width: mmToPt(bounds.width),
    height: mmToPt(bounds.height),
    preserveAspectRatio: "xMidYMid meet",
  });
}

export function drawTemplateBCustomLogo(
  doc: PDFKit.PDFDocument,
  logoDataUrl: string
): void {
  const parsed = parseDataUrl(logoDataUrl);
  if (!parsed) return;

  const left = mmToPt(8);
  const top = mmToPt(8);
  const width = mmToPt(28);
  const height = mmToPt(10);

  if (parsed.mimeType === "image/svg+xml") {
    SVGtoPDF(doc, parsed.data.toString("utf8"), left, top, {
      width,
      height,
      preserveAspectRatio: "xMidYMid meet",
    });
    return;
  }

  if (
    parsed.mimeType === "image/png" ||
    parsed.mimeType === "image/jpeg" ||
    parsed.mimeType === "image/webp"
  ) {
    const source = (doc as PDFKit.PDFDocument & {
      openImage: (src: Buffer) => { width: number; height: number };
    }).openImage(parsed.data);
    const fit = fitRect(source.width, source.height, width, height);
    doc.image(parsed.data, left + fit.xOffset, top + fit.yOffset, {
      width: fit.width,
      height: fit.height,
    });
  }
}
