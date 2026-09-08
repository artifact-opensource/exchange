"""
GDI Alerting Engine — The Nervous System
=========================================
Real-time geofence, threshold, anomaly, and proximity alerting.
Evaluates incoming data against registered rules, fires alerts
via WebSocket + Discord, maintains history with acknowledgment.

Classification: CONFIDENTIAL — Artifact Virtual Internal
"""

import os
import json
import math
import time
import uuid
import asyncio
import logging
from enum import Enum
from datetime import datetime, timezone
from typing import Optional, Callable, Any
from dataclasses import dataclass, field, asdict

log = logging.getLogger("gdi.alerting")

# ─── Enums ───────────────────────────────────────────────────

class AlertType(str, Enum):
    GEOFENCE   = "GEOFENCE"
    THRESHOLD  = "THRESHOLD"
    ANOMALY    = "ANOMALY"
    PROXIMITY  = "PROXIMITY"
    CUSTOM     = "CUSTOM"

class Severity(str, Enum):
    INFO       = "INFO"
    WARNING    = "WARNING"
    CRITICAL   = "CRITICAL"
    EMERGENCY  = "EMERGENCY"

class GeofenceTrigger(str, Enum):
    ENTER = "ENTER"
    EXIT  = "EXIT"
    DWELL = "DWELL"

# Severity ordering for comparisons
_SEVERITY_ORDER = {
    Severity.INFO: 0,
    Severity.WARNING: 1,
    Severity.CRITICAL: 2,
    Severity.EMERGENCY: 3,
}

# ─── Data Models ─────────────────────────────────────────────

@dataclass
class Alert:
    id: str
    type: AlertType
    severity: Severity
    title: str
    message: str
    layer: str
    entity_data: dict
    lat: Optional[float]
    lon: Optional[float]
    timestamp: float
    acknowledged: bool = False
    acknowledged_by: Optional[str] = None
    acknowledged_at: Optional[float] = None
    rule_id: Optional[str] = None

    def to_dict(self) -> dict:
        d = asdict(self)
        d["type"] = self.type.value
        d["severity"] = self.severity.value
        return d


@dataclass
class GeofenceRegion:
    """A geographic region — polygon or circle."""
    id: str
    name: str
    # Circle: center_lat, center_lon, radius_km
    center_lat: Optional[float] = None
    center_lon: Optional[float] = None
    radius_km: Optional[float] = None
    # Polygon: list of [lat, lon] pairs
    polygon: Optional[list[list[float]]] = None

    @property
    def is_circle(self) -> bool:
        return self.radius_km is not None and self.center_lat is not None

    @property
    def is_polygon(self) -> bool:
        return self.polygon is not None and len(self.polygon) >= 3


@dataclass
class GeofenceWatch:
    """Watch for entities entering/exiting/dwelling in a region."""
    id: str
    region_id: str
    entity_type: str        # "flight", "seismic", "satellite", etc.
    trigger: GeofenceTrigger
    severity: Severity = Severity.WARNING
    title_template: str = "Geofence {trigger}: {entity}"
    message_template: str = "{entity} {trigger} region {region}"
    dwell_seconds: float = 300.0  # For DWELL trigger — how long before alert
    enabled: bool = True


@dataclass
class ThresholdRule:
    """Configurable threshold alert rule."""
    id: str
    name: str
    layer: str              # "seismic", "flights", "satellites", etc.
    field: str              # JSON path in entity data: "magnitude", "altitude", etc.
    operator: str           # ">=", "<=", ">", "<", "==", "!="
    value: float
    severity: Severity
    title_template: str
    message_template: str
    cooldown_seconds: float = 300.0  # Minimum time between alerts for same rule
    enabled: bool = True
    region_id: Optional[str] = None  # Optional: only evaluate within a geofence


# ─── Geo Math ────────────────────────────────────────────────

