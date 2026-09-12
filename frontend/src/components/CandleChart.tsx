"use client";

import React, { useState, useRef } from "react";
import { Candle, TechnicalIndicators, PriceForecastResult, ForecastPoint } from "@/types/market";
import { TrendingUp, Eye, EyeOff } from "lucide-react";

interface CandleChartProps {
  candles: Candle[];
  indicators: TechnicalIndicators | null;
  forecast?: PriceForecastResult | null;
  currentTimeframe: string;
  onChangeTimeframe: (tf: string) => void;
  exchange: string;
}

export const CandleChart: React.FC<CandleChartProps> = ({
  candles,
  indicators,
  forecast,
  currentTimeframe,
  onChangeTimeframe,
  exchange,
}) => {
  const [hoveredCandle, setHoveredCandle] = useState<Candle | null>(null);
  const [hoveredForecast, setHoveredForecast] = useState<ForecastPoint | null>(null);
  const [showForecast, setShowForecast] = useState<boolean>(true);
  const containerRef = useRef<HTMLDivElement>(null);

  const TIMEFRAMES = ["5m", "15m", "1h", "1d", "30D"];

  // SVG dimensions
  const width = 480;
  const height = 280;
  const padding = { top: 20, right: 60, bottom: 40, left: 10 };
  const plotW = width - padding.left - padding.right;
  const plotH = height - padding.top - padding.bottom;

  const validCandles = candles && candles.length > 0 ? candles : [];
  
  // Forecast points to display (take 10 points spaced out across the 30-day horizon)
  const forecastPoints = showForecast && forecast?.trajectory ? forecast.trajectory.filter((_, idx) => idx % 3 === 0 || idx === forecast.trajectory.length - 1) : [];
  const forecastSlotCount = forecastPoints.length;

  const totalSlots = validCandles.length + forecastSlotCount;

  // Price scaling across both historical candles and forecast bounds
  let minPrice = validCandles.length ? Math.min(...validCandles.map((c) => c.low)) : 0;
  let maxPrice = validCandles.length ? Math.max(...validCandles.map((c) => c.high)) : 100;
  
  if (showForecast && forecastPoints.length > 0) {
    const fMin = Math.min(...forecastPoints.map((p) => p.lower_bound));
    const fMax = Math.max(...forecastPoints.map((p) => p.upper_bound));
    minPrice = Math.min(minPrice, fMin * 0.98);
    maxPrice = Math.max(maxPrice, fMax * 1.02);
  }

  const priceRange = maxPrice - minPrice || 1.0;

  const getY = (price: number) => padding.top + plotH - ((price - minPrice) / priceRange) * plotH;
  const getX = (i: number) => padding.left + i * (plotW / (totalSlots || 1)) + (plotW / (totalSlots || 1)) / 2;
  const candleW = Math.max(plotW / (totalSlots || 1) - 2.5, 2);

  // Build polygon path for shaded confidence cone
  let conePath = "";
  let trajectoryPath = "";
  if (showForecast && forecastPoints.length > 0 && validCandles.length > 0) {
    const lastIdx = validCandles.length - 1;
    const startX = getX(lastIdx);
    const startY = getY(validCandles[lastIdx].close);

    const upperPts: { x: number; y: number }[] = [{ x: startX, y: startY }];
    const lowerPts: { x: number; y: number }[] = [{ x: startX, y: startY }];
    const trajPts: { x: number; y: number }[] = [{ x: startX, y: startY }];

    forecastPoints.forEach((pt, i) => {
      const fx = getX(validCandles.length + i);
      upperPts.push({ x: fx, y: getY(pt.upper_bound) });
      lowerPts.push({ x: fx, y: getY(pt.lower_bound) });
      trajPts.push({ x: fx, y: getY(pt.predicted_price) });
    });

    // Generate cone polygon: upper forward, lower backward
    const upperStr = upperPts.map((p, i) => (i === 0 ? `M ${p.x},${p.y}` : `L ${p.x},${p.y}`)).join(" ");
    const lowerStr = lowerPts.reverse().map((p) => `L ${p.x},${p.y}`).join(" ");
    conePath = `${upperStr} ${lowerStr} Z`;

    trajectoryPath = trajPts.map((p, i) => (i === 0 ? `M ${p.x},${p.y}` : `L ${p.x},${p.y}`)).join(" ");
  }

  return (
    <div className="bg-[#111622] border border-slate-800 rounded-md flex flex-col overflow-hidden">
      {/* Chart Header */}
      <div className="px-3.5 py-2.5 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-xs text-white flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />
            Price Action & AI 30D Forecast
          </span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#171f30] text-slate-400 font-mono">
            {exchange}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Toggle Forecast Overlay */}
          {forecast && (
            <button
              onClick={() => setShowForecast(!showForecast)}
              className={`flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono rounded border transition-colors ${
                showForecast
                  ? "bg-cyan-500/15 border-cyan-500/40 text-cyan-300 font-bold"
                  : "bg-slate-800/60 border-slate-700 text-slate-400"
              }`}
            >
              {showForecast ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
              <span>AI Forecast</span>
            </button>
          )}

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
                  onMouseEnter={() => {
                    setHoveredCandle(c);
                    setHoveredForecast(null);
                  }}
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

            {/* AI 30-Day Forecast Confidence Ribbon (Cone) */}
            {conePath && (
              <path
                d={conePath}
                fill="rgba(6, 182, 212, 0.12)"
                stroke="rgba(6, 182, 212, 0.35)"
                strokeWidth={1}
                strokeDasharray="2 2"
              />
            )}

            {/* AI 30-Day Expected Trajectory Path */}
            {trajectoryPath && (
              <path
                d={trajectoryPath}
                fill="none"
                stroke="#06b6d4"
                strokeWidth={2}
                strokeDasharray="4 2.5"
              />
            )}

            {/* Forecast Interactive Target Nodes */}
            {showForecast && forecastPoints.map((pt, i) => {
              const fx = getX(validCandles.length + i);
              const fy = getY(pt.predicted_price);
              const isTarget7 = pt.day >= 7 && pt.day <= 9;
              const isTarget30 = pt.day === forecastPoints[forecastPoints.length - 1].day;

              return (
                <g
                  key={pt.day}
                  className="cursor-pointer"
                  onMouseEnter={() => {
                    setHoveredForecast(pt);
                    setHoveredCandle(null);
                  }}
                >
                  <circle
                    cx={fx}
                    cy={fy}
                    r={isTarget7 || isTarget30 ? 4 : 2.5}
                    fill={isTarget30 ? "#10b981" : isTarget7 ? "#38bdf8" : "#06b6d4"}
                    stroke="#0f172a"
                    strokeWidth={1.2}
                  />
                  {(isTarget7 || isTarget30) && (
                    <text
                      x={fx}
                      y={fy - 7}
                      textAnchor="middle"
                      fill="#38bdf8"
                      fontSize={8.5}
                      fontFamily="JetBrains Mono"
                      fontWeight="bold"
                    >
                      {isTarget30 ? "30D" : "7D"}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        )}

        {/* Hover Tooltip (Candles) */}
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

        {/* Hover Tooltip (AI Forecast Point) */}
        {hoveredForecast && (
          <div className="absolute top-4 left-4 bg-[#0a101d]/95 backdrop-blur border border-cyan-500/40 text-slate-200 text-[11px] font-mono p-2.5 rounded shadow-2xl pointer-events-none z-10 flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="text-cyan-400 font-bold">🔮 AI Forecast Day +{hoveredForecast.day} ({hoveredForecast.date_str})</span>
            </div>
            <div className="flex items-center gap-3 text-[10px]">
              <span className="text-white font-bold">Target: ${hoveredForecast.predicted_price.toFixed(2)}</span>
              <span className="text-slate-400">Upper (+1σ): ${hoveredForecast.upper_bound.toFixed(2)}</span>
              <span className="text-slate-400">Lower (-1σ): ${hoveredForecast.lower_bound.toFixed(2)}</span>
            </div>
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
