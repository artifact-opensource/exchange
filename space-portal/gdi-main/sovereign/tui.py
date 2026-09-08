#!/usr/bin/env python3
"""
SOVEREIGN TUI — Terminal Dashboard for GDI Resilience
======================================================
Rich-based live dashboard showing system status, mode controls,
and service health at a glance.

Launch: sovereign tui
Desktop: Click "Sovereign" desktop icon
"""

import json
import os
import sys
import time
import signal
import subprocess
from pathlib import Path
from datetime import datetime, timezone

from rich.console import Console
from rich.layout import Layout
from rich.live import Live
from rich.panel import Panel
from rich.table import Table
from rich.text import Text
from rich.align import Align
from rich import box

STATE_FILE = Path("/tmp/sovereign-state.json")
LOCK_FILE = Path("/tmp/sovereign.lock")
REFRESH_RATE = 2  # seconds

console = Console()

# ─── Colors & Icons ────────────────────────────────────────────

MODE_STYLES = {
    "cloud": {"icon": "☁️ ", "color": "bold green", "bg": "on black"},
    "degraded": {"icon": "⚡", "color": "bold yellow", "bg": "on black"},
    "offline": {"icon": "📡", "color": "bold red", "bg": "on black"},
    "stealth": {"icon": "🔒", "color": "bold cyan", "bg": "on black"},
    "dark": {"icon": "🌑", "color": "bold white on red", "bg": "on red"},
    "initializing": {"icon": "⏳", "color": "bold white", "bg": "on black"},
    "unknown": {"icon": "❓", "color": "dim", "bg": "on black"},
}

SVC_UP = "[bold green]●[/bold green]"
SVC_DOWN = "[bold red]●[/bold red]"
SVC_WARN = "[bold yellow]●[/bold yellow]"


def read_state() -> dict:
    """Read daemon state"""
    try:
        if STATE_FILE.exists():
            return json.loads(STATE_FILE.read_text())
    except Exception:
        pass
    return {}


def is_daemon_running() -> tuple:
    """Check if daemon PID is alive"""
    if not LOCK_FILE.exists():
        return False, None
    try:
        pid = int(LOCK_FILE.read_text().strip())
        os.kill(pid, 0)
        return True, pid
    except (ValueError, ProcessLookupError, PermissionError):
        return False, None


