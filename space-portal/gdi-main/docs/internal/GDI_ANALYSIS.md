# GDI + SATx: Gap Analysis, HEKTOR Integration, & Government Contract Roadmap

**Prepared by: Artifact Virtual — 2026-02-28**
**Classification: INTERNAL**

---

## 1. GDI — Current State Assessment

### What's Done (2,938 lines across 8 files)
| File | Lines | Status |
|------|-------|--------|
| `app.js` | 433 | ✅ Complete — bootstraps Cesium, binds all subsystems |
| `config.js` | 136 | ✅ Complete — all parameters configurable |
| `layers.js` | 659 | ✅ Complete — 5 data layers with full lifecycle |
| `satellites.js` | 254 | ✅ Complete — SGP4 propagator, 18 TLE hardcoded |
| `filters.js` | 233 | ✅ Complete — 4 GLSL post-processing shaders |
| `hud.js` | 188 | ✅ Complete — compass, crosshair, clocks, FPS, mouse coords |
| `style.css` | 843 | ✅ Complete — military-grade dark HUD aesthetic |
| `index.html` | 192 | ✅ Complete — full layout with all UI elements |

### Architecture Quality
- **Clean separation of concerns** — each layer is its own class with enable/disable/destroy
- **Real data feeds** — OpenSky Network (live ADS-B), USGS earthquake API (live seismic), SGP4 orbital propagation (real physics)
- **Graceful fallback chain** — Google 3D Tiles → Ion imagery → OpenStreetMap → NaturalEarth built-in
- **Click-for-details system** — contextual popups per entity type (aircraft, quake, satellite, CCTV, traffic)
- **GLSL shaders** — CRT (scanlines, chromatic aberration, phosphor), NVG (green phosphor, grain, goggle aperture), FLIR (7-stop thermal palette, Sobel edge enhancement)

### Gaps — What Palantir Has That We Don't (Yet)

#### 🔴 Critical (Must-Have for Government)

1. **Authentication & RBAC** — Zero auth right now. Government contracts require:
   - Multi-factor authentication
   - Role-based access control (Analyst, Commander, Admin, Viewer)
   - Session management, audit logging
   - CAC/PIV smart card support (DoD standard)

2. **Data Classification** — No concept of classification levels. Need:
   - UNCLASSIFIED / CUI / SECRET / TS markers on every data element
   - Cross-domain guard support
   - Data tagging and provenance tracking

3. **Backend Server** — Everything runs client-side. For government:
   - Server-side data processing and storage
   - Database (PostgreSQL + PostGIS for geospatial)
   - API gateway with rate limiting, auth, logging
   - WebSocket for real-time push (not polling)

4. **Encrypted Communications** — No TLS enforcement, no E2E encryption for data feeds

5. **Audit Trail** — Zero logging. Government requires:
   - Every action logged (who viewed what, when)
   - Immutable audit logs
   - SIEM integration capability

#### 🟡 Important (Differentiators)

6. **Multi-Source Intelligence Fusion** — Currently shows layers independently. Need:
   - Correlation engine: "Aircraft X was near seismic event Y at time Z"
   - Pattern detection across data sources
   - Timeline analysis and playback
   - Anomaly detection (ML-based)

7. **Alerting System** — No alerts. Need:
   - Configurable geofence alerts
   - Threshold-based triggers (earthquake > M5.0, military aircraft in zone)
   - Push notifications, SMS, email
   - Alert escalation chains

8. **Geospatial Analysis Tools** — Missing:
   - Measurement tools (distance, area, bearing)
   - Drawing/annotation on map
   - Layer import (KML, GeoJSON, Shapefile)
   - Heatmaps and density visualization

9. **Collaboration** — Single-user only. Need:
   - Shared operational pictures
   - Annotations visible to team
   - Chat/comms integration
   - Shift handoff capabilities

10. **Report Generation** — No export capability. Need:
    - PDF situation reports
    - Screenshot capture with annotations
    - Data export (CSV, JSON, GeoJSON)
    - Automated daily/weekly summaries

