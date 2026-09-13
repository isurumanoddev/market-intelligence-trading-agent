"use client";

import React, { useState, useRef, useMemo, useEffect } from "react";
import { Candle, TechnicalIndicators, PriceForecastResult, TradingDecision } from "@/types/market";
import {
  TrendingUp,
  TrendingDown,
  Eye,
  EyeOff,
  Activity,
  Layers,
  Shield,
  Compass,
  Maximize2,
  Minimize2,
  Zap,
  Target,
  BarChart2,
  Sliders,
  CheckCircle2,
  Loader2,
  ChevronDown,
  ChevronUp,
  Scale
} from "lucide-react";

interface CandleChartProps {
  candles: Candle[];
  indicators: TechnicalIndicators | null;
  forecast?: PriceForecastResult | null;
  decision?: TradingDecision | null;
  currentTimeframe: string;
  onChangeTimeframe: (tf: string) => void;
  exchange: string;
  isLoading?: boolean;
  onExecuteTrade?: (side?: "BUY" | "SELL", entry?: number, sl?: number, tp?: number) => void;
  isExecutingTrade?: boolean;
}

// Indicator Verdict Interface
interface IndicatorVerdict {
  name: string;
  category: "MOMENTUM" | "TREND" | "VOLATILITY" | "BENCHMARK";
  value: string;
  signal: "BULLISH" | "BEARISH" | "NEUTRAL";
  description: string;
}

