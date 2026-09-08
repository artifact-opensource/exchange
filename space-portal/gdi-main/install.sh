#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════
#  GDI — Global Defense Intelligence
#  Installation Script
#  © 2026 Artifact Virtual — All rights reserved
# ═══════════════════════════════════════════════════════════════
#
#  Sets up the Python environment, dependencies, directories,
#  and configuration for a local or production GDI deployment.
#
#  Usage:
#    chmod +x install.sh
#    ./install.sh                    # Full install
#    ./install.sh --skip-optional    # Skip optional packages
#    ./install.sh --help             # Show help
#
# ═══════════════════════════════════════════════════════════════

set -euo pipefail

# ── Resolve project root (where this script lives) ───────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$SCRIPT_DIR"
VENV_DIR="$PROJECT_DIR/.venv"
REQUIREMENTS="$PROJECT_DIR/backend/requirements.txt"
ENV_FILE="$PROJECT_DIR/.env"
ENV_EXAMPLE="$PROJECT_DIR/.env.example"

# ── Options ───────────────────────────────────────────────────
SKIP_OPTIONAL=false

for arg in "$@"; do
    case "$arg" in
        --skip-optional) SKIP_OPTIONAL=true ;;
        --help|-h)
            echo "GDI Install Script"
            echo ""
            echo "Usage: ./install.sh [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --skip-optional    Skip optional packages (py-cord, skyfield)"
            echo "  --help, -h         Show this help message"
            exit 0
            ;;
        *)
            echo "Unknown option: $arg"
            echo "Run ./install.sh --help for usage"
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

# ── Summary tracking ─────────────────────────────────────────
SUMMARY_OK=()
SUMMARY_WARN=()
SUMMARY_FAIL=()

track_ok()   { SUMMARY_OK+=("$1"); }
track_warn() { SUMMARY_WARN+=("$1"); }
track_fail() { SUMMARY_FAIL+=("$1"); }

# ── Banner ────────────────────────────────────────────────────
echo -e "${CYAN}"
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║          GDI — GLOBAL DEFENSE INTELLIGENCE               ║"
echo "║              Installation Script                          ║"
echo "║              Artifact Virtual © 2026                      ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# ═════════════════════════════════════════════════════════════
#  1. Check Python 3.11+
# ═════════════════════════════════════════════════════════════
step "1/7" "Checking Python version..."

