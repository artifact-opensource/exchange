"""
GDI — Geospatial Analysis Tools
Distance, bearing, area calculations, and entity proximity search.
Pure Python — no external geo libs required (math-only implementation).
"""

import math
import logging
from typing import Optional
from dataclasses import dataclass, field
from datetime import datetime, timezone

log = logging.getLogger("gdi.geospatial")

EARTH_RADIUS_KM = 6371.0
EARTH_RADIUS_M = 6371000.0


# ─── Core Math ───────────────────────────────────────────────

def haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Great-circle distance between two points in km."""
    r = EARTH_RADIUS_KM
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2) ** 2 + \
        math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * \
        math.sin(dlon / 2) ** 2
    return r * 2 * math.asin(math.sqrt(a))


def bearing(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Initial bearing from point 1 to point 2 in degrees (0-360)."""
    lat1, lon1, lat2, lon2 = map(math.radians, [lat1, lon1, lat2, lon2])
    dlon = lon2 - lon1
    x = math.sin(dlon) * math.cos(lat2)
    y = math.cos(lat1) * math.sin(lat2) - \
        math.sin(lat1) * math.cos(lat2) * math.cos(dlon)
    initial = math.degrees(math.atan2(x, y))
    return (initial + 360) % 360


def destination_point(lat: float, lon: float, bearing_deg: float, distance_km: float) -> tuple:
    """Calculate destination point given start, bearing, and distance."""
    r = EARTH_RADIUS_KM
    lat1 = math.radians(lat)
    lon1 = math.radians(lon)
    brng = math.radians(bearing_deg)
    d = distance_km / r

    lat2 = math.asin(
        math.sin(lat1) * math.cos(d) +
        math.cos(lat1) * math.sin(d) * math.cos(brng)
    )
    lon2 = lon1 + math.atan2(
        math.sin(brng) * math.sin(d) * math.cos(lat1),
        math.cos(d) - math.sin(lat1) * math.sin(lat2)
    )
    return (math.degrees(lat2), math.degrees(lon2))


def bounding_box(lat: float, lon: float, radius_km: float) -> dict:
    """Calculate bounding box for a circle (fast pre-filter for queries)."""
    dlat = radius_km / EARTH_RADIUS_KM * (180 / math.pi)
    dlon = dlat / math.cos(math.radians(lat))
    return {
        "south": lat - dlat,
        "north": lat + dlat,
        "west": lon - dlon,
        "east": lon + dlon,
    }


def polygon_area(vertices: list[tuple[float, float]]) -> float:
    """Area of a polygon on Earth's surface in km² (spherical excess method for small polys,
    Shoelace for approximation)."""
    n = len(vertices)
    if n < 3:
        return 0.0
    # Use Shoelace on projected coords (good enough for < 1000km polygons)
    area = 0.0
    for i in range(n):
        j = (i + 1) % n
        lat1, lon1 = vertices[i]
        lat2, lon2 = vertices[j]
        # Convert to approximate km (Mercator-ish)
        x1 = lon1 * math.cos(math.radians(lat1)) * (EARTH_RADIUS_KM * math.pi / 180)
        y1 = lat1 * (EARTH_RADIUS_KM * math.pi / 180)
        x2 = lon2 * math.cos(math.radians(lat2)) * (EARTH_RADIUS_KM * math.pi / 180)
        y2 = lat2 * (EARTH_RADIUS_KM * math.pi / 180)
        area += x1 * y2 - x2 * y1
    return abs(area) / 2


def point_in_polygon(lat: float, lon: float, vertices: list[tuple[float, float]]) -> bool:
    """Ray-casting point-in-polygon test."""
    n = len(vertices)
    inside = False
    j = n - 1
    for i in range(n):
        yi, xi = vertices[i]
        yj, xj = vertices[j]
        if ((yi > lat) != (yj > lat)) and \
           (lon < (xj - xi) * (lat - yi) / (yj - yi) + xi):
            inside = not inside
        j = i
    return inside


def point_in_circle(lat: float, lon: float, center_lat: float, center_lon: float, radius_km: float) -> bool:
    """Check if point is within a circular region."""
    return haversine(lat, lon, center_lat, center_lon) <= radius_km


# ─── Entity Types ────────────────────────────────────────────

@dataclass
class GeoEntity:
    """Universal geospatial entity — flights, quakes, satellites, signals."""
    id: str
    layer: str                          # flights, seismic, satellites, sigint
    lat: float
    lon: float
    altitude_m: Optional[float] = None
    timestamp: Optional[float] = None   # Unix epoch
    heading: Optional[float] = None
    velocity_ms: Optional[float] = None
    metadata: dict = field(default_factory=dict)

    @property
    def time_str(self) -> str:
        if self.timestamp:
            return datetime.fromtimestamp(self.timestamp, tz=timezone.utc).isoformat()
        return "unknown"


