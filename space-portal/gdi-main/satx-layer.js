/**
 * GDI — Global Defense Intelligence
 * SATx Integration Layer
 *
 * Connects to the SATx backend API server to render:
 *   - Satellite ground tracks (SGP4 from TLEs in DB)
 *   - Signal detections (pulsing markers, color-coded)
 *   - Pass predictions (arc overlays)
 *   - Live pass tracking (moving satellite icon)
 *   - Alert notifications in the HUD
 *   - WebSocket real-time updates
 *
 * Integrates with GDI's layer toggle system, info overlay, and HUD.
 *
 * @requires Cesium
 * @requires satellite.js
 * @requires GDI_CONFIG (config.js)
 */

// ═══════════════════════════════════════════════════════════════════
//  SATX LAYER — Signal Intelligence
// ═══════════════════════════════════════════════════════════════════

class SATxLayer {

    /**
     * @param {Cesium.Viewer} viewer — GDI Cesium viewer instance
     * @param {object} [options] — Override defaults
     */
    constructor(viewer, options = {}) {
        this.viewer = viewer;

        // ── Configuration ───────────────────────────────────────────
        this.apiBase = options.apiBase || GDI_CONFIG.endpoints?.satx || 'http://localhost:8600';
        this.wsUrl = options.wsUrl || this.apiBase.replace('http', 'ws') + '/ws/live';

        // ── State ───────────────────────────────────────────────────
        this._enabled = false;
        this._status = 'IDLE';
        this._lastCount = 0;

        // ── Data Sources ────────────────────────────────────────────
        this.dsDetections = new Cesium.CustomDataSource('satx-detections');
        this.dsPasses = new Cesium.CustomDataSource('satx-passes');
        this.dsAlerts = new Cesium.CustomDataSource('satx-alerts');
        this.viewer.dataSources.add(this.dsDetections);
        this.viewer.dataSources.add(this.dsPasses);
        this.viewer.dataSources.add(this.dsAlerts);

        // ── Entity Maps ─────────────────────────────────────────────
        this._detectionEntities = new Map();  // detection_id → entity
        this._passEntities = new Map();       // pass_id → { arc, satellite }
        this._livePassSats = new Map();       // pass_id → satellite entity

        // ── Intervals ───────────────────────────────────────────────
        this._intervals = [];
        this._pulsePhase = 0;

        // ── WebSocket ───────────────────────────────────────────────
        this._ws = null;
        this._wsReconnectTimer = null;
        this._wsReconnectDelay = 1000;

        // ── Alert Queue ─────────────────────────────────────────────
        this._alertQueue = [];
        this._alertVisible = false;

        // ── Detection color palette ─────────────────────────────────
        this.signalColors = {
            beacon:          '#00ff41',    // green — known beacon
            telemetry:       '#00b4d8',    // cyan — telemetry
            voice:           '#c77dff',    // purple — voice comms
            data:            '#ffb000',    // amber — data link
            cw:              '#ffffff',    // white — CW/morse
            burst:           '#ff6600',    // orange — burst transmission
            spread_spectrum: '#ff0040',    // red — spread spectrum
            interference:    '#666666',    // gray — interference
            unknown:         '#ff0040',    // red — unknown (attention)
        };

        // ── Pulse animation ─────────────────────────────────────────
        this._pulseInterval = null;
    }

    // ── Public Interface ────────────────────────────────────────────

    get enabled() { return this._enabled; }
    get status() { return this._status; }
    get count() { return this._lastCount; }

    /**
     * Enable the SATx layer — starts fetching data and opens WebSocket.
     */
    enable() {
        if (this._enabled) return;
        this._enabled = true;
        this.dsDetections.show = true;
        this.dsPasses.show = true;
        this.dsAlerts.show = true;

        // Initial data load
        this._fetchDetections();
        this._fetchLivePasses();
        this._fetchAlerts();

        // Polling intervals
        this._intervals.push(
            setInterval(() => this._fetchDetections(), 15000),   // detections every 15s
            setInterval(() => this._fetchLivePasses(), 10000),   // live passes every 10s
            setInterval(() => this._fetchAlerts(), 30000),       // alerts every 30s
        );

        // Pulse animation for detection markers
        this._pulseInterval = setInterval(() => this._animatePulse(), 50);

        // WebSocket connection
        this._connectWebSocket();

        this._status = 'CONNECTING';
        console.log('[SATx] Enabled');
    }

