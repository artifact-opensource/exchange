"""
GDI — GDELT Event Worker
Fetches global events from the GDELT Project (15-minute updates).
Covers: conflicts, protests, diplomacy, disasters, terrorism, civil unrest.

GDELT is the world's largest open event database — billions of records,
updated every 15 minutes, completely free.
"""
import os
import io
import csv
import json
import time
import asyncio
import logging
import zipfile
from pathlib import Path
from datetime import datetime, timezone, timedelta

import aiohttp

logger = logging.getLogger("gdi.gdelt")

# ─── GDELT URLs ──────────────────────────────────────────────
GDELT_LATEST = "http://data.gdeltproject.org/gdeltv2/lastupdate.txt"
GDELT_GKG_LATEST = "http://data.gdeltproject.org/gdeltv2/lastupdate-translation.txt"

# Event codes that map to conflict/security (CAMEO codes)
CONFLICT_ROOTS = {
    "14": "protest",        # PROTEST
    "15": "force",          # EXHIBIT FORCE
    "17": "coerce",         # COERCE
    "18": "assault",        # ASSAULT
    "19": "fight",          # FIGHT
    "20": "mass_violence",  # UNCONVENTIONAL MASS VIOLENCE
}

# Goldstein scale: -10 (extreme conflict) to +10 (extreme cooperation)
SEVERITY_THRESHOLDS = {
    "critical": -7.0,
    "high": -4.0,
    "medium": -1.0,
    "low": 0.0,
}

# ─── Cache ───────────────────────────────────────────────────
CACHE_DIR = Path(__file__).resolve().parent.parent.parent / "data" / "gdelt_cache"
CACHE_DIR.mkdir(parents=True, exist_ok=True)


def classify_severity(goldstein):
    """Map Goldstein scale to GDI severity level."""
    if goldstein is None:
        return "unknown"
    g = float(goldstein)
    if g <= SEVERITY_THRESHOLDS["critical"]:
        return "critical"
    elif g <= SEVERITY_THRESHOLDS["high"]:
        return "high"
    elif g <= SEVERITY_THRESHOLDS["medium"]:
        return "medium"
    else:
        return "low"


def parse_gdelt_date(d):
    """Parse GDELT date format (YYYYMMDD or YYYYMMDDHHMMSS)."""
    try:
        if len(d) == 8:
            return datetime.strptime(d, "%Y%m%d").replace(tzinfo=timezone.utc)
        elif len(d) >= 14:
            return datetime.strptime(d[:14], "%Y%m%d%H%M%S").replace(tzinfo=timezone.utc)
    except:
        pass
    return None


