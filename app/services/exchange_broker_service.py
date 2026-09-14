import json
import ccxt
from typing import Optional, Dict, Any
from app.config import settings

class ExchangeBrokerService:
    def __init__(self):
        self._binance_testnet = None
        self._bybit_testnet = None
        self._init_exchanges()

    def _init_exchanges(self):
        if settings.binance_testnet_api_key and settings.binance_testnet_secret:
            try:
                self._binance_testnet = ccxt.binanceusdm({
                    'apiKey': settings.binance_testnet_api_key,
                    'secret': settings.binance_testnet_secret,
                    'enableRateLimit': True,
                    'timeout': 15000,
                })
                self._binance_testnet.set_sandbox_mode(True)
            except Exception as e:
                self._binance_testnet = None
        else:
            self._binance_testnet = None

        if settings.bybit_testnet_api_key and settings.bybit_testnet_secret:
            try:
                self._bybit_testnet = ccxt.bybit({
                    'apiKey': settings.bybit_testnet_api_key,
                    'secret': settings.bybit_testnet_secret,
                    'enableRateLimit': True,
                    'timeout': 15000,
                })
                self._bybit_testnet.set_sandbox_mode(True)
            except Exception as e:
                self._bybit_testnet = None
        else:
            self._bybit_testnet = None

    def get_exchange_watch_url(self, symbol: str, broker_type: str = 'LOCAL') -> str:
        clean = symbol.replace('/', '').upper()
        if broker_type == 'BINANCE_TESTNET':
            return f'https://testnet.binancefuture.com/en/futures/{clean}'
        elif broker_type == 'BYBIT_TESTNET':
            return f'https://testnet.bybit.com/trade/usdt/{clean}'
        else:
            return f'https://www.tradingview.com/chart/?symbol=BINANCE:{clean}'

    def get_exchange_status(self) -> Dict[str, Any]:
        return {
            'binance_testnet_configured': bool(settings.binance_testnet_api_key and settings.binance_testnet_secret),
            'bybit_testnet_configured': bool(settings.bybit_testnet_api_key and settings.bybit_testnet_secret),
            'local_persistent_storage': True,
            'supported_brokers': [
                {
                    'id': 'LOCAL',
                    'name': 'Local Persistent Broker ( Virtual Margin)',
                    'description': 'Never loses trades across restarts. Zero setup required.',
                    'is_configured': True,
                    'watch_platform': 'TradingView.com',
                    'watch_url_template': 'https://www.tradingview.com/chart/?symbol=BINANCE:{clean}'
                },
                {
                    'id': 'BINANCE_TESTNET',
                    'name': 'Binance Futures Testnet (testnet.binancefuture.com)',
                    'description': 'Places real testnet contracts. Watch live on Binance Futures Testnet web terminal.',
                    'is_configured': bool(settings.binance_testnet_api_key and settings.binance_testnet_secret),
                    'watch_platform': 'Binance Testnet',
                    'watch_url_template': 'https://testnet.binancefuture.com/en/futures/{clean}'
                },
                {
                    'id': 'BYBIT_TESTNET',
                    'name': 'Bybit Demo / Testnet (testnet.bybit.com)',
                    'description': 'Places real demo contracts on Bybit Testnet. Watch on Bybit web interface.',
                    'is_configured': bool(settings.bybit_testnet_api_key and settings.bybit_testnet_secret),
                    'watch_platform': 'Bybit Demo',
                    'watch_url_template': 'https://testnet.bybit.com/trade/usdt/{clean}'
                }
            ]
        }

    def generate_tradingview_alert_payload(
        self,
        symbol: str,
        side: str,
        price: float,
        amount: float,
        leverage: float = 1.0,
        stop_loss: Optional[float] = None,
        take_profit: Optional[float] = None
    ) -> Dict[str, Any]:
        action = 'buy' if side.upper() == 'BUY' else 'sell'
        clean = symbol.replace('/', '').upper()
        return {
            'message_type': 'ORDER',
            'ticker': clean,
            'action': action,
            'order_type': 'market',
            'price': price,
            'quantity': amount,
            'leverage': leverage,
            'stop_loss': stop_loss,
            'take_profit': take_profit,
            'comment': f'QuantMind AI {side} {clean} ({leverage}x)',
            'timestamp': '{{timenow}}'
        }

    def generate_pineconnector_syntax(
        self,
        symbol: str,
        side: str,
        amount: float,
        leverage: float = 1.0,
        stop_loss: Optional[float] = None,
        take_profit: Optional[float] = None
    ) -> str:
        clean = symbol.replace('/', '').upper()
        action = 'buy' if side.upper() == 'BUY' else 'sell'
        cmd = f'LICENSE_ID,{action},{clean},vol={amount}'
        if stop_loss:
            cmd += f',sl={stop_loss}'
        if take_profit:
            cmd += f',tp={take_profit}'
        return cmd

    def execute_testnet_order(
        self,
        broker_type: str,
        symbol: str,
        side: str,
        amount: float,
        price: float,
        leverage: float = 1.0,
        stop_loss: Optional[float] = None,
        take_profit: Optional[float] = None
    ) -> Dict[str, Any]:
        self._init_exchanges()
        ccxt_side = 'buy' if side.upper() == 'BUY' else 'sell'
        clean_symbol = symbol.replace('/', '') + ':USDT'

        if broker_type == 'BINANCE_TESTNET' and self._binance_testnet:
            try:
                try:
                    self._binance_testnet.set_leverage(int(leverage), clean_symbol)
                except Exception:
                    pass
                order = self._binance_testnet.create_market_order(clean_symbol, ccxt_side, amount)
                return {
                    'success': True,
                    'order_id': order.get('id'),
                    'broker': 'BINANCE_TESTNET',
                    'raw': order
                }
            except Exception as e:
                return {
                    'success': False,
                    'error': str(e),
                    'broker': 'BINANCE_TESTNET'
                }

        elif broker_type == 'BYBIT_TESTNET' and self._bybit_testnet:
            try:
                try:
                    self._bybit_testnet.set_leverage(int(leverage), clean_symbol)
                except Exception:
                    pass
                order = self._bybit_testnet.create_market_order(clean_symbol, ccxt_side, amount)
                return {
                    'success': True,
                    'order_id': order.get('id'),
                    'broker': 'BYBIT_TESTNET',
                    'raw': order
                }
            except Exception as e:
                return {
                    'success': False,
                    'error': str(e),
                    'broker': 'BYBIT_TESTNET'
                }

        return {
            'success': True,
            'broker': 'LOCAL_SIMULATOR',
            'message': 'Executed in persistent local broker sandbox.'
        }

exchange_broker_service = ExchangeBrokerService()
