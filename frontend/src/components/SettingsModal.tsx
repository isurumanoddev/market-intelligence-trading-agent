"use client";

import React, { useState } from "react";
import { SettingsData } from "@/types/market";
import { X, Key, Sliders, Server, Globe } from "lucide-react";

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
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const payload: any = {
        default_exchange: exchange,
        max_risk_per_trade_pct: Number(riskPct),
        max_spread_pct: Number(maxSpread),
      };
      if (apiKey.trim()) payload.gemini_api_key = apiKey.trim();
      if (coinglassKey.trim()) payload.coinglass_api_key = coinglassKey.trim();
      if (binanceKey.trim()) payload.binance_testnet_api_key = binanceKey.trim();
      if (binanceSecret.trim()) payload.binance_testnet_secret = binanceSecret.trim();
      if (bybitKey.trim()) payload.bybit_testnet_api_key = bybitKey.trim();
      if (bybitSecret.trim()) payload.bybit_testnet_secret = bybitSecret.trim();

      await onSave(payload);
      onClose();
    } catch (err: any) {
      alert("Failed to save settings: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="bg-[#111622] border border-slate-700 rounded-lg w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-4 py-3 border-b border-slate-800 flex justify-between items-center bg-[#0d121c]">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-cyan-400" />
            <h3 className="font-bold text-sm text-white">System & Exchange Broker Settings</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4 text-xs overflow-y-auto">
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
