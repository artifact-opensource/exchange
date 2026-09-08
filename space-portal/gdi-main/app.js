/**
 * GDI — Global Defense Intelligence
 * Main Application Controller
 *
 * Initializes Cesium, layers, HUD, filters, and event handlers.
 * This is the entry point — called after DOM ready.
 */

class GDI_App {

    constructor() {
        this.viewer = null;
        this.hud = null;
        this.filterManager = null;
        this.layers = {};
        this._infoOverlay = null;
        this._has3DTiles = false;
    }

    async init() {
        console.log('[GDI] Initializing Global Defense Intelligence...');

        // ── Load Frontend Credentials from Backend (.env) ──────
        try {
            const cfgResp = await fetch('/api/config/frontend');
            if (cfgResp.ok) {
                const cfgData = await cfgResp.json();
                if (cfgData.CESIUM_ION_TOKEN) GDI_CONFIG.CESIUM_ION_TOKEN = cfgData.CESIUM_ION_TOKEN;
                if (cfgData.GOOGLE_MAPS_API_KEY) GDI_CONFIG.GOOGLE_MAPS_API_KEY = cfgData.GOOGLE_MAPS_API_KEY;
                if (cfgData.TOMTOM_API_KEY) GDI_CONFIG.TOMTOM_API_KEY = cfgData.TOMTOM_API_KEY;
                console.log('[GDI] Frontend credentials loaded from backend');
            }
        } catch (e) {
            console.warn('[GDI] Could not load credentials from backend — using config.js defaults');
        }

        // ── Valkyrie Backend Auth ───────────────────────────────
        if (window.gdiAuth) {
            // Restore session from sessionStorage (set by login page)
            const sessionOk = window.gdiAuth.initFromSession();
            if (!sessionOk) {
                // Not authenticated — redirect to login
                console.warn('[GDI] No valid session — redirecting to login');
                window.location.replace('/login');
                return;
            }
            console.log('[GDI] Valkyrie backend authenticated via session');
            // Connect WebSocket for real-time push
            this._ws = window.gdiAuth.connectWebSocket();
            this._ws.onmessage = (e) => this._onWsMessage(e);
        }

        // ── VALKYRIE AI Panel ───────────────────────────────────
        if (window.ValkyriePanel) {
            this.valkyrie = new ValkyriePanel();
            if (this._ws) {
                this.valkyrie.attachWebSocket(this._ws);
            }
            console.log('[GDI] VALKYRIE AI panel initialized');
        }

        // ── Cesium Base URL (sovereign: local Workers/Assets) ───────
        window.CESIUM_BASE_URL = './lib/cesium/';

        // ── Cesium Setup ────────────────────────────────────────────
        const hasIonToken = GDI_CONFIG.CESIUM_ION_TOKEN && !GDI_CONFIG.CESIUM_ION_TOKEN.startsWith('YOUR_');
        const hasGoogleKey = GDI_CONFIG.GOOGLE_MAPS_API_KEY && !GDI_CONFIG.GOOGLE_MAPS_API_KEY.startsWith('YOUR_');

        if (hasIonToken) {
            Cesium.Ion.defaultAccessToken = GDI_CONFIG.CESIUM_ION_TOKEN;
        }
        if (hasGoogleKey) {
            Cesium.GoogleMaps.defaultApiKey = GDI_CONFIG.GOOGLE_MAPS_API_KEY;
        }

        // Build viewer options — use OpenStreetMap if no Ion token
        const viewerOpts = {
            timeline: true,
            animation: true,
            baseLayerPicker: false,
            geocoder: false,
            homeButton: false,
            sceneModePicker: false,
            navigationHelpButton: false,
            fullscreenButton: false,
            selectionIndicator: false,
            infoBox: false,
            shadows: false,
            shouldAnimate: true,
            msaaSamples: 2,
            requestRenderMode: false,
        };

        if (!hasIonToken) {
            // No Ion token — use OpenStreetMap imagery (no auth required)
            viewerOpts.baseLayer = Cesium.ImageryLayer.fromProviderAsync(
                Cesium.TileMapServiceImageryProvider.fromUrl(
                    Cesium.buildModuleUrl("Assets/Textures/NaturalEarthII")
                )
            );
            console.log('[GDI] No Cesium Ion token — using built-in NaturalEarth imagery');
        }

        this.viewer = new Cesium.Viewer('cesium-container', viewerOpts);

        if (hasIonToken) {
            // Remove default imagery and use premium layers
            this.viewer.imageryLayers.removeAll();

            if (hasGoogleKey) {
                // Google Photorealistic 3D Tiles
                try {
                    const tileset = await Cesium.createGooglePhotorealistic3DTileset();
                    this.viewer.scene.primitives.add(tileset);
                    this._has3DTiles = true;
                    console.log('[GDI] Google 3D Tiles loaded');
                } catch (e) {
                    console.warn('[GDI] Google 3D Tiles failed — using Ion imagery:', e.message);
                    // Add Cesium Ion default imagery (Bing)
                    this.viewer.imageryLayers.addImageryProvider(
                        await Cesium.IonImageryProvider.fromAssetId(2)
                    );
                }
            } else {
                // Ion token but no Google key — use Bing via Ion
                try {
                    this.viewer.imageryLayers.addImageryProvider(
                        await Cesium.IonImageryProvider.fromAssetId(2)
                    );
                    console.log('[GDI] Cesium Ion Bing imagery loaded');
                } catch (e) {
                    console.warn('[GDI] Ion imagery failed:', e.message);
                }
            }

            // Cesium World Terrain (requires Ion)
            try {
                this.viewer.scene.setTerrain(Cesium.Terrain.fromWorldTerrain());
                console.log('[GDI] Cesium World Terrain loaded');
            } catch (e) {
                console.warn('[GDI] World Terrain failed:', e.message);
            }
        } else {
            // No Ion — use local NaturalEarth + OSM online fallback for tiles
            try {
                const osm = await Cesium.OpenStreetMapImageryProvider.fromUrl(
                    'https://tile.openstreetmap.org/'
                );
                this.viewer.imageryLayers.addImageryProvider(osm);
                console.log('[GDI] OpenStreetMap imagery loaded (online fallback)');
            } catch (e) {
                console.warn('[GDI] OSM imagery failed — using NaturalEarth offline only:', e.message);
            }

            // No Ion — use ellipsoid terrain (no external dependency)
            this.viewer.scene.terrainProvider = new Cesium.EllipsoidTerrainProvider();
            console.log('[GDI] Sovereign mode: EllipsoidTerrainProvider (no Ion dependency)');
        }

        this.viewer.scene.globe.show = true;

        // Scene config
        this.viewer.scene.globe.enableLighting = true;
        this.viewer.scene.fog.enabled = true;
        this.viewer.scene.skyAtmosphere.show = true;
        this.viewer.scene.highDynamicRange = false;
        this.viewer.scene.backgroundColor = Cesium.Color.BLACK;

        // Default camera
        const cam = GDI_CONFIG.defaultCamera;
        this.viewer.camera.flyTo({
            destination: Cesium.Cartesian3.fromDegrees(cam.longitude, cam.latitude, cam.height),
            orientation: {
                heading: Cesium.Math.toRadians(cam.heading),
                pitch: Cesium.Math.toRadians(cam.pitch),
                roll: Cesium.Math.toRadians(cam.roll),
            },
            duration: 0,
        });

        // Style the timeline & animation widget
        this._styleBuiltinWidgets();

        // ── Initialize Subsystems ───────────────────────────────────
        this.hud = new GDI_HUD(this.viewer);
        this.filterManager = new FilterManager(this.viewer);

        // ── Initialize Data Layers ──────────────────────────────────
        this.layers.flights = new FlightLayer(this.viewer);
        this.layers.seismic = new SeismicLayer(this.viewer);
        this.layers.satellites = new SatelliteLayer(this.viewer);

        // Initialize satellite backend connection (async, non-blocking)
        if (this._authToken && GDI_CONFIG.backend?.url) {
            this.layers.satellites.initBackend(GDI_CONFIG.backend.url, this._authToken)
                .then(() => console.log('[GDI] Satellite catalog loaded from backend'))
                .catch(e => console.warn('[GDI] Satellite backend init failed, using fallback:', e.message));
        }
        this.layers.cctv = new CCTVLayer(this.viewer);
        this.layers.traffic = new TrafficLayer(this.viewer);
        this.layers.satx = new SATxLayer(this.viewer);

        // ── Wire Valkyrie Rule Engine to live layers ────────────────
        if (this.valkyrie) {
            this.valkyrie.attachLayers({
                flights:    this.layers.flights,
                seismic:    this.layers.seismic,
                satellites: this.layers.satellites,
            });
        }

        // Enable defaults
        for (const [key, conf] of Object.entries(GDI_CONFIG.layers)) {
            if (conf.enabled && this.layers[key]) {
                this.layers[key].enable();
            }
        }

        // ── Bind UI Controls ────────────────────────────────────────
        this._bindLayerToggles();
        this._bindFilterSelector();
        this._bindViewSelector();
        this._bindSearch();
        this._bindEntityClick();

        // ── Main Loop ───────────────────────────────────────────────
        this.viewer.scene.postRender.addEventListener(() => this._onFrame());

        // ── Status Updates ──────────────────────────────────────────
        setInterval(() => this._updateStatusBar(), 2000);

        console.log('[GDI] Initialization complete');
        this._setBootMessage('SYSTEM ONLINE — ALL MODULES ACTIVE');
    }

