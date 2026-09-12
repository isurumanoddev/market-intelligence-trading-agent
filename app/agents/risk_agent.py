from typing import Dict, Any, Tuple
from app.models.decision import TechnicalIndicators, MicrostructureMetrics
from app.config import settings

class RiskAgent:
    def evaluate(
        self,
        symbol: str,
        current_price: float,
        indicators: TechnicalIndicators,
        microstructure: MicrostructureMetrics,
        action_lean: str  # 'BUY', 'SELL', 'HOLD'
    ) -> Dict[str, Any]:
        spread_pct = microstructure.spread_pct
        atr = indicators.atr if indicators.atr and indicators.atr > 0 else (current_price * 0.02)
        
        # Guardrail: Check abnormal spread
        spread_warning = None
        if spread_pct > settings.max_spread_pct:
            spread_warning = f"High bid-ask spread ({spread_pct:.2f}% > {settings.max_spread_pct}%). Execution slippage risk elevated."

        # Compute dynamic ATR multiplier based on volatility
        sl_distance = max(atr * 1.5, current_price * 0.015)
        
        # Consider nearby support/resistance wall if available
        if action_lean == "BUY" and microstructure.large_bid_walls:
            wall_p = microstructure.large_bid_walls[0]["price"]
            if wall_p < current_price:
                # Place stop just under the wall
                wall_sl = wall_p * 0.998
                if wall_sl < current_price:
                    sl_distance = max(current_price - wall_sl, current_price * 0.01)

        elif action_lean == "SELL" and microstructure.large_ask_walls:
            wall_p = microstructure.large_ask_walls[0]["price"]
            if wall_p > current_price:
                wall_sl = wall_p * 1.002
                if wall_sl > current_price:
                    sl_distance = max(wall_sl - current_price, current_price * 0.01)

        # Calculate Stops and Targets
        if action_lean in ["STRONG_BUY", "BUY"]:
            stop_loss = round(current_price - sl_distance, 4)
            tp1 = round(current_price + (sl_distance * 1.6), 4)
            tp2 = round(current_price + (sl_distance * 3.2), 4)
            entry_low = round(current_price - (atr * 0.3), 4)
            entry_zone = [min(entry_low, current_price), current_price]
            risk_reward = round((tp1 - current_price) / max(current_price - stop_loss, 0.0001), 2)
        elif action_lean in ["STRONG_SELL", "SELL"]:
            stop_loss = round(current_price + sl_distance, 4)
            tp1 = round(current_price - (sl_distance * 1.6), 4)
            tp2 = round(current_price - (sl_distance * 3.2), 4)
            entry_high = round(current_price + (atr * 0.3), 4)
            entry_zone = [current_price, max(entry_high, current_price)]
            risk_reward = round((current_price - tp1) / max(stop_loss - current_price, 0.0001), 2)
        else:
            # HOLD / Neutral
            stop_loss = round(current_price * 0.97, 4)
            tp1 = round(current_price * 1.05, 4)
            tp2 = round(current_price * 1.10, 4)
            entry_zone = [current_price, current_price]
            risk_reward = 1.67

        # Position Sizing: 2% risk budget divided by stop loss percentage
        sl_pct = abs(current_price - stop_loss) / current_price if current_price > 0 else 0.03
        recommended_pos_pct = round(min(settings.max_risk_per_trade_pct / max(sl_pct, 0.01), 15.0), 1)

        # Risk review note
        risk_notes = []
        if spread_warning:
            risk_notes.append(spread_warning)
        risk_notes.append(f"Dynamic stop calibrated to 1.5x ATR (${atr:.2f}), limiting trade downside to {sl_pct*100:.2f}%.")
        risk_notes.append(f"Recommended position allocation: {recommended_pos_pct}% of account portfolio.")

        return {
            "entry_zone": entry_zone,
            "stop_loss": stop_loss,
            "take_profit_1": tp1,
            "take_profit_2": tp2,
            "risk_reward_ratio": risk_reward,
            "recommended_position_pct": recommended_pos_pct,
            "risk_view": " ".join(risk_notes)
        }

risk_agent = RiskAgent()
