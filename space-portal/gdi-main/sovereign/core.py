#!/usr/bin/env python3
"""
SOVEREIGN — GDI Resilience Core
=================================
Health monitoring, mode management, safe transitions with rollback.

Modes:
  CLOUD    — All services up, cloud inference, full comms
  DEGRADED — Cloud down, local inference (Ollama), comms intact
  OFFLINE  — No internet, local everything, comms via IPC/filesystem
  STEALTH  — Firewall blocks non-essential outbound, comms PRESERVED
  DARK     — Everything blocked. Operator's explicit command only.

Safety invariant: COMMS NEVER DIE unless Ali says DARK.
"""

import asyncio
import json
import os
import sys
import signal
import time
import subprocess
import socket
import logging
from pathlib import Path
from datetime import datetime, timezone
from typing import Optional, Dict, Any, Tuple
from dataclasses import dataclass, field, asdict
from enum import Enum

# Load sovereign's own .env (confined to this directory)
try:
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).resolve().parent / ".env")
except ImportError:
    pass  # dotenv optional — falls back to os.getenv defaults

log = logging.getLogger("sovereign")

# ─── Paths ────────────────────────────────────────────────────────
BASE_DIR = Path(__file__).parent
STATE_FILE = Path(os.getenv("SOVEREIGN_STATE_FILE", "/tmp/sovereign-state.json"))
LOCK_FILE = Path(os.getenv("SOVEREIGN_LOCK_FILE", "/tmp/sovereign.lock"))
LOG_DIR = BASE_DIR / "logs"
LOG_DIR.mkdir(exist_ok=True)

# ─── Services to monitor ─────────────────────────────────────────
MACH6_HEALTH = os.getenv("MACH6_HEALTH_URL", "http://localhost:3006/api/v1/health")
MACH6_SERVICE = os.getenv("MACH6_SERVICE_NAME", "mach6-gateway")
OLLAMA_URL = os.getenv("OLLAMA_URL", "http://127.0.0.1:11434")
MQTT_HOST = os.getenv("MQTT_HOST", "127.0.0.1")
MQTT_PORT = int(os.getenv("MQTT_PORT", "1883"))
POSTGRES_HOST = os.getenv("POSTGRES_HOST", "127.0.0.1")
POSTGRES_PORT = int(os.getenv("POSTGRES_PORT", "5432"))
CHECK_INTERVAL = int(os.getenv("SOVEREIGN_CHECK_INTERVAL", "5"))


class Mode(str, Enum):
    CLOUD = "cloud"
    DEGRADED = "degraded"
    OFFLINE = "offline"
    STEALTH = "stealth"
    DARK = "dark"


@dataclass
class ServiceHealth:
    """Health state of all monitored services"""
    mach6_gateway: bool = False
    mach6_whatsapp: bool = False
    mach6_discord: bool = False
    ollama: bool = False
    ollama_model: str = ""
    mqtt: bool = False
    postgresql: bool = False
    cloud_api: bool = False
    timestamp: str = ""

    def to_dict(self) -> dict:
        return asdict(self)


@dataclass
class SovereignState:
    """Full system state — written to STATE_FILE for TUI/CLI consumption"""
    mode: str = "initializing"
    prev_mode: str = ""
    uptime: float = 0
    health: Dict[str, Any] = field(default_factory=dict)
    transitions: list = field(default_factory=list)
    last_check: str = ""
    firewall_active: bool = False
    firewall_level: str = "none"  # none | stealth | dark
    comms_ok: bool = True
    errors: list = field(default_factory=list)
    pid: int = 0

    def to_dict(self) -> dict:
        return asdict(self)


