from app.services.paper_broker import PaperBrokerService

def test_paper_broker_lifecycle():
    broker = PaperBrokerService(initial_cash=50000.0)
    
    # 1. Execute Buy Order
    pos = broker.execute_order(
        symbol="ETH/USDT",
        side="BUY",
        price=3000.0,
        amount=2.0,
        stop_loss=2850.0,
        take_profit=3300.0,
        reason="Test Breakout"
    )
    assert pos.symbol == "ETH/USDT"
    assert pos.amount == 2.0
    assert broker.cash < 50000.0  # Cash deducted
    assert len(broker.positions) == 1

    # 2. Portfolio state with price increase
    state = broker.get_portfolio_state({"ETH/USDT": 3200.0})
    assert state.unrealized_pnl > 0
    assert state.equity > 50000.0

    # 3. Close position with profit
    trade = broker.close_position(pos.id, current_price=3250.0, reason="Hit TP")
    assert trade.pnl > 0
    assert broker.realized_pnl > 0
    assert len(broker.positions) == 0

    # 4. Reset
    broker.reset(100000.0)
    assert broker.cash == 100000.0
    assert len(broker.trades_history) == 0

def test_paper_broker_leverage_and_liquidation():
    broker = PaperBrokerService(initial_cash=50000.0)

    # Execute 10x leveraged long on BTC
    pos = broker.execute_order(
        symbol="BTC/USDT",
        side="BUY",
        price=80000.0,
        amount=1.0,  # $80k notional
        leverage=10.0,
        stop_loss=76000.0,
        take_profit=90000.0,
        reason="Leveraged Test"
    )
    assert pos.leverage == 10.0
    assert pos.cost_basis == 80000.0
    assert pos.margin == 8000.0  # $80k / 10 = $8k margin
    assert pos.liquidation_price is not None
    assert pos.liquidation_price < 80000.0  # ~ $72,800

    # Price drops to liquidation level
    broker.update_prices({"BTC/USDT": pos.liquidation_price - 100.0})
    assert len(broker.trades_history) == 2  # Open + Liquidate
    assert "Liquidated" in broker.trades_history[-1].reason

def test_paper_broker_default_200_usd_account():
    from app.config import settings
    broker = PaperBrokerService()
    assert broker.initial_cash == 200.0
    assert broker.cash == 200.0
    assert settings.initial_cash == 200.0

    # Execute a $10 position with 10x leverage ($1 margin required)
    price = 80000.0
    amount = 10.0 / price  # $10 notional
    pos = broker.execute_order(
        symbol="BTC/USDT",
        side="BUY",
        price=price,
        amount=amount,
        leverage=10.0,
        reason="Default $10 order at 10x"
    )
    assert pos.leverage == 10.0
    assert round(pos.cost_basis, 2) == 10.0
    assert round(pos.margin, 2) == 1.0
    assert broker.cash < 200.0
    assert broker.cash > 198.0

