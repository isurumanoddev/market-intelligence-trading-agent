// Market Intelligence & AI Trading Agent Dashboard Logic

let currentSymbol = "BTC/USDT";
let currentTimeframe = "1h";
let refreshIntervalMs = 10000;
let refreshTimer = null;
let lastAnalysisData = null;
let currentPrice = 0.0;

// DOM Elements
const currentSymbolLabel = document.getElementById("current-symbol-label");
const currentPriceVal = document.getElementById("current-price-val");
const currentChangeVal = document.getElementById("current-change-val");
const highLowVal = document.getElementById("high-low-val");
const volume24hVal = document.getElementById("volume-24h-val");
const exchangeBadge = document.getElementById("exchange-badge");

const obiTag = document.getElementById("obi-tag");
const obiBidFill = document.getElementById("obi-bid-fill");
const obiAskFill = document.getElementById("obi-ask-fill");
const obiBidVal = document.getElementById("obi-bid-val");
const obiAskVal = document.getElementById("obi-ask-val");
const cvdVal = document.getElementById("cvd-val");
const spreadVal = document.getElementById("spread-val");

const orderbookAsks = document.getElementById("orderbook-asks");
const orderbookBids = document.getElementById("orderbook-bids");
const bookMidPrice = document.getElementById("book-mid-price");
const bookSpreadInfo = document.getElementById("book-spread-info");
const wallItems = document.getElementById("wall-items");
const tradeTapeList = document.getElementById("trade-tape-list");

const rsiVal = document.getElementById("rsi-val");
const rsiBadge = document.getElementById("rsi-badge");
const trendVal = document.getElementById("trend-val");
const trendBadge = document.getElementById("trend-badge");
const macdVal = document.getElementById("macd-val");
const macdBadge = document.getElementById("macd-badge");
const vwapVal = document.getElementById("vwap-val");
const vwapBadge = document.getElementById("vwap-badge");

const decisionActionBadge = document.getElementById("decision-action-badge");
const convictionPct = document.getElementById("conviction-pct");
const convictionBarFill = document.getElementById("conviction-bar-fill");
const decisionSummaryText = document.getElementById("decision-summary-text");
const decisionModelTag = document.getElementById("decision-model-tag");
const execEntry = document.getElementById("exec-entry");
const execSl = document.getElementById("exec-sl");
const execTp1 = document.getElementById("exec-tp1");
const execRr = document.getElementById("exec-rr");
const execSuggestedSide = document.getElementById("exec-suggested-side");
const btnExecutePaperTrade = document.getElementById("btn-execute-paper-trade");

const confluenceReasonsList = document.getElementById("confluence-reasons-list");
const microViewText = document.getElementById("micro-view-text");
const newsViewText = document.getElementById("news-view-text");
const riskViewText = document.getElementById("risk-view-text");

const newsItemsScroll = document.getElementById("news-items-scroll");
const newsOverallTag = document.getElementById("news-overall-tag");

// Portfolio elements
const portCash = document.getElementById("port-cash");
const portEquity = document.getElementById("port-equity");
const portPnl = document.getElementById("port-pnl");
const portOpenCount = document.getElementById("port-open-count");
const positionsTbody = document.getElementById("positions-tbody");

// Initialize on page load
document.addEventListener("DOMContentLoaded", () => {
  setupEventListeners();
  checkSettings();
  loadData();
  loadPortfolio();
  startRefreshTimer();
});

