"""
GEOINT Worker — Geospatial Intelligence Daemon
================================================
Tracks: Satellite passes, conjunction alerts, TLE freshness
Monitors: ISS position, Starlink density, military sat passes
Integrates: Skyfield for orbital mechanics, CelesTrak for TLEs

Unlike FININT/OSINT, GEOINT is mostly computational — 
LLM is used for natural language pass summaries and anomaly reports.
"""

import os
import json
import asyncio
import logging
import math
from typing import Optional
from datetime import datetime, timezone, timedelta
from pathlib import Path

import aiohttp

from .base import BaseWorker, IntelItem

log = logging.getLogger("gdi.worker.geoint")

# ─── Configuration ───────────────────────────────────────────

CELESTRAK_URL = "https://celestrak.org/NORAD/elements/gp.php"
N2YO_API = "https://api.n2yo.com/rest/v1/satellite"

# Station location (configurable via env)
STATION_LAT = float(os.environ.get("GDI_STATION_LAT", "33.6844"))
STATION_LON = float(os.environ.get("GDI_STATION_LON", "73.0479"))
STATION_ELEV = float(os.environ.get("GDI_STATION_ELEV", "508.0"))  # meters

# Tracked satellite groups
SAT_GROUPS = {
    "iss": {"norad_id": 25544, "name": "ISS (ZARYA)", "priority": "high"},
    "css": {"norad_id": 48274, "name": "CSS (TIANHE)", "priority": "high"},
    "hubble": {"norad_id": 20580, "name": "HST", "priority": "medium"},
}

# Cache directory for TLE data
TLE_CACHE_DIR = Path(os.environ.get("TLE_CACHE_DIR",
    os.path.join(os.path.dirname(__file__), "..", "..", "data", "tle_cache")))

# How often to refresh TLEs (hours)
TLE_REFRESH_HOURS = 12


