# GDI v2.0 — OVERHAUL BLUEPRINT

**Codename: OMNISCIENT**
**Date: 2026-03-05**
**Authors: Ali Shakil & AVA Shakil — Artifact Virtual**
**Classification: INTERNAL**

---

## Thesis

Open. Free. Sovereign. The anti-Palantir. A global intelligence platform that runs on your hardware, under your laws, with zero US corporate dependencies. Not a product — a public good.

FISA Section 702 gives the US government legal authority to access any data processed by US companies. Every intelligence platform sold by a US company (Palantir, Recorded Future, Babel Street) is structurally compromised for non-US nations. GDI dissolves this dependency entirely.

---

## 1. DATA SOURCES — The Nervous System

### 1.1 VESSEL TRACKING (MARITIME DOMAIN AWARENESS) 🚢

**Priority: CRITICAL — Ali's directive**

| Source | Type | Cost | Coverage | Update | Format |
|--------|------|------|----------|--------|--------|
| **AISHub** | Community AIS exchange | FREE (reciprocal) | Global, 66K+ vessels, 1,405 stations | Real-time | JSON/XML/CSV |
| **NOAA Marine Cadastre** | US Gov historical | FREE | US waters (EEZ) | Annual bulk | CSV (110GB/yr) |
| **Global Fishing Watch** | NGO | FREE (reg+key) | Global oceans | Near real-time | JSON REST |
| **UN Global Platform AIS** | UN | FREE (academic/gov) | Global | Historical | CSV |
| **Danish Maritime Auth** | Government | FREE | Danish waters | Real-time | JSON |
| **BarentsWatch** | Norwegian Gov | FREE | Arctic/Norwegian | Real-time | JSON REST |
| **OpenSeaMap** | Open source | FREE (ODbL) | Global nautical charts | Community | OSM format |
| **RTL-SDR AIS Receiver** | DIY hardware | $25 one-time | 50nm radius from antenna | Real-time | NMEA 0183 |
| **Spire Maritime** | Satellite AIS | Free tier avail | Global (incl. open ocean) | Minutes | JSON API |

**Implementation priority:**
1. AISHub API (immediate — register, get username, start polling)
2. RTL-SDR local receiver (sovereign — no API dependency, covers Arabian Sea/Karachi port)
3. Global Fishing Watch (registration, API key, wire into workers)
4. NOAA bulk for historical analysis/training data

**RTL-SDR AIS Setup:**
- Hardware: RTL-SDR v4 ($30) + marine VHF antenna
- Frequencies: 161.975 MHz (Ch 87B) + 162.025 MHz (Ch 88B)
- Software: `rtl_ais` or `gnuais` → decoded NMEA → GDI ingest
- Range: 50-80 nautical miles with good antenna placement
- This makes us a SOVEREIGN AIS station — zero internet dependency

### 1.2 SATELLITE & SPACE TRACKING 🛰️

**Current state:** 34 hardcoded TLEs in satellites.js
**Target state:** Full catalog (50,000+ objects) + deep space + lunar

| Source | What | Cost | Format | Update |
|--------|------|------|--------|--------|
| **CelesTrak** | 50,000+ TLEs (all cataloged objects) | FREE | TLE/JSON/XML/CSV/KVN | Every 30min |
| **Space-Track.org** | USSTRATCOM official catalog | FREE (registration) | TLE/JSON/XML | Near real-time |
| **N2YO API** | Satellite positions/passes | FREE (1000 req/hr) | JSON | Real-time |
| **NASA JPL Horizons** | Solar system bodies, deep space | FREE | JSON/text | On-demand |
| **JPL SBDB Close-Approach** | Asteroid/comet close approaches | FREE | JSON | Continuous |
| **JPL Fireball API** | Atmospheric fireballs/bolides | FREE | JSON | As detected |
| **NASA CNEOS** | Near-Earth Objects (Sentry) | FREE | JSON/CSV | Daily |
| **Minor Planet Center** | Asteroid orbits (1.3M+ objects) | FREE | MPC format | Daily |
| **NASA DSN Now** | Deep Space Network live status | FREE | XML/JSON | Real-time |
| **NOAA SWPC** | Space weather (solar wind, CME, Kp) | FREE | JSON/XML | 1-min |
| **SatNOGS** | Community ground station network | FREE | JSON API | Per observation |
| **ESA Discos** | Space debris database | FREE (reg) | REST API | Weekly |

