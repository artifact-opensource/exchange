"""
GDI Flight Intelligence — Multi-Source Aggregator
Cascading data sources with graceful degradation.

Sources (priority order):
  1. FlightRadar24 (public feed — best coverage, ~1500 aircraft/call)
  2. ADSB.lol (community ADS-B — free, includes military transponders)
  3. ADSB.one (community ADS-B — backup)
  4. ADS-B.fi (community ADS-B — European focus)
  5. OpenSky Network (rate-limited, OAuth2 pending)
  6. RapidAPI sources (if subscribed — auto-detected)

All sources normalize to a common Aircraft schema. Deduplication by ICAO hex.
"""
import os
import time
import asyncio
import logging
from typing import Optional, Dict, List, Any
from dataclasses import dataclass, field, asdict

import aiohttp

logger = logging.getLogger("gdi.flights")

# ── Configuration ────────────────────────────────────────────
RAPIDAPI_KEY = os.environ.get("RAPIDAPI_KEY", "")

# Source endpoints
SOURCES = {
    "fr24": {
        "name": "FlightRadar24",
        "url": "https://data-cloud.flightradar24.com/zones/fcgi/feed.js",
        "type": "fr24",
        "enabled": True,
        "priority": 1,
        "timeout": 12,
        "rate_limit": 5,  # min seconds between requests
        "headers": {"User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36"},
    },
    "adsb_lol": {
        "name": "ADSB.lol",
        "url": "https://api.adsb.lol/v2",
        "type": "readsb",
        "enabled": True,
        "priority": 2,
        "timeout": 10,
        "rate_limit": 5,
    },
    "adsb_one": {
        "name": "ADSB.one",
        "url": "https://api.adsb.one/v2",
        "type": "readsb",
        "enabled": True,
        "priority": 3,
        "timeout": 10,
        "rate_limit": 5,
    },
    "adsb_fi": {
        "name": "ADS-B.fi",
        "url": "https://opendata.adsb.fi/api/v2",
        "type": "readsb",
        "enabled": True,
        "priority": 4,
        "timeout": 10,
        "rate_limit": 5,
    },
    "opensky": {
        "name": "OpenSky Network",
        "url": "https://opensky-network.org/api/states/all",
        "type": "opensky",
        "enabled": True,
        "priority": 5,
        "timeout": 45,
        "rate_limit": 10,
    },
    "rapidapi_adsbx": {
        "name": "ADS-B Exchange (RapidAPI)",
        "url": "https://adsbexchange-com1.p.rapidapi.com/v2",
        "type": "readsb",
        "enabled": bool(RAPIDAPI_KEY),
        "priority": 6,
        "timeout": 10,
        "rate_limit": 5,
        "headers": {
            "X-RapidAPI-Key": RAPIDAPI_KEY,
            "X-RapidAPI-Host": "adsbexchange-com1.p.rapidapi.com",
        },
    },
}


@dataclass
class Aircraft:
    """Normalized aircraft record"""
    icao: str                           # ICAO 24-bit hex address
    callsign: str = ""                  # Flight callsign
    lat: Optional[float] = None
    lon: Optional[float] = None
    alt_baro: Optional[float] = None    # Barometric altitude (ft)
    alt_geo: Optional[float] = None     # Geometric altitude (ft)
    ground_speed: Optional[float] = None  # knots
    heading: Optional[float] = None     # degrees
    vertical_rate: Optional[float] = None  # ft/min
    squawk: Optional[str] = None
    aircraft_type: str = ""             # ICAO type designator (B738, A320, etc.)
    registration: str = ""
    origin: str = ""                    # Departure airport IATA/ICAO
    destination: str = ""               # Arrival airport IATA/ICAO
    on_ground: bool = False
    source: str = ""                    # Which feed provided this
    last_seen: float = 0                # Unix timestamp
    category: int = 0                   # ADS-B emitter category


