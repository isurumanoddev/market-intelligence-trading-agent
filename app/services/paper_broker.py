import os
import json
import time
import uuid
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Optional, Any
from app.models.decision import PaperPosition, PaperTradeRecord, PortfolioState
from app.config import settings
from app.services.exchange_broker_service import exchange_broker_service

class PaperBrokerService:
    def __init__(self, initial_cash: float = 200.0, storage_path: Optional[str] = None):
        self.initial_cash = initial_cash
        self.cash = initial_cash
        self.positions: Dict[str, PaperPosition] = {}
        self.trades_history: List[PaperTradeRecord] = []
        self.realized_pnl = 0.0
        self.fee_rate = 0.0005  # 0.05% simulated trading fee
        self.storage_path = Path(storage_path) if storage_path else None
        if self.storage_path:
            self._load_state()

    def _save_state(self):
        if not self.storage_path:
            return
        try:
            self.storage_path.parent.mkdir(parents=True, exist_ok=True)
            data = {
                "initial_cash": self.initial_cash,
                "cash": self.cash,
                "realized_pnl": self.realized_pnl,
                "positions": {pid: pos.model_dump() for pid, pos in self.positions.items()},
                "trades_history": [trade.model_dump() for trade in self.trades_history]
            }
            with open(self.storage_path, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2)
        except Exception as e:
            print(f"Warning: Failed to save paper broker state: {e}")

    def _load_state(self):
        if not self.storage_path or not self.storage_path.exists():
            return
        try:
            with open(self.storage_path, "r", encoding="utf-8") as f:
                data = json.load(f)
            self.initial_cash = float(data.get("initial_cash", self.initial_cash))
            self.cash = float(data.get("cash", self.cash))
            self.realized_pnl = float(data.get("realized_pnl", 0.0))

            raw_positions = data.get("positions", {})
            self.positions = {}
            for pid, pdata in raw_positions.items():
                try:
                    self.positions[pid] = PaperPosition(**pdata)
                except Exception as pe:
                    print(f"Failed to restore position {pid}: {pe}")

            raw_trades = data.get("trades_history", [])
            self.trades_history = []
            for tdata in raw_trades:
                try:
                    self.trades_history.append(PaperTradeRecord(**tdata))
                except Exception as te:
                    print(f"Failed to restore trade: {te}")
        except Exception as e:
            print(f"Warning: Failed to load paper broker state: {e}")

    def get_portfolio_state(self, current_prices: Optional[Dict[str, float]] = None) -> PortfolioState:
        if current_prices:
            self.update_prices(current_prices)

        unrealized_pnl = sum(p.unrealized_pnl for p in self.positions.values())
        open_positions_val = sum(p.current_value for p in self.positions.values())
        equity = self.cash + open_positions_val
        total_pnl = self.realized_pnl + unrealized_pnl
        total_pnl_pct = (total_pnl / self.initial_cash * 100) if self.initial_cash > 0 else 0.0

        return PortfolioState(
            cash=round(self.cash, 2),
            equity=round(equity, 2),
            realized_pnl=round(self.realized_pnl, 2),
            unrealized_pnl=round(unrealized_pnl, 2),
            total_pnl=round(total_pnl, 2),
            total_pnl_pct=round(total_pnl_pct, 2),
            open_positions_count=len(self.positions),
            positions=list(self.positions.values()),
            trades_history=list(reversed(self.trades_history))
        )

    def execute_order(
        self,
        symbol: str,
        side: str,  # 'BUY' or 'SELL'
        price: float,
        amount: float,
        leverage: float = 1.0,
        stop_loss: Optional[float] = None,
        take_profit: Optional[float] = None,
        broker_type: str = "LOCAL",
        reason: str = "Manual / AI Decision"
    ) -> PaperPosition:
        side = side.upper()
        broker_type = (broker_type or "LOCAL").upper()
        leverage = max(1.0, min(100.0, float(leverage or 1.0)))
        cost_basis = price * amount  # Total notional position value
        margin = cost_basis / leverage
        fee = cost_basis * self.fee_rate

        total_deduction = margin + fee
        if total_deduction > self.cash:
            # Adjust amount if cash is insufficient
            available = max(self.cash - 5.0, 0.0)
            if available <= 0:
                raise ValueError("Insufficient cash balance to execute order.")
            amount = available / (price * ((1.0 / leverage) + self.fee_rate))
            cost_basis = price * amount
            margin = cost_basis / leverage
            fee = cost_basis * self.fee_rate
            total_deduction = margin + fee

        self.cash -= total_deduction

        # Calculate estimated liquidation price
        if leverage > 1.0:
            if side == "BUY":
                liquidation_price = price * (1.0 - (0.9 / leverage))
            else:
                liquidation_price = price * (1.0 + (0.9 / leverage))
        else:
            liquidation_price = None

        now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        pos_id = f"pos_{uuid.uuid4().hex[:8]}"
        watch_url = exchange_broker_service.get_exchange_watch_url(symbol, broker_type)

        # Dispatch to real exchange testnet if configured
        exchange_order_id = None
        if broker_type != "LOCAL":
            try:
                res = exchange_broker_service.execute_testnet_order(
                    broker_type=broker_type,
                    symbol=symbol,
                    side=side,
                    amount=amount,
                    price=price,
                    leverage=leverage,
                    stop_loss=stop_loss,
                    take_profit=take_profit
                )
                if res.get("success") and res.get("order_id"):
                    exchange_order_id = str(res.get("order_id"))
                    reason += f" [{broker_type} Order #{exchange_order_id}]"
            except Exception as e:
                print(f"Exchange testnet order placement notice: {e}")

        position = PaperPosition(
            id=pos_id,
            symbol=symbol.upper(),
            side=side,
            entry_price=round(price, 4),
            current_price=round(price, 4),
            amount=round(amount, 6),
            cost_basis=round(cost_basis, 2),
            margin=round(margin, 2),
            leverage=round(leverage, 1),
            liquidation_price=round(liquidation_price, 4) if liquidation_price else None,
            current_value=round(margin, 2),
            unrealized_pnl=round(-fee, 2),
            unrealized_pnl_pct=round((-fee / margin * 100), 2) if margin > 0 else 0.0,
            stop_loss=round(stop_loss, 4) if stop_loss else None,
            take_profit=round(take_profit, 4) if take_profit else None,
            broker_type=broker_type,
            exchange_watch_url=watch_url,
            opened_at=now_str
        )

        self.positions[pos_id] = position

        # Record trade log
        trade_id = f"tr_{uuid.uuid4().hex[:8]}"
        self.trades_history.append(PaperTradeRecord(
            id=trade_id,
            symbol=symbol.upper(),
            side=side,
            price=round(price, 4),
            amount=round(amount, 6),
            value=round(cost_basis, 2),
            leverage=round(leverage, 1),
            pnl=round(-fee, 2),
            reason=reason,
            broker_type=broker_type,
            exchange_watch_url=watch_url,
            timestamp=now_str
        ))

        self._save_state()
        return position

    def close_position(self, position_id: str, current_price: float, reason: str = "Closed by user") -> PaperTradeRecord:
        if position_id not in self.positions:
            raise KeyError(f"Position {position_id} not found.")

        pos = self.positions.pop(position_id)
        current_notional = current_price * pos.amount
        fee = current_notional * self.fee_rate
        margin = pos.margin if pos.margin > 0 else (pos.cost_basis / max(1.0, pos.leverage))

        if pos.side == "BUY":
            gross_pnl = (current_price - pos.entry_price) * pos.amount
        else:
            gross_pnl = (pos.entry_price - current_price) * pos.amount

        net_pnl = gross_pnl - fee
        returned_cash = max(0.0, margin + net_pnl)
        self.realized_pnl += net_pnl
        self.cash += returned_cash

        now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        closing_side = "SELL" if pos.side == "BUY" else "BUY"

        # If on exchange testnet, attempt closing order
        if pos.broker_type and pos.broker_type != "LOCAL":
            try:
                exchange_broker_service.execute_testnet_order(
                    broker_type=pos.broker_type,
                    symbol=pos.symbol,
                    side=closing_side,
                    amount=pos.amount,
                    price=current_price,
                    leverage=pos.leverage
                )
            except Exception as e:
                print(f"Exchange testnet close notice: {e}")

        trade = PaperTradeRecord(
            id=f"tr_{uuid.uuid4().hex[:8]}",
            symbol=pos.symbol,
            side=closing_side,
            price=round(current_price, 4),
            amount=pos.amount,
            value=round(current_notional, 2),
            leverage=pos.leverage,
            pnl=round(net_pnl, 2),
            reason=f"{reason} (Entry: {pos.entry_price})",
            broker_type=pos.broker_type,
            exchange_watch_url=pos.exchange_watch_url,
            timestamp=now_str
        )
        self.trades_history.append(trade)
        self._save_state()
        return trade

    def update_prices(self, current_prices: Dict[str, float]):
        to_close = []
        for pos_id, pos in self.positions.items():
            price = current_prices.get(pos.symbol)
            if price is None:
                continue

            pos.current_price = price
            margin = pos.margin if pos.margin > 0 else (pos.cost_basis / max(1.0, pos.leverage))
            if pos.side == "BUY":
                pnl = (price - pos.entry_price) * pos.amount
            else:
                pnl = (pos.entry_price - price) * pos.amount
            pos.unrealized_pnl = round(pnl, 2)
            pos.unrealized_pnl_pct = round((pnl / margin * 100), 2) if margin > 0 else 0.0
            pos.current_value = round(max(0.0, margin + pnl), 2)

            # Check liquidation trigger
            if pos.liquidation_price is not None:
                if (pos.side == "BUY" and price <= pos.liquidation_price) or (pos.side == "SELL" and price >= pos.liquidation_price):
                    to_close.append((pos_id, price, f"Liquidated (Margin Call at ${price})"))
                    continue

            # Check automated SL / TP triggers
            if pos.stop_loss and ((pos.side == "BUY" and price <= pos.stop_loss) or (pos.side == "SELL" and price >= pos.stop_loss)):
                to_close.append((pos_id, price, "Stop Loss Triggered"))
            elif pos.take_profit and ((pos.side == "BUY" and price >= pos.take_profit) or (pos.side == "SELL" and price <= pos.take_profit)):
                to_close.append((pos_id, price, "Take Profit Triggered"))

        closed_any = False
        for pid, p, r in to_close:
            try:
                self.close_position(pid, p, r)
                closed_any = True
            except Exception:
                pass

        if closed_any:
            self._save_state()

    def reset(self, initial_cash: Optional[float] = None):
        if initial_cash is not None:
            self.initial_cash = initial_cash
        elif not getattr(self, "initial_cash", None):
            self.initial_cash = settings.initial_cash
        self.cash = self.initial_cash
        self.positions.clear()
        self.trades_history.clear()
        self.realized_pnl = 0.0
        self._save_state()

paper_broker = PaperBrokerService(initial_cash=settings.initial_cash, storage_path=settings.paper_broker_storage_path)