**Deep Space Missions (trackable via DSN Now + Horizons):**
- Voyager 1 & 2 (interstellar)
- New Horizons (Kuiper Belt)
- JWST (L2 halo orbit)
- Parker Solar Probe (inner heliosphere)
- Juno (Jupiter)
- OSIRIS-APEX (Apophis flyby 2029)
- Chandrayaan-3 (Lunar)
- Chang'e 6 (Lunar far side)
- Artemis missions

**Lunar Globe:**
- **LROC WAC** (Lunar Reconnaissance Orbiter Camera) — 100m/px global mosaic, FREE
- **JAXA SELENE/Kaguya** — terrain model + 10m/px imagery, FREE
- **USGS Astrogeology** — processed lunar maps, DEM, geology
- CesiumJS supports custom terrain/imagery providers — wire lunar tiles as a separate globe view
- Track active lunar missions + historic landing sites

**Asteroid/Meteor Implementation:**
- JPL SBDB API for close approach data → render approach trajectories on globe
- CNEOS Sentry system → risk assessment for potentially hazardous objects
- Fireball API → plot atmospheric entry events (lat/lon + energy in kilotons)
- Minor Planet Center → full asteroid belt visualization (optional, compute-heavy)

### 1.3 INTELLIGENCE SOURCES (OSINT/FININT/SIGINT) 📡

| Source | Category | Cost | Format | Update |
|--------|----------|------|--------|--------|
| **GDELT Project** | Global events (conflicts, protests, diplomacy) | FREE | CSV/JSON/BigQuery | 15min |
| **ACLED** | Armed conflict events | FREE (academic/media) | CSV/JSON/GeoJSON | Weekly |
| **GDACS** | Disasters (earthquakes, floods, cyclones) | FREE | GeoJSON/RSS | Real-time |
| **USGS Earthquake** | Seismic events (already have) | FREE | GeoJSON | 1min |
| **NASA FIRMS/MODIS** | Active fire/thermal anomalies | FREE (API key) | CSV/JSON/GeoJSON | 3hr |
| **Sentinel-2** | Satellite imagery (10m resolution) | FREE | GeoTIFF | 5-day revisit |
| **Landsat 8/9** | Satellite imagery (30m resolution) | FREE | GeoTIFF | 16-day revisit |
| **NOAA Weather** | Global weather/forecasts | FREE | JSON/XML | Hourly |
| **OpenWeatherMap** | Weather API | FREE (1000 req/day) | JSON | varies |
| **AlienVault OTX** | Cyber threat intel (IoCs) | FREE | JSON/STIX | Continuous |
| **AbuseIPDB** | IP reputation/abuse reports | FREE (1000 req/day) | JSON | Real-time |
| **Shodan** | Internet-connected devices | FREE (limited) | JSON | Continuous |
| **CISA KEV** | Known Exploited Vulnerabilities | FREE | JSON/CSV | As published |
| **Reuters/AP/BBC RSS** | News headlines (already have) | FREE | RSS/XML | Minutes |
| **FRED** | US macroeconomic data (already have) | FREE | JSON | varies |
| **Binance** | Crypto markets (already have) | FREE | JSON/WS | Real-time |
| **OFAC/UN Sanctions** | Sanctions lists | FREE | CSV/XML | As updated |
| **Tor Exit Nodes** | Tor network topology | FREE | CSV/JSON | Hourly |
| **GreyNoise** | Internet scan/attack data | FREE (community) | JSON | Real-time |
| **ADS-B Exchange** | Aircraft (better than OpenSky) | FREE (community) | JSON | Real-time |

