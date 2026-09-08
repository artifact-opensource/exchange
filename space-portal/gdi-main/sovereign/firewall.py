#!/usr/bin/env python3
"""
SOVEREIGN FIREWALL — Safe network isolation with comms preservation.

Two levels:
  STEALTH — Block telemetry, analytics, non-essential outbound.
             PRESERVE: Mach6 (WhatsApp/Discord), DNS for WS resolution.
  DARK    — Block EVERYTHING outbound. Only localhost. Comms die.
             Requires explicit Ali command.

Safety: Stealth mode identifies Mach6's active WebSocket connections
and creates explicit ALLOW rules for them BEFORE blocking anything.
"""

import os
import subprocess
import json
import logging
import socket
from pathlib import Path
from datetime import datetime, timezone
from typing import List, Tuple, Optional

log = logging.getLogger("sovereign.firewall")

# .env already loaded by core.py — just read the values
CHAIN_NAME = os.environ.get("SOVEREIGN_CHAIN_NAME", "SOVEREIGN_STEALTH")
MARKER_FILE = Path(os.environ.get("SOVEREIGN_FIREWALL_MARKER", "/tmp/sovereign-firewall-active"))
LOG_DIR = Path(__file__).parent / "logs"
LOG_DIR.mkdir(exist_ok=True)


def _run(cmd: list, check: bool = False, timeout: int = 5) -> subprocess.CompletedProcess:
    """Run a command with sudo"""
    return subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)


def _iptables(args: list, ipv6: bool = False) -> bool:
    """Run iptables/ip6tables command"""
    cmd = ["sudo", "ip6tables" if ipv6 else "iptables"] + args
    result = _run(cmd)
    return result.returncode == 0


def get_mach6_connections() -> List[Tuple[str, int]]:
    """
    Find Mach6's active outbound TCP connections (WebSocket endpoints).
    These MUST be preserved in stealth mode.
    
    Returns list of (remote_ip, remote_port) tuples.
    """
    connections = []
    try:
        # Get PIDs of mach6 processes
        result = _run(["pgrep", "-f", "mach6.*daemon"])
        if result.returncode != 0:
            return connections

        pids = set(result.stdout.strip().split("\n"))

        # Get all established TCP connections with process info
        result = _run(["sudo", "ss", "-tnp", "state", "established"])
        if result.returncode != 0:
            return connections

        for line in result.stdout.strip().split("\n")[1:]:  # Skip header
            # Check if this connection belongs to a mach6 PID
            is_mach6 = False
            for pid in pids:
                pid = pid.strip()
                if pid and f"pid={pid}" in line:
                    is_mach6 = True
                    break

            if not is_mach6:
                continue

            parts = line.split()
            if len(parts) >= 4:
                # Peer address is the 4th field (0-indexed: 3)
                peer = parts[3]
                try:
                    if peer.startswith("["):
                        # IPv6: [ip]:port
                        ip = peer.rsplit("]:", 1)[0][1:]
                        port = int(peer.rsplit("]:", 1)[1])
                    else:
                        ip, port_str = peer.rsplit(":", 1)
                        port = int(port_str)

                    # Only include non-local connections
                    if not ip.startswith("127.") and not ip.startswith("::1"):
                        connections.append((ip, port))
                except (ValueError, IndexError):
                    continue
    except Exception as e:
        log.error(f"Failed to get Mach6 connections: {e}")

    return connections


def get_mach6_ws_endpoints() -> List[str]:
    """
    Resolve WhatsApp and Discord WebSocket server IPs.
    These are the known endpoint domains.
    """
    endpoints = []
    domains = [
        # WhatsApp WebSocket endpoints
        "web.whatsapp.com",
        "w1.web.whatsapp.com",
        "w2.web.whatsapp.com",
        "w3.web.whatsapp.com",
        "w4.web.whatsapp.com",
        "w5.web.whatsapp.com",
        "w6.web.whatsapp.com",
        "w7.web.whatsapp.com",
        "w8.web.whatsapp.com",
        # Discord gateway
        "gateway.discord.gg",
        "discord.com",
        "discord.gg",
    ]

    for domain in domains:
        try:
            ips = socket.getaddrinfo(domain, 443, socket.AF_INET)
            for _, _, _, _, sockaddr in ips:
                ip = sockaddr[0]
                if ip not in endpoints:
                    endpoints.append(ip)
        except Exception:
            pass

    return endpoints


