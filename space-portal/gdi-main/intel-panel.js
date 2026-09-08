/**
 * GDI — Intelligence Panel & Alert System (Frontend)
 * 
 * Provides:
 *   - Alert notification toasts (top-right, auto-dismiss)
 *   - Alert sidebar panel (toggle with 'A' key)
 *   - HEKTOR search panel (toggle with 'H' key)
 *   - Measurement tools (toggle with 'M' key)
 *   - Sound alerts for CRITICAL+ severity
 *   - WebSocket alert consumption
 */

class GDI_IntelPanel {

    constructor(viewer, wsManager) {
        this.viewer = viewer;
        this.ws = wsManager;
        this.alerts = [];
        this.maxAlerts = 200;
        this._audioCtx = null;
        this._panelOpen = false;
        this._searchOpen = false;
        this._measureMode = false;
        this._measurePoints = [];
        this._measureEntities = [];

        this._createDOM();
        this._bindKeys();
        this._bindWebSocket();
    }

    // ── DOM Creation ────────────────────────────────────────

    _createDOM() {
        // Alert toast container
        this._toastContainer = document.createElement('div');
        this._toastContainer.id = 'gdi-toast-container';
        this._toastContainer.style.cssText = `
            position: fixed; top: 80px; right: 20px; z-index: 10000;
            display: flex; flex-direction: column; gap: 8px;
            max-height: 60vh; overflow-y: auto; pointer-events: none;
        `;
        document.body.appendChild(this._toastContainer);

        // Alert count badge (on sidebar)
        this._badge = document.createElement('div');
        this._badge.id = 'gdi-alert-badge';
        this._badge.style.cssText = `
            position: fixed; top: 12px; right: 60px; z-index: 10001;
            background: #ff0040; color: #fff; font-family: 'Fira Code', monospace;
            font-size: 11px; font-weight: bold; padding: 2px 8px; border-radius: 10px;
            display: none; cursor: pointer; pointer-events: all;
        `;
        this._badge.title = 'Press A to open alert panel';
        this._badge.onclick = () => this.togglePanel();
        document.body.appendChild(this._badge);

        // Alert sidebar panel
        this._panel = document.createElement('div');
        this._panel.id = 'gdi-alert-panel';
        this._panel.style.cssText = `
            position: fixed; top: 0; right: -400px; width: 400px; height: 100vh;
            background: rgba(0, 5, 10, 0.95); border-left: 1px solid #00ff4140;
            z-index: 9999; transition: right 0.3s ease; overflow-y: auto;
            font-family: 'Fira Code', monospace; color: #c0c0c0;
        `;
        this._panel.innerHTML = `
            <div style="padding: 16px; border-bottom: 1px solid #00ff4120;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="color: #ff0040; font-size: 14px; font-weight: bold;">⚠ ALERTS</span>
                    <span id="gdi-alert-count" style="color: #00ff41; font-size: 12px;">0 ACTIVE</span>
                </div>
                <div style="margin-top: 8px; display: flex; gap: 6px;">
                    <button onclick="window.gdiIntel.clearAlerts()" style="background: #1a1a2e; color: #c0c0c0; border: 1px solid #333; padding: 4px 10px; font-family: inherit; font-size: 10px; cursor: pointer; border-radius: 3px;">CLEAR ALL</button>
                    <button onclick="window.gdiIntel.ackAll()" style="background: #1a1a2e; color: #00ff41; border: 1px solid #00ff4140; padding: 4px 10px; font-family: inherit; font-size: 10px; cursor: pointer; border-radius: 3px;">ACK ALL</button>
                </div>
            </div>
            <div id="gdi-alert-list" style="padding: 8px;"></div>
        `;
        document.body.appendChild(this._panel);

        // HEKTOR Search panel
        this._searchPanel = document.createElement('div');
        this._searchPanel.id = 'gdi-search-panel';
        this._searchPanel.style.cssText = `
            position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
            width: 600px; max-height: 70vh; background: rgba(0, 5, 10, 0.97);
            border: 1px solid #00ff4140; border-radius: 8px; z-index: 10002;
            font-family: 'Fira Code', monospace; display: none; overflow: hidden;
        `;
        this._searchPanel.innerHTML = `
            <div style="padding: 16px; border-bottom: 1px solid #00ff4120;">
                <div style="color: #00b4d8; font-size: 14px; font-weight: bold; margin-bottom: 8px;">🔍 HEKTOR INTELLIGENCE SEARCH</div>
                <div style="display: flex; gap: 8px;">
                    <input id="gdi-search-input" type="text" placeholder="Search intelligence memory..."
                        style="flex: 1; background: #0a0a1a; color: #00ff41; border: 1px solid #00ff4140;
                        padding: 8px 12px; font-family: inherit; font-size: 12px; border-radius: 4px; outline: none;"
                    />
                    <button onclick="window.gdiIntel.executeSearch()" 
                        style="background: #00ff4120; color: #00ff41; border: 1px solid #00ff41;
                        padding: 8px 16px; font-family: inherit; cursor: pointer; border-radius: 4px;">SEARCH</button>
                </div>
                <div style="margin-top: 6px; display: flex; gap: 6px;">
                    <label style="color: #666; font-size: 10px;">
                        <input type="radio" name="search-mode" value="hybrid" checked style="accent-color: #00ff41;"/> HYBRID
                    </label>
                    <label style="color: #666; font-size: 10px;">
                        <input type="radio" name="search-mode" value="bm25" style="accent-color: #00ff41;"/> BM25
                    </label>
                    <label style="color: #666; font-size: 10px;">
                        <input type="radio" name="search-mode" value="vector" style="accent-color: #00ff41;"/> VECTOR
                    </label>
                </div>
            </div>
            <div id="gdi-search-results" style="padding: 12px; max-height: 50vh; overflow-y: auto; color: #888; font-size: 11px;">
                Type a query and press Enter or click SEARCH.
            </div>
        `;
        document.body.appendChild(this._searchPanel);

        // Bind Enter key in search input
        setTimeout(() => {
            const input = document.getElementById('gdi-search-input');
            if (input) {
                input.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') this.executeSearch();
                });
            }
        }, 100);
    }

    // ── Keyboard Bindings ───────────────────────────────────

    _bindKeys() {
        document.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            
            if (e.key === 'a' || e.key === 'A') {
                e.preventDefault();
                this.togglePanel();
            }
            if (e.key === 'h' || e.key === 'H') {
                e.preventDefault();
                this.toggleSearch();
            }
            if (e.key === 'Escape') {
                if (this._panelOpen) this.togglePanel();
                if (this._searchOpen) this.toggleSearch();
                if (this._measureMode) this.stopMeasure();
            }
        });
    }

    // ── WebSocket Alert Binding ─────────────────────────────

    _bindWebSocket() {
        if (!this.ws) return;
        const origHandler = this.ws.onmessage;
        this.ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.type === 'alert') {
                    this.addAlert(data);
                }
            } catch (e) {}
            // Pass through to original handler
            if (origHandler) origHandler(event);
        };
    }

    // ── Alert Management ────────────────────────────────────

    addAlert(data) {
        const alert = {
            id: `alert_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            severity: data.severity || 'info',
            source: data.source || 'system',
            title: data.geofence || data.message || 'Alert',
            entity: data.entity || '',
            layer: data.layer || '',
            lat: data.lat,
            lon: data.lon,
            timestamp: data.timestamp || Math.floor(Date.now() / 1000),
            acknowledged: false,
            metadata: data.metadata || {},
        };

        this.alerts.unshift(alert);
        if (this.alerts.length > this.maxAlerts) {
            this.alerts = this.alerts.slice(0, this.maxAlerts);
        }

        this._showToast(alert);
        this._updateBadge();
        this._updatePanel();

        // Sound alert for CRITICAL+
        if (alert.severity === 'critical' || alert.severity === 'emergency') {
            this._playAlertSound(alert.severity);
        }
    }

    _showToast(alert) {
        const severityColors = {
            info: '#00b4d8',
            warning: '#ffb000',
            critical: '#ff0040',
            emergency: '#ff0040',
        };
        const color = severityColors[alert.severity] || '#00b4d8';

        const toast = document.createElement('div');
        toast.style.cssText = `
            background: rgba(0, 5, 10, 0.95); border-left: 3px solid ${color};
            padding: 10px 14px; min-width: 280px; max-width: 380px;
            font-family: 'Fira Code', monospace; font-size: 11px; color: #c0c0c0;
            border-radius: 4px; pointer-events: all; cursor: pointer;
            animation: gdi-toast-in 0.3s ease;
            ${alert.severity === 'emergency' ? 'animation: gdi-toast-pulse 1s ease infinite;' : ''}
        `;
        toast.innerHTML = `
            <div style="color: ${color}; font-weight: bold; font-size: 10px; text-transform: uppercase;">
                ${alert.severity} — ${alert.source}
            </div>
            <div style="margin-top: 4px;">${alert.title}</div>
            ${alert.entity ? `<div style="color: #666; font-size: 10px; margin-top: 2px;">${alert.entity} (${alert.layer})</div>` : ''}
        `;
        
        // Click to fly to location
        if (alert.lat && alert.lon) {
            toast.onclick = () => {
                this.viewer.camera.flyTo({
                    destination: Cesium.Cartesian3.fromDegrees(alert.lon, alert.lat, 50000),
                    duration: 2,
                });
            };
        }

        this._toastContainer.appendChild(toast);

        // Auto-dismiss
        const dismissTime = alert.severity === 'emergency' ? 30000 : 10000;
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transition = 'opacity 0.5s';
            setTimeout(() => toast.remove(), 500);
        }, dismissTime);
    }

    _updateBadge() {
        const unacked = this.alerts.filter(a => !a.acknowledged).length;
        this._badge.textContent = `⚠ ${unacked}`;
        this._badge.style.display = unacked > 0 ? 'block' : 'none';
    }

    _updatePanel() {
        const list = document.getElementById('gdi-alert-list');
        const count = document.getElementById('gdi-alert-count');
        if (!list) return;

        const unacked = this.alerts.filter(a => !a.acknowledged).length;
        if (count) count.textContent = `${unacked} ACTIVE`;

        list.innerHTML = this.alerts.slice(0, 50).map(a => {
            const colors = { info: '#00b4d8', warning: '#ffb000', critical: '#ff0040', emergency: '#ff0040' };
            const c = colors[a.severity] || '#00b4d8';
            const time = new Date(a.timestamp * 1000).toLocaleTimeString();
            const acked = a.acknowledged ? 'opacity: 0.4;' : '';
            return `
                <div style="border-left: 2px solid ${c}; padding: 8px 10px; margin-bottom: 6px; background: #0a0a1a40; ${acked}">
                    <div style="display: flex; justify-content: space-between;">
                        <span style="color: ${c}; font-size: 10px; font-weight: bold;">${a.severity.toUpperCase()}</span>
                        <span style="color: #555; font-size: 9px;">${time}</span>
                    </div>
                    <div style="margin-top: 4px; font-size: 11px;">${a.title}</div>
                    ${a.entity ? `<div style="color: #555; font-size: 9px; margin-top: 2px;">${a.entity}</div>` : ''}
                    ${!a.acknowledged ? `<button onclick="window.gdiIntel.ackAlert('${a.id}')" style="background: none; border: 1px solid #333; color: #666; font-size: 9px; padding: 2px 8px; margin-top: 4px; cursor: pointer; font-family: inherit; border-radius: 2px;">ACK</button>` : ''}
                </div>
            `;
        }).join('');
    }

    ackAlert(id) {
        const alert = this.alerts.find(a => a.id === id);
        if (alert) {
            alert.acknowledged = true;
            this._updatePanel();
            this._updateBadge();
        }
    }

    ackAll() {
        this.alerts.forEach(a => a.acknowledged = true);
        this._updatePanel();
        this._updateBadge();
    }

    clearAlerts() {
        this.alerts = [];
        this._updatePanel();
        this._updateBadge();
    }

    togglePanel() {
        this._panelOpen = !this._panelOpen;
        this._panel.style.right = this._panelOpen ? '0' : '-400px';
        if (this._panelOpen) this._updatePanel();
    }

    // ── HEKTOR Search ───────────────────────────────────────

    toggleSearch() {
        this._searchOpen = !this._searchOpen;
        this._searchPanel.style.display = this._searchOpen ? 'block' : 'none';
        if (this._searchOpen) {
            setTimeout(() => document.getElementById('gdi-search-input')?.focus(), 100);
        }
    }

    async executeSearch() {
        const input = document.getElementById('gdi-search-input');
        const resultsDiv = document.getElementById('gdi-search-results');
        if (!input || !resultsDiv) return;

        const query = input.value.trim();
        if (!query) return;

        const mode = document.querySelector('input[name="search-mode"]:checked')?.value || 'hybrid';
        resultsDiv.innerHTML = '<div style="color: #00ff41;">Searching HEKTOR...</div>';

        try {
            const resp = await fetch('/api/hektor/search', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${window.gdiAuth?.token || ''}`,
                },
                body: JSON.stringify({ query, mode, k: 10 }),
            });

            if (!resp.ok) {
                resultsDiv.innerHTML = `<div style="color: #ff0040;">Error: ${resp.status} ${resp.statusText}</div>`;
                return;
            }

            const data = await resp.json();
            if (!data.results || data.results.length === 0) {
                resultsDiv.innerHTML = `<div style="color: #666;">No results for "${query}" (${data.elapsed_ms}ms)</div>`;
                return;
            }

            resultsDiv.innerHTML = `
                <div style="color: #00ff41; margin-bottom: 8px; font-size: 10px;">
                    ${data.results.length} results — ${data.elapsed_ms}ms — mode: ${data.mode}
                </div>
                ${data.results.map((r, i) => `
                    <div style="border-left: 2px solid #00b4d820; padding: 8px; margin-bottom: 6px; background: #0a0a1a40;">
                        <div style="color: #00b4d8; font-size: 10px;">[${(r.score * 100).toFixed(1)}%] ${r.path}</div>
                        <div style="color: #888; font-size: 10px; margin-top: 4px; white-space: pre-wrap; max-height: 80px; overflow: hidden;">${this._escapeHtml(r.snippet)}</div>
                    </div>
                `).join('')}
            `;
        } catch (e) {
            resultsDiv.innerHTML = `<div style="color: #ff0040;">Search failed: ${e.message}</div>`;
        }
    }

    // ── Sound Alerts ────────────────────────────────────────

    _playAlertSound(severity) {
        try {
            if (!this._audioCtx) {
                this._audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            }
            const ctx = this._audioCtx;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);

            if (severity === 'emergency') {
                osc.frequency.value = 880;
                osc.type = 'square';
                gain.gain.value = 0.15;
                osc.start();
                // Warble effect
                osc.frequency.setValueAtTime(880, ctx.currentTime);
                osc.frequency.setValueAtTime(660, ctx.currentTime + 0.15);
                osc.frequency.setValueAtTime(880, ctx.currentTime + 0.3);
                osc.frequency.setValueAtTime(660, ctx.currentTime + 0.45);
                osc.stop(ctx.currentTime + 0.6);
            } else {
                osc.frequency.value = 660;
                osc.type = 'sine';
                gain.gain.value = 0.1;
                osc.start();
                osc.stop(ctx.currentTime + 0.3);
            }
            gain.gain.setValueAtTime(gain.gain.value, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
        } catch (e) {
            // AudioContext not available — silent fallback
        }
    }

    // ── Measurement Tools ───────────────────────────────────

    startMeasure(type = 'distance') {
        this._measureMode = true;
        this._measureType = type;
        this._measurePoints = [];
        this._clearMeasureEntities();
        document.body.style.cursor = 'crosshair';
        
        this._measureHandler = new Cesium.ScreenSpaceEventHandler(this.viewer.scene.canvas);
        this._measureHandler.setInputAction((click) => {
            const ray = this.viewer.camera.getPickRay(click.position);
            const cartesian = this.viewer.scene.globe.pick(ray, this.viewer.scene);
            if (cartesian) {
                const carto = Cesium.Cartographic.fromCartesian(cartesian);
                const lat = Cesium.Math.toDegrees(carto.latitude);
                const lon = Cesium.Math.toDegrees(carto.longitude);
                this._measurePoints.push([lat, lon]);
                this._updateMeasureVisuals();
            }
        }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

        this._measureHandler.setInputAction(() => {
            this.stopMeasure();
        }, Cesium.ScreenSpaceEventType.RIGHT_CLICK);
    }

    stopMeasure() {
        this._measureMode = false;
        document.body.style.cursor = '';
        if (this._measureHandler) {
            this._measureHandler.destroy();
            this._measureHandler = null;
        }
    }

    _updateMeasureVisuals() {
        this._clearMeasureEntities();
        const points = this._measurePoints;
        
        // Draw points
        for (const [lat, lon] of points) {
            const e = this.viewer.entities.add({
                position: Cesium.Cartesian3.fromDegrees(lon, lat),
                point: { pixelSize: 8, color: Cesium.Color.fromCssColorString('#00ff41') },
            });
            this._measureEntities.push(e);
        }

        // Draw lines and calculate distance
        if (points.length >= 2) {
            const positions = points.map(([lat, lon]) => Cesium.Cartesian3.fromDegrees(lon, lat));
            const line = this.viewer.entities.add({
                polyline: {
                    positions,
                    width: 2,
                    material: new Cesium.PolylineDashMaterialProperty({
                        color: Cesium.Color.fromCssColorString('#00ff41'),
                        dashLength: 16,
                    }),
                    clampToGround: true,
                },
            });
            this._measureEntities.push(line);

            // Calculate and show distance
            this._showMeasureResult(points);
        }
    }

    async _showMeasureResult(points) {
        try {
            const resp = await fetch('/api/intelligence/measure', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ points, type: this._measureType }),
            });
            if (resp.ok) {
                const data = await resp.json();
                const text = this._measureType === 'distance' 
                    ? `${data.total_km.toFixed(1)} km` 
                    : `${data.area_km2.toFixed(1)} km²`;
                
                // Show label at midpoint
                const mid = points[Math.floor(points.length / 2)];
                const label = this.viewer.entities.add({
                    position: Cesium.Cartesian3.fromDegrees(mid[1], mid[0], 1000),
                    label: {
                        text,
                        font: '14px Fira Code',
                        fillColor: Cesium.Color.fromCssColorString('#00ff41'),
                        outlineColor: Cesium.Color.BLACK,
                        outlineWidth: 2,
                        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
                        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
                    },
                });
                this._measureEntities.push(label);
            }
        } catch (e) {}
    }

    _clearMeasureEntities() {
        for (const e of this._measureEntities) {
            this.viewer.entities.remove(e);
        }
        this._measureEntities = [];
    }

    _escapeHtml(s) {
        return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }
}

// CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes gdi-toast-in {
        from { opacity: 0; transform: translateX(20px); }
        to { opacity: 1; transform: translateX(0); }
    }
    @keyframes gdi-toast-pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.6; border-left-color: #ffb000; }
    }
    #gdi-alert-panel::-webkit-scrollbar { width: 4px; }
    #gdi-alert-panel::-webkit-scrollbar-thumb { background: #00ff4120; border-radius: 2px; }
    #gdi-search-results::-webkit-scrollbar { width: 4px; }
    #gdi-search-results::-webkit-scrollbar-thumb { background: #00b4d820; border-radius: 2px; }
`;
document.head.appendChild(style);