class SourceHealth:
    """Tracks health/availability of each data source"""
    def __init__(self, source_id: str):
        self.source_id = source_id
        self.consecutive_failures = 0
        self.last_success: float = 0
        self.last_failure: float = 0
        self.last_request: float = 0
        self.total_requests = 0
        self.total_failures = 0
        self.total_aircraft = 0
        self.avg_latency_ms: float = 0
        self._latencies: List[float] = []
        self.disabled_until: float = 0  # Backoff

    def record_success(self, aircraft_count: int, latency_ms: float):
        self.consecutive_failures = 0
        self.last_success = time.time()
        self.total_requests += 1
        self.total_aircraft = aircraft_count
        self._latencies.append(latency_ms)
        if len(self._latencies) > 20:
            self._latencies = self._latencies[-20:]
        self.avg_latency_ms = sum(self._latencies) / len(self._latencies)
        self.disabled_until = 0

    def record_failure(self):
        self.consecutive_failures += 1
        self.last_failure = time.time()
        self.total_requests += 1
        self.total_failures += 1
        # Exponential backoff: 30s, 60s, 120s, 240s, max 600s
        backoff = min(30 * (2 ** (self.consecutive_failures - 1)), 600)
        self.disabled_until = time.time() + backoff
        logger.warning(
            f"Source {self.source_id} failed ({self.consecutive_failures}x), "
            f"backing off {backoff}s"
        )

    @property
    def available(self) -> bool:
        return time.time() > self.disabled_until

    def to_dict(self) -> dict:
        return {
            "source_id": self.source_id,
            "consecutive_failures": self.consecutive_failures,
            "last_success": self.last_success,
            "total_requests": self.total_requests,
            "total_failures": self.total_failures,
            "total_aircraft": self.total_aircraft,
            "avg_latency_ms": round(self.avg_latency_ms, 1),
            "available": self.available,
            "disabled_until": self.disabled_until,
        }


