"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  X,
  Search,
  Flame,
  TrendingUp,
  Award,
  Layers,
  Bot,
  Zap,
  Check,
  ExternalLink,
  Filter
} from "lucide-react";
import { CoinInfo } from "@/types/market";
import { fetchCoins } from "@/lib/api";

interface CoinSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCoin: (symbol: string) => void;
  currentSymbol: string;
}

const CATEGORIES = [
  { id: "ALL", label: "All Top 100+", icon: Award },
  { id: "HIGH_VOLUME", label: "🔥 Most Traded / High Vol", icon: Flame },
  { id: "MEME", label: "🐕 Memes", icon: Zap },
  { id: "AI_DEPIN", label: "🤖 AI & DePIN", icon: Bot },
  { id: "L1_L2", label: "⚡ Layer 1 & 2", icon: Layers },
  { id: "DEFI", label: "🏦 DeFi & RWA", icon: TrendingUp },
];

export const CoinSearchModal: React.FC<CoinSearchModalProps> = ({
  isOpen,
  onClose,
  onSelectCoin,
  currentSymbol,
}) => {
  const [coins, setCoins] = useState<CoinInfo[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sortBy, setSortBy] = useState<"rank" | "volume" | "name">("volume");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      fetchCoins({ limit: 120 })
        .then((res) => {
          if (res && res.coins) {
            setCoins(res.coins);
          }
        })
        .finally(() => setIsLoading(false));

      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    } else {
      setSearchQuery("");
      setSelectedCategory("ALL");
    }
  }, [isOpen]);

  // Handle ESC key to exit
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const filteredCoins = useMemo(() => {
    let list = [...coins];

    // Category filter
    if (selectedCategory !== "ALL") {
      if (selectedCategory === "HIGH_VOLUME") {
        list = list.filter((c) => c.is_high_volume);
      } else if (selectedCategory === "MEME") {
        list = list.filter((c) => c.category === "MEME" || c.tags?.includes("MEME"));
      } else if (selectedCategory === "AI_DEPIN") {
        list = list.filter((c) => c.category === "AI_DEPIN" || c.tags?.includes("AI"));
      } else if (selectedCategory === "L1_L2") {
        list = list.filter((c) => c.category === "L1_L2" || c.tags?.includes("L1") || c.tags?.includes("LAYER_2"));
      } else if (selectedCategory === "DEFI") {
        list = list.filter((c) => c.category === "DEFI" || c.tags?.includes("DEFI") || c.category === "RWA_INFRA");
      }
    }

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(
        (c) =>
          c.symbol.toLowerCase().includes(q) ||
          c.name.toLowerCase().includes(q) ||
          c.base.toLowerCase().includes(q) ||
          c.tags?.some((t) => t.toLowerCase().includes(q))
      );
    }

    // Sorting
    if (sortBy === "volume") {
      list.sort((a, b) => (a.is_high_volume === b.is_high_volume ? a.market_cap_rank - b.market_cap_rank : a.is_high_volume ? -1 : 1));
    } else if (sortBy === "name") {
      list.sort((a, b) => a.name.localeCompare(b.name));
    } else {
      list.sort((a, b) => a.market_cap_rank - b.market_cap_rank);
    }

    return list;
  }, [coins, selectedCategory, searchQuery, sortBy]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl bg-[#0a0f1d] border border-cyan-500/40 rounded-xl shadow-2xl shadow-cyan-950/70 overflow-hidden flex flex-col font-mono max-h-[88vh]">
        
        {/* Header with Search Input */}
        <div className="p-4 border-b border-slate-800 bg-[#0c1326] space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-cyan-500/20 border border-cyan-500/40 text-cyan-300">
                <Search className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-white font-bold text-sm tracking-wider">MARKET COIN BROWSER & SELECTOR</h3>
                <p className="text-[10px] text-slate-400 font-sans">
                  Trade Top 100+ Market Cap & Highest Volume Cryptocurrency Pairs
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Search by ticker (e.g. PEPE, SUI, SOL) or name (e.g. Dogecoin, Arbitrum)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#070b14] border border-slate-700 focus:border-cyan-400 rounded-lg pl-9 pr-20 py-2 text-xs text-white placeholder:text-slate-500 font-mono outline-none shadow-inner"
            />
            <div className="absolute right-2.5 top-2 text-[10px] text-slate-500 bg-slate-800/80 px-1.5 py-0.5 rounded border border-slate-700">
              ESC to close
            </div>
          </div>

          {/* Category Tabs & Sorter */}
          <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              {CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                const isActive = selectedCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-bold flex items-center gap-1.5 transition-all ${
                      isActive
                        ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-sm shadow-cyan-950"
                        : "bg-slate-900/80 text-slate-400 border border-slate-800 hover:text-slate-200 hover:bg-slate-800"
                    }`}
                  >
                    <Icon className="w-3 h-3" />
                    <span>{cat.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Sorter */}
            <div className="flex items-center gap-1 text-[10px] text-slate-400 font-sans">
              <span>Sort:</span>
              <button
                onClick={() => setSortBy("volume")}
                className={`px-1.5 py-0.5 rounded border font-mono ${
                  sortBy === "volume" ? "bg-amber-500/20 text-amber-300 border-amber-500/40 font-bold" : "border-slate-800 text-slate-400"
                }`}
              >
                Volume
              </button>
              <button
                onClick={() => setSortBy("rank")}
                className={`px-1.5 py-0.5 rounded border font-mono ${
                  sortBy === "rank" ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40 font-bold" : "border-slate-800 text-slate-400"
                }`}
              >
                Rank
              </button>
              <button
                onClick={() => setSortBy("name")}
                className={`px-1.5 py-0.5 rounded border font-mono ${
                  sortBy === "name" ? "bg-blue-500/20 text-blue-300 border-blue-500/40 font-bold" : "border-slate-800 text-slate-400"
                }`}
              >
                A-Z
              </button>
            </div>
          </div>
        </div>

        {/* Coins List / Table Body */}
        <div className="overflow-y-auto flex-1 p-3 space-y-1.5 divide-y divide-slate-800/40">
          {isLoading ? (
            <div className="py-16 text-center text-slate-500 text-xs flex flex-col items-center justify-center gap-2">
              <div className="w-5 h-5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
              <span>Loading top 100+ coins and volume rankings...</span>
            </div>
          ) : filteredCoins.length === 0 ? (
            <div className="py-16 text-center text-slate-500 text-xs">
              No coins found matching "{searchQuery}". Try searching another symbol like BTC, SOL, DOGE, or SUI.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 pt-1">
              {filteredCoins.map((coin) => {
                const isSelected = currentSymbol.toUpperCase() === coin.symbol.toUpperCase();
                return (
                  <button
                    key={coin.symbol}
                    onClick={() => {
                      onSelectCoin(coin.symbol);
                      onClose();
                    }}
                    className={`p-2.5 rounded-lg border text-left flex items-center justify-between transition-all group ${
                      isSelected
                        ? "bg-blue-600/20 border-blue-500 text-white shadow-md shadow-blue-950/60"
                        : "bg-[#090e1a] border-slate-800 hover:border-cyan-500/40 hover:bg-[#0d1424] text-slate-300"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {/* Rank Badge */}
                      <span className="text-[10px] font-bold text-slate-500 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800 shrink-0">
                        #{coin.market_cap_rank}
                      </span>

                      {/* Coin Ticker & Name */}
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-xs text-white group-hover:text-cyan-300 transition-colors">
                            {coin.symbol}
                          </span>
                          {coin.is_high_volume && (
                            <span className="text-[9px] px-1 py-0.2 rounded bg-amber-500/15 border border-amber-500/30 text-amber-300 font-bold">
                              HOT
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate max-w-[130px] font-sans">
                          {coin.name}
                        </div>
                      </div>
                    </div>

                    {/* Category & Select status */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-semibold ${
                        coin.category === "MEME"
                          ? "bg-rose-500/15 text-rose-300 border border-rose-500/30"
                          : coin.category === "AI_DEPIN"
                          ? "bg-purple-500/15 text-purple-300 border border-purple-500/30"
                          : coin.category === "DEFI"
                          ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                          : "bg-cyan-500/15 text-cyan-300 border border-cyan-500/30"
                      }`}>
                        {coin.category.replace("_", " ")}
                      </span>

                      {isSelected ? (
                        <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center text-white">
                          <Check className="w-3 h-3" />
                        </div>
                      ) : (
                        <div className="w-5 h-5 rounded-full bg-slate-800 group-hover:bg-cyan-600 flex items-center justify-center text-slate-400 group-hover:text-white transition-colors">
                          <TrendingUp className="w-3 h-3" />
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer info banner */}
        <div className="px-4 py-2.5 bg-[#080c16] border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-2">
            <span className="text-cyan-400 font-bold">{filteredCoins.length}</span>
            <span>coins shown across Top 100 & Perpetual markets</span>
          </div>
          <span className="text-[10px] text-slate-500 hidden sm:inline">
            Click any token to instantly analyze and paper trade
          </span>
        </div>

      </div>
    </div>
  );
};
