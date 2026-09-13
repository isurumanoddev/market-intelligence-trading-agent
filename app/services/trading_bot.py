import time
import asyncio
import uuid
from datetime import datetime
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

from app.models.market_data import Candle, Ticker, OrderBook, Trade
from app.models.decision import PaperPosition, PaperTradeRecord, TradingDecision
from app.services.paper_broker import paper_broker
from app.services.market_service import market_service
from app.services.technical_analysis import technical_analyzer
from app.services.telegram_service import telegram_service
from app.services.derivatives_service import derivatives_service
from app.services.onchain_service import onchain_service
from app.services.news_service import news_service
from app.agents.sentiment_agent import sentiment_agent

class BotConfig(BaseModel):
    enabled: bool = False
    mode: str = "PAPER"  # PAPER or LIVE
    symbols: List[str] = ["BTC/USDT", "ETH/USDT", "SOL/USDT"]
    strategy: str = "QUANT_ALPHA_CONFLUENCE"  # "EMA_RSI", "MACD", "BOLLINGER_REVERSION", "DERIVATIVES_SQUEEZE", "NEWS_MACRO_MOMENTUM", "QUANT_ALPHA_CONFLUENCE"
    min_conviction: float = 70.0          # Minimum conviction % to trigger trade
    trade_size_usd: float = 2000.0        # Position size in USD
    max_open_positions: int = 3           # Max concurrent positions
    auto_sl_tp: bool = True               # Attach Stop Loss & Take Profit automatically
    stop_loss_pct: float = 2.0            # 2.0% Stop Loss
    take_profit_pct: float = 4.5          # 4.5% Take Profit (1:2.25 R:R)
    trailing_stop_enabled: bool = True    # Trailing Stop Loss
    trailing_stop_pct: float = 1.5        # 1.5% Trailing Stop
    max_daily_loss_usd: float = 5000.0    # Circuit breaker: Halt if daily loss exceeds limit
    cooldown_seconds: int = 60            # Wait time between trades on same symbol
    poll_interval_seconds: int = 15       # Engine evaluation loop interval

class BotStats(BaseModel):
    status: str = "STOPPED"               # STOPPED, RUNNING, PAUSED
    uptime_seconds: int = 0
    total_trades: int = 0
    winning_trades: int = 0
    losing_trades: int = 0
    win_rate_pct: float = 0.0
    total_realized_pnl: float = 0.0
    profit_factor: float = 1.0
    active_positions_count: int = 0
    last_eval_time: str = ""
    daily_drawdown_usd: float = 0.0
    circuit_breaker_triggered: bool = False

class BotLogEntry(BaseModel):
    id: str
    timestamp: str
    level: str  # INFO, SIGNAL, TRADE, RISK, WARNING, ERROR
    symbol: Optional[str] = None
    message: str
    details: Optional[Dict[str, Any]] = None

