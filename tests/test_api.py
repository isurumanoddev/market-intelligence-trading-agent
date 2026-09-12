from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"

def test_settings_endpoint():
    response = client.get("/api/settings")
    assert response.status_code == 200
    data = response.json()
    assert "default_exchange" in data
    assert "max_risk_per_trade_pct" in data

def test_portfolio_endpoint():
    response = client.get("/api/portfolio")
    assert response.status_code == 200
    data = response.json()
    assert "cash" in data
    assert "equity" in data
    assert "positions" in data

def test_paper_trade_api_lifecycle():
    # 1. Execute a simulated buy trade with wide safety bounds
    payload = {
        "symbol": "BTC/USDT",
        "side": "BUY",
        "price": 80000.0,
        "amount": 0.1,
        "stop_loss": 40000.0,
        "take_profit": 150000.0,
        "reason": "Unit Test Order"
    }
    trade_res = client.post("/api/portfolio/trade", json=payload)
    assert trade_res.status_code == 200
    pos = trade_res.json()["position"]
    pos_id = pos["id"]

    # 2. Check position is listed in portfolio
    port_res = client.get("/api/portfolio")
    assert port_res.status_code == 200
    positions = port_res.json()["positions"]
    assert any(p["id"] == pos_id for p in positions)

    # 3. Close the position
    close_res = client.post("/api/portfolio/close", json={
        "position_id": pos_id,
        "current_price": 82000.0,
        "reason": "Test Close Profit"
    })
    assert close_res.status_code == 200
    closed_trade = close_res.json()["trade"]
    assert closed_trade["pnl"] > 0
