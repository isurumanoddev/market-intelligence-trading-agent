"use client";

import React, { useState, useRef, useMemo } from "react";
import { Candle, TechnicalIndicators, PriceForecastResult, ForecastPoint } from "@/types/market";
import { TrendingUp, Eye, EyeOff, Activity, Layers } from "lucide-react";

interface CandleChartProps {
  candles: Candle[];
  indicators: TechnicalIndicators | null;
  forecast?: PriceForecastResult | null;
  currentTimeframe: string;
  onChangeTimeframe: (tf: string) => void;
  exchange: string;
  isLoading?: boolean;
}

// Calculate Exponential Moving Average for candle overlay
function calculateEMA(prices: number[], period: number): (number | null)[] {
  if (!prices || prices.length === 0) return [];
  const k = 2 / (period + 1);
  const ema: (number | null)[] = new Array(prices.length).fill(null);
  
  if (prices.length < period) {
    // If not enough data, use simple running average
    let sum = 0;
    for (let i = 0; i < prices.length; i++) {
      sum += prices[i];
      ema[i] = sum / (i + 1);
    }
    return ema;
  }

  let sum = 0;
  for (let i = 0; i < period; i++) sum += prices[i];
  ema[period - 1] = sum / period;

  for (let i = period; i < prices.length; i++) {
    ema[i] = prices[i] * k + (ema[i - 1] as number) * (1 - k);
  }
  return ema;
}

