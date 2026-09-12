"use client";

import React, { useState } from "react";
import { TradingDecision } from "@/types/market";
import { Zap, ShieldCheck } from "lucide-react";

interface DecisionCardProps {
  decision: TradingDecision | null;
  onExecuteTrade: () => void;
  isExecuting: boolean;
}

export const DecisionCard: React.FC<DecisionCardProps> = ({
  decision,
  onExecuteTrade,
  isExecuting,
}) => {
  const [activeTab, setActiveTab] = useState<"confluence" | "micro" | "news" | "risk">("confluence");

  if (!decision) {
    return (
      <div className="bg-[#111622] border border-slate-800 rounded p-4 text-xs font-mono text-slate-500">
        Synthesizing market signals...
      </div>
    );
  }

  const action = decision.action;
  const isBuy = action.includes("BUY");
  const isSell = action.includes("SELL");

  const badgeColor =
    action === "STRONG_BUY"
      ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/40 border border-emerald-400"
      : action === "BUY"
      ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/30"
      : action === "STRONG_SELL"
      ? "bg-rose-700 text-white shadow-lg shadow-rose-700/40 border border-rose-400"
      : action === "SELL"
      ? "bg-rose-500 text-white shadow-md shadow-rose-500/30"
      : "bg-slate-700 text-white";

  const barColor = isBuy ? "bg-emerald-500" : isSell ? "bg-rose-500" : "bg-blue-500";

  return (
    <div className="bg-gradient-to-br from-[#141b2a] to-[#0d121c] border border-slate-700/80 rounded-md p-3.5 shadow-xl flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
          AI Master Trading Arbiter
        </span>
        <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/30 font-mono">
          {decision.model_used}
        </span>
      </div>

      {/* Action & Conviction Block */}
      <div className="flex items-center gap-4">
        <div className={`px-4 py-1.5 rounded font-mono font-extrabold text-sm tracking-wider ${badgeColor}`}>
          {action.replace("_", " ")}
        </div>
        <div className="flex-1">
          <div className="flex justify-between text-[11px] mb-1 font-mono">
            <span className="text-slate-400">Conviction Level</span>
            <span className="font-bold text-white">{decision.conviction}%</span>
          </div>
          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`h-full ${barColor} transition-all duration-500`}
              style={{ width: `${decision.conviction}%` }}
            />
          </div>
        </div>
      </div>

      {/* Executive Summary */}
      <p className="text-xs text-slate-300 leading-relaxed font-sans">
        {decision.summary}
      </p>

      {/* Execution Levels Grid */}
      <div className="grid grid-cols-4 gap-2 bg-[#090d15] p-2.5 rounded border border-slate-800/80 text-[11px] font-mono">
        <div className="flex flex-col">
          <span className="text-[9px] text-slate-500 uppercase">Entry Range</span>
          <span className="text-slate-200 font-semibold">
            {decision.entry_zone && decision.entry_zone.length
              ? `$${formatPrice(decision.entry_zone[0])}`
              : `$${formatPrice(decision.current_price)}`}
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-[9px] text-slate-500 uppercase">Stop Loss</span>
          <span className="text-rose-400 font-semibold">${formatPrice(decision.stop_loss)}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-[9px] text-slate-500 uppercase">Take Profit 1</span>
          <span className="text-emerald-400 font-semibold">${formatPrice(decision.take_profit_1)}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-[9px] text-slate-500 uppercase">Risk / Reward</span>
          <span className="text-cyan-400 font-semibold">1 : {decision.risk_reward_ratio}</span>
        </div>
      </div>

      {/* Execute Paper Trade Button */}
      <button
        onClick={onExecuteTrade}
        disabled={isExecuting}
        className={`w-full py-2.5 px-4 rounded font-bold text-xs tracking-wider text-white flex items-center justify-center gap-2 shadow-lg transition-all ${
          isSell
            ? "bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 shadow-rose-600/30"
            : "bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 shadow-emerald-600/30"
        } disabled:opacity-50`}
      >
        <Zap className="w-4 h-4 fill-white" />
        <span>
          {isExecuting ? "Executing Order..." : `⚡ Execute Paper Trade (${isSell ? "SELL" : "BUY"})`}
        </span>
      </button>

      {/* Specialist Reasoning Tabs */}
      <div className="border-t border-slate-800/80 pt-2.5">
        <div className="flex gap-1 mb-2 border-b border-slate-800 pb-1.5">
          <button
            onClick={() => setActiveTab("confluence")}
            className={`px-2 py-0.5 text-[11px] rounded transition-colors ${
              activeTab === "confluence"
                ? "bg-[#171f30] text-white font-semibold"
                : "text-slate-500 hover:text-slate-300"
            }`}
          >
            Confluence
          </button>
          <button
            onClick={() => setActiveTab("micro")}
            className={`px-2 py-0.5 text-[11px] rounded transition-colors ${
              activeTab === "micro"
                ? "bg-[#171f30] text-white font-semibold"
                : "text-slate-500 hover:text-slate-300"
            }`}
          >
            Order Book
          </button>
          <button
            onClick={() => setActiveTab("news")}
            className={`px-2 py-0.5 text-[11px] rounded transition-colors ${
              activeTab === "news"
                ? "bg-[#171f30] text-white font-semibold"
                : "text-slate-500 hover:text-slate-300"
            }`}
          >
            News & Macro
          </button>
          <button
            onClick={() => setActiveTab("risk")}
            className={`px-2 py-0.5 text-[11px] rounded transition-colors ${
              activeTab === "risk"
                ? "bg-[#171f30] text-white font-semibold"
                : "text-slate-500 hover:text-slate-300"
            }`}
          >
            Risk Guardrail
          </button>
        </div>

        {/* Tab Contents */}
        <div className="text-[11px] text-slate-300 leading-relaxed min-h-[48px]">
          {activeTab === "confluence" && (
            <ul className="space-y-1">
              {decision.reasons.map((r, i) => (
                <li key={i} className="flex items-start gap-1.5">
                  <span className="text-blue-400 font-bold">▹</span>
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          )}
          {activeTab === "micro" && <p>{decision.microstructure_view}</p>}
          {activeTab === "news" && <p>{decision.news_view}</p>}
          {activeTab === "risk" && <p>{decision.risk_view}</p>}
        </div>
      </div>
    </div>
  );
};

function formatPrice(val: number): string {
  if (val >= 1000) return val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (val >= 1) return val.toFixed(4);
  return val.toFixed(6);
}