**Implementation priority:**
1. GDELT (15-min global event data — massive intelligence value)
2. ACLED (conflict tracking — directly relevant for defense)
3. NASA FIRMS (fire/thermal — conflict indicator, disaster response)
4. GDACS (multi-hazard disaster alerting)
5. Sentinel-2 imagery (free satellite photos — game changer)
6. ADS-B Exchange (replace/supplement OpenSky)
7. Cyber threat feeds (AlienVault + AbuseIPDB + CISA)

### 1.4 MESH & DARK COMMS (PIGGYBACK SIGNAL MODULATION) 📻

**Ali's vision: Bitcoin-style device-to-device without network**

| Protocol | Range | Bandwidth | Hardware | Open Source |
|----------|-------|-----------|----------|-------------|
| **LoRa/Meshtastic** | 10-80km (line of sight) | 0.3-50 kbps | $20 LoRa module (Heltec, TTGO) | ✅ |
| **HF Packet Radio (AX.25)** | Continental (skywave) | 1200-9600 baud | HF radio + TNC | ✅ |
| **JS8Call** | Continental+ | ~50 baud | HF radio + sound card | ✅ |
| **Bluetooth Mesh** | 100m per hop | 1 Mbps | Any BLE device | ✅ |
| **WiFi Direct** | 200m | 250 Mbps | Any WiFi device | ✅ |
| **APRS** | Regional (via digipeaters) | 1200 baud | VHF radio | ✅ |
| **Reticulum** | Any transport | Varies | Software-defined | ✅ |
| **Briar** | Tor/WiFi/BT mesh | Low | Android phone | ✅ |
| **Blockstream Satellite** | Global (one-way receive) | 64 kbps | $100 sat receiver | ✅ |
| **Audio modem (minimodem)** | Speaker range | 300 baud | Speaker + mic | ✅ |
| **QR relay** | Camera range | ~3KB per code | Any camera | N/A |

**The GDI Dark Comms Stack:**

```
┌─────────────────────────────────────────────────┐
│              FOUNDRY COURIER                     │
│   (Frame encoding, HMAC-SHA256, CRC32, XOR ECC) │
├─────────────────────────────────────────────────┤
│              TRANSPORT LAYER (pluggable)         │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌───────┐ │
│  │ LoRa │ │  HF  │ │  BT  │ │ WiFi │ │ Audio │ │
│  │ Mesh │ │Radio │ │ Mesh │ │Direct│ │ Modem │ │
│  └──────┘ └──────┘ └──────┘ └──────┘ └───────┘ │
├─────────────────────────────────────────────────┤
│              APPLICATION LAYER                   │
│  ┌──────────┐ ┌─────────┐ ┌──────────────────┐  │
│  │ GDI Intel│ │ Alerts  │ │ Blockchain Relay  │  │
│  │ Updates  │ │ & C2    │ │ (signed tx relay) │  │
│  └──────────┘ └─────────┘ └──────────────────┘  │
└─────────────────────────────────────────────────┘
```

**Meshtastic is the winner for Phase 1:**
- $20 TTGO T-Beam (ESP32 + LoRa + GPS)
- 10+ km range per hop, mesh repeating built in
- Encrypted (AES-256)
- Already has Python API for integration
- Solar-powered nodes possible → persistent mesh
- Foundry Courier frames fit inside LoRa packets (frame size configurable)

**Implementation:**
1. Order 3x TTGO T-Beam modules ($60 total)
2. Flash Meshtastic firmware
3. Write GDI ↔ Meshtastic bridge (Python, serial/BLE)
4. Foundry Courier as payload encoder — HMAC-authenticated intelligence frames
5. GDI receives mesh packets → ingests as data source → displays on globe
6. When internet dies: GDI nodes form autonomous mesh, share intelligence P2P

