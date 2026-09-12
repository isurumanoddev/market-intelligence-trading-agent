"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Header } from "@/components/Header";
import { TickerBanner } from "@/components/TickerBanner";
import { CandleChart } from "@/components/CandleChart";
import { OrderBookLadder } from "@/components/OrderBookLadder";
import { TradeTape } from "@/components/TradeTape";
import { DecisionCard } from "@/components/DecisionCard";
import { NewsFeed } from "@/components/NewsFeed";
import { PortfolioFooter } from "@/components/PortfolioFooter";
import { SettingsModal } from "@/components/SettingsModal";
import {
  fetchAnalysis,
  fetchCandles,
  fetchPortfolio,
  executeTrade,
  closePosition,
  resetPortfolio,
  fetchSettings,
  updateSettings,
} from "@/lib/api";
import {
  FullAnalysisData,
  Candle,
  PortfolioState,
  SettingsData,
} from "@/types/market";

export default function DashboardPage() {
  const [currentSymbol, setCurrentSymbol] = useState("BTC/USDT");
  const [currentTimeframe, setCurrentTimeframe] = useState("1h");
  const [refreshInterval, setRefreshInterval] = useState(10000);
  const [centerTab, setCenterTab] = useState<"book" | "tape">("book");

  const [analysis, setAnalysis] = useState<FullAnalysisData | null>(null);
  const [candles, setCandles] = useState<Candle[]>([]);
  const [portfolio, setPortfolio] = useState<PortfolioState | null>(null);
  const [settings, setSettings] = useState<SettingsData | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [isExecutingTrade, setIsExecutingTrade] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Load Main Data
  const loadData = useCallback(async (sym: string, tf: string) => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const [analysisRes, candleRes] = await Promise.all([
        fetchAnalysis(sym),
        fetchCandles(sym, tf, 45),
      ]);
      setAnalysis(analysisRes);
      setCandles(candleRes);
    } catch (err: any) {
      console.error("Data load error:", err);
      setErrorMessage(err.message || "Failed to fetch market analysis");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load Portfolio State
  const loadPortfolioData = useCallback(async () => {
    try {
      const port = await fetchPortfolio();
      setPortfolio(port);
    } catch (err) {
      console.error("Portfolio load error:", err);
    }
  }, []);

  // Load Settings
  const loadSettingsData = useCallback(async () => {
    try {
      const s = await fetchSettings();
      setSettings(s);
    } catch (err) {
      console.error("Settings load error:", err);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadData(currentSymbol, currentTimeframe);
    loadPortfolioData();
    loadSettingsData();
  }, [currentSymbol, currentTimeframe, loadData, loadPortfolioData, loadSettingsData]);

  // Polling loop
  useEffect(() => {
    if (refreshInterval <= 0) return;
    const timer = setInterval(() => {
      loadData(currentSymbol, currentTimeframe);
      loadPortfolioData();
    }, refreshInterval);
    return () => clearInterval(timer);
  }, [currentSymbol, currentTimeframe, refreshInterval, loadData, loadPortfolioData]);

  // Execute Paper Trade
  const handleExecuteTrade = async () => {
    if (!analysis || !analysis.decision) return;
    const dec = analysis.decision;
    const side = dec.action.includes("SELL") ? "SELL" : "BUY";
    const tradeValue = 5000.0;
    const amount = Number((tradeValue / dec.current_price).toFixed(6));

    setIsExecutingTrade(true);
    try {
      await executeTrade({
        symbol: currentSymbol,
        side,
        price: dec.current_price,
        amount,
        stop_loss: dec.stop_loss,
        take_profit: dec.take_profit_1,
        reason: `AI ${dec.action} (${dec.conviction}% Conviction)`,
      });
      await loadPortfolioData();
      alert(`Executed ${side} ${amount} ${currentSymbol} at $${dec.current_price}!`);
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
    await loadData(currentSymbol, currentTimeframe);
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#0a0d14]">
      {/* Top Header */}
      <Header
        currentSymbol={currentSymbol}
        onSelectSymbol={(s) => setCurrentSymbol(s)}
        hasGeminiKey={Boolean(settings?.has_gemini_key)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        refreshInterval={refreshInterval}
        onChangeRefreshInterval={setRefreshInterval}
        onManualRefresh={() => {
          loadData(currentSymbol, currentTimeframe);
          loadPortfolioData();
        }}
        isLoading={isLoading}
      />

      {/* Ticker & Microstructure Metrics Strip */}
      <TickerBanner
        ticker={analysis?.ticker || null}
        microstructure={analysis?.microstructure || null}
      />

      {/* Error Alert */}
      {errorMessage && (
        <div className="bg-rose-500/15 border-b border-rose-500/30 text-rose-300 text-xs px-4 py-2 flex justify-between items-center">
          <span>⚠️ {errorMessage}</span>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-slate-400 hover:text-white text-xs font-mono"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Dashboard 3-Column Grid */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-3 p-3.5">
        {/* Left Column: Candlestick Chart & Technical Indicators (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-3">
          <CandleChart
            candles={candles}
            indicators={analysis?.indicators || null}
            currentTimeframe={currentTimeframe}
            onChangeTimeframe={(tf) => setCurrentTimeframe(tf)}
            exchange={analysis?.ticker?.exchange || "KRAKEN"}
          />
        </div>

        {/* Center Column: Order Book Depth Ladder & Trade Tape (3 cols) */}
        <div className="lg:col-span-3 bg-[#111622] border border-slate-800 rounded-md flex flex-col overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-slate-800 bg-[#171f30]">
            <button
              onClick={() => setCenterTab("book")}
              className={`flex-1 py-2 text-xs font-semibold transition-colors border-b-2 ${
                centerTab === "book"
                  ? "bg-[#111622] text-white border-blue-500"
                  : "text-slate-400 hover:text-slate-200 border-transparent"
              }`}
            >
              Depth Ladder
            </button>
            <button
              onClick={() => setCenterTab("tape")}
              className={`flex-1 py-2 text-xs font-semibold transition-colors border-b-2 ${
                centerTab === "tape"
                  ? "bg-[#111622] text-white border-blue-500"
                  : "text-slate-400 hover:text-slate-200 border-transparent"
              }`}
            >
              Trade Tape
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 min-h-[380px]">
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

        {/* Right Column: AI Master Decision Arbiter & News Intelligence (4 cols) */}
        <div className="lg:col-span-4 flex flex-col gap-3">
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

      {/* Bottom Panel: Paper Trading Portfolio */}
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
    </div>
  );
}
