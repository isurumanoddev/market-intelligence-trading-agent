import os
import requests
from typing import Optional, Dict, Any
from app.config import settings

class TelegramService:
    """Dispatches trade and risk notifications to Telegram via Bot API."""
    
    BASE_URL = "https://api.telegram.org/bot{token}/sendMessage"

    def _get_credentials(self) -> tuple[str, str]:
        token = getattr(settings, "telegram_bot_token", "") or os.getenv("TELEGRAM_BOT_TOKEN", "")
        chat_id = getattr(settings, "telegram_chat_id", "") or os.getenv("TELEGRAM_CHAT_ID", "")
        return token.strip(), chat_id.strip()

    def is_configured(self) -> bool:
        token, chat_id = self._get_credentials()
        return bool(token and chat_id)

    def send_message(self, text: str, token: Optional[str] = None, chat_id: Optional[str] = None) -> bool:
        t = (token or self._get_credentials()[0]).strip()
        c = (chat_id or self._get_credentials()[1]).strip()
        if not t or not c:
            return False

        url = self.BASE_URL.format(token=t)
        payload = {
            "chat_id": c,
            "text": text,
            "parse_mode": "Markdown",
            "disable_web_page_preview": True
        }
        try:
            resp = requests.post(url, json=payload, timeout=3.5)
            return resp.status_code == 200
        except Exception:
            return False

    def send_trade_alert(
        self,
        action: str,
        symbol: str,
        price: float,
        amount: float,
        value_usd: float,
        stop_loss: Optional[float] = None,
        take_profit: Optional[float] = None,
        reason: str = ""
    ) -> bool:
        emoji = "🟢" if action.upper() == "BUY" else "🔴"
        lines = [
            f"{emoji} *TRADING BOT: {action.upper()} {symbol}*",
            f"• *Price:* `${price:,.2f}`",
            f"• *Size:* `{amount} {symbol.split('/')[0]}` (${value_usd:,.2f})",
        ]
        if stop_loss:
            lines.append(f"• *Stop Loss:* `${stop_loss:,.2f}`")
        if take_profit:
            lines.append(f"• *Take Profit:* `${take_profit:,.2f}`")
        if reason:
            lines.append(f"• *Signal:* _{reason}_")
        
        return self.send_message("\n".join(lines))

    def send_close_alert(
        self,
        symbol: str,
        side: str,
        price: float,
        pnl: float,
        pnl_pct: float,
        reason: str = ""
    ) -> bool:
        emoji = "🎯" if pnl >= 0 else "🛑"
        sign = "+" if pnl >= 0 else ""
        lines = [
            f"{emoji} *TRADING BOT: CLOSED {symbol} ({side})*",
            f"• *Exit Price:* `${price:,.2f}`",
            f"• *PnL:* `{sign}${pnl:,.2f}` ({sign}{pnl_pct:.2f}%)",
            f"• *Reason:* _{reason}_"
        ]
        return self.send_message("\n".join(lines))

    def send_circuit_breaker(self, loss_usd: float, max_limit: float) -> bool:
        text = (
            f"🚨 *RISK CIRCUIT BREAKER TRIGGERED*\n\n"
            f"Daily losses have reached *${loss_usd:,.2f}*, exceeding the maximum limit of *${max_limit:,.2f}*.\n\n"
            f"Trading engine has been *PAUSED* automatically to protect capital."
        )
        return self.send_message(text)

telegram_service = TelegramService()
