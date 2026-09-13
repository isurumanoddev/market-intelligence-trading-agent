import asyncio
from typing import Optional, Dict, Any
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from app.config import settings
from app.services.market_service import market_service
from app.services.news_service import news_service
from app.services.technical_analysis import technical_analyzer
from app.services.paper_broker import paper_broker
from app.services.forecasting_service import forecasting_service
from app.agents.sentiment_agent import sentiment_agent
from app.agents.master_trading_agent import master_trading_agent
from app.services.derivatives_service import derivatives_service
from app.services.onchain_service import onchain_service
from app.services.coinglass_service import coinglass_service
from app.services.backtest_engine import backtest_engine, BacktestRequest
from app.services.trading_bot import trading_bot
from app.services.telegram_service import telegram_service
from app.services.llm_predictor import llm_predictor
from app.services.tradingview_service import tradingview_service

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
    coinglass_api_key: Optional[str] = None
    telegram_bot_token: Optional[str] = None
    telegram_chat_id: Optional[str] = None
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

@router.get("/market/forecast")
async def get_price_forecast(
    symbol: str = Query(default="BTC/USDT"),
    horizon: int = Query(default=30, le=60)
):
    try:
        (
            ticker_res,
            candles_1d_res,
            raw_news_res,
            order_book_res,
            trades_res,
            derivatives_res,
            onchain_res
        ) = await asyncio.gather(
            asyncio.to_thread(market_service.get_ticker, symbol),
            asyncio.to_thread(market_service.get_ohlcv, symbol, "1d", 60),
            asyncio.to_thread(news_service.get_news_for_symbol, symbol, 20),
            asyncio.to_thread(market_service.get_order_book, symbol, 20),
            asyncio.to_thread(market_service.get_recent_trades, symbol, 30),
            asyncio.to_thread(derivatives_service.get_derivatives_data, symbol),
            asyncio.to_thread(onchain_service.get_onchain_data),
            return_exceptions=True
        )

        ticker = ticker_res if not isinstance(ticker_res, Exception) else market_service._generate_fallback_ticker(symbol)
        candles_1d = candles_1d_res if not isinstance(candles_1d_res, Exception) else market_service._generate_fallback_candles(symbol, "1d", 60)
        raw_news = raw_news_res if not isinstance(raw_news_res, Exception) else []
        order_book = order_book_res if not isinstance(order_book_res, Exception) else market_service._generate_fallback_order_book(symbol)
        trades = trades_res if not isinstance(trades_res, Exception) else []
        derivatives_data = derivatives_res if not isinstance(derivatives_res, Exception) else None
        onchain_data = onchain_res if not isinstance(onchain_res, Exception) else None

        monthly_context = technical_analyzer.calculate_monthly_context(candles_1d, ticker.price)
        sentiment_metrics, _ = sentiment_agent.analyze(symbol, raw_news)
        microstructure = technical_analyzer.analyze_microstructure(order_book, trades)

        return forecasting_service.generate_forecast(
            symbol=symbol,
            current_price=ticker.price,
            candles_1d=candles_1d,
            microstructure=microstructure,
            sentiment=sentiment_metrics,
            monthly_context=monthly_context,
            derivatives=derivatives_data,
            onchain=onchain_data,
            horizon_days=horizon
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/market/llm-predict")
async def get_llm_market_prediction(
    symbol: str = Query(default="BTC/USDT"),
    bypass_cache: bool = Query(default=False)
):
    """
    Dedicated LLM Market Prediction endpoint:
    Uses Gemini 3.7 Flash to analyze real-time multi-source market telemetry
    and produce high-conviction predictions across 30m, 1h, 4h, and 1d horizons
    with structural natural language rationale and tactical action recommendations.
    """
    try:
        (
            ticker_res,
            candles_1h_res,
            candles_1d_res,
            raw_news_res,
            order_book_res,
            trades_res,
            derivatives_res,
            onchain_res
        ) = await asyncio.gather(
            asyncio.to_thread(market_service.get_ticker, symbol),
            asyncio.to_thread(market_service.get_ohlcv, symbol, "1h", 60),
            asyncio.to_thread(market_service.get_ohlcv, symbol, "1d", 45),
            asyncio.to_thread(news_service.get_news_for_symbol, symbol, 20),
            asyncio.to_thread(market_service.get_order_book, symbol, 20),
            asyncio.to_thread(market_service.get_recent_trades, symbol, 30),
            asyncio.to_thread(derivatives_service.get_derivatives_data, symbol),
            asyncio.to_thread(onchain_service.get_onchain_data),
            return_exceptions=True
        )

        ticker = ticker_res if not isinstance(ticker_res, Exception) else market_service._generate_fallback_ticker(symbol)
        candles_1h = candles_1h_res if not isinstance(candles_1h_res, Exception) else market_service._generate_fallback_candles(symbol, "1h", 60)
        candles_1d = candles_1d_res if not isinstance(candles_1d_res, Exception) else market_service._generate_fallback_candles(symbol, "1d", 45)
        raw_news = raw_news_res if not isinstance(raw_news_res, Exception) else []
        order_book = order_book_res if not isinstance(order_book_res, Exception) else market_service._generate_fallback_order_book(symbol)
        trades = trades_res if not isinstance(trades_res, Exception) else []
        derivatives_data = derivatives_res if not isinstance(derivatives_res, Exception) else None
        onchain_data = onchain_res if not isinstance(onchain_res, Exception) else None

        indicators = technical_analyzer.calculate_indicators(candles_1h)
        microstructure = technical_analyzer.analyze_microstructure(order_book, trades)
        monthly_context = technical_analyzer.calculate_monthly_context(candles_1d, ticker.price)
        sentiment_metrics, _ = sentiment_agent.analyze(symbol, raw_news)

        prediction_result = await asyncio.to_thread(
            llm_predictor.predict,
            symbol=symbol,
            ticker=ticker,
            indicators=indicators,
            microstructure=microstructure,
            sentiment=sentiment_metrics,
            monthly_context=monthly_context,
            derivatives=derivatives_data,
            onchain=onchain_data,
            bypass_cache=bypass_cache
        )

        return prediction_result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"LLM prediction pipeline error: {str(e)}")


