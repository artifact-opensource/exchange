"""
VALKYRIE — GDI Integrated AI Engine
Embedded Claude-powered intelligence analyst.
No external framework dependency — calls copilot proxy directly.

Architecture:
  Frontend (WebSocket) → server.py → ValkyrieEngine → copilot proxy (Claude) → tool execution → response
"""

import os
import json
import time
import asyncio
import sqlite3
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional, AsyncIterator

import aiohttp

log = logging.getLogger("valkyrie")

# ─── Configuration ───────────────────────────────────────────

AI_PROXY_URL = os.environ.get("AI_PROXY_URL", "http://localhost:3000")
AI_MODEL = os.environ.get("AI_MODEL", "claude-sonnet-4.6")  # Fast + capable
AI_TEMPERATURE = float(os.environ.get("AI_TEMPERATURE", "0.2"))
AI_MAX_TOKENS = int(os.environ.get("AI_MAX_TOKENS", "4096"))
DB_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "valkyrie.db")

# ─── System Prompt ───────────────────────────────────────────

SYSTEM_PROMPT = """You are VALKYRIE, the AI analyst for GDI (Global Defense Intelligence).

You operate a real-time global intelligence platform with a 3D globe (CesiumJS), live flight tracking (12,000+ aircraft), seismic monitoring (USGS), satellite tracking (15,000+ objects), and multi-source intelligence feeds (FININT, OSINT, GEOINT).

## Your Tools
You have tools to query live data and control the platform. USE THEM. When a user asks anything about what's happening, current events, data, or situation — IMMEDIATELY call the relevant tools. Do not say "let me pull data" or "stand by" — just call the tools.

## CRITICAL BEHAVIOR RULES
1. **NEVER describe what you would do. DO IT.** Call the tools.
2. **Vague queries = call sitrep.** "What's happening?" / "What just happened?" / "Give me an update" → call `sitrep` immediately.
3. **Multiple tools = call them all at once.** Don't call one and wait.
4. **Never say "I need to run the queries" or "Let me pull data" without actually calling tools in the same response.** That is a failure state.
5. **If you have no tool results yet, call tools. If you have tool results, present them.**

## Communication Style
- Brief, precise, tactical
- Data first, interpretation second
- Format as intelligence briefings when presenting analysis
- Assume the user is competent — don't over-explain
- **After executing ANY tool, ALWAYS respond with text.** Never return an empty response. For navigation: confirm where you flew to. For data queries: present the findings. For layer toggles: confirm the action.

## Rules
- You are VALKYRIE. Not a general-purpose assistant.
- If asked about anything outside geospatial intelligence, redirect politely.
- Execute commands immediately when intent is clear.
- When doing region analysis, correlate all available data sources.
"""

# ─── Tool Definitions (OpenAI function calling format) ───────

TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "fly_to",
            "description": "Navigate the map camera to a location. Accepts place names (cities, countries, landmarks) or coordinates.",
            "parameters": {
                "type": "object",
                "properties": {
                    "location": {
                        "type": "string",
                        "description": "Place name or 'lat,lon' coordinates"
                    },
                    "altitude": {
                        "type": "number",
                        "description": "Camera altitude in meters. Default: auto (40000 for cities, 500000 for countries, 2000000 for continents)"
                    }
                },
                "required": ["location"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "toggle_layer",
            "description": "Enable or disable a data layer on the map.",
            "parameters": {
                "type": "object",
                "properties": {
                    "layer": {
                        "type": "string",
                        "enum": ["flights", "seismic", "satellites", "traffic"],
                        "description": "Layer to toggle"
                    },
                    "enabled": {
                        "type": "boolean",
                        "description": "True to enable, false to disable. Omit to toggle."
                    }
                },
                "required": ["layer"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "set_filter",
            "description": "Apply a visual filter/mode to the display.",
            "parameters": {
                "type": "object",
                "properties": {
                    "mode": {
                        "type": "string",
                        "enum": ["NORMAL", "CRT", "NVG", "FLIR"],
                        "description": "Visual mode. NVG=night vision green, FLIR=thermal, CRT=retro scanlines"
                    }
                },
                "required": ["mode"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "query_flights",
            "description": "Query live flight data. Can filter by region, callsign, altitude, etc.",
            "parameters": {
                "type": "object",
                "properties": {
                    "region": {
                        "type": "string",
                        "description": "Region name to search near (geocoded automatically)"
                    },
                    "callsign": {
                        "type": "string",
                        "description": "Filter by callsign pattern (partial match)"
                    },
                    "min_altitude": {
                        "type": "number",
                        "description": "Minimum altitude in meters"
                    },
                    "max_altitude": {
                        "type": "number",
                        "description": "Maximum altitude in meters"
                    },
                    "on_ground": {
                        "type": "boolean",
                        "description": "Filter for aircraft on ground only"
                    }
                },
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "query_seismic",
            "description": "Query earthquake/seismic data. Can filter by region, magnitude, time period.",
            "parameters": {
                "type": "object",
                "properties": {
                    "region": {
                        "type": "string",
                        "description": "Region name to search near"
                    },
                    "min_magnitude": {
                        "type": "number",
                        "description": "Minimum magnitude filter"
                    },
                    "period": {
                        "type": "string",
                        "enum": ["all_hour", "all_day", "all_week", "all_month"],
                        "description": "Time period. Default: all_day"
                    }
                },
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "analyze_region",
            "description": "Multi-source intelligence analysis for a geographic region. Correlates flight, seismic, and satellite data.",
            "parameters": {
                "type": "object",
                "properties": {
                    "region": {
                        "type": "string",
                        "description": "Region name or coordinates"
                    },
                    "focus": {
                        "type": "string",
                        "enum": ["all", "flights", "seismic", "military"],
                        "description": "Analysis focus. Default: all"
                    }
                },
                "required": ["region"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "capture_view",
            "description": "Capture a screenshot of the current map view.",
            "parameters": {
                "type": "object",
                "properties": {
                    "label": {
                        "type": "string",
                        "description": "Label for the capture file"
                    }
                },
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "remember",
            "description": "Save important information to persistent memory for future reference.",
            "parameters": {
                "type": "object",
                "properties": {
                    "content": {
                        "type": "string",
                        "description": "Information to remember"
                    },
                    "category": {
                        "type": "string",
                        "enum": ["location", "analysis", "preference", "note"],
                        "description": "Category of information"
                    }
                },
                "required": ["content"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "recall",
            "description": "Search persistent memory for previously saved information.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "Search query"
                    }
                },
                "required": ["query"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "sitrep",
            "description": "Generate a full situation report. Pulls ALL live data: flights, seismic, satellites, intel feeds. Use this for any general 'what's happening' / 'sitrep' / 'update me' / 'what just happened' queries.",
            "parameters": {
                "type": "object",
                "properties": {
                    "region": {
                        "type": "string",
                        "description": "Focus region (optional — defaults to global)"
                    }
                },
                "required": []
            }
        }
    }
]


# ─── Memory Database ────────────────────────────────────────

class ValkyrieMemory:
    """SQLite + FTS5 memory for VALKYRIE. Conversation history + knowledge base."""

    def __init__(self, db_path: str = DB_PATH):
        os.makedirs(os.path.dirname(db_path), exist_ok=True)
        self.db = sqlite3.connect(db_path)
        self.db.execute("PRAGMA journal_mode=WAL")
        self._init_tables()

    def _init_tables(self):
        self.db.executescript("""
            CREATE TABLE IF NOT EXISTS conversations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id TEXT NOT NULL,
                role TEXT NOT NULL,
                content TEXT NOT NULL,
                tool_calls TEXT,
                tool_call_id TEXT,
                timestamp REAL NOT NULL DEFAULT (unixepoch('now'))
            );

            CREATE TABLE IF NOT EXISTS knowledge (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                category TEXT NOT NULL DEFAULT 'note',
                content TEXT NOT NULL,
                metadata TEXT,
                created_at REAL NOT NULL DEFAULT (unixepoch('now'))
            );

            CREATE VIRTUAL TABLE IF NOT EXISTS knowledge_fts USING fts5(
                content, category, metadata,
                content='knowledge',
                content_rowid='id'
            );

            CREATE TRIGGER IF NOT EXISTS knowledge_ai AFTER INSERT ON knowledge BEGIN
                INSERT INTO knowledge_fts(rowid, content, category, metadata)
                VALUES (new.id, new.content, new.category, new.metadata);
            END;

            CREATE TRIGGER IF NOT EXISTS knowledge_ad AFTER DELETE ON knowledge BEGIN
                INSERT INTO knowledge_fts(knowledge_fts, rowid, content, category, metadata)
                VALUES ('delete', old.id, old.content, old.category, old.metadata);
            END;
        """)
        self.db.commit()

    def save_message(self, session_id: str, role: str, content: str,
                     tool_calls: list = None, tool_call_id: str = None):
        self.db.execute(
            "INSERT INTO conversations (session_id, role, content, tool_calls, tool_call_id) VALUES (?, ?, ?, ?, ?)",
            (session_id, role, content,
             json.dumps(tool_calls) if tool_calls else None,
             tool_call_id)
        )
        self.db.commit()

    def get_history(self, session_id: str, limit: int = 20) -> list[dict]:
        rows = self.db.execute(
            "SELECT role, content, tool_calls, tool_call_id FROM conversations "
            "WHERE session_id = ? ORDER BY id DESC LIMIT ?",
            (session_id, limit)
        ).fetchall()

        messages = []
        for role, content, tool_calls_json, tool_call_id in reversed(rows):
            msg = {"role": role, "content": content}
            if tool_calls_json:
                msg["tool_calls"] = json.loads(tool_calls_json)
            if tool_call_id:
                msg["tool_call_id"] = tool_call_id
            messages.append(msg)
        return messages

    def remember(self, content: str, category: str = "note", metadata: dict = None):
        self.db.execute(
            "INSERT INTO knowledge (category, content, metadata) VALUES (?, ?, ?)",
            (category, content, json.dumps(metadata) if metadata else None)
        )
        self.db.commit()

    def recall(self, query: str, limit: int = 10) -> list[dict]:
        rows = self.db.execute(
            "SELECT k.id, k.category, k.content, k.metadata, k.created_at "
            "FROM knowledge_fts f JOIN knowledge k ON f.rowid = k.id "
            "WHERE knowledge_fts MATCH ? ORDER BY rank LIMIT ?",
            (query, limit)
        ).fetchall()
        return [
            {"id": r[0], "category": r[1], "content": r[2],
             "metadata": json.loads(r[3]) if r[3] else None,
             "created_at": r[4]}
            for r in rows
        ]

    def close(self):
        self.db.close()


# ─── Tool Executor ───────────────────────────────────────────

class ToolExecutor:
    """Executes VALKYRIE tool calls against GDI backend APIs."""

    def __init__(self, backend_url: str = "http://localhost:8600", memory: ValkyrieMemory = None):
        self.backend_url = backend_url
        self.memory = memory
        self.session: Optional[aiohttp.ClientSession] = None

    async def start(self):
        self.session = aiohttp.ClientSession(
            timeout=aiohttp.ClientTimeout(total=30)
        )

    async def stop(self):
        if self.session:
            await self.session.close()

    async def execute(self, tool_name: str, arguments: dict) -> dict:
        """Execute a tool call and return the result."""
        try:
            handler = getattr(self, f"_tool_{tool_name}", None)
            if handler:
                return await handler(arguments)
            return {"error": f"Unknown tool: {tool_name}"}
        except Exception as e:
            log.error(f"Tool execution error ({tool_name}): {e}")
            return {"error": str(e)}

    async def _api_post(self, path: str, data: dict) -> dict:
        """POST to GDI backend API."""
        async with self.session.post(f"{self.backend_url}{path}", json=data) as resp:
            return await resp.json()

    async def _api_get(self, path: str, params: dict = None) -> dict:
        """GET from GDI backend API."""
        async with self.session.get(f"{self.backend_url}{path}", params=params) as resp:
            return await resp.json()

    # ── Individual tool handlers ──

    async def _tool_fly_to(self, args: dict) -> dict:
        return await self._api_post("/api/ai/fly-to", {
            "location": args["location"],
            "altitude": args.get("altitude"),
            "heading": args.get("heading", 0),
            "pitch": args.get("pitch", -90),
        })

    async def _tool_toggle_layer(self, args: dict) -> dict:
        return await self._api_post("/api/ai/layer", {
            "layer": args["layer"],
            "enabled": args.get("enabled"),
        })

    async def _tool_set_filter(self, args: dict) -> dict:
        return await self._api_post("/api/ai/filter", {
            "mode": args["mode"],
        })

    async def _tool_query_flights(self, args: dict) -> dict:
        result = await self._api_post("/api/ai/analyze", {
            "region": args.get("region", "global"),
            "focus": "flights",
        })
        # Apply additional filters
        flights = result.get("flights", {}).get("data", [])
        if args.get("callsign"):
            pattern = args["callsign"].upper()
            flights = [f for f in flights if pattern in (f.get("callsign") or "").upper()]
        if args.get("min_altitude") is not None:
            flights = [f for f in flights if (f.get("altitude_m") or 0) >= args["min_altitude"]]
        if args.get("max_altitude") is not None:
            flights = [f for f in flights if (f.get("altitude_m") or 0) <= args["max_altitude"]]
        if args.get("on_ground") is not None:
            flights = [f for f in flights if f.get("on_ground") == args["on_ground"]]

        return {
            "region": args.get("region", "global"),
            "total_nearby": result.get("flights", {}).get("count", 0),
            "filtered": len(flights),
            "aircraft": flights[:50],
        }

    async def _tool_query_seismic(self, args: dict) -> dict:
        result = await self._api_post("/api/ai/analyze", {
            "region": args.get("region", "global"),
            "focus": "seismic",
        })
        events = result.get("seismic", {}).get("events", [])
        if args.get("min_magnitude") is not None:
            events = [e for e in events if (e.get("magnitude") or 0) >= args["min_magnitude"]]

        return {
            "region": args.get("region", "global"),
            "total_nearby": result.get("seismic", {}).get("count", 0),
            "filtered": len(events),
            "events": events[:30],
        }

    async def _tool_analyze_region(self, args: dict) -> dict:
        return await self._api_post("/api/ai/analyze", {
            "region": args["region"],
            "focus": args.get("focus", "all"),
        })

    async def _tool_capture_view(self, args: dict) -> dict:
        return await self._api_post("/api/ai/capture", {
            "label": args.get("label", "capture"),
        })

    async def _tool_remember(self, args: dict) -> dict:
        if self.memory:
            self.memory.remember(
                content=args["content"],
                category=args.get("category", "note"),
                metadata=args.get("metadata"),
            )
            return {"status": "saved", "content": args["content"][:100]}
        return {"error": "Memory not available"}

    async def _tool_recall(self, args: dict) -> dict:
        if self.memory:
            results = self.memory.recall(args["query"])
            return {"query": args["query"], "results": results}
        return {"error": "Memory not available"}

    async def _tool_sitrep(self, args: dict) -> dict:
        """Full situation report — pulls all live data sources at once."""
        region = args.get("region", "global")
        results = {}

        # Pull everything in parallel
        try:
            tasks = {
                "flights": self._api_get("/api/flights/status"),
                "seismic": self._api_get("/api/seismic", {"period": "all_day"}),
                "workers": self._api_get("/api/intel/workers"),
                "intel": self._api_get("/api/intel/stream", {"limit": "15"}),
                "status": self._api_get("/api/status"),
            }

            gathered = await asyncio.gather(
                *tasks.values(),
                return_exceptions=True
            )

            for key, result in zip(tasks.keys(), gathered):
                if isinstance(result, Exception):
                    results[key] = {"error": str(result)}
                else:
                    results[key] = result
        except Exception as e:
            results["error"] = str(e)

        # Summarize flight data
        flight_status = results.get("flights", {})
        seismic_data = results.get("seismic", {})
        intel_data = results.get("intel", {})
        worker_data = results.get("workers", {})
        sys_status = results.get("status", {})

        # Build structured sitrep
        sitrep = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "region": region,
            "system": {
                "mode": sys_status.get("mode", "unknown"),
                "redis": sys_status.get("services", {}).get("redis", "unknown"),
                "ws_clients": sys_status.get("services", {}).get("websocket_clients", 0),
            },
            "flights": {
                "total_aircraft": flight_status.get("total_aircraft", 0),
                "sources": list(flight_status.get("sources", {}).keys()),
                "last_update": flight_status.get("last_update"),
            },
            "seismic": {
                "total_events": len(seismic_data.get("features", [])),
                "significant": [
                    {
                        "magnitude": f.get("properties", {}).get("mag"),
                        "place": f.get("properties", {}).get("place"),
                        "time": f.get("properties", {}).get("time"),
                    }
                    for f in seismic_data.get("features", [])[:10]
                    if (f.get("properties", {}).get("mag") or 0) >= 3.0
                ],
            },
            "intel_workers": {
                name: {
                    "status": w.get("status"),
                    "cycles": w.get("cycles"),
                    "items_produced": w.get("items"),
                    "errors": w.get("errors"),
                }
                for name, w in worker_data.items()
                if isinstance(w, dict)
            },
            "recent_intel": [
                {
                    "category": item.get("category"),
                    "severity": item.get("severity"),
                    "title": item.get("title"),
                    "timestamp": item.get("timestamp"),
                }
                for item in intel_data.get("items", [])[:10]
                if isinstance(item, dict)
            ],
        }

        return sitrep


# ─── VALKYRIE Engine ─────────────────────────────────────────

class ValkyrieEngine:
    """
    The brain. Manages conversations, calls Claude, executes tools,
    streams responses back to the frontend.
    """

    def __init__(self):
        self.memory = ValkyrieMemory()
        self.executor = ToolExecutor(memory=self.memory)
        self.session: Optional[aiohttp.ClientSession] = None
        self._active_sessions: dict[str, list] = {}  # session_id -> messages

    async def start(self):
        self.session = aiohttp.ClientSession(
            timeout=aiohttp.ClientTimeout(total=120)
        )
        await self.executor.start()
        log.info("VALKYRIE engine online")

    async def stop(self):
        if self.session:
            await self.session.close()
        await self.executor.stop()
        self.memory.close()
        log.info("VALKYRIE engine offline")

    def _get_session_messages(self, session_id: str) -> list:
        """Get or create conversation context for a session."""
        if session_id not in self._active_sessions:
            # Load recent history from DB
            history = self.memory.get_history(session_id, limit=20)
            self._active_sessions[session_id] = history if history else []
        return self._active_sessions[session_id]

    async def query(self, user_message: str, session_id: str = "default",
                    ws_broadcast=None) -> str:
        """
        Process a user query end-to-end:
        1. Add to conversation context
        2. Call Claude with tools
        3. Execute any tool calls
        4. Return final response text

        ws_broadcast: async callable to push commands to frontend in real-time
        """
        messages = self._get_session_messages(session_id)
        messages.append({"role": "user", "content": user_message})
        self.memory.save_message(session_id, "user", user_message)

        # Tool call loop (max 5 rounds to prevent runaway)
        final_text = ""
        for iteration in range(5):
            response = await self._call_claude(messages)

            if response is None:
                final_text = "VALKYRIE: System error — unable to reach AI backend."
                break

            # Extract response
            choice = response.get("choices", [{}])[0]
            msg = choice.get("message", {})
            finish_reason = choice.get("finish_reason", "stop")

            # Check for tool calls
            tool_calls = msg.get("tool_calls")
            content = msg.get("content", "") or ""

            if tool_calls:
                # Add assistant message with tool calls to context
                assistant_msg = {"role": "assistant", "content": content, "tool_calls": tool_calls}
                messages.append(assistant_msg)
                self.memory.save_message(session_id, "assistant", content, tool_calls=tool_calls)

                # Execute each tool call
                for tc in tool_calls:
                    fn_name = tc["function"]["name"]
                    fn_args = json.loads(tc["function"]["arguments"])
                    log.info(f"Executing tool: {fn_name}({fn_args})")

                    result = await self.executor.execute(fn_name, fn_args)

                    # Broadcast commands to frontend in real-time
                    if ws_broadcast and fn_name in ("fly_to", "toggle_layer", "set_filter", "capture_view"):
                        # The API endpoints already broadcast via WebSocket,
                        # but we confirm execution here
                        pass

                    # Add tool result to context
                    tool_msg = {
                        "role": "tool",
                        "tool_call_id": tc["id"],
                        "content": json.dumps(result, default=str),
                    }
                    messages.append(tool_msg)
                    self.memory.save_message(
                        session_id, "tool",
                        json.dumps(result, default=str),
                        tool_call_id=tc["id"]
                    )

                # Continue loop — Claude will process tool results
                continue

            else:
                # No tool calls — this is the final response
                if not content and iteration > 0:
                    # Claude returned empty text after tool calls — generate fallback
                    content = "Done."
                final_text = content
                messages.append({"role": "assistant", "content": content})
                self.memory.save_message(session_id, "assistant", content)
                break

        # Trim context if too long (keep last 30 messages + system)
        if len(messages) > 40:
            self._active_sessions[session_id] = messages[-30:]

        return final_text

    async def _call_claude(self, messages: list) -> Optional[dict]:
        """Call Claude via the copilot proxy (OpenAI chat completions format)."""
        payload = {
            "model": AI_MODEL,
            "messages": [{"role": "system", "content": SYSTEM_PROMPT}] + messages,
            "tools": TOOLS,
            "temperature": AI_TEMPERATURE,
            "max_tokens": AI_MAX_TOKENS,
        }

        try:
            async with self.session.post(
                f"{AI_PROXY_URL}/chat/completions",
                json=payload,
                headers={
                    "Content-Type": "application/json",
                    "Authorization": "Bearer n/a",
                },
            ) as resp:
                if resp.status == 200:
                    return await resp.json()
                else:
                    error_text = await resp.text()
                    log.error(f"Claude API error {resp.status}: {error_text[:500]}")
                    return None
        except Exception as e:
            log.error(f"Claude API connection error: {e}")
            return None

    async def stream_query(self, user_message: str, session_id: str = "default") -> AsyncIterator[dict]:
        """
        Streaming version — yields events as they happen.
        Events: { type: "thinking"|"tool_call"|"tool_result"|"text"|"done"|"error" }
        """
        messages = self._get_session_messages(session_id)
        messages.append({"role": "user", "content": user_message})
        self.memory.save_message(session_id, "user", user_message)

        for iteration in range(5):
            yield {"type": "thinking", "iteration": iteration}

            response = await self._call_claude(messages)
            if response is None:
                yield {"type": "error", "message": "Unable to reach AI backend"}
                return

            choice = response.get("choices", [{}])[0]
            msg = choice.get("message", {})
            tool_calls = msg.get("tool_calls")
            content = msg.get("content", "") or ""

            if tool_calls:
                assistant_msg = {"role": "assistant", "content": content, "tool_calls": tool_calls}
                messages.append(assistant_msg)
                self.memory.save_message(session_id, "assistant", content, tool_calls=tool_calls)

                for tc in tool_calls:
                    fn_name = tc["function"]["name"]
                    fn_args = json.loads(tc["function"]["arguments"])

                    yield {"type": "tool_call", "name": fn_name, "arguments": fn_args}

                    result = await self.executor.execute(fn_name, fn_args)

                    yield {"type": "tool_result", "name": fn_name, "result": result}

                    tool_msg = {
                        "role": "tool",
                        "tool_call_id": tc["id"],
                        "content": json.dumps(result, default=str),
                    }
                    messages.append(tool_msg)
                    self.memory.save_message(
                        session_id, "tool",
                        json.dumps(result, default=str),
                        tool_call_id=tc["id"]
                    )

                continue

            else:
                if not content and iteration > 0:
                    content = "Done."
                if content:
                    yield {"type": "text", "content": content}
                messages.append({"role": "assistant", "content": content})
                self.memory.save_message(session_id, "assistant", content)
                yield {"type": "done"}
                break

        if len(messages) > 40:
            self._active_sessions[session_id] = messages[-30:]


# ─── Singleton ───────────────────────────────────────────────

valkyrie = ValkyrieEngine()
