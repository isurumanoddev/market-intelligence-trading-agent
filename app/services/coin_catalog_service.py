import time
from typing import List, Dict, Any, Optional
from app.data.coin_catalog import COIN_CATALOG

class CoinCatalogService:
    def __init__(self):
        self._coins = COIN_CATALOG
        self._symbol_map = {c["symbol"].upper(): c for c in self._coins}
        self._base_map = {c["base"].upper(): c for c in self._coins}
        self._ticker_cache: Dict[str, Dict[str, Any]] = {}
        self._last_cache_time = 0.0

    def get_all_symbols(self) -> List[str]:
        return [c["symbol"] for c in self._coins]

    def get_coin(self, symbol: str) -> Optional[Dict[str, Any]]:
        clean = symbol.strip().upper()
        if clean in self._symbol_map:
            return dict(self._symbol_map[clean])
        # Try finding by base e.g. "BTC" or "PEPE"
        base = clean.split("/")[0].replace("USDT", "").replace("USD", "")
        if base in self._base_map:
            return dict(self._base_map[base])
        return None

    def get_coins(
        self,
        category: Optional[str] = None,
        search: Optional[str] = None,
        sort_by: str = "rank",
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        results = [dict(c) for c in self._coins]

        # 1. Filter by category
        if category and category.upper() not in ["ALL", "TOP_100"]:
            cat = category.upper()
            if cat in ["HIGH_VOLUME", "VOLUME", "HOT"]:
                results = [c for c in results if c.get("is_high_volume")]
            elif cat in ["MEME", "MEMES"]:
                results = [c for c in results if c.get("category") == "MEME" or "MEME" in c.get("tags", [])]
            elif cat in ["AI", "AI_DEPIN", "DEPIN"]:
                results = [c for c in results if c.get("category") == "AI_DEPIN" or "AI" in c.get("tags", [])]
            elif cat in ["DEFI"]:
                results = [c for c in results if c.get("category") == "DEFI" or "DEFI" in c.get("tags", [])]
            elif cat in ["L1", "L2", "L1_L2"]:
                results = [c for c in results if c.get("category") == "L1_L2" or "L1" in c.get("tags", []) or "LAYER_2" in c.get("tags", [])]
            elif cat in ["GAMING", "METAVERSE", "NFT"]:
                results = [c for c in results if c.get("category") == "GAMING" or "GAMING" in c.get("tags", [])]
            elif cat in ["RWA", "INFRA", "RWA_INFRA"]:
                results = [c for c in results if c.get("category") == "RWA_INFRA" or "RWA" in c.get("tags", [])]
            else:
                results = [c for c in results if c.get("category") == cat]

        # 2. Filter by search query
        if search and search.strip():
            q = search.strip().lower()
            results = [
                c for c in results
                if q in c["symbol"].lower() or q in c["name"].lower() or q in c["base"].lower() or any(q in t.lower() for t in c.get("tags", []))
            ]

        # 3. Sort
        if sort_by == "volume":
            # High volume coins first, then by market cap rank
            results.sort(key=lambda c: (0 if c.get("is_high_volume") else 1, c.get("market_cap_rank", 999)))
        elif sort_by == "name":
            results.sort(key=lambda c: c.get("name", ""))
        else:
            # Default by market cap rank
            results.sort(key=lambda c: c.get("market_cap_rank", 999))

        return results[:limit]

    def get_top_volume_coins(self, limit: int = 20) -> List[Dict[str, Any]]:
        """Returns the most active and liquid coins."""
        high_vol = [dict(c) for c in self._coins if c.get("is_high_volume")]
        high_vol.sort(key=lambda c: c.get("market_cap_rank", 999))
        return high_vol[:limit]

coin_catalog_service = CoinCatalogService()
