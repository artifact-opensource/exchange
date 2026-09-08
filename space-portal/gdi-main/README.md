<p align="center">
  <img src="assets/gdi-logo.png" width="180" alt="GDI">
</p>

<h1 align="center">GDI — Global Defense Intelligence</h1>

<p align="center">
  Open. Free. Sovereign. The anti-Palantir.
</p>

---

## What This Is

GDI is a real-time planetary intelligence platform. It renders live data from 20+ sources on a 3D globe (CesiumJS), cross-correlates across intelligence domains, and surfaces patterns through an embedded AI analyst (VALKYRIE).

It tracks aircraft (6 ADS-B sources, 12,000+ simultaneous), satellites (65,000+ cataloged objects via Space-Track.org), seismic events (USGS), global conflict events (GDELT), fire hotspots (NASA FIRMS), natural disasters (GDACS), financial markets (Binance, Alpha Vantage, FRED), and open-source intelligence (Reuters, BBC, Al Jazeera, AP). Everything renders on a single authenticated interface with military-aesthetic HUD overlays and four real-time GLSL post-processing filters.

VALKYRIE — the AI engine — has 10 tools and calls them autonomously. You say "what's happening over the South China Sea?" and it simultaneously queries flights, seismic data, satellites, OSINT, and FININT, then delivers a structured intelligence briefing while moving the camera to the target region. It streams responses token-by-token over WebSocket, and tool calls execute in real-time — the globe moves while the answer is still being written.

The system degrades gracefully across five operating modes. Kill the internet and it runs on cached data plus local models (Ollama). Kill Redis and it falls back to filesystem. Kill everything and the last known state is still rendered on the globe. Enter DARK mode and all outbound connections terminate.

No vendor lock-in. No US corporate data dependencies. Runs on your hardware, under your laws.

~26,600 lines across 53+ source files.

## Architecture

```
User ←→ VALKYRIE (Claude + 10 tools + session memory + SQLite)
              ↕
    FastAPI (:8600) + Redis Streams + WebSocket
              ↕
    ┌────────────┬──────────┬──────────┬────────────┐
    ↓            ↓          ↓          ↓            ↓
  FININT      OSINT      GEOINT    SPACETRACK    ENVIRO
    ↓            ↓          ↓          ↓            ↓
  Binance    Reuters    CelesTrak  Space-Track  NASA FIRMS
  FRED       BBC        Skyfield   65K objects  GDACS
  AlphaV     Al Jazeera SGP4                    
  NewsAPI    USGS       N2YO                    
             GDELT                               
              ↕
    Cross-Layer Correlation Engine
    (spatial + temporal + spatiotemporal + convergence)
              ↕
    Alerting Engine (geofence + threshold + anomaly + proximity)
              ↕
    ┌──────────────────────────────────────────────────┐
    │  CesiumJS 3D Globe                               │
    │  GLSL Filters (CRT / NVG / FLIR)                │
    │  HUD Overlay (crosshair, compass, coordinates)   │
    │  Intel Panel (alerts, search, measurement)        │
    │  VALKYRIE Chat Panel (streaming AI)               │
    └──────────────────────────────────────────────────┘
```

## Data Sources

### Flight Intelligence (6 sources, parallel fetch, deduplicate by ICAO hex)

| Source | Auth | What It Adds |
|--------|:----:|--------------|
| FlightRadar24 | No | Callsign, type, registration, origin, destination |
| ADSB.lol | No | Military transponders, baro_rate, alt_geom |
| ADSB.one | No | Backup community coverage, category codes |
| ADS-B.fi | No | European community feed |
| OpenSky Network | Optional | origin_country, sensor data, geometric altitude |
| ADS-B Exchange (RapidAPI) | Yes | Unfiltered military/government, emergency codes |

All six fetched in parallel via `asyncio.gather`. Each source has independent health tracking with exponential backoff (30s → 60s → 120s → 240s → 600s max). Failed sources auto-disable; recovering sources auto-re-enable. Deduplication by ICAO 24-bit hex, field merging across providers. No single source provides the full picture — the aggregation does.

### Satellite & Space Tracking