class TradingBotService:
    def __init__(self):
        self.config = BotConfig()
        self.stats = BotStats()
        self.logs: List[BotLogEntry] = []
        self._max_logs = 250
        self._task: Optional[asyncio.Task] = None
        self._start_time: Optional[float] = None
        self._last_trade_time_per_symbol: Dict[str, float] = {}
        self._day_start_timestamp: float = time.time()
        self._daily_realized_losses: float = 0.0
        self._trailing_high_watermark: Dict[str, float] = {}  # pos_id -> highest price seen
        self._trailing_low_watermark: Dict[str, float] = {}   # pos_id -> lowest price seen (for shorts)
        
        # Initial boot log
        self._add_log("INFO", "Trading Bot Engine initialized with 6 Advanced Quant & Macro Strategies.", symbol=None)

    def _add_log(self, level: str, message: str, symbol: Optional[str] = None, details: Optional[Dict[str, Any]] = None):
        now_str = datetime.now().strftime("%H:%M:%S")
        entry = BotLogEntry(
            id=f"log_{uuid.uuid4().hex[:8]}",
            timestamp=now_str,
            level=level,
            symbol=symbol,
            message=message,
            details=details
        )
        self.logs.append(entry)
        if len(self.logs) > self._max_logs:
            self.logs.pop(0)

    # ------------------ Lifecycle Management ------------------

    async def start(self) -> Dict[str, Any]:
        if self.stats.status == "RUNNING":
            return {"status": "already_running", "message": "Bot is already running."}

        self.stats.status = "RUNNING"
        self.config.enabled = True
        self.stats.circuit_breaker_triggered = False
        self._start_time = time.time()
        
        # Start background loop
        if self._task and not self._task.done():
            self._task.cancel()
        self._task = asyncio.create_task(self._run_loop())

        self._add_log("INFO", f"Bot started in {self.config.mode} mode. Strategy: {self.config.strategy}. Monitored: {', '.join(self.config.symbols)}")
        return {"status": "started", "config": self.config.model_dump(), "stats": self.stats.model_dump()}

    def pause(self) -> Dict[str, Any]:
        if self.stats.status != "RUNNING":
            return {"status": self.stats.status, "message": "Bot is not running."}
        self.stats.status = "PAUSED"
        self._add_log("WARNING", "Bot execution PAUSED. Existing positions are still monitored for SL/TP.")
        return {"status": "paused", "stats": self.stats.model_dump()}

    def resume(self) -> Dict[str, Any]:
        if self.stats.status != "PAUSED":
            return {"status": self.stats.status, "message": "Bot is not paused."}
        self.stats.status = "RUNNING"
        self._add_log("INFO", "Bot execution RESUMED. Scanning active market pairs.")
        return {"status": "running", "stats": self.stats.model_dump()}

    def stop(self) -> Dict[str, Any]:
        self.stats.status = "STOPPED"
        self.config.enabled = False
        if self._task and not self._task.done():
            self._task.cancel()
        self._add_log("INFO", "Bot execution STOPPED.")
        return {"status": "stopped", "stats": self.stats.model_dump()}

    def emergency_stop_and_liquidate(self) -> Dict[str, Any]:
        """Panic Button: Liquidate all open positions immediately and halt bot."""
        self.stop()
        closed_count = 0
        total_liquidated_val = 0.0

        open_pos_ids = list(paper_broker.positions.keys())
        for pos_id in open_pos_ids:
            pos = paper_broker.positions.get(pos_id)
            if pos:
                try:
                    ticker = market_service.get_ticker(pos.symbol)
                    p = ticker.price or pos.current_price
                    rec = paper_broker.close_position(pos_id, p, reason="EMERGENCY BOT LIQUIDATION")
                    closed_count += 1
                    total_liquidated_val += rec.value
                except Exception as e:
                    self._add_log("ERROR", f"Failed to liquidate {pos.symbol}: {e}", symbol=pos.symbol)

        self._add_log("RISK", f"🚨 EMERGENCY KILL SWITCH: Liquidated {closed_count} open positions (${total_liquidated_val:.2f}). Bot halted.")
        self.stats.circuit_breaker_triggered = True
        return {
            "status": "emergency_halted",
            "liquidated_positions": closed_count,
            "liquidated_value": total_liquidated_val
        }

    def update_config(self, updates: Dict[str, Any]) -> BotConfig:
        current = self.config.model_dump()
        for k, v in updates.items():
            if v is not None and k in current:
                current[k] = v
        self.config = BotConfig(**current)
        self._add_log("INFO", "Bot configuration updated.", details=updates)
        return self.config

    def get_status(self) -> Dict[str, Any]:
        if self._start_time and self.stats.status == "RUNNING":
            self.stats.uptime_seconds = int(time.time() - self._start_time)
        
        self.stats.active_positions_count = len(paper_broker.positions)
        
        # Calculate PnL and Win Rate from paper_broker history
        bot_trades = [t for t in paper_broker.trades_history if "BOT" in t.reason.upper()]
        total = len(bot_trades)
        wins = len([t for t in bot_trades if t.pnl > 0])
        losses = len([t for t in bot_trades if t.pnl < 0])
        win_rate = (wins / total * 100) if total > 0 else 0.0
        tot_pnl = sum(t.pnl for t in bot_trades)
        gross_wins = sum(t.pnl for t in bot_trades if t.pnl > 0)
        gross_losses = abs(sum(t.pnl for t in bot_trades if t.pnl < 0))
        pf = (gross_wins / gross_losses) if gross_losses > 0 else (gross_wins if gross_wins > 0 else 1.0)

        self.stats.total_trades = total
        self.stats.winning_trades = wins
        self.stats.losing_trades = losses
        self.stats.win_rate_pct = round(win_rate, 1)
        self.stats.total_realized_pnl = round(tot_pnl, 2)
        self.stats.profit_factor = round(pf, 2)

        # Macro & Derivatives Telemetry Snapshot
        macro_telemetry = {}
        try:
            deriv = derivatives_service.get_derivatives_data("BTC/USDT")
            onchain = onchain_service.get_onchain_data()
            news = news_service.get_news_for_symbol("BTC/USDT", limit=5)
            sent, _ = sentiment_agent.analyze("BTC/USDT", news)
            macro_telemetry = {
                "funding_rate_pct": deriv.funding_rate_pct,
                "funding_bias": deriv.funding_bias,
                "open_interest_usd": deriv.open_interest_usd,
                "stablecoin_flow_signal": onchain.stablecoin_flow_signal,
                "stablecoin_30d_change_usd": onchain.stablecoin_30d_change_usd,
                "total_defi_tvl_usd": onchain.total_defi_tvl_usd,
                "news_sentiment_score": sent.overall_sentiment_score,
                "news_sentiment_label": sent.overall_sentiment_label,
                "top_catalyst": sent.top_catalysts[0] if sent.top_catalysts else "Macro Liquidity Flow"
            }
        except Exception:
            pass

        return {
            "config": self.config.model_dump(),
            "stats": self.stats.model_dump(),
            "macro_telemetry": macro_telemetry,
            "recent_logs": [l.model_dump() for l in reversed(self.logs[-40:])]
        }

    # ------------------ Core 5-Stage Execution Loop ------------------

    async def _run_loop(self):
        self._add_log("INFO", "Trading Engine loop started.")
        while self.config.enabled:
            try:
                now = time.time()
                self.stats.last_eval_time = datetime.now().strftime("%H:%M:%S")

                # Reset daily loss tracker at midnight UTC
                if now - self._day_start_timestamp >= 86400:
                    self._day_start_timestamp = now
                    self._daily_realized_losses = 0.0
                    self.stats.daily_drawdown_usd = 0.0

                # 1. Update Open Positions & Check Trailing Stops
                await self._monitor_open_positions()

                # 2. Check Circuit Breakers
                if self._daily_realized_losses >= self.config.max_daily_loss_usd:
                    if not self.stats.circuit_breaker_triggered:
                        self.stats.circuit_breaker_triggered = True
                        self._add_log("RISK", f"🚨 CIRCUIT BREAKER HIT: Daily losses reached ${self._daily_realized_losses:.2f} >= ${self.config.max_daily_loss_usd:.2f}. Halting new trades.")
                        try:
                            telegram_service.send_circuit_breaker(self._daily_realized_losses, self.config.max_daily_loss_usd)
                        except Exception:
                            pass
                    self.stats.status = "PAUSED"
                
                # 3. If running, evaluate candidate symbols
                if self.stats.status == "RUNNING" and not self.stats.circuit_breaker_triggered:
                    # Check max positions constraint
                    if len(paper_broker.positions) < self.config.max_open_positions:
                        for symbol in self.config.symbols:
                            # Check symbol cooldown
                            last_t = self._last_trade_time_per_symbol.get(symbol, 0.0)
                            if now - last_t < self.config.cooldown_seconds:
                                continue

                            # Skip if already holding position in this symbol
                            if any(p.symbol == symbol.upper() for p in paper_broker.positions.values()):
                                continue

                            # Evaluate symbol
                            await self._evaluate_and_trade(symbol)
                            
                            if len(paper_broker.positions) >= self.config.max_open_positions:
                                break

            except asyncio.CancelledError:
                break
            except Exception as e:
                self._add_log("ERROR", f"Loop iteration error: {e}")

            await asyncio.sleep(self.config.poll_interval_seconds)

    # ------------------ Stage 1 & 2: Monitor Open Positions & Trailing Stops ------------------

    async def _monitor_open_positions(self):
        """Monitors all active positions, tracks high/low watermarks, and adjusts trailing stops."""
        current_prices = {}
        for pos_id, pos in list(paper_broker.positions.items()):
            try:
                ticker = await asyncio.to_thread(market_service.get_ticker, pos.symbol)
                price = ticker.price
                current_prices[pos.symbol] = price

                # Trailing Stop Logic
                if self.config.trailing_stop_enabled:
                    if pos.side == "BUY":
                        high_mark = max(self._trailing_high_watermark.get(pos_id, pos.entry_price), price)
                        self._trailing_high_watermark[pos_id] = high_mark
                        
                        trail_distance = high_mark * (self.config.trailing_stop_pct / 100.0)
                        proposed_sl = round(high_mark - trail_distance, 4)
                        
                        if pos.stop_loss is None or proposed_sl > pos.stop_loss:
                            old_sl = pos.stop_loss
                            pos.stop_loss = proposed_sl
                            if old_sl:
                                self._add_log("RISK", f"{pos.symbol} Long Trailing SL trailed up from ${old_sl} to ${proposed_sl}", symbol=pos.symbol)
                    else:
                        low_mark = min(self._trailing_low_watermark.get(pos_id, pos.entry_price), price)
                        self._trailing_low_watermark[pos_id] = low_mark
                        
                        trail_distance = low_mark * (self.config.trailing_stop_pct / 100.0)
                        proposed_sl = round(low_mark + trail_distance, 4)
                        
                        if pos.stop_loss is None or proposed_sl < pos.stop_loss:
                            old_sl = pos.stop_loss
                            pos.stop_loss = proposed_sl
                            if old_sl:
                                self._add_log("RISK", f"{pos.symbol} Short Trailing SL trailed down from ${old_sl} to ${proposed_sl}", symbol=pos.symbol)

            except Exception:
                pass

        if current_prices:
            old_history_len = len(paper_broker.trades_history)
            paper_broker.update_prices(current_prices)
            
            if len(paper_broker.trades_history) > old_history_len:
                new_trades = paper_broker.trades_history[old_history_len:]
                for t in new_trades:
                    if t.pnl < 0:
                        self._daily_realized_losses += abs(t.pnl)
                        self.stats.daily_drawdown_usd = round(self._daily_realized_losses, 2)
                    self._add_log("TRADE", f"Position Closed: {t.symbol} {t.side} @ ${t.price} (PnL: ${t.pnl:+.2f}). Reason: {t.reason}", symbol=t.symbol)
                    try:
                        pnl_pct = (t.pnl / t.value * 100.0) if t.value > 0 else 0.0
                        telegram_service.send_close_alert(t.symbol, t.side, t.price, t.pnl, pnl_pct, t.reason)
                    except Exception:
                        pass

    # ------------------ Stage 3: Strategy Signal Evaluation with Advanced Quant, News & Macro ------------------

    async def _evaluate_and_trade(self, symbol: str):
        """Evaluates strategy signals (Technicals, Bollinger, Derivatives, News & Macro, or Quant Confluence)."""
        try:
            # 1. Fetch Market Candlesticks & Ticker
            candles = await asyncio.to_thread(market_service.get_ohlcv, symbol, "1h", 60)
            ticker = await asyncio.to_thread(market_service.get_ticker, symbol)
            if not candles or not ticker or ticker.price <= 0:
                return

            current_price = ticker.price
            indicators = technical_analyzer.calculate_indicators(candles)

            signal_action = "HOLD"
            conviction = 50.0
            reasons = []

            strat = self.config.strategy

            # ------------------ Strategy 1: EMA + RSI Momentum ------------------
            if strat in ["TECHNICAL_MOMENTUM", "EMA_RSI"]:
                rsi = indicators.rsi or 50.0
                ema20 = indicators.ema_20 or current_price
                ema50 = indicators.ema_50 or current_price
                macd_hist = indicators.macd_hist or 0.0

                bull_pts = 0
                bear_pts = 0

                if rsi <= 35:
                    bull_pts += 30
                    reasons.append(f"RSI oversold ({rsi:.1f} <= 35)")
                elif rsi >= 65:
                    bear_pts += 30
                    reasons.append(f"RSI overbought ({rsi:.1f} >= 65)")
                elif 42 <= rsi <= 55:
                    bull_pts += 20
                    reasons.append(f"RSI pullback zone ({rsi:.1f})")

                if ema20 > ema50:
                    bull_pts += 35
                    reasons.append(f"EMA 20 (${ema20:.1f}) > EMA 50 (${ema50:.1f}) Bullish Golden Cross")
                elif ema20 < ema50:
                    bear_pts += 35
                    reasons.append(f"EMA 20 (${ema20:.1f}) < EMA 50 (${ema50:.1f}) Bearish Death Cross")

                if macd_hist > 0.001:
                    bull_pts += 35
                    reasons.append(f"MACD Hist Expanding (+{macd_hist:.3f})")
                elif macd_hist < -0.001:
                    bear_pts += 35
                    reasons.append(f"MACD Hist Contracting ({macd_hist:.3f})")

                if bull_pts >= 65 and bull_pts > bear_pts:
                    signal_action = "BUY"
                    conviction = float(bull_pts)
                elif bear_pts >= 65 and bear_pts > bull_pts:
                    signal_action = "SELL"
                    conviction = float(bear_pts)

            # ------------------ Strategy 2: MACD Trend-Following ------------------
            elif strat == "MACD":
                macd_val = indicators.macd or 0.0
                macd_sig = indicators.macd_signal or 0.0
                macd_hist = indicators.macd_hist or 0.0

                if macd_val > macd_sig and macd_hist > 0:
                    signal_action = "BUY"
                    conviction = 72.0
                    reasons.append(f"MACD above signal line (+{macd_hist:.3f})")
                elif macd_val < macd_sig and macd_hist < 0:
                    signal_action = "SELL"
                    conviction = 72.0
                    reasons.append(f"MACD below signal line ({macd_hist:.3f})")

            # ------------------ Strategy 3: Bollinger Mean Reversion (Volatility Scalper) ------------------
            elif strat == "BOLLINGER_REVERSION":
                bb_lower = indicators.bb_lower or (current_price * 0.98)
                bb_upper = indicators.bb_upper or (current_price * 1.02)
                rsi = indicators.rsi or 50.0

                if current_price <= bb_lower and rsi <= 38:
                    signal_action = "BUY"
                    conviction = 78.0
                    reasons.append(f"Price (${current_price:.1f}) pierced Lower Bollinger Band (${bb_lower:.1f}) with RSI oversold ({rsi:.1f})")
                elif current_price >= bb_upper and rsi >= 65:
                    signal_action = "SELL"
                    conviction = 78.0
                    reasons.append(f"Price (${current_price:.1f}) pierced Upper Bollinger Band (${bb_upper:.1f}) with RSI overbought ({rsi:.1f})")

            # ------------------ Strategy 4: Derivatives Liquidity Squeeze (Funding Rate Hunter) ------------------
            elif strat == "DERIVATIVES_SQUEEZE":
                deriv_data = await asyncio.to_thread(derivatives_service.get_derivatives_data, symbol)
                fr = deriv_data.funding_rate
                bias = deriv_data.funding_bias
                rsi = indicators.rsi or 50.0

                # Negative funding indicates shorts are crowded and paying longs -> prime short squeeze setup
                if fr < -0.0001 or bias == "SHORT_CROWDED":
                    signal_action = "BUY"
                    conviction = 82.0
                    reasons.append(f"Short Squeeze Liquidity Squeeze: Negative Funding Rate {deriv_data.funding_rate_pct:.4f}% ({bias})")
                elif fr > 0.0005 or bias == "LONG_CROWDED":
                    signal_action = "SELL"
                    conviction = 75.0
                    reasons.append(f"Long Flush Warning: High Funding Rate +{deriv_data.funding_rate_pct:.4f}% ({bias})")

            # ------------------ Strategy 5: News & Macro Momentum ------------------
            elif strat == "NEWS_MACRO_MOMENTUM":
                news_items = await asyncio.to_thread(news_service.get_news_for_symbol, symbol, 10)
                sent_metrics, _ = await asyncio.to_thread(sentiment_agent.analyze, symbol, news_items)
                onchain_data = await asyncio.to_thread(onchain_service.get_onchain_data)

                sent_score = sent_metrics.overall_sentiment_score
                stable_signal = onchain_data.stablecoin_flow_signal
                ema20 = indicators.ema_20 or current_price
                ema50 = indicators.ema_50 or current_price

                # Check Macro & Stablecoin Liquidity
                macro_bullish = sent_score > 0.15 and stable_signal in ["STRONG_INFLOW", "INFLOW", "NEUTRAL"]
                macro_bearish = sent_score < -0.15 or stable_signal in ["STRONG_OUTFLOW", "OUTFLOW"]

                if macro_bullish and ema20 >= ema50:
                    signal_action = "BUY"
                    conviction = 80.0
                    reasons.append(f"Macro Catalyst Bullish ({sent_metrics.overall_sentiment_label} {sent_score:+.2f}), Stablecoin Flow: {stable_signal}")
                    if sent_metrics.top_catalysts:
                        reasons.append(f"Catalyst: {sent_metrics.top_catalysts[0]}")
                elif macro_bearish:
                    signal_action = "SELL"
                    conviction = 75.0
                    reasons.append(f"Macro Negative Pressure ({sent_metrics.overall_sentiment_label} {sent_score:+.2f}), Stablecoin Flow: {stable_signal}")

            # ------------------ Strategy 6: Quant Alpha Master Confluence ------------------
            else:
                # 4-Pillar Multi-Regime Quantitative Confluence Arbiter
                tech_score = 0.0
                deriv_score = 0.0
                macro_score = 0.0

                # Pillar 1: Technicals (35%)
                ema20 = indicators.ema_20 or current_price
                ema50 = indicators.ema_50 or current_price
                rsi = indicators.rsi or 50.0
                if ema20 > ema50:
                    tech_score += 20
                if 42 <= rsi <= 62:
                    tech_score += 15
                elif rsi <= 35:
                    tech_score += 15

                # Pillar 2: Derivatives (35%)
                deriv_data = await asyncio.to_thread(derivatives_service.get_derivatives_data, symbol)
                if deriv_data.funding_rate <= 0.0001:
                    deriv_score += 20
                    reasons.append(f"Favorable Funding ({deriv_data.funding_rate_pct:.4f}%)")
                if deriv_data.funding_bias == "SHORT_CROWDED":
                    deriv_score += 15
                    reasons.append("Short Squeeze Imbalance")

                # Pillar 3: News & Macro (30%)
                news_items = await asyncio.to_thread(news_service.get_news_for_symbol, symbol, 5)
                sent_metrics, _ = await asyncio.to_thread(sentiment_agent.analyze, symbol, news_items)
                onchain_data = await asyncio.to_thread(onchain_service.get_onchain_data)

                if sent_metrics.overall_sentiment_score > 0.10:
                    macro_score += 15
                    reasons.append(f"News Sentiment Bullish (+{sent_metrics.overall_sentiment_score:.2f})")
                if onchain_data.stablecoin_flow_signal in ["STRONG_INFLOW", "INFLOW"]:
                    macro_score += 15
                    reasons.append(f"DefiLlama Stablecoin Inflow (${onchain_data.stablecoin_30d_change_usd/1e9:.1f}B)")

                total_alpha = tech_score + deriv_score + macro_score
                if total_alpha >= 65:
                    signal_action = "BUY"
                    conviction = float(min(95.0, total_alpha + 10))
                elif total_alpha <= 25:
                    signal_action = "SELL"
                    conviction = 70.0

            # ------------------ Stage 4: Risk Firewall & Execution ------------------
            if signal_action in ["BUY", "SELL"]:
                if conviction < self.config.min_conviction:
                    self._add_log(
                        "INFO",
                        f"[{symbol}] Signal {signal_action} generated with {conviction:.0f}% conviction, but below threshold ({self.config.min_conviction:.0f}%). Skipping.",
                        symbol=symbol
                    )
                    return

                # Calculate Position Sizing
                trade_usd = min(self.config.trade_size_usd, paper_broker.cash * 0.25)
                if trade_usd < 50.0:
                    self._add_log("WARNING", f"[{symbol}] Insufficient cash (${paper_broker.cash:.2f}) for trade size.", symbol=symbol)
                    return

                amount = round(trade_usd / current_price, 6)

                # Calculate Dynamic Stop Loss & Take Profit
                sl_distance = current_price * (self.config.stop_loss_pct / 100.0)
                tp_distance = current_price * (self.config.take_profit_pct / 100.0)

                if signal_action == "BUY":
                    stop_loss = round(current_price - sl_distance, 4)
                    take_profit = round(current_price + tp_distance, 4)
                else:
                    stop_loss = round(current_price + sl_distance, 4)
                    take_profit = round(current_price - tp_distance, 4)

                reason_str = f"BOT: {self.config.strategy} {signal_action} ({conviction:.0f}% Conviction)"
                pos = paper_broker.execute_order(
                    symbol=symbol,
                    side=signal_action,
                    price=current_price,
                    amount=amount,
                    stop_loss=stop_loss,
                    take_profit=take_profit,
                    reason=reason_str
                )

                self._trailing_high_watermark[pos.id] = current_price
                self._trailing_low_watermark[pos.id] = current_price
                self._last_trade_time_per_symbol[symbol] = time.time()

                self._add_log(
                    "TRADE",
                    f"🚀 EXECUTED {signal_action} {amount} {symbol} @ ${current_price:.2f} (Value: ${trade_usd:.2f}) | SL: ${stop_loss} | TP: ${take_profit}",
                    symbol=symbol,
                    details={"strategy": self.config.strategy, "conviction": conviction, "reasons": reasons[:2]}
                )

                try:
                    telegram_service.send_trade_alert(
                        action=signal_action,
                        symbol=symbol,
                        price=current_price,
                        amount=amount,
                        value_usd=trade_usd,
                        stop_loss=stop_loss,
                        take_profit=take_profit,
                        reason=reason_str
                    )
                except Exception:
                    pass

        except Exception as e:
            self._add_log("ERROR", f"Error evaluating {symbol}: {e}", symbol=symbol)

trading_bot = TradingBotService()
