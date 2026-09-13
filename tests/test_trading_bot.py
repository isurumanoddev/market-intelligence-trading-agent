import pytest
import asyncio
from app.services.trading_bot import trading_bot, BotConfig
from app.services.telegram_service import telegram_service

@pytest.mark.anyio
async def test_trading_bot_lifecycle():
    # Verify initial state
    assert trading_bot.stats.status in ["STOPPED", "PAUSED", "RUNNING"]
    
    # Update config
    cfg = trading_bot.update_config({"min_conviction": 65.0, "stop_loss_pct": 2.5})
    assert trading_bot.config.min_conviction == 65.0
    assert trading_bot.config.stop_loss_pct == 2.5

    # Start bot
    res_start = await trading_bot.start()
    assert res_start["status"] in ["started", "already_running"]
    assert trading_bot.stats.status == "RUNNING"

    # Pause bot
    res_pause = trading_bot.pause()
    assert res_pause["status"] == "paused"
    assert trading_bot.stats.status == "PAUSED"

    # Resume bot
    res_resume = trading_bot.resume()
    assert res_resume["status"] == "running"
    assert trading_bot.stats.status == "RUNNING"

    # Stop bot
    res_stop = trading_bot.stop()
    assert res_stop["status"] == "stopped"
    assert trading_bot.stats.status == "STOPPED"

def test_trading_bot_status_reporting():
    status = trading_bot.get_status()
    assert "config" in status
    assert "stats" in status
    assert "recent_logs" in status
    assert isinstance(status["recent_logs"], list)

def test_telegram_service_unconfigured():
    # When not configured, returns False without raising exceptions
    res = telegram_service.send_message("Test message", token="", chat_id="")
    assert res is False
