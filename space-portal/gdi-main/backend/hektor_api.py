"""
GDI — HEKTOR Memory Integration Layer
REST API wrapper around AVA's HEKTOR daemon (BM25 + vector hybrid search).

Provides:
  - Semantic search over the enterprise workspace (intelligence memory)
  - Document ingestion into the HEKTOR index
  - Index statistics

Architecture:
  FastAPI router → Unix socket IPC → HEKTOR daemon (persistent, indices in RAM)

The daemon lives at /home/adam/workspace/.ava-memory/ and speaks a
length-prefixed JSON protocol over a Unix domain socket.
"""

import json
import os
import socket
import struct
import subprocess
import time
import logging
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

log = logging.getLogger("gdi.hektor")

# ─── HEKTOR Paths ────────────────────────────────────────────
HEKTOR_ROOT = Path("/home/adam/workspace/.ava-memory")
SOCKET_PATH = HEKTOR_ROOT / "ava_daemon.sock"
PID_PATH = HEKTOR_ROOT / "ava_daemon.pid"
MEMORY_SCRIPT = HEKTOR_ROOT / "ava_memory_fast.py"
VENV_PYTHON = Path("/home/adam/workspace/.hektor-env/bin/python3")

# ─── IPC Protocol (mirrors ava_memory_fast.py) ───────────────

def _ipc_send(sock: socket.socket, obj: dict):
    """Send length-prefixed JSON over socket."""
    data = json.dumps(obj).encode("utf-8")
    sock.sendall(struct.pack("!I", len(data)) + data)


def _ipc_recv(sock: socket.socket, timeout: float = 30.0) -> dict:
    """Receive length-prefixed JSON from socket."""
    sock.settimeout(timeout)
    raw_len = b""
    while len(raw_len) < 4:
        chunk = sock.recv(4 - len(raw_len))
        if not chunk:
            raise ConnectionError("Connection closed by daemon")
        raw_len += chunk
    msg_len = struct.unpack("!I", raw_len)[0]
    if msg_len > 10 * 1024 * 1024:
        raise ValueError(f"Response too large: {msg_len} bytes")
    data = b""
    while len(data) < msg_len:
        chunk = sock.recv(min(65536, msg_len - len(data)))
        if not chunk:
            raise ConnectionError("Connection closed mid-read")
        data += chunk
    return json.loads(data.decode("utf-8"))


def _daemon_call(msg: dict, timeout: float = 30.0) -> dict:
    """Send a command to the HEKTOR daemon and return the response."""
    sock = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
    sock.settimeout(timeout)
    try:
        sock.connect(str(SOCKET_PATH))
        _ipc_send(sock, msg)
        return _ipc_recv(sock, timeout=timeout)
    finally:
        sock.close()


def _daemon_is_running() -> bool:
    """Check if the HEKTOR daemon is alive."""
    if not PID_PATH.exists():
        return False
    try:
        pid = int(PID_PATH.read_text().strip())
        os.kill(pid, 0)  # signal 0 — check existence
    except (ValueError, ProcessLookupError, OSError):
        return False
    if not SOCKET_PATH.exists():
        return False
    try:
        resp = _daemon_call({"cmd": "ping"}, timeout=3.0)
        return resp.get("pong", False)
    except Exception:
        return False


def _ensure_daemon() -> bool:
    """Start HEKTOR daemon if not running. Returns True when ready."""
    if _daemon_is_running():
        return True

    log.info("HEKTOR daemon not running — starting...")
    if not VENV_PYTHON.exists() or not MEMORY_SCRIPT.exists():
        log.error("HEKTOR venv or script not found")
        return False

    proc = subprocess.Popen(
        [str(VENV_PYTHON), str(MEMORY_SCRIPT), "daemon", "start"],
        cwd=str(HEKTOR_ROOT),
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )

    # Wait for daemon to become ready (loads ~4600 docs, takes ~30s)
    for _ in range(90):  # 45s max wait
        time.sleep(0.5)
        if SOCKET_PATH.exists():
            try:
                resp = _daemon_call({"cmd": "ping"}, timeout=3.0)
                if resp.get("pong"):
                    log.info(f"HEKTOR daemon ready (PID {proc.pid})")
                    return True
            except Exception:
                continue

    log.error("HEKTOR daemon failed to start within timeout")
    return False


# ─── Request/Response Models ─────────────────────────────────

class SearchRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=2000, description="Search query text")
    mode: str = Field("hybrid", pattern="^(bm25|vector|hybrid)$", description="Search mode")
    k: int = Field(5, ge=1, le=50, description="Number of results to return")


class IngestRequest(BaseModel):
    content: str = Field(..., min_length=1, description="Document content to ingest")
    path: str = Field(..., min_length=1, description="Virtual file path for the document")
    category: str = Field("intel", description="Document category (intel, analysis, report, note)")


class SearchResult(BaseModel):
    path: str
    score: float
    snippet: str
    start_line: int = 0
    end_line: int = 0
    method: str = "hybrid"


class SearchResponse(BaseModel):
    results: list[SearchResult]
    query: str
    mode: str
    elapsed_ms: float
    daemon_status: str = "ok"


