/**
 * GDI — Global Defense Intelligence
 * Data Layer Management
 *
 * Each layer class manages its own Cesium entities, data fetching,
 * and update lifecycle. The main app just calls enable/disable/update.
 */

// ═══════════════════════════════════════════════════════════════════
//  FLIGHT LAYER — OpenSky Network
// ═══════════════════════════════════════════════════════════════════

class FlightLayer {

    constructor(viewer) {
        this.viewer = viewer;
        this.dataSource = new Cesium.CustomDataSource('flights');
        this.viewer.dataSources.add(this.dataSource);
        this._enabled = false;
        this._interval = null;
        this._tracks = new Map(); // icao24 → { positions: [], entity }
        this._status = 'IDLE';
        this._lastCount = 0;
        this._lastUpdate = null;
    }

    get enabled() { return this._enabled; }
    get status() { return this._status; }
    get count() { return this._lastCount; }
    get lastUpdate() { return this._lastUpdate; }

    enable() {
        if (this._enabled) return;
        this._enabled = true;
        this.dataSource.show = true;
        this._fetch();
        this._interval = setInterval(() => this._fetch(), GDI_CONFIG.intervals.flights);
        console.log('[FLIGHTS] Enabled');
    }

    disable() {
        this._enabled = false;
        this.dataSource.show = false;
        if (this._interval) clearInterval(this._interval);
        this._interval = null;
        this._status = 'DISABLED';
        console.log('[FLIGHTS] Disabled');
    }

    async _fetch() {
        if (!this._enabled) return;
        this._status = 'FETCHING';

        try {
            // ── Primary: Valkyrie Backend ───────────────────────
            if (window.gdiAuth && window.gdiAuth.isAuthenticated) {
                let url = '/api/flights';
                const rect = this.viewer.camera.computeViewRectangle();
                if (rect) {
                    const west = Cesium.Math.toDegrees(rect.west);
                    const south = Cesium.Math.toDegrees(rect.south);
                    const east = Cesium.Math.toDegrees(rect.east);
                    const north = Cesium.Math.toDegrees(rect.north);
                    const span = Math.max(east - west, north - south);
                    if (span < 60) {
                        url += `?south=${south.toFixed(2)}&west=${west.toFixed(2)}&north=${north.toFixed(2)}&east=${east.toFixed(2)}`;
                    }
                }

                const resp = await window.gdiAuth.fetch(url);
                if (resp.ok) {
                    const data = await resp.json();
                    this._processStates(data.states || []);
                    this._status = 'LIVE';
                    this._lastUpdate = new Date();
                    return;
                }
            }

            // ── Fallback: Direct API ────────────────────────────
            let url = GDI_CONFIG.endpoints.opensky;
            const rect = this.viewer.camera.computeViewRectangle();
            if (rect) {
                const west = Cesium.Math.toDegrees(rect.west);
                const south = Cesium.Math.toDegrees(rect.south);
                const east = Cesium.Math.toDegrees(rect.east);
                const north = Cesium.Math.toDegrees(rect.north);
                const span = Math.max(east - west, north - south);
                if (span < 60) {
                    url += `?lamin=${south.toFixed(2)}&lomin=${west.toFixed(2)}&lamax=${north.toFixed(2)}&lomax=${east.toFixed(2)}`;
                }
            }

            const resp = await fetch(url);
            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
            const data = await resp.json();

            this._processStates(data.states || []);
            this._status = 'LIVE';
            this._lastUpdate = new Date();
        } catch (e) {
            console.warn('[FLIGHTS] Online fetch failed, trying offline cache:', e.message);
            await this._fetchOffline();
        }
    }

    async _fetchOffline() {
        try {
            const cachePath = GDI_CONFIG.offlineData?.flightCache + 'latest.json';
            if (!cachePath) { this._status = 'OFFLINE'; return; }
            const resp = await fetch(cachePath);
            if (!resp.ok) throw new Error(`Cache HTTP ${resp.status}`);
            const data = await resp.json();
            this._processStates(data.states || []);
            this._status = 'CACHED';
            this._lastUpdate = new Date();
            console.log('[FLIGHTS] Loaded from offline cache');
        } catch (e2) {
            console.warn('[FLIGHTS] Offline cache also unavailable:', e2.message);
            this._status = 'OFFLINE';
        }
    }

