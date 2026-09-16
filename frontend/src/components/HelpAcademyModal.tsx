"use client";

import React, { useState } from "react";
import {
  X,
  BookOpen,
  TrendingUp,
  TrendingDown,
  Brain,
  Bot,

  Search,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  Shield,
  Layers,
  Clock,
  ArrowRight,
  Activity,
  Zap,
  Target,
  FileText,
  DollarSign,
  PieChart,
} from "lucide-react";

interface HelpAcademyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabType = "beginner" | "predict" | "optimal" | "bot" | "llm" | "glossary";

interface GlossaryItem {
  term: string;
  category: "Basics" | "Technical" | "Microstructure" | "Derivatives" | "Macro";
  definition: string;
  example: string;
}

const GLOSSARY_ITEMS: GlossaryItem[] = [
  {
    term: "Long Position",
    category: "Basics",
    definition: "Buying an asset with the expectation that its price will rise in value, allowing you to sell higher later.",
    example: "Buying 1 BTC at $76,000 expecting it to reach $80,000.",
  },
  {
    term: "Short Position",
    category: "Basics",
    definition: "Borrowing and selling an asset with the expectation that its price will drop, allowing you to buy it back cheaper.",
    example: "Shorting ETH at $2,600 and repurchasing it at $2,400 for a $200 profit per coin.",
  },
  {
    term: "Stop Loss (SL)",
    category: "Basics",
    definition: "A pre-set order that automatically closes a losing trade at a specific price to prevent catastrophic account drawdowns.",
    example: "Buying BTC at $76,000 with a Stop Loss at $74,500 caps max loss to $1,500.",
  },
  {
    term: "Take Profit (TP)",
    category: "Basics",
    definition: "A pre-set order that automatically closes a profitable trade when the asset hits your targeted price objective.",
    example: "Setting TP at $79,000 ensures you lock in gains before price retraces.",
  },
  {
    term: "Risk-to-Reward Ratio (R:R)",
    category: "Basics",
    definition: "The proportion between your potential loss (risk) and potential gain (reward) on a trade.",
    example: "Risking $100 to make $250 gives a 1:2.5 R:R ratio. Even a 40% win rate is profitable with high R:R!",
  },
  {
    term: "Order Book Imbalance (OBI)",
    category: "Microstructure",
    definition: "The ratio difference between total bid volume (buyers) and ask volume (sellers) in the Level 2 order book. Ranges from -1.0 to +1.0.",
    example: "OBI of +0.35 means buyers outnumber sellers by 35%, generating upward buying pressure.",
  },
  {
    term: "Cumulative Volume Delta (CVD)",
    category: "Microstructure",
    definition: "The net cumulative difference between aggressive market buy orders and aggressive market sell orders over time.",
    example: "Rising CVD while price consolidates reveals hidden institutional accumulation.",
  },
  {
    term: "Bid/Ask Spread",
    category: "Microstructure",
    definition: "The price difference between the lowest seller (ask) and the highest buyer (bid). Measured in basis points (bps).",
    example: "A spread of $2 on BTC ($76,000) is ~0.26 bps, indicating deep, liquid trading conditions.",
  },
  {
    term: "VWAP (Volume-Weighted Average Price)",
    category: "Technical",
    definition: "The average price weighted by total traded volume throughout the session. Acts as the institutional fair-value benchmark.",
    example: "Trading above VWAP signals buyers are in control; trading below indicates seller dominance.",
  },
  {
    term: "RSI (Relative Strength Index)",
    category: "Technical",
    definition: "Momentum oscillator measuring speed and magnitude of price changes on a scale of 0 to 100.",
    example: "RSI below 30 signals oversold conditions (potential bounce); above 70 signals overbought exhaustion.",
  },
  {
    term: "Funding Rate",
    category: "Derivatives",
    definition: "Periodic interest payments exchanged between perpetual futures traders to anchor futures prices to spot prices.",
    example: "High positive funding (+0.05% per 8h) means longs pay shorts. Longs are crowded, signaling potential long squeeze.",
  },
  {
    term: "Open Interest (OI)",
    category: "Derivatives",
    definition: "The total number and dollar value of outstanding perpetual/futures contracts currently open in the market.",
    example: "Rising price + rising OI confirms strong new money entering the trend.",
  },
  {
    term: "Short Squeeze",
    category: "Derivatives",
    definition: "A sharp upward price spike triggered when heavy short sellers are forced to buy back positions to cover liquidations.",
    example: "Crowded negative funding rate (-0.03%) often leads to an aggressive upward squeeze.",
  },
  {
    term: "Stablecoin Net Inflow",
    category: "Macro",
    definition: "The expansion of total fiat-backed stablecoins (USDT, USDC) entering the crypto ecosystem via minting or exchange deposits.",
    example: "A 30-day stablecoin supply jump of +$3.5B signals dry powder ready to buy spot crypto.",
  },
  {
    term: "DeFi TVL (Total Value Locked)",
    category: "Macro",
    definition: "The total dollar amount of crypto assets deposited into decentralized protocols, lending markets, and DEXes.",
    example: "Expanding TVL on Solana indicates active ecosystem on-chain demand.",
  },
  {
    term: "Drawdown",
    category: "Basics",
    definition: "The peak-to-trough percentage decline in your trading account equity during a losing streak.",
    example: "An account dropping from $10,000 to $9,000 experienced a 10% maximum drawdown.",
  },
  {
    term: "Sharpe Ratio",
    category: "Basics",
    definition: "A statistical metric measuring return relative to volatility. Higher is better (>1.5 is good, >2.0 is exceptional).",
    example: "A strategy with 2.2 Sharpe generates smooth profits with minimal erratic swings.",
  },
];

