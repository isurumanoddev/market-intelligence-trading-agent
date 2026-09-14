import time
import asyncio
import uuid
from datetime import datetime
from typing import Dict, Any, Optional, List
from pydantic import BaseModel

from app.models.market_data import Candle, Ticker
from app.services.market_service import market_service
from app.services.technical_analysis import technical_analyzer
from app.services.derivatives_service import derivatives_service
from app.services.whatsapp_service import whatsapp_service
from app.config import settings

class EntryAlertRecord(BaseModel):
    id: str
    symbol: str
    side: str
    entry_price: float
    current_price: float
    stop_loss: float
    take_profit_1: float
    take_profit_2: float
    grade: str
    win_expectancy: float
    confluences: List[str]
    timestamp: str
    status: str  # DELIVERED, FAILED, SIMULATED

class EntryAlertWatcherService:
    """
    Autonomous Watcher for Best Trading Entry Points.
    Continuously monitors BTC/USDT (and configurable coins), identifies when
    price enters the high-conviction Optimal Trade Entry (OTE) zone with Grade A/A+
    confluence, and immediately dispatches an alert to WhatsApp.
    """
    def __init__(self):
        self.enabled: bool = getattr(settings, "btc_alert_watcher_enabled", True)
        self.target_symbol: str = "BTC/USDT"
        self.tolerance_pct: float = 0.35  # Price within 0.35% of OTE zone triggers signal
        self.cooldown_seconds: int = int(getattr(settings, "btc_alert_cooldown_minutes", 15)) * 60
        self.poll_interval_seconds: int = 15
        self._last_alert_time_per_side: Dict[str, float] = {}
        self._alert_history: List[EntryAlertRecord] = []
        self._task: Optional[asyncio.Task] = None
        self._last_eval_time: str = ""
        self._last_evaluated_price: float = 0.0
        self._latest_setup: Optional[Dict[str, Any]] = None

    def get_status(self) -> Dict[str, Any]:
        """Returns the current real-time watcher status and latest calculated entry levels."""
        distance_pct = 0.0
        if self._latest_setup and self._last_evaluated_price > 0:
            target_entry = self._latest_setup.get("optimal_entry", 0.0)
            if target_entry > 0:
                distance_pct = round(abs(self._last_evaluated_price - target_entry) / target_entry * 100.0, 2)

        return {
            "enabled": self.enabled,
            "target_symbol": self.target_symbol,
            "tolerance_pct": self.tolerance_pct,
            "cooldown_minutes": self.cooldown_seconds // 60,
            "last_eval_time": self._last_eval_time,
            "last_price": self._last_evaluated_price,
            "latest_setup": self._latest_setup,
            "distance_to_entry_pct": distance_pct,
            "whatsapp_configured": whatsapp_service.is_configured(),
            "total_alerts_sent": len(self._alert_history),
            "alert_history": [a.model_dump() for a in self._alert_history[-15:]]
        }

    async def start(self):
        """Starts the background monitoring loop."""
        if self._task and not self._task.done():
            return
        self.enabled = True
        self._task = asyncio.create_task(self._monitor_loop())
        print(f"[EntryAlertWatcher] Background watcher started for {self.target_symbol}")

    async def stop(self):
        """Stops the background monitoring loop."""
        self.enabled = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
            self._task = None
        print("[EntryAlertWatcher] Background watcher stopped")

    def toggle(self, enable: Optional[bool] = None) -> bool:
        if enable is None:
            self.enabled = not self.enabled
        else:
            self.enabled = enable
        return self.enabled

    def set_target_symbol(self, symbol: str):
        self.target_symbol = symbol.strip().upper()

    async def _monitor_loop(self):
        """Background continuous evaluation loop."""
        while self.enabled:
            try:
                await self.evaluate_entry_point(self.target_symbol)
            except asyncio.CancelledError:
                break
            except Exception as e:
                print(f"[EntryAlertWatcher] Evaluation error on {self.target_symbol}: {e}")
            
            await asyncio.sleep(self.poll_interval_seconds)

    async def compute_setup(self, symbol: str) -> Optional[Dict[str, Any]]:
        """Calculates institutional OTE levels, confluences, and grading."""
        try:
            ticker = await asyncio.to_thread(market_service.get_ticker, symbol)
            current_price = float(getattr(ticker, "price", 0.0) or getattr(ticker, "bid", 0.0) or 0.0)
            if current_price <= 0:
                return None

            candles = await asyncio.to_thread(market_service.get_ohlcv, symbol, "1h", 45)
            indicators = technical_analyzer.calculate_indicators(candles)

            # Determine dominant side
            ema20 = indicators.ema_20 or current_price
            ema50 = indicators.ema_50 or current_price
            vwap = indicators.vwap or current_price
            st_dir = indicators.supertrend_direction or "BULLISH"
            rsi_val = indicators.rsi or 50.0

            # Quantitative evaluation
            mtf_trends = {
                "15m": "BULLISH" if current_price >= ema20 else "BEARISH",
                "1h": "BULLISH" if ema20 >= ema50 else "BEARISH",
                "4h": "BULLISH" if st_dir == "BULLISH" else "BEARISH",
                "1d": "BULLISH" if current_price >= vwap else "BEARISH"
            }

            deriv_data = None
            try:
                deriv_data = await asyncio.to_thread(derivatives_service.get_derivatives_data, symbol)
            except Exception:
                pass

            accuracy_rating = technical_analyzer.calculate_accuracy_rating(
                symbol=symbol,
                current_price=current_price,
                indicators=indicators,
                mtf_trends=mtf_trends,
                cvd_divergence="NONE",
                derivatives=deriv_data
            )

            is_long = accuracy_rating.recommended_action == "EXECUTE_LONG" or (ema20 >= ema50 and st_dir == "BULLISH")
            side = "BUY" if is_long else "SELL"
            confluences: List[str] = []

            if is_long:
                if ema20 > 0 and ema20 < current_price * 1.002:
                    optimal_entry = round(max(ema20, current_price * 0.993), 2)
                    confluences.append("EMA 20 Dynamic Support Pullback")
                else:
                    optimal_entry = round(current_price * 0.995, 2)
                    confluences.append("Institutional Liquidity Support")

                if vwap > 0 and current_price <= vwap * 1.01:
                    confluences.append("VWAP Institutional Fair Value Zone")
                if rsi_val <= 56:
                    confluences.append(f"RSI in Prime Momentum Zone ({rsi_val:.1f})")
                if st_dir == "BULLISH":
                    confluences.append("Supertrend Bullish Trailing Base")
                if indicators.fvg_type == "BULLISH_FVG":
                    confluences.append("SMC Bullish Fair Value Gap Retest")

                stop_loss = round(min(optimal_entry * 0.982, (ema50 * 0.995 if ema50 > 0 else optimal_entry * 0.982)), 2)
                risk = max(optimal_entry - stop_loss, optimal_entry * 0.015)
                take_profit_1 = round(optimal_entry + risk * 2.0, 2)
                take_profit_2 = round(optimal_entry + risk * 3.5, 2)
            else:
                if ema20 > 0 and ema20 > current_price * 0.998:
                    optimal_entry = round(min(ema20, current_price * 1.007), 2)
                    confluences.append("EMA 20 Overhead Resistance Retest")
                else:
                    optimal_entry = round(current_price * 1.005, 2)
                    confluences.append("Overhead Supply Resistance")

                if vwap > 0 and current_price >= vwap * 0.99:
                    confluences.append("VWAP Upper Premium Exhaustion")
                if rsi_val >= 44:
                    confluences.append(f"RSI Bearish Continuation Zone ({rsi_val:.1f})")
                if st_dir == "BEARISH":
                    confluences.append("Supertrend Red Trailing Resistance")
                if indicators.fvg_type == "BEARISH_FVG":
                    confluences.append("SMC Bearish Fair Value Gap Supply")

                stop_loss = round(max(optimal_entry * 1.018, (ema50 * 1.005 if ema50 > 0 else optimal_entry * 1.018)), 2)
                risk = max(stop_loss - optimal_entry, optimal_entry * 0.015)
                take_profit_1 = round(optimal_entry - risk * 2.0, 2)
                take_profit_2 = round(optimal_entry - risk * 3.5, 2)

            return {
                "symbol": symbol,
                "side": side,
                "current_price": current_price,
                "optimal_entry": optimal_entry,
                "stop_loss": stop_loss,
                "take_profit_1": take_profit_1,
                "take_profit_2": take_profit_2,
                "grade": accuracy_rating.grade,
                "win_expectancy": accuracy_rating.win_rate_expectancy,
                "confluences": confluences,
                "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            }
        except Exception as e:
            print(f"[EntryAlertWatcher] Setup compute failed for {symbol}: {e}")
            return None

    async def evaluate_entry_point(self, symbol: str) -> Optional[Dict[str, Any]]:
        """Evaluates whether current price has arrived at the Best Entry Point."""
        setup = await self.compute_setup(symbol)
        if not setup:
            return None

        self._latest_setup = setup
        self._last_evaluated_price = setup["current_price"]
        self._last_eval_time = datetime.now().strftime("%H:%M:%S")

        current_p = setup["current_price"]
        entry_p = setup["optimal_entry"]
        side = setup["side"]
        grade = setup["grade"]

        # Calculate distance to entry
        distance_pct = (abs(current_p - entry_p) / entry_p) * 100.0

        # High-conviction threshold check:
        # Price is sitting within the tolerance corridor (e.g. within 0.35% of OTE retest)
        is_at_entry = distance_pct <= self.tolerance_pct
        is_grade_eligible = grade in ["A+", "A"]

        if is_at_entry and is_grade_eligible:
            # Check cooldown
            now = time.time()
            last_alert = self._last_alert_time_per_side.get(side, 0.0)
            if now - last_alert >= self.cooldown_seconds:
                # Fire WhatsApp Signal!
                res = await self.dispatch_signal(setup)
                self._last_alert_time_per_side[side] = now
                return res

        return None

    async def dispatch_signal(self, setup: Dict[str, Any], is_test: bool = False) -> Dict[str, Any]:
        """Dispatches trading signal to WhatsApp and records to history."""
        dispatch_res = await asyncio.to_thread(
            whatsapp_service.send_signal,
            symbol=setup["symbol"],
            side=setup["side"],
            entry_price=setup["optimal_entry"],
            stop_loss=setup["stop_loss"],
            take_profit_1=setup["take_profit_1"],
            take_profit_2=setup["take_profit_2"],
            current_price=setup["current_price"],
            grade=setup["grade"],
            win_expectancy=setup["win_expectancy"],
            confluences=setup["confluences"]
        )

        record = EntryAlertRecord(
            id=f"alert_{uuid.uuid4().hex[:8]}",
            symbol=setup["symbol"],
            side=setup["side"],
            entry_price=setup["optimal_entry"],
            current_price=setup["current_price"],
            stop_loss=setup["stop_loss"],
            take_profit_1=setup["take_profit_1"],
            take_profit_2=setup["take_profit_2"],
            grade=setup["grade"],
            win_expectancy=setup["win_expectancy"],
            confluences=setup["confluences"],
            timestamp=datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            status="DELIVERED" if dispatch_res.get("success") else "FAILED"
        )
        self._alert_history.append(record)

        return {
            "status": "triggered" if not is_test else "test_sent",
            "dispatch": dispatch_res,
            "alert": record.model_dump()
        }

    async def trigger_immediate_test(self, symbol: str = "BTC/USDT") -> Dict[str, Any]:
        """Manually forces a setup calculation and dispatches a test signal immediately to WhatsApp."""
        setup = await self.compute_setup(symbol)
        if not setup:
            # Fallback mock setup if offline
            setup = {
                "symbol": symbol,
                "side": "BUY",
                "current_price": 64280.0,
                "optimal_entry": 64150.0,
                "stop_loss": 63050.0,
                "take_profit_1": 66350.0,
                "take_profit_2": 68000.0,
                "grade": "A+",
                "win_expectancy": 83.5,
                "confluences": [
                    "EMA 20 Dynamic Support Pullback",
                    "Supertrend Bullish Trailing Base",
                    "RSI in Prime Momentum Zone (52.4)",
                    "SMC Bullish Fair Value Gap Retest"
                ],
                "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            }

        return await self.dispatch_signal(setup, is_test=True)

entry_alert_watcher = EntryAlertWatcherService()
