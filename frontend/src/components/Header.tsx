"use client";

import React, { useState } from "react";
import { Sparkles, RefreshCw, Settings, Zap, GraduationCap, BookOpen, Flame, Search } from "lucide-react";

interface HeaderProps {
  currentSymbol: string;
  onSelectSymbol: (sym: string) => void;
  hasGeminiKey: boolean;
  onOpenSettings: () => void;
  onOpenTradingBot?: () => void;
  onOpenHelp?: () => void;
  onOpenCoinSearch?: () => void;
  botStatusText?: string;
  refreshInterval: number;
  onChangeRefreshInterval: (interval: number) => void;
  onManualRefresh: () => void;
  isLoading: boolean;
}


const DEFAULT_SYMBOLS = ["BTC/USDT", "ETH/USDT", "SOL/USDT", "DOGE/USDT", "PEPE/USDT", "SUI/USDT", "XRP/USDT", "NEAR/USDT"];

export const Header: React.FC<HeaderProps> = ({
  currentSymbol,
  onSelectSymbol,
  hasGeminiKey,
  onOpenSettings,
  onOpenTradingBot,
  onOpenHelp,
  onOpenCoinSearch,
  botStatusText,
  refreshInterval,
  onChangeRefreshInterval,
  onManualRefresh,
  isLoading,
}) => {

  const [customInput, setCustomInput] = useState("");

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (customInput.trim()) {
      onSelectSymbol(customInput.trim().toUpperCase());
      setCustomInput("");
    }
  };

  return (
    <header className="bg-[#111622] border-b border-slate-800/80 px-4 py-2.5 flex items-center justify-between flex-wrap gap-3">
      {/* Brand & Symbol Selector */}
      <div className="flex items-center gap-6 flex-wrap">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <Zap className="w-4 h-4 text-white fill-white" />
          </div>
          <div>
            <div className="font-bold text-sm tracking-wider flex items-center gap-1 text-white">
              QUANT<span className="text-cyan-400">MIND</span> AI
            </div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wider font-mono">
              Multi-Agent Trading Terminal
            </div>
          </div>
        </div>

        {/* Quick Symbols */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Top 100+ Market Browser Button */}
          {onOpenCoinSearch && (
            <button
              onClick={onOpenCoinSearch}
              className="px-3 py-1 text-xs font-mono font-bold rounded flex items-center gap-1.5 bg-gradient-to-r from-cyan-600/30 via-blue-600/30 to-purple-600/30 hover:from-cyan-600/50 hover:to-blue-600/50 text-cyan-300 border border-cyan-500/50 shadow-md shadow-cyan-950/60 transition-all active:scale-95 group"
              title="Search and trade across 100+ Top Market Cap & High Volume Cryptocurrency Pairs"
            >
              <Flame className="w-3.5 h-3.5 text-amber-400 fill-amber-400/30 group-hover:animate-pulse" />
              <span>Top 100+ Coins</span>
            </button>
          )}

          {DEFAULT_SYMBOLS.map((sym) => (
            <button
              key={sym}
              onClick={() => onSelectSymbol(sym)}
              className={`px-2 py-1 text-xs font-mono font-semibold rounded transition-all ${
                currentSymbol === sym
                  ? "bg-blue-600 text-white shadow-md shadow-blue-500/30 border border-blue-400"
                  : "bg-[#171f30] text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-800"
              }`}
            >
              {sym.split("/")[0]}
            </button>
          ))}

          {/* Custom Symbol Form */}
          <form onSubmit={handleCustomSubmit} className="flex items-center bg-[#171f30] border border-slate-800 rounded overflow-hidden">
            <input
              type="text"
              placeholder="Symbol..."
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              className="bg-transparent text-xs font-mono text-slate-200 px-2 py-1 w-20 outline-none placeholder:text-slate-500"
            />
            <button type="submit" className="px-2 py-1 text-xs text-slate-400 hover:text-white bg-slate-800/60">
              Go
            </button>
          </form>
        </div>
      </div>

      {/* Status Badges & Controls */}
      <div className="flex items-center gap-3">
        {/* Live Status Badge */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-semibold">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse-slow shadow-sm shadow-emerald-400" />
          LIVE FEED
        </div>

        {/* Autonomous Trading Bot & Backtest Button */}
        {onOpenTradingBot && (
          <button
            onClick={onOpenTradingBot}
            className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-mono font-semibold transition-all border ${
              botStatusText === "RUNNING"
                ? "bg-cyan-950/60 text-cyan-300 border-cyan-500/40 shadow-md shadow-cyan-950/50 hover:bg-cyan-900/60"
                : botStatusText === "PAUSED"
                ? "bg-amber-950/60 text-amber-300 border-amber-500/40 hover:bg-amber-900/60"
                : "bg-[#171f30] text-slate-300 border-slate-700 hover:text-white hover:bg-slate-800"
            }`}
            title="Open Autonomous Trading Bot & Backtesting Studio"
          >
            <span className="text-sm">🤖</span>
            <span>BOT STUDIO</span>
            {botStatusText && (
              <span className={`w-2 h-2 rounded-full ${
                botStatusText === "RUNNING" ? "bg-emerald-400 animate-ping" : botStatusText === "PAUSED" ? "bg-amber-400" : "bg-slate-500"
              }`} />
            )}
          </button>
        )}

        {/* Academy & Help Center Button */}
        {onOpenHelp && (
          <button
            onClick={onOpenHelp}
            className="flex items-center gap-1.5 px-3 py-1 rounded text-xs font-mono font-semibold transition-all border bg-gradient-to-r from-blue-950/60 to-purple-950/60 border-cyan-500/40 text-cyan-300 shadow-sm hover:from-blue-900/60 hover:to-purple-900/60 hover:text-white"
            title="Open Trading Academy & Beginner Guide"
          >
            <GraduationCap className="w-4 h-4 text-cyan-400" />
            <span>ACADEMY & GUIDE</span>
          </button>
        )}

        {/* Gemini AI Status Badge */}
        <button
          onClick={onOpenSettings}
          className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-semibold transition-all ${
            hasGeminiKey
              ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md shadow-purple-500/20"
              : "bg-[#171f30] text-slate-400 border border-slate-800 hover:text-slate-200"
          }`}
          title="Click to configure Google Gemini API Key"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>{hasGeminiKey ? "Gemini 3.7 Active" : "Add Gemini Key"}</span>
        </button>


        {/* Auto Refresh Select */}
        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <select
            value={refreshInterval}
            onChange={(e) => onChangeRefreshInterval(Number(e.target.value))}
            className="bg-[#171f30] border border-slate-800 text-slate-200 rounded px-2 py-1 text-xs outline-none"
          >
            <option value={0}>Manual</option>
            <option value={10000}>10s</option>
            <option value={30000}>30s</option>
            <option value={60000}>60s</option>
          </select>
        </div>

        {/* Refresh Now Button */}
        <button
          onClick={onManualRefresh}
          disabled={isLoading}
          className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-semibold px-3 py-1 rounded shadow transition-all"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
          <span>Run Analysis</span>
        </button>

        {/* Settings Toggle */}
        <button
          onClick={onOpenSettings}
          className="p-1.5 rounded bg-[#171f30] border border-slate-800 text-slate-400 hover:text-white transition-colors"
          title="Settings"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