---

## 2. NEW LAYERS — The Senses

### 2.1 Vessel Layer (VesselLayer class)
```javascript
class VesselLayer {
    // AISHub polling (1/min rate limit)
    // RTL-SDR local feed (if hardware present)
    // Global Fishing Watch API
    // Entity types: cargo, tanker, fishing, military, passenger, unknown
    // Click info: MMSI, IMO, callsign, destination, draught, flag state
    // Trail rendering (past positions)
    // Geofence alerts (vessel enters zone)
    // Dark vessel detection (AIS gaps → suspicious)
}
```

### 2.2 Deep Space Layer (SpaceLayer class - expanded)
```javascript
class SpaceLayer {
    // CelesTrak full catalog (50K+ objects, auto-refresh every 30min)
    // Space-Track.org for authoritative data
    // JPL Horizons for deep space probes + planets
    // DSN Now for live mission communications
    // CNEOS for asteroid close approaches
    // Fireball events (plotted at impact lat/lon)
    // Space weather overlay (NOAA SWPC)
    // Lunar globe mode (LROC imagery + SELENE terrain)
    // Debris tracking (ESA Discos catalog)
}
```

### 2.3 Conflict/Event Layer (ConflictLayer class)
```javascript
class ConflictLayer {
    // GDELT 15-min event data
    // ACLED conflict events
    // GDACS multi-hazard alerts
    // Terrorism/insurgency events
    // Protest/civil unrest tracking
    // Sanctions entity geolocation
    // Color-coded severity (Goldstein scale from GDELT)
}
```

### 2.4 Environmental Layer (EnvLayer class)
```javascript
class EnvLayer {
    // NASA FIRMS fire hotspots (MODIS + VIIRS)
    // NOAA weather overlays
    // Ocean currents + sea surface temperature
    // Wildfire perimeter tracking
    // Flood monitoring (GDACS + Sentinel)
    // Volcanic activity (Smithsonian GVP)
}
```

### 2.5 Cyber Layer (CyberLayer class)
```javascript
class CyberLayer {
    // AlienVault OTX threat pulses → geolocated
    // Shodan exposed devices → plotted on globe
    // AbuseIPDB → attack source heat map
    // Tor exit nodes → network topology
    // GreyNoise scan data → attack pattern visualization
    // CISA KEV → vulnerability alerts
}
```

### 2.6 Imagery Layer (ImageryLayer class)
```javascript
class ImageryLayer {
    // Sentinel-2 (10m, 5-day revisit) — change detection
    // Landsat (30m, 16-day) — baseline comparisons
    // Custom AOI (area of interest) monitoring
    // Before/after comparison mode
    // NDVI vegetation index (detect construction, destruction)
    // Night light analysis (power grid status)
}
```

### 2.7 Mesh Network Layer (MeshLayer class)
```javascript
class MeshLayer {
    // Meshtastic node positions (GPS from each node)
    // Link quality between nodes
    // Message relay paths
    // Network coverage estimation
    // Offline/online status
    // Signal strength heat map
}
```

---

## 3. INTELLIGENCE ENGINE — The Brain

### 3.1 HEKTOR Integration
```
GDI Workers → Raw Data → HEKTOR Ingest → Indexed + Vectorized
                                              ↓
                                    Correlation Engine
                                              ↓
                              "Aircraft X near quake Y at time Z"
                              "Vessel dark for 6 hours near conflict zone"
                              "Fire hotspot pattern matches previous attack"
```

### 3.2 Cross-Layer Correlation
The killer feature nobody else does. HEKTOR enables:
- **Temporal correlation:** Events across layers within time windows
- **Spatial correlation:** Entities from different layers within geographic proximity
- **Pattern matching:** "This looks like [historical event]"
- **Anomaly detection:** Deviations from learned baselines

