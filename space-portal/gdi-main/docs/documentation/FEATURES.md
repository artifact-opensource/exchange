# GDI/VALKYRIE — Technical Features Document

**Version:** 1.0  
**Date:** 2026-03-01  
**Classification:** Internal — Artifact Virtual  
**Authors:** Artifact Virtual

---

## 1. System Overview

GDI (Global Defense Initiative) is a real-time planetary intelligence platform built on the VALKYRIE backend framework. It renders live multi-source intelligence data on a CesiumJS 3D globe with military-aesthetic HUD overlays and GLSL post-processing filters.

The system aggregates data from 16+ live sources across 8 intelligence modules, deduplicates and cross-references in real-time, and presents everything through a single authenticated interface. It operates across four capability tiers — from full sovereign (air-gap capable with local SDR hardware) to API-only mode — degrading gracefully at every level.

**Key Metrics:**
- ~14,800 lines of application code across 40+ source files
- 15,256 tracked orbital objects
- 6 parallel flight data sources with automatic failover
- 6 financial market data feeds
- 4 GLSL post-processing filters
- 5 resilience operating modes
- Sub-second WebSocket push for real-time updates

---

## 2. Intelligence Modules

VALKYRIE organizes capabilities into 8 intelligence modules. Each module is independently classified as ACTIVE, DEGRADED, or OFFLINE based on available hardware, software, and API access.

### Module Status Matrix

| Module | Name | Current Status | Primary Sources | Fallback |
|--------|------|:--------------:|-----------------|----------|
| **SIGINT** | Signal Intelligence | ⚠️ Degraded | RTL-SDR hardware | WebSDR, SatNOGS API |
| **GEOINT** | Geospatial Intelligence | ✅ Active | Skyfield + SGP4, 15,256 TLEs | CelesTrak API |
| **OSINT** | Open Source Intelligence | ✅ Active | NewsAPI, RSS (Reuters/BBC) | Web scraping |
| **FININT** | Financial Intelligence | ✅ Active | Binance, Alpha Vantage, FRED, Economic Calendar, MarketFlow, NewsAPI | Public market data |
| **PREDICT** | Statistical Analysis | ⚠️ Degraded | NumPy, SciPy (classical) | — (needs PyTorch/TF for full) |
| **REPAIR** | Self-Healing & Monitoring | ✅ Active | Process management | Always available |
| **MARITIME** | Ship Tracking (AIS) | ⚠️ Degraded | AISStream API | Cached/scraped |
| **IMAGERY** | Satellite Imagery | ❌ Offline | Copernicus Sentinel | Needs authentication |

### Module Details

#### SIGINT — Signal Intelligence
- **Sovereign mode:** RTL-SDR dongle → local RF capture → signal classification → anomaly detection
- **Degraded mode:** WebSDR remote receivers + SatNOGS observation database queries
- **Upgrade path:** Plug in RTL-SDR USB dongle → auto-detected → module goes ACTIVE
- **Tools:** rtl_sdr, rtl_fm, rtl_tcp, GNU Radio, gr-satellites, multimon-ng

#### GEOINT — Geospatial Intelligence
- **Orbital computation:** Skyfield + SGP4 for high-precision satellite position propagation
- **TLE database:** 15,256 objects from CelesTrak (active, stations, weather, NOAA, cubesat, amateur, cosmos, iridium, science, geodetic, engineering, education)
- **Refresh:** TLE cache auto-refreshes from CelesTrak; cached locally for offline operation
- **Frontend:** satellite.js renders real-time positions on the 3D globe with ground tracks

#### FININT — Financial Intelligence
- **Binance:** Real-time crypto tickers, order books, trade history across 1,500+ trading pairs
- **Alpha Vantage:** Stocks, forex, crypto, economic indicators, technical analysis
- **FRED:** 800,000+ macroeconomic time series (GDP, CPI, unemployment, interest rates, money supply)
- **Economic Calendar:** Central bank decisions, earnings dates, economic releases
- **MarketFlow:** All-in-one market data aggregation via RapidAPI
- **NewsAPI:** Global news from 150,000+ sources for sentiment analysis

#### PREDICT — Statistical Analysis & Anomaly Detection
- **Available:** NumPy + SciPy for classical statistical methods (z-scores, moving averages, correlation matrices, Fourier analysis)
- **Missing:** PyTorch/TensorFlow for deep learning models (time series forecasting, anomaly classification)
- **Upgrade path:** Install PyTorch → module goes ACTIVE

---

## 3. Capability Detection System

The capability detection system (`capabilities.py`, 585 lines) implements transformer-style auto-configuration. On startup or API request, it scans the entire runtime environment and builds a capability profile.

### Detection Pipeline

```
Hardware Scan → Software Scan → Data Source Scan → API Reachability → Tier Classification → Module Assignment
```

### Four-Tier Classification

