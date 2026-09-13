"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Header } from "@/components/Header";
import { TickerBanner } from "@/components/TickerBanner";
import { CandleChart } from "@/components/CandleChart";
import { TradingViewAdvancedChart } from "@/components/TradingViewAdvancedChart";
import { OrderBookLadder } from "@/components/OrderBookLadder";
import { TradeTape } from "@/components/TradeTape";
import { DecisionCard } from "@/components/DecisionCard";
import { NewsFeed } from "@/components/NewsFeed";
import { PortfolioFooter } from "@/components/PortfolioFooter";
import { SettingsModal } from "@/components/SettingsModal";
import { TradingBotStudioModal } from "@/components/TradingBotStudioModal";
import { LLMPredictionPanel } from "@/components/LLMPredictionPanel";
import { HelpAcademyModal } from "@/components/HelpAcademyModal";
import {
  fetchAnalysis,
  fetchCandles,
  fetchPortfolio,
  executeTrade,
  closePosition,
  resetPortfolio,
  fetchSettings,
  updateSettings,
  fetchLLMPrediction,
} from "@/lib/api";
import {
  FullAnalysisData,
  Candle,
  PortfolioState,
  SettingsData,
  LLMPredictionResult,
} from "@/types/market";


// Client-side initial fallback seed candles so the chart is NEVER blank
function generateInitialCandles(symbol: string, timeframe: string): Candle[] {
  const basePrice = symbol.includes("BTC") ? 87450 : symbol.includes("ETH") ? 2350 : symbol.includes("SOL") ? 142 : 150;
  const now = Math.floor(Date.now() / 1000);
  const step = timeframe === "1m" ? 60 : timeframe === "5m" ? 300 : timeframe === "15m" ? 900 : timeframe === "4h" ? 14400 : timeframe === "1d" ? 86400 : 3600;
  const items: Candle[] = [];
  let curr = basePrice * 0.985;
  for (let i = 0; i < 45; i++) {
    const ts = (now - (45 - i) * step) * 1000;
    const drift = Math.sin(i * 0.5) * (basePrice * 0.003) + (basePrice * 0.0004);
    curr += drift;
    const range = basePrice * 0.005;
    const open = curr;
    const close = curr + Math.cos(i * 0.8) * range * 0.6;
    const high = Math.max(open, close) + Math.abs(Math.sin(i)) * range * 0.3;
    const low = Math.min(open, close) - Math.abs(Math.cos(i)) * range * 0.3;
    const vol = Number((25 + Math.abs(Math.sin(i * 1.5)) * 80).toFixed(2));
    const d = new Date(ts);
    items.push({
      timestamp: ts,
      time_str: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`,
      open: Number(open.toFixed(2)),
      high: Number(high.toFixed(2)),
      low: Number(low.toFixed(2)),
      close: Number(close.toFixed(2)),
      volume: vol,
    });
  }
  return items;
}

export default function DashboardPage() {
  const [currentSymbol, setCurrentSymbol] = useState("BTC/USDT");
  const [currentTimeframe, setCurrentTimeframe] = useState("1h");
  const [activeChartView, setActiveChartView] = useState<"AI_QUANT" | "TRADINGVIEW">("AI_QUANT");
  const [isChartWide, setIsChartWide] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(10000);
  const [centerTab, setCenterTab] = useState<"book" | "tape">("book");

  const [analysis, setAnalysis] = useState<FullAnalysisData | null>(null);
  const [candles, setCandles] = useState<Candle[]>(() => generateInitialCandles("BTC/USDT", "1h"));
  const [portfolio, setPortfolio] = useState<PortfolioState | null>(null);
  const [settings, setSettings] = useState<SettingsData | null>(null);

  const [isCandlesLoading, setIsCandlesLoading] = useState(false);
  const [isAnalysisLoading, setIsAnalysisLoading] = useState(false);
  const [isExecutingTrade, setIsExecutingTrade] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isTradingBotOpen, setIsTradingBotOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [botStatusText, setBotStatusText] = useState<string>("STOPPED");

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [llmPrediction, setLlmPrediction] = useState<LLMPredictionResult | null>(null);
  const [isLlmLoading, setIsLlmLoading] = useState(false);

  const currentSymbolRef = useRef(currentSymbol);
  currentSymbolRef.current = currentSymbol;
  const currentTimeframeRef = useRef(currentTimeframe);
  currentTimeframeRef.current = currentTimeframe;

  // 1. Load Candles independently (fast <1s)
  const loadCandles = useCallback(async (sym: string, tf: string) => {
    setIsCandlesLoading(true);
    try {
      const candleRes = await fetchCandles(sym, tf, 45);
      if (candleRes && candleRes.length > 0) {
        setCandles(candleRes);
      }
    } catch (err: any) {
      console.warn("Candles load warning:", err);
    } finally {
      setIsCandlesLoading(false);
    }
  }, []);

  // 2. Load Full Analysis independently
  const loadAnalysis = useCallback(async (sym: string) => {
    setIsAnalysisLoading(true);
    setErrorMessage(null);
    try {
      const analysisRes = await fetchAnalysis(sym);
      if (analysisRes) {
        setAnalysis(analysisRes);
      }
    } catch (err: any) {
      console.warn("Analysis load warning:", err);
      // Non-blocking warning banner
      if (!analysis) {
        setErrorMessage(err.message || "Market analysis feed connecting...");
      }
    } finally {
      setIsAnalysisLoading(false);
    }
  }, [analysis]);

  // 3. Load Portfolio
  const loadPortfolioData = useCallback(async () => {
    try {
      const port = await fetchPortfolio();
      setPortfolio(port);
    } catch (err) {
      console.warn("Portfolio load warning:", err);
    }
  }, []);

  // 4. Load Settings
  const loadSettingsData = useCallback(async () => {
    try {
      const s = await fetchSettings();
      setSettings(s);
    } catch (err) {
      console.warn("Settings load warning:", err);
    }
  }, []);

  // 5. Load LLM Predictions independently
  const loadLLMPredictions = useCallback(async (sym: string, bypass: boolean = false) => {
    setIsLlmLoading(true);
    try {
      const pred = await fetchLLMPrediction(sym, bypass);
      if (pred) {
        setLlmPrediction(pred);
      }
    } catch (err: any) {
      console.warn("LLM prediction load warning:", err);
    } finally {
      setIsLlmLoading(false);
    }
  }, []);

  // Initial mount & Symbol change handler
  useEffect(() => {
    loadCandles(currentSymbol, currentTimeframe);
    loadAnalysis(currentSymbol);
    loadPortfolioData();
    loadSettingsData();
    loadLLMPredictions(currentSymbol);
  }, [currentSymbol, loadCandles, loadAnalysis, loadPortfolioData, loadSettingsData, loadLLMPredictions]);


  // Handle Timeframe Change: Only reload candles instantly, do NOT re-run full analysis
  const handleTimeframeChange = useCallback((tf: string) => {
    setCurrentTimeframe(tf);
    loadCandles(currentSymbolRef.current, tf);
  }, [loadCandles]);

  // Background Polling loop
  useEffect(() => {
    if (refreshInterval <= 0) return;
    const timer = setInterval(() => {
      loadCandles(currentSymbolRef.current, currentTimeframeRef.current);
      loadAnalysis(currentSymbolRef.current);
      loadPortfolioData();
    }, refreshInterval);
    return () => clearInterval(timer);
  }, [refreshInterval, loadCandles, loadAnalysis, loadPortfolioData]);

  // Periodic Bot Status check
  useEffect(() => {
    const checkBot = async () => {
      try {
        const res = await fetch("/api/bot/status");
        if (res.ok) {
          const data = await res.json();
          setBotStatusText(data.stats?.status || "STOPPED");
        }
      } catch {
        // ignore
      }
    };
    checkBot();
    const interval = setInterval(checkBot, 5000);
    return () => clearInterval(interval);
  }, []);

  // Execute Paper Trade (supports DecisionCard & In-Chart Signals)
  const handleExecuteTrade = async (
    customSide?: "BUY" | "SELL",
    customEntry?: number,
    customSl?: number,
    customTp?: number
  ) => {
    if (!analysis) return;
    const dec = analysis.decision;
    const currentP = customEntry || dec?.current_price || analysis.ticker?.price || 70000;
    const side = customSide || (dec?.action.includes("SELL") ? "SELL" : "BUY");
    const sl = customSl !== undefined ? customSl : dec?.stop_loss;
    const tp = customTp !== undefined ? customTp : dec?.take_profit_1;
    const tradeValue = 5000.0;
    const amount = Number((tradeValue / currentP).toFixed(6));

    setIsExecutingTrade(true);
    try {
      await executeTrade({
        symbol: currentSymbol,
        side,
        price: currentP,
        amount,
        stop_loss: sl,
        take_profit: tp,
        reason: customSide
          ? `Chart ${customSide} Signal (TP: $${tp?.toFixed(2)} | SL: $${sl?.toFixed(2)})`
          : `AI ${dec?.action} (${dec?.conviction}% Conviction)`,
      });
      await loadPortfolioData();
      alert(`Executed ${side} ${amount} ${currentSymbol} at $${currentP}!`);
    } catch (err: any) {
      alert("Trade execution error: " + err.message);
    } finally {
      setIsExecutingTrade(false);
    }
  };

  // Close Position
  const handleClosePosition = async (id: string, currentPrice: number) => {
    try {
      await closePosition(id, currentPrice);
      await loadPortfolioData();
    } catch (err: any) {
      alert("Failed to close position: " + err.message);
    }
  };

  // Reset Portfolio
  const handleResetPortfolio = async () => {
    if (confirm("Reset paper trading portfolio balance to $100,000?")) {
      await resetPortfolio();
      await loadPortfolioData();
    }
  };

  // Save Settings
  const handleSaveSettings = async (payload: any) => {
    await updateSettings(payload);
    await loadSettingsData();
    await loadAnalysis(currentSymbol);
  };

  return (
    <div className="min-h-screen bg-[#070a13] text-slate-100 flex flex-col font-sans select-none antialiased">
      {/* Top Application Header */}
      <Header
        currentSymbol={currentSymbol}
        onSelectSymbol={(sym) => {
          setCurrentSymbol(sym);
          setCandles(generateInitialCandles(sym, currentTimeframe));
        }}
        refreshInterval={refreshInterval}
        onChangeRefreshInterval={setRefreshInterval}
        onManualRefresh={() => {
          loadCandles(currentSymbol, currentTimeframe);
          loadAnalysis(currentSymbol);
          loadPortfolioData();
          loadLLMPredictions(currentSymbol, true);
        }}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenTradingBot={() => setIsTradingBotOpen(true)}
        onOpenHelp={() => setIsHelpOpen(true)}
        botStatusText={botStatusText}
        hasGeminiKey={Boolean(settings?.has_gemini_key)}
        isLoading={isAnalysisLoading || isCandlesLoading || isLlmLoading}
      />


      {/* Real-time Ticker & Market Microstructure Strip */}
      <TickerBanner
        ticker={analysis?.ticker || null}
        microstructure={analysis?.microstructure || null}
        monthlyContext={analysis?.monthly_context || null}
        derivatives={analysis?.derivatives || null}
        onchain={analysis?.onchain || null}
      />

      {/* AI Cognitive Multi-Horizon Market Predictions */}
      <div className="px-3 pt-3">
        <LLMPredictionPanel
          symbol={currentSymbol}
          prediction={llmPrediction}
          isLoading={isLlmLoading}
          onRefresh={() => loadLLMPredictions(currentSymbol, true)}
        />
      </div>

      {/* Non-blocking Status Toast */}
      {errorMessage && (
        <div className="bg-amber-500/15 border-b border-amber-500/30 text-amber-300 text-xs px-4 py-1.5 flex justify-between items-center font-mono">
          <span>⚡ {errorMessage}</span>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-slate-400 hover:text-white text-xs font-mono ml-3 underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Trading Terminal Multi-Column Grid */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-3 p-3">

        {/* Left Column: Candlestick Chart & Quantitative Oscillators */}
        <div className={`${isChartWide ? "lg:col-span-8" : "lg:col-span-5"} flex flex-col gap-2 transition-all duration-300`}>
          {/* Chart Mode Switcher Header */}
          <div className="flex items-center justify-between bg-slate-900/90 px-3 py-1.5 rounded-lg border border-slate-800 text-xs font-mono">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider mr-1">Chart Engine:</span>
              <button
                onClick={() => setActiveChartView("AI_QUANT")}
                className={`px-2.5 py-1 rounded font-bold transition-all flex items-center gap-1.5 text-xs ${
                  activeChartView === "AI_QUANT"
                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm shadow-cyan-500/10"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                }`}
              >
                <span>🔮 AI Quant Terminal</span>
                <span className="text-[10px] opacity-75 hidden sm:inline">(Predictions & S/R)</span>
              </button>

              <button
                onClick={() => setActiveChartView("TRADINGVIEW")}
                className={`px-2.5 py-1 rounded font-bold transition-all flex items-center gap-1.5 text-xs ${
                  activeChartView === "TRADINGVIEW"
                    ? "bg-blue-600/30 text-blue-300 border border-blue-500/50 shadow-sm shadow-blue-500/10"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                }`}
              >
                <span>📈 TradingView Advanced</span>
                <span className="text-[10px] opacity-75 hidden sm:inline">(100+ Indicators)</span>
              </button>
            </div>

            {/* Layout Expand Button */}
            <button
              onClick={() => setIsChartWide(!isChartWide)}
              className="text-[11px] text-slate-400 hover:text-white px-2 py-0.5 rounded border border-slate-700/60 hover:bg-slate-800 transition-colors hidden xl:inline-block"
              title="Expand chart canvas to 8 columns"
            >
              {isChartWide ? "⤺ Standard (5 Cols)" : "⤢ Wide View (8 Cols)"}
            </button>
          </div>

          {/* Active Chart Component */}
          {activeChartView === "AI_QUANT" ? (
            <CandleChart
              candles={candles}
              indicators={analysis?.indicators || null}
              forecast={analysis?.price_forecast || null}
              decision={analysis?.decision || null}
              currentTimeframe={currentTimeframe}
              onChangeTimeframe={handleTimeframeChange}
              exchange={analysis?.ticker?.exchange || "KRAKEN"}
              isLoading={isCandlesLoading}
              onExecuteTrade={handleExecuteTrade}
              isExecutingTrade={isExecutingTrade}
            />
          ) : (
            <TradingViewAdvancedChart
              symbol={currentSymbol}
              defaultInterval={
                currentTimeframe === "1d" ? "D" :
                currentTimeframe === "4h" ? "240" :
                currentTimeframe === "15m" ? "15" :
                currentTimeframe === "5m" ? "5" :
                currentTimeframe === "1m" ? "1" : "60"
              }
              indicators={analysis?.indicators || null}
              decision={analysis?.decision || null}
              currentPrice={analysis?.ticker?.price || 0}
              onExecuteTrade={handleExecuteTrade}
              isExecutingTrade={isExecutingTrade}
            />
          )}
        </div>

        {/* Center Column: Order Book Depth Ladder & Trade Tape (3 cols, or 4 cols in wide view) */}
        <div className={`${isChartWide ? "lg:col-span-4" : "lg:col-span-3"} bg-[#0c101d] border border-slate-800/90 rounded-lg flex flex-col overflow-hidden shadow-xl transition-all duration-300`}>
          {/* Pro Tab Switcher */}
          <div className="flex border-b border-slate-800/80 bg-[#080d1a]">
            <button
              onClick={() => setCenterTab("book")}
              className={`flex-1 py-2 text-xs font-bold transition-all border-b-2 flex items-center justify-center gap-1.5 ${
                centerTab === "book"
                  ? "bg-[#0c101d] text-cyan-300 border-cyan-400 shadow-[0_2px_10px_rgba(6,182,212,0.15)]"
                  : "text-slate-400 hover:text-slate-200 border-transparent"
              }`}
            >
              <span>L2 Depth Ladder</span>
            </button>
            <button
              onClick={() => setCenterTab("tape")}
              className={`flex-1 py-2 text-xs font-bold transition-all border-b-2 flex items-center justify-center gap-1.5 ${
                centerTab === "tape"
                  ? "bg-[#0c101d] text-cyan-300 border-cyan-400 shadow-[0_2px_10px_rgba(6,182,212,0.15)]"
                  : "text-slate-400 hover:text-slate-200 border-transparent"
              }`}
            >
              <span>Time & Sales Tape</span>
            </button>
          </div>

          {/* Depth Ladder / Trade Tape Content */}
          <div className="flex-1 min-h-[380px] bg-[#090d18]">
            {centerTab === "book" ? (
              <OrderBookLadder
                orderBook={analysis?.order_book || null}
                microstructure={analysis?.microstructure || null}
              />
            ) : (
              <TradeTape trades={analysis?.trades || []} />
            )}
          </div>
        </div>

        {/* Right Column: AI Master Decision Arbiter & Macro News Intelligence (4 cols, or 12 cols 2-grid in wide view) */}
        <div className={`${isChartWide ? "lg:col-span-12 grid grid-cols-1 md:grid-cols-2 gap-3" : "lg:col-span-4 flex flex-col gap-3"} transition-all duration-300`}>
          <DecisionCard
            decision={analysis?.decision || null}
            onExecuteTrade={handleExecuteTrade}
            isExecuting={isExecutingTrade}
          />
          <NewsFeed
            news={analysis?.news || []}
            sentiment={analysis?.sentiment || null}
          />
        </div>
      </main>

      {/* Bottom Panel: Paper Trading Simulator & Active Margin Portfolio */}
      <PortfolioFooter
        portfolio={portfolio}
        onClosePosition={handleClosePosition}
        onResetPortfolio={handleResetPortfolio}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSave={handleSaveSettings}
      />

      {/* Autonomous Trading Bot & Backtesting Studio Modal */}
      <TradingBotStudioModal
        isOpen={isTradingBotOpen}
        onClose={() => setIsTradingBotOpen(false)}
        currentSymbol={currentSymbol}
      />

      {/* Trading Academy & Beginner Help Center Modal */}
      <HelpAcademyModal
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
      />
    </div>
  );
}

