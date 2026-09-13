"use client";

import React, { useEffect, useRef, useState, useMemo } from "react";
import { TechnicalIndicators, TradingDecision } from "@/types/market";
import {
  Maximize2,
  Minimize2,
  ExternalLink,
  RefreshCw,
  BarChart2,
  Shield,
  Zap,
  TrendingUp,
  TrendingDown,
  Layers,
  CheckCircle2,
  Activity,
  Sliders,
  ChevronDown,
  ChevronUp,
  Target
} from "lucide-react";

declare global {
  interface Window {
    TradingView?: {
      widget: new (options: any) => any;
    };
  }
}

interface TradingViewAdvancedChartProps {
  symbol?: string;
  defaultInterval?: string;
  className?: string;
  indicators?: TechnicalIndicators | null;
  decision?: TradingDecision | null;
  currentPrice?: number;
  onExecuteTrade?: (side?: "BUY" | "SELL", entry?: number, sl?: number, tp?: number) => void;
  isExecutingTrade?: boolean;
}

const SYMBOL_MAPPING: Record<string, string> = {
  "BTC/USDT": "BINANCE:BTCUSDT",
  "ETH/USDT": "BINANCE:ETHUSDT",
  "SOL/USDT": "BINANCE:SOLUSDT",
  "BNB/USDT": "BINANCE:BNBUSDT",
  "XRP/USDT": "BINANCE:XRPUSDT",
  "DOGE/USDT": "BINANCE:DOGEUSDT",
  "ADA/USDT": "BINANCE:ADAUSDT",
  "AVAX/USDT": "BINANCE:AVAXUSDT",
  "LINK/USDT": "BINANCE:LINKUSDT",
  "SUI/USDT": "BINANCE:SUIUSDT",
  "PEPE/USDT": "BINANCE:PEPEUSDT",
  "NEAR/USDT": "BINANCE:NEARUSDT",
};

interface IndicatorVerdict {
  name: string;
  category: "MOMENTUM" | "TREND" | "VOLATILITY" | "BENCHMARK";
  value: string;
  signal: "BULLISH" | "BEARISH" | "NEUTRAL";
  description: string;
}

