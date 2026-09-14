import {
  FullAnalysisData,
  CoinInfo,
  Candle,
  PortfolioState,
  SettingsData,
  LLMPredictionResult,
} from "@/types/market";


const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  (typeof window !== "undefined"
    ? `${window.location.protocol}//${window.location.hostname}:8000/api`
    : "http://127.0.0.1:8000/api");

export async function fetchAnalysis(symbol: string): Promise<FullAnalysisData> {
  try {
    const res = await fetch(`${API_BASE}/analysis?symbol=${encodeURIComponent(symbol)}`, {
      cache: "no-store",
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ detail: `HTTP ${res.status}: Failed to fetch analysis` }));
      throw new Error(errorData.detail || "Failed to fetch analysis");
    }
    return res.json();
  } catch (err: any) {
    if (err.message && (err.message.includes("Failed to fetch") || err.message.includes("NetworkError") || err.message.includes("refused"))) {
      throw new Error("Cannot connect to FastAPI backend at http://127.0.0.1:8000. Please make sure the Python server is running (`python run.py`).");
    }
    throw err;
  }
}

export async function fetchCandles(symbol: string, timeframe: string = "1h", limit: number = 45): Promise<Candle[]> {
  const res = await fetch(
    `${API_BASE}/market/candles?symbol=${encodeURIComponent(symbol)}&timeframe=${timeframe}&limit=${limit}`,
    { cache: "no-store" }
  );
  if (!res.ok) return [];
  return res.json();
}

export async function fetchPortfolio(): Promise<PortfolioState> {
  const res = await fetch(`${API_BASE}/portfolio`, { cache: "no-store" });
  if (!res.ok) {
    throw new Error("Failed to fetch portfolio state");
  }
  return res.json();
}

export async function executeTrade(payload: {
  symbol: string;
  side: "BUY" | "SELL";
  price: number;
  amount: number;
  leverage?: number;
  stop_loss?: number;
  take_profit?: number;
  broker_type?: string;
  reason?: string;
}) {
  const res = await fetch(`${API_BASE}/portfolio/trade`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Order failed" }));
    throw new Error(err.detail || "Failed to execute order");
  }
  return res.json();
}

export async function closePosition(positionId: string, currentPrice: number) {
  const res = await fetch(`${API_BASE}/portfolio/close`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      position_id: positionId,
      current_price: currentPrice,
      reason: "Closed via Next.js Terminal",
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Close failed" }));
    throw new Error(err.detail || "Failed to close position");
  }
  return res.json();
}

export async function resetPortfolio() {
  const res = await fetch(`${API_BASE}/portfolio/reset`, { method: "POST" });
  if (!res.ok) throw new Error("Failed to reset portfolio");
  return res.json();
}

export async function fetchSettings(): Promise<SettingsData> {
  const res = await fetch(`${API_BASE}/settings`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load settings");
  return res.json();
}

export async function updateSettings(payload: {
  gemini_api_key?: string;
  coinglass_api_key?: string;
  binance_testnet_api_key?: string;
  binance_testnet_secret?: string;
  bybit_testnet_api_key?: string;
  bybit_testnet_secret?: string;
  default_exchange?: string;
  max_risk_per_trade_pct?: number;
  max_spread_pct?: number;
}) {
  const res = await fetch(`${API_BASE}/settings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to save settings");
  return res.json();
}

export async function fetchLLMPrediction(
  symbol: string,
  bypassCache: boolean = false
): Promise<LLMPredictionResult> {
  const res = await fetch(
    `${API_BASE}/market/llm-predict?symbol=${encodeURIComponent(symbol)}&bypass_cache=${bypassCache}`,
    { cache: "no-store" }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Failed to fetch LLM prediction" }));
    throw new Error(err.detail || "Failed to fetch LLM prediction");
  }
  return res.json();
}

export async function fetchAccuracyRating(symbol: string) {
  const res = await fetch(`${API_BASE}/market/accuracy-rating?symbol=${encodeURIComponent(symbol)}`, {
    cache: "no-store",
  });
  if (!res.ok) return null;
  return res.json();
}

export async function fetchExchangeStatus() {
  const res = await fetch(`${API_BASE}/portfolio/exchange-status`, { cache: "no-store" });
  if (!res.ok) return null;
  return res.json();
}

export async function fetchTradingViewWebhookTemplate(params: {
  symbol: string;
  side: string;
  price: number;
  amount: number;
  leverage?: number;
  stop_loss?: number;
  take_profit?: number;
}) {
  const query = new URLSearchParams({
    symbol: params.symbol,
    side: params.side,
    price: params.price.toString(),
    amount: params.amount.toString(),
    leverage: (params.leverage || 1).toString(),
    ...(params.stop_loss ? { stop_loss: params.stop_loss.toString() } : {}),
    ...(params.take_profit ? { take_profit: params.take_profit.toString() } : {}),
  });
  const res = await fetch(`${API_BASE}/portfolio/tradingview-webhook-template?${query.toString()}`, {
    cache: "no-store",
  });
  if (!res.ok) return null;
  return res.json();
}

export async function fetchCoins(params?: {
  category?: string;
  search?: string;
  sort_by?: string;
  limit?: number;
}): Promise<{ status: string; total: number; coins: CoinInfo[] }> {
  try {
    const query = new URLSearchParams();
    if (params?.category) query.set("category", params.category);
    if (params?.search) query.set("search", params.search);
    if (params?.sort_by) query.set("sort_by", params.sort_by);
    if (params?.limit) query.set("limit", params.limit.toString());

    const res = await fetch(`${API_BASE}/market/coins?${query.toString()}`, {
      cache: "no-store",
    });
    if (!res.ok) return { status: "error", total: 0, coins: [] };
    return res.json();
  } catch {
    return { status: "error", total: 0, coins: [] };
  }
}

export async function fetchTopVolumeCoins(limit: number = 20): Promise<CoinInfo[]> {
  try {
    const res = await fetch(`${API_BASE}/market/top-volume?limit=${limit}`, {
      cache: "no-store",
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.coins || [];
  } catch {
    return [];
  }
}
