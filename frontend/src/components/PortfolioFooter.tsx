"use client";

import React from "react";
import { PortfolioState } from "@/types/market";
import { Briefcase, RotateCcw, Zap, ExternalLink } from "lucide-react";

interface PortfolioFooterProps {
  portfolio: PortfolioState | null;
  onClosePosition: (id: string, currentPrice: number) => void;
  onResetPortfolio: () => void;
  onOpenTradeModal?: () => void;
}

export const PortfolioFooter: React.FC<PortfolioFooterProps> = ({
  portfolio,
  onClosePosition,
  onResetPortfolio,
  onOpenTradeModal,
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
            Virtual $100k Margin Account
          </span>
          {onOpenTradeModal && (
            <button
              onClick={onOpenTradeModal}
              className="ml-2 flex items-center gap-1.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold px-3 py-1 rounded-md text-xs shadow-md shadow-cyan-950/60 transition-all active:scale-95"
            >
              <Zap className="w-3.5 h-3.5 fill-white" />
              <span>+ New Trade</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-6 font-mono">
          <div className="flex flex-col">
            <span className="text-[9px] text-slate-500 uppercase">Available Cash</span>
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
              <th className="pb-1.5">Leverage</th>
              <th className="pb-1.5">Size / Notional</th>
              <th className="pb-1.5">Margin</th>
              <th className="pb-1.5">Entry Price</th>
              <th className="pb-1.5">Current Price</th>
              <th className="pb-1.5">Liq Price</th>
              <th className="pb-1.5">Unrealized PnL</th>
              <th className="pb-1.5">TP / SL</th>
              <th className="pb-1.5">Broker / Watch</th>
              <th className="pb-1.5 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/40">
            {positions.length === 0 ? (
              <tr>
                <td colSpan={12} className="py-5 text-center text-slate-500 font-sans text-xs">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <p>No active open positions in this paper trading margin account.</p>
                    {onOpenTradeModal && (
                      <button
                        onClick={onOpenTradeModal}
                        className="flex items-center gap-1.5 bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-500/40 text-cyan-300 px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all"
                      >
                        <Zap className="w-3.5 h-3.5" />
                        <span>+ Open New Paper Trade</span>
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              positions.map((p) => {
                const notional = p.cost_basis || (p.amount * p.entry_price);
                const margin = p.margin || (notional / Math.max(1, p.leverage || 1));
                const lev = p.leverage || 1;
                return (
                  <tr key={p.id} className="hover:bg-slate-800/20">
                    <td className="py-2 font-bold text-white">{p.symbol}</td>
                    <td className="py-2">
                      <span className={`px-1.5 py-0.2 rounded font-black text-[10px] ${
                        p.side === "BUY"
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                          : "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                      }`}>
                        {p.side === "BUY" ? "LONG" : "SHORT"}
                      </span>
                    </td>
                    <td className="py-2">
                      <span className="px-1.5 py-0.2 rounded bg-amber-500/15 border border-amber-500/30 text-amber-300 font-bold text-[10px]">
                        {lev}x
                      </span>
                    </td>
                    <td className="py-2 text-slate-300">
                      <div>{p.amount}</div>
                      <div className="text-[9px] text-slate-500">${formatCompact(notional)}</div>
                    </td>
                    <td className="py-2 text-cyan-300 font-semibold">${formatCompact(margin)}</td>
                    <td className="py-2 text-slate-300">${formatPrice(p.entry_price)}</td>
                    <td className="py-2 text-white font-bold">${formatPrice(p.current_price)}</td>
                    <td className="py-2 text-rose-400">
                      {p.liquidation_price ? `$${formatPrice(p.liquidation_price)}` : "--"}
                    </td>
                    <td className={`py-2 font-bold ${p.unrealized_pnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                      <div>
                        {p.unrealized_pnl >= 0 ? "+" : ""}${p.unrealized_pnl.toFixed(2)}
                      </div>
                      <div className="text-[9px]">
                        ({p.unrealized_pnl >= 0 ? "+" : ""}{p.unrealized_pnl_pct.toFixed(1)}% ROI)
                      </div>
                    </td>
                    <td className="py-2 text-[10px] text-slate-400">
                      <div className="text-emerald-400">TP: {p.take_profit ? `$${formatPrice(p.take_profit)}` : "--"}</div>
                      <div className="text-rose-400">SL: {p.stop_loss ? `$${formatPrice(p.stop_loss)}` : "--"}</div>
                    </td>
                    <td className="py-2 text-[10px]">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`px-1.5 py-0.2 rounded font-bold text-[9px] ${
                          p.broker_type === "BINANCE_TESTNET"
                            ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                            : p.broker_type === "BYBIT_TESTNET"
                            ? "bg-purple-500/20 text-purple-300 border border-purple-500/40"
                            : "bg-blue-500/20 text-blue-300 border border-blue-500/40"
                        }`}>
                          {p.broker_type === "BINANCE_TESTNET" ? "BINANCE" : p.broker_type === "BYBIT_TESTNET" ? "BYBIT" : "LOCAL"}
                        </span>
                        {p.exchange_watch_url && (
                          <a
                            href={p.exchange_watch_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-cyan-400 hover:text-cyan-300 underline font-semibold flex items-center gap-0.5 text-[10px]"
                            title="Open live exchange orderbook / chart"
                          >
                            <span>Watch</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        )}
                      </div>
                    </td>
                    <td className="py-2 text-right">
                      <button
                        onClick={() => onClosePosition(p.id, p.current_price)}
                        className="bg-rose-500/15 hover:bg-rose-600 border border-rose-500/40 text-rose-400 hover:text-white px-2.5 py-1 rounded text-[11px] font-bold transition-all"
                      >
                        Close
                      </button>
                    </td>
                  </tr>
                );
              })
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
