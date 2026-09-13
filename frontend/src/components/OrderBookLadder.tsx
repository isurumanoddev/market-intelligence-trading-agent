"use client";

import React from "react";
import { OrderBook, MicrostructureMetrics } from "@/types/market";

interface OrderBookLadderProps {
  orderBook: OrderBook | null;
  microstructure: MicrostructureMetrics | null;
}

export const OrderBookLadder: React.FC<OrderBookLadderProps> = ({ orderBook, microstructure }) => {
  if (!orderBook) {
    return (
      <div className="flex flex-col h-full text-xs font-mono p-3 space-y-2">
        <div className="flex justify-between items-center text-[10px] text-slate-500 uppercase font-bold border-b border-slate-800 pb-1">
          <span>Connecting Order Book</span>
          <span className="animate-pulse text-cyan-400">● LIVE L2</span>
        </div>
        <div className="space-y-1.5 pt-2">
          {[...Array(6)].map((_, i) => (
            <div key={`sk-ask-${i}`} className="h-4 bg-rose-500/10 rounded animate-pulse" style={{ width: `${80 - i * 10}%` }} />
          ))}
          <div className="h-6 bg-slate-800/80 rounded my-2 flex items-center justify-center text-[10px] text-slate-500">
            Calculating Market Spread...
          </div>
          {[...Array(6)].map((_, i) => (
            <div key={`sk-bid-${i}`} className="h-4 bg-emerald-500/10 rounded animate-pulse" style={{ width: `${40 + i * 10}%` }} />
          ))}
        </div>
      </div>
    );
  }

  // Show top 9 asks reversed (lowest ask closest to spread)
  const asks = orderBook.asks.slice(0, 9).reverse();
  const bids = orderBook.bids.slice(0, 9);

  const walls = [
    ...(microstructure?.large_bid_walls || []),
    ...(microstructure?.large_ask_walls || []),
  ];

  return (
    <div className="flex flex-col h-full text-xs font-mono bg-[#090d18]">
      {/* Header */}
      <div className="grid grid-cols-3 px-3.5 py-2 text-[10px] uppercase font-bold text-slate-400 border-b border-slate-800/80 bg-[#0c101d]">
        <span>Price ($)</span>
        <span className="text-right">Size</span>
        <span className="text-right">Total Depth</span>
      </div>

      {/* Asks (Red / Resistance) */}
      <div className="flex flex-col overflow-hidden py-0.5">
        {asks.map((a, idx) => (
          <div key={`ask-${idx}`} className="grid grid-cols-3 px-3.5 py-[2px] relative items-center text-[11px] hover:bg-rose-500/10 transition-colors">
            <div
              className="absolute inset-y-0 right-0 bg-gradient-to-l from-rose-500/20 to-transparent pointer-events-none"
              style={{ width: `${a.depth_pct}%` }}
            />
            <span className="text-rose-400 font-semibold z-10">${formatPrice(a.price)}</span>
            <span className="text-right text-slate-300 z-10">{a.amount.toFixed(4)}</span>
            <span className="text-right text-slate-400 z-10">{a.total.toFixed(4)}</span>
          </div>
        ))}
      </div>

      {/* Mid Spread Strip */}
      <div className="bg-[#111728] border-y border-slate-800 px-3.5 py-1.5 flex justify-between items-center font-bold text-xs my-0.5 shadow-inner">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
          <span className="text-white text-sm font-extrabold tracking-tight">
            ${formatPrice((orderBook.best_bid + orderBook.best_ask) / 2)}
          </span>
        </div>
        <span className="text-[10px] text-cyan-300 font-normal">
          Spread: ${orderBook.spread.toFixed(2)} ({(orderBook.spread_pct * 100).toFixed(1)} bps)
        </span>
      </div>

      {/* Bids (Green / Support) */}
      <div className="flex flex-col overflow-hidden py-0.5">
        {bids.map((b, idx) => (
          <div key={`bid-${idx}`} className="grid grid-cols-3 px-3.5 py-[2px] relative items-center text-[11px] hover:bg-emerald-500/10 transition-colors">
            <div
              className="absolute inset-y-0 right-0 bg-gradient-to-l from-emerald-500/20 to-transparent pointer-events-none"
              style={{ width: `${b.depth_pct}%` }}
            />
            <span className="text-emerald-400 font-semibold z-10">${formatPrice(b.price)}</span>
            <span className="text-right text-slate-300 z-10">{b.amount.toFixed(4)}</span>
            <span className="text-right text-slate-400 z-10">{b.total.toFixed(4)}</span>
          </div>
        ))}
      </div>

      {/* Liquidity Wall Highlights */}
      <div className="mt-auto px-3.5 py-2.5 bg-[#0b0f1a] border-t border-slate-800/80 text-[10px]">
        <div className="text-amber-400 font-bold mb-1 flex items-center gap-1">
          <span>🧱 Detected Liquidity Blocks:</span>
        </div>
        {walls.length > 0 ? (
          <div className="flex flex-wrap gap-1.5 text-slate-300">
            {walls.slice(0, 3).map((w, i) => (
              <span key={i} className="bg-slate-800/90 px-1.5 py-0.5 rounded border border-slate-700/60 text-cyan-300 font-mono">
                ${formatPrice(w.price)} ({w.amount} @ ${formatCompact(w.usd_value)})
              </span>
            ))}
          </div>
        ) : (
          <span className="text-slate-500">Order book depth distributed normally.</span>
        )}
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
  return val.toFixed(1);
}
