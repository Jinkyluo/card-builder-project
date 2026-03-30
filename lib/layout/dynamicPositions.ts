import { DEFAULT_FIELD_VALUES, type CardState } from "@/lib/types/card";
import type { CardFieldBlock, TemplateLayout } from "@/lib/layout/cardLayout";

const CSS_PX_PER_MM = 96 / 25.4;
const ENGLISH_NAME_GAP_PX = 6;
const COMPANY_ADDRESS_LINE_PITCH_MM = 47.02 - 43.7;

function estimateTextWidthPx(text: string, fontSizePt: number): number {
  const fontSizePx = (fontSizePt * 96) / 72;
  return text
    .split("\n")
    .reduce((max, line) => {
      const cjkCount = Array.from(line).filter((char) => /[\u3400-\u9fff]/.test(char)).length;
      const otherCount = Math.max(0, line.length - cjkCount);
      const width = cjkCount * fontSizePx + otherCount * fontSizePx * 0.62;
      return Math.max(max, width);
    }, 0);
}

function measureTextWidthPx(block: CardFieldBlock, text: string): number {
  if (!text) return 0;

  const fontSize = `${block.fontSizePt}pt`;
  const fontWeight = String(block.fontWeight ?? 400);
  const fontFamily =
    block.fontFamily === "harmony"
      ? '"HarmonyOS Sans SC Embedded", "HarmonyOS Sans SC", sans-serif'
      : block.fontFamily === "pp-right"
        ? '"PP Right Grotesk Wide Regular", sans-serif'
        : 'system-ui, sans-serif';

  if (typeof document === "undefined") {
    return estimateTextWidthPx(text, block.fontSizePt);
  }

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return estimateTextWidthPx(text, block.fontSizePt);
  }

  ctx.font = `${fontWeight} ${fontSize} ${fontFamily}`;
  return text
    .split("\n")
    .reduce((max, line) => Math.max(max, ctx.measureText(line).width), 0);
}

export function resolveBlockLeftMm(
  layout: TemplateLayout,
  side: "front" | "back",
  state: CardState,
  block: CardFieldBlock
): number {
  if (layout.id !== "A" || side !== "front") {
    return block.leftMm;
  }

  if (block.key === "englishName") {
    const nameBlock = layout.front.blocks.find((item) => item.key === "name");
    if (!nameBlock) {
      return block.leftMm;
    }

    const nameText = (state.fields.name ?? "").trim() || DEFAULT_FIELD_VALUES.name;
    const nameWidthPx = measureTextWidthPx(nameBlock, nameText);
    const nameWidthMm = nameWidthPx / CSS_PX_PER_MM;
    const gapMm = ENGLISH_NAME_GAP_PX / CSS_PX_PER_MM;

    return nameBlock.leftMm + nameWidthMm + gapMm;
  }

  if (block.key !== "company" && block.key !== "address") {
    return block.leftMm;
  }

  const qrPos = layout.qr.front;
  if (!qrPos) {
    return block.leftMm;
  }

  const companyBlock = layout.front.blocks.find((item) => item.key === "company");
  const addressBlock = layout.front.blocks.find((item) => item.key === "address");
  if (!companyBlock || !addressBlock) {
    return block.leftMm;
  }

  const companyText =
    (state.fields.company ?? "").trim() || DEFAULT_FIELD_VALUES.company;
  const addressText = state.fields.address ?? "";
  const companyWidthPx = measureTextWidthPx(companyBlock, companyText);
  const addressWidthPx = measureTextWidthPx(addressBlock, addressText);
  const groupWidthMm = Math.max(companyWidthPx, addressWidthPx) / CSS_PX_PER_MM;
  const qrRightMm = qrPos.leftMm + layout.qr.sizeMm;

  return qrRightMm - groupWidthMm;
}

export function resolveBlockTopMm(
  layout: TemplateLayout,
  side: "front" | "back",
  state: CardState,
  block: CardFieldBlock
): number {
  if (
    layout.id !== "A" ||
    side !== "front" ||
    (block.key !== "company" && block.key !== "address")
  ) {
    return block.topMm;
  }

  const addressLineCount = Math.max(
    1,
    (state.fields.address ?? "").split("\n").filter(Boolean).length
  );

  return block.topMm - (addressLineCount - 1) * COMPANY_ADDRESS_LINE_PITCH_MM;
}

export function resolveBlockLineHeightPt(
  layout: TemplateLayout,
  side: "front" | "back",
  block: CardFieldBlock
): number | undefined {
  if (
    layout.id === "A" &&
    side === "front" &&
    (block.key === "company" || block.key === "address")
  ) {
    return (COMPANY_ADDRESS_LINE_PITCH_MM * 72) / 25.4;
  }

  return undefined;
}
