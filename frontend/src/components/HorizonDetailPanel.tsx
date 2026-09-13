"use client";

import React, { useState } from "react";
import { HorizonPrediction } from "../types/market";
import {
  Clock,
  TrendingUp,
  TrendingDown,
  Compass,
  ShieldAlert,
  Target,
  Zap,
  Layers,
  Activity,
  Database,
  Link2,
  ChevronRight,
  ArrowRight,
  Sparkles,
  BarChart3,
  X
} from "lucide-react";

interface HorizonDetailPanelProps {
  prediction: HorizonPrediction;
  allPredictions?: HorizonPrediction[];
  onSelectHorizon?: (horizon: string) => void;
  onClose?: () => void;
}

export const HorizonDetailPanel: React.FC<HorizonDetailPanelProps> = ({
  prediction,
  allPredictions = [],
  onSelectHorizon,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<"strategy" | "reasons" | "offchain" | "onchain" | "chart">("strategy");

  const isUp = prediction.expected_change_pct >= 0;
  const isBull = prediction.bias === "BULLISH";
  const isBear = prediction.bias === "BEARISH";

  const strat = prediction.trading_strategy;
  const offChain = prediction.off_chain_data;
  const onChain = prediction.on_chain_data;
  const chart = prediction.chart_analysis;
  const reasons = prediction.reasons || [];

  return (
    <div className="flex flex-col gap-2.5 bg-[#090d16] border border-cyan-500/40 rounded-lg p-3 shadow-xl font-mono text-xs">
      {/* Top Header: Timeframe Pills & Close */}
      <div className="flex items-center justify-between gap-1 pb-2 border-b border-slate-800/80">
        <div className="flex items-center gap-1 overflow-x-auto custom-scrollbar py-0.5 max-w-[85%]">
          {allPredictions.map((h) => {
            const isCurrent = h.horizon === prediction.horizon;
            const hUp = h.expected_change_pct >= 0;
            return (
              <button
                key={h.horizon}
                onClick={() => onSelectHorizon?.(h.horizon)}
                className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 transition-all ${
                  isCurrent
                    ? "bg-cyan-600 text-white shadow-sm shadow-cyan-500/40 border border-cyan-400/50"
                    : "bg-[#131a29] text-slate-400 hover:text-slate-200 border border-slate-800"
                }`}
              >
                {h.horizon}
                <span className={`ml-1 text-[9px] ${hUp ? "text-emerald-400" : "text-rose-400"}`}>
                  {hUp ? "+" : ""}{h.expected_change_pct.toFixed(1)}%
                </span>
              </button>
            );
          })}
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="p-1 rounded bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
            title="Back to Horizon Matrix"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Hero Prediction Banner */}
      <div className="p-2.5 rounded-md bg-[#0e1422] border border-slate-800 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-cyan-950 text-cyan-300 border border-cyan-800/50 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {prediction.horizon_label} Horizon
            </span>
            <span className="text-[10px] text-slate-400">
              Target: <strong className="text-slate-200">{prediction.target_time_str}</strong>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`px-2 py-0.5 text-[10px] font-extrabold rounded ${
                isBull
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                  : isBear
                  ? "bg-rose-500/20 text-rose-400 border border-rose-500/40"
                  : "bg-slate-700/40 text-slate-300 border border-slate-600/40"
              }`}
            >
              {prediction.bias}
            </span>
            <span className="text-[10px] text-cyan-400 font-bold bg-cyan-950/60 px-1.5 py-0.5 rounded border border-cyan-800/40">
              {prediction.confidence}% Confidence
            </span>
          </div>
        </div>

        {/* Big Price & Range */}
        <div className="flex items-baseline justify-between border-t border-slate-800/60 pt-2">
          <div>
            <div className="text-[10px] text-slate-500 uppercase tracking-wider">Target Price</div>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-extrabold text-white tracking-tight">
                ${formatPrice(prediction.predicted_price)}
              </span>
              <span className={`text-xs font-bold flex items-center gap-0.5 ${isUp ? "text-emerald-400" : "text-rose-400"}`}>
                {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {isUp ? "+" : ""}{prediction.expected_change_pct.toFixed(2)}%
              </span>
            </div>
          </div>

          <div className="text-right">
            <div className="text-[10px] text-slate-500 uppercase tracking-wider">Volatility Risk Bounds</div>
            <div className="text-slate-300 text-[11px] font-bold">
              ${formatPrice(prediction.lower_bound)} <span className="text-slate-500">—</span> ${formatPrice(prediction.upper_bound)}
            </div>
          </div>
        </div>

        {/* Primary Driver */}
        <div className="bg-[#090d16] p-1.5 rounded border border-slate-800/80 text-[10px] text-slate-400 flex items-center gap-1.5">
          <Sparkles className="w-3 h-3 text-cyan-400 shrink-0" />
          <span className="truncate">
            Primary Driver: <strong className="text-slate-200">{prediction.primary_driver}</strong>
          </span>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex border-b border-slate-800 gap-1 text-[11px] font-semibold">
        <button
          onClick={() => setActiveTab("strategy")}
          className={`pb-1.5 px-2 flex items-center gap-1 transition-colors border-b-2 ${
            activeTab === "strategy"
              ? "border-cyan-400 text-cyan-400"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Zap className="w-3 h-3" />
          Trading Strategy
        </button>

        <button
          onClick={() => setActiveTab("reasons")}
          className={`pb-1.5 px-2 flex items-center gap-1 transition-colors border-b-2 ${
            activeTab === "reasons"
              ? "border-cyan-400 text-cyan-400"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Compass className="w-3 h-3" />
          Reasons ({reasons.length})
        </button>

        <button
          onClick={() => setActiveTab("offchain")}
          className={`pb-1.5 px-2 flex items-center gap-1 transition-colors border-b-2 ${
            activeTab === "offchain"
              ? "border-cyan-400 text-cyan-400"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Database className="w-3 h-3" />
          Off-Chain Data
        </button>

        <button
          onClick={() => setActiveTab("onchain")}
          className={`pb-1.5 px-2 flex items-center gap-1 transition-colors border-b-2 ${
            activeTab === "onchain"
              ? "border-cyan-400 text-cyan-400"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Link2 className="w-3 h-3" />
          On-Chain (DefiLlama)
        </button>

        <button
          onClick={() => setActiveTab("chart")}
          className={`pb-1.5 px-2 flex items-center gap-1 transition-colors border-b-2 ${
            activeTab === "chart"
              ? "border-cyan-400 text-cyan-400"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <BarChart3 className="w-3 h-3" />
          Chart Analysis
        </button>
      </div>

      {/* Tab Content Display */}
      <div className="min-h-[160px]">
        {/* 1. TRADING STRATEGY TAB */}
        {activeTab === "strategy" && strat && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between bg-[#111827] p-2 rounded border border-slate-800">
              <div>
                <div className="text-[10px] text-slate-500 uppercase">Strategy Blueprint</div>
                <div className="text-white font-bold text-xs flex items-center gap-1.5">
                  <span>{strat.strategy_name}</span>
                  <span className="px-1.5 py-0.2 rounded text-[9px] bg-cyan-950 text-cyan-300 border border-cyan-800">
                    {strat.strategy_type}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-500 uppercase block">Action</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                  strat.recommended_action.includes("BUY") || strat.recommended_action === "LONG"
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                    : strat.recommended_action.includes("SELL") || strat.recommended_action === "SHORT"
                    ? "bg-rose-500/20 text-rose-400 border border-rose-500/40"
                    : "bg-slate-700/30 text-slate-300"
                }`}>
                  {strat.recommended_action}
                </span>
              </div>
            </div>

            {/* Levels Matrix */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-[10px]">
              <div className="bg-[#0d131f] p-2 rounded border border-slate-800">
                <span className="text-slate-500 block">Optimal Entry</span>
                <span className="text-white font-bold">
                  ${formatPrice(strat.entry_zone[0])} - ${formatPrice(strat.entry_zone[1])}
                </span>
              </div>

              <div className="bg-[#0d131f] p-2 rounded border border-slate-800">
                <span className="text-slate-500 block">Stop Loss</span>
                <span className="text-rose-400 font-bold">${formatPrice(strat.stop_loss)}</span>
              </div>

              <div className="bg-[#0d131f] p-2 rounded border border-slate-800">
                <span className="text-slate-500 block">Take Profit 1</span>
                <span className="text-emerald-400 font-bold">${formatPrice(strat.take_profit_1)}</span>
              </div>

              <div className="bg-[#0d131f] p-2 rounded border border-slate-800">
                <span className="text-slate-500 block">Risk/Reward</span>
                <span className="text-cyan-400 font-bold">1 : {strat.risk_reward_ratio}</span>
              </div>
            </div>

            {/* Execution Playbook */}
            <div className="bg-[#090d15] p-2 rounded border border-slate-800/80 text-[10px] text-slate-300">
              <strong className="text-cyan-400 font-mono">Tactical Playbook: </strong>
              <span className="font-sans text-slate-300">{strat.execution_notes}</span>
            </div>
          </div>
        )}

        {/* 2. REASONS TAB */}
        {activeTab === "reasons" && (
          <div className="flex flex-col gap-1.5">
            {reasons.length > 0 ? (
              reasons.map((r, idx) => (
                <div key={idx} className="flex items-start gap-2 p-2 rounded bg-[#0d131f] border border-slate-800/80 text-[11px]">
                  <ChevronRight className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                  <span className="font-sans text-slate-200 leading-snug">{r}</span>
                </div>
              ))
            ) : (
              <p className="text-slate-500 p-3 text-center">No specific reasons formulated.</p>
            )}
          </div>
        )}

        {/* 3. OFF-CHAIN DATA TAB */}
        {activeTab === "offchain" && offChain && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <div className="bg-[#0d131f] p-2 rounded border border-slate-800">
              <span className="text-slate-500 text-[10px] block">Order Book Imbalance</span>
              <span className={`font-bold text-xs ${offChain.order_book_imbalance >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                {offChain.order_book_imbalance >= 0 ? "+" : ""}{(offChain.order_book_imbalance * 100).toFixed(1)}%
              </span>
              <span className="text-[9px] text-slate-500 block mt-0.5">{offChain.order_flow_signal}</span>
            </div>

            <div className="bg-[#0d131f] p-2 rounded border border-slate-800">
              <span className="text-slate-500 text-[10px] block">Cumul. Volume Delta (CVD)</span>
              <span className={`font-bold text-xs ${offChain.cvd >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                {offChain.cvd >= 0 ? "+" : ""}{offChain.cvd.toFixed(2)}
              </span>
              <span className="text-[9px] text-slate-500 block mt-0.5">{offChain.cvd_side}</span>
            </div>

            <div className="bg-[#0d131f] p-2 rounded border border-slate-800">
              <span className="text-slate-500 text-[10px] block">Perpetual Funding Rate</span>
              <span className={`font-bold text-xs ${offChain.funding_rate_pct >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                {offChain.funding_rate_pct >= 0 ? "+" : ""}{offChain.funding_rate_pct.toFixed(4)}%
              </span>
              <span className="text-[9px] text-slate-500 block mt-0.5">{offChain.funding_bias.replace("_", " ")}</span>
            </div>

            <div className="bg-[#0d131f] p-2 rounded border border-slate-800">
              <span className="text-slate-500 text-[10px] block">Open Interest (Futures)</span>
              <span className="font-bold text-xs text-white">
                ${formatCompact(offChain.open_interest_usd)}
              </span>
            </div>

            <div className="bg-[#0d131f] p-2 rounded border border-slate-800">
              <span className="text-slate-500 text-[10px] block">Bid / Ask Depth (USD)</span>
              <span className="font-bold text-xs text-slate-200">
                ${formatCompact(offChain.bid_depth_usd)} / ${formatCompact(offChain.ask_depth_usd)}
              </span>
            </div>

            <div className="bg-[#0d131f] p-2 rounded border border-slate-800">
              <span className="text-slate-500 text-[10px] block">Whale Trades / Spread</span>
              <span className="font-bold text-xs text-slate-200">
                {offChain.whale_trades} detected ({offChain.spread_bps.toFixed(1)} bps)
              </span>
            </div>
          </div>
        )}

        {/* 4. ON-CHAIN DATA TAB */}
        {activeTab === "onchain" && onChain && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <div className="bg-[#0d131f] p-2 rounded border border-slate-800">
              <span className="text-slate-500 text-[10px] block">Total Stablecoin MCAP</span>
              <span className="font-bold text-xs text-white">
                ${formatCompact(onChain.total_stablecoin_mcap_usd)}
              </span>
              <span className="text-[9px] text-slate-400 block mt-0.5">USDT: {onChain.stablecoin_dominance_pct.toFixed(1)}%</span>
            </div>

            <div className="bg-[#0d131f] p-2 rounded border border-slate-800">
              <span className="text-slate-500 text-[10px] block">30D Stablecoin Net Flow</span>
              <span className={`font-bold text-xs ${onChain.stablecoin_30d_change_usd >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                {onChain.stablecoin_30d_change_usd >= 0 ? "+" : ""}${formatCompact(Math.abs(onChain.stablecoin_30d_change_usd))}
              </span>
              <span className="text-[9px] text-cyan-400 block mt-0.5 font-bold">
                {onChain.stablecoin_flow_signal.replace(/_/g, " ")} ({onChain.stablecoin_30d_change_pct >= 0 ? "+" : ""}{onChain.stablecoin_30d_change_pct.toFixed(1)}%)
              </span>
            </div>

            <div className="bg-[#0d131f] p-2 rounded border border-slate-800">
              <span className="text-slate-500 text-[10px] block">Total DeFi TVL</span>
              <span className="font-bold text-xs text-white">
                ${formatCompact(onChain.total_defi_tvl_usd)}
              </span>
              <span className={`text-[9px] block mt-0.5 font-bold ${onChain.tvl_24h_change_pct >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                {onChain.tvl_signal} ({onChain.tvl_24h_change_pct >= 0 ? "+" : ""}{onChain.tvl_24h_change_pct.toFixed(1)}% 24h)
              </span>
            </div>

            <div className="bg-[#0d131f] p-2 rounded border border-slate-800">
              <span className="text-slate-500 text-[10px] block">Ethereum TVL</span>
              <span className="font-bold text-xs text-slate-200">
                ${formatCompact(onChain.ethereum_tvl_usd)}
              </span>
            </div>

            <div className="bg-[#0d131f] p-2 rounded border border-slate-800">
              <span className="text-slate-500 text-[10px] block">Solana TVL</span>
              <span className="font-bold text-xs text-slate-200">
                ${formatCompact(onChain.solana_tvl_usd)}
              </span>
            </div>

            <div className="bg-[#0d131f] p-2 rounded border border-slate-800">
              <span className="text-slate-500 text-[10px] block">Data Source</span>
              <span className="font-bold text-xs text-emerald-400">DefiLlama Protocol API</span>
              <span className="text-[9px] text-slate-500 block mt-0.5">100% Free Public Feed</span>
            </div>
          </div>
        )}

        {/* 5. CHART ANALYSIS TAB */}
        {activeTab === "chart" && chart && (
          <div className="flex flex-col gap-2">
            <div className="bg-[#0d131f] p-2 rounded border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-slate-500 text-[10px] block">Pattern Architecture</span>
                <span className="text-white font-bold text-xs">{chart.pattern_detected}</span>
              </div>
              <span className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                chart.timeframe_trend === "BULLISH"
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                  : chart.timeframe_trend === "BEARISH"
                  ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                  : "bg-slate-700/30 text-slate-300"
              }`}>
                {chart.timeframe_trend} TREND
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-[10px]">
              <div className="bg-[#0d131f] p-2 rounded border border-slate-800">
                <span className="text-slate-500 block">RSI Condition</span>
                <span className="font-bold text-white">
                  {chart.rsi ?? 50.0} ({chart.rsi_condition})
                </span>
              </div>

              <div className="bg-[#0d131f] p-2 rounded border border-slate-800">
                <span className="text-slate-500 block">MACD Momentum</span>
                <span className={`font-bold ${chart.macd_momentum.includes("BULLISH") ? "text-emerald-400" : (chart.macd_momentum.includes("BEARISH") ? "text-rose-400" : "text-slate-300")}`}>
                  {chart.macd_momentum.replace("_", " ")}
                </span>
              </div>

              <div className="bg-[#0d131f] p-2 rounded border border-slate-800">
                <span className="text-slate-500 block">VWAP Deviation</span>
                <span className={`font-bold ${chart.vwap_deviation_pct >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                  {chart.vwap_deviation_pct >= 0 ? "+" : ""}{chart.vwap_deviation_pct}% (${formatPrice(chart.vwap)})
                </span>
              </div>

              <div className="bg-[#0d131f] p-2 rounded border border-slate-800">
                <span className="text-slate-500 block">Key Support / Resistance</span>
                <span className="font-bold text-slate-200">
                  ${formatPrice(chart.key_support)} / ${formatPrice(chart.key_resistance)}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

function formatPrice(val: number): string {
  if (!val) return "0.00";
  if (val >= 1000) return val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (val >= 1) return val.toFixed(4);
  return val.toFixed(6);
}

function formatCompact(val: number): string {
  if (!val) return "0";
  if (val >= 1_000_000_000) return (val / 1_000_000_000).toFixed(2) + "B";
  if (val >= 1_000_000) return (val / 1_000_000).toFixed(2) + "M";
  if (val >= 1_000) return (val / 1_000).toFixed(1) + "K";
  return val.toFixed(2);
}
