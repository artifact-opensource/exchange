/**
 * VALKYRIE — GDI Intelligence Interface v2.0
 *
 * Architecture:
 *   Query → Tier 1 (rule engine, instant, no LLM)
 *         → Tier 2 (GLADIUS/Ollama, complex NL, async)
 *
 * Panel: compact tray, bottom-right, minimal footprint when collapsed.
 * Output: structured intel blocks — not rendered markdown.
 */

// ══════════════════════════════════════════════════════════════════
//  TIER 1 — Rule Engine
//  Handles common queries instantly with pure domain data compute.
//  No network. No LLM. Zero latency.
// ══════════════════════════════════════════════════════════════════

class ValkyrieRuleEngine {

    constructor(layers) {
        this.layers = layers; // { flights, seismic, satellites, ... }
    }

    /**
     * Try to answer a query with the rule engine.
     * Returns { handled: true, result: IntelBlock[] } or { handled: false }.
     */
    evaluate(query) {
        const q = query.toLowerCase().trim();

        // ── Status / overview ──────────────────────────────────
        if (/^(status|sitrep|situation|overview|briefing|summary|all domains?)/.test(q)) {
            return { handled: true, result: this._fullSitrep() };
        }

        // ── Air domain ─────────────────────────────────────────
        if (/\b(flight|aircraft|plane|air|aviation|adsb)\b/.test(q)) {
            return { handled: true, result: this._airIntel(q) };
        }

        // ── Seismic / ground ───────────────────────────────────
        if (/\b(seismic|earthquake|quake|tremor|magnitude|usgs)\b/.test(q)) {
            return { handled: true, result: this._seismicIntel(q) };
        }

        // ── Space / satellite ──────────────────────────────────
        if (/\b(satellite|orbit|space|tle|recon|debris|iss|station)\b/.test(q)) {
            return { handled: true, result: this._spaceIntel(q) };
        }

        // ── Anomaly / alert scan ───────────────────────────────
        if (/\b(anomal|alert|warning|critical|emergency|threat)\b/.test(q)) {
            return { handled: true, result: this._anomalyScan() };
        }

        // ── Domain count queries ───────────────────────────────
        if (/how many|count|total/.test(q)) {
            return { handled: true, result: this._countQuery(q) };
        }

        return { handled: false };
    }

    _fullSitrep() {
        const blocks = [];
        const domains = [
            this.layers.flights?.getIntelSummary?.(),
            this.layers.seismic?.getIntelSummary?.(),
            this.layers.satellites?.getIntelSummary?.(),
        ].filter(Boolean);

        // Domain status row
        blocks.push({
            type: 'header',
            label: 'MULTI-DOMAIN SITREP',
            timestamp: new Date().toISOString(),
        });

        for (const d of domains) {
            const anomaly = d.anomalyScore || 0;
            const level = anomaly >= 60 ? 'critical' : anomaly >= 30 ? 'warning' : 'nominal';
            blocks.push({
                type: 'domain-row',
                domain: d.domain,
                status: d.status,
                total: d.total,
                anomalyScore: anomaly,
                level,
            });
        }

        // Collect all alerts
        const allAlerts = domains.flatMap(d => d.alerts || []);
        if (allAlerts.length > 0) {
            blocks.push({ type: 'alert-list', alerts: allAlerts });
        }

        return blocks;
    }

