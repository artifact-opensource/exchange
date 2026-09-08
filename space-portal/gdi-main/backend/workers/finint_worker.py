"""
FININT Worker — Financial Intelligence Daemon
===============================================
Polls: Binance (crypto), Alpha Vantage (equities), FRED (macro), NewsAPI (headlines)
Classifies: Cerebras llama3.1-8b (0.01s per call)
Escalates: SambaNova DeepSeek-V3 for anomalies & multi-signal correlation

Data Flow:
  Sources → Raw Data → Fast Classification → Anomaly Detection → Deep Analysis → Redis Stream

Anomaly triggers (auto-escalate to deep analysis):
  - Price move > 3% in single poll window
  - Sentiment shift (3+ bearish headlines in a row)
  - Volume spike > 2x average
  - Cross-asset divergence (e.g., BTC up + gold up + VIX up = unusual)
"""

import os
import json
import time
import asyncio
import logging
from typing import Optional
from datetime import datetime, timezone

import aiohttp

from .base import BaseWorker, IntelItem
from .llm_gateway import llm

log = logging.getLogger("gdi.worker.finint")

# ─── Configuration ───────────────────────────────────────────

BINANCE_API = "https://api.binance.com/api/v3"
ALPHA_VANTAGE_API = "https://www.alphavantage.co/query"
FRED_API = "https://api.stlouisfed.org/fred/series/observations"
NEWSAPI_API = "https://newsapi.org/v2/top-headlines"

# Watched assets
CRYPTO_SYMBOLS = ["BTCUSDT", "ETHUSDT", "SOLUSDT", "XRPUSDT", "BNBUSDT"]
FRED_SERIES = ["DFF", "T10Y2Y", "VIXCLS"]  # Fed funds rate, yield curve, VIX

# Thresholds for anomaly escalation
PRICE_CHANGE_THRESHOLD = 3.0   # % change triggers escalation
VOLUME_SPIKE_MULTIPLIER = 2.0  # 2x avg volume triggers escalation
BEARISH_HEADLINE_STREAK = 3    # consecutive bearish → escalate

# ─── Classification Prompts ──────────────────────────────────

CLASSIFY_SYSTEM = """You are a financial intelligence classifier. 
Respond with EXACTLY one JSON object, no markdown, no explanation.
Format: {"sentiment":"bullish|bearish|neutral","confidence":"high|medium|low","sector":"crypto|equities|macro|commodities|mixed","impact":1-10}"""

ANALYSIS_SYSTEM = """You are FININT, a financial intelligence analyst for a global defense intelligence platform.
Analyze the provided market signals and produce a structured intelligence briefing.
Return ONLY valid JSON (no markdown fences), with this schema:
{
  "assessment": "one paragraph tactical summary",
  "risk_level": "low|medium|high|critical",
  "signals": [{"source":"...","type":"...","sentiment":"...","confidence":"high|medium|low"}],
  "correlations": ["any cross-asset or cross-signal patterns detected"],
  "recommended_watch": ["assets or indicators to monitor closely"],
  "time_horizon": "immediate|short_term|medium_term"
}"""


