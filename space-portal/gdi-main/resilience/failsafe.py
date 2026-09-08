#!/usr/bin/env python3
"""
GDI RESILIENCE DAEMON — failsafe.py
====================================
Life-or-death infrastructure. Monitors cloud APIs, comms channels,
and provides seamless fallback to local-only operation.

Components:
  1. Model Fallback    — cloud (copilot proxy :3000) → local (ollama :11434)
  2. Degraded Mode     — Redis flag gdi:mode = 'cloud' | 'degraded'
  3. Comms Failsafe    — WhatsApp/Discord monitoring, IPC fallback
  4. Stealth Mode      — kill all non-essential outbound connections

Daemon loop: every 5 seconds.
Author: Artifact Virtual
Created: 2026-03-01 — GDI Resilience Layer
"""

import asyncio
import json
import logging
import os
import signal
import socket
import subprocess
import sys
import time
from dataclasses import dataclass, field, asdict
from datetime import datetime, timezone
from enum import Enum
from pathlib import Path
from typing import Optional, Any

import aiohttp
import redis.asyncio as aioredis

# ─── Constants ─────────────────────────────────────────────────────────────────

CLOUD_PROVIDER_URL = "http://localhost:3000"
CLOUD_HEALTH_ENDPOINT = f"{CLOUD_PROVIDER_URL}/models"
CLOUD_CHAT_ENDPOINT = f"{CLOUD_PROVIDER_URL}/v1/chat/completions"

OLLAMA_URL = "http://localhost:11434"
OLLAMA_HEALTH_ENDPOINT = f"{OLLAMA_URL}/api/tags"
OLLAMA_CHAT_ENDPOINT = f"{OLLAMA_URL}/v1/chat/completions"
OLLAMA_MODEL = "qwen2.5-coder:7b"

REDIS_URL = "redis://localhost:6379"
REDIS_MODE_KEY = "gdi:mode"
REDIS_STATUS_KEY = "gdi:resilience:status"

IPC_SOCK_PATH = "/tmp/gdi-agent-ipc.sock"
COMMS_STATUS_PATH = "/tmp/gdi-comms-status.json"
STEALTH_SCRIPT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "stealth.sh")

CHECK_INTERVAL = 5  # seconds
HEALTH_TIMEOUT = 4  # seconds — must be < CHECK_INTERVAL
CONSECUTIVE_FAILURES_THRESHOLD = 2  # failures before switching

# Discord/WhatsApp health check endpoints (OpenClaw)
DISCORD_HEALTH = "http://localhost:3001/health"  # OpenClaw Discord
WHATSAPP_HEALTH = "http://localhost:3002/health"  # OpenClaw WhatsApp

LOG_DIR = Path("/home/adam/workspace/enterprise/projects/gdi/resilience/logs")
LOG_DIR.mkdir(parents=True, exist_ok=True)

# ─── Logging ───────────────────────────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler(LOG_DIR / "failsafe.log", mode="a"),
    ],
)
log = logging.getLogger("gdi.failsafe")


# ─── Enums & Data ─────────────────────────────────────────────────────────────

class OperatingMode(str, Enum):
    CLOUD = "cloud"
    DEGRADED = "degraded"


class CommsState(str, Enum):
    ONLINE = "online"
    PARTIAL = "partial"
    LOCAL_ONLY = "local_only"


@dataclass
class SystemState:
    mode: OperatingMode = OperatingMode.CLOUD
    comms: CommsState = CommsState.ONLINE
    stealth: bool = False
    cloud_healthy: bool = True
    ollama_healthy: bool = False
    whatsapp_up: bool = True
    discord_up: bool = True
    cloud_failures: int = 0
    ollama_failures: int = 0
    last_check: str = ""
    last_transition: str = ""
    uptime_start: str = ""

    def to_dict(self) -> dict:
        d = asdict(self)
        d["mode"] = self.mode.value
        d["comms"] = self.comms.value
        return d


# ─── Provider Abstraction ─────────────────────────────────────────────────────

