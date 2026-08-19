"use client";

import { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

const today = () => new Date().toISOString().slice(0, 10);

const buildStrictParams = () => ({
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
  end_date: today(),
  initial_jpy: 1000000,
  initial_cap: 10000.0,
  comm_pct: 0.00495,
  comm_max: 22.0,
  tax_rate: 0.20315,
  slippage_pct: 0.001,
  dca_monthly_jpy: 0,
  dca_months: 0,
});

const AUTO_FETCH_KEY = "tb_last_auto_fetch";

type TsInfo = {
  peak: number;
  drawdown_pct: number;
  ts_pct: number;
  ts_room_pct: number;
  ts_price: number;
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
  prev_close?: number;
  day_change_pct?: number;
  ma_distance_pct?: number;
  is_rising?: boolean;
  buffer_condition_ok?: boolean;
  bear_days?: number | null;
  ts_info?: TsInfo | null;
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

type Params = ReturnType<typeof buildStrictParams>;

export default function Page() {
  const [params, setParams] = useState<Params>(buildStrictParams);
  const [signal, setSignal] = useState<SignalResp | null>(null);
  const [backtest, setBacktest] = useState<BacktestResp | null>(null);
  const [loading, setLoading] = useState<"" | "signal" | "backtest">("");
  const [err, setErr] = useState<string>("");

  const update = <K extends keyof Params>(k: K, v: Params[K]) =>
    setParams((p) => ({ ...p, [k]: v }));

  const callApi = async (path: "signal" | "backtest", overrideParams?: Params) => {
    setErr("");
    setLoading(path);
    try {
      const res = await fetch(`/api/proxy?path=${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(overrideParams ?? params),
        cache: "no-store",
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

  const resetStrict = () => setParams(buildStrictParams());

  // 暦日初回アクセス時に自動でバックテスト+シグナル取得
  useEffect(() => {
    const t = today();
    const last = typeof window !== "undefined" ? localStorage.getItem(AUTO_FETCH_KEY) : t;
    if (last !== t) {
      const p = buildStrictParams();
      setParams(p);
      callApi("backtest", p);
      callApi("signal", p);
      if (typeof window !== "undefined") localStorage.setItem(AUTO_FETCH_KEY, t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
          <Field
            label="運用初日の元本 (円)"
            v={params.initial_jpy}
            on={(v) => update("initial_jpy", Number(v))}
            type="number"
            step={100000}
          />
        </div>

        <details className="mt-4">
          <summary className="cursor-pointer text-xs font-bold text-gray-600 hover:text-gray-900">
            💴 積立設定 (DCA) {params.dca_monthly_jpy > 0 ? `— 月${params.dca_monthly_jpy.toLocaleString()}円×${params.dca_months}ヶ月` : "— 未設定"}
          </summary>
          <div className="mt-3 grid grid-cols-1 gap-3 rounded-xl border border-gray-200 bg-gray-50 p-3 sm:grid-cols-2">
            <Field
              label="月次積立額 (円)"
              v={params.dca_monthly_jpy}
              on={(v) => update("dca_monthly_jpy", Number(v))}
              type="number"
              step={10000}
            />
            <Field
              label="積立期間 (ヶ月)"
              v={params.dca_months}
              on={(v) => update("dca_months", Number(v))}
              type="number"
              step={1}
            />
          </div>
          <p className="mt-2 text-xs text-gray-500">
            バックテスト開始日から毎月第一取引日に「月次積立額 ÷ 当日USD/JPY実勢レート」USDを追加投資。
            USD/JPYは履歴+当日intraday補完で自動取得。0=積立なし。
          </p>
        </details>

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

          <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Stat
              label={`終値${signal.day_change_pct != null ? ` (${signal.day_change_pct >= 0 ? "+" : ""}${signal.day_change_pct}%)` : ""}`}
              v={fmt(signal.close)}
            />
            <Stat label="MA (200日)" v={fmt(signal.ma)} />
            <Stat
              label="MA乖離率"
              v={signal.ma_distance_pct != null ? `${signal.ma_distance_pct >= 0 ? "+" : ""}${signal.ma_distance_pct}%` : "-"}
            />
            <Stat label="評価額 (USD)" v={fmt(signal.equity)} />
          </div>

          <h3 className="mb-2 text-xs font-bold text-gray-700">📋 シグナル判定条件</h3>
          <div className="mb-4 space-y-1.5 rounded-xl border border-gray-200 bg-gray-50 p-3">
            <CondRow ok={!!signal.is_rising} label="MA上昇中" />
            <CondRow ok={!!signal.buffer_condition_ok} label={`終値 > MA (${signal.ma_distance_pct}%乖離)`} />
            <CondRow ok={!!signal.is_bull} label="ブル判定 (総合)" />
          </div>

          {signal.ts_info && (
            <>
              <h3 className="mb-2 text-xs font-bold text-gray-700">📊 トレーリングストップ状況</h3>
              <div className="mb-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                <Stat label="TS設定" v={`${signal.ts_info.ts_pct}%`} />
                <Stat label="期中高値" v={`$${signal.ts_info.peak.toFixed(2)}`} />
                <Stat label="高値からのDD" v={`${signal.ts_info.drawdown_pct}%`} />
                <Stat label="TS発動まで残り" v={`${signal.ts_info.ts_room_pct}%`} />
                <Stat label="TS発動価格" v={`$${signal.ts_info.ts_price.toFixed(2)}`} />
              </div>
            </>
          )}

          {signal.bear_days != null && signal.bear_days > 0 && signal.state !== "tqqq" && (
            <div className="rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800">
              🐻 ベア経過日数: <span className="font-bold">{signal.bear_days}日</span>
            </div>
          )}
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
          <Summary
            equityCurve={backtest.equity_curve}
            stats={backtest.stats}
          />
          {backtest.equity_curve && backtest.equity_curve.length > 0 && (
            <div
              className="mb-4 h-72 w-full"
              key={`${backtest.equity_curve[0]?.date}_${backtest.equity_curve.at(-1)?.date}_${backtest.equity_curve.length}`}
            >
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
            <details className="group mt-2">
              <summary className="cursor-pointer text-xs font-bold text-gray-600 hover:text-gray-900">
                📊 詳細スタッツを表示 ({Object.keys(backtest.stats).length}項目)
              </summary>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {Object.entries(backtest.stats).map(([k, v]) => (
                  <Stat key={k} label={statLabel(k)} v={fmtStat(k, v)} />
                ))}
              </div>
            </details>
          )}
        </section>
      )}
    </main>
  );
}

function num(v: unknown, fallback = 0): number {
  if (typeof v === "number") return v;
  const n = Number(v);
  return isNaN(n) ? fallback : n;
}

function Summary({
  equityCurve, stats,
}: {
  equityCurve?: EquityPoint[];
  stats?: Record<string, number | string>;
}) {
  if (!equityCurve || equityCurve.length === 0) return null;
  const first = equityCurve[0];
  const last = equityCurve[equityCurve.length - 1];
  const finalEq = last.equity;
  const finalBnh = last.bnh ?? 0;

  const totalInvestedUsd = num(stats?.total_invested_usd, num(stats?.initial_cap_usd, 10000));
  const totalInvestedJpy = num(stats?.total_invested_jpy, 0);
  const fxEnd = num(stats?.fx_end, 0);
  const finalEqJpy = fxEnd > 0 ? finalEq * fxEnd : 0;

  // 元本総額 (initial + DCA) 比のリターン
  const totalReturn = totalInvestedUsd > 0 ? (finalEq - totalInvestedUsd) / totalInvestedUsd : 0;
  const vsBnh = finalBnh ? finalEq / finalBnh - 1 : 0;

  // 年率化 (実日数ベース、元本比CAGR)
  const days = (new Date(last.date).getTime() - new Date(first.date).getTime()) / 86400000;
  const years = days / 365.25;
  const cagr = years > 0 && totalInvestedUsd > 0
    ? Math.pow(finalEq / totalInvestedUsd, 1 / years) - 1
    : 0;
  const maxDDNum = num(stats?.max_loss_vs_init_pct, 0);

  const positive = totalReturn >= 0;
  const heroBg = positive ? "from-emerald-500 to-emerald-600" : "from-rose-500 to-rose-600";

  return (
    <div className="mb-5">
      <div className={`rounded-2xl bg-gradient-to-br ${heroBg} p-5 text-white shadow-lg`}>
        <div className="text-xs opacity-90">最終評価額（{last.date}）</div>
        <div className="mt-1 flex items-baseline gap-3 flex-wrap">
          <span className="text-3xl font-bold">
            ¥{finalEqJpy > 0 ? finalEqJpy.toLocaleString(undefined, { maximumFractionDigits: 0 }) : "-"}
          </span>
          <span className="text-lg font-bold opacity-90">
            {positive ? "+" : ""}{(totalReturn * 100).toFixed(1)}%
          </span>
        </div>
        <div className="mt-1 text-xs opacity-90">
          ${finalEq.toLocaleString(undefined, { maximumFractionDigits: 0 })} USD
          {fxEnd > 0 && ` (レート ${fxEnd.toFixed(2)})`}
        </div>
        <div className="mt-2 text-xs opacity-90">
          元本総額 {totalInvestedJpy > 0 && `¥${totalInvestedJpy.toLocaleString()} / `}
          ${totalInvestedUsd.toLocaleString(undefined, { maximumFractionDigits: 0 })} USD
          → {(finalEq / totalInvestedUsd).toFixed(2)}倍
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <HeroStat
          label="年率リターン (CAGR)"
          value={`${(cagr * 100).toFixed(2)}%`}
          tone={cagr >= 0 ? "pos" : "neg"}
        />
        <HeroStat
          label="B&H対比"
          value={`${vsBnh >= 0 ? "+" : ""}${(vsBnh * 100).toFixed(1)}%`}
          tone={vsBnh >= 0 ? "pos" : "neg"}
        />
        <HeroStat
          label="B&H最終値"
          value={`$${finalBnh.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
          tone="neutral"
        />
        <HeroStat
          label="最大DD (初期比)"
          value={`${(maxDDNum * 100).toFixed(2)}%`}
          tone="warn"
        />
      </div>
    </div>
  );
}

function HeroStat({ label, value, tone }: { label: string; value: string; tone: "pos" | "neg" | "neutral" | "warn" }) {
  const toneCls = {
    pos: "text-emerald-700 bg-emerald-50 border-emerald-200",
    neg: "text-rose-700 bg-rose-50 border-rose-200",
    neutral: "text-gray-700 bg-gray-50 border-gray-200",
    warn: "text-amber-700 bg-amber-50 border-amber-200",
  }[tone];
  return (
    <div className={`rounded-xl border px-3 py-2.5 ${toneCls}`}>
      <div className="text-xs opacity-80">{label}</div>
      <div className="mt-0.5 text-base font-bold">{value}</div>
    </div>
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

function CondRow({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className={`inline-block h-5 w-5 shrink-0 rounded-full text-center text-xs font-bold leading-5 ${
        ok ? "bg-emerald-500 text-white" : "bg-rose-500 text-white"
      }`}>
        {ok ? "✓" : "✗"}
      </span>
      <span className={ok ? "text-gray-900" : "text-gray-500"}>{label}</span>
    </div>
  );
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
  initial_cap_usd: "初期資金 (USD)",
  initial_cap_jpy: "初期資金 (円)",
  dca_total_jpy: "DCA総額 (円)",
  total_invested_usd: "元本総額 (USD)",
  total_invested_jpy: "元本総額 (円)",
  fx_start: "USD/JPY 開始日",
  fx_end: "USD/JPY 終了日",
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
