import os
import json
from typing import List, Tuple
from app.models.market_data import NewsItem
from app.models.decision import SentimentMetrics
from app.config import settings

# Financial Lexicon for heuristic fallback
BULLISH_KEYWORDS = [
    "surge", "rally", "skyrocket", "gain", "breakout", "all-time high", "ath", "bull", "bullish",
    "approval", "approved", "etf", "partnership", "adoption", "inflows", "accumulation", "buy",
    "profit", "expansion", "upgrade", "milestone", "revenue jump", "rate cut", "treasury", "growth"
]

BEARISH_KEYWORDS = [
    "crash", "plunge", "drop", "dump", "fall", "bear", "bearish", "loss", "decline", "hack",
    "exploit", "sec", "lawsuit", "crackdown", "ban", "outflows", "selloff", "liquidation",
    "fraud", "investigation", "tariff", "inflation", "rate hike", "recession", "downward", "bankrupt"
]

CATALYST_KEYWORDS = {
    "REGULATORY": ["sec", "regulator", "court", "lawsuit", "cftc", "compliance", "ban", "legal", "bill", "congress"],
    "MACRO": ["fed", "inflation", "cpi", "rate cut", "rate hike", "tariff", "gdp", "jobs report", "treasury"],
    "TECH": ["upgrade", "mainnet", "hard fork", "layer 2", "protocol", "algorithm", "developer", "release"],
    "ADOPTION": ["etf", "institutional", "bank", "treasury", "payment", "merchant", "integration", "enterprise"],
    "SECURITY": ["hack", "exploit", "stolen", "vulnerability", "phishing", "breach", "scam"]
}

