import { NextResponse } from "next/server";

/** 用于确认生产/开发服务器已启动且可响应（排查 502/500 时是否命中本应用） */
export function GET(): NextResponse {
  return NextResponse.json(
    { ok: true, service: "card-studio" },
    { status: 200, headers: { "Cache-Control": "no-store" } }
  );
}
