import pytest
from app.services.backtest_engine import backtest_engine, BacktestRequest

def test_backtest_engine_ema_rsi():
    req = BacktestRequest(
        symbol="BTC/USDT",
        strategy="EMA_RSI",
        timeframe="1h",
        lookback_days=30,
        initial_capital=10000.0,
        position_size_pct=25.0,
        stop_loss_pct=2.0,
        take_profit_pct=4.5,
        trailing_stop_pct=1.5
    )
    result = backtest_engine.run_backtest(req)
    assert result is not None
    assert result.parameters["symbol"] == "BTC/USDT"
    assert result.metrics.initial_capital == 10000.0
    assert result.metrics.final_equity > 0.0
    assert result.metrics.max_drawdown_pct >= 0.0
    assert isinstance(result.metrics.sharpe_ratio, float)
    assert isinstance(result.metrics.win_rate_pct, float)
    assert len(result.equity_curve) > 0

def test_backtest_engine_macd():
    req = BacktestRequest(
        symbol="ETH/USDT",
        strategy="MACD",
        timeframe="4h",
        lookback_days=60,
        initial_capital=25000.0
    )
    result = backtest_engine.run_backtest(req)
    assert result is not None
    assert result.metrics.initial_capital == 25000.0
    assert len(result.equity_curve) > 0

def test_backtest_engine_bollinger_reversion():
    req = BacktestRequest(
        symbol="BTC/USDT",
        strategy="BOLLINGER_REVERSION",
        timeframe="1h",
        lookback_days=60,
        initial_capital=15000.0
    )
    result = backtest_engine.run_backtest(req)
    assert result is not None
    assert result.metrics.initial_capital == 15000.0
    assert result.metrics.total_trades >= 0
    assert len(result.equity_curve) > 0

def test_backtest_engine_derivatives_squeeze():
    req = BacktestRequest(
        symbol="SOL/USDT",
        strategy="DERIVATIVES_SQUEEZE",
        timeframe="1h",
        lookback_days=45,
        initial_capital=10000.0
    )
    result = backtest_engine.run_backtest(req)
    assert result is not None
    assert result.metrics.initial_capital == 10000.0
    assert len(result.equity_curve) > 0

def test_backtest_engine_news_macro_momentum():
    req = BacktestRequest(
        symbol="BTC/USDT",
        strategy="NEWS_MACRO_MOMENTUM",
        timeframe="1h",
        lookback_days=90,
        initial_capital=20000.0
    )
    result = backtest_engine.run_backtest(req)
    assert result is not None
    assert result.metrics.initial_capital == 20000.0
    assert len(result.equity_curve) > 0

def test_backtest_engine_quant_alpha_confluence():
    req = BacktestRequest(
        symbol="ETH/USDT",
        strategy="QUANT_ALPHA_CONFLUENCE",
        timeframe="1h",
        lookback_days=90,
        initial_capital=10000.0
    )
    result = backtest_engine.run_backtest(req)
    assert result is not None
    assert result.metrics.initial_capital == 10000.0
    assert len(result.equity_curve) > 0