#### 🟢 Nice-to-Have (Future Phases)

11. **3D Indoor Mapping** — Building interiors, floor plans
12. **Video Integration** — Live camera feeds (the CCTV layer shows "FEED UNAVAILABLE" — make it real)
13. **Predictive Analytics** — ML forecasting (flight path prediction, seismic aftershock probability)
14. **Mobile App** — Responsive version + native mobile
15. **Offline Mode** — Disconnected operation with cached data
16. **Multi-Language** — i18n for allied nations

---

## 2. SATx — Assessment

### What It Is
A complete satellite ground station system: SDR hardware integration, orbital prediction, automated recording, ML signal detection, protocol decoding, and operational security (Ghost Mode).

### What's Real vs Scaffolded

| Component | Status | Readiness |
|-----------|--------|-----------|
| TLE Fetching (`fetch_tles.py`) | ✅ **Production-ready** | Downloads 12 catalog sources from CelesTrak, deduplicates, merges |
| Pass Prediction (`predict_passes.py`) | ✅ **Production-ready** | Skyfield/SGP4-based, filters by elevation, outputs JSON |
| Automated Scheduler (`scheduler.py`) | ✅ **Production-ready** | Full loop: predict → wait → record → process |
| I/Q Processing (`process_recording.py`) | ✅ **Production-ready** | FFT spectrogram, threshold detection, ML-based detection pipeline |
| Signal Detection CNN (`model.py`) | ⚠️ **Architecture done, untrained** | 4-layer CNN, ~16M params, needs labeled training data |
| Spectrum Scanner (`spectrum_scanner.py`) | ⚠️ **Scaffolded** | Frequency-based heuristic identification, no actual SDR calls yet |
| Ghost Mode (`ghost_mode.py`) | ✅ **Production-ready** | 3 privacy levels, secure delete (3-pass), trace cleaning, encryption |
| Transmission (`transmit.py`) | 🔴 **Placeholder** | Authorization framework exists but TX functions return False (by design — legal) |
| Web Dashboard (`app.py`) | ⚠️ **Basic Flask** | API endpoints work, needs richer frontend |
| SatNOGS Integration | ✅ **Production-ready** | Data download script for community observations |
| Docker Infrastructure | ✅ **Complete** | docker-compose with SDR + ML services |
| Tests | ✅ **38/38 passing** | Comprehensive unit + integration + e2e |

### The Brilliant Part
The info.md file is the real gem — it's a complete SIGINT/ELINT operations manual. Not theoretical. It describes:
- Finding "forgotten" satellites still transmitting
- Systematic scanning and classification
- Cross-referencing with SatNOGS community data
- Prioritization heuristics for target selection
- Legal/ethical framework for operations

This is **professional-grade signals intelligence methodology** documented in plain language.

---

## 3. Does HEKTOR Enhance This?

**Yes. Massively. Here's how:**

### For GDI:

| HEKTOR Capability | GDI Enhancement |
|---|---|
| **BM25 + Vector Hybrid Search** | Search across ALL intelligence data — flight records, seismic events, satellite passes — with natural language queries. "Show me military aircraft in a region when the M4.5 earthquake hit" |
| **Document Indexing** | Index every SIGINT observation, every alert, every analyst annotation. Build institutional memory. |
| **Semantic Memory** | Pattern recognition across time: "This is similar to the activity pattern we saw on [date]" |
| **Real-time Indexing** | As new data flows in (flights, quakes, satellite intercepts), HEKTOR indexes it immediately for correlation |

### For SATx:

| HEKTOR Capability | SATx Enhancement |
|---|---|
| **Signal Catalog** | Index every detected signal with full metadata. Search: "Find all BPSK signals between 435-438 MHz from the last 30 days" |
| **TLE Intelligence** | Index all TLE data + SatNOGS observations. Cross-reference: "Which satellites with decaying orbits are still transmitting?" |
| **Anomaly Memory** | Store every anomalous detection. Over time, HEKTOR builds a pattern library of what "normal" vs "interesting" looks like |
| **Operations Log** | Full searchable history of every observation, every Ghost Mode session, every scan |
| **Knowledge Base** | Index all the demodulation protocols, frequency allocations, satellite characteristics. Instant lookup during live operations |

