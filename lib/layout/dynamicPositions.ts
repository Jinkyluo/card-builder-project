import type { CardState } from "@/lib/types/card";
import type { CardFieldBlock, TemplateLayout } from "@/lib/layout/cardLayout";
import { resolveFieldLayoutValue } from "@/lib/fields/displayValue";

const CSS_PX_PER_MM = 96 / 25.4;
const ENGLISH_NAME_GAP_PX = 6;
const COMPANY_ADDRESS_LINE_PITCH_MM = 47.02 - 43.7;
/** 模板 B 背面多行字段行距（mm，与 7pt 视觉接近） */
const TEMPLATE_B_BACK_LINE_PITCH_MM = 3.5;

/** 模板 A 正面主地址（地址地区预设）非空行数；为 0 时不占位，自定义地址顶到主地址行 */
function templateAFrontMainAddressLineCount(state: CardState): number {
  return (state.fields.address ?? "")
    .split("\n")
    .filter((line) => line.trim().length > 0).length;
}

/** 补充地址非空时，右侧公司信息整块按行数向上偏移（与主地址多行上移规则一致） */
function templateAFrontAddressExtraUpwardShiftMm(state: CardState): number {
  const raw = (state.fields.addressExtra ?? "").trim();
  if (!raw) return 0;
  const lineCount = Math.max(1, raw.split("\n").filter(Boolean).length);
  return lineCount * COMPANY_ADDRESS_LINE_PITCH_MM;
}

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

/** 模板 B 背面：按最大宽度估算折行行数（与预览自动换行接近） */
function countTemplateBBackWrappedLines(
  text: string,
  maxWidthMm: number,
  fontSizePt: number
): number {
  const parts = text.split("\n");
  const approxCharMm = fontSizePt * 0.34;
  const maxChars = Math.max(6, Math.floor(maxWidthMm / approxCharMm));
  let total = 0;
  for (const part of parts) {
    const p = part.length === 0 ? "\u3000" : part;
    total += Math.max(1, Math.ceil(p.length / maxChars));
  }
  return Math.max(1, total);
}

function resolveTemplateBBackBlockTopMm(
  layout: TemplateLayout,
  state: CardState,
  block: CardFieldBlock
): number {
  if (block.key === "company") {
    return block.topMm;
  }

  const addressBlock = layout.back.blocks.find((b) => b.key === "address");
  const extraBlock = layout.back.blocks.find((b) => b.key === "addressExtra");
  const maxW = addressBlock?.maxWidthMm ?? 52;
  const pitch = TEMPLATE_B_BACK_LINE_PITCH_MM;

  const addrText = resolveFieldLayoutValue(state, "address");
  const addrLines = addressBlock
    ? countTemplateBBackWrappedLines(addrText, maxW, addressBlock.fontSizePt)
    : 1;

  if (block.key === "address") {
    return block.topMm;
  }

  const extraText = resolveFieldLayoutValue(state, "addressExtra");
  const extraLines = extraBlock
    ? countTemplateBBackWrappedLines(extraText, maxW, extraBlock.fontSizePt)
    : 1;
  const extraDisplayLines = extraText.trim() ? extraLines : 0;

  if (block.key === "addressExtra") {
    return 34 + addrLines * pitch;
  }

  if (block.key === "wechat") {
    return 34 + addrLines * pitch + extraDisplayLines * pitch;
  }

  return block.topMm;
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

    if (state.visibility.name === false) {
      return nameBlock.leftMm;
    }

    const nameText = resolveFieldLayoutValue(state, "name");
    const nameWidthPx = measureTextWidthPx(nameBlock, nameText);
    const nameWidthMm = nameWidthPx / CSS_PX_PER_MM;
    const gapMm = ENGLISH_NAME_GAP_PX / CSS_PX_PER_MM;

    return nameBlock.leftMm + nameWidthMm + gapMm;
  }

  if (block.key !== "company" && block.key !== "address" && block.key !== "addressExtra") {
    return block.leftMm;
  }

  const qrPos = layout.qr.front;
  if (!qrPos) {
    return block.leftMm;
  }

  const companyBlock = layout.front.blocks.find((item) => item.key === "company");
  const addressBlock = layout.front.blocks.find((item) => item.key === "address");
  const addressExtraBlock = layout.front.blocks.find((item) => item.key === "addressExtra");
  if (!companyBlock || !addressBlock || !addressExtraBlock) {
    return block.leftMm;
  }

  const companyText = resolveFieldLayoutValue(state, "company");
  const addressText = resolveFieldLayoutValue(state, "address");
  const extraText = resolveFieldLayoutValue(state, "addressExtra");
  const companyWidthPx = measureTextWidthPx(companyBlock, companyText);
  const addressWidthPx = measureTextWidthPx(addressBlock, addressText);
  const extraWidthPx = measureTextWidthPx(addressExtraBlock, extraText);
  const groupWidthMm =
    Math.max(companyWidthPx, addressWidthPx, extraWidthPx) / CSS_PX_PER_MM;
  const qrRightMm = qrPos.leftMm + layout.qr.sizeMm;

  return qrRightMm - groupWidthMm;
}

export function resolveBlockTopMm(
  layout: TemplateLayout,
  side: "front" | "back",
  state: CardState,
  block: CardFieldBlock
): number {
  if (layout.id === "A" && side === "front") {
    const addressBlock = layout.front.blocks.find((b) => b.key === "address");
    const addressExtraBlock = layout.front.blocks.find(
      (b) => b.key === "addressExtra"
    );
    const addrLines = templateAFrontMainAddressLineCount(state);
    const extraUp = templateAFrontAddressExtraUpwardShiftMm(state);
    const shiftFromMultiLineAddress =
      addrLines > 0 ? (addrLines - 1) * COMPANY_ADDRESS_LINE_PITCH_MM : 0;

    if (block.key === "company" || block.key === "address") {
      const base = block.topMm - shiftFromMultiLineAddress - extraUp;
      // 无主地址（自定义输入）时公司名下移一行，与自定义地址间距等同「主地址→自定义」
      if (block.key === "company" && addrLines === 0) {
        return base + COMPANY_ADDRESS_LINE_PITCH_MM;
      }
      return base;
    }
    if (block.key === "addressExtra") {
      if (!addressBlock || !addressExtraBlock) return block.topMm;
      // 无主地址时自定义地址仍落在设计稿最底一行，与「三行都显示」时底部对齐
      if (addrLines === 0) {
        return addressExtraBlock.topMm - shiftFromMultiLineAddress - extraUp;
      }
      const addressFirstLineTop =
        addressBlock.topMm - shiftFromMultiLineAddress - extraUp;
      return addressFirstLineTop + addrLines * COMPANY_ADDRESS_LINE_PITCH_MM;
    }
  }

  if (layout.id === "B" && side === "back") {
    return resolveTemplateBBackBlockTopMm(layout, state, block);
  }

  return block.topMm;
}

export function resolveBlockLineHeightPt(
  layout: TemplateLayout,
  side: "front" | "back",
  block: CardFieldBlock
): number | undefined {
  if (
    layout.id === "A" &&
    side === "front" &&
    (block.key === "company" || block.key === "address" || block.key === "addressExtra")
  ) {
    return (COMPANY_ADDRESS_LINE_PITCH_MM * 72) / 25.4;
  }

  if (
    layout.id === "B" &&
    side === "back" &&
    (block.key === "address" || block.key === "addressExtra" || block.key === "wechat")
  ) {
    return (TEMPLATE_B_BACK_LINE_PITCH_MM * 72) / 25.4;
  }

  return undefined;
}