| Source | Auth | Coverage |
|--------|:----:|----------|
| Space-Track.org | Registration | Full USSTRATCOM catalog — 65,000+ objects. Type classification (payload/debris/rocket body), orbit regime (LEO/MEO/GEO/HEO), 122 countries, 30-min refresh |
| CelesTrak | No | 50,000+ TLEs. Active, stations, weather, NOAA, cubesat, amateur, cosmos, iridium, science, geodetic, engineering, education |
| Skyfield + SGP4 | Local | High-precision ephemeris computation. Real-time position propagation in browser via satellite.js |
| N2YO | Optional | Satellite visibility predictions, pass times |

Frontend renders satellites with 14-type color coding, toggle controls for debris/rocket bodies/Starlink, performance caps (2K debris max, 3K Starlink max rendered), distance-based label culling. Click panel shows NORAD ID, country of origin, orbit regime, inclination, RCS, launch date.

### Conflict & Event Intelligence

| Source | Auth | What |
|--------|:----:|------|
| GDELT | No | The world's largest open event database. Billions of records, 15-minute updates. CAMEO event codes classified into conflict types (protest, force, coerce, assault, fight, mass_violence). Goldstein scale severity. Every event geolocated. |
| GDACS | No | Multi-hazard disaster alerts — earthquakes, floods, cyclones, volcanoes, tsunamis. Severity classification. GeoJSON. |
| NASA FIRMS | API key | Global fire/thermal anomaly hotspots. 375m resolution. MODIS + VIIRS instruments. 3-hour update cycle. |
| USGS | No | Global seismic events. Magnitude, depth, location, time. 60-second refresh. |

### Financial Intelligence

| Source | Auth | What |
|--------|:----:|------|
| Binance | API key | Real-time crypto tickers, order books, 1,500+ trading pairs. 5 watched symbols (BTC, ETH, SOL, XRP, BNB). |
| Alpha Vantage | API key | Stocks, forex, crypto, technical analysis indicators. |
| FRED | API key | 800,000+ macroeconomic time series — GDP, CPI, unemployment, interest rates, money supply, yield curves. 3 watched series (fed funds rate, 10Y-2Y spread, VIX). |
| NewsAPI | API key | 150,000+ news sources. Headline sentiment classification. |
| Economic Calendar (RapidAPI) | API key | Central bank decisions, earnings, economic releases. |

### Open Source Intelligence

| Source | Auth | What |
|--------|:----:|------|
| Reuters RSS | No | World news, real-time |
| BBC RSS | No | World news |
| Al Jazeera RSS | No | Global coverage |
| AP RSS | No | Top news |
| USGS | No | Earthquake alerts (4.5+ in last hour) |
| GDACS RSS | No | Disaster events |
| NewsAPI | API key | 150,000+ sources, entity extraction, sentiment |

### Signal Intelligence (hardware-dependent)

| Source | Auth | What |
|--------|:----:|------|
| RTL-SDR | Hardware | Local RF capture. ADS-B, AIS, weather satellites, SIGINT. $25 USB dongle. |
| WebSDR | No | Remote SDR receivers worldwide. Degraded-mode fallback. |
| SatNOGS | No | Satellite observation database. Community ground stations. |

## Intelligence Workers

Five daemon workers run continuously through the Worker Orchestrator. Each polls its sources, classifies with a fast LLM (Cerebras llama3.1-8b, ~10ms), escalates anomalies to a deep LLM (SambaNova DeepSeek-V3, ~2s), and writes intelligence items to a Redis stream with severity routing.

| Worker | Sources | Cycle | Escalation Triggers |
|--------|---------|-------|---------------------|
| **FININT** | Binance, Alpha Vantage, FRED, NewsAPI | 30s | Price move >3%, volume spike >2x avg, 3+ consecutive bearish headlines, cross-asset divergence |
| **OSINT** | Reuters, BBC, Al Jazeera, AP, USGS, GDACS, NewsAPI | 5min | Entity extraction, threat categorization, geo-tagging, cross-source correlation every 5 cycles |
| **GEOINT** | CelesTrak, Skyfield, N2YO | 60s position, 12h TLE refresh | ISS/CSS/Hubble tracking, pass predictions, conjunction alerts |
| **SPACETRACK** | Space-Track.org | 30min | Full catalog (65K objects), type/orbit/country classification, name pattern matching (starlink, gps, glonass, recon, weather) |
| **ENVIRO** | NASA FIRMS, GDACS | 3h (fires), event-driven (disasters) | Fire hotspot clusters, disaster severity classification |