class GEOINTWorker(BaseWorker):
    """Geospatial Intelligence daemon."""

    def __init__(self, interval: float = 300.0):  # 5 min default
        super().__init__("geoint", interval)
        self._session: Optional[aiohttp.ClientSession] = None
        self._skyfield_available = False
        self._ts = None  # Skyfield timescale
        self._station = None  # Skyfield topos
        self._satellites: dict = {}  # name -> EarthSatellite
        self._last_tle_refresh: Optional[datetime] = None
        self._cycle_count = 0

    async def on_start(self):
        self._session = aiohttp.ClientSession(
            timeout=aiohttp.ClientTimeout(total=30, connect=10)
        )

        # Try to import Skyfield
        try:
            from skyfield.api import load, Topos, EarthSatellite
            self._ts = load.timescale()
            self._station = Topos(
                latitude_degrees=STATION_LAT,
                longitude_degrees=STATION_LON,
                elevation_m=STATION_ELEV
            )
            self._skyfield_available = True
            log.info("Skyfield loaded — orbital mechanics available")
        except ImportError:
            log.warning("Skyfield not available — GEOINT running in degraded mode")
            self._skyfield_available = False

        TLE_CACHE_DIR.mkdir(parents=True, exist_ok=True)
        log.info(f"GEOINT worker initialized | Skyfield: {'✓' if self._skyfield_available else '✗'} | "
                f"Station: {STATION_LAT:.2f}°N {STATION_LON:.2f}°E")

    async def on_stop(self):
        if self._session:
            await self._session.close()

    async def cycle(self) -> list[IntelItem]:
        self._cycle_count += 1
        items: list[IntelItem] = []

        # ── TLE Refresh (every TLE_REFRESH_HOURS) ────────────
        if self._should_refresh_tle():
            refreshed = await self._refresh_tles()
            if refreshed:
                items.append(IntelItem(
                    worker="geoint",
                    category="geoint",
                    severity="info",
                    title=f"TLE catalog refreshed — {refreshed} satellites loaded",
                    body={"satellites_loaded": refreshed,
                          "timestamp": datetime.now(timezone.utc).isoformat()},
                    source="celestrak",
                    tags=["tle", "catalog"]
                ))

        # ── ISS / Key Satellite Tracking ─────────────────────
        if self._skyfield_available and self._satellites:
            positions = await self._compute_positions()
            if positions:
                items.append(IntelItem(
                    worker="geoint",
                    category="geoint",
                    severity="info",
                    title="Satellite position update",
                    body={"positions": positions,
                          "count": len(positions),
                          "timestamp": datetime.now(timezone.utc).isoformat()},
                    source="skyfield",
                    tags=["satellite", "position"]
                ))

            # Check for upcoming passes over station
            passes = await self._predict_passes()
            for p in passes:
                # High-priority satellite pass = watch severity
                severity = "watch" if p.get("priority") == "high" else "info"
                items.append(IntelItem(
                    worker="geoint",
                    category="geoint",
                    severity=severity,
                    title=f"{p['name']} pass — max el {p['max_elevation']:.1f}°",
                    body=p,
                    source="skyfield",
                    lat=STATION_LAT,
                    lon=STATION_LON,
                    tags=["satellite", "pass", p.get("name", "").lower().replace(" ", "_")]
                ))

        # ── Seismic snapshot (lightweight) ───────────────────
        # Every 3rd cycle, fetch significant quakes for geo-overlay
        if self._cycle_count % 3 == 0:
            quakes = await self._fetch_significant_quakes()
            if quakes:
                items.append(IntelItem(
                    worker="geoint",
                    category="geoint",
                    severity="info",
                    title=f"Seismic activity — {len(quakes)} events M4.5+",
                    body={"events": quakes,
                          "timestamp": datetime.now(timezone.utc).isoformat()},
                    source="usgs",
                    tags=["seismic", "earthquake"]
                ))

        return items

    # ── Orbital Mechanics ────────────────────────────────────

    def _should_refresh_tle(self) -> bool:
        if self._last_tle_refresh is None:
            return True
        elapsed = (datetime.now(timezone.utc) - self._last_tle_refresh).total_seconds()
        return elapsed >= TLE_REFRESH_HOURS * 3600

    async def _refresh_tles(self) -> int:
        """Fetch TLEs from CelesTrak and load into Skyfield."""
        if not self._session or not self._skyfield_available:
            return 0

        from skyfield.api import EarthSatellite

        loaded = 0
        groups = ["stations", "active", "weather", "resource"]

        for group in groups:
            try:
                url = f"{CELESTRAK_URL}?GROUP={group}&FORMAT=tle"
                async with self._session.get(url) as resp:
                    if resp.status != 200:
                        continue
                    text = await resp.text()

                lines = text.strip().split("\n")
                i = 0
                while i + 2 < len(lines):
                    name = lines[i].strip()
                    line1 = lines[i + 1].strip()
                    line2 = lines[i + 2].strip()

                    if line1.startswith("1 ") and line2.startswith("2 "):
                        try:
                            sat = EarthSatellite(line1, line2, name, self._ts)
                            self._satellites[name] = sat
                            loaded += 1
                        except Exception:
                            pass
                        i += 3
                    else:
                        i += 1

                # Cache to disk
                cache_file = TLE_CACHE_DIR / f"{group}.tle"
                cache_file.write_text(text)

            except Exception as e:
                log.warning(f"TLE fetch {group} error: {e}")

        self._last_tle_refresh = datetime.now(timezone.utc)
        log.info(f"TLE refresh complete: {loaded} satellites loaded from {len(groups)} groups")
        return loaded

    async def _compute_positions(self) -> list[dict]:
        """Compute current positions for key satellites."""
        if not self._skyfield_available or not self._ts:
            return []

        positions = []
        t = self._ts.now()

        for key, info in SAT_GROUPS.items():
            name = info["name"]
            sat = self._satellites.get(name)
            if not sat:
                continue

            try:
                geocentric = sat.at(t)
                subpoint = geocentric.subpoint()
                positions.append({
                    "name": name,
                    "key": key,
                    "lat": round(subpoint.latitude.degrees, 4),
                    "lon": round(subpoint.longitude.degrees, 4),
                    "alt_km": round(subpoint.elevation.km, 1),
                    "priority": info["priority"],
                })
            except Exception as e:
                log.debug(f"Position calc error for {name}: {e}")

        return positions

    async def _predict_passes(self) -> list[dict]:
        """Predict upcoming passes over ground station for key sats."""
        if not self._skyfield_available or not self._ts or not self._station:
            return []

        from skyfield.api import Topos

        passes = []
        t0 = self._ts.now()
        t1 = self._ts.tt_jd(t0.tt + 1)  # next 24 hours

        for key, info in SAT_GROUPS.items():
            name = info["name"]
            sat = self._satellites.get(name)
            if not sat:
                continue

            try:
                # Simple pass finder: check elevation every 60 seconds
                above_horizon = False
                max_el = 0
                rise_time = None

                # Sample 1440 points (every 60s for 24h)
                for i in range(0, 1440, 1):
                    t = self._ts.tt_jd(t0.tt + i / 1440.0)
                    difference = sat - self._station
                    topocentric = difference.at(t)
                    el = topocentric.altaz()[0].degrees

                    if el > 0 and not above_horizon:
                        above_horizon = True
                        rise_time = t
                        max_el = el
                    elif el > max_el and above_horizon:
                        max_el = el
                    elif el <= 0 and above_horizon:
                        # Pass ended
                        if max_el >= 10:  # Only report passes > 10° elevation
                            passes.append({
                                "name": name,
                                "key": key,
                                "priority": info["priority"],
                                "rise_utc": rise_time.utc_iso() if rise_time else "",
                                "max_elevation": round(max_el, 1),
                                "duration_min": i,  # approximate
                            })
                        above_horizon = False
                        max_el = 0
                        rise_time = None

                        # Only report first pass per satellite
                        break

            except Exception as e:
                log.debug(f"Pass prediction error for {name}: {e}")

        return passes

    async def _fetch_significant_quakes(self) -> list[dict]:
        """Lightweight seismic fetch for geo overlay."""
        if not self._session:
            return []

        try:
            url = "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_day.geojson"
            async with self._session.get(url) as resp:
                if resp.status != 200:
                    return []
                data = await resp.json()

            events = []
            for f in data.get("features", [])[:20]:
                props = f.get("properties", {})
                coords = f.get("geometry", {}).get("coordinates", [0, 0, 0])
                events.append({
                    "mag": props.get("mag", 0),
                    "place": props.get("place", ""),
                    "time": props.get("time"),
                    "lat": coords[1] if len(coords) > 1 else 0,
                    "lon": coords[0],
                    "depth_km": coords[2] if len(coords) > 2 else 0,
                })
            return events

        except Exception as e:
            log.debug(f"USGS fetch error: {e}")
            return []