class StatsResponse(BaseModel):
    bm25_docs: int
    bm25_terms: int
    bm25_avg_len: int
    vector_count: int
    vector_dim: int
    model: str
    cached_files: int
    daemon_uptime_s: float
    idle_s: float
    workspace: str


class IngestResponse(BaseModel):
    status: str
    message: str
    path: str


# ─── Router ──────────────────────────────────────────────────

router = APIRouter(prefix="/api/hektor", tags=["HEKTOR Memory"])


@router.post("/search", response_model=SearchResponse)
async def hektor_search(req: SearchRequest):
    """
    Search the HEKTOR intelligence memory.

    Modes:
      - **bm25**: keyword search (~1ms, exact term matching)
      - **vector**: semantic search (~60ms, meaning-based)
      - **hybrid**: both combined (~65ms, best quality, default)
    """
    if not _ensure_daemon():
        raise HTTPException(
            status_code=503,
            detail="HEKTOR daemon unavailable — memory search offline",
        )

    t0 = time.time()
    try:
        resp = _daemon_call({
            "cmd": "search",
            "query": req.query,
            "mode": req.mode,
            "top_k": req.k,
        })
    except ConnectionError as e:
        raise HTTPException(status_code=503, detail=f"HEKTOR connection lost: {e}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"HEKTOR search error: {e}")

    elapsed_ms = (time.time() - t0) * 1000

    if resp.get("status") != "ok":
        raise HTTPException(status_code=500, detail=resp.get("msg", "Unknown HEKTOR error"))

    raw_results = resp.get("results", [])
    results = [
        SearchResult(
            path=r.get("path", "?"),
            score=r.get("score", 0.0),
            snippet=r.get("snippet", "")[:2000],  # cap snippet size
            start_line=r.get("start_line", 0),
            end_line=r.get("end_line", 0),
            method=r.get("method", req.mode),
        )
        for r in raw_results
    ]

    return SearchResponse(
        results=results,
        query=req.query,
        mode=req.mode,
        elapsed_ms=round(elapsed_ms, 1),
        daemon_status="ok",
    )


@router.get("/stats", response_model=StatsResponse)
async def hektor_stats():
    """
    Get HEKTOR daemon index statistics.
    Returns document count, term count, vector count, uptime, etc.
    """
    if not _ensure_daemon():
        raise HTTPException(
            status_code=503,
            detail="HEKTOR daemon unavailable",
        )

    try:
        resp = _daemon_call({"cmd": "stats"})
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"HEKTOR stats error: {e}")

    if resp.get("status") != "ok":
        raise HTTPException(status_code=500, detail=resp.get("msg", "Unknown error"))

    s = resp["stats"]
    return StatsResponse(
        bm25_docs=s.get("bm25_docs", 0),
        bm25_terms=s.get("bm25_terms", 0),
        bm25_avg_len=s.get("bm25_avg_len", 0),
        vector_count=s.get("vector_count", 0),
        vector_dim=s.get("vector_dim", 384),
        model=s.get("model", "unknown"),
        cached_files=s.get("cached_files", 0),
        daemon_uptime_s=s.get("daemon_uptime_s", 0),
        idle_s=s.get("idle_s", 0),
        workspace=s.get("workspace", ""),
    )


@router.post("/ingest", response_model=IngestResponse)
async def hektor_ingest(req: IngestRequest):
    """
    Ingest a document into HEKTOR's intelligence memory.

    Writes the content to a file in the GDI intel directory, then triggers
    a HEKTOR re-index so the document becomes searchable.
    """
    # Write to GDI intel directory
    intel_dir = Path("/home/adam/workspace/projects/gdi/data/intel")
    intel_dir.mkdir(parents=True, exist_ok=True)

    # Sanitize path — prevent directory traversal
    safe_name = req.path.replace("/", "_").replace("..", "_").replace("\\", "_")
    if not safe_name.endswith((".md", ".txt", ".json")):
        safe_name += ".md"

    file_path = intel_dir / safe_name

    # Write the document
    header = f"---\ncategory: {req.category}\ningested_at: {time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())}\nsource: gdi-api\n---\n\n"
    file_path.write_text(header + req.content, encoding="utf-8")

    # Trigger HEKTOR reload (non-blocking — ingest is heavy, reload is fast if daemon is running)
    if _daemon_is_running():
        try:
            _daemon_call({"cmd": "reload"}, timeout=60.0)
            msg = f"Ingested and indexed: {safe_name}"
        except Exception as e:
            msg = f"Ingested to disk but index reload failed: {e}"
            log.warning(msg)
    else:
        msg = f"Ingested to disk: {safe_name} (daemon offline — will be indexed on next start)"

    return IngestResponse(
        status="ok",
        message=msg,
        path=str(file_path),
    )


@router.get("/health")
async def hektor_health():
    """Quick health check for HEKTOR daemon."""
    running = _daemon_is_running()
    return {
        "status": "ok" if running else "offline",
        "daemon_running": running,
        "socket_exists": SOCKET_PATH.exists(),
        "pid_exists": PID_PATH.exists(),
    }