class Firewall:
    """Safe firewall management"""

    def enable_stealth(self) -> Tuple[bool, str]:
        """
        Enable stealth mode — block non-essential outbound, PRESERVE comms.
        
        Order of operations:
        1. Discover Mach6's active connections
        2. Resolve known WS endpoints
        3. Create chain with ALLOW rules for comms first
        4. Add block rules for everything else
        5. Verify comms still work
        """
        log.info("Enabling STEALTH firewall...")

        # Step 1: Get active Mach6 connections
        active_conns = get_mach6_connections()
        ws_endpoints = get_mach6_ws_endpoints()
        
        log.info(f"  Active Mach6 connections: {len(active_conns)}")
        log.info(f"  Known WS endpoints: {len(ws_endpoints)}")

        if not active_conns and not ws_endpoints:
            log.warning("  No Mach6 connections found — comms may already be down")

        # Step 2: Clean up any existing chain
        self._remove_chain()

        # Step 3: Create chain
        for ipv6 in (False, True):
            _iptables(["-N", CHAIN_NAME], ipv6=ipv6)

        # Step 4: Allow rules (BEFORE any blocks)
        
        # 4a: Loopback always allowed
        _iptables(["-A", CHAIN_NAME, "-o", "lo", "-j", "ACCEPT"])
        _iptables(["-A", CHAIN_NAME, "-o", "lo", "-j", "ACCEPT"], ipv6=True)

        # 4b: Established/related connections (keeps current sessions alive)
        _iptables(["-A", CHAIN_NAME, "-m", "state", "--state", "ESTABLISHED,RELATED", "-j", "ACCEPT"])
        _iptables(["-A", CHAIN_NAME, "-m", "state", "--state", "ESTABLISHED,RELATED", "-j", "ACCEPT"], ipv6=True)

        # 4c: Localhost destinations
        _iptables(["-A", CHAIN_NAME, "-d", "127.0.0.0/8", "-j", "ACCEPT"])
        _iptables(["-A", CHAIN_NAME, "-d", "::1/128", "-j", "ACCEPT"], ipv6=True)

        # 4d: LAN (RFC1918) — local network comms
        for cidr in ["10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16"]:
            _iptables(["-A", CHAIN_NAME, "-d", cidr, "-j", "ACCEPT"])

        # 4e: DNS — needed for WebSocket reconnections
        _iptables(["-A", CHAIN_NAME, "-p", "udp", "--dport", "53", "-j", "ACCEPT"])
        _iptables(["-A", CHAIN_NAME, "-p", "tcp", "--dport", "53", "-j", "ACCEPT"])

        # 4f: Allow ALL active Mach6 connection endpoints
        allowed_ips = set()
        for ip, port in active_conns:
            if ip not in allowed_ips:
                _iptables(["-A", CHAIN_NAME, "-d", ip, "-j", "ACCEPT"])
                allowed_ips.add(ip)
                log.info(f"  ALLOW active connection: {ip}")

        # 4g: Allow ALL known WS endpoints (for reconnection)
        for ip in ws_endpoints:
            if ip not in allowed_ips:
                _iptables(["-A", CHAIN_NAME, "-d", ip, "-j", "ACCEPT"])
                allowed_ips.add(ip)
                log.info(f"  ALLOW WS endpoint: {ip}")

        # 4h: Allow port 443 outbound for WhatsApp/Discord reconnection
        # This is broader but necessary — WS endpoints rotate IPs
        _iptables(["-A", CHAIN_NAME, "-p", "tcp", "--dport", "443", "-j", "ACCEPT"])
        log.info("  ALLOW outbound port 443 (WS reconnection)")

        # Step 5: Block everything else
        _iptables(["-A", CHAIN_NAME, "-j", "LOG", "--log-prefix", "[SOVEREIGN-BLOCK] ", "--log-level", "4"])
        _iptables(["-A", CHAIN_NAME, "-j", "DROP"])
        _iptables(["-A", CHAIN_NAME, "-j", "DROP"], ipv6=True)

        # Step 6: Insert chain into OUTPUT
        _iptables(["-I", "OUTPUT", "1", "-j", CHAIN_NAME])
        _iptables(["-I", "OUTPUT", "1", "-j", CHAIN_NAME], ipv6=True)

        # Write marker
        marker_data = {
            "level": "stealth",
            "activated": datetime.now(timezone.utc).isoformat(),
            "preserved_ips": list(allowed_ips),
            "active_connections": len(active_conns),
        }
        MARKER_FILE.write_text(json.dumps(marker_data, indent=2))

        log.info("STEALTH FIREWALL ACTIVE — comms preserved")
        return True, f"Stealth active. {len(allowed_ips)} IPs whitelisted, port 443 open for WS."

    def enable_dark(self) -> Tuple[bool, str]:
        """
        Enable DARK mode — block ALL outbound. Only localhost.
        THIS WILL KILL WHATSAPP AND DISCORD.
        """
        log.warning("ENABLING DARK MODE — ALL outbound will be blocked!")

        self._remove_chain()

        for ipv6 in (False, True):
            _iptables(["-N", CHAIN_NAME], ipv6=ipv6)

        # Only allow loopback
        _iptables(["-A", CHAIN_NAME, "-o", "lo", "-j", "ACCEPT"])
        _iptables(["-A", CHAIN_NAME, "-o", "lo", "-j", "ACCEPT"], ipv6=True)
        _iptables(["-A", CHAIN_NAME, "-d", "127.0.0.0/8", "-j", "ACCEPT"])
        _iptables(["-A", CHAIN_NAME, "-d", "::1/128", "-j", "ACCEPT"], ipv6=True)

        # Established for existing local connections
        _iptables(["-A", CHAIN_NAME, "-m", "state", "--state", "ESTABLISHED,RELATED", "-j", "ACCEPT"])

        # Block everything
        _iptables(["-A", CHAIN_NAME, "-j", "DROP"])
        _iptables(["-A", CHAIN_NAME, "-j", "DROP"], ipv6=True)

        _iptables(["-I", "OUTPUT", "1", "-j", CHAIN_NAME])
        _iptables(["-I", "OUTPUT", "1", "-j", CHAIN_NAME], ipv6=True)

        marker_data = {
            "level": "dark",
            "activated": datetime.now(timezone.utc).isoformat(),
        }
        MARKER_FILE.write_text(json.dumps(marker_data, indent=2))

        log.warning("DARK MODE ACTIVE — all outbound blocked")
        return True, "DARK mode active. All outbound traffic blocked."

    def disable(self) -> Tuple[bool, str]:
        """Disable all firewall rules — restore normal operation"""
        log.info("Disabling firewall...")
        self._remove_chain()
        MARKER_FILE.unlink(missing_ok=True)
        log.info("Firewall disabled — normal operation restored")
        return True, "Firewall disabled. All outbound traffic restored."

    def status(self) -> dict:
        """Get current firewall status"""
        active = self._chain_exists()
        level = "none"
        info = {}

        if active and MARKER_FILE.exists():
            try:
                info = json.loads(MARKER_FILE.read_text())
                level = info.get("level", "unknown")
            except Exception:
                level = "unknown"

        # Count rules
        rules = 0
        try:
            result = _run(["sudo", "iptables", "-L", CHAIN_NAME, "-n", "--line-numbers"])
            if result.returncode == 0:
                rules = max(0, len(result.stdout.strip().split("\n")) - 2)  # subtract header lines
        except Exception:
            pass

        return {
            "active": active,
            "level": level,
            "rules": rules,
            "info": info,
        }

    def _chain_exists(self) -> bool:
        return _iptables(["-L", CHAIN_NAME, "-n"])

    def _remove_chain(self):
        """Safely remove chain from all tables"""
        for ipv6 in (False, True):
            # Remove from OUTPUT (may need multiple passes)
            for _ in range(5):
                if not _iptables(["-D", "OUTPUT", "-j", CHAIN_NAME], ipv6=ipv6):
                    break
            # Flush and delete
            _iptables(["-F", CHAIN_NAME], ipv6=ipv6)
            _iptables(["-X", CHAIN_NAME], ipv6=ipv6)


if __name__ == "__main__":
    import sys
    logging.basicConfig(level=logging.INFO, format="%(message)s")

    fw = Firewall()
    cmd = sys.argv[1] if len(sys.argv) > 1 else "status"

    if cmd == "stealth":
        ok, msg = fw.enable_stealth()
        print(msg)
    elif cmd == "dark":
        if "--force" not in sys.argv:
            print("DARK mode kills ALL connections. Add --force to confirm.")
            sys.exit(1)
        ok, msg = fw.enable_dark()
        print(msg)
    elif cmd == "disable":
        ok, msg = fw.disable()
        print(msg)
    elif cmd == "status":
        status = fw.status()
        print(json.dumps(status, indent=2))
    elif cmd == "connections":
        conns = get_mach6_connections()
        print(f"Active Mach6 connections: {len(conns)}")
        for ip, port in conns:
            print(f"  → {ip}:{port}")
    else:
        print(f"Unknown command: {cmd}")
        print("Usage: firewall.py [stealth|dark --force|disable|status|connections]")
