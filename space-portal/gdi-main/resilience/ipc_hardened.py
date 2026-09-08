#!/usr/bin/env python3
"""
GDI Hardened IPC — Zero-network agent communication
Provides local-only comms between agents when cloud channels are down.
Also provides operator↔agent local messaging via filesystem + MQTT.

Architecture:
  - Unix domain socket: /tmp/gdi-agent-ipc.sock
  - JSONL log: /tmp/gdi-ipc-messages.jsonl
  - MQTT local: gdi/comms/# topics for all parties
  - Filesystem fallback: /tmp/gdi-mailbox/ directory polling

Priority chain:
  1. Cloud (Discord/WebSocket) — if available
  2. MQTT local (localhost:1883)
  3. Unix socket IPC (agents only)
  4. Filesystem mailbox (last resort)
"""

import asyncio
import json
import os
import time
import signal
import logging
from pathlib import Path
from datetime import datetime, timezone
from typing import Optional, Callable, Dict, Any

log = logging.getLogger("gdi.ipc")

# Paths
IPC_SOCK = "/tmp/gdi-agent-ipc.sock"
IPC_JSONL = "/tmp/gdi-ipc-messages.jsonl"
MAILBOX_DIR = Path("/tmp/gdi-mailbox")
COMMS_STATUS = Path("/tmp/gdi-comms-status.json")

# MQTT topics
TOPIC_AGENT_PRIMARY = "gdi/comms/agent-primary"
TOPIC_AGENT_SECONDARY = "gdi/comms/agent-secondary"
TOPIC_OPERATOR_TO_AGENT = "gdi/comms/operator-to-agent"
TOPIC_AGENT_TO_OPERATOR = "gdi/comms/agent-to-operator"
TOPIC_COMMS_STATUS = "gdi/comms/status"


class CommsChannel:
    """Abstract comms channel"""
    name: str = "unknown"
    available: bool = False
    
    async def send(self, recipient: str, message: dict) -> bool:
        raise NotImplementedError
    
    async def check_health(self) -> bool:
        raise NotImplementedError


class MQTTComms(CommsChannel):
    """MQTT-based local communication"""
    name = "mqtt"
    
    def __init__(self, broker="localhost", port=1883):
        self.broker = broker
        self.port = port
        self.client = None
        self.available = False
        self._inbox: asyncio.Queue = asyncio.Queue()
    
    async def connect(self):
        try:
            import paho.mqtt.client as mqtt
            self.client = mqtt.Client(
                client_id="gdi-ipc-agent",
                callback_api_version=mqtt.CallbackAPIVersion.VERSION2
            )
            self.client.on_message = self._on_message
            self.client.connect(self.broker, self.port)
            self.client.subscribe("gdi/comms/#")
            self.client.loop_start()
            self.available = True
            log.info("MQTT comms: connected")
            return True
        except Exception as e:
            log.warning(f"MQTT comms: unavailable ({e})")
            self.available = False
            return False
    
    def _on_message(self, client, userdata, msg):
        try:
            data = json.loads(msg.payload)
            data["_topic"] = msg.topic
            data["_received"] = datetime.now(timezone.utc).isoformat()
            asyncio.get_event_loop().call_soon_threadsafe(
                self._inbox.put_nowait, data
            )
        except Exception:
            pass
    
    async def send(self, recipient: str, message: dict) -> bool:
        if not self.available or not self.client:
            return False
        topic_map = {
            "secondary": TOPIC_AGENT_PRIMARY,
            "operator": TOPIC_AGENT_TO_OPERATOR,
        }
        topic = topic_map.get(recipient)
        if not topic:
            return False
        payload = {
            "from": "agent",
            "to": recipient,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            **message
        }
        try:
            self.client.publish(topic, json.dumps(payload), qos=1)
            return True
        except Exception:
            return False
    
    async def check_health(self) -> bool:
        try:
            import socket
            s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            s.settimeout(2)
            s.connect((self.broker, self.port))
            s.close()
            self.available = True
            return True
        except Exception:
            self.available = False
            return False
    
    async def receive(self, timeout=0.1):
        try:
            return await asyncio.wait_for(self._inbox.get(), timeout)
        except asyncio.TimeoutError:
            return None


