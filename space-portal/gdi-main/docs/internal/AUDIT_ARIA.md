# GDI Audit Report — Full Gap Analysis & Upgrade Path
**Auditor:** CTO — Artifact Virtual
**Date:** 2026-03-01
**Scope:** Complete codebase review — 8 files, 4,698 lines
**Classification:** INTERNAL

---

## Executive Summary

GDI is a **production-quality intelligence visualization platform** with real data feeds, proper GLSL shaders, and clean architecture. It's not a prototype — it's a foundation. But it's a foundation with no walls: zero auth, zero persistence, zero backend, zero encryption. Everything runs client-side.

**Verdict:** 70% of the way to a government-ready demo. The remaining 30% is all backend + security — my lane.

---

## 1. FILE-BY-FILE AUDIT

### app.js (478 lines) — ✅ SOLID
- Clean bootstrap pattern, proper async init
- Graceful fallback chain: Google 3D → Ion → OSM → NaturalEarth
- Entity click handler with contextual popups per type
- **Gap:** No error boundary — one layer init failure could crash everything
- **Gap:** No loading states for layer initialization
- **Gap:** `_styleBuiltinWidgets()` is a no-op — just calls `timeline.resize()`
- **Fix:** Add try/catch per layer init, emit init status to HUD

### config.js (153 lines) — ✅ SOLID
- All parameters externalized — good practice
- Offline data paths defined (but no offline data exists yet)
- Sovereign mode works with empty tokens
- **Gap:** No runtime config validation — bad values silently break things
- **Gap:** No config override mechanism (URL params, localStorage)
- **Gap:** CCTV nodes are hardcoded capital cities — fine for demo, not for production
- **Fix:** Add `validateConfig()` on load, support `?config=` URL param

### layers.js (693 lines) — ✅ SOLID with gaps
- Each layer is self-contained with enable/disable/destroy lifecycle
- Flight layer: real OpenSky ADS-B, altitude-based coloring, track history, military detection
- Seismic layer: real USGS feed, magnitude scaling, exponential radius
- Satellite layer: proper SGP4 propagation, orbit drawing, type-based coloring
- CCTV layer: blinking markers, contextual popup
- Traffic layer: polyline segments with flow colors
- **Gap:** FlightLayer `_processStates` — stale tracks never cleaned if OpenSky stops returning them (only cleaned per-fetch, not by age)
- **Gap:** SeismicLayer rebuilds ALL entities on every fetch (`removeAll()` then re-add) — O(n) allocation every 60s
- **Gap:** SatelliteLayer orbit lines are drawn once and never updated — stale after ~90 min
- **Gap:** No error handling on individual entity creation — one bad data point kills the loop
- **Gap:** No offline fallback files actually exist in `data/` directories
- **Fix:** Add TTL-based cleanup, delta updates for seismic, periodic orbit refresh

### satellites.js (254 lines) — ⚠️ FUNCTIONAL BUT FRAGILE
- 18 hardcoded TLEs — will go stale in days
- Proper SGP4 via satellite.js — real physics, not approximation
- Orbit computation with period calculation from mean motion
- **Gap:** TLEs are static — no fetch from CelesTrak
- **Gap:** No epoch validation — propagating stale TLEs gives wrong positions silently
- **Gap:** Only 18 sats — SATx has access to full CelesTrak catalog (12 sources)
- **Gap:** No NORAD catalog number to TLE auto-update pipeline
- **Critical Fix:** Add TLE auto-fetch from CelesTrak API on layer enable, cache locally, validate epoch < 7 days

