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
from app.services.exchange_broker_service import exchange_broker_service
from app.services.coin_catalog_service import coin_catalog_service
from app.services.whatsapp_service import whatsapp_service
from app.services.entry_alert_watcher import entry_alert_watcher

router = APIRouter()

class TradeOrderRequest(BaseModel):
    symbol: str
    side: str
    price: float
    amount: float
    leverage: float = 1.0
    stop_loss: Optional[float] = None
    take_profit: Optional[float] = None
    broker_type: str = "LOCAL"  # LOCAL, BINANCE_TESTNET, BYBIT_TESTNET
    reason: str = "Manual / Agent Signal"

class ClosePositionRequest(BaseModel):
    position_id: str
    current_price: float
    reason: str = "Manual Close"

class SettingsUpdateRequest(BaseModel):
    gemini_api_key: Optional[str] = None
    coinglass_api_key: Optional[str] = None
    binance_testnet_api_key: Optional[str] = None
    binance_testnet_secret: Optional[str] = None
    bybit_testnet_api_key: Optional[str] = None
    bybit_testnet_secret: Optional[str] = None
    telegram_bot_token: Optional[str] = None
    telegram_chat_id: Optional[str] = None
    default_exchange: Optional[str] = None
    max_risk_per_trade_pct: Optional[float] = None
    max_spread_pct: Optional[float] = None
    # WhatsApp Signal Alerts
    whatsapp_enabled: Optional[bool] = None
    whatsapp_provider: Optional[str] = None
    whatsapp_phone: Optional[str] = None
    whatsapp_callmebot_key: Optional[str] = None
    twilio_account_sid: Optional[str] = None
    twilio_auth_token: Optional[str] = None
    twilio_from_number: Optional[str] = None
    whatsapp_webhook_url: Optional[str] = None
    btc_alert_watcher_enabled: Optional[bool] = None

