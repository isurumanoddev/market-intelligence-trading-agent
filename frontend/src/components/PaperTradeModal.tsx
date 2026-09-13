"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  X,
  Zap,
  TrendingUp,
  TrendingDown,
  ShieldAlert,
  Target,
  DollarSign,
  Layers,
  ExternalLink,
  Info,
  Scale,
  Percent,
  CheckCircle2,
  AlertTriangle
} from "lucide-react";
import { PortfolioState } from "@/types/market";

interface PaperTradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  symbol: string;
  currentPrice: number;
  initialSide?: "BUY" | "SELL";
  initialEntry?: number;
  initialSl?: number;
  initialTp?: number;
  initialLeverage?: number;
  portfolio: PortfolioState | null;
  onExecute: (payload: {
    symbol: string;
    side: "BUY" | "SELL";
    price: number;
    amount: number;
    leverage: number;
    stop_loss?: number;
    take_profit?: number;
    reason?: string;
  }) => Promise<void>;
}

const POPULAR_SYMBOLS = ["BTC/USDT", "ETH/USDT", "SOL/USDT", "XRP/USDT", "DOGE/USDT", "BNB/USDT"];

export const PaperTradeModal: React.FC<PaperTradeModalProps> = ({
  isOpen,
  onClose,
  symbol: initialSymbol,
  currentPrice: initialCurrentPrice,
  initialSide = "BUY",
  initialEntry,
  initialSl,
  initialTp,
  initialLeverage = 5,
  portfolio,
  onExecute,
}) => {
  const [symbol, setSymbol] = useState(initialSymbol || "BTC/USDT");
  const [side, setSide] = useState<"BUY" | "SELL">(initialSide);
  const [orderType, setOrderType] = useState<"MARKET" | "LIMIT">("MARKET");
  const [limitPrice, setLimitPrice] = useState<number>(initialCurrentPrice || 80000);
  
  const [sizeUsd, setSizeUsd] = useState<number>(5000);
  const [leverage, setLeverage] = useState<number>(initialLeverage || 5);
  
  const [enableTp, setEnableTp] = useState<boolean>(true);
  const [tpPrice, setTpPrice] = useState<number>(0);
  const [enableSl, setEnableSl] = useState<boolean>(true);
  const [slPrice, setSlPrice] = useState<number>(0);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const availableCash = portfolio?.cash || 100000;
  const activePrice = orderType === "MARKET" ? (initialCurrentPrice > 0 ? initialCurrentPrice : 80000) : limitPrice;

  useEffect(() => {
    if (isOpen) {
      setSymbol(initialSymbol || "BTC/USDT");
      setSide(initialSide);
      const p = initialCurrentPrice > 0 ? initialCurrentPrice : 80000;
      setLimitPrice(p);
      
      if (initialTp && initialTp > 0) {
        setTpPrice(initialTp);
        setEnableTp(true);
      } else {
        const defaultTp = initialSide === "BUY" ? p * 1.045 : p * 0.955;
        setTpPrice(Number(defaultTp.toFixed(2)));
      }

      if (initialSl && initialSl > 0) {
        setSlPrice(initialSl);
        setEnableSl(true);
      } else {
        const defaultSl = initialSide === "BUY" ? p * 0.98 : p * 1.02;
        setSlPrice(Number(defaultSl.toFixed(2)));
      }

      if (initialLeverage) {
        setLeverage(initialLeverage);
      }
      setErrorMsg(null);
    }
  }, [isOpen, initialSymbol, initialSide, initialCurrentPrice, initialTp, initialSl, initialLeverage]);

  const calculations = useMemo(() => {
    const entry = activePrice > 0 ? activePrice : 1.0;
    const lev = Math.max(1, leverage);
    const notionalValue = Math.max(10, sizeUsd);
    const amount = notionalValue / entry;
    const marginRequired = notionalValue / lev;
    const feeEst = notionalValue * 0.0005;

    let liquidationPrice = 0;
    if (lev > 1) {
      if (side === "BUY") {
        liquidationPrice = entry * (1 - 0.9 / lev);
      } else {
        liquidationPrice = entry * (1 + 0.9 / lev);
      }
    }

    let tpGainUsd = 0;
    let tpRoiPct = 0;
    if (enableTp && tpPrice > 0) {
      if (side === "BUY") {
        tpGainUsd = (tpPrice - entry) * amount;
      } else {
        tpGainUsd = (entry - tpPrice) * amount;
      }
      tpRoiPct = marginRequired > 0 ? (tpGainUsd / marginRequired) * 100 : 0;
    }

    let slLossUsd = 0;
    let slLossPct = 0;
    let riskReward = 0;
    if (enableSl && slPrice > 0) {
      if (side === "BUY") {
        slLossUsd = (entry - slPrice) * amount;
      } else {
        slLossUsd = (slPrice - entry) * amount;
      }
      slLossPct = marginRequired > 0 ? (slLossUsd / marginRequired) * 100 : 0;
      if (slLossUsd > 0 && tpGainUsd > 0) {
        riskReward = Number((tpGainUsd / slLossUsd).toFixed(2));
      }
    }

    return {
      entry,
      amount: Number(amount.toFixed(6)),
      notionalValue: Number(notionalValue.toFixed(2)),
      marginRequired: Number(marginRequired.toFixed(2)),
      feeEst: Number(feeEst.toFixed(2)),
      liquidationPrice: lev > 1 ? Number(liquidationPrice.toFixed(2)) : null,
      tpGainUsd: Number(tpGainUsd.toFixed(2)),
      tpRoiPct: Number(tpRoiPct.toFixed(1)),
      slLossUsd: Number(slLossUsd.toFixed(2)),
      slLossPct: Number(slLossPct.toFixed(1)),
      riskReward,
      isInsufficientCash: marginRequired + feeEst > availableCash,
    };
  }, [activePrice, sizeUsd, leverage, side, enableTp, tpPrice, enableSl, slPrice, availableCash]);

  if (!isOpen) return null;

  const tvCleanSymbol = symbol.replace("/", "");
  const tvWebUrl = `https://www.tradingview.com/chart/?symbol=BINANCE:${tvCleanSymbol}`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (calculations.isInsufficientCash) {
      setErrorMsg(`Insufficient cash balance ($${availableCash.toLocaleString()}). Required margin: $${calculations.marginRequired.toLocaleString()}`);
      return;
    }

    if (enableSl && slPrice > 0) {
      if (side === "BUY" && slPrice >= calculations.entry) {
        setErrorMsg("Stop loss price must be below entry price for Long positions.");
        return;
      }
      if (side === "SELL" && slPrice <= calculations.entry) {
        setErrorMsg("Stop loss price must be above entry price for Short positions.");
        return;
      }
    }

    if (enableTp && tpPrice > 0) {
      if (side === "BUY" && tpPrice <= calculations.entry) {
        setErrorMsg("Take profit price must be above entry price for Long positions.");
        return;
      }
      if (side === "SELL" && tpPrice >= calculations.entry) {
        setErrorMsg("Take profit price must be below entry price for Short positions.");
        return;
      }
    }

    setIsSubmitting(true);
    try {
      await onExecute({
        symbol,
        side,
        price: calculations.entry,
        amount: calculations.amount,
        leverage,
        stop_loss: enableSl ? slPrice : undefined,
        take_profit: enableTp ? tpPrice : undefined,
        reason: `${side} ${leverage}x (${orderType}) — TP: $${tpPrice || "None"} | SL: $${slPrice || "None"}`,
      });
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to execute paper order.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-[#0a0f1d] border border-cyan-500/40 rounded-xl shadow-2xl shadow-cyan-950/60 overflow-hidden flex flex-col font-mono text-xs">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-[#0c1224]">
          <div className="flex items-center gap-2.5">
            <div className={`p-1.5 rounded-lg border ${
              side === "BUY"
                ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                : "bg-rose-500/20 text-rose-400 border-rose-500/40"
            }`}>
              {side === "BUY" ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-white font-bold text-sm tracking-wide">PAPER TRADING ORDER TICKET</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 font-semibold">
                  {leverage}x MARGIN
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-sans">
                Simulated institutional execution with real-time margin & PnL
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={tvWebUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-400 hover:text-cyan-400 px-2 py-1 rounded bg-slate-900 border border-slate-700/80 hover:bg-slate-800 transition-colors flex items-center gap-1 text-[10px]"
              title="Open TradingView.com Paper Trading"
            >
              <ExternalLink className="w-3 h-3 text-cyan-400" />
              <span>TV Paper</span>
            </a>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto max-h-[80vh]">
          
          {/* Symbol & Price Banner */}
          <div className="flex items-center justify-between bg-slate-900/90 border border-slate-800 p-2.5 rounded-lg">
            <div className="flex items-center gap-2">
              <select
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
                className="bg-slate-800 border border-slate-700 text-white font-bold rounded px-2 py-1 text-xs"
              >
                {POPULAR_SYMBOLS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <span className="text-[10px] text-slate-400">PERPETUAL</span>
            </div>

            <div className="text-right font-mono">
              <div className="text-[10px] text-slate-400">MARKET PRICE</div>
              <div className="text-sm font-bold text-cyan-300">
                ${activePrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
          </div>

          {/* Long / Short Side Switcher */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setSide("BUY")}
              className={`py-2 px-3 rounded-lg font-bold text-xs flex items-center justify-center gap-2 transition-all border ${
                side === "BUY"
                  ? "bg-emerald-600/30 text-emerald-300 border-emerald-500 shadow-md shadow-emerald-950/50"
                  : "bg-slate-900/60 text-slate-400 border-slate-800 hover:text-white"
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>LONG (BUY)</span>
            </button>

            <button
              type="button"
              onClick={() => setSide("SELL")}
              className={`py-2 px-3 rounded-lg font-bold text-xs flex items-center justify-center gap-2 transition-all border ${
                side === "SELL"
                  ? "bg-rose-600/30 text-rose-300 border-rose-500 shadow-md shadow-rose-950/50"
                  : "bg-slate-900/60 text-slate-400 border-slate-800 hover:text-white"
              }`}
            >
              <TrendingDown className="w-3.5 h-3.5" />
              <span>SHORT (SELL)</span>
            </button>
          </div>

          {/* Order Type & Entry Price */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-slate-400 block mb-1">ORDER TYPE</label>
              <div className="grid grid-cols-2 gap-1 bg-slate-900 p-0.5 rounded border border-slate-800">
                <button
                  type="button"
                  onClick={() => setOrderType("MARKET")}
                  className={`py-1 text-center rounded text-[10px] font-bold ${
                    orderType === "MARKET" ? "bg-slate-800 text-cyan-300" : "text-slate-500 hover:text-slate-300"
                  }`}
                >
                  MARKET
                </button>
                <button
                  type="button"
                  onClick={() => setOrderType("LIMIT")}
                  className={`py-1 text-center rounded text-[10px] font-bold ${
                    orderType === "LIMIT" ? "bg-slate-800 text-cyan-300" : "text-slate-500 hover:text-slate-300"
                  }`}
                >
                  LIMIT
                </button>
              </div>
            </div>

            <div>
              <label className="text-[10px] text-slate-400 block mb-1">
                {orderType === "LIMIT" ? "LIMIT ENTRY PRICE ($)" : "ENTRY BENCHMARK ($)"}
              </label>
              <input
                type="number"
                step="0.01"
                disabled={orderType === "MARKET"}
                value={limitPrice}
                onChange={(e) => setLimitPrice(Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-700 disabled:opacity-60 rounded px-2.5 py-1.5 text-white font-bold"
              />
            </div>
          </div>

          {/* Position Size Selection */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-[10px]">
              <span className="text-slate-400">POSITION NOTIONAL SIZE (USD)</span>
              <span className="text-cyan-400 font-bold">
                ≈ {calculations.amount} {symbol.split("/")[0]}
              </span>
            </div>

            <div className="relative">
              <span className="absolute left-2.5 top-2 text-slate-500 font-bold">$</span>
              <input
                type="number"
                step="100"
                min="50"
                value={sizeUsd}
                onChange={(e) => setSizeUsd(Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-700 rounded pl-6 pr-3 py-1.5 text-white font-bold"
                placeholder="5000"
              />
            </div>

            {/* Quick Size Preset Buttons */}
            <div className="flex items-center gap-1.5 pt-0.5">
              {[1000, 2500, 5000, 10000].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setSizeUsd(amt)}
                  className={`flex-1 py-1 rounded border text-[10px] font-semibold transition-colors ${
                    sizeUsd === amt
                      ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40"
                      : "bg-slate-900/70 border-slate-800 text-slate-400 hover:text-white"
                  }`}
                >
                  ${(amt / 1000).toFixed(0)}k
                </button>
              ))}
              <button
                type="button"
                onClick={() => setSizeUsd(Math.floor(availableCash * 0.25))}
                className="flex-1 py-1 rounded border border-slate-800 bg-slate-900/70 text-[10px] text-slate-400 hover:text-white"
                title="25% of available cash"
              >
                25%
              </button>
              <button
                type="button"
                onClick={() => setSizeUsd(Math.floor(availableCash * 0.50))}
                className="flex-1 py-1 rounded border border-slate-800 bg-slate-900/70 text-[10px] text-slate-400 hover:text-white"
                title="50% of available cash"
              >
                50%
              </button>
            </div>
          </div>

          {/* Leverage Slider & Presets */}
          <div className="space-y-1.5 bg-[#080d19] p-2.5 rounded-lg border border-slate-800">
            <div className="flex justify-between items-center text-[10px]">
              <span className="text-slate-400 flex items-center gap-1">
                <Layers className="w-3 h-3 text-cyan-400" />
                LEVERAGE MULTIPLIER
              </span>
              <span className="text-amber-400 font-black text-xs">
                {leverage}x {leverage === 1 ? "(SPOT)" : "(CROSS MARGIN)"}
              </span>
            </div>

            <input
              type="range"
              min="1"
              max="50"
              step="1"
              value={leverage}
              onChange={(e) => setLeverage(Number(e.target.value))}
              className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
            />

            <div className="flex gap-1 justify-between pt-1">
              {[1, 2, 5, 10, 20, 50].map((lev) => (
                <button
                  key={lev}
                  type="button"
                  onClick={() => setLeverage(lev)}
                  className={`flex-1 py-0.5 rounded border text-[10px] font-bold ${
                    leverage === lev
                      ? "bg-amber-500/20 text-amber-300 border-amber-500/50"
                      : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {lev}x
                </button>
              ))}
            </div>

            {calculations.liquidationPrice && (
              <div className="flex items-center justify-between text-[10px] text-rose-400 bg-rose-950/30 px-2 py-1 rounded border border-rose-500/30 mt-1">
                <span className="flex items-center gap-1">
                  <ShieldAlert className="w-3 h-3 shrink-0" />
                  Est. Liquidation Price:
                </span>
                <span className="font-bold">
                  ${calculations.liquidationPrice.toLocaleString()}
                </span>
              </div>
            )}
          </div>

          {/* Take Profit (TP) & Stop Loss (SL) */}
          <div className="grid grid-cols-2 gap-3">
            {/* Take Profit Card */}
            <div className="space-y-1 bg-[#071317] border border-emerald-500/30 p-2.5 rounded-lg">
              <div className="flex items-center justify-between">
                <label className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                  <Target className="w-3 h-3" />
                  TAKE PROFIT (TP)
                </label>
                <input
                  type="checkbox"
                  checked={enableTp}
                  onChange={(e) => setEnableTp(e.target.checked)}
                  className="rounded bg-slate-900 border-slate-700 text-emerald-500 focus:ring-0"
                />
              </div>

              <input
                type="number"
                step="0.01"
                disabled={!enableTp}
                value={tpPrice}
                onChange={(e) => setTpPrice(Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-700 disabled:opacity-40 rounded px-2 py-1 text-white font-bold text-[11px]"
              />

              {enableTp && calculations.tpGainUsd > 0 && (
                <div className="text-[10px] text-emerald-400 font-bold flex justify-between">
                  <span>Est. Profit:</span>
                  <span>+${calculations.tpGainUsd} (+{calculations.tpRoiPct}%)</span>
                </div>
              )}
            </div>

            {/* Stop Loss Card */}
            <div className="space-y-1 bg-[#18090f] border border-rose-500/30 p-2.5 rounded-lg">
              <div className="flex items-center justify-between">
                <label className="text-[10px] text-rose-400 font-bold flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  STOP LOSS (SL)
                </label>
                <input
                  type="checkbox"
                  checked={enableSl}
                  onChange={(e) => setEnableSl(e.target.checked)}
                  className="rounded bg-slate-900 border-slate-700 text-rose-500 focus:ring-0"
                />
              </div>

              <input
                type="number"
                step="0.01"
                disabled={!enableSl}
                value={slPrice}
                onChange={(e) => setSlPrice(Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-700 disabled:opacity-40 rounded px-2 py-1 text-white font-bold text-[11px]"
              />

              {enableSl && calculations.slLossUsd > 0 && (
                <div className="text-[10px] text-rose-400 font-bold flex justify-between">
                  <span>Est. Loss:</span>
                  <span>-${calculations.slLossUsd} (-{calculations.slLossPct}%)</span>
                </div>
              )}
            </div>
          </div>

          {/* Execution Financial Summary Box */}
          <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-lg space-y-1.5 text-[10px]">
            <div className="flex justify-between text-slate-400">
              <span>Order Notional Value:</span>
              <span className="text-white font-bold">${calculations.notionalValue.toLocaleString()}</span>
            </div>

            <div className="flex justify-between text-slate-400">
              <span>Margin Required ({leverage}x):</span>
              <span className="text-cyan-300 font-bold">${calculations.marginRequired.toLocaleString()}</span>
            </div>

            <div className="flex justify-between text-slate-400">
              <span>Est. Taker Fee (0.05%):</span>
              <span className="text-slate-300">${calculations.feeEst}</span>
            </div>

            <div className="flex justify-between text-slate-400">
              <span>Available Cash Balance:</span>
              <span className="text-slate-300">${availableCash.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
            </div>

            {calculations.riskReward > 0 && (
              <div className="flex justify-between text-slate-300 border-t border-slate-800 pt-1">
                <span>Calculated Risk-to-Reward:</span>
                <span className="text-amber-400 font-bold">1 : {calculations.riskReward}</span>
              </div>
            )}
          </div>

          {/* Error Banner */}
          {errorMsg && (
            <div className="p-2.5 rounded bg-rose-500/20 border border-rose-500/40 text-rose-300 text-[11px] flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting || calculations.isInsufficientCash}
            className={`w-full py-3 px-4 rounded-lg font-bold font-mono text-xs flex items-center justify-center gap-2 shadow-lg transition-all ${
              side === "BUY"
                ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/60 active:scale-[0.99]"
                : "bg-rose-600 hover:bg-rose-500 text-white shadow-rose-950/60 active:scale-[0.99]"
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <Zap className="w-4 h-4 fill-white" />
            <span>
              {isSubmitting
                ? "SUBMITTING TO BROKER..."
                : `⚡ OPEN ${side === "BUY" ? "LONG" : "SHORT"} POSITION (${leverage}x MARGIN)`}
            </span>
          </button>

          {/* TradingView Native Paper Trading Integration Callout */}
          <div className="bg-[#0b1324] border border-blue-500/30 rounded-lg p-3 space-y-2 text-[11px] font-sans">
            <div className="flex items-center justify-between font-mono">
              <span className="text-blue-300 font-bold flex items-center gap-1.5">
                <ExternalLink className="w-3.5 h-3.5 text-blue-400" />
                Want to paper trade on TradingView.com?
              </span>
              <a
                href={tvWebUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-cyan-400 hover:text-cyan-300 underline font-bold flex items-center gap-1"
              >
                <span>Launch TV</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <p className="text-slate-400 text-[10px] leading-relaxed">
              TradingView prevents third-party embedded charts from directly executing trades into private user accounts due to cross-origin authentication security. You can execute high-frequency paper orders with leverage and SL/TP using our terminal's built-in simulator above, or click <strong className="text-white">Launch TV</strong> to open your personal TradingView chart, go to the bottom <span className="text-cyan-300">Trading Panel</span>, and click <span className="text-emerald-400 font-semibold">Paper Trading → Connect</span>.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};