    _processStates(states) {
        const seen = new Set();
        let count = 0;

        for (const s of states) {
            const icao = s[0];
            const callsign = (s[1] || '').trim() || icao;
            const country = s[2] || 'Unknown';
            const lon = s[5];
            const lat = s[6];
            const alt = s[7] || s[13] || 0; // baro_altitude or geo_altitude
            const velocity = s[9] || 0;
            const heading = s[10] || 0;
            const vertRate = s[11] || 0;
            const squawk = s[14] || '----';
            const category = s[17] || 0;
            const onGround = s[8];

            if (lat == null || lon == null || onGround) continue;

            seen.add(icao);
            count++;

            // Altitude-based color
            const altConf = GDI_CONFIG.flights.altitudeColors;
            let color;
            if (alt < altConf.low.max) color = Cesium.Color.fromCssColorString(altConf.low.color);
            else if (alt < altConf.mid.max) color = Cesium.Color.fromCssColorString(altConf.mid.color);
            else color = Cesium.Color.fromCssColorString(altConf.high.color);

            const position = Cesium.Cartesian3.fromDegrees(lon, lat, alt);

            // Track history
            let track = this._tracks.get(icao);
            if (!track) {
                track = { positions: [], entity: null, callsign };
                this._tracks.set(icao, track);
            }

            track.positions.push(position);
            if (track.positions.length > GDI_CONFIG.flights.maxTrailPoints) {
                track.positions.shift();
            }
            track.callsign = callsign;

            // Is this a military-type category?
            const isMilitary = category >= 13 || category === 6;
            const pointSize = isMilitary ? 10 : 7;

            if (!track.entity) {
                track.entity = this.dataSource.entities.add({
                    id: `flight_${icao}`,
                    position: position,
                    point: {
                        pixelSize: pointSize,
                        color: color,
                        outlineColor: Cesium.Color.BLACK,
                        outlineWidth: 1,
                    },
                    label: {
                        text: callsign,
                        font: '11px Share Tech Mono',
                        fillColor: color,
                        outlineColor: Cesium.Color.BLACK,
                        outlineWidth: 2,
                        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
                        pixelOffset: new Cesium.Cartesian2(12, -4),
                        showBackground: false,
                        scale: 0.9,
                    },
                    polyline: {
                        positions: [...track.positions],
                        width: 1.5,
                        material: color.withAlpha(0.4),
                        clampToGround: false,
                    },
                    properties: {
                        type: 'flight',
                        icao: icao,
                        callsign: callsign,
                        country: country,
                        altitude: alt,
                        velocity: velocity,
                        heading: heading,
                        vertRate: vertRate,
                        squawk: squawk,
                        category: GDI_CONFIG.flights.categories[category] || 'Unknown',
                        isMilitary: isMilitary,
                    },
                });
            } else {
                track.entity.position = position;
                track.entity.point.color = color;
                track.entity.point.pixelSize = pointSize;
                track.entity.label.text = callsign;
                track.entity.label.fillColor = color;
                track.entity.polyline.positions = [...track.positions];
                track.entity.polyline.material = color.withAlpha(0.4);
            }
        }

        // Remove stale aircraft
        for (const [icao, track] of this._tracks) {
            if (!seen.has(icao)) {
                if (track.entity) {
                    this.dataSource.entities.remove(track.entity);
                }
                this._tracks.delete(icao);
            }
        }

        this._lastCount = count;
    }


    /**
     * INTEL SUMMARY — pure compute, no LLM.
     * Returns structured intelligence picture for this domain.
     */
    getIntelSummary() {
        const tracks = [...this._tracks.values()];
        const total = tracks.length;
        if (total === 0) return { domain: 'AIR', status: this._status, total: 0, summary: 'No aircraft in view.' };

        // Category breakdown
        const military = [], highAlt = [], fastMov = [], squawkEmerg = [];
        const countryMap = {};

        for (const [icao, track] of this._tracks) {
            const e = track.entity;
            if (!e) continue;
            const p = e.properties;
            if (!p) continue;
            const isMil = p.isMilitary?.getValue();
            const alt = p.altitude?.getValue() || 0;
            const vel = p.velocity?.getValue() || 0;
            const sq  = p.squawk?.getValue() || '----';
            const country = p.country?.getValue() || 'Unknown';

            if (isMil) military.push({ icao, callsign: track.callsign, alt, vel });
            if (alt > 12000) highAlt.push({ icao, callsign: track.callsign, alt });
            if (vel > 300) fastMov.push({ icao, callsign: track.callsign, vel });
            if (['7500','7600','7700'].includes(sq)) squawkEmerg.push({ icao, callsign: track.callsign, squawk: sq });
            countryMap[country] = (countryMap[country] || 0) + 1;
        }

        // Top countries
        const topCountries = Object.entries(countryMap)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([c, n]) => `${c}:${n}`);

