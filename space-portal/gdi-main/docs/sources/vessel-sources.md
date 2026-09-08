# Vessel Tracking & AIS Data Sources — Complete Reference

> Compiled: 2026-03-05
> Focus: Free/open data only (or services with meaningful free tiers)

---

## Table of Contents
1. [Community AIS Data Exchanges (FREE)](#1-community-ais-data-exchanges)
2. [Government & Military Open Data](#2-government--military-open-data)
3. [Free/Freemium Tracking Platforms](#3-freefreemium-tracking-platforms)
4. [Historical AIS Archives](#4-historical-ais-archives)
5. [Open Source Tools & Libraries](#5-open-source-tools--libraries)
6. [DIY AIS Reception (RTL-SDR)](#6-diy-ais-reception-rtl-sdr)
7. [Satellite AIS (S-AIS) Data](#7-satellite-ais-s-ais-data)
8. [Academic & Research Data](#8-academic--research-data)
9. [WebSocket & Streaming Endpoints](#9-websocket--streaming-endpoints)
10. [Commercial APIs with Free Tiers](#10-commercial-apis-with-free-tiers)

---

## 1. Community AIS Data Exchanges

### AISHub (aishub.net) ⭐ BEST FREE SOURCE
- **URL:** https://www.aishub.net/
- **API:** https://data.aishub.net/ws.php?username=USERNAME&format=1&output=json
- **Cost:** **FREE** — requires sharing your own AIS feed (reciprocal data exchange)
- **Data Format:** JSON, XML, CSV (selectable via `output` parameter)
- **Coverage:** Global — 66,123 vessels (last 24h), 1,405 stations, 75 countries
- **Update Frequency:** Real-time (data as received from contributors)
- **Rate Limit:** **Max 1 request per minute** (returns empty if exceeded)
- **API Features:**
  - Geographic bounding box filtering (latmin/latmax/lonmin/lonmax)
  - MMSI and IMO number filtering (single or comma-separated lists)
  - Interval filtering (max age of positions in minutes)
  - Compression: none, ZIP, GZIP, BZIP2
  - Station API: list all contributing stations
- **Data Fields:** MMSI, timestamp, lat/lon, COG, SOG, heading, ROT, nav status, IMO, name, callsign, vessel type, dimensions (A/B/C/D), draught, destination, ETA
- **Join Process:** Fill form → receive IP/port → configure AIS receiver to send UDP → get API access after validation
- **Companion Tool:** AIS Dispatcher (free, Windows/Linux) for forwarding AIS data
- **Verdict:** Best free aggregated AIS source. Requires contributing your own receiver data.

### aprs.fi AIS Integration
- **URL:** https://aprs.fi/ (includes AIS vessel tracking alongside APRS)
- **API:** https://api.aprs.fi/api/get?name=CALLSIGN&what=loc&apikey=APIKEY&format=json
- **Cost:** **FREE** — requires free account registration for API key
- **Data Format:** JSON or XML
- **Coverage:** Global (community-contributed AIS + APRS stations)
- **Rate Limit:** Per-account rate limiting (reasonable for hobby use)
- **API Features:**
  - Query up to 20 vessels per request (batch)
  - AIS fields: MMSI, IMO, callsign, lat/lon, course, speed, heading, nav status, vessel class, length, width, draught
  - Weather data queries (wx stations)
  - Message queries
- **Data Fields:** class (a=AIS, l=APRS, w=Web), name, lat/lng, course, speed, altitude, mmsi, imo, vesselclass, navstat, heading, length, width, draught
- **Constraints:** No wildcard/area search — must query specific station names. Not for bulk archival.
- **⚠️ HTTPS required after 2026-05-01** (HTTP endpoints deprecated)

---

## 2. Government & Military Open Data

### NOAA/Marine Cadastre AIS Data (US) ⭐ BEST HISTORICAL ARCHIVE
- **URL:** https://marinecadastre.gov/ais/
- **Data Portal:** https://coast.noaa.gov/htdata/CMSP/AISDataHandler/
- **Cost:** **100% FREE** — US government open data
- **Data Format:** CSV (zipped, daily files)
- **Coverage:** US waters (EEZ, coastal, Great Lakes, rivers)
- **Years Available:** 2009–2023+ (annual archives)
- **Total Size:** ~110 GB per year (365 daily ZIP files)
- **File Pattern:** `AIS_YYYY_MM_DD.zip` — one file per day
- **Fields:** MMSI, BaseDateTime, LAT, LON, SOG, COG, Heading, VesselName, IMO, CallSign, VesselType, Status, Length, Width, Draft, Cargo, TransceiverClass
- **Update Frequency:** Annual bulk release (some years updated retroactively)
- **Access:** Direct HTTP download, no authentication required
- **Notes:** This is the single largest freely available AIS dataset in the world. Maintained by NOAA Office for Coastal Management.

### Danish Maritime Authority (DMA) AIS
- **URL:** https://dma.dk/safety-at-sea/navigational-information/ais-data
- **GitHub:** https://github.com/dma-ais (10 repositories, actively maintained)
- **Cost:** **FREE** — open data from Danish government
- **Coverage:** Danish waters (Kattegat, Skagerrak, Baltic approaches)
- **Open Source Libraries:**
  - **AisLib** (Java, 188 stars) — AIS message parsing/encoding library
  - **AisStore** — Long-term AIS storage on Apache Cassandra
  - **AisAbnormal** — Anomaly detection from historical AIS
  - **AisTrack** — Live vessel monitoring
  - **AisView** — Aggregation and publishing from real-time + historic sources
  - **AisCoverage** — Coverage analysis
  - **AisVirtualNet** — Virtual AIS network for testing
- **Data Access:** Shore-based AIS system now under Danish Emergency Management Agency
- **API:** Varies — see individual repos for endpoints

### Norwegian BarentsWatch AIS
- **URL:** https://www.barentswatch.no/
- **Cost:** **FREE** — Norwegian government open data program
- **Coverage:** Norwegian waters, Arctic, Barents Sea
- **Data Format:** JSON/REST API
- **Registration:** Required (free account)
- **Notes:** Excellent Arctic coverage. Includes vessel positions + environmental data.

### EU EMSA (European Maritime Safety Agency)
- **URL:** https://www.emsa.europa.eu/
- **System:** SafeSeaNet, CleanSeaNet, LRIT
- **Cost:** **NOT publicly available** — data shared only with EU member state authorities
- **Coverage:** EU waters
- **Access:** Restricted to government/maritime authority users only
- **Alternative:** Some EMSA data available through Copernicus Marine Service
- **Note:** EMSA operates the largest governmental AIS network in Europe but data access is strictly controlled. Academic researchers may apply through specific programs.

### US Coast Guard NAIS (Nationwide AIS)
- **URL:** Operated by USCG — data flows into Marine Cadastre (see above)
- **Cost:** Raw NAIS feed is **restricted** (government/military only)
- **Public Access:** Through NOAA Marine Cadastre historical dumps (above)
- **Coverage:** All US navigable waterways + 2,000+ mile coastline
- **Note:** Real-time NAIS feed not available to public. Historical data released through Marine Cadastre partnership.

### Canadian AIS Data
- **URL:** https://open.canada.ca/ (search "AIS")
- **Cost:** **FREE** — Canadian Open Government License
- **Coverage:** Canadian waters, Arctic passages
- **Format:** CSV, various
- **Note:** Historical data available through Government of Canada Open Data portal

---

## 3. Free/Freemium Tracking Platforms

### MarineTraffic (now part of Kpler)
- **URL:** https://www.marinetraffic.com/
- **API:** https://www.marinetraffic.com/en/ais-api-services (now Kpler Data Services)
- **Cost:** **NO free API tier** — enterprise pricing only ("Request Demo")
- **Free Web Access:** Yes — free map viewer at marinetraffic.com with limited features
- **Network:** 13,000+ AIS receivers (largest in the world)
- **Coverage:** Global — terrestrial + satellite AIS
- **Historical Data:** Since 2010
- **API Products:** AIS Real-time, Events (port calls, STS transfers), Past Events, Ship Database, Custom Extracts
- **Pricing:** Not published — sales-driven, typically $500-$10,000+/month
- **Verdict:** Excellent data but NO free API. Web viewer is free but not programmatically accessible.

### VesselFinder
- **URL:** https://www.vesselfinder.com/
- **Cost:** Free web viewer; API is **paid** (no free tier for data API)
- **Free Features:** Web-based vessel tracking map, basic vessel info
- **Coverage:** Global — terrestrial + satellite AIS
- **API:** https://api.vesselfinder.com/ — paid plans starting ~$99/month
- **Note:** Does have a free satellite view. API documentation not publicly available without contacting sales.

### MyShipTracking
- **URL:** https://www.myshiptracking.com/
- **Cost:** **FREE** basic web viewer; paid plans for advanced features
- **Coverage:** Global (community-contributed terrestrial AIS stations)
- **Features:** Real-time map, vessel database, port database, port calls
- **API:** Available for "AIS Data Services" — pricing not listed (contact sales)
- **Community:** Users can add their own AIS station to contribute data
- **Mobile:** iOS and Android apps available

### OpenSeaMap
- **URL:** https://map.openseamap.org/
- **Source:** https://github.com/OpenSeaMap/
- **Cost:** **100% FREE** — open source (ODbL license)
- **Data Format:** OpenStreetMap database format + overlays
- **Coverage:** Global nautical chart data (crowd-sourced)
- **Features:**
  - Free nautical chart overlay on OSM
  - AIS vessel display integration
  - Depth soundings (crowd-sourced)
  - Port information, seamarks, navigation aids
  - Weather overlay
  - Aerial photos
- **Editors:** JOSM SeaMap Editor, Online Editor
- **Data Standard:** IHO S-57 / S-101 (Electronic Navigational Charts)
- **Mobile:** Multiple apps available (see wiki)
- **AIS Display:** Shows AIS targets on the map (data sourced from community AIS feeds)
- **License:** ODbL (same as OpenStreetMap)
- **Verdict:** Great for nautical chart data + AIS overlay. Not an AIS data source itself — it displays AIS from other feeds.

### FleetMon
- **URL:** https://www.fleetmon.com/
- **Cost:** Free account with limited access; API from €49/month
- **Free Features:** Web viewer, basic vessel profiles
- **API:** REST API for vessel positions, port calls
- **Coverage:** Global

---

## 4. Historical AIS Archives

### NOAA Marine Cadastre (Primary — see above)
- **Years:** 2009–2023
- **Size:** ~110 GB/year
- **Resolution:** ~5-minute intervals
- **Best for:** Large-scale analysis of US waters

### Global Fishing Watch
- **URL:** https://globalfishingwatch.org/our-apis/
- **Data Download:** https://globalfishingwatch.org/data-download/
- **Cost:** **FREE** — requires registration + API key + terms of use agreement
- **Coverage:** Global oceans (focused on fishing vessels but includes all AIS)
- **Data Products:**
  - **Fishing Effort:** ~70,000 vessels, gridded maps
  - **Vessel Search & Identity:** Cross-referenced with public registries
  - **Fishing Events:** Detailed position data showing fishing activity
  - **Encounters & Transshipment:** Vessel-to-vessel meeting events
  - **Loitering Events:** Potential transshipment behavior
  - **Port Visits:** Vessel port call patterns
  - **SAR Vessel Detections:** Satellite imagery + deep learning vessel detection
  - **AIS Vessel Presence:** Global presence patterns by flag/type/speed
- **API Access Tiers:**
  - Free tier for research/NGO/education
  - Commercial tier (contact sales)
- **SDKs:** Python package + R package (`gfwr`)
- **Users:** 200+ organizations, ~70 countries
- **Founded by:** Oceana, SkyTruth, Google
- **Verdict:** ⭐ Exceptional free resource. Best for fishing intelligence + global AIS activity patterns. Not raw NMEA — processed/analyzed AIS data.

### Spire Maritime (Historical)
- **URL:** https://spire.com/maritime/
- **Cost:** **Paid** — but academic/research programs exist
- **Coverage:** Global (satellite AIS — space-based receivers)
- **Note:** Spire operates 100+ AIS satellites. Historical data sometimes available through academic partnerships.

### UN Global Platform AIS
- **URL:** https://unstats.un.org/bigdata/task-teams/ais/
- **Cost:** **FREE** for national statistical offices and UN agencies
- **Coverage:** Global
- **Note:** UN initiative to use AIS for trade statistics. Data sharing agreements through national statistical offices.

---

## 5. Open Source Tools & Libraries

### AIS Decoding Libraries
| Library | Language | Stars | URL |
|---------|----------|-------|-----|
| **pyais** | Python | 200+ | https://github.com/M0r13n/pyais |
| **libais** | Python/C++ | 200+ | https://github.com/schwehr/libais |
| **AisLib** (DMA) | Java | 188 | https://github.com/dma-ais/AisLib |
| **ais-decoder** | Node.js | ~50 | https://github.com/signalk/ais-decoder |
| **gpsd** | C | — | Includes AIS decoding (built into most Linux distros) |
| **gnu-ais** | C | — | https://gnuais.sourceforge.net/ |

### AIS Display/Mapping Software
| Software | Platform | URL |
|----------|----------|-----|
| **OpenCPN** | Cross-platform | https://opencpn.org/ — free chart plotter with AIS display |
| **GnuAIS** | Linux | AIS decoder + viewer |
| **ShipPlotter** | Windows | AIS decoder (commercial, ~$25) |
| **AISdeco2** | Cross-platform | Free AIS decoder for RTL-SDR (dual-channel) |
| **rtl-ais** | Linux/macOS | https://github.com/dgiardini/rtl-ais — command-line AIS decoder |
| **AIS Dispatcher** | Windows/Linux | https://www.aishub.net/ — free from AISHub |

### Signal K
- **URL:** https://signalk.org/
- **What:** Open marine data standard + server
- **AIS:** Full AIS integration — decode, process, share vessel data
- **WebSocket:** Signal K server provides WebSocket API for AIS data
- **Cost:** Free, open source
- **Note:** If you have an AIS receiver, Signal K provides a complete local data platform with WebSocket streaming

---

## 6. DIY AIS Reception (RTL-SDR)

### Overview
AIS signals are broadcast on VHF marine band and can be received with cheap software-defined radio hardware.

### Frequencies
| Channel | Frequency | Use |
|---------|-----------|-----|
| AIS 1 | **161.975 MHz** | Primary AIS channel |
| AIS 2 | **162.025 MHz** | Secondary AIS channel |
| AIS SART | 156.525 MHz | Search and rescue transponders |
| AIS long-range | Various | Satellite AIS uplink |

### Hardware Required
| Component | Cost | Notes |
|-----------|------|-------|
| **RTL-SDR v3/v4** | $25-35 | Best budget option. RTL2832U + R820T2 chipset |
| **Airspy Mini** | $99 | Better sensitivity/dynamic range |
| **AIS antenna** | $0-50 | DIY quarter-wave groundplane at 162 MHz, or commercial marine VHF |
| **LNA (optional)** | $15-30 | Low-noise amplifier for weak signals |
| **Raspberry Pi** | $35-75 | For 24/7 headless reception |

### Reception Range
- **Theoretical max:** ~75 km (line of sight, VHF propagation)
- **Practical (rooftop antenna):** 30-60 km
- **Practical (indoor):** 5-15 km
- **Key factor:** Antenna height. Higher = dramatically better range.

### Software Stack (Linux/RPi)
```bash
# Option 1: rtl-ais (simplest, dual-channel)
git clone https://github.com/dgiardini/rtl-ais.git
cd rtl-ais && make
./rtl_ais -n  # outputs NMEA sentences to stdout

# Option 2: AISdeco2 (recommended for SDRSharp on Windows)
# Download from aishub.net

# Option 3: gnuais
apt install gnuais

# Option 4: rtl_fm + multimon-ng pipeline
rtl_fm -f 161975000 -s 48000 -g 42 | multimon-ng -a FLEX -t raw -
```

### Antenna Builds
| Type | Gain | Difficulty | Notes |
|------|------|-----------|-------|
| Quarter-wave groundplane | 2 dBi | Easy | ~46cm vertical element, 4× ~46cm radials at 45° |
| Dipole | 2 dBi | Easy | Two ~46cm elements, coax center-fed |
| Coax collinear | 6-9 dBi | Medium | Multiple coax segments, excellent omnidirectional gain |
| Slim-Jim (300Ω twin-lead) | 4-5 dBi | Medium | Cheap, compact, good performance |
| Yagi-Uda | 8-12 dBi | Hard | Directional — point at ship traffic area |

### Complete RTL-SDR AIS Station → AISHub Feed
1. Set up RTL-SDR with rtl-ais or AIS Dispatcher
2. Configure UDP output to AISHub's assigned IP:port
3. Validate your feed on aishub.net
4. Receive access to AISHub aggregated global API (JSON/XML/CSV)
5. **Total cost: ~$30 hardware + free software**

---

## 7. Satellite AIS (S-AIS) Data

Satellite AIS receivers in orbit capture AIS signals from ships in open ocean (beyond terrestrial receiver range).

### Free/Open Satellite AIS Sources
| Source | Access | Coverage | Notes |
|--------|--------|----------|-------|
| **Global Fishing Watch** | Free API | Global oceans | Includes S-AIS, best free option |
| **NOAA Marine Cadastre** | Free download | US waters | Includes some S-AIS data mixed in |
| **exactEarth/Spire** | Paid (academic programs) | Global | 100+ AIS satellites |
| **ORBCOMM** | Paid | Global | Pioneers of S-AIS |
| **Planet Labs** | Paid | Global | Ship detection from optical imagery |

### Cost Reality for Commercial S-AIS
- exactEarth/Spire: $10K-100K+/year
- ORBCOMM: Enterprise pricing
- No truly free real-time satellite AIS streams exist (the satellite operators charge)
- **Workaround:** Global Fishing Watch processes S-AIS and makes it free via API

---

## 8. Academic & Research Data

### MarineCadastre.gov Research Portal
- Same as NOAA data above, but with additional tools for researchers
- ArcGIS compatible, bulk download friendly

### UN COMTRADE + AIS
- Trade statistics derived from AIS data
- https://comtradeplus.un.org/

### Zenodo AIS Datasets
- Search https://zenodo.org/ for "AIS maritime" — various research datasets published
- Often includes processed/cleaned AIS data for specific regions and timeframes

### World Bank Shipping Data
- **URL:** https://data.worldbank.org/indicator/IS.SHP.GCNW.XQ
- Liner Shipping Connectivity Index
- Container port traffic statistics
- Not raw AIS but useful for context

### UNCTAD Maritime Transport Statistics
- Annual Review of Maritime Transport
- Global shipping statistics derived partly from AIS

---

## 9. WebSocket & Streaming Endpoints

### Truly Free WebSocket/Stream Sources

**⚠️ Reality check:** There are NO major free unlimited WebSocket AIS streams. Here's what exists:

| Source | Type | Free? | Notes |
|--------|------|-------|-------|
| **AISHub API** | HTTP poll (1/min) | Yes (reciprocal) | Not WebSocket but closest free equivalent |
| **Signal K Server** | WebSocket | Yes (local) | Run your own with RTL-SDR receiver |
| **ais-stream.com** ⭐ | WebSocket | **Yes (free tier)** | See below |
| **MarineTraffic** | REST/WebSocket | No | Enterprise only |
| **VesselFinder** | REST | No | Paid API |
| **Spire** | Streaming API | No | Enterprise |

### aisstream.io (Notable Free WebSocket)
- **URL:** https://aisstream.io/
- **Cost:** **FREE tier available** — requires API key registration
- **Protocol:** WebSocket (wss://)
- **Data Format:** JSON (decoded AIS messages)
- **Coverage:** Global (aggregated from multiple terrestrial + satellite sources)
- **WebSocket Endpoint:** `wss://stream.aisstream.io/v0/stream`
- **Features:**
  - Real-time decoded AIS messages
  - Geographic bounding box filtering
  - Message type filtering
  - MMSI filtering
- **Connection Example:**
  ```json
  {
    "APIKey": "your-api-key",
    "BoundingBoxes": [[[lat_min, lon_min], [lat_max, lon_max]]],
    "FiltersShipMMSI": ["123456789"],
    "FilterMessageTypes": ["PositionReport"]
  }
  ```
- **Rate Limits:** Free tier has connection limits (check current terms)
- **⭐ BEST FREE WEBSOCKET OPTION FOR REAL-TIME AIS**

### DIY WebSocket (Self-hosted)
With an RTL-SDR receiver + Signal K server:
```
RTL-SDR → rtl-ais → NMEA TCP → Signal K Server → WebSocket (ws://localhost:3000/signalk/v1/stream)
```
- **Cost:** Hardware only (~$30)
- **Coverage:** Your local area (30-75 km radius)
- **Update Frequency:** Real-time (as received)
- **Fully sovereign — no rate limits, no API keys, no restrictions**

---

## 10. Commercial APIs with Free Tiers

### Datalastic
- **URL:** https://www.datalastic.com/
- **Free Tier:** 100 API calls/month
- **Data:** Vessel positions, details, port calls
- **Format:** REST JSON

### Searoutes
- **URL:** https://www.searoutes.com/
- **Free Tier:** Limited free access for developers
- **Focus:** Routing, distances, CO2 emissions + vessel tracking

### ShipXplorer
- **URL:** https://www.shipxplorer.com/
- **Model:** Similar to AISHub — share your AIS data, get platform access
- **Free Tier:** Basic with AIS station contribution

### Pole Star (PurpleTRAC)
- **URL:** https://www.polestarglobal.com/
- **Free Tier:** No — government/enterprise only
- **Coverage:** Global LRIT + AIS

---

## Summary: Best Free Options Ranked

| Rank | Source | Type | Best For |
|------|--------|------|----------|
| 🥇 | **NOAA Marine Cadastre** | Historical CSV | Bulk analysis, US waters, 2009-2023 |
| 🥈 | **AISHub** | Real-time API | Global live positions (requires AIS station) |
| 🥉 | **aisstream.io** | WebSocket | Real-time streaming (free tier) |
| 4 | **Global Fishing Watch** | API + Downloads | Fishing + global activity patterns |
| 5 | **RTL-SDR DIY** | Local receiver | Sovereign real-time local AIS ($30) |
| 6 | **OpenSeaMap** | Chart overlay | Nautical charts + AIS display |
| 7 | **DMA AisLib** | Open source tools | AIS message parsing (Java) |
| 8 | **aprs.fi** | API | Individual vessel queries |
| 9 | **Signal K** | Local WebSocket | Self-hosted AIS data platform |
| 10 | **pyais** | Python library | AIS NMEA decoding |

---

## Quick Start: Zero-Cost AIS Monitoring

### Option A: Pure Software (no hardware)
1. Register at **aisstream.io** → get API key
2. Connect WebSocket: `wss://stream.aisstream.io/v0/stream`
3. Filter by geographic area → receive real-time JSON AIS messages
4. **Cost: $0**

### Option B: RTL-SDR Station + Global Feed
1. Buy RTL-SDR v4 ($35) + build quarter-wave antenna ($5)
2. Install `rtl-ais` on Linux/Raspberry Pi
3. Forward NMEA via UDP to AISHub
4. Get AISHub API access (JSON/XML/CSV, global data, 66K+ vessels)
5. Optionally run Signal K server for local WebSocket
6. **Cost: $40 one-time hardware**

### Option C: Historical Research
1. Download from https://coast.noaa.gov/htdata/CMSP/AISDataHandler/
2. Daily CSV files, US waters, 2009-2023
3. Process with Python (pandas) or any data tool
4. **Cost: $0 + storage**

---

## AIS Message Types Reference

| Type | Name | Content |
|------|------|---------|
| 1,2,3 | Position Report | MMSI, nav status, ROT, SOG, lon/lat, COG, heading, timestamp |
| 4 | Base Station Report | MMSI, lon/lat, timestamp (from shore stations) |
| 5 | Static & Voyage | MMSI, IMO, callsign, name, ship type, dimensions, draught, destination, ETA |
| 18 | Standard Class B Position | Similar to type 1-3 but for Class B transponders |
| 19 | Extended Class B Position | Class B with name, ship type, dimensions |
| 21 | Aid-to-Navigation | Buoys, lighthouses, other nav aids |
| 24 | Class B Static Data | Name, callsign, dimensions, ship type (for Class B) |
| 27 | Long-Range Position | Reduced-accuracy position for satellite reception |

---

## Data Freshness Comparison

| Source | Latency | Update Rate |
|--------|---------|-------------|
| RTL-SDR local | 0s (real-time) | Every 2-10s (Class A), 30s-3min (Class B) |
| AISHub API | ~1-5 min | Poll max 1/min |
| aisstream.io | ~1-30s | WebSocket push |
| MarineTraffic web | ~1-3 min | Web refresh |
| Global Fishing Watch | Hours-days | Processed/analyzed |
| NOAA Marine Cadastre | Months-years | Annual release |

---

*This document covers all known free/open vessel tracking data sources as of March 2026. The maritime AIS ecosystem heavily favors commercial providers, but the sources above provide comprehensive coverage for research, development, and monitoring use cases without cost.*
