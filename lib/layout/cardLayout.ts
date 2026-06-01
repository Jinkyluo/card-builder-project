/**
 * 单一名片物理尺寸与预览排版单位。设计稿到位后可只改本文件中的模板间距与字号。
 */

/** 宽 90mm → pt（72pt/inch） */
export const CARD_WIDTH_PT = (90 * 72) / 25.4;
/** 高 55mm → pt */
export const CARD_HEIGHT_PT = (55 * 72) / 25.4;

export const CARD_WIDTH_MM = 90;
export const CARD_HEIGHT_MM = 55;

/** 正面二维码距纸上缘、右缘（mm），Shoplazza / Subotiz 一致 */
export const QR_FRONT_MARGIN_TOP_MM = 5.5;
export const QR_FRONT_MARGIN_RIGHT_MM = 5.5;

/** 二维码边长（mm）：A=Shoplazza，B=Subotiz */
export const QR_SIZE_MM_TEMPLATE_A = 12;
export const QR_SIZE_MM_TEMPLATE_B = 13;

/** 二维码规范边长（mm），两模板可分别覆盖 */
export const QR_SIZE_MM_DEFAULT = 18;

export type CardFieldBlock = {
  key: string;
  leftMm: number;
  topMm: number;
  fontSizePt: number;
  fontWeight?: number;
  maxWidthMm?: number;
  useMutedColor?: boolean;
  fontFamily?: "default" | "harmony" | "pp-right" | "dm-sans";
};

export type TemplateLayout = {
  id: "A" | "B";
  name: string;
  /** 正面字段 key 列表（用于表单与预览） */
  frontFieldKeys: string[];
  backFieldKeys: string[];
  qr: {
    sizeMm: number;
    front: { leftMm: number; topMm: number } | null;
    back: { leftMm: number; topMm: number } | null;
  };
  /** 预览排版刻度（mm，相对左上角） */
  front: {
    accentColor: string;
    bg: string;
    text: string;
    muted: string;
    blocks: CardFieldBlock[];
  };
  back: {
    accentColor: string;
    bg: string;
    text: string;
    muted: string;
    blocks: CardFieldBlock[];
  };
};

/** 模板 A：左侧色条 + 正面信息区；反面文案 + 右下角码 */
export const templateA: TemplateLayout = {
  id: "A",
  name: "Shoplazza 名片",
  frontFieldKeys: [
    "name",
    "englishName",
    "title",
    "phone",
    "email",
    "website",
    "company",
  ],
  backFieldKeys: [],
  qr: {
    sizeMm: QR_SIZE_MM_TEMPLATE_A,
    front: {
      leftMm:
        CARD_WIDTH_MM - QR_FRONT_MARGIN_RIGHT_MM - QR_SIZE_MM_TEMPLATE_A,
      topMm: QR_FRONT_MARGIN_TOP_MM,
    },
    back: null,
  },
  front: {
    accentColor: "#f30006",
    bg: "#f7f0e3",
    text: "#231815",
    muted: "#231815",
    blocks: [
      {
        key: "name",
        leftMm: 5,
        topMm: 4.7,
        fontSizePt: 14,
        fontWeight: 500,
        fontFamily: "harmony",
      },
      {
        key: "englishName",
        leftMm: 16,
        topMm: 4.7,
        fontSizePt: 14,
        fontWeight: 400,
        fontFamily: "pp-right",
      },
      {
        key: "title",
        leftMm: 5.43,
        topMm: 10.94,
        fontSizePt: 6.5,
        fontFamily: "harmony",
      },
      {
        key: "phone",
        leftMm: 5.43,
        topMm: 18.55,
        fontSizePt: 7,
        fontFamily: "pp-right",
      },
      {
        key: "email",
        leftMm: 5.43,
        topMm: 22.04,
        fontSizePt: 7,
        fontFamily: "pp-right",
      },
      {
        key: "website",
        leftMm: 5.43,
        topMm: 25.53,
        fontSizePt: 7,
        fontFamily: "pp-right",
      },
      {
        key: "company",
        leftMm: 50.97,
        topMm: 43.7,
        fontSizePt: 6.5,
        fontFamily: "harmony",
      },
      {
        key: "address",
        leftMm: 50.97,
        topMm: 47.02,
        fontSizePt: 6.5,
        fontFamily: "harmony",
      },
      {
        key: "addressExtra",
        leftMm: 50.97,
        topMm: 50.34,
        fontSizePt: 6.5,
        fontFamily: "harmony",
      },
    ],
  },
  back: {
    accentColor: "#ffffff",
    bg: "#f30006",
    text: "#ffffff",
    muted: "#ffffff",
    blocks: [],
  },
};