export const TradingViewAdvancedChart: React.FC<TradingViewAdvancedChartProps> = ({
  symbol = "BTC/USDT",
  defaultInterval = "60",
  className = "",
  indicators = null,
  decision = null,
  currentPrice = 0,
  onExecuteTrade,
  isExecutingTrade = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeInterval, setActiveInterval] = useState(defaultInterval);
  const [showVerdictDrawer, setShowVerdictDrawer] = useState(true);
  const [signalMode, setSignalMode] = useState<"AI" | "LONG" | "SHORT">("AI");
  const [selectedStudyPreset, setSelectedStudyPreset] = useState<string>("ALL");
  const [tradeSuccessMsg, setTradeSuccessMsg] = useState<string | null>(null);

  const containerId = `tv_chart_container_${symbol.replace(/[^a-zA-Z0-9]/g, "_")}`;

  const cleanSymbol = symbol.trim().toUpperCase();
  const tvSymbol = SYMBOL_MAPPING[cleanSymbol] || `BINANCE:${cleanSymbol.replace(/[^a-zA-Z0-9]/g, "")}`;

  const lastPrice = currentPrice > 0 ? currentPrice : decision?.current_price || 70000;

  // 1. Calculate 8-Indicator Bullish/Bearish Verdict Matrix for TradingView View
  const indicatorVerdicts = useMemo<IndicatorVerdict[]>(() => {
    const verdicts: IndicatorVerdict[] = [];

    // RSI
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
        description: "Overbought zone — seller exhaustion risk",
      });
    } else {
      verdicts.push({
        name: "RSI (14)",
        category: "MOMENTUM",
        value: rsiVal.toFixed(1),
        signal: rsiVal >= 50 ? "BULLISH" : "BEARISH",
        description: rsiVal >= 50 ? "Bullish momentum dominance" : "Bearish momentum dominance",
      });
    }

    // MACD
    const macdHist = typeof indicators?.macd_hist === "number" ? indicators.macd_hist : 0;
    verdicts.push({
      name: "MACD Histogram",
      category: "MOMENTUM",
      value: macdHist >= 0 ? `+${macdHist.toFixed(2)}` : macdHist.toFixed(2),
      signal: macdHist > 0.5 ? "BULLISH" : macdHist < -0.5 ? "BEARISH" : "NEUTRAL",
      description: macdHist > 0 ? "Bullish convergence expanding" : "Bearish divergence expanding",
    });

    // EMA 20 vs 50
    const ema20 = indicators?.ema_20;
    const ema50 = indicators?.ema_50;
    if (ema20 && ema50) {
      const isGolden = ema20 >= ema50;
      verdicts.push({
        name: "EMA 20 / 50",
        category: "TREND",
        value: `$${ema20.toLocaleString(undefined, { maximumFractionDigits: 1 })}`,
        signal: isGolden ? "BULLISH" : "BEARISH",
        description: isGolden ? "Golden Trend (EMA 20 > EMA 50)" : "Death Cross (EMA 20 < EMA 50)",
      });
    }

    // SMA 20
    const sma20 = indicators?.sma_20;
    if (sma20) {
      const isAbove = lastPrice >= sma20;
      verdicts.push({
        name: "SMA 20 (Fast)",
        category: "TREND",
        value: `$${sma20.toLocaleString(undefined, { maximumFractionDigits: 1 })}`,
        signal: isAbove ? "BULLISH" : "BEARISH",
        description: isAbove ? "Price holding above 20 SMA" : "Price broken below 20 SMA",
      });
    }

    // SMA 50
    const sma50 = indicators?.sma_50;
    if (sma50) {
      const isAbove = lastPrice >= sma50;
      verdicts.push({
        name: "SMA 50 (Med)",
        category: "TREND",
        value: `$${sma50.toLocaleString(undefined, { maximumFractionDigits: 1 })}`,
        signal: isAbove ? "BULLISH" : "BEARISH",
        description: isAbove ? "Intermediate trend bullish" : "Intermediate trend bearish",
      });
    }

    // SMA 200
    const sma200 = indicators?.sma_200;
    if (sma200) {
      const isAbove = lastPrice >= sma200;
      verdicts.push({
        name: "SMA 200 (Macro)",
        category: "TREND",
        value: `$${sma200.toLocaleString(undefined, { maximumFractionDigits: 1 })}`,
        signal: isAbove ? "BULLISH" : "BEARISH",
        description: isAbove ? "Macro Bull Regime (Price > 200 SMA)" : "Macro Bear Regime (Price < 200 SMA)",
      });
    }

    // VWAP
    const vwap = indicators?.vwap;
    if (vwap && vwap > 0) {
      const isAbove = lastPrice >= vwap;
      verdicts.push({
        name: "VWAP Benchmark",
        category: "BENCHMARK",
        value: `$${vwap.toLocaleString(undefined, { maximumFractionDigits: 1 })}`,
        signal: isAbove ? "BULLISH" : "BEARISH",
        description: isAbove ? "Trading at Institutional Premium" : "Trading at Institutional Discount",
      });
    }

    // Bollinger Bands
    const bbUpper = indicators?.bb_upper;
    const bbLower = indicators?.bb_lower;
    const bbMid = indicators?.bb_middle;
    if (bbUpper && bbLower) {
      if (lastPrice <= bbLower) {
        verdicts.push({
          name: "Bollinger Bands",
          category: "VOLATILITY",
          value: "Lower Band Touch",
          signal: "BULLISH",
          description: "Oversold bounce opportunity",
        });
      } else if (lastPrice >= bbUpper) {
        verdicts.push({
          name: "Bollinger Bands",
          category: "VOLATILITY",
          value: "Upper Band Touch",
          signal: "BEARISH",
          description: "Overbought rejection resistance",
        });
      } else {
        verdicts.push({
          name: "Bollinger Bands",
          category: "VOLATILITY",
          value: "Mid-Channel",
          signal: lastPrice >= (bbMid || (bbUpper + bbLower) / 2) ? "BULLISH" : "BEARISH",
          description: "Trading inside volatility envelope",
        });
      }
    }

    return verdicts;
  }, [indicators, lastPrice]);

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

  // Actionable Trade Plan (Entry, SL, TP, R:R)
  const activeTradePlan = useMemo(() => {
    const entry = lastPrice;
    let side: "BUY" | "SELL" = "BUY";

    if (signalMode === "LONG") {
      side = "BUY";
    } else if (signalMode === "SHORT") {
      side = "SELL";
    } else {
      if (confluenceScore.dominantBias === "BEARISH" || decision?.action?.includes("SELL")) {
        side = "SELL";
      } else {
        side = "BUY";
      }
    }

    let tp = 0;
    let sl = 0;

    if (side === "BUY") {
      sl = decision && decision.stop_loss < entry && decision.stop_loss > 0
        ? decision.stop_loss
        : entry * 0.978;
      tp = decision && decision.take_profit_1 > entry
        ? decision.take_profit_1
        : entry * 1.045;
    } else {
      sl = decision && decision.stop_loss > entry
        ? decision.stop_loss
        : entry * 1.022;
      tp = decision && decision.take_profit_1 < entry && decision.take_profit_1 > 0
        ? decision.take_profit_1
        : entry * 0.955;
    }

    const riskAmt = Math.abs(entry - sl) || 1.0;
    const rewardAmt = Math.abs(tp - entry) || 1.0;
    const rr = Number((rewardAmt / riskAmt).toFixed(2));
    const gainPct = side === "BUY" ? ((tp - entry) / entry) * 100 : ((entry - tp) / entry) * 100;
    const lossPct = side === "BUY" ? ((entry - sl) / entry) * 100 : ((sl - entry) / entry) * 100;

    return {
      side,
      entry,
      sl,
      tp,
      rr,
      gainPct: Number(gainPct.toFixed(2)),
      lossPct: Number(lossPct.toFixed(2)),
      label: side === "BUY" ? "LONG POSITION" : "SHORT POSITION",
    };
  }, [signalMode, confluenceScore.dominantBias, decision, lastPrice]);

  // Determine which studies to load in TradingView
  const getStudiesForPreset = (preset: string) => {
    switch (preset) {
      case "MOMENTUM":
        return ["STD;RSI", "STD;MACD"];
      case "TREND":
        return ["STD;EMA", "STD;SMA", "STD;Bollinger_Bands"];
      case "VOLATILITY":
        return ["STD;Bollinger_Bands", "STD;Average_True_Range"];
      case "ALL":
      default:
        return [
          "STD;RSI",
          "STD;MACD",
          "STD;Bollinger_Bands",
          "STD;EMA",
          "STD;SMA",
          "STD;VWAP"
        ];
    }
  };

  // Initialize or re-initialize TradingView Widget
  useEffect(() => {
    let isCancelled = false;

    const initWidget = () => {
      if (isCancelled || !containerRef.current) return;

      const containerEl = document.getElementById(containerId);
      if (containerEl) {
        containerEl.innerHTML = "";
      }

      if (window.TradingView && window.TradingView.widget) {
        try {
          new window.TradingView.widget({
            autosize: true,
            symbol: tvSymbol,
            interval: activeInterval,
            timezone: "Etc/UTC",
            theme: "dark",
            style: "1",
            locale: "en",
            toolbar_bg: "#06090e",
            enable_publishing: false,
            allow_symbol_change: true,
            container_id: containerId,
            hide_side_toolbar: false,
            withdateranges: true,
            hide_volume: false,
            save_image: true,
            studies: getStudiesForPreset(selectedStudyPreset),
            disabled_features: [
              "use_localstorage_for_settings"
            ],
            enabled_features: [
              "study_templates",
              "create_volume_indicator_by_default"
            ],
            overrides: {
              "mainSeriesProperties.candleStyle.upColor": "#10b981",
              "mainSeriesProperties.candleStyle.downColor": "#f43f5e",
              "mainSeriesProperties.candleStyle.drawWick": true,
              "mainSeriesProperties.candleStyle.drawBorder": true,
              "mainSeriesProperties.candleStyle.borderColor": "#374151",
              "mainSeriesProperties.candleStyle.borderUpColor": "#10b981",
              "mainSeriesProperties.candleStyle.borderDownColor": "#f43f5e",
              "mainSeriesProperties.candleStyle.wickUpColor": "#10b981",
              "mainSeriesProperties.candleStyle.wickDownColor": "#f43f5e",
              "paneProperties.background": "#070a0f",
              "paneProperties.vertGridProperties.color": "rgba(255, 255, 255, 0.04)",
              "paneProperties.horzGridProperties.color": "rgba(255, 255, 255, 0.04)",
            },
            support_host: "https://www.tradingview.com",
          });
        } catch (err) {
          console.error("Failed to initialize TradingView widget:", err);
        }
      }
    };

    if (!window.TradingView) {
      const existingScript = document.getElementById("tradingview-tvjs-script");
      if (!existingScript) {
        const scriptTag = document.createElement("script");
        scriptTag.id = "tradingview-tvjs-script";
        scriptTag.src = "https://s3.tradingview.com/tv.js";
        scriptTag.type = "text/javascript";
        scriptTag.async = true;
        scriptTag.onload = () => {
          setTimeout(initWidget, 100);
        };
        document.head.appendChild(scriptTag);
      } else {
        existingScript.addEventListener("load", () => {
          setTimeout(initWidget, 100);
        });
      }
    } else {
      setTimeout(initWidget, 50);
    }

    return () => {
      isCancelled = true;
      const containerEl = document.getElementById(containerId);
      if (containerEl) {
        containerEl.innerHTML = "";
      }
    };
  }, [tvSymbol, activeInterval, containerId, selectedStudyPreset]);

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

  const handleExecute = () => {
    if (!onExecuteTrade) return;
    onExecuteTrade(activeTradePlan.side, activeTradePlan.entry, activeTradePlan.sl, activeTradePlan.tp);
    setTradeSuccessMsg(`Order placed: ${activeTradePlan.side} at $${activeTradePlan.entry.toLocaleString()} (TP: $${activeTradePlan.tp.toLocaleString()} | SL: $${activeTradePlan.sl.toLocaleString()})`);
    setTimeout(() => setTradeSuccessMsg(null), 5000);
  };

  return (
    <div
      ref={containerRef}
      className={`relative flex flex-col bg-slate-950/90 border border-slate-800 rounded-xl overflow-hidden transition-all duration-300 ${
        isFullscreen
          ? "fixed inset-0 z-50 w-screen h-screen rounded-none bg-slate-950 p-3"
          : "w-full"
      } ${className}`}
      style={{ minHeight: isFullscreen ? "100vh" : "680px" }}
    >
      {/* 1. Top Header: Ticker, Indicator Verdict Toggle & Controls */}
      <div className="flex flex-wrap items-center justify-between px-3 py-2 bg-slate-900/90 border-b border-slate-800 text-xs gap-2 shrink-0">
        {/* Left: Ticker & Verdict Button */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/30 text-blue-400 font-bold font-mono">
            <BarChart2 className="w-3.5 h-3.5 text-blue-400" />
            <span>TradingView Advanced Charts</span>
          </div>

          <span className="font-mono font-bold text-white text-sm bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700">
            {tvSymbol}
          </span>

          {/* Indicator Verdict Drawer Toggle */}
          <button
            onClick={() => setShowVerdictDrawer(!showVerdictDrawer)}
            className={`flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-mono rounded border transition-colors ${
              confluenceScore.dominantBias === "BULLISH"
                ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/25"
                : confluenceScore.dominantBias === "BEARISH"
                ? "bg-rose-500/15 border-rose-500/40 text-rose-300 hover:bg-rose-500/25"
                : "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
            }`}
          >
            <Sliders className="w-3 h-3" />
            <span>
              Indicators: {confluenceScore.bull} Bull / {confluenceScore.bear} Bear
            </span>
            {showVerdictDrawer ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>

        {/* Center: Studies Presets */}
        <div className="flex items-center gap-1 bg-slate-950/80 p-0.5 rounded-lg border border-slate-800/80 font-mono text-[11px]">
          <span className="text-[10px] text-slate-500 px-1">Studies:</span>
          {[
            { label: "All Pro (6)", value: "ALL" },
            { label: "RSI & MACD", value: "MOMENTUM" },
            { label: "EMAs & SMAs", value: "TREND" },
            { label: "Bollinger", value: "VOLATILITY" },
          ].map((preset) => (
            <button
              key={preset.value}
              onClick={() => setSelectedStudyPreset(preset.value)}
              className={`px-2 py-0.5 rounded transition-colors ${
                selectedStudyPreset === preset.value
                  ? "bg-blue-600 text-white font-bold"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>

        {/* Right: Timeframes & Fullscreen */}
        <div className="flex items-center gap-2">
          {/* Timeframe Buttons */}
          <div className="flex items-center gap-0.5 bg-slate-950/80 p-0.5 rounded border border-slate-800 font-mono text-[11px]">
            {[
              { label: "1m", value: "1" },
              { label: "5m", value: "5" },
              { label: "15m", value: "15" },
              { label: "1h", value: "60" },
              { label: "4h", value: "240" },
              { label: "1D", value: "D" },
            ].map((tf) => (
              <button
                key={tf.value}
                onClick={() => setActiveInterval(tf.value)}
                className={`px-1.5 py-0.5 rounded transition-colors ${
                  activeInterval === tf.value
                    ? "bg-blue-600 text-white font-bold"
                    : "text-slate-400 hover:text-white hover:bg-slate-800"
                }`}
              >
                {tf.label}
              </button>
            ))}
          </div>

          <a
            href={`https://www.tradingview.com/chart/?symbol=${encodeURIComponent(tvSymbol)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 px-2 py-1 text-[11px] font-mono text-slate-400 hover:text-white bg-slate-800/50 hover:bg-slate-800 rounded border border-slate-700/50 transition-colors"
          >
            <ExternalLink className="w-3 h-3" />
            <span className="hidden md:inline">Open on TV</span>
          </a>

          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono rounded border transition-colors ${
              isFullscreen
                ? "bg-amber-500/20 text-amber-400 border-amber-500/40 hover:bg-amber-500/30"
                : "bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700"
            }`}
          >
            {isFullscreen ? (
              <>
                <Minimize2 className="w-3.5 h-3.5" />
                <span>Exit Fullscreen</span>
              </>
            ) : (
              <>
                <Maximize2 className="w-3.5 h-3.5" />
                <span>Fullscreen</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 2. 8-Indicator Bullish/Bearish Verdict Drawer (Collapsible) */}
      {showVerdictDrawer && (
        <div className="bg-[#0a0f1d] border-b border-slate-800/90 px-3 py-2 flex flex-col gap-2 font-mono text-xs animate-in fade-in duration-200">
          {/* Confluence Meter Bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-slate-400 text-[11px]">8-Indicator Confluence Consensus:</span>
              <span
                className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                  confluenceScore.dominantBias === "BULLISH"
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                    : confluenceScore.dominantBias === "BEARISH"
                    ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                    : "bg-slate-800 text-slate-300 border border-slate-700"
                }`}
              >
                {confluenceScore.dominantBias} ({confluenceScore.confidencePct}% Consensus)
              </span>
            </div>

            {/* Visual Multi-Segment Bar */}
            <div className="flex items-center gap-1 w-full sm:w-64">
              <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden flex">
                <div
                  style={{ width: `${(confluenceScore.bull / confluenceScore.total) * 100}%` }}
                  className="bg-emerald-500 transition-all duration-300"
                  title={`${confluenceScore.bull} Bullish`}
                />
                <div
                  style={{ width: `${(confluenceScore.neut / confluenceScore.total) * 100}%` }}
                  className="bg-slate-600 transition-all duration-300"
                  title={`${confluenceScore.neut} Neutral`}
                />
                <div
                  style={{ width: `${(confluenceScore.bear / confluenceScore.total) * 100}%` }}
                  className="bg-rose-500 transition-all duration-300"
                  title={`${confluenceScore.bear} Bearish`}
                />
              </div>
              <span className="text-[10px] text-slate-400 whitespace-nowrap">
                {confluenceScore.bull}B / {confluenceScore.bear}S
              </span>
            </div>
          </div>

          {/* Grid of Indicator Verdict Pills */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-1.5">
            {indicatorVerdicts.map((v, i) => (
              <div
                key={i}
                className={`flex flex-col p-1.5 rounded border ${
                  v.signal === "BULLISH"
                    ? "bg-emerald-950/20 border-emerald-500/30 text-emerald-300"
                    : v.signal === "BEARISH"
                    ? "bg-rose-950/20 border-rose-500/30 text-rose-300"
                    : "bg-slate-900/40 border-slate-800 text-slate-400"
                }`}
              >
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-slate-400 truncate">{v.name}</span>
                  <span
                    className={`font-bold text-[9px] px-1 rounded ${
                      v.signal === "BULLISH"
                        ? "bg-emerald-500/20 text-emerald-400"
                        : v.signal === "BEARISH"
                        ? "bg-rose-500/20 text-rose-400"
                        : "bg-slate-800 text-slate-400"
                    }`}
                  >
                    {v.signal}
                  </span>
                </div>
                <div className="text-[11px] font-bold mt-0.5 text-white truncate">{v.value}</div>
                <div className="text-[9px] text-slate-500 truncate mt-0.5">{v.description}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. Actionable Strategy & Signal Corridor Banner (Long, Short, AI Auto) */}
      <div className="bg-[#080d18] border-b border-slate-800 px-3 py-1.5 flex flex-wrap items-center justify-between gap-2 font-mono text-xs">
        {/* Signal Mode Buttons */}
        <div className="flex items-center gap-1">
          <span className="text-slate-500 text-[10px] uppercase tracking-wider mr-1">Signal Setup:</span>
          <button
            onClick={() => setSignalMode("AI")}
            className={`px-2 py-0.5 rounded text-[11px] font-bold transition-colors ${
              signalMode === "AI"
                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-sm"
                : "text-slate-400 hover:text-slate-200 bg-slate-900 border border-slate-800"
            }`}
          >
            AI AUTO
          </button>
          <button
            onClick={() => setSignalMode("LONG")}
            className={`px-2 py-0.5 rounded text-[11px] font-bold transition-colors ${
              signalMode === "LONG"
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 shadow-sm"
                : "text-slate-400 hover:text-slate-200 bg-slate-900 border border-slate-800"
            }`}
          >
            LONG
          </button>
          <button
            onClick={() => setSignalMode("SHORT")}
            className={`px-2 py-0.5 rounded text-[11px] font-bold transition-colors ${
              signalMode === "SHORT"
                ? "bg-rose-500/20 text-rose-300 border border-rose-500/50 shadow-sm"
                : "text-slate-400 hover:text-slate-200 bg-slate-900 border border-slate-800"
            }`}
          >
            SHORT
          </button>

          <span className="ml-2 font-bold flex items-center gap-1 text-[11px]">
            {activeTradePlan.side === "BUY" ? (
              <span className="text-emerald-400 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" /> LONG SETUP
              </span>
            ) : (
              <span className="text-rose-400 flex items-center gap-1">
                <TrendingDown className="w-3 h-3" /> SHORT SETUP
              </span>
            )}
          </span>
        </div>

        {/* Trade Metrics: Entry, TP, SL, R:R */}
        <div className="flex items-center gap-3 text-[11px]">
          <div>
            <span className="text-slate-500 mr-1">Entry:</span>
            <span className="text-cyan-300 font-bold">
              ${activeTradePlan.entry.toLocaleString(undefined, { maximumFractionDigits: 1 })}
            </span>
          </div>

          <div>
            <span className="text-slate-500 mr-1">🎯 TP:</span>
            <span className="text-emerald-400 font-bold">
              ${activeTradePlan.tp.toLocaleString(undefined, { maximumFractionDigits: 1 })}
              <span className="text-[10px] ml-0.5">(+{activeTradePlan.gainPct}%)</span>
            </span>
          </div>

          <div>
            <span className="text-slate-500 mr-1">🛑 SL:</span>
            <span className="text-rose-400 font-bold">
              ${activeTradePlan.sl.toLocaleString(undefined, { maximumFractionDigits: 1 })}
              <span className="text-[10px] ml-0.5">(-{activeTradePlan.lossPct}%)</span>
            </span>
          </div>

          <div className="hidden sm:block px-1.5 py-0.2 rounded bg-slate-900 border border-slate-700 text-slate-300 font-bold text-[10px]">
            R:R 1:{activeTradePlan.rr}
          </div>
        </div>

        {/* Place Trade Button */}
        <div className="flex items-center gap-2">
          {tradeSuccessMsg && (
            <span className="text-emerald-400 text-[10px] animate-pulse">
              ✓ {tradeSuccessMsg}
            </span>
          )}

          <button
            onClick={handleExecute}
            disabled={isExecutingTrade}
            className={`px-3 py-1 rounded font-bold font-mono text-xs flex items-center gap-1.5 shadow-md transition-all ${
              activeTradePlan.side === "BUY"
                ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30 active:scale-95"
                : "bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/30 active:scale-95"
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>
              {isExecutingTrade ? "Executing..." : `⚡ PLACE ${activeTradePlan.side} TRADE`}
            </span>
          </button>
        </div>
      </div>

      {/* 4. Chart Canvas Area */}
      <div className="relative flex-1 w-full bg-[#070a0f]" style={{ minHeight: isFullscreen ? "calc(100vh - 120px)" : "560px" }}>
        <div
          id={containerId}
          className="w-full h-full"
          style={{ minHeight: isFullscreen ? "calc(100vh - 120px)" : "560px" }}
        />
      </div>
    </div>
  );
};
