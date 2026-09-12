import os
from typing import List
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

class Settings(BaseModel):
    # API Keys
    gemini_api_key: str = os.getenv("GEMINI_API_KEY", "")
    
    # Default settings
    default_exchange: str = os.getenv("DEFAULT_EXCHANGE", "kraken")
    default_symbols: List[str] = [
        s.strip() for s in os.getenv("DEFAULT_SYMBOLS", "BTC/USDT,ETH/USDT,SOL/USDT,AAPL,NVDA").split(",") if s.strip()
    ]
    
    # Risk Management Defaults
    initial_cash: float = 100000.0
    max_risk_per_trade_pct: float = 2.0  # Max 2% risk of total portfolio per trade
    default_stop_loss_pct: float = 2.5
    default_take_profit_pct: float = 5.0
    max_spread_pct: float = 0.5          # Reject trades if bid-ask spread > 0.5%
    
    # Server configuration
    host: str = os.getenv("HOST", "127.0.0.1")
    port: int = int(os.getenv("PORT", "8000"))

# Singleton settings instance that can be dynamically updated via UI settings
settings = Settings()
