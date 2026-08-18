"use client";

import { useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

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
  start_date: "2010-02-11",
  end_date: "2026-08-14",
  initial_cap: 10000.0,
  comm_pct: 0.00495,
  comm_max: 22.0,
  tax_rate: 0.20315,
  slippage_pct: 0.001,
};

type SignalResp = {
  ticker?: string;
  date?: string;
  state?: string;
  close?: number;
  ma?: number;
  is_bull?: boolean;
  equity?: number;
  notified?: boolean;
  [k: string]: unknown;
};

type EquityPoint = { date: string; equity: number; bnh?: number };

type BacktestResp = {
  stats?: Record<string, number | string>;
  equity_curve?: EquityPoint[];
  current_state?: string;
  ticker?: string;
  [k: string]: unknown;
};

export default function Page() {
  const [params, setParams] = useState(STRICT_PARAMS);
  const [signal, setSignal] = useState<SignalResp | null>(null);
  const [backtest, setBacktest] = useState<BacktestResp | null>(null);
  const [loading, setLoading] = useState<"" | "signal" | "backtest">("");
  const [err, setErr] = useState<string>("");

  const update = <K extends keyof typeof STRICT_PARAMS>(k: K, v: (typeof STRICT_PARAMS)[K]) =>
    setParams((p) => ({ ...p, [k]: v }));

  const callApi = async (path: "signal" | "backtest") => {
    setErr("");
    setLoading(path);
    try {
      const res = await fetch(`/api/proxy?path=${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      const data = await res.json();
      if (path === "signal") setSignal(data);
      else setBacktest(data);
    } catch (e) {
      setErr(String(e));
    } finally {
      setLoading("");
    }
  };

  const resetStrict = () => setParams(STRICT_PARAMS);

  return (
    <main className="mx-auto max-w-4xl px-4 py-6 pb-safe">
      <header className="mb-6">
        <h1 className="text-lg font-bold text-gray-900">TQQQ Trend_burst</h1>
        <p className="mt-1 text-xs text-gray-500">厳格モード（感度分析済み）バックテスト &amp; 現在シグナル</p>
      </header>

      <section className="mb-4 rounded-2xl bg-white p-5 shadow">
        <h2 className="mb-4 text-sm font-bold text-gray-900">パラメータ</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="MA期間 (sma_len)" v={params.sma_len} on={(v) => update("sma_len", Number(v))} type="number" />
          <Field label="MA種別" v={params.ma_type} on={(v) => update("ma_type", String(v))} opts={["SMA", "EMA"]} />
          <Field label="トレンド確認 (rising_days)" v={params.rising_days} on={(v) => update("rising_days", Number(v))} type="number" />
          <Field label="バッファ% (buffer_pct)" v={params.buffer_pct} on={(v) => update("buffer_pct", Number(v))} type="number" step={0.1} />
          <Field label="EXIT遅延 (exit_delay)" v={params.exit_delay} on={(v) => update("exit_delay", Number(v))} type="number" />
          <Field label="TS% (ts_pct)" v={params.ts_pct} on={(v) => update("ts_pct", Number(v))} type="number" step={0.01} />
          <Field label="TS再エントリー" v={params.ts_reentry_mode} on={(v) => update("ts_reentry_mode", String(v))} opts={["A", "B"]} />
          <Field label="避難先" v={params.safe_ticker} on={(v) => update("safe_ticker", String(v))} opts={["GLDM", "TLT", "VIG", "BIL"]} />
          <Field label="開始日" v={params.start_date} on={(v) => update("start_date", String(v))} type="date" />
          <Field label="終了日" v={params.end_date} on={(v) => update("end_date", String(v))} type="date" />
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <button
            onClick={() => callApi("signal")}
            disabled={!!loading}
            className="flex-1 rounded-xl bg-blue-600 py-3.5 text-sm font-bold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
          >
            {loading === "signal" ? "取得中..." : "🔔 現在シグナル取得"}
          </button>
          <button
            onClick={() => callApi("backtest")}
            disabled={!!loading}
            className="flex-1 rounded-xl bg-emerald-600 py-3.5 text-sm font-bold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50"
          >
            {loading === "backtest" ? "実行中..." : "▶ バックテスト実行"}
          </button>
          <button
            onClick={resetStrict}
            className="rounded-xl border border-gray-300 bg-white px-4 py-3.5 text-sm font-bold text-gray-700 hover:bg-gray-50"
          >
            厳格モードにリセット
          </button>
        </div>
        {err && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
            Error: {err}
          </div>
        )}
      </section>

      {signal && (
        <section className="mb-4 rounded-2xl bg-white p-5 shadow">
          <h2 className="mb-4 text-sm font-bold text-gray-900">現在シグナル</h2>
          <div className="mb-3 flex items-center gap-2">
            <StateBadge state={String(signal.state ?? "")} />
            <span className="text-xs text-gray-500">{signal.date}</span>
            {signal.notified && (
              <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-bold text-blue-700">LINE送信済</span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="終値" v={fmt(signal.close)} />
            <Stat label="MA" v={fmt(signal.ma)} />
            <Stat label="Equity" v={fmt(signal.equity)} />
            <Stat label="ブル判定" v={signal.is_bull ? "✅" : "❌"} />
          </div>
        </section>
      )}

      {backtest && (
        <section className="mb-4 rounded-2xl bg-white p-5 shadow">
          <h2 className="mb-4 text-sm font-bold text-gray-900">バックテスト結果</h2>
          {backtest.current_state && (
            <div className="mb-3 flex items-center gap-2">
              <span className="text-xs text-gray-500">現在状態:</span>
              <StateBadge state={backtest.current_state} />
            </div>
          )}
          {backtest.equity_curve && backtest.equity_curve.length > 0 && (
            <div className="mb-4 h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={backtest.equity_curve} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10, fill: "#6b7280" }}
                    tickFormatter={(v) => String(v).slice(0, 7)}
                    minTickGap={40}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: "#6b7280" }}
                    tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    formatter={(v: number, name: string) => [`$${v.toLocaleString()}`, name === "equity" ? "戦略" : "B&H"]}
                    labelFormatter={(l) => String(l)}
                    contentStyle={{ fontSize: 12, borderRadius: 8 }}
                  />
                  <Line type="monotone" dataKey="equity" stroke="#059669" strokeWidth={2} dot={false} name="equity" />
                  <Line type="monotone" dataKey="bnh" stroke="#94a3b8" strokeWidth={1.5} dot={false} name="bnh" strokeDasharray="4 4" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
          {backtest.stats && (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {Object.entries(backtest.stats).map(([k, v]) => (
                <Stat key={k} label={statLabel(k)} v={fmtStat(k, v)} />
              ))}
            </div>
          )}
        </section>
      )}
    </main>
  );
}

function fmt(v: unknown): string {
  if (v === null || v === undefined) return "-";
  if (typeof v === "number") {
    if (Math.abs(v) >= 1000) return v.toLocaleString(undefined, { maximumFractionDigits: 2 });
    return String(Math.round(v * 10000) / 10000);
  }
  return String(v);
}

function Stat({ label, v }: { label: string; v: string }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="mt-0.5 text-sm font-bold text-gray-900">{v}</div>
    </div>
  );
}

const STATE_STYLE: Record<string, string> = {
  tqqq: "bg-emerald-100 text-emerald-800",
  cash: "bg-gray-200 text-gray-800",
  safe: "bg-amber-100 text-amber-800",
  ts_cash: "bg-red-100 text-red-800",
  ts_safe: "bg-red-100 text-red-800",
};
const STATE_LABEL: Record<string, string> = {
  tqqq: "📈 TQQQ保有中",
  cash: "💵 現金待機",
  safe: "🛡️ 避難先保有",
  ts_cash: "🔴 TS発動（現金）",
  ts_safe: "🔴 TS発動（避難先）",
};

function StateBadge({ state }: { state: string }) {
  const cls = STATE_STYLE[state] ?? "bg-gray-100 text-gray-700";
  const label = STATE_LABEL[state] ?? state ?? "?";
  return <span className={`rounded-full px-3 py-1 text-xs font-bold ${cls}`}>{label}</span>;
}

const STAT_LABEL: Record<string, string> = {
  tqqq_days: "TQQQ保有日数",
  cash_days: "現金日数",
  safe_days: "避難先日数",
  safe_gain: "避難先損益 (USD)",
  total_comm: "累計手数料 (USD)",
  total_tax: "累計税金 (USD)",
  n_trades: "取引回数",
  dca_invested: "DCA投資額 (USD)",
  dca_count: "DCA回数",
  max_unreal_loss_usd: "最大含み損 (USD)",
  max_unreal_loss_pct: "最大含み損率",
  max_unreal_loss_date: "最大含み損 発生日",
  max_unreal_loss_pct_v: "最大含み損率 (値)",
  max_unreal_loss_pct_usd: "最大含み損 (率基準USD)",
  max_unreal_loss_pct_date: "最大含み損率 発生日",
  max_loss_vs_init_usd: "初期比 最大損失 (USD)",
  max_loss_vs_init_pct: "初期比 最大損失率",
  max_loss_vs_init_date: "初期比 最大損失 発生日",
  max_loss_vs_init_pct_v: "初期比 最大損失率 (値)",
  max_loss_vs_init_pct_usd: "初期比 最大損失 (率基準USD)",
  max_loss_vs_init_pct_date: "初期比 最大損失率 発生日",
};
function statLabel(key: string): string {
  return STAT_LABEL[key] ?? key;
}
function fmtStat(key: string, v: unknown): string {
  if (v === null || v === undefined) return "-";
  if (typeof v === "string" && v.includes("T00:00:00")) return v.slice(0, 10);
  if (typeof v === "number") {
    if (key.endsWith("_pct") || key.endsWith("_pct_v")) return `${(v * 100).toFixed(2)}%`;
    if (Math.abs(v) >= 1000) return v.toLocaleString(undefined, { maximumFractionDigits: 2 });
    return String(Math.round(v * 10000) / 10000);
  }
  return String(v);
}

function Field({
  label, v, on, type = "text", step, opts,
}: {
  label: string;
  v: string | number;
  on: (v: string | number) => void;
  type?: string;
  step?: number;
  opts?: string[];
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs text-gray-600">{label}</span>
      {opts ? (
        <select
          value={String(v)}
          onChange={(e) => on(e.target.value)}
          className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none"
        >
          {opts.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : (
        <input
          type={type}
          value={String(v)}
          step={step}
          onChange={(e) => on(type === "number" ? Number(e.target.value) : e.target.value)}
          className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none"
        />
      )}
    </label>
  );
}
