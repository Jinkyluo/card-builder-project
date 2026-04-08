import PDFDocument from "pdfkit";
import type { CardState } from "@/lib/types/card";
import {
  CARD_HEIGHT_PT,
  CARD_WIDTH_PT,
} from "@/lib/layout/cardLayout";
import type { PdfColorSpace } from "@/lib/layout/templateColors";
import { getQrModules } from "@/lib/qr/generate";
import { drawFace } from "@/lib/export/pdf/drawFace";
import { registerPdfFonts } from "@/lib/export/pdf/fonts";

export type BuildPdfOptions = {
  colorSpace?: PdfColorSpace;
};

function streamToBuffer(doc: PDFKit.PDFDocument): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    doc.end();
  });
}

export async function buildPdf(
  state: CardState,
  options: BuildPdfOptions = {}
): Promise<Buffer> {
  const colorSpace = options.colorSpace ?? "rgb";
  const qrModules = state.qr?.payload
    ? await getQrModules(state.qr.payload)
    : null;

  const doc = new PDFDocument({
    autoFirstPage: false,
    compress: true,
    margin: 0,
    size: [CARD_WIDTH_PT, CARD_HEIGHT_PT],
  });

  registerPdfFonts(doc);

  doc.addPage({ margin: 0, size: [CARD_WIDTH_PT, CARD_HEIGHT_PT] });
  drawFace(doc, "front", state, qrModules, { colorSpace });

  doc.addPage({ margin: 0, size: [CARD_WIDTH_PT, CARD_HEIGHT_PT] });
  drawFace(doc, "back", state, qrModules, { colorSpace });

  return streamToBuffer(doc);
}