class ModelProvider:
    """
    Seamless model provider with automatic fallback.
    Tries cloud first, falls back to ollama on failure.
    """

    def __init__(self, state: SystemState):
        self.state = state
        self._session: Optional[aiohttp.ClientSession] = None

    async def _get_session(self) -> aiohttp.ClientSession:
        if self._session is None or self._session.closed:
            timeout = aiohttp.ClientTimeout(total=30, connect=HEALTH_TIMEOUT)
            self._session = aiohttp.ClientSession(timeout=timeout)
        return self._session

    async def close(self):
        if self._session and not self._session.closed:
            await self._session.close()

    async def health_check_cloud(self) -> bool:
        """Check if cloud provider (copilot proxy) is reachable."""
        try:
            session = await self._get_session()
            async with session.get(
                CLOUD_HEALTH_ENDPOINT,
                timeout=aiohttp.ClientTimeout(total=HEALTH_TIMEOUT),
            ) as resp:
                return resp.status == 200
        except (aiohttp.ClientError, asyncio.TimeoutError, OSError):
            return False

    async def health_check_ollama(self) -> bool:
        """Check if ollama is reachable and has the model loaded."""
        try:
            session = await self._get_session()
            async with session.get(
                OLLAMA_HEALTH_ENDPOINT,
                timeout=aiohttp.ClientTimeout(total=HEALTH_TIMEOUT),
            ) as resp:
                if resp.status != 200:
                    return False
                data = await resp.json()
                models = [m.get("name", "") for m in data.get("models", [])]
                # Check if our fallback model is available (partial match)
                return any(OLLAMA_MODEL.split(":")[0] in m for m in models)
        except (aiohttp.ClientError, asyncio.TimeoutError, OSError):
            return False

    async def chat(
        self,
        messages: list[dict],
        model: str = "gpt-4",
        temperature: float = 0.7,
        max_tokens: int = 2048,
        **kwargs,
    ) -> dict:
        """
        Send a chat completion request. Tries cloud first, falls back to ollama.
        Returns the API response dict or raises if both fail.
        """
        # Try cloud first if not in degraded mode
        if self.state.mode == OperatingMode.CLOUD:
            try:
                return await self._request_cloud(messages, model, temperature, max_tokens, **kwargs)
            except Exception as e:
                log.warning(f"Cloud request failed ({e}), falling back to ollama")

        # Fallback to ollama
        try:
            return await self._request_ollama(messages, temperature, max_tokens, **kwargs)
        except Exception as e:
            log.error(f"Both providers failed. Ollama error: {e}")
            raise RuntimeError("All model providers unavailable") from e

    async def _request_cloud(
        self, messages: list[dict], model: str, temperature: float, max_tokens: int, **kwargs
    ) -> dict:
        session = await self._get_session()
        payload = {
            "model": model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
            **kwargs,
        }
        async with session.post(
            CLOUD_CHAT_ENDPOINT,
            json=payload,
            timeout=aiohttp.ClientTimeout(total=30),
        ) as resp:
            if resp.status != 200:
                text = await resp.text()
                raise aiohttp.ClientResponseError(
                    resp.request_info, resp.history, status=resp.status, message=text
                )
            return await resp.json()

    async def _request_ollama(
        self, messages: list[dict], temperature: float, max_tokens: int, **kwargs
    ) -> dict:
        session = await self._get_session()
        payload = {
            "model": OLLAMA_MODEL,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
            "stream": False,
        }
        async with session.post(
            OLLAMA_CHAT_ENDPOINT,
            json=payload,
            timeout=aiohttp.ClientTimeout(total=120),  # ollama can be slow
        ) as resp:
            if resp.status != 200:
                text = await resp.text()
                raise aiohttp.ClientResponseError(
                    resp.request_info, resp.history, status=resp.status, message=text
                )
            return await resp.json()


# ─── Comms Monitor ─────────────────────────────────────────────────────────────