class Sovereign:
    """
    The core daemon. Monitors services, manages modes, ensures comms survive.
    
    Safety rules:
    1. NEVER activate firewall rules that block Mach6 outbound (WhatsApp/Discord WS)
    2. After ANY mode change, verify comms within 15s — rollback if dead
    3. DARK mode requires explicit flag — never auto-entered
    4. All state changes logged and written to STATE_FILE
    """

    def __init__(self):
        self.mode = Mode.CLOUD
        self.prev_mode = Mode.CLOUD
        self.health = ServiceHealth()
        self.start_time = time.time()
        self.transitions: list = []
        self.errors: list = []
        self._running = True
        self._rollback_timer: Optional[asyncio.Task] = None
        self._check_count = 0

    async def start(self):
        """Main entry point"""
        self._setup_logging()
        self._write_lock()

        log.info("═══════════════════════════════════════════")
        log.info("  SOVEREIGN — GDI Resilience Core")
        log.info("═══════════════════════════════════════════")

        for sig in (signal.SIGINT, signal.SIGTERM):
            signal.signal(sig, self._handle_signal)

        # Initial health check
        await self._check_all()
        self._determine_mode()
        log.info(f"Initial mode: {self.mode.value.upper()}")
        self._write_state()

        # Main loop
        while self._running:
            try:
                await self._tick()
            except Exception as e:
                log.error(f"Tick error: {e}")
                self._add_error(str(e))
            await asyncio.sleep(CHECK_INTERVAL)

        self._cleanup()

    async def _tick(self):
        """Single monitoring cycle"""
        await self._check_all()
        self._check_count += 1

        old_mode = self.mode
        self._determine_mode()

        if old_mode != self.mode:
            reason = self._transition_reason(old_mode, self.mode)
            self._record_transition(old_mode, self.mode, reason)
            log.warning(f"MODE: {old_mode.value} → {self.mode.value} ({reason})")

            # Post-transition comms verification
            await self._verify_comms_after_transition(old_mode)

        self._write_state()

    # ─── Health Checks ────────────────────────────────────────────

    async def _check_all(self):
        """Check all services concurrently"""
        self.health.timestamp = datetime.now(timezone.utc).isoformat()

        checks = await asyncio.gather(
            self._check_mach6(),
            self._check_ollama(),
            self._check_tcp(MQTT_HOST, MQTT_PORT),
            self._check_tcp(POSTGRES_HOST, POSTGRES_PORT),
            self._check_cloud_api(),
            return_exceptions=True,
        )

        # Mach6 results
        if isinstance(checks[0], tuple):
            self.health.mach6_gateway, self.health.mach6_whatsapp, self.health.mach6_discord = checks[0]
        else:
            self.health.mach6_gateway = self.health.mach6_whatsapp = self.health.mach6_discord = False

        # Ollama
        if isinstance(checks[1], tuple):
            self.health.ollama, self.health.ollama_model = checks[1]
        else:
            self.health.ollama = False

        # MQTT
        self.health.mqtt = checks[2] if isinstance(checks[2], bool) else False

        # PostgreSQL
        self.health.postgresql = checks[3] if isinstance(checks[3], bool) else False

        # Cloud API
        self.health.cloud_api = checks[4] if isinstance(checks[4], bool) else False

    async def _check_mach6(self) -> Tuple[bool, bool, bool]:
        """Check Mach6 gateway and its channel connections.
        
        Uses three methods in priority order:
        1. API health endpoint (most reliable)
        2. Active TCP connections to known endpoints (ground truth)
        3. Systemd service status (basic alive check)
        """
        gateway_up = False
        wa_up = False
        discord_up = False

        # Method 1: Check systemd service
        try:
            result = subprocess.run(
                ["systemctl", "is-active", MACH6_SERVICE],
                capture_output=True, text=True, timeout=3
            )
            gateway_up = result.stdout.strip() == "active"
        except Exception:
            pass

        if not gateway_up:
            return False, False, False

        # Method 2: Try API health endpoint
        try:
            import urllib.request
            req = urllib.request.Request(MACH6_HEALTH, method='GET')
            with urllib.request.urlopen(req, timeout=3) as resp:
                if resp.status == 200:
                    data = json.loads(resp.read())
                    wa_up = data.get("whatsapp", {}).get("connected", False)
                    discord_up = data.get("discord", {}).get("connected", False)
                    return gateway_up, wa_up, discord_up
        except Exception:
            pass

        # Method 3: Check active TCP connections (ground truth)
        # WhatsApp connects to Meta IPs, Discord to Cloudflare/Discord IPs
        try:
            sys.path.insert(0, str(Path(__file__).parent))
            from firewall import get_mach6_connections

            conns = get_mach6_connections()
            log.info(f"Mach6 connections found: {len(conns)} — {conns}")
            # Known endpoint ranges
            # Discord: 162.159.x.x (Cloudflare)
            # WhatsApp/Meta: Various, but often 157.240.x.x, 31.13.x.x, 2a03:2880::/32
            # GitHub (Copilot): 140.82.x.x
            for ip, port in conns:
                if port == 443:
                    if ip.startswith("162.159.") or ip.startswith("104.16."):
                        discord_up = True
                    elif (ip.startswith("157.240.") or ip.startswith("31.13.") or
                          ip.startswith("2a03:2880") or ip.startswith("179.60.") or
                          "face:b00c" in ip):
                        wa_up = True
                    elif ip.startswith("57.144."):
                        # WhatsApp web endpoints (Microsoft-hosted)
                        wa_up = True

            # If we found connections but couldn't classify them, check if there are
            # non-GitHub connections (those are likely WA or Discord)
            if not wa_up and not discord_up and len(conns) > 0:
                non_github = [(ip, p) for ip, p in conns
                              if not ip.startswith("140.82.") and p == 443]
                if len(non_github) >= 2:
                    # Likely both WA and Discord
                    wa_up = True
                    discord_up = True
                elif len(non_github) == 1:
                    # At least one is up
                    discord_up = True  # More likely Discord (single WS)

        except Exception as e:
            log.warning(f"Mach6 connection detection failed: {e}")

        return gateway_up, wa_up, discord_up

    async def _check_ollama(self) -> Tuple[bool, str]:
        """Check Ollama and return (alive, model_name)"""
        try:
            import urllib.request
            req = urllib.request.Request(f"{OLLAMA_URL}/api/tags", method='GET')
            with urllib.request.urlopen(req, timeout=3) as resp:
                if resp.status == 200:
                    data = json.loads(resp.read())
                    models = [m["name"] for m in data.get("models", [])]
                    if models:
                        return True, models[0]
        except Exception:
            pass
        return False, ""

    async def _check_tcp(self, host: str, port: int) -> bool:
        """Quick TCP port check"""
        try:
            s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            s.settimeout(2)
            s.connect((host, port))
            s.close()
            return True
        except Exception:
            return False

    async def _check_cloud_api(self) -> bool:
        """Check if cloud inference API is reachable (GitHub Copilot proxy)"""
        try:
            import urllib.request
            req = urllib.request.Request("http://localhost:3000/v1/models", method='GET')
            with urllib.request.urlopen(req, timeout=5) as resp:
                return resp.status in (200, 401, 403)
        except Exception:
            return False

    # ─── Mode Management ──────────────────────────────────────────

    def _determine_mode(self):
        """Auto-determine mode based on health. Never auto-enters STEALTH or DARK."""
        if self.mode in (Mode.STEALTH, Mode.DARK):
            # These modes are manually controlled — don't auto-switch out
            return

        if self.health.cloud_api and self.health.mach6_gateway:
            self.mode = Mode.CLOUD
        elif self.health.ollama and self.health.mach6_gateway:
            self.mode = Mode.DEGRADED
        elif self.health.ollama:
            self.mode = Mode.OFFLINE
        else:
            self.mode = Mode.OFFLINE

    def set_mode(self, mode: Mode, force: bool = False) -> Tuple[bool, str]:
        """
        Manually set mode. Returns (success, message).
        
        DARK mode requires force=True (operator's explicit command).
        """
        if mode == Mode.DARK and not force:
            return False, "DARK mode requires explicit confirmation (--force). This will kill ALL connections."

        old = self.mode
        self.prev_mode = old
        self.mode = mode
        reason = f"Manual: {old.value} → {mode.value}"
        self._record_transition(old, mode, reason)
        self._write_state()
        return True, f"Mode changed: {old.value} → {mode.value}"

    async def _verify_comms_after_transition(self, old_mode: Mode):
        """After a mode change, verify comms are still alive. Rollback if not."""
        if self.mode == Mode.DARK:
            return  # DARK intentionally kills comms

        await asyncio.sleep(5)  # Give connections time to stabilize
        await self._check_mach6_result_only()

        if not self.health.mach6_gateway:
            log.error("COMMS DEAD after mode transition! Rolling back.")
            self._add_error(f"Comms died after {old_mode.value} → {self.mode.value}, rolling back")

            # Rollback
            self.mode = old_mode
            self._record_transition(self.mode, old_mode, "ROLLBACK: comms died")

            # If firewall caused it, disable
            await self._emergency_firewall_disable()

    async def _check_mach6_result_only(self):
        """Quick mach6 check without full service scan"""
        result = await self._check_mach6()
        self.health.mach6_gateway, self.health.mach6_whatsapp, self.health.mach6_discord = result

    async def _emergency_firewall_disable(self):
        """Emergency: disable all firewall rules"""
        try:
            from sovereign.firewall import Firewall
            fw = Firewall()
            fw.disable()
            log.warning("Emergency firewall disable executed")
        except Exception as e:
            log.error(f"Emergency firewall disable failed: {e}")
            # Try direct
            try:
                subprocess.run(
                    ["sudo", "iptables", "-D", "OUTPUT", "-j", "SOVEREIGN_STEALTH"],
                    capture_output=True, timeout=5
                )
                subprocess.run(
                    ["sudo", "iptables", "-F", "SOVEREIGN_STEALTH"],
                    capture_output=True, timeout=5
                )
                subprocess.run(
                    ["sudo", "iptables", "-X", "SOVEREIGN_STEALTH"],
                    capture_output=True, timeout=5
                )
            except Exception:
                pass

    # ─── State Management ─────────────────────────────────────────

    def _record_transition(self, old: Mode, new: Mode, reason: str):
        entry = {
            "from": old.value,
            "to": new.value,
            "reason": reason,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        self.transitions.append(entry)
        if len(self.transitions) > 50:
            self.transitions = self.transitions[-50:]

    def _add_error(self, msg: str):
        entry = {"error": msg, "timestamp": datetime.now(timezone.utc).isoformat()}
        self.errors.append(entry)
        if len(self.errors) > 20:
            self.errors = self.errors[-20:]

    def _transition_reason(self, old: Mode, new: Mode) -> str:
        reasons = {
            (Mode.CLOUD, Mode.DEGRADED): "Cloud API unreachable, falling back to Ollama",
            (Mode.DEGRADED, Mode.CLOUD): "Cloud API restored",
            (Mode.DEGRADED, Mode.OFFLINE): "Mach6 gateway down",
            (Mode.CLOUD, Mode.OFFLINE): "Gateway and cloud both down",
            (Mode.OFFLINE, Mode.DEGRADED): "Mach6 gateway restored",
            (Mode.OFFLINE, Mode.CLOUD): "All services restored",
        }
        return reasons.get((old, new), f"Auto: {old.value} → {new.value}")

    def _write_state(self):
        """Write current state to JSON for TUI/CLI consumption"""
        state = SovereignState(
            mode=self.mode.value,
            prev_mode=self.prev_mode.value if isinstance(self.prev_mode, Mode) else self.prev_mode,
            uptime=time.time() - self.start_time,
            health=self.health.to_dict(),
            transitions=self.transitions[-10:],
            last_check=self.health.timestamp,
            firewall_active=self._is_firewall_active(),
            firewall_level=self._get_firewall_level(),
            comms_ok=self.health.mach6_whatsapp or self.health.mach6_discord,
            errors=self.errors[-5:],
            pid=os.getpid(),
        )
        try:
            STATE_FILE.write_text(json.dumps(state.to_dict(), indent=2))
        except Exception as e:
            log.error(f"Failed to write state: {e}")

    def _is_firewall_active(self) -> bool:
        try:
            result = subprocess.run(
                ["sudo", "iptables", "-L", "SOVEREIGN_STEALTH", "-n"],
                capture_output=True, text=True, timeout=3
            )
            return result.returncode == 0
        except Exception:
            return False

    def _get_firewall_level(self) -> str:
        if not self._is_firewall_active():
            return "none"
        if self.mode == Mode.DARK:
            return "dark"
        if self.mode == Mode.STEALTH:
            return "stealth"
        return "unknown"

    # ─── Lifecycle ────────────────────────────────────────────────

    def _handle_signal(self, sig, frame):
        log.info(f"Signal {sig} received — shutting down gracefully")
        self._running = False

    def _write_lock(self):
        LOCK_FILE.write_text(str(os.getpid()))

    def _cleanup(self):
        LOCK_FILE.unlink(missing_ok=True)
        log.info("Sovereign shutdown complete")

    def _setup_logging(self):
        log_file = LOG_DIR / f"sovereign-{datetime.now().strftime('%Y%m%d')}.log"
        logging.basicConfig(
            level=logging.INFO,
            format="%(asctime)s [%(levelname)s] %(message)s",
            datefmt="%H:%M:%S",
            handlers=[
                logging.StreamHandler(),
                logging.FileHandler(log_file),
            ],
        )


def read_state() -> Optional[SovereignState]:
    """Read daemon state from file — used by TUI and CLI"""
    try:
        if STATE_FILE.exists():
            data = json.loads(STATE_FILE.read_text())
            return data
    except Exception:
        pass
    return None


def is_running() -> Tuple[bool, Optional[int]]:
    """Check if sovereign daemon is running"""
    if not LOCK_FILE.exists():
        return False, None
    try:
        pid = int(LOCK_FILE.read_text().strip())
        os.kill(pid, 0)  # Check if process exists
        return True, pid
    except (ValueError, ProcessLookupError, PermissionError):
        LOCK_FILE.unlink(missing_ok=True)
        return False, None


async def run_daemon():
    daemon = Sovereign()
    await daemon.start()


if __name__ == "__main__":
    asyncio.run(run_daemon())