        // Anomaly score 0–100
        let anomaly = 0;
        if (squawkEmerg.length > 0) anomaly += 40 * squawkEmerg.length;
        if (military.length > 5) anomaly += 20;
        if (fastMov.length > 10) anomaly += 10;
        anomaly = Math.min(anomaly, 100);

        return {
            domain: 'AIR',
            status: this._status,
            total,
            military: military.length,
            highAlt: highAlt.length,
            emergencySquawk: squawkEmerg,
            topCountries,
            anomalyScore: anomaly,
            alerts: squawkEmerg.map(s => {
                const labels = { '7500': 'HIJACK', '7600': 'COMMS FAILURE', '7700': 'EMERGENCY' };
                return { severity: 'CRITICAL', msg: `${s.callsign} squawking ${s.squawk} (${labels[s.squawk]})` };
            }),
            lastUpdate: this._lastUpdate,
        };
    }

    destroy() {
        this.disable();
        this.viewer.dataSources.remove(this.dataSource);
    }
}


// ═══════════════════════════════════════════════════════════════════
//  SEISMIC LAYER — USGS Earthquake Feed
// ═══════════════════════════════════════════════════════════════════

class SeismicLayer {

    constructor(viewer) {
        this.viewer = viewer;
        this.dataSource = new Cesium.CustomDataSource('seismic');
        this.viewer.dataSources.add(this.dataSource);
        this._enabled = false;
        this._interval = null;
        this._status = 'IDLE';
        this._lastCount = 0;
        this._lastUpdate = null;
        this._pulsePhase = 0;
    }

    get enabled() { return this._enabled; }
    get status() { return this._status; }
    get count() { return this._lastCount; }
    get lastUpdate() { return this._lastUpdate; }

    enable() {
        if (this._enabled) return;
        this._enabled = true;
        this.dataSource.show = true;
        this._fetch();
        this._interval = setInterval(() => this._fetch(), GDI_CONFIG.intervals.seismic);
        console.log('[SEISMIC] Enabled');
    }

    disable() {
        this._enabled = false;
        this.dataSource.show = false;
        if (this._interval) clearInterval(this._interval);
        this._interval = null;
        this._status = 'DISABLED';
        console.log('[SEISMIC] Disabled');
    }

    async _fetch() {
        if (!this._enabled) return;
        this._status = 'FETCHING';

        try {
            // ── Primary: Valkyrie Backend ───────────────────────
            if (window.gdiAuth && window.gdiAuth.isAuthenticated) {
                const resp = await window.gdiAuth.fetch('/api/seismic?period=all_day');
                if (resp.ok) {
                    const data = await resp.json();
                    this._processFeatures(data.features || []);
                    this._status = 'LIVE';
                    this._lastUpdate = new Date();
                    return;
                }
            }

            // ── Fallback: Direct USGS API ───────────────────────
            const lookback = GDI_CONFIG.seismic.lookbackHours;
            const start = new Date(Date.now() - lookback * 3600000).toISOString();
            const url = `${GDI_CONFIG.endpoints.usgs}?format=geojson&starttime=${start}&minmagnitude=${GDI_CONFIG.seismic.minMagnitude}`;

            const resp = await fetch(url);
            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
            const data = await resp.json();

            this._processFeatures(data.features || []);
            this._status = 'LIVE';
            this._lastUpdate = new Date();
        } catch (e) {
            console.warn('[SEISMIC] Online fetch failed, trying offline cache:', e.message);
            await this._fetchOffline();
        }
    }

    async _fetchOffline() {
        try {
            const cachePath = GDI_CONFIG.offlineData?.seismicCache + 'latest.json';
            if (!cachePath) { this._status = 'OFFLINE'; return; }
            const resp = await fetch(cachePath);
            if (!resp.ok) throw new Error(`Cache HTTP ${resp.status}`);
            const data = await resp.json();
            this._processFeatures(data.features || []);
            this._status = 'CACHED';
            this._lastUpdate = new Date();
            console.log('[SEISMIC] Loaded from offline cache');
        } catch (e2) {
            console.warn('[SEISMIC] Offline cache also unavailable:', e2.message);
            this._status = 'OFFLINE';
        }
    }