    _airIntel(q) {
        const intel = this.layers.flights?.getIntelSummary?.();
        if (!intel) return [{ type: 'error', msg: 'Flight layer offline.' }];

        const blocks = [{ type: 'header', label: 'AIR DOMAIN — INTELLIGENCE', timestamp: new Date().toISOString() }];

        blocks.push({
            type: 'stat-grid',
            stats: [
                { label: 'TRACKED', value: intel.total, unit: 'aircraft' },
                { label: 'MILITARY', value: intel.military, unit: 'confirmed', highlight: intel.military > 0 },
                { label: 'HIGH ALT', value: intel.highAlt, unit: '>12,000m' },
                { label: 'ANOMALY', value: `${intel.anomalyScore}%`, highlight: intel.anomalyScore > 20 },
            ],
        });

        if (intel.topCountries?.length) {
            blocks.push({
                type: 'kv-list',
                label: 'ORIGIN STATES',
                items: intel.topCountries.map(s => {
                    const [c, n] = s.split(':');
                    return { key: c, value: n };
                }),
            });
        }

        if (intel.emergencySquawk?.length) {
            blocks.push({
                type: 'alert-list',
                alerts: intel.alerts,
            });
        }

        // Specific sub-queries
        if (/military/.test(q) && intel.military === 0) {
            blocks.push({ type: 'note', text: 'No military-category aircraft detected in current view.' });
        }
        if (/emerg|squawk|7700|7500/.test(q)) {
            if (intel.emergencySquawk.length === 0) {
                blocks.push({ type: 'note', text: 'No emergency squawk codes active.' });
            }
        }

        return blocks;
    }

    _seismicIntel(q) {
        const intel = this.layers.seismic?.getIntelSummary?.();
        if (!intel) return [{ type: 'error', msg: 'Seismic layer offline.' }];

        const blocks = [{ type: 'header', label: 'SEISMIC — GROUND INTELLIGENCE', timestamp: new Date().toISOString() }];

        blocks.push({
            type: 'stat-grid',
            stats: [
                { label: 'EVENTS', value: intel.total, unit: 'total' },
                { label: 'MAX MAG', value: `M${intel.maxMagnitude}`, highlight: parseFloat(intel.maxMagnitude) >= 5.0 },
                { label: 'AVG MAG', value: `M${intel.avgMagnitude}` },
                { label: 'MAJOR', value: intel.majorEvents, unit: '≥M6.0', highlight: intel.majorEvents > 0 },
            ],
        });

        if (intel.top3?.length) {
            blocks.push({
                type: 'entity-table',
                label: 'SIGNIFICANT EVENTS',
                cols: ['MAG', 'LOCATION', 'DEPTH'],
                rows: intel.top3.map(e => [e.mag, e.place, e.depth]),
            });
        }

        if (intel.alerts?.length) {
            blocks.push({ type: 'alert-list', alerts: intel.alerts });
        }

        return blocks;
    }

    _spaceIntel(q) {
        const intel = this.layers.satellites?.getIntelSummary?.();
        if (!intel) return [{ type: 'error', msg: 'Satellite layer offline.' }];

        const blocks = [{ type: 'header', label: 'SPACE DOMAIN — ORBITAL PICTURE', timestamp: new Date().toISOString() }];

        blocks.push({
            type: 'stat-grid',
            stats: [
                { label: 'CATALOGUED', value: intel.total.toLocaleString(), unit: 'objects' },
                { label: 'RENDERED', value: intel.rendered?.toLocaleString(), unit: 'active' },
                { label: 'RECON', value: intel.reconSatellites, unit: 'assets', highlight: intel.reconSatellites > 0 },
                { label: 'DEBRIS', value: intel.debrisObjects?.toLocaleString(), unit: 'pieces' },
            ],
        });

        if (intel.orbitRegimes?.length) {
            blocks.push({
                type: 'kv-list',
                label: 'ORBIT DISTRIBUTION',
                items: intel.orbitRegimes.map(s => {
                    const [k, v] = s.split(':');
                    return { key: k, value: v };
                }),
            });
        }

        if (intel.decayingObjects > 0) {
            blocks.push({ type: 'alert-list', alerts: intel.alerts });
        }

        return blocks;
    }

