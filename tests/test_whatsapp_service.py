import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient

from app.main import app
from app.services.whatsapp_service import whatsapp_service
from app.services.entry_alert_watcher import entry_alert_watcher
from app.config import settings

client = TestClient(app)

def test_whatsapp_service_signal_formatting():
    """Verifies that format_trading_signal produces the complete VIP signal layout."""
    msg = whatsapp_service.format_trading_signal(
        symbol="BTC/USDT",
        side="BUY",
        entry_price=64250.0,
        stop_loss=63100.0,
        take_profit_1=66550.0,
        take_profit_2=68275.0,
        current_price=64300.0,
        grade="A+",
        win_expectancy=84.5,
        confluences=["EMA 20 Dynamic Support Pullback", "Supertrend Bullish Trailing Base"],
        recommended_size_usd=10.0,
        recommended_leverage=10
    )

    assert "QUANTMIND VIP SIGNAL: BTC/USDT" in msg
    assert "LONG (BUY)" in msg
    assert "GRADE A+" in msg
    assert "84.5%" in msg
    assert "$64,250.00" in msg
    assert "STOP LOSS" in msg
    assert "$63,100.00" in msg
    assert "TAKE PROFIT 1" in msg
    assert "$66,550.00" in msg
    assert "TAKE PROFIT 2" in msg
    assert "$68,275.00" in msg
    assert "EMA 20 Dynamic Support Pullback" in msg
    assert "$10.00 USD" in msg
    assert "10x" in msg

def test_whatsapp_service_short_signal_formatting():
    """Verifies that SHORT signals format correct direction, SL above entry, and TP below entry."""
    msg = whatsapp_service.format_trading_signal(
        symbol="BTC/USDT",
        side="SELL",
        entry_price=65000.0,
        stop_loss=66200.0,
        take_profit_1=62600.0,
        take_profit_2=60800.0,
        current_price=64950.0,
        grade="A",
        win_expectancy=76.0,
        confluences=["EMA 20 Overhead Resistance Retest"],
        recommended_size_usd=10.0,
        recommended_leverage=10
    )

    assert "SHORT (SELL)" in msg
    assert "$65,000.00" in msg
    assert "$66,200.00" in msg
    assert "$62,600.00" in msg

@patch("requests.get")
def test_callmebot_dispatch_mock(mock_get):
    """Verifies that CallMeBot HTTP dispatch constructs the exact URL and handles success."""
    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.text = "Message queued"
    mock_get.return_value = mock_resp

    orig_provider = settings.whatsapp_provider
    orig_phone = settings.whatsapp_phone
    orig_key = settings.whatsapp_callmebot_key

    try:
        settings.whatsapp_provider = "callmebot"
        settings.whatsapp_phone = "+1234567890"
        settings.whatsapp_callmebot_key = "test_key_123"

        res = whatsapp_service.send_message("Test Alert Signal")
        assert res["success"] is True
        assert res["provider"] == "callmebot"
        mock_get.assert_called_once()
        called_url = mock_get.call_args[0][0]
        assert "api.callmebot.com/whatsapp.php" in called_url
        assert "phone=1234567890" in called_url
        assert "apikey=test_key_123" in called_url
    finally:
        settings.whatsapp_provider = orig_provider
        settings.whatsapp_phone = orig_phone
        settings.whatsapp_callmebot_key = orig_key

@patch("requests.post")
def test_twilio_dispatch_mock(mock_post):
    """Verifies that Twilio WhatsApp dispatch sends to Twilio API with basic auth."""
    mock_resp = MagicMock()
    mock_resp.status_code = 201
    mock_resp.json.return_value = {"sid": "SM12345678"}
    mock_post.return_value = mock_resp

    orig_provider = settings.whatsapp_provider
    orig_sid = settings.twilio_account_sid
    orig_tok = settings.twilio_auth_token
    orig_phone = settings.whatsapp_phone

    try:
        settings.whatsapp_provider = "twilio"
        settings.twilio_account_sid = "AC_test_sid"
        settings.twilio_auth_token = "test_auth_token"
        settings.whatsapp_phone = "+1987654321"

        res = whatsapp_service.send_message("Twilio Signal")
        assert res["success"] is True
        assert res["provider"] == "twilio"
        assert res["sid"] == "SM12345678"
    finally:
        settings.whatsapp_provider = orig_provider
        settings.twilio_account_sid = orig_sid
        settings.twilio_auth_token = orig_tok
        settings.whatsapp_phone = orig_phone

@pytest.mark.anyio
async def test_entry_alert_watcher_compute_setup():
    """Verifies that EntryAlertWatcher computes valid OTE entry levels for BTC/USDT."""
    setup = await entry_alert_watcher.compute_setup("BTC/USDT")
    assert setup is not None
    assert setup["symbol"] == "BTC/USDT"
    assert setup["side"] in ["BUY", "SELL"]
    assert setup["optimal_entry"] > 0
    assert setup["stop_loss"] > 0
    assert setup["take_profit_1"] > 0
    assert setup["take_profit_2"] > 0
    assert setup["grade"] in ["A+", "A", "B", "C"]
    assert setup["win_expectancy"] > 0

    if setup["side"] == "BUY":
        assert setup["stop_loss"] < setup["optimal_entry"]
        assert setup["take_profit_1"] > setup["optimal_entry"]
        assert setup["take_profit_2"] > setup["take_profit_1"]
    else:
        assert setup["stop_loss"] > setup["optimal_entry"]
        assert setup["take_profit_1"] < setup["optimal_entry"]
        assert setup["take_profit_2"] < setup["take_profit_1"]

def test_api_whatsapp_alert_status_endpoint():
    """Tests GET /api/alerts/whatsapp/status returns proper structure."""
    resp = client.get("/api/alerts/whatsapp/status")
    assert resp.status_code == 200
    data = resp.json()
    assert "enabled" in data
    assert data["target_symbol"] == "BTC/USDT"
    assert "tolerance_pct" in data
    assert "cooldown_minutes" in data
    assert "alert_history" in data

def test_api_whatsapp_toggle_endpoint():
    """Tests POST /api/alerts/whatsapp/toggle enables/disables the watcher."""
    resp = client.post("/api/alerts/whatsapp/toggle", json={"enabled": False})
    assert resp.status_code == 200
    assert resp.json()["enabled"] is False

    resp = client.post("/api/alerts/whatsapp/toggle", json={"enabled": True})
    assert resp.status_code == 200
    assert resp.json()["enabled"] is True

def test_api_whatsapp_test_endpoint():
    """Tests POST /api/alerts/whatsapp/test triggers an immediate evaluation."""
    with patch.object(whatsapp_service, "send_signal", return_value={"success": True, "provider": "mock"}):
        resp = client.post("/api/alerts/whatsapp/test", json={"symbol": "BTC/USDT"})
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] in ["test_sent", "triggered"]
        assert "alert" in data
        assert data["alert"]["symbol"] == "BTC/USDT"