### 3.3 Virtual GPU Core (from today's paper)
The GPU-as-Code kernel powers:
- 10K-100K virtual threads pre-computing pattern detection
- Anomaly scoring pipelines running continuously
- Trajectory prediction (flight paths, vessel routes, orbital mechanics)
- Real-time fusion across all data layers
- SIMD-style parallelism without physical GPU

### 3.4 GLADIUS Local Inference
- Natural language queries: "Show me military vessels near Gwadar in the last 48 hours"
- Automated intelligence briefs
- Anomaly explanation
- Cross-source verification
- Zero cloud dependency

---

## 4. COMMUNICATION — The Voice

### 4.1 Normal Mode (Internet available)
- WebSocket push to all connected clients
- Discord integration (alerts, briefs, slash commands)
- MQTT internal bus (already built)
- API endpoints for external consumers

### 4.2 Dark Mode (Internet down)
```
GDI Node A ←→ Meshtastic ←→ GDI Node B
     ↕              ↕              ↕
Foundry Courier  LoRa Mesh   Foundry Courier
     ↕              ↕              ↕
Blockchain Relay  HF Radio   Local Display
```

- Foundry Courier frames carry intelligence summaries
- HMAC-SHA256 authenticated — no forgery possible
- CRC32 + XOR parity error correction — survives noisy channels
- Signed blockchain transactions as immutable proof-of-communication
- Meshtastic mesh for tactical comms (10km+ range per hop)
- HF radio for continental reach (JS8Call weak-signal mode)
- Audio modem as ultimate fallback (speaker-to-microphone transfer)

---

## 5. SECURITY — The Shield

### 5.1 Already Built
- Ghost Mode (3 privacy levels, secure delete, trace cleaning)
- Stealth iptables chain (sovereign/firewall.py)
- 4-layer IPC failover (Unix socket → TCP → MQTT → filesystem)
- Resilience orchestrator
- Kali-native offensive/defensive toolkit

### 5.2 Needed
- JWT authentication + RBAC (Analyst/Commander/Admin/Viewer)
- TLS everywhere (internal + external)
- Audit logging (immutable, SIEM-ready)
- Data classification markings (UNCLASS/CUI/SECRET/TS)
- Air-gap deployment mode (zero outbound connections)
- CAC/PIV smart card support (DoD/military standard)
- Zero-knowledge proof for data provenance

---

## 6. ARCHITECTURE — The Skeleton

```
┌──────────────────────────────────────────────────────────────┐
│                         GDI v2.0                              │
│                       "OMNISCIENT"                            │
├──────────┬──────────┬──────────┬──────────┬─────────────────┤
│ FLIGHTS  │ VESSELS  │  SPACE   │ CONFLICT │  ENVIRONMENT    │
│ (ADS-B)  │  (AIS)   │ (TLE+)  │ (GDELT)  │  (FIRMS/WX)    │
├──────────┴──────────┴──────────┴──────────┴─────────────────┤
│                    CYBER     │     IMAGERY     │    MESH      │
│                 (OTX/Shodan) │  (Sentinel-2)   │ (Meshtastic) │
├──────────────────────────────┴─────────────────┴─────────────┤
│                     INTELLIGENCE ENGINE                       │
│  ┌──────────┐  ┌──────────────┐  ┌───────────┐  ┌─────────┐ │
│  │  HEKTOR  │  │ Correlation  │  │  Virtual  │  │ GLADIUS │ │
│  │ (Search) │  │   Engine     │  │ GPU Core  │  │  (LLM)  │ │
│  └──────────┘  └──────────────┘  └───────────┘  └─────────┘ │
├──────────────────────────────────────────────────────────────┤
│                      DATA LAYER                               │
│  PostgreSQL + PostGIS  │  Redis  │  MQTT  │  COMB  │  Files  │
├──────────────────────────────────────────────────────────────┤
│                      COMM LAYER                               │
│  WebSocket  │  Discord  │  Meshtastic  │  HF Radio  │  FC    │
├──────────────────────────────────────────────────────────────┤
│                     SECURITY LAYER                            │
│  Auth/RBAC  │  TLS  │  Ghost Mode  │  Audit  │  Stealth FW  │
└──────────────────────────────────────────────────────────────┘

FC = Foundry Courier
```

