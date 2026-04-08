import type { NextRequest } from "next/server";
import { buildPdf } from "@/lib/export/pdf/buildPdf";
import type { PdfColorSpace } from "@/lib/layout/templateColors";
import { DEFAULT_FIELD_VALUES, type CardState } from "@/lib/types/card";

type ExportPdfRequestBody = CardState & { colorSpace?: string };

export const runtime = "nodejs";

function sanitizeFilenamePart(value: string): string {
  return value.replace(/[/\\?%*:|"<>]/g, "").trim() || "名片";
}

function buildFilename(state: CardState, colorSpace: PdfColorSpace): string {
  const d = new Date();
  const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const name = sanitizeFilenamePart(
    (state.fields.name ?? "").trim() || DEFAULT_FIELD_VALUES.name
  );
  const suffix = colorSpace === "cmyk" ? "CMYK" : "RGB";
  return `名片-${name}-${stamp}-${suffix}.pdf`;
}

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const raw = (await request.json()) as ExportPdfRequestBody;
    const colorSpace: PdfColorSpace =
      raw.colorSpace === "cmyk" ? "cmyk" : "rgb";
    const state: CardState = {
      templateId: raw.templateId,
      fields: raw.fields,
      visibility: raw.visibility,
      locks: raw.locks,
      assets: raw.assets,
      qr: raw.qr,
    };
    const pdf = await buildPdf(state, { colorSpace });
    const body = new Uint8Array(pdf);
    return new Response(body, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(buildFilename(state, colorSpace))}`,
        "Content-Length": String(body.byteLength),
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to export PDF";
    console.error("Failed to export PDF", error);
    return Response.json({ error: message }, { status: 500 });
  }
}