    /**
     * Disable the SATx layer — stops all fetching and closes WebSocket.
     */
    disable() {
        this._enabled = false;
        this.dsDetections.show = false;
        this.dsPasses.show = false;
        this.dsAlerts.show = false;

        // Clear intervals
        this._intervals.forEach(id => clearInterval(id));
        this._intervals = [];
        if (this._pulseInterval) clearInterval(this._pulseInterval);

        // Close WebSocket
        this._disconnectWebSocket();

        this._status = 'DISABLED';
        console.log('[SATx] Disabled');
    }

    /**
     * Destroy — full cleanup.
     */
    destroy() {
        this.disable();
        this.viewer.dataSources.remove(this.dsDetections);
        this.viewer.dataSources.remove(this.dsPasses);
        this.viewer.dataSources.remove(this.dsAlerts);
    }

    // ═══════════════════════════════════════════════════════════════
    //  DATA FETCHING
    // ═══════════════════════════════════════════════════════════════

    /**
     * Fetch recent signal detections from the SATx backend.
     * @private
     */
    async _fetchDetections() {
        if (!this._enabled) return;
        try {
            const resp = await fetch(`${this.apiBase}/api/detections/recent?n=200`);
            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
            const data = await resp.json();
            this._processDetections(data.detections || []);
            this._status = 'LIVE';
        } catch (e) {
            console.warn('[SATx] Detection fetch failed:', e.message);
            this._status = 'ERROR';
        }
    }

    /**
     * Fetch currently active passes.
     * @private
     */
    async _fetchLivePasses() {
        if (!this._enabled) return;
        try {
            const resp = await fetch(`${this.apiBase}/api/passes/live`);
            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
            const data = await resp.json();
            this._processLivePasses(data.passes || []);
        } catch (e) {
            console.warn('[SATx] Live pass fetch failed:', e.message);
        }
    }

    /**
     * Fetch unacknowledged alerts.
     * @private
     */
    async _fetchAlerts() {
        if (!this._enabled) return;
        try {
            const resp = await fetch(`${this.apiBase}/api/alerts?unacknowledged_only=true&limit=20`);
            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
            const data = await resp.json();
            this._processAlerts(data.alerts || []);
        } catch (e) {
            console.warn('[SATx] Alert fetch failed:', e.message);
        }
    }

    // ═══════════════════════════════════════════════════════════════
    //  DETECTION RENDERING
    // ═══════════════════════════════════════════════════════════════

    /**
     * Process and render signal detections on the globe.
     * @param {Array} detections — Array of detection objects from API
     * @private
     */
    _processDetections(detections) {
        const seen = new Set();
        let count = 0;

        for (const det of detections) {
            if (det.ground_lat == null || det.ground_lon == null) continue;

            const id = `det_${det.id}`;
            seen.add(id);
            count++;

            const colorStr = this.signalColors[det.signal_class] || this.signalColors.unknown;
            const color = Cesium.Color.fromCssColorString(colorStr);

            // Size based on SNR
            const baseSize = Math.min(4 + det.snr_db / 5, 16);

            // Confidence affects opacity
            const alpha = 0.4 + (det.confidence || 0) * 0.6;

            let entity = this._detectionEntities.get(id);
            if (!entity) {
                entity = this.dsDetections.entities.add({
                    id: id,
                    position: Cesium.Cartesian3.fromDegrees(
                        det.ground_lon, det.ground_lat, 50000
                    ),
                    point: {
                        pixelSize: baseSize,
                        color: color.withAlpha(alpha),
                        outlineColor: color,
                        outlineWidth: 1.5,
                    },
                    label: {
                        text: this._formatFrequency(det.frequency_hz),
                        font: '9px Share Tech Mono',
                        fillColor: color.withAlpha(0.7),
                        outlineColor: Cesium.Color.BLACK,
                        outlineWidth: 2,
                        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
                        pixelOffset: new Cesium.Cartesian2(14, -2),
                        scale: 0.8,
                        show: det.snr_db >= 10,  // only label strong signals
                    },
                    properties: {
                        type: 'satx_detection',
                        detectionId: det.id,
                        frequency: det.frequency_hz,
                        frequencyFormatted: this._formatFrequency(det.frequency_hz),
                        snr: det.snr_db,
                        confidence: det.confidence,
                        signalClass: det.signal_class || 'unknown',
                        modulation: det.modulation_type || '---',
                        protocol: det.protocol || '---',
                        peakTime: det.peak_time,
                        satelliteName: det.satellite_name || '---',
                        noradId: det.norad_id || '---',
                        baseSize: baseSize,
                    },
                });
                this._detectionEntities.set(id, entity);
            } else {
                entity.position = Cesium.Cartesian3.fromDegrees(
                    det.ground_lon, det.ground_lat, 50000
                );
            }
        }

        // Remove stale detections
        for (const [id, entity] of this._detectionEntities) {
            if (!seen.has(id)) {
                this.dsDetections.entities.remove(entity);
                this._detectionEntities.delete(id);
            }
        }

        this._lastCount = count;
    }

