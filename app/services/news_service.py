import time
import re
import html
from typing import List, Optional
import feedparser
from app.models.market_data import NewsItem

# Major reputable financial and crypto RSS feeds
RSS_FEEDS = [
    {"source": "CoinDesk", "url": "https://coindesk.com/arc/outboundfeeds/rss/", "type": "crypto"},
    {"source": "Cointelegraph", "url": "https://cointelegraph.com/rss", "type": "crypto"},
    {"source": "Yahoo Finance", "url": "https://finance.yahoo.com/news/rssindex", "type": "macro"},
    {"source": "Decrypt", "url": "https://decrypt.co/feed", "type": "crypto"},
    {"source": "Bitcoin Magazine", "url": "https://bitcoinmagazine.com/feed", "type": "crypto"},
    {"source": "Blockworks", "url": "https://blockworks.co/feed", "type": "macro"},
]

class NewsService:
    def __init__(self):
        self._cache: List[NewsItem] = []
        self._last_fetch_time: float = 0.0
        self._cache_ttl_seconds: float = 300.0  # 5 minutes cache

    def _strip_html(self, text: str) -> str:
        if not text:
            return ""
        clean = re.sub(r"<[^>]+>", "", text)
        clean = html.unescape(clean)
        return clean.strip()

    def fetch_all_news(self, force_refresh: bool = False) -> List[NewsItem]:
        now = time.time()
        if not force_refresh and self._cache and (now - self._last_fetch_time < self._cache_ttl_seconds):
            return self._cache

        items: List[NewsItem] = []
        seen_titles = set()

        for feed_info in RSS_FEEDS:
            try:
                parsed = feedparser.parse(feed_info["url"])
                for entry in parsed.entries[:25]:
                    raw_title = entry.get("title", "")
                    title = self._strip_html(raw_title)
                    if not title or title in seen_titles:
                        continue
                    seen_titles.add(title)

                    raw_summary = entry.get("summary") or entry.get("description") or ""
                    summary = self._strip_html(raw_summary)[:350]
                    url = entry.get("link", "")
                    published = entry.get("published") or entry.get("updated") or "Recently"
                    
                    # Catalyst classification
                    combined_text = f"{title} {summary}".lower()
                    if any(k in combined_text for k in ["fed", "rate cut", "inflation", "cpi", "powell", "treasury", "macro", "yield", "gdp"]):
                        cat_type = "MACRO"
                    elif any(k in combined_text for k in ["sec", "lawsuit", "regulation", "bill", "court", "etf approval", "compliance", "gensler"]):
                        cat_type = "REGULATORY"
                    elif any(k in combined_text for k in ["hack", "exploit", "stolen", "vulnerability", "drain"]):
                        cat_type = "SECURITY"
                    elif any(k in combined_text for k in ["upgrade", "mainnet", "hard fork", "layer 2", "ai model", "chip"]):
                        cat_type = "TECH"
                    elif any(k in combined_text for k in ["partnership", "etf", "blackrock", "fidelity", "reserve", "treasury reserve"]):
                        cat_type = "ADOPTION"
                    else:
                        cat_type = "GENERAL"

                    item_id = f"news_{int(time.time())}_{len(items)}"
                    items.append(NewsItem(
                        id=item_id,
                        title=title,
                        summary=summary,
                        source=feed_info["source"],
                        url=url,
                        published_at=published,
                        sentiment_score=0.0,
                        sentiment_label="NEUTRAL",
                        catalyst_type=cat_type,
                        relevance_score=0.5
                    ))
            except Exception as e:
                print(f"Error fetching RSS {feed_info['url']}: {e}")

        if items:
            self._cache = items
            self._last_fetch_time = now

        return self._cache

    def get_news_for_symbol(self, symbol: str, limit: int = 25) -> List[NewsItem]:
        all_news = self.fetch_all_news()
        clean_sym = symbol.split("/")[0].upper() if "/" in symbol else symbol.upper()
        
        # Keyword mapping for crypto and stock assets
        symbol_keywords = {
            "BTC": ["bitcoin", "btc", "satoshi", "halving", "crypto"],
            "ETH": ["ethereum", "eth", "vitalik", "layer 2", "gas fees", "crypto"],
            "SOL": ["solana", "sol", "memecoin", "phantom", "crypto"],
            "XRP": ["ripple", "xrp", "sec"],
            "DOGE": ["doge", "dogecoin", "elon"],
            "AAPL": ["apple", "aapl", "iphone", "tim cook", "mac"],
            "NVDA": ["nvidia", "nvda", "ai chip", "blackwell", "jensen huang"],
            "TSLA": ["tesla", "tsla", "elon musk", "ev", "robotaxi"],
            "MSFT": ["microsoft", "msft", "azure", "copilot", "openai"],
            "SPY": ["s&p 500", "spy", "stock market", "fed", "interest rates", "inflation", "inflation report"],
        }

        keywords = symbol_keywords.get(clean_sym, [clean_sym.lower()])

        def score_relevance(item: NewsItem) -> float:
            content = f"{item.title} {item.summary}".lower()
            score = 0.2  # baseline
            for kw in keywords:
                if kw in content:
                    score += 0.4
            # Macro importance
            for macro_kw in ["fed", "inflation", "rate cut", "tariffs", "sec", "regulation", "etf", "liquidity"]:
                if macro_kw in content:
                    score += 0.15
            return min(score, 1.0)

        scored_items = []
        for item in all_news:
            rel = score_relevance(item)
            item_copy = item.model_copy(update={"relevance_score": round(rel, 2)})
            scored_items.append(item_copy)

        # Sort by relevance descending
        scored_items.sort(key=lambda x: x.relevance_score, reverse=True)
        return scored_items[:limit]

news_service = NewsService()