def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Great-circle distance between two points in km."""
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
         math.sin(dlon / 2) ** 2)
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def point_in_polygon(lat: float, lon: float, polygon: list[list[float]]) -> bool:
    """Ray casting algorithm for point-in-polygon test.
    polygon = list of [lat, lon] pairs forming a closed boundary."""
    n = len(polygon)
    inside = False
    j = n - 1
    for i in range(n):
        yi, xi = polygon[i][0], polygon[i][1]
        yj, xj = polygon[j][0], polygon[j][1]
        if ((yi > lat) != (yj > lat)) and (lon < (xj - xi) * (lat - yi) / (yj - yi) + xi):
            inside = not inside
        j = i
    return inside


def point_in_region(lat: float, lon: float, region: GeofenceRegion) -> bool:
    """Test if a point is inside a geofence region."""
    if region.is_circle:
        dist = haversine_km(lat, lon, region.center_lat, region.center_lon)
        return dist <= region.radius_km
    elif region.is_polygon:
        return point_in_polygon(lat, lon, region.polygon)
    return False


# ─── Alerting Engine ─────────────────────────────────────────

class AlertEngine:
    """
    The GDI nervous system. Evaluates incoming data against rules,
    fires alerts, distributes via WebSocket + Discord.

    Singleton pattern — one engine per server instance.
    """

    _instance: Optional["AlertEngine"] = None

    @classmethod
    def get_instance(cls) -> "AlertEngine":
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def __init__(self):
        # Alert storage
        self._alerts: list[Alert] = []
        self._max_history = 1000

        # Geofencing
        self._regions: dict[str, GeofenceRegion] = {}
        self._watches: dict[str, GeofenceWatch] = {}
        self._entity_presence: dict[str, dict[str, float]] = {}  # entity_key → {region_id → first_seen_ts}

        # Thresholds
        self._threshold_rules: dict[str, ThresholdRule] = {}
        self._threshold_last_fired: dict[str, float] = {}  # rule_id → last fire timestamp

        # Distribution
        self._ws_broadcast: Optional[Callable] = None
        self._discord_webhook_url: Optional[str] = None

        # Deduplication: hash → timestamp (prevent storm of identical alerts)
        self._dedup_cache: dict[str, float] = {}
        self._dedup_ttl = 60.0  # Seconds to suppress duplicate alerts

        # Lock for thread safety
        self._lock = asyncio.Lock()

        log.info("AlertEngine initialized")

    # ─── Configuration ───────────────────────────────────────

    def set_ws_broadcast(self, broadcast_fn: Callable):
        """Set the WebSocket broadcast function (from ConnectionManager)."""
        self._ws_broadcast = broadcast_fn

    def set_discord_webhook(self, url: str):
        """Set Discord webhook URL for alert distribution."""
        self._discord_webhook_url = url

    # ─── Region Management ───────────────────────────────────

    def add_region(self, region: GeofenceRegion) -> GeofenceRegion:
        """Register a geofence region."""
        self._regions[region.id] = region
        log.info(f"Region added: {region.name} ({region.id})")
        return region

    def remove_region(self, region_id: str) -> bool:
        if region_id in self._regions:
            del self._regions[region_id]
            # Remove associated watches
            to_remove = [w_id for w_id, w in self._watches.items() if w.region_id == region_id]
            for w_id in to_remove:
                del self._watches[w_id]
            log.info(f"Region removed: {region_id} (+ {len(to_remove)} watches)")
            return True
        return False

    def get_regions(self) -> list[dict]:
        return [asdict(r) for r in self._regions.values()]

    # ─── Watch Management ────────────────────────────────────

    def add_watch(self, watch: GeofenceWatch) -> GeofenceWatch:
        """Register a geofence watch."""
        if watch.region_id not in self._regions:
            raise ValueError(f"Region {watch.region_id} not found")
        self._watches[watch.id] = watch
        log.info(f"Watch added: {watch.id} (region={watch.region_id}, trigger={watch.trigger.value})")
        return watch

    def remove_watch(self, watch_id: str) -> bool:
        if watch_id in self._watches:
            del self._watches[watch_id]
            return True
        return False

    # ─── Threshold Rule Management ───────────────────────────

    def add_threshold_rule(self, rule: ThresholdRule) -> ThresholdRule:
        """Register a threshold rule."""
        self._threshold_rules[rule.id] = rule
        log.info(f"Threshold rule added: {rule.name} ({rule.id})")
        return rule

    def remove_threshold_rule(self, rule_id: str) -> bool:
        if rule_id in self._threshold_rules:
            del self._threshold_rules[rule_id]
            self._threshold_last_fired.pop(rule_id, None)
            return True
        return False

    def get_rules(self) -> list[dict]:
        """Get all threshold rules as dicts."""
        result = []
        for r in self._threshold_rules.values():
            d = asdict(r)
            d["severity"] = r.severity.value
            result.append(d)
        return result

    # ─── Alert Management ────────────────────────────────────

    def get_alerts(
        self,
        severity: Optional[str] = None,
        alert_type: Optional[str] = None,
        layer: Optional[str] = None,
        acknowledged: Optional[bool] = None,
        since: Optional[float] = None,
        limit: int = 100
    ) -> list[dict]:
        """Query alert history with optional filters."""
        results = []
        for a in reversed(self._alerts):
            if severity and a.severity.value != severity.upper():
                continue
            if alert_type and a.type.value != alert_type.upper():
                continue
            if layer and a.layer != layer:
                continue
            if acknowledged is not None and a.acknowledged != acknowledged:
                continue
            if since and a.timestamp < since:
                continue
            results.append(a.to_dict())
            if len(results) >= limit:
                break
        return results

    def get_alert_by_id(self, alert_id: str) -> Optional[Alert]:
        for a in self._alerts:
            if a.id == alert_id:
                return a
        return None

    def acknowledge_alert(self, alert_id: str, user: str = "system") -> Optional[dict]:
        """Acknowledge an alert."""
        alert = self.get_alert_by_id(alert_id)
        if alert is None:
            return None
        alert.acknowledged = True
        alert.acknowledged_by = user
        alert.acknowledged_at = time.time()
        log.info(f"Alert acknowledged: {alert_id} by {user}")
        return alert.to_dict()

    @property
    def unacknowledged_count(self) -> int:
        return sum(1 for a in self._alerts if not a.acknowledged)

    @property
    def counts_by_severity(self) -> dict:
        counts = {s.value: 0 for s in Severity}
        for a in self._alerts:
            if not a.acknowledged:
                counts[a.severity.value] += 1
        return counts

    # ─── Core: Fire Alert ────────────────────────────────────

    async def fire(
        self,
        alert_type: AlertType,
        severity: Severity,
        title: str,
        message: str,
        layer: str,
        entity_data: dict = None,
        lat: float = None,
        lon: float = None,
        rule_id: str = None,
    ) -> Optional[Alert]:
        """Fire an alert — stores, broadcasts via WS, sends to Discord."""

        # Deduplication check
        dedup_key = f"{alert_type.value}:{severity.value}:{title}:{layer}"
        now = time.time()
        if dedup_key in self._dedup_cache:
            if now - self._dedup_cache[dedup_key] < self._dedup_ttl:
                return None  # Suppress duplicate
        self._dedup_cache[dedup_key] = now

        # Clean old dedup entries
        expired = [k for k, t in self._dedup_cache.items() if now - t > self._dedup_ttl * 2]
        for k in expired:
            del self._dedup_cache[k]

        alert = Alert(
            id=str(uuid.uuid4())[:12],
            type=alert_type,
            severity=severity,
            title=title,
            message=message,
            layer=layer,
            entity_data=entity_data or {},
            lat=lat,
            lon=lon,
            timestamp=now,
            rule_id=rule_id,
        )

        async with self._lock:
            self._alerts.append(alert)
            # Trim history
            if len(self._alerts) > self._max_history:
                self._alerts = self._alerts[-self._max_history:]

        log.warning(f"ALERT [{alert.severity.value}] {alert.title}: {alert.message}")

        # Distribute
        await self._distribute(alert)

        return alert

    async def _distribute(self, alert: Alert):
        """Push alert to all distribution channels."""
        alert_dict = alert.to_dict()

        # WebSocket broadcast
        if self._ws_broadcast:
            try:
                await self._ws_broadcast({
                    "type": "alert",
                    "alert": alert_dict,
                })
            except Exception as e:
                log.error(f"WS broadcast failed: {e}")

        # Discord webhook
        if self._discord_webhook_url:
            asyncio.create_task(self._send_discord_alert(alert))

    async def _send_discord_alert(self, alert: Alert):
        """Send alert to Discord via webhook."""
        import aiohttp

        color_map = {
            Severity.INFO: 0x3498db,       # Blue
            Severity.WARNING: 0xf39c12,    # Amber
            Severity.CRITICAL: 0xff0040,   # Red
            Severity.EMERGENCY: 0xff0040,  # Red (pulsing handled by Discord)
        }

        icon_map = {
            Severity.INFO: "ℹ️",
            Severity.WARNING: "⚠️",
            Severity.CRITICAL: "🔴",
            Severity.EMERGENCY: "🚨",
        }

        embed = {
            "title": f"{icon_map.get(alert.severity, '📋')} {alert.title}",
            "description": alert.message,
            "color": color_map.get(alert.severity, 0x808080),
            "fields": [
                {"name": "Type", "value": alert.type.value, "inline": True},
                {"name": "Severity", "value": alert.severity.value, "inline": True},
                {"name": "Layer", "value": alert.layer, "inline": True},
            ],
            "timestamp": datetime.fromtimestamp(alert.timestamp, tz=timezone.utc).isoformat(),
            "footer": {"text": f"GDI Alert Engine • {alert.id}"},
        }

        if alert.lat is not None and alert.lon is not None:
            embed["fields"].append({
                "name": "Location",
                "value": f"`{alert.lat:.4f}, {alert.lon:.4f}`",
                "inline": True,
            })

        payload = {"embeds": [embed]}

        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    self._discord_webhook_url,
                    json=payload,
                    timeout=aiohttp.ClientTimeout(total=10),
                ) as resp:
                    if resp.status not in (200, 204):
                        log.error(f"Discord webhook failed: {resp.status}")
        except Exception as e:
            log.error(f"Discord webhook error: {e}")

    # ─── Evaluation: Geofences ───────────────────────────────

    async def evaluate_geofences(self, entities: list[dict], entity_type: str, layer: str):
        """
        Check a batch of entities against all registered geofence watches.
        
        entities: list of dicts with at least 'lat', 'lon', and some identifier.
        entity_type: "flight", "seismic", etc.
        layer: the data layer name.
        """
        now = time.time()
        relevant_watches = [
            w for w in self._watches.values()
            if w.enabled and w.entity_type == entity_type
        ]

        if not relevant_watches:
            return

        for entity in entities:
            elat = entity.get("lat")
            elon = entity.get("lon")
            if elat is None or elon is None:
                continue

            entity_key = entity.get("id") or entity.get("callsign") or entity.get("icao24") or f"{elat},{elon}"
            entity_label = entity.get("callsign") or entity.get("place") or entity.get("name") or entity_key

            for watch in relevant_watches:
                region = self._regions.get(watch.region_id)
                if not region:
                    continue

                inside = point_in_region(elat, elon, region)

                # Track presence for ENTER/EXIT/DWELL detection
                presence_key = f"{entity_key}:{watch.region_id}"
                was_inside = presence_key in self._entity_presence

                if inside and not was_inside:
                    # Just entered
                    self._entity_presence[presence_key] = {watch.region_id: now}

                    if watch.trigger == GeofenceTrigger.ENTER:
                        await self.fire(
                            alert_type=AlertType.GEOFENCE,
                            severity=watch.severity,
                            title=watch.title_template.format(
                                trigger="ENTERED", entity=entity_label, region=region.name),
                            message=watch.message_template.format(
                                trigger="entered", entity=entity_label, region=region.name),
                            layer=layer,
                            entity_data=entity,
                            lat=elat, lon=elon,
                            rule_id=watch.id,
                        )

                elif not inside and was_inside:
                    # Just exited
                    del self._entity_presence[presence_key]

                    if watch.trigger == GeofenceTrigger.EXIT:
                        await self.fire(
                            alert_type=AlertType.GEOFENCE,
                            severity=watch.severity,
                            title=watch.title_template.format(
                                trigger="EXITED", entity=entity_label, region=region.name),
                            message=watch.message_template.format(
                                trigger="exited", entity=entity_label, region=region.name),
                            layer=layer,
                            entity_data=entity,
                            lat=elat, lon=elon,
                            rule_id=watch.id,
                        )

                elif inside and was_inside and watch.trigger == GeofenceTrigger.DWELL:
                    # Check dwell duration
                    entry = self._entity_presence[presence_key]
                    first_seen = entry.get(watch.region_id, now)
                    dwell_time = now - first_seen
                    if dwell_time >= watch.dwell_seconds:
                        # Fire dwell alert (reset timer to avoid repeated alerts)
                        self._entity_presence[presence_key][watch.region_id] = now
                        await self.fire(
                            alert_type=AlertType.GEOFENCE,
                            severity=watch.severity,
                            title=watch.title_template.format(
                                trigger=f"DWELLING ({int(dwell_time)}s)", entity=entity_label, region=region.name),
                            message=watch.message_template.format(
                                trigger=f"dwelling for {int(dwell_time)}s in", entity=entity_label, region=region.name),
                            layer=layer,
                            entity_data=entity,
                            lat=elat, lon=elon,
                            rule_id=watch.id,
                        )

        # Purge stale presence entries (entities not seen for 10 minutes)
        stale_threshold = now - 600
        stale_keys = []
        for pk, entry in self._entity_presence.items():
            for rid, ts in entry.items():
                if ts < stale_threshold:
                    stale_keys.append(pk)
                    break
        for k in stale_keys:
            del self._entity_presence[k]

    # ─── Evaluation: Thresholds ──────────────────────────────

    async def evaluate_thresholds(self, entities: list[dict], layer: str):
        """
        Evaluate threshold rules against a batch of entities.
        
        entities: list of dicts — each is a data point from a layer.
        layer: which data layer these came from.
        """
        now = time.time()
        relevant_rules = [
            r for r in self._threshold_rules.values()
            if r.enabled and r.layer == layer
        ]

        if not relevant_rules:
            return

        for entity in entities:
            elat = entity.get("lat")
            elon = entity.get("lon")

            for rule in relevant_rules:
                # Check region constraint
                if rule.region_id:
                    region = self._regions.get(rule.region_id)
                    if region and elat is not None and elon is not None:
                        if not point_in_region(elat, elon, region):
                            continue

                # Extract field value (supports dot notation: "properties.mag")
                val = self._extract_field(entity, rule.field)
                if val is None:
                    continue

                # Evaluate operator
                triggered = False
                try:
                    fval = float(val)
                    fthresh = float(rule.value)
                    if rule.operator == ">=" and fval >= fthresh:
                        triggered = True
                    elif rule.operator == "<=" and fval <= fthresh:
                        triggered = True
                    elif rule.operator == ">" and fval > fthresh:
                        triggered = True
                    elif rule.operator == "<" and fval < fthresh:
                        triggered = True
                    elif rule.operator == "==" and fval == fthresh:
                        triggered = True
                    elif rule.operator == "!=" and fval != fthresh:
                        triggered = True
                except (ValueError, TypeError):
                    continue

                if not triggered:
                    continue

                # Cooldown check
                last = self._threshold_last_fired.get(rule.id, 0)
                if now - last < rule.cooldown_seconds:
                    continue

                self._threshold_last_fired[rule.id] = now

                entity_label = (
                    entity.get("callsign") or entity.get("place") or
                    entity.get("name") or entity.get("id") or str(entity)[:60]
                )

                await self.fire(
                    alert_type=AlertType.THRESHOLD,
                    severity=rule.severity,
                    title=rule.title_template.format(
                        value=val, entity=entity_label, field=rule.field),
                    message=rule.message_template.format(
                        value=val, entity=entity_label, field=rule.field,
                        operator=rule.operator, threshold=rule.value),
                    layer=layer,
                    entity_data=entity,
                    lat=elat, lon=elon,
                    rule_id=rule.id,
                )

    @staticmethod
    def _extract_field(data: dict, field_path: str) -> Any:
        """Extract a value from nested dict using dot notation."""
        parts = field_path.split(".")
        current = data
        for part in parts:
            if isinstance(current, dict):
                current = current.get(part)
            else:
                return None
            if current is None:
                return None
        return current

    # ─── Evaluation: Anomaly (Seismic Swarm Detection) ───────

    async def evaluate_seismic_swarm(self, events: list[dict], radius_km: float = 100.0, window_seconds: float = 3600.0, min_count: int = 3):
        """
        Detect seismic swarms: multiple events within radius_km in the last window_seconds.
        """
        now = time.time()
        recent = []
        for e in events:
            etime = e.get("time")
            if etime is None:
                continue
            # USGS time is in milliseconds
            if etime > 1e12:
                etime = etime / 1000.0
            if now - etime <= window_seconds:
                lat = e.get("lat")
                lon = e.get("lon")
                if lat is not None and lon is not None:
                    recent.append({"lat": lat, "lon": lon, "time": etime, "data": e})

        if len(recent) < min_count:
            return

        # Cluster by proximity — simple: for each event, count neighbors
        clusters_fired = set()
        for i, ev in enumerate(recent):
            neighbors = []
            for j, other in enumerate(recent):
                if i == j:
                    continue
                dist = haversine_km(ev["lat"], ev["lon"], other["lat"], other["lon"])
                if dist <= radius_km:
                    neighbors.append(other)

            if len(neighbors) >= min_count - 1:
                cluster_key = f"swarm:{round(ev['lat'], 1)}:{round(ev['lon'], 1)}"
                if cluster_key not in clusters_fired:
                    clusters_fired.add(cluster_key)
                    place = ev["data"].get("place") or f"{ev['lat']:.2f}, {ev['lon']:.2f}"
                    await self.fire(
                        alert_type=AlertType.ANOMALY,
                        severity=Severity.WARNING,
                        title=f"Seismic Swarm Detected: {place}",
                        message=f"{len(neighbors) + 1} seismic events within {radius_km}km in the last {int(window_seconds / 60)} minutes near {place}",
                        layer="seismic",
                        entity_data={"cluster_size": len(neighbors) + 1, "center": {"lat": ev["lat"], "lon": ev["lon"]}},
                        lat=ev["lat"],
                        lon=ev["lon"],
                    )

    # ─── Bulk Evaluation Entrypoint ──────────────────────────

    async def evaluate_flight_data(self, states: list):
        """Evaluate flight data (OpenSky format) against all rules."""
        if not states:
            return

        entities = []
        for s in states:
            if not s or len(s) < 12:
                continue
            entities.append({
                "icao24": s[0],
                "callsign": (s[1] or "").strip(),
                "origin_country": s[2],
                "lon": s[5],
                "lat": s[6],
                "altitude": s[7] or s[13],  # baro alt or geo alt
                "on_ground": s[8],
                "velocity": s[9],
                "heading": s[10],
                "vertical_rate": s[11],
                "category": s[17] if len(s) > 17 else None,
            })

        await self.evaluate_geofences(entities, "flight", "flights")
        await self.evaluate_thresholds(entities, "flights")

    async def evaluate_seismic_data(self, geojson: dict):
        """Evaluate seismic GeoJSON from USGS against all rules."""
        features = geojson.get("features", [])
        if not features:
            return

        entities = []
        for f in features:
            props = f.get("properties", {})
            coords = f.get("geometry", {}).get("coordinates", [])
            if len(coords) < 2:
                continue
            entities.append({
                "id": f.get("id"),
                "magnitude": props.get("mag"),
                "place": props.get("place"),
                "time": props.get("time"),
                "depth_km": coords[2] if len(coords) > 2 else None,
                "lon": coords[0],
                "lat": coords[1],
                "type": props.get("type"),
                "tsunami": props.get("tsunami"),
                "sig": props.get("sig"),
            })

        await self.evaluate_geofences(entities, "seismic", "seismic")
        await self.evaluate_thresholds(entities, "seismic")
        await self.evaluate_seismic_swarm(entities)

    async def evaluate_satellite_data(self, satellites: list[dict]):
        """Evaluate satellite data against rules."""
        if not satellites:
            return
        await self.evaluate_geofences(satellites, "satellite", "satellites")
        await self.evaluate_thresholds(satellites, "satellites")

    # ─── Stats ───────────────────────────────────────────────

    def get_stats(self) -> dict:
        return {
            "total_alerts": len(self._alerts),
            "unacknowledged": self.unacknowledged_count,
            "by_severity": self.counts_by_severity,
            "regions": len(self._regions),
            "watches": len(self._watches),
            "threshold_rules": len(self._threshold_rules),
            "active_presences": len(self._entity_presence),
        }


# ─── Module-level singleton ─────────────────────────────────

alert_engine = AlertEngine.get_instance()
