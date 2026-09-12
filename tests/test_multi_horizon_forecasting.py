import pytest
from app.models.market_data import Candle
from app.models.decision import MicrostructureMetrics, TechnicalIndicators, SentimentMetrics, MonthlyContext
from app.services.forecasting_service import forecasting_service

def test_multi_horizon_predictions_complete_spectrum():
    candles = []
    for i in range(35):
        base = 70000.0 + (i * 150.0)
        candles.append(Candle(
            timestamp=1700000000 + (i * 86400),
            time_str=f'2026-02-{i+1:02d}',
            open=base,
            high=base + 400.0,
            low=base - 300.0,
            close=base + 100.0,
            volume=3000.0
        ))

    current_price = 75000.0
    micro = MicrostructureMetrics(
        order_book_imbalance=0.35,
        spread_bps=2.4,
        cvd=125.0,
        cvd_side='BUY_DOMINANT',
        large_bid_walls=[{'price': 74800.0, 'amount': 25.0}],
        large_ask_walls=[]
    )
    indicators = TechnicalIndicators(
        rsi=58.5,
        macd=120.0,
        macd_signal=95.0,
        macd_hist=25.0,
        vwap=75200.0
    )
    sentiment = SentimentMetrics(
        overall_sentiment_score=0.45,
        overall_sentiment_label='BULLISH',
        top_catalysts=['Institutional ETF Inflows']
    )
    monthly = MonthlyContext(
        monthly_high=78000.0,
        monthly_low=68000.0,
        monthly_trend='MACRO_BULLISH',
        key_monthly_support=71000.0,
        key_monthly_resistance=77500.0
    )

    forecast = forecasting_service.generate_forecast(
        symbol='BTC/USDT',
        current_price=current_price,
        candles_1d=candles,
        indicators=indicators,
        microstructure=micro,
        sentiment=sentiment,
        monthly_context=monthly,
        horizon_days=30
    )

    expected_horizons = ['1m', '5m', '10m', '30m', '1h', '4h', '1d', '7d', '30d']
    preds = forecast.multi_horizon_predictions
    assert len(preds) == 9, f'Expected 9 horizons, got {len(preds)}'
    
    found_horizons = [p.horizon for p in preds]
    assert found_horizons == expected_horizons

    for p in preds:
        assert p.predicted_price > 0
        assert p.upper_bound >= p.predicted_price
        assert p.lower_bound <= p.predicted_price
        assert p.confidence >= 50
        assert p.bias in ['BULLISH', 'BEARISH', 'NEUTRAL']
        assert len(p.primary_driver) > 0
        assert len(p.target_time_str) > 0
        calc_pct = round(((p.predicted_price - current_price) / current_price) * 100.0, 2)
        assert abs(p.expected_change_pct - calc_pct) < 0.05

    pred_1m = preds[0]
    assert pred_1m.horizon == '1m'
    assert pred_1m.predicted_price >= current_price
