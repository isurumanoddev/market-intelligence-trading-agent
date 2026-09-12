import pytest
from app.models.market_data import Candle, OrderBook, OrderBookLevel, Trade
from app.services.technical_analysis import technical_analyzer

def test_indicators_calculation():
    candles = []
    # Create 30 synthetic ascending candles
    for i in range(30):
        p = 100.0 + i * 2.0
        candles.append(Candle(
            timestamp=1000 + i * 60,
            time_str="12:00",
            open=p - 1.0,
            high=p + 2.0,
            low=p - 1.5,
            close=p,
            volume=500.0 + i * 10
        ))

    ind = technical_analyzer.calculate_indicators(candles)
    assert ind.rsi is not None
    assert ind.rsi > 50  # Strong uptrend should have RSI > 50
    assert ind.trend_state == "BULLISH"
    assert ind.ema_20 is not None
    assert ind.vwap is not None
    assert ind.atr is not None

def test_microstructure_analysis():
    bids = [
        OrderBookLevel(price=100.0, amount=10.0, total=10.0),
        OrderBookLevel(price=99.0, amount=20.0, total=30.0),
    ]
    asks = [
        OrderBookLevel(price=101.0, amount=5.0, total=5.0),
        OrderBookLevel(price=102.0, amount=5.0, total=10.0),
    ]
    ob = OrderBook(
        symbol="TEST/USDT",
        exchange="TEST",
        bids=bids,
        asks=asks,
        best_bid=100.0,
        best_ask=101.0,
        spread=1.0,
        spread_pct=1.0,
        imbalance=0.5,
        total_bid_depth=30.0,
        total_ask_depth=10.0,
        timestamp=1000
    )

    trades = [
        Trade(id="1", timestamp=1000, time_str="12:00:01", symbol="TEST/USDT", side="buy", price=101.0, amount=15.0, cost=1515.0),
        Trade(id="2", timestamp=1001, time_str="12:00:02", symbol="TEST/USDT", side="sell", price=100.0, amount=5.0, cost=500.0),
    ]

    micro = technical_analyzer.analyze_microstructure(ob, trades)
    assert micro.order_book_imbalance == 0.5
    assert micro.cvd == 10.0  # 15 buy - 5 sell
    assert micro.cvd_side == "BUY_DOMINANT"

def test_monthly_context_calculation():
    candles_1d = []
    # 30 daily candles from price 60,000 to 75,000
    for i in range(30):
        base = 60000.0 + (i * 500.0)
        candles_1d.append(Candle(
            timestamp=1700000000 + (i * 86400),
            time_str=f"2026-02-{i+1:02d}",
            open=base,
            high=base + 1000.0,
            low=base - 500.0,
            close=base + 400.0,
            volume=1000.0
        ))
    
    current_price = 74500.0
    monthly = technical_analyzer.calculate_monthly_context(candles_1d, current_price)
    
    assert monthly.lookback_days == 30
    assert monthly.monthly_high == pytest.approx(75500.0, rel=1e-2)
    assert monthly.monthly_low == pytest.approx(59500.0, rel=1e-2)
    assert monthly.monthly_change_pct > 20.0
    assert monthly.monthly_trend == "MACRO_BULLISH"
    assert monthly.range_position_pct > 80.0
    assert monthly.key_monthly_support > 0
    assert monthly.key_monthly_resistance > 0
