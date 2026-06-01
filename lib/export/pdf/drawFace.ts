import type PDFDocument from "pdfkit";
import type { CardState } from "@/lib/types/card";
import {
  getAddressGroupBlocks,
  getTemplate,
  mmToPt,
  type CardFieldBlock,
  type TemplateLayout,
} from "@/lib/layout/cardLayout";
import {
  getFaceLogoPdfColor,
  getFacePdfColors,
  type PdfFillColor,
  type PdfColorSpace,
} from "@/lib/layout/templateColors";
import {
  resolveBlockLineHeightPt,
  resolveBlockTopMm,
} from "@/lib/layout/dynamicPositions";
import { resolveFieldDisplayValue } from "@/lib/fields/displayValue";
import { resolvePdfFontFamily } from "@/lib/export/pdf/fonts";
import { drawQr } from "@/lib/export/pdf/qr";
import { drawSubotizLogo, drawTemplateALogo } from "@/lib/export/pdf/logo";
import type { QrModules } from "@/lib/qr/generate";

const ENGLISH_NAME_GAP_MM = 6 / (96 / 25.4);

function ptToMm(pt: number): number {
  return (pt * 25.4) / 72;
}

function measureBlockWidthPt(
  doc: PDFKit.PDFDocument,
  block: CardFieldBlock,
  value: string
): number {
  if (!value) return 0;

  doc.font(resolvePdfFontFamily(block)).fontSize(block.fontSizePt);
  const capPt = block.maxWidthMm != null ? mmToPt(block.maxWidthMm) : Infinity;
  return value.split("\n").reduce((maxWidth, line) => {
    const w = doc.widthOfString(line);
    return Math.max(maxWidth, Math.min(w, capPt));
  }, 0);
}

function resolveBlockLeftMmForPdf(
  doc: PDFKit.PDFDocument,
  layout: TemplateLayout,
  side: "front" | "back",
  state: CardState,
  block: CardFieldBlock
): number {
  if ((layout.id !== "A" && layout.id !== "B") || side !== "front") {
    return block.leftMm;
  }

  if (block.key === "englishName") {
    const nameBlock = layout.front.blocks.find((item) => item.key === "name");
    if (!nameBlock) return block.leftMm;
    const nameValue = resolveFieldDisplayValue(state, "name");
    if (!nameValue) return nameBlock.leftMm;
    const nameWidthMm = ptToMm(measureBlockWidthPt(doc, nameBlock, nameValue));
    return nameBlock.leftMm + nameWidthMm + ENGLISH_NAME_GAP_MM;
  }

  if (block.key !== "company" && block.key !== "address" && block.key !== "addressExtra") {
    return block.leftMm;
  }

  const qrPos = layout.qr.front;
  const { company: companyBlock, address: addressBlock, addressExtra: addressExtraBlock } = getAddressGroupBlocks(layout);
  if (!qrPos || !companyBlock || !addressBlock || !addressExtraBlock) {
    return block.leftMm;
  }

  const companyWidthMm = ptToMm(
    measureBlockWidthPt(doc, companyBlock, resolveFieldDisplayValue(state, "company"))
  );
  const addressWidthMm = ptToMm(
    measureBlockWidthPt(doc, addressBlock, resolveFieldDisplayValue(state, "address"))
  );
  const extraWidthMm = ptToMm(
    measureBlockWidthPt(doc, addressExtraBlock, resolveFieldDisplayValue(state, "addressExtra"))
  );
  const qrRightMm = qrPos.leftMm + layout.qr.sizeMm;
  return qrRightMm - Math.max(companyWidthMm, addressWidthMm, extraWidthMm);
}

function drawTextBlock(
  doc: PDFKit.PDFDocument,
  layout: TemplateLayout,
  side: "front" | "back",
  state: CardState,
  block: CardFieldBlock,
  color: PdfFillColor
): void {
  const value = resolveFieldDisplayValue(state, block.key);
  if (!value) return;

  const left = mmToPt(resolveBlockLeftMmForPdf(doc, layout, side, state, block));
  const top = mmToPt(resolveBlockTopMm(layout, side, state, block));
  const lineHeight = resolveBlockLineHeightPt(layout, side, block);
  const lineGap = lineHeight != null ? Math.max(0, lineHeight - block.fontSizePt) : 0;

  doc.save();
  doc
    .font(resolvePdfFontFamily(block))
    .fontSize(block.fontSizePt)
    .fillColor(color)
    .text(value, left, top, {
      lineGap,
      width: block.maxWidthMm != null ? mmToPt(block.maxWidthMm) : undefined,
    });
  doc.restore();
}

export type DrawFaceOptions = {
  colorSpace: PdfColorSpace;
};

export function drawFace(
  doc: PDFKit.PDFDocument,
  side: "front" | "back",
  state: CardState,
  qrModules: QrModules | null,
  options: DrawFaceOptions
): void {
  const layout = getTemplate(state.templateId);
  const face = layout[side];
  const qrPos = layout.qr[side];
  const pdfColors = getFacePdfColors(layout, side, options.colorSpace);

  doc.save();
  doc.fillColor(pdfColors.bg).rect(0, 0, doc.page.width, doc.page.height).fill();
  doc.restore();

  const logoColor = getFaceLogoPdfColor(layout, side, options.colorSpace);
  if (layout.id === "A") {
    drawTemplateALogo(doc, side, logoColor);
  } else if (layout.id === "B") {
    drawSubotizLogo(doc, side, logoColor);
  }

  for (const block of face.blocks) {
    const color = block.useMutedColor ? pdfColors.muted : pdfColors.text;
    drawTextBlock(doc, layout, side, state, block, color);
  }

  if (qrPos && state.qr?.payload && qrModules) {
    drawQr(
      doc,
      qrModules,
      qrPos.leftMm,
      qrPos.topMm,
      layout.qr.sizeMm,
      options.colorSpace,
      layout
    );
  }
}