# ─── Proximity Search (in-memory, fast) ──────────────────────

class SpatialIndex:
    """Simple grid-based spatial index for fast proximity queries.
    Divides the globe into cells and bins entities by cell.
    Not a full R-tree but good enough for <100K entities."""

    def __init__(self, cell_size_deg: float = 1.0):
        self.cell_size = cell_size_deg
        self.grid: dict[tuple[int, int], list[GeoEntity]] = {}
        self._count = 0

    def _cell(self, lat: float, lon: float) -> tuple[int, int]:
        return (int(lat / self.cell_size), int(lon / self.cell_size))

    def clear(self):
        self.grid.clear()
        self._count = 0

    def insert(self, entity: GeoEntity):
        cell = self._cell(entity.lat, entity.lon)
        if cell not in self.grid:
            self.grid[cell] = []
        self.grid[cell].append(entity)
        self._count += 1

    def insert_batch(self, entities: list[GeoEntity]):
        for e in entities:
            self.insert(e)

    def query_radius(self, lat: float, lon: float, radius_km: float,
                     layer: Optional[str] = None,
                     time_start: Optional[float] = None,
                     time_end: Optional[float] = None) -> list[tuple[GeoEntity, float]]:
        """Find all entities within radius_km of (lat, lon).
        Returns list of (entity, distance_km) sorted by distance."""
        results = []

        # Calculate cell range to check
        bbox = bounding_box(lat, lon, radius_km)
        min_row = int(bbox["south"] / self.cell_size) - 1
        max_row = int(bbox["north"] / self.cell_size) + 1
        min_col = int(bbox["west"] / self.cell_size) - 1
        max_col = int(bbox["east"] / self.cell_size) + 1

        for row in range(min_row, max_row + 1):
            for col in range(min_col, max_col + 1):
                entities = self.grid.get((row, col), [])
                for e in entities:
                    # Layer filter
                    if layer and e.layer != layer:
                        continue
                    # Time filter
                    if time_start and e.timestamp and e.timestamp < time_start:
                        continue
                    if time_end and e.timestamp and e.timestamp > time_end:
                        continue
                    # Distance check
                    d = haversine(lat, lon, e.lat, e.lon)
                    if d <= radius_km:
                        results.append((e, d))

        results.sort(key=lambda x: x[1])
        return results

    def query_polygon(self, vertices: list[tuple[float, float]],
                      layer: Optional[str] = None) -> list[GeoEntity]:
        """Find all entities inside a polygon."""
        results = []
        # Get bounding box of polygon for cell range
        lats = [v[0] for v in vertices]
        lons = [v[1] for v in vertices]
        min_row = int(min(lats) / self.cell_size) - 1
        max_row = int(max(lats) / self.cell_size) + 1
        min_col = int(min(lons) / self.cell_size) - 1
        max_col = int(max(lons) / self.cell_size) + 1

        for row in range(min_row, max_row + 1):
            for col in range(min_col, max_col + 1):
                for e in self.grid.get((row, col), []):
                    if layer and e.layer != layer:
                        continue
                    if point_in_polygon(e.lat, e.lon, vertices):
                        results.append(e)
        return results

    @property
    def count(self) -> int:
        return self._count

    def stats(self) -> dict:
        return {
            "total_entities": self._count,
            "grid_cells": len(self.grid),
            "cell_size_deg": self.cell_size,
            "avg_per_cell": self._count / max(len(self.grid), 1),
        }


# ─── Global Instance ────────────────────────────────────────

spatial_index = SpatialIndex(cell_size_deg=1.0)


# ─── Measurement Tools (for frontend) ───────────────────────

def measure_distance(points: list[tuple[float, float]]) -> dict:
    """Calculate total distance along a path of points."""
    if len(points) < 2:
        return {"total_km": 0, "segments": []}
    segments = []
    total = 0
    for i in range(len(points) - 1):
        d = haversine(points[i][0], points[i][1], points[i+1][0], points[i+1][1])
        b = bearing(points[i][0], points[i][1], points[i+1][0], points[i+1][1])
        segments.append({"from": points[i], "to": points[i+1], "km": round(d, 3), "bearing": round(b, 1)})
        total += d
    return {"total_km": round(total, 3), "segments": segments}


def measure_area(vertices: list[tuple[float, float]]) -> dict:
    """Calculate area of a polygon."""
    area = polygon_area(vertices)
    return {"area_km2": round(area, 3), "vertices": len(vertices)}


log.info("Geospatial engine loaded — haversine, spatial index, measurement tools")
