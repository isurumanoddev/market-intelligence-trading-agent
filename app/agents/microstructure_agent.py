from app.models.decision import MicrostructureMetrics

class MicrostructureAgent:
    def interpret(self, metrics: MicrostructureMetrics, current_price: float) -> str:
        parts = []

        # Order Book Imbalance Assessment
        obi = metrics.order_book_imbalance
        if obi > 0.35:
            parts.append(f"Heavy bid book depth skew (+{int(obi*100)}% imbalance), indicating strong passive buyer accumulation at current levels.")
        elif obi > 0.10:
            parts.append(f"Moderate bid support leaning (+{int(obi*100)}% imbalance), indicating modest buyer preference.")
        elif obi < -0.35:
            parts.append(f"Heavy ask book resistance skew ({int(obi*100)}% imbalance), indicating heavy overhead supply and sell walls.")
        elif obi < -0.10:
            parts.append(f"Moderate ask dominance ({int(obi*100)}% imbalance), suggesting overhead selling friction.")
        else:
            parts.append("Order book depth is closely balanced between buyers and sellers.")

        # Trade Tape & CVD Assessment
        if metrics.cvd_side == "BUY_DOMINANT":
            parts.append(f"Trade tape indicates aggressive market buying dominance (CVD: +{metrics.cvd:.2f}).")
        elif metrics.cvd_side == "SELL_DOMINANT":
            parts.append(f"Trade tape reflects aggressive market selling pressure (CVD: {metrics.cvd:.2f}).")
        else:
            parts.append("Aggressive market orders are evenly matched on the trade tape.")

        # Whale trades and walls
        if metrics.whale_trades_detected > 0:
            parts.append(f"{metrics.whale_trades_detected} high-volume institutional whale transactions detected on the tape.")

        if metrics.large_bid_walls:
            top_wall = metrics.large_bid_walls[0]
            parts.append(f"Significant bid support wall identified at ${top_wall['price']:,.2f} (${top_wall['usd_value']:,.0f}).")

        if metrics.large_ask_walls:
            top_wall = metrics.large_ask_walls[0]
            parts.append(f"Noteworthy ask resistance wall located at ${top_wall['price']:,.2f} (${top_wall['usd_value']:,.0f}).")

        return " ".join(parts)

microstructure_agent = MicrostructureAgent()
