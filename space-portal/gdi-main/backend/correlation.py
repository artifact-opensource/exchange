"""
GDI — Cross-Layer Correlation Engine
Finds relationships between entities across intelligence layers.

Core concept: real-world events don't stay in one layer. A military aircraft
near a seismic anomaly. A satellite pass over a ship cluster. A SIGINT burst
coinciding with unusual flight patterns. This engine surfaces those connections.

Architecture:
  - CorrelationEngine: singleton, runs continuous background correlation passes
  - CorrelationEvent: a detected relationship between 2+ entities across layers
  - FastAPI router: /api/correlation/* endpoints
  - WebSocket broadcast: pushes correlation events to connected clients

Correlation types:
  SPATIAL     — entities from different layers within proximity radius
  TEMPORAL    — events from different layers in same time window
  SPATIOTEMPORAL — both spatial AND temporal match (highest confidence)
  PATTERN     — recurring co-occurrence patterns (N events over time)
  CONVERGENCE — multiple entities converging on same point from different directions
"""

import asyncio
import logging
import time
import math
from collections import defaultdict, deque
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Optional, Any

from fastapi import APIRouter, Query, HTTPException
from pydantic import BaseModel

from geospatial import haversine, spatial_index, GeoEntity

log = logging.getLogger("gdi.correlation")

router = APIRouter(prefix="/api/correlation", tags=["correlation"])


# ─── Constants ───────────────────────────────────────────────

DEFAULT_SPATIAL_RADIUS_KM = 50.0       # Default proximity threshold
DEFAULT_TEMPORAL_WINDOW_S = 300.0      # 5-minute temporal window
MAX_CORRELATION_HISTORY = 500          # Keep last N correlation events in memory
CORRELATION_INTERVAL_S = 30.0          # Run correlation pass every 30 seconds
MIN_CONFIDENCE = 0.4                   # Discard correlations below this threshold

# Layer pairs that are interesting to correlate
INTERESTING_LAYER_PAIRS = [
    ("flights", "seismic"),
    ("flights", "satellites"),
    ("flights", "sigint"),
    ("seismic", "satellites"),
    ("seismic", "sigint"),
    ("satellites", "sigint"),
    ("flights", "ships"),
    ("satellites", "ships"),
]

# Significance weights per layer pair
PAIR_SIGNIFICANCE = {
    ("flights", "seismic"):    0.85,   # Aircraft near seismic — unusual
    ("flights", "sigint"):     0.90,   # Aircraft near signal intercept — high interest
    ("seismic", "sigint"):     0.80,   # Seismic + signal — possible underground test
    ("satellites", "sigint"):  0.75,   # Satellite overpass + signal burst
    ("flights", "satellites"): 0.55,   # Routine but trackable
    ("seismic", "satellites"): 0.60,
    ("satellites", "ships"):   0.65,
    ("flights", "ships"):      0.70,
}


# ─── Data Models ─────────────────────────────────────────────

@dataclass
class CorrelatedEntity:
    """An entity that is part of a correlation event."""
    entity_id: str
    layer: str
    lat: float
    lon: float
    timestamp: float
    metadata: dict = field(default_factory=dict)

    def to_dict(self) -> dict:
        return {
            "entity_id": self.entity_id,
            "layer": self.layer,
            "lat": self.lat,
            "lon": self.lon,
            "timestamp": self.timestamp,
            "metadata": self.metadata,
        }