export const CandleChart: React.FC<CandleChartProps> = ({
  candles,
  indicators,
  forecast,
  currentTimeframe,
  onChangeTimeframe,
  exchange,
  isLoading = false,
}) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [showForecast, setShowForecast] = useState<boolean>(true);
  const [showEMAs, setShowEMAs] = useState<boolean>(true);
  const containerRef = useRef<HTMLDivElement>(null);

  const TIMEFRAMES = ["1m", "5m", "15m", "1h", "4h", "1d", "30D"];

  const validCandles = useMemo(() => (candles && candles.length > 0 ? candles : []), [candles]);

  // Calculate EMA 20 and EMA 50
  const closePrices = useMemo(() => validCandles.map((c) => c.close), [validCandles]);
  const ema20 = useMemo(() => calculateEMA(closePrices, 20), [closePrices]);
  const ema50 = useMemo(() => calculateEMA(closePrices, 50), [closePrices]);

  // Forecast points to display
  const forecastPoints = useMemo(() => {
    if (!showForecast || !forecast?.trajectory || forecast.trajectory.length === 0) return [];
    return forecast.trajectory.filter((_, idx) => idx % 3 === 0 || idx === forecast.trajectory.length - 1);
  }, [showForecast, forecast]);

  const totalSlots = validCandles.length + forecastPoints.length;

  // Chart Canvas Dimensions
  const width = 820;
  const height = 400;
  const padding = { top: 28, right: 75, bottom: 45, left: 15 };
  const pricePlotH = 260; // top price area
  const volPlotTop = padding.top + pricePlotH + 15;
  const volPlotH = 50;   // bottom volume histogram
  const plotW = width - padding.left - padding.right;

  // Price Scaling (Candles + Forecast)
  let minPrice = validCandles.length ? Math.min(...validCandles.map((c) => c.low)) : 0;
  let maxPrice = validCandles.length ? Math.max(...validCandles.map((c) => c.high)) : 100;

  if (showForecast && forecastPoints.length > 0) {
    const fMin = Math.min(...forecastPoints.map((p) => p.lower_bound));
    const fMax = Math.max(...forecastPoints.map((p) => p.upper_bound));
    minPrice = Math.min(minPrice, fMin * 0.99);
    maxPrice = Math.max(maxPrice, fMax * 1.01);
  }

  // Add 1.5% padding on top/bottom of price range
  const priceSpan = (maxPrice - minPrice) || 1.0;
  minPrice -= priceSpan * 0.02;
  maxPrice += priceSpan * 0.02;
  const priceRange = maxPrice - minPrice || 1.0;

  const maxVol = validCandles.length ? Math.max(...validCandles.map((c) => c.volume), 1.0) : 1.0;

  // Coordinate mappers
  const getY = (price: number) => padding.top + pricePlotH - ((price - minPrice) / priceRange) * pricePlotH;
  const getVolY = (vol: number) => volPlotTop + volPlotH - (vol / maxVol) * volPlotH;
  const getX = (i: number) => padding.left + i * (plotW / (totalSlots || 1)) + (plotW / (totalSlots || 1)) / 2;
  const candleW = Math.max(Math.min(plotW / (totalSlots || 1) - 3.5, 14), 2.5);

  // Confidence cone polygon & trajectory
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

    const upperStr = upperPts.map((p, i) => (i === 0 ? `M ${p.x},${p.y}` : `L ${p.x},${p.y}`)).join(" ");
    const lowerStr = lowerPts.reverse().map((p) => `L ${p.x},${p.y}`).join(" ");
    conePath = `${upperStr} ${lowerStr} Z`;
    trajectoryPath = trajPts.map((p, i) => (i === 0 ? `M ${p.x},${p.y}` : `L ${p.x},${p.y}`)).join(" ");
  }

  // Build EMA Paths
  const buildLinePath = (values: (number | null)[]) => {
    let p = "";
    let started = false;
    values.forEach((v, i) => {
      if (v !== null) {
        const x = getX(i);
        const y = getY(v);
        if (!started) {
          p += `M ${x},${y}`;
          started = true;
        } else {
          p += ` L ${x},${y}`;
        }
      }
    });
    return p;
  };

  const ema20Path = useMemo(() => (showEMAs ? buildLinePath(ema20) : ""), [showEMAs, ema20, validCandles]);
  const ema50Path = useMemo(() => (showEMAs ? buildLinePath(ema50) : ""), [showEMAs, ema50, validCandles]);

  // Active hover candle or latest candle for HUD
  const activeCandle = hoveredIdx !== null && validCandles[hoveredIdx] 
    ? validCandles[hoveredIdx] 
    : (validCandles.length > 0 ? validCandles[validCandles.length - 1] : null);

  const activeChangePct = activeCandle 
    ? ((activeCandle.close - activeCandle.open) / (activeCandle.open || 1.0)) * 100 
    : 0;

  // Handle Mouse Hover
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!validCandles.length) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = ((e.clientX - rect.left) / rect.width) * width;
    
    // Find closest candle
    const slotW = plotW / (totalSlots || 1);
    const relX = mouseX - padding.left;
    const idx = Math.floor(relX / slotW);
    if (idx >= 0 && idx < validCandles.length) {
      setHoveredIdx(idx);
    }
  };

  return (
    <div className="bg-[#0b0f19] border border-slate-800/90 rounded-lg flex flex-col overflow-hidden shadow-2xl backdrop-blur-md">
      {/* Top Header Bar */}
      <div className="px-4 py-2.5 border-b border-slate-800/80 bg-[#0e1422]/90 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 font-semibold text-xs text-white">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_#22d3ee]" />
            <TrendingUp className="w-4 h-4 text-cyan-400" />
            <span className="tracking-wide">PRICE ACTION & MULTI-HORIZON PROJECTION</span>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800/80 text-cyan-300 font-mono border border-slate-700/60 uppercase">
            {exchange}
          </span>
          {showEMAs && (
            <div className="hidden sm:flex items-center gap-2 text-[10px] font-mono">
              <span className="flex items-center gap-1 text-cyan-400">
                <span className="w-2 h-0.5 bg-cyan-400 rounded-full" /> EMA 20
              </span>
              <span className="flex items-center gap-1 text-purple-400">
                <span className="w-2 h-0.5 bg-purple-400 rounded-full" /> EMA 50
              </span>
            </div>
          )}
        </div>

        {/* Controls & Timeframe Selector */}
        <div className="flex items-center gap-2">
          {/* EMA Toggle */}
          <button
            onClick={() => setShowEMAs(!showEMAs)}
            className={`flex items-center gap-1 px-2 py-1 text-[10px] font-mono rounded border transition-all ${
              showEMAs
                ? "bg-cyan-500/20 border-cyan-500/50 text-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.2)]"
                : "bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300"
            }`}
            title="Toggle EMA 20 / EMA 50 Lines"
          >
            <Layers className="w-3 h-3" />
            <span>EMAs</span>
          </button>

          {/* AI Forecast Toggle */}
          {forecast && (
            <button
              onClick={() => setShowForecast(!showForecast)}
              className={`flex items-center gap-1 px-2 py-1 text-[10px] font-mono rounded border transition-all ${
                showForecast
                  ? "bg-cyan-500/20 border-cyan-500/50 text-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.2)]"
                  : "bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300"
              }`}
            >
              {showForecast ? <Eye className="w-3 h-3 text-cyan-400" /> : <EyeOff className="w-3 h-3" />}
              <span>AI 30D Cone</span>
            </button>
          )}

          {/* Timeframe Buttons */}
          <div className="flex items-center bg-[#070a12] p-0.5 rounded border border-slate-800">
            {TIMEFRAMES.map((tf) => (
              <button
                key={tf}
                onClick={() => onChangeTimeframe(tf)}
                className={`px-2 py-0.5 text-[10px] font-mono rounded transition-all ${
                  currentTimeframe === tf
                    ? "bg-cyan-600 text-white font-bold shadow-md shadow-cyan-600/30"
                    : "text-slate-400 hover:text-slate-100 hover:bg-slate-800/50"
                }`}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Interactive OHLCV HUD Ribbon */}
      <div className="px-4 py-1.5 bg-[#090d17] border-b border-slate-800/60 flex flex-wrap items-center justify-between text-[11px] font-mono">
        {activeCandle ? (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className="text-slate-500">
              TIME: <span className="text-slate-300">{activeCandle.time_str}</span>
            </span>
            <span className="text-slate-500">
              O: <span className="text-white">${formatPrice(activeCandle.open)}</span>
            </span>
            <span className="text-slate-500">
              H: <span className="text-emerald-400">${formatPrice(activeCandle.high)}</span>
            </span>
            <span className="text-slate-500">
              L: <span className="text-rose-400">${formatPrice(activeCandle.low)}</span>
            </span>
            <span className="text-slate-500">
              C: <span className="text-white font-bold">${formatPrice(activeCandle.close)}</span>
            </span>
            <span className={`font-bold ${activeChangePct >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
              {activeChangePct >= 0 ? "+" : ""}{activeChangePct.toFixed(2)}%
            </span>
            <span className="text-slate-500">
              VOL: <span className="text-slate-300">{formatCompact(activeCandle.volume)}</span>
            </span>
          </div>
        ) : (
          <span className="text-slate-500">Awaiting market candle data...</span>
        )}
        <div className="hidden md:flex items-center gap-3 text-[10px] text-slate-500">
          <span>H: High</span>
          <span>L: Low</span>
          <span>C: Close</span>
        </div>
      </div>

      {/* Chart SVG Canvas */}
      <div ref={containerRef} className="relative p-2 flex-1 min-h-[360px] bg-[#070a12]">
        {validCandles.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[340px] text-slate-500 font-mono gap-3">
            <div className="w-8 h-8 border-2 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin" />
            <span className="text-xs">Initializing high-frequency chart stream...</span>
          </div>
        ) : (
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="w-full h-auto max-h-[420px] select-none overflow-visible"
            onMouseMove={handleMouseMove}
            onMouseLeave={() => setHoveredIdx(null)}
          >
            <defs>
              {/* Shaded AI Confidence Gradient */}
              <linearGradient id="aiConfidenceGradient" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.06" />
              </linearGradient>

              {/* Volume Bar Gradient */}
              <linearGradient id="bullVolGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.6" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0.15" />
              </linearGradient>
              <linearGradient id="bearVolGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.6" />
                <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.15" />
              </linearGradient>
            </defs>

            {/* Horizontal Grid & Price Ticks */}
            {[0, 1, 2, 3, 4].map((step) => {
              const p = minPrice + (priceRange / 4) * step;
              const y = getY(p);
              return (
                <g key={`pgrid-${step}`}>
                  <line
                    x1={padding.left}
                    y1={y}
                    x2={width - padding.right}
                    y2={y}
                    stroke="#1e293b"
                    strokeDasharray="3 4"
                    strokeWidth={0.8}
                  />
                  <text
                    x={width - padding.right + 6}
                    y={y + 3.5}
                    fill="#64748b"
                    fontSize={10}
                    fontFamily="JetBrains Mono"
                  >
                    ${formatPrice(p)}
                  </text>
                </g>
              );
            })}

            {/* Volume Grid Line */}
            <line
              x1={padding.left}
              y1={volPlotTop}
              x2={width - padding.right}
              y2={volPlotTop}
              stroke="#1e293b"
              strokeDasharray="2 3"
              strokeWidth={0.8}
            />
            <text
              x={padding.left}
              y={volPlotTop - 4}
              fill="#475569"
              fontSize={8}
              fontFamily="JetBrains Mono"
              fontWeight="bold"
            >
              VOLUME HISTOGRAM
            </text>

            {/* Volume Bars */}
            {validCandles.map((c, i) => {
              const isUp = c.close >= c.open;
              const cx = getX(i);
              const vy = getVolY(c.volume);
              const vh = Math.max(volPlotTop + volPlotH - vy, 1.5);
              return (
                <rect
                  key={`vol-${c.timestamp || i}`}
                  x={cx - candleW / 2}
                  y={vy}
                  width={candleW}
                  height={vh}
                  fill={isUp ? "url(#bullVolGrad)" : "url(#bearVolGrad)"}
                  rx={0.5}
                />
              );
            })}

            {/* AI Confidence Cone */}
            {conePath && (
              <path
                d={conePath}
                fill="url(#aiConfidenceGradient)"
                stroke="#06b6d4"
                strokeWidth={1}
                strokeDasharray="3 3"
                opacity={0.8}
              />
            )}

            {/* AI Forecast Trajectory Line */}
            {trajectoryPath && (
              <path
                d={trajectoryPath}
                fill="none"
                stroke="#22d3ee"
                strokeWidth={2}
                strokeDasharray="4 3"
              />
            )}

            {/* Candlesticks */}
            {validCandles.map((c, i) => {
              const isUp = c.close >= c.open;
              const color = isUp ? "#10b981" : "#f43f5e";
              const cx = getX(i);
              const wickTop = getY(c.high);
              const wickBot = getY(c.low);
              const bodyTop = getY(Math.max(c.open, c.close));
              const bodyBot = getY(Math.min(c.open, c.close));
              const bodyH = Math.max(bodyBot - bodyTop, 2);

              return (
                <g key={`candle-${c.timestamp || i}`}>
                  {/* High/Low Wick */}
                  <line
                    x1={cx}
                    y1={wickTop}
                    x2={cx}
                    y2={wickBot}
                    stroke={color}
                    strokeWidth={1.2}
                    opacity={0.9}
                  />
                  {/* Real Body */}
                  <rect
                    x={cx - candleW / 2}
                    y={bodyTop}
                    width={candleW}
                    height={bodyH}
                    fill={color}
                    rx={1}
                    className="transition-all duration-100"
                    style={{
                      filter: isUp
                        ? "drop-shadow(0px 0px 2px rgba(16,185,129,0.35))"
                        : "drop-shadow(0px 0px 2px rgba(244,63,94,0.35))",
                    }}
                  />
                </g>
              );
            })}

            {/* EMA Overlay Lines */}
            {showEMAs && ema20Path && (
              <path
                d={ema20Path}
                fill="none"
                stroke="#06b6d4"
                strokeWidth={1.8}
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={0.9}
              />
            )}
            {showEMAs && ema50Path && (
              <path
                d={ema50Path}
                fill="none"
                stroke="#a855f7"
                strokeWidth={1.8}
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={0.85}
              />
            )}

            {/* Interactive Crosshair & Price Tag */}
            {hoveredIdx !== null && validCandles[hoveredIdx] && (
              <g pointerEvents="none">
                {/* Vertical Guideline */}
                <line
                  x1={getX(hoveredIdx)}
                  y1={padding.top}
                  x2={getX(hoveredIdx)}
                  y2={volPlotTop + volPlotH}
                  stroke="#94a3b8"
                  strokeDasharray="2 2"
                  strokeWidth={1}
                />

                {/* Horizontal Guideline to Price */}
                <line
                  x1={padding.left}
                  y1={getY(validCandles[hoveredIdx].close)}
                  x2={width - padding.right}
                  y2={getY(validCandles[hoveredIdx].close)}
                  stroke="#94a3b8"
                  strokeDasharray="2 2"
                  strokeWidth={1}
                />

                {/* Price Tag on Right Axis */}
                <g transform={`translate(${width - padding.right + 2}, ${getY(validCandles[hoveredIdx].close) - 9})`}>
                  <rect
                    width={68}
                    height={18}
                    fill="#1e293b"
                    stroke="#06b6d4"
                    strokeWidth={1}
                    rx={2}
                  />
                  <text
                    x={34}
                    y={12}
                    fill="#22d3ee"
                    fontSize={10}
                    fontFamily="JetBrains Mono"
                    fontWeight="bold"
                    textAnchor="middle"
                  >
                    ${formatPrice(validCandles[hoveredIdx].close)}
                  </text>
                </g>
              </g>
            )}

            {/* Forecast Endpoint Tag */}
            {showForecast && forecastPoints.length > 0 && (
              <g transform={`translate(${getX(validCandles.length + forecastPoints.length - 1)}, ${getY(forecastPoints[forecastPoints.length - 1].predicted_price)})`}>
                <circle r={4} fill="#06b6d4" className="animate-ping" opacity={0.7} />
                <circle r={3} fill="#22d3ee" />
              </g>
            )}
          </svg>
        )}
      </div>

      {/* Quantitative Indicators Strip */}
      <div className="px-4 py-3 bg-[#0a0e1a] border-t border-slate-800/80">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1.5">
            <Activity className="w-3 h-3 text-cyan-400" />
            QUANTITATIVE SIGNAL OSCILLATORS & MOMENTUM
          </span>
          <span className="text-[9px] text-slate-500 font-mono">REAL-TIME MATH SUITE</span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
          {/* 1. RSI */}
          <div className="bg-[#111728] border border-slate-800/90 rounded-md p-2.5 flex flex-col justify-between">
            <div className="flex justify-between items-center text-[10px]">
              <span className="text-slate-400">RSI (14)</span>
              <span
                className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                  indicators?.rsi_state === "OVERSOLD"
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                    : indicators?.rsi_state === "OVERBOUGHT"
                    ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                    : "bg-slate-800/80 text-slate-300"
                }`}
              >
                {indicators?.rsi_state || "NEUTRAL"}
              </span>
            </div>
            <div className="my-1.5 flex items-baseline justify-between font-mono">
              <span className="text-lg font-bold text-white">
                {typeof indicators?.rsi === "number" ? indicators.rsi.toFixed(1) : "--"}
              </span>
              <span className="text-[10px] text-slate-500">Zone: 30 / 70</span>
            </div>
            {/* Visual RSI Gauge Bar */}
            <div className="relative w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  (indicators?.rsi || 50) < 30
                    ? "bg-emerald-400"
                    : (indicators?.rsi || 50) > 70
                    ? "bg-rose-400"
                    : "bg-cyan-400"
                }`}
                style={{ width: `${Math.min(100, Math.max(0, indicators?.rsi || 50))}%` }}
              />
            </div>
          </div>

          {/* 2. Trend Alignment (EMA 20 / 50) */}
          <div className="bg-[#111728] border border-slate-800/90 rounded-md p-2.5 flex flex-col justify-between">
            <div className="flex justify-between items-center text-[10px]">
              <span className="text-slate-400">Trend Alignment</span>
              <span className="px-1.5 py-0.2 rounded text-[9px] bg-slate-800 text-cyan-300 font-mono">
                EMA 20/50
              </span>
            </div>
            <div className="my-1.5 flex items-center justify-between font-mono">
              <span
                className={`text-base font-bold ${
                  indicators?.trend_state === "BULLISH"
                    ? "text-emerald-400"
                    : indicators?.trend_state === "BEARISH"
                    ? "text-rose-400"
                    : "text-slate-200"
                }`}
              >
                {indicators?.trend_state || "NEUTRAL"}
              </span>
              <span className="text-[10px] text-slate-400">
                {indicators?.trend_state === "BULLISH" ? "Golden Alignment" : indicators?.trend_state === "BEARISH" ? "Death Cross" : "Consolidation"}
              </span>
            </div>
            <div className="text-[10px] text-slate-500 font-mono truncate">
              {indicators?.ema_20 && indicators?.ema_50 ? (
                <span>Δ: ${(indicators.ema_20 - indicators.ema_50).toFixed(2)}</span>
              ) : (
                <span>Tracking Moving Averages</span>
              )}
            </div>
          </div>

          {/* 3. MACD Histogram */}
          <div className="bg-[#111728] border border-slate-800/90 rounded-md p-2.5 flex flex-col justify-between">
            <div className="flex justify-between items-center text-[10px]">
              <span className="text-slate-400">MACD Histogram</span>
              <span
                className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                  typeof indicators?.macd_hist === "number" && indicators.macd_hist >= 0
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                    : typeof indicators?.macd_hist === "number" && indicators.macd_hist < 0
                    ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                    : "bg-slate-800 text-slate-400"
                }`}
              >
                {typeof indicators?.macd_hist === "number"
                  ? indicators.macd_hist >= 0
                    ? "BULLISH"
                    : "BEARISH"
                  : "CALCULATING"}
              </span>
            </div>
            <div className="my-1.5 font-mono">
              <span
                className={`text-lg font-bold ${
                  typeof indicators?.macd_hist === "number"
                    ? indicators.macd_hist >= 0
                      ? "text-emerald-400"
                      : "text-rose-400"
                    : "text-slate-400"
                }`}
              >
                {typeof indicators?.macd_hist === "number"
                  ? `${indicators.macd_hist >= 0 ? "+" : ""}${indicators.macd_hist.toFixed(3)}`
                  : "--"}
              </span>
            </div>
            <div className="text-[10px] text-slate-500 font-mono">
              Signal: 12 / 26 / 9
            </div>
          </div>

          {/* 4. VWAP Benchmark */}
          <div className="bg-[#111728] border border-slate-800/90 rounded-md p-2.5 flex flex-col justify-between">
            <div className="flex justify-between items-center text-[10px]">
              <span className="text-slate-400">VWAP Benchmark</span>
              <span className="px-1.5 py-0.2 rounded text-[9px] bg-slate-800 text-amber-300 font-mono">
                INSTITUTIONAL
              </span>
            </div>
            <div className="my-1.5 font-mono">
              <span className="text-lg font-bold text-white">
                {typeof indicators?.vwap === "number" && indicators.vwap > 0
                  ? `$${formatPrice(indicators.vwap)}`
                  : "--"}
              </span>
            </div>
            <div className="text-[10px] text-cyan-400 font-mono truncate">
              {typeof indicators?.vwap === "number" && activeCandle?.close ? (
                <span>
                  {activeCandle.close >= indicators.vwap ? "▲ Premium " : "▼ Discount "}
                  ({(((activeCandle.close - indicators.vwap) / indicators.vwap) * 100).toFixed(2)}%)
                </span>
              ) : (
                <span className="text-slate-500">Volume Weighted Price</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

function formatPrice(val: number): string {
  if (!val || isNaN(val)) return "0.00";
  if (val >= 1000) return val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (val >= 1) return val.toFixed(4);
  return val.toFixed(6);
}

function formatCompact(val: number): string {
  if (!val || isNaN(val)) return "0.0";
  if (val >= 1_000_000) return (val / 1_000_000).toFixed(2) + "M";
  if (val >= 1_000) return (val / 1_000).toFixed(1) + "K";
  return val.toFixed(1);
}
