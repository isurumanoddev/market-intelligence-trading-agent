"use client";

import React, { useState, useEffect } from "react";
import { 
  BotConfig, 
  BotStats, 
  BotLogEntry, 
  BotStatusResponse, 
  BacktestRequest, 
  BacktestResult, 
  BacktestTrade, 
  EquityPoint 
} from "@/types/market";

interface TradingBotStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSymbol: string;
}

export function TradingBotStudioModal({ isOpen, onClose, currentSymbol }: TradingBotStudioModalProps) {
  const [activeTab, setActiveTab] = useState<"backtest" | "live_bot" | "risk_telegram">("backtest");
  
  // ------------------ Backtest State ------------------
  const [btSymbol, setBtSymbol] = useState(currentSymbol || "BTC/USDT");
  const [btStrategy, setBtStrategy] = useState<
    | "EMA_RSI"
    | "MACD"
    | "BOLLINGER_REVERSION"
    | "DERIVATIVES_SQUEEZE"
    | "NEWS_MACRO_MOMENTUM"
    | "QUANT_ALPHA_CONFLUENCE"
    | "CONFLUENCE"
    | "SUPERTREND_ATR"
    | "SMART_MONEY_FVG"
    | "STOCH_RSI_CROSS"
    | "VWAP_MEAN_REVERSION"
  >("QUANT_ALPHA_CONFLUENCE");
  const [btTimeframe, setBtTimeframe] = useState("1h");
  const [btDays, setBtDays] = useState(90);
  const [btCapital, setBtCapital] = useState(10000);
  const [btSizePct, setBtSizePct] = useState(25);
  const [btSlPct, setBtSlPct] = useState(2.0);
  const [btTpPct, setBtTpPct] = useState(4.5);
  const [btTrailingPct, setBtTrailingPct] = useState(1.5);
  const [btRunning, setBtRunning] = useState(false);
  const [btResult, setBtResult] = useState<BacktestResult | null>(null);
  const [btHoverPoint, setBtHoverPoint] = useState<EquityPoint | null>(null);

  // ------------------ Live Bot State ------------------
  const [botStatus, setBotStatus] = useState<BotStatusResponse | null>(null);
  const [botActionLoading, setBotActionLoading] = useState(false);
  
  // Bot Config Form
  const [botStrategy, setBotStrategy] = useState("TECHNICAL_MOMENTUM");
  const [minConviction, setMinConviction] = useState(70);
  const [tradeSizeUsd, setTradeSizeUsd] = useState(2000);
  const [maxPositions, setMaxPositions] = useState(3);
  const [trailingEnabled, setTrailingEnabled] = useState(true);
  const [trailingPct, setTrailingPct] = useState(1.5);
  const [botSlPct, setBotSlPct] = useState(2.0);
  const [botTpPct, setBotTpPct] = useState(4.5);

  // ------------------ Risk & Telegram State ------------------
  const [maxDailyLoss, setMaxDailyLoss] = useState(5000);
  const [tgToken, setTgToken] = useState("");
  const [tgChatId, setTgChatId] = useState("");
  const [tgTestSuccess, setTgTestSuccess] = useState<boolean | null>(null);
  const [tgTesting, setTgTesting] = useState(false);
  const [savingRisk, setSavingRisk] = useState(false);

  // ------------------ Poll Bot Status ------------------
  const fetchBotStatus = async () => {
    try {
      const res = await fetch("/api/bot/status");
      if (res.ok) {
        const data: BotStatusResponse = await res.json();
        setBotStatus(data);
        if (data.config) {
          setBotStrategy(data.config.strategy || "TECHNICAL_MOMENTUM");
          setMinConviction(data.config.min_conviction || 70);
          setTradeSizeUsd(data.config.trade_size_usd || 2000);
          setMaxPositions(data.config.max_open_positions || 3);
          setTrailingEnabled(data.config.trailing_stop_enabled ?? true);
          setTrailingPct(data.config.trailing_stop_pct || 1.5);
          setBotSlPct(data.config.stop_loss_pct || 2.0);
          setBotTpPct(data.config.take_profit_pct || 4.5);
          setMaxDailyLoss(data.config.max_daily_loss_usd || 5000);
        }
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchBotStatus();
      const interval = setInterval(fetchBotStatus, 3000);
      return () => clearInterval(interval);
    }
  }, [isOpen]);

  // ------------------ Execute Backtest ------------------
  const handleRunBacktest = async () => {
    setBtRunning(true);
    setBtHoverPoint(null);
    try {
      const req: BacktestRequest = {
        symbol: btSymbol,
        strategy: btStrategy,
        timeframe: btTimeframe,
        lookback_days: btDays,
        initial_capital: btCapital,
        position_size_pct: btSizePct,
        stop_loss_pct: btSlPct,
        take_profit_pct: btTpPct,
        trailing_stop_pct: btTrailingPct,
        fee_pct: 0.05
      };
      const res = await fetch("/api/backtest/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req)
      });
      if (res.ok) {
        const data: BacktestResult = await res.json();
        setBtResult(data);
      }
    } catch (e) {
      console.error("Backtest failed", e);
    } finally {
      setBtRunning(false);
    }
  };

  // ------------------ Bot Controls ------------------
  const handleBotControl = async (action: "start" | "pause" | "resume" | "stop" | "emergency-stop") => {
    setBotActionLoading(true);
    try {
      const res = await fetch(`/api/bot/${action}`, { method: "POST" });
      if (res.ok) {
        await fetchBotStatus();
      }
    } catch (e) {
      console.error("Bot action error", e);
    } finally {
      setBotActionLoading(false);
    }
  };

  const handleSaveBotConfig = async () => {
    try {
      const res = await fetch("/api/bot/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          strategy: botStrategy,
          min_conviction: minConviction,
          trade_size_usd: tradeSizeUsd,
          max_open_positions: maxPositions,
          trailing_stop_enabled: trailingEnabled,
          trailing_stop_pct: trailingPct,
          stop_loss_pct: botSlPct,
          take_profit_pct: botTpPct,
          max_daily_loss_usd: maxDailyLoss
        })
      });
      if (res.ok) {
        fetchBotStatus();
      }
    } catch (e) {
      console.error("Save config failed", e);
    }
  };

  const handleTestTelegram = async () => {
    setTgTesting(true);
    setTgTestSuccess(null);
    try {
      const res = await fetch("/api/bot/telegram-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: tgToken, chat_id: tgChatId })
      });
      const data = await res.json();
      setTgTestSuccess(data.success);
    } catch {
      setTgTestSuccess(false);
    } finally {
      setTgTesting(false);
    }
  };

  const handleSaveRiskTelegram = async () => {
    setSavingRisk(true);
    try {
      await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          telegram_bot_token: tgToken,
          telegram_chat_id: tgChatId
        })
      });
      await fetch("/api/bot/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ max_daily_loss_usd: maxDailyLoss })
      });
      fetchBotStatus();
    } catch (e) {
      console.error("Failed to save risk/telegram", e);
    } finally {
      setSavingRisk(false);
    }
  };

  if (!isOpen) return null;

  const currentStatus = botStatus?.stats.status || "STOPPED";
  const isRunning = currentStatus === "RUNNING";
  const isPaused = currentStatus === "PAUSED";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-6xl max-h-[92vh] flex flex-col bg-[#070a13] border border-cyan-500/30 rounded-xl shadow-2xl shadow-cyan-950/50 overflow-hidden">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/80 bg-[#0c101d]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-mono text-lg">
              🤖
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-wide">
                  QUANTITATIVE TRADING BOT STUDIO
                </h2>
                <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider ${
                  isRunning 
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 animate-pulse" 
                    : isPaused 
                    ? "bg-amber-500/20 text-amber-400 border border-amber-500/40" 
                    : "bg-slate-800 text-slate-400 border border-slate-700"
                }`}>
                  ● {currentStatus} [PAPER]
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono">
                Stage 1 Backtesting • Stage 2 Live Simulation • Stage 3 Capital Guardrails • Stage 4 Multi-Strategy
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800/80 bg-[#0a0d18] px-6">
          <button
            onClick={() => setActiveTab("backtest")}
            className={`flex items-center gap-2 py-3 px-4 font-mono text-xs font-semibold border-b-2 transition-all ${
              activeTab === "backtest"
                ? "border-cyan-400 text-cyan-400 bg-cyan-950/20"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <span>🧪</span> STAGE 1: BACKTEST STUDIO
          </button>
          <button
            onClick={() => setActiveTab("live_bot")}
            className={`flex items-center gap-2 py-3 px-4 font-mono text-xs font-semibold border-b-2 transition-all ${
              activeTab === "live_bot"
                ? "border-emerald-400 text-emerald-400 bg-emerald-950/20"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <span>⚡</span> STAGE 2: LIVE PAPER BOT
          </button>
          <button
            onClick={() => setActiveTab("risk_telegram")}
            className={`flex items-center gap-2 py-3 px-4 font-mono text-xs font-semibold border-b-2 transition-all ${
              activeTab === "risk_telegram"
                ? "border-amber-400 text-amber-400 bg-amber-950/20"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <span>🛡️</span> STAGE 3 & 4: RISK & TELEGRAM
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* ===================== TAB 1: BACKTEST STUDIO ===================== */}
          {activeTab === "backtest" && (
            <div className="space-y-6">
              
              {/* Parameter Controls Bar */}
              <div className="p-4 rounded-lg bg-[#0c101d] border border-slate-800 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 font-mono text-xs">
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1 uppercase">Asset</label>
                  <select
                    value={btSymbol}
                    onChange={(e) => setBtSymbol(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-white font-bold"
                  >
                    <option value="BTC/USDT">BTC/USDT</option>
                    <option value="ETH/USDT">ETH/USDT</option>
                    <option value="SOL/USDT">SOL/USDT</option>
                    <option value="XRP/USDT">XRP/USDT</option>
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="text-[10px] text-slate-400 block mb-1 uppercase">Quantitative Strategy</label>
                  <select
                    value={btStrategy}
                    onChange={(e) => setBtStrategy(e.target.value as any)}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-cyan-300 font-bold"
                  >
                    <option value="QUANT_ALPHA_CONFLUENCE">Quant Alpha Master (Multi-Regime Confluence)</option>
                    <option value="SUPERTREND_ATR">Supertrend ATR Volatility Trend (10, 3.0)</option>
                    <option value="SMART_MONEY_FVG">Smart Money Concepts (FVG Liquidity Imbalance)</option>
                    <option value="STOCH_RSI_CROSS">Stochastic RSI Double-Bottom Reversal</option>
                    <option value="VWAP_MEAN_REVERSION">VWAP Multi-Sigma Band Mean Reversion</option>
                    <option value="NEWS_MACRO_MOMENTUM">News Sentiment & Macro Momentum (Fed, CPI, Flows)</option>
                    <option value="DERIVATIVES_SQUEEZE">Derivatives Liquidity Squeeze (Funding Rate Arbitrage)</option>
                    <option value="BOLLINGER_REVERSION">Bollinger Mean Reversion (Volatility Scalper)</option>
                    <option value="EMA_RSI">EMA 20/50 + RSI 14 (Momentum & Pullback)</option>
                    <option value="MACD">MACD Trend-Following (Hist & Signal Cross)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 block mb-1 uppercase">Bar TF</label>
                  <select
                    value={btTimeframe}
                    onChange={(e) => setBtTimeframe(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-white"
                  >
                    <option value="15m">15m</option>
                    <option value="1h">1h</option>
                    <option value="4h">4h</option>
                    <option value="1d">1d</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 block mb-1 uppercase">Lookback</label>
                  <select
                    value={btDays}
                    onChange={(e) => setBtDays(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-white"
                  >
                    <option value={30}>30 Days</option>
                    <option value={60}>60 Days</option>
                    <option value={90}>90 Days</option>
                    <option value={180}>180 Days</option>
                    <option value={365}>365 Days</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 block mb-1 uppercase">Capital ($)</label>
                  <input
                    type="number"
                    value={btCapital}
                    onChange={(e) => setBtCapital(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-white"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 block mb-1 uppercase">SL / TP %</label>
                  <div className="flex gap-1">
                    <input
                      type="number"
                      step="0.5"
                      value={btSlPct}
                      onChange={(e) => setBtSlPct(Number(e.target.value))}
                      className="w-1/2 bg-slate-900 border border-rose-900/60 rounded px-1 py-1.5 text-rose-300 text-center"
                      title="Stop Loss %"
                    />
                    <input
                      type="number"
                      step="0.5"
                      value={btTpPct}
                      onChange={(e) => setBtTpPct(Number(e.target.value))}
                      className="w-1/2 bg-slate-900 border border-emerald-900/60 rounded px-1 py-1.5 text-emerald-300 text-center"
                      title="Take Profit %"
                    />
                  </div>
                </div>

                <div className="flex items-end">
                  <button
                    onClick={handleRunBacktest}
                    disabled={btRunning}
                    className="w-full py-1.5 px-3 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-800 text-white font-bold rounded shadow-lg shadow-cyan-900/40 transition-all flex items-center justify-center gap-1.5"
                  >
                    {btRunning ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Simulating...</span>
                      </>
                    ) : (
                      <>
                        <span>▶</span> RUN
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Backtest Results Scorecard */}
              {btResult && (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 font-mono">
                    <div className="p-3 rounded-lg bg-[#0c101d] border border-slate-800">
                      <div className="text-[10px] text-slate-400 uppercase">Net Profit</div>
                      <div className={`text-lg font-bold ${btResult.metrics.net_profit_usd >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                        {btResult.metrics.net_profit_usd >= 0 ? "+" : ""}${btResult.metrics.net_profit_usd.toLocaleString()}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {btResult.metrics.net_profit_pct >= 0 ? "+" : ""}{btResult.metrics.net_profit_pct.toFixed(2)}% on equity
                      </div>
                    </div>

                    <div className="p-3 rounded-lg bg-[#0c101d] border border-slate-800">
                      <div className="text-[10px] text-slate-400 uppercase">Win Rate</div>
                      <div className="text-lg font-bold text-white">
                        {btResult.metrics.win_rate_pct.toFixed(1)}%
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {btResult.metrics.winning_trades}W / {btResult.metrics.losing_trades}L ({btResult.metrics.total_trades} trades)
                      </div>
                    </div>

                    <div className="p-3 rounded-lg bg-[#0c101d] border border-slate-800">
                      <div className="text-[10px] text-slate-400 uppercase">Max Drawdown</div>
                      <div className="text-lg font-bold text-rose-400">
                        -{btResult.metrics.max_drawdown_pct.toFixed(2)}%
                      </div>
                      <div className="text-[10px] text-slate-500">
                        Peak-to-trough drop
                      </div>
                    </div>

                    <div className="p-3 rounded-lg bg-[#0c101d] border border-slate-800">
                      <div className="text-[10px] text-slate-400 uppercase">Sharpe Ratio</div>
                      <div className={`text-lg font-bold ${btResult.metrics.sharpe_ratio >= 1.0 ? "text-cyan-400" : "text-slate-300"}`}>
                        {btResult.metrics.sharpe_ratio.toFixed(2)}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        Sortino: {btResult.metrics.sortino_ratio.toFixed(2)}
                      </div>
                    </div>

                    <div className="p-3 rounded-lg bg-[#0c101d] border border-slate-800">
                      <div className="text-[10px] text-slate-400 uppercase">Profit Factor</div>
                      <div className="text-lg font-bold text-emerald-400">
                        {btResult.metrics.profit_factor.toFixed(2)}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        Gross Win / Gross Loss
                      </div>
                    </div>

                    <div className="p-3 rounded-lg bg-[#0c101d] border border-slate-800">
                      <div className="text-[10px] text-slate-400 uppercase">Buy & Hold Benchmark</div>
                      <div className={`text-lg font-bold ${btResult.metrics.benchmark_return_pct >= 0 ? "text-cyan-400" : "text-rose-400"}`}>
                        {btResult.metrics.benchmark_return_pct >= 0 ? "+" : ""}{btResult.metrics.benchmark_return_pct.toFixed(1)}%
                      </div>
                      <div className="text-[10px] text-slate-500">
                        Asset performance
                      </div>
                    </div>
                  </div>

                  {/* Visual SVG Equity Curve */}
                  <div className="p-4 rounded-lg bg-[#0c101d] border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between font-mono text-xs">
                      <span className="text-slate-400 uppercase tracking-wider font-semibold">
                        📈 Equity Progression Curve ($)
                      </span>
                      {btHoverPoint ? (
                        <div className="flex items-center gap-3 text-cyan-300 bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-800/40">
                          <span>{btHoverPoint.timestamp}</span>
                          <span className="font-bold">${btHoverPoint.equity.toLocaleString()}</span>
                          <span className="text-rose-400">DD: -{btHoverPoint.drawdown_pct.toFixed(2)}%</span>
                        </div>
                      ) : (
                        <span className="text-slate-500 text-[11px]">Hover curve to inspect equity points</span>
                      )}
                    </div>

                    {btResult.equity_curve.length > 2 ? (
                      <div className="w-full h-56 relative bg-slate-950/60 rounded border border-slate-900 flex items-center justify-center overflow-hidden">
                        {(() => {
                          const pts = btResult.equity_curve;
                          const equities = pts.map(p => p.equity);
                          const minEq = Math.min(...equities) * 0.98;
                          const maxEq = Math.max(...equities) * 1.02;
                          const rangeEq = maxEq - minEq || 1;

                          const width = 800;
                          const height = 200;

                          const coords = pts.map((p, i) => {
                            const x = (i / (pts.length - 1)) * width;
                            const y = height - ((p.equity - minEq) / rangeEq) * height;
                            return { x, y, pt: p };
                          });

                          const pathD = coords.reduce((acc, c, i) => `${acc} ${i === 0 ? "M" : "L"} ${c.x},${c.y}`, "");
                          const areaD = `${pathD} L ${width},${height} L 0,${height} Z`;

                          // Initial capital dashed reference line
                          const initY = height - ((btResult.metrics.initial_capital - minEq) / rangeEq) * height;

                          return (
                            <svg 
                              viewBox={`0 0 ${width} ${height}`} 
                              className="w-full h-full preserve-3d"
                              preserveAspectRatio="none"
                            >
                              <defs>
                                <linearGradient id="equityGrad" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.35" />
                                  <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.0" />
                                </linearGradient>
                              </defs>

                              {/* Baseline Initial Capital */}
                              <line
                                x1="0"
                                y1={initY}
                                x2={width}
                                y2={initY}
                                stroke="#475569"
                                strokeDasharray="4 4"
                                strokeWidth="1"
                              />

                              {/* Area fill */}
                              <path d={areaD} fill="url(#equityGrad)" />

                              {/* Polyline */}
                              <path
                                d={pathD}
                                fill="none"
                                stroke="#06b6d4"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />

                              {/* Hover sensor rects */}
                              {coords.map((c, i) => (
                                <rect
                                  key={i}
                                  x={c.x - (width / pts.length / 2)}
                                  y={0}
                                  width={width / pts.length}
                                  height={height}
                                  fill="transparent"
                                  className="cursor-crosshair"
                                  onMouseEnter={() => setBtHoverPoint(c.pt)}
                                />
                              ))}
                            </svg>
                          );
                        })()}
                      </div>
                    ) : (
                      <div className="h-40 flex items-center justify-center text-slate-500 font-mono text-xs">
                        No equity curve points generated yet.
                      </div>
                    )}
                  </div>

                  {/* Trade Ledger Table */}
                  <div className="p-4 rounded-lg bg-[#0c101d] border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between font-mono text-xs">
                      <span className="text-slate-400 uppercase tracking-wider font-semibold">
                        📋 Historical Trade Ledger ({btResult.trades.length} Executed Trades)
                      </span>
                      <span className="text-slate-500 text-[11px]">
                        Consecutive Wins: {btResult.metrics.max_consecutive_wins} | Losses: {btResult.metrics.max_consecutive_losses}
                      </span>
                    </div>

                    <div className="max-h-60 overflow-y-auto rounded border border-slate-800/80">
                      <table className="w-full text-left font-mono text-xs">
                        <thead className="bg-[#0a0d18] text-[10px] text-slate-400 uppercase sticky top-0 border-b border-slate-800">
                          <tr>
                            <th className="py-2 px-3">#</th>
                            <th className="py-2 px-3">Side</th>
                            <th className="py-2 px-3">Entry Time</th>
                            <th className="py-2 px-3">Exit Time</th>
                            <th className="py-2 px-3">Entry Price</th>
                            <th className="py-2 px-3">Exit Price</th>
                            <th className="py-2 px-3">Size</th>
                            <th className="py-2 px-3">PnL ($)</th>
                            <th className="py-2 px-3">Return</th>
                            <th className="py-2 px-3">Exit Trigger</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60 bg-slate-950/40">
                          {btResult.trades.length === 0 ? (
                            <tr>
                              <td colSpan={10} className="py-4 text-center text-slate-500">
                                No trades generated under these strategy parameters.
                              </td>
                            </tr>
                          ) : (
                            btResult.trades.map((t) => {
                              const isWin = t.pnl > 0;
                              return (
                                <tr key={t.id} className="hover:bg-slate-900/60 transition-colors">
                                  <td className="py-1.5 px-3 text-slate-500">{t.id}</td>
                                  <td className="py-1.5 px-3">
                                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                      t.side === "BUY" ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"
                                    }`}>
                                      {t.side}
                                    </span>
                                  </td>
                                  <td className="py-1.5 px-3 text-slate-300">{t.entry_time}</td>
                                  <td className="py-1.5 px-3 text-slate-300">{t.exit_time}</td>
                                  <td className="py-1.5 px-3 text-slate-200">${t.entry_price.toLocaleString()}</td>
                                  <td className="py-1.5 px-3 text-slate-200">${t.exit_price.toLocaleString()}</td>
                                  <td className="py-1.5 px-3 text-slate-400">{t.size}</td>
                                  <td className={`py-1.5 px-3 font-bold ${isWin ? "text-emerald-400" : "text-rose-400"}`}>
                                    {isWin ? "+" : ""}${t.pnl.toFixed(2)}
                                  </td>
                                  <td className={`py-1.5 px-3 font-bold ${isWin ? "text-emerald-400" : "text-rose-400"}`}>
                                    {isWin ? "+" : ""}{t.pnl_pct.toFixed(2)}%
                                  </td>
                                  <td className="py-1.5 px-3">
                                    <span className="px-1.5 py-0.5 rounded text-[9px] bg-slate-800 text-slate-300">
                                      {t.exit_reason.replace(/_/g, " ")}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}

              {!btResult && !btRunning && (
                <div className="py-12 text-center rounded-lg border border-dashed border-slate-800 text-slate-500 font-mono text-xs">
                  Click <span className="text-cyan-400 font-bold">"RUN"</span> above to simulate and backtest historical performance.
                </div>
              )}
            </div>
          )}

          {/* ===================== TAB 2: LIVE PAPER BOT ===================== */}
          {activeTab === "live_bot" && (
            <div className="space-y-6">
              
              {/* Bot State Actions Header */}
              <div className="p-4 rounded-lg bg-[#0c101d] border border-slate-800 flex flex-wrap items-center justify-between gap-4 font-mono">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${isRunning ? "bg-emerald-400 animate-ping" : isPaused ? "bg-amber-400" : "bg-slate-600"}`} />
                  <div>
                    <div className="text-sm font-bold text-white">
                      AUTONOMOUS TRADING ENGINE: <span className="text-cyan-400">{currentStatus}</span>
                    </div>
                    <div className="text-xs text-slate-400">
                      Uptime: {botStatus?.stats.uptime_seconds || 0}s | Monitored: {botStatus?.config.symbols.join(", ") || "BTC, ETH, SOL"}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {!isRunning && (
                    <button
                      onClick={() => handleBotControl(isPaused ? "resume" : "start")}
                      disabled={botActionLoading}
                      className="px-4 py-2 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-lg shadow-emerald-950/40 flex items-center gap-1.5"
                    >
                      <span>▶</span> {isPaused ? "RESUME BOT" : "START LIVE BOT"}
                    </button>
                  )}

                  {isRunning && (
                    <button
                      onClick={() => handleBotControl("pause")}
                      disabled={botActionLoading}
                      className="px-4 py-2 rounded bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition-all flex items-center gap-1.5"
                    >
                      <span>⏸</span> PAUSE
                    </button>
                  )}

                  {(isRunning || isPaused) && (
                    <button
                      onClick={() => handleBotControl("stop")}
                      disabled={botActionLoading}
                      className="px-4 py-2 rounded bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold transition-all flex items-center gap-1.5"
                    >
                      <span>⏹</span> STOP
                    </button>
                  )}

                  {/* EMERGENCY KILL SWITCH */}
                  <button
                    onClick={() => handleBotControl("emergency-stop")}
                    disabled={botActionLoading}
                    className="px-4 py-2 rounded bg-rose-700 hover:bg-rose-600 text-white text-xs font-bold transition-all shadow-lg shadow-rose-950/50 flex items-center gap-1.5 border border-rose-500/40"
                    title="Liquidate all open positions immediately and halt trading"
                  >
                    <span>🚨</span> EMERGENCY LIQUIDATE ALL
                  </button>
                </div>
              </div>

              {/* Bot Live Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
                <div className="p-3 rounded-lg bg-[#0c101d] border border-slate-800">
                  <div className="text-[10px] text-slate-400 uppercase">Realized Bot PnL</div>
                  <div className={`text-lg font-bold ${(botStatus?.stats.total_realized_pnl || 0) >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                    {(botStatus?.stats.total_realized_pnl || 0) >= 0 ? "+" : ""}${botStatus?.stats.total_realized_pnl?.toFixed(2) || "0.00"}
                  </div>
                  <div className="text-[10px] text-slate-500">Virtual balance profits</div>
                </div>

                <div className="p-3 rounded-lg bg-[#0c101d] border border-slate-800">
                  <div className="text-[10px] text-slate-400 uppercase">Win Rate</div>
                  <div className="text-lg font-bold text-white">
                    {botStatus?.stats.win_rate_pct?.toFixed(1) || "0.0"}%
                  </div>
                  <div className="text-[10px] text-slate-500">
                    {botStatus?.stats.winning_trades || 0}W / {botStatus?.stats.losing_trades || 0}L
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-[#0c101d] border border-slate-800">
                  <div className="text-[10px] text-slate-400 uppercase">Active Positions</div>
                  <div className="text-lg font-bold text-cyan-400">
                    {botStatus?.stats.active_positions_count || 0} / {botStatus?.config.max_open_positions || 3}
                  </div>
                  <div className="text-[10px] text-slate-500">Open in broker</div>
                </div>

                <div className="p-3 rounded-lg bg-[#0c101d] border border-slate-800">
                  <div className="text-[10px] text-slate-400 uppercase">Today's Drawdown</div>
                  <div className="text-lg font-bold text-amber-400">
                    ${botStatus?.stats.daily_drawdown_usd?.toFixed(2) || "0.00"}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    Limit: ${botStatus?.config.max_daily_loss_usd?.toFixed(0) || "5000"}
                  </div>
                </div>
              </div>

              {/* Bot Execution Parameters Configuration */}
              <div className="p-4 rounded-lg bg-[#0c101d] border border-slate-800 space-y-4 font-mono text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-300 uppercase font-semibold text-xs tracking-wider">
                    ⚙️ Execution & Risk Guardrails
                  </span>
                  <button
                    onClick={handleSaveBotConfig}
                    className="px-3 py-1 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded text-xs shadow-md transition-all"
                  >
                    SAVE & APPLY CONFIG
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1 uppercase">Signal Strategy</label>
                    <select
                      value={botStrategy}
                      onChange={(e) => setBotStrategy(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-white"
                    >
                      <option value="QUANT_ALPHA_CONFLUENCE">Quant Alpha Master (Multi-Regime Confluence)</option>
                      <option value="NEWS_MACRO_MOMENTUM">News Sentiment & Macro Momentum (Fed, CPI, Flows)</option>
                      <option value="DERIVATIVES_SQUEEZE">Derivatives Liquidity Squeeze (Funding Rate Hunter)</option>
                      <option value="BOLLINGER_REVERSION">Bollinger Mean Reversion (Volatility Scalper)</option>
                      <option value="TECHNICAL_MOMENTUM">Technical Momentum (RSI / EMA / MACD)</option>
                      <option value="MACD">MACD Trend-Following (Hist & Signal Cross)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1 uppercase">Min Conviction: {minConviction}%</label>
                    <input
                      type="range"
                      min="50"
                      max="90"
                      value={minConviction}
                      onChange={(e) => setMinConviction(Number(e.target.value))}
                      className="w-full accent-cyan-400 cursor-pointer"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1 uppercase">Position Size ($ USD)</label>
                    <input
                      type="number"
                      step="500"
                      value={tradeSizeUsd}
                      onChange={(e) => setTradeSizeUsd(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-white"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1 uppercase">Max Open Positions</label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={maxPositions}
                      onChange={(e) => setMaxPositions(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-white"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1 uppercase">Stop Loss %</label>
                    <input
                      type="number"
                      step="0.5"
                      value={botSlPct}
                      onChange={(e) => setBotSlPct(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-rose-900/60 rounded px-2 py-1.5 text-rose-300"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1 uppercase">Take Profit %</label>
                    <input
                      type="number"
                      step="0.5"
                      value={botTpPct}
                      onChange={(e) => setBotTpPct(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-emerald-900/60 rounded px-2 py-1.5 text-emerald-300"
                    />
                  </div>

                  <div className="flex items-center gap-3 pt-4">
                    <input
                      type="checkbox"
                      id="trailingToggle"
                      checked={trailingEnabled}
                      onChange={(e) => setTrailingEnabled(e.target.checked)}
                      className="w-4 h-4 accent-cyan-400 rounded"
                    />
                    <label htmlFor="trailingToggle" className="text-slate-300 text-xs select-none">
                      Trailing Stop ({trailingPct}%)
                    </label>
                  </div>
                </div>
              </div>

              {/* Live Macro & Derivatives Telemetry Banner */}
              {botStatus?.macro_telemetry && (
                <div className="p-3.5 rounded-lg bg-gradient-to-r from-[#0a1224] via-[#0b162c] to-[#09101f] border border-cyan-500/30 grid grid-cols-2 sm:grid-cols-4 gap-4 font-mono text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase tracking-wider font-semibold">News & Macro Sentiment</span>
                    <div className="flex items-center gap-2 font-bold mt-0.5">
                      <span className={`text-sm ${(botStatus.macro_telemetry.news_sentiment_score || 0) >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                        {(botStatus.macro_telemetry.news_sentiment_score || 0) >= 0 ? "+" : ""}{botStatus.macro_telemetry.news_sentiment_score?.toFixed(2) || "0.00"}
                      </span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-cyan-300 font-bold border border-slate-700">
                        {botStatus.macro_telemetry.news_sentiment_label || "NEUTRAL"}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 truncate block mt-1">
                      {botStatus.macro_telemetry.top_catalyst || "Macro Liquidity Flow"}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase tracking-wider font-semibold">Perp Funding & Bias</span>
                    <div className="flex items-center gap-2 font-bold mt-0.5">
                      <span className={`text-sm ${(botStatus.macro_telemetry.funding_rate_pct || 0) >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                        {(botStatus.macro_telemetry.funding_rate_pct || 0) >= 0 ? "+" : ""}{botStatus.macro_telemetry.funding_rate_pct?.toFixed(4) || "0.0000"}%
                      </span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold border ${
                        botStatus.macro_telemetry.funding_bias === "SHORT_CROWDED" ? "bg-emerald-950 text-emerald-400 border-emerald-800" :
                        botStatus.macro_telemetry.funding_bias === "LONG_CROWDED" ? "bg-rose-950 text-rose-400 border-rose-800" :
                        "bg-slate-800 text-slate-400 border-slate-700"
                      }`}>
                        {botStatus.macro_telemetry.funding_bias?.replace("_", " ") || "NEUTRAL"}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 block mt-1">
                      OI: ${((botStatus.macro_telemetry.open_interest_usd || 0) / 1e9).toFixed(2)}B
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase tracking-wider font-semibold">DefiLlama Stablecoin Flow</span>
                    <div className="flex items-center gap-2 font-bold mt-0.5">
                      <span className={`text-sm ${(botStatus.macro_telemetry.stablecoin_30d_change_usd || 0) >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                        {(botStatus.macro_telemetry.stablecoin_30d_change_usd || 0) >= 0 ? "+" : ""}${((botStatus.macro_telemetry.stablecoin_30d_change_usd || 0) / 1e9).toFixed(2)}B
                      </span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800 font-bold">
                        {botStatus.macro_telemetry.stablecoin_flow_signal?.replace(/_/g, " ") || "NEUTRAL"}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 block mt-1">
                      DeFi TVL: ${((botStatus.macro_telemetry.total_defi_tvl_usd || 0) / 1e9).toFixed(2)}B
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase tracking-wider font-semibold">Macro Confluence State</span>
                    <div className="flex items-center gap-1.5 font-bold text-cyan-300 mt-0.5">
                      <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                      <span className="text-xs">ACTIVE CONFLUENCE</span>
                    </div>
                    <span className="text-[10px] text-emerald-400 block mt-1">
                      Fed • Inflation • On-Chain Synchronized
                    </span>
                  </div>
                </div>
              )}

              {/* Live Terminal Audit Feed */}
              <div className="p-4 rounded-lg bg-[#0c101d] border border-slate-800 space-y-2">
                <div className="flex items-center justify-between font-mono text-xs">
                  <span className="text-slate-400 uppercase tracking-wider font-semibold">
                    📟 Live Terminal Audit Stream (Auto-scrolls)
                  </span>
                  <span className="text-[10px] text-slate-500">
                    Last scan: {botStatus?.stats.last_eval_time || "Pending"}
                  </span>
                </div>

                <div className="bg-black/90 rounded border border-slate-900 p-3 font-mono text-xs h-64 overflow-y-auto space-y-1.5 flex flex-col-reverse">
                  {(!botStatus?.recent_logs || botStatus.recent_logs.length === 0) ? (
                    <div className="text-slate-600 text-center py-6">Waiting for engine activity logs...</div>
                  ) : (
                    botStatus.recent_logs.map((l: BotLogEntry) => {
                      const levelColor = 
                        l.level === "TRADE" ? "text-emerald-400 bg-emerald-950/40 border-emerald-800/40" :
                        l.level === "SIGNAL" ? "text-cyan-400 bg-cyan-950/40 border-cyan-800/40" :
                        l.level === "RISK" ? "text-rose-400 bg-rose-950/40 border-rose-800/40" :
                        l.level === "WARNING" ? "text-amber-400 bg-amber-950/40 border-amber-800/40" :
                        l.level === "ERROR" ? "text-red-500 bg-red-950/40 border-red-800/40" :
                        "text-slate-400 bg-slate-900/40 border-slate-800";

                      return (
                        <div key={l.id} className="flex items-baseline gap-2 leading-relaxed">
                          <span className="text-slate-600 shrink-0 text-[10px]">{l.timestamp}</span>
                          <span className={`px-1 py-0.2 rounded text-[9px] font-bold border shrink-0 ${levelColor}`}>
                            [{l.level}]
                          </span>
                          {l.symbol && (
                            <span className="text-slate-300 font-bold shrink-0">[{l.symbol}]</span>
                          )}
                          <span className="text-slate-300 break-words">{l.message}</span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ===================== TAB 3: RISK & TELEGRAM ALERTS ===================== */}
          {activeTab === "risk_telegram" && (
            <div className="space-y-6 max-w-2xl font-mono text-xs">
              
              {/* Daily Loss Circuit Breaker */}
              <div className="p-4 rounded-lg bg-[#0c101d] border border-slate-800 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-rose-400 text-base">🛡️</span>
                  <div>
                    <h3 className="text-sm font-bold text-white">Daily Drawdown Circuit Breaker</h3>
                    <p className="text-[11px] text-slate-400">
                      Emergency halt trigger: If aggregate realized losses within a 24-hour UTC window exceed this limit, the engine automatically freezes all new orders.
                    </p>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 block mb-1 uppercase">Max Daily Loss Limit ($ USD)</label>
                  <input
                    type="number"
                    step="500"
                    value={maxDailyLoss}
                    onChange={(e) => setMaxDailyLoss(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white font-bold text-sm"
                  />
                </div>
              </div>

              {/* Telegram Bot Setup */}
              <div className="p-4 rounded-lg bg-[#0c101d] border border-slate-800 space-y-4">
                <div className="flex items-center gap-2">
                  <span className="text-cyan-400 text-base">📱</span>
                  <div>
                    <h3 className="text-sm font-bold text-white">Telegram Execution & Risk Alerts</h3>
                    <p className="text-[11px] text-slate-400">
                      Receive instant push notifications on your phone whenever the bot buys, sells, hits take-profit, triggers a trailing stop, or encounters a circuit breaker.
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1 uppercase">Telegram Bot Token</label>
                    <input
                      type="password"
                      placeholder="e.g. 7123456789:AAHk..."
                      value={tgToken}
                      onChange={(e) => setTgToken(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white"
                    />
                    <span className="text-[10px] text-slate-500 mt-0.5 block">Create a bot via @BotFather on Telegram</span>
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1 uppercase">Telegram Chat ID</label>
                    <input
                      type="text"
                      placeholder="e.g. 123456789 or -100123456789"
                      value={tgChatId}
                      onChange={(e) => setTgChatId(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white"
                    />
                    <span className="text-[10px] text-slate-500 mt-0.5 block">Send a message to @userinfobot to get your Chat ID</span>
                  </div>

                  <div className="flex items-center gap-3 pt-2">
                    <button
                      onClick={handleTestTelegram}
                      disabled={tgTesting || !tgToken || !tgChatId}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white rounded font-bold transition-all flex items-center gap-1.5"
                    >
                      {tgTesting ? "Sending Test..." : "📨 Send Test Alert"}
                    </button>

                    {tgTestSuccess === true && (
                      <span className="text-emerald-400 text-[11px]">✓ Test message sent successfully!</span>
                    )}
                    {tgTestSuccess === false && (
                      <span className="text-rose-400 text-[11px]">✗ Failed to send. Check token and chat ID.</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Save Button */}
              <div className="flex justify-end">
                <button
                  onClick={handleSaveRiskTelegram}
                  disabled={savingRisk}
                  className="px-5 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-lg shadow-lg shadow-cyan-900/40 transition-all text-xs"
                >
                  {savingRisk ? "Saving Settings..." : "SAVE RISK & NOTIFICATION SETTINGS"}
                </button>
              </div>

            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-800/80 bg-[#0c101d] flex items-center justify-between text-xs font-mono text-slate-500">
          <div>
            Zero Real Money at Risk • Virtual Broker Engine Active
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
          >
            Close Studio
          </button>
        </div>

      </div>
    </div>
  );
}
