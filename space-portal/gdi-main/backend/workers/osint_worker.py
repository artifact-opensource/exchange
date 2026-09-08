"""
OSINT Worker — Open Source Intelligence Daemon
================================================
Polls: RSS feeds (Reuters, BBC, Al Jazeera), NewsAPI (global), 
       conflict/disaster databases
Classifies: Entity extraction, threat categorization, region tagging
Escalates: Multi-source event correlation

Intelligence Categories:
  - CONFLICT: Military action, terrorism, political violence
  - DISASTER: Natural disasters, industrial accidents
  - POLITICAL: Elections, sanctions, diplomatic events
  - HEALTH: Pandemics, outbreaks, health emergencies
  - CYBER: Breaches, attacks, infrastructure threats
"""

import os
import json
import asyncio
import logging
import hashlib
from typing import Optional
from datetime import datetime, timezone
from xml.etree import ElementTree

import aiohttp

from .base import BaseWorker, IntelItem
from .llm_gateway import llm

log = logging.getLogger("gdi.worker.osint")

# ─── Configuration ───────────────────────────────────────────

RSS_FEEDS = [
    {"name": "Reuters World", "url": "https://www.reuters.com/rssFeed/worldNews", "region": "global"},
    {"name": "BBC World", "url": "https://feeds.bbci.co.uk/news/world/rss.xml", "region": "global"},
    {"name": "Al Jazeera", "url": "https://www.aljazeera.com/xml/rss/all.xml", "region": "global"},
    {"name": "AP Top News", "url": "https://rsshub.app/apnews/topics/apf-topnews", "region": "global"},
]

USGS_EARTHQUAKE_URL = "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_hour.geojson"
GDACS_URL = "https://www.gdacs.org/xml/rss.xml"

NEWSAPI_URL = "https://newsapi.org/v2/everything"

# How many headlines to process per cycle
MAX_HEADLINES_PER_CYCLE = 15

# ─── Classification Prompts ──────────────────────────────────

CLASSIFY_SYSTEM = """You are an OSINT classifier for a global defense intelligence platform.
Return EXACTLY one JSON object, no markdown, no explanation.
Schema: {"category":"conflict|disaster|political|health|cyber|economic|other","threat_level":"critical|high|medium|low","region":"specific region/country","entities":["key entities mentioned"],"geo_relevant":true|false}"""

CORRELATION_SYSTEM = """You are an OSINT analyst for a global defense intelligence platform.
Analyze the provided batch of classified intelligence items and identify:
1. Cross-source event correlation (same event reported by multiple sources)
2. Emerging patterns or escalation indicators
3. Geographic clustering of threats

Return ONLY valid JSON (no markdown fences):
{
  "correlated_events": [{"event":"...", "sources":["..."], "confidence":"high|medium|low"}],
  "patterns": ["emerging pattern descriptions"],
  "hotspots": [{"region":"...", "threat_level":"...", "event_count":N}],
  "assessment": "one paragraph tactical summary"
}"""


