"use client";

import React from "react";
import { Trade } from "@/types/market";

interface TradeTapeProps {
  trades: Trade[];
}

export const TradeTape: React.FC<TradeTapeProps> = ({ trades }) => {
  if (!trades || trades.length === 0) {
    return (
      <div className="flex flex-col h-full text-xs font-mono p-3 space-y-2">
        <div className="flex justify-between items-center text-[10px] text-slate-500 uppercase font-bold border-b border-slate-800 pb-1">
          <span>Streaming Market Tape</span>
          <span className="animate-pulse text-cyan-400">● LIVE TRADES</span>
        </div>
        <div className="space-y-2 pt-2">
          {[...Array(8)].map((_, i) => (
            <div key={`sk-trade-${i}`} className="flex justify-between items-center h-4 bg-slate-800/40 rounded animate-pulse px-2">
              <div className="w-12 h-2.5 bg-slate-700/50 rounded" />
              <div className="w-8 h-2.5 bg-slate-700/50 rounded" />
              <div className="w-16 h-2.5 bg-slate-700/50 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full text-xs font-mono bg-[#090d18] overflow-hidden">
      {/* Header */}
      <div className="grid grid-cols-5 px-3.5 py-2 text-[10px] uppercase font-bold text-slate-400 border-b border-slate-800/80 bg-[#0c101d]">
        <span>Time</span>
        <span>Side</span>
        <span className="text-right">Price ($)</span>
        <span className="text-right">Size</span>
        <span className="text-right">Total ($)</span>
      </div>

      {/* Trades List */}
      <div className="flex-1 overflow-y-auto max-h-[380px] divide-y divide-slate-800/30 select-text">
        {trades.map((t) => (
          <div
            key={t.id}
            className={`grid grid-cols-5 px-3.5 py-1 text-[11px] items-center transition-colors ${
              t.is_whale
                ? "bg-amber-500/10 border-l-2 border-amber-400 font-bold"
                : "hover:bg-slate-800/40"
            }`}
          >
            <span className="text-slate-400">{t.time_str}</span>
            <span
              className={`font-bold flex items-center gap-1 ${
                t.side === "buy" ? "text-emerald-400" : "text-rose-400"
              }`}
            >
              {t.side.toUpperCase()}
              {t.is_whale && <span title="Whale Order (> $50,000)">🐋</span>}
            </span>
            <span className="text-right text-slate-200 font-semibold">${formatPrice(t.price)}</span>
            <span className="text-right text-slate-300">{t.amount.toFixed(4)}</span>
            <span className="text-right text-slate-400">${formatCompact(t.cost)}</span>
          </div>
        ))}
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
  if (val >= 1_000_000) return (val / 1_000_000).toFixed(2) + "M";
  if (val >= 1_000) return (val / 1_000).toFixed(1) + "K";
  return val.toFixed(2);
}
