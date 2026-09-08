"""
GDI — Space-Track.org Worker
Fetches the full USSTRATCOM satellite catalog (65,000+ objects).
Uses Space-Track.org REST API with session-based auth.

Rate limits: 30 requests/minute, 300/hour for data queries.
We cache aggressively — full catalog refresh every 30 minutes.
"""
import os
import json
import time
import asyncio
import logging
from pathlib import Path
from datetime import datetime, timezone

import aiohttp

logger = logging.getLogger("gdi.spacetrack")

# ─── Credentials ─────────────────────────────────────────────
SPACETRACK_USER = os.environ.get("SPACETRACK_USER", "admin@artifactvirtual.com")
SPACETRACK_PASS = os.environ.get("SPACETRACK_PASS", "")
SPACETRACK_BASE = "https://www.space-track.org"
LOGIN_URL = f"{SPACETRACK_BASE}/ajaxauth/login"

# ─── Cache ───────────────────────────────────────────────────
CACHE_DIR = Path(__file__).resolve().parent.parent.parent / "data" / "tle_cache"
CACHE_DIR.mkdir(parents=True, exist_ok=True)
CACHE_FILE = CACHE_DIR / "spacetrack_gp_full.json"
CACHE_META = CACHE_DIR / "spacetrack_meta.json"
CACHE_TTL = 1800  # 30 minutes

# ─── Object type classification ──────────────────────────────
TYPE_MAP = {
    "PAYLOAD": "payload",
    "ROCKET BODY": "rocket_body",
    "DEBRIS": "debris",
    "TBA": "unknown",
    "UNKNOWN": "unknown",
}

# Country to flag emoji (top contributors)
COUNTRY_FLAGS = {
    "US": "🇺🇸", "CIS": "🇷🇺", "PRC": "🇨🇳", "UK": "🇬🇧", "JPN": "🇯🇵",
    "IND": "🇮🇳", "FR": "🇫🇷", "ESA": "🇪🇺", "GER": "🇩🇪", "IT": "🇮🇹",
    "CA": "🇨🇦", "ISRA": "🇮🇱", "ROK": "🇰🇷", "BRAZ": "🇧🇷", "AUS": "🇦🇺",
    "ISS": "🌍", "AB": "🇸🇦", "IRAN": "🇮🇷", "PAKIS": "🇵🇰", "TURK": "🇹🇷",
    "UAE": "🇦🇪", "ARGN": "🇦🇷", "SPN": "🇪🇸", "SAFR": "🇿🇦", "NKOR": "🇰🇵",
}

# ─── Orbit regime classification ─────────────────────────────
def classify_orbit(period_min, inclination, eccentricity):
    """Classify orbit regime from orbital elements."""
    if period_min is None:
        return "unknown"
    p = float(period_min)
    inc = float(inclination) if inclination else 0
    ecc = float(eccentricity) if eccentricity else 0

    if p < 128:
        return "LEO"  # Low Earth Orbit
    elif 600 < p < 900:
        if inc > 50:
            return "MEO"  # Medium Earth Orbit (nav sats)
        return "MEO"
    elif 1400 < p < 1500:
        return "GEO"  # Geostationary
    elif ecc > 0.5:
        return "HEO"  # Highly Elliptical
    elif p > 1500:
        return "deep"  # Deep space / graveyard
    else:
        return "MEO"


# ─── Special satellites (named, tracked individually) ────────
SPECIAL_NORAD_IDS = {
    25544,  # ISS
    48274,  # Tiangong
    20580,  # Hubble
    43013,  # NOAA-20
    27424,  # ENVISAT
    36411,  # SDO (Solar Dynamics Observatory)
    43435,  # GOES-17
    29155,  # GOES-13
    36085,  # CRYOSAT 2
    39084,  # LANDSAT 8
    49260,  # LANDSAT 9
    43226,  # GSAT-6A
    54216,  # Chandrayaan-3 (if still tracked)
}

# Satellite name patterns for type classification
NAME_PATTERNS = {
    "starlink": "STARLINK",
    "gps": "GPS",
    "glonass": "GLONASS",
    "galileo": "GALILEO",
    "beidou": "BEIDOU",
    "oneweb": "ONEWEB",
    "iridium": "IRIDIUM",
    "cosmos": "COSMOS",
    "station": ["ISS (ZARYA)", "TIANGONG", "TIANHE"],
    "telescope": ["HUBBLE", "JWST", "CHANDRA"],
    "weather": ["NOAA", "GOES", "METEOSAT", "HIMAWARI", "FY-"],
    "recon": ["USA ", "NROL", "LACROSSE", "KEYHOLE", "YAOGAN"],
    "science": ["SDO", "SOHO", "CRYOSAT", "LANDSAT", "SENTINEL"],
}


def classify_by_name(name):
    """Classify satellite type from name patterns."""
    name_upper = name.upper() if name else ""
    for sat_type, patterns in NAME_PATTERNS.items():
        if isinstance(patterns, list):
            if any(p in name_upper for p in patterns):
                return sat_type
        elif patterns in name_upper:
            return sat_type
    return None