@router.get("/market/derivatives")
async def get_derivatives(symbol: str = Query(default="BTC/USDT")):
    try:
        return derivatives_service.get_derivatives_data(symbol)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/market/onchain")
async def get_onchain():
    try:
        return onchain_service.get_onchain_data()
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/market/coinglass")
async def get_coinglass(symbol: str = Query(default="BTC")):
    try:
        if not coinglass_service.is_available():
            raise HTTPException(status_code=404, detail="CoinGlass API key not configured")
        data = coinglass_service.get_coinglass_data(symbol)
        if not data:
            raise HTTPException(status_code=404, detail="Data not found or error")
        return data
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/analysis")
async def get_full_analysis(symbol: str = Query(default="BTC/USDT")):
    """
    Comprehensive pipeline endpoint: Fetches real-time price, order book, trade tape,
    30-day historical macro data, computes quant indicators, generates AI price forecast,
    analyzes news sentiment & catalysts, and runs the AI Master Trading Decision Agent.
    """
    try:
        (
            ticker_res,
            order_book_res,
            trades_res,
            candles_res,
            candles_1d_res,
            raw_news_res,
            derivatives_res,
            onchain_res,
        ) = await asyncio.gather(
            asyncio.to_thread(market_service.get_ticker, symbol),
            asyncio.to_thread(market_service.get_order_book, symbol, 25),
            asyncio.to_thread(market_service.get_recent_trades, symbol, 50),
            asyncio.to_thread(market_service.get_ohlcv, symbol, "1h", 60),
            asyncio.to_thread(market_service.get_ohlcv, symbol, "1d", 45),
            asyncio.to_thread(news_service.get_news_for_symbol, symbol, 25),
            asyncio.to_thread(derivatives_service.get_derivatives_data, symbol),
            asyncio.to_thread(onchain_service.get_onchain_data),
            return_exceptions=True
        )

        ticker = ticker_res if not isinstance(ticker_res, Exception) else market_service._generate_fallback_ticker(symbol)
        order_book = order_book_res if not isinstance(order_book_res, Exception) else market_service._generate_fallback_order_book(symbol)
        trades = trades_res if not isinstance(trades_res, Exception) else market_service._generate_fallback_trades(symbol)
        candles = candles_res if not isinstance(candles_res, Exception) else market_service._generate_fallback_candles(symbol, "1h", 60)
        candles_1d = candles_1d_res if not isinstance(candles_1d_res, Exception) else market_service._generate_fallback_candles(symbol, "1d", 45)
        raw_news = raw_news_res if not isinstance(raw_news_res, Exception) else []
        derivatives_data = derivatives_res if not isinstance(derivatives_res, Exception) else None
        onchain_data = onchain_res if not isinstance(onchain_res, Exception) else None

        indicators = technical_analyzer.calculate_indicators(candles)
        microstructure = technical_analyzer.analyze_microstructure(order_book, trades)
        monthly_context = technical_analyzer.calculate_monthly_context(candles_1d, ticker.price)
        sentiment_metrics, scored_news = sentiment_agent.analyze(symbol, raw_news)

        coinglass_data = None
        if coinglass_service.is_available():
            try:
                base_sym = symbol.split('/')[0]
                coinglass_data = coinglass_service.get_coinglass_data(base_sym)
            except Exception:
                pass

        # Generate State-of-the-Art Hybrid Neural-Cognitive 30-day price forecast
        forecast = forecasting_service.generate_forecast(
            symbol=symbol,
            current_price=ticker.price,
            candles_1d=candles_1d,
            indicators=indicators,
            microstructure=microstructure,
            sentiment=sentiment_metrics,
            monthly_context=monthly_context,
            derivatives=derivatives_data,
            onchain=onchain_data,
            horizon_days=30
        )

        decision = master_trading_agent.evaluate(
            symbol=symbol,
            ticker=ticker,
            indicators=indicators,
            microstructure=microstructure,
            sentiment=sentiment_metrics,
            news_items=scored_news,
            monthly_context=monthly_context,
            price_forecast=forecast,
            derivatives=derivatives_data,
            onchain=onchain_data,
            coinglass=coinglass_data
        )

        return {
            "symbol": symbol,
            "ticker": ticker,
            "order_book": order_book,
            "trades": trades[:25],
            "indicators": indicators,
            "microstructure": microstructure,
            "monthly_context": monthly_context,
            "derivatives": derivatives_data,
            "onchain": onchain_data,
            "coinglass": coinglass_data,
            "price_forecast": forecast,
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
        "has_coinglass_key": bool(settings.coinglass_api_key),
        "coinglass_key_masked": f"{settings.coinglass_api_key[:4]}...{settings.coinglass_api_key[-4:]}" if len(settings.coinglass_api_key) > 8 else ("Configured" if settings.coinglass_api_key else "Not configured"),
        "has_telegram": telegram_service.is_configured(),
        "telegram_chat_id_masked": f"...{settings.telegram_chat_id[-4:]}" if len(settings.telegram_chat_id) > 4 else ("Configured" if settings.telegram_chat_id else "Not configured"),
        "default_exchange": settings.default_exchange,
        "default_symbols": settings.default_symbols,
        "max_risk_per_trade_pct": settings.max_risk_per_trade_pct,
        "max_spread_pct": settings.max_spread_pct
    }