class CommsMonitor:
    """Monitor WhatsApp and Discord connectivity, activate IPC fallback."""

    def __init__(self, state: SystemState):
        self.state = state
        self._ipc_server: Optional[asyncio.Server] = None

    async def check_whatsapp(self) -> bool:
        """Check WhatsApp connectivity via OpenClaw health endpoint."""
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    WHATSAPP_HEALTH,
                    timeout=aiohttp.ClientTimeout(total=HEALTH_TIMEOUT),
                ) as resp:
                    return resp.status == 200
        except (aiohttp.ClientError, asyncio.TimeoutError, OSError):
            return False

    async def check_discord(self) -> bool:
        """Check Discord connectivity via OpenClaw health endpoint."""
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    DISCORD_HEALTH,
                    timeout=aiohttp.ClientTimeout(total=HEALTH_TIMEOUT),
                ) as resp:
                    return resp.status == 200
        except (aiohttp.ClientError, asyncio.TimeoutError, OSError):
            return False

    async def activate_ipc_fallback(self):
        """Start a Unix domain socket server for sister IPC."""
        if self._ipc_server is not None:
            return  # Already running

        # Clean up stale socket
        sock_path = Path(IPC_SOCK_PATH)
        if sock_path.exists():
            sock_path.unlink()

        try:
            self._ipc_server = await asyncio.start_unix_server(
                self._handle_ipc_client, path=IPC_SOCK_PATH
            )
            os.chmod(IPC_SOCK_PATH, 0o660)
            log.info(f"IPC fallback server started at {IPC_SOCK_PATH}")
        except Exception as e:
            log.error(f"Failed to start IPC server: {e}")

    async def _handle_ipc_client(
        self, reader: asyncio.StreamReader, writer: asyncio.StreamWriter
    ):
        """Handle incoming IPC messages from agents."""
        try:
            while True:
                data = await reader.readline()
                if not data:
                    break
                msg = data.decode("utf-8").strip()
                log.info(f"IPC received: {msg[:200]}")

                # Echo acknowledgment
                response = json.dumps({
                    "status": "received",
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "mode": self.state.mode.value,
                }) + "\n"
                writer.write(response.encode("utf-8"))
                await writer.drain()
        except (ConnectionResetError, BrokenPipeError):
            pass
        finally:
            writer.close()
            await writer.wait_closed()

    async def deactivate_ipc_fallback(self):
        """Stop the IPC server when cloud comms recover."""
        if self._ipc_server is not None:
            self._ipc_server.close()
            await self._ipc_server.wait_closed()
            self._ipc_server = None
            sock_path = Path(IPC_SOCK_PATH)
            if sock_path.exists():
                sock_path.unlink()
            log.info("IPC fallback server stopped")

    def write_comms_status(self):
        """Write comms status to a local JSON file the operator can check."""
        status = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "whatsapp": "up" if self.state.whatsapp_up else "down",
            "discord": "up" if self.state.discord_up else "down",
            "comms_state": self.state.comms.value,
            "ipc_active": self._ipc_server is not None,
            "ipc_socket": IPC_SOCK_PATH if self._ipc_server else None,
            "mode": self.state.mode.value,
            "stealth": self.state.stealth,
        }
        try:
            with open(COMMS_STATUS_PATH, "w") as f:
                json.dump(status, f, indent=2)
        except Exception as e:
            log.error(f"Failed to write comms status: {e}")


# ─── Stealth Mode ─────────────────────────────────────────────────────────────

