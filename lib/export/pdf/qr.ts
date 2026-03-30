import type PDFDocument from "pdfkit";
import { mmToPt } from "@/lib/layout/cardLayout";
import type { QrModules } from "@/lib/qr/generate";

export function drawQr(
  doc: PDFKit.PDFDocument,
  modules: QrModules,
  leftMm: number,
  topMm: number,
  sizeMm: number
): void {
  const qrSizePt = mmToPt(sizeMm);
  const cellPt = qrSizePt / modules.size;
  const leftPt = mmToPt(leftMm);
  const topPt = mmToPt(topMm);

  doc.save();
  doc.fillColor("#000000");
  for (let y = 0; y < modules.size; y += 1) {
    for (let x = 0; x < modules.size; x += 1) {
      if (!modules.cells[y]?.[x]) continue;
      doc.rect(leftPt + x * cellPt, topPt + y * cellPt, cellPt, cellPt).fill();
    }
  }
  doc.restore();
}
