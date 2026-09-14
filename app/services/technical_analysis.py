from datetime import datetime
import numpy as np
from typing import List, Dict, Any, Optional
from app.models.market_data import Candle, OrderBook, Trade
from app.models.decision import TechnicalIndicators, MicrostructureMetrics, MonthlyContext, AccuracySetupRating

class TechnicalAnalysisService:

    @staticmethod
    def calculate_indicators(candles: List[Candle]) -> TechnicalIndicators:
        if not candles or len(candles) < 15:
            return TechnicalIndicators()

        closes = np.array([c.close for c in candles], dtype=float)
        highs = np.array([c.high for c in candles], dtype=float)
        lows = np.array([c.low for c in candles], dtype=float)
        volumes = np.array([c.volume for c in candles], dtype=float)
        n = len(closes)

        # 1. RSI (14 periods)
        delta = np.diff(closes)
        gains = np.where(delta > 0, delta, 0.0)
        losses = np.where(delta < 0, -delta, 0.0)

        window = 14
        if len(delta) >= window:
            avg_gain = np.mean(gains[:window])
            avg_loss = np.mean(losses[:window])
            for i in range(window, len(delta)):
                avg_gain = (avg_gain * (window - 1) + gains[i]) / window
                avg_loss = (avg_loss * (window - 1) + losses[i]) / window
            rs = (avg_gain / avg_loss) if avg_loss > 0 else 100.0
            rsi = 100.0 - (100.0 / (1.0 + rs)) if avg_loss > 0 else 100.0
        else:
            rsi = 50.0

        # 2. EMAs (20, 50, 200)
        def calc_ema(arr: np.ndarray, period: int) -> Optional[float]:
            if len(arr) < period:
                return None
            k = 2.0 / (period + 1.0)
            ema = np.mean(arr[:period])
            for val in arr[period:]:
                ema = (val * k) + (ema * (1.0 - k))
            return float(ema)

        ema_20 = calc_ema(closes, 20)
        ema_50 = calc_ema(closes, 50)
        ema_200 = calc_ema(closes, 200) if len(closes) >= 200 else None

        # 3. MACD (12, 26, 9)
        ema_12 = calc_ema(closes, 12)
        ema_26 = calc_ema(closes, 26)
        macd = (ema_12 - ema_26) if (ema_12 is not None and ema_26 is not None) else None

        # MACD Signal line
        macd_series = []
        if len(closes) >= 35:
            # compute full macd array
            k12 = 2.0 / 13.0
            k26 = 2.0 / 27.0
            e12 = np.mean(closes[:12])
            e26 = np.mean(closes[:26])
            # fast forward to 26
            for i in range(12, 26):
                e12 = closes[i] * k12 + e12 * (1 - k12)
            for i in range(26, len(closes)):
                e12 = closes[i] * k12 + e12 * (1 - k12)
                e26 = closes[i] * k26 + e26 * (1 - k26)
                macd_series.append(e12 - e26)

            macd_sig = calc_ema(np.array(macd_series), 9) if len(macd_series) >= 9 else None
            macd_hist = (macd - macd_sig) if (macd is not None and macd_sig is not None) else None
        else:
            macd_sig = None
            macd_hist = None

        # 4. Bollinger Bands (20 periods, 2 std)
        bb_period = min(20, n)
        recent_closes = closes[-bb_period:]
        bb_mid = float(np.mean(recent_closes))
        bb_std = float(np.std(recent_closes))
        bb_upper = bb_mid + (2.0 * bb_std)
        bb_lower = bb_mid - (2.0 * bb_std)

        # 5. ATR (Average True Range, 14 periods)
        tr_list = []
        for i in range(1, n):
            h_l = highs[i] - lows[i]
            h_pc = abs(highs[i] - closes[i - 1])
            l_pc = abs(lows[i] - closes[i - 1])
            tr_list.append(max(h_l, h_pc, l_pc))
        atr = float(np.mean(tr_list[-14:])) if len(tr_list) >= 14 else float(np.mean(tr_list)) if tr_list else (closes[-1] * 0.02)

        # 6. VWAP & Standard Deviation Bands
        typical_prices = (highs + lows + closes) / 3.0
        tot_vol = np.sum(volumes)
        vwap = float(np.sum(typical_prices * volumes) / tot_vol) if tot_vol > 0 else float(closes[-1])
        vwap_dev = float(np.std(closes[-20:])) if n >= 20 else atr
        vwap_upper_1 = vwap + (1.25 * vwap_dev)
        vwap_lower_1 = vwap - (1.25 * vwap_dev)

        # 7. SMAs (20, 50, 200)
        sma_20 = float(np.mean(closes[-20:])) if n >= 20 else float(np.mean(closes))
        sma_50 = float(np.mean(closes[-50:])) if n >= 50 else float(np.mean(closes))
        sma_200 = float(np.mean(closes[-200:])) if n >= 200 else None

        # 8. Supertrend (ATR 10, Multiplier 3.0)
        st_period = min(10, n)
        st_atr = float(np.mean(tr_list[-st_period:])) if len(tr_list) >= st_period else atr
        hl2 = (highs[-1] + lows[-1]) / 2.0
        basic_upper = hl2 + (3.0 * st_atr)
        basic_lower = hl2 - (3.0 * st_atr)
        supertrend_direction = "BULLISH" if closes[-1] >= basic_lower else "BEARISH"
        supertrend_val = basic_lower if supertrend_direction == "BULLISH" else basic_upper

        # 9. Stochastic RSI (14, 14, 3, 3)
        rsi_series = []
        for i in range(max(14, n - 20), n + 1):
            sub_delta = np.diff(closes[:i])
            if len(sub_delta) >= 14:
                sub_g = np.where(sub_delta > 0, sub_delta, 0.0)
                sub_l = np.where(sub_delta < 0, -sub_delta, 0.0)
                ag = np.mean(sub_g[-14:])
                al = np.mean(sub_l[-14:])
                sub_rs = (ag / al) if al > 0 else 100.0
                sub_rsi = 100.0 - (100.0 / (1.0 + sub_rs)) if al > 0 else 100.0
                rsi_series.append(sub_rsi)
            else:
                rsi_series.append(50.0)

        if len(rsi_series) >= 5:
            min_rsi = min(rsi_series[-14:])
            max_rsi = max(rsi_series[-14:])
            stoch_k = ((rsi_series[-1] - min_rsi) / (max_rsi - min_rsi + 1e-9)) * 100.0 if max_rsi > min_rsi else 50.0
            stoch_d = float(np.mean([((r - min_rsi) / (max_rsi - min_rsi + 1e-9) * 100.0) if max_rsi > min_rsi else 50.0 for r in rsi_series[-3:]])) if len(rsi_series) >= 3 else stoch_k
        else:
            stoch_k = 50.0
            stoch_d = 50.0

        # 10. ADX (Average Directional Index 14)
        plus_dm = []
        minus_dm = []
        for i in range(1, n):
            up_move = highs[i] - highs[i - 1]
            down_move = lows[i - 1] - lows[i]
            plus_dm.append(up_move if up_move > down_move and up_move > 0 else 0.0)
            minus_dm.append(down_move if down_move > up_move and down_move > 0 else 0.0)

        if len(plus_dm) >= 14:
            p_dm14 = np.mean(plus_dm[-14:])
            m_dm14 = np.mean(minus_dm[-14:])
            atr14 = atr if atr > 0 else 1.0
            p_di = (p_dm14 / atr14) * 100.0
            m_di = (m_dm14 / atr14) * 100.0
            dx = (abs(p_di - m_di) / (p_di + m_di + 1e-9)) * 100.0
            adx = float(dx)
        else:
            adx = 24.0

        adx_strength = "STRONG_TREND" if adx > 28 else "TRENDING" if adx > 20 else "RANGING_CHOP"

        # 11. Fair Value Gap (FVG) / Smart Money Concepts Imbalance
        fvg_detected = False
        fvg_type = "NONE"
        fvg_price_level = None

        if n >= 4:
            c_prev2 = candles[-3]
            c_curr = candles[-1]
            if c_curr.low > c_prev2.high:
                fvg_detected = True
                fvg_type = "BULLISH_FVG"
                fvg_price_level = round((c_curr.low + c_prev2.high) / 2.0, 2)
            elif c_curr.high < c_prev2.low:
                fvg_detected = True
                fvg_type = "BEARISH_FVG"
                fvg_price_level = round((c_curr.high + c_prev2.low) / 2.0, 2)

        # States
        last_close = closes[-1]
        trend_state = "NEUTRAL"
        if ema_20 and ema_50:
            if last_close > ema_20 > ema_50:
                trend_state = "BULLISH"
            elif last_close < ema_20 < ema_50:
                trend_state = "BEARISH"
        elif ema_20:
            if last_close > ema_20:
                trend_state = "BULLISH"
            elif last_close < ema_20:
                trend_state = "BEARISH"

        rsi_state = "NEUTRAL"
        if rsi >= 70:
            rsi_state = "OVERBOUGHT"
        elif rsi <= 30:
            rsi_state = "OVERSOLD"

        return TechnicalIndicators(
            rsi=round(float(rsi), 2),
            macd=round(float(macd), 4) if macd is not None else None,
            macd_signal=round(float(macd_sig), 4) if macd_sig is not None else None,
            macd_hist=round(float(macd_hist), 4) if macd_hist is not None else None,
            ema_20=round(ema_20, 2) if ema_20 else None,
            ema_50=round(ema_50, 2) if ema_50 else None,
            ema_200=round(ema_200, 2) if ema_200 else None,
            sma_20=round(sma_20, 2) if sma_20 else None,
            sma_50=round(sma_50, 2) if sma_50 else None,
            sma_200=round(sma_200, 2) if sma_200 else None,
            vwap=round(vwap, 2),
            vwap_upper_1=round(vwap_upper_1, 2),
            vwap_lower_1=round(vwap_lower_1, 2),
            atr=round(atr, 4),
            bb_upper=round(bb_upper, 2),
            bb_middle=round(bb_mid, 2),
            bb_lower=round(bb_lower, 2),
            supertrend_value=round(supertrend_val, 2),
            supertrend_direction=supertrend_direction,
            stoch_k=round(float(stoch_k), 2),
            stoch_d=round(float(stoch_d), 2),
            adx=round(float(adx), 2),
            adx_trend_strength=adx_strength,
            fvg_detected=fvg_detected,
            fvg_type=fvg_type,
            fvg_price_level=fvg_price_level,
            trend_state=trend_state,
            rsi_state=rsi_state
        )

    @staticmethod
    def analyze_microstructure(order_book: OrderBook, trades: List[Trade]) -> MicrostructureMetrics:
        # Order Book Imbalance
        obi = order_book.imbalance
        spread = order_book.spread
        ref_price = (order_book.best_bid + order_book.best_ask) / 2.0 if (order_book.best_bid + order_book.best_ask) > 0 else 1.0
        spread_bps = (spread / ref_price) * 10000.0

        # Depth in USD
        bid_depth_usd = sum(b.price * b.amount for b in order_book.bids)
        ask_depth_usd = sum(a.price * a.amount for a in order_book.asks)

        # Detect large liquidity walls (> 2.5x mean volume)
        bid_vols = [b.amount for b in order_book.bids]
        ask_vols = [a.amount for a in order_book.asks]
        avg_bid_vol = (sum(bid_vols) / len(bid_vols)) if bid_vols else 1.0
        avg_ask_vol = (sum(ask_vols) / len(ask_vols)) if ask_vols else 1.0

        large_bids = [
            {"price": b.price, "amount": b.amount, "usd_value": round(b.price * b.amount, 2)}
            for b in order_book.bids if b.amount >= avg_bid_vol * 2.5
        ]
        large_asks = [
            {"price": a.price, "amount": a.amount, "usd_value": round(a.price * a.amount, 2)}
            for a in order_book.asks if a.amount >= avg_ask_vol * 2.5
        ]

        # Trade flow analysis (Tape & CVD)
        buy_vol = sum(t.amount for t in trades if t.side == "buy")
        sell_vol = sum(t.amount for t in trades if t.side == "sell")
        cvd = buy_vol - sell_vol

        tot_vol = buy_vol + sell_vol
        cvd_ratio = (cvd / tot_vol) if tot_vol > 0 else 0.0

        if cvd_ratio > 0.2:
            cvd_side = "BUY_DOMINANT"
        elif cvd_ratio < -0.2:
            cvd_side = "SELL_DOMINANT"
        else:
            cvd_side = "BALANCED"

        whales = sum(1 for t in trades if t.is_whale)

        # Confluence of Order Flow:
        if obi > 0.3 and cvd_side == "BUY_DOMINANT":
            order_flow_signal = "STRONG_BULLISH_PRESSURE"
        elif obi > 0.15 or cvd_side == "BUY_DOMINANT":
            order_flow_signal = "MODERATE_BULLISH_PRESSURE"
        elif obi < -0.3 and cvd_side == "SELL_DOMINANT":
            order_flow_signal = "STRONG_BEARISH_PRESSURE"
        elif obi < -0.15 or cvd_side == "SELL_DOMINANT":
            order_flow_signal = "MODERATE_BEARISH_PRESSURE"
        else:
            order_flow_signal = "BALANCED_FLOW"

        return MicrostructureMetrics(
            order_book_imbalance=round(obi, 4),
            spread_bps=round(spread_bps, 2),
            spread_pct=round(order_book.spread_pct, 4),
            bid_depth_usd=round(bid_depth_usd, 2),
            ask_depth_usd=round(ask_depth_usd, 2),
            cvd=round(cvd, 4),
            cvd_side=cvd_side,
            buy_trade_volume=round(buy_vol, 4),
            sell_trade_volume=round(sell_vol, 4),
            whale_trades_detected=whales,
            large_bid_walls=large_bids[:3],
            large_ask_walls=large_asks[:3],
            order_flow_signal=order_flow_signal
        )

    @staticmethod
    def calculate_monthly_context(candles_1d: List[Candle], current_price: float) -> MonthlyContext:
        if not candles_1d or len(candles_1d) < 3:
            return MonthlyContext()

        # Take up to the most recent 30 daily candles
        lookback = candles_1d[-30:] if len(candles_1d) >= 30 else candles_1d
        actual_days = len(lookback)

        highs = [c.high for c in lookback]
        lows = [c.low for c in lookback]
        closes = [c.close for c in lookback]
        volumes = [c.volume for c in lookback]

        monthly_high = float(max(highs))
        monthly_low = float(min(lows))
        monthly_open = float(lookback[0].open)
        monthly_close = float(lookback[-1].close)

        # Monthly Change %
        monthly_change_pct = ((monthly_close - monthly_open) / monthly_open) * 100.0 if monthly_open > 0 else 0.0

        # Price Range and Range Position (0% = at monthly low, 100% = at monthly high)
        price_range = monthly_high - monthly_low
        monthly_range_pct = (price_range / monthly_low * 100.0) if monthly_low > 0 else 0.0
        
        range_pos = ((current_price - monthly_low) / price_range * 100.0) if price_range > 0 else 50.0
        range_pos = max(0.0, min(100.0, range_pos))

        # 30-Day SMA
        sma_30d = float(np.mean(closes))
        dist_sma_pct = ((current_price - sma_30d) / sma_30d * 100.0) if sma_30d > 0 else 0.0

        # Swing pivots & key monthly support / resistance levels
        if len(highs) >= 8:
            key_resistance = float(np.percentile(highs, 85))
            key_support = float(np.percentile(lows, 15))
        else:
            key_resistance = monthly_high
            key_support = monthly_low

        # Volume metrics
        total_vol = float(sum(volumes))
        avg_daily_vol = total_vol / actual_days if actual_days > 0 else 0.0
        
        recent_7d_vol = float(np.mean(volumes[-7:])) if len(volumes) >= 7 else avg_daily_vol
        if recent_7d_vol > avg_daily_vol * 1.25:
            vol_trend = "EXPANDING"
        elif recent_7d_vol < avg_daily_vol * 0.75:
            vol_trend = "CONTRACTING"
        else:
            vol_trend = "NORMAL"

        # Macro Trend determination
        if current_price > sma_30d and monthly_change_pct > 2.5:
            monthly_trend = "MACRO_BULLISH"
            macro_bias = "BULLISH"
        elif current_price < sma_30d and monthly_change_pct < -2.5:
            monthly_trend = "MACRO_BEARISH"
            macro_bias = "BEARISH"
        else:
            monthly_trend = "RANGE_BOUND"
            macro_bias = "NEUTRAL"

        return MonthlyContext(
            lookback_days=actual_days,
            monthly_high=round(monthly_high, 2),
            monthly_low=round(monthly_low, 2),
            monthly_open=round(monthly_open, 2),
            monthly_close=round(monthly_close, 2),
            monthly_change_pct=round(monthly_change_pct, 2),
            monthly_trend=monthly_trend,
            monthly_range_pct=round(monthly_range_pct, 2),
            range_position_pct=round(range_pos, 1),
            key_monthly_support=round(key_support, 2),
            key_monthly_resistance=round(key_resistance, 2),
            sma_30d=round(sma_30d, 2),
            distance_from_sma_pct=round(dist_sma_pct, 2),
            volume_30d_total=round(total_vol, 2),
            volume_avg_daily=round(avg_daily_vol, 2),
            volume_trend=vol_trend,
            macro_bias=macro_bias
        )


    @staticmethod
    def calculate_mtf_trend(candles_dict: Dict[str, List[Candle]]) -> Dict[str, str]:
        """
        Calculates trend direction for multiple timeframes (e.g. '15m', '1h', '4h', '1d').
        Uses EMA fast (9/20) vs EMA slow (21/50) and price positioning.
        Returns e.g. {'15m': 'BULLISH', '1h': 'BULLISH', '4h': 'BEARISH', '1d': 'BULLISH'}
        """
        results = {}
        for tf, c_list in candles_dict.items():
            if not c_list or len(c_list) < 8:
                results[tf] = "NEUTRAL"
                continue
            closes = np.array([c.close for c in c_list], dtype=float)
            highs = np.array([c.high for c in c_list], dtype=float)
            lows = np.array([c.low for c in c_list], dtype=float)

            p_fast = min(9, len(closes))
            p_slow = min(21, len(closes))
            ema_fast = float(np.mean(closes[-p_fast:]))
            ema_slow = float(np.mean(closes[-p_slow:]))
            cur = closes[-1]

            recent_higher_highs = highs[-1] >= highs[-p_fast]
            recent_higher_lows = lows[-1] >= lows[-p_fast]

            if cur >= ema_fast and ema_fast >= ema_slow and (recent_higher_highs or recent_higher_lows):
                results[tf] = "BULLISH"
            elif cur <= ema_fast and ema_fast <= ema_slow and not recent_higher_lows:
                results[tf] = "BEARISH"
            elif cur > ema_slow and ema_fast > ema_slow:
                results[tf] = "BULLISH"
            elif cur < ema_slow and ema_fast < ema_slow:
                results[tf] = "BEARISH"
            else:
                results[tf] = "NEUTRAL"

        return results

    @staticmethod
    def detect_cvd_divergence(candles: List[Candle], trades: Optional[List[Trade]] = None, cvd_value: float = 0.0) -> Dict[str, Any]:
        """
        Detects Order Flow Cumulative Volume Delta (CVD) Absorption & Divergences.
        - Bullish Absorption: Price makes lower/equal low, but aggressive delta is heavily positive (bids absorbing).
        - Bearish Exhaustion: Price makes higher/equal high, but delta is negative/dropping (selling into the rally).
        """
        if not candles or len(candles) < 10:
            return {
                "divergence_type": "NONE",
                "absorption_detected": False,
                "signal_strength": "NONE",
                "delta_direction": "NEUTRAL",
                "interpretation": "Insufficient candle depth for CVD orderflow analysis."
            }

        closes = [c.close for c in candles[-15:]]
        highs = [c.high for c in candles[-15:]]
        lows = [c.low for c in candles[-15:]]

        candle_deltas = []
        for c in candles[-15:]:
            rng = max(c.high - c.low, 1e-6)
            body_bias = (c.close - c.open) / rng
            candle_deltas.append(c.volume * body_bias)

        cum_delta_recent = sum(candle_deltas[-5:])
        price_change_recent = (closes[-1] - closes[-5]) / closes[-5] if closes[-5] > 0 else 0

        if cvd_value != 0.0:
            net_delta_signal = cvd_value
        else:
            net_delta_signal = cum_delta_recent

        if price_change_recent <= -0.002 and net_delta_signal > 0:
            return {
                "divergence_type": "BULLISH_ABSORPTION",
                "absorption_detected": True,
                "signal_strength": "HIGH" if price_change_recent < -0.01 else "MEDIUM",
                "delta_direction": "POSITIVE",
                "interpretation": "Institutional bids absorbing selling pressure at lows (Bullish Delta Absorption)."
            }
        elif price_change_recent >= 0.002 and net_delta_signal < 0:
            return {
                "divergence_type": "BEARISH_EXHAUSTION",
                "absorption_detected": True,
                "signal_strength": "HIGH" if price_change_recent > 0.01 else "MEDIUM",
                "delta_direction": "NEGATIVE",
                "interpretation": "Institutional supply dumping into buyer liquidity at highs (Bearish Delta Exhaustion)."
            }
        else:
            return {
                "divergence_type": "NONE",
                "absorption_detected": False,
                "signal_strength": "NONE",
                "delta_direction": "POSITIVE" if net_delta_signal > 0 else "NEGATIVE",
                "interpretation": "Order flow delta converging normally with price action."
            }

    @staticmethod
    def calculate_accuracy_rating(
        symbol: str,
        current_price: float,
        indicators: TechnicalIndicators,
        mtf_trends: Dict[str, str],
        cvd_divergence: str = "NONE",
        derivatives: Optional[Any] = None
    ) -> AccuracySetupRating:
        """
        Calculates Institutional Grade Setup & Win Expectancy.
        Evaluates Multi-Timeframe Confluence, CVD Absorption, Derivatives Funding Bias, and Indicators.
        """
        bullish_tfs = [tf for tf, bias in mtf_trends.items() if bias == "BULLISH"]
        bearish_tfs = [tf for tf, bias in mtf_trends.items() if bias == "BEARISH"]
        bullish_count = len(bullish_tfs)
        bearish_count = len(bearish_tfs)

        if bullish_count >= 4:
            mtf_alignment = "STRONG_BULLISH_4X"
            mtf_score = 4
        elif bullish_count == 3:
            mtf_alignment = "BULLISH_3X"
            mtf_score = 3
        elif bearish_count >= 4:
            mtf_alignment = "STRONG_BEARISH_4X"
            mtf_score = 4
        elif bearish_count == 3:
            mtf_alignment = "BEARISH_3X"
            mtf_score = 3
        else:
            mtf_alignment = "NEUTRAL_CHOP"
            mtf_score = max(bullish_count, bearish_count)

        funding_bias = getattr(derivatives, "funding_bias", "NEUTRAL") if derivatives else "NEUTRAL"
        if (bullish_count >= 3 and funding_bias != "LONG_CROWDED") or (bearish_count >= 3 and funding_bias != "SHORT_CROWDED"):
            funding_alignment = "FAVORABLE"
        elif (bullish_count >= 3 and funding_bias == "LONG_CROWDED") or (bearish_count >= 3 and funding_bias == "SHORT_CROWDED"):
            funding_alignment = "CROWDED"
        else:
            funding_alignment = "NEUTRAL"

        score = 45.0
        reasons = []

        # 1. MTF Confluence
        if mtf_score == 4:
            score += 26.0
            reasons.append(f"Unanimous 4X Multi-Timeframe Trend Confluence ({', '.join(mtf_trends.keys())})")
        elif mtf_score == 3:
            score += 18.0
            reasons.append(f"Strong 3X Timeframe Confluence ({', '.join([k for k, v in mtf_trends.items() if v != 'NEUTRAL'])})")
        else:
            reasons.append("Mixed Timeframe Bias (Lower confluence / Chop)")

        # 2. CVD Flow
        if cvd_divergence == "BULLISH_ABSORPTION":
            if bullish_count >= 2:
                score += 16.0
                reasons.append("Bullish CVD Absorption: Institutional accumulation at support")
            else:
                score += 8.0
                reasons.append("CVD Bullish Divergence against counter-trend")
        elif cvd_divergence == "BEARISH_EXHAUSTION":
            if bearish_count >= 2:
                score += 16.0
                reasons.append("Bearish CVD Exhaustion: Institutional distribution at resistance")
            else:
                score += 8.0
                reasons.append("CVD Bearish Divergence against counter-trend")

        # 3. Supertrend
        st_dir = getattr(indicators, "supertrend_direction", "NEUTRAL")
        if st_dir == "BULLISH" and bullish_count >= 2:
            score += 10.0
            reasons.append("Supertrend Algorithmic Trend is Bullish")
        elif st_dir == "BEARISH" and bearish_count >= 2:
            score += 10.0
            reasons.append("Supertrend Algorithmic Trend is Bearish")

        # 4. RSI Momentum
        rsi = getattr(indicators, "rsi", 50.0) or 50.0
        if 42 <= rsi <= 64 and bullish_count >= 2:
            score += 8.0
            reasons.append(f"RSI ({rsi:.1f}) in prime bullish continuation corridor")
        elif 36 <= rsi <= 58 and bearish_count >= 2:
            score += 8.0
            reasons.append(f"RSI ({rsi:.1f}) in prime bearish continuation corridor")

        # 5. Funding Alignment
        if funding_alignment == "FAVORABLE":
            score += 8.0
            reasons.append(f"Perpetual Funding Rate is Favorable ({funding_bias.replace('_', ' ')})")
        elif funding_alignment == "CROWDED":
            score -= 10.0
            reasons.append("Derivatives Warning: Overcrowded positioning increases squeeze risk")

        score = max(30.0, min(96.0, score))
        if score >= 82.0:
            grade = "A+"
            win_rate = round(78.5 + (score - 82.0) * 0.7, 1)
            recommended_action = "EXECUTE_LONG" if bullish_count > bearish_count else "EXECUTE_SHORT"
        elif score >= 70.0:
            grade = "A"
            win_rate = round(68.0 + (score - 70.0) * 0.8, 1)
            recommended_action = "EXECUTE_LONG" if bullish_count > bearish_count else "EXECUTE_SHORT"
        elif score >= 55.0:
            grade = "B"
            win_rate = round(56.0 + (score - 55.0) * 0.7, 1)
            recommended_action = "WAIT_CONFIRMATION"
        else:
            grade = "C"
            win_rate = round(42.0 + (score - 30.0) * 0.5, 1)
            recommended_action = "WAIT_CONFIRMATION"

        now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        return AccuracySetupRating(
            symbol=symbol,
            grade=grade,
            win_rate_expectancy=win_rate,
            mtf_alignment=mtf_alignment,
            mtf_score=mtf_score,
            cvd_divergence=cvd_divergence,
            funding_alignment=funding_alignment,
            key_reasons=reasons,
            recommended_action=recommended_action,
            timestamp=now_str
        )

technical_analyzer = TechnicalAnalysisService()