    // ═══════════════════════════════════════════════════════════════
    //  LIVE PASS RENDERING
    // ═══════════════════════════════════════════════════════════════

    /**
     * Process and render active satellite passes.
     * @param {Array} passes — Array of active pass objects with TLE data
     * @private
     */
    _processLivePasses(passes) {
        const seen = new Set();

        for (const pass of passes) {
            const id = `pass_${pass.id}`;
            seen.add(id);

            // If we have TLE data, propagate in real-time
            if (pass.tle_line1 && pass.tle_line2) {
                this._renderLivePass(pass);
            }

            // Draw pass arc (ground track during pass window)
            if (!this._passEntities.has(id)) {
                this._drawPassArc(pass);
            }
        }

        // Remove ended passes
        for (const [id, data] of this._passEntities) {
            if (!seen.has(id)) {
                if (data.arc) this.dsPasses.entities.remove(data.arc);
                if (data.satellite) this.dsPasses.entities.remove(data.satellite);
                if (data.label) this.dsPasses.entities.remove(data.label);
                this._passEntities.delete(id);
            }
        }
    }

    /**
     * Render a live satellite pass with real-time SGP4 position.
     * @param {object} pass — Pass object with TLE data
     * @private
     */
    _renderLivePass(pass) {
        const id = `pass_${pass.id}`;

        try {
            const satrec = satellite.twoline2satrec(pass.tle_line1, pass.tle_line2);
            const now = new Date();
            const gmst = satellite.gstime(now);
            const posVel = satellite.propagate(satrec, now);

            if (!posVel.position) return;

            const gd = satellite.eciToGeodetic(posVel.position, gmst);
            const lon = satellite.degreesLong(gd.longitude);
            const lat = satellite.degreesLat(gd.latitude);
            const alt = gd.height * 1000; // km → m

            const position = Cesium.Cartesian3.fromDegrees(lon, lat, alt);

            let data = this._passEntities.get(id);
            if (data && data.satellite) {
                data.satellite.position = position;
            } else {
                // Create satellite marker for live pass
                const satEntity = this.dsPasses.entities.add({
                    id: `livesat_${pass.id}`,
                    position: position,
                    point: {
                        pixelSize: 12,
                        color: Cesium.Color.fromCssColorString('#ff0040'),
                        outlineColor: Cesium.Color.WHITE,
                        outlineWidth: 2,
                    },
                    label: {
                        text: `▶ ${pass.satellite_name || 'SAT-' + pass.norad_id} [LIVE]`,
                        font: '11px Share Tech Mono',
                        fillColor: Cesium.Color.fromCssColorString('#ff0040'),
                        outlineColor: Cesium.Color.BLACK,
                        outlineWidth: 2,
                        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
                        pixelOffset: new Cesium.Cartesian2(16, -4),
                        scale: 0.9,
                    },
                    properties: {
                        type: 'satx_live_pass',
                        passId: pass.id,
                        satelliteName: pass.satellite_name,
                        noradId: pass.norad_id,
                        stationName: pass.station_name,
                        maxElevation: pass.max_elevation,
                        aosTime: pass.aos_time,
                        losTime: pass.los_time,
                        altitude: alt,
                    },
                });

                if (!data) {
                    data = { arc: null, satellite: satEntity };
                    this._passEntities.set(id, data);
                } else {
                    data.satellite = satEntity;
                }
            }
        } catch (e) {
            // SGP4 propagation can fail for edge cases
        }
    }

