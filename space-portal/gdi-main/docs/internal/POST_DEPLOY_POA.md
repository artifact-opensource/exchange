# GDI — Post-Deployment Plan of Action
**Generated:** 2026-03-06 01:37 PKT  
**Version:** 0.2.0 "Sovereign Eye"  
**Status:** OPERATIONAL (with critical issues — see below)  
**Classification:** INTERNAL — Artifact Virtual  
**Author:** Aria Shakil (sub-agent, Artifact Virtual)

---

## ⚠️ CRITICAL ISSUES FOUND DURING AUDIT

Before the prioritised plan — these need immediate human action:

| # | Issue | Severity | Fix |
|---|-------|----------|-----|
| 1 | **gdi-backend.service crash-looping** (restart counter: 58+) — `[Errno 98] Address already in use` | 🔴 CRITICAL | Backend is actually running (manually launched PID 2801411), but systemd can't bind :8600. Kill the orphan process or stop/reconcile. |
| 2 | **HF_TOKEN not set** — LLM inference fully disabled, 10+ errors per worker cycle | 🟠 HIGH | Set HF_TOKEN in .env OR configure GLADIUS local LLM |
| 3 | **FININT API keys all missing** — `Binance: ✗ | AlphaVantage: ✗ | FRED: ✗ | NewsAPI: ✗` | 🟠 HIGH | Worker runs on fallback only (Binance public API) |
| 4 | **Firewall: OPEN** — `ufw` not enabled, `iptables` has ACCEPT policy on all INPUT | 🔴 CRITICAL | Port 8600 is accessible from external IPs right now |
| 5 | **Default admin password** `admin/valkyrie` still active | 🔴 CRITICAL | Change immediately |
| 6 | **HEKTOR daemon offline** — `daemon_running: false` (socket exists but no PID) | 🟠 HIGH | Restart HEKTOR daemon |
| 7 | **No TLS** — all traffic plaintext on :80 | 🟠 HIGH | Set up Let's Encrypt (this week) |
| 8 | **TLE data stale** — `active.tle` last updated Mar 1, `spacetrack_gp_full.json` last updated Mar 6 01:29 ✅ | 🟡 MEDIUM | Space-Track sync IS running (31,597 catalog entries) but active.tle needs refresh |
| 9 | **Spatial index empty** — 0 entities, 0 flights, 0 seismic, 0 satellites ingested | 🟡 MEDIUM | Workers need to push data into spatial index, not just Redis stream |
| 10 | **Workers restart every ~5 seconds** — same crash pattern as backend? | 🔴 CHECK | Verify worker stability separately |

---

## PHASE 1 — IMMEDIATE (Do Right Now)

### 1.1 Fix Backend Crash-Loop

**Root cause:** The backend is running as a manual/orphan process (PID 2801411) that was started outside systemd. When systemd tries to start the service, port 8600 is already occupied.

**Fix:**
```bash
# Option A: Take ownership with systemd (recommended)
# Kill orphan, let systemd own the process
kill 2801411
sudo systemctl restart gdi-backend.service
sudo systemctl status gdi-backend.service

# Option B: Disable systemd service, manage manually
# sudo systemctl disable gdi-backend.service
# sudo systemctl stop gdi-backend.service
```

**Verify:**
```bash
sudo journalctl -u gdi-backend -f --no-pager &
sleep 10
curl -s http://localhost:8600/api/status | python3 -m json.tool
```

### 1.2 Fix Firewall — URGENT

Port 8600 is currently accessible from any IP on the internet. Fix now:

```bash
# Enable ufw
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh          # Don't lock yourself out
sudo ufw allow 80/tcp       # HTTP (nginx)
sudo ufw allow 443/tcp      # HTTPS (future)
# 8600 stays internal — nginx proxies it
sudo ufw enable
sudo ufw status verbose
```

**Verify 8600 is NOT externally accessible:**
```bash
# From an external machine:
# curl http://dragonfly.artifactvirtual.com:8600/api/status
# Should TIMEOUT or CONNECTION REFUSED
```

### 1.3 Change Default Admin Password