@dataclass
class CorrelationEvent:
    """A detected cross-layer relationship."""
    correlation_id: str
    correlation_type: str              # SPATIAL, TEMPORAL, SPATIOTEMPORAL, CONVERGENCE, PATTERN
    entities: list[CorrelatedEntity]
    layers: list[str]                  # Which layers are involved
    confidence: float                  # 0.0 - 1.0
    significance: float                # 0.0 - 1.0 (importance weight)
    center_lat: float                  # Geographic center of event
    center_lon: float
    radius_km: float                   # Spatial extent
    time_window_s: float               # Temporal extent
    detected_at: float = field(default_factory=time.time)
    description: str = ""
    tags: list[str] = field(default_factory=list)
    acknowledged: bool = False
    acknowledged_by: Optional[str] = None

    def to_dict(self) -> dict:
        return {
            "correlation_id": self.correlation_id,
            "correlation_type": self.correlation_type,
            "entities": [e.to_dict() for e in self.entities],
            "layers": self.layers,
            "confidence": round(self.confidence, 3),
            "significance": round(self.significance, 3),
            "center_lat": self.center_lat,
            "center_lon": self.center_lon,
            "radius_km": round(self.radius_km, 2),
            "time_window_s": self.time_window_s,
            "detected_at": self.detected_at,
            "detected_at_iso": datetime.fromtimestamp(self.detected_at, tz=timezone.utc).isoformat(),
            "description": self.description,
            "tags": self.tags,
            "acknowledged": self.acknowledged,
            "acknowledged_by": self.acknowledged_by,
        }


# ─── Correlation Engine ──────────────────────────────────────