    _anomalyScan() {
        const blocks = [{ type: 'header', label: 'ANOMALY SCAN — ALL DOMAINS', timestamp: new Date().toISOString() }];
        const allAlerts = [];
        let totalAnomaly = 0;
        let domainsScanned = 0;

        for (const [name, layer] of Object.entries(this.layers)) {
            if (!layer?.getIntelSummary) continue;
            const intel = layer.getIntelSummary();
            domainsScanned++;
            totalAnomaly += intel.anomalyScore || 0;
            if (intel.alerts?.length) allAlerts.push(...intel.alerts);

            blocks.push({
                type: 'domain-row',
                domain: intel.domain || name.toUpperCase(),
                status: intel.status,
                total: intel.total,
                anomalyScore: intel.anomalyScore || 0,
                level: (intel.anomalyScore || 0) >= 60 ? 'critical' : (intel.anomalyScore || 0) >= 30 ? 'warning' : 'nominal',
            });
        }

        if (allAlerts.length > 0) {
            blocks.push({ type: 'alert-list', alerts: allAlerts });
        } else {
            blocks.push({ type: 'note', text: `${domainsScanned} domains scanned. No active anomalies detected.` });
        }

        return blocks;
    }

    _countQuery(q) {
        const blocks = [];
        if (/flight|aircraft|plane/.test(q)) {
            const n = this.layers.flights?.count || 0;
            blocks.push({ type: 'single-stat', label: 'AIRCRAFT TRACKED', value: n });
        } else if (/quake|seismic/.test(q)) {
            const n = this.layers.seismic?.count || 0;
            blocks.push({ type: 'single-stat', label: 'SEISMIC EVENTS', value: n });
        } else if (/sat/.test(q)) {
            const n = this.layers.satellites?.count || 0;
            blocks.push({ type: 'single-stat', label: 'SATELLITES TRACKED', value: n });
        } else {
            // All domain counts
            blocks.push({
                type: 'stat-grid',
                stats: [
                    { label: 'FLIGHTS', value: this.layers.flights?.count || 0 },
                    { label: 'SEISMIC', value: this.layers.seismic?.count || 0 },
                    { label: 'SATELLITES', value: this.layers.satellites?.count || 0 },
                ],
            });
        }
        return blocks;
    }
}


// ══════════════════════════════════════════════════════════════════
//  INTEL BLOCK RENDERER
//  Converts structured IntelBlock[] into DOM elements.
//  No markdown. No string parsing. Typed blocks only.
// ══════════════════════════════════════════════════════════════════

class IntelRenderer {

    /**
     * Render an array of IntelBlocks into a DOM container.
     * Returns a <div class="vk-intel-response">.
     */
    render(blocks) {
        const wrap = document.createElement('div');
        wrap.className = 'vk-intel-response';

        for (const block of blocks) {
            const el = this._renderBlock(block);
            if (el) wrap.appendChild(el);
        }

        return wrap;
    }

    _renderBlock(block) {
        switch (block.type) {
            case 'header':       return this._header(block);
            case 'stat-grid':    return this._statGrid(block);
            case 'single-stat':  return this._singleStat(block);
            case 'kv-list':      return this._kvList(block);
            case 'entity-table': return this._entityTable(block);
            case 'domain-row':   return this._domainRow(block);
            case 'alert-list':   return this._alertList(block);
            case 'note':         return this._note(block);
            case 'error':        return this._errorBlock(block);
            case 'text':         return this._textBlock(block);
            default:             return null;
        }
    }

    _header(b) {
        const el = document.createElement('div');
        el.className = 'vkb-header';
        el.innerHTML = `<span class="vkb-header-label">${b.label}</span>` +
            (b.timestamp ? `<span class="vkb-header-ts">${this._fmtTime(b.timestamp)}</span>` : '');
        return el;
    }

    _statGrid(b) {
        const el = document.createElement('div');
        el.className = 'vkb-stat-grid';
        for (const s of b.stats) {
            const cell = document.createElement('div');
            cell.className = 'vkb-stat-cell' + (s.highlight ? ' vkb-stat-alert' : '');
            cell.innerHTML = `<div class="vkb-stat-val">${s.value}</div>` +
                `<div class="vkb-stat-lbl">${s.label}${s.unit ? `<br><span class="vkb-stat-unit">${s.unit}</span>` : ''}</div>`;
            el.appendChild(cell);
        }
        return el;
    }

