#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════
#  GDI — Global Defense Intelligence
#  Production Deployment Script
#  © 2026 Artifact Virtual — All rights reserved
# ═══════════════════════════════════════════════════════════════
#
#  Deploys GDI as a production service with systemd + nginx.
#  Must be run as root or with sudo.
#
#  Usage:
#    sudo ./deploy.sh                # Full production deploy
#    sudo ./deploy.sh --uninstall    # Remove services
#    sudo ./deploy.sh --status       # Check service status
#    sudo ./deploy.sh --no-nginx     # Skip nginx config
#
# ═══════════════════════════════════════════════════════════════

set -euo pipefail

# ── Resolve paths ─────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$SCRIPT_DIR"
VENV_DIR="$PROJECT_DIR/.venv"
ENV_FILE="$PROJECT_DIR/.env"

# ── Options ───────────────────────────────────────────────────
ACTION="deploy"
SKIP_NGINX=false

for arg in "$@"; do
    case "$arg" in
        --uninstall)  ACTION="uninstall" ;;
        --status)     ACTION="status" ;;
        --no-nginx)   SKIP_NGINX=true ;;
        --help|-h)
            echo "GDI Production Deploy Script"
            echo ""
            echo "Usage: sudo ./deploy.sh [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --uninstall    Remove systemd services and nginx config"
            echo "  --status       Show status of all GDI services"
            echo "  --no-nginx     Skip nginx reverse proxy setup"
            echo "  --help, -h     Show this help message"
            exit 0
            ;;
        *)
            echo "Unknown option: $arg"
            exit 1
            ;;
    esac
done

# ── Colors ────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

info()  { echo -e "  ${GREEN}✓${NC} $1"; }
warn()  { echo -e "  ${YELLOW}⚠${NC} $1"; }
fail()  { echo -e "  ${RED}✗${NC} $1"; }
step()  { echo -e "\n${CYAN}${BOLD}[$1]${NC} $2"; }

