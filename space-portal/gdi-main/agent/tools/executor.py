"""
VALKYRIE Tool Executor — Executes GDI-specific tools.

Routes tool calls to the GDI backend API and VALKYRIE's local memory.
Extends Plug's base ToolExecutor for GDI domain operations.
"""

from __future__ import annotations

import json
import logging
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import httpx

logger = logging.getLogger("valkyrie.tools")

GDI_API_BASE = os.environ.get("GDI_API_BASE", "http://localhost:8600/api")
GDI_AGENT_DIR = Path(__file__).parent.parent
DB_PATH = GDI_AGENT_DIR / "memory" / "valkyrie.db"


class ValkyrieToolExecutor:
    """Executes VALKYRIE-specific tool calls against the GDI backend."""

    def __init__(self, api_base: str = GDI_API_BASE, db_path: str | Path = DB_PATH):
        self.api_base = api_base.rstrip("/")
        self.db_path = Path(db_path)
        self._http = httpx.AsyncClient(timeout=30.0)
        self._db = None

    async def _get_db(self):
        """Lazy-init the VALKYRIE memory database."""
        if self._db is None:
            from .memory_init import init_db
            self._db = init_db(str(self.db_path))
        return self._db

    async def close(self):
        await self._http.aclose()

    async def execute(self, name: str, arguments: dict[str, Any]) -> str:
        """Dispatch a VALKYRIE tool call."""
        handlers = {
            "fly_to": self._fly_to,
            "toggle_layer": self._toggle_layer,
            "set_filter": self._set_filter,
            "query_flights": self._query_flights,
            "query_seismic": self._query_seismic,
            "query_satellites": self._query_satellites,
            "analyze_region": self._analyze_region,
            "capture_view": self._capture_view,
            "valkyrie_remember": self._remember,
            "valkyrie_recall": self._recall,
        }

        handler = handlers.get(name)
        if not handler:
            return json.dumps({"error": f"Unknown VALKYRIE tool: {name}"})

        try:
            return await handler(**arguments)
        except Exception as e:
            logger.error("VALKYRIE tool %s failed: %s", name, e, exc_info=True)
            return json.dumps({"error": f"{name} failed: {e}"})

    # ── Map Navigation ───────────────────────────────────────────────

    async def _fly_to(
        self,
        location: str,
        altitude: float | None = None,
        heading: float = 0,
        pitch: float = -90,
    ) -> str:
        """Navigate camera to a location."""
        try:
            resp = await self._http.post(f"{self.api_base}/ai/fly-to", json={
                "location": location,
                "altitude": altitude,
                "heading": heading,
                "pitch": pitch,
            })
            if resp.status_code == 200:
                return json.dumps(resp.json())
            else:
                return json.dumps({
                    "error": f"GDI API returned {resp.status_code}",
                    "detail": resp.text[:500],
                })
        except httpx.ConnectError:
            return json.dumps({"error": "GDI backend not reachable. Is it running on port 8600?"})

    # ── Layer Control ────────────────────────────────────────────────

    async def _toggle_layer(self, layer: str, enabled: bool | None = None) -> str:
        """Toggle a data layer."""
        try:
            resp = await self._http.post(f"{self.api_base}/ai/layer", json={
                "layer": layer,
                "enabled": enabled,
            })
            if resp.status_code == 200:
                return json.dumps(resp.json())
            else:
                return json.dumps({"error": f"GDI API returned {resp.status_code}"})
        except httpx.ConnectError:
            return json.dumps({"error": "GDI backend not reachable."})

    # ── Visual Filters ───────────────────────────────────────────────

    async def _set_filter(self, mode: str) -> str:
        """Apply a visual filter."""
        try:
            resp = await self._http.post(f"{self.api_base}/ai/filter", json={
                "mode": mode,
            })
            if resp.status_code == 200:
                return json.dumps(resp.json())
            else:
                return json.dumps({"error": f"GDI API returned {resp.status_code}"})
        except httpx.ConnectError:
            return json.dumps({"error": "GDI backend not reachable."})

    # ── Data Queries ─────────────────────────────────────────────────

    async def _query_flights(self, **kwargs) -> str:
        """Query flight data with filters."""
        try:
            resp = await self._http.get(f"{self.api_base}/flights", params={
                k: v for k, v in kwargs.items() if v is not None
            })
            if resp.status_code == 200:
                data = resp.json()
                # Summarize if too many results
                flights = data.get("flights", data.get("data", []))
                summary = {
                    "total": len(flights) if isinstance(flights, list) else "unknown",
                    "query": kwargs,
                    "flights": flights[:50] if isinstance(flights, list) else flights,
                    "truncated": len(flights) > 50 if isinstance(flights, list) else False,
                }
                return json.dumps(summary)
            else:
                return json.dumps({"error": f"Flight API returned {resp.status_code}"})
        except httpx.ConnectError:
            return json.dumps({"error": "GDI backend not reachable."})

    async def _query_seismic(self, **kwargs) -> str:
        """Query seismic data with filters."""
        try:
            resp = await self._http.get(f"{self.api_base}/seismic", params={
                k: v for k, v in kwargs.items() if v is not None
            })
            if resp.status_code == 200:
                data = resp.json()
                events = data.get("events", data.get("data", []))
                summary = {
                    "total": len(events) if isinstance(events, list) else "unknown",
                    "query": kwargs,
                    "events": events[:50] if isinstance(events, list) else events,
                }
                return json.dumps(summary)
            else:
                return json.dumps({"error": f"Seismic API returned {resp.status_code}"})
        except httpx.ConnectError:
            return json.dumps({"error": "GDI backend not reachable."})

    async def _query_satellites(self, **kwargs) -> str:
        """Query satellite data."""
        try:
            resp = await self._http.get(f"{self.api_base}/satellites", params={
                k: v for k, v in kwargs.items() if v is not None
            })
            if resp.status_code == 200:
                return json.dumps(resp.json())
            else:
                return json.dumps({"error": f"Satellite API returned {resp.status_code}"})
        except httpx.ConnectError:
            return json.dumps({"error": "GDI backend not reachable."})

    # ── Analysis ─────────────────────────────────────────────────────

    async def _analyze_region(
        self,
        region: str,
        focus: str = "all",
        hours: float = 24,
    ) -> str:
        """Multi-source intelligence analysis."""
        try:
            resp = await self._http.post(f"{self.api_base}/ai/analyze", json={
                "region": region,
                "focus": focus,
                "hours": hours,
            })
            if resp.status_code == 200:
                return json.dumps(resp.json())
            else:
                return json.dumps({"error": f"Analysis API returned {resp.status_code}"})
        except httpx.ConnectError:
            return json.dumps({"error": "GDI backend not reachable."})

    # ── Screenshot ───────────────────────────────────────────────────

    async def _capture_view(self, label: str = "capture") -> str:
        """Capture current map view."""
        try:
            resp = await self._http.post(f"{self.api_base}/ai/capture", json={
                "label": label,
            })
            if resp.status_code == 200:
                return json.dumps(resp.json())
            else:
                return json.dumps({"error": f"Capture API returned {resp.status_code}"})
        except httpx.ConnectError:
            return json.dumps({"error": "GDI backend not reachable."})

    # ── Memory ───────────────────────────────────────────────────────

    async def _remember(
        self,
        key: str,
        value: str,
        category: str = "general",
    ) -> str:
        """Store knowledge in VALKYRIE's local memory."""
        try:
            db = await self._get_db()
            db.set_knowledge(key, value, category)
            return json.dumps({
                "success": True,
                "key": key,
                "category": category,
                "message": f"Stored: {key}",
            })
        except Exception as e:
            return json.dumps({"error": f"Memory store failed: {e}"})

    async def _recall(self, query: str, k: int = 5) -> str:
        """Search VALKYRIE's local memory."""
        try:
            db = await self._get_db()
            results = db.search(query, k=k)
            return json.dumps({
                "query": query,
                "results": results,
                "count": len(results),
            })
        except Exception as e:
            return json.dumps({"error": f"Memory search failed: {e}"})