class CorrelationEngine:
    """
    Continuously scans live entity data across all GDI layers and finds
    cross-layer correlations. Results are stored in memory and pushed
    to connected WebSocket clients.
    """

    _instance: Optional["CorrelationEngine"] = None

    def __init__(self):
        self._history: deque[CorrelationEvent] = deque(maxlen=MAX_CORRELATION_HISTORY)
        self._seen_ids: set[str] = set()
        self._pattern_tracker: dict[str, list[float]] = defaultdict(list)  # pair_key → [timestamps]
        self._ws_broadcast_cb = None   # Injected by server.py
        self._running = False
        self._task: Optional[asyncio.Task] = None
        self._stats = {
            "total_correlations": 0,
            "last_pass_at": 0,
            "last_pass_duration_ms": 0,
            "passes_run": 0,
        }

    @classmethod
    def get_instance(cls) -> "CorrelationEngine":
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def set_broadcast_callback(self, cb):
        """Called by server.py to wire up WebSocket broadcasting."""
        self._ws_broadcast_cb = cb

    async def start(self):
        """Start the background correlation loop."""
        if self._running:
            return
        self._running = True
        self._task = asyncio.create_task(self._correlation_loop())
        log.info("Correlation engine started (interval=%ds)", CORRELATION_INTERVAL_S)

    async def stop(self):
        """Stop the correlation loop."""
        self._running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
        log.info("Correlation engine stopped")

    async def _correlation_loop(self):
        """Main loop — runs every CORRELATION_INTERVAL_S seconds."""
        while self._running:
            try:
                start = time.monotonic()
                await self._run_pass()
                elapsed_ms = (time.monotonic() - start) * 1000
                self._stats["last_pass_at"] = time.time()
                self._stats["last_pass_duration_ms"] = round(elapsed_ms, 1)
                self._stats["passes_run"] += 1
            except Exception as exc:
                log.error("Correlation pass error: %s", exc, exc_info=True)
            await asyncio.sleep(CORRELATION_INTERVAL_S)

    async def _run_pass(self):
        """
        One correlation pass over all live entities.
        Pulls entities from the spatial_index (shared with geospatial.py),
        groups by layer, then checks each interesting layer pair.
        """
        # Snapshot the spatial index
        all_entities = list(spatial_index.entities.values()) if hasattr(spatial_index, "entities") else []

        if not all_entities:
            return  # Nothing to correlate yet

        # Group by layer
        by_layer: dict[str, list[GeoEntity]] = defaultdict(list)
        now = time.time()
        for entity in all_entities:
            # Only consider entities seen in the last 10 minutes
            age = now - getattr(entity, "timestamp", now)
            if age < 600:
                layer = getattr(entity, "layer", "unknown")
                by_layer[layer].append(entity)

        if len(by_layer) < 2:
            return  # Need at least 2 layers

        # Check each interesting pair
        new_correlations: list[CorrelationEvent] = []
        for layer_a, layer_b in INTERESTING_LAYER_PAIRS:
            entities_a = by_layer.get(layer_a, [])
            entities_b = by_layer.get(layer_b, [])
            if not entities_a or not entities_b:
                continue
            found = self._correlate_pair(entities_a, layer_a, entities_b, layer_b, now)
            new_correlations.extend(found)

        # Also run convergence detection across all layers
        convergence_events = self._detect_convergence(by_layer, now)
        new_correlations.extend(convergence_events)

        # Filter by minimum confidence and deduplicate
        for event in new_correlations:
            if event.confidence < MIN_CONFIDENCE:
                continue
            if event.correlation_id in self._seen_ids:
                continue
            self._seen_ids.add(event.correlation_id)
            self._history.append(event)
            self._stats["total_correlations"] += 1
            log.info(
                "Correlation [%s] %s — layers=%s confidence=%.2f",
                event.correlation_type, event.correlation_id[:12],
                "+".join(event.layers), event.confidence
            )
            # Broadcast to WebSocket clients
            if self._ws_broadcast_cb:
                try:
                    await self._ws_broadcast_cb({
                        "type": "correlation",
                        "event": event.to_dict(),
                    })
                except Exception as exc:
                    log.warning("Broadcast error: %s", exc)

    def _correlate_pair(
        self,
        entities_a: list,
        layer_a: str,
        entities_b: list,
        layer_b: str,
        now: float,
        spatial_radius_km: float = DEFAULT_SPATIAL_RADIUS_KM,
        temporal_window_s: float = DEFAULT_TEMPORAL_WINDOW_S,
    ) -> list[CorrelationEvent]:
        """
        Find spatial/temporal correlations between two layers.
        Returns list of CorrelationEvent objects.
        """
        events = []
        pair_key = tuple(sorted([layer_a, layer_b]))
        significance = PAIR_SIGNIFICANCE.get(pair_key, 0.5)

        for ea in entities_a:
            for eb in entities_b:
                lat_a = getattr(ea, "lat", None)
                lon_a = getattr(ea, "lon", None)
                lat_b = getattr(eb, "lat", None)
                lon_b = getattr(eb, "lon", None)

                if None in (lat_a, lon_a, lat_b, lon_b):
                    continue

                dist_km = haversine(lat_a, lon_a, lat_b, lon_b)
                ts_a = getattr(ea, "timestamp", now)
                ts_b = getattr(eb, "timestamp", now)
                time_delta_s = abs(ts_a - ts_b)

                is_spatial = dist_km <= spatial_radius_km
                is_temporal = time_delta_s <= temporal_window_s

                if not (is_spatial or is_temporal):
                    continue

                # Determine type and confidence
                if is_spatial and is_temporal:
                    corr_type = "SPATIOTEMPORAL"
                    # Confidence: closer + more recent = higher
                    spatial_score = 1.0 - (dist_km / spatial_radius_km)
                    temporal_score = 1.0 - (time_delta_s / temporal_window_s)
                    confidence = 0.5 * spatial_score + 0.5 * temporal_score
                elif is_spatial:
                    corr_type = "SPATIAL"
                    confidence = 0.6 * (1.0 - dist_km / spatial_radius_km)
                else:
                    corr_type = "TEMPORAL"
                    confidence = 0.4 * (1.0 - time_delta_s / temporal_window_s)

                # Weight by layer-pair significance
                confidence *= significance

                # Build stable correlation ID (deterministic for same entity pair)
                id_a = getattr(ea, "entity_id", str(ea))
                id_b = getattr(eb, "entity_id", str(eb))
                corr_id = f"{layer_a}:{id_a}↔{layer_b}:{id_b}@{int(now // 60)}"

                center_lat = (lat_a + lat_b) / 2
                center_lon = (lon_a + lon_b) / 2

                description = (
                    f"{corr_type}: {layer_a.upper()} entity '{id_a}' "
                    f"and {layer_b.upper()} entity '{id_b}' — "
                    f"{dist_km:.1f}km apart, {time_delta_s:.0f}s time delta"
                )

                tags = [corr_type.lower(), layer_a, layer_b]
                if dist_km < 10:
                    tags.append("close_proximity")
                if time_delta_s < 60:
                    tags.append("simultaneous")

                # Update pattern tracker
                self._pattern_tracker[f"{layer_a}+{layer_b}"].append(now)
                # Trim old entries (>1 hour)
                self._pattern_tracker[f"{layer_a}+{layer_b}"] = [
                    t for t in self._pattern_tracker[f"{layer_a}+{layer_b}"]
                    if now - t < 3600
                ]

                events.append(CorrelationEvent(
                    correlation_id=corr_id,
                    correlation_type=corr_type,
                    entities=[
                        CorrelatedEntity(
                            entity_id=id_a, layer=layer_a,
                            lat=lat_a, lon=lon_a, timestamp=ts_a,
                            metadata=getattr(ea, "metadata", {}),
                        ),
                        CorrelatedEntity(
                            entity_id=id_b, layer=layer_b,
                            lat=lat_b, lon=lon_b, timestamp=ts_b,
                            metadata=getattr(eb, "metadata", {}),
                        ),
                    ],
                    layers=[layer_a, layer_b],
                    confidence=min(confidence, 1.0),
                    significance=significance,
                    center_lat=center_lat,
                    center_lon=center_lon,
                    radius_km=dist_km / 2,
                    time_window_s=time_delta_s,
                    description=description,
                    tags=tags,
                ))

        return events

    def _detect_convergence(
        self,
        by_layer: dict[str, list],
        now: float,
        convergence_radius_km: float = 20.0,
        min_layers: int = 3,
    ) -> list[CorrelationEvent]:
        """
        Detect convergence: multiple entities from different layers
        moving toward or concentrated in the same geographic point.
        Requires at least min_layers different layers near a point.
        """
        events = []

        # Collect all entities with position
        all_positioned = []
        for layer, entities in by_layer.items():
            for e in entities:
                lat = getattr(e, "lat", None)
                lon = getattr(e, "lon", None)
                if lat is not None and lon is not None:
                    all_positioned.append((layer, e, lat, lon))

        if len(all_positioned) < min_layers:
            return events

        # Find clusters: for each entity, check how many OTHER-layer entities
        # are within convergence_radius_km
        checked_clusters: set[frozenset] = set()

        for i, (layer_i, ei, lat_i, lon_i) in enumerate(all_positioned):
            cluster_entities = [(layer_i, ei, lat_i, lon_i)]
            cluster_layers = {layer_i}

            for j, (layer_j, ej, lat_j, lon_j) in enumerate(all_positioned):
                if i == j or layer_j == layer_i:
                    continue
                dist = haversine(lat_i, lon_i, lat_j, lon_j)
                if dist <= convergence_radius_km:
                    cluster_entities.append((layer_j, ej, lat_j, lon_j))
                    cluster_layers.add(layer_j)

            if len(cluster_layers) < min_layers:
                continue

            # Deduplicate clusters by entity set
            cluster_key = frozenset(
                getattr(e, "entity_id", str(e))
                for _, e, _, _ in cluster_entities
            )
            if cluster_key in checked_clusters:
                continue
            checked_clusters.add(cluster_key)

            # Compute centroid
            lats = [lat for _, _, lat, _ in cluster_entities]
            lons = [lon for _, _, _, lon in cluster_entities]
            center_lat = sum(lats) / len(lats)
            center_lon = sum(lons) / len(lons)

            # Max distance from centroid
            max_dist = max(
                haversine(center_lat, center_lon, lat, lon)
                for _, _, lat, lon in cluster_entities
            )

            confidence = min(0.6 + 0.1 * (len(cluster_layers) - min_layers), 0.95)
            corr_id = f"CONV:{'+'.join(sorted(cluster_layers))}@{center_lat:.2f},{center_lon:.2f}@{int(now // 60)}"

            entity_ids = [getattr(e, "entity_id", "?") for _, e, _, _ in cluster_entities]
            description = (
                f"CONVERGENCE: {len(cluster_layers)} layers ({', '.join(sorted(cluster_layers))}) "
                f"within {max_dist:.1f}km of ({center_lat:.3f}, {center_lon:.3f}) — "
                f"{len(cluster_entities)} entities total"
            )

            correlated = [
                CorrelatedEntity(
                    entity_id=getattr(e, "entity_id", "?"),
                    layer=layer,
                    lat=lat, lon=lon,
                    timestamp=getattr(e, "timestamp", now),
                    metadata=getattr(e, "metadata", {}),
                )
                for layer, e, lat, lon in cluster_entities
            ]

            events.append(CorrelationEvent(
                correlation_id=corr_id,
                correlation_type="CONVERGENCE",
                entities=correlated,
                layers=sorted(cluster_layers),
                confidence=confidence,
                significance=0.9,   # Convergence is always high significance
                center_lat=center_lat,
                center_lon=center_lon,
                radius_km=max_dist,
                time_window_s=0,
                description=description,
                tags=["convergence"] + sorted(cluster_layers),
            ))

        return events

    # ─── Public Query Interface ──────────────────────────────

    def get_recent(self, limit: int = 50, layer: Optional[str] = None) -> list[CorrelationEvent]:
        """Return most recent correlation events, optionally filtered by layer."""
        results = list(reversed(self._history))
        if layer:
            results = [e for e in results if layer in e.layers]
        return results[:limit]

    def get_by_type(self, corr_type: str, limit: int = 50) -> list[CorrelationEvent]:
        """Return events of a specific type."""
        return [e for e in reversed(self._history) if e.correlation_type == corr_type][:limit]

    def get_high_confidence(self, threshold: float = 0.7, limit: int = 50) -> list[CorrelationEvent]:
        """Return high-confidence events."""
        return [
            e for e in reversed(self._history)
            if e.confidence >= threshold
        ][:limit]

    def acknowledge(self, correlation_id: str, analyst: str = "system") -> bool:
        """Acknowledge a correlation event."""
        for event in self._history:
            if event.correlation_id == correlation_id:
                event.acknowledged = True
                event.acknowledged_by = analyst
                return True
        return False

    def get_stats(self) -> dict:
        by_type: dict[str, int] = defaultdict(int)
        by_layer_pair: dict[str, int] = defaultdict(int)
        for e in self._history:
            by_type[e.correlation_type] += 1
            pair = "+".join(sorted(e.layers[:2]))
            by_layer_pair[pair] += 1

        return {
            **self._stats,
            "history_size": len(self._history),
            "unacknowledged": sum(1 for e in self._history if not e.acknowledged),
            "by_type": dict(by_type),
            "by_layer_pair": dict(by_layer_pair),
            "pattern_activity": {
                k: len(v) for k, v in self._pattern_tracker.items()
            },
        }

    async def query(
        self,
        lat: float,
        lon: float,
        radius_km: float = DEFAULT_SPATIAL_RADIUS_KM,
        time_window_s: float = 3600.0,
        layer: Optional[str] = None,
    ) -> list[CorrelationEvent]:
        """
        Query for correlations near a geographic point within a time window.
        This is the primary API for 'what's happening here?'
        """
        now = time.time()
        results = []
        for event in self._history:
            age = now - event.detected_at
            if age > time_window_s:
                continue
            if layer and layer not in event.layers:
                continue
            dist = haversine(lat, lon, event.center_lat, event.center_lon)
            if dist <= radius_km + event.radius_km:
                results.append(event)
        # Sort by confidence desc
        results.sort(key=lambda e: e.confidence, reverse=True)
        return results


