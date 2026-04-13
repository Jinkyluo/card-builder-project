import { mmToPt, type TemplateLayout } from "@/lib/layout/cardLayout";
import { getQrModuleColor, type PdfColorSpace } from "@/lib/layout/templateColors";
import type { QrModules } from "@/lib/qr/generate";
import { QR_MODULE_BLEED_RATIO } from "@/lib/qr/moduleBleed";

export function drawQr(
  doc: PDFKit.PDFDocument,
  modules: QrModules,
  leftMm: number,
  topMm: number,
  sizeMm: number,
  colorSpace: PdfColorSpace,
  layout: TemplateLayout
): void {
  const qrSizePt = mmToPt(sizeMm);
  const cellPt = qrSizePt / modules.size;
  const bleedPt = cellPt * QR_MODULE_BLEED_RATIO;
  const leftPt = mmToPt(leftMm);
  const topPt = mmToPt(topMm);
  const qRight = leftPt + qrSizePt;
  const qBottom = topPt + qrSizePt;

  doc.save();
  doc.fillColor(getQrModuleColor(colorSpace, layout));

  for (let y = 0; y < modules.size; y += 1) {
    let x = 0;
    while (x < modules.size) {
      if (!modules.cells[y]?.[x]) {
        x += 1;
        continue;
      }
      let xEnd = x;
      while (xEnd + 1 < modules.size && modules.cells[y]?.[xEnd + 1]) {
        xEnd += 1;
      }
      const runW = (xEnd - x + 1) * cellPt;
      const rx = leftPt + x * cellPt - bleedPt;
      const ry = topPt + y * cellPt - bleedPt;
      const rw = runW + 2 * bleedPt;
      const rh = cellPt + 2 * bleedPt;
      const cx = Math.max(leftPt, rx);
      const cy = Math.max(topPt, ry);
      const cw = Math.min(qRight, rx + rw) - cx;
      const ch = Math.min(qBottom, ry + rh) - cy;
      if (cw > 0 && ch > 0) {
        doc.rect(cx, cy, cw, ch).fill();
      }
      x = xEnd + 1;
    }
  }

  doc.restore();
}
