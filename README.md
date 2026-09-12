# ⚡ Market Intelligence & AI Trading Decision Agent

An institutional-grade application and AI agent workflow that ingests multi-source real-time market data—**live prices**, **L2 order book depth**, **recent executed trades (tape)**, **trading volumes**, and **financial/crypto news feeds**—and synthesizes these signals via Google Gemini and a quantitative microstructure engine to generate actionable **Buy/Sell/Hold decisions** with complete risk management and a paper trading simulator.

---

## 🏛 System Architecture

```
                                  [ MULTI-SOURCE MARKET DATA ]
              ┌───────────────────┬───────────────────┬───────────────────┐
              │                   │                   │                   │
         Live Prices &       L2 Order Book       Trade Tape         Live News RSS
         OHLCV Candles           Depth          (Time & Sales)    (CoinDesk, Yahoo, etc.)
              │                   │                   │                   │
              └─────────┬─────────┴─────────┬─────────┘                   │
                        ▼                   ▼                             ▼
              [ Quantitative Engine ]   [ Microstructure ]       [ Sentiment Agent ]
                 RSI, MACD, EMAs,       Order Book Imbalance,    Gemini 2.5 / NLP
                    VWAP, ATR            CVD, Liquidity Walls     Catalyst Scoring
                        │                   │                             │
                        └─────────┬─────────┴─────────────────────────────┘
                                  ▼
                     [ AI Master Trading Arbiter ]
                     Google Gemini Multi-Agent Reasoner
                                  │
                                  ▼
                      [ Risk Management Agent ]
                      Dynamic ATR Stop-Loss, Targets,
                         Position Sizing Guardrails
                                  │
                                  ▼
                   ┌──────────────┴──────────────┐
                   ▼                             ▼
        [ Web Trading Terminal ]      [ Paper Trading Broker ]
         Real-time Depth Ladder,        Order Fills, Realized/
           Tape, News & Signals            Unrealized P&L
```

---

## ✨ Features

1. **Multi-Source Data Ingestion**:
   - **Crypto Assets**: Free real-time public L2 order book, recent trade tape, tickers, and OHLCV from Kraken, Coinbase, Binance, and Bybit via `ccxt`.
   - **Equities / Stocks**: Real-time ticker and historical candle feeds for US equities (`AAPL`, `NVDA`, `TSLA`, `MSFT`, `SPY`) via `yfinance`.
   - **Financial News**: Multi-feed RSS scraper (CoinDesk, Cointelegraph, Yahoo Finance, Decrypt) with automatic relevance scoring.

2. **Microstructure & Orderflow Analytics**:
   - **Order Book Imbalance (OBI)**: Evaluates buyer vs. seller passive depth pressure.
   - **Cumulative Volume Delta (CVD)**: Tracks aggressive market buy volume vs. market sell volume.
   - **Liquidity Walls**: Automatically flags massive support blocks and overhead resistance walls.
   - **Whale Trade Alerts**: Detects institutional-sized block trades hitting the tape.

3. **Quantitative Indicators**:
   - RSI (Wilder's 14-period), MACD (12, 26, 9), EMA (20, 50, 200), VWAP, and ATR (Average True Range).

4. **Multi-Agent AI Decision Arbiter**:
   - Synthesizes all 4 pillars (News Catalyst, Order Book Pressure, Trend Momentum, Volatility).
   - Generates structured decisions: `STRONG_BUY`, `BUY`, `HOLD`, `SELL`, `STRONG_SELL` with conviction score (0-100%).
   - Provides concrete Entry Zone, Stop-Loss, Take-Profit 1 (1.6x R/R), Take-Profit 2 (3.2x R/R), and position size percentage.
   - Powered by **Google Gemini** (`gemini-2.5-flash`) with automatic fallback to a deterministic quantitative confluence engine if an API key is not configured.

5. **Paper Trading Simulation**:
   - \$100,000 virtual cash portfolio.
   - 1-click execution from the AI trade recommendation card.
   - Tracks cash balance, total equity, open positions, unrealized P&L, realized P&L, automated stop-loss/take-profit triggers, and trade logs.

6. **Institutional Web Dashboard**:
   - Dark Bloomberg/Binance Pro terminal UI.
   - Interactive candlestick chart with timeframe selector (`5m`, `15m`, `1h`, `1d`).
   - Animated L2 Order Book Depth Ladder with live mid-market spread.
   - Scrolling Time & Sales trade tape.
   - Real-time News feed with sentiment badges.
   - Dynamic Settings modal to configure Gemini API Key and risk thresholds.

---

## 🚀 Quick Start

### 1. Set Active Workspace
In your editor, open or set the workspace directory to:
```
C:\Users\IsuruSenanayake\.gemini\antigravity\scratch\market_intelligence_agent
```

### 2. Activate Virtual Environment
```powershell
.\.venv\Scripts\Activate.ps1
```

### 3. Run the Application
```powershell
& .\.venv\Scripts\python.exe run.py
```

Open your browser and navigate to:
```
http://127.0.0.1:8000
```

---

## ⚙ Configuration & Gemini API Key

You can configure your Google Gemini API key in two ways:
1. **In the Web UI**: Click the **⚙** button or the **Gemini AI** badge in the top right header, paste your key, and click **Save Settings**.
2. **Via `.env` file**:
   ```env
   GEMINI_API_KEY=your_actual_gemini_api_key_here
   DEFAULT_EXCHANGE=kraken
   HOST=127.0.0.1
   PORT=8000
   ```

> [!NOTE]
> If a Gemini API key is not provided, the application automatically runs using the high-performance **Quantitative Confluence Engine**, so the entire system is fully functional out of the box!

---

## 📡 REST API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/analysis?symbol=BTC/USDT` | Comprehensive pipeline returning ticker, order book, tape, indicators, news, and AI decision |
| `GET` | `/api/market/ticker?symbol=...` | Latest price, 24h change, high, low, volume |
| `GET` | `/api/market/orderbook?symbol=...` | L2 bids and asks depth ladder and imbalance |
| `GET` | `/api/market/trades?symbol=...` | Recent executed trades tape (time, side, price, size) |
| `GET` | `/api/market/candles?symbol=...&timeframe=1h` | Candlestick data for charts |
| `GET` | `/api/news?symbol=...` | Filtered headlines with AI sentiment scores |
| `GET` | `/api/portfolio` | Current paper trading balance, equity, and open positions |
| `POST` | `/api/portfolio/trade` | Execute a paper trade order |
| `POST` | `/api/portfolio/close` | Close an active position |
| `POST` | `/api/portfolio/reset` | Reset paper trading account balance |
| `GET/POST` | `/api/settings` | Retrieve or update runtime settings |

---

## 🧪 Running Automated Tests

Run the test suite with:
```powershell
& .\.venv\Scripts\python.exe -m pytest -v
```
All 8 unit and integration tests verify:
- Candlestick mathematical indicator calculations (RSI, MACD, EMAs, VWAP, ATR)
- Order Book Imbalance (OBI) and Cumulative Volume Delta (CVD)
- Multi-factor Confluence Decision generation
- Paper broker account debit, order execution, P&L, and auto stop-loss
- Full FastAPI HTTP endpoint workflows