    /**
     * Draw the ground track arc for a pass.
     * @param {object} pass — Pass object
     * @private
     */
    _drawPassArc(pass) {
        if (!pass.tle_line1 || !pass.tle_line2) return;

        const id = `pass_${pass.id}`;

        try {
            const satrec = satellite.twoline2satrec(pass.tle_line1, pass.tle_line2);
            const aos = new Date(pass.aos_time);
            const los = new Date(pass.los_time);
            const duration = los - aos;
            const steps = 60;
            const stepMs = duration / steps;
            const positions = [];

            for (let i = 0; i <= steps; i++) {
                const t = new Date(aos.getTime() + i * stepMs);
                const gmst = satellite.gstime(t);
                const posVel = satellite.propagate(satrec, t);
                if (!posVel.position) continue;

                const gd = satellite.eciToGeodetic(posVel.position, gmst);
                positions.push(Cesium.Cartesian3.fromDegrees(
                    satellite.degreesLong(gd.longitude),
                    satellite.degreesLat(gd.latitude),
                    gd.height * 1000,
                ));
            }

            if (positions.length < 2) return;

            const arcEntity = this.dsPasses.entities.add({
                id: `arc_${pass.id}`,
                polyline: {
                    positions: positions,
                    width: 2,
                    material: new Cesium.PolylineGlowMaterialProperty({
                        glowPower: 0.2,
                        color: Cesium.Color.fromCssColorString('#ff0040').withAlpha(0.6),
                    }),
                    clampToGround: false,
                },
            });

            const data = this._passEntities.get(id) || {};
            data.arc = arcEntity;
            this._passEntities.set(id, data);
        } catch (e) {
            // Skip if TLE parsing fails
        }
    }

    // ═══════════════════════════════════════════════════════════════
    //  ALERT RENDERING
    // ═══════════════════════════════════════════════════════════════

    /**
     * Process alerts and show HUD notifications.
     * @param {Array} alerts — Array of alert objects
     * @private
     */
    _processAlerts(alerts) {
        for (const alert of alerts) {
            const existingIdx = this._alertQueue.findIndex(a => a.id === alert.id);
            if (existingIdx === -1) {
                this._alertQueue.push(alert);
                this._showAlertNotification(alert);
            }
        }

        // Prune acknowledged alerts
        this._alertQueue = this._alertQueue.filter(
            a => alerts.some(b => b.id === a.id)
        );

        // Update alert count badge
        this._updateAlertBadge(alerts.length);
    }

