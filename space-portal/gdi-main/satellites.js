/**
 * GDI — Global Defense Intelligence
 * Satellite Catalog & Propagation (OMNISCIENT v2.0)
 *
 * Dynamically loads the full USSTRATCOM catalog from Space-Track.org
 * via the GDI backend API (65,000+ tracked objects).
 *
 * Uses satellite.js for SGP4/SDP4 propagation from TLE sets.
 * Catalog auto-refreshes every 30 minutes.
 *
 * Fallback: hardcoded special satellites for offline/backend-down mode.
 */

// ── Hardcoded fallback (offline mode) ───────────────────────
const SAT_CATALOG_FALLBACK = {
    ISS: {
        name: 'ISS (ZARYA)', noradId: 25544, type: 'station', special: true,
        tle1: '1 25544U 98067A   26058.50000000  .00016717  00000-0  10270-3 0  9025',
        tle2: '2 25544  51.6400 208.0000 0007417  35.5600 350.1500 15.49560000496321',
    },
    TIANGONG: {
        name: 'TIANGONG', noradId: 48274, type: 'station', special: true,
        tle1: '1 48274U 21035A   26058.50000000  .00020000  00000-0  25000-3 0  9990',
        tle2: '2 48274  41.4700 120.0000 0005000 280.0000  80.0000 15.61200000199876',
    },
    HUBBLE: {
        name: 'HUBBLE', noradId: 20580, type: 'telescope', special: true,
        tle1: '1 20580U 90037B   26058.50000000  .00000700  00000-0  30000-4 0  9999',
        tle2: '2 20580  28.4700  60.0000 0002500 100.0000 260.0000 15.09100000560001',
    },
};


/**
 * SatellitePropagator — wraps satellite.js for GDI
 * Now supports dynamic catalog loading from backend.
 */
class SatellitePropagator {

    constructor() {
        this.records = [];        // { key, meta, satrec }
        this._catalogSize = 0;    // Total objects in backend
        this._loadedFrom = 'none'; // 'backend' | 'fallback'
        this._lastRefresh = 0;
        this._refreshInterval = 1800000; // 30 min
        this._loading = false;

        // Stats for HUD
        this.stats = {
            total: 0,
            payloads: 0,
            debris: 0,
            rocketBodies: 0,
            countries: 0,
            source: 'none',
            lastFetch: null,
        };
    }

    /**
     * Initialize with backend catalog or fallback.
     * @param {string} apiBase - Backend URL
     * @param {string} authToken - JWT token for API
     */
    async init(apiBase, authToken) {
        this._apiBase = apiBase;
        this._authToken = authToken;

        try {
            await this.loadFromBackend();
        } catch (e) {
            console.warn('[SAT] Backend unavailable, using fallback catalog:', e.message);
            this._loadFallback();
        }

        // Auto-refresh
        setInterval(() => this._autoRefresh(), this._refreshInterval);
    }

    /**
     * Load the full catalog from GDI backend (Space-Track data).
     */
    async loadFromBackend(options = {}) {
        if (this._loading) return;
        this._loading = true;

        const {
            type = null,
            orbit = null,
            specialOnly = false,
            limit = 65000,
        } = options;

        try {
            let url = `${this._apiBase}/api/satellites/catalog?limit=${limit}`;
            if (type) url += `&type=${type}`;
            if (orbit) url += `&orbit=${orbit}`;
            if (specialOnly) url += `&special_only=true`;

            const resp = await fetch(url, {
                headers: { 'Authorization': `Bearer ${this._authToken}` },
            });

            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

            const data = await resp.json();
            const objects = data.objects || [];

            this.records = [];
            let parsed = 0;
            let failed = 0;

            for (const obj of objects) {
                try {
                    if (!obj.tle1 || !obj.tle2) continue;
                    const satrec = satellite.twoline2satrec(obj.tle1, obj.tle2);
                    this.records.push({
                        key: `ST_${obj.noradId}`,
                        meta: {
                            name: obj.name,
                            noradId: obj.noradId,
                            type: obj.type,
                            baseType: obj.baseType,
                            orbitRegime: obj.orbitRegime,
                            country: obj.country,
                            flag: obj.flag,
                            special: obj.special,
                            rcsSize: obj.rcsSize,
                            launchDate: obj.launchDate,
                            intlDesig: obj.intlDesig,
                            inclination: obj.inclination,
                            eccentricity: obj.eccentricity,
                            period: obj.period,
                            apoapsis: obj.apoapsis,
                            periapsis: obj.periapsis,
                        },
                        satrec,
                    });
                    parsed++;
                } catch (e) {
                    failed++;
                }
            }

            this._catalogSize = data.total_catalog || objects.length;
            this._loadedFrom = 'backend';
            this._lastRefresh = Date.now();

            // Update stats
            this.stats = {
                total: this.records.length,
                catalogTotal: this._catalogSize,
                payloads: this.records.filter(r => r.meta.baseType === 'payload').length,
                debris: this.records.filter(r => r.meta.baseType === 'debris').length,
                rocketBodies: this.records.filter(r => r.meta.baseType === 'rocket_body').length,
                countries: new Set(this.records.map(r => r.meta.country).filter(Boolean)).size,
                source: 'Space-Track.org',
                lastFetch: new Date().toISOString(),
                parsed,
                failed,
            };

            console.log(`[SAT] Loaded ${parsed} objects from Space-Track (${failed} failed, ${this._catalogSize} total in catalog)`);

        } catch (e) {
            console.error('[SAT] Backend load failed:', e);
            if (this.records.length === 0) {
                this._loadFallback();
            }
        } finally {
            this._loading = false;
        }
    }

