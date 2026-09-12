import os
import json
from datetime import datetime
from typing import List, Optional
from app.models.market_data import Ticker, Candle, NewsItem
from app.models.decision import (
    TradingDecision, TechnicalIndicators, MicrostructureMetrics, SentimentMetrics
)
from app.agents.sentiment_agent import sentiment_agent
from app.agents.microstructure_agent import microstructure_agent
from app.agents.risk_agent import risk_agent
from app.config import settings

class MasterTradingAgent:
    def __init__(self):
        self.model_name = "gemini-2.5-flash"

    def evaluate(
        self,
        symbol: str,
        ticker: Ticker,
        indicators: TechnicalIndicators,
        microstructure: MicrostructureMetrics,
        sentiment: SentimentMetrics,
        news_items: List[NewsItem]
    ) -> TradingDecision:
        current_price = ticker.price
        now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        # 1. Microstructure Specialist view
        micro_view = microstructure_agent.interpret(microstructure, current_price)

        # 2. Technical Specialist view
        tech_view = self._generate_technical_view(ticker, indicators)

        # 3. News Specialist view
        news_view = f"News sentiment is {sentiment.overall_sentiment_label} (Score: {sentiment.overall_sentiment_score:+.2f}). Dominant narrative: {sentiment.dominant_narrative}"

        # 4. Check if Gemini is enabled for advanced cognitive arbitration
        api_key = settings.gemini_api_key or os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")

        if api_key:
            try:
                decision = self._evaluate_with_gemini(
                    symbol=symbol,
                    ticker=ticker,
                    indicators=indicators,
                    microstructure=microstructure,
                    sentiment=sentiment,
                    micro_view=micro_view,
                    tech_view=tech_view,
                    news_view=news_view,
                    api_key=api_key
                )
                return decision
            except Exception as e:
                print(f"Gemini master evaluation failed, using deterministic confluence engine: {e}")

        # Fallback to Deterministic Quantitative Confluence Engine
        return self._evaluate_deterministic(
            symbol=symbol,
            ticker=ticker,
            indicators=indicators,
            microstructure=microstructure,
            sentiment=sentiment,
            micro_view=micro_view,
            tech_view=tech_view,
            news_view=news_view
        )

    def _generate_technical_view(self, ticker: Ticker, indicators: TechnicalIndicators) -> str:
        parts = []
        p = ticker.price

        if indicators.trend_state == "BULLISH":
            parts.append(f"Price (${p:,.2f}) is in an upward trend above EMA 20 (${indicators.ema_20}) and EMA 50 (${indicators.ema_50}).")
        elif indicators.trend_state == "BEARISH":
            parts.append(f"Price (${p:,.2f}) is in a downward trend below EMA 20 (${indicators.ema_20}) and EMA 50 (${indicators.ema_50}).")
        else:
            parts.append(f"Price (${p:,.2f}) is consolidating near EMAs.")

        if indicators.rsi is not None:
            if indicators.rsi >= 70:
                parts.append(f"RSI ({indicators.rsi:.1f}) is in overbought territory, signaling caution against chasing.")
            elif indicators.rsi <= 30:
                parts.append(f"RSI ({indicators.rsi:.1f}) indicates oversold exhaustion, favoring potential mean reversion.")
            else:
                parts.append(f"RSI is neutral at {indicators.rsi:.1f}.")

        if indicators.macd_hist is not None:
            if indicators.macd_hist > 0:
                parts.append(f"MACD histogram is positive ({indicators.macd_hist:+.2f}), displaying bullish momentum expansion.")
            else:
                parts.append(f"MACD histogram is negative ({indicators.macd_hist:+.2f}), reflecting bearish momentum.")

        return " ".join(parts)

    def _evaluate_deterministic(
        self,
        symbol: str,
        ticker: Ticker,
        indicators: TechnicalIndicators,
        microstructure: MicrostructureMetrics,
        sentiment: SentimentMetrics,
        micro_view: str,
        tech_view: str,
        news_view: str
    ) -> TradingDecision:
        p = ticker.price
        reasons = []

        # Quant Confluence Scoring (-100 to +100)
        # Factor A: Technical (Weight: 35)
        tech_score = 0.0
        if indicators.trend_state == "BULLISH":
            tech_score += 15
            reasons.append("Trend alignment: Price trading above key moving averages (EMA 20/50).")
        elif indicators.trend_state == "BEARISH":
            tech_score -= 15
            reasons.append("Trend headwind: Price positioned below key moving averages (EMA 20/50).")

        if indicators.rsi is not None:
            if indicators.rsi < 35:
                tech_score += 10
                reasons.append("RSI oversold rebound opportunity.")
            elif indicators.rsi > 68:
                tech_score -= 10
                reasons.append("RSI overbought warning.")

        if indicators.macd_hist is not None:
            if indicators.macd_hist > 0:
                tech_score += 10
            else:
                tech_score -= 10

        # Factor B: Microstructure & Order Book (Weight: 35)
        micro_score = 0.0
        obi = microstructure.order_book_imbalance
        if obi > 0.25:
            micro_score += 18
            reasons.append(f"Order book depth heavily skewed to bid side (+{int(obi*100)}% imbalance).")
        elif obi < -0.25:
            micro_score -= 18
            reasons.append(f"Order book depth dominated by ask resistance ({int(obi*100)}% imbalance).")

        if microstructure.cvd_side == "BUY_DOMINANT":
            micro_score += 17
            reasons.append("Trade tape reveals strong aggressive market buy flow (positive CVD).")
        elif microstructure.cvd_side == "SELL_DOMINANT":
            micro_score -= 17
            reasons.append("Trade tape dominated by market sell orders (negative CVD).")

        # Factor C: News Sentiment (Weight: 30)
        news_score = sentiment.overall_sentiment_score * 30.0
        if sentiment.overall_sentiment_score >= 0.2:
            reasons.append(f"Bullish news catalyst support ({sentiment.overall_sentiment_label}).")
        elif sentiment.overall_sentiment_score <= -0.2:
            reasons.append(f"Bearish news sentiment pressure ({sentiment.overall_sentiment_label}).")

        # Composite score
        total_score = tech_score + micro_score + news_score

        # Action mapping
        if total_score >= 45:
            action = "STRONG_BUY"
            conviction = min(int(50 + (total_score * 0.45)), 95)
        elif total_score >= 18:
            action = "BUY"
            conviction = min(int(50 + (total_score * 0.4)), 80)
        elif total_score <= -45:
            action = "STRONG_SELL"
            conviction = min(int(50 + (abs(total_score) * 0.45)), 95)
        elif total_score <= -18:
            action = "SELL"
            conviction = min(int(50 + (abs(total_score) * 0.4)), 80)
        else:
            action = "HOLD"
            conviction = 50
            reasons.append("Conflicting or balanced signals across order book, momentum, and news.")

        # Risk parameters
        risk_plan = risk_agent.evaluate(symbol, p, indicators, microstructure, action)

        summary = f"Agent issues {action.replace('_', ' ')} on {symbol} with {conviction}% conviction based on confluent {indicators.trend_state.lower()} momentum, {microstructure.order_flow_signal.lower().replace('_', ' ')}, and {sentiment.overall_sentiment_label.lower()} news flow."

        return TradingDecision(
            symbol=symbol,
            action=action,
            conviction=conviction,
            current_price=p,
            entry_zone=risk_plan["entry_zone"],
            stop_loss=risk_plan["stop_loss"],
            take_profit_1=risk_plan["take_profit_1"],
            take_profit_2=risk_plan["take_profit_2"],
            risk_reward_ratio=risk_plan["risk_reward_ratio"],
            recommended_position_pct=risk_plan["recommended_position_pct"],
            summary=summary,
            reasons=reasons[:5],
            microstructure_view=micro_view,
            technical_view=tech_view,
            news_view=news_view,
            risk_view=risk_plan["risk_view"],
            model_used="Quantitative Confluence Multi-Agent Engine",
            timestamp=datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        )

    def _evaluate_with_gemini(
        self,
        symbol: str,
        ticker: Ticker,
        indicators: TechnicalIndicators,
        microstructure: MicrostructureMetrics,
        sentiment: SentimentMetrics,
        micro_view: str,
        tech_view: str,
        news_view: str,
        api_key: str
    ) -> TradingDecision:
        from google import genai
        from google.genai import types

        client = genai.Client(api_key=api_key)
        p = ticker.price

        prompt = f"""
You are the Chief Investment Officer and Lead AI Quantitative Trading Strategist.
Synthesize the complete multi-source market intelligence for '{symbol}' and formulate an institutional trading decision.

CURRENT MARKET DATA:
- Price: ${p:,.2f}
- 24h Change: {ticker.change_pct_24h:+.2f}%
- 24h Volume: {ticker.volume_24h:,.2f}

MICROSTRUCTURE & ORDER BOOK INTELLIGENCE:
- Order Book Imbalance (OBI): {microstructure.order_book_imbalance:+.4f} (-1.0 to +1.0)
- Cumulative Volume Delta (CVD): {microstructure.cvd:+.2f} ({microstructure.cvd_side})
- Bid Depth USD: ${microstructure.bid_depth_usd:,.2f} vs Ask Depth USD: ${microstructure.ask_depth_usd:,.2f}
- Bid/Ask Spread: {microstructure.spread_pct:.3f}% ({microstructure.spread_bps:.1f} bps)
- Whale Trades: {microstructure.whale_trades_detected} detected
- Order Flow Signal: {microstructure.order_flow_signal}
- Microstructure Assessment: {micro_view}

TECHNICAL & QUANT INDICATORS:
- Trend State: {indicators.trend_state} (EMA20: {indicators.ema_20}, EMA50: {indicators.ema_50})
- RSI (14): {indicators.rsi} ({indicators.rsi_state})
- MACD Hist: {indicators.macd_hist}
- VWAP: ${indicators.vwap}
- ATR (Volatility): ${indicators.atr}
- Technical Assessment: {tech_view}

NEWS & CATALYST SENTIMENT:
- News Sentiment Score: {sentiment.overall_sentiment_score:+.2f} ({sentiment.overall_sentiment_label})
- Dominant Narrative: {sentiment.dominant_narrative}
- Top Catalysts: {', '.join(sentiment.top_catalysts)}

TASK:
Determine:
1. Action: Exactly one of ['STRONG_BUY', 'BUY', 'HOLD', 'SELL', 'STRONG_SELL']
2. Conviction percentage (integer 0 to 100)
3. Clear executive summary (2-3 sentences)
4. List of 3 to 5 key confluence reasons
"""

        schema = {
            "type": "OBJECT",
            "properties": {
                "action": {
                    "type": "STRING",
                    "enum": ["STRONG_BUY", "BUY", "HOLD", "SELL", "STRONG_SELL"]
                },
                "conviction": {"type": "INTEGER"},
                "summary": {"type": "STRING"},
                "reasons": {
                    "type": "ARRAY",
                    "items": {"type": "STRING"}
                }
            },
            "required": ["action", "conviction", "summary", "reasons"]
        }

        response = client.models.generate_content(
            model=self.model_name,
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_json_schema=schema,
                temperature=0.1
            )
        )

        data = json.loads(response.text)
        action = data.get("action", "HOLD")
        conviction = max(0, min(100, int(data.get("conviction", 50))))
        summary = data.get("summary", "")
        reasons = data.get("reasons", [])

        # Integrate Risk Agent
        risk_plan = risk_agent.evaluate(symbol, p, indicators, microstructure, action)

        return TradingDecision(
            symbol=symbol,
            action=action,
            conviction=conviction,
            current_price=p,
            entry_zone=risk_plan["entry_zone"],
            stop_loss=risk_plan["stop_loss"],
            take_profit_1=risk_plan["take_profit_1"],
            take_profit_2=risk_plan["take_profit_2"],
            risk_reward_ratio=risk_plan["risk_reward_ratio"],
            recommended_position_pct=risk_plan["recommended_position_pct"],
            summary=summary,
            reasons=reasons,
            microstructure_view=micro_view,
            technical_view=tech_view,
            news_view=news_view,
            risk_view=risk_plan["risk_view"],
            model_used=f"Google Gemini ({self.model_name}) Multi-Agent Arbiter",
            timestamp=datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        )

master_trading_agent = MasterTradingAgent()
