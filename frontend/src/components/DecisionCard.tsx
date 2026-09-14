"use client";

import React, { useState } from "react";
import { TradingDecision } from "@/types/market";
import { Zap, ShieldCheck } from "lucide-react";
import { MultiHorizonMatrix } from "./MultiHorizonMatrix";
import { HorizonDetailPanel } from "./HorizonDetailPanel";

interface DecisionCardProps {
  decision: TradingDecision | null;
  onExecuteTrade: () => void;
  onOpenTradeModal?: (params?: { side?: "BUY" | "SELL"; entry?: number; sl?: number; tp?: number; leverage?: number }) => void;
  isExecuting: boolean;
}

export const DecisionCard: React.FC<DecisionCardProps> = ({
  decision,
  onExecuteTrade,
  onOpenTradeModal,
  isExecuting,
}) => {
  const [activeTab, setActiveTab] = useState<"confluence" | "macro" | "forecast" | "micro" | "news" | "risk">("confluence");
  const [selectedHorizon, setSelectedHorizon] = useState<string>("5m");
  const [forecastViewMode, setForecastViewMode] = useState<"matrix" | "detail">("matrix");

  if (!decision) {
    return (
      <div className="bg-[#0e1424] border border-slate-800/90 rounded-lg p-4 shadow-xl flex flex-col gap-3 font-mono">
        <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold border-b border-slate-800/80 pb-2">
          <span className="flex items-center gap-1.5 text-cyan-400">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            AI MASTER TRADING ARBITER
          </span>
          <span className="text-slate-500">QUANT-SYNTHESIS</span>
        </div>
        <div className="flex items-center gap-4 py-2">
          <div className="h-8 w-28 bg-slate-800/70 rounded-md animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="flex justify-between">
              <div className="h-3 w-20 bg-slate-800/60 rounded animate-pulse" />
              <div className="h-3 w-10 bg-slate-800/60 rounded animate-pulse" />
            </div>
            <div className="h-2 w-full bg-slate-800/80 rounded-full animate-pulse" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 py-1">
          <div className="h-10 bg-slate-800/50 rounded animate-pulse" />
          <div className="h-10 bg-slate-800/50 rounded animate-pulse" />
          <div className="h-10 bg-slate-800/50 rounded animate-pulse" />
        </div>
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
  const monthly = decision.monthly_context;

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
        onClick={() => {
          if (onOpenTradeModal && decision) {
            onOpenTradeModal({
              side: isSell ? "SELL" : "BUY",
              entry: decision.entry_zone?.[0] || decision.current_price,
              sl: decision.stop_loss,
              tp: decision.take_profit_1,
              leverage: 5,
            });
            return;
          }
          onExecuteTrade();
        }}
        disabled={isExecuting}
        className={`w-full py-2.5 px-4 rounded font-bold text-xs tracking-wider text-white flex items-center justify-center gap-2 shadow-lg transition-all ${
          isSell
            ? "bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 shadow-rose-600/30 active:scale-[0.99]"
            : "bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 shadow-emerald-600/30 active:scale-[0.99]"
        } disabled:opacity-50`}
      >
        <Zap className="w-4 h-4 fill-white" />
        <span>
          {isExecuting ? "Executing Order..." : `⚡ Execute Paper Trade (${isSell ? "SELL" : "BUY"} • Leverage / TP / SL)`}
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
            onClick={() => setActiveTab("macro")}
            className={`px-2 py-0.5 text-[11px] rounded transition-colors ${
              activeTab === "macro"
                ? "bg-[#171f30] text-white font-semibold"
                : "text-slate-500 hover:text-slate-300"
            }`}
          >
            30D Macro
          </button>
          <button
            onClick={() => setActiveTab("forecast")}
            className={`px-2 py-0.5 text-[11px] rounded transition-colors ${
              activeTab === "forecast"
                ? "bg-cyan-950/80 text-cyan-300 font-semibold border border-cyan-500/40 shadow-sm"
                : "text-slate-500 hover:text-slate-300"
            }`}
          >
            🔮 AI Forecast
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
            News & Catalysts
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

          {activeTab === "macro" && (
            <div className="flex flex-col gap-2 font-mono">
              <p className="font-sans text-slate-300">{decision.macro_view || "30-day macro history is active."}</p>
              {monthly && (
                <div className="grid grid-cols-2 gap-1.5 bg-[#0a0e17] p-2 rounded border border-slate-800 text-[10px]">
                  <div>
                    <span className="text-slate-500">Key 30D Support: </span>
                    <span className="text-emerald-400 font-bold">${formatPrice(monthly.key_monthly_support)}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Key 30D Resist.: </span>
                    <span className="text-rose-400 font-bold">${formatPrice(monthly.key_monthly_resistance)}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">30D SMA: </span>
                    <span className="text-slate-200 font-bold">${formatPrice(monthly.sma_30d)}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Volume Trend: </span>
                    <span className="text-cyan-400 font-bold">{monthly.volume_trend}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "forecast" && (
            <div className="flex flex-col gap-2 font-mono">
              {decision.price_forecast ? (
                <>
                  <div className="flex justify-between items-center text-[10px] pb-1 border-b border-slate-800/60">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setForecastViewMode("matrix")}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                          forecastViewMode === "matrix"
                            ? "bg-cyan-600 text-white shadow-sm shadow-cyan-500/30"
                            : "bg-[#151c2c] text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        All 9 Horizons
                      </button>
                      <button
                        onClick={() => setForecastViewMode("detail")}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                          forecastViewMode === "detail"
                            ? "bg-cyan-600 text-white shadow-sm shadow-cyan-500/30"
                            : "bg-[#151c2c] text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        ⏱️ {selectedHorizon.toUpperCase()} Deep-Dive
                      </button>
                    </div>

                    <span className="px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-400 font-bold shrink-0">
                      {decision.price_forecast.forecast_bias.replace("_", " ")}
                    </span>
                  </div>

                  {forecastViewMode === "matrix" ? (
                    <MultiHorizonMatrix
                      forecast={decision.price_forecast}
                      selectedHorizon={selectedHorizon}
                      onSelectHorizon={(h) => {
                        setSelectedHorizon(h);
                        setForecastViewMode("detail");
                      }}
                    />
                  ) : (
                    <HorizonDetailPanel
                      prediction={
                        decision.price_forecast.multi_horizon_predictions?.find(
                          (hp) => hp.horizon === selectedHorizon
                        ) || decision.price_forecast.multi_horizon_predictions?.[0]!
                      }
                      allPredictions={decision.price_forecast.multi_horizon_predictions || []}
                      onSelectHorizon={(h) => setSelectedHorizon(h)}
                      onClose={() => setForecastViewMode("matrix")}
                    />
                  )}

                  <p className="font-sans text-slate-300 text-[11px] leading-snug pt-1 border-t border-slate-800/80">
                    {decision.price_forecast.rationale}
                  </p>
                </>
              ) : (
                <p className="font-sans text-slate-400">Forecasting engine is generating multi-horizon trajectory...</p>
              )}
            </div>
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