    _processFeatures(features) {
        this.dataSource.entities.removeAll();
        let count = 0;

        for (const f of features) {
            const props = f.properties;
            const coords = f.geometry.coordinates; // [lon, lat, depth]
            const mag = props.mag;
            const place = props.place || 'Unknown';
            const time = new Date(props.time);
            const depth = coords[2];

            // Color by magnitude
            const magConf = GDI_CONFIG.seismic.magnitudeColors;
            let colorStr;
            if (mag < magConf.low.max) colorStr = magConf.low.color;
            else if (mag < magConf.mid.max) colorStr = magConf.mid.color;
            else colorStr = magConf.high.color;

            const color = Cesium.Color.fromCssColorString(colorStr);
            const radius = Math.pow(2, mag) * 500; // exponential scaling

            // Create pulsing ellipse
            const entity = this.dataSource.entities.add({
                id: `quake_${f.id}`,
                position: Cesium.Cartesian3.fromDegrees(coords[0], coords[1]),
                ellipse: {
                    semiMajorAxis: radius,
                    semiMinorAxis: radius,
                    material: color.withAlpha(0.35),
                    outline: true,
                    outlineColor: color.withAlpha(0.8),
                    outlineWidth: 2,
                    height: 0,
                },
                point: {
                    pixelSize: 6,
                    color: color,
                    outlineColor: Cesium.Color.WHITE,
                    outlineWidth: 1,
                },
                label: {
                    text: `M${mag.toFixed(1)}`,
                    font: '11px Share Tech Mono',
                    fillColor: color,
                    outlineColor: Cesium.Color.BLACK,
                    outlineWidth: 2,
                    style: Cesium.LabelStyle.FILL_AND_OUTLINE,
                    pixelOffset: new Cesium.Cartesian2(0, -18),
                    scale: 0.9,
                },
                properties: {
                    type: 'seismic',
                    magnitude: mag,
                    depth: depth,
                    place: place,
                    time: time.toISOString(),
                },
            });

            count++;
        }
        this._lastCount = count;
    }


    /**
     * INTEL SUMMARY — pure compute, no LLM.
     */
    getIntelSummary() {
        const entities = this.dataSource.entities.values;
        const total = entities.length;
        if (total === 0) return { domain: 'SEISMIC', status: this._status, total: 0, summary: 'No seismic events in window.' };

        const events = [];
        for (const e of entities) {
            const p = e.properties;
            if (!p) continue;
            events.push({
                mag:   p.magnitude?.getValue() || 0,
                depth: p.depth?.getValue() || 0,
                place: p.place?.getValue() || 'Unknown',
                time:  p.time?.getValue() || '',
            });
        }

        events.sort((a, b) => b.mag - a.mag);
        const maxMag = events[0]?.mag || 0;
        const avgMag = events.reduce((s, e) => s + e.mag, 0) / total;
        const major  = events.filter(e => e.mag >= 6.0);
        const significant = events.filter(e => e.mag >= 4.5);
        const shallow = events.filter(e => e.depth < 70);  // shallow = higher surface damage
        const top3 = events.slice(0, 3);

        // Anomaly: major quake, or cluster of significant quakes
        let anomaly = 0;
        if (maxMag >= 7.0) anomaly = 90;
        else if (maxMag >= 6.0) anomaly = 60;
        else if (major.length > 0) anomaly = 50;
        else if (significant.length > 3) anomaly = 30;
        anomaly = Math.min(anomaly, 100);

        return {
            domain: 'SEISMIC',
            status: this._status,
            total,
            maxMagnitude: maxMag.toFixed(1),
            avgMagnitude: avgMag.toFixed(1),
            majorEvents: major.length,
            significantEvents: significant.length,
            shallowEvents: shallow.length,
            top3: top3.map(e => ({ mag: e.mag.toFixed(1), place: e.place, depth: `${e.depth.toFixed(0)}km` })),
            anomalyScore: anomaly,
            alerts: major.map(e => ({
                severity: e.mag >= 7.0 ? 'CRITICAL' : 'HIGH',
                msg: `M${e.mag.toFixed(1)} at ${e.place} (depth ${e.depth.toFixed(0)}km)`,
            })),
            lastUpdate: this._lastUpdate,
        };
    }

    destroy() {
        this.disable();
        this.viewer.dataSources.remove(this.dataSource);
    }
}


// ═══════════════════════════════════════════════════════════════════
//  SATELLITE LAYER — TLE Propagation
// ═══════════════════════════════════════════════════════════════════

class SatelliteLayer {

