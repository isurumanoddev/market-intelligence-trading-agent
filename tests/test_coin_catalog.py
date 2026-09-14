import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.data.coin_catalog import COIN_CATALOG
from app.services.coin_catalog_service import coin_catalog_service

client = TestClient(app)

def test_catalog_size_and_structure():
    """Verify that the coin catalog contains at least 100 cryptocurrencies with valid schema."""
    assert len(COIN_CATALOG) >= 100, f"Expected at least 100 coins, found {len(COIN_CATALOG)}"
    
    for coin in COIN_CATALOG:
        assert "/" in coin["symbol"], f"Coin symbol must be a pair: {coin['symbol']}"
        assert coin["symbol"].endswith("/USDT"), f"Coin should end in /USDT: {coin['symbol']}"
        assert len(coin["name"]) > 0, f"Coin name missing for {coin['symbol']}"
        assert coin["market_cap_rank"] > 0, f"Market cap rank must be positive: {coin['market_cap_rank']}"
        assert isinstance(coin["is_high_volume"], bool)
        assert ":" in coin["tv_symbol"]
        prefix = coin["tv_symbol"].split(":")[0]
        assert prefix in ["BINANCE", "BYBIT", "KUCOIN", "OKX", "COINBASE"]

def test_catalog_categories_coverage():
    """Verify that all major crypto sectors are represented in catalog."""
    categories = {c["category"] for c in COIN_CATALOG}
    expected_categories = {
        "L1_L2",
        "MEME",
        "AI_DEPIN",
        "DEFI",
        "RWA_INFRA",
        "GAMING"
    }
    assert expected_categories.issubset(categories), f"Missing categories: {expected_categories - categories}"

def test_coin_catalog_service_queries():
    """Verify filtering, searching, and sorting capabilities of CoinCatalogService."""
    # Test all coins
    all_coins = coin_catalog_service.get_coins(limit=200)
    assert len(all_coins) >= 100

    # Test category filter
    meme_coins = coin_catalog_service.get_coins(category="MEME")
    assert len(meme_coins) >= 10
    assert all(c["category"] == "MEME" or "MEME" in c.get("tags", []) for c in meme_coins)
    assert any(c["symbol"] == "PEPE/USDT" for c in meme_coins)
    assert any(c["symbol"] == "DOGE/USDT" for c in meme_coins)

    # Test search query
    sol_results = coin_catalog_service.get_coins(search="SOL")
    assert any(c["symbol"] == "SOL/USDT" for c in sol_results)

    # Test top volume
    top_vol = coin_catalog_service.get_top_volume_coins(limit=15)
    assert len(top_vol) == 15
    assert all(c["is_high_volume"] for c in top_vol)

def test_api_coins_endpoints():
    """Verify FastAPI /api/market/coins and /api/market/top-volume endpoints."""
    # 1. GET all coins
    res = client.get("/api/market/coins?limit=150")
    assert res.status_code == 200
    data = res.json()
    assert "coins" in data
    assert data["total"] >= 100
    assert len(data["coins"]) >= 100

    # 2. GET with category filter
    res_ai = client.get("/api/market/coins?category=AI_DEPIN")
    assert res_ai.status_code == 200
    data_ai = res_ai.json()
    assert len(data_ai["coins"]) >= 10
    symbols = [c["symbol"] for c in data_ai["coins"]]
    assert "FET/USDT" in symbols or "NEAR/USDT" in symbols

    # 3. GET with search query
    res_search = client.get("/api/market/coins?search=doge")
    assert res_search.status_code == 200
    data_search = res_search.json()
    assert any(c["symbol"] == "DOGE/USDT" for c in data_search["coins"])

    # 4. GET top volume coins
    res_vol = client.get("/api/market/top-volume?limit=10")
    assert res_vol.status_code == 200
    vol_data = res_vol.json()
    vol_coins = vol_data.get("coins", vol_data)
    assert len(vol_coins) == 10
    assert any(c["symbol"] == "BTC/USDT" for c in vol_coins)
    assert any(c["symbol"] == "SOL/USDT" for c in vol_coins)

def test_paper_trade_with_new_catalog_coin():
    """Verify paper trading engine supports execution on newly added catalog coins."""
    payload = {
        "symbol": "SUI/USDT",
        "side": "BUY",
        "price": 3.25,
        "amount": 1000.0,
        "leverage": 5,
        "stop_loss": 2.95,
        "take_profit": 4.10,
        "reason": "Test SUI Catalog Coin Trade"
    }
    trade_res = client.post("/api/portfolio/trade", json=payload)
    assert trade_res.status_code == 200
    pos = trade_res.json()["position"]
    assert pos["symbol"] == "SUI/USDT"
    assert pos["leverage"] == 5

    # Close the position
    close_res = client.post("/api/portfolio/close", json={
        "position_id": pos["id"],
        "current_price": 3.40,
        "reason": "Test SUI Profit Close"
    })
    assert close_res.status_code == 200
    trade = close_res.json()["trade"]
    assert trade["pnl"] > 0
