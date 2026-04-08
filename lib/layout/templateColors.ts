import type { TemplateLayout } from "@/lib/layout/cardLayout";

/** PDFKit：长度为 4 的数组表示 DeviceCMYK，单位为 0–100 */
export type Cmyk = [number, number, number, number];

export type PdfColorSpace = "rgb" | "cmyk";

/** PDFKit fillColor 可接受 Hex 字符串或 CMYK 四元组 */
export type PdfFillColor = string | Cmyk;

/**
 * 模板 A（Shoplazza）印厂指定 DeviceCMYK，与屏幕 Hex 并行维护。
 * @see README — CMYK PDF 导出
 */
const TEMPLATE_A_CMYK = {
  front: {
    bg: [2, 3, 7, 0] as Cmyk,
    accentColor: [0, 100, 100, 0] as Cmyk,
    text: [0, 0, 0, 100] as Cmyk,
    muted: [0, 0, 0, 100] as Cmyk,
  },
  back: {
    accentColor: [0, 0, 0, 0] as Cmyk,
    bg: [0, 100, 100, 0] as Cmyk,
    text: [0, 0, 0, 0] as Cmyk,
    muted: [0, 0, 0, 0] as Cmyk,
  },
} as const;

/**
 * 由 Hex 换算 DeviceCMYK（0–100）。用于模板 B 等尚未提供印厂色号时的近似。
 * 若印厂提供 Subotiz 专色，可改为显式表替换此处用法。
 */
export function hexToCmyk100(hex: string): Cmyk {
  const normalized = hex.trim().replace(/^#/, "");
  if (normalized.length !== 6) {
    throw new Error(`Invalid hex color: ${hex}`);
  }
  const r = Number.parseInt(normalized.slice(0, 2), 16) / 255;
  const g = Number.parseInt(normalized.slice(2, 4), 16) / 255;
  const b = Number.parseInt(normalized.slice(4, 6), 16) / 255;
  const k = 1 - Math.max(r, g, b);
  if (k >= 1 - Number.EPSILON) {
    return [0, 0, 0, 100];
  }
  const c = (1 - r - k) / (1 - k);
  const m = (1 - g - k) / (1 - k);
  const y = (1 - b - k) / (1 - k);
  return [
    Math.round(Math.min(100, Math.max(0, c * 100))),
    Math.round(Math.min(100, Math.max(0, m * 100))),
    Math.round(Math.min(100, Math.max(0, y * 100))),
    Math.round(Math.min(100, Math.max(0, k * 100))),
  ];
}

export function getFacePdfColors(
  layout: TemplateLayout,
  side: "front" | "back",
  colorSpace: PdfColorSpace
): { bg: PdfFillColor; text: PdfFillColor; muted: PdfFillColor } {
  const face = layout[side];
  if (colorSpace === "rgb") {
    return { bg: face.bg, text: face.text, muted: face.muted };
  }
  if (layout.id === "A") {
    const c = TEMPLATE_A_CMYK[side];
    return { bg: c.bg, text: c.text, muted: c.muted };
  }
  return {
    bg: hexToCmyk100(face.bg),
    text: hexToCmyk100(face.text),
    muted: hexToCmyk100(face.muted),
  };
}

/** 模板 B 正面顶部细条（原硬编码 `#334155`） */
export function getTemplateBFrontTopBarColor(colorSpace: PdfColorSpace): PdfFillColor {
  if (colorSpace === "rgb") {
    return "#334155";
  }
  return hexToCmyk100("#334155");
}

/** 二维码模块颜色：与模板 A 指定黑一致 */
export function getQrModuleColor(colorSpace: PdfColorSpace): PdfFillColor {
  if (colorSpace === "rgb") {
    return "#000000";
  }
  return [0, 0, 0, 100];
}
