from app.models.market_data import Ticker, NewsItem
from app.models.decision import TechnicalIndicators, MicrostructureMetrics, SentimentMetrics
from app.agents.master_trading_agent import master_trading_agent

def test_decision_engine_bullish_confluence():
    ticker = Ticker(
        symbol="BTC/USDT",
        exchange="KRAKEN",
        price=80000.0,
        bid=79999.0,
        ask=80001.0,
        high_24h=81000.0,
        low_24h=78000.0,
        volume_24h=1500.0,
        quote_volume_24h=120000000.0,
        change_24h=2000.0,
        change_pct_24h=2.5,
        timestamp=1000000
    )

    indicators = TechnicalIndicators(
        rsi=55.0,
        ema_20=79000.0,
        ema_50=77000.0,
        trend_state="BULLISH",
        atr=1200.0,
        vwap=79500.0,
        macd_hist=150.0
    )

    microstructure = MicrostructureMetrics(
        order_book_imbalance=0.45,
        spread_bps=2.5,
        spread_pct=0.025,
        bid_depth_usd=5000000.0,
        ask_depth_usd=2000000.0,
        cvd=150.0,
        cvd_side="BUY_DOMINANT",
        order_flow_signal="STRONG_BULLISH_PRESSURE"
    )

    sentiment = SentimentMetrics(
        overall_sentiment_score=0.6,
        overall_sentiment_label="BULLISH",
        dominant_narrative="Institutional ETF inflows accelerate."
    )

    decision = master_trading_agent.evaluate(
        symbol="BTC/USDT",
        ticker=ticker,
        indicators=indicators,
        microstructure=microstructure,
        sentiment=sentiment,
        news_items=[]
    )

    assert decision.action in ["BUY", "STRONG_BUY"]
    assert decision.conviction >= 60
    assert decision.stop_loss < ticker.price
    assert decision.take_profit_1 > ticker.price
    assert len(decision.reasons) > 0
