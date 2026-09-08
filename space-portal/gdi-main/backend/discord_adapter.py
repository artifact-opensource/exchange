"""
GDI Discord Adapter — Intelligence Broadcast & Command Interface
================================================================
Connects to Discord via py-cord, consumes the gdi:intel Redis stream,
and broadcasts intelligence items as rich embeds to a configured channel.

Supports slash commands:
  /status   — System health overview
  /intel    — Latest N intelligence items
  /workers  — Worker health details

Usage:
  Standalone:
    python discord_adapter.py

  As part of server lifespan:
    from discord_adapter import start_discord_bot, stop_discord_bot
    await start_discord_bot()
    ...
    await stop_discord_bot()

Environment:
  DISCORD_BOT_TOKEN        — Bot authentication token (required)
  DISCORD_INTEL_CHANNEL_ID — Channel ID for intel broadcasts (required)
  REDIS_URL                — Redis connection URL (default: redis://localhost:6379)
"""

import os
import sys
import json
import asyncio
import logging
from datetime import datetime, timezone
from typing import Optional
from pathlib import Path

# Add parent to path for imports
sys.path.insert(0, str(Path(__file__).resolve().parent))

from dotenv import load_dotenv
load_dotenv(Path(__file__).resolve().parent.parent / ".env")

import discord
from discord import ApplicationContext, Option, Embed, Colour
import redis.asyncio as aioredis

# ─── Configuration ───────────────────────────────────────────

BOT_TOKEN = os.environ.get("DISCORD_BOT_TOKEN", "")
INTEL_CHANNEL_ID = int(os.environ.get("DISCORD_INTEL_CHANNEL_ID", "0"))
REDIS_URL = os.environ.get("REDIS_URL", "redis://localhost:6379")
STREAM_KEY = "gdi:intel"
HEALTH_KEY = "gdi:workers:health"

log = logging.getLogger("gdi.discord")

# ─── Severity Styling ────────────────────────────────────────

SEVERITY_COLORS = {
    "critical": Colour(0xFF0040),
    "alert":    Colour(0xFFB000),
    "watch":    Colour(0xFFD700),
    "info":     Colour(0x00FF9D),
}

SEVERITY_ICONS = {
    "critical": "🔴",
    "alert":    "⚠️",
    "watch":    "👁️",
    "info":     "📊",
}

CATEGORY_ICONS = {
    "finint":  "💹",
    "osint":   "📡",
    "geoint":  "🌍",
    "sigint":  "📻",
    "cyber":   "🛡️",
    "default": "📋",
}


# ─── Embed Builder ────────────────────────────────────────────

def build_intel_embed(data: dict) -> Embed:
    """Build a rich Discord embed from an intel stream item."""
    severity = data.get("severity", "info").lower()
    category = data.get("category", "unknown").lower()
    worker = data.get("worker", "unknown")
    title = data.get("title", "Intelligence Item")
    timestamp_str = data.get("timestamp", "")
    source = data.get("source", "")
    msg_id = data.get("_id", "")

    color = SEVERITY_COLORS.get(severity, Colour(0x808080))
    sev_icon = SEVERITY_ICONS.get(severity, "📋")
    cat_icon = CATEGORY_ICONS.get(category, CATEGORY_ICONS["default"])

    embed = Embed(
        title=f"{sev_icon} {title}",
        color=color,
    )

    # Parse body — could be a dict or string
    body = data.get("body", {})
    if isinstance(body, str):
        try:
            body = json.loads(body)
        except (json.JSONDecodeError, TypeError):
            body = {"summary": body}

    # Build description from body content
    description_parts = []
    if isinstance(body, dict):
        summary = body.get("summary") or body.get("description") or body.get("headline") or ""
        if summary:
            description_parts.append(summary[:1024])

        # Add key details as fields
        detail_keys = [k for k in body.keys() if k not in ("summary", "description", "headline", "raw")]
        for key in detail_keys[:6]:
            value = body[key]
            if isinstance(value, (dict, list)):
                value = json.dumps(value, indent=1)[:256]
            else:
                value = str(value)[:256]
            if value:
                embed.add_field(
                    name=key.replace("_", " ").title(),
                    value=f"```{value}```" if len(value) > 60 else value,
                    inline=len(value) < 40,
                )
    elif body:
        description_parts.append(str(body)[:1024])

    if description_parts:
        embed.description = "\n".join(description_parts)

    # Metadata fields
    embed.add_field(
        name="Classification",
        value=f"{cat_icon} **{category.upper()}** · {severity.upper()}",
        inline=True,
    )
    embed.add_field(name="Worker", value=f"`{worker}`", inline=True)

    if source:
        embed.add_field(name="Source", value=source[:128], inline=True)

    # Coordinates
    lat = data.get("lat", "0")
    lon = data.get("lon", "0")
    try:
        lat_f, lon_f = float(lat), float(lon)
        if lat_f != 0 or lon_f != 0:
            embed.add_field(
                name="Location",
                value=f"`{lat_f:.4f}, {lon_f:.4f}`",
                inline=True,
            )
    except (ValueError, TypeError):
        pass

    # Tags
    tags = data.get("tags", [])
    if isinstance(tags, str):
        try:
            tags = json.loads(tags)
        except (json.JSONDecodeError, TypeError):
            tags = [tags] if tags else []
    if tags:
        tag_str = " ".join(f"`{t}`" for t in tags[:8])
        embed.add_field(name="Tags", value=tag_str, inline=False)

    # Footer
    footer_parts = [f"GDI System"]
    if msg_id:
        footer_parts.append(f"ID: {msg_id}")
    embed.set_footer(text=" · ".join(footer_parts))

    # Timestamp
    if timestamp_str:
        try:
            embed.timestamp = datetime.fromisoformat(timestamp_str)
        except (ValueError, TypeError):
            embed.timestamp = datetime.now(timezone.utc)
    else:
        embed.timestamp = datetime.now(timezone.utc)

    return embed


