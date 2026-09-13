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

export interface MonthlyContext {
  lookback_days: number;
  monthly_high: number;
  monthly_low: number;
  monthly_open: number;
  monthly_close: number;
  monthly_change_pct: number;
  monthly_trend: "MACRO_BULLISH" | "MACRO_BEARISH" | "RANGE_BOUND";
  monthly_range_pct: number;
  range_position_pct: number;
  key_monthly_support: number;
  key_monthly_resistance: number;
  sma_30d: number;
  distance_from_sma_pct: number;
  volume_30d_total: number;
  volume_avg_daily: number;
  volume_trend: "EXPANDING" | "CONTRACTING" | "NORMAL";
  macro_bias: "BULLISH" | "BEARISH" | "NEUTRAL";
}

export interface HorizonOffChainData {
  order_book_imbalance: number;
  order_flow_signal: string;
  cvd: number;
  cvd_side: string;
  funding_rate_pct: number;
  funding_bias: string;
  open_interest_usd: number;
  bid_depth_usd: number;
  ask_depth_usd: number;
  spread_bps: number;
  whale_trades: number;
}

export interface HorizonOnChainData {
  total_stablecoin_mcap_usd: number;
  stablecoin_dominance_pct: number;
  stablecoin_30d_change_usd: number;
  stablecoin_30d_change_pct: number;
  stablecoin_flow_signal: string;
  total_defi_tvl_usd: number;
  tvl_24h_change_pct: number;
  tvl_signal: string;
  ethereum_tvl_usd: number;
  solana_tvl_usd: number;
}

export interface HorizonChartAnalysis {
  timeframe_trend: "BULLISH" | "BEARISH" | "NEUTRAL";
  rsi?: number;
  rsi_condition: string;
  macd_momentum: string;
  vwap: number;
  vwap_deviation_pct: number;
  key_support: number;
  key_resistance: number;
  pattern_detected: string;
}

export interface HorizonTradingStrategy {
  strategy_name: string;
  strategy_type: "SCALP" | "INTRADAY_MOMENTUM" | "SWING" | "MACRO_POSITION";
  recommended_action: string;
  entry_zone: number[];
  stop_loss: number;
  take_profit_1: number;
  take_profit_2: number;
  risk_reward_ratio: number;
  execution_notes: string;
}

export interface HorizonPrediction {
  horizon: string; // "1m" | "5m" | "10m" | "30m" | "1h" | "4h" | "1d" | "7d" | "30d"
  horizon_label: string; // "1 Min", "5 Min", etc.
  target_time_str: string;
  predicted_price: number;
  expected_change_pct: number;
  upper_bound: number;
  lower_bound: number;
  bias: "BULLISH" | "BEARISH" | "NEUTRAL";
  confidence: number;
  primary_driver: string;
  reasons?: string[];
  off_chain_data?: HorizonOffChainData;
  on_chain_data?: HorizonOnChainData;
  chart_analysis?: HorizonChartAnalysis;
  trading_strategy?: HorizonTradingStrategy;
}

export interface ForecastPoint {
  day: number;
  date_str: string;
  predicted_price: number;
  upper_bound: number;
  lower_bound: number;
}

export interface PriceForecastResult {
  symbol: string;
  current_price: number;
  horizon_days: number;
  target_7d: number;
  target_30d: number;
  expected_return_7d_pct: number;
  expected_return_30d_pct: number;
  projected_range_min: number;
  projected_range_max: number;
  forecast_bias: "BULLISH_EXPANSION" | "BEARISH_REVERSAL" | "RANGE_CONSOLIDATION";
  confidence_score: number;
  model_architecture: string;
  trajectory: ForecastPoint[];
  multi_horizon_predictions?: HorizonPrediction[];
  rationale: string;
  timestamp: string;
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
  macro_view?: string;
  risk_view: string;
  monthly_context?: MonthlyContext | null;
  price_forecast?: PriceForecastResult | null;
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

export interface DerivativesData {
  symbol: string;
  funding_rate: number;
  funding_rate_pct: number;
  funding_rate_annualized_pct: number;
  next_funding_time: string;
  funding_bias: "LONG_CROWDED" | "SHORT_CROWDED" | "NEUTRAL";
  open_interest_usd: number;
  open_interest_change_pct: number;
  leverage_signal: "OVERLEVERAGED_LONG" | "OVERLEVERAGED_SHORT" | "NORMAL";
  long_short_ratio: number;
  data_source: string;
  timestamp: string;
}

export interface OnChainData {
  total_stablecoin_mcap_usd: number;
  stablecoin_dominance_pct: number;
  stablecoin_30d_change_usd: number;
  stablecoin_30d_change_pct: number;
  stablecoin_flow_signal: "STRONG_INFLOW" | "INFLOW" | "NEUTRAL" | "OUTFLOW" | "STRONG_OUTFLOW";
  total_defi_tvl_usd: number;
  tvl_24h_change_pct: number;
  tvl_signal: "EXPANDING" | "STABLE" | "CONTRACTING";
  ethereum_tvl_usd: number;
  solana_tvl_usd: number;
  data_source: string;
  timestamp: string;
}

export interface CoinGlassData {
  symbol: string;
  long_liquidations_24h_usd: number;
  short_liquidations_24h_usd: number;
  total_liquidations_24h_usd: number;
  liquidation_dominance: "LONG_FLUSH" | "SHORT_SQUEEZE" | "BALANCED";
  aggregated_oi_usd: number;
  aggregated_oi_change_4h_pct: number;
  top_trader_long_short_ratio: number;
  data_source: string;
  timestamp: string;
}

export interface FullAnalysisData {
  symbol: string;
  ticker: Ticker;
  order_book: OrderBook;
  trades: Trade[];
  indicators: TechnicalIndicators;
  microstructure: MicrostructureMetrics;
  monthly_context?: MonthlyContext | null;
  derivatives?: DerivativesData | null;
  onchain?: OnChainData | null;
  coinglass?: CoinGlassData | null;
  price_forecast?: PriceForecastResult | null;
  sentiment: SentimentMetrics;
  news: NewsItem[];
  decision: TradingDecision;
}

export interface SettingsData {
  has_gemini_key: boolean;
  gemini_key_masked: string;
  has_coinglass_key?: boolean;
  coinglass_key_masked?: string;
  default_exchange: string;
  default_symbols: string[];
  max_risk_per_trade_pct: number;
  max_spread_pct: number;
}
