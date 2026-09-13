import pytest
from app.models.market_data import Ticker
from app.models.decision import (
    LLMHorizonPrediction,
    LLMPredictionResult,
    TechnicalIndicators,
    MicrostructureMetrics,
    SentimentMetrics,
    MonthlyContext,
)
from app.services.llm_predictor import llm_predictor, LLMPredictorService
from app.services.derivatives_service import DerivativesData
from app.services.onchain_service import OnChainData

def test_llm_models():
    pred = LLMHorizonPrediction(
        horizon="30m",
        horizon_label="30 Minutes",
        predicted_price=77500.0,
        expected_change_pct=0.5,
        direction="BULLISH",
        confidence=80,
        price_range_low=77000.0,
        price_range_high=78000.0,
        reasoning="Strong order book bid pressure",
        key_factors=["Order flow", "CVD", "RSI"],
        risk_level="LOW",
        recommended_action="BUY",
    )
    assert pred.horizon == "30m"
    assert pred.predicted_price == 77500.0
    assert pred.direction == "BULLISH"

    res = LLMPredictionResult(
        symbol="BTC/USDT",
        current_price=77100.0,
        market_summary="Market consolidation before breakout",
        overall_bias="BULLISH",
        overall_confidence=78,
        predictions=[pred],
    )
    assert res.symbol == "BTC/USDT"
    assert len(res.predictions) == 1

def test_context_building():
    ticker = Ticker(
        symbol="BTC/USDT",
        exchange="BINANCE",
        price=77000.0,
        bid=76990.0,
        ask=77010.0,
        high_24h=78000.0,
        low_24h=76000.0,
        volume_24h=12000.0,
        quote_volume_24h=924000000.0,
        change_24h=500.0,
        change_pct_24h=0.65,
        timestamp=1700000000,
    )
    indicators = TechnicalIndicators(rsi=58.2, trend_state="BULLISH")
    micro = MicrostructureMetrics(order_book_imbalance=0.18, cvd_side="BUY_DOMINANT")
    sent = SentimentMetrics(overall_sentiment_score=0.45, overall_sentiment_label="BULLISH")

    ctx = llm_predictor._build_context_dict(
        symbol="BTC/USDT",
        ticker=ticker,
        indicators=indicators,
        microstructure=micro,
        sentiment=sent,
        monthly_context=None,
        derivatives=None,
        onchain=None,
    )

    assert ctx["symbol"] == "BTC/USDT"
    assert ctx["current_price"] == 77000.0
    assert ctx["technical"]["rsi"] == 58.2
    assert ctx["microstructure"]["imbalance"] == 0.18
    assert ctx["sentiment"]["score"] == 0.45

def test_predict_deterministic_all_horizons():
    service = LLMPredictorService()
    ticker = Ticker(
        symbol="ETH/USDT",
        exchange="BINANCE",
        price=2600.0,
        bid=2599.0,
        ask=2601.0,
        high_24h=2650.0,
        low_24h=2550.0,
        volume_24h=80000.0,
        quote_volume_24h=208000000.0,
        change_24h=25.0,
        change_pct_24h=0.97,
        timestamp=1700000000,
    )

    result = service.predict(symbol="ETH/USDT", ticker=ticker, bypass_cache=True)
    assert result.symbol == "ETH/USDT"
    assert len(result.predictions) == 4
    
    horizons = [p.horizon for p in result.predictions]
    assert horizons == ["30m", "1h", "4h", "1d"]

    for p in result.predictions:
        assert p.predicted_price > 0
        assert p.price_range_low < p.price_range_high
        assert len(p.reasoning) > 10
        assert len(p.key_factors) == 3
        assert p.risk_level in ["LOW", "MEDIUM", "HIGH", "EXTREME"]
        assert p.recommended_action in ["BUY", "SELL", "HOLD", "WAIT"]

def test_caching_behavior():
    service = LLMPredictorService()
    ticker = Ticker(
        symbol="SOL/USDT",
        exchange="BINANCE",
        price=150.0,
        bid=149.9,
        ask=150.1,
        high_24h=155.0,
        low_24h=145.0,
        volume_24h=500000.0,
        quote_volume_24h=75000000.0,
        change_24h=3.0,
        change_pct_24h=2.04,
        timestamp=1700000000,
    )

    res1 = service.predict(symbol="SOL/USDT", ticker=ticker, bypass_cache=False)
    time_first = res1.timestamp

    # Immediate second call should return identical cached instance
    res2 = service.predict(symbol="SOL/USDT", ticker=ticker, bypass_cache=False)
    assert res1 is res2
    assert res2.timestamp == time_first