    constructor(viewer) {
        this.viewer = viewer;
        this.dataSource = new Cesium.CustomDataSource('satellites');
        this.viewer.dataSources.add(this.dataSource);
        this._enabled = false;
        this._interval = null;
        this._propagator = new SatellitePropagator();
        this._orbitEntities = new Map();
        this._satEntities = new Map();
        this._status = 'IDLE';
        this._lastCount = 0;

        // ── Display filters (v2.0) ──────────────────────────
        this._showDebris = false;       // Off by default (too many)
        this._showRocketBodies = false; // Off by default
        this._showStarlink = true;      // On but tiny dots
        this._maxDebrisRender = 2000;   // Cap for performance
        this._maxStarlinkRender = 3000;
    }

    get enabled() { return this._enabled; }
    get status() { return this._status; }
    get count() { return this._lastCount; }
    get propagator() { return this._propagator; }

    /**
     * Initialize with backend connection.
     */
    async initBackend(apiBase, authToken) {
        await this._propagator.init(apiBase, authToken);
    }

    // ── Display filter controls ─────────────────────────────
    toggleDebris() { this._showDebris = !this._showDebris; this._rebuildEntities(); return this._showDebris; }
    toggleRocketBodies() { this._showRocketBodies = !this._showRocketBodies; this._rebuildEntities(); return this._showRocketBodies; }
    toggleStarlink() { this._showStarlink = !this._showStarlink; this._rebuildEntities(); return this._showStarlink; }

    _rebuildEntities() {
        // Clear and rebuild on next update
        this.dataSource.entities.removeAll();
        this._satEntities.clear();
        this._orbitEntities.clear();
        if (this._enabled) this._update();
    }

    enable() {
        if (this._enabled) return;
        this._enabled = true;
        this.dataSource.show = true;
        this._update();
        this._interval = setInterval(() => this._update(), GDI_CONFIG.intervals.satellites);
        console.log(`[SATELLITES] Enabled — ${this._propagator.records.length} objects loaded`);
    }

    disable() {
        this._enabled = false;
        this.dataSource.show = false;
        if (this._interval) clearInterval(this._interval);
        this._interval = null;
        this._status = 'DISABLED';
        console.log('[SATELLITES] Disabled');
    }

    _shouldRender(sat) {
        // Filter based on display settings
        if (sat.baseType === 'debris' && !this._showDebris) return false;
        if (sat.baseType === 'rocket_body' && !this._showRocketBodies) return false;
        if (sat.type === 'starlink' && !this._showStarlink) return false;
        return true;
    }

    _getColor(sat) {
        // Extended color palette for OMNISCIENT v2.0
        switch (sat.type) {
            case 'station':    return Cesium.Color.CYAN;
            case 'gps':        return Cesium.Color.fromCssColorString('#ffb000');
            case 'glonass':    return Cesium.Color.fromCssColorString('#ff6600');
            case 'galileo':    return Cesium.Color.fromCssColorString('#00ff88');
            case 'beidou':     return Cesium.Color.fromCssColorString('#ff4488');
            case 'starlink':   return Cesium.Color.fromCssColorString('#666666');
            case 'oneweb':     return Cesium.Color.fromCssColorString('#888888');
            case 'iridium':    return Cesium.Color.fromCssColorString('#aaaaaa');
            case 'recon':      return Cesium.Color.fromCssColorString('#ff0040');
            case 'weather':    return Cesium.Color.fromCssColorString('#00b4d8');
            case 'telescope':  return Cesium.Color.fromCssColorString('#c77dff');
            case 'science':    return Cesium.Color.fromCssColorString('#88ddff');
            case 'cosmos':     return Cesium.Color.fromCssColorString('#ff8844');
            default:
                // Color by base type
                switch (sat.baseType) {
                    case 'debris':      return Cesium.Color.fromCssColorString('#333333');
                    case 'rocket_body': return Cesium.Color.fromCssColorString('#555555');
                    default:            return Cesium.Color.WHITE;
                }
        }
    }

    _getPixelSize(sat) {
        if (sat.special) return 10;
        switch (sat.type) {
            case 'station':   return 10;
            case 'starlink':  return 1;
            case 'oneweb':    return 1;
            case 'iridium':   return 2;
            default:
                switch (sat.baseType) {
                    case 'debris':      return 1;
                    case 'rocket_body': return 2;
                    default:            return 4;
                }
        }
    }

