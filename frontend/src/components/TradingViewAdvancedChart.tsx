"use client";

import React, { useEffect, useRef, useState } from "react";
import { Maximize2, Minimize2, ExternalLink, RefreshCw, BarChart2, Shield, Info, Check } from "lucide-react";

declare global {
  interface Window {
    TradingView?: {
      widget: new (options: any) => any;
    };
    Datafeeds?: any;
  }
}

interface TradingViewAdvancedChartProps {
  symbol?: string;
  defaultInterval?: string;
  className?: string;
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

export const TradingViewAdvancedChart: React.FC<TradingViewAdvancedChartProps> = ({
  symbol = "BTC/USDT",
  defaultInterval = "60",
  className = "",
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeInterval, setActiveInterval] = useState(defaultInterval);
  const [feedMode, setFeedMode] = useState<"LIVE_EXCHANGE" | "LOCAL_UDF">("LIVE_EXCHANGE");
  const [chartLoaded, setChartLoaded] = useState(false);
  const [hasLocalLibrary, setHasLocalLibrary] = useState<boolean | null>(null);
  const widgetInstanceRef = useRef<any>(null);

  const containerId = `tv_chart_container_${symbol.replace(/[^a-zA-Z0-9]/g, "_")}`;

  // Map to TradingView symbol format
  const cleanSymbol = symbol.trim().toUpperCase();
  const tvSymbol = SYMBOL_MAPPING[cleanSymbol] || `BINANCE:${cleanSymbol.replace(/[^a-zA-Z0-9]/g, "")}`;

  // Check if user has installed the proprietary standalone Charting Library into public/charting_library/
  useEffect(() => {
    fetch("/charting_library/charting_library.js", { method: "HEAD" })
      .then((res) => {
        setHasLocalLibrary(res.ok);
      })
      .catch(() => {
        setHasLocalLibrary(false);
      });
  }, []);

  // Initialize or re-initialize TradingView Widget
  useEffect(() => {
    let scriptTag: HTMLScriptElement | null = null;
    let isCancelled = false;

    const initWidget = () => {
      if (isCancelled || !containerRef.current) return;

      // Clear container children first
      const containerEl = document.getElementById(containerId);
      if (containerEl) {
        containerEl.innerHTML = "";
      }

      if (window.TradingView && window.TradingView.widget) {
        try {
          widgetInstanceRef.current = new window.TradingView.widget({
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
            studies: [
              "STD;RSI",
              "STD;MACD",
              "STD;Bollinger_Bands",
              "STD;SMA"
            ],
            disabled_features: [
              "header_symbol_search",
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
          setChartLoaded(true);
        } catch (err) {
          console.error("Failed to initialize TradingView widget:", err);
        }
      }
    };

    // Load tv.js script if not present
    if (!window.TradingView) {
      const existingScript = document.getElementById("tradingview-tvjs-script");
      if (!existingScript) {
        scriptTag = document.createElement("script");
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
  }, [tvSymbol, activeInterval, containerId]);

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

  return (
    <div
      ref={containerRef}
      className={`relative flex flex-col bg-slate-950/90 border border-slate-800 rounded-xl overflow-hidden transition-all duration-300 ${
        isFullscreen
          ? "fixed inset-0 z-50 w-screen h-screen rounded-none bg-slate-950 p-3"
          : "w-full"
      } ${className}`}
      style={{ minHeight: isFullscreen ? "100vh" : "620px" }}
    >
      {/* Top Header / Control Bar */}
      <div className="flex flex-wrap items-center justify-between px-3 py-2 bg-slate-900/90 border-b border-slate-800 text-xs gap-2 shrink-0">
        {/* Left: Ticker & Exchange Info */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/30 text-blue-400 font-bold font-mono">
            <BarChart2 className="w-3.5 h-3.5 text-blue-400" />
            <span>TradingView Advanced Charts</span>
          </div>

          <span className="font-mono font-bold text-white text-sm bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700">
            {tvSymbol}
          </span>

          <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            Live Real-Time Stream
          </span>
        </div>

        {/* Center: Interval Quick Switcher */}
        <div className="flex items-center gap-1 bg-slate-950/80 p-0.5 rounded-lg border border-slate-800/80 font-mono text-[11px]">
          {[
            { label: "1m", value: "1" },
            { label: "5m", value: "5" },
            { label: "15m", value: "15" },
            { label: "1h", value: "60" },
            { label: "4h", value: "240" },
            { label: "1D", value: "D" },
            { label: "1W", value: "W" },
          ].map((tf) => (
            <button
              key={tf.value}
              onClick={() => setActiveInterval(tf.value)}
              className={`px-2 py-1 rounded transition-colors font-medium ${
                activeInterval === tf.value
                  ? "bg-blue-600 text-white font-bold shadow-sm shadow-blue-500/20"
                  : "text-slate-400 hover:text-white hover:bg-slate-800"
              }`}
            >
              {tf.label}
            </button>
          ))}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {/* External Link to TradingView */}
          <a
            href={`https://www.tradingview.com/chart/?symbol=${encodeURIComponent(tvSymbol)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 px-2 py-1 text-[11px] font-mono text-slate-400 hover:text-white bg-slate-800/50 hover:bg-slate-800 rounded border border-slate-700/50 transition-colors"
            title="Open in TradingView.com"
          >
            <ExternalLink className="w-3 h-3" />
            <span className="hidden md:inline">Open on TV</span>
          </a>

          {/* Fullscreen Button */}
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
                <span className="hidden sm:inline">Fullscreen</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* UDF / Backend Connection Info Banner (subtle) */}
      <div className="flex items-center justify-between px-3 py-1 bg-slate-950/90 border-b border-slate-800/50 text-[10px] text-slate-400 font-mono">
        <div className="flex items-center gap-2">
          <span className="text-slate-500">Backend UDF Endpoint:</span>
          <code className="text-blue-400 bg-blue-950/40 px-1 py-0.2 rounded border border-blue-800/30">
            http://127.0.0.1:8000/api/tradingview
          </code>
          <span className="text-emerald-400 flex items-center gap-0.5">
            <Check className="w-3 h-3" /> UDF Online (Config, Time, Symbols, History)
          </span>
        </div>

        <div className="hidden lg:flex items-center gap-2">
          {hasLocalLibrary ? (
            <span className="text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
              ✓ Standalone Charting Library Detected in public/charting_library
            </span>
          ) : (
            <span className="text-slate-500">
              💡 Drop licensed `charting_library/` into `frontend/public/` anytime for standalone offline hosting
            </span>
          )}
        </div>
      </div>

      {/* Chart Canvas Area */}
      <div className="relative flex-1 w-full bg-[#070a0f]" style={{ minHeight: isFullscreen ? "calc(100vh - 85px)" : "560px" }}>
        <div
          id={containerId}
          className="w-full h-full"
          style={{ minHeight: isFullscreen ? "calc(100vh - 85px)" : "560px" }}
        />
      </div>
    </div>
  );
};