    // ── Frame Loop ──────────────────────────────────────────────────

    _onFrame() {
        this.hud.updateCameraInfo();
    }

    // ── Layer Toggle Bindings ───────────────────────────────────────

    _bindLayerToggles() {
        const toggles = document.querySelectorAll('.layer-toggle');
        toggles.forEach(toggle => {
            const layerKey = toggle.dataset.layer;
            if (!layerKey || !this.layers[layerKey]) return;

            // Set initial state
            const isEnabled = GDI_CONFIG.layers[layerKey]?.enabled || false;
            toggle.classList.toggle('active', isEnabled);

            toggle.addEventListener('click', () => {
                const layer = this.layers[layerKey];
                if (layer.enabled) {
                    layer.disable();
                    toggle.classList.remove('active');
                } else {
                    layer.enable();
                    toggle.classList.add('active');
                }
            });
        });
    }

    // ── Filter Selector ─────────────────────────────────────────────

    _bindFilterSelector() {
        const buttons = document.querySelectorAll('.filter-btn');
        buttons.forEach(btn => {
            btn.addEventListener('click', () => {
                const filterName = btn.dataset.filter;
                this.filterManager.apply(filterName);

                // Update UI
                buttons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                // Show FLIR label
                const flirLabel = document.getElementById('flir-label');
                if (flirLabel) {
                    flirLabel.style.display = filterName === 'FLIR' ? 'block' : 'none';
                }
            });
        });
    }

