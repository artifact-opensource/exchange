#!/usr/bin/env python3
"""
SOVEREIGN CLI — GDI Resilience Control
========================================

Usage:
  sovereign start       — Start the daemon (background)
  sovereign stop        — Stop the daemon
  sovereign restart     — Restart the daemon
  sovereign status      — Show current status (JSON)
  sovereign tui         — Launch live terminal dashboard
  sovereign stealth     — Enable stealth firewall (comms preserved)
  sovereign dark        — Go dark (kills ALL connections, requires --force)
  sovereign restore     — Disable firewall, restore normal operation
  sovereign connections — Show Mach6 active connections
  sovereign health      — Quick health check (no daemon needed)
"""

import asyncio
import json
import os
import sys
import signal
import subprocess
import time
from pathlib import Path

# Add sovereign package to path
SOVEREIGN_DIR = Path(__file__).parent
sys.path.insert(0, str(SOVEREIGN_DIR))

STATE_FILE = Path("/tmp/sovereign-state.json")
LOCK_FILE = Path("/tmp/sovereign.lock")
LOG_DIR = SOVEREIGN_DIR / "logs"
LOG_DIR.mkdir(exist_ok=True)


def is_running():
    """Check if daemon is running"""
    if not LOCK_FILE.exists():
        return False, None
    try:
        pid = int(LOCK_FILE.read_text().strip())
        os.kill(pid, 0)
        return True, pid
    except (ValueError, ProcessLookupError, PermissionError):
        LOCK_FILE.unlink(missing_ok=True)
        return False, None


def cmd_start():
    """Start the sovereign daemon in background"""
    running, pid = is_running()
    if running:
        print(f"Daemon already running (PID {pid})")
        return

    log_file = LOG_DIR / f"sovereign-{time.strftime('%Y%m%d')}.log"

    # Start daemon as background process
    proc = subprocess.Popen(
        [sys.executable, str(SOVEREIGN_DIR / "core.py")],
        stdout=open(log_file, "a"),
        stderr=subprocess.STDOUT,
        cwd=str(SOVEREIGN_DIR),
        start_new_session=True,
    )

    time.sleep(1)
    running, pid = is_running()
    if running:
        print(f"✅ Sovereign daemon started (PID {pid})")
        print(f"   Log: {log_file}")
        print(f"   TUI: sovereign tui")
    else:
        print("❌ Daemon failed to start. Check logs.")
        print(f"   Log: {log_file}")


def cmd_stop():
    """Stop the daemon"""
    running, pid = is_running()
    if not running:
        print("Daemon is not running")
        return

    try:
        os.kill(pid, signal.SIGTERM)
        # Wait for clean shutdown
        for _ in range(10):
            time.sleep(0.5)
            try:
                os.kill(pid, 0)
            except ProcessLookupError:
                print(f"✅ Daemon stopped (was PID {pid})")
                LOCK_FILE.unlink(missing_ok=True)
                return
        # Force kill
        os.kill(pid, signal.SIGKILL)
        print(f"⚠️  Daemon force-killed (PID {pid})")
        LOCK_FILE.unlink(missing_ok=True)
    except ProcessLookupError:
        print("Daemon already stopped")
        LOCK_FILE.unlink(missing_ok=True)
    except PermissionError:
        print(f"Permission denied killing PID {pid}. Try: sudo kill {pid}")


def cmd_restart():
    """Restart daemon"""
    running, _ = is_running()
    if running:
        cmd_stop()
        time.sleep(1)
    cmd_start()


def cmd_status():
    """Print current state as JSON"""
    running, pid = is_running()

    if STATE_FILE.exists():
        state = json.loads(STATE_FILE.read_text())
    else:
        state = {}

    state["daemon_running"] = running
    state["daemon_pid"] = pid
    print(json.dumps(state, indent=2))


def cmd_tui():
    """Launch the TUI dashboard"""
    from tui import run_tui
    run_tui()