### The Integration Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│    GDI      │◄────│   HEKTOR     │────►│    SATx     │
│ (Visualize) │     │  (Correlate) │     │  (Collect)  │
└─────────────┘     └──────────────┘     └─────────────┘
       ▲                   ▲                     │
       │                   │                     │
       └───────────────────┼─────────────────────┘
                           │
                     ┌─────────────┐
                     │   Analyst   │
                     │  (Decide)   │
                     └─────────────┘
```

**SATx collects signals → HEKTOR indexes and correlates → GDI visualizes on the globe.**

A satellite pass detected by SATx appears on GDI's globe in real-time, with HEKTOR providing the intelligence context: "This satellite was last observed by SatNOGS station #X, transmitting on 437.2 MHz, protocol AX.25, operator: [university], mission status: decommissioned but still powered."

---

## 4. Government Contract Readiness

### What Defense & Intelligence Clients Need

Sovereign defense establishments worldwide need:

1. **Situational Awareness** — Real-time picture of aerial, maritime, and space threats
2. **Border Monitoring** — Flight tracks, maritime corridors, cross-domain anomalies
3. **SIGINT** — Intercepting satellite transmissions over sovereign airspace
4. **Early Warning** — Seismic (nuclear test detection), ballistic missile tracking
5. **Operational Security** — Ghost Mode aligns perfectly with intelligence and military needs

### What We'd Offer vs Palantir

| Capability | Palantir Gotham | GDI + SATx + HEKTOR |
|---|---|---|
| Price | $50M+ annual | **Orders of magnitude cheaper** |
| Data Sovereignty | US company, FISA court access | **Local deployment, sovereign hardware** |
| Customization | Locked vendor ecosystem | **Full source access, unlimited customization** |
| SIGINT Integration | Separate product (MetaConstellation) | **Built-in with SATx** |
| Intelligence Search | Proprietary | **HEKTOR — our own technology** |
| Local Support | None in-country | **Deployed on your soil** |

### The Killer Differentiator

**Data sovereignty.**

No national defense or intelligence organization should route classified data through a US company's cloud. FISA Section 702 gives the US government legal authority to access any data processed by US companies. Palantir is literally a US intelligence contractor.

GDI + SATx + HEKTOR runs on sovereign soil, on sovereign hardware, under sovereign control. That's not a feature — that's a requirement.

### Roadmap to Contract-Ready

| Phase | Duration | Deliverable |
|---|---|---|
| **Phase 1: Core** | 4-6 weeks | Auth, RBAC, backend API, PostgreSQL/PostGIS, TLS, audit logging |
| **Phase 2: Intelligence** | 4-6 weeks | HEKTOR integration, correlation engine, alerting, reports |
| **Phase 3: SATx Integration** | 4-6 weeks | Live satellite feed on GDI globe, signal catalog, automated detection |
| **Phase 4: Hardening** | 4-6 weeks | Security audit, pen testing, air-gap deployment support, classification markings |
| **Phase 5: Demo** | 2 weeks | Polished demo for defense stakeholders |

**Total: ~5 months to demo-ready.**

---

## 5. Immediate Action Items

1. **Get Cesium Ion token** — Free, 30-second signup, unlocks the globe (requires browser account creation)
2. **Modify GDI to work token-free** — ✅ DONE (committed — falls back to OpenStreetMap + NaturalEarth)
3. **Stand up HEKTOR as GDI's search backend** — Wire HEKTOR's API into GDI for intelligence queries
4. **Build the bridge: SATx → HEKTOR → GDI** — SATx outputs → HEKTOR indexes → GDI visualizes
5. **Add authentication** — Even basic JWT auth puts us leagues ahead of where we are
6. **PostgreSQL + PostGIS** — Geospatial database for persistent intelligence storage

---

*"We are not Palantir. And frankly we are more intelligent."*
*Let's prove it.*

— Artifact Virtual