PYTHON_CMD=""
for candidate in python3.13 python3.12 python3.11 python3; do
    if command -v "$candidate" &>/dev/null; then
        PY_VERSION=$("$candidate" -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')" 2>/dev/null || echo "0.0")
        PY_MAJOR=$("$candidate" -c "import sys; print(sys.version_info.major)" 2>/dev/null || echo "0")
        PY_MINOR=$("$candidate" -c "import sys; print(sys.version_info.minor)" 2>/dev/null || echo "0")
        if [ "$PY_MAJOR" -ge 3 ] && [ "$PY_MINOR" -ge 11 ]; then
            PYTHON_CMD="$candidate"
            break
        fi
    fi
done

if [ -z "$PYTHON_CMD" ]; then
    fail "Python 3.11+ is required but not found"
    echo ""
    echo "  Install Python 3.11+ via:"
    echo "    sudo apt install python3.11 python3.11-venv   # Ubuntu/Debian"
    echo "    sudo dnf install python3.11                    # Fedora"
    echo "    brew install python@3.11                       # macOS"
    exit 1
fi

PY_FULL_VERSION=$("$PYTHON_CMD" --version 2>&1)
info "$PY_FULL_VERSION found at $(which "$PYTHON_CMD")"
track_ok "Python: $PY_FULL_VERSION"

# ═════════════════════════════════════════════════════════════
#  2. Create virtual environment
# ═════════════════════════════════════════════════════════════
step "2/7" "Setting up Python virtual environment..."

if [ -d "$VENV_DIR" ]; then
    info "Virtual environment already exists at .venv/"
    # Verify it's usable
    if [ ! -x "$VENV_DIR/bin/python" ]; then
        warn "Existing .venv appears corrupted — recreating..."
        rm -rf "$VENV_DIR"
        "$PYTHON_CMD" -m venv "$VENV_DIR"
        info "Virtual environment recreated"
    fi
else
    # Check for venv module
    if ! "$PYTHON_CMD" -m venv --help &>/dev/null; then
        fail "Python venv module not available"
        echo "  Install it: sudo apt install python3-venv"
        exit 1
    fi
    "$PYTHON_CMD" -m venv "$VENV_DIR"
    info "Virtual environment created at .venv/"
fi

# Activate for the rest of the script
source "$VENV_DIR/bin/activate"

# Upgrade pip silently
pip install --upgrade pip setuptools wheel -q 2>/dev/null
info "pip upgraded to $(pip --version | awk '{print $2}')"
track_ok "Virtual environment: .venv/"

# ═════════════════════════════════════════════════════════════
#  3. Install core dependencies
# ═════════════════════════════════════════════════════════════
step "3/7" "Installing core dependencies..."

if [ ! -f "$REQUIREMENTS" ]; then
    fail "backend/requirements.txt not found!"
    echo "  Expected at: $REQUIREMENTS"
    exit 1
fi

pip install -r "$REQUIREMENTS" -q 2>&1 | tail -1 || true

# Verify critical imports
MISSING=()
for pkg in fastapi uvicorn aiohttp jose redis pydantic dotenv; do
    MODULE="$pkg"
    [ "$pkg" = "jose" ] && MODULE="jose"
    [ "$pkg" = "dotenv" ] && MODULE="dotenv"
    if ! python -c "import $MODULE" 2>/dev/null; then
        MISSING+=("$pkg")
    fi
done

if [ ${#MISSING[@]} -eq 0 ]; then
    info "All core dependencies installed"
    track_ok "Core dependencies: installed"
else
    warn "Missing packages: ${MISSING[*]}"
    track_warn "Some core packages failed to install: ${MISSING[*]}"
fi

# ═════════════════════════════════════════════════════════════
#  4. Install optional packages
# ═════════════════════════════════════════════════════════════
step "4/7" "Installing optional packages..."

if [ "$SKIP_OPTIONAL" = true ]; then
    warn "Skipped (--skip-optional flag)"
    track_warn "Optional packages: skipped"
else
    # Discord bot support
    if pip install py-cord -q 2>/dev/null; then
        info "py-cord (Discord bot) installed"
        track_ok "Optional: py-cord (Discord)"
    else
        warn "py-cord failed to install — Discord bot will be unavailable"
        track_warn "Optional: py-cord failed"
    fi

    # GEOINT / satellite tracking
    if pip install skyfield sgp4 -q 2>/dev/null; then
        info "skyfield + sgp4 (GEOINT/satellite tracking) installed"
        track_ok "Optional: skyfield + sgp4 (GEOINT)"
    else
        warn "skyfield/sgp4 failed — satellite tracking will use basic mode"
        track_warn "Optional: skyfield/sgp4 failed"
    fi

    # feedparser for OSINT RSS feeds
    if pip install feedparser -q 2>/dev/null; then
        info "feedparser (OSINT RSS) installed"
        track_ok "Optional: feedparser (OSINT)"
    else
        warn "feedparser failed — RSS feed ingestion unavailable"
        track_warn "Optional: feedparser failed"
    fi
fi

# ═════════════════════════════════════════════════════════════
#  5. Check Redis
# ═════════════════════════════════════════════════════════════
step "5/7" "Checking Redis..."

if command -v redis-cli &>/dev/null; then
    if redis-cli ping 2>/dev/null | grep -q PONG; then
        REDIS_VERSION=$(redis-cli INFO server 2>/dev/null | grep redis_version | cut -d: -f2 | tr -d '\r')
        info "Redis $REDIS_VERSION is running"
        track_ok "Redis: v$REDIS_VERSION (running)"
    else
        warn "Redis is installed but not running"
        echo "    Start with: sudo systemctl start redis-server"
        echo "    GDI will run in degraded mode without Redis (file-based caching)"
        track_warn "Redis: installed but not running"
    fi
else
    warn "Redis not installed — GDI will use file-based caching"
    echo "    Install: sudo apt install redis-server"
    track_warn "Redis: not installed (file cache fallback)"
fi

# ═════════════════════════════════════════════════════════════
#  6. Create data directories
# ═════════════════════════════════════════════════════════════
step "6/7" "Creating data directories..."

DIRS=(
    "$PROJECT_DIR/data/cache"
    "$PROJECT_DIR/data/tle_cache"
    "$PROJECT_DIR/data/recordings"
    "$PROJECT_DIR/data/spectrograms"
    "$PROJECT_DIR/data/candidates"
    "$PROJECT_DIR/logs"
)

for dir in "${DIRS[@]}"; do
    mkdir -p "$dir"
done

info "Created $(echo "${DIRS[@]}" | wc -w) data directories"
track_ok "Data directories: created"

# ═════════════════════════════════════════════════════════════
#  7. Generate .env configuration
# ═════════════════════════════════════════════════════════════
step "7/7" "Configuring environment..."

if [ -f "$ENV_FILE" ]; then
    info ".env already exists — preserving existing configuration"
    track_ok "Configuration: .env exists"
else
    if [ -f "$ENV_EXAMPLE" ]; then
        cp "$ENV_EXAMPLE" "$ENV_FILE"
        info ".env generated from .env.example"
    else
        warn ".env.example not found — creating minimal .env"
        cat > "$ENV_FILE" <<'ENVEOF'
# GDI Environment Configuration
# See .env.example for all available options
GDI_API_HOST=0.0.0.0
GDI_API_PORT=8600
GDI_DEBUG=false
GDI_LOG_LEVEL=INFO
GDI_JWT_SECRET=
REDIS_URL=redis://localhost:6379
ENVEOF
    fi
    track_ok "Configuration: .env created"
fi

# Auto-generate JWT secret if missing
JWT_LINE=$(grep "^GDI_JWT_SECRET=" "$ENV_FILE" 2>/dev/null || echo "")
if [ -z "$JWT_LINE" ] || [ "$JWT_LINE" = "GDI_JWT_SECRET=" ]; then
    JWT_SECRET=$(python -c "import secrets; print(secrets.token_urlsafe(48))")
    if grep -q "^GDI_JWT_SECRET=" "$ENV_FILE"; then
        sed -i "s|^GDI_JWT_SECRET=.*|GDI_JWT_SECRET=$JWT_SECRET|" "$ENV_FILE"
    else
        echo "GDI_JWT_SECRET=$JWT_SECRET" >> "$ENV_FILE"
    fi
    info "JWT secret auto-generated (64-char token)"
    track_ok "JWT secret: auto-generated"
else
    info "JWT secret already configured"
    track_ok "JWT secret: exists"
fi

# ═════════════════════════════════════════════════════════════
#  Summary
# ═════════════════════════════════════════════════════════════
echo ""
echo -e "${CYAN}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BOLD}  Installation Summary${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════════════${NC}"

for item in "${SUMMARY_OK[@]}"; do
    echo -e "  ${GREEN}✓${NC} $item"
done

for item in "${SUMMARY_WARN[@]}"; do
    echo -e "  ${YELLOW}⚠${NC} $item"
done

if [ ${#SUMMARY_FAIL[@]} -gt 0 ]; then
    for item in "${SUMMARY_FAIL[@]}"; do
        echo -e "  ${RED}✗${NC} $item"
    done
fi

echo ""
echo -e "  ${BOLD}Activate environment:${NC}"
echo -e "    source .venv/bin/activate"
echo ""
echo -e "  ${BOLD}Start GDI:${NC}"
echo -e "    ./gdi-launch.sh start"
echo ""
echo -e "  ${BOLD}Production deploy:${NC}"
echo -e "    sudo ./deploy.sh"
echo ""
echo -e "${CYAN}═══════════════════════════════════════════════════════════${NC}"
echo -e "  Artifact Virtual © 2026 — Global Defense Intelligence"
echo -e "${CYAN}═══════════════════════════════════════════════════════════${NC}"
echo ""