### filters.js (233 lines) — ✅ EXCELLENT
- CRT: screen curvature, chromatic aberration, scanlines, phosphor glow, vignette, flicker
- NVG: luminance conversion, green phosphor (#00ff41), grain noise, circular aperture mask
- FLIR: 7-stop thermal palette (black→blue→purple→red→orange→yellow→white), Sobel edge detection
- Clean FilterManager with add/remove lifecycle
- **Gap:** No GLSL error handling — shader compile failure = black screen with no feedback
- **Gap:** Missing IR (infrared) filter — useful for night operations
- **Gap:** CRT hard-codes screen resolution assumptions in `curveUV`
- **Fix:** Add shader compile error catch + fallback, add IR filter, make curvature responsive

### hud.js (188 lines) — ✅ GOOD
- Compass rose with heading tracking
- Dual clocks (UTC + local)
- FPS counter, camera altitude, mouse coordinates in DMS format
- Layer status indicators
- **Gap:** No minimap/overview
- **Gap:** No data staleness indicator (when was each layer last updated?)
- **Gap:** Mouse coordinates don't show terrain elevation
- **Fix:** Add "STALE" warning per layer if no update in 2x interval, add terrain elevation lookup

### satx-layer.js (747 lines) — ✅ EXCELLENT
- Full SATx integration: detections, live passes, alerts, WebSocket
- Pulsing detection markers with SNR-based sizing
- Live satellite tracking via SGP4 during passes
- Pass arc rendering (ground track)
- Alert notification system with severity levels, dismiss, auto-acknowledge
- WebSocket with exponential backoff reconnection
- **Gap:** No authentication on API calls — anyone can hit the endpoints
- **Gap:** No data validation on API responses — trusts server completely
- **Gap:** `_processDetections` doesn't handle coordinate projection errors gracefully
- **Gap:** Alert container created dynamically but never cleaned up on disable
- **Fix:** Add auth headers, response validation, cleanup on disable

### style.css (843 lines) + satx-style.css — ✅ EXCELLENT
- Military-grade dark aesthetic — consistent color palette
- Proper layering with z-index management
- Responsive sidebar
- Share Tech Mono throughout — correct for HUD aesthetic
- **Gap:** Not responsive below 1200px — sidebar overlaps globe
- **Gap:** No print stylesheet for report generation
- **Fix:** Add media queries for tablet/mobile, add @media print

### index.html (204 lines) — ✅ CLEAN
- Semantic structure, proper script load order
- All UI elements present
- **Gap:** No Content Security Policy meta tag
- **Gap:** No viewport meta for mobile
- **Gap:** No `<noscript>` fallback
- **Fix:** Add CSP, viewport meta, noscript message

---

## 2. CRITICAL GAPS (Priority Order)

### P0 — Must Fix Now

| # | Gap | Impact | Effort |
|---|-----|--------|--------|
| 1 | **No backend** — everything client-side | Can't persist data, can't scale, can't secure | 2 weeks |
| 2 | **No authentication** | Anyone with the URL has full access | 3 days |
| 3 | **No TLE auto-update** | Satellite positions drift within days | 1 day |
| 4 | **No audit logging** | Government contracts require full audit trail | 3 days |
| 5 | **No TLS enforcement** | Data in transit is unencrypted | 1 day |

### P1 — Must Fix This Month

| # | Gap | Impact | Effort |
|---|-----|--------|--------|
| 6 | **No correlation engine** | Layers are independent — can't cross-reference events | 1 week |
| 7 | **No alerting system** | No geofence alerts, no threshold triggers | 1 week |
| 8 | **No data persistence** | Refresh = lose everything | 3 days |
| 9 | **Seismic full-rebuild per fetch** | Performance degrades with event count | 2 hours |
| 10 | **No offline data cache** | Paths configured but no actual cache files | 2 days |

### P2 — Should Fix This Quarter

| # | Gap | Impact | Effort |
|---|-----|--------|--------|
| 11 | **No RBAC** | Single user mode only | 1 week |
| 12 | **No data classification markings** | Government requirement | 3 days |
| 13 | **No report generation** | Can't export PDF/CSV | 1 week |
| 14 | **No measurement tools** | Can't measure distance/area/bearing | 3 days |
| 15 | **No drawing/annotation** | Can't mark up the globe | 1 week |

---

## 3. UPGRADE RECOMMENDATIONS

### 3.1 Backend Architecture

```
┌──────────────────────────────────────────┐
│              GDI Frontend                │
│         (Cesium + layers + HUD)          │
└──────────────┬───────────────────────────┘
               │ HTTPS + WSS
┌──────────────▼───────────────────────────┐
│           API Gateway (FastAPI)          │
│  • JWT auth  • Rate limiting  • CORS    │
│  • Request logging  • Input validation   │
├──────────────────────────────────────────┤
│         Service Layer                    │
│  ┌─────────┐ ┌──────────┐ ┌───────────┐ │
│  │ Flight  │ │ Seismic  │ │ Satellite │ │
│  │ Service │ │ Service  │ │ Service   │ │
│  └────┬────┘ └────┬─────┘ └─────┬─────┘ │
│  ┌────┴────┐ ┌────┴─────┐ ┌─────┴─────┐ │
│  │ SATx    │ │ Correlat │ │ Alert     │ │
│  │ Service │ │ Engine   │ │ Service   │ │
│  └─────────┘ └──────────┘ └───────────┘ │
├──────────────────────────────────────────┤
│         Data Layer                       │
│  ┌──────────────┐  ┌──────────────────┐  │
│  │ PostgreSQL   │  │ HEKTOR           │  │
│  │ + PostGIS    │  │ (Semantic Search) │  │
│  └──────────────┘  └──────────────────┘  │
│  ┌──────────────┐  ┌──────────────────┐  │
│  │ Redis        │  │ TimescaleDB      │  │
│  │ (Cache/PubSub│  │ (Time-series)    │  │
│  └──────────────┘  └──────────────────┘  │
└──────────────────────────────────────────┘
```

### 3.2 Immediate Code Fixes

**satellites.js — Auto TLE fetch:**
```javascript
async _fetchTLEs() {
    const sources = [
        'https://celestrak.org/NORAD/elements/gp.php?GROUP=stations&FORMAT=tle',
        'https://celestrak.org/NORAD/elements/gp.php?GROUP=gps-ops&FORMAT=tle',
        'https://celestrak.org/NORAD/elements/gp.php?GROUP=starlink&FORMAT=tle',
        'https://celestrak.org/NORAD/elements/gp.php?GROUP=active&FORMAT=tle',
    ];
    // Parse TLE pairs, validate epoch, replace SAT_CATALOG
}
```

**layers.js — Delta updates for seismic:**
```javascript
_processFeatures(features) {
    const seen = new Set();
    for (const f of features) {
        seen.add(f.id);
        if (this._existingIds.has(f.id)) continue; // Skip existing
        // ... create new entity
        this._existingIds.add(f.id);
    }
    // Remove only entities no longer in feed
    for (const id of this._existingIds) {
        if (!seen.has(id)) {
            this.dataSource.entities.removeById(`quake_${id}`);
            this._existingIds.delete(id);
        }
    }
}
```

### 3.3 New Filter — Infrared (IR)
```glsl
// Single-channel green-white IR with edge enhancement
void main() {
    vec2 uv = v_textureCoordinates;
    vec3 col = texture(colorTexture, uv).rgb;
    float lum = dot(col, vec3(0.299, 0.587, 0.114));
    lum = pow(lum, 0.6); // Boost shadows
    vec3 ir = mix(vec3(0.0, lum * 0.3, 0.0), vec3(lum), lum);
    // Edge enhancement
    float edge = /* Sobel */ ;
    ir += vec3(edge * 0.3);
    out_FragColor = vec4(ir, 1.0);
}
```

---

## 4. SECURITY HARDENING

### Immediate (Tonight)
- [ ] Add Content Security Policy to index.html
- [ ] Remove any API keys from committed code (config.js tokens are empty ✅)
- [ ] Add `.env` for secrets, `.gitignore` it
- [ ] Enable HTTPS on any deployment

### This Week
- [ ] Implement JWT authentication (FastAPI backend)
- [ ] Add CORS whitelist (only our domains)
- [ ] Add rate limiting on all API endpoints
- [ ] Implement request logging with immutable audit trail

### This Month
- [ ] RBAC: Analyst, Commander, Admin, Viewer roles
- [ ] Session management with timeout
- [ ] Input sanitization on all user inputs (search box is XSS-vulnerable)
- [ ] CSP headers on backend responses

---

## 5. WHAT THE FRONTEND GOT RIGHT

Credit where due — this is genuinely impressive work:

1. **Architecture** — Clean layer separation means we can add backend without rewriting frontend
2. **Real data** — Not mock data. Real ADS-B, real USGS, real SGP4 physics
3. **GLSL shaders** — Production-quality post-processing, not CSS filter hacks
4. **SATx integration** — The 747-line satx-layer.js is the most complete file. WebSocket, reconnection, alerts, pulsing markers. This is what makes GDI not-a-toy
5. **Fallback chain** — Works with zero API keys. That's sovereign design
6. **Config externalization** — Everything configurable. No magic numbers in logic code

---

## 6. WHAT I'M BUILDING

I'm taking responsibility for the backend spine:

1. **FastAPI server** with JWT auth, RBAC, audit logging
2. **PostgreSQL + PostGIS** for geospatial persistence
3. **HEKTOR integration** for semantic intelligence search
4. **WebSocket server** for real-time push to all connected clients
5. **Correlation engine** — cross-reference events across layers
6. **TLE auto-fetch pipeline** — CelesTrak → validate → cache → serve
7. **Alert system** — geofence, threshold, escalation chain
8. **Report generation** — PDF situation reports with map snapshots

**Timeline: Phase 1 (backend core) in 2 weeks. Phase 2 (HEKTOR + correlation) in 4 weeks.**

---

*The eyes are the frontend. The spine is the backend. Together: Valkyrie.*

— CTO, Artifact Virtual
