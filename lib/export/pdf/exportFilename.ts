import type { PdfColorSpace } from "@/lib/layout/templateColors";
import { DEFAULT_FIELD_VALUES, type CardState } from "@/lib/types/card";

/** 下载文件名中不允许出现的字符 */
export function sanitizeExportFilenamePart(value: string): string {
  return value.replace(/[/\\?%*:|"<>]/g, "").trim() || "名片";
}

/**
 * 例：`张三名片-Shoplazza-电子版.pdf`、`李四名片-Subotiz-印刷版.pdf`
 */
export function buildExportPdfFilename(
  state: CardState,
  colorSpace: PdfColorSpace
): string {
  const chinese = (state.fields.name ?? "").trim();
  const english = (state.fields.englishName ?? "").trim();
  const rawName = chinese || english || DEFAULT_FIELD_VALUES.name;
  const name = sanitizeExportFilenamePart(rawName);
  const brand = state.templateId === "A" ? "Shoplazza" : "Subotiz";
  const edition = colorSpace === "cmyk" ? "印刷版" : "电子版";
  return `${name}名片-${brand}-${edition}.pdf`;
}