def format_uptime(seconds: float) -> str:
    if seconds < 60:
        return f"{int(seconds)}s"
    elif seconds < 3600:
        return f"{int(seconds // 60)}m {int(seconds % 60)}s"
    else:
        h = int(seconds // 3600)
        m = int((seconds % 3600) // 60)
        return f"{h}h {m}m"


def make_header(state: dict) -> Panel:
    """Mode banner"""
    mode = state.get("mode", "unknown")
    style = MODE_STYLES.get(mode, MODE_STYLES["unknown"])

    mode_text = Text()
    mode_text.append(f" {style['icon']} ", style="bold")
    mode_text.append(f" {mode.upper()} ", style=style["color"])

    running, pid = is_daemon_running()
    uptime = format_uptime(state.get("uptime", 0))

    status_line = Text()
    if running:
        status_line.append(f"  Daemon: PID {pid}  │  Uptime: {uptime}", style="dim")
    else:
        status_line.append("  Daemon: NOT RUNNING", style="bold red")

    content = Text()
    content.append_text(mode_text)
    content.append("\n")
    content.append_text(status_line)

    return Panel(
        Align.center(content),
        title="[bold]S O V E R E I G N[/bold]",
        subtitle="[dim]GDI Resilience Core[/dim]",
        border_style="bright_blue",
        box=box.DOUBLE,
        padding=(1, 2),
    )


def make_services_table(state: dict) -> Panel:
    """Service health table"""
    health = state.get("health", {})

    table = Table(show_header=True, header_style="bold cyan", box=box.SIMPLE_HEAVY, expand=True)
    table.add_column("Service", style="bold", min_width=18)
    table.add_column("Status", justify="center", min_width=8)
    table.add_column("Detail", style="dim")

    # Mach6 Gateway
    gw_up = health.get("mach6_gateway", False)
    table.add_row(
        "Mach6 Gateway",
        SVC_UP if gw_up else SVC_DOWN,
        "systemd active" if gw_up else "not running",
    )

    # WhatsApp
    wa_up = health.get("mach6_whatsapp", False)
    table.add_row(
        "  ├─ WhatsApp",
        SVC_UP if wa_up else SVC_DOWN,
        "connected" if wa_up else "disconnected",
    )

    # Discord
    dc_up = health.get("mach6_discord", False)
    table.add_row(
        "  └─ Discord",
        SVC_UP if dc_up else SVC_DOWN,
        "connected" if dc_up else "disconnected",
    )

    # Ollama
    ol_up = health.get("ollama", False)
    ol_model = health.get("ollama_model", "")
    table.add_row(
        "Ollama",
        SVC_UP if ol_up else SVC_DOWN,
        ol_model if ol_up else "not available",
    )

    # Cloud API
    cloud_up = health.get("cloud_api", False)
    table.add_row(
        "Cloud API",
        SVC_UP if cloud_up else SVC_DOWN,
        "reachable" if cloud_up else "unreachable",
    )

    # MQTT
    mqtt_up = health.get("mqtt", False)
    table.add_row("MQTT", SVC_UP if mqtt_up else SVC_DOWN, ":1883" if mqtt_up else "—")

    # PostgreSQL
    pg_up = health.get("postgresql", False)
    table.add_row("PostgreSQL", SVC_UP if pg_up else SVC_DOWN, ":5432" if pg_up else "—")

    return Panel(
        table,
        title="[bold]Services[/bold]",
        border_style="blue",
        box=box.ROUNDED,
    )


def make_comms_panel(state: dict) -> Panel:
    """Comms status panel"""
    health = state.get("health", {})
    comms_ok = state.get("comms_ok", False)
    fw_active = state.get("firewall_active", False)
    fw_level = state.get("firewall_level", "none")

    lines = []

    # Comms status
    if comms_ok:
        lines.append(Text("COMMS: OPERATIONAL", style="bold green"))
    else:
        lines.append(Text("COMMS: DOWN", style="bold red blink"))

    lines.append(Text(""))

    # Channel status
    wa = health.get("mach6_whatsapp", False)
    dc = health.get("mach6_discord", False)
    lines.append(Text(f"  WhatsApp  {'✅' if wa else '❌'}", style="green" if wa else "red"))
    lines.append(Text(f"  Discord   {'✅' if dc else '❌'}", style="green" if dc else "red"))
    lines.append(Text(f"  MQTT      {'✅' if health.get('mqtt') else '❌'}",
                       style="green" if health.get("mqtt") else "dim"))

    lines.append(Text(""))

    # Firewall
    if fw_active:
        fw_style = "bold cyan" if fw_level == "stealth" else "bold red"
        lines.append(Text(f"  🔥 Firewall: {fw_level.upper()}", style=fw_style))
    else:
        lines.append(Text("  🔥 Firewall: OFF", style="dim"))

    content = Text("\n").join(lines)
    return Panel(
        content,
        title="[bold]Comms & Firewall[/bold]",
        border_style="magenta",
        box=box.ROUNDED,
    )


def make_transitions_panel(state: dict) -> Panel:
    """Recent mode transitions"""
    transitions = state.get("transitions", [])

    if not transitions:
        content = Text("No transitions yet", style="dim")
    else:
        lines = []
        for t in reversed(transitions[-8:]):
            ts = t.get("timestamp", "")
            if ts:
                try:
                    dt = datetime.fromisoformat(ts)
                    ts = dt.strftime("%H:%M:%S")
                except Exception:
                    ts = ts[:8]

            line = Text()
            line.append(f"  {ts}  ", style="dim")
            line.append(f"{t.get('from', '?')}", style="yellow")
            line.append(" → ", style="dim")
            line.append(f"{t.get('to', '?')}", style="cyan")
            line.append(f"  {t.get('reason', '')}", style="dim italic")
            lines.append(line)
        content = Text("\n").join(lines)

    return Panel(
        content,
        title="[bold]Transitions[/bold]",
        border_style="yellow",
        box=box.ROUNDED,
    )


def make_errors_panel(state: dict) -> Panel:
    """Recent errors"""
    errors = state.get("errors", [])

    if not errors:
        content = Text("No errors", style="dim green")
    else:
        lines = []
        for e in reversed(errors[-5:]):
            ts = e.get("timestamp", "")
            if ts:
                try:
                    dt = datetime.fromisoformat(ts)
                    ts = dt.strftime("%H:%M:%S")
                except Exception:
                    ts = ts[:8]

            line = Text()
            line.append(f"  {ts}  ", style="dim")
            line.append(e.get("error", "?"), style="red")
            lines.append(line)
        content = Text("\n").join(lines)

    return Panel(
        content,
        title="[bold]Errors[/bold]",
        border_style="red",
        box=box.ROUNDED,
    )


def make_controls_panel() -> Panel:
    """Keyboard controls help"""
    help_text = Text()
    help_text.append("  Commands (run in another terminal):\n\n", style="dim")
    help_text.append("  sovereign start", style="bold cyan")
    help_text.append("       — Start daemon\n", style="dim")
    help_text.append("  sovereign stop", style="bold cyan")
    help_text.append("        — Stop daemon\n", style="dim")
    help_text.append("  sovereign stealth", style="bold cyan")
    help_text.append("     — Enable stealth (comms preserved)\n", style="dim")
    help_text.append("  sovereign dark", style="bold yellow")
    help_text.append("        — Go dark (kills comms!)\n", style="dim")
    help_text.append("  sovereign restore", style="bold green")
    help_text.append("     — Disable firewall\n", style="dim")
    help_text.append("  sovereign status", style="bold cyan")
    help_text.append("      — JSON status dump\n", style="dim")
    help_text.append("\n  Ctrl+C", style="bold")
    help_text.append(" — Exit TUI (daemon keeps running)", style="dim")

    return Panel(
        help_text,
        title="[bold]Controls[/bold]",
        border_style="green",
        box=box.ROUNDED,
    )


def build_layout(state: dict) -> Layout:
    """Build the full dashboard layout"""
    layout = Layout()

    layout.split_column(
        Layout(name="header", size=6),
        Layout(name="body"),
        Layout(name="footer", size=12),
    )

    layout["body"].split_row(
        Layout(name="left", ratio=3),
        Layout(name="right", ratio=2),
    )

    layout["right"].split_column(
        Layout(name="comms"),
        Layout(name="controls"),
    )

    layout["footer"].split_row(
        Layout(name="transitions", ratio=3),
        Layout(name="errors", ratio=2),
    )

    # Populate
    layout["header"].update(make_header(state))
    layout["left"].update(make_services_table(state))
    layout["comms"].update(make_comms_panel(state))
    layout["controls"].update(make_controls_panel())
    layout["transitions"].update(make_transitions_panel(state))
    layout["errors"].update(make_errors_panel(state))

    return layout


def run_tui():
    """Run the live TUI dashboard"""
    console.clear()

    try:
        with Live(
            build_layout({}),
            console=console,
            refresh_per_second=1,
            screen=True,
        ) as live:
            while True:
                state = read_state()
                if not state:
                    state = {
                        "mode": "unknown",
                        "health": {},
                        "comms_ok": False,
                        "uptime": 0,
                        "transitions": [],
                        "errors": [{"error": "Daemon not running or state file missing", "timestamp": datetime.now(timezone.utc).isoformat()}],
                    }
                live.update(build_layout(state))
                time.sleep(REFRESH_RATE)

    except KeyboardInterrupt:
        console.clear()
        console.print("[dim]TUI closed. Daemon still running.[/dim]")


if __name__ == "__main__":
    run_tui()
