import numpy as np
from typing import List, Dict, Any, Optional
from app.models.market_data import Candle, OrderBook, Trade
from app.models.decision import TechnicalIndicators, MicrostructureMetrics, MonthlyContext

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

        # 6. VWAP
        typical_prices = (highs + lows + closes) / 3.0
        tot_vol = np.sum(volumes)
        vwap = float(np.sum(typical_prices * volumes) / tot_vol) if tot_vol > 0 else float(closes[-1])

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
            vwap=round(vwap, 2),
            atr=round(atr, 4),
            bb_upper=round(bb_upper, 2),
            bb_middle=round(bb_mid, 2),
            bb_lower=round(bb_lower, 2),
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

technical_analyzer = TechnicalAnalysisService()
