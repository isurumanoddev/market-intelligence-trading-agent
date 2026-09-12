import time
from datetime import datetime
from typing import List, Dict, Any, Optional
import ccxt
import yfinance as yf
from app.models.market_data import OrderBook, OrderBookLevel, Trade, Ticker, Candle
from app.config import settings

class MarketService:
    def __init__(self):
        self._exchanges: Dict[str, ccxt.Exchange] = {}
        self._init_exchanges()

    def _init_exchanges(self):
        # Initialize popular exchanges that offer public market data
        for name in ["kraken", "coinbase", "binance", "bybit"]:
            try:
                ex_class = getattr(ccxt, name, None)
                if ex_class:
                    ex = ex_class({
                        "enableRateLimit": True,
                        "timeout": 8000,
                    })
                    self._exchanges[name] = ex
            except Exception as e:
                print(f"Failed to init exchange {name}: {e}")

    def get_exchange(self, preferred: Optional[str] = None) -> ccxt.Exchange:
        if preferred and preferred in self._exchanges:
            return self._exchanges[preferred]
        if settings.default_exchange in self._exchanges:
            return self._exchanges[settings.default_exchange]
        return next(iter(self._exchanges.values()))

    def is_crypto(self, symbol: str) -> bool:
        return "/" in symbol or symbol.upper().endswith("USDT") or symbol.upper().endswith("USD")

    def normalize_symbol(self, symbol: str, exchange_name: str = "kraken") -> str:
        s = symbol.strip().upper()
        if not self.is_crypto(s):
            return s
        if "/" in s:
            return s
        # If user passed BTCUSDT -> BTC/USDT
        for quote in ["USDT", "USD", "EUR", "BTC", "ETH"]:
            if s.endswith(quote):
                base = s[:-len(quote)]
                return f"{base}/{quote}"
        return f"{s}/USDT"

    def get_ticker(self, symbol: str, exchange_name: Optional[str] = None) -> Ticker:
        if self.is_crypto(symbol):
            norm_sym = self.normalize_symbol(symbol)
            # Try primary exchange then fallbacks
            exchanges_to_try = [exchange_name] if exchange_name else [settings.default_exchange, "kraken", "coinbase", "binance"]
            last_err = None
            for ex_name in [e for e in exchanges_to_try if e and e in self._exchanges]:
                ex = self._exchanges[ex_name]
                try:
                    # Some exchanges use USD instead of USDT
                    sym_variants = [norm_sym]
                    if norm_sym.endswith("/USDT"):
                        sym_variants.append(norm_sym.replace("/USDT", "/USD"))
                    elif norm_sym.endswith("/USD"):
                        sym_variants.append(norm_sym.replace("/USD", "/USDT"))

                    data = None
                    for variant in sym_variants:
                        try:
                            data = ex.fetch_ticker(variant)
                            norm_sym = variant
                            break
                        except Exception:
                            continue

                    if not data:
                        data = ex.fetch_ticker(norm_sym)

                    price = float(data.get("last") or data.get("close") or 0.0)
                    bid = float(data.get("bid") or price)
                    ask = float(data.get("ask") or price)
                    
                    return Ticker(
                        symbol=norm_sym,
                        exchange=ex_name.upper(),
                        price=price,
                        bid=bid,
                        ask=ask,
                        high_24h=float(data.get("high") or price * 1.02),
                        low_24h=float(data.get("low") or price * 0.98),
                        volume_24h=float(data.get("baseVolume") or 0.0),
                        quote_volume_24h=float(data.get("quoteVolume") or 0.0),
                        change_24h=float(data.get("change") or 0.0),
                        change_pct_24h=float(data.get("percentage") or 0.0),
                        timestamp=int(data.get("timestamp") or time.time() * 1000)
                    )
                except Exception as e:
                    last_err = e
                    continue
            raise RuntimeError(f"Could not fetch ticker for {symbol}: {last_err}")
        else:
            # Equities / Stock Ticker via yfinance
            stock_sym = symbol.strip().upper()
            try:
                t = yf.Ticker(stock_sym)
                info = t.fast_info
                price = float(info.last_price or 0.0)
                prev_close = float(info.previous_close or price)
                change = price - prev_close
                change_pct = (change / prev_close * 100) if prev_close > 0 else 0.0

                return Ticker(
                    symbol=stock_sym,
                    exchange="NASDAQ/NYSE",
                    price=price,
                    bid=float(info.last_price * 0.9998),
                    ask=float(info.last_price * 1.0002),
                    high_24h=float(info.day_high or price * 1.01),
                    low_24h=float(info.day_low or price * 0.99),
                    volume_24h=float(info.last_volume or 0.0),
                    quote_volume_24h=float((info.last_volume or 0.0) * price),
                    change_24h=change,
                    change_pct_24h=change_pct,
                    timestamp=int(time.time() * 1000)
                )
            except Exception as e:
                raise RuntimeError(f"Error fetching stock ticker {stock_sym}: {e}")

    def get_order_book(self, symbol: str, limit: int = 20, exchange_name: Optional[str] = None) -> OrderBook:
        if self.is_crypto(symbol):
            norm_sym = self.normalize_symbol(symbol)
            exchanges_to_try = [exchange_name] if exchange_name else [settings.default_exchange, "kraken", "coinbase", "binance"]
            for ex_name in [e for e in exchanges_to_try if e and e in self._exchanges]:
                ex = self._exchanges[ex_name]
                try:
                    sym_variants = [norm_sym]
                    if norm_sym.endswith("/USDT"):
                        sym_variants.append(norm_sym.replace("/USDT", "/USD"))
                    elif norm_sym.endswith("/USD"):
                        sym_variants.append(norm_sym.replace("/USD", "/USDT"))

                    raw_ob = None
                    for variant in sym_variants:
                        try:
                            raw_ob = ex.fetch_order_book(variant, limit=limit)
                            norm_sym = variant
                            break
                        except Exception:
                            continue

                    if not raw_ob:
                        raw_ob = ex.fetch_order_book(norm_sym, limit=limit)

                    bids_raw = raw_ob.get("bids", [])[:limit]
                    asks_raw = raw_ob.get("asks", [])[:limit]

                    bids: List[OrderBookLevel] = []
                    b_total = 0.0
                    for item in bids_raw:
                        p, a = float(item[0]), float(item[1])
                        b_total += a
                        bids.append(OrderBookLevel(price=p, amount=a, total=b_total))

                    asks: List[OrderBookLevel] = []
                    a_total = 0.0
                    for item in asks_raw:
                        p, a = float(item[0]), float(item[1])
                        a_total += a
                        asks.append(OrderBookLevel(price=p, amount=a, total=a_total))

                    # Calculate depth percentage
                    max_depth = max(b_total, a_total, 1.0)
                    for b in bids:
                        b.depth_pct = min(round((b.total / max_depth) * 100, 1), 100.0)
                    for a in asks:
                        a.depth_pct = min(round((a.total / max_depth) * 100, 1), 100.0)

                    best_bid = bids[0].price if bids else 0.0
                    best_ask = asks[0].price if asks else 0.0
                    spread = max(best_ask - best_bid, 0.0)
                    spread_pct = (spread / best_bid * 100) if best_bid > 0 else 0.0

                    # Order Book Imbalance (OBI)
                    tot_b = sum(b.amount for b in bids)
                    tot_a = sum(a.amount for a in asks)
                    imbalance = (tot_b - tot_a) / (tot_b + tot_a) if (tot_b + tot_a) > 0 else 0.0

                    return OrderBook(
                        symbol=norm_sym,
                        exchange=ex_name.upper(),
                        bids=bids,
                        asks=asks,
                        best_bid=best_bid,
                        best_ask=best_ask,
                        spread=round(spread, 4),
                        spread_pct=round(spread_pct, 4),
                        imbalance=round(imbalance, 4),
                        total_bid_depth=round(tot_b, 4),
                        total_ask_depth=round(tot_a, 4),
                        timestamp=int(raw_ob.get("timestamp") or time.time() * 1000)
                    )
                except Exception:
                    continue
            raise RuntimeError(f"Failed to fetch order book for {symbol}")
        else:
            # Equities: Generate synthetic realistic depth ladder around current price
            ticker = self.get_ticker(symbol)
            p = ticker.price
            spread = p * 0.0004
            best_bid = p - (spread / 2)
            best_ask = p + (spread / 2)

            bids: List[OrderBookLevel] = []
            asks: List[OrderBookLevel] = []
            b_total = 0.0
            a_total = 0.0

            step = max(round(p * 0.0005, 2), 0.01)
            for i in range(limit):
                bid_p = round(best_bid - (i * step), 2)
                ask_p = round(best_ask + (i * step), 2)
                b_amt = round(100 + (i * 35) + ((i % 3) * 50), 0)
                a_amt = round(110 + (i * 30) + ((i % 2) * 60), 0)
                b_total += b_amt
                a_total += a_amt
                bids.append(OrderBookLevel(price=bid_p, amount=b_amt, total=b_total))
                asks.append(OrderBookLevel(price=ask_p, amount=a_amt, total=a_total))

            max_d = max(b_total, a_total, 1.0)
            for b in bids:
                b.depth_pct = round((b.total / max_d) * 100, 1)
            for a in asks:
                a.depth_pct = round((a.total / max_d) * 100, 1)

            imbalance = (b_total - a_total) / (b_total + a_total)

            return OrderBook(
                symbol=symbol.upper(),
                exchange="NASDAQ/NYSE",
                bids=bids,
                asks=asks,
                best_bid=best_bid,
                best_ask=best_ask,
                spread=round(spread, 4),
                spread_pct=round((spread / p) * 100, 4),
                imbalance=round(imbalance, 4),
                total_bid_depth=b_total,
                total_ask_depth=a_total,
                timestamp=int(time.time() * 1000)
            )

    def get_recent_trades(self, symbol: str, limit: int = 50, exchange_name: Optional[str] = None) -> List[Trade]:
        if self.is_crypto(symbol):
            norm_sym = self.normalize_symbol(symbol)
            exchanges_to_try = [exchange_name] if exchange_name else [settings.default_exchange, "kraken", "coinbase", "binance"]
            for ex_name in [e for e in exchanges_to_try if e and e in self._exchanges]:
                ex = self._exchanges[ex_name]
                try:
                    sym_variants = [norm_sym]
                    if norm_sym.endswith("/USDT"):
                        sym_variants.append(norm_sym.replace("/USDT", "/USD"))
                    elif norm_sym.endswith("/USD"):
                        sym_variants.append(norm_sym.replace("/USD", "/USDT"))

                    raw_trades = None
                    for variant in sym_variants:
                        try:
                            raw_trades = ex.fetch_trades(variant, limit=limit)
                            norm_sym = variant
                            break
                        except Exception:
                            continue

                    if not raw_trades:
                        raw_trades = ex.fetch_trades(norm_sym, limit=limit)

                    trades: List[Trade] = []
                    # Compute mean cost to detect whale trades
                    costs = [float(t.get("cost") or (float(t.get("price", 0)) * float(t.get("amount", 0)))) for t in raw_trades]
                    whale_threshold = (sum(costs) / len(costs) * 4.0) if costs else 50000.0

                    for t in reversed(raw_trades):
                        t_id = str(t.get("id") or f"{t.get('timestamp')}_{len(trades)}")
                        ts = int(t.get("timestamp") or time.time() * 1000)
                        side = str(t.get("side") or "buy").lower()
                        price = float(t.get("price") or 0.0)
                        amount = float(t.get("amount") or 0.0)
                        cost = float(t.get("cost") or (price * amount))
                        
                        dt = datetime.fromtimestamp(ts / 1000.0)
                        time_str = dt.strftime("%H:%M:%S")

                        trades.append(Trade(
                            id=t_id,
                            timestamp=ts,
                            time_str=time_str,
                            symbol=norm_sym,
                            side=side,
                            price=price,
                            amount=round(amount, 6),
                            cost=round(cost, 2),
                            is_whale=(cost >= whale_threshold and cost > 20000.0)
                        ))
                    return trades
                except Exception:
                    continue
            return []
        else:
            # Equities: Generate recent trades around market price
            ticker = self.get_ticker(symbol)
            p = ticker.price
            trades: List[Trade] = []
            now = time.time()
            for i in range(limit):
                ts = int((now - (i * 2.5)) * 1000)
                side = "buy" if (i % 3 != 0) else "sell"
                var_p = round(p + ((i % 5 - 2) * 0.02), 2)
                amt = float(round(10 + (i * 7) + ((i % 4) * 50), 0))
                cost = round(var_p * amt, 2)
                trades.append(Trade(
                    id=f"eq_{ts}_{i}",
                    timestamp=ts,
                    time_str=datetime.fromtimestamp(ts / 1000.0).strftime("%H:%M:%S"),
                    symbol=symbol.upper(),
                    side=side,
                    price=var_p,
                    amount=amt,
                    cost=cost,
                    is_whale=(cost > 50000)
                ))
            return trades

    def get_ohlcv(self, symbol: str, timeframe: str = "1h", limit: int = 100, exchange_name: Optional[str] = None) -> List[Candle]:
        if self.is_crypto(symbol):
            norm_sym = self.normalize_symbol(symbol)
            exchanges_to_try = [exchange_name] if exchange_name else [settings.default_exchange, "kraken", "coinbase", "binance"]
            for ex_name in [e for e in exchanges_to_try if e and e in self._exchanges]:
                ex = self._exchanges[ex_name]
                try:
                    sym_variants = [norm_sym]
                    if norm_sym.endswith("/USDT"):
                        sym_variants.append(norm_sym.replace("/USDT", "/USD"))
                    elif norm_sym.endswith("/USD"):
                        sym_variants.append(norm_sym.replace("/USD", "/USDT"))

                    raw_candles = None
                    for variant in sym_variants:
                        try:
                            raw_candles = ex.fetch_ohlcv(variant, timeframe=timeframe, limit=limit)
                            break
                        except Exception:
                            continue

                    if not raw_candles:
                        continue

                    candles: List[Candle] = []
                    for c in raw_candles:
                        ts = int(c[0])
                        dt = datetime.fromtimestamp(ts / 1000.0)
                        candles.append(Candle(
                            timestamp=ts,
                            time_str=dt.strftime("%Y-%m-%d %H:%M"),
                            open=float(c[1]),
                            high=float(c[2]),
                            low=float(c[3]),
                            close=float(c[4]),
                            volume=float(c[5])
                        ))
                    return candles
                except Exception:
                    continue
            raise RuntimeError(f"Could not fetch OHLCV for {symbol}")
        else:
            # Equities: Use yfinance history
            stock_sym = symbol.strip().upper()
            try:
                t = yf.Ticker(stock_sym)
                # Map timeframe to yfinance intervals
                interval_map = {"1m": "1m", "5m": "5m", "15m": "15m", "1h": "1h", "1d": "1d"}
                yf_interval = interval_map.get(timeframe, "1h")
                period = "1mo" if yf_interval in ["1h", "1d"] else "5d"

                df = t.history(period=period, interval=yf_interval)
                if df.empty:
                    raise ValueError(f"No history for {stock_sym}")

                df = df.tail(limit)
                candles: List[Candle] = []
                for idx, row in df.iterrows():
                    ts = int(idx.timestamp() * 1000)
                    candles.append(Candle(
                        timestamp=ts,
                        time_str=idx.strftime("%Y-%m-%d %H:%M"),
                        open=float(row["Open"]),
                        high=float(row["High"]),
                        low=float(row["Low"]),
                        close=float(row["Close"]),
                        volume=float(row["Volume"])
                    ))
                return candles
            except Exception as e:
                raise RuntimeError(f"Error fetching stock candles {stock_sym}: {e}")

market_service = MarketService()
