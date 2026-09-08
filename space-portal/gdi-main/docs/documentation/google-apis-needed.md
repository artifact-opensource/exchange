# GDI — Google Maps Platform APIs Required

**Prepared by: Artifact Virtual — 2026-03-01**
**Project:** artifact-virtual (Google Cloud)
**Existing API Key:** `AIzaSyC7qjgUKC0l_jmPJReHW0Nxk6O3IY9T-6o` (in `config.js`)

---

## Current State

GDI currently uses ONE Google API:
- **Map Tiles API** — via `Cesium.createGooglePhotorealistic3DTileset()` for Photorealistic 3D Tiles

Fallback chain: Google 3D Tiles → Cesium Ion imagery → OpenStreetMap → NaturalEarth built-in.
Geocoding currently falls back to Nominatim (OpenStreetMap) when Ion is unavailable.

---

## APIs to Enable in Google Cloud Console

### 🔴 Critical — Core GDI Functionality

| # | API | Purpose | Pricing Tier | GDI Use Case |
|---|-----|---------|-------------|--------------|
| 1 | **Map Tiles API** | Photorealistic 3D Tiles, 2D vector/raster tiles, Street View tiles | $6/1K tile sessions | Already in use — 3D globe rendering via Cesium. Also provides Street View tiles for ground-level imagery integration. |
| 2 | **Geocoding API** | Convert addresses ↔ lat/lng coordinates | $5/1K requests | Replace Nominatim fallback. Search-to-location for intel targets, POI resolution, address normalization for incident reports. |
| 3 | **Places API (New)** | Place details, search, autocomplete, photos | $0–32/1K depending on fields | POI enrichment — identify buildings, businesses, infrastructure at any coordinate. Critical for target identification and area assessment. |
| 4 | **Routes API** | Directions, distance matrix, route optimization | $5–10/1K requests | Routing for convoy planning, evacuation routes, logistics. Replaces legacy Directions API. |
| 5 | **Street View Static API** | Street-level panoramic imagery via URL | $7/1K requests | Ground-level reconnaissance — embed street-level views in intel cards, pre-mission planning overlays. |

### 🟡 High Value — Enhanced Capabilities

| # | API | Purpose | Pricing Tier | GDI Use Case |
|---|-----|---------|-------------|--------------|
| 6 | **Aerial View API** | Cinematic aerial flyover videos from Google's 3D imagery | Preview/GA | Mission briefing videos — auto-generate flyover footage of target areas for command presentations. |
| 7 | **Elevation API** | Elevation data for any lat/lng | $5/1K requests | Terrain analysis — line-of-sight calculations, flood modeling, artillery range profiles, helo landing zone assessment. |
| 8 | **Geolocation API** | Position from cell towers/WiFi | $5/1K requests | Device triangulation when GPS unavailable — urban canyon scenarios, indoor positioning approximation. |
| 9 | **Maps JavaScript API** | Full interactive map in browser | $7/1K map loads | Alternative/supplementary rendering engine to Cesium. Could power a lightweight 2D tactical view alongside the 3D globe. |
| 10 | **Address Validation API** | Verify and standardize addresses | $17/1K requests | Data cleaning — normalize addresses in imported intel datasets, verify target location accuracy. |

### 🟢 Optional — Nice to Have

| # | API | Purpose | GDI Use Case |
|---|-----|---------|--------------|
| 11 | **Time Zone API** | Time zone for any coordinate | Multi-theater operations — auto-calculate local time at any global coordinate for mission timing. |
| 12 | **Roads API** | Snap GPS traces to roads | Clean up tracked vehicle paths, correct GPS drift in movement logs. |
| 13 | **Maps Datasets API** | Upload custom geospatial data to Google Cloud | Potential for data-driven styling of custom overlays. Lower priority since we use Cesium natively. |
| 14 | **Air Quality API** | Real-time air quality data | Environmental hazard assessment for field operations (chemical/biological threat awareness). |
| 15 | **Weather API** | Current + forecast weather | Mission planning — visibility, wind, precipitation at target coordinates. |

---

## API Enable Order (Recommended)

### Phase 1 — Immediate (enables core GDI features)
```
1. Map Tiles API          ← already needed, verify enabled
2. Geocoding API          ← replace Nominatim, critical for search
3. Places API (New)       ← POI enrichment
4. Street View Static API ← ground-level imagery
```

### Phase 2 — Next Sprint (routing + terrain)
```
5. Routes API             ← directions & logistics
6. Elevation API          ← terrain analysis
7. Aerial View API        ← mission briefing flyovers
```

### Phase 3 — Full Capability
```
8. Maps JavaScript API    ← 2D tactical view option
9. Geolocation API        ← device triangulation
10. Address Validation    ← data cleaning
11-15. Remaining APIs     ← as needed
```

---

## Billing Considerations

| Tier | Monthly Free | After Free Tier |
|------|-------------|-----------------|
| Map Tiles (3D) | $200 credit/mo | $6/1K tile sessions |
| Geocoding | $200 credit/mo | $5/1K requests |
| Places | $200 credit/mo | Varies by field mask |
| Routes | $200 credit/mo | $5–10/1K |
| Street View | $200 credit/mo | $7/1K |

Google gives **$200/month free credit** across all Maps Platform APIs. For development/testing, this covers substantial usage. Production at government scale will need a Premium Plan or Maps Platform agreement.

**Cost control:** Set per-API quotas in Cloud Console. Restrict the API key by:
- HTTP referrer (for web-only)
- IP address (for server-side)
- API restriction (only allow the APIs listed above)

---

## API Key Security

The current key (`AIzaSyC7...`) is embedded client-side in `config.js`. For production:

1. **Restrict the key** to specific APIs in Cloud Console
2. **Set referrer restrictions** (only `*.artifactvirtual.com`)
3. **Create a separate server-side key** for backend geocoding/routing calls (IP-restricted)
4. **Never commit unrestricted keys** — move to environment variables or a secrets manager
5. **Set billing alerts** at $50, $100, $200 thresholds

---

## How to Enable

```bash
# Via gcloud CLI (if authenticated):
gcloud services enable \
  maps-backend.googleapis.com \
  geocoding-backend.googleapis.com \
  places-backend.googleapis.com \
  routes-backend.googleapis.com \
  streetviewpublish.googleapis.com \
  elevation-backend.googleapis.com \
  geolocation.googleapis.com \
  addressvalidation.googleapis.com \
  airquality.googleapis.com \
  --project=artifact-virtual

# Or via Console:
# https://console.cloud.google.com/google/maps-apis/api-list?project=artifact-virtual
# Enable each API individually from the library.
```

> **Note:** The Google Cloud Console page requires authentication — cannot be accessed via web scraping. Enable APIs either through the Console UI while logged in, or via `gcloud` CLI with proper credentials.

---

## Satellite Imagery Note

Google Maps Platform does **not** provide raw satellite imagery for download/analysis. The Map Tiles API provides rendered satellite/aerial imagery as map tiles (visual only). For raw multispectral satellite imagery (the kind you'd use for NDVI, change detection, etc.), you need:

- **Google Earth Engine** (separate API, separate pricing) — Landsat, Sentinel-2, MODIS
- **Cesium Ion** (already partially integrated) — terrain + imagery tilesets
- **Direct providers** — Maxar, Planet Labs, Airbus for commercial high-res

GDI's `satx-layer.js` suggests satellite integration is already being architected separately from Google Maps.
