import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const revalidate = 0;
// Render無料プランの休眠復帰 + 計算で数十秒かかる
export const maxDuration = 60;

// スキーマ整形はバックエンド /api/saved-signal 側。ここはCDNキャッシュ付き中継のみ
export async function GET() {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "";
  if (!API_URL) {
    return NextResponse.json({ error: "NEXT_PUBLIC_API_URL not set" }, { status: 500 });
  }

  try {
    const res = await fetch(`${API_URL}/api/saved-signal`, { cache: "no-store" });
    if (!res.ok) {
      return NextResponse.json({ error: "upstream error", status: res.status }, { status: 502 });
    }
    return NextResponse.json(await res.json(), {
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (e) {
    return NextResponse.json({ error: "fetch failed", detail: String(e) }, { status: 500 });
  }
}
