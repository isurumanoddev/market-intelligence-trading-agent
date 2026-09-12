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
    assert "BULLISH" in micro.order_flow_signal