def build_status_embed(system_info: dict, worker_health: dict) -> Embed:
    """Build a system status embed."""
    redis_status = system_info.get("redis", "unknown")
    ws_clients = system_info.get("ws_clients", 0)
    mode = system_info.get("mode", "UNKNOWN")

    mode_color = {
        "FULL_ONLINE": Colour(0x00FF9D),
        "DEGRADED": Colour(0xFFB000),
    }.get(mode, Colour(0x808080))

    embed = Embed(
        title="⚡ GDI System Status",
        color=mode_color,
    )

    embed.add_field(name="Mode", value=f"**{mode}**", inline=True)
    embed.add_field(name="Redis", value=redis_status, inline=True)
    embed.add_field(name="WebSocket Clients", value=str(ws_clients), inline=True)

    # Worker summary
    if worker_health:
        worker_lines = []
        for name, health in worker_health.items():
            if isinstance(health, str):
                try:
                    health = json.loads(health)
                except (json.JSONDecodeError, TypeError):
                    health = {}
            status = health.get("status", "unknown")
            cycles = health.get("cycles", 0)
            items = health.get("items", 0)
            errors = health.get("errors", 0)
            icon = "🟢" if status == "running" and errors == 0 else "🟡" if status == "running" else "🔴"
            worker_lines.append(
                f"{icon} **{name.upper()}** — {cycles} cycles · {items} items · {errors} errors"
            )
        embed.add_field(
            name="Intelligence Workers",
            value="\n".join(worker_lines) if worker_lines else "No workers reporting",
            inline=False,
        )
    else:
        embed.add_field(name="Workers", value="No health data available", inline=False)

    embed.set_footer(text="GDI System · Artifact Virtual")
    embed.timestamp = datetime.now(timezone.utc)
    return embed


def build_worker_embed(worker_health: dict) -> Embed:
    """Build a detailed worker health embed."""
    embed = Embed(
        title="🔧 Worker Health Details",
        color=Colour(0x00FF9D),
    )

    if not worker_health:
        embed.description = "No worker health data available. Workers may not be running."
        embed.color = Colour(0xFFB000)
        embed.set_footer(text="GDI System")
        embed.timestamp = datetime.now(timezone.utc)
        return embed

    for name, health in worker_health.items():
        if isinstance(health, str):
            try:
                health = json.loads(health)
            except (json.JSONDecodeError, TypeError):
                health = {}

        status = health.get("status", "unknown")
        cycles = health.get("cycles", 0)
        items = health.get("items", 0)
        errors = health.get("errors", 0)
        last_cycle = health.get("last_cycle", "never")
        last_error = health.get("last_error", "none")

        icon = "🟢" if status == "running" and errors == 0 else "🟡" if status == "running" else "🔴"

        detail_lines = [
            f"Status: {icon} {status}",
            f"Cycles: {cycles}",
            f"Items Produced: {items}",
            f"Errors: {errors}",
            f"Last Cycle: {last_cycle}",
        ]
        if last_error and last_error != "none" and last_error != "None":
            detail_lines.append(f"Last Error: {last_error[:200]}")

        embed.add_field(
            name=f"{CATEGORY_ICONS.get(name, '📋')} {name.upper()}",
            value="```\n" + "\n".join(detail_lines) + "\n```",
            inline=False,
        )

    embed.set_footer(text="GDI System · Artifact Virtual")
    embed.timestamp = datetime.now(timezone.utc)
    return embed


