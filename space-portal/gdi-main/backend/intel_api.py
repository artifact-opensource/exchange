"""
GDI — Intelligence API Router
New endpoints for the sovereign intelligence overhaul.
Mounted as a sub-router in server.py.

Provides:
  - /api/intelligence/search — unified search (HEKTOR + spatial)
  - /api/intelligence/proximity — proximity search around a point
  - /api/intelligence/timeline — events in a region during a time range
  - /api/intelligence/measure — distance/area measurement
  - /api/intelligence/stats — ingest pipeline statistics
  - /api/geofence/* — CRUD for geofence regions
"""

import time
import logging
from typing import Optional
from datetime import datetime, timezone

from fastapi import APIRouter, Query, HTTPException, Depends
from pydantic import BaseModel

from geospatial import (
    haversine, bearing, measure_distance, measure_area,
    spatial_index, point_in_circle, point_in_polygon,
    bounding_box, GeoEntity,
)
from ingest_pipeline import get_stats as get_ingest_stats

log = logging.getLogger("gdi.intel_api")

router = APIRouter(prefix="/api/intelligence", tags=["intelligence"])


# ─── Models ──────────────────────────────────────────────────

class ProximityRequest(BaseModel):
    lat: float
    lon: float
    radius_km: float = 100.0
    layer: Optional[str] = None          # Filter by layer (flights, seismic, satellites, sigint)
    time_window_minutes: Optional[float] = None  # Only entities within last N minutes
    limit: int = 100

class TimelineRequest(BaseModel):
    south: float
    west: float
    north: float
    east: float
    start_time: Optional[float] = None   # Unix epoch
    end_time: Optional[float] = None     # Unix epoch
    layer: Optional[str] = None
    limit: int = 200

class MeasureRequest(BaseModel):
    points: list[list[float]]            # [[lat, lon], [lat, lon], ...]
    type: str = "distance"               # "distance" or "area"

class SearchRequest(BaseModel):
    query: str
    mode: str = "hybrid"                 # bm25, vector, hybrid
    k: int = 10
    lat: Optional[float] = None          # Optional spatial bias
    lon: Optional[float] = None
    radius_km: Optional[float] = None

class GeofenceCreate(BaseModel):
    name: str
    description: Optional[str] = None
    type: str = "circle"                 # "circle" or "polygon"
    center_lat: Optional[float] = None
    center_lon: Optional[float] = None
    radius_km: Optional[float] = None
    vertices: Optional[list[list[float]]] = None  # For polygon: [[lat, lon], ...]
    trigger: str = "enter"               # enter, exit, dwell, both
    entity_filter: Optional[str] = None  # Layer filter
    severity: str = "warning"


# ─── Proximity Search ───────────────────────────────────────

@router.post("/proximity")
async def proximity_search(req: ProximityRequest):
    """Find all entities within a radius of a point."""
    time_start = None
    time_end = None
    if req.time_window_minutes:
        time_end = time.time()
        time_start = time_end - (req.time_window_minutes * 60)

    results = spatial_index.query_radius(
        lat=req.lat,
        lon=req.lon,
        radius_km=req.radius_km,
        layer=req.layer,
        time_start=time_start,
        time_end=time_end,
    )

    entities = []
    for entity, dist in results[:req.limit]:
        entities.append({
            "id": entity.id,
            "layer": entity.layer,
            "lat": entity.lat,
            "lon": entity.lon,
            "altitude_m": entity.altitude_m,
            "heading": entity.heading,
            "velocity_ms": entity.velocity_ms,
            "distance_km": round(dist, 2),
            "bearing": round(bearing(req.lat, req.lon, entity.lat, entity.lon), 1),
            "timestamp": entity.time_str,
            "metadata": entity.metadata,
        })

    # Summary by layer
    layer_counts = {}
    for e in entities:
        layer_counts[e["layer"]] = layer_counts.get(e["layer"], 0) + 1

    return {
        "center": {"lat": req.lat, "lon": req.lon},
        "radius_km": req.radius_km,
        "total": len(entities),
        "by_layer": layer_counts,
        "entities": entities,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


# ─── Timeline Search ────────────────────────────────────────

@router.post("/timeline")
async def timeline_search(req: TimelineRequest):
    """Find all events in a bounding box during a time range."""
    now = time.time()
    t_start = req.start_time or (now - 86400)  # Default: last 24h
    t_end = req.end_time or now

    # Use spatial index with bounding box center + diagonal radius
    center_lat = (req.south + req.north) / 2
    center_lon = (req.west + req.east) / 2
    # Approximate diagonal radius
    diag_km = haversine(req.south, req.west, req.north, req.east) / 2

    results = spatial_index.query_radius(
        lat=center_lat,
        lon=center_lon,
        radius_km=diag_km * 1.2,  # Slight oversize to ensure coverage
        layer=req.layer,
        time_start=t_start,
        time_end=t_end,
    )

    # Filter to exact bounding box
    entities = []
    for entity, dist in results:
        if (req.south <= entity.lat <= req.north and
            req.west <= entity.lon <= req.east):
            entities.append({
                "id": entity.id,
                "layer": entity.layer,
                "lat": entity.lat,
                "lon": entity.lon,
                "altitude_m": entity.altitude_m,
                "timestamp": entity.time_str,
                "metadata": entity.metadata,
            })
            if len(entities) >= req.limit:
                break

    return {
        "bbox": {"south": req.south, "west": req.west, "north": req.north, "east": req.east},
        "time_range": {"start": t_start, "end": t_end},
        "total": len(entities),
        "entities": entities,
    }


# ─── Unified Intelligence Search ────────────────────────────

@router.post("/search")
async def intelligence_search(req: SearchRequest):
    """Unified search: HEKTOR semantic + spatial proximity.
    If lat/lon provided, results are spatially biased."""
    results = {
        "query": req.query,
        "mode": req.mode,
        "semantic_results": [],
        "spatial_results": [],
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }

    # Semantic search via HEKTOR (if available)
    try:
        import subprocess
        import sys
        cmd = [
            sys.executable, "/home/adam/workspace/.ava-memory/ava_memory_fast.py",
            "search", req.query, "--mode", req.mode, "-k", str(req.k),
        ]
        proc = await asyncio.subprocess.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=10)
        if proc.returncode == 0 and stdout:
            for line in stdout.decode().strip().split("\n"):
                if line.strip():
                    results["semantic_results"].append(line.strip())
    except Exception as e:
        results["semantic_error"] = str(e)

    # Spatial search (if location provided)
    if req.lat is not None and req.lon is not None:
        radius = req.radius_km or 200.0
        spatial = spatial_index.query_radius(req.lat, req.lon, radius)
        for entity, dist in spatial[:req.k]:
            results["spatial_results"].append({
                "id": entity.id,
                "layer": entity.layer,
                "lat": entity.lat,
                "lon": entity.lon,
                "distance_km": round(dist, 2),
                "metadata": entity.metadata,
            })

    return results