export const HelpAcademyModal: React.FC<HelpAcademyModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>("beginner");
  const [glossarySearch, setGlossarySearch] = useState("");
  const [glossaryFilter, setGlossaryFilter] = useState<string>("All");

  if (!isOpen) return null;

  const filteredGlossary = GLOSSARY_ITEMS.filter((item) => {
    const matchesSearch =
      item.term.toLowerCase().includes(glossarySearch.toLowerCase()) ||
      item.definition.toLowerCase().includes(glossarySearch.toLowerCase());
    const matchesCat =
      glossaryFilter === "All" || item.category === glossaryFilter;
    return matchesSearch && matchesCat;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md font-sans">
      <div className="bg-[#0b101d] border border-slate-800/90 rounded-xl w-full max-w-5xl h-[90vh] max-h-[850px] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Top Header */}
        <div className="bg-[#080d1a] border-b border-slate-800/90 px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-tr from-cyan-600/30 to-blue-600/30 border border-cyan-500/40 shadow-inner">
              <BookOpen className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-wide">
                  Trading Academy & Help Center
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-950/80 border border-cyan-500/40 text-cyan-300">
                  Beginner to Institutional
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Master terminal predictions, automated bots, LLM AI reasoning, and risk management
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation Strip */}
        <div className="bg-[#090e1b] border-b border-slate-800/80 px-4 flex items-center gap-1.5 overflow-x-auto text-xs font-mono">
          <button
            onClick={() => setActiveTab("beginner")}
            className={`px-3.5 py-2.5 font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === "beginner"
                ? "border-cyan-400 text-cyan-300 bg-cyan-950/20"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <span className="text-sm">🚀</span>
            <span>Trading 101</span>
          </button>

          <button
            onClick={() => setActiveTab("predict")}
            className={`px-3.5 py-2.5 font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === "predict"
                ? "border-cyan-400 text-cyan-300 bg-cyan-950/20"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Market Prediction</span>
          </button>

          <button
            onClick={() => setActiveTab("optimal")}
            className={`px-3.5 py-2.5 font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === "optimal"
                ? "border-emerald-400 text-emerald-300 bg-emerald-950/20"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Target className="w-3.5 h-3.5 text-emerald-400" />
            <span>🎯 A-Z Optimal Playbook</span>
          </button>

          <button
            onClick={() => setActiveTab("bot")}
            className={`px-3.5 py-2.5 font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === "bot"
                ? "border-cyan-400 text-cyan-300 bg-cyan-950/20"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Bot className="w-3.5 h-3.5" />
            <span>Trading Bot</span>
          </button>

          <button
            onClick={() => setActiveTab("llm")}
            className={`px-3.5 py-2.5 font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === "llm"
                ? "border-cyan-400 text-cyan-300 bg-cyan-950/20"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Brain className="w-3.5 h-3.5 text-cyan-400" />
            <span>LLM AI Trading</span>
          </button>

          <button
            onClick={() => setActiveTab("glossary")}
            className={`px-3.5 py-2.5 font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === "glossary"
                ? "border-cyan-400 text-cyan-300 bg-cyan-950/20"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Glossary</span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6 text-slate-200 text-sm leading-relaxed">
          {/* ===================== TAB 1: BEGINNER TRADING 101 ===================== */}
          {activeTab === "beginner" && (
            <div className="space-y-6">
              {/* Intro Welcome Banner */}
              <div className="bg-gradient-to-r from-blue-900/30 via-slate-900/40 to-cyan-900/30 border border-blue-500/30 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <span className="text-xl">👋</span> Welcome to Crypto Trading!
                  </h3>
                  <p className="text-xs text-slate-300 mt-1 max-w-2xl">
                    Trading is the disciplined art of managing risk and capitalizing on statistical probabilities.
                    You do not need to guess where prices go—you only need a system with positive mathematical expectation.
                  </p>
                </div>
                <div className="px-3 py-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-mono text-xs font-bold shrink-0">
                  Step 1: Learn Paper Trading First!
                </div>
              </div>

              {/* Core Mechanics */}
              <div>
                <h4 className="text-sm font-bold text-cyan-400 uppercase tracking-wider font-mono mb-3 flex items-center gap-2">
                  <Target className="w-4 h-4" /> 1. The Core Mechanics: Long vs Short
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-[#080d1a] border border-emerald-500/30 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-emerald-400 font-bold font-mono text-sm mb-1.5">
                      <TrendingUp className="w-4 h-4" /> Going Long (Buy)
                    </div>
                    <p className="text-xs text-slate-300">
                      You buy an asset expecting price to go <strong className="text-white">UP</strong>. You buy at $76,000 and sell at $78,000 to pocket $2,000 profit.
                    </p>
                    <div className="mt-3 text-[11px] font-mono text-emerald-300/80 bg-emerald-950/30 px-2.5 py-1 rounded">
                      Best when: Indicators are oversold, CVD is positive, or news is bullish.
                    </div>
                  </div>

                  <div className="bg-[#080d1a] border border-rose-500/30 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-rose-400 font-bold font-mono text-sm mb-1.5">
                      <TrendingDown className="w-4 h-4" /> Going Short (Sell)
                    </div>
                    <p className="text-xs text-slate-300">
                      You bet on price going <strong className="text-white">DOWN</strong>. You sell high, then buy back low. If BTC falls from $76,000 to $74,000, you pocket $2,000 profit!
                    </p>
                    <div className="mt-3 text-[11px] font-mono text-rose-300/80 bg-rose-950/30 px-2.5 py-1 rounded">
                      Best when: Resistance holds, order book imbalance is negative, or overbought.
                    </div>
                  </div>
                </div>
              </div>

              {/* The 3 Golden Rules */}
              <div>
                <h4 className="text-sm font-bold text-amber-400 uppercase tracking-wider font-mono mb-3 flex items-center gap-2">
                  <Shield className="w-4 h-4" /> 2. The 3 Golden Rules of Survival
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="bg-[#080d1a] border border-slate-800 rounded-lg p-3.5 space-y-2">
                    <div className="text-xs font-mono font-bold text-amber-300 flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-amber-500/20 flex items-center justify-center text-[10px]">1</span>
                      Rule of 1% Risk
                    </div>
                    <p className="text-xs text-slate-300">
                      Never risk more than <strong>1% to 2%</strong> of your total portfolio on any single trade. If you have $10,000, your maximum loss on a trade should never exceed $100 to $200.
                    </p>
                  </div>

                  <div className="bg-[#080d1a] border border-slate-800 rounded-lg p-3.5 space-y-2">
                    <div className="text-xs font-mono font-bold text-amber-300 flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-amber-500/20 flex items-center justify-center text-[10px]">2</span>
                      Always Use Stop Loss
                    </div>
                    <p className="text-xs text-slate-300">
                      A trade without a Stop Loss is a gamble. Crypto markets can move 10% in minutes. A hard Stop Loss guarantees you live to trade another day.
                    </p>
                  </div>

                  <div className="bg-[#080d1a] border border-slate-800 rounded-lg p-3.5 space-y-2">
                    <div className="text-xs font-mono font-bold text-amber-300 flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-amber-500/20 flex items-center justify-center text-[10px]">3</span>
                      Minimum 1:2 R:R Ratio
                    </div>
                    <p className="text-xs text-slate-300">
                      If your potential loss is $100, your profit target must be at least $200. With a 1:2 ratio, you can lose 6 out of 10 trades and still make money!
                    </p>
                  </div>
                </div>
              </div>

              {/* Pre-trade checklist */}
              <div className="bg-[#080d1a] border border-slate-800 rounded-lg p-4">
                <h4 className="text-xs font-bold text-cyan-300 uppercase tracking-wider font-mono mb-2 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-cyan-400" /> 3. The 5-Minute Pre-Trade Checklist
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-300 font-mono">
                  <div className="flex items-center gap-2 bg-slate-900/50 p-2 rounded border border-slate-800/80">
                    <span className="text-cyan-400 font-bold">✓</span> 1. What does the AI Prediction say across 1h and 4h?
                  </div>
                  <div className="flex items-center gap-2 bg-slate-900/50 p-2 rounded border border-slate-800/80">
                    <span className="text-cyan-400 font-bold">✓</span> 2. Is RSI aligned (not buying when RSI &gt; 75)?
                  </div>
                  <div className="flex items-center gap-2 bg-slate-900/50 p-2 rounded border border-slate-800/80">
                    <span className="text-cyan-400 font-bold">✓</span> 3. Where is my Stop Loss and Take Profit level?
                  </div>
                  <div className="flex items-center gap-2 bg-slate-900/50 p-2 rounded border border-slate-800/80">
                    <span className="text-cyan-400 font-bold">✓</span> 4. Is the Risk-to-Reward ratio at least 1:2?
                  </div>
                  <div className="flex items-center gap-2 bg-slate-900/50 p-2 rounded border border-slate-800/80 sm:col-span-2">
                    <span className="text-cyan-400 font-bold">✓</span> 5. Is my position size small enough that a loss won&apos;t bother me emotionally?
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ===================== TAB 2: MARKET PREDICTION MASTERCLASS ===================== */}
          {activeTab === "predict" && (
            <div className="space-y-6">
              <div className="border-b border-slate-800 pb-3">
                <h3 className="text-base font-bold text-white">
                  How This App Predicts the Market
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Our system combines 4 distinct analytical layers to forecast price behavior across temporal horizons:
                  Order Book Microstructure + Derivatives Leverage + Technical Indicators + Macro News.
                </p>
              </div>

              {/* The 4 Horizons Explained */}
              <div>
                <h4 className="text-xs font-bold text-cyan-400 uppercase tracking-wider font-mono mb-3 flex items-center gap-1.5">
                  <Clock className="w-4 h-4" /> Understanding the 4 Prediction Horizons
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="bg-[#080d1a] border border-slate-800 rounded-lg p-3.5">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-white text-xs font-mono">⏱️ 30 Minutes Horizon</span>
                      <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/60 px-1.5 py-0.5 rounded border border-cyan-800">
                        Intraday Scalp
                      </span>
                    </div>
                    <p className="text-xs text-slate-300">
                      Driven heavily by <strong>Order Book Imbalance (OBI)</strong> and <strong>CVD tape velocity</strong>. Identifies aggressive market buyers or sellers pushing price over the next few 5m candles.
                    </p>
                  </div>

                  <div className="bg-[#080d1a] border border-slate-800 rounded-lg p-3.5">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-white text-xs font-mono">⏱️ 1 Hour Horizon</span>
                      <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/60 px-1.5 py-0.5 rounded border border-cyan-800">
                        Momentum Session
                      </span>
                    </div>
                    <p className="text-xs text-slate-300">
                      Anchored by <strong>VWAP</strong> and <strong>RSI momentum</strong>. Evaluates whether the market is reacting to recent news headlines or reverting back to institutional fair value.
                    </p>
                  </div>

                  <div className="bg-[#080d1a] border border-slate-800 rounded-lg p-3.5">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-white text-xs font-mono">⏱️ 4 Hours Horizon</span>
                      <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/60 px-1.5 py-0.5 rounded border border-cyan-800">
                        Session Swing
                      </span>
                    </div>
                    <p className="text-xs text-slate-300">
                      Analyzes <strong>Derivatives Funding Rates</strong> and <strong>Open Interest</strong>. Flags potential long/short squeezes as leveraged traders get liquidated in high-volume corridors.
                    </p>
                  </div>

                  <div className="bg-[#080d1a] border border-slate-800 rounded-lg p-3.5">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-white text-xs font-mono">⏱️ 1 Day Horizon</span>
                      <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/60 px-1.5 py-0.5 rounded border border-cyan-800">
                        Macro Daily Target
                      </span>
                    </div>
                    <p className="text-xs text-slate-300">
                      Aligns with <strong>30-Day Support & Resistance</strong> and <strong>On-Chain Stablecoin Flows</strong> (DefiLlama). Identifies if the larger market regime is in expansion, distribution, or accumulation.
                    </p>
                  </div>
                </div>
              </div>

              {/* Indicator Cheat Sheet */}
              <div>
                <h4 className="text-xs font-bold text-cyan-400 uppercase tracking-wider font-mono mb-3 flex items-center gap-1.5">
                  <Activity className="w-4 h-4" /> Indicator Cheat Sheet
                </h4>
                <div className="space-y-2 text-xs">
                  <div className="bg-[#080d1a] p-3 rounded-lg border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <strong className="text-white font-mono">RSI (Relative Strength Index):</strong>
                      <span className="text-slate-300 ml-1.5">Below 30 = Oversold (look for buy bounce). Above 70 = Overbought (look for sell pullback).</span>
                    </div>
                    <span className="text-[10px] font-mono text-amber-400 bg-amber-950/40 px-2 py-0.5 rounded border border-amber-800 shrink-0">
                      Oscillator
                    </span>
                  </div>

                  <div className="bg-[#080d1a] p-3 rounded-lg border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <strong className="text-white font-mono">Order Book Imbalance (OBI):</strong>
                      <span className="text-slate-300 ml-1.5">Positive (&gt;+0.2) = strong buyer bid wall. Negative (&lt;-0.2) = heavy seller ask wall.</span>
                    </div>
                    <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-800 shrink-0">
                      Microstructure
                    </span>
                  </div>

                  <div className="bg-[#080d1a] p-3 rounded-lg border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <strong className="text-white font-mono">Funding Rate Bias:</strong>
                      <span className="text-slate-300 ml-1.5">LONG_CROWDED = longs pay high fees (vulnerable to dip). SHORT_CROWDED = high squeeze up probability!</span>
                    </div>
                    <span className="text-[10px] font-mono text-purple-400 bg-purple-950/40 px-2 py-0.5 rounded border border-purple-800 shrink-0">
                      Derivatives
                    </span>
                  </div>

                  <div className="bg-[#080d1a] p-3 rounded-lg border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <strong className="text-white font-mono">Stablecoin Flow Signal:</strong>
                      <span className="text-slate-300 ml-1.5">STRONG_INFLOW = institutional money printing USDT/USDC and depositing onto exchanges to buy crypto.</span>
                    </div>
                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-800 shrink-0">
                      On-Chain
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ===================== TAB: A TO Z OPTIMAL TRADING PLAYBOOK ===================== */}
          {activeTab === "optimal" && (
            <div className="space-y-6">
              {/* Header Banner */}
              <div className="bg-gradient-to-r from-emerald-950/40 via-slate-900/50 to-cyan-950/40 border border-emerald-500/40 rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 border border-emerald-500/40 text-emerald-300">
                      MASTER OPERATING MANUAL
                    </span>
                    <span className="text-xs text-slate-400 font-mono">Institutional Confluence Architecture</span>
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-white mt-1">
                    A to Z Playbook: How to Achieve Highest Win-Rate Trading
                  </h3>
                  <p className="text-xs text-slate-300 mt-1 max-w-3xl leading-relaxed">
                    This terminal was engineered to replace emotional guesswork with mathematical edge. Follow this exact routine to protect capital, eliminate false counter-trend signals, and capture high-probability asymmetric swings.
                  </p>
                </div>
                <div className="px-3 py-2 rounded-lg bg-slate-950/90 border border-emerald-500/50 text-emerald-300 font-mono text-xs font-bold shrink-0 flex flex-col items-center">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider">Golden Rule #1</span>
                  <span>Cash is a Position</span>
                </div>
              </div>

              {/* Section 1: The Confluence Hierarchy */}
              <div>
                <h4 className="text-sm font-bold text-emerald-400 uppercase tracking-wider font-mono mb-3 flex items-center gap-2">
                  <Layers className="w-4 h-4" /> 1. The Confluence Hierarchy: Never Fight the Consensus
                </h4>
                <p className="text-xs text-slate-300 mb-3 leading-relaxed">
                  Before clicking any button, your eyes must always follow this 3-tier inspection hierarchy. Only execute when all three tiers align in the same direction:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="bg-[#080d1a] border border-cyan-500/30 rounded-lg p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-cyan-300">Tier 1: 12-Indicator Consensus</span>
                      <span className="text-[9px] font-mono bg-cyan-950 px-1.5 py-0.5 rounded border border-cyan-800 text-cyan-300">Dominant Bias</span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      Check the colored consensus bar directly above the chart:
                    </p>
                    <ul className="text-[11px] font-mono space-y-1 text-slate-300">
                      <li className="text-emerald-300">🟢 <strong>Green ≥ 70% (8+ Bullish):</strong> Only look for LONG pullbacks.</li>
                      <li className="text-rose-300">🔴 <strong>Red ≥ 70% (8+ Bearish):</strong> Only look for SHORT retests.</li>
                      <li className="text-amber-300">🟡 <strong>Grey / Split (Chop):</strong> NO TRADE. Stand aside and wait.</li>
                    </ul>
                  </div>

                  <div className="bg-[#080d1a] border border-purple-500/30 rounded-lg p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-purple-300">Tier 2: Gemini 3.7 Master Arbiter</span>
                      <span className="text-[9px] font-mono bg-purple-950 px-1.5 py-0.5 rounded border border-purple-800 text-purple-300">AI Synthesis</span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      Gemini reviews Level 2 Order Book Imbalance, CVD absorption, and Funding rates:
                    </p>
                    <ul className="text-[11px] font-mono space-y-1 text-slate-300">
                      <li>• <strong>Conviction &gt; 65%:</strong> High institutional probability.</li>
                      <li>• <strong>STRONG BUY / SELL:</strong> Full alignment.</li>
                      <li>• <strong>Warning:</strong> If AI says SELL while you want to Buy, DO NOT trade!</li>
                    </ul>
                  </div>

                  <div className="bg-[#080d1a] border border-emerald-500/30 rounded-lg p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-emerald-300">Tier 3: 10 Algorithmic Strategies</span>
                      <span className="text-[9px] font-mono bg-emerald-950 px-1.5 py-0.5 rounded border border-emerald-800 text-emerald-300">Execution Trigger</span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      Evaluates Supertrend, SMC Fair Value Gaps, EMA 20/50, and VWAP bands:
                    </p>
                    <ul className="text-[11px] font-mono space-y-1 text-slate-300">
                      <li>• <strong>Strong Agreement (7+):</strong> Maximum conviction.</li>
                      <li>• <strong>High Conflict (5 vs 5):</strong> Never force a trade during a 50/50 split!</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Section 2: Step-by-Step A to Z Execution Checklist */}
              <div>
                <h4 className="text-sm font-bold text-cyan-400 uppercase tracking-wider font-mono mb-3 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" /> 2. Step-by-Step A to Z Execution Routine
                </h4>
                <div className="space-y-2.5">
                  <div className="bg-[#080d1a] border border-slate-800 rounded-lg p-3.5 flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 font-mono font-bold flex items-center justify-center text-xs shrink-0 mt-0.5">A</span>
                    <div className="space-y-1">
                      <div className="text-xs font-bold text-white font-mono flex items-center gap-2">
                        Select Your Coin &amp; Check Multi-Timeframe Trend
                      </div>
                      <p className="text-xs text-slate-300">
                        Click the Search bar or Coin Catalog in the header. Select high-liquidity coins (BTC, ETH, SOL, SUI, NEAR). Check the <strong>Monthly Context</strong> badge (Expansion, Accumulation, or Breakdown) to ensure you are trading in the direction of macro flows.
                      </p>
                    </div>
                  </div>

                  <div className="bg-[#080d1a] border border-slate-800 rounded-lg p-3.5 flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 font-mono font-bold flex items-center justify-center text-xs shrink-0 mt-0.5">B</span>
                    <div className="space-y-1">
                      <div className="text-xs font-bold text-white font-mono flex items-center gap-2">
                        Inspect the Floating Entry HUD (Optimal Trade Entry - OTE)
                      </div>
                      <p className="text-xs text-slate-300">
                        Look at the floating card in the top-left of the chart. Keep mode on <strong className="text-purple-300 font-mono">[ 🤖 AI AUTO ]</strong> so the tool automatically prevents counter-trend traps. Check the <strong>Setup Grade</strong>:
                      </p>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 font-mono text-[11px]">
                        <div className="p-1.5 rounded bg-emerald-950/40 border border-emerald-500/40 text-emerald-300">
                          <strong>Grade A+ (≥ 80%):</strong> Prime trade. Full size ($10 @ 10x).
                        </div>
                        <div className="p-1.5 rounded bg-cyan-950/40 border border-cyan-500/40 text-cyan-300">
                          <strong>Grade A (68-79%):</strong> Strong setup. Standard entry.
                        </div>
                        <div className="p-1.5 rounded bg-amber-950/40 border border-amber-500/40 text-amber-300">
                          <strong>Grade B (55-67%):</strong> Wait for retest or half size ($5).
                        </div>
                        <div className="p-1.5 rounded bg-rose-950/40 border border-rose-500/40 text-rose-300">
                          <strong>Grade C (&lt; 55%):</strong> DO NOT TRADE. Extreme risk.
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-[#080d1a] border border-slate-800 rounded-lg p-3.5 flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 font-mono font-bold flex items-center justify-center text-xs shrink-0 mt-0.5">C</span>
                    <div className="space-y-1">
                      <div className="text-xs font-bold text-white font-mono flex items-center gap-2">
                        Choose &quot;Optimal Pullback / Retest&quot; Over &quot;Current Market&quot;
                      </div>
                      <p className="text-xs text-slate-300">
                        Always click <strong className="text-emerald-300 font-mono">🎯 Optimal Pullback / Retest</strong>. Professional traders do not market-buy at resistance or market-short at support. Limit orders entering on dynamic pullbacks (EMA 20, VWAP median, or FVG retests) guarantee a minimum <strong className="text-white">1:2 to 1:3.5 Risk-to-Reward ratio</strong>!
                      </p>
                    </div>
                  </div>

                  <div className="bg-[#080d1a] border border-slate-800 rounded-lg p-3.5 flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 font-mono font-bold flex items-center justify-center text-xs shrink-0 mt-0.5">D</span>
                    <div className="space-y-1">
                      <div className="text-xs font-bold text-white font-mono flex items-center gap-2">
                        Execute via Paper Trade or Export to TradingView / WhatsApp
                      </div>
                      <p className="text-xs text-slate-300">
                        You have 3 powerful ways to deploy your trade plan:
                      </p>
                      <ul className="text-xs font-mono space-y-1 text-slate-300 pt-0.5">
                        <li>• <strong className="text-cyan-300">⚡ 1-Click Paper Trade:</strong> Places a simulated order stored in your local portfolio database with exact SL and TP targets.</li>
                        <li>• <strong className="text-emerald-300">📋 Pine Script:</strong> Click <em>Pine</em> to copy the generated script. Paste into TradingView Pine Editor to see your exact Entry, Stop Loss, and TP1/TP2 lines on your phone or desktop!</li>
                        <li>• <strong className="text-purple-300">📱 WhatsApp Alert:</strong> Click <em>WhatsApp</em> to send the full trade signal instantly to your phone so you never miss a level while away from your computer.</li>
                      </ul>
                    </div>
                  </div>

                  <div className="bg-[#080d1a] border border-slate-800 rounded-lg p-3.5 flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 font-mono font-bold flex items-center justify-center text-xs shrink-0 mt-0.5">E</span>
                    <div className="space-y-1">
                      <div className="text-xs font-bold text-white font-mono flex items-center gap-2">
                        Trade Management &amp; The &quot;Free Roll&quot; Technique
                      </div>
                      <p className="text-xs text-slate-300">
                        Once your trade is open, follow this institutional profit management rule:
                      </p>
                      <div className="p-2.5 rounded bg-slate-900/80 border border-slate-800 text-[11px] font-mono text-slate-300 space-y-1">
                        <div>1. When price hits <strong className="text-emerald-400">TP1 (1:2 R:R)</strong>: Close 50% of the position and lock in profit.</div>
                        <div>2. Immediately move your <strong className="text-rose-400">Stop Loss to Breakeven (Entry Price)</strong>.</div>
                        <div>3. You now have a <strong className="text-cyan-300">Risk-Free Trade</strong>! Let the remaining 50% run to <strong className="text-emerald-300">TP2 (1:3.5 R:R)</strong>.</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 3: Understanding Contrarian Warnings & The Falling Knife Trap */}
              <div>
                <h4 className="text-sm font-bold text-rose-400 uppercase tracking-wider font-mono mb-3 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" /> 3. The &quot;Falling Knife&quot; Trap: Why Counters Never Work
                </h4>
                <div className="bg-[#080d1a] border border-rose-500/40 rounded-lg p-4 space-y-3">
                  <div className="flex items-center gap-2 text-rose-300 font-bold font-mono text-xs">
                    <span>⚠️ Classic Novice Mistake: Buying Because Price &quot;Looks Cheap&quot;</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    If 9 out of 12 indicators are BEARISH, the AI Master Arbiter says STRONG SELL, and price is plunging below all moving averages (EMA Death Cross):
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
                    <div className="bg-rose-950/30 border border-rose-800/60 p-3 rounded text-rose-200 space-y-1">
                      <strong className="text-rose-400 block font-bold">❌ What Gamblers Do (Wiping Accounts):</strong>
                      <p className="text-[11px]">They try to &quot;catch the bottom&quot; by going Long into free-falling red candles. A 10x Long on a cascading market leads to immediate liquidation.</p>
                    </div>
                    <div className="bg-emerald-950/30 border border-emerald-800/60 p-3 rounded text-emerald-200 space-y-1">
                      <strong className="text-emerald-400 block font-bold">✓ What Quant Traders Do (Making Money):</strong>
                      <p className="text-[11px]">They switch the HUD to <strong>🔴 SHORT</strong>. They wait for price to bounce up to the 20 EMA or VWAP resistance, and enter a high-probability SHORT with the trend!</p>
                    </div>
                  </div>
                  <div className="text-[11px] font-mono text-amber-300 bg-amber-950/30 p-2.5 rounded border border-amber-800/50">
                    <strong>Institutional Shield Rule:</strong> If the HUD displays an amber warning banner: <em>&quot;⚠️ CONTRARIAN WARNING: Counter-trend Long against Bearish Indicators&quot;</em>, the system has automatically downgraded the setup to Grade C. Do not trade against the consensus!
                  </div>
                </div>
              </div>

              {/* Section 4: Optimal Risk & Leverage Mathematics */}
              <div>
                <h4 className="text-sm font-bold text-amber-400 uppercase tracking-wider font-mono mb-3 flex items-center gap-2">
                  <Shield className="w-4 h-4" /> 4. Risk &amp; Leverage Math (Testing with Real Safety)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="bg-[#080d1a] border border-slate-800 p-3.5 rounded-lg space-y-1.5">
                    <div className="text-xs font-mono font-bold text-amber-300">Default $200 Account</div>
                    <p className="text-slate-300 text-[11px] leading-relaxed">
                      The paper trading broker defaults to $200 USD. This simulates a realistic retail testing balance. Do not practice with fake $100,000 balances—it ruins your psychological discipline!
                    </p>
                  </div>

                  <div className="bg-[#080d1a] border border-slate-800 p-3.5 rounded-lg space-y-1.5">
                    <div className="text-xs font-mono font-bold text-amber-300">$10 Margin @ 10x ($100 Notional)</div>
                    <p className="text-slate-300 text-[11px] leading-relaxed">
                      With 10x leverage, your $10 margin controls $100 notional. A 1.8% Stop Loss means your maximum loss on a losing trade is only <strong>$1.80</strong> (less than 1% of your $200 account).
                    </p>
                  </div>

                  <div className="bg-[#080d1a] border border-slate-800 p-3.5 rounded-lg space-y-1.5">
                    <div className="text-xs font-mono font-bold text-amber-300">The 4-Day Trial Routine</div>
                    <p className="text-slate-300 text-[11px] leading-relaxed">
                      Trade exclusively in Paper Trading for 4 to 5 consecutive days. Track your Win Rate in the Portfolio footer. Only when you consistently achieve &gt; 65% win rate should you connect real capital!
                    </p>
                  </div>
                </div>
              </div>

              {/* Section 5: Summary Golden Rules Card */}
              <div className="bg-gradient-to-r from-slate-900 via-[#0a1224] to-slate-900 border border-cyan-500/40 rounded-xl p-4 sm:p-5">
                <h4 className="text-xs font-bold text-cyan-300 uppercase tracking-wider font-mono mb-2.5 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-cyan-400" /> Quick-Reference Summary Checklist
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono text-slate-300">
                  <div className="flex items-center gap-2 bg-slate-950/60 p-2 rounded border border-slate-800">
                    <span className="text-emerald-400 font-bold">1.</span> Always check 12-Indicator bar (≥ 70% consensus required).
                  </div>
                  <div className="flex items-center gap-2 bg-slate-950/60 p-2 rounded border border-slate-800">
                    <span className="text-emerald-400 font-bold">2.</span> Keep Entry HUD on [ 🤖 AI AUTO ] for automatic bias protection.
                  </div>
                  <div className="flex items-center gap-2 bg-slate-950/60 p-2 rounded border border-slate-800">
                    <span className="text-emerald-400 font-bold">3.</span> Only execute Grade A or A+ setups (skip B and C).
                  </div>
                  <div className="flex items-center gap-2 bg-slate-950/60 p-2 rounded border border-slate-800">
                    <span className="text-emerald-400 font-bold">4.</span> Choose &quot;Optimal Limit Entry&quot; instead of market orders.
                  </div>
                  <div className="flex items-center gap-2 bg-slate-950/60 p-2 rounded border border-slate-800">
                    <span className="text-emerald-400 font-bold">5.</span> When TP1 is hit, take 50% profit &amp; move SL to breakeven.
                  </div>
                  <div className="flex items-center gap-2 bg-slate-950/60 p-2 rounded border border-slate-800">
                    <span className="text-emerald-400 font-bold">6.</span> Test on paper trade for at least 4-5 days before real money.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ===================== TAB 4: TRADING BOT GUIDE ===================== */}
          {activeTab === "bot" && (
            <div className="space-y-6">
              <div className="border-b border-slate-800 pb-3">
                <h3 className="text-base font-bold text-white">
                  Autonomous Trading Bot & Backtesting Studio
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  How to test, configure, and operate the automated execution bot safely without risking real capital.
                </p>
              </div>

              {/* 3 Steps to Bot Mastery */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="bg-[#080d1a] border border-slate-800 rounded-lg p-4 space-y-2">
                  <div className="text-xs font-mono font-bold text-cyan-300 flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-cyan-500/20 flex items-center justify-center text-[10px]">1</span>
                    Run Backtest (Tab 1)
                  </div>
                  <p className="text-xs text-slate-300">
                    Select a strategy, symbol, and lookback period. Check the <strong>Win Rate %</strong>, <strong>Sharpe Ratio</strong>, and <strong>Max Drawdown</strong> before risking any money.
                  </p>
                </div>

                <div className="bg-[#080d1a] border border-slate-800 rounded-lg p-4 space-y-2">
                  <div className="text-xs font-mono font-bold text-cyan-300 flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-cyan-500/20 flex items-center justify-center text-[10px]">2</span>
                    Start Paper Trading (Tab 2)
                  </div>
                  <p className="text-xs text-slate-300">
                    Switch the bot to <strong>PAPER</strong> mode. Click <strong>Start Bot</strong>. It polls live exchange prices every 10 seconds, evaluates signals, and logs every execution.
                  </p>
                </div>

                <div className="bg-[#080d1a] border border-slate-800 rounded-lg p-4 space-y-2">
                  <div className="text-xs font-mono font-bold text-cyan-300 flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-cyan-500/20 flex items-center justify-center text-[10px]">3</span>
                    Guardrails & Telegram (Tab 3)
                  </div>
                  <p className="text-xs text-slate-300">
                    Set a <strong>Max Daily Loss ($)</strong> and connect your Telegram bot. If the market behaves erratically, the built-in circuit breaker halts trading automatically.
                  </p>
                </div>
              </div>

              {/* The 6 Strategies */}
              <div>
                <h4 className="text-xs font-bold text-cyan-400 uppercase tracking-wider font-mono mb-3">
                  The 6 Advanced Bot Strategies Explained
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="bg-[#080d1a] border border-slate-800/80 p-3 rounded-lg">
                    <span className="font-bold font-mono text-cyan-300 block mb-1">1. EMA + RSI (Momentum)</span>
                    <p className="text-slate-300 text-[11px]">
                      Buys when EMA20 &gt; EMA50 and RSI pulls back to 40-50. Sells when trend breaks. Great for trending bull markets.
                    </p>
                  </div>

                  <div className="bg-[#080d1a] border border-slate-800/80 p-3 rounded-lg">
                    <span className="font-bold font-mono text-cyan-300 block mb-1">2. MACD (Trend Follower)</span>
                    <p className="text-slate-300 text-[11px]">
                      Enters on bullish MACD line crossovers with positive histogram expansion. High win-rate in strong sustained trends.
                    </p>
                  </div>

                  <div className="bg-[#080d1a] border border-slate-800/80 p-3 rounded-lg">
                    <span className="font-bold font-mono text-cyan-300 block mb-1">3. Bollinger Reversion (Scalper)</span>
                    <p className="text-slate-300 text-[11px]">
                      Buys when price pierces below the 2-sigma lower Bollinger band with oversold RSI, anticipating mean reversion to the middle band.
                    </p>
                  </div>

                  <div className="bg-[#080d1a] border border-slate-800/80 p-3 rounded-lg">
                    <span className="font-bold font-mono text-cyan-300 block mb-1">4. Derivatives Squeeze Hunter</span>
                    <p className="text-slate-300 text-[11px]">
                      Monitors futures funding rates. When shorts are overcrowded, it buys ahead of cascading liquidations for explosive upside.
                    </p>
                  </div>

                  <div className="bg-[#080d1a] border border-slate-800/80 p-3 rounded-lg">
                    <span className="font-bold font-mono text-cyan-300 block mb-1">5. News & Macro Catalyst Momentum</span>
                    <p className="text-slate-300 text-[11px]">
                      Parses live RSS news feeds for regulatory approvals (ETFs), Fed rate cuts, and stablecoin inflows to trade high-volume news spikes.
                    </p>
                  </div>

                  <div className="bg-[#080d1a] border border-slate-800/80 p-3 rounded-lg">
                    <span className="font-bold font-mono text-cyan-300 block mb-1">6. Quant Alpha Confluence (Arbiter)</span>
                    <p className="text-slate-300 text-[11px]">
                      Our institutional flagship. Requires agreement across all 4 pillars: Technicals + Microstructure + Derivatives + Macro news before firing.
                    </p>
                  </div>
                </div>
              </div>

              {/* Emergency Stop Notice */}
              <div className="bg-rose-950/20 border border-rose-500/40 rounded-lg p-3.5 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                <div className="text-xs text-slate-300">
                  <strong className="text-rose-300 font-mono">Emergency Kill Switch:</strong> In Tab 2 of the Bot Studio, you will find the red <strong>&quot;Emergency Stop &amp; Liquidate&quot;</strong> button. Clicking this immediately cancels all pending bot orders, closes all paper positions at market, and safely shuts down the bot.
                </div>
              </div>
            </div>
          )}

          {/* ===================== TAB 4: LLM AI TRADING PLAYBOOK ===================== */}
          {activeTab === "llm" && (
            <div className="space-y-6">
              <div className="border-b border-slate-800 pb-3">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Brain className="w-5 h-5 text-cyan-400" /> Trading with Google Gemini 3.7 Flash
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  How our Large Language Model reasoning engine transforms quantitative numbers into institutional trading clarity.
                </p>
              </div>

              {/* Why LLM + Quant is Revolutionary */}
              <div className="bg-[#080d1a] border border-cyan-500/30 rounded-lg p-4 space-y-2.5">
                <h4 className="text-xs font-bold text-cyan-300 uppercase font-mono flex items-center gap-1.5">
                  <Lightbulb className="w-4 h-4 text-cyan-400" /> Why LLM + Quant Telemetry is Superior
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Traditional trading bots only see simple numbers (like &quot;RSI is 28&quot;). They don&apos;t know that the Fed is cutting rates in 10 minutes, or that Binance funding rates just hit an extreme negative squeeze level.
                  <br /><br />
                  <strong>Google Gemini 3.7 Flash</strong> acts as a veteran Chief Investment Officer. We supply it with order book depth, CVD, derivatives leverage, DeFi TVL, and breaking news headlines. It synthesizes all factors simultaneously and explains the exact causal reasoning behind its prediction!
                </p>
              </div>

              {/* How to Read AI Output */}
              <div>
                <h4 className="text-xs font-bold text-cyan-400 uppercase tracking-wider font-mono mb-3">
                  How to Interpret the AI Predictions Panel
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="bg-[#080d1a] border border-slate-800 p-3.5 rounded-lg space-y-1.5">
                    <span className="font-bold text-white font-mono flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400" /> Overall Bias &amp; Confidence
                    </span>
                    <p className="text-slate-300 text-[11px]">
                      BULLISH (green), BEARISH (red), or NEUTRAL (yellow). Only take aggressive entries when confidence exceeds <strong>70%</strong>. When confidence is low, wait for clearer consolidation.
                    </p>
                  </div>

                  <div className="bg-[#080d1a] border border-slate-800 p-3.5 rounded-lg space-y-1.5">
                    <span className="font-bold text-white font-mono flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-cyan-400" /> Horizon Target Price &amp; Range
                    </span>
                    <p className="text-slate-300 text-[11px]">
                      The predicted price represents the mathematical center of expected drift. The <strong>Range (Low - High)</strong> represents the 2-sigma volatility corridor for that timeframe.
                    </p>
                  </div>

                  <div className="bg-[#080d1a] border border-slate-800 p-3.5 rounded-lg space-y-1.5">
                    <span className="font-bold text-white font-mono flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-400" /> Recommended Action &amp; Risk
                    </span>
                    <p className="text-slate-300 text-[11px]">
                      Actions (BUY, SELL, HOLD, WAIT). Risk levels range from LOW to EXTREME. If an AI horizon flags EXTREME risk, lower your position size by 50% or step aside!
                    </p>
                  </div>

                  <div className="bg-[#080d1a] border border-slate-800 p-3.5 rounded-lg space-y-1.5">
                    <span className="font-bold text-white font-mono flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-purple-400" /> Structural Rationale &amp; Drivers
                    </span>
                    <p className="text-slate-300 text-[11px]">
                      Always read the 2-sentence rationale in the expanded horizon card. It tells you whether price will move due to tape imbalances, VWAP deviation, or macro catalysts.
                    </p>
                  </div>
                </div>
              </div>

              {/* Pro Tips */}
              <div className="bg-[#080d1a] border border-slate-800 rounded-lg p-4">
                <h4 className="text-xs font-bold text-amber-300 font-mono uppercase mb-2 flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-amber-400" /> Golden Rules When Trading with AI
                </h4>
                <ul className="space-y-1.5 text-xs text-slate-300 font-mono list-disc list-inside">
                  <li>Never treat an AI prediction as a guarantee—markets are probabilistic.</li>
                  <li>Always verify confluence between the AI recommendation and the technical chart.</li>
                  <li>Use the &quot;Inspect inputs&quot; toggle to ensure telemetry data (CVD, RSI, funding) aligns with your view.</li>
                  <li>Let the Decision Card calculate entry zones, Stop Loss, and Take Profit levels for you!</li>
                </ul>
              </div>
            </div>
          )}

          {/* ===================== TAB 5: TRADING GLOSSARY ===================== */}
          {activeTab === "glossary" && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                <div>
                  <h3 className="text-base font-bold text-white">
                    Trading &amp; Crypto Glossary
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Search and explore institutional market terminology
                  </p>
                </div>

                {/* Search Bar */}
                <div className="relative w-full sm:w-64">
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search term or concept..."
                    value={glossarySearch}
                    onChange={(e) => setGlossarySearch(e.target.value)}
                    className="w-full bg-[#080d1a] border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 outline-none focus:border-cyan-500 font-mono"
                  />
                </div>
              </div>

              {/* Category Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto text-xs font-mono">
                {["All", "Basics", "Microstructure", "Technical", "Derivatives", "Macro"].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setGlossaryFilter(cat)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition ${
                      glossaryFilter === cat
                        ? "bg-cyan-950 text-cyan-300 border border-cyan-600/50"
                        : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Glossary Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[480px] overflow-y-auto pr-1">
                {filteredGlossary.map((item) => (
                  <div
                    key={item.term}
                    className="bg-[#080d1a] border border-slate-800/90 rounded-lg p-3.5 flex flex-col justify-between gap-2 hover:border-slate-700 transition"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-sm text-white font-mono">
                          {item.term}
                        </span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-cyan-300 border border-slate-700">
                          {item.category}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        {item.definition}
                      </p>
                    </div>
                    <div className="text-[11px] font-mono text-slate-400 bg-slate-900/70 p-2 rounded border border-slate-800/80">
                      <strong className="text-slate-300">Example: </strong>
                      {item.example}
                    </div>
                  </div>
                ))}

                {filteredGlossary.length === 0 && (
                  <div className="col-span-2 text-center py-8 text-slate-500 font-mono text-xs">
                    No glossary terms match &quot;{glossarySearch}&quot;
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-[#080d1a] border-t border-slate-800/90 px-5 py-3 flex items-center justify-between text-xs font-mono text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span>QuantMind AI Academy • Free Educational Resource</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded font-bold transition shadow"
          >
            Got It, Back to Terminal
          </button>
        </div>
      </div>
    </div>
  );
};