# ─── Module singleton ────────────────────────────────────────

correlation_engine = CorrelationEngine.get_instance()


# ─── API Request/Response Models ─────────────────────────────

class QueryRequest(BaseModel):
    lat: float
    lon: float
    radius_km: float = DEFAULT_SPATIAL_RADIUS_KM
    time_window_s: float = 3600.0
    layer: Optional[str] = None

class AcknowledgeRequest(BaseModel):
    correlation_id: str
    analyst: str = "analyst"


# ─── FastAPI Routes ──────────────────────────────────────────

@router.get("/recent")
async def get_recent(
    limit: int = Query(50, ge=1, le=500),
    layer: Optional[str] = Query(None),
):
    """Return recent correlation events."""
    events = correlation_engine.get_recent(limit=limit, layer=layer)
    return {"events": [e.to_dict() for e in events], "count": len(events)}


@router.get("/high-confidence")
async def get_high_confidence(
    threshold: float = Query(0.7, ge=0.0, le=1.0),
    limit: int = Query(50, ge=1, le=200),
):
    """Return high-confidence correlation events."""
    events = correlation_engine.get_high_confidence(threshold=threshold, limit=limit)
    return {"events": [e.to_dict() for e in events], "count": len(events)}


@router.get("/by-type/{corr_type}")
async def get_by_type(
    corr_type: str,
    limit: int = Query(50, ge=1, le=200),
):
    """Return events of a specific type (SPATIAL, TEMPORAL, SPATIOTEMPORAL, CONVERGENCE, PATTERN)."""
    valid = {"SPATIAL", "TEMPORAL", "SPATIOTEMPORAL", "CONVERGENCE", "PATTERN"}
    if corr_type.upper() not in valid:
        raise HTTPException(400, f"Invalid type. Must be one of: {', '.join(sorted(valid))}")
    events = correlation_engine.get_by_type(corr_type.upper(), limit=limit)
    return {"events": [e.to_dict() for e in events], "count": len(events)}