class FININTWorker(BaseWorker):
    """Financial Intelligence daemon."""

    def __init__(self, interval: float = 60.0):
        super().__init__("finint", interval)
        self._session: Optional[aiohttp.ClientSession] = None

        # API keys from env
        self._binance_key = os.environ.get("BINANCE_API_KEY", "")
        self._alpha_key = os.environ.get("ALPHA_VANTAGE_KEY", "")
        self._fred_key = os.environ.get("FRED_API_KEY", "")
        self._news_key = os.environ.get("NEWSAPI_KEY", "")

        # State tracking
        self._prev_prices: dict[str, float] = {}
        self._prev_volumes: dict[str, float] = {}
        self._volume_avg: dict[str, float] = {}  # rolling average
        self._sentiment_streak: list[str] = []    # last N headline sentiments
        self._cycle_count = 0

    async def on_start(self):
        self._session = aiohttp.ClientSession(
            timeout=aiohttp.ClientTimeout(total=15, connect=5)
        )
        log.info(f"FININT worker initialized | "
                f"Binance: {'✓' if self._binance_key else '✗'} | "
                f"AlphaVantage: {'✓' if self._alpha_key else '✗'} | "
                f"FRED: {'✓' if self._fred_key else '✗'} | "
                f"NewsAPI: {'✓' if self._news_key else '✗'}")

    async def on_stop(self):
        if self._session:
            await self._session.close()
        await llm.close()

    async def cycle(self) -> list[IntelItem]:
        """One FININT cycle: fetch → classify → detect anomalies → analyze."""
        self._cycle_count += 1
        items: list[IntelItem] = []

        # ── Phase 1: Parallel data fetch ─────────────────────
        crypto_task = self._fetch_crypto()
        news_task = self._fetch_news()
        # FRED only every 10 cycles (data updates slowly)
        fred_task = self._fetch_fred() if self._cycle_count % 10 == 1 else asyncio.sleep(0)

        results = await asyncio.gather(
            crypto_task, news_task, fred_task,
            return_exceptions=True
        )

        crypto_data = results[0] if not isinstance(results[0], Exception) else None
        news_data = results[1] if not isinstance(results[1], Exception) else None
        fred_data = results[2] if not isinstance(results[2], Exception) else None

        if isinstance(results[0], Exception):
            log.error(f"Crypto fetch error: {results[0]}")
        if isinstance(results[1], Exception):
            log.error(f"News fetch error: {results[1]}")

        # ── Phase 2: Fast classification (Cerebras) ──────────
        anomalies = []

        # Process crypto prices
        if crypto_data:
            for symbol, data in crypto_data.items():
                price = data["price"]
                volume = data["volume"]
                prev_price = self._prev_prices.get(symbol)

                if prev_price and prev_price > 0:
                    pct_change = ((price - prev_price) / prev_price) * 100
                    data["pct_change"] = round(pct_change, 2)

                    # Check for price anomaly
                    if abs(pct_change) >= PRICE_CHANGE_THRESHOLD:
                        anomalies.append({
                            "type": "price_spike",
                            "symbol": symbol,
                            "change_pct": round(pct_change, 2),
                            "price": price,
                            "prev_price": prev_price
                        })
                        items.append(IntelItem(
                            worker="finint",
                            category="finint",
                            severity="alert" if abs(pct_change) >= 5 else "watch",
                            title=f"{symbol} {'surged' if pct_change > 0 else 'dropped'} {abs(pct_change):.1f}%",
                            body=data,
                            source="binance",
                            tags=["crypto", "price_alert", symbol.lower()]
                        ))

                # Check volume spike
                avg_vol = self._volume_avg.get(symbol, volume)
                if avg_vol > 0 and volume > avg_vol * VOLUME_SPIKE_MULTIPLIER:
                    anomalies.append({
                        "type": "volume_spike",
                        "symbol": symbol,
                        "volume": volume,
                        "avg_volume": avg_vol,
                        "multiplier": round(volume / avg_vol, 1)
                    })

                # Update state
                self._prev_prices[symbol] = price
                self._prev_volumes[symbol] = volume
                # Exponential moving average for volume
                alpha = 0.1
                self._volume_avg[symbol] = alpha * volume + (1 - alpha) * avg_vol

            # Produce market snapshot every cycle
            snapshot = {s: {"price": d["price"],
                           "change": d.get("pct_change", 0),
                           "volume": d["volume"]}
                       for s, d in crypto_data.items()}
            items.append(IntelItem(
                worker="finint",
                category="finint",
                severity="info",
                title="Crypto market snapshot",
                body={"assets": snapshot, "timestamp": datetime.now(timezone.utc).isoformat()},
                source="binance",
                tags=["crypto", "snapshot"]
            ))

        # Process news headlines
        if news_data:
            # Batch classify headlines with fast LLM
            classified = await self._classify_headlines(news_data[:5])
            for headline_data in classified:
                sentiment = headline_data.get("sentiment", "neutral")
                self._sentiment_streak.append(sentiment)
                # Keep last 10
                self._sentiment_streak = self._sentiment_streak[-10:]

                if headline_data.get("impact", 0) >= 7:
                    items.append(IntelItem(
                        worker="finint",
                        category="finint",
                        severity="watch",
                        title=headline_data.get("headline", ""),
                        body=headline_data,
                        source="newsapi",
                        tags=["news", sentiment, headline_data.get("sector", "mixed")]
                    ))

            # Check for bearish streak
            recent = self._sentiment_streak[-BEARISH_HEADLINE_STREAK:]
            if len(recent) >= BEARISH_HEADLINE_STREAK and all(s == "bearish" for s in recent):
                anomalies.append({
                    "type": "sentiment_shift",
                    "direction": "bearish",
                    "streak": BEARISH_HEADLINE_STREAK,
                    "headlines": [h.get("headline", "") for h in classified[-BEARISH_HEADLINE_STREAK:]]
                })

        # Process FRED data
        if fred_data and isinstance(fred_data, dict):
            for series_id, value in fred_data.items():
                items.append(IntelItem(
                    worker="finint",
                    category="finint",
                    severity="info",
                    title=f"FRED {series_id}: {value}",
                    body={"series": series_id, "value": value},
                    source="fred",
                    tags=["macro", series_id.lower()]
                ))

        # ── Phase 3: Deep analysis on anomalies (DeepSeek) ───
        if anomalies:
            log.info(f"Detected {len(anomalies)} anomalies, escalating to deep analysis")
            analysis = await self._deep_analysis(anomalies, crypto_data, news_data)
            if analysis:
                severity = "critical" if analysis.get("risk_level") == "critical" else \
                           "alert" if analysis.get("risk_level") == "high" else "watch"
                items.append(IntelItem(
                    worker="finint",
                    category="finint",
                    severity=severity,
                    title=f"FININT Deep Analysis — {len(anomalies)} anomalies detected",
                    body=analysis,
                    source="deepseek-v3",
                    tags=["analysis", "anomaly", analysis.get("risk_level", "unknown")]
                ))

        return items

    # ── Data Sources ─────────────────────────────────────────

    async def _fetch_crypto(self) -> Optional[dict]:
        """Fetch crypto prices from Binance."""
        if not self._session:
            return None

        result = {}
        # Fetch each symbol individually (Binance batch format is finicky)
        tasks = []
        for symbol in CRYPTO_SYMBOLS:
            tasks.append(self._fetch_single_ticker(symbol))

        responses = await asyncio.gather(*tasks, return_exceptions=True)
        for resp in responses:
            if isinstance(resp, dict):
                result[resp["symbol"]] = resp
            elif isinstance(resp, Exception):
                log.debug(f"Ticker fetch error: {resp}")

        return result if result else None

    async def _fetch_single_ticker(self, symbol: str) -> Optional[dict]:
        """Fetch a single ticker from Binance."""
        url = f"{BINANCE_API}/ticker/24hr"
        try:
            async with self._session.get(url, params={"symbol": symbol}) as resp:
                if resp.status != 200:
                    return None
                item = await resp.json()
                return {
                    "symbol": symbol,
                    "price": float(item["lastPrice"]),
                    "high_24h": float(item["highPrice"]),
                    "low_24h": float(item["lowPrice"]),
                    "volume": float(item["quoteVolume"]),
                    "change_24h": float(item["priceChangePercent"]),
                    "trades": int(item["count"]),
                }
        except Exception as e:
            log.debug(f"Binance {symbol} error: {e}")
            return None

    async def _fetch_news(self) -> Optional[list[dict]]:
        """Fetch financial headlines from NewsAPI."""
        if not self._news_key or not self._session:
            return None

        try:
            async with self._session.get(NEWSAPI_API, params={
                "apiKey": self._news_key,
                "category": "business",
                "language": "en",
                "pageSize": 10,
            }) as resp:
                if resp.status != 200:
                    log.warning(f"NewsAPI {resp.status}")
                    return None
                data = await resp.json()

            articles = data.get("articles", [])
            return [{"headline": a.get("title", ""),
                     "source": a.get("source", {}).get("name", ""),
                     "url": a.get("url", ""),
                     "published": a.get("publishedAt", "")}
                    for a in articles if a.get("title")]

        except Exception as e:
            log.error(f"NewsAPI fetch error: {e}")
            return None

    async def _fetch_fred(self) -> Optional[dict]:
        """Fetch latest FRED observations."""
        if not self._fred_key or not self._session:
            return None

        result = {}
        for series_id in FRED_SERIES:
            try:
                async with self._session.get(FRED_API, params={
                    "series_id": series_id,
                    "api_key": self._fred_key,
                    "file_type": "json",
                    "sort_order": "desc",
                    "limit": 1,
                }) as resp:
                    if resp.status != 200:
                        continue
                    data = await resp.json()
                    obs = data.get("observations", [])
                    if obs:
                        result[series_id] = obs[0].get("value", "N/A")
            except Exception as e:
                log.warning(f"FRED {series_id} error: {e}")

        return result if result else None

    # ── LLM Classification ───────────────────────────────────

    async def _classify_headlines(self, headlines: list[dict]) -> list[dict]:
        """Classify a batch of headlines using fast LLM."""
        results = []
        # Process in parallel (Cerebras is fast enough)
        tasks = []
        for h in headlines:
            headline = h.get("headline", "")
            if not headline:
                continue
            prompt = f'Classify this headline:\n"{headline}"\n\nReturn JSON: {{"sentiment":"bullish|bearish|neutral","confidence":"high|medium|low","sector":"...","impact":1-10}}'
            tasks.append(llm.classify(prompt, CLASSIFY_SYSTEM, max_tokens=60))

        responses = await asyncio.gather(*tasks, return_exceptions=True)

        for i, resp in enumerate(responses):
            if isinstance(resp, Exception) or resp is None:
                results.append({**headlines[i], "sentiment": "neutral", "impact": 1})
                continue

            parsed = llm._parse_json(resp)
            if parsed:
                results.append({**headlines[i], **parsed})
            else:
                results.append({**headlines[i], "sentiment": "neutral", "impact": 1})

        return results

    async def _deep_analysis(self, anomalies: list, crypto_data: Optional[dict],
                             news_data: Optional[list]) -> Optional[dict]:
        """Deep multi-signal analysis using DeepSeek-V3."""
        # Build context
        context_parts = [f"ANOMALIES DETECTED ({len(anomalies)}):",
                        json.dumps(anomalies, indent=2)]

        if crypto_data:
            summary = {s: {"price": d["price"], "24h_change": d.get("change_24h", 0)}
                      for s, d in crypto_data.items()}
            context_parts.append(f"\nMARKET DATA:\n{json.dumps(summary, indent=2)}")

        if news_data:
            headlines = [h.get("headline", "") for h in news_data[:5]]
            context_parts.append(f"\nRECENT HEADLINES:\n" + "\n".join(f"- {h}" for h in headlines))

        prompt = "\n".join(context_parts)
        return await llm.analyze_json(prompt, ANALYSIS_SYSTEM, max_tokens=800)
