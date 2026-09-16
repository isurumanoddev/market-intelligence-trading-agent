import os
from typing import List
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

class Settings(BaseModel):
    # API Keys
    gemini_api_key: str = os.getenv("GEMINI_API_KEY", "")
    coinglass_api_key: str = os.getenv("COINGLASS_API_KEY", "")
    telegram_bot_token: str = os.getenv("TELEGRAM_BOT_TOKEN", "")
    telegram_chat_id: str = os.getenv("TELEGRAM_CHAT_ID", "")

    # WhatsApp Notifications (CallMeBot / Twilio / Webhook)
    whatsapp_enabled: bool = os.getenv("WHATSAPP_ENABLED", "false").lower() == "true"
    whatsapp_provider: str = os.getenv("WHATSAPP_PROVIDER", "callmebot")  # "callmebot", "twilio", "webhook"
    whatsapp_phone: str = os.getenv("WHATSAPP_PHONE", "")                  # e.g. +1234567890
    whatsapp_callmebot_key: str = os.getenv("WHATSAPP_CALLMEBOT_KEY", "")  # Free CallMeBot API key
    twilio_account_sid: str = os.getenv("TWILIO_ACCOUNT_SID", "")
    twilio_auth_token: str = os.getenv("TWILIO_AUTH_TOKEN", "")
    twilio_from_number: str = os.getenv("TWILIO_FROM_NUMBER", "whatsapp:+14155238886")
    whatsapp_webhook_url: str = os.getenv("WHATSAPP_WEBHOOK_URL", "")
    btc_alert_watcher_enabled: bool = os.getenv("BTC_ALERT_WATCHER_ENABLED", "true").lower() == "true"
    btc_alert_cooldown_minutes: int = int(os.getenv("BTC_ALERT_COOLDOWN_MINUTES", "15"))

    # Exchange Testnets (Demo Trading)
    binance_testnet_api_key: str = os.getenv("BINANCE_TESTNET_API_KEY", "")
    binance_testnet_secret: str = os.getenv("BINANCE_TESTNET_SECRET", "")
    bybit_testnet_api_key: str = os.getenv("BYBIT_TESTNET_API_KEY", "")
    bybit_testnet_secret: str = os.getenv("BYBIT_TESTNET_SECRET", "")
    paper_broker_storage_path: str = os.getenv("PAPER_BROKER_STORAGE_PATH", "data/paper_broker_state.json")
    
    # Default settings
    default_exchange: str = os.getenv("DEFAULT_EXCHANGE", "kraken")
    default_symbols: List[str] = [
        s.strip() for s in os.getenv("DEFAULT_SYMBOLS", "BTC/USDT,ETH/USDT,SOL/USDT,DOGE/USDT,PEPE/USDT,SUI/USDT,XRP/USDT,NEAR/USDT,FET/USDT,AVAX/USDT,LINK/USDT,WIF/USDT,BNB/USDT").split(",") if s.strip()
    ]
    
    # Risk Management Defaults
    initial_cash: float = 200.0
    max_risk_per_trade_pct: float = 2.0  # Max 2% risk of total portfolio per trade
    default_stop_loss_pct: float = 2.5
    default_take_profit_pct: float = 5.0
    max_spread_pct: float = 0.5          # Reject trades if bid-ask spread > 0.5%
    
    # Server configuration
    host: str = os.getenv("HOST", "0.0.0.0")
    port: int = int(os.getenv("PORT", "8000"))

# Singleton settings instance that can be dynamically updated via UI settings
settings = Settings()
