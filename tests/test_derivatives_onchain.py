import pytest
from app.services.derivatives_service import DerivativesData, DerivativesService
from app.services.onchain_service import OnChainData, OnChainService
from app.services.coinglass_service import CoinGlassData, CoinGlassService
from app.services.forecasting_service import forecasting_service
from app.models.market_data import Candle
from app.models.decision import MonthlyContext, MicrostructureMetrics, TechnicalIndicators, SentimentMetrics

def test_derivatives_data_model_defaults():
    data = DerivativesData(symbol="BTC/USDT")
    assert data.symbol == "BTC/USDT"
    assert data.funding_rate == 0.0
    assert data.funding_rate_pct == 0.0
    assert data.funding_bias == "NEUTRAL"
    assert data.leverage_signal == "NORMAL"
    assert data.long_short_ratio == 1.0
    assert data.data_source == "CCXT_PUBLIC"

def test_onchain_data_model_defaults():
    data = OnChainData()
    assert data.total_stablecoin_mcap_usd == 0.0
    assert data.stablecoin_dominance_pct == 0.0
    assert data.stablecoin_flow_signal == "NEUTRAL"
    assert data.tvl_signal == "STABLE"
    assert data.data_source == "DEFILLAMA"

def test_coinglass_data_model_defaults():
    data = CoinGlassData(symbol="BTC")
    assert data.symbol == "BTC"
    assert data.total_liquidations_24h_usd == 0.0
    assert data.liquidation_dominance == "BALANCED"
    assert data.data_source == "COINGLASS"

def test_derivatives_funding_bias_and_leverage():
    rate = 0.0015
    rate_pct = rate * 100
    ann_pct = rate * 3 * 365 * 100
    bias = "LONG_CROWDED" if rate > 0.0005 else "NEUTRAL"
    lev = "OVERLEVERAGED_LONG" if rate > 0.001 else "NORMAL"
    
    assert bias == "LONG_CROWDED"
    assert lev == "OVERLEVERAGED_LONG"

    neg_rate = -0.0012
    neg_bias = "SHORT_CROWDED" if neg_rate < -0.0005 else "NEUTRAL"
    neg_lev = "OVERLEVERAGED_SHORT" if neg_rate < -0.001 else "NORMAL"

    assert neg_bias == "SHORT_CROWDED"
    assert neg_lev == "OVERLEVERAGED_SHORT"

def test_onchain_stablecoin_flow_signals():
    def get_signal(pct_change):
        if pct_change > 5:
            return "STRONG_INFLOW"
        elif pct_change > 1:
            return "INFLOW"
        elif pct_change < -5:
            return "STRONG_OUTFLOW"
        elif pct_change < -1:
            return "OUTFLOW"
        return "NEUTRAL"

    assert get_signal(6.5) == "STRONG_INFLOW"
    assert get_signal(2.3) == "INFLOW"
    assert get_signal(0.4) == "NEUTRAL"
    assert get_signal(-2.0) == "OUTFLOW"
    assert get_signal(-7.5) == "STRONG_OUTFLOW"

def test_forecast_integration_with_derivatives_and_onchain():
    candles = []
    base_p = 60000.0
    for i in range(35):
        candles.append(
            Candle(
                timestamp=1700000000 + (i * 86400),
                time_str=f"Day {i}",
                open=base_p,
                high=base_p * 1.01,
                low=base_p * 0.99,
                close=base_p,
                volume=1000.0
            )
        )

    base_forecast = forecasting_service.generate_forecast(
        symbol="BTC/USDT",
        current_price=base_p,
        candles_1d=candles,
        horizon_days=30
    )

    derivatives_crowded = DerivativesData(
        symbol="BTC/USDT",
        funding_rate=0.002,
        funding_rate_pct=0.2,
        funding_bias="LONG_CROWDED",
        leverage_signal="OVERLEVERAGED_LONG"
    )
    
    onchain_bullish = OnChainData(
        stablecoin_30d_change_pct=8.0,
        stablecoin_flow_signal="STRONG_INFLOW",
        tvl_signal="EXPANDING"
    )

    enhanced_forecast = forecasting_service.generate_forecast(
        symbol="BTC/USDT",
        current_price=base_p,
        candles_1d=candles,
        derivatives=derivatives_crowded,
        onchain=onchain_bullish,
        horizon_days=30
    )

    assert enhanced_forecast.multi_horizon_predictions is not None
    assert len(enhanced_forecast.multi_horizon_predictions) == 9

    pred_1m = next(h for h in enhanced_forecast.multi_horizon_predictions if h.horizon == "1m")
    assert "Funding Drag" in pred_1m.primary_driver or "LONG_CROWDED" in pred_1m.primary_driver

    pred_30d = next(h for h in enhanced_forecast.multi_horizon_predictions if h.horizon == "30d")
    assert "Stablecoin" in pred_30d.primary_driver or "INFLOW" in pred_30d.primary_driver or "Macro" in pred_30d.primary_driver
