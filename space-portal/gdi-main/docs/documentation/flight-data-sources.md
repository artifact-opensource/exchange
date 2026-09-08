# GDI — Free Flight Data Sources (Verified Working)

**Prepared by: Artifact Virtual — 2026-03-01**
**All sources tested and confirmed live.**

---

## ✅ VERIFIED FREE — No Key Required

### 1. FlightRadar24 Public Feed
- **URL:** `https://data-cloud.flightradar24.com/zones/fcgi/feed.js`
- **Method:** GET with bounds parameter
- **Rate Limit:** Unknown (public endpoint, don't hammer it)
- **Coverage:** ~1500 aircraft per call, GLOBAL
- **Data:** callsign, lat, lon, altitude, speed, heading, aircraft type, registration, departure, arrival airport
- **Format:** JSON (numeric keys = aircraft, metadata keys = stats)
- **Auth:** None — just needs browser User-Agent
- **Example:** `?bounds=37,30,77,70&faa=1&satellite=1&mlat=1&adsb=1&air=1`
- **Quality:** ⭐⭐⭐⭐⭐ Best coverage, most data fields

### 2. ADSB.lol (Community ADS-B Aggregator)
- **URL:** `https://api.adsb.lol/v2/lat/{lat}/lon/{lon}/dist/{nm}`
- **Method:** GET
- **Rate Limit:** Reasonable use
- **Coverage:** Community feeders worldwide
- **Data:** hex, flight, lat, lon, alt_baro, gs, track, aircraft type, squawk
- **Format:** JSON (readsb format — same as tar1090/dump1090)
- **Auth:** None
- **Example:** `https://api.adsb.lol/v2/lat/33.68/lon/73.04/dist/250`
- **Quality:** ⭐⭐⭐⭐ Good coverage, includes military with transponders

### 3. ADSB.one (Community ADS-B)
- **URL:** `https://api.adsb.one/v2/point/{lat}/{lon}/{radius_nm}`
- **Method:** GET
- **Rate Limit:** Reasonable use
- **Coverage:** Community feeders
- **Data:** Same readsb format as ADSB.lol
- **Auth:** None
- **Example:** `https://api.adsb.one/v2/point/33.68/73.04/250`
- **Quality:** ⭐⭐⭐⭐ Good, slightly less coverage than adsb.lol

### 4. OpenSky Network (Current — needs auth upgrade)
- **URL:** `https://opensky-network.org/api/states/all`
- **Method:** GET with bounding box
- **Rate Limit:** 400 credits/day (anonymous), 4000 credits/day (authenticated)
- **Coverage:** Academic network, excellent global coverage
- **Data:** icao24, callsign, origin_country, time_position, lat, lon, baro_altitude, velocity, heading, vertical_rate, sensors, geo_altitude, squawk, spi, position_source, category
- **Auth:** Moving to OAuth2 (Client ID: ava-api-client, pending email)
- **Quality:** ⭐⭐⭐⭐ Best data quality but rate limited

### 5. ADS-B.fi (Finnish community feed)
- **URL:** `https://opendata.adsb.fi/api/v2/lat/{lat}/lon/{lon}/dist/{nm}`
- **Method:** GET
- **Rate Limit:** Unknown
- **Coverage:** Mostly European
- **Data:** readsb format
- **Auth:** None
- **Quality:** ⭐⭐⭐ Good for Europe, sparse elsewhere

---

## 💰 PAID — Via RapidAPI (key exists, need subscription)

### 6. ADS-B Exchange (via RapidAPI)
- **RapidAPI Host:** `adsbexchange-com1.p.rapidapi.com`
- **Free Tier:** None — needs RapidAPI subscription
- **Coverage:** Best for military/government aircraft (unfiltered)
- **Unique Value:** Military aircraft that other feeds hide

### 7. AirLabs Data API
- **URL:** `https://airlabs.co/api/v9/flights`
- **Free Tier:** Limited requests/month (need to sign up)
- **Coverage:** ~7,300 flights, global
- **Data:** Rich — includes airline info, departure/arrival codes

### 8. Aviationstack
- **URL:** `http://api.aviationstack.com/v1/flights`
- **Free Tier:** 100 requests/month (very limited)
- **Coverage:** Global, 30-60 second delay
- **Data:** Routes, flight numbers, locations, airports, gates

---

## 🏗️ AGGREGATION STRATEGY FOR GDI

Priority order for the flight data pipeline:
1. **Primary:** FR24 public feed (best coverage, most fields)
2. **Secondary:** ADSB.lol (community data, includes military transponders)
3. **Tertiary:** ADSB.one (backup community feed)
4. **Fallback:** OpenSky (authenticated, when OAuth2 is confirmed)

**Deduplication:** Match on ICAO hex code (field `hex` in readsb format, or extract from FR24 ID). Merge fields from multiple sources to get most complete aircraft record.

**Update Cadence:**
- FR24: every 10 seconds (current GDI config)
- Community feeds: every 15 seconds (staggered)
- OpenSky: every 30 seconds (rate limit conservation)
