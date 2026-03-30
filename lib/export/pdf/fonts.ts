import path from "node:path";
import type PDFDocument from "pdfkit";
import type { CardFieldBlock } from "@/lib/layout/cardLayout";

export const CARD_FONT_FAMILY = "CardFont";
export const HARMONY_FONT_FAMILY = "HarmonySC";
export const HARMONY_MEDIUM_FONT_FAMILY = "HarmonySCMedium";
export const PP_RIGHT_FONT_FAMILY = "PPRightGroteskWideRegular";

const FONT_ROOT = path.join(process.cwd(), "public", "fonts");

const HARMONY_REGULAR_SRC = path.join(
  FONT_ROOT,
  "HarmonyOS_Sans_SC_Regular.ttf"
);
const HARMONY_MEDIUM_SRC = path.join(
  FONT_ROOT,
  "HarmonyOS_Sans_SC_Medium.ttf"
);
const PP_RIGHT_SRC = path.join(
  FONT_ROOT,
  "PPRightGrotesk-WideRegular.ttf"
);

export function registerPdfFonts(doc: PDFKit.PDFDocument): void {
  doc.registerFont(CARD_FONT_FAMILY, HARMONY_REGULAR_SRC);
  doc.registerFont(HARMONY_FONT_FAMILY, HARMONY_REGULAR_SRC);
  doc.registerFont(HARMONY_MEDIUM_FONT_FAMILY, HARMONY_MEDIUM_SRC);
  doc.registerFont(PP_RIGHT_FONT_FAMILY, PP_RIGHT_SRC);
}

export function resolvePdfFontFamily(block: CardFieldBlock): string {
  if (block.fontFamily === "pp-right") {
    return PP_RIGHT_FONT_FAMILY;
  }
  if (block.fontFamily === "harmony") {
    return (block.fontWeight ?? 400) >= 500
      ? HARMONY_MEDIUM_FONT_FAMILY
      : HARMONY_FONT_FAMILY;
  }
  return CARD_FONT_FAMILY;
}