class GDELTWorker:
    """Fetches and processes GDELT event data for GDI."""

    # GDELT V2 event export column indices (61 columns)
    COL_GLOBALEVENTID = 0
    COL_DATEADDED = 1
    COL_ACTOR1_COUNTRY = 7
    COL_ACTOR2_COUNTRY = 17
    COL_ISROOTEVENT = 25
    COL_EVENTCODE = 26
    COL_EVENTROOTCODE = 28
    COL_GOLDSTEIN = 30
    COL_NUMMENTIONS = 31
    COL_NUMSOURCES = 32
    COL_NUMARTS = 33
    COL_AVGTONE = 34
    COL_ACTOR1GEO_TYPE = 35
    COL_ACTOR1GEO_FULLNAME = 36
    COL_ACTOR1GEO_COUNTRYCODE = 37
    COL_ACTOR1GEO_LAT = 39
    COL_ACTOR1GEO_LONG = 40
    COL_ACTOR2GEO_TYPE = 42
    COL_ACTOR2GEO_FULLNAME = 43
    COL_ACTOR2GEO_LAT = 46
    COL_ACTOR2GEO_LONG = 47
    COL_ACTIONGEO_TYPE = 49
    COL_ACTIONGEO_FULLNAME = 50
    COL_ACTIONGEO_COUNTRYCODE = 51
    COL_ACTIONGEO_LAT = 53
    COL_ACTIONGEO_LONG = 54
    COL_SOURCEURL = 60

    def __init__(self):
        self._events = []       # Current window of events
        self._last_fetch = 0
        self._running = False
        self._stats = {
            "total_events": 0,
            "conflict_events": 0,
            "last_fetch": None,
            "last_update_url": None,
        }

    @property
    def events(self):
        return self._events

    @property
    def stats(self):
        return self._stats

    async def fetch_latest(self):
        """Fetch the latest 15-minute GDELT update."""
        t0 = time.time()

        try:
            async with aiohttp.ClientSession() as session:
                # Get the latest update file URL
                async with session.get(GDELT_LATEST, timeout=aiohttp.ClientTimeout(total=30)) as resp:
                    if resp.status != 200:
                        logger.error(f"GDELT lastupdate failed: {resp.status}")
                        return self._events
                    text = await resp.text()

                # Parse — format: "size hash url" per line, first line is export
                lines = text.strip().split("\n")
                if not lines:
                    return self._events

                export_url = lines[0].split()[-1]  # Last field is URL
                self._stats["last_update_url"] = export_url

                # Download the export zip
                async with session.get(export_url, timeout=aiohttp.ClientTimeout(total=60)) as resp:
                    if resp.status != 200:
                        logger.error(f"GDELT export download failed: {resp.status}")
                        return self._events
                    data = await resp.read()

            # Extract CSV from zip
            events = []
            with zipfile.ZipFile(io.BytesIO(data)) as zf:
                for fname in zf.namelist():
                    if fname.endswith(".export.CSV") or fname.endswith(".csv"):
                        with zf.open(fname) as f:
                            reader = csv.reader(io.TextIOWrapper(f, encoding="utf-8"), delimiter="\t")
                            for row in reader:
                                event = self._parse_event(row)
                                if event:
                                    events.append(event)

            # Merge with existing (keep last 6 hours of events, dedupe by ID)
            existing_ids = {e["id"] for e in self._events}
            cutoff = time.time() - 21600  # 6 hours
            self._events = [
                e for e in self._events
                if e.get("timestamp", 0) > cutoff
            ]
            for e in events:
                if e["id"] not in existing_ids:
                    self._events.append(e)

            self._last_fetch = time.time()
            self._stats["total_events"] = len(self._events)
            self._stats["conflict_events"] = sum(
                1 for e in self._events if e.get("is_conflict")
            )
            self._stats["last_fetch"] = datetime.fromtimestamp(
                self._last_fetch, tz=timezone.utc
            ).isoformat()

            elapsed = int((time.time() - t0) * 1000)
            logger.info(
                f"GDELT: {len(events)} new events, {len(self._events)} total, "
                f"{self._stats['conflict_events']} conflict, {elapsed}ms"
            )

        except Exception as e:
            logger.error(f"GDELT fetch error: {e}")

        return self._events

    def _parse_event(self, row):
        """Parse a single GDELT event row into GDI format."""
        try:
            if len(row) < 58:
                return None

            # Get action location (primary geo)
            lat = row[self.COL_ACTIONGEO_LAT].strip()
            lon = row[self.COL_ACTIONGEO_LONG].strip()
            if not lat or not lon:
                # Fall back to Actor1 geo
                lat = row[self.COL_ACTOR1GEO_LAT].strip()
                lon = row[self.COL_ACTOR1GEO_LONG].strip()
            if not lat or not lon:
                return None

            lat = float(lat)
            lon = float(lon)
            if lat == 0 and lon == 0:
                return None  # Skip null island

            event_code = row[self.COL_EVENTCODE].strip()
            root_code = row[self.COL_EVENTROOTCODE].strip()
            goldstein = float(row[self.COL_GOLDSTEIN]) if row[self.COL_GOLDSTEIN].strip() else None
            num_mentions = int(row[self.COL_NUMMENTIONS]) if row[self.COL_NUMMENTIONS].strip() else 0
            num_sources = int(row[self.COL_NUMSOURCES]) if row[self.COL_NUMSOURCES].strip() else 0
            avg_tone = float(row[self.COL_AVGTONE]) if row[self.COL_AVGTONE].strip() else 0

            is_conflict = root_code in CONFLICT_ROOTS
            conflict_type = CONFLICT_ROOTS.get(root_code, "")
            severity = classify_severity(goldstein)

            location = row[self.COL_ACTIONGEO_FULLNAME].strip()
            country = row[self.COL_ACTIONGEO_COUNTRYCODE].strip()
            source_url = row[self.COL_SOURCEURL].strip() if len(row) > self.COL_SOURCEURL else ""

            return {
                "id": row[self.COL_GLOBALEVENTID].strip(),
                "lat": lat,
                "lon": lon,
                "eventCode": event_code,
                "rootCode": root_code,
                "goldstein": goldstein,
                "severity": severity,
                "is_conflict": is_conflict,
                "conflictType": conflict_type,
                "numMentions": num_mentions,
                "numSources": num_sources,
                "avgTone": avg_tone,
                "location": location,
                "country": country,
                "actor1Country": row[self.COL_ACTOR1_COUNTRY].strip(),
                "actor2Country": row[self.COL_ACTOR2_COUNTRY].strip(),
                "sourceUrl": source_url,
                "timestamp": time.time(),
            }
        except Exception as e:
            return None

    async def start_background(self, interval=900):
        """Start background GDELT polling (every 15 min)."""
        self._running = True
        logger.info(f"GDELT worker starting (refresh every {interval}s)")

        await self.fetch_latest()

        while self._running:
            await asyncio.sleep(interval)
            try:
                await self.fetch_latest()
            except Exception as e:
                logger.error(f"GDELT background error: {e}")

    def stop(self):
        self._running = False

    # ─── Query methods ───────────────────────────────────────
    def get_conflicts(self, limit=500):
        """Get conflict events only."""
        events = [e for e in self._events if e["is_conflict"]]
        return sorted(events, key=lambda x: x.get("goldstein", 0))[:limit]

    def get_by_country(self, country_code, limit=200):
        """Get events by country."""
        return [e for e in self._events if e["country"] == country_code][:limit]

    def get_by_severity(self, severity, limit=200):
        """Get events by severity level."""
        return [e for e in self._events if e["severity"] == severity][:limit]

    def get_recent(self, hours=1, limit=500):
        """Get events from last N hours."""
        cutoff = time.time() - (hours * 3600)
        events = [e for e in self._events if e.get("timestamp", 0) > cutoff]
        return sorted(events, key=lambda x: -x.get("timestamp", 0))[:limit]

    def get_summary(self):
        """Summary for HUD."""
        severity_counts = {}
        country_counts = {}
        type_counts = {}
        for e in self._events:
            severity_counts[e["severity"]] = severity_counts.get(e["severity"], 0) + 1
            if e["country"]:
                country_counts[e["country"]] = country_counts.get(e["country"], 0) + 1
            if e["conflictType"]:
                type_counts[e["conflictType"]] = type_counts.get(e["conflictType"], 0) + 1

        return {
            "total_events": len(self._events),
            "conflict_events": sum(1 for e in self._events if e["is_conflict"]),
            "by_severity": severity_counts,
            "top_countries": dict(sorted(country_counts.items(), key=lambda x: -x[1])[:15]),
            "conflict_types": type_counts,
            "last_fetch": self._stats["last_fetch"],
        }


# ─── Singleton ───────────────────────────────────────────────
gdelt = GDELTWorker()
