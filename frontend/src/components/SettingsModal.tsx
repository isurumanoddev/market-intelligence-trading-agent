"use client";

import React, { useState } from "react";
import { SettingsData } from "@/types/market";
import { X, Key, Sliders, Server, Globe, MessageSquare, Send, CheckCircle2, AlertCircle } from "lucide-react";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: SettingsData | null;
  onSave: (payload: {
    gemini_api_key?: string;
    coinglass_api_key?: string;
    binance_testnet_api_key?: string;
    binance_testnet_secret?: string;
    bybit_testnet_api_key?: string;
    bybit_testnet_secret?: string;
    default_exchange?: string;
    max_risk_per_trade_pct?: number;
    max_spread_pct?: number;
    whatsapp_enabled?: boolean;
    whatsapp_provider?: string;
    whatsapp_phone?: string;
    whatsapp_callmebot_key?: string;
    twilio_account_sid?: string;
    twilio_auth_token?: string;
    twilio_from_number?: string;
    whatsapp_webhook_url?: string;
    btc_alert_watcher_enabled?: boolean;
  }) => Promise<void>;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSave,
}) => {
  const [apiKey, setApiKey] = useState("");
  const [coinglassKey, setCoinglassKey] = useState("");
  const [binanceKey, setBinanceKey] = useState("");
  const [binanceSecret, setBinanceSecret] = useState("");
  const [bybitKey, setBybitKey] = useState("");
  const [bybitSecret, setBybitSecret] = useState("");
  const [exchange, setExchange] = useState(settings?.default_exchange || "kraken");
  const [riskPct, setRiskPct] = useState(settings?.max_risk_per_trade_pct || 2.0);
  const [maxSpread, setMaxSpread] = useState(settings?.max_spread_pct || 0.5);

  // WhatsApp Alert States
  const [whatsappEnabled, setWhatsappEnabled] = useState(settings?.whatsapp_enabled ?? true);
  const [whatsappProvider, setWhatsappProvider] = useState(settings?.whatsapp_provider || "callmebot");
  const [whatsappPhone, setWhatsappPhone] = useState(settings?.whatsapp_phone || "");
  const [callmebotKey, setCallmebotKey] = useState("");
  const [twilioSid, setTwilioSid] = useState("");
  const [twilioToken, setTwilioToken] = useState("");
  const [twilioFrom, setTwilioFrom] = useState("whatsapp:+14155238886");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [btcWatcherEnabled, setBtcWatcherEnabled] = useState(settings?.btc_alert_watcher_enabled ?? true);

  const [isSaving, setIsSaving] = useState(false);
  const [isTestingWhatsApp, setIsTestingWhatsApp] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const payload: any = {
        default_exchange: exchange,
        max_risk_per_trade_pct: Number(riskPct),
        max_spread_pct: Number(maxSpread),
        whatsapp_enabled: whatsappEnabled,
        whatsapp_provider: whatsappProvider,
        btc_alert_watcher_enabled: btcWatcherEnabled,
      };
      if (apiKey.trim()) payload.gemini_api_key = apiKey.trim();
      if (coinglassKey.trim()) payload.coinglass_api_key = coinglassKey.trim();
      if (binanceKey.trim()) payload.binance_testnet_api_key = binanceKey.trim();
      if (binanceSecret.trim()) payload.binance_testnet_secret = binanceSecret.trim();
      if (bybitKey.trim()) payload.bybit_testnet_api_key = bybitKey.trim();
      if (bybitSecret.trim()) payload.bybit_testnet_secret = bybitSecret.trim();

      // WhatsApp fields
      if (whatsappPhone.trim()) payload.whatsapp_phone = whatsappPhone.trim();
      if (callmebotKey.trim()) payload.whatsapp_callmebot_key = callmebotKey.trim();
      if (twilioSid.trim()) payload.twilio_account_sid = twilioSid.trim();
      if (twilioToken.trim()) payload.twilio_auth_token = twilioToken.trim();
      if (twilioFrom.trim()) payload.twilio_from_number = twilioFrom.trim();
      if (webhookUrl.trim()) payload.whatsapp_webhook_url = webhookUrl.trim();

      await onSave(payload);
      onClose();
    } catch (err: any) {
      alert("Failed to save settings: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestWhatsApp = async () => {
    setIsTestingWhatsApp(true);
    setTestResult(null);
    try {
      // First save the current inputs temporarily so backend has them
      const updatePayload: any = {
        whatsapp_enabled: true,
        whatsapp_provider: whatsappProvider,
        btc_alert_watcher_enabled: true,
      };
      if (whatsappPhone.trim()) updatePayload.whatsapp_phone = whatsappPhone.trim();
      if (callmebotKey.trim()) updatePayload.whatsapp_callmebot_key = callmebotKey.trim();
      if (twilioSid.trim()) updatePayload.twilio_account_sid = twilioSid.trim();
      if (twilioToken.trim()) updatePayload.twilio_auth_token = twilioToken.trim();
      if (twilioFrom.trim()) updatePayload.twilio_from_number = twilioFrom.trim();
      if (webhookUrl.trim()) updatePayload.whatsapp_webhook_url = webhookUrl.trim();

      await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatePayload),
      });

      // Send test signal
      const res = await fetch("/api/alerts/whatsapp/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol: "BTC/USDT" }),
      });
      const data = await res.json();

      if (data?.dispatch?.success) {
        setTestResult({
          success: true,
          message: "✅ Test VIP Signal dispatched! Check your WhatsApp chat.",
        });
      } else {
        setTestResult({
          success: false,
          message: `⚠️ Dispatch error: ${data?.dispatch?.error || "Check phone number or API key format."}`,
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: `⚠️ Connection failed: ${err.message}`,
      });
    } finally {
      setIsTestingWhatsApp(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="bg-[#111622] border border-slate-700 rounded-lg w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-4 py-3 border-b border-slate-800 flex justify-between items-center bg-[#0d121c]">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-cyan-400" />
            <h3 className="font-bold text-sm text-white">System, Exchange & WhatsApp Alerts</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4 text-xs overflow-y-auto">
          {/* WhatsApp Signal Alerts Section */}
          <div className="bg-[#09101d] p-3.5 rounded-lg border border-emerald-500/30 space-y-3 shadow-inner">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-emerald-400" />
                <span className="font-bold text-emerald-300 text-xs">
                  📱 WhatsApp Best Entry Signals (BTC/USDT)
                </span>
              </div>
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                settings?.has_whatsapp ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400"
              }`}>
                {settings?.has_whatsapp ? "Active" : "Needs Config"}
              </span>
            </div>

            <p className="text-[11px] text-slate-300 leading-relaxed">
              When BTC price reaches the <strong>Optimal Trade Entry (OTE)</strong> retest zone with <strong>Grade A/A+</strong> confluence, the agent will immediately send a signal to your WhatsApp with Entry, Stop Loss, and Take Profits.
            </p>

            {/* Provider Tabs */}
            <div className="grid grid-cols-3 gap-1 p-1 bg-slate-950 rounded border border-slate-800 text-[11px]">
              <button
                type="button"
                onClick={() => setWhatsappProvider("callmebot")}
                className={`py-1 rounded font-medium transition-all ${
                  whatsappProvider === "callmebot"
                    ? "bg-emerald-600 text-white font-bold shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                CallMeBot (Free)
              </button>
              <button
                type="button"
                onClick={() => setWhatsappProvider("twilio")}
                className={`py-1 rounded font-medium transition-all ${
                  whatsappProvider === "twilio"
                    ? "bg-emerald-600 text-white font-bold shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Twilio Cloud
              </button>
              <button
                type="button"
                onClick={() => setWhatsappProvider("webhook")}
                className={`py-1 rounded font-medium transition-all ${
                  whatsappProvider === "webhook"
                    ? "bg-emerald-600 text-white font-bold shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Custom Webhook
              </button>
            </div>

            {/* CallMeBot Fields */}
            {whatsappProvider === "callmebot" && (
              <div className="space-y-2">
                <div className="bg-emerald-950/40 p-2 rounded border border-emerald-500/20 text-[10px] text-emerald-200/90 leading-normal space-y-1">
                  <p className="font-semibold text-emerald-300">⚡ 10-Second Free Setup:</p>
                  <p>1. Send WhatsApp message: <code className="bg-emerald-900/60 px-1 rounded text-white font-mono">I allow callmebot to send me messages</code> to <strong>+34 941 86 16 02</strong>.</p>
                  <p>2. Paste your Phone Number (with country code) and the API key received below.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-0.5">Phone Number (with Country Code):</label>
                    <input
                      type="text"
                      placeholder="+1234567890"
                      value={whatsappPhone}
                      onChange={(e) => setWhatsappPhone(e.target.value)}
                      className="w-full bg-[#060910] border border-slate-800 focus:border-emerald-500 rounded p-1.5 text-slate-200 font-mono text-[11px] outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-0.5">CallMeBot API Key:</label>
                    <input
                      type="password"
                      placeholder={settings?.has_callmebot_key ? "Key configured" : "Enter API Key..."}
                      value={callmebotKey}
                      onChange={(e) => setCallmebotKey(e.target.value)}
                      className="w-full bg-[#060910] border border-slate-800 focus:border-emerald-500 rounded p-1.5 text-slate-200 font-mono text-[11px] outline-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Twilio Fields */}
            {whatsappProvider === "twilio" && (
              <div className="space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="password"
                    placeholder="Twilio Account SID"
                    value={twilioSid}
                    onChange={(e) => setTwilioSid(e.target.value)}
                    className="w-full bg-[#060910] border border-slate-800 focus:border-emerald-500 rounded p-1.5 text-slate-200 font-mono text-[11px] outline-none"
                  />
                  <input
                    type="password"
                    placeholder="Twilio Auth Token"
                    value={twilioToken}
                    onChange={(e) => setTwilioToken(e.target.value)}
                    className="w-full bg-[#060910] border border-slate-800 focus:border-emerald-500 rounded p-1.5 text-slate-200 font-mono text-[11px] outline-none"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Twilio From: whatsapp:+14155238886"
                    value={twilioFrom}
                    onChange={(e) => setTwilioFrom(e.target.value)}
                    className="w-full bg-[#060910] border border-slate-800 focus:border-emerald-500 rounded p-1.5 text-slate-200 font-mono text-[11px] outline-none"
                  />
                  <input
                    type="text"
                    placeholder="Your Phone: +1234567890"
                    value={whatsappPhone}
                    onChange={(e) => setWhatsappPhone(e.target.value)}
                    className="w-full bg-[#060910] border border-slate-800 focus:border-emerald-500 rounded p-1.5 text-slate-200 font-mono text-[11px] outline-none"
                  />
                </div>
              </div>
            )}

            {/* Webhook Fields */}
            {whatsappProvider === "webhook" && (
              <div>
                <label className="text-[10px] text-slate-400 block mb-0.5">Webhook URL:</label>
                <input
                  type="text"
                  placeholder="https://your-webhook-service.com/whatsapp"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  className="w-full bg-[#060910] border border-slate-800 focus:border-emerald-500 rounded p-1.5 text-slate-200 font-mono text-[11px] outline-none"
                />
              </div>
            )}

            {/* Test WhatsApp Button & Feedback */}
            <div className="pt-1 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={handleTestWhatsApp}
                disabled={isTestingWhatsApp}
                className="px-3 py-1.5 rounded bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-[11px] flex items-center gap-1.5 shadow transition-all active:scale-95 disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isTestingWhatsApp ? "Sending Test Signal..." : "📲 Test WhatsApp Signal"}</span>
              </button>

              <label className="flex items-center gap-1.5 text-[10px] text-slate-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={btcWatcherEnabled}
                  onChange={(e) => setBtcWatcherEnabled(e.target.checked)}
                  className="rounded border-slate-700 text-emerald-500 focus:ring-emerald-500"
                />
                <span>Auto-Monitor BTC</span>
              </label>
            </div>

            {testResult && (
              <div className={`p-2 rounded text-[11px] flex items-center gap-1.5 ${
                testResult.success
                  ? "bg-emerald-950/60 border border-emerald-500/40 text-emerald-300"
                  : "bg-rose-950/60 border border-rose-500/40 text-rose-300"
              }`}>
                {testResult.success ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                <span>{testResult.message}</span>
              </div>
            )}
          </div>

          {/* Gemini Key */}
          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 font-semibold text-slate-300">
              <Key className="w-3.5 h-3.5 text-blue-400" />
              Google Gemini API Key:
            </label>
            <input
              type="password"
              placeholder={settings?.has_gemini_key ? "Key is configured (enter new to update)" : "Enter Gemini API Key..."}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="w-full bg-[#090d15] border border-slate-800 focus:border-blue-500 rounded p-2 text-slate-200 font-mono outline-none"
            />
            <p className="text-[10px] text-slate-500">
              Powers multi-agent synthesis and price forecasting. (Leave empty to use built-in quantitative heuristic engine).
            </p>
          </div>

          {/* CoinGlass Key */}
          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 font-semibold text-slate-300">
              <Key className="w-3.5 h-3.5 text-blue-400" />
              CoinGlass API Key (Optional):
            </label>
            <input
              type="password"
              placeholder={settings?.has_coinglass_key ? "Key is configured (enter new to update)" : "Enter CoinGlass API Key..."}
              value={coinglassKey}
              onChange={(e) => setCoinglassKey(e.target.value)}
              className="w-full bg-[#090d15] border border-slate-800 focus:border-blue-500 rounded p-2 text-slate-200 font-mono outline-none"
            />
          </div>

          {/* Binance Futures Testnet Keys */}
          <div className="bg-[#090e18] p-3 rounded-lg border border-amber-500/20 space-y-2">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-1.5 font-semibold text-amber-300">
                <Globe className="w-3.5 h-3.5 text-amber-400" />
                Binance Futures Testnet (Optional):
              </label>
              <a
                href="https://testnet.binancefuture.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] text-cyan-400 hover:underline"
              >
                testnet.binancefuture.com ↗
              </a>
            </div>
            <p className="text-[10px] text-slate-400">
              Allows routing paper orders directly to Binance Testnet orderbooks so you can watch your position live on Binance.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                type="password"
                placeholder={settings?.has_binance_testnet ? "Key configured" : "Testnet API Key"}
                value={binanceKey}
                onChange={(e) => setBinanceKey(e.target.value)}
                className="w-full bg-[#060910] border border-slate-800 focus:border-amber-500 rounded p-1.5 text-slate-200 font-mono text-[11px] outline-none"
              />
              <input
                type="password"
                placeholder={settings?.has_binance_testnet ? "Secret configured" : "Testnet Secret"}
                value={binanceSecret}
                onChange={(e) => setBinanceSecret(e.target.value)}
                className="w-full bg-[#060910] border border-slate-800 focus:border-amber-500 rounded p-1.5 text-slate-200 font-mono text-[11px] outline-none"
              />
            </div>
          </div>

          {/* Bybit Testnet Keys */}
          <div className="bg-[#090e18] p-3 rounded-lg border border-purple-500/20 space-y-2">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-1.5 font-semibold text-purple-300">
                <Globe className="w-3.5 h-3.5 text-purple-400" />
                Bybit Demo / Testnet (Optional):
              </label>
              <a
                href="https://testnet.bybit.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] text-cyan-400 hover:underline"
              >
                testnet.bybit.com ↗
              </a>
            </div>
            <p className="text-[10px] text-slate-400">
              Allows placing demo contracts on Bybit Testnet and monitoring on Bybit web interface.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                type="password"
                placeholder={settings?.has_bybit_testnet ? "Key configured" : "Bybit Testnet Key"}
                value={bybitKey}
                onChange={(e) => setBybitKey(e.target.value)}
                className="w-full bg-[#060910] border border-slate-800 focus:border-purple-500 rounded p-1.5 text-slate-200 font-mono text-[11px] outline-none"
              />
              <input
                type="password"
                placeholder={settings?.has_bybit_testnet ? "Secret configured" : "Bybit Testnet Secret"}
                value={bybitSecret}
                onChange={(e) => setBybitSecret(e.target.value)}
                className="w-full bg-[#060910] border border-slate-800 focus:border-purple-500 rounded p-1.5 text-slate-200 font-mono text-[11px] outline-none"
              />
            </div>
          </div>

          {/* Default Exchange */}
          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 font-semibold text-slate-300">
              <Server className="w-3.5 h-3.5 text-cyan-400" />
              Primary Exchange Market Data Feed:
            </label>
            <select
              value={exchange}
              onChange={(e) => setExchange(e.target.value)}
              className="w-full bg-[#090d15] border border-slate-800 focus:border-blue-500 rounded p-2 text-slate-200 outline-none"
            >
              <option value="kraken">Kraken (Default Spot / Futures)</option>
              <option value="coinbase">Coinbase</option>
              <option value="binance">Binance</option>
              <option value="bybit">Bybit</option>
            </select>
          </div>

          {/* Risk Limit */}
          <div className="space-y-1.5">
            <label className="font-semibold text-slate-300">Max Risk Per Trade (% of Balance):</label>
            <input
              type="number"
              step="0.5"
              min="0.5"
              max="10.0"
              value={riskPct}
              onChange={(e) => setRiskPct(Number(e.target.value))}
              className="w-full bg-[#090d15] border border-slate-800 focus:border-blue-500 rounded p-2 text-slate-200 font-mono outline-none"
            />
          </div>

          {/* Max Spread Limit */}
          <div className="space-y-1.5">
            <label className="font-semibold text-slate-300">Max Spread Threshold (%):</label>
            <input
              type="number"
              step="0.1"
              min="0.1"
              max="2.0"
              value={maxSpread}
              onChange={(e) => setMaxSpread(Number(e.target.value))}
              className="w-full bg-[#090d15] border border-slate-800 focus:border-blue-500 rounded p-2 text-slate-200 font-mono outline-none"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-2 border-t border-slate-800 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded bg-[#171f30] hover:bg-slate-800 text-slate-300 text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-colors disabled:opacity-50"
            >
              {isSaving ? "Saving..." : "Save Settings"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