    // ── View Mode Selector ─────────────────────────────────────────

    _bindViewSelector() {
        const buttons = document.querySelectorAll('.view-btn');
        buttons.forEach(btn => {
            btn.addEventListener('click', () => {
                const viewName = btn.dataset.view;
                this._setViewMode(viewName);

                // Update UI
                buttons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });
    }

    _setViewMode(mode) {
        const scene = this.viewer.scene;

        switch (mode) {
            case 'GLOBE':
                // Default orbital view — high up, looking down
                this.viewer.camera.flyTo({
                    destination: Cesium.Cartesian3.fromDegrees(
                        GDI_CONFIG.defaultCamera.longitude,
                        GDI_CONFIG.defaultCamera.latitude,
                        GDI_CONFIG.defaultCamera.height
                    ),
                    orientation: {
                        heading: Cesium.Math.toRadians(0),
                        pitch: Cesium.Math.toRadians(-90),
                        roll: 0,
                    },
                    duration: 2,
                });
                // Ensure globe is visible (3D tiles may have hidden it)
                scene.globe.show = true;
                break;

            case '3D':
                // Street-level 3D view — tilted, low altitude, shows 3D buildings
                {
                    // Get the current camera center or use default
                    const carto = this.viewer.camera.positionCartographic;
                    const centerLon = Cesium.Math.toDegrees(carto.longitude);
                    const centerLat = Cesium.Math.toDegrees(carto.latitude);

                    this.viewer.camera.flyTo({
                        destination: Cesium.Cartesian3.fromDegrees(centerLon, centerLat, 800),
                        orientation: {
                            heading: Cesium.Math.toRadians(30),
                            pitch: Cesium.Math.toRadians(-25),
                            roll: 0,
                        },
                        duration: 2,
                    });

                    // In 3D street mode with Google tiles, hide the globe to avoid z-fighting
                    if (this._has3DTiles) {
                        scene.globe.show = false;
                    }
                }
                break;

            case 'OVERHEAD':
                // Top-down tactical view — medium altitude, straight down
                {
                    const carto = this.viewer.camera.positionCartographic;
                    const centerLon = Cesium.Math.toDegrees(carto.longitude);
                    const centerLat = Cesium.Math.toDegrees(carto.latitude);

                    this.viewer.camera.flyTo({
                        destination: Cesium.Cartesian3.fromDegrees(centerLon, centerLat, 5000),
                        orientation: {
                            heading: Cesium.Math.toRadians(0),
                            pitch: Cesium.Math.toRadians(-90),
                            roll: 0,
                        },
                        duration: 2,
                    });
                    scene.globe.show = true;
                }
                break;
        }

        console.log(`[GDI] View mode: ${mode}`);
    }

    // ── Search Box ──────────────────────────────────────────────────

    _bindSearch() {
        const searchInput = document.getElementById('search-input');
        if (!searchInput) return;

        searchInput.addEventListener('keydown', async (e) => {
            if (e.key !== 'Enter') return;
            const query = searchInput.value.trim();
            if (!query) return;

            try {
                // Use Cesium's geocoding via Ion
                const resource = await Cesium.IonGeocoderService.prototype || null;

                // Fallback: use Nominatim (OpenStreetMap)
                const resp = await fetch(
                    `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`,
                    { headers: { 'User-Agent': 'GDI/1.0' } }
                );
                const results = await resp.json();

                if (results.length > 0) {
                    const r = results[0];
                    const lon = parseFloat(r.lon);
                    const lat = parseFloat(r.lat);

                    this.viewer.camera.flyTo({
                        destination: Cesium.Cartesian3.fromDegrees(lon, lat, 50000),
                        orientation: {
                            heading: 0,
                            pitch: Cesium.Math.toRadians(-45),
                            roll: 0,
                        },
                        duration: 2,
                    });

                    searchInput.value = r.display_name || query;
                    console.log(`[SEARCH] Flying to: ${r.display_name}`);
                } else {
                    console.warn('[SEARCH] No results for:', query);
                }
            } catch (e) {
                console.warn('[SEARCH] Geocoding error:', e.message);
            }
        });
    }

    // ── Entity Click / Info Popup ───────────────────────────────────

    _bindEntityClick() {
        const handler = new Cesium.ScreenSpaceEventHandler(this.viewer.scene.canvas);

        handler.setInputAction((click) => {
            const picked = this.viewer.scene.pick(click.position);
            if (!Cesium.defined(picked) || !picked.id || !picked.id.properties) {
                this._hideInfoOverlay();
                return;
            }

            const entity = picked.id;
            const props = {};
            const propertyNames = entity.properties.propertyNames;
            for (const name of propertyNames) {
                props[name] = entity.properties[name].getValue();
            }

            this._showInfoOverlay(props, click.position);
        }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
    }

    _showInfoOverlay(props, screenPos) {
        let overlay = document.getElementById('info-overlay');
        if (!overlay) return;

        let html = '';

        switch (props.type) {
            case 'flight':
                html = `
                    <div class="info-title">✈ AIRCRAFT TRACK</div>
                    <div class="info-row"><span>CALLSIGN</span><span>${props.callsign}</span></div>
                    <div class="info-row"><span>ICAO24</span><span>${props.icao}</span></div>
                    <div class="info-row"><span>ORIGIN</span><span>${props.country}</span></div>
                    <div class="info-row"><span>ALTITUDE</span><span>${props.altitude?.toFixed(0) || '---'} m</span></div>
                    <div class="info-row"><span>VELOCITY</span><span>${props.velocity?.toFixed(0) || '---'} m/s</span></div>
                    <div class="info-row"><span>HEADING</span><span>${props.heading?.toFixed(1) || '---'}°</span></div>
                    <div class="info-row"><span>VERT RATE</span><span>${props.vertRate?.toFixed(1) || '---'} m/s</span></div>
                    <div class="info-row"><span>SQUAWK</span><span>${props.squawk}</span></div>
                    <div class="info-row"><span>CATEGORY</span><span>${props.category}</span></div>
                    ${props.isMilitary ? '<div class="info-alert">⚠ MILITARY CATEGORY</div>' : ''}
                `;
                break;

            case 'seismic':
                html = `
                    <div class="info-title">🔴 SEISMIC EVENT</div>
                    <div class="info-row"><span>MAGNITUDE</span><span>${props.magnitude?.toFixed(1)}</span></div>
                    <div class="info-row"><span>DEPTH</span><span>${props.depth?.toFixed(1)} km</span></div>
                    <div class="info-row"><span>LOCATION</span><span>${props.place}</span></div>
                    <div class="info-row"><span>TIME</span><span>${props.time}</span></div>
                `;
                break;

            case 'satellite':
                html = `
                    <div class="info-title">🛰 SATELLITE TRACK</div>
                    <div class="info-row"><span>NAME</span><span>${props.name}</span></div>
                    <div class="info-row"><span>NORAD ID</span><span>${props.noradId}</span></div>
                    <div class="info-row"><span>TYPE</span><span>${(props.satType || '').toUpperCase()}${props.baseType && props.baseType !== props.satType ? ' (' + props.baseType + ')' : ''}</span></div>
                    <div class="info-row"><span>ORBIT</span><span>${(props.orbitRegime || 'UNKNOWN').toUpperCase()}</span></div>
                    <div class="info-row"><span>ALTITUDE</span><span>${(props.altitude / 1000)?.toFixed(1)} km</span></div>
                    <div class="info-row"><span>VELOCITY</span><span>${props.velocity?.toFixed(2)} km/s</span></div>
                    ${props.country ? `<div class="info-row"><span>COUNTRY</span><span>${props.flag || ''} ${props.country}</span></div>` : ''}
                    ${props.inclination ? `<div class="info-row"><span>INCLINATION</span><span>${Number(props.inclination).toFixed(1)}°</span></div>` : ''}
                    ${props.rcsSize ? `<div class="info-row"><span>RCS</span><span>${props.rcsSize}</span></div>` : ''}
                    ${props.launchDate ? `<div class="info-row"><span>LAUNCHED</span><span>${props.launchDate}</span></div>` : ''}
                `;
                break;

            case 'cctv':
                html = `
                    <div class="info-title cctv-title">📹 SURVEILLANCE NODE</div>
                    <div class="info-row"><span>NODE ID</span><span>${props.nodeId}</span></div>
                    <div class="info-row"><span>LOCATION</span><span>${props.city}</span></div>
                    <div class="cctv-feed-unavailable">
                        <div class="cctv-static"></div>
                        <div class="cctv-text">FEED UNAVAILABLE</div>
                        <div class="cctv-classified">— CLASSIFIED —</div>
                    </div>
                `;
                break;

            case 'traffic':
                html = `
                    <div class="info-title">🚦 TRAFFIC SEGMENT</div>
                    <div class="info-row"><span>ROAD</span><span>${props.name}</span></div>
                    <div class="info-row"><span>FLOW</span><span class="flow-${props.flow}">${props.flow?.toUpperCase()}</span></div>
                `;
                break;

            case 'satx_detection':
                const classColor = {
                    beacon: '#00ff41', telemetry: '#00b4d8', voice: '#c77dff',
                    data: '#ffb000', cw: '#ffffff', burst: '#ff6600',
                    spread_spectrum: '#ff0040', interference: '#666', unknown: '#ff0040',
                };
                const sigColor = classColor[props.signalClass] || '#ff0040';
                const snrPct = Math.min((props.snr / 40) * 100, 100);
                const confPct = (props.confidence * 100).toFixed(0);
                html = `
                    <div class="info-title satx-detection-title">📡 SIGNAL DETECTION</div>
                    <div class="info-row"><span>FREQUENCY</span><span>${props.frequencyFormatted}</span></div>
                    <div class="info-row"><span>SNR</span><span>${props.snr?.toFixed(1)} dB</span></div>
                    <div class="satx-signal-bar">
                        <div class="satx-signal-bar-label">SIGNAL STRENGTH</div>
                        <div class="satx-signal-bar-track"><div class="satx-signal-bar-fill" style="width:${snrPct}%"></div></div>
                    </div>
                    <div class="info-row"><span>CONFIDENCE</span><span>${confPct}%</span></div>
                    <div class="satx-signal-bar">
                        <div class="satx-signal-bar-track"><div class="satx-confidence-bar-fill" style="width:${confPct}%"></div></div>
                    </div>
                    <div class="info-row"><span>CLASS</span><span><span class="satx-class-dot satx-class-${props.signalClass}"></span>${props.signalClass?.toUpperCase()}</span></div>
                    <div class="info-row"><span>MODULATION</span><span>${props.modulation}</span></div>
                    <div class="info-row"><span>PROTOCOL</span><span>${props.protocol}</span></div>
                    <div class="info-row"><span>SATELLITE</span><span>${props.satelliteName}</span></div>
                    <div class="info-row"><span>NORAD ID</span><span>${props.noradId}</span></div>
                    <div class="info-row"><span>TIME</span><span>${props.peakTime ? new Date(props.peakTime).toLocaleTimeString('en-GB', {hour12:false}) : '---'}</span></div>
                `;
                break;

            case 'satx_live_pass':
                html = `
                    <div class="info-title satx-detection-title">🛰 LIVE PASS</div>
                    <div class="info-row"><span>SATELLITE</span><span>${props.satelliteName}</span></div>
                    <div class="info-row"><span>NORAD ID</span><span>${props.noradId}</span></div>
                    <div class="info-row"><span>STATION</span><span>${props.stationName || '---'}</span></div>
                    <div class="info-row"><span>MAX ELEV</span><span>${props.maxElevation?.toFixed(1)}°</span></div>
                    <div class="info-row"><span>ALTITUDE</span><span>${(props.altitude / 1000)?.toFixed(1)} km</span></div>
                    <div class="info-row"><span>AOS</span><span>${props.aosTime ? new Date(props.aosTime).toLocaleTimeString('en-GB', {hour12:false}) : '---'}</span></div>
                    <div class="info-row"><span>LOS</span><span>${props.losTime ? new Date(props.losTime).toLocaleTimeString('en-GB', {hour12:false}) : '---'}</span></div>
                    <div class="info-alert">● ACTIVE PASS</div>
                `;
                break;

            default:
                html = `<div class="info-title">UNKNOWN ENTITY</div>`;
        }

        overlay.innerHTML = html;
        overlay.style.display = 'block';

        // Position near click but clamp to viewport
        const x = Math.min(screenPos.x + 20, window.innerWidth - 320);
        const y = Math.min(screenPos.y - 10, window.innerHeight - 300);
        overlay.style.left = x + 'px';
        overlay.style.top = y + 'px';
    }

    _hideInfoOverlay() {
        const overlay = document.getElementById('info-overlay');
        if (overlay) overlay.style.display = 'none';
    }

    // ── Status Bar ──────────────────────────────────────────────────

    _updateStatusBar() {
        for (const [key, layer] of Object.entries(this.layers)) {
            this.hud.updateLayerStatus(key, layer.status);

            // Update count badges
            const countEl = document.getElementById(`count-${key}`);
            if (countEl && typeof layer.count === 'number') {
                countEl.textContent = layer.count;
            }
        }

        // Update backend status indicator
        const sysBackend = document.getElementById('sys-backend');
        if (sysBackend && window.gdiAuth) {
            if (window.gdiAuth.isAuthenticated) {
                sysBackend.textContent = 'ONLINE';
                sysBackend.style.color = '#00ff41';
            } else {
                sysBackend.textContent = 'OFFLINE';
                sysBackend.style.color = '#ff004080';
            }
        }
    }

    // ── Boot Message ────────────────────────────────────────────────

    _setBootMessage(msg) {
        const el = document.getElementById('boot-message');
        if (el) {
            el.textContent = msg;
            setTimeout(() => { el.style.opacity = '0'; }, 3000);
            setTimeout(() => { el.style.display = 'none'; }, 4000);
        }
    }

    // ── Styling for Cesium built-in widgets ─────────────────────────

    _styleBuiltinWidgets() {
        // The timeline and animation widgets get styled via CSS overrides
        // Just ensure they exist and are visible
        if (this.viewer.timeline) {
            this.viewer.timeline.resize();
        }
    }

    // ── Cleanup ─────────────────────────────────────────────────────

    destroy() {
        if (this._ws) this._ws.close();
        if (window.gdiAuth) window.gdiAuth.destroy();
        for (const layer of Object.values(this.layers)) {
            layer.destroy();
        }
        this.filterManager.destroy();
        this.hud.destroy();
        this.viewer.destroy();
    }

    // ── WebSocket Handler ───────────────────────────────────────────

    _onWsMessage(event) {
        try {
            const msg = JSON.parse(event.data);

            // Let VALKYRIE panel handle AI events first
            if (this.valkyrie && this.valkyrie.handleWSMessage(msg)) {
                return;
            }

            switch (msg.type) {
                case 'flights_update':
                    console.log(`[WS] Flights: ${msg.count} aircraft`);
                    break;
                case 'alert':
                    console.warn(`[WS] ALERT: ${msg.severity} — ${msg.message || msg.title}`);
                    this._showAlert(msg);
                    break;
                case 'satx_detection':
                    console.log(`[WS] SATx detection: ${msg.data?.frequency_hz} Hz`);
                    if (this.layers.satx && this.layers.satx.enabled) {
                        this.layers.satx.addLiveDetection(msg.data);
                    }
                    break;
                case 'pong':
                    break;
                case 'ai_command':
                    this._handleAICommand(msg);
                    break;
                default:
                    console.debug('[WS] Message:', msg.type);
            }
        } catch (e) {
            console.warn('[WS] Parse error:', e);
        }
    }

    _showAlert(alert) {
        const el = document.getElementById('boot-message');
        if (el) {
            el.textContent = `⚠ ${alert.severity?.toUpperCase()}: ${alert.message || alert.title}`;
            el.style.display = 'block';
            el.style.opacity = '1';
            el.style.color = alert.severity === 'critical' ? '#ff0040' : '#ffb000';
            setTimeout(() => { el.style.opacity = '0'; }, 5000);
            setTimeout(() => { el.style.display = 'none'; el.style.color = ''; }, 6000);
        }
    }

    // ── AI Command Handler ──────────────────────────────────────────

    _handleAICommand(msg) {
        const { action, params } = msg;
        console.log(`[AI] Command: ${action}`, params);

        switch (action) {
            case 'fly_to':
                if (this.viewer && params) {
                    this.viewer.camera.flyTo({
                        destination: Cesium.Cartesian3.fromDegrees(
                            params.lon, params.lat, params.altitude || 40000
                        ),
                        orientation: {
                            heading: Cesium.Math.toRadians(params.heading || 0),
                            pitch: Cesium.Math.toRadians(params.pitch || -90),
                            roll: 0,
                        },
                        duration: 2.0,
                    });
                    const locName = msg.location_name || `${params.lat.toFixed(2)}, ${params.lon.toFixed(2)}`;
                    this._showAIStatus(`🛫 Flying to ${locName}`);
                }
                break;

            case 'toggle_layer':
                if (params && params.layer) {
                    const layer = this.layers[params.layer];
                    if (layer) {
                        const newState = params.enabled !== null && params.enabled !== undefined
                            ? params.enabled
                            : !layer.enabled;
                        layer.enabled = newState;
                        // Toggle corresponding button
                        const btn = document.querySelector(`[data-layer="${params.layer}"]`);
                        if (btn) btn.classList.toggle('active', newState);
                        this._showAIStatus(`${newState ? '✅' : '❌'} Layer: ${params.layer}`);
                    }
                }
                break;

            case 'set_filter':
                if (params && params.mode && this.filterManager) {
                    this.filterManager.apply(params.mode);
                    // Update filter buttons
                    document.querySelectorAll('.filter-btn').forEach(b => {
                        b.classList.toggle('active', 
                            b.textContent.trim().toUpperCase().includes(params.mode));
                    });
                    this._showAIStatus(`🎨 Filter: ${params.mode}`);
                }
                break;

            case 'capture_view':
                // Capture canvas as image
                try {
                    const canvas = this.viewer.scene.canvas;
                    const dataUrl = canvas.toDataURL('image/png');
                    const link = document.createElement('a');
                    link.download = `gdi-capture-${params.label || 'view'}-${Date.now()}.png`;
                    link.href = dataUrl;
                    link.click();
                    this._showAIStatus(`📸 Captured: ${params.label || 'view'}`);
                } catch (e) {
                    console.error('[AI] Capture failed:', e);
                }
                break;

            default:
                console.warn(`[AI] Unknown command: ${action}`);
        }
    }

    _showAIStatus(text) {
        const el = document.getElementById('boot-message');
        if (el) {
            el.textContent = text;
            el.style.display = 'block';
            el.style.opacity = '1';
            el.style.color = '#00ff9d';
            setTimeout(() => { el.style.opacity = '0'; }, 3000);
            setTimeout(() => { el.style.display = 'none'; el.style.color = ''; }, 4000);
        }
    }
}


// ── Bootstrap ───────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
    window.gdi = new GDI_App();
    window.gdi.init().then(() => {
        // Initialize Sovereign Intelligence Panel
        if (window.gdi.viewer) {
            window.gdiIntel = new GDI_IntelPanel(window.gdi.viewer, window.gdi._ws);
            console.log('[GDI] Sovereign Intelligence Panel initialized (A=Alerts, H=Search, M=Measure)');
        }
    }).catch(e => {
        console.error('[GDI] Fatal initialization error:', e);
    });
});