class StealthController:
    """Activate/deactivate stealth mode — kill non-essential outbound."""

    def __init__(self, state: SystemState):
        self.state = state

    async def activate(self) -> bool:
        """Enable stealth mode via iptables script."""
        if self.state.stealth:
            log.info("Stealth mode already active")
            return True

        if not os.path.isfile(STEALTH_SCRIPT):
            log.error(f"Stealth script not found: {STEALTH_SCRIPT}")
            return False

        try:
            proc = await asyncio.create_subprocess_exec(
                "sudo", "bash", STEALTH_SCRIPT, "enable",
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            stdout, stderr = await proc.communicate()
            if proc.returncode == 0:
                self.state.stealth = True
                log.info("STEALTH MODE ACTIVATED — all non-essential outbound blocked")
                log.info(f"stealth.sh output: {stdout.decode().strip()}")
                return True
            else:
                log.error(f"Stealth activation failed: {stderr.decode().strip()}")
                return False
        except Exception as e:
            log.error(f"Stealth activation error: {e}")
            return False

    async def deactivate(self) -> bool:
        """Disable stealth mode."""
        if not self.state.stealth:
            log.info("Stealth mode already inactive")
            return True

        try:
            proc = await asyncio.create_subprocess_exec(
                "sudo", "bash", STEALTH_SCRIPT, "disable",
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            stdout, stderr = await proc.communicate()
            if proc.returncode == 0:
                self.state.stealth = False
                log.info("STEALTH MODE DEACTIVATED — outbound restored")
                log.info(f"stealth.sh output: {stdout.decode().strip()}")
                return True
            else:
                log.error(f"Stealth deactivation failed: {stderr.decode().strip()}")
                return False
        except Exception as e:
            log.error(f"Stealth deactivation error: {e}")
            return False


# ─── Redis Manager ─────────────────────────────────────────────────────────────

class RedisManager:
    """Manage Redis connection with graceful degradation."""

    def __init__(self):
        self._client: Optional[aioredis.Redis] = None
        self._available = False

    async def connect(self):
        try:
            self._client = aioredis.from_url(
                REDIS_URL, decode_responses=True, socket_timeout=3
            )
            await self._client.ping()
            self._available = True
            log.info("Redis connected")
        except Exception as e:
            log.warning(f"Redis unavailable: {e} — will retry")
            self._available = False

    async def set_mode(self, mode: OperatingMode):
        if not self._available:
            await self._try_reconnect()
        if self._available:
            try:
                await self._client.set(REDIS_MODE_KEY, mode.value)
                log.info(f"Redis: {REDIS_MODE_KEY} = {mode.value}")
            except Exception as e:
                log.warning(f"Redis set failed: {e}")
                self._available = False

    async def set_status(self, state: SystemState):
        if not self._available:
            await self._try_reconnect()
        if self._available:
            try:
                await self._client.set(
                    REDIS_STATUS_KEY,
                    json.dumps(state.to_dict()),
                    ex=30,  # expire after 30s if daemon dies
                )
            except Exception as e:
                log.warning(f"Redis status set failed: {e}")
                self._available = False

    async def _try_reconnect(self):
        try:
            if self._client is None:
                self._client = aioredis.from_url(
                    REDIS_URL, decode_responses=True, socket_timeout=3
                )
            await self._client.ping()
            self._available = True
        except Exception:
            self._available = False

    async def close(self):
        if self._client:
            await self._client.aclose()

    @property
    def available(self) -> bool:
        return self._available


# ─── Main Daemon ───────────────────────────────────────────────────────────────

class FailsafeDaemon:
    """
    GDI Resilience Daemon.
    Continuously monitors infrastructure and maintains fallback state.
    """

    def __init__(self):
        self.state = SystemState(
            uptime_start=datetime.now(timezone.utc).isoformat()
        )
        self.provider = ModelProvider(self.state)
        self.comms = CommsMonitor(self.state)
        self.stealth = StealthController(self.state)
        self.redis = RedisManager()
        self._running = False
        self._stealth_requested = False

    async def start(self):
        """Start the daemon."""
        log.info("=" * 60)
        log.info("GDI FAILSAFE DAEMON STARTING")
        log.info(f"Cloud provider: {CLOUD_PROVIDER_URL}")
        log.info(f"Fallback provider: {OLLAMA_URL} ({OLLAMA_MODEL})")
        log.info(f"Check interval: {CHECK_INTERVAL}s")
        log.info(f"Failure threshold: {CONSECUTIVE_FAILURES_THRESHOLD}")
        log.info("=" * 60)

        # Connect Redis
        await self.redis.connect()
        await self.redis.set_mode(OperatingMode.CLOUD)

        # Set up signal handlers
        loop = asyncio.get_running_loop()
        for sig in (signal.SIGINT, signal.SIGTERM):
            loop.add_signal_handler(sig, lambda s=sig: asyncio.create_task(self.shutdown(s)))

        # Set up stealth trigger file watcher
        # Touch /tmp/gdi-stealth-activate to trigger, /tmp/gdi-stealth-deactivate to stop
        self._running = True

        # Initial state write
        self.comms.write_comms_status()

        # Main loop
        while self._running:
            try:
                await self._check_cycle()
            except Exception as e:
                log.error(f"Check cycle error: {e}", exc_info=True)

            await asyncio.sleep(CHECK_INTERVAL)

    async def _check_cycle(self):
        """One monitoring cycle."""
        now = datetime.now(timezone.utc).isoformat()
        self.state.last_check = now

        # ── 1. Model Health Checks ──────────────────────────────────

        cloud_ok = await self.provider.health_check_cloud()
        ollama_ok = await self.provider.health_check_ollama()

        self.state.ollama_healthy = ollama_ok

        if cloud_ok:
            self.state.cloud_healthy = True
            self.state.cloud_failures = 0

            # Recover from degraded if cloud comes back
            if self.state.mode == OperatingMode.DEGRADED:
                log.info("☁️  Cloud recovered — switching back from degraded mode")
                self.state.mode = OperatingMode.CLOUD
                self.state.last_transition = now
                await self.redis.set_mode(OperatingMode.CLOUD)
        else:
            self.state.cloud_healthy = False
            self.state.cloud_failures += 1
            log.warning(
                f"☁️  Cloud health check failed "
                f"({self.state.cloud_failures}/{CONSECUTIVE_FAILURES_THRESHOLD})"
            )

            if self.state.cloud_failures >= CONSECUTIVE_FAILURES_THRESHOLD:
                if self.state.mode != OperatingMode.DEGRADED:
                    log.warning("⚠️  SWITCHING TO DEGRADED MODE — using ollama fallback")
                    self.state.mode = OperatingMode.DEGRADED
                    self.state.last_transition = now
                    await self.redis.set_mode(OperatingMode.DEGRADED)

        if not ollama_ok and self.state.mode == OperatingMode.DEGRADED:
            log.error("🔴 CRITICAL: Both cloud AND ollama unavailable!")

        # ── 2. Comms Health Checks ──────────────────────────────────

        wa_ok = await self.comms.check_whatsapp()
        dc_ok = await self.comms.check_discord()

        self.state.whatsapp_up = wa_ok
        self.state.discord_up = dc_ok

        prev_comms = self.state.comms

        if wa_ok and dc_ok:
            self.state.comms = CommsState.ONLINE
            # Deactivate IPC if we're back online
            if prev_comms == CommsState.LOCAL_ONLY:
                await self.comms.deactivate_ipc_fallback()
                log.info("📡 Comms restored — IPC fallback deactivated")
        elif wa_ok or dc_ok:
            self.state.comms = CommsState.PARTIAL
            log.warning(
                f"📡 Partial comms — WA: {'✓' if wa_ok else '✗'}, "
                f"DC: {'✓' if dc_ok else '✗'}"
            )
        else:
            self.state.comms = CommsState.LOCAL_ONLY
            if prev_comms != CommsState.LOCAL_ONLY:
                log.warning("📡 ALL COMMS DOWN — activating IPC fallback")
                await self.comms.activate_ipc_fallback()

        # Always write comms status for operator to check locally
        self.comms.write_comms_status()

        # ── 3. Stealth Mode Trigger Check ───────────────────────────

        activate_trigger = Path("/tmp/gdi-stealth-activate")
        deactivate_trigger = Path("/tmp/gdi-stealth-deactivate")

        if activate_trigger.exists():
            activate_trigger.unlink()
            if not self.state.stealth:
                log.info("🕶️  Stealth mode trigger detected — activating")
                await self.stealth.activate()

        if deactivate_trigger.exists():
            deactivate_trigger.unlink()
            if self.state.stealth:
                log.info("🕶️  Stealth deactivation trigger detected")
                await self.stealth.deactivate()

        # ── 4. Publish State ────────────────────────────────────────

        await self.redis.set_status(self.state)

        # Log summary
        mode_icon = "☁️" if self.state.mode == OperatingMode.CLOUD else "⚠️"
        comms_icon = {"online": "📡", "partial": "📶", "local_only": "🔇"}[self.state.comms.value]
        stealth_icon = "🕶️" if self.state.stealth else "👁️"
        log.info(
            f"{mode_icon} mode={self.state.mode.value} | "
            f"{comms_icon} comms={self.state.comms.value} | "
            f"{stealth_icon} stealth={self.state.stealth} | "
            f"cloud={'✓' if self.state.cloud_healthy else '✗'} "
            f"ollama={'✓' if self.state.ollama_healthy else '✗'}"
        )

    async def shutdown(self, sig=None):
        """Graceful shutdown."""
        if sig:
            log.info(f"Received signal {sig.name}, shutting down...")
        self._running = False

        # Clean up
        await self.comms.deactivate_ipc_fallback()
        await self.provider.close()

        # Final Redis update
        try:
            await self.redis.set_mode(OperatingMode.CLOUD)  # Reset on clean shutdown
            await self.redis.close()
        except Exception:
            pass

        # Clean up comms status
        try:
            status = {
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "status": "daemon_shutdown",
                "mode": "unknown",
            }
            with open(COMMS_STATUS_PATH, "w") as f:
                json.dump(status, f, indent=2)
        except Exception:
            pass

        log.info("GDI Failsafe daemon stopped.")


# ─── CLI Interface ─────────────────────────────────────────────────────────────

def print_usage():
    print("""
GDI Failsafe Daemon
====================
Usage:
  python3 failsafe.py              Start the daemon
  python3 failsafe.py --status     Check current status (from Redis)
  python3 failsafe.py --stealth    Activate stealth mode (touch trigger)
  python3 failsafe.py --no-stealth Deactivate stealth mode
  python3 failsafe.py --test       Run a single check cycle and exit
""")


async def check_status():
    """Check and print current status from Redis."""
    try:
        client = aioredis.from_url(REDIS_URL, decode_responses=True, socket_timeout=3)
        mode = await client.get(REDIS_MODE_KEY)
        status_raw = await client.get(REDIS_STATUS_KEY)
        await client.aclose()

        print(f"\nGDI Mode: {mode or 'unknown'}")
        if status_raw:
            status = json.loads(status_raw)
            print(json.dumps(status, indent=2))
        else:
            print("No status data — daemon may not be running.")
    except Exception as e:
        print(f"Redis unavailable: {e}")
        # Try local file
        if os.path.exists(COMMS_STATUS_PATH):
            with open(COMMS_STATUS_PATH) as f:
                print(f"\nLocal comms status:\n{f.read()}")


async def run_test():
    """Run a single check cycle for testing."""
    daemon = FailsafeDaemon()
    await daemon.redis.connect()
    await daemon._check_cycle()
    await daemon.provider.close()
    await daemon.redis.close()
    print("\nTest cycle complete. Check logs above.")


async def main():
    args = sys.argv[1:]

    if "--help" in args or "-h" in args:
        print_usage()
        return

    if "--status" in args:
        await check_status()
        return

    if "--stealth" in args:
        Path("/tmp/gdi-stealth-activate").touch()
        print("Stealth activation trigger set. Daemon will pick it up in next cycle.")
        return

    if "--no-stealth" in args:
        Path("/tmp/gdi-stealth-deactivate").touch()
        print("Stealth deactivation trigger set. Daemon will pick it up in next cycle.")
        return

    if "--test" in args:
        await run_test()
        return

    # Default: run daemon
    daemon = FailsafeDaemon()
    await daemon.start()


if __name__ == "__main__":
    asyncio.run(main())
