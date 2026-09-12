from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class TechnicalIndicators(BaseModel):
    rsi: Optional[float] = None
    macd: Optional[float] = None
    macd_signal: Optional[float] = None
    macd_hist: Optional[float] = None
    ema_20: Optional[float] = None
    ema_50: Optional[float] = None
    ema_200: Optional[float] = None
    vwap: Optional[float] = None
    atr: Optional[float] = None
    bb_upper: Optional[float] = None
    bb_middle: Optional[float] = None
    bb_lower: Optional[float] = None
    trend_state: str = "NEUTRAL"  # BULLISH, BEARISH, NEUTRAL
    rsi_state: str = "NEUTRAL"    # OVERSOLD, OVERBOUGHT, NEUTRAL

class MicrostructureMetrics(BaseModel):
    order_book_imbalance: float = 0.0  # -1.0 to +1.0
    spread_bps: float = 0.0           # Spread in basis points
    spread_pct: float = 0.0
    bid_depth_usd: float = 0.0
    ask_depth_usd: float = 0.0
    cvd: float = 0.0                  # Cumulative Volume Delta
    cvd_side: str = "BALANCED"        # BUY_DOMINANT, SELL_DOMINANT, BALANCED
    buy_trade_volume: float = 0.0
    sell_trade_volume: float = 0.0
    whale_trades_detected: int = 0
    large_bid_walls: List[Dict[str, float]] = []
    large_ask_walls: List[Dict[str, float]] = []
    order_flow_signal: str = "NEUTRAL"

class SentimentMetrics(BaseModel):
    overall_sentiment_score: float = 0.0  # -1.0 to 1.0
    overall_sentiment_label: str = "NEUTRAL"
    total_news_items: int = 0
    bullish_items: int = 0
    bearish_items: int = 0
    top_catalysts: List[str] = []
    dominant_narrative: str = "Normal market conditions"

class TradingDecision(BaseModel):
    symbol: str
    action: str  # STRONG_BUY, BUY, HOLD, SELL, STRONG_SELL
    conviction: int  # 0 to 100%
    current_price: float
    entry_zone: List[float] = []
    stop_loss: float
    take_profit_1: float
    take_profit_2: float
    risk_reward_ratio: float
    recommended_position_pct: float
    summary: str
    reasons: List[str] = []
    microstructure_view: str = ""
    technical_view: str = ""
    news_view: str = ""
    risk_view: str = ""
    model_used: str = "Deterministic Confluence Engine"
    timestamp: str

class PaperPosition(BaseModel):
    id: str
    symbol: str
    side: str  # 'BUY' (long) or 'SELL' (short)
    entry_price: float
    current_price: float
    amount: float
    cost_basis: float
    current_value: float
    unrealized_pnl: float
    unrealized_pnl_pct: float
    stop_loss: Optional[float] = None
    take_profit: Optional[float] = None
    opened_at: str

class PaperTradeRecord(BaseModel):
    id: str
    symbol: str
    side: str
    price: float
    amount: float
    value: float
    pnl: float = 0.0
    reason: str = ""
    timestamp: str

class PortfolioState(BaseModel):
    cash: float
    equity: float
    realized_pnl: float
    unrealized_pnl: float
    total_pnl: float
    total_pnl_pct: float
    open_positions_count: int
    positions: List[PaperPosition] = []
    trades_history: List[PaperTradeRecord] = []
