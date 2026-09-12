from typing import Optional, Dict, Any
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from app.config import settings
from app.services.market_service import market_service
from app.services.news_service import news_service
from app.services.technical_analysis import technical_analyzer
from app.services.paper_broker import paper_broker
from app.agents.sentiment_agent import sentiment_agent
from app.agents.master_trading_agent import master_trading_agent

router = APIRouter()

class TradeOrderRequest(BaseModel):
    symbol: str
    side: str
    price: float
    amount: float
    stop_loss: Optional[float] = None
    take_profit: Optional[float] = None
    reason: str = "Manual / Agent Signal"

class ClosePositionRequest(BaseModel):
    position_id: str
    current_price: float
    reason: str = "Manual Close"

class SettingsUpdateRequest(BaseModel):
    gemini_api_key: Optional[str] = None
    default_exchange: Optional[str] = None
    max_risk_per_trade_pct: Optional[float] = None
    max_spread_pct: Optional[float] = None

@router.get("/market/ticker")
async def get_ticker(symbol: str = Query(default="BTC/USDT")):
    try:
        return market_service.get_ticker(symbol)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/market/orderbook")
async def get_order_book(symbol: str = Query(default="BTC/USDT"), limit: int = Query(default=20, le=50)):
    try:
        return market_service.get_order_book(symbol, limit=limit)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/market/trades")
async def get_trades(symbol: str = Query(default="BTC/USDT"), limit: int = Query(default=50, le=100)):
    try:
        return market_service.get_recent_trades(symbol, limit=limit)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/market/candles")
async def get_candles(
    symbol: str = Query(default="BTC/USDT"),
    timeframe: str = Query(default="1h"),
    limit: int = Query(default=60, le=200)
):
    try:
        # Map 30D / 1M timeframe to daily candles with 35-candle lookback
        tf = timeframe
        lim = limit
        if timeframe.lower() in ["30d", "1m"]:
            tf = "1d"
            lim = max(limit, 35)
        return market_service.get_ohlcv(symbol, timeframe=tf, limit=lim)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/news")
async def get_news(symbol: str = Query(default="BTC/USDT"), limit: int = Query(default=25, le=50)):
    try:
        items = news_service.get_news_for_symbol(symbol, limit=limit)
        sentiment_metrics, updated_items = sentiment_agent.analyze(symbol, items)
        return {
            "metrics": sentiment_metrics,
            "news": updated_items
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/analysis")
async def get_full_analysis(symbol: str = Query(default="BTC/USDT")):
    """
    Comprehensive pipeline endpoint: Fetches real-time price, order book, trade tape,
    30-day historical macro data, computes quant indicators, analyzes news sentiment & catalysts,
    and runs the AI Master Trading Decision Agent.
    """
    try:
        ticker = market_service.get_ticker(symbol)
        order_book = market_service.get_order_book(symbol, limit=25)
        trades = market_service.get_recent_trades(symbol, limit=50)
        candles = market_service.get_ohlcv(symbol, timeframe="1h", limit=60)
        
        # Ingest 30-day daily candles for macro historical context
        candles_1d = market_service.get_ohlcv(symbol, timeframe="1d", limit=35)
        
        indicators = technical_analyzer.calculate_indicators(candles)
        microstructure = technical_analyzer.analyze_microstructure(order_book, trades)
        monthly_context = technical_analyzer.calculate_monthly_context(candles_1d, ticker.price)
        
        raw_news = news_service.get_news_for_symbol(symbol, limit=25)
        sentiment_metrics, scored_news = sentiment_agent.analyze(symbol, raw_news)
        
        decision = master_trading_agent.evaluate(
            symbol=symbol,
            ticker=ticker,
            indicators=indicators,
            microstructure=microstructure,
            sentiment=sentiment_metrics,
            news_items=scored_news,
            monthly_context=monthly_context
        )

        return {
            "symbol": symbol,
            "ticker": ticker,
            "order_book": order_book,
            "trades": trades[:25],
            "indicators": indicators,
            "microstructure": microstructure,
            "monthly_context": monthly_context,
            "sentiment": sentiment_metrics,
            "news": scored_news[:15],
            "decision": decision
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis pipeline error: {str(e)}")

@router.get("/portfolio")
async def get_portfolio():
    # Update current prices for open positions
    prices = {}
    for pos in paper_broker.positions.values():
        try:
            t = market_service.get_ticker(pos.symbol)
            prices[pos.symbol] = t.price
        except Exception:
            pass
    return paper_broker.get_portfolio_state(prices)

@router.post("/portfolio/trade")
async def execute_trade(req: TradeOrderRequest):
    try:
        pos = paper_broker.execute_order(
            symbol=req.symbol,
            side=req.side,
            price=req.price,
            amount=req.amount,
            stop_loss=req.stop_loss,
            take_profit=req.take_profit,
            reason=req.reason
        )
        return {"status": "success", "position": pos}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/portfolio/close")
async def close_position(req: ClosePositionRequest):
    try:
        trade = paper_broker.close_position(
            position_id=req.position_id,
            current_price=req.current_price,
            reason=req.reason
        )
        return {"status": "success", "trade": trade}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/portfolio/reset")
async def reset_portfolio(initial_cash: Optional[float] = None):
    paper_broker.reset(initial_cash)
    return {"status": "success", "message": "Portfolio reset"}

@router.get("/settings")
async def get_settings():
    return {
        "has_gemini_key": bool(settings.gemini_api_key),
        "gemini_key_masked": f"{settings.gemini_api_key[:4]}...{settings.gemini_api_key[-4:]}" if len(settings.gemini_api_key) > 8 else ("Configured" if settings.gemini_api_key else "Not configured"),
        "default_exchange": settings.default_exchange,
        "default_symbols": settings.default_symbols,
        "max_risk_per_trade_pct": settings.max_risk_per_trade_pct,
        "max_spread_pct": settings.max_spread_pct
    }

@router.post("/settings")
async def update_settings(req: SettingsUpdateRequest):
    if req.gemini_api_key is not None:
        settings.gemini_api_key = req.gemini_api_key.strip()
    if req.default_exchange is not None:
        settings.default_exchange = req.default_exchange.strip().lower()
    if req.max_risk_per_trade_pct is not None:
        settings.max_risk_per_trade_pct = req.max_risk_per_trade_pct
    if req.max_spread_pct is not None:
        settings.max_spread_pct = req.max_spread_pct
    return {"status": "success", "settings": await get_settings()}