    /**
     * Load hardcoded fallback catalog (offline mode).
     */
    _loadFallback() {
        this.records = [];
        for (const [key, sat] of Object.entries(SAT_CATALOG_FALLBACK)) {
            try {
                const satrec = satellite.twoline2satrec(sat.tle1, sat.tle2);
                this.records.push({
                    key,
                    meta: { ...sat, baseType: 'payload', orbitRegime: 'LEO', country: '', flag: '' },
                    satrec,
                });
            } catch (e) {
                console.warn(`[SAT] Fallback TLE parse failed for ${sat.name}`);
            }
        }
        this._loadedFrom = 'fallback';
        this.stats.total = this.records.length;
        this.stats.source = 'offline fallback';
        console.log(`[SAT] Loaded ${this.records.length} satellites from fallback`);
    }

    async _autoRefresh() {
        if (this._loadedFrom === 'backend' && this._apiBase) {
            try {
                await this.loadFromBackend();
            } catch (e) {
                console.warn('[SAT] Auto-refresh failed:', e.message);
            }
        }
    }

    /**
     * Search the catalog.
     */
    async search(query) {
        if (!this._apiBase) return [];
        try {
            const resp = await fetch(
                `${this._apiBase}/api/satellites/catalog/search?q=${encodeURIComponent(query)}`,
                { headers: { 'Authorization': `Bearer ${this._authToken}` } }
            );
            if (!resp.ok) return [];
            const data = await resp.json();
            return data.results || [];
        } catch (e) {
            // Local search fallback
            const q = query.toUpperCase();
            return this.records
                .filter(r => r.meta.name.toUpperCase().includes(q) || String(r.meta.noradId) === query)
                .slice(0, 50)
                .map(r => r.meta);
        }
    }

    /**
     * Get catalog summary from backend.
     */
    async getSummary() {
        if (!this._apiBase) return this.stats;
        try {
            const resp = await fetch(
                `${this._apiBase}/api/satellites/catalog/summary`,
                { headers: { 'Authorization': `Bearer ${this._authToken}` } }
            );
            if (!resp.ok) return this.stats;
            return await resp.json();
        } catch (e) {
            return this.stats;
        }
    }

    /**
     * Propagate all satellites to a given JS Date.
     * Returns array of { key, name, type, special, lat, lon, alt, velocityKmS, ... }
     */
    propagateAll(date) {
        const results = [];
        const gmst = satellite.gstime(date);

        for (const rec of this.records) {
            try {
                const posVel = satellite.propagate(rec.satrec, date);
                if (!posVel.position) continue;

                const gd = satellite.eciToGeodetic(posVel.position, gmst);
                const lon = satellite.degreesLong(gd.longitude);
                const lat = satellite.degreesLat(gd.latitude);
                const alt = gd.height * 1000; // km → m

                let velocityKmS = 0;
                if (posVel.velocity) {
                    const v = posVel.velocity;
                    velocityKmS = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
                }

                results.push({
                    key: rec.key,
                    name: rec.meta.name,
                    type: rec.meta.type,
                    baseType: rec.meta.baseType,
                    orbitRegime: rec.meta.orbitRegime,
                    country: rec.meta.country,
                    flag: rec.meta.flag,
                    special: rec.meta.special,
                    noradId: rec.meta.noradId,
                    rcsSize: rec.meta.rcsSize,
                    launchDate: rec.meta.launchDate,
                    inclination: rec.meta.inclination,
                    lat, lon, alt,
                    velocityKmS,
                });
            } catch (e) {
                // SGP4 can fail for decayed orbits — skip silently
            }
        }
        return results;
    }

    /**
     * Compute orbit path for a single satellite.
     */
    computeOrbit(key, date, points = 120) {
        const rec = this.records.find(r => r.key === key);
        if (!rec) return [];

        const meanMotion = rec.satrec.no * (1440 / (2 * Math.PI));
        const periodMs = (86400000 / meanMotion) || 5400000;
        const step = periodMs / points;
        const path = [];

        for (let i = 0; i < points; i++) {
            const t = new Date(date.getTime() + i * step);
            try {
                const gmst = satellite.gstime(t);
                const posVel = satellite.propagate(rec.satrec, t);
                if (!posVel.position) continue;

                const gd = satellite.eciToGeodetic(posVel.position, gmst);
                path.push({
                    lat: satellite.degreesLat(gd.latitude),
                    lon: satellite.degreesLong(gd.longitude),
                    alt: gd.height * 1000,
                    time: t,
                });
            } catch (e) {
                // skip
            }
        }
        return path;
    }
}