# ─── Measurement Tools ──────────────────────────────────────

@router.post("/measure")
async def measure(req: MeasureRequest):
    """Distance or area measurement."""
    points = [(p[0], p[1]) for p in req.points]
    if req.type == "distance":
        return measure_distance(points)
    elif req.type == "area":
        if len(points) < 3:
            raise HTTPException(400, "Area measurement requires at least 3 points")
        return measure_area(points)
    else:
        raise HTTPException(400, f"Unknown measurement type: {req.type}")


# ─── Pipeline Stats ─────────────────────────────────────────

@router.get("/stats")
async def pipeline_stats():
    """Get ingest pipeline and spatial index statistics."""
    return get_ingest_stats()


# ─── Geofence Management ────────────────────────────────────

# In-memory geofence store (PostgreSQL version in rbac.py schema)
_geofences: dict[str, dict] = {}
_geofence_counter = 0

@router.post("/geofence")
async def create_geofence(req: GeofenceCreate):
    """Create a new geofence region."""
    global _geofence_counter
    _geofence_counter += 1
    fence_id = f"gf_{_geofence_counter}"

    fence = {
        "id": fence_id,
        "name": req.name,
        "description": req.description,
        "type": req.type,
        "trigger": req.trigger,
        "entity_filter": req.entity_filter,
        "severity": req.severity,
        "active": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }

    if req.type == "circle":
        if req.center_lat is None or req.center_lon is None or req.radius_km is None:
            raise HTTPException(400, "Circle geofence requires center_lat, center_lon, radius_km")
        fence["center_lat"] = req.center_lat
        fence["center_lon"] = req.center_lon
        fence["radius_km"] = req.radius_km
    elif req.type == "polygon":
        if not req.vertices or len(req.vertices) < 3:
            raise HTTPException(400, "Polygon geofence requires at least 3 vertices")
        fence["vertices"] = req.vertices
    else:
        raise HTTPException(400, f"Unknown geofence type: {req.type}")

    _geofences[fence_id] = fence
    log.info("Geofence created: %s (%s)", fence_id, req.name)
    return fence


@router.get("/geofence")
async def list_geofences():
    """List all geofences."""
    return {"geofences": list(_geofences.values()), "count": len(_geofences)}


@router.delete("/geofence/{fence_id}")
async def delete_geofence(fence_id: str):
    """Delete a geofence."""
    if fence_id not in _geofences:
        raise HTTPException(404, "Geofence not found")
    del _geofences[fence_id]
    return {"deleted": fence_id}


def check_geofences(entities: list[GeoEntity]) -> list[dict]:
    """Check a batch of entities against all active geofences.
    Returns list of triggered alerts."""
    alerts = []
    for fence in _geofences.values():
        if not fence.get("active"):
            continue

        layer_filter = fence.get("entity_filter")

        for entity in entities:
            if layer_filter and entity.layer != layer_filter:
                continue

            inside = False
            if fence["type"] == "circle":
                inside = point_in_circle(
                    entity.lat, entity.lon,
                    fence["center_lat"], fence["center_lon"],
                    fence["radius_km"],
                )
            elif fence["type"] == "polygon":
                vertices = [(v[0], v[1]) for v in fence["vertices"]]
                inside = point_in_polygon(entity.lat, entity.lon, vertices)

            trigger = fence.get("trigger", "enter")
            if (trigger in ("enter", "both") and inside) or \
               (trigger == "exit" and not inside):
                alerts.append({
                    "geofence_id": fence["id"],
                    "geofence_name": fence["name"],
                    "entity_id": entity.id,
                    "entity_layer": entity.layer,
                    "lat": entity.lat,
                    "lon": entity.lon,
                    "severity": fence.get("severity", "warning"),
                    "trigger": trigger,
                    "metadata": entity.metadata,
                })

    return alerts


# Need asyncio for HEKTOR subprocess
import asyncio

log.info("Intelligence API router loaded")