function setupEventListeners() {
  // Quick Symbol Buttons
  document.querySelectorAll(".sym-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".sym-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      currentSymbol = btn.getAttribute("data-sym");
      loadData();
    });
  });

  // Custom Symbol input
  document.getElementById("custom-symbol-btn").addEventListener("click", () => {
    const custom = document.getElementById("custom-symbol-input").value.trim();
    if (custom) {
      currentSymbol = custom.toUpperCase();
      document.querySelectorAll(".sym-btn").forEach((b) => b.classList.remove("active"));
      loadData();
    }
  });

  // Timeframe buttons
  document.querySelectorAll(".tf-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tf-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      currentTimeframe = btn.getAttribute("data-tf");
      loadCandles();
    });
  });

  // Center Tabs (Order Book vs Tape)
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
      document.querySelectorAll(".tab-content").forEach((c) => c.classList.remove("active"));
      btn.classList.add("active");
      const target = document.getElementById(btn.getAttribute("data-tab"));
      if (target) target.classList.add("active");
    });
  });

  // Specialist Tabs
  document.querySelectorAll(".spec-tab").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".spec-tab").forEach((b) => b.classList.remove("active"));
      document.querySelectorAll(".spec-content").forEach((c) => c.classList.remove("active"));
      btn.classList.add("active");
      const target = document.getElementById(btn.getAttribute("data-spec"));
      if (target) target.classList.add("active");
    });
  });

  // Refresh interval select
  document.getElementById("auto-refresh-select").addEventListener("change", (e) => {
    refreshIntervalMs = parseInt(e.target.value, 10);
    startRefreshTimer();
  });

  // Manual run analysis button
  document.getElementById("refresh-now-btn").addEventListener("click", () => {
    loadData();
    loadPortfolio();
  });

  // Execute Paper Trade
  btnExecutePaperTrade.addEventListener("click", handleExecuteTrade);

  // Reset Portfolio
  document.getElementById("port-reset-btn").addEventListener("click", async () => {
    if (confirm("Reset paper trading portfolio balance to $100,000?")) {
      await fetch("/api/portfolio/reset", { method: "POST" });
      loadPortfolio();
    }
  });

  // Settings Modal
  const modal = document.getElementById("settings-modal");
  document.getElementById("open-settings-btn").addEventListener("click", openSettingsModal);
  document.getElementById("gemini-status-btn").addEventListener("click", openSettingsModal);
  document.getElementById("close-settings-modal").addEventListener("click", () => {
    modal.classList.add("hidden");
  });
  document.getElementById("btn-save-settings").addEventListener("click", saveSettings);
}

function startRefreshTimer() {
  if (refreshTimer) clearInterval(refreshTimer);
  if (refreshIntervalMs > 0) {
    refreshTimer = setInterval(() => {
      loadData(false); // quiet refresh
      loadPortfolio();
    }, refreshIntervalMs);
  }
}

// Check Settings & Gemini Status
async function checkSettings() {
  try {
    const res = await fetch("/api/settings");
    const data = await res.json();
    const geminiBtn = document.getElementById("gemini-status-btn");
    const geminiText = document.getElementById("gemini-status-text");

    if (data.has_gemini_key) {
      geminiBtn.classList.remove("inactive");
      geminiText.textContent = "Gemini 2.5 Active";
    } else {
      geminiBtn.classList.add("inactive");
      geminiText.textContent = "Add Gemini Key";
    }

    document.getElementById("select-default-exchange").value = data.default_exchange || "kraken";
    document.getElementById("input-risk-trade").value = data.max_risk_per_trade_pct || 2.0;
    document.getElementById("input-max-spread").value = data.max_spread_pct || 0.5;
  } catch (e) {
    console.error("Error loading settings:", e);
  }
}

function openSettingsModal() {
  document.getElementById("settings-modal").classList.remove("hidden");
}

async function saveSettings() {
  const geminiKey = document.getElementById("input-gemini-key").value.trim();
  const exchange = document.getElementById("select-default-exchange").value;
  const riskTrade = parseFloat(document.getElementById("input-risk-trade").value);
  const maxSpread = parseFloat(document.getElementById("input-max-spread").value);

  const payload = {
    default_exchange: exchange,
    max_risk_per_trade_pct: riskTrade,
    max_spread_pct: maxSpread,
  };
  if (geminiKey) {
    payload.gemini_api_key = geminiKey;
  }

  try {
    const res = await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      document.getElementById("settings-modal").classList.add("hidden");
      checkSettings();
      loadData();
    }
  } catch (e) {
    alert("Failed to save settings: " + e.message);
  }
}

// Master Data Load
async function loadData(showLoading = true) {
  currentSymbolLabel.textContent = currentSymbol;
  try {
    const res = await fetch(`/api/analysis?symbol=${encodeURIComponent(currentSymbol)}`);
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || "Analysis failed");
    }
    const data = await res.json();
    lastAnalysisData = data;
    renderAnalysis(data);
    loadCandles();
  } catch (e) {
    console.error("Data load error:", e);
    decisionSummaryText.textContent = "Error loading market data: " + e.message;
  }
}

