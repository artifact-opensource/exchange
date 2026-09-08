"""
GDI — Environmental Intelligence Worker
NASA FIRMS (fire hotspots) + GDACS (disaster alerts).

FIRMS: 375m resolution thermal anomalies, global, 3-hour updates, FREE (API key required)
GDACS: Multi-hazard disaster alerts (earthquakes, floods, cyclones, volcanoes), GeoJSON, FREE
"""
import os
import json
import time
import asyncio
import logging
from pathlib import Path
from datetime import datetime, timezone

import aiohttp

logger = logging.getLogger("gdi.enviro")

# ─── NASA FIRMS ──────────────────────────────────────────────
FIRMS_API_KEY = os.environ.get("FIRMS_API_KEY", "")
FIRMS_BASE = "https://firms.modaps.eosdis.nasa.gov/api"

# GDACS ────────────────────────────────────────────────────────
GDACS_GEOJSON = "https://www.gdacs.org/gdacsapi/api/events/getevents"

# Cache
CACHE_DIR = Path(__file__).resolve().parent.parent.parent / "data" / "enviro_cache"
CACHE_DIR.mkdir(parents=True, exist_ok=True)


class FIRMSWorker:
    """NASA FIRMS fire/thermal anomaly data."""

    def __init__(self):
        self._hotspots = []
        self._last_fetch = 0
        self._stats = {"count": 0, "last_fetch": None}

    @property
    def hotspots(self):
        return self._hotspots

    @property
    def stats(self):
        return self._stats

    async def fetch(self, source="VIIRS_SNPP_NRT", days=1, limit=10000):
        """Fetch active fire data from FIRMS."""
        if not FIRMS_API_KEY:
            logger.warning("FIRMS_API_KEY not set — skipping fire data")
            return self._hotspots

        # FIRMS CSV API: /area/csv/{key}/{source}/world/{days}
        url = f"{FIRMS_BASE}/area/csv/{FIRMS_API_KEY}/{source}/world/{days}"

        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(url, timeout=aiohttp.ClientTimeout(total=120)) as resp:
                    if resp.status != 200:
                        logger.error(f"FIRMS fetch failed: {resp.status}")
                        return self._hotspots
                    text = await resp.text()

            # Parse CSV
            lines = text.strip().split("\n")
            if len(lines) < 2:
                return self._hotspots

            headers = lines[0].split(",")
            lat_idx = headers.index("latitude") if "latitude" in headers else 0
            lon_idx = headers.index("longitude") if "longitude" in headers else 1
            bright_idx = headers.index("bright_ti4") if "bright_ti4" in headers else headers.index("brightness") if "brightness" in headers else 2
            frp_idx = headers.index("frp") if "frp" in headers else -1
            conf_idx = headers.index("confidence") if "confidence" in headers else -1
            date_idx = headers.index("acq_date") if "acq_date" in headers else -1
            time_idx = headers.index("acq_time") if "acq_time" in headers else -1

            hotspots = []
            for line in lines[1:limit+1]:
                fields = line.split(",")
                try:
                    lat = float(fields[lat_idx])
                    lon = float(fields[lon_idx])
                    brightness = float(fields[bright_idx]) if bright_idx < len(fields) else 0
                    frp = float(fields[frp_idx]) if frp_idx >= 0 and frp_idx < len(fields) and fields[frp_idx] else 0
                    confidence = fields[conf_idx] if conf_idx >= 0 and conf_idx < len(fields) else "n"
                    acq_date = fields[date_idx] if date_idx >= 0 else ""
                    acq_time = fields[time_idx] if time_idx >= 0 else ""

                    # Severity by FRP (Fire Radiative Power in MW)
                    if frp > 100:
                        severity = "critical"
                    elif frp > 50:
                        severity = "high"
                    elif frp > 10:
                        severity = "medium"
                    else:
                        severity = "low"

                    hotspots.append({
                        "lat": lat,
                        "lon": lon,
                        "brightness": brightness,
                        "frp": frp,
                        "confidence": confidence,
                        "severity": severity,
                        "date": acq_date,
                        "time": acq_time,
                    })
                except (ValueError, IndexError):
                    continue

            self._hotspots = hotspots
            self._last_fetch = time.time()
            self._stats["count"] = len(hotspots)
            self._stats["last_fetch"] = datetime.fromtimestamp(
                self._last_fetch, tz=timezone.utc
            ).isoformat()
            logger.info(f"FIRMS: {len(hotspots)} fire hotspots loaded")

        except Exception as e:
            logger.error(f"FIRMS fetch error: {e}")

        return self._hotspots


