"""
GDI Backend — Global Defense Intelligence API Gateway
Valkyrie L5 Backend: FastAPI + JWT Auth + WebSocket + Data Services

Classification: CONFIDENTIAL — Artifact Virtual Internal
"""
import os
import json
import time
import asyncio
import secrets
import hashlib
from pathlib import Path
from datetime import datetime, timedelta, timezone
from typing import Optional
from contextlib import asynccontextmanager

# Load .env from project root (one level up from backend/)
from dotenv import load_dotenv
load_dotenv(Path(__file__).resolve().parent.parent / ".env")

import aiohttp
import redis.asyncio as aioredis
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Depends, status, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from jose import jwt, JWTError
from pydantic import BaseModel

def _hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    h = hashlib.pbkdf2_hmac('sha256', password.encode(), salt.encode(), 100000)
    return f"{salt}${h.hex()}"

def _verify_password(password: str, stored: str) -> bool:
    try:
        salt, hash_hex = stored.split("$", 1)
        h = hashlib.pbkdf2_hmac('sha256', password.encode(), salt.encode(), 100000)
        return secrets.compare_digest(h.hex(), hash_hex)
    except:
        return False

# ─── Configuration ───────────────────────────────────────────
JWT_SECRET = os.environ.get("GDI_JWT_SECRET", secrets.token_hex(32))
JWT_ALGORITHM = "HS256"
JWT_EXPIRY_HOURS = 24
GDI_PORT = int(os.environ.get("GDI_PORT", 8600))
REDIS_URL = os.environ.get("REDIS_URL", "redis://localhost:6379")
OPENSKY_BASE = "https://opensky-network.org/api"
USGS_BASE = "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary"
CELESTRAK_BASE = "https://celestrak.org/NORAD/elements/gp.php"

# Multi-source flight aggregator
from flights import flight_aggregator

# VALKYRIE AI Engine
from ai import valkyrie

# Alerting Engine
from alerting import alert_engine, AlertType, Severity, GeofenceRegion, GeofenceWatch, ThresholdRule
from alert_rules import load_default_rules

# ─── Sovereign Intelligence Modules (Overhaul Sprint 0) ─────
from hektor_api import router as hektor_router
from intel_api import router as intel_router
from correlation import router as correlation_router, correlation_engine
from rbac import Role, role_from_string, get_permissions, has_permission, USERS_SCHEMA
from geospatial import spatial_index
from ingest_pipeline import (
    ingest_flights, ingest_seismic, ingest_satellites,
    register_callbacks, get_stats as get_ingest_stats,
)

# ─── OMNISCIENT Workers (Overhaul v2.0) ─────────────────────
from workers.spacetrack_worker import spacetrack
from workers.gdelt_worker import gdelt
from workers.enviro_worker import enviro

# Data cache directory
CACHE_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "cache")
os.makedirs(CACHE_DIR, exist_ok=True)

# ─── In-memory user store (swap to PostgreSQL when ready) ────
USERS_FILE = os.path.join(os.path.dirname(__file__), ".users.json")

def _load_users():
    if os.path.exists(USERS_FILE):
        with open(USERS_FILE) as f:
            return json.load(f)
    # Default admin user
    default = {
        "admin": {
            "password_hash": _hash_password("valkyrie"),
            "role": "admin",
            "created": datetime.now(timezone.utc).isoformat()
        }
    }
    with open(USERS_FILE, "w") as f:
        json.dump(default, f, indent=2)
    os.chmod(USERS_FILE, 0o600)
    return default

def _save_users(users):
    with open(USERS_FILE, "w") as f:
        json.dump(users, f, indent=2)
    os.chmod(USERS_FILE, 0o600)

USERS = _load_users()

# ─── Audit Log ───────────────────────────────────────────────
AUDIT_FILE = os.path.join(os.path.dirname(__file__), ".audit.jsonl")

def audit_log(action: str, user: str = "system", details: dict = None):
    entry = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "action": action,
        "user": user,
        "details": details or {}
    }
    with open(AUDIT_FILE, "a") as f:
        f.write(json.dumps(entry) + "\n")

# ─── Auth Models ─────────────────────────────────────────────
class LoginRequest(BaseModel):
    username: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int = JWT_EXPIRY_HOURS * 3600
    role: str

class UserCreate(BaseModel):
    username: str
    password: str
    role: str = "analyst"  # analyst, commander, admin, viewer