def cmd_stealth():
    """Enable stealth firewall"""
    from firewall import Firewall

    print("Enabling stealth mode...")
    print("  → Discovering Mach6 connections...")

    fw = Firewall()
    ok, msg = fw.enable_stealth()

    if ok:
        print(f"✅ {msg}")
    else:
        print(f"❌ {msg}")


def cmd_dark():
    """Enable dark mode"""
    if "--force" not in sys.argv:
        print("⚠️  DARK MODE will kill ALL outbound connections.")
        print("   WhatsApp and Discord WILL disconnect.")
        print("   Only Ali can request this.")
        print()
        print("   Run: sovereign dark --force")
        return

    from firewall import Firewall

    print("🌑 Enabling DARK mode...")
    fw = Firewall()
    ok, msg = fw.enable_dark()

    if ok:
        print(f"✅ {msg}")
    else:
        print(f"❌ {msg}")


def cmd_restore():
    """Disable firewall"""
    from firewall import Firewall

    fw = Firewall()
    ok, msg = fw.disable()
    print(f"{'✅' if ok else '❌'} {msg}")


def cmd_connections():
    """Show Mach6 active connections"""
    from firewall import get_mach6_connections, get_mach6_ws_endpoints

    conns = get_mach6_connections()
    endpoints = get_mach6_ws_endpoints()

    print(f"Active Mach6 TCP connections: {len(conns)}")
    for ip, port in conns:
        print(f"  → {ip}:{port}")

    print(f"\nKnown WS endpoints resolved: {len(endpoints)}")
    for ip in endpoints:
        print(f"  → {ip}")


def cmd_health():
    """Quick health check without daemon"""
    import socket

    checks = {
        "Mach6 Gateway": ("systemctl", "is-active", "mach6-gateway"),
        "Ollama": ("curl", "-sf", "http://127.0.0.1:11434/api/tags"),
    }

    tcp_checks = {
        "MQTT": ("127.0.0.1", 1883),
        "PostgreSQL": ("127.0.0.1", 5432),
    }

    for name, cmd in checks.items():
        try:
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=3)
            status = "●" if result.returncode == 0 else "○"
            color = "\033[32m" if result.returncode == 0 else "\033[31m"
            print(f"  {color}{status}\033[0m {name}")
        except Exception:
            print(f"  \033[31m○\033[0m {name}")

    for name, (host, port) in tcp_checks.items():
        try:
            s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            s.settimeout(2)
            s.connect((host, port))
            s.close()
            print(f"  \033[32m●\033[0m {name}")
        except Exception:
            print(f"  \033[31m○\033[0m {name}")

    # Cloud API
    try:
        result = subprocess.run(
            ["curl", "-sf", "-o", "/dev/null", "-w", "%{http_code}", "http://localhost:3000/v1/models"],
            capture_output=True, text=True, timeout=5,
        )
        up = result.stdout.strip() in ("200", "401", "403")
        status = "●" if up else "○"
        color = "\033[32m" if up else "\033[31m"
        print(f"  {color}{status}\033[0m Cloud API")
    except Exception:
        print(f"  \033[31m○\033[0m Cloud API")


COMMANDS = {
    "start": cmd_start,
    "stop": cmd_stop,
    "restart": cmd_restart,
    "status": cmd_status,
    "tui": cmd_tui,
    "stealth": cmd_stealth,
    "dark": cmd_dark,
    "restore": cmd_restore,
    "connections": cmd_connections,
    "health": cmd_health,
}


def main():
    if len(sys.argv) < 2 or sys.argv[1] in ("-h", "--help", "help"):
        print(__doc__)
        return

    cmd = sys.argv[1]
    if cmd in COMMANDS:
        COMMANDS[cmd]()
    else:
        print(f"Unknown command: {cmd}")
        print(f"Available: {', '.join(COMMANDS.keys())}")
        sys.exit(1)


if __name__ == "__main__":
    main()