class GDACSWorker:
    """GDACS multi-hazard disaster alerts."""

    def __init__(self):
        self._events = []
        self._last_fetch = 0
        self._stats = {"count": 0, "last_fetch": None}

    @property
    def events(self):
        return self._events

    @property
    def stats(self):
        return self._stats

    async def fetch(self, limit=100):
        """Fetch current GDACS alerts."""
        params = {
            "eventtype": "",
            "alertlevel": "",
            "limit": limit,
        }

        try:
            async with aiohttp.ClientSession() as session:
                # GeoJSON feed
                url = "https://www.gdacs.org/gdacsapi/api/events/getevents?limit=100"
                headers = {"Accept": "application/json"}
                async with session.get(url, headers=headers, timeout=aiohttp.ClientTimeout(total=30)) as resp:
                    if resp.status != 200:
                        # Try GeoRSS fallback
                        logger.warning(f"GDACS JSON failed ({resp.status}), trying GeoJSON feed")
                        url2 = "https://www.gdacs.org/xml/gdacs.geojson"
                        async with session.get(url2, timeout=aiohttp.ClientTimeout(total=30)) as resp2:
                            if resp2.status != 200:
                                logger.error(f"GDACS all feeds failed")
                                return self._events
                            data = await resp2.json()
                    else:
                        data = await resp.json()

            # Parse GeoJSON features
            features = data.get("features", [])
            events = []
            for f in features:
                try:
                    props = f.get("properties", {})
                    geom = f.get("geometry", {})
                    coords = geom.get("coordinates", [0, 0])

                    # GDACS coordinates are [lon, lat]
                    lon = float(coords[0]) if len(coords) > 0 else 0
                    lat = float(coords[1]) if len(coords) > 1 else 0

                    event_type = props.get("eventtype", "").upper()
                    alert_level = props.get("alertlevel", "").lower()
                    severity_map = {"red": "critical", "orange": "high", "green": "medium"}
                    severity = severity_map.get(alert_level, "low")

                    type_icons = {
                        "EQ": "🔴", "TC": "🌀", "FL": "🌊",
                        "VO": "🌋", "DR": "☀️", "WF": "🔥",
                        "TS": "🌊",
                    }

                    type_names = {
                        "EQ": "earthquake", "TC": "tropical_cyclone",
                        "FL": "flood", "VO": "volcano",
                        "DR": "drought", "WF": "wildfire",
                        "TS": "tsunami",
                    }

                    events.append({
                        "id": str(props.get("eventid", "")),
                        "lat": lat,
                        "lon": lon,
                        "type": type_names.get(event_type, event_type.lower()),
                        "icon": type_icons.get(event_type, "⚠️"),
                        "name": props.get("eventname", props.get("name", "")),
                        "description": props.get("description", ""),
                        "alertLevel": alert_level,
                        "severity": severity,
                        "country": props.get("country", ""),
                        "fromDate": props.get("fromdate", ""),
                        "toDate": props.get("todate", ""),
                        "url": props.get("url", {}).get("report", "") if isinstance(props.get("url"), dict) else str(props.get("url", "")),
                        "magnitude": props.get("severitydata", {}).get("severity", 0) if isinstance(props.get("severitydata"), dict) else 0,
                    })
                except Exception as e:
                    logger.debug(f"GDACS parse error: {e}")
                    continue

            self._events = events
            self._last_fetch = time.time()
            self._stats["count"] = len(events)
            self._stats["last_fetch"] = datetime.fromtimestamp(
                self._last_fetch, tz=timezone.utc
            ).isoformat()
            logger.info(f"GDACS: {len(events)} disaster alerts loaded")

        except Exception as e:
            logger.error(f"GDACS fetch error: {e}")

        return self._events


class EnvironmentalWorker:
    """Combined environmental intelligence worker."""

    def __init__(self):
        self.firms = FIRMSWorker()
        self.gdacs = GDACSWorker()
        self._running = False

    async def fetch_all(self):
        """Fetch all environmental data concurrently."""
        await asyncio.gather(
            self.firms.fetch(),
            self.gdacs.fetch(),
            return_exceptions=True,
        )

    async def start_background(self, firms_interval=10800, gdacs_interval=900):
        """Background refresh. FIRMS every 3h, GDACS every 15min."""
        self._running = True
        logger.info("Environmental worker starting")

        await self.fetch_all()

        firms_counter = 0
        tick = 900  # Check every 15 min

        while self._running:
            await asyncio.sleep(tick)
            firms_counter += tick

            tasks = [self.gdacs.fetch()]
            if firms_counter >= firms_interval:
                tasks.append(self.firms.fetch())
                firms_counter = 0

            await asyncio.gather(*tasks, return_exceptions=True)

    def stop(self):
        self._running = False

    def get_summary(self):
        return {
            "firms": self.firms.stats,
            "gdacs": self.gdacs.stats,
        }


# ─── Singleton ───────────────────────────────────────────────
enviro = EnvironmentalWorker()
