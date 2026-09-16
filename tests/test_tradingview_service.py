import pytest
from app.services.tradingview_service import tradingview_service

def test_tradingview_config():
    config = tradingview_service.get_config()
    assert config["supports_search"] is True
    assert config["supports_time"] is True
    assert "1D" in config["supported_resolutions"]
    assert "60" in config["supported_resolutions"]
    assert len(config["exchanges"]) >= 2

def test_tradingview_time():
    t = tradingview_service.get_time()
    assert isinstance(t, int)
    assert t > 1700000000

def test_tradingview_resolve_symbol():
    res = tradingview_service.resolve_symbol("BTC/USDT")
    assert res["name"] == "BTC/USDT"
    assert res["ticker"] == "BTC/USDT"
    assert res["type"] == "crypto"
    assert res["session"] == "24x7"
    assert res["has_intraday"] is True
    assert res["pricescale"] == 100

def test_tradingview_search():
    results = tradingview_service.search_symbols("BTC")
    assert len(results) >= 1
    assert any("BTC" in r["symbol"] for r in results)

def test_tradingview_history():
    history = tradingview_service.get_history("BTC/USDT", resolution="60")
    assert history["s"] in ["ok", "no_data"]
    if history["s"] == "ok":
        assert len(history["t"]) > 0
        assert len(history["o"]) == len(history["t"])
        assert len(history["h"]) == len(history["t"])
        assert len(history["l"]) == len(history["t"])
        assert len(history["c"]) == len(history["t"])
        assert len(history["v"]) == len(history["t"])
