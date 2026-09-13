import time
from typing import Dict, Any, List, Optional
from datetime import datetime

RESOLUTION_MAP = {
    "1": "1m",
    "3": "3m",
    "5": "5m",
    "15": "15m",
    "30": "30m",
    "60": "1h",
    "120": "2h",
    "240": "4h",
    "D": "1d",
    "1D": "1d",
    "W": "1w",
    "1W": "1w",
}

class TradingViewService:
    def __init__(self, market_service = None):
        self._market_service = market_service

    @property
    def market_service(self):
        if self._market_service is None:
            from app.api.routes import market_service as ms
            self._market_service = ms
        return self._market_service

    def get_config(self) -> Dict[str, Any]:
        """TradingView UDF /config endpoint response."""
        return {
            "supports_search": True,
            "supports_group_request": False,
            "supports_marks": False,
            "supports_timescale_marks": False,
            "supports_time": True,
            "exchanges": [
                {"value": "", "name": "All Exchanges", "desc": ""},
                {"value": "Kraken", "name": "Kraken", "desc": "Kraken Exchange"},
                {"value": "Binance", "name": "Binance", "desc": "Binance Exchange"},
                {"value": "Coinbase", "name": "Coinbase", "desc": "Coinbase Exchange"},
            ],
            "symbols_types": [
                {"name": "crypto", "value": "crypto"}
            ],
            "supported_resolutions": ["1", "5", "15", "30", "60", "240", "1D", "1W"],
        }

    def get_time(self) -> int:
        """TradingView UDF /time endpoint: unix timestamp in seconds."""
        return int(time.time())

    def resolve_symbol(self, symbol: str) -> Dict[str, Any]:
        """TradingView UDF /symbols endpoint: symbol metadata."""
        norm_sym = symbol.strip().upper()
        if not ("/" in norm_sym or norm_sym.endswith("USDT") or norm_sym.endswith("USD")):
            norm_sym = f"{norm_sym}/USDT"

        base = norm_sym.split("/")[0] if "/" in norm_sym else norm_sym.replace("USDT", "")
        quote = norm_sym.split("/")[1] if "/" in norm_sym else "USDT"

        pricescale = 100
        if base in ["DOGE", "SHIB", "PEPE", "ADA", "XRP"]:
            pricescale = 10000
        elif base in ["BTC", "ETH", "SOL", "BNB"]:
            pricescale = 100

        return {
            "name": norm_sym,
            "ticker": norm_sym,
            "description": f"{base} / {quote} - Live Market Intelligence Feed",
            "type": "crypto",
            "session": "24x7",
            "exchange": "Crypto",
            "listed_exchange": "Crypto",
            "timezone": "Etc/UTC",
            "minmov": 1,
            "pricescale": pricescale,
            "has_intraday": True,
            "intraday_multipliers": ["1", "5", "15", "30", "60", "240"],
            "has_daily": True,
            "has_weekly_and_monthly": True,
            "supported_resolutions": ["1", "5", "15", "30", "60", "240", "1D", "1W"],
            "volume_precision": 4,
            "data_status": "streaming",
        }

    def search_symbols(self, query: str = "", limit: int = 30) -> List[Dict[str, Any]]:
        """TradingView UDF /search endpoint."""
        popular = [
            ("BTC/USDT", "Bitcoin / Tether"),
            ("ETH/USDT", "Ethereum / Tether"),
            ("SOL/USDT", "Solana / Tether"),
            ("BNB/USDT", "Binance Coin / Tether"),
            ("XRP/USDT", "XRP / Tether"),
            ("DOGE/USDT", "Dogecoin / Tether"),
            ("ADA/USDT", "Cardano / Tether"),
            ("AVAX/USDT", "Avalanche / Tether"),
            ("LINK/USDT", "Chainlink / Tether"),
            ("SUI/USDT", "Sui / Tether"),
        ]
        q = query.upper().strip()
        results = []
        for sym, desc in popular:
            if not q or q in sym or q in desc.upper():
                base = sym.split("/")[0]
                results.append({
                    "symbol": sym,
                    "full_name": sym,
                    "description": desc,
                    "exchange": "Crypto",
                    "type": "crypto",
                    "ticker": sym
                })
                if len(results) >= limit:
                    break
        return results

    def get_history(
        self,
        symbol: str,
        resolution: str,
        from_ts: Optional[int] = None,
        to_ts: Optional[int] = None
    ) -> Dict[str, Any]:
        """TradingView UDF /history endpoint response with t, o, h, l, c, v arrays."""
        timeframe = RESOLUTION_MAP.get(str(resolution).upper(), "1h")
        candles = self.market_service.get_ohlcv(
            symbol=symbol,
            timeframe=timeframe,
            limit=250
        )

        if not candles:
            return {"s": "no_data", "nextTime": int(time.time())}

        t_list = []
        o_list = []
        h_list = []
        l_list = []
        c_list = []
        v_list = []

        for c in candles:
            ts_sec = int(c.timestamp / 1000) if c.timestamp > 1e11 else int(c.timestamp)
            if from_ts and ts_sec < from_ts:
                continue
            if to_ts and ts_sec > to_ts:
                continue

            t_list.append(ts_sec)
            o_list.append(round(c.open, 4))
            h_list.append(round(c.high, 4))
            l_list.append(round(c.low, 4))
            c_list.append(round(c.close, 4))
            v_list.append(round(c.volume, 4))

        if not t_list:
            return {"s": "no_data"}

        return {
            "s": "ok",
            "t": t_list,
            "o": o_list,
            "h": h_list,
            "l": l_list,
            "c": c_list,
            "v": v_list,
        }

tradingview_service = TradingViewService()
