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
    logo: [0, 100, 100, 0] as Cmyk,
  },
  back: {
    accentColor: [0, 0, 0, 0] as Cmyk,
    bg: [0, 100, 100, 0] as Cmyk,
    text: [0, 0, 0, 0] as Cmyk,
    muted: [0, 0, 0, 0] as Cmyk,
    logo: [0, 0, 0, 0] as Cmyk,
  },
} as const;

/**
 * 模板 B（Subotiz）印厂指定 DeviceCMYK（0–100）。
 * 浅紫底 11/8/0/0；品牌紫 78/90/0/0。
 */
const TEMPLATE_B_CMYK = {
  front: {
    bg: [11, 8, 0, 0] as Cmyk,
    text: [78, 90, 0, 0] as Cmyk,
    muted: [78, 90, 0, 0] as Cmyk,
    logo: [78, 90, 0, 0] as Cmyk,
  },
  back: {
    bg: [78, 90, 0, 0] as Cmyk,
    text: [0, 0, 0, 0] as Cmyk,
    muted: [0, 0, 0, 0] as Cmyk,
    logo: [11, 8, 0, 0] as Cmyk,
  },
} as const;

/**
 * 由 Hex 换算 DeviceCMYK（0–100）。用于尚未提供印厂色号的模板之近似。
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
  if (layout.id === "B") {
    const c = TEMPLATE_B_CMYK[side];
    return { bg: c.bg, text: c.text, muted: c.muted };
  }
  return {
    bg: hexToCmyk100(face.bg),
    text: hexToCmyk100(face.text),
    muted: hexToCmyk100(face.muted),
  };
}

/**
 * 印刷 PDF 中 Logo 的填色（覆盖 SVG 内嵌 RGB），CMYK 为印厂指定四色；
 * RGB 模式下保留 SVG 原色。
 */
export function getFaceLogoPdfColor(
  layout: TemplateLayout,
  side: "front" | "back",
  colorSpace: PdfColorSpace,
): PdfFillColor | null {
  if (colorSpace === "rgb") return null;
  if (layout.id === "A") return TEMPLATE_A_CMYK[side].logo;
  if (layout.id === "B") return TEMPLATE_B_CMYK[side].logo;
  return null;
}

/** 二维码模块色：模板 A 印厂黑；模板 B 与正面品牌紫一致（印刷用印厂 CMYK） */
export function getQrModuleColor(
  colorSpace: PdfColorSpace,
  layout: TemplateLayout
): PdfFillColor {
  if (layout.id === "A") {
    if (colorSpace === "rgb") {
      return "#000000";
    }
    return [0, 0, 0, 100];
  }
  const hex = layout.front.text;
  if (layout.id === "B") {
    if (colorSpace === "rgb") {
      return hex;
    }
    return TEMPLATE_B_CMYK.front.text;
  }
  if (colorSpace === "rgb") {
    return hex;
  }
  return hexToCmyk100(hex);
}