    _update() {
        if (!this._enabled) return;

        try {
            const now = new Date();
            const sats = this._propagator.propagateAll(now);
            this._lastCount = sats.length;

            let rendered = 0;
            let debrisCount = 0;
            let starlinkCount = 0;

            for (const sat of sats) {
                // Apply display filters
                if (!this._shouldRender(sat)) continue;

                // Cap debris/starlink for performance
                if (sat.baseType === 'debris') {
                    debrisCount++;
                    if (debrisCount > this._maxDebrisRender) continue;
                }
                if (sat.type === 'starlink') {
                    starlinkCount++;
                    if (starlinkCount > this._maxStarlinkRender) continue;
                }

                const position = Cesium.Cartesian3.fromDegrees(sat.lon, sat.lat, sat.alt);
                const color = this._getColor(sat);
                const pixelSize = this._getPixelSize(sat);
                const isSpecial = sat.special;
                const showLabel = isSpecial || (sat.baseType === 'payload' && sat.type !== 'starlink' && sat.type !== 'oneweb' && sat.type !== 'iridium');

                let entity = this._satEntities.get(sat.key);
                if (!entity) {
                    entity = this.dataSource.entities.add({
                        id: `sat_${sat.key}`,
                        position: position,
                        point: {
                            pixelSize: pixelSize,
                            color: color,
                            outlineColor: Cesium.Color.BLACK,
                            outlineWidth: pixelSize > 3 ? 1 : 0,
                        },
                        label: {
                            text: showLabel ? sat.name : '',
                            font: '11px Share Tech Mono',
                            fillColor: color,
                            outlineColor: Cesium.Color.BLACK,
                            outlineWidth: 2,
                            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
                            pixelOffset: new Cesium.Cartesian2(12, -4),
                            scale: 0.85,
                            show: showLabel,
                            distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, isSpecial ? 50000000 : 15000000),
                        },
                        properties: {
                            type: 'satellite',
                            satType: sat.type,
                            baseType: sat.baseType,
                            orbitRegime: sat.orbitRegime,
                            name: sat.name,
                            noradId: sat.noradId,
                            country: sat.country,
                            flag: sat.flag,
                            altitude: sat.alt,
                            velocity: sat.velocityKmS,
                            rcsSize: sat.rcsSize,
                            launchDate: sat.launchDate,
                            inclination: sat.inclination,
                        },
                    });
                    this._satEntities.set(sat.key, entity);

                    // Draw orbit line for special + named payloads (not constellations, not debris)
                    if (isSpecial || (sat.baseType === 'payload' && !['starlink','oneweb','iridium','cosmos'].includes(sat.type))) {
                        this._drawOrbit(sat.key, now, color);
                    }
                } else {
                    entity.position = position;
                    entity.properties.altitude = sat.alt;
                    entity.properties.velocity = sat.velocityKmS;
                }

                rendered++;
            }

            this._status = 'LIVE';
        } catch (e) {
            console.warn('[SATELLITES] Update error:', e.message);
            this._status = 'ERROR';
        }
    }

    _drawOrbit(key, date, color) {
        const path = this._propagator.computeOrbit(key, date, 180);
        if (path.length < 2) return;

        const positions = path.map(p => Cesium.Cartesian3.fromDegrees(p.lon, p.lat, p.alt));

        const orbitEntity = this.dataSource.entities.add({
            id: `orbit_${key}`,
            polyline: {
                positions: positions,
                width: 1,
                material: color.withAlpha(0.25),
                clampToGround: false,
            },
        });
        this._orbitEntities.set(key, orbitEntity);
    }


    /**
     * INTEL SUMMARY — pure compute, no LLM.
     */
    getIntelSummary() {
        const records = this._propagator?.records || [];
        const total = records.length;
        if (total === 0) return { domain: 'SPACE', status: this._status, total: 0, summary: 'No TLE catalog loaded.' };

        // Classify catalog
        const typeMap = {};
        const orbitMap = {};
        let reconCount = 0, stationsCount = 0, gpsCount = 0, debrisCount = 0;

        for (const r of records) {
            typeMap[r.type] = (typeMap[r.type] || 0) + 1;
            orbitMap[r.orbitRegime] = (orbitMap[r.orbitRegime] || 0) + 1;
            if (r.type === 'recon') reconCount++;
            if (r.type === 'station') stationsCount++;
            if (r.type === 'gps' || r.type === 'glonass' || r.type === 'galileo' || r.type === 'beidou') gpsCount++;
            if (r.baseType === 'debris') debrisCount++;
        }

        // Rendered entities (currently visible)
        const rendered = this._satEntities.size;

        // Close approach: any sats with very low altitude (decaying)
        const decaying = records.filter(r => {
            const p = this._satEntities.get(r.key)?.properties;
            const alt = p?.altitude?.getValue();
            return alt && alt < 200000; // below 200km = decaying
        });

        return {
            domain: 'SPACE',
            status: this._status,
            total,
            rendered,
            reconSatellites: reconCount,
            navConstellations: gpsCount,
            spaceStations: stationsCount,
            debrisObjects: debrisCount,
            orbitRegimes: Object.entries(orbitMap).sort((a,b)=>b[1]-a[1]).slice(0,4).map(([k,v])=>`${k}:${v}`),
            decayingObjects: decaying.length,
            anomalyScore: decaying.length > 5 ? 40 : reconCount > 50 ? 20 : 0,
            alerts: decaying.length > 0 ? [{ severity: 'MEDIUM', msg: `${decaying.length} objects at decay-risk altitude (<200km)` }] : [],
            lastUpdate: this._lastUpdate,
        };
    }

    destroy() {
        this.disable();
        this.viewer.dataSources.remove(this.dataSource);
    }
}