class FlightAggregator:
    """
    Multi-source flight data aggregator with:
    - Cascading priority (try best source first)
    - Parallel fetching (grab from all available sources)
    - ICAO hex deduplication (merge fields from multiple sources)
    - Exponential backoff on failures
    - Graceful degradation (always returns best available data)
    """

    def __init__(self):
        self.session: Optional[aiohttp.ClientSession] = None
        self.aircraft: Dict[str, Aircraft] = {}  # icao -> Aircraft
        self.health: Dict[str, SourceHealth] = {}
        self.last_update: float = 0
        self.update_count: int = 0

        # Initialize health tracking
        for src_id in SOURCES:
            self.health[src_id] = SourceHealth(src_id)

    async def start(self):
        connector = aiohttp.TCPConnector(
            ttl_dns_cache=300,
            limit=30,
            force_close=False,
        )
        self.session = aiohttp.ClientSession(connector=connector)
        logger.info("FlightAggregator started — %d sources configured", len(SOURCES))

    async def stop(self):
        if self.session:
            await self.session.close()

    # ── Public API ───────────────────────────────────────────

    async def fetch_all(self, bounds: Optional[dict] = None) -> Dict[str, Aircraft]:
        """
        Fetch from all available sources in parallel, merge results.
        Returns dict of icao -> Aircraft.
        
        bounds: {south, west, north, east} or None for global
        """
        sources = self._get_available_sources()
        if not sources:
            logger.error("No flight data sources available!")
            return self.aircraft  # Return stale data

        # Fetch from all available sources in parallel
        tasks = []
        for src_id, src_config in sources:
            tasks.append(self._fetch_source(src_id, src_config, bounds))

        results = await asyncio.gather(*tasks, return_exceptions=True)

        # Merge results — later sources fill gaps, don't overwrite
        new_aircraft: Dict[str, Aircraft] = {}
        source_counts = {}

        for (src_id, _), result in zip(sources, results):
            if isinstance(result, Exception):
                logger.error("Source %s raised: %s", src_id, result)
                self.health[src_id].record_failure()
                continue
            if result is None:
                continue

            count = 0
            for ac in result:
                if not ac.icao or ac.lat is None or ac.lon is None:
                    continue  # Skip incomplete records

                if ac.icao in new_aircraft:
                    # Merge — fill missing fields from secondary source
                    existing = new_aircraft[ac.icao]
                    if not existing.callsign and ac.callsign:
                        existing.callsign = ac.callsign
                    if not existing.aircraft_type and ac.aircraft_type:
                        existing.aircraft_type = ac.aircraft_type
                    if not existing.registration and ac.registration:
                        existing.registration = ac.registration
                    if not existing.origin and ac.origin:
                        existing.origin = ac.origin
                    if not existing.destination and ac.destination:
                        existing.destination = ac.destination
                    if not existing.squawk and ac.squawk:
                        existing.squawk = ac.squawk
                    # Use most recent position
                    if ac.last_seen > existing.last_seen:
                        existing.lat = ac.lat
                        existing.lon = ac.lon
                        existing.alt_baro = ac.alt_baro or existing.alt_baro
                        existing.alt_geo = ac.alt_geo or existing.alt_geo
                        existing.ground_speed = ac.ground_speed or existing.ground_speed
                        existing.heading = ac.heading or existing.heading
                        existing.vertical_rate = ac.vertical_rate or existing.vertical_rate
                        existing.last_seen = ac.last_seen
                else:
                    new_aircraft[ac.icao] = ac
                count += 1

            source_counts[src_id] = count

        if new_aircraft:
            self.aircraft = new_aircraft
            self.last_update = time.time()
            self.update_count += 1

        logger.info(
            "Flight update #%d: %d unique aircraft from %s",
            self.update_count,
            len(self.aircraft),
            ", ".join(f"{k}={v}" for k, v in source_counts.items())
        )

        return self.aircraft

    def get_aircraft_list(self) -> List[dict]:
        """Return aircraft as list of dicts (API response format)"""
        return [asdict(ac) for ac in self.aircraft.values()]

    def get_opensky_format(self) -> dict:
        """Return data in OpenSky-compatible format for frontend compatibility"""
        states = []
        for ac in self.aircraft.values():
            # OpenSky state vector format:
            # [icao24, callsign, origin_country, time_position, last_contact,
            #  longitude, latitude, baro_altitude, on_ground, velocity,
            #  true_track, vertical_rate, sensors, geo_altitude, squawk,
            #  spi, position_source, category]
            states.append([
                ac.icao,                                    # 0: icao24
                ac.callsign.ljust(8) if ac.callsign else None,  # 1: callsign
                "",                                         # 2: origin_country
                ac.last_seen,                               # 3: time_position
                ac.last_seen,                               # 4: last_contact
                ac.lon,                                     # 5: longitude
                ac.lat,                                     # 6: latitude
                ac.alt_baro * 0.3048 if ac.alt_baro else None,  # 7: baro_altitude (m)
                ac.on_ground,                               # 8: on_ground
                ac.ground_speed * 0.514444 if ac.ground_speed else None,  # 9: velocity (m/s)
                ac.heading,                                 # 10: true_track
                ac.vertical_rate * 0.00508 if ac.vertical_rate else None,  # 11: vertical_rate (m/s)
                None,                                       # 12: sensors
                ac.alt_geo * 0.3048 if ac.alt_geo else None,  # 13: geo_altitude (m)
                ac.squawk,                                  # 14: squawk
                False,                                      # 15: spi
                0,                                          # 16: position_source
                ac.category,                                # 17: category
            ])

        return {
            "time": int(self.last_update),
            "states": states,
        }

    def get_status(self) -> dict:
        """Health/status of all sources"""
        return {
            "total_aircraft": len(self.aircraft),
            "last_update": self.last_update,
            "update_count": self.update_count,
            "sources": {
                src_id: {
                    **self.health[src_id].to_dict(),
                    "name": SOURCES[src_id]["name"],
                    "enabled": SOURCES[src_id]["enabled"],
                    "priority": SOURCES[src_id]["priority"],
                }
                for src_id in SOURCES
            },
        }

    # ── Private ──────────────────────────────────────────────

    def _get_available_sources(self) -> List[tuple]:
        """Return enabled, healthy sources sorted by priority"""
        available = []
        for src_id, config in SOURCES.items():
            if not config["enabled"]:
                continue
            health = self.health[src_id]
            if not health.available:
                continue
            # Rate limiting
            elapsed = time.time() - health.last_request
            if elapsed < config.get("rate_limit", 5):
                continue
            available.append((src_id, config))

        available.sort(key=lambda x: x[1]["priority"])
        return available

    async def _fetch_source(
        self, src_id: str, config: dict, bounds: Optional[dict]
    ) -> Optional[List[Aircraft]]:
        """Fetch and parse from a single source"""
        health = self.health[src_id]
        health.last_request = time.time()
        t0 = time.time()

        try:
            timeout = aiohttp.ClientTimeout(total=config["timeout"])
            headers = config.get("headers", {})

            if config["type"] == "fr24":
                aircraft = await self._fetch_fr24(config, bounds, timeout, headers)
            elif config["type"] == "readsb":
                aircraft = await self._fetch_readsb(src_id, config, bounds, timeout, headers)
            elif config["type"] == "opensky":
                aircraft = await self._fetch_opensky(config, bounds, timeout, headers)
            else:
                return None

            latency = (time.time() - t0) * 1000
            health.record_success(len(aircraft), latency)
            return aircraft

        except asyncio.TimeoutError:
            logger.warning("Source %s timed out after %ds", src_id, config["timeout"])
            health.record_failure()
            return None
        except Exception as e:
            logger.error("Source %s error: %s", src_id, e)
            health.record_failure()
            return None

    async def _fetch_fr24(
        self, config: dict, bounds: Optional[dict],
        timeout: aiohttp.ClientTimeout, headers: dict
    ) -> List[Aircraft]:
        """Parse FlightRadar24 public feed"""
        url = config["url"]
        params = {"faa": "1", "satellite": "1", "mlat": "1", "adsb": "1", "air": "1"}

        if bounds:
            # FR24 bounds format: north,south,east,west
            params["bounds"] = f"{bounds['north']},{bounds['south']},{bounds['east']},{bounds['west']}"
        else:
            # Global — no bounds filter
            pass

        async with self.session.get(url, params=params, timeout=timeout, headers=headers) as resp:
            if resp.status != 200:
                raise Exception(f"FR24 HTTP {resp.status}")
            data = await resp.json(content_type=None)

        aircraft = []
        for key, value in data.items():
            if not isinstance(value, list) or len(value) < 14:
                continue  # Skip metadata keys (full_count, version, etc.)

            # FR24 array format:
            # [0]=icao_hex, [1]=lat, [2]=lon, [3]=heading, [4]=altitude(ft),
            # [5]=speed(kts), [6]=squawk, [7]=radar, [8]=type, [9]=registration,
            # [10]=timestamp, [11]=departure, [12]=destination, [13]=callsign,
            # [14]=?, [15]=vertical_speed, [16]=?, [17]=?, [18]=airline
            try:
                ac = Aircraft(
                    icao=str(value[0]) if value[0] else key,
                    lat=float(value[1]) if value[1] else None,
                    lon=float(value[2]) if value[2] else None,
                    heading=float(value[3]) if value[3] else None,
                    alt_baro=float(value[4]) if value[4] else None,
                    ground_speed=float(value[5]) if value[5] else None,
                    squawk=str(value[6]) if value[6] else None,
                    aircraft_type=str(value[8]) if value[8] else "",
                    registration=str(value[9]) if value[9] else "",
                    last_seen=float(value[10]) if value[10] else time.time(),
                    origin=str(value[11]) if value[11] else "",
                    destination=str(value[12]) if value[12] else "",
                    callsign=str(value[13]).strip() if value[13] else "",
                    vertical_rate=float(value[15]) if len(value) > 15 and value[15] else None,
                    on_ground=bool(value[4] == 0) if value[4] is not None else False,
                    source="fr24",
                )
                if ac.lat and ac.lon:
                    aircraft.append(ac)
            except (IndexError, ValueError, TypeError):
                continue

        return aircraft

    async def _fetch_readsb(
        self, src_id: str, config: dict, bounds: Optional[dict],
        timeout: aiohttp.ClientTimeout, headers: dict
    ) -> List[Aircraft]:
        """Parse readsb-format APIs (ADSB.lol, ADSB.one, ADS-B.fi, ADSBx)"""
        base = config["url"]

        if bounds:
            # Use center point + radius approach
            center_lat = (bounds["north"] + bounds["south"]) / 2
            center_lon = (bounds["east"] + bounds["west"]) / 2
            # Approximate radius in nautical miles
            lat_span = abs(bounds["north"] - bounds["south"])
            lon_span = abs(bounds["east"] - bounds["west"])
            radius_nm = max(lat_span, lon_span) * 60 / 2  # rough conversion

            if "adsb.one" in base:
                url = f"{base}/point/{center_lat}/{center_lon}/{int(radius_nm)}"
            else:
                url = f"{base}/lat/{center_lat}/lon/{center_lon}/dist/{int(radius_nm)}"
        else:
            # Global — large radius from 0,0
            if "adsb.one" in base:
                url = f"{base}/point/0/0/9999"
            else:
                url = f"{base}/lat/0/lon/0/dist/9999"

        async with self.session.get(url, timeout=timeout, headers=headers) as resp:
            if resp.status != 200:
                raise Exception(f"{src_id} HTTP {resp.status}")
            data = await resp.json()

        ac_list = data.get("ac", [])
        aircraft = []

        for a in ac_list:
            try:
                alt = a.get("alt_baro")
                if isinstance(alt, str):
                    alt = None if alt == "ground" else float(alt)

                ac = Aircraft(
                    icao=a.get("hex", "").strip(),
                    callsign=a.get("flight", "").strip(),
                    lat=float(a["lat"]) if "lat" in a else None,
                    lon=float(a["lon"]) if "lon" in a else None,
                    alt_baro=float(alt) if alt is not None else None,
                    alt_geo=float(a["alt_geom"]) if "alt_geom" in a else None,
                    ground_speed=float(a["gs"]) if "gs" in a else None,
                    heading=float(a["track"]) if "track" in a else None,
                    vertical_rate=float(a["baro_rate"]) if "baro_rate" in a else None,
                    squawk=a.get("squawk"),
                    aircraft_type=a.get("t", ""),
                    registration=a.get("r", ""),
                    on_ground=a.get("alt_baro") == "ground",
                    source=src_id,
                    last_seen=time.time() - float(a.get("seen", 0)),
                    category=int(a.get("category", "00") or "00", 16) if a.get("category") else 0,
                )
                if ac.icao and ac.lat and ac.lon:
                    aircraft.append(ac)
            except (ValueError, TypeError, KeyError):
                continue

        return aircraft

    async def _fetch_opensky(
        self, config: dict, bounds: Optional[dict],
        timeout: aiohttp.ClientTimeout, headers: dict
    ) -> List[Aircraft]:
        """Parse OpenSky Network API"""
        url = config["url"]
        params = {}

        if bounds:
            params = {
                "lamin": bounds["south"],
                "lomin": bounds["west"],
                "lamax": bounds["north"],
                "lomax": bounds["east"],
            }

        # OpenSky auth (if available)
        auth = None
        os_user = os.environ.get("OPENSKY_USER")
        os_pass = os.environ.get("OPENSKY_PASS")
        if os_user and os_pass:
            auth = aiohttp.BasicAuth(os_user, os_pass)

        async with self.session.get(
            url, params=params, timeout=timeout, headers=headers, auth=auth
        ) as resp:
            if resp.status == 429:
                raise Exception("OpenSky rate limited")
            if resp.status != 200:
                raise Exception(f"OpenSky HTTP {resp.status}")
            data = await resp.json()

        states = data.get("states", [])
        aircraft = []

        for s in states:
            if len(s) < 17:
                continue
            try:
                ac = Aircraft(
                    icao=s[0] or "",
                    callsign=(s[1] or "").strip(),
                    lat=float(s[6]) if s[6] is not None else None,
                    lon=float(s[5]) if s[5] is not None else None,
                    alt_baro=float(s[7]) / 0.3048 if s[7] is not None else None,  # m → ft
                    alt_geo=float(s[13]) / 0.3048 if s[13] is not None else None,
                    ground_speed=float(s[9]) / 0.514444 if s[9] is not None else None,  # m/s → kts
                    heading=float(s[10]) if s[10] is not None else None,
                    vertical_rate=float(s[11]) / 0.00508 if s[11] is not None else None,  # m/s → ft/min
                    squawk=s[14],
                    on_ground=bool(s[8]),
                    source="opensky",
                    last_seen=float(s[4] or s[3] or time.time()),
                    category=int(s[17]) if len(s) > 17 and s[17] else 0,
                )
                if ac.icao and ac.lat and ac.lon:
                    aircraft.append(ac)
            except (ValueError, TypeError, IndexError):
                continue

        return aircraft


# ── Singleton ────────────────────────────────────────────────
flight_aggregator = FlightAggregator()
