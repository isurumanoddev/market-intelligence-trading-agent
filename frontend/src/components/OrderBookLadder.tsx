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
      <div className="flex items-center justify-center h-48 text-slate-500 text-xs font-mono">
        Loading order book depth...
      </div>
    );
  }

  // Show top 10 asks reversed (lowest ask closest to spread)
  const asks = orderBook.asks.slice(0, 10).reverse();
  const bids = orderBook.bids.slice(0, 10);

  const walls = [
    ...(microstructure?.large_bid_walls || []),
    ...(microstructure?.large_ask_walls || []),
  ];

  return (
    <div className="flex flex-col h-full text-xs font-mono">
      {/* Header */}
      <div className="grid grid-cols-3 px-3 py-1.5 text-[10px] uppercase font-bold text-slate-500 border-b border-slate-800">
        <span>Price ($)</span>
        <span className="text-right">Size</span>
        <span className="text-right">Total Depth</span>
      </div>

      {/* Asks (Red) */}
      <div className="flex flex-col overflow-hidden max-h-[165px]">
        {asks.map((a, idx) => (
          <div key={`ask-${idx}`} className="grid grid-cols-3 px-3 py-0.5 relative items-center text-[11px]">
            <div
              className="absolute inset-y-0 right-0 bg-rose-500/15 pointer-events-none transition-all duration-200"
              style={{ width: `${a.depth_pct}%` }}
            />
            <span className="text-rose-400 font-semibold z-10">${formatPrice(a.price)}</span>
            <span className="text-right text-slate-300 z-10">{a.amount.toFixed(4)}</span>
            <span className="text-right text-slate-400 z-10">{a.total.toFixed(4)}</span>
          </div>
        ))}
      </div>

      {/* Mid Spread Strip */}
      <div className="bg-[#171f30] border-y border-slate-800 px-3 py-1.5 flex justify-between items-center font-bold text-xs my-0.5">
        <span className="text-white">${formatPrice((orderBook.best_bid + orderBook.best_ask) / 2)}</span>
        <span className="text-[10px] text-slate-400 font-normal">
          Spread: ${orderBook.spread.toFixed(2)} ({orderBook.spread_pct.toFixed(2)}%)
        </span>
      </div>

      {/* Bids (Green) */}
      <div className="flex flex-col overflow-hidden max-h-[165px]">
        {bids.map((b, idx) => (
          <div key={`bid-${idx}`} className="grid grid-cols-3 px-3 py-0.5 relative items-center text-[11px]">
            <div
              className="absolute inset-y-0 right-0 bg-emerald-500/15 pointer-events-none transition-all duration-200"
              style={{ width: `${b.depth_pct}%` }}
            />
            <span className="text-emerald-400 font-semibold z-10">${formatPrice(b.price)}</span>
            <span className="text-right text-slate-300 z-10">{b.amount.toFixed(4)}</span>
            <span className="text-right text-slate-400 z-10">{b.total.toFixed(4)}</span>
          </div>
        ))}
      </div>

      {/* Liquidity Wall Highlights */}
      <div className="mt-auto px-3 py-2 bg-[#171f30] border-t border-slate-800 text-[10px]">
        <div className="text-amber-400 font-bold mb-1">Detected Liquidity Blocks:</div>
        {walls.length > 0 ? (
          <div className="flex flex-wrap gap-2 text-slate-300">
            {walls.map((w, i) => (
              <span key={i} className="bg-slate-800/80 px-1.5 py-0.5 rounded border border-slate-700">
                ${formatPrice(w.price)} ({w.amount} @ ${formatCompact(w.usd_value)})
              </span>
            ))}
          </div>
        ) : (
          <span className="text-slate-500">No abnormal liquidity walls detected.</span>
        )}
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
