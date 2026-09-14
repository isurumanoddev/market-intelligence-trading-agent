import pytest
from pathlib import Path
from app.services.paper_broker import PaperBrokerService
from app.services.exchange_broker_service import exchange_broker_service
from app.services.technical_analysis import technical_analyzer
from app.models.market_data import Candle
from app.models.decision import TechnicalIndicators
from app.config import settings

def test_exchange_watch_urls_and_webhook():
    # 1. Test URLs
    b_url = exchange_broker_service.get_exchange_watch_url("BTC/USDT", "BINANCE_TESTNET")
    assert b_url == "https://testnet.binancefuture.com/en/futures/BTCUSDT"

    by_url = exchange_broker_service.get_exchange_watch_url("ETH/USDT", "BYBIT_TESTNET")
    assert by_url == "https://testnet.bybit.com/trade/usdt/ETHUSDT"

    tv_url = exchange_broker_service.get_exchange_watch_url("SOL/USDT", "LOCAL")
    assert tv_url == "https://www.tradingview.com/chart/?symbol=BINANCE:SOLUSDT"

    # 2. Test TradingView Alert Payload
    payload = exchange_broker_service.generate_tradingview_alert_payload(
        symbol="BTC/USDT",
        side="BUY",
        price=65000.0,
        amount=0.5,
        leverage=10.0,
        stop_loss=63000.0,
        take_profit=70000.0
    )
    assert payload["ticker"] == "BTCUSDT"
    assert payload["action"] == "buy"
    assert payload["price"] == 65000.0
    assert payload["leverage"] == 10.0

    # 3. Test PineConnector syntax
    pine = exchange_broker_service.generate_pineconnector_syntax(
        symbol="BTC/USDT",
        side="BUY",
        amount=0.5,
        leverage=10.0,
        stop_loss=63000.0,
        take_profit=70000.0
    )
    assert "buy,BTCUSDT,vol=0.5" in pine
    assert "sl=63000.0" in pine
    assert "tp=70000.0" in pine

def test_paper_broker_disk_persistence():
    broker = PaperBrokerService(initial_cash=100000.0, storage_path=settings.paper_broker_storage_path)
    broker.reset(100000.0)

    # Execute trade with Binance Testnet broker routing
    pos = broker.execute_order(
        symbol="BTC/USDT",
        side="BUY",
        price=65000.0,
        amount=0.2,
        leverage=5.0,
        stop_loss=62000.0,
        take_profit=72000.0,
        broker_type="BINANCE_TESTNET",
        reason="Breakout test"
    )
    assert pos.broker_type == "BINANCE_TESTNET"
    assert pos.exchange_watch_url == "https://testnet.binancefuture.com/en/futures/BTCUSDT"

    # Verify state file was created
    storage_path = Path(settings.paper_broker_storage_path)
    assert storage_path.exists()

    # Re-instantiate broker to simulate server restart
    broker_reloaded = PaperBrokerService(storage_path=settings.paper_broker_storage_path)
    assert len(broker_reloaded.positions) == 1
    reloaded_pos = list(broker_reloaded.positions.values())[0]
    assert reloaded_pos.symbol == "BTC/USDT"
    assert reloaded_pos.amount == 0.2
    assert reloaded_pos.broker_type == "BINANCE_TESTNET"
    assert reloaded_pos.exchange_watch_url == "https://testnet.binancefuture.com/en/futures/BTCUSDT"

    # Close position on reloaded instance
    trade = broker_reloaded.close_position(reloaded_pos.id, 68000.0, "Take profit hit")
    assert trade.pnl > 0
    assert len(broker_reloaded.positions) == 0

    # Re-verify restart persistence after closing
    broker_reloaded_3 = PaperBrokerService(storage_path=settings.paper_broker_storage_path)
    assert len(broker_reloaded_3.positions) == 0
    assert len(broker_reloaded_3.trades_history) >= 1

    # Cleanup
    broker_reloaded_3.reset()

def test_accuracy_setup_rating_grade_a():
    def make_bullish_candles(n=30, base_price=60000):
        c_list = []
        p = base_price
        for i in range(n):
            p += 50.0
            c_list.append(Candle(
                timestamp=1700000000 + i * 3600,
                time_str="2026-01-01 12:00:00",
                open=p - 20,
                high=p + 30,
                low=p - 25,
                close=p,
                volume=100.0 + i
            ))
        return c_list

    c_15m = make_bullish_candles(30, 64000)
    c_1h = make_bullish_candles(40, 63000)
    c_4h = make_bullish_candles(30, 61000)
    c_1d = make_bullish_candles(30, 55000)

    # MTF Trend
    mtf = technical_analyzer.calculate_mtf_trend({
        "15m": c_15m,
        "1h": c_1h,
        "4h": c_4h,
        "1d": c_1d
    })
    assert mtf["15m"] == "BULLISH"
    assert mtf["1h"] == "BULLISH"
    assert mtf["4h"] == "BULLISH"
    assert mtf["1d"] == "BULLISH"

    # CVD Absorption Divergence test
    cvd_res = technical_analyzer.detect_cvd_divergence(c_1h, cvd_value=500.0)

    # Accuracy Rating
    indicators = TechnicalIndicators(
        rsi=52.0,
        supertrend_direction="BULLISH",
        adx=28.0
    )

    rating = technical_analyzer.calculate_accuracy_rating(
        symbol="BTC/USDT",
        current_price=65500.0,
        indicators=indicators,
        mtf_trends=mtf,
        cvd_divergence="BULLISH_ABSORPTION"
    )

    assert rating.grade == "A+"
    assert rating.win_rate_expectancy >= 78.0
    assert rating.mtf_alignment == "STRONG_BULLISH_4X"
    assert rating.mtf_score == 4
    assert rating.recommended_action == "EXECUTE_LONG"
    assert len(rating.key_reasons) >= 3
