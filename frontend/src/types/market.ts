export interface OrderBookLevel {
  price: number;
  amount: number;
  total: number;
  depth_pct: number;
}

export interface OrderBook {
  symbol: string;
  exchange: string;
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  best_bid: number;
  best_ask: number;
  spread: number;
  spread_pct: number;
  imbalance: number;
  total_bid_depth: number;
  total_ask_depth: number;
  timestamp: number;
}

export interface Trade {
  id: string;
  timestamp: number;
  time_str: string;
  symbol: string;
  side: "buy" | "sell";
  price: number;
  amount: number;
  cost: number;
  is_whale: boolean;
}

export interface Ticker {
  symbol: string;
  exchange: string;
  price: number;
  bid: number;
  ask: number;
  high_24h: number;
  low_24h: number;
  volume_24h: number;
  quote_volume_24h: number;
  change_24h: number;
  change_pct_24h: number;
  timestamp: number;
}

export interface Candle {
  timestamp: number;
  time_str: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface NewsItem {
  id: string;
  title: string;
  summary: string;
  source: string;
  url: string;
  published_at: string;
  sentiment_score: number;
  sentiment_label: "BULLISH" | "BEARISH" | "NEUTRAL";
  catalyst_type: "REGULATORY" | "MACRO" | "TECH" | "ADOPTION" | "SECURITY" | "GENERAL";
  relevance_score: number;
}

export interface TechnicalIndicators {
  rsi: number | null;
  macd: number | null;
  macd_signal: number | null;
  macd_hist: number | null;
  ema_20: number | null;
  ema_50: number | null;
  ema_200: number | null;
  vwap: number | null;
  atr: number | null;
  bb_upper: number | null;
  bb_middle: number | null;
  bb_lower: number | null;
  trend_state: "BULLISH" | "BEARISH" | "NEUTRAL";
  rsi_state: "OVERSOLD" | "OVERBOUGHT" | "NEUTRAL";
}

export interface LiquidityWall {
  price: number;
  amount: number;
  usd_value: number;
}

export interface MicrostructureMetrics {
  order_book_imbalance: number;
  spread_bps: number;
  spread_pct: number;
  bid_depth_usd: number;
  ask_depth_usd: number;
  cvd: number;
  cvd_side: "BUY_DOMINANT" | "SELL_DOMINANT" | "BALANCED";
  buy_trade_volume: number;
  sell_trade_volume: number;
  whale_trades_detected: number;
  large_bid_walls: LiquidityWall[];
  large_ask_walls: LiquidityWall[];
  order_flow_signal: string;
}

export interface SentimentMetrics {
  overall_sentiment_score: number;
  overall_sentiment_label: "BULLISH" | "BEARISH" | "NEUTRAL";
  total_news_items: number;
  bullish_items: number;
  bearish_items: number;
  top_catalysts: string[];
  dominant_narrative: string;
}

export interface TradingDecision {
  symbol: string;
  action: "STRONG_BUY" | "BUY" | "HOLD" | "SELL" | "STRONG_SELL";
  conviction: number;
  current_price: number;
  entry_zone: number[];
  stop_loss: number;
  take_profit_1: number;
  take_profit_2: number;
  risk_reward_ratio: number;
  recommended_position_pct: number;
  summary: string;
  reasons: string[];
  microstructure_view: string;
  technical_view: string;
  news_view: string;
  risk_view: string;
  model_used: string;
  timestamp: string;
}

export interface PaperPosition {
  id: string;
  symbol: string;
  side: "BUY" | "SELL";
  entry_price: number;
  current_price: number;
  amount: number;
  cost_basis: number;
  current_value: number;
  unrealized_pnl: number;
  unrealized_pnl_pct: number;
  stop_loss?: number | null;
  take_profit?: number | null;
  opened_at: string;
}

export interface PaperTradeRecord {
  id: string;
  symbol: string;
  side: string;
  price: number;
  amount: number;
  value: number;
  pnl: number;
  reason: string;
  timestamp: string;
}

export interface PortfolioState {
  cash: number;
  equity: number;
  realized_pnl: number;
  unrealized_pnl: number;
  total_pnl: number;
  total_pnl_pct: number;
  open_positions_count: number;
  positions: PaperPosition[];
  trades_history: PaperTradeRecord[];
}

export interface FullAnalysisData {
  symbol: string;
  ticker: Ticker;
  order_book: OrderBook;
  trades: Trade[];
  indicators: TechnicalIndicators;
  microstructure: MicrostructureMetrics;
  sentiment: SentimentMetrics;
  news: NewsItem[];
  decision: TradingDecision;
}

export interface SettingsData {
  has_gemini_key: boolean;
  gemini_key_masked: string;
  default_exchange: string;
  default_symbols: string[];
  max_risk_per_trade_pct: number;
  max_spread_pct: number;
}