# ─── JWT Helpers ─────────────────────────────────────────────
def create_token(username: str, role: str) -> str:
    payload = {
        "sub": username,
        "role": role,
        "iat": datetime.now(timezone.utc),
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRY_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

security = HTTPBearer()

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        username = payload.get("sub")
        role = payload.get("role")
        if username is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        return {"username": username, "role": role}
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

def require_role(*roles):
    async def checker(user=Depends(get_current_user)):
        if user["role"] not in roles:
            raise HTTPException(status_code=403, detail=f"Requires role: {', '.join(roles)}")
        return user
    return checker

# ─── WebSocket Manager ───────────────────────────────────────
class ConnectionManager:
    def __init__(self):
        self.active: list[WebSocket] = []
        self._lock = asyncio.Lock()

    async def connect(self, ws: WebSocket):
        await ws.accept()
        async with self._lock:
            self.active.append(ws)
        audit_log("ws_connect", details={"client": str(ws.client)})

    async def disconnect(self, ws: WebSocket):
        async with self._lock:
            if ws in self.active:
                self.active.remove(ws)
        audit_log("ws_disconnect", details={"client": str(ws.client)})

    async def broadcast(self, message: dict):
        dead = []
        async with self._lock:
            connections = list(self.active)
        for ws in connections:
            try:
                await ws.send_json(message)
            except:
                dead.append(ws)
        for ws in dead:
            await self.disconnect(ws)

    @property
    def count(self):
        return len(self.active)

ws_manager = ConnectionManager()

# ─── Data Services ───────────────────────────────────────────
class DataService:
    """Fetches, caches, and serves intelligence data"""

    def __init__(self):
        self.session: Optional[aiohttp.ClientSession] = None
        self.redis: Optional[aioredis.Redis] = None
        self._tle_cache = {}
        self._flight_cache = {}
        self._seismic_cache = {}

    async def start(self):
        connector = aiohttp.TCPConnector(
            ttl_dns_cache=300,
            limit=20,
            force_close=False
        )
        self.session = aiohttp.ClientSession(
            timeout=aiohttp.ClientTimeout(total=45, connect=15),
            connector=connector
        )
        try:
            self.redis = aioredis.from_url(REDIS_URL, decode_responses=True)
            await self.redis.ping()
        except:
            self.redis = None  # Degrade gracefully

    async def stop(self):
        if self.session:
            await self.session.close()
        if self.redis:
            await self.redis.close()

    async def _cached_fetch(self, url: str, cache_key: str, ttl: int = 60) -> dict:
        """Fetch with Redis cache + local file fallback"""
        # Try Redis
        if self.redis:
            try:
                cached = await self.redis.get(f"gdi:{cache_key}")
                if cached:
                    return json.loads(cached)
            except:
                pass

        # Fetch from source
        try:
            async with self.session.get(url) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    # Cache in Redis
                    if self.redis:
                        try:
                            await self.redis.set(f"gdi:{cache_key}", json.dumps(data), ex=ttl)
                        except:
                            pass
                    # Cache to file (offline fallback)
                    cache_file = os.path.join(CACHE_DIR, f"{cache_key}.json")
                    with open(cache_file, "w") as f:
                        json.dump({"data": data, "cached_at": time.time()}, f)
                    return data
                else:
                    audit_log("fetch_error", details={"url": url, "status": resp.status})
        except Exception as e:
            audit_log("fetch_exception", details={"url": url, "error": str(e)})

        # Fallback to file cache
        cache_file = os.path.join(CACHE_DIR, f"{cache_key}.json")
        if os.path.exists(cache_file):
            with open(cache_file) as f:
                cached = json.load(f)
                return cached.get("data", cached)

        return None

    async def get_flights(self, bounds: dict = None) -> dict:
        """Fetch live ADS-B data from OpenSky"""
        url = f"{OPENSKY_BASE}/states/all"
        if bounds:
            url += f"?lamin={bounds['south']}&lomin={bounds['west']}&lamax={bounds['north']}&lomax={bounds['east']}"
        data = await self._cached_fetch(url, "flights", ttl=10)
        if data and "states" in data:
            self._flight_cache = data
            # Feed into sovereign intelligence pipeline
            try:
                await ingest_flights(data)
            except Exception as e:
                pass  # Degrade gracefully — don't break data flow
            # Broadcast to WebSocket clients
            await ws_manager.broadcast({
                "type": "flights",
                "count": len(data["states"]),
                "time": data.get("time", int(time.time()))
            })
        return data

    async def get_seismic(self, period: str = "all_day") -> dict:
        """Fetch seismic data from USGS"""
        url = f"{USGS_BASE}/{period}.geojson"
        data = await self._cached_fetch(url, f"seismic_{period}", ttl=60)
        if data and "features" in data:
            self._seismic_cache = data
            # Feed into sovereign intelligence pipeline
            try:
                await ingest_seismic(data)
            except Exception as e:
                pass  # Degrade gracefully
            # Check for significant events
            significant = [f for f in data["features"] if f["properties"]["mag"] and f["properties"]["mag"] >= 5.0]
            if significant:
                await ws_manager.broadcast({
                    "type": "alert",
                    "severity": "high",
                    "message": f"{len(significant)} significant seismic events (M5.0+)",
                    "events": [{"mag": f["properties"]["mag"], "place": f["properties"]["place"]} for f in significant[:5]]
                })
        return data

    async def get_tles(self, group: str = "stations") -> str:
        """Fetch TLE data from CelesTrak"""
        url = f"{CELESTRAK_BASE}?GROUP={group}&FORMAT=tle"
        cache_key = f"tle_{group}"

        # TLEs are text, not JSON
        if self.redis:
            try:
                cached = await self.redis.get(f"gdi:{cache_key}")
                if cached:
                    return cached
            except:
                pass

        try:
            async with self.session.get(url) as resp:
                if resp.status == 200:
                    text = await resp.text()
                    if self.redis:
                        try:
                            await self.redis.set(f"gdi:{cache_key}", text, ex=3600)
                        except:
                            pass
                    # File cache
                    cache_file = os.path.join(CACHE_DIR, f"{cache_key}.txt")
                    with open(cache_file, "w") as f:
                        f.write(text)
                    return text
        except:
            pass

        # File fallback
        cache_file = os.path.join(CACHE_DIR, f"{cache_key}.txt")
        if os.path.exists(cache_file):
            with open(cache_file) as f:
                return f.read()

        return ""

data_service = DataService()

# ─── Lifespan ────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    global _intel_consumer_task
    await data_service.start()
    await flight_aggregator.start()
    await valkyrie.start()

    # ── Alert Engine ────────────────────────────────────────
    alert_engine.set_ws_broadcast(ws_manager.broadcast)
    _discord_alert_wh = os.environ.get("GDI_DISCORD_ALERT_WEBHOOK")
    if _discord_alert_wh:
        alert_engine.set_discord_webhook(_discord_alert_wh)
    load_default_rules()
    audit_log("alert_engine_start", details=alert_engine.get_stats())

    # ── Correlation Engine ──────────────────────────────────
    correlation_engine.set_broadcast_callback(ws_manager.broadcast)
    await correlation_engine.start()
    audit_log("correlation_engine_start")

    _intel_consumer_task = asyncio.create_task(_start_intel_consumer())

    # ── OMNISCIENT Workers (v2.0) ───────────────────────────
    _spacetrack_task = asyncio.create_task(spacetrack.start_background(interval=1800))
    _gdelt_task = asyncio.create_task(gdelt.start_background(interval=900))
    _enviro_task = asyncio.create_task(enviro.start_background())
    audit_log("omniscient_workers_start", details={"workers": ["spacetrack", "gdelt", "enviro"]})

    # Wire ingest pipeline → spatial index (entities from data refreshes flow here)
    register_callbacks(
        on_alert_check=_check_alerts_callback,
    )
    audit_log("server_start", details={"port": GDI_PORT, "modules": ["hektor", "intel", "rbac", "geospatial", "alerting", "correlation"]})
    yield
    if _intel_consumer_task:
        _intel_consumer_task.cancel()
    spacetrack.stop()
    gdelt.stop()
    enviro.stop()
    await correlation_engine.stop()
    await valkyrie.stop()
    await flight_aggregator.stop()
    await data_service.stop()
    audit_log("server_stop")


async def _check_alerts_callback(entities):
    """Callback from ingest pipeline — check geofences and broadcast alerts."""
    from intel_api import check_geofences
    alerts = check_geofences(entities)
    for alert in alerts:
        await ws_manager.broadcast({
            "type": "alert",
            "severity": alert.get("severity", "warning"),
            "source": "geofence",
            "geofence": alert.get("geofence_name"),
            "entity": alert.get("entity_id"),
            "layer": alert.get("entity_layer"),
            "lat": alert.get("lat"),
            "lon": alert.get("lon"),
            "timestamp": int(time.time()),
            "metadata": alert.get("metadata", {}),
        })

# ─── App ─────────────────────────────────────────────────────
app = FastAPI(
    title="GDI — Global Defense Intelligence",
    description="Valkyrie L5 API Gateway",
    version="0.1.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Lock down in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Mount Sovereign Intelligence Routers ────────────────────
app.include_router(hektor_router)
app.include_router(intel_router)
app.include_router(correlation_router)

# ─── Auth Routes ─────────────────────────────────────────────
@app.post("/api/auth/login", response_model=TokenResponse)
async def login(req: LoginRequest):
    user = USERS.get(req.username)
    if not user or not _verify_password(req.password, user["password_hash"]):
        audit_log("login_failed", user=req.username)
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_token(req.username, user["role"])
    audit_log("login_success", user=req.username)
    return TokenResponse(access_token=token, role=user["role"])

@app.post("/api/auth/users", dependencies=[Depends(require_role("admin"))])
async def create_user(req: UserCreate, user=Depends(get_current_user)):
    if req.username in USERS:
        raise HTTPException(status_code=409, detail="User exists")
    if req.role not in ("analyst", "commander", "admin", "viewer"):
        raise HTTPException(status_code=400, detail="Invalid role")
    USERS[req.username] = {
        "password_hash": _hash_password(req.password),
        "role": req.role,
        "created": datetime.now(timezone.utc).isoformat()
    }
    _save_users(USERS)
    audit_log("user_created", user=user["username"], details={"new_user": req.username, "role": req.role})
    return {"status": "created", "username": req.username, "role": req.role}

@app.get("/api/auth/me")
async def get_me(user=Depends(get_current_user)):
    return user

# ─── Intelligence Data Routes ────────────────────────────────
@app.get("/api/flights")
async def get_flights(
    south: Optional[float] = None,
    west: Optional[float] = None,
    north: Optional[float] = None,
    east: Optional[float] = None,
    format: str = Query("opensky", pattern="^(opensky|native)$"),
    user=Depends(get_current_user)
):
    bounds = None
    if all(v is not None for v in [south, west, north, east]):
        bounds = {"south": south, "west": west, "north": north, "east": east}
    
    await flight_aggregator.fetch_all(bounds)
    
    if format == "native":
        # Rich format with all fields (type, registration, origin, destination)
        data = {"aircraft": flight_aggregator.get_aircraft_list(), "time": int(time.time())}
    else:
        # OpenSky-compatible format (backward compatible with existing frontend)
        data = flight_aggregator.get_opensky_format()
    
    if not data.get("states") and not data.get("aircraft"):
        raise HTTPException(status_code=503, detail="Flight data unavailable")
    
    audit_log("data_access", user=user["username"], details={"type": "flights", "format": format})
    return data

@app.get("/api/flights/status")
async def get_flight_status(user=Depends(get_current_user)):
    """Health and stats for all flight data sources"""
    return flight_aggregator.get_status()

@app.get("/api/seismic")
async def get_seismic(
    period: str = Query("all_day", pattern="^(all_hour|all_day|all_week|all_month)$"),
    user=Depends(get_current_user)
):
    data = await data_service.get_seismic(period)
    if data is None:
        raise HTTPException(status_code=503, detail="Seismic data unavailable")
    audit_log("data_access", user=user["username"], details={"type": "seismic", "period": period})
    return data

@app.get("/api/satellites/tle")
async def get_tle(
    group: str = Query("stations", pattern="^[a-zA-Z0-9_-]+$"),
    user=Depends(get_current_user)
):
    data = await data_service.get_tles(group)
    if not data:
        raise HTTPException(status_code=503, detail="TLE data unavailable")
    audit_log("data_access", user=user["username"], details={"type": "tle", "group": group})
    return {"group": group, "tle_data": data, "fetched_at": datetime.now(timezone.utc).isoformat()}

@app.get("/api/satellites/tle/groups")
async def get_tle_groups(user=Depends(get_current_user)):
    return {
        "groups": [
            {"id": "stations", "name": "Space Stations", "description": "ISS and other stations"},
            {"id": "gps-ops", "name": "GPS Operational", "description": "Active GPS satellites"},
            {"id": "glo-ops", "name": "GLONASS Operational", "description": "Active GLONASS"},
            {"id": "galileo", "name": "Galileo", "description": "EU navigation satellites"},
            {"id": "beidou", "name": "BeiDou", "description": "Chinese navigation satellites"},
            {"id": "starlink", "name": "Starlink", "description": "SpaceX Starlink constellation"},
            {"id": "active", "name": "Active Satellites", "description": "All active satellites"},
            {"id": "weather", "name": "Weather", "description": "Weather satellites"},
            {"id": "resource", "name": "Earth Resources", "description": "Earth observation"},
            {"id": "military", "name": "Military", "description": "Known military satellites"},
        ]
    }

# ─── OMNISCIENT: Space-Track Full Catalog (v2.0) ─────────────

@app.get("/api/satellites/catalog")
async def get_satellite_catalog(
    type: Optional[str] = Query(None, description="Filter by type (payload, starlink, gps, etc.)"),
    orbit: Optional[str] = Query(None, description="Filter by orbit (LEO, MEO, GEO, HEO)"),
    country: Optional[str] = Query(None, description="Filter by country code"),
    special_only: bool = Query(False, description="Only named/special satellites"),
    limit: int = Query(5000, ge=1, le=65000),
    user=Depends(get_current_user),
):
    """Full USSTRATCOM satellite catalog from Space-Track.org (65K+ objects)."""
    if not spacetrack.catalog:
        raise HTTPException(status_code=503, detail="Satellite catalog not yet loaded")

    if special_only:
        data = spacetrack.get_special()
    elif type:
        data = spacetrack.get_by_type(type, limit=limit)
    elif orbit:
        data = spacetrack.get_by_orbit(orbit, limit=limit)
    elif country:
        data = spacetrack.get_by_country(country, limit=limit)
    else:
        data = spacetrack.catalog[:limit]

    return {
        "count": len(data),
        "total_catalog": len(spacetrack.catalog),
        "objects": data,
        "stats": spacetrack.stats,
    }

@app.get("/api/satellites/catalog/search")
async def search_satellite_catalog(
    q: str = Query(..., min_length=1, description="Search by name or NORAD ID"),
    limit: int = Query(50, ge=1, le=500),
    user=Depends(get_current_user),
):
    """Search the satellite catalog."""
    results = spacetrack.search(q, limit=limit)
    return {"query": q, "count": len(results), "results": results}

@app.get("/api/satellites/catalog/summary")
async def get_catalog_summary(user=Depends(get_current_user)):
    """Catalog summary for HUD display."""
    return spacetrack.get_summary()

# ─── OMNISCIENT: GDELT Global Events (v2.0) ──────────────────

@app.get("/api/events/gdelt")
async def get_gdelt_events(
    conflicts_only: bool = Query(False),
    severity: Optional[str] = Query(None, description="critical, high, medium, low"),
    country: Optional[str] = Query(None, description="Country code"),
    hours: int = Query(6, ge=1, le=24),
    limit: int = Query(500, ge=1, le=5000),
    user=Depends(get_current_user),
):
    """GDELT global event data — 15-minute updates, conflicts, protests, diplomacy."""
    if conflicts_only:
        data = gdelt.get_conflicts(limit=limit)
    elif severity:
        data = gdelt.get_by_severity(severity, limit=limit)
    elif country:
        data = gdelt.get_by_country(country, limit=limit)
    else:
        data = gdelt.get_recent(hours=hours, limit=limit)

    return {"count": len(data), "events": data, "stats": gdelt.stats}

@app.get("/api/events/gdelt/summary")
async def get_gdelt_summary(user=Depends(get_current_user)):
    """GDELT summary for HUD."""
    return gdelt.get_summary()

# ─── OMNISCIENT: Environmental Intelligence (v2.0) ───────────

@app.get("/api/enviro/fires")
async def get_fire_hotspots(
    limit: int = Query(5000, ge=1, le=50000),
    user=Depends(get_current_user),
):
    """NASA FIRMS active fire/thermal anomalies."""
    hotspots = enviro.firms.hotspots[:limit]
    return {"count": len(hotspots), "hotspots": hotspots, "stats": enviro.firms.stats}

@app.get("/api/enviro/disasters")
async def get_disaster_alerts(user=Depends(get_current_user)):
    """GDACS multi-hazard disaster alerts."""
    return {"count": len(enviro.gdacs.events), "events": enviro.gdacs.events, "stats": enviro.gdacs.stats}

@app.get("/api/enviro/summary")
async def get_enviro_summary(user=Depends(get_current_user)):
    """Environmental intelligence summary."""
    return enviro.get_summary()

# ─── System Routes ───────────────────────────────────────────
@app.get("/api/status")
async def system_status():
    """Public health check — no auth required"""
    redis_ok = False
    if data_service.redis:
        try:
            await data_service.redis.ping()
            redis_ok = True
        except:
            pass

    return {
        "status": "operational",
        "version": "0.2.0",
        "codename": "Sovereign Eye",
        "layer": "L5-EYES",
        "uptime": int(time.time()),
        "services": {
            "redis": "connected" if redis_ok else "degraded",
            "websocket_clients": ws_manager.count,
            "hektor": "available",
            "spatial_index": spatial_index.count,
        },
        "mode": "SOVEREIGN" if redis_ok else "DEGRADED",
        "ingest": get_ingest_stats(),
    }

@app.get("/api/capabilities")
async def get_capabilities(rescan: bool = Query(False)):
    """System capability detection — what VALKYRIE can do right now"""
    from capabilities import get_capabilities as _get_caps
    profile = _get_caps(force_rescan=rescan, check_apis=rescan)
    return profile.to_dict()

@app.post("/api/capabilities/refresh")
async def refresh_capabilities():
    """Force full capability rescan including API reachability"""
    from capabilities import get_capabilities as _get_caps
    profile = _get_caps(force_rescan=True, check_apis=True)
    return profile.to_dict()

# ─── Intelligence Workers Integration ────────────────────────

_intel_consumer_task = None

async def _start_intel_consumer():
    """Start consuming the intel stream and broadcasting to WebSocket clients."""
    global _intel_consumer_task
    try:
        r = aioredis.from_url(REDIS_URL, decode_responses=True)
        await r.ping()
        last_id = "$"
        while True:
            try:
                results = await r.xread({"gdi:intel": last_id}, count=10, block=2000)
                if results:
                    for _, messages in results:
                        for msg_id, data in messages:
                            last_id = msg_id
                            # Parse JSON fields
                            for field in ("body", "tags"):
                                if field in data:
                                    try:
                                        data[field] = json.loads(data[field])
                                    except:
                                        pass
                            data["_id"] = msg_id
                            # Broadcast to all connected WebSocket clients
                            await ws_manager.broadcast({
                                "type": "intel",
                                "data": data
                            })
            except asyncio.CancelledError:
                break
            except Exception as e:
                await asyncio.sleep(2)
        await r.close()
    except Exception:
        pass  # Redis unavailable — degrade gracefully


@app.get("/api/intel/stream")
async def get_intel_stream(
    limit: int = Query(50, le=500),
    severity: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
):
    """Get recent intelligence items from the Redis stream."""
    try:
        r = aioredis.from_url(REDIS_URL, decode_responses=True)
        raw = await r.xrevrange("gdi:intel", count=limit)
        await r.close()

        items = []
        for msg_id, data in raw:
            for field in ("body", "tags"):
                if field in data:
                    try:
                        data[field] = json.loads(data[field])
                    except:
                        pass
            data["_id"] = msg_id
            # Apply filters
            if severity and data.get("severity") != severity:
                continue
            if category and data.get("category") != category:
                continue
            items.append(data)

        return {"items": items, "count": len(items)}
    except Exception as e:
        return {"items": [], "count": 0, "error": str(e)}


@app.get("/api/intel/workers")
async def get_worker_health():
    """Get health status of all intelligence workers."""
    try:
        r = aioredis.from_url(REDIS_URL, decode_responses=True)
        health = await r.hgetall("gdi:workers:health")
        await r.close()
        return {k: json.loads(v) for k, v in health.items()}
    except Exception as e:
        return {"error": str(e)}


@app.get("/api/audit", dependencies=[Depends(require_role("admin"))])
async def get_audit(limit: int = Query(100, le=1000)):
    """Get audit log entries"""
    if not os.path.exists(AUDIT_FILE):
        return {"entries": []}
    entries = []
    with open(AUDIT_FILE) as f:
        for line in f:
            if line.strip():
                entries.append(json.loads(line))
    return {"entries": entries[-limit:], "total": len(entries)}

# ─── Frontend Config (serves keys from .env to browser) ─────
@app.get("/api/config/frontend")
async def get_frontend_config():
    """Serve frontend-safe credentials from .env. No auth required — these
    are client-side keys (Cesium Ion, Google Maps) that would be visible
    in the browser regardless. Keeps them out of git."""
    return {
        "CESIUM_ION_TOKEN": os.environ.get("CESIUM_ION_TOKEN", ""),
        "GOOGLE_MAPS_API_KEY": os.environ.get("GOOGLE_MAPS_API_KEY", ""),
        "TOMTOM_API_KEY": os.environ.get("TOMTOM_API_KEY", ""),
    }

# ─── AI Agent Endpoints (VALKYRIE) ───────────────────────────
# These endpoints receive commands from the VALKYRIE AI agent
# and broadcast them to connected frontends via WebSocket.

class AIFlyToRequest(BaseModel):
    location: str
    altitude: Optional[float] = None
    heading: float = 0
    pitch: float = -90

class AILayerRequest(BaseModel):
    layer: str
    enabled: Optional[bool] = None

class AIFilterRequest(BaseModel):
    mode: str

class AIAnalyzeRequest(BaseModel):
    region: str
    focus: str = "all"
    hours: float = 24

class AICaptureRequest(BaseModel):
    label: str = "capture"

class AIQueryRequest(BaseModel):
    query: str
    session_id: Optional[str] = None

# Geocoding cache
_geocode_cache: dict[str, dict] = {}

async def _geocode(location: str) -> dict:
    """Resolve a place name to lat/lon using Nominatim."""
    if location in _geocode_cache:
        return _geocode_cache[location]

    # Check if already coordinates
    parts = location.replace(" ", "").split(",")
    if len(parts) == 2:
        try:
            lat, lon = float(parts[0]), float(parts[1])
            result = {"lat": lat, "lon": lon, "name": location, "resolved": True}
            _geocode_cache[location] = result
            return result
        except ValueError:
            pass

    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(
                "https://nominatim.openstreetmap.org/search",
                params={"q": location, "format": "json", "limit": 1},
                headers={"User-Agent": "GDI-VALKYRIE/1.0"},
            ) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    if data:
                        result = {
                            "lat": float(data[0]["lat"]),
                            "lon": float(data[0]["lon"]),
                            "name": data[0].get("display_name", location),
                            "resolved": True,
                        }
                        _geocode_cache[location] = result
                        return result
    except Exception as e:
        pass

    return {"lat": None, "lon": None, "name": location, "resolved": False, "error": "Geocoding failed"}


@app.post("/api/ai/fly-to")
async def ai_fly_to(req: AIFlyToRequest):
    """Navigate the map camera — broadcasts command to all connected frontends."""
    geo = await _geocode(req.location)
    if not geo.get("resolved"):
        raise HTTPException(400, f"Could not resolve location: {req.location}")

    altitude = req.altitude
    if altitude is None:
        # Auto-calculate altitude based on location type
        altitude = 40000  # Default 40km city view

    command = {
        "type": "ai_command",
        "action": "fly_to",
        "params": {
            "lon": geo["lon"],
            "lat": geo["lat"],
            "altitude": altitude,
            "heading": req.heading,
            "pitch": req.pitch,
        },
        "location_name": geo["name"],
        "timestamp": int(time.time()),
    }
    await ws_manager.broadcast(command)
    audit_log("ai_fly_to", details={"location": req.location, "resolved": geo["name"]})
    return {"success": True, "command": "fly_to", "location": geo}


@app.post("/api/ai/layer")
async def ai_toggle_layer(req: AILayerRequest):
    """Toggle a data layer — broadcasts to all connected frontends."""
    valid_layers = ["flights", "seismic", "satellites", "cctv", "traffic", "satx"]
    if req.layer not in valid_layers:
        raise HTTPException(400, f"Invalid layer: {req.layer}. Valid: {valid_layers}")

    command = {
        "type": "ai_command",
        "action": "toggle_layer",
        "params": {"layer": req.layer, "enabled": req.enabled},
        "timestamp": int(time.time()),
    }
    await ws_manager.broadcast(command)
    audit_log("ai_layer", details={"layer": req.layer, "enabled": req.enabled})
    return {"success": True, "command": "toggle_layer", "layer": req.layer, "enabled": req.enabled}


@app.post("/api/ai/filter")
async def ai_set_filter(req: AIFilterRequest):
    """Apply a visual filter — broadcasts to all connected frontends."""
    valid_modes = ["NORMAL", "CRT", "NVG", "FLIR"]
    if req.mode.upper() not in valid_modes:
        raise HTTPException(400, f"Invalid mode: {req.mode}. Valid: {valid_modes}")

    command = {
        "type": "ai_command",
        "action": "set_filter",
        "params": {"mode": req.mode.upper()},
        "timestamp": int(time.time()),
    }
    await ws_manager.broadcast(command)
    audit_log("ai_filter", details={"mode": req.mode})
    return {"success": True, "command": "set_filter", "mode": req.mode.upper()}


@app.post("/api/ai/analyze")
async def ai_analyze_region(req: AIAnalyzeRequest):
    """Multi-source analysis — gathers data from all layers for a region."""
    geo = await _geocode(req.region)
    if not geo.get("resolved"):
        raise HTTPException(400, f"Could not resolve region: {req.region}")

    # Gather data from our data services
    result = {
        "region": req.region,
        "coordinates": {"lat": geo["lat"], "lon": geo["lon"]},
        "focus": req.focus,
        "hours": req.hours,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }

    try:
        # Get flight data for the region
        if req.focus in ("all", "flights", "military"):
            flights = data_service._flight_cache
            if flights and isinstance(flights, dict):
                states = flights.get("states", [])
                # Filter flights near the region (simple distance check)
                nearby = []
                for s in (states or []):
                    if s and len(s) > 6 and s[5] is not None and s[6] is not None:
                        dlat = abs(s[6] - geo["lat"])
                        dlon = abs(s[5] - geo["lon"])
                        if dlat < 3 and dlon < 3:  # ~300km box
                            nearby.append({
                                "callsign": (s[1] or "").strip(),
                                "origin": s[2],
                                "lat": s[6],
                                "lon": s[5],
                                "altitude_m": s[7],
                                "velocity_ms": s[9],
                                "heading": s[10],
                                "on_ground": s[8],
                            })
                result["flights"] = {
                    "count": len(nearby),
                    "data": nearby[:100],
                }

        # Get seismic data for the region
        if req.focus in ("all", "seismic"):
            seismic = data_service._seismic_cache
            if seismic and isinstance(seismic, dict):
                features = seismic.get("features", [])
                nearby_quakes = []
                for f in features:
                    coords = f.get("geometry", {}).get("coordinates", [])
                    if len(coords) >= 2:
                        dlon = abs(coords[0] - geo["lon"])
                        dlat = abs(coords[1] - geo["lat"])
                        if dlat < 5 and dlon < 5:
                            props = f.get("properties", {})
                            nearby_quakes.append({
                                "magnitude": props.get("mag"),
                                "place": props.get("place"),
                                "time": props.get("time"),
                                "depth_km": coords[2] if len(coords) > 2 else None,
                                "lat": coords[1],
                                "lon": coords[0],
                            })
                result["seismic"] = {
                    "count": len(nearby_quakes),
                    "events": nearby_quakes[:50],
                }

    except Exception as e:
        result["error"] = str(e)

    audit_log("ai_analyze", details={"region": req.region, "focus": req.focus})
    return result


@app.post("/api/ai/capture")
async def ai_capture_view(req: AICaptureRequest):
    """Request a screenshot from the frontend via WebSocket."""
    command = {
        "type": "ai_command",
        "action": "capture_view",
        "params": {"label": req.label},
        "timestamp": int(time.time()),
    }
    await ws_manager.broadcast(command)
    return {"success": True, "command": "capture_view", "label": req.label,
            "note": "Capture command sent to frontend. Screenshot will be saved by the client."}


@app.post("/api/ai/query")
async def ai_query(req: AIQueryRequest):
    """Main AI query endpoint — receives natural language, processes through
    VALKYRIE engine (Claude + tool execution), returns structured response."""
    session_id = req.session_id or "default"

    try:
        response_text = await valkyrie.query(
            user_message=req.query,
            session_id=session_id,
            ws_broadcast=ws_manager.broadcast,
        )
        audit_log("ai_query", details={"query": req.query[:200], "session": session_id})
        return {
            "response": response_text,
            "session_id": session_id,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
    except Exception as e:
        audit_log("ai_query_error", details={"query": req.query[:200], "error": str(e)})
        raise HTTPException(500, f"AI query failed: {str(e)}")


@app.post("/api/ai/query/stream")
async def ai_query_stream(req: AIQueryRequest):
    """Streaming AI query — returns events as they happen."""
    from fastapi.responses import StreamingResponse

    session_id = req.session_id or "default"

    async def event_stream():
        async for event in valkyrie.stream_query(req.query, session_id):
            yield f"data: {json.dumps(event)}\n\n"

    audit_log("ai_query_stream", details={"query": req.query[:200], "session": session_id})
    return StreamingResponse(event_stream(), media_type="text/event-stream")


# ─── Alert Engine REST API ───────────────────────────────────

class AlertAckRequest(BaseModel):
    user: str = "operator"

class ThresholdRuleCreate(BaseModel):
    name: str
    layer: str
    field: str
    operator: str
    value: float
    severity: str = "WARNING"
    title_template: str = "{field} {operator} {value}: {entity}"
    message_template: str = "{entity} — {field} is {value} ({operator} {threshold})"
    cooldown_seconds: float = 300.0
    region_id: Optional[str] = None

@app.get("/api/alerts")
async def get_alerts(
    severity: Optional[str] = None,
    type: Optional[str] = None,
    layer: Optional[str] = None,
    acknowledged: Optional[bool] = None,
    since: Optional[float] = None,
    limit: int = Query(100, le=1000),
    user=Depends(get_current_user),
):
    alerts = alert_engine.get_alerts(severity=severity, alert_type=type, layer=layer, acknowledged=acknowledged, since=since, limit=limit)
    return {"alerts": alerts, "count": len(alerts), "stats": alert_engine.get_stats()}

@app.post("/api/alerts/acknowledge/{alert_id}")
async def acknowledge_alert(alert_id: str, req: AlertAckRequest, user=Depends(get_current_user)):
    result = alert_engine.acknowledge_alert(alert_id, user=req.user or user["username"])
    if result is None:
        raise HTTPException(404, "Alert not found")
    audit_log("alert_acknowledged", user=user["username"], details={"alert_id": alert_id})
    return result

@app.get("/api/alerts/rules")
async def get_alert_rules(user=Depends(get_current_user)):
    return {"rules": alert_engine.get_rules(), "regions": alert_engine.get_regions(), "stats": alert_engine.get_stats()}

@app.post("/api/alerts/rules")
async def create_alert_rule(req: ThresholdRuleCreate, user=Depends(get_current_user)):
    import uuid as _uuid
    sev = Severity[req.severity.upper()] if req.severity.upper() in Severity.__members__ else Severity.WARNING
    rule = ThresholdRule(
        id=str(_uuid.uuid4())[:12], name=req.name, layer=req.layer, field=req.field,
        operator=req.operator, value=req.value, severity=sev,
        title_template=req.title_template, message_template=req.message_template,
        cooldown_seconds=req.cooldown_seconds, region_id=req.region_id, enabled=True,
    )
    alert_engine.add_threshold_rule(rule)
    audit_log("alert_rule_created", user=user["username"], details={"rule_id": rule.id, "name": rule.name})
    return {"status": "created", "rule_id": rule.id, "name": rule.name}

@app.get("/api/alerts/stats")
async def get_alert_stats():
    return alert_engine.get_stats()

# ─── WebSocket ───────────────────────────────────────────────
@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket, token: str = Query(None)):
    # Validate token
    if token:
        try:
            jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        except JWTError:
            await ws.close(code=4001, reason="Invalid token")
            return
    
    await ws_manager.connect(ws)
    try:
        while True:
            data = await ws.receive_text()
            msg = json.loads(data)
            # Handle client messages
            if msg.get("type") == "ping":
                await ws.send_json({"type": "pong", "time": int(time.time())})
            elif msg.get("type") == "subscribe":
                await ws.send_json({"type": "subscribed", "layers": msg.get("layers", [])})
            elif msg.get("type") == "ai_query":
                # ── VALKYRIE AI query via WebSocket ──
                query_text = msg.get("query", "")
                session_id = msg.get("session_id", "default")
                if query_text:
                    # Stream events back to THIS client
                    async for event in valkyrie.stream_query(query_text, session_id):
                        await ws.send_json({"type": "ai_event", "event": event.get("type"), **{k: v for k, v in event.items() if k != "type"}})
                    await ws.send_json({"type": "ai_complete", "session_id": session_id})
    except WebSocketDisconnect:
        await ws_manager.disconnect(ws)
    except Exception:
        await ws_manager.disconnect(ws)

# ─── Serve GDI Frontend ─────────────────────────────────────
GDI_ROOT = os.path.join(os.path.dirname(__file__), "..")
if os.path.exists(os.path.join(GDI_ROOT, "index.html")):
    app.mount("/lib", StaticFiles(directory=os.path.join(GDI_ROOT, "lib")), name="lib")
    app.mount("/data", StaticFiles(directory=os.path.join(GDI_ROOT, "data")), name="data")

    @app.get("/")
    async def serve_index():
        return FileResponse(os.path.join(GDI_ROOT, "index.html"))

    @app.get("/login")
    async def serve_login():
        return FileResponse(os.path.join(GDI_ROOT, "login.html"))

    # Serve other static files (no-cache for active development)
    for fname in ["app.js", "config.js", "auth.js", "layers.js", "satellites.js", 
                   "filters.js", "hud.js", "satx-layer.js", "valkyrie.js", "style.css", "satx-style.css"]:
        fpath = os.path.join(GDI_ROOT, fname)
        if os.path.exists(fpath):
            @app.get(f"/{fname}")
            async def serve_static(f=fpath):
                resp = FileResponse(f)
                resp.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
                resp.headers["Pragma"] = "no-cache"
                resp.headers["Expires"] = "0"
                return resp

# ─── Entry Point ─────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "server:app",
        host="0.0.0.0",
        port=GDI_PORT,
        reload=False,
        log_level="info"
    )