// ═══════════════════════════════════════════════════════════════════
//  CCTV LAYER — Simulated Surveillance Nodes
// ═══════════════════════════════════════════════════════════════════

class CCTVLayer {

    constructor(viewer) {
        this.viewer = viewer;
        this.dataSource = new Cesium.CustomDataSource('cctv');
        this.viewer.dataSources.add(this.dataSource);
        this._enabled = false;
        this._blinkInterval = null;
        this._blinkState = false;
        this._status = 'IDLE';
    }

    get enabled() { return this._enabled; }
    get status() { return this._status; }
    get count() { return GDI_CONFIG.cctvNodes.length; }

    enable() {
        if (this._enabled) return;
        this._enabled = true;
        this.dataSource.show = true;

        if (this.dataSource.entities.values.length === 0) {
            this._createNodes();
        }

        // Blink animation
        this._blinkInterval = setInterval(() => {
            this._blinkState = !this._blinkState;
            const entities = this.dataSource.entities.values;
            for (const e of entities) {
                if (e.point) {
                    e.point.color = this._blinkState
                        ? Cesium.Color.fromCssColorString('#ff0040')
                        : Cesium.Color.fromCssColorString('#ff0040').withAlpha(0.3);
                }
            }
        }, 800);

        this._status = 'ACTIVE';
        console.log('[CCTV] Enabled');
    }

    disable() {
        this._enabled = false;
        this.dataSource.show = false;
        if (this._blinkInterval) clearInterval(this._blinkInterval);
        this._blinkInterval = null;
        this._status = 'DISABLED';
        console.log('[CCTV] Disabled');
    }

    _createNodes() {
        for (const node of GDI_CONFIG.cctvNodes) {
            this.dataSource.entities.add({
                id: `cctv_${node.id}`,
                position: Cesium.Cartesian3.fromDegrees(node.lon, node.lat, 100),
                point: {
                    pixelSize: 8,
                    color: Cesium.Color.fromCssColorString('#ff0040'),
                    outlineColor: Cesium.Color.BLACK,
                    outlineWidth: 2,
                },
                label: {
                    text: node.id,
                    font: '10px Share Tech Mono',
                    fillColor: Cesium.Color.fromCssColorString('#ff0040'),
                    outlineColor: Cesium.Color.BLACK,
                    outlineWidth: 2,
                    style: Cesium.LabelStyle.FILL_AND_OUTLINE,
                    pixelOffset: new Cesium.Cartesian2(12, -4),
                    scale: 0.8,
                },
                properties: {
                    type: 'cctv',
                    nodeId: node.id,
                    city: node.city,
                },
            });
        }
    }

    destroy() {
        this.disable();
        this.viewer.dataSources.remove(this.dataSource);
    }
}


// ═══════════════════════════════════════════════════════════════════
//  TRAFFIC LAYER — TomTom Real-Time Traffic Flow + Simulated Fallback
// ═══════════════════════════════════════════════════════════════════

class TrafficLayer {

    constructor(viewer) {
        this.viewer = viewer;
        this.dataSource = new Cesium.CustomDataSource('traffic');
        this.viewer.dataSources.add(this.dataSource);
        this._enabled = false;
        this._status = 'IDLE';
        this._trafficImagery = null;
        this._refreshInterval = null;
        this._useLive = false;
    }