    _singleStat(b) {
        const el = document.createElement('div');
        el.className = 'vkb-single-stat';
        el.innerHTML = `<span class="vkb-ss-val">${b.value}</span><span class="vkb-ss-lbl">${b.label}</span>`;
        return el;
    }

    _kvList(b) {
        const el = document.createElement('div');
        el.className = 'vkb-kv-list';
        if (b.label) {
            const lbl = document.createElement('div');
            lbl.className = 'vkb-kv-label';
            lbl.textContent = b.label;
            el.appendChild(lbl);
        }
        for (const item of b.items) {
            const row = document.createElement('div');
            row.className = 'vkb-kv-row';
            row.innerHTML = `<span class="vkb-kv-key">${item.key}</span><span class="vkb-kv-val">${item.value}</span>`;
            el.appendChild(row);
        }
        return el;
    }

    _entityTable(b) {
        const el = document.createElement('div');
        el.className = 'vkb-table';
        if (b.label) {
            const lbl = document.createElement('div');
            lbl.className = 'vkb-kv-label';
            lbl.textContent = b.label;
            el.appendChild(lbl);
        }
        const thead = document.createElement('div');
        thead.className = 'vkb-table-head';
        thead.innerHTML = b.cols.map(c => `<span>${c}</span>`).join('');
        el.appendChild(thead);
        for (const row of b.rows) {
            const tr = document.createElement('div');
            tr.className = 'vkb-table-row';
            tr.innerHTML = row.map(c => `<span>${c}</span>`).join('');
            el.appendChild(tr);
        }
        return el;
    }

    _domainRow(b) {
        const el = document.createElement('div');
        el.className = `vkb-domain-row vkb-domain-${b.level}`;
        const dot = b.level === 'critical' ? '●' : b.level === 'warning' ? '◉' : '○';
        el.innerHTML =
            `<span class="vkb-dr-dot">${dot}</span>` +
            `<span class="vkb-dr-domain">${b.domain}</span>` +
            `<span class="vkb-dr-status">${b.status}</span>` +
            `<span class="vkb-dr-count">${b.total}</span>` +
            `<span class="vkb-dr-score" title="Anomaly score">${b.anomalyScore}</span>`;
        return el;
    }

    _alertList(b) {
        const el = document.createElement('div');
        el.className = 'vkb-alert-list';
        for (const a of b.alerts) {
            const item = document.createElement('div');
            const sev = (a.severity || 'INFO').toUpperCase();
            item.className = `vkb-alert vkb-alert-${sev.toLowerCase()}`;
            item.innerHTML = `<span class="vkb-alert-sev">${sev}</span><span class="vkb-alert-msg">${a.msg}</span>`;
            el.appendChild(item);
        }
        return el;
    }

    _note(b) {
        const el = document.createElement('div');
        el.className = 'vkb-note';
        el.textContent = b.text;
        return el;
    }

    _errorBlock(b) {
        const el = document.createElement('div');
        el.className = 'vkb-error';
        el.textContent = b.msg;
        return el;
    }

    _textBlock(b) {
        // For LLM responses — render as flowing text, not markdown
        const el = document.createElement('div');
        el.className = 'vkb-text';
        // Strip any markdown syntax that leaked through
        const clean = (b.content || '')
            .replace(/\*\*(.+?)\*\*/g, (_, t) => {
                const s = document.createElement('strong');
                s.textContent = t;
                return s.outerHTML;
            })
            .replace(/`(.+?)`/g, (_, t) => {
                const s = document.createElement('code');
                s.textContent = t;
                return s.outerHTML;
            })
            .replace(/^#{1,3}\s+(.+)$/gm, (_, t) => {
                const s = document.createElement('div');
                s.className = 'vkb-text-heading';
                s.textContent = t;
                return s.outerHTML;
            })
            .replace(/\n\n/g, '</p><p>')
            .replace(/\n/g, '<br>');
        el.innerHTML = `<p>${clean}</p>`;
        return el;
    }

    _fmtTime(iso) {
        try {
            const d = new Date(iso);
            return d.toISOString().replace('T', ' ').substring(0, 19) + ' UTC';
        } catch { return iso; }
    }
}


