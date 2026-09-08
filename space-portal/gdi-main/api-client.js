/**
 * GDI — API Client
 * Handles all communication with the GDI Backend (localhost:8600/api/*)
 * JWT authentication, token management, request interceptor
 *
 * Classification: CONFIDENTIAL — Artifact Virtual Internal
 */

class GDI_APIClient {

    constructor(baseURL = null) {
        this.baseURL = baseURL || window.GDI_API_BASE || 'http://localhost:8600';
        this.token = null;
        this.role = null;
        this.username = null;
        this._tokenExpiry = null;
        this._refreshTimer = null;
        this._wsConnection = null;
        this._wsReconnectTimer = null;
        this._wsListeners = new Map();
        this._authenticated = false;

        // Restore session from localStorage
        this._restoreSession();
    }

    // ─── Session Management ─────────────────────────────────────

    _restoreSession() {
        try {
            const saved = localStorage.getItem('gdi_session');
            if (saved) {
                const session = JSON.parse(saved);
                if (session.token && session.expiry > Date.now()) {
                    this.token = session.token;
                    this.role = session.role;
                    this.username = session.username;
                    this._tokenExpiry = session.expiry;
                    this._authenticated = true;
                    console.log(`[API] Session restored: ${this.username} (${this.role})`);
                } else {
                    localStorage.removeItem('gdi_session');
                }
            }
        } catch (e) {
            console.warn('[API] Session restore failed:', e.message);
        }
    }

    _saveSession() {
        try {
            localStorage.setItem('gdi_session', JSON.stringify({
                token: this.token,
                role: this.role,
                username: this.username,
                expiry: this._tokenExpiry
            }));
        } catch (e) {
            console.warn('[API] Session save failed:', e.message);
        }
    }

    _clearSession() {
        this.token = null;
        this.role = null;
        this.username = null;
        this._tokenExpiry = null;
        this._authenticated = false;
        localStorage.removeItem('gdi_session');
        if (this._refreshTimer) clearTimeout(this._refreshTimer);
        this._disconnectWebSocket();
    }

    get isAuthenticated() {
        return this._authenticated && this.token && this._tokenExpiry > Date.now();
    }

    // ─── Auth ───────────────────────────────────────────────────

