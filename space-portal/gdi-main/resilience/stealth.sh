#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════
# GDI STEALTH MODE — stealth.sh
# ═══════════════════════════════════════════════════════════════════
# Blocks all outbound traffic except essential local services.
# REQUIRES: sudo / root
#
# Allowed in stealth:
#   - localhost (127.0.0.1, ::1) — all services
#   - Ollama:     localhost:11434
#   - MQTT:       localhost:1883
#   - Redis:      localhost:6379
#   - PostgreSQL: localhost:5432
#   - Unix domain sockets (IPC)
#
# Blocked:
#   - ALL outbound to non-localhost
#   - DNS queries (port 53)
#   - ALL telemetry, heartbeats, external APIs
#
# Usage:
#   sudo bash stealth.sh enable    — activate stealth
#   sudo bash stealth.sh disable   — deactivate stealth
#   sudo bash stealth.sh status    — check current state
#
# Author: Artifact Virtual
# Created: 2026-03-01 — GDI Resilience Layer
# ═══════════════════════════════════════════════════════════════════

set -euo pipefail

CHAIN_NAME="GDI_STEALTH"
LOG_FILE="/home/adam/workspace/enterprise/projects/gdi/resilience/logs/stealth.log"
MARKER_FILE="/tmp/gdi-stealth-active"

# Ensure log directory exists
mkdir -p "$(dirname "$LOG_FILE")"

log() {
    local msg="[$(date '+%Y-%m-%d %H:%M:%S')] $1"
    echo "$msg" | tee -a "$LOG_FILE"
}

check_root() {
    if [[ $EUID -ne 0 ]]; then
        echo "ERROR: This script must be run as root (sudo)."
        exit 1
    fi
}

enable_stealth() {
    check_root
    log "═══════════════════════════════════════════════════"
    log "ENABLING GDI STEALTH MODE"
    log "═══════════════════════════════════════════════════"

    # Clean up any existing chain first
    disable_stealth_quiet 2>/dev/null || true

    # ── Create custom chain ──────────────────────────────────────
    iptables -N "$CHAIN_NAME" 2>/dev/null || true
    ip6tables -N "$CHAIN_NAME" 2>/dev/null || true

    # ── Allow all loopback traffic ───────────────────────────────
    iptables -A "$CHAIN_NAME" -o lo -j ACCEPT
    ip6tables -A "$CHAIN_NAME" -o lo -j ACCEPT
    log "  ✓ Loopback traffic allowed"

    # ── Allow established/related connections ────────────────────
    # (so existing inbound connections aren't broken)
    iptables -A "$CHAIN_NAME" -m state --state ESTABLISHED,RELATED -j ACCEPT
    ip6tables -A "$CHAIN_NAME" -m state --state ESTABLISHED,RELATED -j ACCEPT
    log "  ✓ Established connections preserved"

    # ── Allow traffic to localhost IPs ───────────────────────────
    iptables -A "$CHAIN_NAME" -d 127.0.0.0/8 -j ACCEPT
    ip6tables -A "$CHAIN_NAME" -d ::1/128 -j ACCEPT
    log "  ✓ Localhost destinations allowed"

    # ── Block DNS (explicit, in case of DNS-over-HTTPS bypass) ──
    iptables -A "$CHAIN_NAME" -p udp --dport 53 -j DROP
    iptables -A "$CHAIN_NAME" -p tcp --dport 53 -j DROP
    ip6tables -A "$CHAIN_NAME" -p udp --dport 53 -j DROP
    ip6tables -A "$CHAIN_NAME" -p tcp --dport 53 -j DROP
    log "  ✓ DNS queries blocked (port 53 UDP/TCP)"

    # ── Block ALL other outbound ─────────────────────────────────
    # Log before dropping so we can see what was blocked
    iptables -A "$CHAIN_NAME" -j LOG --log-prefix "[GDI-STEALTH-BLOCK] " --log-level 4 --log-uid
    ip6tables -A "$CHAIN_NAME" -j LOG --log-prefix "[GDI-STEALTH-BLOCK] " --log-level 4 --log-uid
    log "  ✓ Logging enabled for blocked traffic"

    iptables -A "$CHAIN_NAME" -j DROP
    ip6tables -A "$CHAIN_NAME" -j DROP
    log "  ✓ All non-local outbound traffic DROPPED"

    # ── Insert chain into OUTPUT ─────────────────────────────────
    iptables -I OUTPUT 1 -j "$CHAIN_NAME"
    ip6tables -I OUTPUT 1 -j "$CHAIN_NAME"
    log "  ✓ Chain inserted into OUTPUT"

    # ── Mark as active ───────────────────────────────────────────
    echo "$(date -u '+%Y-%m-%dT%H:%M:%SZ')" > "$MARKER_FILE"

    log ""
    log "STEALTH MODE ACTIVE"
    log "  Allowed: localhost (127.0.0.0/8, ::1)"
    log "  Allowed: ollama(:11434), mqtt(:1883), redis(:6379), pg(:5432)"
    log "  Blocked: EVERYTHING ELSE"
    log "  Logs:    /var/log/kern.log or journalctl (prefix: GDI-STEALTH-BLOCK)"
    log "═══════════════════════════════════════════════════"

    echo "STEALTH MODE ENABLED"
}

