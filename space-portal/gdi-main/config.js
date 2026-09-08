/**
 * GDI — Global Defense Intelligence
 * Configuration Module
 */

const GDI_CONFIG = {

    // ── Cesium Credentials ──────────────────────────────────────────
    // Loaded at runtime from backend /api/config/frontend (sourced from .env).
    // Sovereign mode: no Ion token required. Globe renders using local
    // NaturalEarth textures + OpenStreetMap tiles as online fallback.
    // Set values in .env — they never live in this file.
    CESIUM_ION_TOKEN: '',
    GOOGLE_MAPS_API_KEY: '',
    TOMTOM_API_KEY: '',

    // ── Offline Data Paths ──────────────────────────────────────────
    // Local cache directories for sovereign/offline operation.
    // Offline terrain/imagery loaded from local tiles when available.
    offlineData: {
        tleDir: './data/tle/',              // Local TLE files (CelesTrak mirror)
        flightCache: './data/flights/',      // Cached OpenSky snapshots
        seismicCache: './data/seismic/',      // Cached USGS earthquake data
        tilesDir: './data/tiles/',            // Local map tile cache (future)
    },

    // ── Backend API (Valkyrie L5) ───────────────────────────────────
    // All data flows through the Valkyrie backend. No direct external
    // API calls from the frontend. Auth required.
    backend: {
        url: window.location.origin,
        wsUrl: (window.location.protocol === 'https:' ? 'wss:' : 'ws:') + '//' + window.location.host + '/ws',
    },

    // ── API Endpoints (fallback only — used when backend is down) ───
    endpoints: {
        // Flight data — multi-source aggregation (priority order)
        fr24: 'https://data-cloud.flightradar24.com/zones/fcgi/feed.js',
        adsbLol: 'https://api.adsb.lol/v2',
        adsbOne: 'https://api.adsb.one/v2',
        opensky: 'https://opensky-network.org/api/states/all',
        // Satellite data
        tleApi: 'https://celestrak.org/NORAD/elements/gp.php',
        spacetrack: 'https://www.space-track.org',
        // Intelligence
        usgs: 'https://earthquake.usgs.gov/fdsnws/event/1/query',
        gdelt: 'http://data.gdeltproject.org/gdeltv2/lastupdate.txt',
        gdacs: 'https://www.gdacs.org/gdacsapi/api/events/getevents',
        firms: 'https://firms.modaps.eosdis.nasa.gov/api',
        // Internal
        satx: 'http://localhost:8600',
        // Google services
        geocoding: 'https://maps.googleapis.com/maps/api/geocode/json',
        elevation: 'https://maps.googleapis.com/maps/api/elevation/json',
        streetview: 'https://maps.googleapis.com/maps/api/streetview',
    },

    // ── Update Intervals (ms) ───────────────────────────────────────
    intervals: {
        flights: 10000,
        seismic: 60000,
        satellites: 3000,
        satx: 15000,
        cctv: 5000,
        traffic: 30000,
        hud: 100,
        clock: 1000,
    },

    // ── Default Camera ──────────────────────────────────────────────
    defaultCamera: {
        latitude: 33.6844,
        longitude: 73.0479,
        height: 15000000,
        heading: 0,
        pitch: -90,
        roll: 0,
    },

    // ── Layer Defaults ──────────────────────────────────────────────
    layers: {
        flights: { enabled: true, label: 'FLIGHTS', color: '#00ff41' },
        seismic: { enabled: true, label: 'SEISMIC', color: '#ffb000' },
        satellites: { enabled: true, label: 'SATELLITES', color: '#00b4d8' },
        satx: { enabled: false, label: 'SATx SIGINT', color: '#ff0040' },
        gdelt: { enabled: false, label: 'GDELT EVENTS', color: '#ff6600' },
        fires: { enabled: false, label: 'FIRE/THERMAL', color: '#ff4400' },
        disasters: { enabled: false, label: 'DISASTERS', color: '#ff0040' },
        cctv: { enabled: false, label: 'CCTV NODES', color: '#ff0040' },
        traffic: { enabled: false, label: 'TRAFFIC', color: '#ffb000' },
    },

    // ── Flight Layer ────────────────────────────────────────────────
    flights: {
        maxTrailPoints: 20,
        altitudeColors: {
            low: { max: 3000, color: '#00ff41' },    // < 3000m — green
            mid: { max: 10000, color: '#ffb000' },   // 3000-10000m — amber
            high: { max: Infinity, color: '#ff0040' }, // > 10000m — red
        },
        categories: {
            0: 'No Info',
            1: 'No ADS-B',
            2: 'Light',
            3: 'Small',
            4: 'Large',
            5: 'Heavy',
            6: 'High Perf',
            7: 'Rotorcraft',
            8: 'Glider',
            9: 'Lighter-than-air',
            10: 'Parachutist',
            11: 'Ultralight',
            12: 'Reserved',
            13: 'UAV',
            14: 'Space',
            15: 'Emergency',
            16: 'Service',
            17: 'Obstruction',
        },
    },

    // ── Seismic Layer ───────────────────────────────────────────────
    seismic: {
        minMagnitude: 2.5,
        lookbackHours: 24,
        magnitudeColors: {
            low: { max: 4, color: '#ffb000' },
            mid: { max: 6, color: '#ff6600' },
            high: { max: Infinity, color: '#ff0040' },
        },
    },

    // ── CCTV Nodes ──────────────────────────────────────────────────
    cctvNodes: [
        { id: 'CAM-001', city: 'Washington D.C.', lat: 38.8977, lon: -77.0365 },
        { id: 'CAM-002', city: 'London', lat: 51.5074, lon: -0.1278 },
        { id: 'CAM-003', city: 'Moscow', lat: 55.7558, lon: 37.6173 },
        { id: 'CAM-004', city: 'Beijing', lat: 39.9042, lon: 116.4074 },
        { id: 'CAM-005', city: 'Tokyo', lat: 35.6762, lon: 139.6503 },
        { id: 'CAM-006', city: 'Paris', lat: 48.8566, lon: 2.3522 },
        { id: 'CAM-007', city: 'Berlin', lat: 52.5200, lon: 13.4050 },
        { id: 'CAM-008', city: 'Tel Aviv', lat: 32.0853, lon: 34.7818 },
        { id: 'CAM-009', city: 'Karachi', lat: 24.8607, lon: 67.0011 },
        { id: 'CAM-010', city: 'New Delhi', lat: 28.6139, lon: 77.2090 },
        { id: 'CAM-011', city: 'Seoul', lat: 37.5665, lon: 126.9780 },
        { id: 'CAM-012', city: 'Sydney', lat: -33.8688, lon: 151.2093 },
        { id: 'CAM-013', city: 'Cairo', lat: 30.0444, lon: 31.2357 },
        { id: 'CAM-014', city: 'Riyadh', lat: 24.7136, lon: 46.6753 },
        { id: 'CAM-015', city: 'Istanbul', lat: 41.0082, lon: 28.9784 },
        { id: 'CAM-016', city: 'Singapore', lat: 1.3521, lon: 103.8198 },
        { id: 'CAM-017', city: 'São Paulo', lat: -23.5505, lon: -46.6333 },
        { id: 'CAM-018', city: 'Lagos', lat: 6.5244, lon: 3.3792 },
        { id: 'CAM-019', city: 'Dubai', lat: 25.2048, lon: 55.2708 },
        { id: 'CAM-020', city: 'Hong Kong', lat: 22.3193, lon: 114.1694 },
        { id: 'CAM-021', city: 'Kyiv', lat: 50.4501, lon: 30.5234 },
        { id: 'CAM-022', city: 'Taipei', lat: 25.0330, lon: 121.5654 },
        { id: 'CAM-023', city: 'Tehran', lat: 35.6892, lon: 51.3890 },
        { id: 'CAM-024', city: 'Ankara', lat: 39.9334, lon: 32.8597 },
        { id: 'CAM-025', city: 'Pyongyang', lat: 39.0392, lon: 125.7625 },
    ],

    // ── Traffic Demo Area (Urban Grid) ───────────────────────────────
    trafficSegments: [
        { name: 'Northern Corridor', points: [[33.6938, 73.0388], [33.6950, 73.0500], [33.6960, 73.0620]], flow: 'green' },
        { name: 'Central Avenue', points: [[33.7100, 73.0380], [33.7000, 73.0400], [33.6900, 73.0420]], flow: 'yellow' },
        { name: 'Highland Road', points: [[33.7300, 73.0550], [33.7200, 73.0600], [33.7100, 73.0650]], flow: 'green' },
        { name: 'Western Ring', points: [[33.6700, 73.0100], [33.6750, 73.0250], [33.6800, 73.0400]], flow: 'red' },
        { name: 'Eastern Expressway', points: [[33.6500, 73.0600], [33.6600, 73.0550], [33.6700, 73.0500]], flow: 'yellow' },
        { name: 'Civic District', points: [[33.7080, 73.0480], [33.7060, 73.0520], [33.7040, 73.0560]], flow: 'red' },
        { name: 'Northern Bypass', points: [[33.6650, 73.0050], [33.6700, 73.0150], [33.6780, 73.0300]], flow: 'green' },
        { name: '7th Avenue', points: [[33.7150, 73.0600], [33.7050, 73.0580], [33.6950, 73.0560]], flow: 'yellow' },
    ],

    // ── Visual Filter Defaults ──────────────────────────────────────
    filters: {
        active: 'NORMAL', // NORMAL | CRT | NVG | FLIR
    },
};
