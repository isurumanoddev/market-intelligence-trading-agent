import pytest
from app.models.market_data import Candle
from app.services.forecasting_service import forecasting_service

def test_forecasting_service_trajectory():
    candles = []
    # 45 synthetic daily candles
    for i in range(45):
        base = 65000.0 + (i * 250.0)
        candles.append(Candle(
            timestamp=1700000000 + (i * 86400),
            time_str=f"2026-02-{i+1:02d}",
            open=base,
            high=base + 600.0,
            low=base - 400.0,
            close=base + 200.0,
            volume=2500.0
        ))

    current_price = 76000.0
    forecast = forecasting_service.generate_forecast(
        symbol="BTC/USDT",
        current_price=current_price,
        candles_1d=candles,
        horizon_days=30
    )

    assert forecast.symbol == "BTC/USDT"
    assert forecast.current_price == current_price
    assert forecast.horizon_days == 30
    assert len(forecast.trajectory) == 30
    assert forecast.target_7d > 0
    assert forecast.target_30d > 0
    assert forecast.confidence_score >= 50
    assert forecast.projected_range_max >= forecast.target_30d
    assert forecast.projected_range_min <= forecast.target_30d

    # Test confidence bounds on trajectory
    for point in forecast.trajectory:
        assert point.upper_bound >= point.predicted_price
        assert point.lower_bound <= point.predicted_price
        assert point.day >= 1
