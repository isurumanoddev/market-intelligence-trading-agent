from typing import List, Optional
from pydantic import BaseModel, Field

class OrderBookLevel(BaseModel):
    price: float
    amount: float
    total: float = 0.0
    depth_pct: float = 0.0

class OrderBook(BaseModel):
    symbol: str
    exchange: str
    bids: List[OrderBookLevel]
    asks: List[OrderBookLevel]
    best_bid: float
    best_ask: float
    spread: float
    spread_pct: float
    imbalance: float = 0.0  # Order Book Imbalance (-1.0 to 1.0)
    total_bid_depth: float = 0.0
    total_ask_depth: float = 0.0
    timestamp: int

class Trade(BaseModel):
    id: str
    timestamp: int
    time_str: str
    symbol: str
    side: str  # 'buy' or 'sell'
    price: float
    amount: float
    cost: float
    is_whale: bool = False

class Ticker(BaseModel):
    symbol: str
    exchange: str
    price: float
    bid: float
    ask: float
    high_24h: float = 0.0
    low_24h: float = 0.0
    volume_24h: float = 0.0
    quote_volume_24h: float = 0.0
    change_24h: float = 0.0
    change_pct_24h: float = 0.0
    timestamp: int

class Candle(BaseModel):
    timestamp: int
    time_str: str
    open: float
    high: float
    low: float
    close: float
    volume: float

class NewsItem(BaseModel):
    id: str
    title: str
    summary: str = ""
    source: str
    url: str
    published_at: str
    sentiment_score: float = 0.0  # -1.0 (bearish) to +1.0 (bullish)
    sentiment_label: str = "NEUTRAL"  # BULLISH, BEARISH, NEUTRAL
    catalyst_type: str = "GENERAL"  # REGULATORY, MACRO, TECH, PARTNERSHIP, ADOPTION, SECURITY, GENERAL
    relevance_score: float = 0.5   # 0.0 to 1.0
