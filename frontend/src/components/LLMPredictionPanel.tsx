"use client";

import React, { useState } from "react";
import {
  LLMPredictionResult,
  LLMHorizonPrediction,
} from "@/types/market";
import {
  Brain,
  Sparkles,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronDown,
  ChevronUp,
  ShieldAlert,
  Zap,
  Clock,
  Layers,
  Activity,
  CheckCircle2,
} from "lucide-react";

interface LLMPredictionPanelProps {
  symbol: string;
  prediction: LLMPredictionResult | null;
  isLoading: boolean;
  onRefresh: () => void;
}

export const LLMPredictionPanel: React.FC<LLMPredictionPanelProps> = ({
  symbol,
  prediction,
  isLoading,
  onRefresh,
}) => {
  const [showTelemetry, setShowTelemetry] = useState(false);
  const [selectedHorizon, setSelectedHorizon] = useState<string>("1h");

  const getBiasStyle = (bias: string) => {
    switch (bias) {
      case "BULLISH":
        return "bg-emerald-500/15 border-emerald-500/40 text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.15)]";
      case "BEARISH":
        return "bg-rose-500/15 border-rose-500/40 text-rose-400 shadow-[0_0_12px_rgba(244,63,94,0.15)]";
      default:
        return "bg-amber-500/15 border-amber-500/40 text-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.15)]";
    }
  };

  const getActionBadge = (action: string) => {
    switch (action?.toUpperCase()) {
      case "BUY":
      case "STRONG_BUY":
        return "bg-emerald-500/20 text-emerald-300 border-emerald-500/40";
      case "SELL":
      case "STRONG_SELL":
        return "bg-rose-500/20 text-rose-300 border-rose-500/40";
      case "HOLD":
        return "bg-blue-500/20 text-blue-300 border-blue-500/40";
      default:
        return "bg-amber-500/20 text-amber-300 border-amber-500/40";
    }
  };

  const getRiskBadge = (risk: string) => {
    switch (risk?.toUpperCase()) {
      case "LOW":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
      case "MEDIUM":
        return "bg-amber-500/10 text-amber-400 border-amber-500/30";
      case "HIGH":
        return "bg-orange-500/10 text-orange-400 border-orange-500/30";
      case "EXTREME":
        return "bg-purple-500/15 text-purple-300 border-purple-500/40 animate-pulse";
      default:
        return "bg-slate-800 text-slate-400 border-slate-700";
    }
  };

  const getDirectionIcon = (dir: string) => {
    if (dir === "BULLISH") return <TrendingUp className="w-4 h-4 text-emerald-400" />;
    if (dir === "BEARISH") return <TrendingDown className="w-4 h-4 text-rose-400" />;
    return <Minus className="w-4 h-4 text-amber-400" />;
  };

  return (
    <div className="bg-[#0c101d] border border-slate-800/90 rounded-lg p-3.5 shadow-xl flex flex-col gap-3 font-sans">
      {/* Panel Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-gradient-to-tr from-cyan-600/30 via-purple-600/30 to-blue-600/30 border border-cyan-500/30">
            <Brain className="w-4 h-4 text-cyan-400 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold tracking-wider text-slate-100 uppercase font-mono">
                AI Cognitive Predictions
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5 text-cyan-400" />
                Gemini 3.7 Flash
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-mono">
              Multi-horizon synthesis • 30m, 1h, 4h, 1d price targets & reasoning
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {prediction && (
            <span className="text-[10px] font-mono text-slate-500 hidden sm:inline">
              {prediction.generation_time_ms}ms • {prediction.timestamp?.split(" ")[1] || "Live"}
            </span>
          )}
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono font-medium rounded bg-slate-800/80 hover:bg-slate-700/80 text-cyan-400 hover:text-cyan-300 border border-slate-700 transition disabled:opacity-50"
            title="Generate fresh AI predictions"
          >
            <RefreshCw className={`w-3 h-3 ${isLoading ? "animate-spin text-cyan-400" : ""}`} />
            <span>{isLoading ? "Analyzing..." : "Refresh"}</span>
          </button>
        </div>
      </div>

      {/* Loading Skeleton */}
      {isLoading && !prediction && (
        <div className="flex flex-col gap-3 py-6 items-center justify-center text-center">
          <Brain className="w-8 h-8 text-cyan-400 animate-bounce" />
          <div className="text-xs font-mono text-slate-300">
            Synthesizing Microstructure, On-Chain Flows & Macro Narrative with Gemini 3.7 Flash...
          </div>
          <div className="w-48 h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div className="w-2/3 h-full bg-cyan-500 animate-pulse rounded-full" />
          </div>
        </div>
      )}

      {/* Main Content */}
      {prediction && (
        <>
          {/* Executive Market Summary Banner */}
          <div className="bg-[#090d18] border border-slate-800/90 rounded-lg p-2.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div
                className={`px-2.5 py-1 rounded border text-xs font-black font-mono tracking-wider ${getBiasStyle(
                  prediction.overall_bias
                )}`}
              >
                {prediction.overall_bias}
              </div>
              <div>
                <div className="text-[11px] text-slate-400 font-mono flex items-center gap-1.5">
                  <span>Confidence:</span>
                  <span className="font-bold text-slate-200">{prediction.overall_confidence}%</span>
                  <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden inline-block ml-1">
                    <div
                      className={`h-full rounded-full ${
                        prediction.overall_bias === "BULLISH"
                          ? "bg-emerald-400"
                          : prediction.overall_bias === "BEARISH"
                          ? "bg-rose-400"
                          : "bg-amber-400"
                      }`}
                      style={{ width: `${prediction.overall_confidence}%` }}
                    />
                  </div>
                </div>
                <div className="text-xs text-slate-300 font-sans mt-0.5 line-clamp-2">
                  {prediction.market_summary}
                </div>
              </div>
            </div>

            <div className="text-right shrink-0">
              <div className="text-[10px] text-slate-500 font-mono uppercase">Current Reference</div>
              <div className="text-sm font-bold font-mono text-white">
                ${prediction.current_price?.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </div>
            </div>
          </div>

          {/* 4 Horizon Predictions Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {prediction.predictions.map((p) => {
              const isSelected = selectedHorizon === p.horizon;
              return (
                <div
                  key={p.horizon}
                  onClick={() => setSelectedHorizon(p.horizon)}
                  className={`cursor-pointer rounded-lg border transition-all p-3 flex flex-col justify-between gap-2.5 ${
                    isSelected
                      ? "bg-[#0f172a] border-cyan-500/60 shadow-[0_0_15px_rgba(6,182,212,0.15)]"
                      : "bg-[#090d18] border-slate-800/80 hover:border-slate-700 hover:bg-[#0c1222]"
                  }`}
                >
                  {/* Horizon Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3 h-3 text-cyan-400" />
                      <span className="text-xs font-bold font-mono text-slate-200">
                        {p.horizon_label}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      {getDirectionIcon(p.direction)}
                      <span
                        className={`text-[10px] font-bold font-mono ${
                          p.direction === "BULLISH"
                            ? "text-emerald-400"
                            : p.direction === "BEARISH"
                            ? "text-rose-400"
                            : "text-amber-400"
                        }`}
                      >
                        {p.direction}
                      </span>
                    </div>
                  </div>

                  {/* Target Price & Expected Change */}
                  <div>
                    <div className="flex items-baseline justify-between">
                      <span className="text-base font-extrabold font-mono text-white tracking-tight">
                        ${p.predicted_price?.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </span>
                      <span
                        className={`text-xs font-bold font-mono ${
                          p.expected_change_pct >= 0 ? "text-emerald-400" : "text-rose-400"
                        }`}
                      >
                        {p.expected_change_pct >= 0 ? "+" : ""}
                        {p.expected_change_pct?.toFixed(2)}%
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                      Range: ${p.price_range_low?.toLocaleString()} - ${p.price_range_high?.toLocaleString()}
                    </div>
                  </div>

                  {/* Action & Risk Badges */}
                  <div className="flex items-center justify-between pt-1 border-t border-slate-800/60 text-[10px] font-mono">
                    <span className={`px-1.5 py-0.5 rounded border font-bold ${getActionBadge(p.recommended_action)}`}>
                      {p.recommended_action}
                    </span>
                    <span className={`px-1.5 py-0.5 rounded border ${getRiskBadge(p.risk_level)}`}>
                      {p.risk_level} RISK
                    </span>
                    <span className="text-slate-400">{p.confidence}% CONF</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Selected Horizon Deep Rationale & Catalysts Card */}
          {(() => {
            const activePred =
              prediction.predictions.find((x) => x.horizon === selectedHorizon) ||
              prediction.predictions[0];
            if (!activePred) return null;

            return (
              <div className="bg-[#090d18] border border-slate-800/90 rounded-lg p-3 flex flex-col gap-2">
                <div className="flex items-center justify-between border-b border-slate-800/60 pb-1.5">
                  <div className="flex items-center gap-2">
                    <Zap className="w-3.5 h-3.5 text-cyan-400" />
                    <span className="text-xs font-bold font-mono text-cyan-300">
                      {activePred.horizon_label} Horizon Intelligence
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      Target: ${activePred.predicted_price?.toLocaleString("en-US", { minimumFractionDigits: 2 })} ({activePred.expected_change_pct >= 0 ? "+" : ""}{activePred.expected_change_pct}%)
                    </span>
                  </div>
                  <div className="text-[10px] font-mono text-slate-500">
                    Engine: {prediction.model_used.includes("Gemini") ? "Gemini 3.7 Flash" : "Deterministic Quant"}
                  </div>
                </div>

                {/* Natural Language Rationale */}
                <p className="text-xs text-slate-200 leading-relaxed font-sans">
                  {activePred.reasoning}
                </p>

                {/* Key Catalyst Factors */}
                {activePred.key_factors && activePred.key_factors.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">
                      Key Drivers:
                    </span>
                    {activePred.key_factors.map((factor, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800/80 border border-slate-700/60 text-slate-300 flex items-center gap-1"
                      >
                        <CheckCircle2 className="w-2.5 h-2.5 text-cyan-400" />
                        {factor}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}

          {/* Context Telemetry Inspection Drawer Toggle */}
          {prediction.context_used && (
            <div className="border border-slate-800/70 rounded-lg bg-[#080d1a] overflow-hidden text-[11px] font-mono">
              <button
                onClick={() => setShowTelemetry(!showTelemetry)}
                className="w-full px-3 py-1.5 flex items-center justify-between text-slate-400 hover:text-slate-200 hover:bg-slate-800/30 transition"
              >
                <div className="flex items-center gap-1.5">
                  <Activity className="w-3 h-3 text-cyan-400" />
                  <span>Telemetry Data Fed into AI Reasoning Engine</span>
                </div>
                <div className="flex items-center gap-1 text-[10px] text-slate-500">
                  <span>{showTelemetry ? "Hide telemetry" : "Inspect inputs"}</span>
                  {showTelemetry ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </div>
              </button>

              {showTelemetry && (
                <div className="p-3 border-t border-slate-800/60 grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#060a14] text-slate-300">
                  <div>
                    <span className="text-[10px] text-slate-500 block uppercase">Microstructure</span>
                    <div>OBI: {prediction.context_used.microstructure?.imbalance}</div>
                    <div>CVD: {prediction.context_used.microstructure?.cvd_side}</div>
                    <div>Spread: {prediction.context_used.microstructure?.spread_bps} bps</div>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block uppercase">Technicals</span>
                    <div>RSI: {prediction.context_used.technical?.rsi}</div>
                    <div>Trend: {prediction.context_used.technical?.trend_state}</div>
                    <div>VWAP: ${prediction.context_used.technical?.vwap}</div>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block uppercase">Derivatives</span>
                    <div>Funding: {prediction.context_used.derivatives?.funding_rate_annualized_pct}% ann.</div>
                    <div>Bias: {prediction.context_used.derivatives?.funding_bias}</div>
                    <div>Leverage: {prediction.context_used.derivatives?.leverage_signal}</div>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block uppercase">On-Chain & Sentiment</span>
                    <div>Flows: {prediction.context_used.onchain?.stablecoin_flow_signal}</div>
                    <div>News: {prediction.context_used.sentiment?.label}</div>
                    <div>Score: {prediction.context_used.sentiment?.score}</div>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};