@router.post("/query")
async def query_near_point(request: QueryRequest):
    """
    Find correlations near a geographic point within a time window.
    Primary intelligence query: 'what cross-layer activity is happening here?'
    """
    events = await correlation_engine.query(
        lat=request.lat,
        lon=request.lon,
        radius_km=request.radius_km,
        time_window_s=request.time_window_s,
        layer=request.layer,
    )
    return {
        "events": [e.to_dict() for e in events],
        "count": len(events),
        "query": {
            "lat": request.lat,
            "lon": request.lon,
            "radius_km": request.radius_km,
            "time_window_s": request.time_window_s,
        },
    }


@router.post("/acknowledge")
async def acknowledge_event(request: AcknowledgeRequest):
    """Acknowledge a correlation event (analyst has reviewed it)."""
    success = correlation_engine.acknowledge(request.correlation_id, request.analyst)
    if not success:
        raise HTTPException(404, f"Correlation '{request.correlation_id}' not found")
    return {"success": True, "correlation_id": request.correlation_id}


@router.get("/stats")
async def get_stats():
    """Return correlation engine statistics."""
    return correlation_engine.get_stats()


@router.get("/layers")
async def get_layer_pairs():
    """Return which layer pairs are monitored and their significance weights."""
    return {
        "layer_pairs": [
            {
                "layers": list(pair),
                "significance": sig,
                "description": _pair_description(pair),
            }
            for pair, sig in sorted(PAIR_SIGNIFICANCE.items(), key=lambda x: -x[1])
        ]
    }


def _pair_description(pair: tuple) -> str:
    descriptions = {
        ("flights", "sigint"):     "Aircraft near signal intercept — possible ELINT/SIGINT collection",
        ("flights", "seismic"):    "Aircraft near seismic event — unusual co-occurrence",
        ("seismic", "sigint"):     "Seismic anomaly near signal burst — possible underground activity",
        ("satellites", "sigint"):  "Satellite overpass coinciding with signal intercept",
        ("flights", "ships"):      "Aircraft near maritime traffic — surveillance pattern",
        ("satellites", "ships"):   "Satellite pass over ship cluster — reconnaissance window",
        ("seismic", "satellites"): "Seismic event under satellite coverage window",
        ("flights", "satellites"): "Aircraft near satellite ground track",
    }
    return descriptions.get(pair, f"{pair[0]} + {pair[1]} cross-layer correlation")