// ══════════════════════════════════════════════════════════════════
//  VALKYRIE PANEL v2.0
//  Compact tray. Minimal collapsed footprint.
//  Slides open on activation. Ctrl+K shortcut.
// ══════════════════════════════════════════════════════════════════

class ValkyriePanel {

    constructor() {
        this.panel      = document.getElementById('valkyrie-panel');
        this.body       = document.getElementById('valkyrie-body');
        this.messagesEl = document.getElementById('valkyrie-messages');
        this.inputEl    = document.getElementById('valkyrie-input');
        this.statusEl   = document.getElementById('valkyrie-status');
        this.sendBtn    = document.getElementById('valkyrie-send');

        this.expanded   = false;
        this.processing = false;
        this.sessionId  = `vk-${Date.now().toString(36)}`;
        this.ws         = null;

        this._renderer  = new IntelRenderer();
        this._engine    = null; // set after layers ready via .attachLayers()

        this._bindEvents();
        this._addSystemMessage('VALKYRIE v2.0  ·  T1 rule engine + T2 AI  ·  Ctrl+K');
    }

    // ── Public API ──────────────────────────────────────────

    /** Call from app.js once layers are ready */
    attachLayers(layers) {
        this._engine = new ValkyrieRuleEngine(layers);
    }

    toggle() {
        this.expanded = !this.expanded;
        this.panel.classList.toggle('valkyrie-collapsed', !this.expanded);
        this.panel.classList.toggle('valkyrie-expanded', this.expanded);
        if (this.expanded) {
            this.inputEl.focus();
            this._scrollToBottom();
        }
    }

