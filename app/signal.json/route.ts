import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const revalidate = 0;

const STRICT_PARAMS = {
  ticker: "TQQQ",
  inception: "2010-02-11",
  ma_type: "SMA",
  sma_len: 200,
  rising_days: 5,
  buffer_pct: 1.0,
  exit_delay: 2,
  safe_entry_days: 3,
  safe_ticker: "GLDM",
  ts_pct: 0.25,
  ts_rec_days: 5,
  ts_reentry_mode: "A",
  ts_ma_short: 5,
  ts_ma_long: 20,
  ts_ma_type: "SMA",
  initial_cap: 10000.0,
  comm_pct: 0.00495,
  comm_max: 22.0,
  tax_rate: 0.20315,
  slippage_pct: 0.001,
  dca_monthly_jpy: 0,
  dca_months: 0,
  initial_jpy: 1000000,
};

const r2 = (x: unknown): number | null => {
  const n = typeof x === "number" ? x : Number(x);
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 100) / 100;
};

export async function GET() {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "";
  if (!API_URL) {
    return NextResponse.json({ error: "NEXT_PUBLIC_API_URL not set" }, { status: 500 });
  }

  const today = new Date().toISOString().slice(0, 10);
  const params = { ...STRICT_PARAMS, start_date: "2010-02-11", end_date: today };

  try {
    const res = await fetch(`${API_URL}/api/signal`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
      cache: "no-store",
    });
    if (!res.ok) {
      return NextResponse.json({ error: "upstream error", status: res.status }, { status: 502 });
    }
    const data = await res.json();

    const isBull = data.state === "tqqq";
    const payload = {
      v: 1,
      date: String(data.date ?? ""),
      signal: isBull ? "bull" : "shelter",
      close: r2(data.close),
      chg_pct: r2(data.day_change_pct),
      ma200: r2(data.ma),
      dev_pct: r2(data.ma_distance_pct),
      bear_days: isBull ? 0 : (typeof data.bear_days === "number" ? data.bear_days : 0),
      shelter_asset: isBull ? null : "GLDM",
    };

    return new NextResponse(JSON.stringify(payload), {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (e) {
    return NextResponse.json({ error: "fetch failed", detail: String(e) }, { status: 500 });
  }
}