# ─── Bot ──────────────────────────────────────────────────────

class GDIBot(discord.Bot):
    """GDI Discord bot with Redis intel stream consumer."""

    def __init__(self, *args, **kwargs):
        intents = discord.Intents.default()
        intents.message_content = False  # We don't need message content
        super().__init__(*args, intents=intents, **kwargs)

        self._redis: Optional[aioredis.Redis] = None
        self._consumer_task: Optional[asyncio.Task] = None
        self._intel_channel: Optional[discord.TextChannel] = None

    async def on_ready(self):
        log.info(f"GDI Discord bot online: {self.user} (ID: {self.user.id})")
        log.info(f"Connected to {len(self.guilds)} guild(s)")

        # Resolve intel channel
        if INTEL_CHANNEL_ID:
            self._intel_channel = self.get_channel(INTEL_CHANNEL_ID)
            if self._intel_channel:
                log.info(f"Intel broadcast channel: #{self._intel_channel.name} ({INTEL_CHANNEL_ID})")
            else:
                log.warning(f"Intel channel {INTEL_CHANNEL_ID} not found — broadcasts disabled")
        else:
            log.warning("DISCORD_INTEL_CHANNEL_ID not set — broadcasts disabled")

        # Start Redis consumer
        await self._start_consumer()

    async def _start_consumer(self):
        """Start consuming the gdi:intel Redis stream."""
        try:
            self._redis = aioredis.from_url(REDIS_URL, decode_responses=True)
            await self._redis.ping()
            log.info("Redis connected for intel stream consumption")
        except Exception as e:
            log.error(f"Redis connection failed: {e} — stream consumption disabled")
            self._redis = None
            return

        self._consumer_task = asyncio.create_task(self._consume_stream())

    async def _consume_stream(self):
        """Continuously read from gdi:intel and broadcast to Discord."""
        last_id = "$"  # Only new messages from this point forward
        log.info("Intel stream consumer started")

        while True:
            try:
                results = await self._redis.xread(
                    {STREAM_KEY: last_id}, count=10, block=2000
                )
                if results:
                    for _, messages in results:
                        for msg_id, data in messages:
                            last_id = msg_id
                            await self._broadcast_intel(msg_id, data)

            except asyncio.CancelledError:
                log.info("Intel stream consumer cancelled")
                break
            except Exception as e:
                log.error(f"Stream consumer error: {e}")
                await asyncio.sleep(5)

    async def _broadcast_intel(self, msg_id: str, data: dict):
        """Send an intel item to the Discord channel as a rich embed."""
        if not self._intel_channel:
            return

        # Parse JSON fields
        for field in ("body", "tags"):
            if field in data and isinstance(data[field], str):
                try:
                    data[field] = json.loads(data[field])
                except (json.JSONDecodeError, TypeError):
                    pass
        data["_id"] = msg_id

        try:
            embed = build_intel_embed(data)
            await self._intel_channel.send(embed=embed)
            log.debug(f"Broadcast intel {msg_id} to #{self._intel_channel.name}")
        except discord.Forbidden:
            log.error(f"Missing permissions to send to #{self._intel_channel.name}")
        except discord.HTTPException as e:
            log.error(f"Failed to send embed: {e}")

    async def _get_redis(self) -> Optional[aioredis.Redis]:
        """Get or reconnect Redis."""
        if self._redis:
            try:
                await self._redis.ping()
                return self._redis
            except Exception:
                pass
        try:
            self._redis = aioredis.from_url(REDIS_URL, decode_responses=True)
            await self._redis.ping()
            return self._redis
        except Exception:
            return None

    async def get_worker_health(self) -> dict:
        """Fetch worker health from Redis."""
        r = await self._get_redis()
        if not r:
            return {}
        try:
            return await r.hgetall(HEALTH_KEY)
        except Exception as e:
            log.error(f"Failed to fetch worker health: {e}")
            return {}

    async def get_recent_intel(self, limit: int = 5) -> list[dict]:
        """Fetch recent intel items from the stream."""
        r = await self._get_redis()
        if not r:
            return []
        try:
            raw = await r.xrevrange(STREAM_KEY, count=limit)
            items = []
            for msg_id, data in raw:
                for field in ("body", "tags"):
                    if field in data and isinstance(data[field], str):
                        try:
                            data[field] = json.loads(data[field])
                        except (json.JSONDecodeError, TypeError):
                            pass
                data["_id"] = msg_id
                items.append(data)
            return items
        except Exception as e:
            log.error(f"Failed to fetch intel: {e}")
            return []

    async def close(self):
        """Clean shutdown."""
        if self._consumer_task and not self._consumer_task.done():
            self._consumer_task.cancel()
            try:
                await self._consumer_task
            except asyncio.CancelledError:
                pass
        if self._redis:
            await self._redis.close()
        await super().close()


