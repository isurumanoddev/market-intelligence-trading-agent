"use client";

import React, { useState } from "react";
import { HorizonPrediction, PriceForecastResult } from "../types/market";
import { Clock } from "lucide-react";

interface MultiHorizonMatrixProps {
  forecast: PriceForecastResult | null;
  onSelectHorizon?: (horizon: string) => void;
  selectedHorizon?: string | null;
}

export const MultiHorizonMatrix: React.FC<MultiHorizonMatrixProps> = ({
  forecast,
  onSelectHorizon,
  selectedHorizon,
}) => {
  const [filter, setFilter] = useState<"ALL" | "MICRO" | "INTRADAY" | "MACRO">("ALL");

  if (!forecast || !forecast.multi_horizon_predictions || forecast.multi_horizon_predictions.length === 0) {
    return (
      <div className="p-3 bg-[#0a0e17] rounded border border-slate-800/80 text-center font-mono text-xs text-slate-500">
        Multi-horizon neural sequence models initializing...
      </div>
    );
  }

  const allHorizons = forecast.multi_horizon_predictions;

  const filteredHorizons = allHorizons.filter((h) => {
    if (filter === "MICRO") return ["1m", "5m", "10m", "30m"].includes(h.horizon);
    if (filter === "INTRADAY") return ["1h", "4h", "1d"].includes(h.horizon);
    if (filter === "MACRO") return ["7d", "30d"].includes(h.horizon);
    return true;
  });

  return (
    <div className="flex flex-col gap-2 font-mono text-xs">
      {/* Top Filter Buttons */}
      <div className="flex items-center justify-between gap-1 border-b border-slate-800/80 pb-1.5">
        <div className="flex gap-1 flex-wrap">
          <button
            onClick={() => setFilter("ALL")}
            className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-all ${
              filter === "ALL"
                ? "bg-cyan-600 text-white shadow-sm shadow-cyan-500/30"
                : "bg-[#151c2c] text-slate-400 hover:text-slate-200"
            }`}
          >
            ALL (9)
          </button>
          <button
            onClick={() => setFilter("MICRO")}
            className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-all ${
              filter === "MICRO"
                ? "bg-cyan-600 text-white shadow-sm shadow-cyan-500/30"
                : "bg-[#151c2c] text-slate-400 hover:text-slate-200"
            }`}
          >
            ⚡ Micro (1m-30m)
          </button>
          <button
            onClick={() => setFilter("INTRADAY")}
            className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-all ${
              filter === "INTRADAY"
                ? "bg-cyan-600 text-white shadow-sm shadow-cyan-500/30"
                : "bg-[#151c2c] text-slate-400 hover:text-slate-200"
            }`}
          >
            ⏱️ Intraday (1h-1d)
          </button>
          <button
            onClick={() => setFilter("MACRO")}
            className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-all ${
              filter === "MACRO"
                ? "bg-cyan-600 text-white shadow-sm shadow-cyan-500/30"
                : "bg-[#151c2c] text-slate-400 hover:text-slate-200"
            }`}
          >
            🌐 Macro (7d-30d)
          </button>
        </div>
        <span className="text-[10px] text-cyan-400 font-bold bg-cyan-950/60 px-1.5 py-0.5 rounded border border-cyan-800/40 shrink-0">
          {forecast.confidence_score}% Conf
        </span>
      </div>

      {/* Grid of Horizon Predictions */}
      <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-0.5 custom-scrollbar">
        {filteredHorizons.map((hp) => {
          const isUp = hp.expected_change_pct >= 0;
          const isBull = hp.bias === "BULLISH";
          const isBear = hp.bias === "BEARISH";
          const isSelected = selectedHorizon === hp.horizon;

          return (
            <div
              key={hp.horizon}
              onClick={() => onSelectHorizon?.(hp.horizon)}
              className={`p-2 rounded border transition-all cursor-pointer ${
                isSelected
                  ? "bg-cyan-950/40 border-cyan-500/70 shadow-md shadow-cyan-500/20"
                  : "bg-[#0c101a] border-slate-800/80 hover:border-slate-700 hover:bg-[#111726]"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-cyan-300">
                    {hp.horizon_label}
                  </span>
                  <span className="text-[10px] text-slate-500 flex items-center gap-0.5">
                    <Clock className="w-2.5 h-2.5" />
                    {hp.target_time_str}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`px-1.5 py-0.2 text-[9px] font-extrabold rounded ${
                      isBull
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                        : isBear
                        ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                        : "bg-slate-700/40 text-slate-300"
                    }`}
                  >
                    {hp.bias}
                  </span>
                  <span className="text-white font-bold text-xs">
                    ${formatPrice(hp.predicted_price)}
                  </span>
                  <span
                    className={`text-[10px] font-bold flex items-center ${
                      isUp ? "text-emerald-400" : "text-rose-400"
                    }`}
                  >
                    {isUp ? "+" : ""}
                    {hp.expected_change_pct.toFixed(2)}%
                  </span>
                </div>
              </div>

              {/* Range & Driver */}
              <div className="mt-1 flex items-center justify-between text-[9px] text-slate-400 border-t border-slate-800/50 pt-1">
                <span className="truncate max-w-[210px] text-slate-400 font-sans" title={hp.primary_driver}>
                  ▹ <strong className="text-slate-300 font-mono">{hp.primary_driver}</strong>
                </span>
                <span className="text-[9px] text-slate-500 font-mono shrink-0">
                  [${formatPrice(hp.lower_bound)} - ${formatPrice(hp.upper_bound)}]
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

function formatPrice(val: number): string {
  if (val >= 1000) return val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (val >= 1) return val.toFixed(4);
  return val.toFixed(6);
}
