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
    sma_20: Optional[float] = None
    sma_50: Optional[float] = None
    sma_200: Optional[float] = None
    vwap: Optional[float] = None
    vwap_upper_1: Optional[float] = None
    vwap_lower_1: Optional[float] = None
    atr: Optional[float] = None
    bb_upper: Optional[float] = None
    bb_middle: Optional[float] = None
    bb_lower: Optional[float] = None
    supertrend_value: Optional[float] = None
    supertrend_direction: str = "BULLISH"  # BULLISH, BEARISH
    stoch_k: Optional[float] = None
    stoch_d: Optional[float] = None
    adx: Optional[float] = None
    adx_trend_strength: str = "TRENDING"  # STRONG_TREND, TRENDING, RANGING, WEAK
    fvg_detected: bool = False
    fvg_type: str = "NONE"  # BULLISH_FVG, BEARISH_FVG, NONE
    fvg_price_level: Optional[float] = None
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

class MonthlyContext(BaseModel):
    lookback_days: int = 30
    monthly_high: float = 0.0
    monthly_low: float = 0.0
    monthly_open: float = 0.0
    monthly_close: float = 0.0
    monthly_change_pct: float = 0.0
    monthly_trend: str = "RANGE_BOUND"  # MACRO_BULLISH, MACRO_BEARISH, RANGE_BOUND
    monthly_range_pct: float = 0.0
    range_position_pct: float = 50.0   # 0% = at 30d low, 100% = at 30d high
    key_monthly_support: float = 0.0
    key_monthly_resistance: float = 0.0
    sma_30d: float = 0.0
    distance_from_sma_pct: float = 0.0
    volume_30d_total: float = 0.0
    volume_avg_daily: float = 0.0
    volume_trend: str = "NORMAL"        # EXPANDING, CONTRACTING, NORMAL
    macro_bias: str = "NEUTRAL"

class HorizonPrediction(BaseModel):
    horizon: str  # "1m", "5m", "10m", "30m", "1h", "4h", "1d", "7d", "30d"
    horizon_label: str  # "1 Min", "5 Min", "10 Min", "30 Min", "1 Hour", "4 Hours", "1 Day", "7 Days", "30 Days"
    target_time_str: str  # e.g. "00:22", "01:21", "Sep 14", "Oct 13"
    predicted_price: float
    expected_change_pct: float
    upper_bound: float
    lower_bound: float
    bias: str = "NEUTRAL"  # BULLISH, BEARISH, NEUTRAL
    confidence: int = 70  # 0 to 100%
    primary_driver: str = ""
    reasons: List[str] = []
    off_chain_data: Dict[str, Any] = {}
    on_chain_data: Dict[str, Any] = {}
    chart_analysis: Dict[str, Any] = {}
    trading_strategy: Dict[str, Any] = {}

class ForecastPoint(BaseModel):
    day: int
    date_str: str
    predicted_price: float
    upper_bound: float
    lower_bound: float

class PriceForecastResult(BaseModel):
    symbol: str
    current_price: float
    horizon_days: int = 30
    target_7d: float
    target_30d: float
    expected_return_7d_pct: float
    expected_return_30d_pct: float
    projected_range_min: float
    projected_range_max: float
    forecast_bias: str = "RANGE_CONSOLIDATION"  # BULLISH_EXPANSION, BEARISH_REVERSAL, RANGE_CONSOLIDATION
    confidence_score: int = 75  # 0 to 100%
    model_architecture: str = "Hybrid Multi-Horizon Deep Learning + Google Gemini Cognitive Synthesis"
    trajectory: List[ForecastPoint] = []
    multi_horizon_predictions: List[HorizonPrediction] = []
    rationale: str = ""
    timestamp: str = ""

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
    macro_view: str = ""
    risk_view: str = ""
    monthly_context: Optional[MonthlyContext] = None
    price_forecast: Optional[PriceForecastResult] = None
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
    margin: float = 0.0
    leverage: float = 1.0
    liquidation_price: Optional[float] = None
    current_value: float
    unrealized_pnl: float
    unrealized_pnl_pct: float
    stop_loss: Optional[float] = None
    take_profit: Optional[float] = None
    broker_type: str = "LOCAL"  # LOCAL, BINANCE_TESTNET, BYBIT_TESTNET
    exchange_watch_url: Optional[str] = None
    opened_at: str

class PaperTradeRecord(BaseModel):
    id: str
    symbol: str
    side: str
    price: float
    amount: float
    value: float
    leverage: float = 1.0
    pnl: float = 0.0
    broker_type: str = "LOCAL"
    exchange_watch_url: Optional[str] = None
    reason: str = ""
    timestamp: str

class AccuracySetupRating(BaseModel):
    symbol: str
    grade: str = "B"                      # A+, A, B, C
    win_rate_expectancy: float = 60.0    # 78.4%, 68.5%, 55.0%, 42.0%
    mtf_alignment: str = "NEUTRAL"       # STRONG_BULLISH_4X, BULLISH_3X, NEUTRAL_CHOP, BEARISH_3X, STRONG_BEARISH_4X
    mtf_score: int = 2                   # Number of timeframes aligned (0-4)
    cvd_divergence: str = "NONE"         # BULLISH_ABSORPTION, BEARISH_EXHAUSTION, NONE
    funding_alignment: str = "FAVORABLE" # FAVORABLE, CROWDED, NEUTRAL
    key_reasons: List[str] = []
    recommended_action: str = "WAIT"     # EXECUTE_LONG, EXECUTE_SHORT, WAIT_CONFIRMATION
    timestamp: str = ""

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

class LLMHorizonPrediction(BaseModel):
    horizon: str  # "30m", "1h", "4h", "1d"
    horizon_label: str  # "30 Minutes", "1 Hour", "4 Hours", "1 Day"
    predicted_price: float
    expected_change_pct: float = 0.0
    direction: str = "NEUTRAL"  # BULLISH / BEARISH / NEUTRAL
    confidence: int = 70  # 0 to 100
    price_range_low: float = 0.0
    price_range_high: float = 0.0
    reasoning: str = ""
    key_factors: List[str] = []
    risk_level: str = "MEDIUM"  # LOW / MEDIUM / HIGH / EXTREME
    recommended_action: str = "HOLD"  # BUY / SELL / HOLD / WAIT

class LLMPredictionResult(BaseModel):
    symbol: str
    current_price: float
    timestamp: str = ""
    model_used: str = "Google Gemini 3.7 Flash Reasoning Engine"
    market_summary: str = ""
    overall_bias: str = "NEUTRAL"  # BULLISH / BEARISH / NEUTRAL
    overall_confidence: int = 70
    predictions: List[LLMHorizonPrediction] = []
    context_used: Dict[str, Any] = {}
    generation_time_ms: int = 0

