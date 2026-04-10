import type { NextRequest } from "next/server";
import { buildExportPdfFilename } from "@/lib/export/pdf/exportFilename";
import { buildPdf } from "@/lib/export/pdf/buildPdf";
import type { PdfColorSpace } from "@/lib/layout/templateColors";
import type { CardState } from "@/lib/types/card";

type ExportPdfRequestBody = CardState & { colorSpace?: string };

export const runtime = "nodejs";

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const raw = (await request.json()) as ExportPdfRequestBody;
    const colorSpace: PdfColorSpace =
      raw.colorSpace === "cmyk" ? "cmyk" : "rgb";
    const state: CardState = {
      schemaVersion: raw.schemaVersion,
      templateId: raw.templateId,
      shared: raw.shared,
      templateFields: raw.templateFields,
      visibility: raw.visibility,
      assets: raw.assets ?? {},
      qr: raw.qr ?? null,
    };
    const pdf = await buildPdf(state, { colorSpace });
    const body = new Uint8Array(pdf);
    return new Response(body, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(buildExportPdfFilename(state, colorSpace))}`,
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
