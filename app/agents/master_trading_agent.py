import os
import json
from datetime import datetime
from typing import List, Optional
from app.models.market_data import Ticker, Candle, NewsItem
from app.models.decision import (
    TradingDecision, TechnicalIndicators, MicrostructureMetrics, SentimentMetrics,
    MonthlyContext, PriceForecastResult
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
        news_items: List[NewsItem],
        monthly_context: Optional[MonthlyContext] = None,
        price_forecast: Optional[PriceForecastResult] = None
    ) -> TradingDecision:
        current_price = ticker.price
        now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        # 1. Microstructure Specialist view
        micro_view = microstructure_agent.interpret(microstructure, current_price)

        # 2. Technical Specialist view
        tech_view = self._generate_technical_view(ticker, indicators)

        # 3. News Specialist view
        news_view = f"News sentiment is {sentiment.overall_sentiment_label} (Score: {sentiment.overall_sentiment_score:+.2f}). Dominant narrative: {sentiment.dominant_narrative}"

        # 4. Macro Specialist view (Last Month Context)
        macro_view = self._generate_macro_view(ticker, monthly_context)

        # 5. Check if Gemini is enabled for advanced cognitive arbitration
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
                    macro_view=macro_view,
                    monthly_context=monthly_context,
                    price_forecast=price_forecast,
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
            news_view=news_view,
            macro_view=macro_view,
            monthly_context=monthly_context,
            price_forecast=price_forecast
        )

    def _generate_macro_view(self, ticker: Ticker, monthly_context: Optional[MonthlyContext]) -> str:
        if not monthly_context or monthly_context.lookback_days < 3:
            return "30-day macro baseline is currently accumulating data."
        p = ticker.price
        trend_name = monthly_context.monthly_trend.replace("_", " ")
        return (
            f"30-day macro trend is {trend_name} with {monthly_context.monthly_change_pct:+.2f}% change over {monthly_context.lookback_days} days. "
            f"Current price (${p:,.2f}) occupies {monthly_context.range_position_pct:.1f}% of the monthly range "
            f"(${monthly_context.monthly_low:,.2f} - ${monthly_context.monthly_high:,.2f}). "
            f"Key monthly pivots: Support at ${monthly_context.key_monthly_support:,.2f}, Resistance at ${monthly_context.key_monthly_resistance:,.2f}. "
            f"30-day SMA is ${monthly_context.sma_30d:,.2f} ({monthly_context.distance_from_sma_pct:+.2f}% delta) with {monthly_context.volume_trend.lower()} trading volume."
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
        news_view: str,
        macro_view: str = "",
        monthly_context: Optional[MonthlyContext] = None,
        price_forecast: Optional[PriceForecastResult] = None
    ) -> TradingDecision:
        p = ticker.price
        reasons = []

        # Quant Confluence Scoring (-100 to +100)
        # Factor A: Technical (Weight: 30)
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
                tech_score += 5
            else:
                tech_score -= 5

        # Factor B: Microstructure & Order Book (Weight: 30)
        micro_score = 0.0
        obi = microstructure.order_book_imbalance
        if obi > 0.25:
            micro_score += 15
            reasons.append(f"Order book depth heavily skewed to bid side (+{int(obi*100)}% imbalance).")
        elif obi < -0.25:
            micro_score -= 15
            reasons.append(f"Order book depth dominated by ask resistance ({int(obi*100)}% imbalance).")

        if microstructure.cvd_side == "BUY_DOMINANT":
            micro_score += 15
            reasons.append("Trade tape reveals strong aggressive market buy flow (positive CVD).")
        elif microstructure.cvd_side == "SELL_DOMINANT":
            micro_score -= 15
            reasons.append("Trade tape dominated by market sell orders (negative CVD).")

        # Factor C: News Sentiment (Weight: 20)
        news_score = sentiment.overall_sentiment_score * 20.0
        if sentiment.overall_sentiment_score >= 0.2:
            reasons.append(f"Bullish news catalyst support ({sentiment.overall_sentiment_label}).")
        elif sentiment.overall_sentiment_score <= -0.2:
            reasons.append(f"Bearish news sentiment pressure ({sentiment.overall_sentiment_label}).")

        # Factor D: 30-Day Macro Realtime & Historical Context (Weight: 20)
        macro_score = 0.0
        if monthly_context and monthly_context.lookback_days >= 3:
            if monthly_context.monthly_trend == "MACRO_BULLISH":
                macro_score += 10
                reasons.append(f"30-day macro trend bullish (+{monthly_context.monthly_change_pct:+.1f}%).")
            elif monthly_context.monthly_trend == "MACRO_BEARISH":
                macro_score -= 10
                reasons.append(f"30-day macro trend bearish ({monthly_context.monthly_change_pct:+.1f}%).")

            # Mean-reversion near monthly range extremes
            if monthly_context.range_position_pct <= 22.0:
                macro_score += 8
                reasons.append(f"Price at lower 30-day range quartile near support (${monthly_context.key_monthly_support:,.2f}).")
            elif monthly_context.range_position_pct >= 85.0:
                macro_score -= 8
                reasons.append(f"Price extended at 30-day ceiling near resistance (${monthly_context.key_monthly_resistance:,.2f}).")

            if monthly_context.volume_trend == "EXPANDING":
                macro_score += (2 if macro_score >= 0 else -2)

        # Factor E: AI Neural-Cognitive Forecast Confluence
        forecast_score = 0.0
        if price_forecast:
            if price_forecast.forecast_bias == "BULLISH_EXPANSION":
                forecast_score += 8
                reasons.append(f"AI Forecaster models {price_forecast.expected_return_30d_pct:+.1f}% 30d expansion to ${price_forecast.target_30d:,.2f}.")
            elif price_forecast.forecast_bias == "BEARISH_REVERSAL":
                forecast_score -= 8
                reasons.append(f"AI Forecaster models {price_forecast.expected_return_30d_pct:+.1f}% 30d retracement to ${price_forecast.target_30d:,.2f}.")

        # Composite score
        total_score = tech_score + micro_score + news_score + macro_score + forecast_score

        # Action mapping
        if total_score >= 40:
            action = "STRONG_BUY"
            conviction = min(int(50 + (total_score * 0.45)), 95)
        elif total_score >= 15:
            action = "BUY"
            conviction = min(int(50 + (total_score * 0.4)), 80)
        elif total_score <= -40:
            action = "STRONG_SELL"
            conviction = min(int(50 + (abs(total_score) * 0.45)), 95)
        elif total_score <= -15:
            action = "SELL"
            conviction = min(int(50 + (abs(total_score) * 0.4)), 80)
        else:
            action = "HOLD"
            conviction = 50
            reasons.append("Conflicting or balanced signals across order book, macro trend, and news.")

        # Risk parameters
        risk_plan = risk_agent.evaluate(
            symbol=symbol,
            current_price=p,
            indicators=indicators,
            microstructure=microstructure,
            action_lean=action,
            monthly_context=monthly_context
        )

        summary = f"Agent issues {action.replace('_', ' ')} on {symbol} with {conviction}% conviction based on confluent 30-day {monthly_context.monthly_trend.lower().replace('_', ' ') if monthly_context else 'macro'} structure, {indicators.trend_state.lower()} momentum, {microstructure.order_flow_signal.lower().replace('_', ' ')}, and {sentiment.overall_sentiment_label.lower()} news flow."

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
            reasons=reasons[:6],
            microstructure_view=micro_view,
            technical_view=tech_view,
            news_view=news_view,
            macro_view=macro_view,
            risk_view=risk_plan["risk_view"],
            monthly_context=monthly_context,
            price_forecast=price_forecast,
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
        macro_view: str,
        monthly_context: Optional[MonthlyContext],
        price_forecast: Optional[PriceForecastResult],
        api_key: str
    ) -> TradingDecision:
        from google import genai
        from google.genai import types

        client = genai.Client(api_key=api_key)
        p = ticker.price

        forecast_info = ""
        if price_forecast:
            forecast_info = f"""
6. AI DEEP SEQUENCE & NEURAL PRICE FORECAST:
- 7-Day Target: ${price_forecast.target_7d:,.2f} ({price_forecast.expected_return_7d_pct:+.1f}%)
- 30-Day Target: ${price_forecast.target_30d:,.2f} ({price_forecast.expected_return_30d_pct:+.1f}%)
- Forecast Bias: {price_forecast.forecast_bias}
- Forecaster Confidence: {price_forecast.confidence_score}%
"""

        prompt = f"""
You are the Chief Investment Officer and Lead AI Quantitative Trading Strategist.
Synthesize the complete multi-source market intelligence for '{symbol}' and formulate an institutional trading decision.

1. 30-DAY (LAST MONTH) HISTORICAL & REALTIME MACRO CONTEXT:
- 30-Day Range: High ${monthly_context.monthly_high if monthly_context else 0:,.2f} / Low ${monthly_context.monthly_low if monthly_context else 0:,.2f}
- Range Position: {monthly_context.range_position_pct if monthly_context else 50:.1f}% (0% = at low, 100% = at high)
- 30-Day Change: {monthly_context.monthly_change_pct if monthly_context else 0:+.2f}%
- Macro Trend Regime: {monthly_context.monthly_trend if monthly_context else 'RANGE_BOUND'}
- Key Monthly Support: ${monthly_context.key_monthly_support if monthly_context else 0:,.2f}
- Key Monthly Resistance: ${monthly_context.key_monthly_resistance if monthly_context else 0:,.2f}
- 30-Day SMA: ${monthly_context.sma_30d if monthly_context else 0:,.2f} ({monthly_context.distance_from_sma_pct if monthly_context else 0:+.2f}% distance)
- Volume Trend: {monthly_context.volume_trend if monthly_context else 'NORMAL'}
- Macro Context Assessment: {macro_view}

2. CURRENT MARKET DATA & INTRADAY ACTION:
- Current Price: ${p:,.2f}
- 24h Change: {ticker.change_pct_24h:+.2f}%
- 24h Volume: {ticker.volume_24h:,.2f}

3. MICROSTRUCTURE & ORDER BOOK INTELLIGENCE:
- Order Book Imbalance (OBI): {microstructure.order_book_imbalance:+.4f} (-1.0 to +1.0)
- Cumulative Volume Delta (CVD): {microstructure.cvd:+.2f} ({microstructure.cvd_side})
- Bid Depth USD: ${microstructure.bid_depth_usd:,.2f} vs Ask Depth USD: ${microstructure.ask_depth_usd:,.2f}
- Bid/Ask Spread: {microstructure.spread_pct:.3f}% ({microstructure.spread_bps:.1f} bps)
- Whale Trades: {microstructure.whale_trades_detected} detected
- Order Flow Signal: {microstructure.order_flow_signal}
- Microstructure Assessment: {micro_view}

4. TECHNICAL & QUANT INDICATORS:
- Trend State: {indicators.trend_state} (EMA20: {indicators.ema_20}, EMA50: {indicators.ema_50})
- RSI (14): {indicators.rsi} ({indicators.rsi_state})
- MACD Hist: {indicators.macd_hist}
- VWAP: ${indicators.vwap}
- ATR (Volatility): ${indicators.atr}
- Technical Assessment: {tech_view}

5. COMPREHENSIVE NEWS & CATALYST SENTIMENT:
- News Sentiment Score: {sentiment.overall_sentiment_score:+.2f} ({sentiment.overall_sentiment_label})
- Dominant Narrative: {sentiment.dominant_narrative}
- Top Catalysts: {', '.join(sentiment.top_catalysts)}
{forecast_info}
TASK:
Determine:
1. Action: Exactly one of ['STRONG_BUY', 'BUY', 'HOLD', 'SELL', 'STRONG_SELL']
2. Conviction percentage (integer 0 to 100)
3. Clear executive summary (2-3 sentences synthesizing 30-day macro, current microstructure, and news)
4. List of 3 to 6 key confluence reasons (mentioning 30-day levels, order book flow, and news)
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

        # Integrate Risk Agent with monthly context pivots
        risk_plan = risk_agent.evaluate(
            symbol=symbol,
            current_price=p,
            indicators=indicators,
            microstructure=microstructure,
            action_lean=action,
            monthly_context=monthly_context
        )

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
            macro_view=macro_view,
            risk_view=risk_plan["risk_view"],
            monthly_context=monthly_context,
            price_forecast=price_forecast,
            model_used=f"Google Gemini ({self.model_name}) Multi-Agent Arbiter",
            timestamp=datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        )

master_trading_agent = MasterTradingAgent()
