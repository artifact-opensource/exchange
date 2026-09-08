"""
Worker Base — Abstract daemon loop for intelligence workers
=============================================================
Each worker:
  1. Polls data sources on a configurable interval
  2. Classifies with fast LLM (Cerebras)
  3. Escalates anomalies to deep LLM (SambaNova DeepSeek)
  4. Writes intel to Redis stream
  5. Tracks its own health metrics
"""

import os
import json
import time
import asyncio
import logging
from abc import ABC, abstractmethod
from typing import Optional
from datetime import datetime, timezone

import redis.asyncio as aioredis

log = logging.getLogger("gdi.worker")

REDIS_URL = os.environ.get("REDIS_URL", "redis://localhost:6379")
STREAM_KEY = "gdi:intel"          # Main intelligence stream
STREAM_MAXLEN = 10000             # Rolling window
HEALTH_KEY = "gdi:workers:health" # Hash of worker health


class IntelItem:
    """A single intelligence item to push to the stream."""

    def __init__(self, worker: str, category: str, severity: str,
                 title: str, body: dict, source: str = "",
                 lat: float = 0, lon: float = 0,
                 tags: list[str] = None):
        self.worker = worker
        self.category = category       # finint, osint, geoint
        self.severity = severity       # info, watch, alert, critical
        self.title = title
        self.body = body
        self.source = source
        self.lat = lat
        self.lon = lon
        self.tags = tags or []
        self.timestamp = datetime.now(timezone.utc).isoformat()

    def to_dict(self) -> dict:
        return {
            "worker": self.worker,
            "category": self.category,
            "severity": self.severity,
            "title": self.title,
            "body": json.dumps(self.body),
            "source": self.source,
            "lat": str(self.lat),
            "lon": str(self.lon),
            "tags": json.dumps(self.tags),
            "timestamp": self.timestamp,
        }


class BaseWorker(ABC):
    """Abstract intelligence worker daemon."""

    def __init__(self, name: str, interval: float = 60.0):
        self.name = name
        self.interval = interval
        self._redis: Optional[aioredis.Redis] = None
        self._running = False
        self._stats = {
            "cycles": 0,
            "items_produced": 0,
            "errors": 0,
            "last_cycle": None,
            "last_error": None,
            "started_at": None,
        }
        self._log = logging.getLogger(f"gdi.worker.{name}")

    async def start(self):
        """Start the worker daemon loop."""
        self._log.info(f"Starting {self.name} worker (interval={self.interval}s)")
        self._running = True
        self._stats["started_at"] = datetime.now(timezone.utc).isoformat()

        try:
            self._redis = aioredis.from_url(REDIS_URL, decode_responses=True)
            await self._redis.ping()
            self._log.info("Redis connected")
        except Exception as e:
            self._log.error(f"Redis connection failed: {e}")
            self._redis = None

        await self.on_start()

        while self._running:
            cycle_start = time.monotonic()
            try:
                items = await self.cycle()
                self._stats["cycles"] += 1
                self._stats["last_cycle"] = datetime.now(timezone.utc).isoformat()

                if items:
                    for item in items:
                        await self._push_intel(item)
                    self._stats["items_produced"] += len(items)
                    self._log.info(f"Cycle {self._stats['cycles']}: "
                                  f"produced {len(items)} items")
                else:
                    self._log.debug(f"Cycle {self._stats['cycles']}: no items")

                await self._report_health()

            except Exception as e:
                self._stats["errors"] += 1
                self._stats["last_error"] = f"{datetime.now(timezone.utc).isoformat()}: {e}"
                self._log.error(f"Cycle error: {e}", exc_info=True)

            # Sleep for remaining interval
            elapsed = time.monotonic() - cycle_start
            sleep_time = max(0, self.interval - elapsed)
            if sleep_time > 0:
                await asyncio.sleep(sleep_time)

    async def stop(self):
        """Graceful shutdown."""
        self._log.info(f"Stopping {self.name} worker")
        self._running = False
        await self.on_stop()
        if self._redis:
            await self._redis.close()

    @abstractmethod
    async def cycle(self) -> list[IntelItem]:
        """One cycle of data ingestion + classification.
        Return a list of IntelItems to push to the stream."""
        ...

    async def on_start(self):
        """Override for startup initialization."""
        pass

    async def on_stop(self):
        """Override for cleanup."""
        pass

    async def _push_intel(self, item: IntelItem):
        """Push an intel item to the Redis stream."""
        if not self._redis:
            self._log.warning("Redis unavailable, dropping intel item")
            return

        try:
            await self._redis.xadd(
                STREAM_KEY,
                item.to_dict(),
                maxlen=STREAM_MAXLEN,
            )
        except Exception as e:
            self._log.error(f"Failed to push to stream: {e}")

    async def _report_health(self):
        """Report worker health to Redis hash."""
        if not self._redis:
            return
        try:
            await self._redis.hset(HEALTH_KEY, self.name, json.dumps({
                "status": "running",
                "cycles": self._stats["cycles"],
                "items": self._stats["items_produced"],
                "errors": self._stats["errors"],
                "last_cycle": self._stats["last_cycle"],
                "last_error": self._stats["last_error"],
                "uptime_s": round(time.monotonic() - time.monotonic(), 0)  # placeholder
            }))
        except Exception:
            pass

    @property
    def stats(self) -> dict:
        return dict(self._stats)