class OSINTWorker(BaseWorker):
    """Open Source Intelligence daemon."""

    def __init__(self, interval: float = 120.0):
        super().__init__("osint", interval)
        self._session: Optional[aiohttp.ClientSession] = None
        self._news_key = os.environ.get("NEWSAPI_KEY", "")
        self._seen_hashes: set[str] = set()     # dedup
        self._classified_buffer: list[dict] = []  # for correlation
        self._cycle_count = 0

    async def on_start(self):
        self._session = aiohttp.ClientSession(
            timeout=aiohttp.ClientTimeout(total=20, connect=10)
        )
        sources = len(RSS_FEEDS) + (1 if self._news_key else 0) + 1  # +1 USGS
        log.info(f"OSINT worker initialized | {sources} sources active")

    async def on_stop(self):
        if self._session:
            await self._session.close()

    async def cycle(self) -> list[IntelItem]:
        self._cycle_count += 1
        items: list[IntelItem] = []
        raw_headlines: list[dict] = []

        # ── Phase 1: Parallel data fetch ─────────────────────
        tasks = [self._fetch_rss(feed) for feed in RSS_FEEDS]
        tasks.append(self._fetch_earthquakes())
        if self._news_key and self._cycle_count % 3 == 1:  # NewsAPI every 3rd cycle
            tasks.append(self._fetch_newsapi())

        results = await asyncio.gather(*tasks, return_exceptions=True)

        for i, result in enumerate(results):
            if isinstance(result, Exception):
                log.warning(f"Fetch task {i} failed: {result}")
                continue
            if result:
                if isinstance(result, list):
                    # Headlines or earthquakes
                    for item in result:
                        if isinstance(item, IntelItem):
                            items.append(item)
                        elif isinstance(item, dict):
                            raw_headlines.append(item)

        # ── Phase 2: Dedup headlines ─────────────────────────
        new_headlines = []
        for h in raw_headlines:
            h_hash = hashlib.md5(h.get("title", "").encode()).hexdigest()[:12]
            if h_hash not in self._seen_hashes:
                self._seen_hashes.add(h_hash)
                new_headlines.append(h)

        # Cap seen hashes at 5000
        if len(self._seen_hashes) > 5000:
            self._seen_hashes = set(list(self._seen_hashes)[-2500:])

        if not new_headlines:
            return items

        log.info(f"Processing {len(new_headlines)} new headlines")

        # ── Phase 3: Fast classification (Cerebras) ──────────
        to_classify = new_headlines[:MAX_HEADLINES_PER_CYCLE]
        tasks = []
        for h in to_classify:
            title = h.get("title", "")
            prompt = f'Classify this news headline for a defense intelligence dashboard:\n"{title}"\n\nReturn JSON: {{"category":"conflict|disaster|political|health|cyber|economic|other","threat_level":"critical|high|medium|low","region":"...","entities":["..."],"geo_relevant":true|false}}'
            tasks.append(llm.classify(prompt, CLASSIFY_SYSTEM, max_tokens=80))

        responses = await asyncio.gather(*tasks, return_exceptions=True)

        for i, resp in enumerate(responses):
            headline = to_classify[i]
            classified = {"title": headline.get("title", ""), "source": headline.get("source", "")}

            if not isinstance(resp, Exception) and resp:
                parsed = llm._parse_json(resp)
                if parsed:
                    classified.update(parsed)
                else:
                    classified["category"] = "other"
                    classified["threat_level"] = "low"
            else:
                classified["category"] = "other"
                classified["threat_level"] = "low"

            # Only emit watch+ items
            threat = classified.get("threat_level", "low")
            if threat in ("critical", "high", "medium"):
                severity_map = {"critical": "critical", "high": "alert", "medium": "watch"}
                items.append(IntelItem(
                    worker="osint",
                    category="osint",
                    severity=severity_map.get(threat, "info"),
                    title=classified.get("title", ""),
                    body=classified,
                    source=classified.get("source", "rss"),
                    tags=[classified.get("category", "other"),
                          classified.get("region", "unknown").lower()]
                ))

            self._classified_buffer.append(classified)

        # ── Phase 4: Correlation analysis every 5 cycles ─────
        if self._cycle_count % 5 == 0 and len(self._classified_buffer) >= 5:
            correlation = await self._correlate()
            if correlation:
                items.append(IntelItem(
                    worker="osint",
                    category="osint",
                    severity="watch",
                    title=f"OSINT Correlation — {len(self._classified_buffer)} items analyzed",
                    body=correlation,
                    source="deepseek-v3",
                    tags=["correlation", "analysis"]
                ))
            # Trim buffer
            self._classified_buffer = self._classified_buffer[-20:]

        return items

    # ── Data Sources ─────────────────────────────────────────

    async def _fetch_rss(self, feed: dict) -> list[dict]:
        """Parse an RSS feed into headline dicts."""
        if not self._session:
            return []

        try:
            async with self._session.get(feed["url"]) as resp:
                if resp.status != 200:
                    return []
                text = await resp.text()

            root = ElementTree.fromstring(text)
            headlines = []

            # Standard RSS
            for item in root.iter("item"):
                title = item.findtext("title", "").strip()
                link = item.findtext("link", "").strip()
                pub_date = item.findtext("pubDate", "").strip()
                desc = item.findtext("description", "").strip()

                if title:
                    headlines.append({
                        "title": title,
                        "url": link,
                        "source": feed["name"],
                        "published": pub_date,
                        "description": desc[:200] if desc else "",
                    })

            return headlines[:10]  # Max 10 per feed

        except Exception as e:
            log.debug(f"RSS {feed['name']} error: {e}")
            return []

    async def _fetch_newsapi(self) -> list[dict]:
        """Fetch global news via NewsAPI."""
        if not self._news_key or not self._session:
            return []

        try:
            async with self._session.get(NEWSAPI_URL, params={
                "apiKey": self._news_key,
                "q": "conflict OR war OR attack OR earthquake OR sanctions OR cyber",
                "language": "en",
                "sortBy": "publishedAt",
                "pageSize": 10,
            }) as resp:
                if resp.status != 200:
                    return []
                data = await resp.json()

            return [{"title": a.get("title", ""),
                     "source": a.get("source", {}).get("name", "NewsAPI"),
                     "url": a.get("url", ""),
                     "published": a.get("publishedAt", "")}
                    for a in data.get("articles", []) if a.get("title")]

        except Exception as e:
            log.debug(f"NewsAPI error: {e}")
            return []

    async def _fetch_earthquakes(self) -> list[IntelItem]:
        """Fetch significant earthquakes from USGS."""
        if not self._session:
            return []

        try:
            async with self._session.get(USGS_EARTHQUAKE_URL) as resp:
                if resp.status != 200:
                    return []
                data = await resp.json()

            items = []
            for feature in data.get("features", [])[:5]:
                props = feature.get("properties", {})
                geom = feature.get("geometry", {})
                coords = geom.get("coordinates", [0, 0, 0])

                mag = props.get("mag", 0)
                place = props.get("place", "Unknown")
                severity = "critical" if mag >= 7 else "alert" if mag >= 6 else "watch"

                eq_hash = hashlib.md5(f"{props.get('ids', '')}".encode()).hexdigest()[:12]
                if eq_hash in self._seen_hashes:
                    continue
                self._seen_hashes.add(eq_hash)

                items.append(IntelItem(
                    worker="osint",
                    category="geoint",
                    severity=severity,
                    title=f"M{mag:.1f} Earthquake — {place}",
                    body={
                        "magnitude": mag,
                        "depth_km": coords[2] if len(coords) > 2 else 0,
                        "place": place,
                        "time": props.get("time"),
                        "tsunami": props.get("tsunami", 0),
                        "felt": props.get("felt", 0),
                        "url": props.get("url", ""),
                    },
                    source="usgs",
                    lat=coords[1] if len(coords) > 1 else 0,
                    lon=coords[0] if len(coords) > 0 else 0,
                    tags=["earthquake", f"m{int(mag)}", "natural_disaster"]
                ))

            return items

        except Exception as e:
            log.debug(f"USGS error: {e}")
            return []

    # ── Correlation Analysis ─────────────────────────────────

    async def _correlate(self) -> Optional[dict]:
        """Run cross-source correlation on buffered items."""
        if len(self._classified_buffer) < 3:
            return None

        summaries = []
        for item in self._classified_buffer[-15:]:
            summaries.append(f"[{item.get('source', '?')}] [{item.get('category', '?')}] "
                           f"[{item.get('threat_level', '?')}] {item.get('title', '')}")

        prompt = f"Analyze these {len(summaries)} OSINT items for correlation:\n\n" + \
                 "\n".join(summaries)

        return await llm.analyze_json(prompt, CORRELATION_SYSTEM, max_tokens=600)