| Tier | Requirements | Description |
|------|-------------|-------------|
| **SOVEREIGN** | RTL-SDR hardware + Skyfield + GNU Radio | Full air-gap capable. Local RF capture, orbital computation, signal processing. |
| **ENHANCED** | RTL-SDR hardware + Skyfield | Hardware present but missing some signal processing tools. |
| **API** | Skyfield or TLE cache | No local hardware. API-fed intelligence from remote sources. |
| **MINIMAL** | Bare minimum | No orbital tools, no TLE data. Cached/static data only. |

### What Gets Scanned

**Hardware:**
- RTL-SDR USB dongles (via `rtl_test`)
- GPU (NVIDIA via `nvidia-smi`, Intel/AMD via `lspci`)
- USB device enumeration

**Software (22 tools checked):**
- SDR: rtl_sdr, rtl_tcp, rtl_fm, gqrx, gnuradio, gr-satellites, multimon-ng
- Satellite: skyfield, sgp4, gpredict
- ML/AI: torch, tensorflow, numpy, scipy, librosa
- Processing: sox, ffmpeg
- Project: SATx project directory

**Data Sources:**
- Local TLE cache (age, satellite count)
- SatNOGS observation cache
- Signal recordings inventory
- ML model availability
- API key detection from `.env` (Binance, Alpha Vantage, FRED, NewsAPI, etc.)

**API Reachability (optional, +5s):**
- CelesTrak, SatNOGS, OpenSky, USGS, Copernicus Sentinel, WebSDR, AISStream

### Caching

Capability profiles are cached to `data/capabilities.json` with a 1-hour TTL. The `/api/capabilities` endpoint returns cached results; `/api/capabilities/refresh` forces a full rescan.

---

## 4. Data Source Matrix

### Flight Intelligence (6 Sources)

| Source | Auth Required | Coverage | Specialty | Failover Priority |
|--------|:------------:|----------|-----------|:-----------------:|
| FlightRadar24 | No | Global, ~1,500/call | Type, registration, origin/dest | ★1 |
| ADSB.lol | No | Global (community) | Military transponders visible | ★2 |
| ADSB.one | No | Global (community) | Backup community feed | ★3 |
| ADS-B.fi | No | Europe-focused | Finnish community aggregator | ★4 |
| OpenSky Network | Optional | Global | origin_country, sensor data | ★5 |
| RapidAPI ADS-B Exchange | Yes | Global | Unfiltered military/government | ★6 |

### Geospatial Intelligence

| Source | Auth | Data | Update |
|--------|:----:|------|:------:|
| CelesTrak | No | TLE orbital elements (15,256 objects) | Daily |
| Skyfield | Local | High-precision ephemeris computation | Real-time |
| USGS | No | Global seismic events | 60s |

### Financial Intelligence

| Source | Auth | Data | Update |
|--------|:----:|------|:------:|
| Binance | API Key | Crypto tickers, order books, 1,500+ pairs | Real-time |
| Alpha Vantage | API Key | Stocks, forex, crypto, technicals | 15s–60s |
| FRED | API Key | 800,000+ macro time series | Daily |
| Economic Calendar | RapidAPI | Economic events, central bank decisions | Daily |
| MarketFlow | RapidAPI | Aggregated market data | 30s |
| NewsAPI | API Key | 150,000+ news sources | 15min |

### Other Intelligence

| Source | Auth | Data | Update |
|--------|:----:|------|:------:|
| Insecam / Windy | No / API Key | Global webcam/CCTV feeds | 5s |
| Google Maps | API Key | Road traffic flow | 30s |
| WebSDR | No | Remote SDR receivers | Real-time |
| SatNOGS | No | Satellite observation database | Hourly |

---

## 5. Multi-Source Flight Aggregation

The flight aggregator (`flights.py`, 586 lines) implements a parallel-fetch, deduplicate-and-merge strategy that produces unified aircraft records no single source can provide.

### Fetch Strategy
1. All 6 sources fetched **in parallel** using `asyncio.gather`
2. Each source has independent health tracking with exponential backoff (30s → 60s → 120s → 240s → 600s max)
3. Failed sources are temporarily disabled; recovering sources auto-re-enable

### Deduplication
- Primary key: ICAO 24-bit hex address (globally unique per aircraft)
- Secondary dedup: callsign + approximate position for sources without ICAO

### Field Merging
```
FR24 provides:    callsign, type, registration, origin, destination
ADSB.lol adds:    military transponders, alt_geom, baro_rate
ADSB.one adds:    backup coverage, category codes
OpenSky adds:     origin_country, sensor data, geometric altitude
ADS-B Exchange:   unfiltered military data, emergency codes
```

### Degradation Chain
1. All sources available → richest possible picture
2. FR24 down → community feeds still provide coverage
3. All APIs down → serves last known good from Redis/file cache
4. Redis down → file cache on disk
5. Disk cache expired → empty response with 503

---

## 6. Authentication & Role-Based Access Control

### JWT Architecture
- PBKDF2-SHA256 password hashing with random salt
- JWT tokens with configurable expiry
- All API access audit-logged (user, action, timestamp, IP)