# ─── Bot Instance & Commands ──────────────────────────────────

bot = GDIBot()


@bot.slash_command(name="status", description="Show GDI system health and status")
async def cmd_status(ctx: ApplicationContext):
    """System health overview."""
    await ctx.defer()

    # Gather system info
    r = await bot._get_redis()
    redis_status = "connected" if r else "disconnected"
    ws_clients = 0  # Not available from Discord adapter directly
    mode = "FULL_ONLINE" if r else "DEGRADED"

    system_info = {
        "redis": redis_status,
        "ws_clients": ws_clients,
        "mode": mode,
    }

    worker_health = await bot.get_worker_health()
    embed = build_status_embed(system_info, worker_health)
    await ctx.respond(embed=embed)


@bot.slash_command(name="intel", description="Show latest intelligence items")
async def cmd_intel(
    ctx: ApplicationContext,
    count: Option(int, "Number of items (1-25)", min_value=1, max_value=25, default=5),
):
    """Fetch and display recent intelligence items."""
    await ctx.defer()

    items = await bot.get_recent_intel(limit=count)
    if not items:
        embed = Embed(
            title="📋 Intelligence Feed",
            description="No intelligence items available. Workers may not be running.",
            color=Colour(0x808080),
        )
        embed.set_footer(text="GDI System")
        embed.timestamp = datetime.now(timezone.utc)
        await ctx.respond(embed=embed)
        return

    # Send up to 5 embeds in the response, rest as follow-ups
    embeds = [build_intel_embed(item) for item in items]

    # Discord allows up to 10 embeds per message
    batch_size = 5
    for i in range(0, len(embeds), batch_size):
        batch = embeds[i:i + batch_size]
        if i == 0:
            await ctx.respond(embeds=batch)
        else:
            await ctx.followup.send(embeds=batch)


@bot.slash_command(name="workers", description="Show intelligence worker health details")
async def cmd_workers(ctx: ApplicationContext):
    """Detailed worker health report."""
    await ctx.defer()

    worker_health = await bot.get_worker_health()
    embed = build_worker_embed(worker_health)
    await ctx.respond(embed=embed)


# ─── Lifecycle Helpers (for server.py integration) ────────────

_bot_task: Optional[asyncio.Task] = None


async def start_discord_bot():
    """Start the Discord bot in the background. Non-blocking.

    Call this from server.py lifespan if you want the bot
    running alongside the FastAPI server.
    """
    global _bot_task

    if not BOT_TOKEN:
        log.warning("DISCORD_BOT_TOKEN not set — Discord adapter disabled")
        return

    if not INTEL_CHANNEL_ID:
        log.warning("DISCORD_INTEL_CHANNEL_ID not set — broadcasts will be disabled")

    async def _run():
        try:
            await bot.start(BOT_TOKEN)
        except discord.LoginFailure:
            log.error("Invalid Discord bot token")
        except Exception as e:
            log.error(f"Discord bot error: {e}")

    _bot_task = asyncio.create_task(_run())
    log.info("Discord adapter starting in background")


async def stop_discord_bot():
    """Gracefully stop the Discord bot."""
    global _bot_task

    if bot and not bot.is_closed():
        await bot.close()
        log.info("Discord bot closed")

    if _bot_task and not _bot_task.done():
        _bot_task.cancel()
        try:
            await _bot_task
        except asyncio.CancelledError:
            pass


# ─── Standalone Entry Point ──────────────────────────────────

def main():
    """Run the Discord adapter as a standalone process."""
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
        datefmt="%H:%M:%S",
    )

    if not BOT_TOKEN:
        log.error("DISCORD_BOT_TOKEN not set. Cannot start.")
        log.error("Set it in .env or export DISCORD_BOT_TOKEN=your_token")
        sys.exit(1)

    if not INTEL_CHANNEL_ID:
        log.warning("DISCORD_INTEL_CHANNEL_ID not set — intel broadcasts disabled")

    log.info("╔══════════════════════════════════════════╗")
    log.info("║  GDI Discord Adapter — Starting          ║")
    log.info("║  Intel Stream: gdi:intel                  ║")
    log.info(f"║  Channel: {INTEL_CHANNEL_ID:<30}║")
    log.info("╚══════════════════════════════════════════╝")

    bot.run(BOT_TOKEN)


if __name__ == "__main__":
    main()
