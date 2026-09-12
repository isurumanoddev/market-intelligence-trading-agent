"use client";

import React from "react";
import { PortfolioState } from "@/types/market";
import { Briefcase, RotateCcw } from "lucide-react";

interface PortfolioFooterProps {
  portfolio: PortfolioState | null;
  onClosePosition: (id: string, currentPrice: number) => void;
  onResetPortfolio: () => void;
}

export const PortfolioFooter: React.FC<PortfolioFooterProps> = ({
  portfolio,
  onClosePosition,
  onResetPortfolio,
}) => {
  const cash = portfolio?.cash || 100000;
  const equity = portfolio?.equity || 100000;
  const pnl = portfolio?.total_pnl || 0;
  const pnlPct = portfolio?.total_pnl_pct || 0;
  const positions = portfolio?.positions || [];

  return (
    <footer className="bg-[#111622] border-t border-slate-800 px-4 py-3 text-xs">
      {/* Metrics Bar */}
      <div className="flex justify-between items-center flex-wrap gap-4 mb-3">
        <div className="flex items-center gap-2">
          <Briefcase className="w-4 h-4 text-cyan-400" />
          <span className="font-bold text-white text-xs tracking-wider">PAPER TRADING SIMULATOR</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#171f30] text-slate-400 font-mono">
            Virtual \$100k Margin Account
          </span>
        </div>

        <div className="flex items-center gap-6 font-mono">
          <div className="flex flex-col">
            <span className="text-[9px] text-slate-500 uppercase">Cash Balance</span>
            <span className="text-white font-bold">${cash.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>

          <div className="flex flex-col">
            <span className="text-[9px] text-slate-500 uppercase">Total Equity</span>
            <span className="text-white font-bold">${equity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>

          <div className="flex flex-col">
            <span className="text-[9px] text-slate-500 uppercase">Total Realized + Unrealized PnL</span>
            <span className={`font-bold ${pnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
              {pnl >= 0 ? "+" : ""}${pnl.toFixed(2)} ({pnl >= 0 ? "+" : ""}{pnlPct.toFixed(2)}%)
            </span>
          </div>

          <div className="flex flex-col">
            <span className="text-[9px] text-slate-500 uppercase">Open Positions</span>
            <span className="text-slate-300 font-bold">{positions.length}</span>
          </div>

          <button
            onClick={onResetPortfolio}
            className="flex items-center gap-1 bg-[#171f30] hover:bg-slate-800 border border-slate-700 text-slate-300 px-2.5 py-1 rounded text-xs transition-colors"
            title="Reset Portfolio Balance"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* Positions Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left font-mono text-[11px]">
          <thead>
            <tr className="text-slate-500 text-[10px] uppercase border-b border-slate-800">
              <th className="pb-1.5">Symbol</th>
              <th className="pb-1.5">Side</th>
              <th className="pb-1.5">Size</th>
              <th className="pb-1.5">Entry Price</th>
              <th className="pb-1.5">Current Price</th>
              <th className="pb-1.5">Cost Basis</th>
              <th className="pb-1.5">Current Value</th>
              <th className="pb-1.5">Unrealized PnL</th>
              <th className="pb-1.5">Stop Loss</th>
              <th className="pb-1.5">Take Profit</th>
              <th className="pb-1.5 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/40">
            {positions.length === 0 ? (
              <tr>
                <td colSpan={11} className="py-3 text-center text-slate-500 font-sans text-xs">
                  No active open positions. Execute a trade using the AI Decision card above.
                </td>
              </tr>
            ) : (
              positions.map((p) => (
                <tr key={p.id} className="hover:bg-slate-800/20">
                  <td className="py-1.5 font-bold text-white">{p.symbol}</td>
                  <td className={`py-1.5 font-bold ${p.side === "BUY" ? "text-emerald-400" : "text-rose-400"}`}>
                    {p.side}
                  </td>
                  <td className="py-1.5 text-slate-300">{p.amount}</td>
                  <td className="py-1.5 text-slate-300">${formatPrice(p.entry_price)}</td>
                  <td className="py-1.5 text-white font-semibold">${formatPrice(p.current_price)}</td>
                  <td className="py-1.5 text-slate-400">${formatCompact(p.cost_basis)}</td>
                  <td className="py-1.5 text-slate-300">${formatCompact(p.current_value)}</td>
                  <td className={`py-1.5 font-bold ${p.unrealized_pnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                    {p.unrealized_pnl >= 0 ? "+" : ""}${p.unrealized_pnl.toFixed(2)} ({p.unrealized_pnl_pct.toFixed(2)}%)
                  </td>
                  <td className="py-1.5 text-slate-400">{p.stop_loss ? `$${formatPrice(p.stop_loss)}` : "--"}</td>
                  <td className="py-1.5 text-slate-400">{p.take_profit ? `$${formatPrice(p.take_profit)}` : "--"}</td>
                  <td className="py-1.5 text-right">
                    <button
                      onClick={() => onClosePosition(p.id, p.current_price)}
                      className="bg-rose-500/15 hover:bg-rose-600 border border-rose-500/40 text-rose-400 hover:text-white px-2 py-0.5 rounded text-[10px] transition-colors"
                    >
                      Close
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </footer>
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
