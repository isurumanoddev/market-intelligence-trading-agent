import time
import uuid
from datetime import datetime
from typing import List, Dict, Optional
from app.models.decision import PaperPosition, PaperTradeRecord, PortfolioState
from app.config import settings

class PaperBrokerService:
    def __init__(self, initial_cash: float = 100000.0):
        self.initial_cash = initial_cash
        self.cash = initial_cash
        self.positions: Dict[str, PaperPosition] = {}
        self.trades_history: List[PaperTradeRecord] = []
        self.realized_pnl = 0.0
        self.fee_rate = 0.0005  # 0.05% simulated trading fee

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
        stop_loss: Optional[float] = None,
        take_profit: Optional[float] = None,
        reason: str = "Manual / AI Decision"
    ) -> PaperPosition:
        side = side.upper()
        cost_basis = price * amount
        fee = cost_basis * self.fee_rate

        total_deduction = cost_basis + fee
        if total_deduction > self.cash:
            # Adjust amount if cash is insufficient
            available = max(self.cash - 10.0, 0.0)
            if available <= 0:
                raise ValueError("Insufficient cash balance to execute order.")
            amount = available / (price * (1.0 + self.fee_rate))
            cost_basis = price * amount
            fee = cost_basis * self.fee_rate
            total_deduction = cost_basis + fee

        self.cash -= total_deduction

        now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        pos_id = f"pos_{uuid.uuid4().hex[:8]}"

        position = PaperPosition(
            id=pos_id,
            symbol=symbol.upper(),
            side=side,
            entry_price=round(price, 4),
            current_price=round(price, 4),
            amount=round(amount, 6),
            cost_basis=round(cost_basis, 2),
            current_value=round(cost_basis, 2),
            unrealized_pnl=round(-fee, 2),
            unrealized_pnl_pct=round((-fee / cost_basis * 100), 2),
            stop_loss=round(stop_loss, 4) if stop_loss else None,
            take_profit=round(take_profit, 4) if take_profit else None,
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
            pnl=round(-fee, 2),
            reason=reason,
            timestamp=now_str
        ))

        return position

    def close_position(self, position_id: str, current_price: float, reason: str = "Closed by user") -> PaperTradeRecord:
        if position_id not in self.positions:
            raise KeyError(f"Position {position_id} not found.")

        pos = self.positions.pop(position_id)
        current_value = current_price * pos.amount
        fee = current_value * self.fee_rate

        if pos.side == "BUY":
            gross_pnl = (current_price - pos.entry_price) * pos.amount
        else:
            gross_pnl = (pos.entry_price - current_price) * pos.amount

        net_pnl = gross_pnl - fee
        self.realized_pnl += net_pnl
        self.cash += (current_value - fee)

        now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        closing_side = "SELL" if pos.side == "BUY" else "BUY"

        trade = PaperTradeRecord(
            id=f"tr_{uuid.uuid4().hex[:8]}",
            symbol=pos.symbol,
            side=closing_side,
            price=round(current_price, 4),
            amount=pos.amount,
            value=round(current_value, 2),
            pnl=round(net_pnl, 2),
            reason=f"{reason} (Entry: {pos.entry_price})",
            timestamp=now_str
        )
        self.trades_history.append(trade)
        return trade

    def update_prices(self, current_prices: Dict[str, float]):
        to_close = []
        for pos_id, pos in self.positions.items():
            price = current_prices.get(pos.symbol)
            if price is None:
                continue

            pos.current_price = price
            pos.current_value = round(price * pos.amount, 2)
            if pos.side == "BUY":
                pnl = (price - pos.entry_price) * pos.amount
            else:
                pnl = (pos.entry_price - price) * pos.amount
            pos.unrealized_pnl = round(pnl, 2)
            pos.unrealized_pnl_pct = round((pnl / pos.cost_basis * 100), 2) if pos.cost_basis > 0 else 0.0

            # Check automated triggers
            if pos.stop_loss and ((pos.side == "BUY" and price <= pos.stop_loss) or (pos.side == "SELL" and price >= pos.stop_loss)):
                to_close.append((pos_id, price, "Stop Loss Triggered"))
            elif pos.take_profit and ((pos.side == "BUY" and price >= pos.take_profit) or (pos.side == "SELL" and price <= pos.take_profit)):
                to_close.append((pos_id, price, "Take Profit Triggered"))

        for pid, p, r in to_close:
            try:
                self.close_position(pid, p, r)
            except Exception:
                pass

    def reset(self, initial_cash: Optional[float] = None):
        self.initial_cash = initial_cash or settings.initial_cash
        self.cash = self.initial_cash
        self.positions.clear()
        self.trades_history.clear()
        self.realized_pnl = 0.0

paper_broker = PaperBrokerService()
