"use client";

import React, { useState, useRef } from "react";
import { Candle, TechnicalIndicators } from "@/types/market";

interface CandleChartProps {
  candles: Candle[];
  indicators: TechnicalIndicators | null;
  currentTimeframe: string;
  onChangeTimeframe: (tf: string) => void;
  exchange: string;
}

export const CandleChart: React.FC<CandleChartProps> = ({
  candles,
  indicators,
  currentTimeframe,
  onChangeTimeframe,
  exchange,
}) => {
  const [hoveredCandle, setHoveredCandle] = useState<Candle | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const TIMEFRAMES = ["5m", "15m", "1h", "1d"];

  // SVG dimensions
  const width = 480;
  const height = 280;
  const padding = { top: 20, right: 60, bottom: 40, left: 10 };
  const plotW = width - padding.left - padding.right;
  const plotH = height - padding.top - padding.bottom;

  const validCandles = candles && candles.length > 0 ? candles : [];
  const minPrice = validCandles.length ? Math.min(...validCandles.map((c) => c.low)) : 0;
  const maxPrice = validCandles.length ? Math.max(...validCandles.map((c) => c.high)) : 100;
  const priceRange = maxPrice - minPrice || 1.0;

  const getY = (price: number) => padding.top + plotH - ((price - minPrice) / priceRange) * plotH;
  const getX = (i: number) => padding.left + i * (plotW / validCandles.length) + (plotW / validCandles.length) / 2;
  const candleW = Math.max(plotW / (validCandles.length || 1) - 2.5, 2);

  return (
    <div className="bg-[#111622] border border-slate-800 rounded-md flex flex-col overflow-hidden">
      {/* Chart Header */}
      <div className="px-3.5 py-2.5 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-xs text-white">📈 Price Action & Candlesticks</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#171f30] text-slate-400 font-mono">
            {exchange}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf}
              onClick={() => onChangeTimeframe(tf)}
              className={`px-2 py-0.5 text-[10px] font-mono rounded transition-colors ${
                currentTimeframe === tf
                  ? "bg-blue-600 text-white font-semibold shadow"
                  : "bg-[#171f30] text-slate-400 hover:text-slate-200"
              }`}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      {/* SVG Chart */}
      <div ref={containerRef} className="relative p-2.5 flex-1 min-h-[280px]">
        {validCandles.length === 0 ? (
          <div className="flex items-center justify-center h-full text-slate-500 text-xs font-mono">
            Loading chart candles...
          </div>
        ) : (
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="w-full h-[280px] overflow-visible select-none"
            onMouseLeave={() => setHoveredCandle(null)}
          >
            {/* Horizontal Grid lines & price labels */}
            {[0, 1, 2, 3, 4].map((step) => {
              const p = minPrice + (priceRange / 4) * step;
              const y = getY(p);
              return (
                <g key={step}>
                  <line
                    x1={padding.left}
                    y1={y}
                    x2={width - padding.right}
                    y2={y}
                    stroke="#1e293b"
                    strokeDasharray="3 3"
                  />
                  <text
                    x={width - padding.right + 6}
                    y={y + 3}
                    fill="#64748b"
                    fontSize={10}
                    fontFamily="JetBrains Mono"
                  >
                    ${p.toFixed(p >= 1000 ? 0 : 2)}
                  </text>
                </g>
              );
            })}

            {/* Candlesticks */}
            {validCandles.map((c, i) => {
              const isUp = c.close >= c.open;
              const color = isUp ? "#10b981" : "#f43f5e";
              const cx = getX(i);
              const wickTop = getY(c.high);
              const wickBot = getY(c.low);
              const bodyTop = getY(Math.max(c.open, c.close));
              const bodyBot = getY(Math.min(c.open, c.close));
              const bodyH = Math.max(bodyBot - bodyTop, 1.5);

              return (
                <g
                  key={c.timestamp}
                  className="cursor-crosshair"
                  onMouseEnter={() => setHoveredCandle(c)}
                >
                  {/* Wick */}
                  <line x1={cx} y1={wickTop} x2={cx} y2={wickBot} stroke={color} strokeWidth={1.2} />
                  {/* Body */}
                  <rect
                    x={cx - candleW / 2}
                    y={bodyTop}
                    width={candleW}
                    height={bodyH}
                    fill={color}
                    rx={1}
                  />
                </g>
              );
            })}
          </svg>
        )}

        {/* Hover Tooltip */}
        {hoveredCandle && (
          <div className="absolute top-4 left-4 bg-slate-900/90 backdrop-blur border border-slate-700 text-slate-200 text-[11px] font-mono p-2 rounded shadow-xl pointer-events-none z-10 flex gap-3">
            <span>T: {hoveredCandle.time_str}</span>
            <span>O: ${hoveredCandle.open.toFixed(2)}</span>
            <span>H: ${hoveredCandle.high.toFixed(2)}</span>
            <span>L: ${hoveredCandle.low.toFixed(2)}</span>
            <span className={hoveredCandle.close >= hoveredCandle.open ? "text-emerald-400" : "text-rose-400"}>
              C: ${hoveredCandle.close.toFixed(2)}
            </span>
          </div>
        )}
      </div>

      {/* Quantitative Indicators Strip */}
      <div className="px-3 pb-3 border-t border-slate-800/80 pt-2.5">
        <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-2">
          Quantitative Signal Oscillators
        </div>
        <div className="grid grid-cols-2 gap-2">
          {/* RSI */}
          <div className="bg-[#171f30] border border-slate-800 rounded p-2 flex flex-col gap-1">
            <span className="text-[10px] text-slate-500">RSI (14-Period)</span>
            <div className="flex items-center justify-between font-mono">
              <span className="text-sm font-bold text-white">
                {indicators?.rsi !== null ? indicators?.rsi?.toFixed(1) : "--"}
              </span>
              <span
                className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                  indicators?.rsi_state === "OVERSOLD"
                    ? "bg-emerald-500/20 text-emerald-400"
                    : indicators?.rsi_state === "OVERBOUGHT"
                    ? "bg-rose-500/20 text-rose-400"
                    : "bg-slate-800 text-slate-400"
                }`}
              >
                {indicators?.rsi_state || "NEUTRAL"}
              </span>
            </div>
          </div>

          {/* Trend Alignment */}
          <div className="bg-[#171f30] border border-slate-800 rounded p-2 flex flex-col gap-1">
            <span className="text-[10px] text-slate-500">Trend Alignment</span>
            <div className="flex items-center justify-between font-mono">
              <span
                className={`text-sm font-bold ${
                  indicators?.trend_state === "BULLISH"
                    ? "text-emerald-400"
                    : indicators?.trend_state === "BEARISH"
                    ? "text-rose-400"
                    : "text-slate-300"
                }`}
              >
                {indicators?.trend_state || "NEUTRAL"}
              </span>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                EMA 20/50
              </span>
            </div>
          </div>

          {/* MACD */}
          <div className="bg-[#171f30] border border-slate-800 rounded p-2 flex flex-col gap-1">
            <span className="text-[10px] text-slate-500">MACD Histogram</span>
            <div className="flex items-center justify-between font-mono">
              <span
                className={`text-sm font-bold ${
                  (indicators?.macd_hist || 0) >= 0 ? "text-emerald-400" : "text-rose-400"
                }`}
              >
                {indicators?.macd_hist !== null
                  ? `${(indicators?.macd_hist || 0) >= 0 ? "+" : ""}${indicators?.macd_hist?.toFixed(3)}`
                  : "--"}
              </span>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                {(indicators?.macd_hist || 0) >= 0 ? "BULLISH" : "BEARISH"}
              </span>
            </div>
          </div>

          {/* VWAP */}
          <div className="bg-[#171f30] border border-slate-800 rounded p-2 flex flex-col gap-1">
            <span className="text-[10px] text-slate-500">VWAP Benchmark</span>
            <div className="flex items-center justify-between font-mono">
              <span className="text-sm font-bold text-white">
                {indicators?.vwap ? `$${indicators.vwap.toFixed(2)}` : "--"}
              </span>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-cyan-400">
                VOLUME WTD
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