    /**
     * Show an alert notification in the GDI HUD.
     * @param {object} alert — Alert object
     * @private
     */
    _showAlertNotification(alert) {
        let container = document.getElementById('satx-alert-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'satx-alert-container';
            container.className = 'satx-alert-container';
            document.body.appendChild(container);
        }

        const severityColor = {
            critical: '#ff0040',
            warning:  '#ffb000',
            info:     '#00b4d8',
        };

        const color = severityColor[alert.severity] || severityColor.info;
        const icon = alert.severity === 'critical' ? '⚠' : alert.severity === 'warning' ? '△' : 'ℹ';

        const el = document.createElement('div');
        el.className = `satx-alert satx-alert-${alert.severity}`;
        el.style.borderColor = color;
        el.innerHTML = `
            <div class="satx-alert-header">
                <span class="satx-alert-icon" style="color:${color}">${icon}</span>
                <span class="satx-alert-severity" style="color:${color}">${alert.severity.toUpperCase()}</span>
                <span class="satx-alert-time">${new Date(alert.created_at).toLocaleTimeString('en-GB', {hour12: false})}</span>
                <button class="satx-alert-dismiss" data-alert-id="${alert.id}">✕</button>
            </div>
            <div class="satx-alert-title">${alert.title}</div>
            ${alert.message ? `<div class="satx-alert-message">${alert.message}</div>` : ''}
            ${alert.frequency_hz ? `<div class="satx-alert-detail">FREQ: ${this._formatFrequency(alert.frequency_hz)} | SNR: ${alert.snr_db?.toFixed(1)} dB</div>` : ''}
        `;

        // Dismiss handler
        el.querySelector('.satx-alert-dismiss').addEventListener('click', async (e) => {
            const alertId = e.target.dataset.alertId;
            try {
                await fetch(`${this.apiBase}/api/alerts/${alertId}/acknowledge`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ acknowledged_by: 'GDI-operator' }),
                });
            } catch (err) {
                console.warn('[SATx] Failed to acknowledge alert:', err);
            }
            el.style.opacity = '0';
            setTimeout(() => el.remove(), 300);
        });

        container.appendChild(el);

        // Auto-dismiss info alerts after 10s, warnings after 30s
        if (alert.severity === 'info') {
            setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.remove(), 300); }, 10000);
        } else if (alert.severity === 'warning') {
            setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.remove(), 300); }, 30000);
        }
    }

    /**
     * Update the alert count badge in the sidebar.
     * @param {number} count
     * @private
     */
    _updateAlertBadge(count) {
        let badge = document.getElementById('satx-alert-badge');
        if (!badge) return;
        badge.textContent = count;
        badge.style.display = count > 0 ? 'inline-block' : 'none';
    }

    // ═══════════════════════════════════════════════════════════════
    //  PULSE ANIMATION
    // ═══════════════════════════════════════════════════════════════

    /**
     * Animate detection markers with a pulsing effect.
     * @private
     */
    _animatePulse() {
        this._pulsePhase += 0.05;
        const pulse = 0.6 + 0.4 * Math.sin(this._pulsePhase);

        for (const [id, entity] of this._detectionEntities) {
            if (entity.point && entity.properties) {
                const baseSize = entity.properties.baseSize?.getValue() || 6;
                entity.point.pixelSize = baseSize * (0.8 + 0.4 * pulse);
                entity.point.outlineWidth = 1 + pulse;
            }
        }
    }

    // ═══════════════════════════════════════════════════════════════
    //  WEBSOCKET
    // ═══════════════════════════════════════════════════════════════

    /**
     * Connect to the SATx WebSocket for real-time updates.
     * @private
     */
    _connectWebSocket() {
        if (this._ws) return;

        try {
            this._ws = new WebSocket(this.wsUrl);

            this._ws.onopen = () => {
                console.log('[SATx] WebSocket connected');
                this._wsReconnectDelay = 1000; // reset backoff
                this._status = 'LIVE';

                // Subscribe to all channels
                this._ws.send(JSON.stringify({
                    type: 'subscribe',
                    channels: ['detections', 'passes', 'alerts'],
                }));
            };

            this._ws.onmessage = (event) => {
                try {
                    const msg = JSON.parse(event.data);
                    this._handleWSMessage(msg);
                } catch (e) {
                    // ignore parse errors
                }
            };

            this._ws.onclose = () => {
                console.log('[SATx] WebSocket closed');
                this._ws = null;
                if (this._enabled) {
                    this._scheduleReconnect();
                }
            };

            this._ws.onerror = (e) => {
                console.warn('[SATx] WebSocket error');
                // onclose will fire after this
            };
        } catch (e) {
            console.warn('[SATx] WebSocket connection failed:', e.message);
            this._scheduleReconnect();
        }
    }

    /**
     * Schedule WebSocket reconnection with exponential backoff.
     * @private
     */
    _scheduleReconnect() {
        if (this._wsReconnectTimer) return;
        this._wsReconnectTimer = setTimeout(() => {
            this._wsReconnectTimer = null;
            if (this._enabled) {
                console.log(`[SATx] Reconnecting WebSocket (delay: ${this._wsReconnectDelay}ms)...`);
                this._connectWebSocket();
            }
        }, this._wsReconnectDelay);
        this._wsReconnectDelay = Math.min(this._wsReconnectDelay * 2, 30000);
    }

    /**
     * Disconnect WebSocket cleanly.
     * @private
     */
    _disconnectWebSocket() {
        if (this._wsReconnectTimer) {
            clearTimeout(this._wsReconnectTimer);
            this._wsReconnectTimer = null;
        }
        if (this._ws) {
            this._ws.close();
            this._ws = null;
        }
    }

    /**
     * Handle incoming WebSocket messages.
     * @param {object} msg — Parsed message
     * @private
     */
    _handleWSMessage(msg) {
        switch (msg.type) {
            case 'new_detection':
                // Add to display immediately
                if (msg.data) {
                    this._processDetections([msg.data]);
                }
                break;

            case 'pass_update':
                // Refresh live passes
                this._fetchLivePasses();
                break;

            case 'alert':
                if (msg.data) {
                    this._showAlertNotification(msg.data);
                }
                break;

            case 'alert_ack':
                // Remove dismissed alert from queue
                this._alertQueue = this._alertQueue.filter(a => a.id !== msg.alert_id);
                break;

            case 'heartbeat':
                // Connection alive — no action needed
                break;

            case 'pong':
                // Response to our ping
                break;

            default:
                console.debug('[SATx] Unknown WS message type:', msg.type);
        }
    }

    // ═══════════════════════════════════════════════════════════════
    //  UTILITIES
    // ═══════════════════════════════════════════════════════════════

    /**
     * Format frequency in human-readable form.
     * @param {number} hz — Frequency in Hz
     * @returns {string}
     * @private
     */
    _formatFrequency(hz) {
        if (hz >= 1e9) return (hz / 1e9).toFixed(3) + ' GHz';
        if (hz >= 1e6) return (hz / 1e6).toFixed(3) + ' MHz';
        if (hz >= 1e3) return (hz / 1e3).toFixed(1) + ' kHz';
        return hz.toFixed(0) + ' Hz';
    }

    /**
     * Get stats from the backend for HUD display.
     * @returns {Promise<object>}
     */
    async getStats() {
        try {
            const resp = await fetch(`${this.apiBase}/api/stats`);
            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
            return await resp.json();
        } catch (e) {
            return null;
        }
    }
}