All workers write to a single Redis stream (`gdi:intel`, 10K rolling window) with severity levels:
- 🔴 `CRITICAL` — immediate broadcast + alert
- ⚠️ `ALERT` — broadcast with emphasis
- 👁️ `WATCH` — standard broadcast
- 📊 `INFO` — logged, queryable via API

### Dual-Tier LLM Pipeline

Both tiers are free — routed through HuggingFace:

| Tier | Provider | Model | Latency | Use |
|------|----------|-------|---------|-----|
| FAST | Cerebras | llama3.1-8b | ~10ms | Headline classification, sentiment, entity extraction, tagging |
| DEEP | SambaNova | DeepSeek-V3-0324 | ~2s | Anomaly analysis, multi-signal correlation, structured intelligence briefs |
| REASONING | SambaNova | QwQ-32B | ~5s | Complex multi-step analysis (available, used on-demand) |

## Cross-Layer Correlation Engine

The correlation engine (`correlation.py`, 681 lines) finds relationships between entities across intelligence layers. It runs a continuous background pass every 30 seconds.

**Correlation types:**

| Type | What It Detects |
|------|----------------|
| SPATIAL | Entities from different layers within proximity radius (default 50km) |
| TEMPORAL | Events from different layers in the same time window (default 5min) |
| SPATIOTEMPORAL | Both spatial AND temporal match — highest confidence |
| PATTERN | Recurring co-occurrence patterns (N events over time) |
| CONVERGENCE | Multiple entities converging on the same point from different directions |

**Example correlations:** A military aircraft near a seismic anomaly. A satellite pass over a ship cluster. A SIGINT burst coinciding with unusual flight patterns. A financial market spike coinciding with conflict events in the same region.

All correlation events are broadcast via WebSocket and available through the `/api/correlation/*` endpoints.

## Alerting Engine

The alerting engine (`alerting.py`, 806 lines) evaluates incoming data against registered rules and fires alerts via WebSocket + Discord.

**Alert types:**

| Type | What It Does |
|------|-------------|
| GEOFENCE | Circular or polygonal geographic boundaries. Triggers on ENTER, EXIT, or DWELL. |
| THRESHOLD | Numeric thresholds on any data field (magnitude, altitude, price, etc.). |
| ANOMALY | Statistical anomaly detection — z-score deviation from rolling baseline. |
| PROXIMITY | Two entities from different layers approaching each other. |
| CUSTOM | Arbitrary rule functions. |

**Severity levels:** INFO → WARNING → CRITICAL → EMERGENCY

Alerts are persisted to history, support acknowledgment, and auto-broadcast to Discord via the Discord adapter (rich embeds with severity-coded colors).

## Geospatial Analysis

Pure-Python geospatial toolkit (`geospatial.py`, 263 lines). No external geo libraries.

- Haversine distance (great-circle)
- Initial bearing calculation
- Destination point projection
- Bounding box computation
- Point-in-circle and point-in-polygon tests
- Distance and area measurement
- In-memory spatial index with grid-based proximity queries

## Ingest Pipeline

Every data point flows through the ingest pipeline (`ingest_pipeline.py`, 330 lines):

```
Raw Data → Normalize to GeoEntity → Spatial Index → HEKTOR (semantic memory) → Alert Engine
```

Callbacks are registered at startup — when a flight position arrives, it's simultaneously indexed for proximity queries, fed into HEKTOR for semantic search, and evaluated against all active alert rules.

## Intelligence API

Beyond the base data endpoints, the intelligence API (`intel_api.py`, 360 lines) provides:

| Endpoint | What |
|----------|------|
| `/api/intelligence/search` | Unified search across HEKTOR (semantic) + spatial index |
| `/api/intelligence/proximity` | "What's within N km of this point?" across all layers |
| `/api/intelligence/timeline` | Events in a region during a time range |
| `/api/intelligence/measure` | Distance/area measurement between coordinates |
| `/api/intelligence/stats` | Ingest pipeline statistics |
| `/api/geofence/*` | CRUD for geofence watch regions |

## VALKYRIE — The AI Analyst

VALKYRIE is an embedded Claude-powered analyst with 10 tools, session memory (SQLite + BM25 FTS5 search), and real-time WebSocket streaming.

**Tools:**

| Tool | What It Does |
|------|-------------|
| `fly_to` | Geocodes any location and moves the camera — "take me to the Strait of Hormuz" |
| `toggle_layer` | Show/hide data layers (flights, seismic, satellites, CCTV, traffic, SATx) |
| `set_filter` | Switch visual modes — CRT, NVG, FLIR, or normal |
| `query_flights` | Live flight data — filter by region, callsign, airline, type, altitude, proximity |
| `query_seismic` | USGS earthquakes — filter by region, magnitude, time, depth |
| `query_satellites` | Satellite data — filter by name, NORAD ID, orbit type, visibility from location |
| `analyze_region` | Multi-source intelligence analysis — flights + seismic + satellites + OSINT + FININT correlated for one area |
| `capture_view` | Screenshot the current globe state |
| `valkyrie_remember` | Store knowledge in persistent memory (key-value, categorized) |
| `valkyrie_recall` | BM25 keyword search over conversations and stored knowledge |

VALKYRIE uses aggressive tool-calling — a vague "what's going on?" triggers a parallel pull of every live source and returns a severity-coded intelligence briefing. Tool calls execute while the response streams. The camera moves, layers toggle, and data loads in real-time.

**Memory:** SQLite database (`valkyrie.db`) with three tables — conversations (session-scoped chat history), knowledge (persistent key-value store), spatial_cache (TTL-governed geospatial data). BM25 search via FTS5 over conversations and knowledge.

## Frontend

### 3D Globe
CesiumJS 1.138 — local bundle, no CDN dependency. Renders the full Earth with terrain, imagery, and all data layers simultaneously. SGP4 satellite propagation runs client-side at 3-second intervals. Flight positions update every 10 seconds. Seismic events refresh every 60 seconds.

### HUD Overlay
Military-aesthetic heads-up display:
- Top bar: UTC clock, local clock, date, camera altitude, FPS counter, search box
- Left sidebar: data layer toggles with live counts, camera view presets (Globe/3D/Overhead), visual mode selector
- Bottom bar: per-layer status indicators, mouse coordinates (DMS format with altitude), camera altitude
- Crosshair with gap indicators
- Compass rose with real-time heading
- Click popups with entity details

### Visual Modes (GLSL Post-Processing)

Four real-time fragment shaders applied to the entire CesiumJS scene framebuffer:

| Mode | Effect |
|------|--------|
| NORMAL | Clean render, no post-processing |
| CRT | Scanlines, phosphor green tint, vignette, slight curvature |
| NVG | Green channel extraction, noise grain, bloom, barrel distortion |
| FLIR | Luminance → heatmap color ramp (black → blue → red → yellow → white) |

### Intel Panel
- Alert notification toasts (top-right, auto-dismiss, severity-coded)
- Alert sidebar panel (toggle with `A` key)
- HEKTOR semantic search panel (toggle with `H` key)
- Measurement tools (toggle with `M` key)
- Sound alerts for CRITICAL+ severity
- WebSocket alert consumption

### VALKYRIE Chat Panel
- Collapsible panel at bottom-right
- WebSocket streaming (token-by-token) with REST fallback
- Event types: `thinking`, `tool_call`, `tool_result`, `text`, `done`, `error`
- Tool calls render as expandable blocks showing what VALKYRIE is doing in real-time

## HEKTOR Integration

