import os
import json
import time
import math
from datetime import datetime
from typing import Dict, Any, Optional, List, Tuple
from pydantic import BaseModel

from app.models.decision import (
    LLMHorizonPrediction,
    LLMPredictionResult,
    TechnicalIndicators,
    MicrostructureMetrics,
    SentimentMetrics,
    MonthlyContext,
)
from app.models.market_data import Ticker, Candle
from app.config import settings

HORIZONS_CONFIG = [
    {"horizon": "30m", "label": "30 Minutes", "minutes": 30, "default_conf": 75},
    {"horizon": "1h", "label": "1 Hour", "minutes": 60, "default_conf": 72},
    {"horizon": "4h", "label": "4 Hours", "minutes": 240, "default_conf": 68},
    {"horizon": "1d", "label": "1 Day", "minutes": 1440, "default_conf": 65},
]

class LLMPredictorService:
    def __init__(self):
        self.model_name = "gemini-3.7-flash"
        self._cache: Dict[str, Tuple[float, LLMPredictionResult]] = {}
        self.cache_ttl_seconds = 60

    def predict(
        self,
        symbol: str,
        ticker: Ticker,
        indicators: Optional[TechnicalIndicators] = None,
        microstructure: Optional[MicrostructureMetrics] = None,
        sentiment: Optional[SentimentMetrics] = None,
        monthly_context: Optional[MonthlyContext] = None,
        derivatives: Optional[Any] = None,
        onchain: Optional[Any] = None,
        bypass_cache: bool = False,
    ) -> LLMPredictionResult:
        start_time = time.time()
        sym = symbol.upper()

        if not bypass_cache and sym in self._cache:
            cached_time, cached_res = self._cache[sym]
            if start_time - cached_time < self.cache_ttl_seconds:
                return cached_res

        context_dict = self._build_context_dict(
            symbol=sym,
            ticker=ticker,
            indicators=indicators,
            microstructure=microstructure,
            sentiment=sentiment,
            monthly_context=monthly_context,
            derivatives=derivatives,
            onchain=onchain,
        )

        api_key = (
            settings.gemini_api_key
            or os.getenv("GEMINI_API_KEY", "")
            or os.getenv("GOOGLE_API_KEY", "")
        )

        result: Optional[LLMPredictionResult] = None

        if api_key:
            try:
                result = self._predict_with_gemini(
                    symbol=sym,
                    ticker=ticker,
                    context_dict=context_dict,
                    api_key=api_key,
                )
            except Exception as e:
                print(f"[LLMPredictor] Gemini API call error: {e}. Falling back to quant forecast.")

        if result is None:
            result = self._predict_deterministic(
                symbol=sym,
                ticker=ticker,
                indicators=indicators,
                microstructure=microstructure,
                sentiment=sentiment,
                monthly_context=monthly_context,
                derivatives=derivatives,
                onchain=onchain,
                context_dict=context_dict,
            )

        elapsed_ms = int((time.time() - start_time) * 1000)
        result.generation_time_ms = elapsed_ms
        result.timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        self._cache[sym] = (time.time(), result)
        return result

    def _build_context_dict(
        self,
        symbol: str,
        ticker: Ticker,
        indicators: Optional[TechnicalIndicators],
        microstructure: Optional[MicrostructureMetrics],
        sentiment: Optional[SentimentMetrics],
        monthly_context: Optional[MonthlyContext],
        derivatives: Optional[Any],
        onchain: Optional[Any],
    ) -> Dict[str, Any]:
        p = ticker.price
        return {
            "symbol": symbol,
            "current_price": p,
            "change_pct_24h": round(getattr(ticker, "change_pct_24h", 0.0), 2),
            "high_24h": getattr(ticker, "high_24h", p),
            "low_24h": getattr(ticker, "low_24h", p),
            "volume_24h": getattr(ticker, "volume_24h", 0.0),
            "technical": {
                "rsi": round(indicators.rsi, 1) if indicators and indicators.rsi is not None else 50.0,
                "rsi_state": indicators.rsi_state if indicators else "NEUTRAL",
                "macd_hist": round(indicators.macd_hist, 2) if indicators and indicators.macd_hist is not None else 0.0,
                "trend_state": indicators.trend_state if indicators else "NEUTRAL",
                "vwap": round(indicators.vwap, 2) if indicators and indicators.vwap else p,
                "atr": round(indicators.atr, 2) if indicators and indicators.atr else round(p * 0.015, 2),
                "bb_upper": round(indicators.bb_upper, 2) if indicators and indicators.bb_upper else round(p * 1.02, 2),
                "bb_lower": round(indicators.bb_lower, 2) if indicators and indicators.bb_lower else round(p * 0.98, 2),
            },
            "microstructure": {
                "imbalance": round(microstructure.order_book_imbalance, 3) if microstructure else 0.0,
                "cvd": round(microstructure.cvd, 1) if microstructure else 0.0,
                "cvd_side": microstructure.cvd_side if microstructure else "BALANCED",
                "spread_bps": round(microstructure.spread_bps, 1) if microstructure else 0.0,
                "order_flow_signal": microstructure.order_flow_signal if microstructure else "NEUTRAL",
                "whale_trades": microstructure.whale_trades_detected if microstructure else 0,
            },
            "sentiment": {
                "score": round(sentiment.overall_sentiment_score, 2) if sentiment else 0.0,
                "label": sentiment.overall_sentiment_label if sentiment else "NEUTRAL",
                "top_catalysts": sentiment.top_catalysts[:3] if sentiment and sentiment.top_catalysts else ["Macro Equilibrium"],
                "dominant_narrative": sentiment.dominant_narrative if sentiment else "Steady market consolidation",
            },
            "derivatives": {
                "funding_rate_annualized_pct": round(getattr(derivatives, "funding_rate_annualized_pct", 0.0), 2) if derivatives else 0.0,
                "funding_bias": getattr(derivatives, "funding_bias", "NEUTRAL") if derivatives else "NEUTRAL",
                "open_interest_usd": getattr(derivatives, "open_interest_usd", 0.0) if derivatives else 0.0,
                "leverage_signal": getattr(derivatives, "leverage_signal", "NORMAL") if derivatives else "NORMAL",
                "long_short_ratio": round(getattr(derivatives, "long_short_ratio", 1.0), 2) if derivatives else 1.0,
            },
            "onchain": {
                "stablecoin_flow_signal": getattr(onchain, "stablecoin_flow_signal", "NEUTRAL") if onchain else "NEUTRAL",
                "stablecoin_30d_change_usd": getattr(onchain, "stablecoin_30d_change_usd", 0.0) if onchain else 0.0,
                "total_defi_tvl_usd": getattr(onchain, "total_defi_tvl_usd", 0.0) if onchain else 0.0,
                "tvl_signal": getattr(onchain, "tvl_signal", "STABLE") if onchain else "STABLE",
            },
            "monthly_macro": {
                "monthly_trend": monthly_context.monthly_trend if monthly_context else "RANGE_BOUND",
                "range_position_pct": round(monthly_context.range_position_pct, 1) if monthly_context else 50.0,
                "key_support": round(monthly_context.key_monthly_support, 2) if monthly_context else round(p * 0.95, 2),
                "key_resistance": round(monthly_context.key_monthly_resistance, 2) if monthly_context else round(p * 1.05, 2),
            },
        }

    def _predict_with_gemini(
        self,
        symbol: str,
        ticker: Ticker,
        context_dict: Dict[str, Any],
        api_key: str,
    ) -> LLMPredictionResult:
        from google import genai
        from google.genai import types

        client = genai.Client(api_key=api_key)
        p = ticker.price

        system_instruction = (
            "You are an elite quantitative crypto analyst and multi-horizon market prediction engine. "
            "You synthesize order book microstructure, derivatives positioning, on-chain liquidity flows, "
            "technical oscillators, and macro narrative momentum to generate precise price predictions "
            "for the next 30 minutes, 1 hour, 4 hours, and 1 day. "
            "You provide nuanced, professional market reasoning grounded in liquidity imbalances, funding squeeze potential, "
            "and technical barriers. Always adhere strictly to realistic statistical drift and risk boundaries."
        )

        user_prompt = f"""
Analyze the comprehensive institutional telemetry for {symbol} and generate precise price predictions for 4 temporal horizons: 30m, 1h, 4h, and 1d.

CURRENT MARKET CONTEXT:
- Asset: {symbol}
- Current Price: ${p:,.2f}
- 24h Change: {context_dict['change_pct_24h']:+.2f}% (24h Range: ${context_dict['low_24h']:,.2f} - ${context_dict['high_24h']:,.2f})

TECHNICAL METRICS:
- Trend State: {context_dict['technical']['trend_state']}
- RSI (14): {context_dict['technical']['rsi']} ({context_dict['technical']['rsi_state']})
- MACD Hist: {context_dict['technical']['macd_hist']}
- VWAP: ${context_dict['technical']['vwap']:,.2f}
- ATR Volatility: ${context_dict['technical']['atr']:,.2f}
- Bollinger Range: ${context_dict['technical']['bb_lower']:,.2f} to ${context_dict['technical']['bb_upper']:,.2f}

ORDER BOOK MICROSTRUCTURE:
- Order Book Imbalance (OBI): {context_dict['microstructure']['imbalance']:+.3f} (-1 to +1)
- CVD Side: {context_dict['microstructure']['cvd_side']} (Delta: {context_dict['microstructure']['cvd']:+.1f})
- Bid/Ask Spread: {context_dict['microstructure']['spread_bps']:.1f} bps
- Order Flow Signal: {context_dict['microstructure']['order_flow_signal']}
- Whale Trades: {context_dict['microstructure']['whale_trades']}

DERIVATIVES & LEVERAGE:
- Funding Rate (Annualized): {context_dict['derivatives']['funding_rate_annualized_pct']:+.2f}% ({context_dict['derivatives']['funding_bias']})
- Leverage Signal: {context_dict['derivatives']['leverage_signal']}
- Long/Short Ratio: {context_dict['derivatives']['long_short_ratio']}

ON-CHAIN LIQUIDITY & MACRO:
- Stablecoin Flow Signal: {context_dict['onchain']['stablecoin_flow_signal']}
- DeFi TVL Signal: {context_dict['onchain']['tvl_signal']}
- 30-Day Regime: {context_dict['monthly_macro']['monthly_trend']} (Range Position: {context_dict['monthly_macro']['range_position_pct']}%)
- Key Monthly Support: ${context_dict['monthly_macro']['key_support']:,.2f} | Resistance: ${context_dict['monthly_macro']['key_resistance']:,.2f}
- News Sentiment: {context_dict['sentiment']['label']} ({context_dict['sentiment']['score']:+.2f})
- Dominant Narrative: {context_dict['sentiment']['dominant_narrative']}
- Top Catalysts: {', '.join(context_dict['sentiment']['top_catalysts'])}

REQUIRED OUTPUT SPECIFICATION:
1. Provide an executive market summary (2-3 sentences synthesizing all pillars).
2. Assign overall market bias: BULLISH, BEARISH, or NEUTRAL, with confidence score (0-100).
3. For each of the 4 horizons (30m, 1h, 4h, 1d):
   - predicted_price: target price in USD
   - direction: BULLISH, BEARISH, or NEUTRAL
   - confidence: 0 to 100
   - price_range_low: lower bound
   - price_range_high: upper bound
   - reasoning: 2-3 sentences explaining the structural and behavioral rationale
   - key_factors: exactly 3 concise market drivers for this horizon
   - risk_level: LOW, MEDIUM, HIGH, or EXTREME
   - recommended_action: BUY, SELL, HOLD, or WAIT
"""

        schema = {
            "type": "OBJECT",
            "properties": {
                "market_summary": {"type": "STRING", "description": "Overall synthesis narrative"},
                "overall_bias": {"type": "STRING", "enum": ["BULLISH", "BEARISH", "NEUTRAL"]},
                "overall_confidence": {"type": "INTEGER", "description": "Confidence from 0 to 100"},
                "predictions": {
                    "type": "ARRAY",
                    "items": {
                        "type": "OBJECT",
                        "properties": {
                            "horizon": {"type": "STRING", "enum": ["30m", "1h", "4h", "1d"]},
                            "predicted_price": {"type": "NUMBER"},
                            "direction": {"type": "STRING", "enum": ["BULLISH", "BEARISH", "NEUTRAL"]},
                            "confidence": {"type": "INTEGER"},
                            "price_range_low": {"type": "NUMBER"},
                            "price_range_high": {"type": "NUMBER"},
                            "reasoning": {"type": "STRING"},
                            "key_factors": {
                                "type": "ARRAY",
                                "items": {"type": "STRING"}
                            },
                            "risk_level": {"type": "STRING", "enum": ["LOW", "MEDIUM", "HIGH", "EXTREME"]},
                            "recommended_action": {"type": "STRING", "enum": ["BUY", "SELL", "HOLD", "WAIT"]}
                        },
                        "required": [
                            "horizon",
                            "predicted_price",
                            "direction",
                            "confidence",
                            "price_range_low",
                            "price_range_high",
                            "reasoning",
                            "key_factors",
                            "risk_level",
                            "recommended_action"
                        ]
                    }
                }
            },
            "required": ["market_summary", "overall_bias", "overall_confidence", "predictions"]
        }

        model_to_use = self.model_name
        response = None
        try:
            response = client.models.generate_content(
                model=model_to_use,
                contents=user_prompt,
                config=types.GenerateContentConfig(
                    system_instruction=system_instruction,
                    response_mime_type="application/json",
                    response_json_schema=schema,
                    temperature=0.15,
                )
            )
        except Exception as e:
            if "3.7" in model_to_use:
                model_to_use = "gemini-2.5-flash"
                response = client.models.generate_content(
                    model=model_to_use,
                    contents=user_prompt,
                    config=types.GenerateContentConfig(
                        system_instruction=system_instruction,
                        response_mime_type="application/json",
                        response_json_schema=schema,
                        temperature=0.15,
                    )
                )
            else:
                raise e

        if not response or not response.text:
            raise ValueError("Gemini returned empty response text")

        data = json.loads(response.text)
        predictions_raw = data.get("predictions", [])
        parsed_predictions: List[LLMHorizonPrediction] = []

        label_map = {
            "30m": "30 Minutes",
            "1h": "1 Hour",
            "4h": "4 Hours",
            "1d": "1 Day"
        }

        for item in predictions_raw:
            hz = item.get("horizon", "1h")
            pred_price = float(item.get("predicted_price", p))
            change_pct = round(((pred_price - p) / p) * 100, 2)
            parsed_predictions.append(
                LLMHorizonPrediction(
                    horizon=hz,
                    horizon_label=label_map.get(hz, hz),
                    predicted_price=round(pred_price, 2),
                    expected_change_pct=change_pct,
                    direction=item.get("direction", "NEUTRAL"),
                    confidence=max(10, min(99, int(item.get("confidence", 70)))),
                    price_range_low=round(float(item.get("price_range_low", pred_price * 0.99)), 2),
                    price_range_high=round(float(item.get("price_range_high", pred_price * 1.01)), 2),
                    reasoning=item.get("reasoning", ""),
                    key_factors=item.get("key_factors", []),
                    risk_level=item.get("risk_level", "MEDIUM"),
                    recommended_action=item.get("recommended_action", "HOLD"),
                )
            )

        present_horizons = {x.horizon for x in parsed_predictions}
        for cfg in HORIZONS_CONFIG:
            if cfg["horizon"] not in present_horizons:
                parsed_predictions.append(
                    self._generate_single_deterministic_horizon(
                        hz_cfg=cfg,
                        p=p,
                        context_dict=context_dict
                    )
                )

        parsed_predictions.sort(key=lambda x: [c["horizon"] for c in HORIZONS_CONFIG].index(x.horizon) if x.horizon in [c["horizon"] for c in HORIZONS_CONFIG] else 99)

        return LLMPredictionResult(
            symbol=symbol,
            current_price=p,
            model_used=f"Google Gemini ({model_to_use}) Cognitive Prediction Engine",
            market_summary=data.get("market_summary", "Multi-factor quantitative consensus established."),
            overall_bias=data.get("overall_bias", "NEUTRAL"),
            overall_confidence=max(10, min(99, int(data.get("overall_confidence", 70)))),
            predictions=parsed_predictions,
            context_used=context_dict,
        )

    def _predict_deterministic(
        self,
        symbol: str,
        ticker: Ticker,
        indicators: Optional[TechnicalIndicators],
        microstructure: Optional[MicrostructureMetrics],
        sentiment: Optional[SentimentMetrics],
        monthly_context: Optional[MonthlyContext],
        derivatives: Optional[Any],
        onchain: Optional[Any],
        context_dict: Dict[str, Any],
    ) -> LLMPredictionResult:
        p = ticker.price
        predictions: List[LLMHorizonPrediction] = []

        tech_score = 0.0
        if indicators:
            if indicators.trend_state == "BULLISH": tech_score += 0.3
            elif indicators.trend_state == "BEARISH": tech_score -= 0.3
            if indicators.rsi is not None:
                if indicators.rsi < 35: tech_score += 0.25
                elif indicators.rsi > 65: tech_score -= 0.25
            if indicators.macd_hist is not None:
                tech_score += max(-0.2, min(0.2, indicators.macd_hist * 0.05))

        micro_score = 0.0
        if microstructure:
            micro_score += microstructure.order_book_imbalance * 0.3
            if microstructure.cvd_side == "BUY_DOMINANT": micro_score += 0.2
            elif microstructure.cvd_side == "SELL_DOMINANT": micro_score -= 0.2

        deriv_score = 0.0
        if derivatives:
            fb = getattr(derivatives, "funding_bias", "NEUTRAL")
            if fb == "SHORT_CROWDED": deriv_score += 0.3
            elif fb == "LONG_CROWDED": deriv_score -= 0.2

        sent_score = 0.0
        if sentiment:
            sent_score = sentiment.overall_sentiment_score * 0.25

        macro_score = 0.0
        if monthly_context:
            if monthly_context.monthly_trend == "MACRO_BULLISH": macro_score += 0.2
            elif monthly_context.monthly_trend == "MACRO_BEARISH": macro_score -= 0.2

        composite_score = tech_score * 0.3 + micro_score * 0.25 + deriv_score * 0.2 + sent_score * 0.15 + macro_score * 0.1
        composite_score = max(-1.0, min(1.0, composite_score))

        overall_bias = "BULLISH" if composite_score > 0.12 else ("BEARISH" if composite_score < -0.12 else "NEUTRAL")
        overall_conf = int(60 + abs(composite_score) * 30)

        for cfg in HORIZONS_CONFIG:
            predictions.append(
                self._generate_single_deterministic_horizon(
                    hz_cfg=cfg,
                    p=p,
                    context_dict=context_dict,
                    composite_score=composite_score
                )
            )

        summary_adjective = "bullish momentum" if overall_bias == "BULLISH" else ("bearish consolidation" if overall_bias == "BEARISH" else "range-bound mean reversion")
        market_summary = (
            f"{symbol} exhibits {summary_adjective} at ${p:,.2f} driven by {context_dict['microstructure']['order_flow_signal']} order flow, "
            f"a {context_dict['derivatives']['funding_bias'].lower().replace('_', ' ')} derivatives backdrop, "
            f"and {context_dict['sentiment']['label'].lower()} news sentiment."
        )

        return LLMPredictionResult(
            symbol=symbol,
            current_price=p,
            model_used="Quantitative Confluence Engine (Deterministic Forecaster)",
            market_summary=market_summary,
            overall_bias=overall_bias,
            overall_confidence=overall_conf,
            predictions=predictions,
            context_used=context_dict,
        )

    def _generate_single_deterministic_horizon(
        self,
        hz_cfg: Dict[str, Any],
        p: float,
        context_dict: Dict[str, Any],
        composite_score: float = 0.0,
    ) -> LLMHorizonPrediction:
        minutes = hz_cfg["minutes"]
        hz = hz_cfg["horizon"]

        vol_factor = math.sqrt(minutes / 1440.0) * 0.025
        drift_pct = composite_score * vol_factor * 1.5
        pred_price = round(p * (1.0 + drift_pct), 2)
        change_pct = round(drift_pct * 100, 2)

        band = p * vol_factor * 1.2
        low = round(pred_price - band, 2)
        high = round(pred_price + band, 2)

        direction = "BULLISH" if drift_pct > 0.001 else ("BEARISH" if drift_pct < -0.001 else "NEUTRAL")
        confidence = max(50, min(95, int(hz_cfg["default_conf"] + abs(composite_score) * 15)))

        factors = [
            f"Order flow: {context_dict['microstructure']['order_flow_signal']}",
            f"RSI: {context_dict['technical']['rsi']} ({context_dict['technical']['rsi_state']})",
            f"Funding rate: {context_dict['derivatives']['funding_rate_annualized_pct']:+.1f}% ann.",
        ]

        if hz == "30m":
            reasoning = f"Intraday microstructure shows {context_dict['microstructure']['cvd_side'].lower().replace('_', ' ')} tape velocity with order book imbalance at {context_dict['microstructure']['imbalance']:+.2f}."
            action = "BUY" if direction == "BULLISH" and confidence > 70 else ("SELL" if direction == "BEARISH" and confidence > 70 else "WAIT")
            risk = "LOW"
        elif hz == "1h":
            reasoning = f"One-hour momentum leans {direction.lower()} toward ${pred_price:,.2f} supported by VWAP at ${context_dict['technical']['vwap']:,.2f} and {context_dict['sentiment']['label'].lower()} catalyst absorption."
            action = "BUY" if direction == "BULLISH" else ("SELL" if direction == "BEARISH" else "HOLD")
            risk = "MEDIUM"
        elif hz == "4h":
            reasoning = f"Four-hour session trajectory tests liquidity corridors between ${low:,.2f} and ${high:,.2f} anchored by {context_dict['derivatives']['funding_bias'].lower()} positioning."
            action = "HOLD" if abs(change_pct) < 0.5 else ("BUY" if direction == "BULLISH" else "SELL")
            risk = "HIGH"
        else:
            reasoning = f"Daily horizon aligns with the 30-day {context_dict['monthly_macro']['monthly_trend'].lower().replace('_', ' ')} regime targeting ${pred_price:,.2f}."
            action = "HOLD" if confidence < 75 else ("BUY" if direction == "BULLISH" else "SELL")
            risk = "MEDIUM"

        return LLMHorizonPrediction(
            horizon=hz,
            horizon_label=hz_cfg["label"],
            predicted_price=pred_price,
            expected_change_pct=change_pct,
            direction=direction,
            confidence=confidence,
            price_range_low=low,
            price_range_high=high,
            reasoning=reasoning,
            key_factors=factors,
            risk_level=risk,
            recommended_action=action,
        )

llm_predictor = LLMPredictorService()
