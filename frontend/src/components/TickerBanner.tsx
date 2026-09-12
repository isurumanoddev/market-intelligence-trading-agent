"use client";

import React from "react";
import { Ticker, MicrostructureMetrics } from "@/types/market";

interface TickerBannerProps {
  ticker: Ticker | null;
  microstructure: MicrostructureMetrics | null;
}

export const TickerBanner: React.FC<TickerBannerProps> = ({ ticker, microstructure }) => {
  if (!ticker || !microstructure) {
    return (
      <div className="bg-[#171f30] border-b border-slate-800 px-4 py-2 text-xs text-slate-500 font-mono">
        Connecting to market data feed...
      </div>
    );
  }

  const change = ticker.change_pct_24h || 0;
  const isPositive = change >= 0;

  const obi = microstructure.order_book_imbalance;
  const obiPercent = (obi * 100).toFixed(1);
  const bidShare = Math.max(10, Math.min(90, Math.round(50 + obi * 40)));

  return (
    <div className="bg-[#171f30] border-b border-slate-800 px-4 py-2 flex items-center gap-6 overflow-x-auto text-xs">
      {/* Primary Ticker & Price */}
      <div className="flex flex-col min-w-[140px]">
        <div className="flex items-center gap-2">
          <span className="text-slate-400 font-bold uppercase tracking-wider">{ticker.symbol}</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 font-mono">
            {ticker.exchange}
          </span>
        </div>
        <div className="flex items-baseline gap-2 font-mono">
          <span className="text-lg font-bold text-white">${formatPrice(ticker.price)}</span>
          <span className={`text-xs font-semibold ${isPositive ? "text-emerald-400" : "text-rose-400"}`}>
            {isPositive ? "+" : ""}
            {change.toFixed(2)}%
          </span>
        </div>
      </div>

      <div className="w-[1px] h-7 bg-slate-800 shrink-0" />

      {/* 24h High / Low */}
      <div className="flex flex-col min-w-[130px] font-mono">
        <span className="text-[10px] text-slate-500 uppercase tracking-wider">24h High / Low</span>
        <span className="text-slate-300">
          ${formatPrice(ticker.high_24h)} / ${formatPrice(ticker.low_24h)}
        </span>
      </div>

      {/* 24h Volume */}
      <div className="flex flex-col min-w-[120px] font-mono">
        <span className="text-[10px] text-slate-500 uppercase tracking-wider">24h Volume</span>
        <span className="text-slate-300">
          {ticker.volume_24h.toLocaleString(undefined, { maximumFractionDigits: 2 })}
        </span>
      </div>

      <div className="w-[1px] h-7 bg-slate-800 shrink-0" />

      {/* Order Book Imbalance (OBI) Gauge */}
      <div className="flex flex-col min-w-[220px]">
        <div className="flex justify-between items-center text-[10px] font-mono">
          <span className="text-slate-500 uppercase tracking-wider">Order Book Imbalance</span>
          <span className={`font-bold ${obi >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
            {obi >= 0 ? "+" : ""}
            {obiPercent}%
          </span>
        </div>
        <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden flex my-1">
          <div className="bg-emerald-500 transition-all duration-300" style={{ width: `${bidShare}%` }} />
          <div className="bg-rose-500 transition-all duration-300" style={{ width: `${100 - bidShare}%` }} />
        </div>
        <div className="flex justify-between text-[10px] font-mono">
          <span className="text-emerald-400">Bids: ${formatCompact(microstructure.bid_depth_usd)}</span>
          <span className="text-rose-400">Asks: ${formatCompact(microstructure.ask_depth_usd)}</span>
        </div>
      </div>

      <div className="w-[1px] h-7 bg-slate-800 shrink-0" />

      {/* CVD (Cumulative Volume Delta) */}
      <div className="flex flex-col min-w-[150px] font-mono">
        <span className="text-[10px] text-slate-500 uppercase tracking-wider">Cumul. Vol Delta (CVD)</span>
        <span className={`font-semibold ${microstructure.cvd >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
          {microstructure.cvd >= 0 ? "+" : ""}
          {microstructure.cvd.toFixed(2)} ({microstructure.cvd_side})
        </span>
      </div>

      {/* Spread */}
      <div className="flex flex-col min-w-[130px] font-mono">
        <span className="text-[10px] text-slate-500 uppercase tracking-wider">Bid-Ask Spread</span>
        <span className="text-slate-300">
          {microstructure.spread_pct.toFixed(3)}% ({microstructure.spread_bps.toFixed(1)} bps)
        </span>
      </div>
    </div>
  );
};

function formatPrice(val: number): string {
  if (val >= 1000) return val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (val >= 1) return val.toFixed(4);
  return val.toFixed(6);
}

function formatCompact(val: number): string {
  if (val >= 1_000_000) return (val / 1_000_000).toFixed(2) + "M";
  if (val >= 1_000) return (val / 1_000).toFixed(1) + "K";
  return val.toFixed(2);
}