class FilesystemMailbox(CommsChannel):
    """Last-resort filesystem-based communication"""
    name = "filesystem"
    
    def __init__(self):
        self.available = True
        MAILBOX_DIR.mkdir(exist_ok=True)
        (MAILBOX_DIR / "primary-inbox").mkdir(exist_ok=True)
        (MAILBOX_DIR / "secondary-inbox").mkdir(exist_ok=True)
        (MAILBOX_DIR / "operator-inbox").mkdir(exist_ok=True)
    
    async def send(self, recipient: str, message: dict) -> bool:
        try:
            inbox = MAILBOX_DIR / f"{recipient}-inbox"
            inbox.mkdir(exist_ok=True)
            filename = f"{int(time.time()*1000)}-agent.json"
            payload = {
                "from": "agent",
                "to": recipient,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                **message
            }
            (inbox / filename).write_text(json.dumps(payload, indent=2))
            return True
        except Exception as e:
            log.error(f"Filesystem send failed: {e}")
            return False
    
    async def check_health(self) -> bool:
        try:
            test_file = MAILBOX_DIR / ".health"
            test_file.write_text(str(time.time()))
            test_file.unlink()
            self.available = True
            return True
        except Exception:
            self.available = False
            return False
    
    async def receive(self):
        """Check agent's inbox for new messages"""
        inbox = MAILBOX_DIR / "primary-inbox"
        messages = []
        try:
            for f in sorted(inbox.iterdir()):
                if f.suffix == ".json":
                    data = json.loads(f.read_text())
                    messages.append(data)
                    f.unlink()  # consume
        except Exception:
            pass
        return messages