### Role Hierarchy

| Role | Flights | Seismic | Satellites | SATx | CCTV | FININT | Search | Audit | User Mgmt |
|------|:-------:|:-------:|:----------:|:----:|:----:|:------:|:------:|:-----:|:---------:|
| **admin** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **commander** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| **analyst** | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ | ✅ | ❌ | ❌ |
| **viewer** | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

---

## 7. Visual Processing Pipeline

Four custom GLSL fragment shaders applied to the entire CesiumJS scene framebuffer in real-time:

| Filter | Technique | Effect |
|--------|-----------|--------|
| **NORMAL** | No post-processing | Clean render |
| **CRT** | Scanlines + phosphor tint + vignette | Cathode-ray tube monitor simulation |
| **NVG** | Green channel extraction + noise grain + bloom + barrel distortion | Night vision goggle simulation |
| **FLIR** | Luminance → heatmap color ramp (black→blue→red→yellow→white) | Forward-looking infrared / thermal imaging |

All shaders are defined in `filters.js` (233 lines) and rendered via Cesium's `PostProcessStageCollection`.

---

## 8. Sovereign Mode

Five operating modes managed by the Sovereign subsystem:

| Mode | Internet | Inference | Comms | Trigger |
|------|:--------:|:---------:|:-----:|---------|
| **CLOUD** | ✅ | Cloud API | Full | Default |
| **DEGRADED** | ⚠️ | Local (Ollama) | Full | Cloud API unreachable |
| **OFFLINE** | ❌ | Local | IPC/filesystem | No internet detected |
| **STEALTH** | ⚠️ | Local | ✅ Preserved | `sovereign stealth` command |
| **DARK** | ❌ | Local | ❌ | `sovereign dark --force` (explicit only) |

**Safety Invariant:** Communications never die unless explicitly commanded to go DARK.

### Components
- `core.py` — Mode state machine, transition logic
- `firewall.py` — iptables rules for stealth/dark mode
- `cli.py` — Command-line interface
- `tui.py` — Rich terminal dashboard with live status

---

## 9. Real-Time Communication

### WebSocket Architecture
- Token-validated WebSocket connections at `ws://host:8600/ws?token=JWT`
- Server-side broadcast manager for multi-client push
- Message types: `flights`, `alert`, `pong`, `subscribed`
- Client-side subscription filtering by layer

### Update Cadences

| Layer | REST Poll | WebSocket Push | Description |
|-------|:---------:|:--------------:|-------------|
| Flights | 10s | On change | Aircraft position updates |
| Seismic | 60s | On new event | Earthquake alerts |
| Satellites | 3s (client-side) | — | SGP4 propagation runs in browser |
| SATx | — | Real-time | Signal detections via MQTT bridge |
| FININT | 30s | Planned | Market data updates |

---

## 10. Roadmap

### Near-Term
- [ ] **FININT dashboard layer** — Market data rendered on globe (exchange locations, trade flow visualization)
- [ ] **FININT workers** — Background daemons continuously ingesting market data, detecting anomalies
- [ ] **LLM-powered analysis** — Lightweight model (DeepSeek/Qwen) for intel summarization and anomaly classification
- [ ] **OSINT feed aggregator** — Structured news/event ingestion with entity extraction

### Mid-Term
- [ ] **RTL-SDR integration** — Plug-and-play SDR hardware for sovereign SIGINT
- [ ] **Maritime AIS** — Ship tracking layer via AISStream
- [ ] **PREDICT ML models** — PyTorch-based time series forecasting and anomaly detection
- [ ] **Satellite imagery** — Copernicus Sentinel integration for Earth observation

### Long-Term
- [ ] **Multi-station mesh** — Distributed GDI nodes with federated data sharing
- [ ] **Autonomous alerting** — AI-driven alert generation with severity classification
- [ ] **Historical analysis** — Time-series replay of all intelligence layers
- [ ] **HUMINT integration** — Structured human intelligence reporting

---

## 11. Infrastructure

### Runtime Requirements

| Component | Version | Required |
|-----------|---------|:--------:|
| Python | 3.11+ | ✅ |
| Modern browser | Chrome/Firefox/Edge | ✅ |
| WebGL | 2.0+ | ✅ |
| Redis | 7.0+ | Optional |
| Skyfield | 1.54+ | Recommended |
| NumPy + SciPy | Latest | Recommended |

### Dependency Stack
- **Frontend:** CesiumJS 1.138, satellite.js, custom GLSL shaders
- **Backend:** FastAPI, uvicorn, aiohttp, PyJWT, PBKDF2
- **Data:** Redis (optional), SQLite (valkyrie.db), JSON file cache
- **Orbital:** Skyfield, SGP4, jplephem
- **Processing:** NumPy, SciPy, sox, ffmpeg

---

<p align="center">
  <strong>Artifact Virtual © 2026</strong><br>
  <em>VALKYRIE — Layer 5 of the Pathfinder Stack</em>
</p>
