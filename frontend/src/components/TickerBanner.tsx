"use client";

import React from "react";
import { Ticker, MicrostructureMetrics, MonthlyContext, DerivativesData, OnChainData } from "@/types/market";

interface TickerBannerProps {
  ticker: Ticker | null;
  microstructure: MicrostructureMetrics | null;
  monthlyContext?: MonthlyContext | null;
  derivatives?: DerivativesData | null;
  onchain?: OnChainData | null;
}

export const TickerBanner: React.FC<TickerBannerProps> = ({
  ticker,
  microstructure,
  monthlyContext,
  derivatives,
  onchain,
}) => {
  if (!ticker || !microstructure) {
    return (
      <div className="bg-[#090d18] border-b border-slate-800/80 px-4 py-2.5 flex items-center gap-6 overflow-x-auto text-xs font-mono">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping opacity-75" />
          <span className="text-cyan-300 font-bold uppercase tracking-wider text-[11px]">Connecting Market Pipeline</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="h-4 w-28 bg-slate-800/60 rounded animate-pulse" />
          <div className="h-4 w-20 bg-slate-800/60 rounded animate-pulse" />
          <div className="h-4 w-36 bg-slate-800/60 rounded animate-pulse" />
          <div className="h-4 w-24 bg-slate-800/60 rounded animate-pulse" />
        </div>
      </div>
    );
  }

  const change = ticker.change_pct_24h || 0;
  const isPositive = change >= 0;

  const obi = microstructure.order_book_imbalance;
  const obiPercent = (obi * 100).toFixed(1);
  const bidShare = Math.max(10, Math.min(90, Math.round(50 + obi * 40)));

  const monthlyChange = monthlyContext?.monthly_change_pct ?? 0;
  const isMonthlyPositive = monthlyChange >= 0;
  const rangePos = monthlyContext?.range_position_pct ?? 50;

  return (
    <div className="bg-[#090d18] border-b border-slate-800/80 px-4 py-2 flex items-center gap-5 overflow-x-auto text-xs shadow-md">
      {/* 1. Primary Ticker & Price */}
      <div className="flex flex-col min-w-[150px]">
        <div className="flex items-center gap-2">
          <span className="text-slate-300 font-extrabold uppercase tracking-wider text-xs">{ticker.symbol}</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800/90 text-cyan-300 font-mono border border-slate-700/50">
            {ticker.exchange}
          </span>
        </div>
        <div className="flex items-baseline gap-2 font-mono">
          <span className="text-lg font-bold text-white tracking-tight">${formatPrice(ticker.price)}</span>
          <span
            className={`text-xs font-bold px-1.5 py-0.2 rounded ${
              isPositive ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30" : "bg-rose-500/15 text-rose-400 border border-rose-500/30"
            }`}
          >
            {isPositive ? "+" : ""}
            {change.toFixed(2)}%
          </span>
        </div>
      </div>

      <div className="w-[1px] h-7 bg-slate-800/80 shrink-0" />

      {/* 2. 24h High / Low & Volume */}
      <div className="flex flex-col min-w-[140px] font-mono">
        <span className="text-[10px] text-slate-400 uppercase tracking-wider">24h High / Low</span>
        <div className="text-slate-200 font-semibold text-[11px]">
          <span className="text-emerald-400">${formatPrice(ticker.high_24h)}</span>
          <span className="text-slate-500 mx-1">/</span>
          <span className="text-rose-400">${formatPrice(ticker.low_24h)}</span>
        </div>
        <span className="text-[10px] text-slate-400">Vol: ${formatCompact(ticker.quote_volume_24h)}</span>
      </div>

      <div className="w-[1px] h-7 bg-slate-800/80 shrink-0" />

      {/* 3. 30-Day Macro Context */}
      {monthlyContext && (
        <>
          <div className="flex flex-col min-w-[210px]">
            <div className="flex justify-between items-center text-[10px] font-mono">
              <span className="text-slate-400 uppercase tracking-wider">30D Macro Range</span>
              <span
                className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                  monthlyContext.monthly_trend === "MACRO_BULLISH"
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                    : monthlyContext.monthly_trend === "MACRO_BEARISH"
                    ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                    : "bg-slate-800 text-slate-300"
                }`}
              >
                {monthlyContext.monthly_trend.replace("_", " ")} ({isMonthlyPositive ? "+" : ""}{monthlyChange.toFixed(1)}%)
              </span>
            </div>
            {/* Range Position Bar */}
            <div className="relative w-full h-1.5 bg-slate-800 rounded-full my-1 overflow-hidden">
              <div
                className="absolute top-0 bottom-0 bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full"
                style={{ width: `${Math.min(100, Math.max(5, rangePos))}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] font-mono">
              <span className="text-slate-400">${formatPrice(monthlyContext.monthly_low)}</span>
              <span className="text-cyan-400 font-bold">{rangePos.toFixed(0)}% channel</span>
              <span className="text-slate-400">${formatPrice(monthlyContext.monthly_high)}</span>
            </div>
          </div>

          <div className="w-[1px] h-7 bg-slate-800/80 shrink-0" />
        </>
      )}

      {/* 4. Order Book Imbalance (OBI) */}
      <div className="flex flex-col min-w-[170px] font-mono">
        <div className="flex justify-between items-center text-[10px]">
          <span className="text-slate-400 uppercase tracking-wider">Book Imbalance (OBI)</span>
          <span
            className={`font-bold ${
              obi > 0.05 ? "text-emerald-400" : obi < -0.05 ? "text-rose-400" : "text-slate-300"
            }`}
          >
            {obi > 0 ? "+" : ""}
            {obiPercent}%
          </span>
        </div>
        {/* Split Bar */}
        <div className="w-full h-1.5 bg-slate-800 rounded-full my-1 flex overflow-hidden">
          <div className="bg-emerald-500 h-full transition-all duration-300" style={{ width: `${bidShare}%` }} />
          <div className="bg-rose-500 h-full transition-all duration-300" style={{ width: `${100 - bidShare}%` }} />
        </div>
        <div className="flex justify-between text-[10px]">
          <span className="text-emerald-400">Bids {bidShare}%</span>
          <span className="text-rose-400">Asks {100 - bidShare}%</span>
        </div>
      </div>

      <div className="w-[1px] h-7 bg-slate-800/80 shrink-0" />

      {/* 5. Cumulative Volume Delta (CVD) */}
      <div className="flex flex-col min-w-[130px] font-mono">
        <div className="flex justify-between items-center text-[10px]">
          <span className="text-slate-400 uppercase tracking-wider">Tape CVD</span>
          <span
            className={`px-1 py-0.2 rounded text-[9px] font-bold ${
              microstructure.cvd_side === "BUY_DOMINANT"
                ? "bg-emerald-500/20 text-emerald-400"
                : microstructure.cvd_side === "SELL_DOMINANT"
                ? "bg-rose-500/20 text-rose-400"
                : "bg-slate-800 text-slate-400"
            }`}
          >
            {(microstructure.cvd_side || "BALANCED").replace("_", " ")}
          </span>
        </div>
        <div className="flex items-baseline gap-2">
          <span
            className={`font-bold ${
              (microstructure.cvd || 0) >= 0 ? "text-emerald-400" : "text-rose-400"
            }`}
          >
            {(microstructure.cvd || 0) >= 0 ? "+" : ""}
            {(microstructure.cvd || 0).toFixed(2)}
          </span>
          <span className="text-[10px] text-slate-400">Aggressor</span>
        </div>
      </div>

      {/* 6. Funding Rate & OI (Derivatives) */}
      {derivatives && (
        <>
          <div className="w-[1px] h-7 bg-slate-800/80 shrink-0" />
          <div className="flex flex-col min-w-[160px] font-mono">
            <div className="flex justify-between items-center text-[10px]">
              <span className="text-slate-400 uppercase tracking-wider">Funding Rate</span>
              <span
                className={`px-1 py-0.2 rounded text-[9px] font-bold ${
                  derivatives.funding_bias === "LONG_CROWDED"
                    ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                    : derivatives.funding_bias === "SHORT_CROWDED"
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                    : "bg-slate-800 text-slate-400"
                }`}
              >
                {derivatives.funding_bias.replace("_", " ")}
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span
                className={`font-bold ${
                  derivatives.funding_rate >= 0 ? "text-emerald-400" : "text-rose-400"
                }`}
              >
                {derivatives.funding_rate >= 0 ? "+" : ""}{derivatives.funding_rate_pct.toFixed(4)}%
              </span>
              <span className="text-[10px] text-slate-400">Ann: {derivatives.funding_rate_annualized_pct.toFixed(1)}%</span>
            </div>
          </div>

          <div className="w-[1px] h-7 bg-slate-800/80 shrink-0" />
          <div className="flex flex-col min-w-[120px] font-mono">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider">Open Interest</span>
            <span className="text-white font-bold">${formatCompact(derivatives.open_interest_usd)}</span>
            <span className="text-[10px] text-slate-400">Signal: {derivatives.leverage_signal.replace("_", " ")}</span>
          </div>
        </>
      )}

      {/* 7. On-Chain Stablecoin Flow (DefiLlama) */}
      {onchain && (
        <>
          <div className="w-[1px] h-7 bg-slate-800/80 shrink-0" />
          <div className="flex flex-col min-w-[170px] font-mono">
            <div className="flex justify-between items-center text-[10px]">
              <span className="text-slate-400 uppercase tracking-wider">Stablecoin Flow (30D)</span>
              <span
                className={`px-1 py-0.2 rounded text-[9px] font-bold ${
                  onchain.stablecoin_flow_signal.includes("INFLOW")
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                    : onchain.stablecoin_flow_signal.includes("OUTFLOW")
                    ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                    : "bg-slate-800 text-slate-400"
                }`}
              >
                {onchain.stablecoin_flow_signal.replace(/_/g, " ")}
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span
                className={`font-bold ${
                  onchain.stablecoin_30d_change_usd >= 0 ? "text-emerald-400" : "text-rose-400"
                }`}
              >
                {onchain.stablecoin_30d_change_usd >= 0 ? "+" : ""}
                ${formatCompact(Math.abs(onchain.stablecoin_30d_change_usd))}
              </span>
              <span className="text-[10px] text-slate-400">TVL: ${formatCompact(onchain.total_defi_tvl_usd)}</span>
            </div>
          </div>
        </>
      )}

      {/* 8. Spread Metric */}
      <div className="w-[1px] h-7 bg-slate-800/80 shrink-0" />
      <div className="flex flex-col min-w-[100px] font-mono">
        <span className="text-[10px] text-slate-400 uppercase tracking-wider">Mid Spread</span>
        <span className="text-slate-200 font-bold">
          {microstructure.spread_bps.toFixed(1)} bps
        </span>
        <span className="text-[10px] text-slate-400">({(microstructure.spread_pct * 100).toFixed(2)}%)</span>
      </div>
    </div>
  );
};

function formatPrice(val: number): string {
  if (!val || isNaN(val)) return "0.00";
  if (val >= 1000) return val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (val >= 1) return val.toFixed(4);
  return val.toFixed(6);
}

function formatCompact(val: number): string {
  if (!val || isNaN(val)) return "0.0";
  if (val >= 1_000_000_000) return (val / 1_000_000_000).toFixed(2) + "B";
  if (val >= 1_000_000) return (val / 1_000_000).toFixed(2) + "M";
  if (val >= 1_000) return (val / 1_000).toFixed(1) + "K";
  return val.toFixed(1);
}