@router.post("/settings")
async def update_settings(req: SettingsUpdateRequest):
    if req.gemini_api_key is not None:
        settings.gemini_api_key = req.gemini_api_key.strip()
    if req.coinglass_api_key is not None:
        settings.coinglass_api_key = req.coinglass_api_key.strip()
    if req.telegram_bot_token is not None:
        settings.telegram_bot_token = req.telegram_bot_token.strip()
    if req.telegram_chat_id is not None:
        settings.telegram_chat_id = req.telegram_chat_id.strip()
    if req.default_exchange is not None:
        settings.default_exchange = req.default_exchange.strip().lower()
    if req.max_risk_per_trade_pct is not None:
        settings.max_risk_per_trade_pct = req.max_risk_per_trade_pct
    if req.max_spread_pct is not None:
        settings.max_spread_pct = req.max_spread_pct
    return {"status": "success", "settings": await get_settings()}

# ------------------ Backtesting Engine API (Stage 1) ------------------

@router.post("/backtest/run")
async def run_backtest(req: BacktestRequest):
    try:
        res = await asyncio.to_thread(backtest_engine.run_backtest, req)
        return res
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# ------------------ Autonomous Trading Bot API (Stage 2, 3 & 4) ------------------

@router.get("/bot/status")
async def get_bot_status():
    return trading_bot.get_status()

@router.post("/bot/start")
async def start_bot():
    return await trading_bot.start()

@router.post("/bot/pause")
async def pause_bot():
    return trading_bot.pause()

@router.post("/bot/resume")
async def resume_bot():
    return trading_bot.resume()

@router.post("/bot/stop")
async def stop_bot():
    return trading_bot.stop()

@router.post("/bot/config")
async def update_bot_config(config_data: Dict[str, Any]):
    cfg = trading_bot.update_config(config_data)
    return {"status": "success", "config": cfg.model_dump()}

@router.post("/bot/emergency-stop")
async def emergency_stop_bot():
    return trading_bot.emergency_stop_and_liquidate()

class TelegramTestRequest(BaseModel):
    token: Optional[str] = None
    chat_id: Optional[str] = None

@router.post("/bot/telegram-test")
async def test_telegram_notification(req: TelegramTestRequest):
    success = telegram_service.send_message(
        "🚀 *Market Intelligence Bot Connected!*\n\nThis is a verification test from your Autonomous Crypto Trading Terminal.",
        token=req.token,
        chat_id=req.chat_id
    )
    return {"success": success}


# ------------------ TradingView UDF Compatible API ------------------

@router.get("/tradingview/config")
async def get_tradingview_config():
    """TradingView UDF /config endpoint."""
    return tradingview_service.get_config()

@router.get("/tradingview/time")
async def get_tradingview_time():
    """TradingView UDF /time endpoint."""
    return tradingview_service.get_time()

@router.get("/tradingview/symbols")
async def resolve_tradingview_symbol(symbol: str = Query("BTC/USDT")):
    """TradingView UDF /symbols endpoint."""
    return tradingview_service.resolve_symbol(symbol)

@router.get("/tradingview/search")
async def search_tradingview_symbols(query: str = Query(""), limit: int = Query(30)):
    """TradingView UDF /search endpoint."""
    return tradingview_service.search_symbols(query, limit)

@router.get("/tradingview/history")
async def get_tradingview_history(
    symbol: str = Query("BTC/USDT"),
    resolution: str = Query("60"),
    from_ts: Optional[int] = Query(None, alias="from"),
    to_ts: Optional[int] = Query(None, alias="to")
):
    """TradingView UDF /history endpoint."""
    return await asyncio.to_thread(
        tradingview_service.get_history,
        symbol=symbol,
        resolution=resolution,
        from_ts=from_ts,
        to_ts=to_ts
    )