HEKTOR (the C++ vector database powering AVA's memory) is integrated as a GDI intelligence memory layer:
- REST API wrapper (`hektor_api.py`, 327 lines)
- Unix socket IPC to the persistent HEKTOR daemon
- BM25 + 384-dimension vector hybrid search over the entire workspace
- Semantic search panel in the frontend (toggle with `H` key)

## Discord Integration

Discord adapter (`discord_adapter.py`, 591 lines) for intelligence broadcast:
- Consumes the Redis `gdi:intel` stream
- Broadcasts intelligence items as rich embeds to a configured channel
- Severity-coded embed colors
- Slash commands: `/status`, `/intel`, `/workers`

## Authentication & RBAC

JWT authentication with PBKDF2-SHA256 password hashing.

| Role | Flights | Seismic | Satellites | SATx | CCTV | FININT | Intel Search | Audit | User Mgmt |
|------|:-------:|:-------:|:----------:|:----:|:----:|:------:|:------------:|:-----:|:---------:|
| admin | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| commander | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| analyst | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ | ✅ | ❌ | ❌ |
| viewer | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

All API access is audit-logged (user, action, timestamp, IP) to `.audit.jsonl`.

## Sovereign Mode

Five operating modes managed by the Sovereign subsystem (`sovereign/`, 4 files, 1,549 lines):

| Mode | Internet | Inference | Comms | How |
|------|:--------:|:---------:|:-----:|-----|
| CLOUD | ✅ | Cloud LLMs | Full | Default |
| DEGRADED | ⚠️ | Ollama (local) | Full | Cloud API unreachable → auto-transition |
| OFFLINE | ❌ | Local | IPC/filesystem | No internet detected |
| STEALTH | ⚠️ | Local | ✅ Preserved | `sovereign stealth` — blocks telemetry, keeps comms |
| DARK | ❌ | Local | ❌ | `sovereign dark --force` — explicit only, total isolation |

**Safety invariant:** Communications never die unless you explicitly command DARK mode.

Components:
- `core.py` — Mode state machine, transition logic, health checks
- `firewall.py` — iptables rules for stealth/dark mode network control
- `cli.py` — Command-line interface (`sovereign status`, `sovereign stealth`, `sovereign dark`)
- `tui.py` — Rich terminal dashboard with live status monitoring

## Resilience Layer

The resilience daemon (`resilience/`, 3 files, 1,494 lines) provides:

- **Model fallback:** Cloud copilot proxy → Ollama local. Auto-detects failure, switches transparently.
- **Degraded mode:** Redis flag `gdi:mode` tracks current state. All downstream consumers adapt.
- **Comms failsafe:** WhatsApp/Discord monitoring. IPC fallback when external comms fail.
- **Hardened IPC:** Filesystem-based inter-process communication for when sockets fail.
- **Process orchestration:** Health monitoring, restart policies, failure isolation.

## Capability Detection

On startup, the system (`capabilities.py`, 585 lines) scans the full runtime environment:

**What gets scanned:**
- Hardware: RTL-SDR USB dongles, GPU (NVIDIA/Intel/AMD), USB devices
- Software: 22 tools checked (rtl_sdr, skyfield, torch, numpy, scipy, sox, ffmpeg, GNU Radio, etc.)
- Data sources: TLE cache age/count, signal recordings, ML model availability
- API keys: auto-detected from `.env`
- API reachability: CelesTrak, SatNOGS, OpenSky, USGS, Copernicus, WebSDR, AISStream

**Classification tiers:**

| Tier | Requirements |
|------|-------------|
| SOVEREIGN | RTL-SDR hardware + Skyfield + GNU Radio. Full air-gap capable. |
| ENHANCED | RTL-SDR hardware + Skyfield. Hardware present, partial signal processing. |
| API | Skyfield or TLE cache. No local hardware. API-fed only. |
| MINIMAL | Bare minimum. Cached/static data only. |

Cached to `data/capabilities.json` (1-hour TTL). Force rescan via `/api/capabilities/refresh`.

## MQTT Bridge

Full MQTT bridge (`mqtt_bridge.py`, 631 lines) for real-time data pipeline:

```
gdi/flights/live          — ADS-B state vectors
gdi/seismic/events        — Earthquake events
gdi/satellites/tle        — TLE updates
gdi/satellites/passes     — Pass predictions
gdi/satx/detections       — Signal detections
gdi/satx/recordings       — Recording metadata
gdi/satx/status           — SATx station status
gdi/alerts/#              — Alert pipeline
gdi/system/heartbeat      — Health heartbeats
gdi/system/command        — Command channel
```

Bridges MQTT ↔ PostgreSQL (persistence) ↔ Redis (cache) ↔ WebSocket (push) ↔ FastAPI.

## API Reference

### Authentication
| Endpoint | Auth | Description |
|----------|:----:|-------------|
| `POST /api/auth/login` | No | Get JWT token (username + password) |
| `POST /api/auth/users` | Admin | Create user with role |
| `GET /api/auth/me` | Yes | Current user info |

### Flight Data
| Endpoint | Auth | Description |
|----------|:----:|-------------|
| `GET /api/flights` | Yes | Live flights. `?format=native` for full fields. Supports bbox filtering. |
| `GET /api/flights/status` | Yes | Source health, aircraft count, per-source metrics |

### Seismic Data
| Endpoint | Auth | Description |
|----------|:----:|-------------|
| `GET /api/seismic` | Yes | USGS earthquakes. `?period=hour\|day\|week\|month` |

### Satellite Data
| Endpoint | Auth | Description |
|----------|:----:|-------------|
| `GET /api/satellites/tle` | Yes | TLE data. `?group=stations\|gps\|starlink...` |
| `GET /api/satellites/tle/groups` | Yes | Available satellite groups |
| `GET /api/satellites/catalog` | Yes | Full 65K catalog. Filter by `?type=`, `?country=`, `?orbit=`, `?name=` |
| `GET /api/satellites/catalog/search` | Yes | Search by name or NORAD ID (`?q=`) |
| `GET /api/satellites/catalog/summary` | Yes | Catalog statistics — counts by type, orbit, country |

### Event Intelligence
| Endpoint | Auth | Description |
|----------|:----:|-------------|
| `GET /api/events/gdelt` | Yes | GDELT conflict events. Filter by `?severity=`, `?type=`, `?hours=`, `?lat=&lon=&radius=` |
| `GET /api/events/gdelt/summary` | Yes | Event counts by type and severity |

### Environmental Intelligence
| Endpoint | Auth | Description |
|----------|:----:|-------------|
| `GET /api/enviro/fires` | Yes | NASA FIRMS fire hotspots. Filter by `?lat=&lon=&radius=`, `?min_confidence=` |
| `GET /api/enviro/disasters` | Yes | GDACS disaster alerts |
| `GET /api/enviro/summary` | Yes | Combined environmental intelligence summary |

### Intelligence Search
| Endpoint | Auth | Description |
|----------|:----:|-------------|
| `GET /api/intelligence/search` | Yes | Unified HEKTOR + spatial search |
| `GET /api/intelligence/proximity` | Yes | "What's near this point?" across all layers |
| `GET /api/intelligence/timeline` | Yes | Events in a region over a time range |
| `GET /api/intelligence/measure` | Yes | Distance/area measurement |
| `GET /api/intelligence/stats` | Yes | Ingest pipeline statistics |

### Correlation
| Endpoint | Auth | Description |
|----------|:----:|-------------|
| `GET /api/correlation/events` | Yes | Cross-layer correlation events |
| `GET /api/correlation/stats` | Yes | Correlation engine statistics |

### Alerts
| Endpoint | Auth | Description |
|----------|:----:|-------------|
| `GET /api/alerts` | Yes | Alert history. Filter by severity, type, acknowledged status |
| `POST /api/alerts/acknowledge/{id}` | Yes | Acknowledge an alert |
| `GET /api/alerts/rules` | Yes | Active alert rules |
| `POST /api/alerts/rules` | Yes | Create alert rule (threshold type) |
| `GET /api/alerts/stats` | No | Alert statistics |

### VALKYRIE AI
| Endpoint | Auth | Description |
|----------|:----:|-------------|
| `POST /api/ai/query` | Yes | Ask VALKYRIE anything (returns complete response) |
| `POST /api/ai/query/stream` | Yes | Streaming VALKYRIE response (SSE) |
| `POST /api/ai/fly-to` | Yes | Move camera to location (geocoding + broadcast) |
| `POST /api/ai/layer` | Yes | Toggle layer via API |
| `POST /api/ai/filter` | Yes | Set visual filter via API |
| `POST /api/ai/analyze` | Yes | Multi-source region analysis |
| `POST /api/ai/capture` | Yes | Screenshot current view |

### System
| Endpoint | Auth | Description |
|----------|:----:|-------------|
| `GET /api/status` | No | System status — uptime, source health, counts |
| `GET /api/capabilities` | No | Auto-detected capability profile |
| `POST /api/capabilities/refresh` | No | Force capability rescan |
| `GET /api/config/frontend` | No | Frontend config (Cesium token, Google key, feature flags) |
| `GET /api/intel/stream` | Yes | Intelligence feed (`?limit=N`, `?severity=`, `?worker=`) |
| `GET /api/intel/workers` | Yes | Worker health details |
| `GET /api/audit` | Admin | Audit log (`?limit=N`) |

### WebSocket
| Endpoint | Auth | Description |
|----------|:----:|-------------|
| `WS /ws?token=JWT` | Token | Real-time push — flights, alerts, intel, VALKYRIE streaming, correlation events |

Message types: `flights`, `alert`, `correlation`, `intel`, `ai_event`, `pong`, `subscribed`.

## Quick Start

```bash
git clone https://github.com/amuzetnoM/gdi.git
cd gdi
pip install -r backend/requirements.txt
cd backend && python3 server.py
# → http://localhost:8600  |  admin / valkyrie
```

Start intelligence workers:
```bash
cd backend && python3 -m workers.orchestrator
```

Start sovereign mode monitor:
```bash
python3 sovereign/cli.py status
python3 sovereign/cli.py tui        # Live terminal dashboard
```

## Stack

| Layer | Technology |
|-------|-----------|
| Globe | CesiumJS 1.138 (local bundle, no CDN) |
| Orbital mechanics | satellite.js SGP4/SDP4 (client), Skyfield (server) |
| Backend | FastAPI, Python 3.13, uvicorn, aiohttp |
| Cache | Redis (optional — degrades to filesystem) |
| Database | SQLite (VALKYRIE memory), PostgreSQL (optional, via MQTT bridge) |
| Fast inference | Cerebras llama3.1-8b via HuggingFace Router (~10ms) |
| Deep inference | SambaNova DeepSeek-V3-0324 via HuggingFace Router (~2s) |
| AI analyst | Claude (tool-calling, WebSocket streaming, session memory) |
| Auth | JWT + PBKDF2-SHA256, role-based (admin/commander/analyst/viewer) |
| Alerting | Geofence + threshold + anomaly + proximity, WebSocket + Discord broadcast |
| Correlation | Spatial + temporal + spatiotemporal + pattern + convergence detection |
| Geospatial | Pure-Python (haversine, bearing, spatial index, point-in-polygon) |
| Semantic memory | HEKTOR (BM25 + 384d vector hybrid search, C++ daemon) |
| Resilience | Sovereign daemon (5 operating modes), model fallback, comms failsafe |
| MQTT | Paho MQTT bridge for hardware integration (SDR, feeders) |
| Discord | py-cord bot adapter, slash commands, rich embed intel broadcast |
| Post-processing | 4 custom GLSL fragment shaders (CRT, NVG, FLIR) |

## Requirements

- Python 3.11+
- A browser with WebGL
- ~200MB disk
- Redis (optional — filesystem fallback)
- Zero API keys to start (add keys to unlock more sources)

## License

Proprietary — © 2026 Artifact Virtual. All rights reserved.

GDI is proprietary software developed by Artifact Virtual. Access is granted exclusively through official channels. No part of this codebase may be reproduced, distributed, or deployed without written authorisation from Artifact Virtual.

---

<p align="center">
  <strong>Artifact Virtual © 2026</strong>
</p>