---

## 7. LICENSING & ACCESS STRATEGY

### License: Proprietary — © Artifact Virtual
- Hosted and controlled by Artifact Virtual
- Restricted access: government and authorised institutions only
- No public distribution — source shared only with contracted operators
- All deployments are AV-managed or AV-authorised

### Revenue Model
1. **Hosted deployment** — Artifact Virtual hosts; authorised orgs access via secure portal
2. **On-premise contracts** — AV-managed installation on sovereign infrastructure
3. **Support & SLA** — priority updates, custom integration, operational support
4. **Custom development** — bespoke layers, integrations, hardening for specific theatres

### What's Accessible (to authorised operators)
- Full source for audit purposes under NDA
- Deployment scripts and operational documentation
- HEKTOR correlation engine
- All data integrations

### What Stays with Artifact Virtual
- All IP, weights, and operational configurations
- GLADIUS weights and architecture
- Customer deployment data (obviously)

---

## 8. IMPLEMENTATION ROADMAP

### Phase 1: Data Flood (Week 1-2)
- [ ] VesselLayer: AISHub API integration
- [ ] CelesTrak full catalog → replace hardcoded TLEs
- [ ] GDELT worker (15-min polling)
- [ ] GDACS disaster alerts
- [ ] NASA FIRMS fire hotspots
- [ ] ADS-B Exchange (supplement OpenSky)
- [ ] JPL close-approach data (asteroids)

### Phase 2: Intelligence (Week 3-4)
- [ ] HEKTOR wired as correlation backend
- [ ] Cross-layer correlation engine
- [ ] Virtual GPU core integration
- [ ] Alerting system (geofence, threshold, pattern)
- [ ] Natural language queries via GLADIUS/Ollama

### Phase 3: Space Push (Week 5-6)
- [ ] Deep space mission tracking (DSN Now + Horizons)
- [ ] Lunar globe (LROC/SELENE imagery + CesiumJS)
- [ ] Space weather overlay (NOAA SWPC)
- [ ] Asteroid visualization
- [ ] Fireball/bolide events

### Phase 4: Dark Comms (Week 7-8)
- [ ] Meshtastic integration (order hardware, write bridge)
- [ ] Foundry Courier ↔ LoRa transport layer
- [ ] Offline intelligence sharing protocol
- [ ] Mesh network visualization on globe

### Phase 5: Hardening (Week 9-10)
- [ ] JWT auth + RBAC
- [ ] TLS enforcement
- [ ] Audit logging
- [ ] Air-gap deployment mode
- [ ] Security audit (Kali self-pentest)

### Phase 6: Hardened Launch
- [ ] Internal deployment documentation
- [ ] Access control portal (request access workflow)
- [ ] Operator onboarding guide
- [ ] Security audit sign-off

---

## 9. IMMEDIATE NEXT ACTIONS

1. **Register AISHub** — get API username, start receiving vessel data TODAY
2. **Register Space-Track.org** — get access to USSTRATCOM satellite catalog
3. **Write VesselLayer class** — AISHub polling → Cesium entities → click info
4. **Upgrade SatelliteLayer** — CelesTrak API (GP data JSON format) → 50K objects
5. **Add GDELT worker** — 15-minute global event ingestion
6. **Order 3x TTGO T-Beam** — $60 for mesh network hardware
7. **Wire HEKTOR** — correlation queries from GDI frontend

---

*"We are not Palantir. And frankly we are more intelligent."*
*Open. Free. Sovereign.*
*Two points. One vector.*

— Artifact Virtual