    async login(username, password) {
        try {
            const resp = await fetch(`${this.baseURL}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            if (!resp.ok) {
                const err = await resp.json().catch(() => ({ detail: 'Login failed' }));
                throw new Error(err.detail || `HTTP ${resp.status}`);
            }

            const data = await resp.json();
            this.token = data.access_token;
            this.role = data.role;
            this.username = username;
            this._tokenExpiry = Date.now() + (data.expires_in * 1000);
            this._authenticated = true;
            this._saveSession();

            // Connect WebSocket after auth
            this._connectWebSocket();

            console.log(`[API] Authenticated: ${username} (${data.role})`);
            return { success: true, role: data.role };
        } catch (e) {
            console.error('[API] Login failed:', e.message);
            return { success: false, error: e.message };
        }
    }

    logout() {
        console.log(`[API] Logout: ${this.username}`);
        this._clearSession();
        // Show login overlay
        if (window.gdi && window.gdi._showLoginOverlay) {
            window.gdi._showLoginOverlay();
        }
    }

    // ─── HTTP Request Helper ────────────────────────────────────

    async _request(path, options = {}) {
        if (!this.isAuthenticated) {
            // Try to operate without auth for status endpoint
            if (!path.includes('/api/status')) {
                throw new Error('Not authenticated');
            }
        }

        const url = `${this.baseURL}${path}`;
        const headers = {
            'Content-Type': 'application/json',
            ...(options.headers || {})
        };

        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }

        try {
            const resp = await fetch(url, {
                ...options,
                headers
            });

            if (resp.status === 401) {
                console.warn('[API] Token expired, clearing session');
                this._clearSession();
                if (window.gdi && window.gdi._showLoginOverlay) {
                    window.gdi._showLoginOverlay();
                }
                throw new Error('Authentication expired');
            }

            if (resp.status === 403) {
                throw new Error(`Forbidden: insufficient role (${this.role})`);
            }

            if (!resp.ok) {
                const err = await resp.json().catch(() => ({}));
                throw new Error(err.detail || `HTTP ${resp.status}`);
            }

            return await resp.json();
        } catch (e) {
            if (e.name === 'TypeError' && e.message.includes('fetch')) {
                // Network error — backend unreachable
                console.warn(`[API] Backend unreachable: ${url}`);
                throw new Error('Backend unreachable');
            }
            throw e;
        }
    }

    // ─── Data Endpoints ─────────────────────────────────────────

    async getFlights(bounds = null) {
        let path = '/api/flights';
        if (bounds) {
            const params = new URLSearchParams({
                south: bounds.south,
                west: bounds.west,
                north: bounds.north,
                east: bounds.east
            });
            path += `?${params}`;
        }
        return this._request(path);
    }

    async getSeismic(period = 'all_day') {
        return this._request(`/api/seismic?period=${period}`);
    }

    async getTLE(group = 'stations') {
        return this._request(`/api/satellites/tle?group=${group}`);
    }

    async getTLEGroups() {
        return this._request('/api/satellites/tle/groups');
    }

    async getStatus() {
        return this._request('/api/status');
    }

    async getAuditLog(limit = 100) {
        return this._request(`/api/audit?limit=${limit}`);
    }

    async getMe() {
        return this._request('/api/auth/me');
    }

    // ─── HEKTOR Search ──────────────────────────────────────────

    async search(query, options = {}) {
        const params = new URLSearchParams({ q: query });
        if (options.mode) params.set('mode', options.mode);
        if (options.k) params.set('k', options.k);
        if (options.layer) params.set('layer', options.layer);
        return this._request(`/api/search?${params}`);
    }

    // ─── Admin Endpoints ────────────────────────────────────────

    async createUser(username, password, role = 'analyst') {
        return this._request('/api/auth/users', {
            method: 'POST',
            body: JSON.stringify({ username, password, role })
        });
    }

    // ─── WebSocket ──────────────────────────────────────────────

    _connectWebSocket() {
        if (this._wsConnection) return;
        if (!this.token) return;

        const wsProto = this.baseURL.startsWith('https') ? 'wss' : 'ws';
        const wsHost = this.baseURL.replace(/^https?:\/\//, '');
        const wsURL = `${wsProto}://${wsHost}/ws?token=${this.token}`;

        try {
            this._wsConnection = new WebSocket(wsURL);

            this._wsConnection.onopen = () => {
                console.log('[API:WS] Connected');
                // Subscribe to all layers
                this._wsConnection.send(JSON.stringify({
                    type: 'subscribe',
                    layers: ['flights', 'seismic', 'satellites', 'alerts']
                }));
            };

            this._wsConnection.onmessage = (event) => {
                try {
                    const msg = JSON.parse(event.data);
                    // Dispatch to registered listeners
                    const listeners = this._wsListeners.get(msg.type) || [];
                    for (const cb of listeners) {
                        try { cb(msg); } catch (e) { console.warn('[API:WS] Listener error:', e); }
                    }
                } catch (e) {
                    console.warn('[API:WS] Parse error:', e.message);
                }
            };

            this._wsConnection.onclose = (event) => {
                console.log(`[API:WS] Disconnected (code=${event.code})`);
                this._wsConnection = null;
                // Auto-reconnect after 5 seconds
                if (this.isAuthenticated) {
                    this._wsReconnectTimer = setTimeout(() => this._connectWebSocket(), 5000);
                }
            };

            this._wsConnection.onerror = (error) => {
                console.warn('[API:WS] Error:', error);
            };

        } catch (e) {
            console.warn('[API:WS] Connection failed:', e.message);
        }
    }

    _disconnectWebSocket() {
        if (this._wsReconnectTimer) {
            clearTimeout(this._wsReconnectTimer);
            this._wsReconnectTimer = null;
        }
        if (this._wsConnection) {
            this._wsConnection.close();
            this._wsConnection = null;
        }
    }

    onWebSocketMessage(type, callback) {
        if (!this._wsListeners.has(type)) {
            this._wsListeners.set(type, []);
        }
        this._wsListeners.get(type).push(callback);
    }

    // ─── Role Checks ────────────────────────────────────────────

    canAccess(feature) {
        const rolePerms = {
            admin:     ['flights', 'seismic', 'satellites', 'satx', 'cctv', 'traffic', 'audit', 'users', 'search', 'alerts'],
            commander: ['flights', 'seismic', 'satellites', 'satx', 'cctv', 'traffic', 'search', 'alerts'],
            analyst:   ['flights', 'seismic', 'satellites', 'search'],
            viewer:    ['flights', 'seismic']
        };
        const perms = rolePerms[this.role] || [];
        return perms.includes(feature);
    }

    get roleLabel() {
        const labels = {
            admin: 'ADMIN',
            commander: 'COMMANDER',
            analyst: 'ANALYST',
            viewer: 'VIEWER'
        };
        return labels[this.role] || 'UNKNOWN';
    }

    // ─── Cleanup ────────────────────────────────────────────────

    destroy() {
        this._disconnectWebSocket();
        if (this._refreshTimer) clearTimeout(this._refreshTimer);
    }
}

// Global API client instance
window.GDI_API = new GDI_APIClient();
