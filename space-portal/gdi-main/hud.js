/**
 * GDI — Global Defense Intelligence
 * HUD (Heads-Up Display) Overlay
 *
 * Manages compass rose, crosshair, coordinate readout,
 * status indicators, and clocks — all rendered as DOM overlays
 * on top of the Cesium viewer.
 */

class GDI_HUD {

    constructor(viewer) {
        this.viewer = viewer;
        this._intervals = [];
        this._mousePosition = { lat: 0, lon: 0, alt: 0 };
        this._fps = 0;
        this._frameCount = 0;
        this._lastFpsTime = performance.now();

        this._initCompass();
        this._initCrosshair();
        this._initCoordinateReadout();
        this._initClocks();
        this._initFPSCounter();
        this._initMouseTracking();
    }

    // ── Compass Rose ────────────────────────────────────────────────

    _initCompass() {
        const compass = document.getElementById('compass');
        if (!compass) return;

        const update = () => {
            const heading = Cesium.Math.toDegrees(this.viewer.camera.heading);
            const arrow = compass.querySelector('.compass-arrow');
            const headingText = compass.querySelector('.compass-heading');
            if (arrow) arrow.style.transform = `rotate(${-heading}deg)`;
            if (headingText) headingText.textContent = `${heading.toFixed(1)}°`;
        };

        this.viewer.scene.postRender.addEventListener(update);
    }

    // ── Crosshair ───────────────────────────────────────────────────

    _initCrosshair() {
        // Crosshair is pure CSS — no JS needed. Already in the DOM.
    }

    // ── Coordinate Readout (follows mouse) ──────────────────────────

    _initCoordinateReadout() {
        const coordEl = document.getElementById('mouse-coords');
        if (!coordEl) return;

        // Updated in mouse tracking
    }

    _initMouseTracking() {
        const coordEl = document.getElementById('mouse-coords');
        const handler = new Cesium.ScreenSpaceEventHandler(this.viewer.scene.canvas);

        handler.setInputAction((movement) => {
            const ray = this.viewer.camera.getPickRay(movement.endPosition);
            if (!ray) return;

            const cartesian = this.viewer.scene.globe.pick(ray, this.viewer.scene);
            if (cartesian) {
                const carto = Cesium.Cartographic.fromCartesian(cartesian);
                this._mousePosition.lat = Cesium.Math.toDegrees(carto.latitude);
                this._mousePosition.lon = Cesium.Math.toDegrees(carto.longitude);
                this._mousePosition.alt = carto.height;

                if (coordEl) {
                    coordEl.textContent =
                        `${this._formatCoord(this._mousePosition.lat, 'NS')} ${this._formatCoord(this._mousePosition.lon, 'EW')} ` +
                        `ALT ${this._mousePosition.alt.toFixed(0)}m`;
                }
            }
        }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);
    }

    _formatCoord(value, nsew) {
        const dir = value >= 0 ? nsew[0] : nsew[1];
        const abs = Math.abs(value);
        const deg = Math.floor(abs);
        const minFull = (abs - deg) * 60;
        const min = Math.floor(minFull);
        const sec = ((minFull - min) * 60).toFixed(1);
        return `${deg}°${min}'${sec}"${dir}`;
    }

    // ── Clocks ──────────────────────────────────────────────────────

    _initClocks() {
        const utcEl = document.getElementById('clock-utc');
        const localEl = document.getElementById('clock-local');
        const dateEl = document.getElementById('clock-date');

        const update = () => {
            const now = new Date();
            if (utcEl) {
                utcEl.textContent = now.toISOString().substring(11, 19) + ' UTC';
            }
            if (localEl) {
                localEl.textContent = now.toLocaleTimeString('en-GB', { hour12: false }) + ' LOCAL';
            }
            if (dateEl) {
                dateEl.textContent = now.toISOString().substring(0, 10);
            }
        };

        update();
        this._intervals.push(setInterval(update, GDI_CONFIG.intervals.clock));
    }

    // ── FPS Counter ─────────────────────────────────────────────────

    _initFPSCounter() {
        const fpsEl = document.getElementById('fps-counter');

        this.viewer.scene.postRender.addEventListener(() => {
            this._frameCount++;
            const now = performance.now();
            const elapsed = now - this._lastFpsTime;
            if (elapsed >= 1000) {
                this._fps = Math.round((this._frameCount * 1000) / elapsed);
                this._frameCount = 0;
                this._lastFpsTime = now;
                if (fpsEl) fpsEl.textContent = `${this._fps} FPS`;
            }
        });
    }

    // ── Camera Info (for top bar) ───────────────────────────────────

    updateCameraInfo() {
        const camAltEl = document.getElementById('camera-alt');
        if (!camAltEl) return;

        const carto = this.viewer.camera.positionCartographic;
        const altKm = carto.height / 1000;

        if (altKm > 1000) {
            camAltEl.textContent = `ALT ${(altKm / 1000).toFixed(1)}K km`;
        } else if (altKm > 1) {
            camAltEl.textContent = `ALT ${altKm.toFixed(1)} km`;
        } else {
            camAltEl.textContent = `ALT ${carto.height.toFixed(0)} m`;
        }
    }

    // ── Status Bar Updates ──────────────────────────────────────────

    updateLayerStatus(layerName, status) {
        const el = document.getElementById(`status-${layerName}`);
        if (!el) return;

        el.className = 'status-indicator';
        switch (status) {
            case 'LIVE':
            case 'ACTIVE':
            case 'SIM':
                el.classList.add('status-live');
                break;
            case 'FETCHING':
                el.classList.add('status-fetching');
                break;
            case 'ERROR':
                el.classList.add('status-error');
                break;
            case 'DISABLED':
            case 'IDLE':
                el.classList.add('status-idle');
                break;
        }

        const label = el.querySelector('.status-label');
        if (label) label.textContent = `${layerName.toUpperCase()}: ${status}`;
    }

    // ── Cleanup ─────────────────────────────────────────────────────

    destroy() {
        for (const id of this._intervals) clearInterval(id);
    }
}
