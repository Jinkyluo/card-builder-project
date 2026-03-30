import type { NextRequest } from "next/server";
import { buildPdf } from "@/lib/export/pdf/buildPdf";
import { DEFAULT_FIELD_VALUES, type CardState } from "@/lib/types/card";

export const runtime = "nodejs";

function sanitizeFilenamePart(value: string): string {
  return value.replace(/[/\\?%*:|"<>]/g, "").trim() || "名片";
}

function buildFilename(state: CardState): string {
  const d = new Date();
  const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const name = sanitizeFilenamePart(
    (state.fields.name ?? "").trim() || DEFAULT_FIELD_VALUES.name
  );
  return `名片-${name}-${stamp}-RGB.pdf`;
}

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const state = (await request.json()) as CardState;
    const pdf = await buildPdf(state);
    const body = new Uint8Array(pdf);
    return new Response(body, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(buildFilename(state))}`,
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