/** 模板 B：与 Shoplazza 同版式；品牌色与 Logo 为 Subotiz */
export const templateB: TemplateLayout = {
  id: "B",
  name: "Subotiz 名片",
  frontFieldKeys: [
    "name",
    "englishName",
    "title",
    "phone",
    "email",
    "website",
    "company",
  ],
  backFieldKeys: [],
  qr: {
    sizeMm: QR_SIZE_MM_TEMPLATE_B,
    front: {
      leftMm:
        CARD_WIDTH_MM - QR_FRONT_MARGIN_RIGHT_MM - QR_SIZE_MM_TEMPLATE_B,
      topMm: QR_FRONT_MARGIN_TOP_MM,
    },
    back: null,
  },
  front: {
    accentColor: "#7700ea",
    bg: "#ecebff",
    text: "#7700ea",
    muted: "#7700ea",
    blocks: [
      {
        key: "name",
        leftMm: 5,
        topMm: 4.7,
        fontSizePt: 14,
        fontWeight: 500,
        fontFamily: "harmony",
      },
      {
        key: "englishName",
        leftMm: 16,
        topMm: 4.7,
        fontSizePt: 14,
        fontWeight: 400,
        fontFamily: "dm-sans",
      },
      {
        key: "title",
        leftMm: 5.43,
        topMm: 10.94,
        fontSizePt: 6.5,
        fontFamily: "harmony",
      },
      {
        key: "phone",
        leftMm: 5.43,
        topMm: 18.55,
        fontSizePt: 7,
        fontFamily: "dm-sans",
      },
      {
        key: "email",
        leftMm: 5.43,
        topMm: 22.04,
        fontSizePt: 7,
        fontFamily: "dm-sans",
      },
      {
        key: "website",
        leftMm: 5.43,
        topMm: 25.53,
        fontSizePt: 7,
        fontFamily: "dm-sans",
      },
      {
        key: "company",
        leftMm: 50.97,
        topMm: 43.7,
        fontSizePt: 6.5,
        fontFamily: "harmony",
      },
      {
        key: "address",
        leftMm: 50.97,
        topMm: 47.02,
        fontSizePt: 6.5,
        fontFamily: "harmony",
      },
      {
        key: "addressExtra",
        leftMm: 50.97,
        topMm: 50.34,
        fontSizePt: 6.5,
        fontFamily: "harmony",
      },
    ],
  },
  back: {
    accentColor: "#ffffff",
    bg: "#7700ea",
    text: "#ffffff",
    muted: "#ffffff",
    blocks: [],
  },
};

export const TEMPLATES: Record<"A" | "B", TemplateLayout> = {
  A: templateA,
  B: templateB,
};

export function getTemplate(id: "A" | "B"): TemplateLayout {
  return TEMPLATES[id];
}

/** mm → pt（用于 PDF 坐标换算） */
export function mmToPt(mm: number): number {
  return (mm * 72) / 25.4;
}

/** 获取正面地址组的三个布局块（company / address / addressExtra） */
export function getAddressGroupBlocks(layout: TemplateLayout): {
  company: CardFieldBlock | undefined;
  address: CardFieldBlock | undefined;
  addressExtra: CardFieldBlock | undefined;
} {
  const blocks = layout.front.blocks;
  return {
    company: blocks.find((b) => b.key === "company"),
    address: blocks.find((b) => b.key === "address"),
    addressExtra: blocks.find((b) => b.key === "addressExtra"),
  };
}
