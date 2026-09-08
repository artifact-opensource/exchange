"""
GDI — MQTT Bridge
Valkyrie Data Pipeline: MQTT ↔ Backend ↔ WebSocket ↔ GDI Frontend

Subscribes to MQTT topics, processes incoming data, persists to PostgreSQL,
pushes real-time updates to WebSocket clients, and publishes commands back.

Topic Structure:
    gdi/flights/live          — ADS-B state vectors (from feeder)
    gdi/seismic/events        — Earthquake events (from USGS poller)
    gdi/satellites/tle        — TLE updates (from CelesTrak poller)
    gdi/satellites/passes     — Pass predictions
    gdi/satx/detections       — Signal detections from SATx
    gdi/satx/recordings       — Recording metadata
    gdi/satx/status           — SATx station status
    gdi/alerts/#              — Alert pipeline
    gdi/system/heartbeat      — System health heartbeats
    gdi/system/command        — Command channel (publish)

Architecture:
    ┌─────────┐    ┌──────────────┐    ┌──────────┐    ┌─────────┐
    │  MQTT   │───▶│  MQTT Bridge │───▶│ Postgres │    │  Redis  │
    │ Broker  │◀───│  (this file) │───▶│ (persist)│    │ (cache) │
    └─────────┘    └──────┬───────┘    └──────────┘    └────┬────┘
                          │                                  │
                          ▼                                  ▼
                   ┌──────────────┐                  ┌─────────────┐
                   │  WebSocket   │◀────────────────▶│ FastAPI     │
                   │  (push)      │                  │ (server.py) │
                   └──────────────┘                  └─────────────┘
"""
import asyncio
import json
import logging
import os
import signal
import sys
import time
from datetime import datetime, timezone
from typing import Optional

import paho.mqtt.client as mqtt
import redis
import aiohttp
import asyncpg

# ── Logging ──────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("gdi.mqtt")

# ── Configuration ────────────────────────────────────────────────
MQTT_HOST = os.getenv("MQTT_HOST", "localhost")
MQTT_PORT = int(os.getenv("MQTT_PORT", "1883"))
MQTT_CLIENT_ID = os.getenv("MQTT_CLIENT_ID", "gdi-bridge-01")
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")
GDI_API_URL = os.getenv("GDI_API_URL", "http://localhost:8600")
GDI_WS_URL = os.getenv("GDI_WS_URL", "ws://localhost:8600/ws")

# API credentials for internal use
API_USER = os.getenv("GDI_API_USER", "admin")
API_PASS = os.getenv("GDI_API_PASS", "valkyrie")

DB_DSN = os.getenv("DATABASE_URL", "postgresql://gdi:gdi_secret@localhost:5432/gdi_satx")

# Data fetch intervals (seconds)
FLIGHT_FETCH_INTERVAL = int(os.getenv("FLIGHT_INTERVAL", "10"))
SEISMIC_FETCH_INTERVAL = int(os.getenv("SEISMIC_INTERVAL", "60"))
TLE_FETCH_INTERVAL = int(os.getenv("TLE_INTERVAL", "3600"))
HEARTBEAT_INTERVAL = int(os.getenv("HEARTBEAT_INTERVAL", "30"))

# MQTT Topics
TOPICS = {
    "flights": "gdi/flights/live",
    "seismic": "gdi/seismic/events",
    "tle": "gdi/satellites/tle",
    "passes": "gdi/satellites/passes",
    "detections": "gdi/satx/detections",
    "recordings": "gdi/satx/recordings",
    "satx_status": "gdi/satx/status",
    "alerts": "gdi/alerts",
    "heartbeat": "gdi/system/heartbeat",
    "command": "gdi/system/command",
    "status": "gdi/system/status",
}