banner() {
    echo -e "${CYAN}"
    echo "╔═══════════════════════════════════════════════════════════╗"
    echo "║          GDI — GLOBAL DEFENSE INTELLIGENCE               ║"
    echo "║              Production Deployment                        ║"
    echo "║              Artifact Virtual © 2026                      ║"
    echo "╚═══════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

# ── Detect runtime user (the owner of the project dir) ───────
PROJECT_OWNER=$(stat -c '%U' "$PROJECT_DIR")
PROJECT_GROUP=$(stat -c '%G' "$PROJECT_DIR")

# ── Root check ────────────────────────────────────────────────
check_root() {
    if [ "$(id -u)" -ne 0 ]; then
        fail "This script must be run as root (sudo ./deploy.sh)"
        exit 1
    fi
}

# ═════════════════════════════════════════════════════════════
#  STATUS
# ═════════════════════════════════════════════════════════════
if [ "$ACTION" = "status" ]; then
    banner
    echo -e "${BOLD}  Service Status:${NC}"
    echo ""
    for svc in gdi-backend gdi-workers gdi-discord; do
        printf "  %-20s " "$svc"
        if systemctl is-active --quiet "$svc" 2>/dev/null; then
            echo -e "${GREEN}● active${NC}"
        elif systemctl is-enabled --quiet "$svc" 2>/dev/null; then
            echo -e "${YELLOW}○ enabled but stopped${NC}"
        elif [ -f "/etc/systemd/system/${svc}.service" ]; then
            echo -e "${RED}● installed but inactive${NC}"
        else
            echo -e "${RED}— not installed${NC}"
        fi
    done
    echo ""

    printf "  %-20s " "nginx"
    if systemctl is-active --quiet nginx 2>/dev/null; then
        echo -e "${GREEN}● active${NC}"
    else
        echo -e "${YELLOW}○ not running${NC}"
    fi

    printf "  %-20s " "redis"
    if redis-cli ping 2>/dev/null | grep -q PONG; then
        echo -e "${GREEN}● active${NC}"
    else
        echo -e "${YELLOW}○ not running${NC}"
    fi
    echo ""

    # Health check
    PORT=$(grep "^GDI_API_PORT=" "$ENV_FILE" 2>/dev/null | cut -d= -f2 || echo "8600")
    PORT="${PORT:-8600}"
    printf "  %-20s " "API health"
    if curl -sf "http://localhost:${PORT}/api/status" >/dev/null 2>&1; then
        echo -e "${GREEN}● responding${NC}"
    else
        echo -e "${RED}● not responding${NC}"
    fi
    echo ""
    exit 0
fi

# ═════════════════════════════════════════════════════════════
#  UNINSTALL
# ═════════════════════════════════════════════════════════════
if [ "$ACTION" = "uninstall" ]; then
    check_root
    banner
    echo -e "${YELLOW}Removing GDI production services...${NC}"
    echo ""

    for svc in gdi-backend gdi-workers gdi-discord; do
        if [ -f "/etc/systemd/system/${svc}.service" ]; then
            systemctl stop "$svc" 2>/dev/null || true
            systemctl disable "$svc" 2>/dev/null || true
            rm -f "/etc/systemd/system/${svc}.service"
            info "Removed $svc"
        fi
    done

    if [ -f "/etc/nginx/sites-enabled/gdi" ]; then
        rm -f "/etc/nginx/sites-enabled/gdi"
        rm -f "/etc/nginx/sites-available/gdi"
        systemctl reload nginx 2>/dev/null || true
        info "Removed nginx config"
    fi

    systemctl daemon-reload
    info "systemd reloaded"
    echo ""
    info "GDI services removed. Project files are untouched."
    echo ""
    exit 0
fi

# ═════════════════════════════════════════════════════════════
#  DEPLOY
# ═════════════════════════════════════════════════════════════
check_root
banner

# ── Step 1: Ensure install.sh has been run ────────────────────
step "1/5" "Checking installation..."

if [ ! -d "$VENV_DIR" ]; then
    warn "Virtual environment not found — running install.sh first..."
    echo ""
    if [ -x "$PROJECT_DIR/install.sh" ]; then
        bash "$PROJECT_DIR/install.sh"
    else
        chmod +x "$PROJECT_DIR/install.sh"
        bash "$PROJECT_DIR/install.sh"
    fi
    echo ""
fi

if [ ! -f "$ENV_FILE" ]; then
    fail ".env not found. Run ./install.sh first."
    exit 1
fi

# Load env for port/host config
set -a
source "$ENV_FILE"
set +a

API_PORT="${GDI_API_PORT:-8600}"
API_HOST="${GDI_API_HOST:-0.0.0.0}"

info "Installation verified"
info "API will run on port $API_PORT"

# ── Step 2: Create systemd service files ──────────────────────
step "2/5" "Creating systemd service files..."

# --- gdi-backend.service ---
cat > /etc/systemd/system/gdi-backend.service <<EOF
[Unit]
Description=GDI Backend — Global Defense Intelligence API
Documentation=https://github.com/ArtifactVirtual/gdi
After=network.target redis-server.service
Wants=redis-server.service

[Service]
Type=exec
User=$PROJECT_OWNER
Group=$PROJECT_GROUP
WorkingDirectory=$PROJECT_DIR/backend
EnvironmentFile=$ENV_FILE
ExecStart=$VENV_DIR/bin/uvicorn server:app \\
    --host $API_HOST \\
    --port $API_PORT \\
    --workers 2 \\
    --log-level info \\
    --access-log
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal
SyslogIdentifier=gdi-backend

# Security hardening
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=read-only
ReadWritePaths=$PROJECT_DIR/data $PROJECT_DIR/logs
PrivateTmp=true

[Install]
WantedBy=multi-user.target
EOF
info "gdi-backend.service created"

# --- gdi-workers.service ---
cat > /etc/systemd/system/gdi-workers.service <<EOF
[Unit]
Description=GDI Workers — Intelligence Collection Daemons
Documentation=https://github.com/ArtifactVirtual/gdi
After=network.target redis-server.service gdi-backend.service
Wants=redis-server.service
Requires=gdi-backend.service

[Service]
Type=exec
User=$PROJECT_OWNER
Group=$PROJECT_GROUP
WorkingDirectory=$PROJECT_DIR/backend
EnvironmentFile=$ENV_FILE
ExecStart=$VENV_DIR/bin/python -m workers.orchestrator
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=gdi-workers

# Security hardening
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=read-only
ReadWritePaths=$PROJECT_DIR/data $PROJECT_DIR/logs
PrivateTmp=true

[Install]
WantedBy=multi-user.target
EOF
info "gdi-workers.service created"

# --- gdi-discord.service (optional) ---
cat > /etc/systemd/system/gdi-discord.service <<EOF
[Unit]
Description=GDI Discord Bot — Alert & Command Interface
Documentation=https://github.com/ArtifactVirtual/gdi
After=network.target gdi-backend.service
Wants=gdi-backend.service

[Service]
Type=exec
User=$PROJECT_OWNER
Group=$PROJECT_GROUP
WorkingDirectory=$PROJECT_DIR
EnvironmentFile=$ENV_FILE
ExecStart=$VENV_DIR/bin/python -m agent.discord_bot
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=gdi-discord

# Security hardening
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=read-only
ReadWritePaths=$PROJECT_DIR/data $PROJECT_DIR/logs
PrivateTmp=true

[Install]
WantedBy=multi-user.target
EOF
info "gdi-discord.service created (optional — enable manually)"

# ── Step 3: Enable and start services ────────────────────────
step "3/5" "Enabling services..."

systemctl daemon-reload

# Always enable backend + workers
for svc in gdi-backend gdi-workers; do
    systemctl enable "$svc" --quiet
    systemctl restart "$svc"
    info "$svc enabled and started"
done

# Discord bot is opt-in — don't enable unless DISCORD_BOT_TOKEN is set
if [ -n "${DISCORD_BOT_TOKEN:-}" ]; then
    systemctl enable gdi-discord --quiet
    systemctl restart gdi-discord
    info "gdi-discord enabled (token found)"
else
    warn "gdi-discord NOT enabled — set DISCORD_BOT_TOKEN in .env to activate"
    echo "    Then run: sudo systemctl enable --now gdi-discord"
fi

# ── Step 4: Nginx reverse proxy ──────────────────────────────
step "4/5" "Setting up nginx reverse proxy..."

if [ "$SKIP_NGINX" = true ]; then
    warn "Skipped (--no-nginx flag)"
elif ! command -v nginx &>/dev/null; then
    warn "nginx not installed — skipping reverse proxy"
    echo "    Install: sudo apt install nginx"
    echo "    Then re-run: sudo ./deploy.sh"
else
    cat > /etc/nginx/sites-available/gdi <<EOF
# ═══════════════════════════════════════════════════════════════
#  GDI — Nginx Reverse Proxy
#  Generated by deploy.sh — Artifact Virtual © 2026
# ═══════════════════════════════════════════════════════════════

server {
    listen 80;
    server_name gdi.local _;    # Change to your domain

    # Logging
    access_log /var/log/nginx/gdi-access.log;
    error_log  /var/log/nginx/gdi-error.log;

    # Max upload size (for data ingestion)
    client_max_body_size 50M;

    # API + WebSocket proxy
    location / {
        proxy_pass http://127.0.0.1:${API_PORT};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;

        # WebSocket timeouts
        proxy_read_timeout 86400;
        proxy_send_timeout 86400;
    }

    # Static assets (Cesium, JS, CSS)
    location /lib/ {
        alias ${PROJECT_DIR}/lib/;
        expires 7d;
        add_header Cache-Control "public, immutable";
    }

    # Health check endpoint
    location /health {
        proxy_pass http://127.0.0.1:${API_PORT}/api/status;
        access_log off;
    }
}

# ── HTTPS (uncomment and configure with your cert) ───────────
# server {
#     listen 443 ssl http2;
#     server_name gdi.yourdomain.com;
#
#     ssl_certificate     /etc/letsencrypt/live/gdi.yourdomain.com/fullchain.pem;
#     ssl_certificate_key /etc/letsencrypt/live/gdi.yourdomain.com/privkey.pem;
#
#     # ... same location blocks as above ...
# }
EOF

    # Enable the site
    ln -sf /etc/nginx/sites-available/gdi /etc/nginx/sites-enabled/gdi

    # Test config
    if nginx -t 2>/dev/null; then
        systemctl reload nginx
        info "nginx configured and reloaded"
    else
        fail "nginx config test failed — check /etc/nginx/sites-available/gdi"
        rm -f /etc/nginx/sites-enabled/gdi
    fi
fi

# ── Step 5: Health checks ─────────────────────────────────────
step "5/5" "Running health checks..."

# Wait for backend to be ready
echo -ne "  Waiting for backend..."
HEALTHY=false
for i in $(seq 1 20); do
    if curl -sf "http://localhost:${API_PORT}/api/status" >/dev/null 2>&1; then
        HEALTHY=true
        break
    fi
    echo -n "."
    sleep 1
done
echo ""

if [ "$HEALTHY" = true ]; then
    info "Backend is healthy (port $API_PORT)"
else
    warn "Backend not responding yet — check: journalctl -u gdi-backend -f"
fi

# Check workers
sleep 2
if systemctl is-active --quiet gdi-workers; then
    info "Workers are running"
else
    warn "Workers may still be starting — check: journalctl -u gdi-workers -f"
fi

# ═════════════════════════════════════════════════════════════
#  Deploy Summary
# ═════════════════════════════════════════════════════════════
echo ""
echo -e "${CYAN}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BOLD}  GDI Production Deployment Complete${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "  ${BOLD}Services:${NC}"
echo -e "    gdi-backend     $(systemctl is-active gdi-backend 2>/dev/null || echo 'unknown')"
echo -e "    gdi-workers     $(systemctl is-active gdi-workers 2>/dev/null || echo 'unknown')"
echo -e "    gdi-discord     $(systemctl is-active gdi-discord 2>/dev/null || echo 'not started')"
echo ""
echo -e "  ${BOLD}Access:${NC}"
echo -e "    Local:       ${CYAN}http://localhost:${API_PORT}${NC}"
if [ "$SKIP_NGINX" != true ] && command -v nginx &>/dev/null; then
echo -e "    Via nginx:   ${CYAN}http://$(hostname -f 2>/dev/null || echo 'localhost')${NC}"
fi
echo -e "    API status:  ${CYAN}http://localhost:${API_PORT}/api/status${NC}"
echo ""
echo -e "  ${BOLD}Management:${NC}"
echo -e "    sudo systemctl {start|stop|restart|status} gdi-backend"
echo -e "    sudo systemctl {start|stop|restart|status} gdi-workers"
echo -e "    journalctl -u gdi-backend -f          # Live logs"
echo -e "    journalctl -u gdi-workers -f          # Worker logs"
echo -e "    sudo ./deploy.sh --status             # Quick status check"
echo -e "    sudo ./deploy.sh --uninstall          # Remove services"
echo ""
echo -e "${CYAN}═══════════════════════════════════════════════════════════${NC}"
echo -e "  Artifact Virtual © 2026 — Global Defense Intelligence"
echo -e "${CYAN}═══════════════════════════════════════════════════════════${NC}"
echo ""
