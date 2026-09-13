import os
from typing import Optional
from pydantic import BaseModel
import requests
from app.config import settings
from datetime import datetime

class CoinGlassData(BaseModel):
    symbol: str
    long_liquidations_24h_usd: float = 0.0
    short_liquidations_24h_usd: float = 0.0
    total_liquidations_24h_usd: float = 0.0
    liquidation_dominance: str = "BALANCED"  # LONG_FLUSH, SHORT_SQUEEZE, BALANCED
    aggregated_oi_usd: float = 0.0
    aggregated_oi_change_4h_pct: float = 0.0
    top_trader_long_short_ratio: float = 1.0
    data_source: str = "COINGLASS"
    timestamp: str = ""

class CoinGlassService:
    BASE_URL = "https://open-api-v3.coinglass.com/api"

    def _get_api_key(self) -> Optional[str]:
        return getattr(settings, 'coinglass_api_key', '') or os.getenv("COINGLASS_API_KEY", "")

    def is_available(self) -> bool:
        return bool(self._get_api_key())

    def get_coinglass_data(self, symbol: str = "BTC") -> Optional[CoinGlassData]:
        api_key = self._get_api_key()
        if not api_key:
            return None
            
        data = CoinGlassData(symbol=symbol, timestamp=datetime.utcnow().isoformat() + "Z")
        headers = {"CG-API-KEY": api_key, "accept": "application/json"}
        
        try:
            # GET /futures/liquidation/v2/history?symbol=BTC&time_type=h24
            r1 = requests.get(f"{self.BASE_URL}/futures/liquidation/v2/history?symbol={symbol}&time_type=h24", headers=headers, timeout=10)
            if r1.status_code == 200:
                res = r1.json().get("data", [])
                if res and len(res) > 0:
                    latest = res[-1]
                    data.long_liquidations_24h_usd = latest.get("buyVolUsd", 0)
                    data.short_liquidations_24h_usd = latest.get("sellVolUsd", 0)
                    data.total_liquidations_24h_usd = data.long_liquidations_24h_usd + data.short_liquidations_24h_usd
                    
                    if data.total_liquidations_24h_usd > 0:
                        long_ratio = data.long_liquidations_24h_usd / data.total_liquidations_24h_usd
                        if long_ratio > 0.7:
                            data.liquidation_dominance = "LONG_FLUSH"
                        elif long_ratio < 0.3:
                            data.liquidation_dominance = "SHORT_SQUEEZE"
                        else:
                            data.liquidation_dominance = "BALANCED"
                            
            # GET /futures/openInterest/ohlc-aggregated-history?symbol=BTC&interval=4h&limit=2
            r2 = requests.get(f"{self.BASE_URL}/futures/openInterest/ohlc-aggregated-history?symbol={symbol}&interval=4h&limit=2", headers=headers, timeout=10)
            if r2.status_code == 200:
                res = r2.json().get("data", [])
                if res and len(res) >= 2:
                    curr_oi = res[-1].get("c", 0)
                    prev_oi = res[-2].get("c", 0)
                    data.aggregated_oi_usd = curr_oi
                    if prev_oi > 0:
                        data.aggregated_oi_change_4h_pct = ((curr_oi - prev_oi) / prev_oi) * 100
                        
            return data
        except Exception:
            return None

coinglass_service = CoinGlassService()
