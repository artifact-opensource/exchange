#!/usr/bin/env python3
"""
GDI SOVEREIGN ORCHESTRATOR
===========================
Master daemon that coordinates:
  - Model fallback (cloud → local)
  - Comms failover (cloud → MQTT → IPC → filesystem)
  - C-Suite degraded mode
  - Stealth mode activation
  - Health monitoring

This is the single entry point. Start this, everything works.

Usage:
  python3 orchestrator.py              # Normal mode
  python3 orchestrator.py --stealth    # Start in stealth mode
  python3 orchestrator.py --offline    # Start in offline-only mode
"""

import asyncio
import json
import os
import sys
import signal
import logging
import time
import subprocess
from pathlib import Path
from datetime import datetime, timezone
from typing import Optional

# Add parent paths
sys.path.insert(0, str(Path(__file__).parent))

log = logging.getLogger("gdi.orchestrator")

# ─── Configuration ───────────────────────────────────────────────
CLOUD_PROXY = os.getenv("CLOUD_PROXY", "http://localhost:3000")
OLLAMA_URL = os.getenv("OLLAMA_URL", "http://127.0.0.1:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "qwen2.5-coder:7b")
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")
MQTT_BROKER = os.getenv("MQTT_BROKER", "localhost")
MQTT_PORT = int(os.getenv("MQTT_PORT", "1883"))
DB_DSN = os.getenv("DATABASE_URL", "postgresql://gdi:gdi_secret@localhost:5432/gdi_satx")
CHECK_INTERVAL = 5  # seconds

STATUS_FILE = Path("/tmp/gdi-sovereign-status.json")
COMMS_STATUS_FILE = Path("/tmp/gdi-comms-status.json")
CSUITE_STATUS_FILE = Path("/tmp/gdi-csuite-status.json")


class SovereignOrchestrator:
    """
    The brain. Monitors everything, switches modes automatically,
    ensures agents never lose contact.
    """
    
    def __init__(self, start_stealth=False, start_offline=False):
        self.mode = "initializing"  # cloud | degraded | offline | stealth
        self.cloud_api_alive = True
        self.ollama_alive = False
        self.redis_alive = False
        self.mqtt_alive = False
        self.db_alive = False
        self.mach6_alive = False
        self.stealth_requested = start_stealth
        self.offline_requested = start_offline
        self.start_time = time.time()
        self.mode_changes: list = []
        self.redis_client = None
        self._running = True
    
    async def start(self):
        """Initialize and begin monitoring"""
        logging.basicConfig(
            level=logging.INFO,
            format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
            datefmt="%H:%M:%S"
        )
        
        log.info("═══ GDI SOVEREIGN ORCHESTRATOR ═══")
        log.info(f"  Cloud proxy: {CLOUD_PROXY}")
        log.info(f"  Ollama: {OLLAMA_URL} ({OLLAMA_MODEL})")
        log.info(f"  Redis: {REDIS_URL}")
        log.info(f"  MQTT: {MQTT_BROKER}:{MQTT_PORT}")
        
        # Initial health check
        await self._full_health_check()
        
        # Determine initial mode
        if self.stealth_requested:
            await self._enter_stealth()
        elif self.offline_requested:
            self._set_mode("offline")
        else:
            self._determine_mode()
        
        log.info(f"═══ ORCHESTRATOR ONLINE — Mode: {self.mode.upper()} ═══")
        
        # Signal handling
        for sig in (signal.SIGINT, signal.SIGTERM):
            signal.signal(sig, self._handle_signal)
        
        # Main loop
        while self._running:
            try:
                await self._tick()
                await asyncio.sleep(CHECK_INTERVAL)
            except Exception as e:
                log.error(f"Tick error: {e}")
                await asyncio.sleep(CHECK_INTERVAL)
        
        log.info("Orchestrator shutting down")
        self._write_status()
    
    def _handle_signal(self, sig, frame):
        log.info(f"Signal {sig} received — shutting down")
        self._running = False
    
    async def _tick(self):
        """Single monitoring cycle"""
        await self._full_health_check()
        old_mode = self.mode
        
        if self.stealth_requested:
            if self.mode != "stealth":
                await self._enter_stealth()
        else:
            self._determine_mode()
        
        if old_mode != self.mode:
            transition = {
                "from": old_mode,
                "to": self.mode,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "reason": self._transition_reason(old_mode, self.mode)
            }
            self.mode_changes.append(transition)
            log.warning(f"MODE CHANGE: {old_mode} → {self.mode} ({transition['reason']})")
            await self._notify_mode_change(old_mode, self.mode)
        
        # Update Redis mode flag for C-Suite
        await self._update_redis_mode()
        
        # Write status
        self._write_status()
    
    async def _full_health_check(self):
        """Check all services"""
        import aiohttp
        
        # Cloud API check
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    f"{CLOUD_PROXY}/v1/models",
                    timeout=aiohttp.ClientTimeout(total=5)
                ) as resp:
                    self.cloud_api_alive = resp.status in (200, 401, 403)
        except Exception:
            self.cloud_api_alive = False
        
        # Ollama check
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    f"{OLLAMA_URL}/api/tags",
                    timeout=aiohttp.ClientTimeout(total=3)
                ) as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        models = [m["name"] for m in data.get("models", [])]
                        self.ollama_alive = len(models) > 0
                    else:
                        self.ollama_alive = False
        except Exception:
            self.ollama_alive = False
        
        # Redis check
        try:
            import redis
            if not self.redis_client:
                self.redis_client = redis.from_url(REDIS_URL, decode_responses=True)
            self.redis_client.ping()
            self.redis_alive = True
        except Exception:
            self.redis_alive = False
            self.redis_client = None
        
        # MQTT check
        try:
            import socket
            s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            s.settimeout(2)
            s.connect((MQTT_BROKER, MQTT_PORT))
            s.close()
            self.mqtt_alive = True
        except Exception:
            self.mqtt_alive = False
        
        # DB check
        try:
            import asyncpg
            conn = await asyncpg.connect(DB_DSN, timeout=3)
            await conn.fetchval("SELECT 1")
            await conn.close()
            self.db_alive = True
        except Exception:
            self.db_alive = False
        
        # Mach6 gateway check
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    "http://localhost:3006/health",
                    timeout=aiohttp.ClientTimeout(total=3)
                ) as resp:
                    self.mach6_alive = resp.status == 200
        except Exception:
            self.mach6_alive = False
    
    def _determine_mode(self):
        """Determine mode based on service availability"""
        if self.cloud_api_alive and self.mach6_alive:
            self._set_mode("cloud")
        elif self.ollama_alive:
            self._set_mode("degraded")
        else:
            self._set_mode("offline")
    
    def _set_mode(self, mode: str):
        self.mode = mode
    
    def _transition_reason(self, old: str, new: str) -> str:
        if new == "degraded" and old == "cloud":
            return "Cloud API unreachable, falling back to local Ollama"
        elif new == "cloud" and old == "degraded":
            return "Cloud API restored"
        elif new == "offline":
            return "All inference providers down"
        elif new == "stealth":
            return "Stealth mode activated — all outbound blocked"
        return f"{old}→{new}"
    
    async def _enter_stealth(self):
        """Activate stealth mode"""
        log.warning("ENTERING STEALTH MODE — blocking outbound traffic")
        self._set_mode("stealth")
        
        # Run stealth script if available
        stealth_script = Path(__file__).parent / "stealth.sh"
        if stealth_script.exists():
            try:
                result = subprocess.run(
                    ["sudo", "bash", str(stealth_script), "enable"],
                    capture_output=True, text=True, timeout=10
                )
                if result.returncode == 0:
                    log.info("Stealth firewall rules applied")
                else:
                    log.warning(f"Stealth script failed: {result.stderr}")
            except Exception as e:
                log.warning(f"Could not run stealth script: {e}")
    
    async def _update_redis_mode(self):
        """Write mode to Redis for C-Suite consumption"""
        if not self.redis_alive or not self.redis_client:
            return
        try:
            redis_mode = "degraded" if self.mode in ("degraded", "stealth", "offline") else "cloud"
            self.redis_client.set("gdi:mode", redis_mode)
            self.redis_client.set("gdi:mode:detail", self.mode)
            self.redis_client.set("gdi:mode:updated", datetime.now(timezone.utc).isoformat())
            
            # Service health for C-Suite
            self.redis_client.hset("gdi:health", mapping={
                "cloud_api": str(self.cloud_api_alive),
                "ollama": str(self.ollama_alive),
                "redis": str(self.redis_alive),
                "mqtt": str(self.mqtt_alive),
                "db": str(self.db_alive),
                "mach6": str(self.mach6_alive),
            })
        except Exception as e:
            log.warning(f"Redis mode update failed: {e}")
    
    async def _notify_mode_change(self, old: str, new: str):
        """Notify agents and log mode change"""
        try:
            from ipc_hardened import HardenedComms
            comms = HardenedComms()
            await comms.start()
            await comms.send_to_agent(
                f"[SOVEREIGN] Mode change: {old} → {new}. "
                f"Cloud: {'✓' if self.cloud_api_alive else '✗'}, "
                f"Ollama: {'✓' if self.ollama_alive else '✗'}, "
                f"MQTT: {'✓' if self.mqtt_alive else '✗'}",
                priority="critical"
            )
        except Exception as e:
            log.warning(f"Could not notify agent: {e}")
    
    def _write_status(self):
        """Write comprehensive status to filesystem"""
        status = {
            "mode": self.mode,
            "uptime_seconds": int(time.time() - self.start_time),
            "services": {
                "cloud_api": self.cloud_api_alive,
                "ollama": self.ollama_alive,
                "ollama_model": OLLAMA_MODEL,
                "redis": self.redis_alive,
                "mqtt": self.mqtt_alive,
                "postgresql": self.db_alive,
                "mach6_gateway": self.mach6_alive,
            },
            "model": {
                "active": "cloud" if self.cloud_api_alive and self.mode == "cloud" else OLLAMA_MODEL,
                "provider": "github-copilot" if self.mode == "cloud" else "ollama",
                "degraded": self.mode != "cloud",
            },
            "comms": {
                "cloud_channels": self.mach6_alive,
                "mqtt_local": self.mqtt_alive,
                "ipc_socket": os.path.exists("/tmp/gdi-agent-ipc.sock"),
                "filesystem_mailbox": os.path.exists("/tmp/gdi-mailbox"),
            },
            "mode_changes": self.mode_changes[-10:],  # last 10
            "updated": datetime.now(timezone.utc).isoformat(),
        }
        try:
            STATUS_FILE.write_text(json.dumps(status, indent=2))
        except Exception:
            pass


async def main():
    stealth = "--stealth" in sys.argv
    offline = "--offline" in sys.argv
    
    orchestrator = SovereignOrchestrator(
        start_stealth=stealth,
        start_offline=offline
    )
    await orchestrator.start()


if __name__ == "__main__":
    asyncio.run(main())
