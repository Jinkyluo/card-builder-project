import { NextResponse } from "next/server";
import { recordExport, getStats, type ExportFormat } from "@/lib/db/sqlite";

const VALID_FORMATS: ExportFormat[] = ["rgb_pdf", "png", "cmyk_pdf"];

export async function GET() {
  try {
    const stats = await getStats();
    return NextResponse.json({ stats });
  } catch (err) {
    console.error("Failed to read stats", err);
    return NextResponse.json({ error: "读取统计失败" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { format?: string };
    const format = body.format as ExportFormat;
    if (!VALID_FORMATS.includes(format)) {
      return NextResponse.json({ error: "无效的格式" }, { status: 400 });
    }
    await recordExport(format);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Failed to record export", err);
    return NextResponse.json({ error: "记录失败" }, { status: 500 });
  }
}
