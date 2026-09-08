"""
GDI — Intelligence Ingest Pipeline
Converts raw data feeds (flights, seismic, satellites, SIGINT) into
normalized GeoEntities and feeds them into:
  1. Spatial Index (in-memory, fast proximity queries)
  2. HEKTOR (semantic search, correlation memory)
  3. Alert Engine (threshold + geofence evaluation)

This is the nervous system — every data point flows through here.
"""

import time
import json
import logging
import asyncio
from typing import Optional, Callable, Awaitable
from datetime import datetime, timezone

from geospatial import GeoEntity, spatial_index

log = logging.getLogger("gdi.ingest")


# ─── Callbacks (wired at startup) ────────────────────────────

_on_entity: Optional[Callable[[GeoEntity], Awaitable[None]]] = None
_on_batch: Optional[Callable[[list[GeoEntity]], Awaitable[None]]] = None
_on_alert_check: Optional[Callable[[list[GeoEntity]], Awaitable[None]]] = None


def register_callbacks(
    on_entity: Callable = None,
    on_batch: Callable = None,
    on_alert_check: Callable = None,
):
    """Register downstream consumers."""
    global _on_entity, _on_batch, _on_alert_check
    if on_entity:
        _on_entity = on_entity
    if on_batch:
        _on_batch = on_batch
    if on_alert_check:
        _on_alert_check = on_alert_check


# ─── Counters ────────────────────────────────────────────────

class IngestStats:
    def __init__(self):
        self.flights_total = 0
        self.seismic_total = 0
        self.satellites_total = 0
        self.sigint_total = 0
        self.last_flight_update = 0
        self.last_seismic_update = 0
        self.last_satellite_update = 0
        self.errors = 0

    def to_dict(self) -> dict:
        return {
            "flights": self.flights_total,
            "seismic": self.seismic_total,
            "satellites": self.satellites_total,
            "sigint": self.sigint_total,
            "errors": self.errors,
            "spatial_index": spatial_index.stats(),
            "last_updates": {
                "flights": self.last_flight_update,
                "seismic": self.last_seismic_update,
                "satellites": self.last_satellite_update,
            },
        }


stats = IngestStats()


# ─── Flight Ingest ───────────────────────────────────────────

async def ingest_flights(data: dict) -> int:
    """Ingest OpenSky-format flight data into the spatial index.
    
    OpenSky state vector format:
    [0] icao24, [1] callsign, [2] origin_country, [3] time_position,
    [4] last_contact, [5] longitude, [6] latitude, [7] baro_altitude,
    [8] on_ground, [9] velocity, [10] true_track, [11] vertical_rate,
    [12] sensors, [13] geo_altitude, [14] squawk, [15] spi, [16] position_source,
    [17] category
    """
    states = data.get("states", [])
    if not states:
        return 0

    entities = []
    now = time.time()

    for s in states:
        try:
            if not s or len(s) < 11:
                continue
            lat = s[6]
            lon = s[5]
            if lat is None or lon is None:
                continue

            icao = s[0] or "unknown"
            callsign = (s[1] or "").strip()
            
            entity = GeoEntity(
                id=f"flight_{icao}",
                layer="flights",
                lat=float(lat),
                lon=float(lon),
                altitude_m=float(s[7]) if s[7] is not None else None,
                timestamp=float(s[3]) if s[3] else now,
                heading=float(s[10]) if s[10] is not None else None,
                velocity_ms=float(s[9]) if s[9] is not None else None,
                metadata={
                    "icao24": icao,
                    "callsign": callsign,
                    "origin_country": s[2],
                    "on_ground": s[8],
                    "vertical_rate": s[11],
                    "squawk": s[14] if len(s) > 14 else None,
                    "category": s[17] if len(s) > 17 else None,
                },
            )
            entities.append(entity)
        except (ValueError, IndexError, TypeError) as e:
            stats.errors += 1
            continue

    # Bulk insert into spatial index (clear old flight data first)
    _clear_layer("flights")
    spatial_index.insert_batch(entities)
    stats.flights_total += len(entities)
    stats.last_flight_update = now

    # Notify downstream
    if _on_alert_check and entities:
        try:
            await _on_alert_check(entities)
        except Exception as e:
            log.error("Alert check failed: %s", e)

    if _on_batch and entities:
        try:
            await _on_batch(entities)
        except Exception as e:
            log.error("Batch callback failed: %s", e)

    log.debug("Ingested %d flights (spatial index: %d total)", len(entities), spatial_index.count)
    return len(entities)


# ─── Seismic Ingest ──────────────────────────────────────────