// Calculate Exponential Moving Average
function calculateEMA(prices: number[], period: number): (number | null)[] {
  if (!prices || prices.length === 0) return [];
  const k = 2 / (period + 1);
  const ema: (number | null)[] = new Array(prices.length).fill(null);
  
  if (prices.length < period) {
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

// Calculate Simple Moving Average (SMA 20, SMA 50, SMA 200)
function calculateSMA(prices: number[], period: number): (number | null)[] {
  if (!prices || prices.length === 0) return [];
  const res: (number | null)[] = [];
  for (let i = 0; i < prices.length; i++) {
    if (i < period - 1) {
      res.push(null);
      continue;
    }
    const slice = prices.slice(i - period + 1, i + 1);
    const sum = slice.reduce((a, b) => a + b, 0);
    res.push(sum / period);
  }
  return res;
}

// Calculate rolling Bollinger Bands (20 period, 2 std-dev)
function calculateRollingBB(prices: number[], period: number = 20, multiplier: number = 2) {
  const upper: (number | null)[] = [];
  const middle: (number | null)[] = [];
  const lower: (number | null)[] = [];

  for (let i = 0; i < prices.length; i++) {
    if (i < 4) {
      upper.push(null);
      middle.push(null);
      lower.push(null);
      continue;
    }
    const windowLen = Math.min(i + 1, period);
    const slice = prices.slice(i - windowLen + 1, i + 1);
    const mean = slice.reduce((a, b) => a + b, 0) / windowLen;
    const variance = slice.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / windowLen;
    const stdDev = Math.sqrt(variance);

    upper.push(mean + multiplier * stdDev);
    middle.push(mean);
    lower.push(mean - multiplier * stdDev);
  }
  return { upper, middle, lower };
}

export const CandleChart: React.FC<CandleChartProps> = ({
  candles,
  indicators,
  forecast,
  decision,
  currentTimeframe,
  onChangeTimeframe,
  exchange,
  isLoading = false,
  onExecuteTrade,
  isExecutingTrade = false,
}) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [showForecast, setShowForecast] = useState<boolean>(true);
  const [showEMAs, setShowEMAs] = useState<boolean>(true);
  const [showSMAs, setShowSMAs] = useState<boolean>(true);
  const [candleFit, setCandleFit] = useState<boolean>(true);
  const [showSupportResistance, setShowSupportResistance] = useState<boolean>(true);
  const [showTrendlines, setShowTrendlines] = useState<boolean>(true);
  const [showBollinger, setShowBollinger] = useState<boolean>(true);
  const [showVWAP, setShowVWAP] = useState<boolean>(true);
  const [showStrategies, setShowStrategies] = useState<boolean>(true);
  const [showVerdictsDrawer, setShowVerdictsDrawer] = useState<boolean>(true);

  // Interactive Signal Suggestion Mode: "AI" | "LONG" | "SHORT"
  const [signalMode, setSignalMode] = useState<"AI" | "LONG" | "SHORT">("AI");
  const [tradeSuccessMsg, setTradeSuccessMsg] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const TIMEFRAMES = ["1m", "5m", "15m", "1h", "4h", "1d"];

  // Handle ESC key to exit fullscreen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFullscreen]);

  const validCandles = useMemo(() => (candles && candles.length > 0 ? candles : []), [candles]);

  // Price series calculations
  const closePrices = useMemo(() => validCandles.map((c) => c.close), [validCandles]);
  const volumeSeries = useMemo(() => validCandles.map((c) => c.volume), [validCandles]);
  const volumeSMA20 = useMemo(() => calculateSMA(volumeSeries, 20), [volumeSeries]);

  const ema20 = useMemo(() => calculateEMA(closePrices, 20), [closePrices]);
  const ema50 = useMemo(() => calculateEMA(closePrices, 50), [closePrices]);

  const sma20 = useMemo(() => calculateSMA(closePrices, 20), [closePrices]);
  const sma50 = useMemo(() => calculateSMA(closePrices, 50), [closePrices]);
  const sma200 = useMemo(() => calculateSMA(closePrices, 200), [closePrices]);

  const bollingerBands = useMemo(() => calculateRollingBB(closePrices, 20, 2), [closePrices]);

  // Last Price & Candle Calculations
  const candleLow = validCandles.length ? Math.min(...validCandles.map((c) => c.low)) : 0;
  const candleHigh = validCandles.length ? Math.max(...validCandles.map((c) => c.high)) : 100;
  const lastPrice = validCandles.length ? validCandles[validCandles.length - 1].close : (candleLow + candleHigh) / 2;

  // Detect Swing Highs and Lows for S/R and Trendlines
  const swings = useMemo(() => {
    if (validCandles.length < 5) return { highs: [], lows: [], resLevels: [], supLevels: [] };
    const highs: { index: number; price: number }[] = [];
    const lows: { index: number; price: number }[] = [];

    for (let i = 2; i < validCandles.length - 2; i++) {
      const cur = validCandles[i];
      const isHigh =
        cur.high >= validCandles[i - 1].high &&
        cur.high >= validCandles[i - 2].high &&
        cur.high >= validCandles[i + 1].high &&
        cur.high >= validCandles[i + 2].high;
      const isLow =
        cur.low <= validCandles[i - 1].low &&
        cur.low <= validCandles[i - 2].low &&
        cur.low <= validCandles[i + 1].low &&
        cur.low <= validCandles[i + 2].low;

      if (isHigh) highs.push({ index: i, price: cur.high });
      if (isLow) lows.push({ index: i, price: cur.low });
    }

    const maxH = Math.max(...validCandles.map((c) => c.high));
    const minL = Math.min(...validCandles.map((c) => c.low));
    const resLevels = [maxH];
    if (highs.length > 0) {
      const lastHigh = highs[highs.length - 1].price;
      if (Math.abs(lastHigh - maxH) / maxH > 0.004) resLevels.push(lastHigh);
    }
    const supLevels = [minL];
    if (lows.length > 0) {
      const lastLow = lows[lows.length - 1].price;
      if (Math.abs(lastLow - minL) / minL > 0.004) supLevels.push(lastLow);
    }

    return { highs, lows, resLevels, supLevels };
  }, [validCandles]);

  // ================= 8-INDICATOR BULLISH / BEARISH VERDICT ENGINE =================
  const indicatorVerdicts = useMemo<IndicatorVerdict[]>(() => {
    const verdicts: IndicatorVerdict[] = [];
    const lastIdx = validCandles.length - 1;
    const curE20 = ema20[lastIdx];
    const curE50 = ema50[lastIdx];
    const curS20 = sma20[lastIdx];
    const curS50 = sma50[lastIdx];
    const curS200 = sma200[lastIdx];
    const curBBUpper = bollingerBands.upper[lastIdx];
    const curBBLower = bollingerBands.lower[lastIdx];
    const curBBMid = bollingerBands.middle[lastIdx];

    // 1. RSI (14)
    const rsiVal = typeof indicators?.rsi === "number" ? indicators.rsi : 50;
    if (rsiVal < 32) {
      verdicts.push({
        name: "RSI (14)",
        category: "MOMENTUM",
        value: rsiVal.toFixed(1),
        signal: "BULLISH",
        description: "Oversold extreme — primed for bullish rebound",
      });
    } else if (rsiVal > 68) {
      verdicts.push({
        name: "RSI (14)",
        category: "MOMENTUM",
        value: rsiVal.toFixed(1),
        signal: "BEARISH",
        description: "Overbought zone — high risk of seller exhaustion",
      });
    } else if (rsiVal >= 50) {
      verdicts.push({
        name: "RSI (14)",
        category: "MOMENTUM",
        value: rsiVal.toFixed(1),
        signal: "BULLISH",
        description: "Bullish momentum dominance (> 50)",
      });
    } else {
      verdicts.push({
        name: "RSI (14)",
        category: "MOMENTUM",
        value: rsiVal.toFixed(1),
        signal: "BEARISH",
        description: "Bearish momentum dominance (< 50)",
      });
    }

    // 2. MACD Histogram (12, 26, 9)
    const macdHist = typeof indicators?.macd_hist === "number" ? indicators.macd_hist : 0;
    if (macdHist > 0.5) {
      verdicts.push({
        name: "MACD Histogram",
        category: "MOMENTUM",
        value: `+${macdHist.toFixed(2)}`,
        signal: "BULLISH",
        description: "Bullish convergence expanding upward",
      });
    } else if (macdHist < -0.5) {
      verdicts.push({
        name: "MACD Histogram",
        category: "MOMENTUM",
        value: macdHist.toFixed(2),
        signal: "BEARISH",
        description: "Bearish divergence accelerating downward",
      });
    } else {
      verdicts.push({
        name: "MACD Histogram",
        category: "MOMENTUM",
        value: macdHist.toFixed(2),
        signal: "NEUTRAL",
        description: "Signal line baseline consolidation",
      });
    }

    // 3. EMA 20 vs EMA 50
    if (curE20 && curE50) {
      const isGolden = curE20 >= curE50;
      verdicts.push({
        name: "EMA 20 / 50",
        category: "TREND",
        value: `$${formatPrice(curE20)}`,
        signal: isGolden ? "BULLISH" : "BEARISH",
        description: isGolden ? "Golden Trend (EMA 20 > EMA 50)" : "Death Cross (EMA 20 < EMA 50)",
      });
    }

    // 4. SMA 20 (Fast Trend)
    if (curS20) {
      const isAbove = lastPrice >= curS20;
      verdicts.push({
        name: "SMA 20 (Fast)",
        category: "TREND",
        value: `$${formatPrice(curS20)}`,
        signal: isAbove ? "BULLISH" : "BEARISH",
        description: isAbove ? "Price holding above 20-period trend" : "Price broken below 20-period trend",
      });
    }

    // 5. SMA 50 (Intermediate Trend)
    if (curS50) {
      const isAbove = lastPrice >= curS50;
      verdicts.push({
        name: "SMA 50 (Med)",
        category: "TREND",
        value: `$${formatPrice(curS50)}`,
        signal: isAbove ? "BULLISH" : "BEARISH",
        description: isAbove ? "Intermediate trend remains bullish" : "Intermediate trend remains bearish",
      });
    }

    // 6. SMA 200 (Institutional Macro Trend)
    if (curS200) {
      const isAbove = lastPrice >= curS200;
      verdicts.push({
        name: "SMA 200 (Macro)",
        category: "TREND",
        value: `$${formatPrice(curS200)}`,
        signal: isAbove ? "BULLISH" : "BEARISH",
        description: isAbove ? "Macro bull regime (Price > SMA 200)" : "Macro bear regime (Price < SMA 200)",
      });
    }

    // 7. VWAP Benchmark
    const vwapVal = indicators?.vwap;
    if (vwapVal && vwapVal > 0) {
      const isAbove = lastPrice >= vwapVal;
      const devPct = (((lastPrice - vwapVal) / vwapVal) * 100).toFixed(2);
      verdicts.push({
        name: "VWAP Benchmark",
        category: "BENCHMARK",
        value: `$${formatPrice(vwapVal)}`,
        signal: isAbove ? "BULLISH" : "BEARISH",
        description: isAbove ? `Institutional premium (+${devPct}%)` : `Institutional discount (${devPct}%)`,
      });
    }

    // 8. Bollinger Bands (20, 2)
    if (curBBUpper && curBBLower && curBBMid) {
      if (lastPrice <= curBBLower) {
        verdicts.push({
          name: "Bollinger Bands",
          category: "VOLATILITY",
          value: "Lower Band Touch",
          signal: "BULLISH",
          description: "Oversold squeeze band bounce setup",
        });
      } else if (lastPrice >= curBBUpper) {
        verdicts.push({
          name: "Bollinger Bands",
          category: "VOLATILITY",
          value: "Upper Band Touch",
          signal: "BEARISH",
          description: "Overextended upper band exhaustion",
        });
      } else if (lastPrice >= curBBMid) {
        verdicts.push({
          name: "Bollinger Bands",
          category: "VOLATILITY",
          value: "Above Mid-Band",
          signal: "BULLISH",
          description: "Upper volatility channel expansion",
        });
      } else {
        verdicts.push({
          name: "Bollinger Bands",
          category: "VOLATILITY",
          value: "Below Mid-Band",
          signal: "BEARISH",
          description: "Lower volatility channel drift",
        });
      }
    }

    return verdicts;
  }, [indicators, ema20, ema50, sma20, sma50, sma200, bollingerBands, lastPrice, validCandles]);

  // Aggregate Confluence Score
  const confluenceScore = useMemo(() => {
    let bull = 0;
    let bear = 0;
    let neut = 0;

    indicatorVerdicts.forEach((v) => {
      if (v.signal === "BULLISH") bull++;
      else if (v.signal === "BEARISH") bear++;
      else neut++;
    });

    const total = bull + bear + neut || 1;
    const dominantBias = bull > bear ? "BULLISH" : bear > bull ? "BEARISH" : "NEUTRAL";
    const confidencePct = Math.round((Math.max(bull, bear) / total) * 100);

    return {
      bull,
      bear,
      neut,
      total,
      dominantBias,
      confidencePct,
      summary: `${bull} BULLISH • ${bear} BEARISH${neut > 0 ? ` • ${neut} NEUTRAL` : ""}`,
    };
  }, [indicatorVerdicts]);

  // Strategy Signals on Candles
  const strategySignals = useMemo(() => {
    if (!showStrategies || validCandles.length < 5) return [];
    const signals: { index: number; type: "BUY" | "SELL"; label: string; price: number }[] = [];

    for (let i = 1; i < validCandles.length; i++) {
      const e20Cur = ema20[i];
      const e50Cur = ema50[i];
      const e20Prev = ema20[i - 1];
      const e50Prev = ema50[i - 1];

      if (e20Cur !== null && e50Cur !== null && e20Prev !== null && e50Prev !== null) {
        if (e20Prev <= e50Prev && e20Cur > e50Cur) {
          signals.push({ index: i, type: "BUY", label: "EMA CROSS", price: validCandles[i].low });
        } else if (e20Prev >= e50Prev && e20Cur < e50Cur) {
          signals.push({ index: i, type: "SELL", label: "DEATH CROSS", price: validCandles[i].high });
        }
      }

      const s20Cur = sma20[i];
      const s50Cur = sma50[i];
      const s20Prev = sma20[i - 1];
      const s50Prev = sma50[i - 1];
      if (s20Cur !== null && s50Cur !== null && s20Prev !== null && s50Prev !== null) {
        if (s20Prev <= s50Prev && s20Cur > s50Cur) {
          signals.push({ index: i, type: "BUY", label: "SMA CROSS", price: validCandles[i].low });
        }
      }

      const bbL = bollingerBands.lower[i];
      const bbU = bollingerBands.upper[i];
      if (bbL !== null && validCandles[i].low < bbL && validCandles[i].close > validCandles[i].open) {
        signals.push({ index: i, type: "BUY", label: "BB BOUNCE", price: validCandles[i].low });
      } else if (bbU !== null && validCandles[i].high > bbU && validCandles[i].close < validCandles[i].open) {
        signals.push({ index: i, type: "SELL", label: "BB REJECT", price: validCandles[i].high });
      }
    }
    return signals;
  }, [showStrategies, validCandles, ema20, ema50, sma20, sma50, bollingerBands]);

  // ================= ACTIONABLE TRADE PLAN (ENTRY, SL, TP) =================
  const activeTradePlan = useMemo(() => {
    const entry = lastPrice;
    let side: "BUY" | "SELL" = "BUY";

    if (signalMode === "LONG") {
      side = "BUY";
    } else if (signalMode === "SHORT") {
      side = "SELL";
    } else {
      // AI / Confluence Mode
      if (confluenceScore.dominantBias === "BEARISH" || decision?.action?.includes("SELL")) {
        side = "SELL";
      } else {
        side = "BUY";
      }
    }

    let tp = 0;
    let sl = 0;

    if (side === "BUY") {
      // LONG SETUP:
      // SL placed below key support or 2.2% below entry
      const nearestSup = swings.supLevels.find((s) => s < entry * 0.995);
      sl = nearestSup ? Math.max(nearestSup, entry * 0.975) : entry * 0.98;

      // TP placed at key resistance or 4.5% above entry
      const nearestRes = swings.resLevels.find((r) => r > entry * 1.005);
      tp = nearestRes ? Math.min(nearestRes, entry * 1.06) : entry * 1.045;

      if (decision && !decision.action.includes("SELL") && decision.take_profit_1 > entry) {
        tp = decision.take_profit_1;
        if (decision.stop_loss < entry && decision.stop_loss > 0) sl = decision.stop_loss;
      }
    } else {
      // SHORT SETUP:
      // SL placed above key resistance or 2.2% above entry
      const nearestRes = swings.resLevels.find((r) => r > entry * 1.005);
      sl = nearestRes ? Math.min(nearestRes, entry * 1.025) : entry * 1.02;

      // TP placed down at key support or 4.5% below entry
      const nearestSup = swings.supLevels.find((s) => s < entry * 0.995);
      tp = nearestSup ? Math.max(nearestSup, entry * 0.94) : entry * 0.955;

      if (decision && decision.action.includes("SELL") && decision.take_profit_1 < entry && decision.take_profit_1 > 0) {
        tp = decision.take_profit_1;
        if (decision.stop_loss > entry) sl = decision.stop_loss;
      }
    }

    const riskAmt = Math.abs(entry - sl) || 1.0;
    const rewardAmt = Math.abs(tp - entry) || 1.0;
    const rr = Number((rewardAmt / riskAmt).toFixed(2));
    const gainPct = side === "BUY" ? ((tp - entry) / entry) * 100 : ((entry - tp) / entry) * 100;
    const lossPct = side === "BUY" ? ((entry - sl) / entry) * 100 : ((sl - entry) / entry) * 100;

    return {
      side,
      entry,
      tp,
      sl,
      rr,
      gainPct,
      lossPct,
      isLong: side === "BUY",
    };
  }, [signalMode, confluenceScore.dominantBias, decision, lastPrice, swings]);

  // Forecast points disabled - focused purely on price action & indicators
  const forecastPoints: any[] = [];

  const forwardBuffer = 14;
  const totalSlots = validCandles.length + forecastPoints.length + forwardBuffer;

  // Responsive Dimensions
  const width = isFullscreen ? 1400 : 840;
  const height = isFullscreen ? 620 : 410;
  const padding = {
    top: 35,
    right: isFullscreen ? 120 : 95,
    bottom: isFullscreen ? 55 : 45,
    left: 15
  };
  const pricePlotH = isFullscreen ? 425 : 260;
  const volPlotTop = padding.top + pricePlotH + (isFullscreen ? 20 : 15);
  const volPlotH = isFullscreen ? 80 : 50;
  const plotW = width - padding.left - padding.right;

  // Price Scaling: Keep candles tall and crisp, gracefully incorporating TP/SL
  let minPrice = candleLow;
  let maxPrice = candleHigh;

  if (!candleFit && showForecast && forecastPoints.length > 0) {
    const fMin = Math.min(...forecastPoints.map((p) => p.lower_bound));
    const fMax = Math.max(...forecastPoints.map((p) => p.upper_bound));
    minPrice = Math.min(minPrice, fMin * 0.99);
    maxPrice = Math.max(maxPrice, fMax * 1.01);
  } else {
    if (showStrategies && activeTradePlan) {
      if (Math.abs(activeTradePlan.tp - lastPrice) / lastPrice < 0.08) {
        minPrice = Math.min(minPrice, activeTradePlan.tp);
        maxPrice = Math.max(maxPrice, activeTradePlan.tp);
      }
      if (Math.abs(activeTradePlan.sl - lastPrice) / lastPrice < 0.08) {
        minPrice = Math.min(minPrice, activeTradePlan.sl);
        maxPrice = Math.max(maxPrice, activeTradePlan.sl);
      }
    }
  }

  if (showVWAP && indicators?.vwap && Math.abs(indicators.vwap - lastPrice) / lastPrice < 0.06) {
    minPrice = Math.min(minPrice, indicators.vwap);
    maxPrice = Math.max(maxPrice, indicators.vwap);
  }

  const priceSpan = (maxPrice - minPrice) || 1.0;
  minPrice -= priceSpan * 0.04;
  maxPrice += priceSpan * 0.04;
  const priceRange = maxPrice - minPrice || 1.0;

  const maxVol = validCandles.length ? Math.max(...validCandles.map((c) => c.volume), 1.0) : 1.0;

  // Coordinate mappers
  const getY = (price: number) => padding.top + pricePlotH - ((price - minPrice) / priceRange) * pricePlotH;
  const getVolY = (vol: number) => volPlotTop + volPlotH - (vol / maxVol) * volPlotH;
  const getX = (i: number) => padding.left + i * (plotW / (totalSlots || 1)) + (plotW / (totalSlots || 1)) / 2;
  const candleW = Math.max(Math.min(plotW / (totalSlots || 1) - 3.5, isFullscreen ? 18 : 14), 2.5);

  const lastCandleIdx = validCandles.length > 0 ? validCandles.length - 1 : 0;
  const lastCandleX = getX(lastCandleIdx);
  const corridorEndX = width - padding.right;
  const corridorWidth = Math.max(corridorEndX - lastCandleX, 80);

  // Dynamic Trendlines
  const trendlines = useMemo(() => {
    if (!showTrendlines || validCandles.length < 6) return null;
    const { highs, lows } = swings;
    let resLine: { x1: number; y1: number; x2: number; y2: number } | null = null;
    let supLine: { x1: number; y1: number; x2: number; y2: number } | null = null;

    if (highs.length >= 2) {
      const p1 = highs[highs.length - 2];
      const p2 = highs[highs.length - 1];
      const x1 = getX(p1.index);
      const y1 = getY(p1.price);
      const x2 = getX(p2.index);
      const y2 = getY(p2.price);
      const dx = x2 - x1;
      const dy = y2 - y1;
      const extX = width - padding.right;
      const extY = y1 + (dy / (dx || 1)) * (extX - x1);
      resLine = { x1, y1, x2: extX, y2: extY };
    }

    if (lows.length >= 2) {
      const p1 = lows[lows.length - 2];
      const p2 = lows[lows.length - 1];
      const x1 = getX(p1.index);
      const y1 = getY(p1.price);
      const x2 = getX(p2.index);
      const y2 = getY(p2.price);
      const dx = x2 - x1;
      const dy = y2 - y1;
      const extX = width - padding.right;
      const extY = y1 + (dy / (dx || 1)) * (extX - x1);
      supLine = { x1, y1, x2: extX, y2: extY };
    }

    return { resLine, supLine };
  }, [showTrendlines, swings, validCandles, minPrice, maxPrice, width, padding.right]);

  // Helper to build line paths
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

  const ema20Path = useMemo(() => (showEMAs ? buildLinePath(ema20) : ""), [showEMAs, ema20, validCandles, minPrice, maxPrice]);
  const ema50Path = useMemo(() => (showEMAs ? buildLinePath(ema50) : ""), [showEMAs, ema50, validCandles, minPrice, maxPrice]);
  const sma20Path = useMemo(() => (showSMAs ? buildLinePath(sma20) : ""), [showSMAs, sma20, validCandles, minPrice, maxPrice]);
  const sma50Path = useMemo(() => (showSMAs ? buildLinePath(sma50) : ""), [showSMAs, sma50, validCandles, minPrice, maxPrice]);
  const sma200Path = useMemo(() => (showSMAs ? buildLinePath(sma200) : ""), [showSMAs, sma200, validCandles, minPrice, maxPrice]);

  const bbUpperPath = useMemo(() => (showBollinger ? buildLinePath(bollingerBands.upper) : ""), [showBollinger, bollingerBands.upper, validCandles, minPrice, maxPrice]);
  const bbMiddlePath = useMemo(() => (showBollinger ? buildLinePath(bollingerBands.middle) : ""), [showBollinger, bollingerBands.middle, validCandles, minPrice, maxPrice]);
  const bbLowerPath = useMemo(() => (showBollinger ? buildLinePath(bollingerBands.lower) : ""), [showBollinger, bollingerBands.lower, validCandles, minPrice, maxPrice]);

  const bbAreaPath = useMemo(() => {
    if (!showBollinger || validCandles.length < 5) return "";
    const upperPts: { x: number; y: number }[] = [];
    const lowerPts: { x: number; y: number }[] = [];

    bollingerBands.upper.forEach((v, i) => {
      if (v !== null && bollingerBands.lower[i] !== null) {
        upperPts.push({ x: getX(i), y: getY(v) });
        lowerPts.push({ x: getX(i), y: getY(bollingerBands.lower[i]!) });
      }
    });
    if (upperPts.length === 0) return "";
    const uStr = upperPts.map((p, i) => (i === 0 ? `M ${p.x},${p.y}` : `L ${p.x},${p.y}`)).join(" ");
    const lStr = lowerPts.reverse().map((p) => `L ${p.x},${p.y}`).join(" ");
    return `${uStr} ${lStr} Z`;
  }, [showBollinger, bollingerBands, validCandles, minPrice, maxPrice]);

  const volSMAPath = useMemo(() => {
    let p = "";
    let started = false;
    volumeSMA20.forEach((v, i) => {
      if (v !== null) {
        const x = getX(i);
        const y = getVolY(v);
        if (!started) {
          p += `M ${x},${y}`;
          started = true;
        } else {
          p += ` L ${x},${y}`;
        }
      }
    });
    return p;
  }, [volumeSMA20, validCandles, maxVol]);

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

  // Active hover candle
  const activeCandle = hoveredIdx !== null && validCandles[hoveredIdx] 
    ? validCandles[hoveredIdx] 
    : (validCandles.length > 0 ? validCandles[validCandles.length - 1] : null);

  const activeChangePct = activeCandle 
    ? ((activeCandle.close - activeCandle.open) / (activeCandle.open || 1.0)) * 100 
    : 0;

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!validCandles.length) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = ((e.clientX - rect.left) / rect.width) * width;
    const slotW = plotW / (totalSlots || 1);
    const relX = mouseX - padding.left;
    const idx = Math.floor(relX / slotW);
    if (idx >= 0 && idx < validCandles.length) {
      setHoveredIdx(idx);
    }
  };

  // One-click trade execution
  const handleTakeTrade = () => {
    if (!onExecuteTrade) return;
    onExecuteTrade(activeTradePlan.side, activeTradePlan.entry, activeTradePlan.sl, activeTradePlan.tp);
    setTradeSuccessMsg(`✓ Placed ${activeTradePlan.side} Trade! Entry: $${formatPrice(activeTradePlan.entry)}`);
    setTimeout(() => setTradeSuccessMsg(null), 4000);
  };

  return (
    <div
      ref={containerRef}
      className={`bg-[#0b0f19] border border-slate-800/90 rounded-lg flex flex-col overflow-hidden shadow-2xl backdrop-blur-md transition-all ${
        isFullscreen ? "fixed inset-0 z-50 bg-[#070a14] p-3 rounded-none overflow-y-auto" : "relative"
      }`}
    >
      {/* Top Header Bar */}
      <div className="px-4 py-2.5 border-b border-slate-800/80 bg-[#0e1422]/90 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 font-semibold text-xs text-white">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_#22d3ee]" />
            <TrendingUp className="w-4 h-4 text-cyan-400" />
            <span className="tracking-wide uppercase">
              {isFullscreen ? "PRO TRADING TERMINAL — FULLSCREEN MODE" : "PRICE ACTION & MULTI-HORIZON PROJECTION"}
            </span>
          </div>

          <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800/80 text-cyan-300 font-mono border border-slate-700/60 uppercase">
            {exchange}
          </span>

          {/* Quick Confluence Badge Button */}
          <button
            onClick={() => setShowVerdictsDrawer(!showVerdictsDrawer)}
            className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold border flex items-center gap-1.5 transition-all ${
              confluenceScore.dominantBias === "BULLISH"
                ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-300 hover:bg-emerald-500/30"
                : confluenceScore.dominantBias === "BEARISH"
                ? "bg-rose-500/20 border-rose-500/50 text-rose-300 hover:bg-rose-500/30"
                : "bg-amber-500/20 border-amber-500/50 text-amber-300 hover:bg-amber-500/30"
            }`}
            title="Toggle All Indicator Bullish/Bearish Verdicts Panel"
          >
            <Scale className="w-3 h-3" />
            <span>{confluenceScore.summary} ({confluenceScore.confidencePct}%)</span>
            {showVerdictsDrawer ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>

        {/* Toolbar Controls */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Signal Suggestion Switcher Pills */}
          <div className="flex items-center bg-[#070c17] p-0.5 rounded border border-cyan-500/40 text-[10px] font-mono">
            <span className="px-1.5 text-slate-400 font-bold hidden md:inline">SIGNAL:</span>
            <button
              onClick={() => { setSignalMode("LONG"); setShowStrategies(true); }}
              className={`px-2 py-0.5 rounded font-bold transition-all ${
                signalMode === "LONG"
                  ? "bg-emerald-600 text-white shadow-sm shadow-emerald-500/40"
                  : "text-emerald-400 hover:text-white"
              }`}
            >
              LONG (BUY)
            </button>
            <button
              onClick={() => { setSignalMode("SHORT"); setShowStrategies(true); }}
              className={`px-2 py-0.5 rounded font-bold transition-all ${
                signalMode === "SHORT"
                  ? "bg-rose-600 text-white shadow-sm shadow-rose-500/40"
                  : "text-rose-400 hover:text-white"
              }`}
            >
              SHORT (SELL)
            </button>
            <button
              onClick={() => { setSignalMode("AI"); setShowStrategies(true); }}
              className={`px-1.5 py-0.5 rounded font-bold transition-all ${
                signalMode === "AI"
                  ? "bg-cyan-600 text-white shadow-sm shadow-cyan-500/40"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              AI AUTO
            </button>
          </div>

          {/* Fullscreen Toggle */}
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className={`flex items-center gap-1 px-2.5 py-1 text-[10px] font-mono rounded border transition-all ${
              isFullscreen
                ? "bg-amber-500/20 border-amber-500/50 text-amber-300 font-bold shadow-[0_0_10px_rgba(245,158,11,0.25)]"
                : "bg-slate-900 border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800"
            }`}
            title={isFullscreen ? "Exit Fullscreen Mode (ESC)" : "Expand to Fullscreen View"}
          >
            {isFullscreen ? <Minimize2 className="w-3 h-3 text-amber-400" /> : <Maximize2 className="w-3 h-3 text-cyan-400" />}
            <span className="font-bold">{isFullscreen ? "Exit Fullscreen" : "Fullscreen"}</span>
          </button>


          {/* Strategy Visualization Toggle */}
          <button
            onClick={() => setShowStrategies(!showStrategies)}
            className={`flex items-center gap-1 px-2 py-1 text-[10px] font-mono rounded border transition-all ${
              showStrategies
                ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-300 font-bold shadow-[0_0_10px_rgba(16,185,129,0.2)]"
                : "bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300"
            }`}
            title="Visualize Trading Strategies, Buy/Sell Signals, TP & SL corridor"
          >
            <Zap className="w-3 h-3 text-emerald-400" />
            <span>Strategies</span>
          </button>

          {/* S/R Toggle */}
          <button
            onClick={() => setShowSupportResistance(!showSupportResistance)}
            className={`flex items-center gap-1 px-2 py-1 text-[10px] font-mono rounded border transition-all ${
              showSupportResistance
                ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-300 font-bold"
                : "bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300"
            }`}
            title="Toggle Support & Resistance Levels"
          >
            <Shield className="w-3 h-3" />
            <span>S / R</span>
          </button>

          {/* Trendlines Toggle */}
          <button
            onClick={() => setShowTrendlines(!showTrendlines)}
            className={`flex items-center gap-1 px-2 py-1 text-[10px] font-mono rounded border transition-all ${
              showTrendlines
                ? "bg-purple-500/20 border-purple-500/50 text-purple-300 font-bold"
                : "bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300"
            }`}
            title="Toggle Dynamic Trendlines"
          >
            <Compass className="w-3 h-3" />
            <span>Trendlines</span>
          </button>

          {/* SMAs Toggle */}
          <button
            onClick={() => setShowSMAs(!showSMAs)}
            className={`flex items-center gap-1 px-2 py-1 text-[10px] font-mono rounded border transition-all ${
              showSMAs
                ? "bg-amber-500/20 border-amber-500/50 text-amber-300 font-bold shadow-[0_0_8px_rgba(245,158,11,0.2)]"
                : "bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300"
            }`}
            title="Toggle Simple Moving Averages: SMA 20 (Amber), SMA 50 (Emerald), SMA 200 (Rose)"
          >
            <Sliders className="w-3 h-3" />
            <span>SMAs</span>
          </button>

          {/* EMAs Toggle */}
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

          {/* Bollinger Bands Toggle */}
          <button
            onClick={() => setShowBollinger(!showBollinger)}
            className={`flex items-center gap-1 px-2 py-1 text-[10px] font-mono rounded border transition-all ${
              showBollinger
                ? "bg-indigo-500/20 border-indigo-500/50 text-indigo-300 font-bold"
                : "bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300"
            }`}
            title="Toggle Bollinger Bands (20, 2)"
          >
            <Activity className="w-3 h-3" />
            <span>BB</span>
          </button>

          {/* VWAP Toggle */}
          {indicators?.vwap && (
            <button
              onClick={() => setShowVWAP(!showVWAP)}
              className={`flex items-center gap-1 px-2 py-1 text-[10px] font-mono rounded border transition-all ${
                showVWAP
                  ? "bg-yellow-500/20 border-yellow-500/50 text-yellow-300 font-bold"
                  : "bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300"
              }`}
              title="Toggle Institutional VWAP Line"
            >
              <Target className="w-3 h-3" />
              <span>VWAP</span>
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

      {/* ================= ALL INDICATORS BULLISH / BEARISH SUMMARY PANEL ================= */}
      {showVerdictsDrawer && (
        <div className="px-4 py-2.5 bg-[#080d19] border-b border-slate-800 flex flex-col gap-2 font-mono">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                <Scale className="w-3.5 h-3.5 text-cyan-400" />
                ALL INDICATORS VERDICT MATRIX
              </span>
              <span className={`px-2 py-0.5 rounded font-black text-[11px] ${
                confluenceScore.dominantBias === "BULLISH"
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                  : confluenceScore.dominantBias === "BEARISH"
                  ? "bg-rose-500/20 text-rose-400 border border-rose-500/40"
                  : "bg-amber-500/20 text-amber-400 border border-amber-500/40"
              }`}>
                OVERALL BIAS: {confluenceScore.dominantBias} ({confluenceScore.confidencePct}% CONFLUENCE)
              </span>
            </div>

            {/* Visual Multi-Segment Gauge */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-emerald-400 font-bold">▲ {confluenceScore.bull} Bull</span>
              <div className="w-32 h-2 bg-slate-800 rounded-full overflow-hidden flex">
                <div
                  className="bg-emerald-500 h-full transition-all"
                  style={{ width: `${(confluenceScore.bull / confluenceScore.total) * 100}%` }}
                />
                <div
                  className="bg-amber-400 h-full transition-all"
                  style={{ width: `${(confluenceScore.neut / confluenceScore.total) * 100}%` }}
                />
                <div
                  className="bg-rose-500 h-full transition-all"
                  style={{ width: `${(confluenceScore.bear / confluenceScore.total) * 100}%` }}
                />
              </div>
              <span className="text-[10px] text-rose-400 font-bold">▼ {confluenceScore.bear} Bear</span>
            </div>
          </div>

          {/* Grid of All Indicators */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 pt-1">
            {indicatorVerdicts.map((item, idx) => (
              <div
                key={`verd-${idx}`}
                className={`p-2 rounded border flex flex-col justify-between transition-all ${
                  item.signal === "BULLISH"
                    ? "bg-emerald-950/20 border-emerald-500/30 hover:border-emerald-400/60"
                    : item.signal === "BEARISH"
                    ? "bg-rose-950/20 border-rose-500/30 hover:border-rose-400/60"
                    : "bg-slate-900 border-slate-800"
                }`}
              >
                <div className="flex items-center justify-between gap-1 text-[10px]">
                  <span className="text-slate-300 font-bold truncate">{item.name}</span>
                  <span className={`px-1 py-0.2 rounded text-[9px] font-black ${
                    item.signal === "BULLISH"
                      ? "text-emerald-400 bg-emerald-500/20"
                      : item.signal === "BEARISH"
                      ? "text-rose-400 bg-rose-500/20"
                      : "text-slate-400 bg-slate-800"
                  }`}>
                    {item.signal === "BULLISH" ? "▲ BULL" : item.signal === "BEARISH" ? "▼ BEAR" : "● NEUT"}
                  </span>
                </div>
                <div className="my-1 flex items-baseline justify-between text-[11px] font-bold text-white">
                  <span>{item.value}</span>
                </div>
                <p className="text-[9px] text-slate-400 leading-tight truncate" title={item.description}>
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

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
          <span>Live: <strong className="text-cyan-300 font-mono">${formatPrice(lastPrice)}</strong></span>
          <span>•</span>
          <span>H: High</span>
          <span>L: Low</span>
          <span>C: Close</span>
        </div>
      </div>

      {/* Chart Canvas Area */}
      <div className={`relative p-2 flex-1 bg-[#070a12] ${isFullscreen ? "min-h-[500px]" : "min-h-[360px]"}`}>
        {/* ACTIONABLE TRADE SUGGESTIONS OVERLAY CARD */}
        {showStrategies && activeTradePlan && (
          <div className="absolute top-3 left-4 z-10 flex flex-wrap items-center gap-2.5 bg-[#080d1a]/95 backdrop-blur-md border border-cyan-500/40 p-2 rounded-lg shadow-2xl font-mono text-[11px]">
            <div className="flex items-center gap-1.5">
              <span className={`w-2.5 h-2.5 rounded-full animate-ping ${activeTradePlan.isLong ? "bg-emerald-400" : "bg-rose-400"}`} />
              <span className={`font-black text-xs tracking-wide ${activeTradePlan.isLong ? "text-emerald-400" : "text-rose-400"}`}>
                {activeTradePlan.isLong ? "🟢 LONG (BUY) SIGNAL" : "🔴 SHORT (SELL) SIGNAL"}
              </span>
            </div>

            <span className="text-slate-600 hidden sm:inline">•</span>

            <span className="text-cyan-300 font-bold">
              Entry: ${formatPrice(activeTradePlan.entry)}
            </span>

            <span className="text-slate-600">•</span>

            <span className="text-emerald-400 font-bold">
              TP: ${formatPrice(activeTradePlan.tp)} (+{activeTradePlan.gainPct.toFixed(2)}%)
            </span>

            <span className="text-slate-600">•</span>

            <span className="text-rose-400 font-bold">
              SL: ${formatPrice(activeTradePlan.sl)} (-{activeTradePlan.lossPct.toFixed(2)}%)
            </span>

            <span className="text-slate-600 hidden md:inline">•</span>

            <span className="text-amber-300 font-semibold hidden md:inline">
              R:R 1:{activeTradePlan.rr}
            </span>

            {/* Direct Execute Trade Button */}
            {onExecuteTrade && (
              <button
                onClick={handleTakeTrade}
                disabled={isExecutingTrade}
                className={`ml-2 px-3 py-1 rounded text-xs font-bold text-white shadow-lg flex items-center gap-1.5 transition-all ${
                  isExecutingTrade
                    ? "bg-slate-700 cursor-not-allowed opacity-70"
                    : activeTradePlan.isLong
                    ? "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30 hover:scale-105"
                    : "bg-rose-600 hover:bg-rose-500 shadow-rose-600/30 hover:scale-105"
                }`}
                title="Execute this paper trade now with the exact Entry, SL, and TP"
              >
                {isExecutingTrade ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Executing...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-3.5 h-3.5 fill-white" />
                    <span>PLACE {activeTradePlan.side} TRADE</span>
                  </>
                )}
              </button>
            )}

            {tradeSuccessMsg && (
              <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold text-[10px] animate-fade-in flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                {tradeSuccessMsg}
              </span>
            )}
          </div>
        )}

        {validCandles.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[340px] text-slate-500 font-mono gap-3">
            <div className="w-8 h-8 border-2 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin" />
            <span className="text-xs">Initializing high-frequency chart stream...</span>
          </div>
        ) : (
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="w-full h-auto select-none overflow-visible"
            onMouseMove={handleMouseMove}
            onMouseLeave={() => setHoveredIdx(null)}
          >
            <defs>
              {/* Bollinger Band Shading */}
              <linearGradient id="bbAreaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#818cf8" stopOpacity="0.12" />
                <stop offset="100%" stopColor="#818cf8" stopOpacity="0.03" />
              </linearGradient>

              {/* Shaded AI Confidence Gradient */}
              <linearGradient id="aiConfidenceGradient" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.06" />
              </linearGradient>

              {/* Trade Corridor Profit Zone Gradient (Green) */}
              <linearGradient id="tradeProfitGrad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0.08" />
              </linearGradient>

              {/* Trade Corridor Risk Zone Gradient (Red) */}
              <linearGradient id="tradeRiskGrad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.08" />
              </linearGradient>

              {/* Volume Bar Gradients */}
              <linearGradient id="bullVolGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.65" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0.15" />
              </linearGradient>
              <linearGradient id="bearVolGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.65" />
                <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.15" />
              </linearGradient>
            </defs>

            {/* Horizontal Grid & Price Ticks */}
            {[0, 1, 2, 3, 4, 5].map((step) => {
              const p = minPrice + (priceRange / 5) * step;
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
                    fontSize={isFullscreen ? 11 : 10}
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
              VOLUME HISTOGRAM {volumeSMA20.length > 0 && "• 20-SMA (CYAN LINE)"}
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

            {/* Volume SMA Line */}
            {volSMAPath && (
              <path
                d={volSMAPath}
                fill="none"
                stroke="#22d3ee"
                strokeWidth={1.2}
                opacity={0.6}
              />
            )}

            {/* ================= BOLLINGER BANDS ================= */}
            {showBollinger && (
              <g id="bollinger-bands-layer">
                {bbAreaPath && <path d={bbAreaPath} fill="url(#bbAreaGrad)" />}
                {bbUpperPath && (
                  <path d={bbUpperPath} fill="none" stroke="#818cf8" strokeWidth={1} strokeDasharray="3 2" opacity={0.7} />
                )}
                {bbMiddlePath && (
                  <path d={bbMiddlePath} fill="none" stroke="#6366f1" strokeWidth={1} opacity={0.45} />
                )}
                {bbLowerPath && (
                  <path d={bbLowerPath} fill="none" stroke="#818cf8" strokeWidth={1} strokeDasharray="3 2" opacity={0.7} />
                )}
              </g>
            )}

            {/* ================= VWAP LINE ================= */}
            {showVWAP && indicators?.vwap && indicators.vwap >= minPrice && indicators.vwap <= maxPrice && (
              <g id="vwap-layer">
                <line
                  x1={padding.left}
                  y1={getY(indicators.vwap)}
                  x2={width - padding.right}
                  y2={getY(indicators.vwap)}
                  stroke="#fbbf24"
                  strokeDasharray="4 3"
                  strokeWidth={1.5}
                  opacity={0.8}
                />
                <g transform={`translate(${width - padding.right + 2}, ${getY(indicators.vwap) - 8})`}>
                  <rect width={65} height={15} fill="#271d07" stroke="#fbbf24" strokeWidth={0.8} rx={2} />
                  <text x={32} y={11} fill="#fde68a" fontSize={8} fontFamily="JetBrains Mono" fontWeight="bold" textAnchor="middle">
                    VWAP
                  </text>
                </g>
              </g>
            )}

            {/* ================= SUPPORT & RESISTANCE LEVELS ================= */}
            {showSupportResistance && (
              <g id="sr-levels-layer">
                {swings.resLevels.map((r, idx) => {
                  if (r < minPrice || r > maxPrice) return null;
                  const ry = getY(r);
                  return (
                    <g key={`res-${idx}`}>
                      <line
                        x1={padding.left}
                        y1={ry}
                        x2={width - padding.right}
                        y2={ry}
                        stroke="#f43f5e"
                        strokeDasharray="4 3"
                        strokeWidth={1.2}
                        opacity={0.8}
                      />
                      <g transform={`translate(${padding.left + 6}, ${ry - 7})`}>
                        <rect width={95} height={14} fill="#290a12" stroke="#f43f5e" strokeWidth={0.8} rx={2} />
                        <text x={47} y={10} fill="#fca5a5" fontSize={8} fontFamily="JetBrains Mono" fontWeight="bold" textAnchor="middle">
                          RES: ${formatPrice(r)}
                        </text>
                      </g>
                    </g>
                  );
                })}

                {swings.supLevels.map((s, idx) => {
                  if (s < minPrice || s > maxPrice) return null;
                  const sy = getY(s);
                  return (
                    <g key={`sup-${idx}`}>
                      <line
                        x1={padding.left}
                        y1={sy}
                        x2={width - padding.right}
                        y2={sy}
                        stroke="#10b981"
                        strokeDasharray="4 3"
                        strokeWidth={1.2}
                        opacity={0.8}
                      />
                      <g transform={`translate(${padding.left + 6}, ${sy - 7})`}>
                        <rect width={95} height={14} fill="#062419" stroke="#10b981" strokeWidth={0.8} rx={2} />
                        <text x={47} y={10} fill="#86efac" fontSize={8} fontFamily="JetBrains Mono" fontWeight="bold" textAnchor="middle">
                          SUP: ${formatPrice(s)}
                        </text>
                      </g>
                    </g>
                  );
                })}
              </g>
            )}

            {/* ================= DYNAMIC TRENDLINES ================= */}
            {showTrendlines && trendlines && (
              <g id="trendlines-layer">
                {trendlines.resLine && (
                  <line
                    x1={trendlines.resLine.x1}
                    y1={trendlines.resLine.y1}
                    x2={trendlines.resLine.x2}
                    y2={trendlines.resLine.y2}
                    stroke="#c084fc"
                    strokeDasharray="5 3"
                    strokeWidth={1.5}
                    opacity={0.85}
                  />
                )}
                {trendlines.supLine && (
                  <line
                    x1={trendlines.supLine.x1}
                    y1={trendlines.supLine.y1}
                    x2={trendlines.supLine.x2}
                    y2={trendlines.supLine.y2}
                    stroke="#38bdf8"
                    strokeDasharray="5 3"
                    strokeWidth={1.5}
                    opacity={0.85}
                  />
                )}
              </g>
            )}

            {/* ================= ACTIONABLE TRADE SETUP CORRIDOR (TP / SL / ENTRY) ================= */}
            {showStrategies && activeTradePlan && (
              <g id="trade-corridor-layer">
                {/* 1. Shaded Profit Zone Box */}
                {(() => {
                  const entryY = getY(activeTradePlan.entry);
                  const tpY = getY(activeTradePlan.tp);
                  const topY = Math.min(entryY, tpY);
                  const boxH = Math.max(Math.abs(entryY - tpY), 3);
                  return (
                    <g>
                      <rect
                        x={lastCandleX}
                        y={topY}
                        width={corridorWidth}
                        height={boxH}
                        fill="url(#tradeProfitGrad)"
                        stroke="#10b981"
                        strokeWidth={1}
                        strokeDasharray="3 3"
                        rx={3}
                      />
                      <text
                        x={lastCandleX + 8}
                        y={topY + 13}
                        fill="#86efac"
                        fontSize={8}
                        fontFamily="JetBrains Mono"
                        fontWeight="bold"
                      >
                        TARGET PROFIT ZONE (+{activeTradePlan.gainPct.toFixed(2)}%)
                      </text>
                    </g>
                  );
                })()}

                {/* 2. Shaded Risk Zone Box */}
                {(() => {
                  const entryY = getY(activeTradePlan.entry);
                  const slY = getY(activeTradePlan.sl);
                  const topY = Math.min(entryY, slY);
                  const boxH = Math.max(Math.abs(entryY - slY), 3);
                  return (
                    <g>
                      <rect
                        x={lastCandleX}
                        y={topY}
                        width={corridorWidth}
                        height={boxH}
                        fill="url(#tradeRiskGrad)"
                        stroke="#f43f5e"
                        strokeWidth={1}
                        strokeDasharray="3 3"
                        rx={3}
                      />
                      <text
                        x={lastCandleX + 8}
                        y={topY + 13}
                        fill="#fca5a5"
                        fontSize={8}
                        fontFamily="JetBrains Mono"
                        fontWeight="bold"
                      >
                        RISK STOP ZONE (-{activeTradePlan.lossPct.toFixed(2)}%)
                      </text>
                    </g>
                  );
                })()}

                {/* 3. Take Profit Line & Axis Tag */}
                <line
                  x1={lastCandleX}
                  y1={getY(activeTradePlan.tp)}
                  x2={width - padding.right}
                  y2={getY(activeTradePlan.tp)}
                  stroke="#10b981"
                  strokeWidth={2}
                  strokeDasharray="4 2"
                />
                <g transform={`translate(${width - padding.right + 2}, ${getY(activeTradePlan.tp) - 10})`}>
                  <rect width={isFullscreen ? 115 : 100} height={20} fill="#062419" stroke="#10b981" strokeWidth={1.5} rx={3} />
                  <text x={isFullscreen ? 57 : 50} y={13} fill="#86efac" fontSize={isFullscreen ? 10 : 9} fontFamily="JetBrains Mono" fontWeight="bold" textAnchor="middle">
                    🎯 TP: ${formatPrice(activeTradePlan.tp)}
                  </text>
                </g>

                {/* 4. Stop Loss Line & Axis Tag */}
                <line
                  x1={lastCandleX}
                  y1={getY(activeTradePlan.sl)}
                  x2={width - padding.right}
                  y2={getY(activeTradePlan.sl)}
                  stroke="#f43f5e"
                  strokeWidth={2}
                  strokeDasharray="4 2"
                />
                <g transform={`translate(${width - padding.right + 2}, ${getY(activeTradePlan.sl) - 10})`}>
                  <rect width={isFullscreen ? 115 : 100} height={20} fill="#290a12" stroke="#f43f5e" strokeWidth={1.5} rx={3} />
                  <text x={isFullscreen ? 57 : 50} y={13} fill="#fca5a5" fontSize={isFullscreen ? 10 : 9} fontFamily="JetBrains Mono" fontWeight="bold" textAnchor="middle">
                    🛑 SL: ${formatPrice(activeTradePlan.sl)}
                  </text>
                </g>

                {/* 5. Entry Line & Axis Tag */}
                <line
                  x1={padding.left}
                  y1={getY(activeTradePlan.entry)}
                  x2={width - padding.right}
                  y2={getY(activeTradePlan.entry)}
                  stroke="#22d3ee"
                  strokeWidth={1.8}
                  strokeDasharray="3 3"
                />
                <g transform={`translate(${width - padding.right + 2}, ${getY(activeTradePlan.entry) - 10})`}>
                  <rect width={isFullscreen ? 115 : 100} height={20} fill="#082f49" stroke="#22d3ee" strokeWidth={1.5} rx={3} />
                  <text x={isFullscreen ? 57 : 50} y={13} fill="#38bdf8" fontSize={isFullscreen ? 10 : 9} fontFamily="JetBrains Mono" fontWeight="bold" textAnchor="middle">
                    ⚡ ENTRY: ${formatPrice(activeTradePlan.entry)}
                  </text>
                </g>
              </g>
            )}

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

            {/* ================= SIMPLE MOVING AVERAGES (SMA 20, 50, 200) ================= */}
            {showSMAs && (
              <g id="sma-layers">
                {sma20Path && (
                  <path
                    d={sma20Path}
                    fill="none"
                    stroke="#f59e0b"
                    strokeWidth={1.6}
                    strokeLinecap="round"
                    opacity={0.9}
                  />
                )}
                {sma50Path && (
                  <path
                    d={sma50Path}
                    fill="none"
                    stroke="#10b981"
                    strokeWidth={1.6}
                    strokeLinecap="round"
                    opacity={0.85}
                  />
                )}
                {sma200Path && (
                  <path
                    d={sma200Path}
                    fill="none"
                    stroke="#f43f5e"
                    strokeWidth={2}
                    strokeLinecap="round"
                    opacity={0.9}
                  />
                )}
              </g>
            )}

            {/* ================= EXPONENTIAL MOVING AVERAGES (EMA 20, 50) ================= */}
            {showEMAs && (
              <g id="ema-layers">
                {ema20Path && (
                  <path
                    d={ema20Path}
                    fill="none"
                    stroke="#06b6d4"
                    strokeWidth={1.8}
                    strokeLinecap="round"
                    opacity={0.9}
                  />
                )}
                {ema50Path && (
                  <path
                    d={ema50Path}
                    fill="none"
                    stroke="#a855f7"
                    strokeWidth={1.8}
                    strokeLinecap="round"
                    opacity={0.85}
                  />
                )}
              </g>
            )}

            {/* ================= STRATEGY BUY/SELL BADGES ON CANDLES ================= */}
            {showStrategies && strategySignals.map((sig, sIdx) => {
              const cx = getX(sig.index);
              const isBuy = sig.type === "BUY";
              const sy = getY(sig.price) + (isBuy ? 18 : -18);
              return (
                <g key={`sig-${sIdx}`} transform={`translate(${cx}, ${sy})`}>
                  <path
                    d={isBuy ? "M 0,-5 L 4,2 L -4,2 Z" : "M 0,5 L 4,-2 L -4,-2 Z"}
                    fill={isBuy ? "#10b981" : "#f43f5e"}
                  />
                  <rect
                    x={-28}
                    y={isBuy ? 4 : -16}
                    width={56}
                    height={12}
                    fill="#0a0f1d"
                    stroke={isBuy ? "#10b981" : "#f43f5e"}
                    strokeWidth={0.7}
                    rx={2}
                  />
                  <text
                    x={0}
                    y={isBuy ? 12 : -8}
                    fill={isBuy ? "#86efac" : "#fca5a5"}
                    fontSize={7}
                    fontFamily="JetBrains Mono"
                    fontWeight="bold"
                    textAnchor="middle"
                  >
                    {sig.label}
                  </text>
                </g>
              );
            })}

            {/* Real-Time Pulsating Live Price Line */}
            <g id="live-price-line">
              <line
                x1={padding.left}
                y1={getY(lastPrice)}
                x2={width - padding.right}
                y2={getY(lastPrice)}
                stroke="#22d3ee"
                strokeDasharray="2 3"
                strokeWidth={1}
                opacity={0.7}
              />
              <g transform={`translate(${width - padding.right + 2}, ${getY(lastPrice) - 9})`}>
                <rect
                  width={isFullscreen ? 85 : 70}
                  height={18}
                  fill="#082f49"
                  stroke="#22d3ee"
                  strokeWidth={1.2}
                  rx={2}
                />
                <text
                  x={isFullscreen ? 42 : 35}
                  y={12}
                  fill="#38bdf8"
                  fontSize={10}
                  fontFamily="JetBrains Mono"
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  ${formatPrice(lastPrice)}
                </text>
              </g>
            </g>

            {/* Interactive Crosshair & Price Tag on Hover */}
            {hoveredIdx !== null && validCandles[hoveredIdx] && (
              <g pointerEvents="none">
                <line
                  x1={getX(hoveredIdx)}
                  y1={padding.top}
                  x2={getX(hoveredIdx)}
                  y2={volPlotTop + volPlotH}
                  stroke="#94a3b8"
                  strokeDasharray="2 2"
                  strokeWidth={1}
                />
                <line
                  x1={padding.left}
                  y1={getY(validCandles[hoveredIdx].close)}
                  x2={width - padding.right}
                  y2={getY(validCandles[hoveredIdx].close)}
                  stroke="#94a3b8"
                  strokeDasharray="2 2"
                  strokeWidth={1}
                />
                <g transform={`translate(${width - padding.right + 2}, ${getY(validCandles[hoveredIdx].close) - 9})`}>
                  <rect
                    width={isFullscreen ? 85 : 70}
                    height={18}
                    fill="#1e293b"
                    stroke="#06b6d4"
                    strokeWidth={1}
                    rx={2}
                  />
                  <text
                    x={isFullscreen ? 42 : 35}
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
            QUANTITATIVE SIGNAL OSCILLATORS &amp; MOMENTUM
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

          {/* 2. Trend Alignment */}
          <div className="bg-[#111728] border border-slate-800/90 rounded-md p-2.5 flex flex-col justify-between">
            <div className="flex justify-between items-center text-[10px]">
              <span className="text-slate-400">Trend Alignment</span>
              <span className="px-1.5 py-0.2 rounded text-[9px] bg-slate-800 text-cyan-300 font-mono">
                EMA &amp; SMA
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

function formatPrice(val?: number | null): string {
  if (typeof val !== "number" || isNaN(val)) return "0.00";
  if (val >= 1000) return val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (val >= 1) return val.toFixed(4);
  return val.toFixed(6);
}

function formatCompact(val?: number | null): string {
  if (typeof val !== "number" || isNaN(val)) return "0.0";
  if (val >= 1_000_000) return (val / 1_000_000).toFixed(2) + "M";
  if (val >= 1_000) return (val / 1_000).toFixed(1) + "K";
  return val.toFixed(1);
}