class SpaceTrackWorker:
    """Async worker that fetches and caches the Space-Track catalog."""

    def __init__(self):
        self._session = None
        self._cookies = None
        self._last_login = 0
        self._catalog = []  # Processed GP records
        self._raw_count = 0
        self._last_fetch = 0
        self._running = False
        self._stats = {
            "total_objects": 0,
            "payloads": 0,
            "rocket_bodies": 0,
            "debris": 0,
            "countries": 0,
            "last_fetch": None,
            "fetch_time_ms": 0,
        }

    @property
    def catalog(self):
        return self._catalog

    @property
    def stats(self):
        return self._stats

    async def _login(self, session):
        """Authenticate with Space-Track.org."""
        if not SPACETRACK_PASS:
            logger.error("SPACETRACK_PASS not set — cannot authenticate")
            return False

        try:
            async with session.post(LOGIN_URL, data={
                "identity": SPACETRACK_USER,
                "password": SPACETRACK_PASS,
            }) as resp:
                text = await resp.text()
                if resp.status == 200 and '"Failed"' not in text:
                    self._last_login = time.time()
                    logger.info(f"Space-Track login successful as {SPACETRACK_USER}")
                    return True
                else:
                    logger.error(f"Space-Track login failed: {text[:200]}")
                    return False
        except Exception as e:
            logger.error(f"Space-Track login error: {e}")
            return False

    async def fetch_catalog(self, force=False):
        """Fetch full GP catalog from Space-Track.org."""
        # Check cache
        if not force and self._catalog and (time.time() - self._last_fetch) < CACHE_TTL:
            return self._catalog

        # Try disk cache
        if not force and CACHE_FILE.exists() and CACHE_META.exists():
            try:
                meta = json.loads(CACHE_META.read_text())
                age = time.time() - meta.get("timestamp", 0)
                if age < CACHE_TTL:
                    raw = json.loads(CACHE_FILE.read_text())
                    self._catalog = raw
                    self._last_fetch = meta["timestamp"]
                    self._update_stats()
                    logger.info(f"Loaded {len(self._catalog)} objects from disk cache ({age:.0f}s old)")
                    return self._catalog
            except Exception as e:
                logger.warning(f"Cache read failed: {e}")

        # Fetch from API
        t0 = time.time()
        connector = aiohttp.TCPConnector(limit=5)
        jar = aiohttp.CookieJar()
        async with aiohttp.ClientSession(connector=connector, cookie_jar=jar) as session:
            if not await self._login(session):
                # Fall back to disk cache even if stale
                if CACHE_FILE.exists():
                    self._catalog = json.loads(CACHE_FILE.read_text())
                    self._update_stats()
                    logger.warning("Using stale cache after login failure")
                return self._catalog

            # Fetch active objects (DECAY_DATE is null = still in orbit)
            # We fetch in batches by object type to stay under rate limits
            all_objects = []

            for obj_type in ["PAYLOAD", "ROCKET BODY", "DEBRIS"]:
                url = (
                    f"{SPACETRACK_BASE}/basicspacedata/query"
                    f"/class/gp"
                    f"/OBJECT_TYPE/{obj_type}"
                    f"/DECAY_DATE/null-val"
                    f"/orderby/NORAD_CAT_ID"
                    f"/format/json"
                )
                try:
                    async with session.get(url, timeout=aiohttp.ClientTimeout(total=120)) as resp:
                        if resp.status == 200:
                            data = await resp.json()
                            all_objects.extend(data)
                            logger.info(f"Fetched {len(data)} {obj_type} objects")
                        else:
                            text = await resp.text()
                            logger.error(f"Space-Track {obj_type} fetch failed ({resp.status}): {text[:200]}")
                except asyncio.TimeoutError:
                    logger.error(f"Space-Track {obj_type} fetch timeout")
                except Exception as e:
                    logger.error(f"Space-Track {obj_type} fetch error: {e}")

                # Rate limit courtesy: wait between batch requests
                await asyncio.sleep(2)

        fetch_ms = int((time.time() - t0) * 1000)
        logger.info(f"Fetched {len(all_objects)} total objects in {fetch_ms}ms")

        # Process into our format
        self._catalog = self._process_catalog(all_objects)
        self._last_fetch = time.time()
        self._stats["fetch_time_ms"] = fetch_ms
        self._update_stats()

        # Write to disk cache
        try:
            CACHE_FILE.write_text(json.dumps(self._catalog))
            CACHE_META.write_text(json.dumps({
                "timestamp": self._last_fetch,
                "count": len(self._catalog),
                "fetch_ms": fetch_ms,
            }))
        except Exception as e:
            logger.warning(f"Cache write failed: {e}")

        return self._catalog

    def _process_catalog(self, raw_objects):
        """Convert Space-Track GP records to GDI format."""
        processed = []
        for obj in raw_objects:
            try:
                norad_id = int(obj.get("NORAD_CAT_ID", 0))
                name = obj.get("OBJECT_NAME", "UNKNOWN")
                obj_type_raw = obj.get("OBJECT_TYPE", "UNKNOWN")
                country = obj.get("COUNTRY_CODE", "")
                tle1 = obj.get("TLE_LINE1", "")
                tle2 = obj.get("TLE_LINE2", "")

                if not tle1 or not tle2:
                    continue

                # Classify
                base_type = TYPE_MAP.get(obj_type_raw, "unknown")
                name_type = classify_by_name(name)
                sat_type = name_type or base_type

                # Orbit classification
                period = obj.get("PERIOD")
                inc = obj.get("INCLINATION")
                ecc = obj.get("ECCENTRICITY")
                orbit_regime = classify_orbit(period, inc, ecc)

                # Special flag
                is_special = norad_id in SPECIAL_NORAD_IDS

                processed.append({
                    "noradId": norad_id,
                    "name": name,
                    "type": sat_type,
                    "baseType": base_type,
                    "orbitRegime": orbit_regime,
                    "country": country,
                    "flag": COUNTRY_FLAGS.get(country, ""),
                    "special": is_special,
                    "rcsSize": obj.get("RCS_SIZE", ""),
                    "launchDate": obj.get("LAUNCH_DATE", ""),
                    "intlDesig": obj.get("OBJECT_ID", ""),
                    "epoch": obj.get("EPOCH", ""),
                    "meanMotion": float(obj.get("MEAN_MOTION", 0)),
                    "inclination": float(inc) if inc else 0,
                    "eccentricity": float(ecc) if ecc else 0,
                    "period": float(period) if period else 0,
                    "apoapsis": float(obj.get("APOAPSIS", 0)),
                    "periapsis": float(obj.get("PERIAPSIS", 0)),
                    "tle1": tle1,
                    "tle2": tle2,
                })
            except Exception as e:
                logger.debug(f"Skip object {obj.get('NORAD_CAT_ID', '?')}: {e}")
                continue

        return processed

    def _update_stats(self):
        """Update stats from current catalog."""
        self._stats["total_objects"] = len(self._catalog)
        self._stats["payloads"] = sum(1 for o in self._catalog if o["baseType"] == "payload")
        self._stats["rocket_bodies"] = sum(1 for o in self._catalog if o["baseType"] == "rocket_body")
        self._stats["debris"] = sum(1 for o in self._catalog if o["baseType"] == "debris")
        self._stats["countries"] = len(set(o["country"] for o in self._catalog if o["country"]))
        self._stats["last_fetch"] = datetime.fromtimestamp(
            self._last_fetch, tz=timezone.utc
        ).isoformat() if self._last_fetch else None

    async def start_background(self, interval=1800):
        """Start background refresh loop."""
        self._running = True
        logger.info(f"SpaceTrack worker starting (refresh every {interval}s)")

        # Initial fetch
        await self.fetch_catalog(force=True)

        while self._running:
            await asyncio.sleep(interval)
            try:
                await self.fetch_catalog(force=True)
            except Exception as e:
                logger.error(f"Background fetch failed: {e}")

    def stop(self):
        self._running = False

    # ─── Query methods ───────────────────────────────────────
    def get_by_type(self, sat_type, limit=None):
        """Get objects by type (payload, debris, starlink, gps, etc.)"""
        results = [o for o in self._catalog if o["type"] == sat_type]
        return results[:limit] if limit else results

    def get_by_country(self, country_code, limit=None):
        """Get objects by country code."""
        results = [o for o in self._catalog if o["country"] == country_code]
        return results[:limit] if limit else results

    def get_by_orbit(self, regime, limit=None):
        """Get objects by orbit regime (LEO, MEO, GEO, HEO, deep)."""
        results = [o for o in self._catalog if o["orbitRegime"] == regime]
        return results[:limit] if limit else results

    def get_special(self):
        """Get special/named satellites."""
        return [o for o in self._catalog if o["special"]]

    def search(self, query, limit=50):
        """Search by name or NORAD ID."""
        q = query.upper()
        results = []
        # Try NORAD ID
        try:
            norad = int(query)
            results = [o for o in self._catalog if o["noradId"] == norad]
        except ValueError:
            pass
        # Name search
        if not results:
            results = [o for o in self._catalog if q in o["name"].upper()]
        return results[:limit]

    def get_summary(self):
        """Get catalog summary for frontend HUD."""
        type_counts = {}
        orbit_counts = {}
        country_counts = {}
        for o in self._catalog:
            type_counts[o["type"]] = type_counts.get(o["type"], 0) + 1
            orbit_counts[o["orbitRegime"]] = orbit_counts.get(o["orbitRegime"], 0) + 1
            if o["country"]:
                country_counts[o["country"]] = country_counts.get(o["country"], 0) + 1

        return {
            "total": len(self._catalog),
            "by_type": dict(sorted(type_counts.items(), key=lambda x: -x[1])),
            "by_orbit": dict(sorted(orbit_counts.items(), key=lambda x: -x[1])),
            "top_countries": dict(sorted(country_counts.items(), key=lambda x: -x[1])[:20]),
            "last_fetch": self._stats["last_fetch"],
            "fetch_time_ms": self._stats["fetch_time_ms"],
        }


# ─── Singleton ───────────────────────────────────────────────
spacetrack = SpaceTrackWorker()
