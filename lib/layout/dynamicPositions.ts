import { getEffectiveFields } from "@/lib/card/effectiveFields";
import type { CardState } from "@/lib/types/card";
import type { CardFieldBlock, TemplateLayout } from "@/lib/layout/cardLayout";
import { resolveFieldLayoutValue } from "@/lib/fields/displayValue";

const CSS_PX_PER_MM = 96 / 25.4;
const ENGLISH_NAME_GAP_PX = 6;
const COMPANY_ADDRESS_LINE_PITCH_MM = 47.02 - 43.7;

/** 与 Shoplazza（A）同版式的模板（含 Subotiz B） */
function isShoplazzaLayout(layout: TemplateLayout): boolean {
  return layout.id === "A" || layout.id === "B";
}

/** 模板 A 正面主地址（地址地区预设）非空行数；为 0 时不占位，自定义地址顶到主地址行 */
function templateAFrontMainAddressLineCount(state: CardState): number {
  return (getEffectiveFields(state).address ?? "")
    .split("\n")
    .filter((line) => line.trim().length > 0).length;
}

/** 补充地址非空时，右侧公司信息整块按行数向上偏移（与主地址多行上移规则一致） */
function templateAFrontAddressExtraUpwardShiftMm(state: CardState): number {
  const raw = (getEffectiveFields(state).addressExtra ?? "").trim();
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

/**
 * 宽度估算须与 SSR 一致，否则动态 `left` 等在客户端用 canvas 测量会与服务器 HTML 不一致，触发水合警告。
 */
function measureTextWidthPx(block: CardFieldBlock, text: string): number {
  if (!text) return 0;
  return estimateTextWidthPx(text, block.fontSizePt);
}

export function resolveBlockLeftMm(
  layout: TemplateLayout,
  side: "front" | "back",
  state: CardState,
  block: CardFieldBlock
): number {
  if (!isShoplazzaLayout(layout) || side !== "front") {
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
  if (isShoplazzaLayout(layout) && side === "front") {
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

  return block.topMm;
}

export function resolveBlockLineHeightPt(
  layout: TemplateLayout,
  side: "front" | "back",
  block: CardFieldBlock
): number | undefined {
  if (
    isShoplazzaLayout(layout) &&
    side === "front" &&
    (block.key === "company" || block.key === "address" || block.key === "addressExtra")
  ) {
    return (COMPANY_ADDRESS_LINE_PITCH_MM * 72) / 25.4;
  }

  return undefined;
}