class MQTTBridge:
    """
    Bidirectional MQTT bridge for GDI Valkyrie.
    
    - Fetches data from external APIs (OpenSky, USGS, CelesTrak)
    - Publishes to MQTT for any subscriber
    - Subscribes to MQTT for incoming data (SATx, external feeds)
    - Pushes to Redis for the FastAPI backend / WebSocket
    - Persists critical data to PostgreSQL via the ingest pipeline
    """

    def __init__(self):
        self.mqtt_client: Optional[mqtt.Client] = None
        self.redis_client: Optional[redis.Redis] = None
        self.http_session: Optional[aiohttp.ClientSession] = None
        self.db_pool: Optional[asyncpg.Pool] = None
        self.api_token: Optional[str] = None
        self._running = False
        self._stats = {
            "messages_in": 0,
            "messages_out": 0,
            "flights_published": 0,
            "seismic_published": 0,
            "tle_published": 0,
            "errors": 0,
            "started_at": None,
        }

    # ═════════════════════════════════════════════════════════════
    #  LIFECYCLE
    # ═════════════════════════════════════════════════════════════

    async def start(self):
        """Initialize all connections and start the bridge."""
        log.info("═══ GDI MQTT Bridge starting ═══")
        self._stats["started_at"] = datetime.now(timezone.utc).isoformat()

        # Redis
        try:
            self.redis_client = redis.from_url(REDIS_URL, decode_responses=True)
            self.redis_client.ping()
            log.info(f"  Redis: connected ({REDIS_URL})")
        except Exception as e:
            log.warning(f"  Redis: unavailable ({e}) — degraded mode")
            self.redis_client = None

        # PostgreSQL
        try:
            self.db_pool = await asyncpg.create_pool(DB_DSN, min_size=1, max_size=5)
            async with self.db_pool.acquire() as conn:
                count = await conn.fetchval("SELECT count(*) FROM information_schema.tables WHERE table_schema='public'")
                log.info(f"  PostgreSQL: connected ({count} tables)")
        except Exception as e:
            log.warning(f"  PostgreSQL: unavailable ({e}) — no persistence")
            self.db_pool = None

        # HTTP session for API calls
        connector = aiohttp.TCPConnector(ttl_dns_cache=300, limit=10)
        self.http_session = aiohttp.ClientSession(
            timeout=aiohttp.ClientTimeout(total=30, connect=10),
            connector=connector,
        )

        # Get API token
        await self._authenticate()

        # MQTT
        self.mqtt_client = mqtt.Client(
            client_id=MQTT_CLIENT_ID,
            protocol=mqtt.MQTTv311,
            callback_api_version=mqtt.CallbackAPIVersion.VERSION2,
        )
        self.mqtt_client.on_connect = self._on_connect
        self.mqtt_client.on_message = self._on_message
        self.mqtt_client.on_disconnect = self._on_disconnect

        try:
            self.mqtt_client.connect(MQTT_HOST, MQTT_PORT, keepalive=60)
            self.mqtt_client.loop_start()
            log.info(f"  MQTT: connected ({MQTT_HOST}:{MQTT_PORT})")
        except Exception as e:
            log.error(f"  MQTT: connection failed ({e})")
            raise

        self._running = True
        log.info("═══ GDI MQTT Bridge ONLINE ═══")

        # Start data fetch loops
        await asyncio.gather(
            self._flight_loop(),
            self._seismic_loop(),
            self._tle_loop(),
            self._heartbeat_loop(),
            self._redis_subscriber_loop(),
        )

    async def stop(self):
        """Graceful shutdown."""
        log.info("═══ GDI MQTT Bridge shutting down ═══")
        self._running = False

        if self.mqtt_client:
            # Publish offline status
            self.mqtt_client.publish(
                TOPICS["status"],
                json.dumps({
                    "status": "offline",
                    "bridge": MQTT_CLIENT_ID,
                    "time": datetime.now(timezone.utc).isoformat(),
                }),
                qos=1,
                retain=True,
            )
            self.mqtt_client.loop_stop()
            self.mqtt_client.disconnect()

        if self.http_session:
            await self.http_session.close()

        if self.redis_client:
            self.redis_client.close()

        log.info("═══ GDI MQTT Bridge OFFLINE ═══")

    # ═════════════════════════════════════════════════════════════
    #  MQTT CALLBACKS
    # ═════════════════════════════════════════════════════════════

    def _on_connect(self, client, userdata, flags, rc, properties=None):
        """Called when MQTT connection is established."""
        if rc == 0:
            log.info("MQTT connected — subscribing to topics")
            # Subscribe to incoming data topics
            client.subscribe("gdi/#", qos=1)
            
            # Publish online status (retained)
            client.publish(
                TOPICS["status"],
                json.dumps({
                    "status": "online",
                    "bridge": MQTT_CLIENT_ID,
                    "time": datetime.now(timezone.utc).isoformat(),
                    "capabilities": ["flights", "seismic", "tle", "satx"],
                }),
                qos=1,
                retain=True,
            )
        else:
            log.error(f"MQTT connect failed: rc={rc}")

    def _on_disconnect(self, client, userdata, flags, rc, properties=None):
        """Called on MQTT disconnection."""
        if rc != 0:
            log.warning(f"MQTT unexpected disconnect (rc={rc}) — will reconnect")

    def _on_message(self, client, userdata, msg):
        """Handle incoming MQTT messages."""
        self._stats["messages_in"] += 1
        topic = msg.topic
        
        try:
            payload = json.loads(msg.payload.decode("utf-8"))
        except (json.JSONDecodeError, UnicodeDecodeError):
            # Binary payload or non-JSON
            payload = msg.payload
            
        # Route by topic
        if topic == TOPICS["detections"]:
            self._handle_detection(payload)
        elif topic == TOPICS["recordings"]:
            self._handle_recording(payload)
        elif topic == TOPICS["satx_status"]:
            self._handle_satx_status(payload)
        elif topic == TOPICS["command"]:
            self._handle_command(payload)
        elif topic.startswith("gdi/alerts"):
            self._handle_alert(payload)

    # ═════════════════════════════════════════════════════════════
    #  MESSAGE HANDLERS
    # ═════════════════════════════════════════════════════════════

    def _handle_detection(self, payload):
        """Process incoming SATx signal detection."""
        log.info(f"SATx detection: {payload.get('frequency_hz', '?')} Hz, "
                 f"SNR {payload.get('snr_db', '?')} dB")
        # Push to Redis for WebSocket broadcast
        if self.redis_client:
            self.redis_client.publish("gdi:ws:broadcast", json.dumps({
                "type": "satx_detection",
                "data": payload,
                "time": datetime.now(timezone.utc).isoformat(),
            }))
            # Cache latest detections
            self.redis_client.lpush("gdi:detections:recent", json.dumps(payload))
            self.redis_client.ltrim("gdi:detections:recent", 0, 99)

    def _handle_recording(self, payload):
        """Process recording metadata from SATx."""
        log.info(f"SATx recording: {payload.get('file_path', '?')}")
        if self.redis_client:
            self.redis_client.publish("gdi:ws:broadcast", json.dumps({
                "type": "satx_recording",
                "data": payload,
            }))

    def _handle_satx_status(self, payload):
        """Process SATx station status update."""
        log.debug(f"SATx status: {payload}")
        if self.redis_client:
            self.redis_client.set("gdi:satx:status", json.dumps(payload), ex=120)
            self.redis_client.publish("gdi:ws:broadcast", json.dumps({
                "type": "satx_status",
                "data": payload,
            }))

    def _handle_command(self, payload):
        """Process incoming commands."""
        cmd = payload.get("command")
        log.info(f"Command received: {cmd}")
        if cmd == "refresh_flights":
            # Trigger immediate flight fetch
            asyncio.get_event_loop().create_task(self._fetch_and_publish_flights())
        elif cmd == "refresh_seismic":
            asyncio.get_event_loop().create_task(self._fetch_and_publish_seismic())
        elif cmd == "refresh_tle":
            asyncio.get_event_loop().create_task(self._fetch_and_publish_tle())
        elif cmd == "status":
            self.mqtt_client.publish(
                TOPICS["status"],
                json.dumps(self._get_status()),
                qos=1,
            )

    def _handle_alert(self, payload):
        """Process alerts."""
        severity = payload.get("severity", "info")
        title = payload.get("title", "Unknown alert")
        log.warning(f"ALERT [{severity.upper()}]: {title}")
        if self.redis_client:
            self.redis_client.publish("gdi:ws:broadcast", json.dumps({
                "type": "alert",
                "data": payload,
            }))

    # ═════════════════════════════════════════════════════════════
    #  DATA FETCH LOOPS
    # ═════════════════════════════════════════════════════════════

    async def _authenticate(self):
        """Get JWT token from the GDI API."""
        try:
            async with self.http_session.post(
                f"{GDI_API_URL}/api/auth/login",
                json={"username": API_USER, "password": API_PASS},
            ) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    self.api_token = data["access_token"]
                    log.info("  API: authenticated")
                else:
                    log.error(f"  API: auth failed (HTTP {resp.status})")
        except Exception as e:
            log.error(f"  API: auth error ({e})")

    def _auth_headers(self):
        """Return authorization headers."""
        if self.api_token:
            return {"Authorization": f"Bearer {self.api_token}"}
        return {}

    async def _flight_loop(self):
        """Periodically fetch flight data and publish to MQTT."""
        await asyncio.sleep(2)  # Let everything initialize
        while self._running:
            try:
                await self._fetch_and_publish_flights()
            except Exception as e:
                log.error(f"Flight loop error: {e}")
                self._stats["errors"] += 1
            await asyncio.sleep(FLIGHT_FETCH_INTERVAL)

    async def _fetch_and_publish_flights(self):
        """Fetch flights from API and publish to MQTT + Redis."""
        try:
            async with self.http_session.get(
                f"{GDI_API_URL}/api/flights",
                headers=self._auth_headers(),
            ) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    states = data.get("states", [])
                    
                    # Publish full state to MQTT
                    payload = json.dumps({
                        "time": data.get("time", int(time.time())),
                        "count": len(states),
                        "states": states,
                    })
                    self.mqtt_client.publish(
                        TOPICS["flights"], payload, qos=0
                    )
                    self._stats["flights_published"] += 1
                    self._stats["messages_out"] += 1

                    # Cache in Redis
                    if self.redis_client:
                        self.redis_client.set(
                            "gdi:flights:latest",
                            payload,
                            ex=FLIGHT_FETCH_INTERVAL * 3,
                        )
                        # Publish for WebSocket broadcast
                        self.redis_client.publish("gdi:ws:broadcast", json.dumps({
                            "type": "flights_update",
                            "count": len(states),
                            "time": data.get("time", int(time.time())),
                        }))

                    log.info(f"Flights: {len(states)} aircraft published")
                elif resp.status == 401:
                    log.warning("Flight fetch: token expired — re-authenticating")
                    await self._authenticate()
                else:
                    log.warning(f"Flight fetch: HTTP {resp.status}")
        except Exception as e:
            log.error(f"Flight fetch error: {e}")

    async def _seismic_loop(self):
        """Periodically fetch seismic data and publish to MQTT."""
        await asyncio.sleep(5)
        while self._running:
            try:
                await self._fetch_and_publish_seismic()
            except Exception as e:
                log.error(f"Seismic loop error: {e}")
                self._stats["errors"] += 1
            await asyncio.sleep(SEISMIC_FETCH_INTERVAL)

    async def _fetch_and_publish_seismic(self):
        """Fetch seismic events and publish."""
        try:
            async with self.http_session.get(
                f"{GDI_API_URL}/api/seismic?period=all_day",
                headers=self._auth_headers(),
            ) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    features = data.get("features", [])

                    payload = json.dumps({
                        "count": len(features),
                        "features": features,
                        "time": datetime.now(timezone.utc).isoformat(),
                    })
                    self.mqtt_client.publish(
                        TOPICS["seismic"], payload, qos=0
                    )
                    self._stats["seismic_published"] += 1
                    self._stats["messages_out"] += 1

                    if self.redis_client:
                        self.redis_client.set(
                            "gdi:seismic:latest",
                            payload,
                            ex=SEISMIC_FETCH_INTERVAL * 3,
                        )

                    # Check for significant events
                    significant = [
                        f for f in features
                        if f.get("properties", {}).get("mag", 0) >= 5.0
                    ]
                    if significant:
                        alert_payload = json.dumps({
                            "severity": "high",
                            "title": f"{len(significant)} significant seismic events (M5.0+)",
                            "events": [
                                {
                                    "mag": f["properties"]["mag"],
                                    "place": f["properties"]["place"],
                                }
                                for f in significant[:5]
                            ],
                            "time": datetime.now(timezone.utc).isoformat(),
                        })
                        self.mqtt_client.publish(
                            f"{TOPICS['alerts']}/seismic", alert_payload, qos=1
                        )

                    log.info(f"Seismic: {len(features)} events published")
                elif resp.status == 401:
                    await self._authenticate()
        except Exception as e:
            log.error(f"Seismic fetch error: {e}")

    async def _tle_loop(self):
        """Periodically fetch TLE data and publish."""
        await asyncio.sleep(8)
        while self._running:
            try:
                await self._fetch_and_publish_tle()
            except Exception as e:
                log.error(f"TLE loop error: {e}")
                self._stats["errors"] += 1
            await asyncio.sleep(TLE_FETCH_INTERVAL)

    async def _fetch_and_publish_tle(self):
        """Fetch TLE data for key satellite groups."""
        groups = ["stations", "active", "weather", "gps-ops", "military"]
        for group in groups:
            try:
                async with self.http_session.get(
                    f"{GDI_API_URL}/api/satellites/tle?group={group}",
                    headers=self._auth_headers(),
                ) as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        tle_data = data.get("tle_data", "")
                        if tle_data.strip():
                            lines = [l for l in tle_data.strip().split("\n") if l.strip()]
                            sat_count = len(lines) // 3

                            payload = json.dumps({
                                "group": group,
                                "satellite_count": sat_count,
                                "tle_data": tle_data,
                                "fetched_at": data.get("fetched_at"),
                            })
                            self.mqtt_client.publish(
                                f"{TOPICS['tle']}/{group}", payload, qos=1
                            )
                            self._stats["tle_published"] += 1
                            self._stats["messages_out"] += 1

                            if self.redis_client:
                                self.redis_client.set(
                                    f"gdi:tle:{group}",
                                    tle_data,
                                    ex=TLE_FETCH_INTERVAL * 2,
                                )

                            log.info(f"TLE [{group}]: {sat_count} satellites published")
                    elif resp.status == 401:
                        await self._authenticate()
                        break
            except Exception as e:
                log.error(f"TLE fetch error [{group}]: {e}")

    async def _heartbeat_loop(self):
        """Publish system heartbeat to MQTT."""
        while self._running:
            status = self._get_status()
            self.mqtt_client.publish(
                TOPICS["heartbeat"],
                json.dumps(status),
                qos=0,
            )
            self._stats["messages_out"] += 1
            await asyncio.sleep(HEARTBEAT_INTERVAL)

    async def _redis_subscriber_loop(self):
        """Listen for Redis PubSub messages to relay to MQTT."""
        if not self.redis_client:
            return

        pubsub = self.redis_client.pubsub()
        pubsub.subscribe("gdi:mqtt:publish")

        while self._running:
            try:
                message = pubsub.get_message(timeout=1)
                if message and message["type"] == "message":
                    try:
                        data = json.loads(message["data"])
                        topic = data.get("topic", TOPICS["command"])
                        payload = data.get("payload", {})
                        qos = data.get("qos", 0)
                        self.mqtt_client.publish(
                            topic,
                            json.dumps(payload) if isinstance(payload, dict) else payload,
                            qos=qos,
                        )
                        self._stats["messages_out"] += 1
                    except json.JSONDecodeError:
                        pass
            except Exception as e:
                log.error(f"Redis subscriber error: {e}")
            await asyncio.sleep(0.1)

    # ═════════════════════════════════════════════════════════════
    #  STATUS
    # ═════════════════════════════════════════════════════════════

    def _get_status(self):
        """Return current bridge status."""
        return {
            "bridge": MQTT_CLIENT_ID,
            "status": "online" if self._running else "offline",
            "mqtt": {
                "host": MQTT_HOST,
                "port": MQTT_PORT,
                "connected": self.mqtt_client.is_connected() if self.mqtt_client else False,
            },
            "redis": {
                "connected": self.redis_client is not None,
            },
            "api": {
                "url": GDI_API_URL,
                "authenticated": self.api_token is not None,
            },
            "stats": self._stats,
            "time": datetime.now(timezone.utc).isoformat(),
            "uptime_s": int(time.time() - time.mktime(
                datetime.fromisoformat(self._stats["started_at"]).timetuple()
            )) if self._stats["started_at"] else 0,
        }


# ═════════════════════════════════════════════════════════════════
#  ENTRY POINT
# ═════════════════════════════════════════════════════════════════

async def main():
    bridge = MQTTBridge()

    # Handle signals
    loop = asyncio.get_event_loop()
    for sig in (signal.SIGINT, signal.SIGTERM):
        loop.add_signal_handler(sig, lambda: asyncio.create_task(bridge.stop()))

    try:
        await bridge.start()
    except KeyboardInterrupt:
        pass
    finally:
        await bridge.stop()


if __name__ == "__main__":
    asyncio.run(main())
