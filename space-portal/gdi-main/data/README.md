# GDI Offline Data Directory

Sovereign data cache for fully offline/air-gapped operation.

## Directory Structure

```
data/
├── tle/              # TLE orbital element files (CelesTrak mirror)
│   ├── stations.txt  # Space stations (ISS, Tiangong, etc.)
│   ├── gps-ops.txt   # GPS operational constellation
│   ├── starlink.txt  # Starlink constellation
│   ├── active.txt    # All active satellites
│   └── *.txt         # Additional TLE categories
│
├── flights/          # Cached OpenSky Network snapshots
│   └── latest.json   # Most recent flight state vector dump
│                     # Format: OpenSky API /states/all response
│
├── seismic/          # Cached USGS earthquake data
│   └── latest.json   # Most recent earthquake query result
│                     # Format: USGS GeoJSON feed response
│
└── tiles/            # Local map tile cache (future)
                      # Structure: {z}/{x}/{y}.png (slippy map)
                      # Can be populated with offline tile downloaders
```

## Populating Offline Data

### TLE Files
```bash
# Download current TLEs from CelesTrak
wget -O data/tle/stations.txt 'https://celestrak.org/NORAD/elements/gp.php?GROUP=stations&FORMAT=tle'
wget -O data/tle/gps-ops.txt 'https://celestrak.org/NORAD/elements/gp.php?GROUP=gps-ops&FORMAT=tle'
wget -O data/tle/starlink.txt 'https://celestrak.org/NORAD/elements/gp.php?GROUP=starlink&FORMAT=tle'
wget -O data/tle/active.txt 'https://celestrak.org/NORAD/elements/gp.php?GROUP=active&FORMAT=tle'
```

### Flight Cache
```bash
# Snapshot current global flights
curl -s 'https://opensky-network.org/api/states/all' > data/flights/latest.json
```

### Seismic Cache
```bash
# Snapshot last 24h earthquakes M2.5+
curl -s 'https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&starttime='$(date -u -d '24 hours ago' +%Y-%m-%dT%H:%M:%S)'&minmagnitude=2.5' > data/seismic/latest.json
```

## Notes

- TLE files should be refreshed every 1-3 days for orbital accuracy
- Flight data is ephemeral — cache is mainly for demo/testing
- Seismic data can be days old and still meaningful
- When GDI fails to reach an API, it automatically falls back to these files
- The `tiles/` directory is reserved for future offline map tile caching