```bash
# Via API (requires current admin token)
TOKEN=$(curl -s -X POST http://localhost:8600/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"valkyrie"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")

curl -s -X POST http://localhost:8600/api/auth/users \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"YOUR_STRONG_PASSWORD_HERE","role":"admin"}'

# Or edit directly (check .users.json format):
cat /home/adam/workspace/projects/gdi/backend/.users.json
```

### 1.4 Rotate Exposed Secrets

⚠️ **CONFIRMED EXPOSURE:** `.env` WAS committed to git. Commit `32c8aae` ("fix: untrack .env from git") removed it from HEAD, but the secrets remain in git history. Run BFG Repo Cleaner to purge history, AND rotate all secrets immediately.

```bash
# Confirm what was in the exposed .env
cd /home/adam/workspace/projects/gdi
git show 32c8aae~1:.env 2>/dev/null | sed 's/=.*/=***REDACTED***/'
```

**Secrets that need rotating:**
- `GDI_JWT_SECRET` → New value generated: `829698936e6fd7bf09873a085d6e62e2eb2132a8838911b09874f61f78ed8c20820ed4c6746e9f4a55cba0347f02b565dbaedcb2261d45895d57ffc1b29421f7`
  - Update in `.env` then restart backend + workers
  - All existing JWT tokens will be invalidated (users re-login)
- `SPACETRACK_PASS` → Reset at https://www.space-track.org → Account → Change Password
- Any Google Maps API key — revoke old key, generate new in Google Cloud Console
- DB password (if applicable) — update in `.env` + SurrealDB config

**After rotation:**
```bash
# Restart everything
sudo systemctl restart gdi-backend.service
sudo systemctl restart gdi-workers.service
```

### 1.5 Restart HEKTOR Daemon for GDI

