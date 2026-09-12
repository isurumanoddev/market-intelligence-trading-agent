---
title: 'Next.js Trading Terminal Frontend'
type: 'feature'
created: '2026-09-12'
status: 'ready-for-dev'
route: 'full'
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The current trading terminal interface uses static vanilla JavaScript within FastAPI. Users need a modern, component-driven Next.js (React / TypeScript / Tailwind CSS) frontend with modular architecture, strict type safety, real-time polling/SSE, and professional UI polish.

**Approach:** Build a Next.js (App Router) application in `frontend/` powered by Tailwind CSS and TypeScript, featuring dedicated components for Candlestick Charts, L2 Order Book Depth, Trade Tape, Gemini AI Decision Arbiter, News Stream, and Paper Trading Execution connecting to the running FastAPI backend.

## Boundaries & Constraints

**Always:**
- Use Next.js App Router with TypeScript and Tailwind CSS.
- Consume the existing FastAPI backend (`http://127.0.0.1:8000/api`) with customizable `NEXT_PUBLIC_API_URL`.
- Match backend Pydantic models with strict TypeScript interfaces.
- Maintain institutional dark-mode aesthetic (JetBrains Mono for numbers, Inter for UI).
- Support automated live polling (10s, 30s, 60s, or manual refresh) and 1-click paper trading execution.

**Never:**
- Do not modify or break the existing backend FastAPI routes or paper trading logic.
- Do not require paid third-party charting libraries; use clean lightweight SVG/Canvas or Lightweight Charts.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Live Analysis Load | User selects symbol (e.g. `BTC/USDT`) | Displays live price, L2 book, trades tape, news, AI signal | Shows non-blocking toast/banner on backend timeout |
| Execute Paper Trade | User clicks "Execute Trade" button | Sends `POST /api/portfolio/trade`, adds position, refreshes portfolio | Shows alert if insufficient cash balance |
| Close Position | User clicks "Close" on position row | Sends `POST /api/portfolio/close`, updates realized PnL | Retains position row if server returns error |
| Gemini Key Setup | User enters Gemini API key in Settings modal | Sends `POST /api/settings`, activates deep reasoning badge | Reverts badge if key test fails |

</frozen-after-approval>

## Code Map

- `app/api/routes.py` -- Backend REST endpoints for market data, news, analysis, and paper broker.
- `app/models/` -- Source of truth for Ticker, OrderBook, Trade, NewsItem, Decision, and Portfolio schemas.
- `frontend/package.json` -- Next.js, React 19, TypeScript, Tailwind CSS, Lucide icons.
- `frontend/src/types/market.ts` -- TypeScript declarations matching backend models.
- `frontend/src/lib/api.ts` -- Centralized typed API client communicating with FastAPI.
- `frontend/src/components/TickerBanner.tsx` -- Top banner with real-time price, OBI meter, CVD, and spread.
- `frontend/src/components/CandleChart.tsx` -- Interactive candlestick and volume chart with timeframe switcher.
- `frontend/src/components/OrderBookLadder.tsx` -- Animated L2 depth ladder with visual depth bars.
- `frontend/src/components/TradeTape.tsx` -- Scrolling time & sales feed with aggressor side and whale alerts.
- `frontend/src/components/DecisionCard.tsx` -- AI Master Decision Arbiter card, conviction gauge, levels, and execute button.
- `frontend/src/components/NewsFeed.tsx` -- Filterable news cards with AI sentiment and catalyst tags.
- `frontend/src/components/PortfolioFooter.tsx` -- Live paper trading portfolio, active positions table, and close buttons.
- `frontend/src/components/SettingsModal.tsx` -- Modal for Gemini API key and risk threshold configurations.
- `frontend/src/app/page.tsx` -- Main trading dashboard page assembling all components.

## Tasks & Acceptance

**Execution:**
- [ ] `frontend/package.json` -- Initialize Next.js project with Tailwind CSS and TypeScript.
- [ ] `frontend/src/types/market.ts` -- Define comprehensive TypeScript interfaces for all market and decision models.
- [ ] `frontend/src/lib/api.ts` -- Implement typed fetch client for FastAPI backend with error handling.
- [ ] `frontend/src/components/` -- Implement modular trading terminal components (Header, TickerBanner, CandleChart, OrderBookLadder, TradeTape, DecisionCard, NewsFeed, PortfolioFooter, SettingsModal).
- [ ] `frontend/src/app/page.tsx` -- Implement stateful dashboard page with auto-refresh intervals and symbol switching.
- [ ] `frontend/next.config.ts` -- Configure proxy / API routing.
- [ ] Verification -- Build and run Next.js development server on port 3000, verify full live pipeline against FastAPI backend.

**Acceptance Criteria:**
- Given FastAPI backend running on port 8000, when Next.js app loads on port 3000, then real-time market data, L2 order book, trade tape, news, and AI decision render accurately.
- Given an active AI recommendation, when user clicks "Execute Trade", then a paper position is created and appears in the portfolio table.
- Given the Next.js build command `npm run build`, then the project compiles with 0 TypeScript and lint errors.

## Verification

Run Next.js build check:
```bash
cd frontend && npm run build
```
Verify live frontend:
```bash
cd frontend && npm run dev
```
Open `http://localhost:3000` and verify real-time market stream, depth ladder, trade tape, news, and 1-click paper trading execution.
