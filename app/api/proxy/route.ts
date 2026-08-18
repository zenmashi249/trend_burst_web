import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

export async function POST(req: NextRequest) {
  const path = req.nextUrl.searchParams.get("path");
  if (!path || !["signal", "backtest"].includes(path)) {
    return NextResponse.json({ error: "invalid path" }, { status: 400 });
  }
  const body = await req.text();
  const res = await fetch(`${API_URL}/api/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });
  const text = await res.text();
  return new NextResponse(text, {
    status: res.status,
    headers: { "Content-Type": res.headers.get("Content-Type") || "application/json" },
  });
}

export const runtime = "nodejs";