disable_stealth_quiet() {
    # Remove chain references from OUTPUT
    while iptables -D OUTPUT -j "$CHAIN_NAME" 2>/dev/null; do :; done
    while ip6tables -D OUTPUT -j "$CHAIN_NAME" 2>/dev/null; do :; done

    # Flush and delete chain
    iptables -F "$CHAIN_NAME" 2>/dev/null || true
    iptables -X "$CHAIN_NAME" 2>/dev/null || true
    ip6tables -F "$CHAIN_NAME" 2>/dev/null || true
    ip6tables -X "$CHAIN_NAME" 2>/dev/null || true

    rm -f "$MARKER_FILE"
}

disable_stealth() {
    check_root
    log "═══════════════════════════════════════════════════"
    log "DISABLING GDI STEALTH MODE"
    log "═══════════════════════════════════════════════════"

    disable_stealth_quiet

    log "  ✓ GDI_STEALTH chain removed from OUTPUT"
    log "  ✓ Chain flushed and deleted"
    log "  ✓ All outbound traffic restored"
    log "═══════════════════════════════════════════════════"

    echo "STEALTH MODE DISABLED — outbound traffic restored"
}

show_status() {
    echo ""
    echo "GDI Stealth Mode Status"
    echo "========================"

    if [[ -f "$MARKER_FILE" ]]; then
        local activated_at
        activated_at=$(cat "$MARKER_FILE")
        echo "  Status:    ACTIVE"
        echo "  Since:     $activated_at"
    else
        echo "  Status:    INACTIVE"
    fi

    echo ""
    echo "iptables rules (GDI_STEALTH chain):"
    if iptables -L "$CHAIN_NAME" -n -v 2>/dev/null; then
        echo ""
    else
        echo "  (chain does not exist)"
    fi

    echo ""
    echo "Recent blocks (last 10):"
    if command -v journalctl &>/dev/null; then
        journalctl -k --no-pager -n 10 --grep="GDI-STEALTH-BLOCK" 2>/dev/null || \
            echo "  (no blocks logged)"
    else
        grep "GDI-STEALTH-BLOCK" /var/log/kern.log 2>/dev/null | tail -10 || \
            echo "  (no blocks logged)"
    fi
}

# ── Main ─────────────────────────────────────────────────────────────

case "${1:-}" in
    enable)
        enable_stealth
        ;;
    disable)
        disable_stealth
        ;;
    status)
        show_status
        ;;
    *)
        echo "Usage: sudo bash $0 {enable|disable|status}"
        exit 1
        ;;
esac
