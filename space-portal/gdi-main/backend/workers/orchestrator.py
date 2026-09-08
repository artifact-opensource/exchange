"""
Worker Orchestrator — Manages all intelligence daemons
========================================================
Starts/stops workers, consumes the Redis intel stream,
and provides an API for health monitoring.

Usage:
  python -m workers.orchestrator              # Run all workers
  python -m workers.orchestrator --finint     # Run FININT only
  python -m workers.orchestrator --status     # Check worker health
"""

import os
import sys
import json
import asyncio
import signal
import logging
from datetime import datetime, timezone
from typing import Optional
from pathlib import Path

# Add parent to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from dotenv import load_dotenv
load_dotenv(Path(__file__).resolve().parent.parent.parent / ".env")

import redis.asyncio as aioredis

from workers.base import STREAM_KEY, HEALTH_KEY
from workers.finint_worker import FININTWorker
from workers.osint_worker import OSINTWorker
from workers.geoint_worker import GEOINTWorker
from workers.llm_gateway import llm

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
    datefmt="%H:%M:%S"
)
log = logging.getLogger("gdi.orchestrator")

REDIS_URL = os.environ.get("REDIS_URL", "redis://localhost:6379")

# ─── Stream Consumer ─────────────────────────────────────────

class IntelStreamConsumer:
    """Consumes the Redis intel stream and broadcasts via callbacks.
    The main server.py hooks into this to push to WebSocket clients."""

    def __init__(self):
        self._redis: Optional[aioredis.Redis] = None
        self._callbacks: list = []
        self._running = False
        self._last_id = "$"  # Only new messages

    def on_intel(self, callback):
        """Register a callback for new intelligence items."""
        self._callbacks.append(callback)

    async def start(self):
        self._running = True
        try:
            self._redis = aioredis.from_url(REDIS_URL, decode_responses=True)
            await self._redis.ping()
        except Exception as e:
            log.error(f"Stream consumer Redis error: {e}")
            return

        log.info("Intel stream consumer started")
        while self._running:
            try:
                # Block-read from stream (1 second timeout)
                results = await self._redis.xread(
                    {STREAM_KEY: self._last_id},
                    count=10,
                    block=1000
                )
                if results:
                    for stream_name, messages in results:
                        for msg_id, data in messages:
                            self._last_id = msg_id
                            # Parse body and tags back from JSON strings
                            if "body" in data:
                                try:
                                    data["body"] = json.loads(data["body"])
                                except:
                                    pass
                            if "tags" in data:
                                try:
                                    data["tags"] = json.loads(data["tags"])
                                except:
                                    pass
                            data["_id"] = msg_id

                            for cb in self._callbacks:
                                try:
                                    await cb(data)
                                except Exception as e:
                                    log.error(f"Callback error: {e}")

            except asyncio.CancelledError:
                break
            except Exception as e:
                log.error(f"Stream read error: {e}")
                await asyncio.sleep(2)

    async def stop(self):
        self._running = False
        if self._redis:
            await self._redis.close()


# ─── Orchestrator ─────────────────────────────────────────────

class WorkerOrchestrator:
    """Manages lifecycle of all intelligence workers."""

    def __init__(self):
        self.workers = {}
        self.consumer = IntelStreamConsumer()
        self._tasks: list[asyncio.Task] = []

    def add_worker(self, worker):
        self.workers[worker.name] = worker

    async def start(self):
        log.info(f"╔══════════════════════════════════════════╗")
        log.info(f"║  GDI Intelligence Workers — Starting     ║")
        log.info(f"║  Workers: {', '.join(self.workers.keys()):<30s}║")
        log.info(f"║  LLM: Cerebras (fast) + DeepSeek (deep)  ║")
        log.info(f"╚══════════════════════════════════════════╝")

        # Start workers as tasks
        for name, worker in self.workers.items():
            task = asyncio.create_task(worker.start(), name=f"worker-{name}")
            self._tasks.append(task)
            log.info(f"  ├── {name} worker started (interval={worker.interval}s)")

        # Start stream consumer
        consumer_task = asyncio.create_task(self.consumer.start(), name="consumer")
        self._tasks.append(consumer_task)
        log.info(f"  └── Intel stream consumer started")

        # Wait for all tasks (they run forever)
        try:
            await asyncio.gather(*self._tasks)
        except asyncio.CancelledError:
            pass

    async def stop(self):
        log.info("Shutting down workers...")
        for name, worker in self.workers.items():
            await worker.stop()
        await self.consumer.stop()
        await llm.close()

        for task in self._tasks:
            task.cancel()

        log.info("All workers stopped")

    async def health(self) -> dict:
        """Get health status of all workers."""
        result = {"workers": {}, "llm": llm.stats, "timestamp": datetime.now(timezone.utc).isoformat()}
        for name, worker in self.workers.items():
            result["workers"][name] = worker.stats
        return result


# ─── Main Entry Point ────────────────────────────────────────

async def main():
    import argparse
    parser = argparse.ArgumentParser(description="GDI Intelligence Workers")
    parser.add_argument("--finint", action="store_true", help="Run FININT worker")
    parser.add_argument("--osint", action="store_true", help="Run OSINT worker")
    parser.add_argument("--geoint", action="store_true", help="Run GEOINT worker")
    parser.add_argument("--status", action="store_true", help="Check worker health")
    parser.add_argument("--finint-interval", type=float, default=60, help="FININT poll interval (seconds)")
    parser.add_argument("--osint-interval", type=float, default=120, help="OSINT poll interval (seconds)")
    parser.add_argument("--geoint-interval", type=float, default=300, help="GEOINT poll interval (seconds)")
    args = parser.parse_args()

    if args.status:
        r = aioredis.from_url(REDIS_URL, decode_responses=True)
        health = await r.hgetall(HEALTH_KEY)
        print(json.dumps({k: json.loads(v) for k, v in health.items()}, indent=2))
        await r.close()
        return

    orchestrator = WorkerOrchestrator()

    # If no specific workers requested, run all
    run_all = not (args.finint or args.osint or args.geoint)

    if args.finint or run_all:
        orchestrator.add_worker(FININTWorker(interval=args.finint_interval))
    if args.osint or run_all:
        orchestrator.add_worker(OSINTWorker(interval=args.osint_interval))
    if args.geoint or run_all:
        orchestrator.add_worker(GEOINTWorker(interval=args.geoint_interval))

    # Register log callback for stream consumer
    async def log_intel(data):
        severity = data.get("severity", "info")
        icon = {"info": "📊", "watch": "👁️", "alert": "⚠️", "critical": "🔴"}.get(severity, "📋")
        log.info(f"{icon} [{data.get('worker', '?').upper()}] [{severity.upper()}] {data.get('title', '')}")

    orchestrator.consumer.on_intel(log_intel)

    # Graceful shutdown
    loop = asyncio.get_event_loop()
    for sig in (signal.SIGINT, signal.SIGTERM):
        loop.add_signal_handler(sig, lambda: asyncio.create_task(orchestrator.stop()))

    await orchestrator.start()


if __name__ == "__main__":
    asyncio.run(main())
