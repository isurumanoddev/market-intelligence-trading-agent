"use client";

import React from "react";
import { Trade } from "@/types/market";

interface TradeTapeProps {
  trades: Trade[];
}

export const TradeTape: React.FC<TradeTapeProps> = ({ trades }) => {
  if (!trades || trades.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-slate-500 text-xs font-mono">
        Awaiting trades on tape...
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full text-xs font-mono overflow-hidden">
      {/* Header */}
      <div className="grid grid-cols-5 px-3 py-1.5 text-[10px] uppercase font-bold text-slate-500 border-b border-slate-800">
        <span>Time</span>
        <span>Side</span>
        <span className="text-right">Price ($)</span>
        <span className="text-right">Amount</span>
        <span className="text-right">Cost ($)</span>
      </div>

      {/* Trades List */}
      <div className="flex-1 overflow-y-auto max-h-[380px] divide-y divide-slate-800/40">
        {trades.map((t) => (
          <div
            key={t.id}
            className={`grid grid-cols-5 px-3 py-1 text-[11px] items-center ${
              t.is_whale
                ? "bg-amber-500/10 border-l-2 border-amber-400"
                : "hover:bg-slate-800/30"
            }`}
          >
            <span className="text-slate-400">{t.time_str}</span>
            <span
              className={`font-bold flex items-center gap-1 ${
                t.side === "buy" ? "text-emerald-400" : "text-rose-400"
              }`}
            >
              {t.side.toUpperCase()}
              {t.is_whale && <span title="Whale Order (Outsized Volume)">🐋</span>}
            </span>
            <span className="text-right text-slate-200">${formatPrice(t.price)}</span>
            <span className="text-right text-slate-300">{t.amount.toFixed(4)}</span>
            <span className="text-right text-slate-400">${formatCompact(t.cost)}</span>
          </div>
        ))}
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
