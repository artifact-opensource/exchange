/**
 * GDI — Valkyrie Authentication Client
 * Handles JWT auth with the backend API.
 * Credentials come from sessionStorage (set by login.html).
 */

class GDI_Auth {
    constructor() {
        this._token = null;
        this._role = null;
        this._expiry = null;
        this._refreshTimer = null;
        this._username = null;
        this._password = null;
    }

    get token() { return this._token; }
    get role() { return this._role; }
    get isAuthenticated() { return this._token && this._expiry > Date.now(); }

    /**
     * Initialise from sessionStorage (set by login page).
     * Returns true if a valid session exists, false if login is required.
     */
    initFromSession() {
        const token   = sessionStorage.getItem('gdi_token');
        const role    = sessionStorage.getItem('gdi_role');
        const expiry  = parseInt(sessionStorage.getItem('gdi_expiry') || '0');
        const user    = sessionStorage.getItem('gdi_user');

        if (token && expiry > Date.now()) {
            this._token  = token;
            this._role   = role;
            this._expiry = expiry;
            this._username = user;
            console.log(`[AUTH] Session restored for ${user} (${role})`);
            return true;
        }

        // Expired or missing — clear and redirect
        sessionStorage.clear();
        return false;
    }

    /**
     * Login to the GDI backend.
     * @param {string} username
     * @param {string} password
     * @returns {Promise<boolean>}
     */
    async login(username, password) {
        try {
            const resp = await fetch(`${GDI_CONFIG.backend.url}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
            });

            if (!resp.ok) {
                console.error('[AUTH] Login failed:', resp.status);
                return false;
            }

            const data = await resp.json();
            this._token    = data.access_token;
            this._role     = data.role;
            this._username = username;
            this._password = password;
            this._expiry   = Date.now() + (data.expires_in * 1000) - 60000;

            // Persist to sessionStorage
            sessionStorage.setItem('gdi_token', this._token);
            sessionStorage.setItem('gdi_role', this._role);
            sessionStorage.setItem('gdi_user', username);
            sessionStorage.setItem('gdi_expiry', String(this._expiry));

            // Auto-refresh 5 minutes before expiry
            if (this._refreshTimer) clearTimeout(this._refreshTimer);
            const refreshIn = (data.expires_in - 300) * 1000;
            if (refreshIn > 0) {
                this._refreshTimer = setTimeout(() => this.login(username, password), refreshIn);
            }

            console.log(`[AUTH] Authenticated as ${username} (${this._role})`);
            return true;
        } catch (e) {
            console.error('[AUTH] Login error:', e);
            return false;
        }
    }

    /**
     * Sign out — clear session and redirect to login.
     */
    logout() {
        if (this._refreshTimer) clearTimeout(this._refreshTimer);
        sessionStorage.clear();
        window.location.replace('/login');
    }

    /**
     * Get authorization headers for API requests.
     * @returns {Object}
     */
    headers() {
        if (!this.isAuthenticated) return {};
        return { 'Authorization': `Bearer ${this._token}` };
    }

    /**
     * Make an authenticated fetch request to the backend.
     * Falls back to direct URL if backend is unavailable.
     * @param {string} endpoint - Relative API path (e.g., '/api/flights')
     * @param {Object} options - fetch options
     * @returns {Promise<Response>}
     */
    async fetch(endpoint, options = {}) {
        const url = `${GDI_CONFIG.backend.url}${endpoint}`;
        const headers = { ...this.headers(), ...options.headers };

        try {
            const resp = await fetch(url, { ...options, headers });
            if (resp.status === 401) {
                console.warn('[AUTH] Token expired — redirecting to login');
                this.logout();
            }
            return resp;
        } catch (e) {
            console.warn(`[AUTH] Backend unavailable for ${endpoint}:`, e.message);
            throw e;
        }
    }

    /**
     * Connect to the WebSocket with authentication.
     * @returns {WebSocket}
     */
    connectWebSocket() {
        const wsUrl = `${GDI_CONFIG.backend.wsUrl}?token=${this._token || ''}`;
        const ws = new WebSocket(wsUrl);

        ws.onopen = () => console.log('[WS] Connected to Valkyrie backend');
        ws.onclose = (e) => {
            console.warn('[WS] Disconnected:', e.code, e.reason);
            setTimeout(() => {
                if (this.isAuthenticated) {
                    console.log('[WS] Reconnecting...');
                    this.connectWebSocket();
                }
            }, 3000);
        };
        ws.onerror = (e) => console.error('[WS] Error:', e);

        return ws;
    }

    destroy() {
        if (this._refreshTimer) clearTimeout(this._refreshTimer);
    }
}

// Singleton
window.gdiAuth = new GDI_Auth();