@router.get("/market/coins")
async def get_market_coins(
    category: Optional[str] = Query(default=None),
    search: Optional[str] = Query(default=None),
    sort_by: str = Query(default="rank"),
    limit: int = Query(default=100, ge=1, le=200)
):
    try:
        coins = coin_catalog_service.get_coins(
            category=category,
            search=search,
            sort_by=sort_by,
            limit=limit
        )
        return {
            "status": "success",
            "total": len(coins),
            "coins": coins
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/market/top-volume")
async def get_top_volume_coins(limit: int = Query(default=20, ge=1, le=50)):
    try:
        coins = coin_catalog_service.get_top_volume_coins(limit=limit)
        return {
            "status": "success",
            "total": len(coins),
            "coins": coins
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

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
            candles_15m_res,
            candles_4h_res,
            raw_news_res,
            derivatives_res,
            onchain_res,
        ) = await asyncio.gather(
            asyncio.to_thread(market_service.get_ticker, symbol),
            asyncio.to_thread(market_service.get_order_book, symbol, 25),
            asyncio.to_thread(market_service.get_recent_trades, symbol, 50),
            asyncio.to_thread(market_service.get_ohlcv, symbol, "1h", 60),
            asyncio.to_thread(market_service.get_ohlcv, symbol, "1d", 45),
            asyncio.to_thread(market_service.get_ohlcv, symbol, "15m", 30),
            asyncio.to_thread(market_service.get_ohlcv, symbol, "4h", 45),
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
        candles_15m = candles_15m_res if not isinstance(candles_15m_res, Exception) else market_service._generate_fallback_candles(symbol, "15m", 30)
        candles_4h = candles_4h_res if not isinstance(candles_4h_res, Exception) else market_service._generate_fallback_candles(symbol, "4h", 45)
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

        mtf_trends = technical_analyzer.calculate_mtf_trend({
            "15m": candles_15m,
            "1h": candles,
            "4h": candles_4h,
            "1d": candles_1d
        })
        cvd_analysis = technical_analyzer.detect_cvd_divergence(candles, trades, microstructure.cvd)
        accuracy_rating = technical_analyzer.calculate_accuracy_rating(
            symbol=symbol,
            current_price=ticker.price,
            indicators=indicators,
            mtf_trends=mtf_trends,
            cvd_divergence=cvd_analysis.get("divergence_type", "NONE"),
            derivatives=derivatives_data
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
            "decision": decision,
            "accuracy_rating": accuracy_rating,
            "mtf_trends": mtf_trends,
            "cvd_analysis": cvd_analysis
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
            leverage=req.leverage,
            stop_loss=req.stop_loss,
            take_profit=req.take_profit,
            broker_type=req.broker_type,
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


@router.get("/market/accuracy-rating")
async def get_accuracy_rating(symbol: str = Query(default="BTC/USDT")):
    try:
        c_15m, c_1h, c_4h, c_1d = await asyncio.gather(
            asyncio.to_thread(market_service.get_ohlcv, symbol, "15m", 30),
            asyncio.to_thread(market_service.get_ohlcv, symbol, "1h", 60),
            asyncio.to_thread(market_service.get_ohlcv, symbol, "4h", 45),
            asyncio.to_thread(market_service.get_ohlcv, symbol, "1d", 45),
        )
        ticker = await asyncio.to_thread(market_service.get_ticker, symbol)
        indicators = await asyncio.to_thread(technical_analyzer.calculate_indicators, c_1h)
        
        mtf_dict = technical_analyzer.calculate_mtf_trend({
            "15m": c_15m,
            "1h": c_1h,
            "4h": c_4h,
            "1d": c_1d
        })
        cvd_res = technical_analyzer.detect_cvd_divergence(c_1h)
        deriv = None
        try:
            deriv = derivatives_service.get_derivatives_data(symbol)
        except Exception:
            pass

        rating = technical_analyzer.calculate_accuracy_rating(
            symbol=symbol,
            current_price=ticker.price,
            indicators=indicators,
            mtf_trends=mtf_dict,
            cvd_divergence=cvd_res.get("divergence_type", "NONE"),
            derivatives=deriv
        )
        return {
            "status": "success",
            "accuracy_rating": rating,
            "mtf_trends": mtf_dict,
            "cvd_analysis": cvd_res
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/portfolio/exchange-status")
async def get_exchange_status():
    return exchange_broker_service.get_exchange_status()

@router.get("/portfolio/tradingview-webhook-template")
async def get_tradingview_webhook_template(
    symbol: str = Query(default="BTC/USDT"),
    side: str = Query(default="BUY"),
    price: float = Query(default=65000.0),
    amount: float = Query(default=0.1),
    leverage: float = Query(default=5.0),
    stop_loss: Optional[float] = None,
    take_profit: Optional[float] = None
):
    json_payload = exchange_broker_service.generate_tradingview_alert_payload(
        symbol=symbol,
        side=side,
        price=price,
        amount=amount,
        leverage=leverage,
        stop_loss=stop_loss,
        take_profit=take_profit
    )
    pine_syntax = exchange_broker_service.generate_pineconnector_syntax(
        symbol=symbol,
        side=side,
        amount=amount,
        leverage=leverage,
        stop_loss=stop_loss,
        take_profit=take_profit
    )
    return {
        "tradingview_alert_json": json_payload,
        "pineconnector_alert_syntax": pine_syntax,
        "webhook_url": "/api/portfolio/webhook/tradingview",
        "instructions": "In TradingView Alert dialog: check Webhook URL, paste JSON payload into Message body."
    }

@router.get("/settings")
async def get_settings():
    return {
        "has_gemini_key": bool(settings.gemini_api_key),
        "gemini_key_masked": f"{settings.gemini_api_key[:4]}...{settings.gemini_api_key[-4:]}" if len(settings.gemini_api_key) > 8 else ("Configured" if settings.gemini_api_key else "Not configured"),
        "has_coinglass_key": bool(settings.coinglass_api_key),
        "coinglass_key_masked": f"{settings.coinglass_api_key[:4]}...{settings.coinglass_api_key[-4:]}" if len(settings.coinglass_api_key) > 8 else ("Configured" if settings.coinglass_api_key else "Not configured"),
        "has_binance_testnet": bool(settings.binance_testnet_api_key and settings.binance_testnet_secret),
        "binance_testnet_key_masked": f"{settings.binance_testnet_api_key[:4]}...{settings.binance_testnet_api_key[-4:]}" if len(settings.binance_testnet_api_key) > 8 else ("Configured" if settings.binance_testnet_api_key else "Not configured"),
        "has_bybit_testnet": bool(settings.bybit_testnet_api_key and settings.bybit_testnet_secret),
        "bybit_testnet_key_masked": f"{settings.bybit_testnet_api_key[:4]}...{settings.bybit_testnet_api_key[-4:]}" if len(settings.bybit_testnet_api_key) > 8 else ("Configured" if settings.bybit_testnet_api_key else "Not configured"),
        "has_telegram": telegram_service.is_configured(),
        "telegram_chat_id_masked": f"...{settings.telegram_chat_id[-4:]}" if len(settings.telegram_chat_id) > 4 else ("Configured" if settings.telegram_chat_id else "Not configured"),
        "has_whatsapp": whatsapp_service.is_configured(),
        "whatsapp_enabled": settings.whatsapp_enabled,
        "whatsapp_provider": settings.whatsapp_provider,
        "whatsapp_phone": settings.whatsapp_phone,
        "whatsapp_phone_masked": f"...{settings.whatsapp_phone[-4:]}" if len(settings.whatsapp_phone) > 4 else ("Configured" if settings.whatsapp_phone else "Not configured"),
        "has_callmebot_key": bool(settings.whatsapp_callmebot_key),
        "callmebot_key_masked": f"{settings.whatsapp_callmebot_key[:2]}...{settings.whatsapp_callmebot_key[-2:]}" if len(settings.whatsapp_callmebot_key) > 4 else ("Configured" if settings.whatsapp_callmebot_key else "Not configured"),
        "has_twilio": bool(settings.twilio_account_sid and settings.twilio_auth_token),
        "btc_alert_watcher_enabled": settings.btc_alert_watcher_enabled,
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
    if req.binance_testnet_api_key is not None:
        settings.binance_testnet_api_key = req.binance_testnet_api_key.strip()
    if req.binance_testnet_secret is not None:
        settings.binance_testnet_secret = req.binance_testnet_secret.strip()
    if req.bybit_testnet_api_key is not None:
        settings.bybit_testnet_api_key = req.bybit_testnet_api_key.strip()
    if req.bybit_testnet_secret is not None:
        settings.bybit_testnet_secret = req.bybit_testnet_secret.strip()
    if req.telegram_bot_token is not None:
        settings.telegram_bot_token = req.telegram_bot_token.strip()
    if req.telegram_chat_id is not None:
        settings.telegram_chat_id = req.telegram_chat_id.strip()
    if req.whatsapp_enabled is not None:
        settings.whatsapp_enabled = req.whatsapp_enabled
    if req.whatsapp_provider is not None:
        settings.whatsapp_provider = req.whatsapp_provider.strip().lower()
    if req.whatsapp_phone is not None:
        settings.whatsapp_phone = req.whatsapp_phone.strip()
    if req.whatsapp_callmebot_key is not None:
        settings.whatsapp_callmebot_key = req.whatsapp_callmebot_key.strip()
    if req.twilio_account_sid is not None:
        settings.twilio_account_sid = req.twilio_account_sid.strip()
    if req.twilio_auth_token is not None:
        settings.twilio_auth_token = req.twilio_auth_token.strip()
    if req.twilio_from_number is not None:
        settings.twilio_from_number = req.twilio_from_number.strip()
    if req.whatsapp_webhook_url is not None:
        settings.whatsapp_webhook_url = req.whatsapp_webhook_url.strip()
    if req.btc_alert_watcher_enabled is not None:
        settings.btc_alert_watcher_enabled = req.btc_alert_watcher_enabled
        entry_alert_watcher.enabled = req.btc_alert_watcher_enabled
    if req.default_exchange is not None:
        settings.default_exchange = req.default_exchange.strip().lower()
    if req.max_risk_per_trade_pct is not None:
        settings.max_risk_per_trade_pct = req.max_risk_per_trade_pct
    if req.max_spread_pct is not None:
        settings.max_spread_pct = req.max_spread_pct
    return {"status": "success", "settings": await get_settings()}

# ------------------ WhatsApp Alerts API ------------------

@router.get("/alerts/whatsapp/status")
async def get_whatsapp_alert_status():
    """Returns the real-time status of the BTC Best Entry Point WhatsApp Watcher."""
    return entry_alert_watcher.get_status()

class WhatsAppToggleRequest(BaseModel):
    enabled: Optional[bool] = None

@router.post("/alerts/whatsapp/toggle")
async def toggle_whatsapp_alerts(req: Optional[WhatsAppToggleRequest] = None):
    """Enables or disables autonomous BTC Best Entry Point WhatsApp monitoring."""
    target_state = req.enabled if req else None
    new_state = entry_alert_watcher.toggle(target_state)
    settings.btc_alert_watcher_enabled = new_state
    if new_state:
        await entry_alert_watcher.start()
    else:
        await entry_alert_watcher.stop()
    return {"status": "success", "enabled": new_state}

class WhatsAppTestRequest(BaseModel):
    symbol: str = "BTC/USDT"
    custom_message: Optional[str] = None

@router.post("/alerts/whatsapp/test")
async def test_whatsapp_alert(req: Optional[WhatsAppTestRequest] = None):
    """Dispatches a test VIP trading signal to WhatsApp for verification."""
    sym = req.symbol if req and req.symbol else "BTC/USDT"
    if req and req.custom_message:
        res = await asyncio.to_thread(whatsapp_service.send_message, req.custom_message)
        return {"status": "dispatched", "result": res}
    return await entry_alert_watcher.trigger_immediate_test(sym)

@router.post("/alerts/whatsapp/trigger-now")
async def trigger_whatsapp_alert_now(symbol: str = "BTC/USDT"):
    """Forces an immediate evaluation of the Best Entry Point and triggers a signal if available."""
    return await entry_alert_watcher.trigger_immediate_test(symbol)

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