function renderAnalysis(data) {
  const { ticker, order_book, trades, indicators, microstructure, sentiment, news, decision } = data;
  currentPrice = ticker.price;

  // 1. Ticker Banner
  currentPriceVal.textContent = `$${formatPrice(ticker.price)}`;
  const change = ticker.change_pct_24h || 0.0;
  currentChangeVal.textContent = `${change >= 0 ? "+" : ""}${change.toFixed(2)}%`;
  currentChangeVal.className = "ticker-change " + (change >= 0 ? "green-text" : "red-text");

  highLowVal.textContent = `$${formatPrice(ticker.high_24h)} / $${formatPrice(ticker.low_24h)}`;
  volume24hVal.textContent = `${ticker.volume_24h.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  exchangeBadge.textContent = ticker.exchange;

  // 2. Order Book Imbalance Gauge
  const obi = microstructure.order_book_imbalance;
  const obiPercent = (obi * 100).toFixed(1);
  obiTag.textContent = `${obi >= 0 ? "+" : ""}${obiPercent}%`;
  obiTag.className = "imbalance-tag " + (obi >= 0 ? "green-text" : "red-text");

  const bidShare = Math.max(10, Math.min(90, Math.round(50 + (obi * 40))));
  obiBidFill.style.width = `${bidShare}%`;
  obiAskFill.style.width = `${100 - bidShare}%`;
  obiBidVal.textContent = `$${formatCompact(microstructure.bid_depth_usd)}`;
  obiAskVal.textContent = `$${formatCompact(microstructure.ask_depth_usd)}`;

  // CVD & Spread
  cvdVal.textContent = `${microstructure.cvd >= 0 ? "+" : ""}${microstructure.cvd.toFixed(2)} (${microstructure.cvd_side})`;
  cvdVal.className = "ticker-val cvd-badge " + (microstructure.cvd >= 0 ? "green-text" : "red-text");
  spreadVal.textContent = `${microstructure.spread_pct.toFixed(3)}% (${microstructure.spread_bps.toFixed(1)} bps)`;

  // 3. Technical Indicators
  rsiVal.textContent = indicators.rsi !== null ? indicators.rsi.toFixed(1) : "--";
  rsiBadge.textContent = indicators.rsi_state || "NEUTRAL";
  rsiBadge.className = "ind-badge " + (indicators.rsi_state === "OVERSOLD" ? "green-text" : (indicators.rsi_state === "OVERBOUGHT" ? "red-text" : ""));

  trendVal.textContent = indicators.trend_state || "NEUTRAL";
  trendVal.className = "ind-value " + (indicators.trend_state === "BULLISH" ? "green-text" : (indicators.trend_state === "BEARISH" ? "red-text" : ""));

  macdVal.textContent = indicators.macd_hist !== null ? (indicators.macd_hist >= 0 ? "+" : "") + indicators.macd_hist.toFixed(3) : "--";
  macdBadge.textContent = (indicators.macd_hist || 0) >= 0 ? "BULLISH" : "BEARISH";
  macdBadge.className = "ind-badge " + ((indicators.macd_hist || 0) >= 0 ? "green-text" : "red-text");

  vwapVal.textContent = indicators.vwap ? `$${formatPrice(indicators.vwap)}` : "--";
  vwapBadge.textContent = ticker.price >= (indicators.vwap || 0) ? "ABOVE VWAP" : "BELOW VWAP";

  // 4. Order Book Depth Ladder
  renderOrderBook(order_book);

  // 5. Trade Tape
  renderTradeTape(trades);

  // 6. Master AI Decision Card
  renderDecision(decision);

  // 7. News Feed
  renderNews(news, sentiment);
}

function renderOrderBook(ob) {
  // Asks (displayed in reverse order so lowest ask is closest to spread)
  const asks = ob.asks.slice(0, 10).reverse();
  orderbookAsks.innerHTML = asks
    .map(
      (a) => `
      <div class="book-row ask">
        <div class="depth-bar" style="width: ${a.depth_pct}%"></div>
        <span class="red-text">$${formatPrice(a.price)}</span>
        <span>${a.amount.toFixed(4)}</span>
        <span>${a.total.toFixed(4)}</span>
      </div>
    `
    )
    .join("");

  // Spread Strip
  bookMidPrice.textContent = `$${formatPrice((ob.best_bid + ob.best_ask) / 2)}`;
  bookSpreadInfo.textContent = `Spread: $${ob.spread.toFixed(2)} (${ob.spread_pct.toFixed(2)}%)`;

  // Bids
  const bids = ob.bids.slice(0, 10);
  orderbookBids.innerHTML = bids
    .map(
      (b) => `
      <div class="book-row bid">
        <div class="depth-bar" style="width: ${b.depth_pct}%"></div>
        <span class="green-text">$${formatPrice(b.price)}</span>
        <span>${b.amount.toFixed(4)}</span>
        <span>${b.total.toFixed(4)}</span>
      </div>
    `
    )
    .join("");

  // Walls
  const allWalls = [...(lastAnalysisData.microstructure.large_bid_walls || []), ...(lastAnalysisData.microstructure.large_ask_walls || [])];
  if (allWalls.length > 0) {
    wallItems.innerHTML = allWalls
      .map((w) => `<span>Block: $${formatPrice(w.price)} (${w.amount} units / $${formatCompact(w.usd_value)})</span>`)
      .join(" | ");
  } else {
    wallItems.textContent = "No abnormal wall blocks detected.";
  }
}

function renderTradeTape(trades) {
  tradeTapeList.innerHTML = trades
    .map(
      (t) => `
      <div class="tape-row ${t.is_whale ? "whale" : ""}">
        <span>${t.time_str}</span>
        <span class="${t.side === "buy" ? "green-text" : "red-text"}">${t.side.toUpperCase()} ${t.is_whale ? "🐋" : ""}</span>
        <span>$${formatPrice(t.price)}</span>
        <span>${t.amount.toFixed(4)}</span>
        <span>$${formatCompact(t.cost)}</span>
      </div>
    `
    )
    .join("");
}

function renderDecision(dec) {
  const actionClean = dec.action.toLowerCase().replace("_", "-");
  decisionActionBadge.textContent = dec.action.replace("_", " ");
  decisionActionBadge.className = `action-badge ${actionClean}`;

  convictionPct.textContent = `${dec.conviction}%`;
  convictionBarFill.style.width = `${dec.conviction}%`;
  if (dec.action.includes("BUY")) {
    convictionBarFill.style.background = "var(--color-green)";
  } else if (dec.action.includes("SELL")) {
    convictionBarFill.style.background = "var(--color-red)";
  } else {
    convictionBarFill.style.background = "var(--color-blue)";
  }

  decisionSummaryText.textContent = dec.summary;
  decisionModelTag.textContent = dec.model_used;

  // Levels
  execEntry.textContent = dec.entry_zone && dec.entry_zone.length ? `$${formatPrice(dec.entry_zone[0])} - $${formatPrice(dec.entry_zone[1])}` : `$${formatPrice(dec.current_price)}`;
  execSl.textContent = `$${formatPrice(dec.stop_loss)}`;
  execTp1.textContent = `$${formatPrice(dec.take_profit_1)}`;
  execRr.textContent = `1 : ${dec.risk_reward_ratio}`;

  const side = dec.action.includes("SELL") ? "SELL" : "BUY";
  execSuggestedSide.textContent = side;
  btnExecutePaperTrade.style.background = side === "BUY" ? "linear-gradient(135deg, #10b981, #059669)" : "linear-gradient(135deg, #f43f5e, #be123c)";

  // Confluence Reasons
  confluenceReasonsList.innerHTML = dec.reasons.map((r) => `<li>${r}</li>`).join("");
  microViewText.textContent = dec.microstructure_view || "Balanced order flow.";
  newsViewText.textContent = dec.news_view || "Normal news flow.";
  riskViewText.textContent = dec.risk_view || "Standard risk metrics applied.";
}

function renderNews(news, sentiment) {
  newsOverallTag.textContent = `${sentiment.overall_sentiment_label} (${sentiment.overall_sentiment_score >= 0 ? "+" : ""}${sentiment.overall_sentiment_score.toFixed(2)})`;
  newsOverallTag.className = "news-sentiment-badge " + (sentiment.overall_sentiment_label === "BULLISH" ? "green-text" : (sentiment.overall_sentiment_label === "BEARISH" ? "red-text" : ""));

  if (!news || news.length === 0) {
    newsItemsScroll.innerHTML = `<div class="loading-news">No recent headlines found.</div>`;
    return;
  }

  newsItemsScroll.innerHTML = news
    .map(
      (item) => `
      <a href="${item.url}" target="_blank" rel="noopener noreferrer" class="news-card">
        <div class="news-card-meta">
          <span>${item.source} • ${item.published_at.slice(0, 16)}</span>
          <div class="news-badges">
            <span class="tag-badge ${item.sentiment_label === "BULLISH" ? "green-text" : (item.sentiment_label === "BEARISH" ? "red-text" : "")}">
              ${item.sentiment_label}
            </span>
            <span class="tag-badge">${item.catalyst_type}</span>
          </div>
        </div>
        <div class="news-card-title">${item.title}</div>
      </a>
    `
    )
    .join("");
}

// Candlestick SVG Chart
async function loadCandles() {
  try {
    const res = await fetch(`/api/market/candles?symbol=${encodeURIComponent(currentSymbol)}&timeframe=${currentTimeframe}&limit=45`);
    if (!res.ok) return;
    const candles = await res.json();
    renderCandlestickSvg(candles);
  } catch (e) {
    console.error("Error loading candles:", e);
  }
}

function renderCandlestickSvg(candles) {
  const svg = document.getElementById("candlestick-svg");
  if (!candles || candles.length < 5) return;

  const width = svg.clientWidth || 400;
  const height = 280;
  const padding = { top: 20, right: 50, bottom: 40, left: 10 };
  const plotW = width - padding.left - padding.right;
  const plotH = height - padding.top - padding.bottom;

  const minP = Math.min(...candles.map((c) => c.low));
  const maxP = Math.max(...candles.map((c) => c.high));
  const pRange = maxP - minP || 1.0;

  const n = candles.length;
  const candleW = Math.max(plotW / n - 3, 2);

  const getY = (p) => padding.top + plotH - ((p - minP) / pRange) * plotH;
  const getX = (i) => padding.left + i * (plotW / n) + (plotW / n) / 2;

  let svgContent = "";

  // Grid lines
  for (let i = 0; i <= 4; i++) {
    const priceVal = minP + (pRange / 4) * i;
    const y = getY(priceVal);
    svgContent += `<line x1="${padding.left}" y1="${y}" x2="${width - padding.right}" y2="${y}" stroke="#1e293b" stroke-dasharray="3,3" />`;
    svgContent += `<text x="${width - padding.right + 6}" y="${y + 3}" fill="#64748b" font-size="10" font-family="JetBrains Mono">$${formatPrice(priceVal)}</text>`;
  }

  // Candlesticks
  candles.forEach((c, idx) => {
    const isUp = c.close >= c.open;
    const color = isUp ? "#10b981" : "#f43f5e";
    const cx = getX(idx);
    const wickTop = getY(c.high);
    const wickBot = getY(c.low);
    const bodyTop = getY(Math.max(c.open, c.close));
    const bodyBot = getY(Math.min(c.open, c.close));
    const bodyH = Math.max(bodyBot - bodyTop, 1.5);

    // Wick
    svgContent += `<line x1="${cx}" y1="${wickTop}" x2="${cx}" y2="${wickBot}" stroke="${color}" stroke-width="1.2" />`;
    // Body
    svgContent += `<rect x="${cx - candleW / 2}" y="${bodyTop}" width="${candleW}" height="${bodyH}" fill="${color}" rx="1" />`;
  });

  svg.innerHTML = svgContent;
}

// Paper Trading Execution & Portfolio
async function handleExecuteTrade() {
  if (!lastAnalysisData || !lastAnalysisData.decision) {
    alert("No active AI decision available.");
    return;
  }
  const dec = lastAnalysisData.decision;
  const side = dec.action.includes("SELL") ? "SELL" : "BUY";
  
  // Calculate recommended trade amount based on $10,000 baseline or risk pct
  const tradeValue = 5000.0; // standard $5,000 test allocation
  const amount = tradeValue / dec.current_price;

  const payload = {
    symbol: currentSymbol,
    side: side,
    price: dec.current_price,
    amount: parseFloat(amount.toFixed(6)),
    stop_loss: dec.stop_loss,
    take_profit: dec.take_profit_1,
    reason: `AI ${dec.action} (${dec.conviction}% Conviction)`,
  };

  try {
    const res = await fetch("/api/portfolio/trade", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail);
    }
    loadPortfolio();
    alert(`Successfully executed ${side} ${amount.toFixed(4)} ${currentSymbol} at $${formatPrice(dec.current_price)}!`);
  } catch (e) {
    alert("Trade execution error: " + e.message);
  }
}

async function loadPortfolio() {
  try {
    const res = await fetch("/api/portfolio");
    if (!res.ok) return;
    const data = await res.json();

    portCash.textContent = `$${data.cash.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    portEquity.textContent = `$${data.equity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    
    const pnl = data.total_pnl;
    const pnlPct = data.total_pnl_pct;
    portPnl.textContent = `${pnl >= 0 ? "+" : ""}$${pnl.toFixed(2)} (${pnl >= 0 ? "+" : ""}${pnlPct.toFixed(2)}%)`;
    portPnl.className = "p-val " + (pnl >= 0 ? "green-text" : "red-text");

    portOpenCount.textContent = data.open_positions_count;

    if (!data.positions || data.positions.length === 0) {
      positionsTbody.innerHTML = `<tr><td colspan="11" class="empty-row">No active open positions. Execute a trade using the AI Decision button above.</td></tr>`;
      return;
    }

    positionsTbody.innerHTML = data.positions
      .map(
        (p) => `
        <tr>
          <td><strong>${p.symbol}</strong></td>
          <td class="${p.side === "BUY" ? "green-text" : "red-text"}"><strong>${p.side}</strong></td>
          <td>${p.amount}</td>
          <td>$${formatPrice(p.entry_price)}</td>
          <td>$${formatPrice(p.current_price)}</td>
          <td>$${formatCompact(p.cost_basis)}</td>
          <td>$${formatCompact(p.current_value)}</td>
          <td class="${p.unrealized_pnl >= 0 ? "green-text" : "red-text"}">
            ${p.unrealized_pnl >= 0 ? "+" : ""}$${p.unrealized_pnl.toFixed(2)} (${p.unrealized_pnl_pct.toFixed(2)}%)
          </td>
          <td>${p.stop_loss ? "$" + formatPrice(p.stop_loss) : "--"}</td>
          <td>${p.take_profit ? "$" + formatPrice(p.take_profit) : "--"}</td>
          <td>
            <button class="btn-close-pos" onclick="closePosition('${p.id}', ${p.current_price})">Close</button>
          </td>
        </tr>
      `
      )
      .join("");
  } catch (e) {
    console.error("Error loading portfolio:", e);
  }
}

window.closePosition = async function (posId, currentPrice) {
  try {
    const res = await fetch("/api/portfolio/close", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        position_id: posId,
        current_price: currentPrice,
        reason: "Manual close from dashboard",
      }),
    });
    if (res.ok) {
      loadPortfolio();
    }
  } catch (e) {
    alert("Close position failed: " + e.message);
  }
};

// Utilities
function formatPrice(val) {
  if (val === null || val === undefined || isNaN(val)) return "0.00";
  if (val >= 1000) {
    return val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  } else if (val >= 1) {
    return val.toFixed(4);
  } else {
    return val.toFixed(6);
  }
}

function formatCompact(val) {
  if (val === null || val === undefined || isNaN(val)) return "0";
  if (val >= 1_000_000) {
    return (val / 1_000_000).toFixed(2) + "M";
  } else if (val >= 1_000) {
    return (val / 1_000).toFixed(1) + "K";
  }
  return val.toFixed(2);
}