class SocketIPC(CommsChannel):
    """Unix domain socket for agent IPC"""
    name = "unix-socket"
    
    def __init__(self):
        self.available = os.path.exists(IPC_SOCK)
    
    async def send(self, recipient: str, message: dict) -> bool:
        if recipient not in ("secondary", "operator"):
            return False
        try:
            entry = {
                "type": "message",
                "method": "agent-msg",
                "payload": {
                    "from": "agent",
                    "content": message.get("content", ""),
                    "priority": message.get("priority", "normal"),
                },
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
            with open(IPC_JSONL, "a") as f:
                f.write(json.dumps(entry) + "\n")
            return True
        except Exception as e:
            log.error(f"Socket IPC send failed: {e}")
            return False
    
    async def check_health(self) -> bool:
        self.available = os.path.exists(IPC_SOCK)
        return self.available


class HardenedComms:
    """
    Resilient communication layer with automatic failover.
    
    Priority: Cloud → MQTT → Socket → Filesystem
    All messages are attempted on the highest available channel.
    Critical messages are sent on ALL available channels.
    """
    
    def __init__(self):
        self.mqtt = MQTTComms()
        self.fs = FilesystemMailbox()
        self.socket = SocketIPC()
        self.cloud_available = True
        self.mode = "cloud"  # cloud | degraded | offline
        self._callbacks: Dict[str, Callable] = {}
    
    async def start(self):
        """Initialize all channels"""
        await self.mqtt.connect()
        await self.socket.check_health()
        await self.fs.check_health()
        self._update_status()
        log.info(f"Hardened comms initialized — mode: {self.mode}")
        log.info(f"  MQTT: {'✓' if self.mqtt.available else '✗'}")
        log.info(f"  Socket: {'✓' if self.socket.available else '✗'}")
        log.info(f"  Filesystem: {'✓' if self.fs.available else '✗'}")
    
    async def send(self, recipient: str, message: dict, critical: bool = False) -> bool:
        """
        Send message to recipient with automatic failover.
        If critical=True, sends on ALL available channels.
        """
        channels = [self.mqtt, self.socket, self.fs]
        sent = False
        
        for ch in channels:
            if ch.available:
                try:
                    result = await ch.send(recipient, message)
                    if result:
                        log.debug(f"Sent to {recipient} via {ch.name}")
                        sent = True
                        if not critical:
                            return True  # non-critical: first success is enough
                except Exception as e:
                    log.warning(f"Failed to send via {ch.name}: {e}")
        
        if not sent:
            log.error(f"ALL CHANNELS FAILED for message to {recipient}")
        
        return sent
    
    async def send_to_operator(self, content: str, priority: str = "normal"):
        """Convenience: send message to operator"""
        return await self.send("operator", {
            "content": content,
            "priority": priority,
        }, critical=(priority == "critical"))
    
    async def send_to_agent(self, content: str, priority: str = "normal"):
        """Convenience: send message to secondary agent"""
        return await self.send("secondary", {
            "content": content,
            "priority": priority,
        }, critical=(priority == "critical"))
    
    async def health_check(self):
        """Check all channels and update mode"""
        await self.mqtt.check_health()
        await self.socket.check_health()
        await self.fs.check_health()
        
        # Cloud check: try to reach Discord/WhatsApp gateways
        try:
            import aiohttp
            async with aiohttp.ClientSession() as session:
                # Check if mach6 gateway is responding (our cloud bridge)
                async with session.get("http://localhost:3006/health", timeout=aiohttp.ClientTimeout(total=3)) as resp:
                    self.cloud_available = resp.status == 200
        except Exception:
            self.cloud_available = False
        
        old_mode = self.mode
        if self.cloud_available:
            self.mode = "cloud"
        elif self.mqtt.available:
            self.mode = "degraded"
        else:
            self.mode = "offline"
        
        if old_mode != self.mode:
            log.warning(f"COMMS MODE CHANGE: {old_mode} → {self.mode}")
            # Notify via all available channels
            await self.send_to_agent(
                f"[SYSTEM] Comms mode changed: {old_mode} → {self.mode}",
                priority="critical"
            )
        
        self._update_status()
    
    def _update_status(self):
        """Write current status to filesystem"""
        status = {
            "mode": self.mode,
            "cloud": self.cloud_available,
            "mqtt": self.mqtt.available,
            "socket": self.socket.available,
            "filesystem": self.fs.available,
            "updated": datetime.now(timezone.utc).isoformat(),
        }
        try:
            COMMS_STATUS.write_text(json.dumps(status, indent=2))
        except Exception:
            pass
        
        # Also publish to MQTT if available
        if self.mqtt.available and self.mqtt.client:
            try:
                self.mqtt.client.publish(
                    TOPIC_COMMS_STATUS,
                    json.dumps(status),
                    qos=1,
                    retain=True
                )
            except Exception:
                pass


async def run_comms_daemon():
    """Run the hardened comms as a standalone daemon"""
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        datefmt="%H:%M:%S"
    )
    
    comms = HardenedComms()
    await comms.start()
    
    running = True
    def handle_signal(sig, frame):
        nonlocal running
        running = False
    
    signal.signal(signal.SIGINT, handle_signal)
    signal.signal(signal.SIGTERM, handle_signal)
    
    log.info("Hardened IPC daemon running — Ctrl+C to stop")
    
    while running:
        await comms.health_check()
        
        # Check filesystem inbox
        messages = await comms.fs.receive()
        for msg in messages:
            log.info(f"Received from {msg.get('from', '?')}: {msg.get('content', '')[:80]}")
        
        # Check MQTT inbox
        while True:
            msg = await comms.mqtt.receive()
            if msg is None:
                break
            topic = msg.get("_topic", "")
            if "operator-to-agent" in topic or "agent-secondary" in topic:
                log.info(f"MQTT from {msg.get('from', '?')}: {msg.get('content', '')[:80]}")
        
        await asyncio.sleep(5)
    
    log.info("Hardened IPC daemon stopped")


if __name__ == "__main__":
    asyncio.run(run_comms_daemon())