    async send() {
        const query = this.inputEl.value.trim();
        if (!query || this.processing) return;

        this.inputEl.value = '';
        this._addUserMessage(query);
        this._setStatus('PROCESSING', '#ffb000');
        this.processing = true;

        // ── Tier 1: Rule Engine ─────────────────────────────
        if (this._engine) {
            const t1 = this._engine.evaluate(query);
            if (t1.handled) {
                this._addIntelBlocks(t1.result);
                this._setStatus('READY', '#00ff9d');
                this.processing = false;
                return;
            }
        }

        // ── Tier 2: LLM (WebSocket → REST) ─────────────────
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({
                type: 'ai_query',
                query,
                session_id: this.sessionId,
            }));
        } else {
            await this._restQuery(query);
        }
    }

    attachWebSocket(ws) {
        this.ws = ws;
    }

    handleWSMessage(msg) {
        if (msg.type === 'ai_event') {
            this._handleAIEvent(msg);
            return true;
        }
        if (msg.type === 'ai_complete') {
            this._setStatus('READY', '#00ff9d');
            this.processing = false;
            return true;
        }
        return false;
    }

    // ── Private ─────────────────────────────────────────────

    _bindEvents() {
        this.inputEl.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.send();
            }
            e.stopPropagation();
        });

        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                this.toggle();
            }
        });
    }

    _handleAIEvent(event) {
        switch (event.event) {
            case 'thinking':
                this._ensureThinkingIndicator();
                break;
            case 'tool_call':
                this._removeThinkingIndicator();
                this._addToolCallMessage(event.name, event.arguments);
                break;
            case 'tool_result':
                this._addToolResultMessage(event.name, event.result);
                break;
            case 'text':
                this._removeThinkingIndicator();
                this._addIntelBlocks([{ type: 'text', content: event.content }]);
                break;
            case 'done':
                this._removeThinkingIndicator();
                this._setStatus('READY', '#00ff9d');
                this.processing = false;
                break;
            case 'error':
                this._removeThinkingIndicator();
                this._addIntelBlocks([{ type: 'error', msg: event.message || 'Unknown error' }]);
                this._setStatus('ERROR', '#ff0040');
                this.processing = false;
                break;
        }
    }

    async _restQuery(query) {
        try {
            const token = window.gdiAuth?.token;
            const headers = { 'Content-Type': 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;

            const resp = await fetch('/api/ai/query', {
                method: 'POST',
                headers,
                body: JSON.stringify({ query, session_id: this.sessionId }),
            });

            if (!resp.ok) {
                const err = await resp.json().catch(() => ({ detail: 'Request failed' }));
                this._addIntelBlocks([{ type: 'error', msg: err.detail || `HTTP ${resp.status}` }]);
                this._setStatus('ERROR', '#ff0040');
                this.processing = false;
                return;
            }

            const data = await resp.json();
            if (data.response) {
                this._addIntelBlocks([{ type: 'text', content: data.response }]);
            }
            this._setStatus('READY', '#00ff9d');
            this.processing = false;
        } catch (e) {
            this._addIntelBlocks([{ type: 'error', msg: `Connection error: ${e.message}` }]);
            this._setStatus('ERROR', '#ff0040');
            this.processing = false;
        }
    }

    // ── Message Rendering ───────────────────────────────────

    _addUserMessage(text) {
        const el = document.createElement('div');
        el.className = 'vk-msg vk-user';
        el.textContent = text;
        this.messagesEl.appendChild(el);
        this._scrollToBottom();
    }

    _addIntelBlocks(blocks) {
        const el = document.createElement('div');
        el.className = 'vk-msg vk-response';
        el.appendChild(this._renderer.render(blocks));
        this.messagesEl.appendChild(el);
        this._scrollToBottom();
    }

    _addSystemMessage(text) {
        const el = document.createElement('div');
        el.className = 'vk-msg vk-system';
        el.textContent = text;
        this.messagesEl.appendChild(el);
        this._scrollToBottom();
    }

    _addToolCallMessage(name, args) {
        const el = document.createElement('div');
        el.className = 'vk-msg vk-tool-call';
        const argsStr = Object.entries(args).map(([k, v]) => `${k}=${JSON.stringify(v)}`).join(', ');
        el.innerHTML = `<span class="vk-tool-icon">⚙</span> <span class="vk-tool-name">${name}</span>(${this._esc(argsStr)})`;
        this.messagesEl.appendChild(el);
        this._scrollToBottom();
    }

    _addToolResultMessage(name, result) {
        const el = document.createElement('div');
        el.className = 'vk-msg vk-tool-result';
        let summary = '';
        if (result.success !== undefined) {
            summary = result.success ? '✓' : '✗';
            if (result.location?.name) summary += ` ${result.location.name}`;
            if (result.layer) summary += ` ${result.layer}: ${result.enabled ? 'ON' : 'OFF'}`;
        } else if (result.aircraft) {
            summary = `${result.filtered} aircraft`;
        } else if (result.events) {
            summary = `${result.filtered || result.events.length} events`;
        } else if (result.error) {
            summary = result.error;
        } else {
            summary = JSON.stringify(result).substring(0, 80);
        }
        el.innerHTML = `<span class="vk-tool-icon">↩</span> ${this._esc(summary)}`;
        this.messagesEl.appendChild(el);
        this._scrollToBottom();
    }

    _ensureThinkingIndicator() {
        if (!this.messagesEl.querySelector('.vk-thinking')) {
            const el = document.createElement('div');
            el.className = 'vk-msg vk-thinking';
            el.innerHTML = '<span class="vk-dots"><span>.</span><span>.</span><span>.</span></span>';
            this.messagesEl.appendChild(el);
            this._scrollToBottom();
        }
    }

    _removeThinkingIndicator() {
        this.messagesEl.querySelector('.vk-thinking')?.remove();
    }

    _scrollToBottom() {
        requestAnimationFrame(() => {
            this.messagesEl.scrollTop = this.messagesEl.scrollHeight;
        });
    }

    _setStatus(text, color) {
        this.statusEl.textContent = text;
        this.statusEl.style.color = color;
    }

    _esc(s) {
        const el = document.createElement('span');
        el.textContent = s;
        return el.innerHTML;
    }
}

window.ValkyriePanel = ValkyriePanel;
