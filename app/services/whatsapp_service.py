import os
import urllib.parse
import requests
from typing import Optional, Dict, Any, List
from app.config import settings

class WhatsAppService:
    """
    Unified WhatsApp Notification Service.
    Supports:
    1. CallMeBot WhatsApp API (100% Free, zero-setup for personal bots)
       URL: https://api.callmebot.com/whatsapp.php?phone={phone}&text={text}&apikey={apikey}
    2. Twilio WhatsApp REST API (Enterprise)
       URL: https://api.twilio.com/2010-04-01/Accounts/{AccountSid}/Messages.json
    3. Custom Webhook (Custom WhatsApp bot gateway, Discord, n8n, etc.)
    """

    def is_configured(self) -> bool:
        provider = getattr(settings, "whatsapp_provider", "callmebot").lower()
        if provider == "callmebot":
            phone = getattr(settings, "whatsapp_phone", "") or os.getenv("WHATSAPP_PHONE", "")
            key = getattr(settings, "whatsapp_callmebot_key", "") or os.getenv("WHATSAPP_CALLMEBOT_KEY", "")
            return bool(phone.strip() and key.strip())
        elif provider == "twilio":
            sid = getattr(settings, "twilio_account_sid", "") or os.getenv("TWILIO_ACCOUNT_SID", "")
            token = getattr(settings, "twilio_auth_token", "") or os.getenv("TWILIO_AUTH_TOKEN", "")
            phone = getattr(settings, "whatsapp_phone", "") or os.getenv("WHATSAPP_PHONE", "")
            return bool(sid.strip() and token.strip() and phone.strip())
        elif provider == "webhook":
            url = getattr(settings, "whatsapp_webhook_url", "") or os.getenv("WHATSAPP_WEBHOOK_URL", "")
            return bool(url.strip())
        return False

    def send_message(self, text: str) -> Dict[str, Any]:
        """Dispatches a plain text or markdown message to WhatsApp based on active provider."""
        provider = getattr(settings, "whatsapp_provider", "callmebot").lower()

        if provider == "callmebot":
            phone = getattr(settings, "whatsapp_phone", "") or os.getenv("WHATSAPP_PHONE", "")
            key = getattr(settings, "whatsapp_callmebot_key", "") or os.getenv("WHATSAPP_CALLMEBOT_KEY", "")
            
            clean_phone = phone.strip().replace("+", "").replace(" ", "").replace("-", "")
            clean_key = key.strip()

            if not clean_phone or not clean_key:
                return {"success": False, "provider": "callmebot", "error": "WhatsApp phone or CallMeBot API key missing."}

            encoded_text = urllib.parse.quote(text)
            url = f"https://api.callmebot.com/whatsapp.php?phone={clean_phone}&text={encoded_text}&apikey={clean_key}"
            
            try:
                resp = requests.get(url, timeout=8.0)
                if resp.status_code == 200:
                    return {"success": True, "provider": "callmebot", "response": resp.text[:100]}
                return {"success": False, "provider": "callmebot", "error": f"HTTP {resp.status_code}: {resp.text[:120]}"}
            except Exception as e:
                return {"success": False, "provider": "callmebot", "error": str(e)}

        elif provider == "twilio":
            sid = getattr(settings, "twilio_account_sid", "") or os.getenv("TWILIO_ACCOUNT_SID", "")
            token = getattr(settings, "twilio_auth_token", "") or os.getenv("TWILIO_AUTH_TOKEN", "")
            from_num = getattr(settings, "twilio_from_number", "") or os.getenv("TWILIO_FROM_NUMBER", "whatsapp:+14155238886")
            to_num = getattr(settings, "whatsapp_phone", "") or os.getenv("WHATSAPP_PHONE", "")

            if not sid or not token or not to_num:
                return {"success": False, "provider": "twilio", "error": "Twilio credentials or destination number missing."}

            clean_to = to_num if to_num.startswith("whatsapp:") else f"whatsapp:{to_num}"
            clean_from = from_num if from_num.startswith("whatsapp:") else f"whatsapp:{from_num}"

            url = f"https://api.twilio.com/2010-04-01/Accounts/{sid}/Messages.json"
            try:
                resp = requests.post(
                    url,
                    auth=(sid, token),
                    data={"From": clean_from, "To": clean_to, "Body": text},
                    timeout=8.0
                )
                if resp.status_code in [200, 201]:
                    return {"success": True, "provider": "twilio", "sid": resp.json().get("sid")}
                return {"success": False, "provider": "twilio", "error": f"HTTP {resp.status_code}: {resp.text[:120]}"}
            except Exception as e:
                return {"success": False, "provider": "twilio", "error": str(e)}

        elif provider == "webhook":
            url = getattr(settings, "whatsapp_webhook_url", "") or os.getenv("WHATSAPP_WEBHOOK_URL", "")
            if not url:
                return {"success": False, "provider": "webhook", "error": "Webhook URL missing."}
            try:
                resp = requests.post(url, json={"text": text, "message": text, "content": text}, timeout=6.0)
                return {"success": resp.status_code in [200, 201, 204], "provider": "webhook"}
            except Exception as e:
                return {"success": False, "provider": "webhook", "error": str(e)}

        return {"success": False, "provider": provider, "error": f"Unknown provider: {provider}"}

    def format_trading_signal(
        self,
        symbol: str,
        side: str,
        entry_price: float,
        stop_loss: float,
        take_profit_1: float,
        take_profit_2: float,
        current_price: float,
        grade: str = "A+",
        win_expectancy: float = 82.0,
        confluences: Optional[List[str]] = None,
        recommended_size_usd: float = 10.0,
        recommended_leverage: int = 10
    ) -> str:
        """Formats a high-conviction institutional crypto signal for WhatsApp."""
        is_long = side.upper() in ["BUY", "LONG"]
        side_emoji = "🟢 LONG (BUY)" if is_long else "🔴 SHORT (SELL)"
        badge = "🚀" if grade == "A+" else "⚡"
        
        # Calculate percentages
        if is_long:
            sl_pct = ((stop_loss - entry_price) / entry_price) * 100.0
            tp1_pct = ((take_profit_1 - entry_price) / entry_price) * 100.0
            tp2_pct = ((take_profit_2 - entry_price) / entry_price) * 100.0
        else:
            sl_pct = ((entry_price - stop_loss) / entry_price) * 100.0
            tp1_pct = ((entry_price - take_profit_1) / entry_price) * 100.0
            tp2_pct = ((entry_price - take_profit_2) / entry_price) * 100.0

        risk_dist = abs(entry_price - stop_loss) or (entry_price * 0.015)
        rr1 = abs(take_profit_1 - entry_price) / risk_dist if risk_dist > 0 else 2.0
        rr2 = abs(take_profit_2 - entry_price) / risk_dist if risk_dist > 0 else 3.5

        conf_lines = ""
        if confluences:
            conf_lines = "\n".join([f"• {c}" for c in confluences[:4]])
        else:
            conf_lines = "• Institutional OTE Pullback Retest\n• Multi-Timeframe Trend Confluence"

        msg = (
            f"🚨 *QUANTMIND VIP SIGNAL: {symbol}* 🚨\n\n"
            f"⚡ *Action:* {side_emoji}\n"
            f"📊 *Quality:* {badge} GRADE {grade} (Win Expectancy: {win_expectancy:.1f}%)\n"
            f"💵 *Live Market Price:* ${current_price:,.2f}\n\n"
            f"🎯 *BEST ENTRY POINT:* `${entry_price:,.2f}`\n"
            f"🛡️ *STOP LOSS (SL):* `${stop_loss:,.2f}` ({sl_pct:+.2f}%)\n"
            f"💰 *TAKE PROFIT 1:* `${take_profit_1:,.2f}` ({tp1_pct:+.2f}% • 1:{rr1:.1f} R:R)\n"
            f"🚀 *TAKE PROFIT 2:* `${take_profit_2:,.2f}` ({tp2_pct:+.2f}% • 1:{rr2:.1f} R:R)\n\n"
            f"📈 *Institutional Confluence:*\n"
            f"{conf_lines}\n\n"
            f"💡 *Risk Management:*\n"
            f"• Position Size: ${recommended_size_usd:,.2f} USD\n"
            f"• Leverage: {recommended_leverage}x (Margin: ${(recommended_size_usd/recommended_leverage):,.2f})\n"
            f"• Strategy: Optimal Trade Entry (OTE) Bracket"
        )
        return msg

    def send_signal(
        self,
        symbol: str,
        side: str,
        entry_price: float,
        stop_loss: float,
        take_profit_1: float,
        take_profit_2: float,
        current_price: float,
        grade: str = "A+",
        win_expectancy: float = 82.0,
        confluences: Optional[List[str]] = None,
        recommended_size_usd: float = 10.0,
        recommended_leverage: int = 10
    ) -> Dict[str, Any]:
        """Builds and dispatches the formatted signal to WhatsApp."""
        text = self.format_trading_signal(
            symbol=symbol,
            side=side,
            entry_price=entry_price,
            stop_loss=stop_loss,
            take_profit_1=take_profit_1,
            take_profit_2=take_profit_2,
            current_price=current_price,
            grade=grade,
            win_expectancy=win_expectancy,
            confluences=confluences,
            recommended_size_usd=recommended_size_usd,
            recommended_leverage=recommended_leverage
        )
        return self.send_message(text)

whatsapp_service = WhatsAppService()
