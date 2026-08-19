import { NextRequest, NextResponse } from "next/server";

const ALLOWED_PATHS = ["signal", "backtest", "notification-config"];

async function forward(req: NextRequest, method: "GET" | "POST") {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "";
  const path = req.nextUrl.searchParams.get("path");
  if (!path || !ALLOWED_PATHS.includes(path)) {
    return NextResponse.json({ error: "invalid path" }, { status: 400 });
  }
  if (!API_URL) {
    return NextResponse.json({ error: "NEXT_PUBLIC_API_URL not set" }, { status: 500 });
  }
  const body = method === "POST" ? await req.text() : undefined;
  try {
    const res = await fetch(`${API_URL}/api/${path}`, {
      method,
      headers: { "Content-Type": "application/json" },
      body,
    });
    const text = await res.text();
    return new NextResponse(text, {
      status: res.status,
      headers: { "Content-Type": res.headers.get("Content-Type") || "application/json" },
    });
  } catch (e) {
    return NextResponse.json(
      { error: "proxy fetch failed", detail: String(e), api_url: API_URL, path },
      { status: 500 },
    );
  }
}

export async function GET(req: NextRequest) {
  return forward(req, "GET");
}

export async function POST(req: NextRequest) {
  return forward(req, "POST");
}

export const runtime = "nodejs";
export const maxDuration = 60;