class SentimentAgent:
    def __init__(self):
        self.model_name = "gemini-2.5-flash"

    def analyze(self, symbol: str, news_items: List[NewsItem]) -> Tuple[SentimentMetrics, List[NewsItem]]:
        if not news_items:
            return SentimentMetrics(), []

        api_key = settings.gemini_api_key or os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")

        if api_key:
            try:
                return self._analyze_with_gemini(symbol, news_items, api_key)
            except Exception as e:
                print(f"Gemini sentiment analysis failed, falling back to heuristic: {e}")
                return self._analyze_heuristic(symbol, news_items)
        else:
            return self._analyze_heuristic(symbol, news_items)

    def _analyze_with_gemini(self, symbol: str, news_items: List[NewsItem], api_key: str) -> Tuple[SentimentMetrics, List[NewsItem]]:
        from google import genai
        from google.genai import types

        client = genai.Client(api_key=api_key)

        # Prepare headlines and summaries for top 10 items
        items_payload = [
            {"id": item.id, "title": item.title, "summary": item.summary, "source": item.source}
            for item in news_items[:10]
        ]

        prompt = f"""
You are a senior financial sentiment analyst. Analyze the following news headlines and summaries for the asset '{symbol}'.

Evaluate each article and provide:
1. Item-level sentiment score between -1.0 (extremely bearish) and +1.0 (extremely bullish).
2. Sentiment label: 'BULLISH', 'BEARISH', or 'NEUTRAL'.
3. Catalyst type: 'REGULATORY', 'MACRO', 'TECH', 'ADOPTION', 'SECURITY', or 'GENERAL'.
4. Overall market sentiment score (-1.0 to 1.0) and label.
5. Top 3 primary market drivers/catalysts currently affecting this asset.
6. A concise 1-2 sentence executive summary of the narrative.

News items:
{json.dumps(items_payload, indent=2)}
"""

        schema = {
            "type": "OBJECT",
            "properties": {
                "overall_sentiment_score": {"type": "NUMBER"},
                "overall_sentiment_label": {"type": "STRING", "enum": ["BULLISH", "BEARISH", "NEUTRAL"]},
                "dominant_narrative": {"type": "STRING"},
                "top_catalysts": {
                    "type": "ARRAY",
                    "items": {"type": "STRING"}
                },
                "item_evaluations": {
                    "type": "ARRAY",
                    "items": {
                        "type": "OBJECT",
                        "properties": {
                            "id": {"type": "STRING"},
                            "sentiment_score": {"type": "NUMBER"},
                            "sentiment_label": {"type": "STRING", "enum": ["BULLISH", "BEARISH", "NEUTRAL"]},
                            "catalyst_type": {"type": "STRING"}
                        },
                        "required": ["id", "sentiment_score", "sentiment_label", "catalyst_type"]
                    }
                }
            },
            "required": ["overall_sentiment_score", "overall_sentiment_label", "dominant_narrative", "top_catalysts", "item_evaluations"]
        }

        response = client.models.generate_content(
            model=self.model_name,
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_json_schema=schema,
                temperature=0.2
            )
        )

        data = json.loads(response.text)
        eval_map = {item["id"]: item for item in data.get("item_evaluations", [])}

        updated_items: List[NewsItem] = []
        bullish_count = 0
        bearish_count = 0

        for item in news_items:
            ev = eval_map.get(item.id)
            if ev:
                score = round(float(ev.get("sentiment_score", 0.0)), 2)
                label = ev.get("sentiment_label", "NEUTRAL")
                catalyst = ev.get("catalyst_type", "GENERAL")
                if label == "BULLISH":
                    bullish_count += 1
                elif label == "BEARISH":
                    bearish_count += 1
                updated_items.append(item.model_copy(update={
                    "sentiment_score": score,
                    "sentiment_label": label,
                    "catalyst_type": catalyst
                }))
            else:
                updated_items.append(item)

        metrics = SentimentMetrics(
            overall_sentiment_score=round(float(data.get("overall_sentiment_score", 0.0)), 2),
            overall_sentiment_label=data.get("overall_sentiment_label", "NEUTRAL"),
            total_news_items=len(news_items),
            bullish_items=bullish_count,
            bearish_items=bearish_count,
            top_catalysts=data.get("top_catalysts", []),
            dominant_narrative=data.get("dominant_narrative", "Normal market conditions")
        )

        return metrics, updated_items

    def _analyze_heuristic(self, symbol: str, news_items: List[NewsItem]) -> Tuple[SentimentMetrics, List[NewsItem]]:
        updated_items: List[NewsItem] = []
        scores: List[float] = []
        bullish_count = 0
        bearish_count = 0
        detected_catalysts = set()

        for item in news_items:
            text = f"{item.title} {item.summary}".lower()
            
            # Count bullish vs bearish words
            bull_hits = sum(1 for kw in BULLISH_KEYWORDS if kw in text)
            bear_hits = sum(1 for kw in BEARISH_KEYWORDS if kw in text)

            raw_score = 0.0
            if bull_hits + bear_hits > 0:
                raw_score = (bull_hits - bear_hits) / max(bull_hits + bear_hits, 1)

            # Determine catalyst
            cat = "GENERAL"
            for c_name, c_keywords in CATALYST_KEYWORDS.items():
                if any(kw in text for kw in c_keywords):
                    cat = c_name
                    detected_catalysts.add(c_name)
                    break

            label = "NEUTRAL"
            if raw_score >= 0.2:
                label = "BULLISH"
                bullish_count += 1
            elif raw_score <= -0.2:
                label = "BEARISH"
                bearish_count += 1

            # Weight score by relevance
            item_score = round(raw_score * item.relevance_score, 2)
            scores.append(item_score)

            updated_items.append(item.model_copy(update={
                "sentiment_score": item_score,
                "sentiment_label": label,
                "catalyst_type": cat
            }))

        avg_score = round(float(sum(scores) / len(scores)), 2) if scores else 0.0
        if avg_score >= 0.15:
            overall_label = "BULLISH"
            narrative = f"Positive news sentiment and capital inflow momentum surrounding {symbol}."
        elif avg_score <= -0.15:
            overall_label = "BEARISH"
            narrative = f"Negative headlines and cautionary market tone putting downward pressure on {symbol}."
        else:
            overall_label = "NEUTRAL"
            narrative = f"Balanced news flow with mixed signals and moderate market catalysts for {symbol}."

        metrics = SentimentMetrics(
            overall_sentiment_score=avg_score,
            overall_sentiment_label=overall_label,
            total_news_items=len(news_items),
            bullish_items=bullish_count,
            bearish_items=bearish_count,
            top_catalysts=list(detected_catalysts)[:3] if detected_catalysts else ["MARKET_FLOW"],
            dominant_narrative=narrative
        )

        return metrics, updated_items

sentiment_agent = SentimentAgent()