    get enabled() { return this._enabled; }
    get status() { return this._status; }
    get count() {
        if (this._useLive) return this._trafficImagery ? 1 : 0;
        return GDI_CONFIG.trafficSegments.length;
    }

    enable() {
        if (this._enabled) return;
        this._enabled = true;

        const apiKey = GDI_CONFIG.TOMTOM_API_KEY;
        if (apiKey && apiKey.length > 10) {
            this._enableLive(apiKey);
        } else {
            // Fallback to simulated segments
            this.dataSource.show = true;
            if (this.dataSource.entities.values.length === 0) {
                this._createSimSegments();
            }
            this._status = 'SIM';
            console.log('[TRAFFIC] No TomTom key — using simulated segments');
        }

        console.log('[TRAFFIC] Enabled');
    }

    disable() {
        this._enabled = false;
        this.dataSource.show = false;

        // Remove live imagery layer
        if (this._trafficImagery) {
            this.viewer.imageryLayers.remove(this._trafficImagery, false);
            this._trafficImagery = null;
        }
        if (this._refreshInterval) {
            clearInterval(this._refreshInterval);
            this._refreshInterval = null;
        }

        this._useLive = false;
        this._status = 'DISABLED';
        console.log('[TRAFFIC] Disabled');
    }

    _enableLive(apiKey) {
        this._useLive = true;
        this.dataSource.show = false; // hide sim segments

        // TomTom Raster Flow Tiles — relative speed coloring
        // Tiles show: green = free flow, yellow = slow, red = congested
        const trafficProvider = new Cesium.UrlTemplateImageryProvider({
            url: `https://api.tomtom.com/traffic/map/4/tile/flow/relative/{z}/{x}/{y}.png?key=${apiKey}&tileSize=512&thickness=6`,
            minimumLevel: 5,
            maximumLevel: 18,
            tileWidth: 512,
            tileHeight: 512,
            credit: new Cesium.Credit('© TomTom Traffic'),
        });

        this._trafficImagery = this.viewer.imageryLayers.addImageryProvider(trafficProvider);
        this._trafficImagery.alpha = 0.85;
        this._trafficImagery.brightness = 1.2;

        this._status = 'LIVE';
        console.log('[TRAFFIC] TomTom live traffic tiles loaded');

        // Refresh every 2 minutes (tiles are cached by TomTom for ~1 min)
        this._refreshInterval = setInterval(() => {
            if (!this._enabled || !this._useLive) return;
            // Force tile reload by removing and re-adding
            if (this._trafficImagery) {
                const alpha = this._trafficImagery.alpha;
                this.viewer.imageryLayers.remove(this._trafficImagery, false);
                const newProvider = new Cesium.UrlTemplateImageryProvider({
                    url: `https://api.tomtom.com/traffic/map/4/tile/flow/relative/{z}/{x}/{y}.png?key=${apiKey}&tileSize=512&thickness=6&t=${Date.now()}`,
                    minimumLevel: 5,
                    maximumLevel: 18,
                    tileWidth: 512,
                    tileHeight: 512,
                    credit: new Cesium.Credit('© TomTom Traffic'),
                });
                this._trafficImagery = this.viewer.imageryLayers.addImageryProvider(newProvider);
                this._trafficImagery.alpha = alpha;
                this._trafficImagery.brightness = 1.2;
                console.log('[TRAFFIC] Tiles refreshed');
            }
        }, GDI_CONFIG.intervals.traffic * 4); // 2 min
    }

    _createSimSegments() {
        const flowColors = {
            green: '#00ff41',
            yellow: '#ffb000',
            red: '#ff0040',
        };

        for (let i = 0; i < GDI_CONFIG.trafficSegments.length; i++) {
            const seg = GDI_CONFIG.trafficSegments[i];
            const positions = [];
            for (const pt of seg.points) {
                positions.push(Cesium.Cartesian3.fromDegrees(pt[1], pt[0], 50));
            }

            const color = Cesium.Color.fromCssColorString(flowColors[seg.flow] || '#ffffff');

            this.dataSource.entities.add({
                id: `traffic_${i}`,
                polyline: {
                    positions: positions,
                    width: 5,
                    material: color.withAlpha(0.7),
                    clampToGround: true,
                },
                properties: {
                    type: 'traffic',
                    name: seg.name,
                    flow: seg.flow,
                },
            });
        }
    }

    destroy() {
        this.disable();
        this.viewer.dataSources.remove(this.dataSource);
    }
}