**Root cause found:** GDI's `hektor_api.py` expects its daemon socket at:
```
/home/adam/workspace/.ava-memory/ava_daemon.sock
```
The file does NOT exist. Two HEKTOR daemons are running (AVA's enterprise instance + AVA Mach6 instance), but NEITHER is serving the socket GDI expects. GDI HEKTOR must be started separately.

**Fix:**
```bash
# The GDI backend expects:
# SOCKET: /home/adam/workspace/.ava-memory/ava_daemon.sock
# VENV:   /home/adam/workspace/.hektor-env/bin/python3
# SCRIPT: /home/adam/workspace/.ava-memory/ava_memory_fast.py

# Start the GDI HEKTOR daemon
cd /home/adam/workspace/.ava-memory/
/home/adam/workspace/.hektor-env/bin/python3 ava_memory_fast.py daemon _serve &
sleep 2
ls -la ava_daemon.sock  # Should now exist
```

Or — if GDI should share AVA's HEKTOR instance, update `hektor_api.py` SOCKET_PATH to point to the active socket.

**Verify:**
```bash
TOKEN=$(curl -s -X POST http://localhost:8600/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"valkyrie"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:8600/api/hektor/health
# Should show: daemon_running: true, socket_exists: true
```

### 1.6 Set HF_TOKEN (or configure GLADIUS LLM)

```bash
# Add to .env:
HF_TOKEN=hf_your_token_here
# (Get from https://huggingface.co/settings/tokens)

# OR — preferred path: configure GLADIUS local inference
# See medium-term item 3.3
```

---

## PHASE 2 — SHORT-TERM (This Week)

### 2.1 DNS — Point Real Domain

Current nginx config: `server_name gdi.local _;`

```bash
# Edit nginx config
sudo nano /etc/nginx/sites-enabled/gdi
# Change: server_name gdi.local _;
# To:     server_name gdi.yourdomain.com;

sudo nginx -t && sudo systemctl reload nginx
```

For DNS: Add A record pointing `gdi.yourdomain.com` → server IP at your DNS provider.

### 2.2 TLS/HTTPS via Let's Encrypt

Once DNS is propagated:

```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d gdi.yourdomain.com

# Certbot will auto-modify nginx config to add HTTPS
# Uncomment the HTTPS block at bottom of nginx config as needed

# Auto-renewal (certbot installs cron/systemd timer automatically)
sudo certbot renew --dry-run
```

Update nginx HTTPS block in `/etc/nginx/sites-enabled/gdi` — template already present (commented out).

### 2.3 Log Rotation

```bash
# Create logrotate config for application logs
sudo tee /etc/logrotate.d/gdi << 'EOF'
/home/adam/workspace/projects/gdi/logs/*.log {
    daily
    rotate 14
    compress
    delaycompress
    missingok
    notifempty
    create 0640 adam adam
    sharedscripts
    postrotate
        systemctl kill -s HUP gdi-backend.service 2>/dev/null || true
    endscript
}
EOF

# journald log limits (already has rotation built-in, but size-cap it)
sudo tee -a /etc/systemd/journald.conf << 'EOF'
SystemMaxUse=500M
SystemMaxFileSize=50M
MaxRetentionSec=30day
EOF
sudo systemctl restart systemd-journald
```

### 2.4 WebSocket External Test

```bash
# Install wscat for testing
npm install -g wscat

# Test from external machine (replace with your domain/IP):
wscat -c "ws://gdi.yourdomain.com/ws?token=YOUR_JWT_TOKEN"

# Expected: connection established, stream of intel items
# If connection drops immediately: check nginx proxy_read_timeout settings
```

Current nginx config has `proxy_read_timeout 86400` — should be fine.

### 2.5 Set Up Daily Health Check Script

```bash
cat > /home/adam/workspace/projects/gdi/healthcheck.sh << 'SCRIPT'
#!/bin/bash
# GDI Daily Health Check — run via cron
LOGFILE="/home/adam/workspace/projects/gdi/logs/health.log"
DATE=$(date '+%Y-%m-%d %H:%M:%S')

# Check API
STATUS=$(curl -s http://localhost:8600/api/status | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('status','ERROR'))" 2>/dev/null)
REDIS=$(curl -s http://localhost:8600/api/status | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('services',{}).get('redis','ERROR'))" 2>/dev/null)

# Check services
BACKEND=$(systemctl is-active gdi-backend.service 2>/dev/null)
WORKERS=$(systemctl is-active gdi-workers.service 2>/dev/null)

echo "[$DATE] API=$STATUS REDIS=$REDIS BACKEND=$BACKEND WORKERS=$WORKERS" >> $LOGFILE

# Alert on failure
if [[ "$STATUS" != "operational" ]] || [[ "$BACKEND" != "active" ]]; then
    echo "[$DATE] ⚠️ GDI HEALTH CHECK FAILED: API=$STATUS BACKEND=$BACKEND" >&2
fi
SCRIPT

chmod +x /home/adam/workspace/projects/gdi/healthcheck.sh

# Add to crontab
(crontab -l 2>/dev/null; echo "*/15 * * * * /home/adam/workspace/projects/gdi/healthcheck.sh") | crontab -
```

### 2.6 Fix Worker Restart Loop

Workers are cycling every ~5 seconds. Investigate:
```bash
# Check full worker service status
sudo systemctl status gdi-workers.service -l
sudo journalctl -u gdi-workers --since "1 hour ago" --no-pager | grep -E "(ERROR|WARN|restart|exit)" | head -30

# Check service file for restart policy
systemctl cat gdi-workers.service | grep -E "(Restart|StartLimit)"
```

If workers are crashing immediately on HF_TOKEN errors, consider adding `StartLimitIntervalSec=0` or making HF_TOKEN optional gracefully.

---

## PHASE 3 — MEDIUM-TERM (Next 2 Weeks)

### 3.1 Bluetooth/WiFi Mesh Integration — Meshtastic + Reticulum

**Research docs available:** `docs/sources/mesh-sources.md` (AVA's research — 28KB)

Priority tasks:
1. Read `docs/sources/mesh-sources.md` in full — understand recommended hardware + protocols
2. Set up Reticulum network interface on this host
3. Wire Meshtastic LoRa node as RF transport layer
4. Create `mesh_worker.py` in `backend/workers/` — poll mesh nodes, emit intel items to Redis stream
5. Add mesh layer to frontend (`layers.js`) — visualise mesh topology

**Hardware needed:**
- RAK WisBlock or LILYGO T-Beam for LoRa (Meshtastic)
- RTL-SDR v4 for AIS/RF monitoring (see vessel-sources.md)

### 3.2 SATx Integration (Satellite Signal Intercepts)

SurrealDB is already running on :8000 (PID 1411385, `/opt/satx/surrealdb`) — SATx infrastructure is present.

Tasks:
1. Wire `/opt/satx/` data into GDI ingest pipeline
2. Create `satx_worker.py` — polls SurrealDB for new intercepts, pushes to intel stream
3. Map intercept data to appropriate geo coordinates for spatial index
4. Frontend layer: satellite signal strength / intercept events overlay

### 3.3 GLADIUS Local LLM Swap

Current state: LLM disabled (HF_TOKEN missing). Target: on-prem GLADIUS inference.

```bash
# Check GLADIUS installation
ls /opt/gladius/ 2>/dev/null
systemctl list-units | grep gladius

# Wire into GDI workers
# Edit backend/workers/llm.py (or equivalent)
# Replace HuggingFace inference endpoint with local GLADIUS API
```

Benefits: Zero cloud dependency, lower latency, sovereign data processing.

### 3.4 Access Portal — Operator Request Workflow

Create `docs/OPERATOR_ONBOARDING.md` documenting:
- How to request access (who to contact, what clearance needed)
- Initial login flow (JWT token lifecycle, refresh)
- RBAC roles: `admin`, `operator`, `observer` — what each can access
- WebSocket stream consumption guide

Implement self-service registration (optional, gated by admin approval):
- POST `/api/auth/request-access` → queues for admin review
- Admin endpoint to approve/deny

### 3.5 AIS/Vessel Tracking (Maritime Domain Awareness)

Research doc: `docs/sources/vessel-sources.md`

Priority:
1. Register with AISHub (free, reciprocal data sharing)
2. Wire AISHub API into new `maritime_worker.py`
3. Add vessel layer to frontend map (CesiumJS)
4. Long-term: RTL-SDR AIS receiver for sovereign station

### 3.6 Operator Documentation Suite

Create:
- `docs/ADMIN_GUIDE.md` — service management, user management, secret rotation
- `docs/OPERATOR_GUIDE.md` — using the dashboard, reading intel layers, alerts
- `docs/ARCHITECTURE.md` — system diagram, data flows, worker descriptions
- `docs/SECURITY.md` — hardening checklist, incident response, audit log review

---

## PHASE 4 — ONGOING OPERATIONS

### 4.1 Daily Health Checks (Automated)

The healthcheck.sh script above (Phase 2.5) handles basic checks. Augment with:

```bash
# Add TLE freshness check to healthcheck.sh
TLE_AGE=$(find /home/adam/workspace/projects/gdi/data/tle_cache/ -name "*.tle" -mmin +1440 | wc -l)
if [ "$TLE_AGE" -gt "0" ]; then
    echo "[$DATE] ⚠️ TLE files older than 24h: $TLE_AGE files" >> $LOGFILE
fi
```

### 4.2 TLE Catalog Refresh Monitoring

Current state: `spacetrack_gp_full.json` — 31,597 objects, last updated 01:29 today ✅

Monitor:
```bash
# Check Space-Track sync freshness
cat /home/adam/workspace/projects/gdi/data/tle_cache/spacetrack_meta.json
# Should show timestamp < 24h ago
```

The GEOINT worker syncs via Space-Track.org. Verify `SPACETRACK_USER` + `SPACETRACK_PASS` in `.env` are valid after secret rotation.

### 4.3 Worker Error Rate Monitoring

```bash
# Weekly error review
sudo journalctl -u gdi-workers --since "7 days ago" --no-pager | \
  grep -c "ERROR" && \
  sudo journalctl -u gdi-workers --since "7 days ago" --no-pager | \
  grep "ERROR" | sort | uniq -c | sort -rn | head -20
```

**Current known errors to track:**
- `HF_TOKEN not set` — fix by Phase 1.6
- `Connection closed by server` (redis) — graceful shutdown artifact, not a real error
- FININT API keys missing — fix by adding keys to `.env`

### 4.4 Security Audit Schedule

| Frequency | Task |
|-----------|------|
| Weekly | Review `backend/.audit.jsonl` for suspicious login patterns |
| Weekly | Check for failed login attempts: `grep "login_failed" backend/.audit.jsonl | tail -50` |
| Monthly | Rotate JWT secret (invalidates all sessions — plan downtime) |
| Monthly | Review RBAC user list: `GET /api/auth/users` |
| Monthly | Check for dependency updates: `pip list --outdated` in `.venv` |
| Quarterly | Full security audit: port scan from external, JWT token hardening review |
| Quarterly | Review nginx config for security headers (add CSP, HSTS, X-Frame-Options) |

### 4.5 Nginx Security Headers (Add Now)

```nginx
# Add to nginx server block:
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Permissions-Policy "geolocation=(), microphone=(), camera=()" always;
# Add after TLS is set up:
# add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
```

### 4.6 Backup Strategy

```bash
# Add to weekly cron:
# 1. Database backup
cp /home/adam/workspace/projects/gdi/data/valkyrie.db \
   /home/adam/workspace/projects/gdi/data/valkyrie.db.$(date +%Y%m%d)

# 2. User database backup
cp /home/adam/workspace/projects/gdi/backend/.users.json \
   /home/adam/workspace/projects/gdi/backend/.users.json.$(date +%Y%m%d).bak

# 3. Configuration backup (redact secrets)
git -C /home/adam/workspace/projects/gdi log --oneline -5
```

---

## QUICK REFERENCE — Service Commands

```bash
# Status
sudo systemctl status gdi-backend gdi-workers gdi-discord nginx redis-server

# Restart
sudo systemctl restart gdi-backend gdi-workers

# Logs (live)
sudo journalctl -u gdi-backend -f
sudo journalctl -u gdi-workers -f

# Test auth
curl -s -X POST http://localhost:8600/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"YOUR_NEW_PASSWORD"}'

# Health check
curl -s http://localhost:8600/api/status | python3 -m json.tool
```

---

## APPENDIX — System State at POA Creation

| Component | State | Notes |
|-----------|-------|-------|
| nginx | ✅ Running, HTTP 200 | Serving frontend on :80 |
| gdi-backend (process) | ✅ Running (PID 2801411) | Manual launch, NOT systemd |
| gdi-backend (systemd) | 🔴 Crash-looping (restart #58+) | Port conflict with orphan |
| gdi-workers | ⚠️ Running but cycling | HF_TOKEN errors, ~5s restart loops |
| Redis | ✅ Connected | Workers confirm connection |
| HEKTOR | 🟠 Offline | Socket exists, daemon not running |
| JWT Auth | ✅ Working | Token generation confirmed |
| Intel Stream | ✅ Flowing | FININT producing crypto snapshots |
| OSINT | ✅ Active | 5 sources, processing headlines |
| GEOINT | ✅ Active | Skyfield loaded, orbital mechanics available |
| FININT | ⚠️ Degraded | Binance only — AlphaVantage/FRED/NewsAPI keys missing |
| SPACETRACK | ✅ Syncing | 31,597 objects, last sync 01:29 today |
| Space-Track TLE | ⚠️ Partial | active.tle stale (Mar 1), catalog current (Mar 6) |
| Spatial Index | 🔴 Empty | 0 entities — workers not populating spatial index |
| Firewall | 🔴 OPEN | ufw disabled, iptables ACCEPT all |
| TLS/HTTPS | 🔴 None | HTTP only |
| Default admin password | 🔴 ACTIVE | admin/valkyrie — MUST CHANGE |
| gdi-discord | ⚠️ Dormant | Needs DISCORD_BOT_TOKEN |
| LLM inference | 🔴 Disabled | HF_TOKEN not set |

---

*Post-Deployment POA — GDI v0.2.0 "Sovereign Eye"*  
*Artifact Virtual © 2026 — Internal Document*