async def ingest_seismic(data: dict) -> int:
    """Ingest USGS GeoJSON earthquake data."""
    features = data.get("features", [])
    if not features:
        return 0

    entities = []
    now = time.time()

    for f in features:
        try:
            props = f.get("properties", {})
            coords = f.get("geometry", {}).get("coordinates", [])
            if len(coords) < 2:
                continue

            entity = GeoEntity(
                id=f"quake_{f.get('id', 'unknown')}",
                layer="seismic",
                lat=float(coords[1]),
                lon=float(coords[0]),
                altitude_m=-float(coords[2]) * 1000 if len(coords) > 2 else None,  # Depth in m (negative = underground)
                timestamp=float(props.get("time", 0)) / 1000.0 if props.get("time") else now,
                metadata={
                    "magnitude": props.get("mag"),
                    "place": props.get("place"),
                    "type": props.get("type"),
                    "status": props.get("status"),
                    "tsunami": props.get("tsunami"),
                    "sig": props.get("sig"),  # Significance score
                    "nst": props.get("nst"),  # Number of stations
                    "url": props.get("url"),
                },
            )
            entities.append(entity)
        except (ValueError, KeyError, TypeError) as e:
            stats.errors += 1
            continue

    _clear_layer("seismic")
    spatial_index.insert_batch(entities)
    stats.seismic_total += len(entities)
    stats.last_seismic_update = now

    # Notify downstream
    if _on_alert_check and entities:
        try:
            await _on_alert_check(entities)
        except Exception as e:
            log.error("Alert check failed: %s", e)

    log.debug("Ingested %d seismic events", len(entities))
    return len(entities)


# ─── Satellite Ingest ────────────────────────────────────────

async def ingest_satellites(positions: list[dict]) -> int:
    """Ingest satellite position data (from SGP4 propagation or SATx).
    
    Expected format: [{"norad_id": int, "name": str, "lat": float, "lon": float,
                        "altitude_km": float, "velocity_kms": float, ...}]
    """
    if not positions:
        return 0

    entities = []
    now = time.time()

    for sat in positions:
        try:
            entity = GeoEntity(
                id=f"sat_{sat.get('norad_id', 'unknown')}",
                layer="satellites",
                lat=float(sat["lat"]),
                lon=float(sat["lon"]),
                altitude_m=float(sat.get("altitude_km", 0)) * 1000,
                timestamp=now,
                velocity_ms=float(sat.get("velocity_kms", 0)) * 1000 if sat.get("velocity_kms") else None,
                metadata={
                    "norad_id": sat.get("norad_id"),
                    "name": sat.get("name"),
                    "category": sat.get("category"),
                    "inclination": sat.get("inclination"),
                    "period_min": sat.get("period_min"),
                },
            )
            entities.append(entity)
        except (ValueError, KeyError, TypeError) as e:
            stats.errors += 1
            continue

    _clear_layer("satellites")
    spatial_index.insert_batch(entities)
    stats.satellites_total += len(entities)
    stats.last_satellite_update = now

    log.debug("Ingested %d satellite positions", len(entities))
    return len(entities)


# ─── SIGINT Ingest ───────────────────────────────────────────

async def ingest_sigint(detections: list[dict]) -> int:
    """Ingest signal intelligence detections from SATx.
    
    Expected format: [{"id": str, "lat": float, "lon": float,
                        "frequency_hz": float, "snr_db": float,
                        "signal_class": str, ...}]
    """
    if not detections:
        return 0

    entities = []
    now = time.time()

    for det in detections:
        try:
            entity = GeoEntity(
                id=f"sigint_{det.get('id', 'unknown')}",
                layer="sigint",
                lat=float(det["lat"]),
                lon=float(det["lon"]),
                timestamp=det.get("timestamp", now),
                metadata={
                    "frequency_hz": det.get("frequency_hz"),
                    "snr_db": det.get("snr_db"),
                    "signal_class": det.get("signal_class"),
                    "modulation": det.get("modulation_type"),
                    "protocol": det.get("protocol"),
                    "confidence": det.get("confidence"),
                    "satellite_name": det.get("satellite_name"),
                    "satellite_norad": det.get("satellite_norad"),
                },
            )
            entities.append(entity)
        except (ValueError, KeyError, TypeError) as e:
            stats.errors += 1
            continue

    # SIGINT doesn't clear — accumulates
    spatial_index.insert_batch(entities)
    stats.sigint_total += len(entities)

    if _on_alert_check and entities:
        try:
            await _on_alert_check(entities)
        except Exception as e:
            log.error("Alert check failed: %s", e)

    log.debug("Ingested %d SIGINT detections", len(entities))
    return len(entities)


# ─── Helpers ─────────────────────────────────────────────────

def _clear_layer(layer: str):
    """Remove all entities of a layer from the spatial index."""
    for cell_key in list(spatial_index.grid.keys()):
        spatial_index.grid[cell_key] = [
            e for e in spatial_index.grid[cell_key] if e.layer != layer
        ]
        if not spatial_index.grid[cell_key]:
            del spatial_index.grid[cell_key]
    # Recount
    spatial_index._count = sum(len(v) for v in spatial_index.grid.values())


def get_stats() -> dict:
    return stats.to_dict()


log.info("Ingest pipeline loaded — flights, seismic, satellites, SIGINT")
