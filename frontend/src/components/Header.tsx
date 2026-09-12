"use client";

import React, { useState } from "react";
import { Sparkles, RefreshCw, Settings, Zap } from "lucide-react";

interface HeaderProps {
  currentSymbol: string;
  onSelectSymbol: (sym: string) => void;
  hasGeminiKey: boolean;
  onOpenSettings: () => void;
  refreshInterval: number;
  onChangeRefreshInterval: (interval: number) => void;
  onManualRefresh: () => void;
  isLoading: boolean;
}

const DEFAULT_SYMBOLS = ["BTC/USDT", "ETH/USDT", "SOL/USDT", "AAPL", "NVDA", "TSLA"];

export const Header: React.FC<HeaderProps> = ({
  currentSymbol,
  onSelectSymbol,
  hasGeminiKey,
  onOpenSettings,
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
          {DEFAULT_SYMBOLS.map((sym) => (
            <button
              key={sym}
              onClick={() => onSelectSymbol(sym)}
              className={`px-2.5 py-1 text-xs font-mono font-semibold rounded transition-all ${
                currentSymbol === sym
                  ? "bg-blue-600 text-white shadow-md shadow-blue-500/30 border border-blue-400"
                  : "bg-[#171f30] text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-800"
              }`}
            >
              {sym}
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
          <span>{hasGeminiKey ? "Gemini 2.5 Active" : "Add Gemini Key"}</span>
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
