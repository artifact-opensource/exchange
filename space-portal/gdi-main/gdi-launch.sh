#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════
#  GDI — Global Defense Intelligence Launch Script
#  Starts all required services and opens the GDI interface
#  Artifact Virtual © 2026
# ═══════════════════════════════════════════════════════════════

set -euo pipefail

GDI_DIR="/home/adam/workspace/enterprise/projects/gdi"
ENV_FILE="$GDI_DIR/.env"
LOG_DIR="$GDI_DIR/logs"
BACKEND_LOG="$LOG_DIR/backend.log"
PID_FILE="$LOG_DIR/gdi.pid"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

banner() {
    echo -e "${CYAN}"
    echo "╔═══════════════════════════════════════════════════════════╗"
    echo "║          GDI — GLOBAL DEFENSE INTELLIGENCE               ║"
    echo "║              Valkyrie L5 • SATx Pipeline                  ║"
    echo "║              Artifact Virtual © 2026                      ║"
    echo "╚═══════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

info()  { echo -e "  ${GREEN}✓${NC} $1"; }
warn()  { echo -e "  ${YELLOW}⚠${NC} $1"; }
fail()  { echo -e "  ${RED}✗${NC} $1"; }
check() { echo -ne "  ${CYAN}◉${NC} $1... "; }

mkdir -p "$LOG_DIR"

# ── Load environment ──────────────────────────────────────────
if [ -f "$ENV_FILE" ]; then
    set -a
    source "$ENV_FILE"
    set +a
fi

# ── Command dispatcher ────────────────────────────────────────
case "${1:-start}" in
    start)
        banner

        # Check PostgreSQL
        check "PostgreSQL"
        if sudo systemctl is-active --quiet postgresql 2>/dev/null; then
            echo -e "${GREEN}active${NC}"
        else
            echo -e "${YELLOW}starting...${NC}"
            sudo systemctl start postgresql 2>/dev/null || {
                fail "PostgreSQL failed to start"
                exit 1
            }
            info "PostgreSQL started"
        fi

        # Check SurrealDB
        check "SurrealDB"
        if sudo systemctl is-active --quiet surrealdb 2>/dev/null; then
            echo -e "${GREEN}active${NC}"
        elif curl -sf http://localhost:8000/health > /dev/null 2>&1; then
            echo -e "${GREEN}active (standalone)${NC}"
        else
            echo -e "${YELLOW}starting...${NC}"
            sudo systemctl start surrealdb 2>/dev/null || {
                warn "SurrealDB systemd service not found. Starting manually..."
                SURREAL_BIN=$(which surreal 2>/dev/null || echo "$HOME/.surrealdb/surreal")
                if [ -x "$SURREAL_BIN" ]; then
                    nohup "$SURREAL_BIN" start \
                        --log info \
                        --user "${SURREAL_USER:-root}" \
                        --pass "${SURREAL_PASS:-gdi_surreal_2026}" \
                        --bind 0.0.0.0:8000 \
                        "file:/opt/satx/surrealdb" \
                        > "$LOG_DIR/surrealdb.log" 2>&1 &
                    echo $! > "$LOG_DIR/surrealdb.pid"
                    sleep 2
                    if curl -sf http://localhost:8000/health > /dev/null 2>&1; then
                        info "SurrealDB started (PID $(cat $LOG_DIR/surrealdb.pid))"
                    else
                        warn "SurrealDB may still be initializing"
                    fi
                else
                    warn "SurrealDB binary not found — skipping"
                fi
            }
        fi

        # Check Redis (optional)
        check "Redis"
        if redis-cli ping 2>/dev/null | grep -q PONG; then
            echo -e "${GREEN}active${NC}"
        else
            echo -e "${YELLOW}unavailable (degraded mode)${NC}"
        fi

        # Verify DB exists
        check "Database gdi_satx"
        if sudo -u postgres psql -lqt 2>/dev/null | cut -d \| -f 1 | grep -qw gdi_satx; then
            echo -e "${GREEN}exists${NC}"
        else
            echo -e "${YELLOW}creating...${NC}"
            sudo -u postgres psql -c "CREATE DATABASE gdi_satx;" 2>/dev/null || true
            sudo -u postgres psql -d gdi_satx -c "CREATE EXTENSION IF NOT EXISTS postgis;" 2>/dev/null || true
            info "Database created"
        fi

        # Install Python deps if needed
        check "Python dependencies"
        cd "$GDI_DIR/backend"
        if python3 -c "import fastapi, uvicorn, jose, aiohttp" 2>/dev/null; then
            echo -e "${GREEN}installed${NC}"
        else
            echo -e "${YELLOW}installing...${NC}"
            pip3 install -q -r requirements.txt 2>/dev/null
            info "Dependencies installed"
        fi

        # Kill any existing GDI backend
        if [ -f "$PID_FILE" ]; then
            OLD_PID=$(cat "$PID_FILE")
            if kill -0 "$OLD_PID" 2>/dev/null; then
                kill "$OLD_PID" 2>/dev/null
                sleep 1
                info "Stopped previous GDI backend (PID $OLD_PID)"
            fi
        fi

        # Also kill any existing process on port 8600
        EXISTING=$(lsof -ti:8600 2>/dev/null || true)
        if [ -n "$EXISTING" ]; then
            kill $EXISTING 2>/dev/null || true
            sleep 1
        fi

        # Start GDI backend
        check "GDI Backend (port ${GDI_API_PORT:-8600})"
        cd "$GDI_DIR/backend"
        nohup python3 server.py > "$BACKEND_LOG" 2>&1 &
        BACKEND_PID=$!
        echo "$BACKEND_PID" > "$PID_FILE"

        # Wait for backend
        for i in $(seq 1 15); do
            if curl -sf "http://localhost:${GDI_API_PORT:-8600}/api/status" > /dev/null 2>&1; then
                echo -e "${GREEN}active (PID $BACKEND_PID)${NC}"
                break
            fi
            sleep 1
            if [ "$i" -eq 15 ]; then
                echo -e "${YELLOW}starting (PID $BACKEND_PID)${NC}"
                warn "Backend may still be initializing. Check: tail -f $BACKEND_LOG"
            fi
        done

        # Start Sovereign (GDI resilience layer) if not running
        check "Sovereign"
        if command -v sovereign &>/dev/null && sovereign status 2>/dev/null | grep -q '"daemon_running": true'; then
            echo -e "${GREEN}active${NC}"
        else
            echo -e "${YELLOW}skipped${NC}"
        fi

        echo ""
        echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
        echo -e "  GDI is ${GREEN}ONLINE${NC}"
        echo -e "  Frontend: ${CYAN}http://localhost:${GDI_API_PORT:-8600}${NC}"
        echo -e "  API:      ${CYAN}http://localhost:${GDI_API_PORT:-8600}/api/status${NC}"
        echo -e "  Login:    admin / valkyrie"
        echo -e "  Logs:     ${YELLOW}$BACKEND_LOG${NC}"
        echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
        echo ""

        # Open in browser if display available
        if [ -n "${DISPLAY:-}" ] || [ -n "${WAYLAND_DISPLAY:-}" ]; then
            sleep 1
            xdg-open "http://localhost:${GDI_API_PORT:-8600}" 2>/dev/null &
        fi
        ;;

    stop)
        echo -e "${CYAN}Stopping GDI...${NC}"
        if [ -f "$PID_FILE" ]; then
            PID=$(cat "$PID_FILE")
            if kill -0 "$PID" 2>/dev/null; then
                kill "$PID"
                info "Backend stopped (PID $PID)"
            fi
            rm -f "$PID_FILE"
        fi
        # Kill anything on 8600
        EXISTING=$(lsof -ti:8600 2>/dev/null || true)
        if [ -n "$EXISTING" ]; then
            kill $EXISTING 2>/dev/null || true
            info "Port 8600 cleared"
        fi
        info "GDI stopped"
        ;;

    restart)
        "$0" stop
        sleep 2
        "$0" start
        ;;

    status)
        banner
        check "PostgreSQL"
        sudo systemctl is-active --quiet postgresql 2>/dev/null && echo -e "${GREEN}active${NC}" || echo -e "${RED}inactive${NC}"

        check "SurrealDB"
        (sudo systemctl is-active --quiet surrealdb 2>/dev/null || curl -sf http://localhost:8000/health > /dev/null 2>&1) && echo -e "${GREEN}active${NC}" || echo -e "${RED}inactive${NC}"

        check "Redis"
        redis-cli ping 2>/dev/null | grep -q PONG && echo -e "${GREEN}active${NC}" || echo -e "${YELLOW}unavailable${NC}"

        check "GDI Backend"
        curl -sf "http://localhost:${GDI_API_PORT:-8600}/api/status" > /dev/null 2>&1 && echo -e "${GREEN}active${NC}" || echo -e "${RED}inactive${NC}"

        check "Sovereign"
        (command -v sovereign &>/dev/null && sovereign status 2>/dev/null | grep -q '"daemon_running": true') && echo -e "${GREEN}active${NC}" || echo -e "${YELLOW}inactive${NC}"
        echo ""
        ;;

    logs)
        tail -f "$BACKEND_LOG"
        ;;

    *)
        echo "Usage: $0 {start|stop|restart|status|logs}"
        exit 1
        ;;
esac
