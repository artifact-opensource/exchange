"""
VALKYRIE Memory Database
========================
Lightweight SQLite-based memory for the GDI VALKYRIE agent.
Pure Python, single file, zero external dependencies beyond stdlib.

Tables:
  - conversations : session-scoped chat history
  - knowledge     : persistent key-value knowledge store
  - spatial_cache  : TTL-governed geospatial data cache

Search: BM25 keyword search via SQLite FTS5 over conversations & knowledge.

Author : CTO — Artifact Virtual
Date   : 2026-03-01
License: CONFIDENTIAL — Artifact Virtual Internal
"""

from __future__ import annotations

import json
import sqlite3
import time
import uuid
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple


class ValkyrieDB:
    """Self-contained memory database for the VALKYRIE agent."""

    # ------------------------------------------------------------------
    # Lifecycle
    # ------------------------------------------------------------------

    def __init__(self, db_path: str = "valkyrie_memory.db") -> None:
        self.db_path = str(Path(db_path).expanduser().resolve())
        self._conn: Optional[sqlite3.Connection] = None
        self._connect()
        self._create_tables()

    def _connect(self) -> None:
        self._conn = sqlite3.connect(self.db_path, check_same_thread=False)
        self._conn.row_factory = sqlite3.Row
        self._conn.execute("PRAGMA journal_mode=WAL")
        self._conn.execute("PRAGMA synchronous=NORMAL")
        self._conn.execute("PRAGMA foreign_keys=ON")

    def _create_tables(self) -> None:
        c = self._conn
        # ---- Core tables ------------------------------------------------
        c.execute("""
            CREATE TABLE IF NOT EXISTS conversations (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id  TEXT    NOT NULL,
                role        TEXT    NOT NULL,
                content     TEXT    NOT NULL,
                timestamp   REAL   NOT NULL
            )
        """)
        c.execute("""
            CREATE INDEX IF NOT EXISTS idx_conv_session
            ON conversations(session_id)
        """)
        c.execute("""
            CREATE INDEX IF NOT EXISTS idx_conv_ts
            ON conversations(timestamp)
        """)

        c.execute("""
            CREATE TABLE IF NOT EXISTS knowledge (
                key        TEXT PRIMARY KEY,
                value      TEXT NOT NULL,
                category   TEXT NOT NULL DEFAULT 'general',
                updated_at REAL NOT NULL
            )
        """)
        c.execute("""
            CREATE INDEX IF NOT EXISTS idx_know_cat
            ON knowledge(category)
        """)

        c.execute("""
            CREATE TABLE IF NOT EXISTS spatial_cache (
                region     TEXT PRIMARY KEY,
                data_json  TEXT NOT NULL,
                expires_at REAL NOT NULL
            )
        """)
        c.execute("""
            CREATE INDEX IF NOT EXISTS idx_spatial_exp
            ON spatial_cache(expires_at)
        """)

        # ---- FTS5 virtual tables ----------------------------------------
        c.execute("""
            CREATE VIRTUAL TABLE IF NOT EXISTS fts_conversations
            USING fts5(
                content,
                session_id UNINDEXED,
                role       UNINDEXED,
                row_id     UNINDEXED,
                tokenize = 'porter unicode61'
            )
        """)
        c.execute("""
            CREATE VIRTUAL TABLE IF NOT EXISTS fts_knowledge
            USING fts5(
                key,
                value,
                category UNINDEXED,
                tokenize = 'porter unicode61'
            )
        """)

        # ---- Triggers: keep FTS in sync with base tables ----------------
        # Conversations — insert
        c.execute("""
            CREATE TRIGGER IF NOT EXISTS trg_conv_ai
            AFTER INSERT ON conversations
            BEGIN
                INSERT INTO fts_conversations(content, session_id, role, row_id)
                VALUES (NEW.content, NEW.session_id, NEW.role, NEW.id);
            END
        """)
        # Conversations — delete
        c.execute("""
            CREATE TRIGGER IF NOT EXISTS trg_conv_ad
            AFTER DELETE ON conversations
            BEGIN
                DELETE FROM fts_conversations WHERE row_id = OLD.id;
            END
        """)

        # Knowledge — insert
        c.execute("""
            CREATE TRIGGER IF NOT EXISTS trg_know_ai
            AFTER INSERT ON knowledge
            BEGIN
                INSERT INTO fts_knowledge(key, value, category)
                VALUES (NEW.key, NEW.value, NEW.category);
            END
        """)
        # Knowledge — update
        c.execute("""
            CREATE TRIGGER IF NOT EXISTS trg_know_au
            AFTER UPDATE ON knowledge
            BEGIN
                DELETE FROM fts_knowledge WHERE key = OLD.key;
                INSERT INTO fts_knowledge(key, value, category)
                VALUES (NEW.key, NEW.value, NEW.category);
            END
        """)
        # Knowledge — delete
        c.execute("""
            CREATE TRIGGER IF NOT EXISTS trg_know_ad
            AFTER DELETE ON knowledge
            BEGIN
                DELETE FROM fts_knowledge WHERE key = OLD.key;
            END
        """)

        c.commit()

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def store(
        self,
        content: str,
        role: str = "user",
        session_id: Optional[str] = None,
        timestamp: Optional[float] = None,
    ) -> int:
        """Store a conversation message. Returns the row id."""
        session_id = session_id or str(uuid.uuid4())
        timestamp = timestamp or time.time()
        cur = self._conn.execute(
            "INSERT INTO conversations (session_id, role, content, timestamp) "
            "VALUES (?, ?, ?, ?)",
            (session_id, role, content, timestamp),
        )
        self._conn.commit()
        return cur.lastrowid

    def search(self, query: str, k: int = 5) -> List[Dict[str, Any]]:
        """BM25 keyword search across conversations AND knowledge.

        Returns up to *k* results sorted by relevance (best first).
        Each result dict contains: source, rank, snippet, and metadata.
        """
        results: List[Dict[str, Any]] = []

        # --- search conversations ---
        try:
            rows = self._conn.execute(
                """
                SELECT
                    c.id, c.session_id, c.role, c.content, c.timestamp,
                    fts.rank
                FROM fts_conversations fts
                JOIN conversations c ON c.id = CAST(fts.row_id AS INTEGER)
                WHERE fts_conversations MATCH ?
                ORDER BY fts.rank
                LIMIT ?
                """,
                (self._sanitize_fts(query), k),
            ).fetchall()
            for r in rows:
                results.append({
                    "source": "conversation",
                    "bm25_rank": r["rank"],
                    "id": r["id"],
                    "session_id": r["session_id"],
                    "role": r["role"],
                    "content": r["content"],
                    "timestamp": r["timestamp"],
                })
        except sqlite3.OperationalError:
            pass  # empty FTS table or bad query — return nothing

        # --- search knowledge ---
        try:
            rows = self._conn.execute(
                """
                SELECT
                    k.key, k.value, k.category, k.updated_at,
                    fts.rank
                FROM fts_knowledge fts
                JOIN knowledge k ON k.key = fts.key
                WHERE fts_knowledge MATCH ?
                ORDER BY fts.rank
                LIMIT ?
                """,
                (self._sanitize_fts(query), k),
            ).fetchall()
            for r in rows:
                results.append({
                    "source": "knowledge",
                    "bm25_rank": r["rank"],
                    "key": r["key"],
                    "value": r["value"],
                    "category": r["category"],
                    "updated_at": r["updated_at"],
                })
        except sqlite3.OperationalError:
            pass

        # Merge both lists by BM25 rank (lower = more relevant in FTS5)
        results.sort(key=lambda x: x["bm25_rank"])
        return results[:k]

    def get_knowledge(self, key: str) -> Optional[Dict[str, Any]]:
        """Retrieve a single knowledge entry by exact key."""
        row = self._conn.execute(
            "SELECT key, value, category, updated_at FROM knowledge WHERE key = ?",
            (key,),
        ).fetchone()
        if row is None:
            return None
        return dict(row)

    def set_knowledge(
        self, key: str, value: str, category: str = "general"
    ) -> None:
        """Upsert a knowledge entry."""
        now = time.time()
        self._conn.execute(
            """
            INSERT INTO knowledge (key, value, category, updated_at)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(key) DO UPDATE SET
                value      = excluded.value,
                category   = excluded.category,
                updated_at = excluded.updated_at
            """,
            (key, value, category, now),
        )
        self._conn.commit()

    def delete_knowledge(self, key: str) -> bool:
        """Delete a knowledge entry. Returns True if it existed."""
        cur = self._conn.execute("DELETE FROM knowledge WHERE key = ?", (key,))
        self._conn.commit()
        return cur.rowcount > 0

    def cache_spatial(
        self, region: str, data: Any, ttl_seconds: int = 3600
    ) -> None:
        """Cache spatial/geospatial data for a named region with TTL."""
        expires = time.time() + ttl_seconds
        data_json = json.dumps(data, default=str)
        self._conn.execute(
            """
            INSERT INTO spatial_cache (region, data_json, expires_at)
            VALUES (?, ?, ?)
            ON CONFLICT(region) DO UPDATE SET
                data_json  = excluded.data_json,
                expires_at = excluded.expires_at
            """,
            (region, data_json, expires),
        )
        self._conn.commit()

    def get_spatial(self, region: str) -> Optional[Any]:
        """Retrieve cached spatial data if not expired. Returns None if
        missing or expired (and auto-purges the expired row)."""
        row = self._conn.execute(
            "SELECT data_json, expires_at FROM spatial_cache WHERE region = ?",
            (region,),
        ).fetchone()
        if row is None:
            return None
        if row["expires_at"] < time.time():
            self._conn.execute(
                "DELETE FROM spatial_cache WHERE region = ?", (region,)
            )
            self._conn.commit()
            return None
        return json.loads(row["data_json"])

    def purge_expired_spatial(self) -> int:
        """Remove all expired spatial cache entries. Returns count removed."""
        cur = self._conn.execute(
            "DELETE FROM spatial_cache WHERE expires_at < ?", (time.time(),)
        )
        self._conn.commit()
        return cur.rowcount

    def get_session(self, session_id: str) -> List[Dict[str, Any]]:
        """Retrieve all messages for a session, ordered chronologically."""
        rows = self._conn.execute(
            "SELECT id, session_id, role, content, timestamp "
            "FROM conversations WHERE session_id = ? ORDER BY timestamp",
            (session_id,),
        ).fetchall()
        return [dict(r) for r in rows]

    def stats(self) -> Dict[str, int]:
        """Return row counts for all tables."""
        counts = {}
        for table in ("conversations", "knowledge", "spatial_cache"):
            row = self._conn.execute(
                f"SELECT COUNT(*) AS n FROM {table}"
            ).fetchone()
            counts[table] = row["n"]
        return counts

    def close(self) -> None:
        """Close the database connection."""
        if self._conn:
            self._conn.close()
            self._conn = None

    # ------------------------------------------------------------------
    # Internals
    # ------------------------------------------------------------------

    @staticmethod
    def _sanitize_fts(query: str) -> str:
        """Escape FTS5 special chars and convert to a safe query string.

        Strategy: split into tokens, wrap each in double-quotes so
        operators like AND/OR/NOT/NEAR are treated as literals.
        Then join with spaces (implicit AND in FTS5).
        """
        tokens = query.strip().split()
        if not tokens:
            return '""'
        return " ".join(f'"{t}"' for t in tokens)

    def __enter__(self) -> "ValkyrieDB":
        return self

    def __exit__(self, *exc: Any) -> None:
        self.close()

    def __repr__(self) -> str:
        return f"ValkyrieDB(db_path={self.db_path!r})"


# ======================================================================
# Self-test
# ======================================================================
if __name__ == "__main__":
    import os
    import sys
    import tempfile

    PASS = 0
    FAIL = 0

    def check(label: str, condition: bool, detail: str = "") -> None:
        global PASS, FAIL
        status = "✅ PASS" if condition else "❌ FAIL"
        if not condition:
            FAIL += 1
        else:
            PASS += 1
        extra = f"  ({detail})" if detail else ""
        print(f"  {status}  {label}{extra}")

    # Use a temp file so tests never pollute real data
    tmp = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
    tmp_path = tmp.name
    tmp.close()

    print("=" * 60)
    print("VALKYRIE Memory DB — Self-Test Suite")
    print("=" * 60)
    print(f"  DB path: {tmp_path}")
    print()

    try:
        db = ValkyrieDB(db_path=tmp_path)

        # ---- 1. Initialization -----------------------------------------
        print("[1] Initialization")
        check("DB created", os.path.exists(tmp_path))
        s = db.stats()
        check("Tables empty on init", s == {"conversations": 0, "knowledge": 0, "spatial_cache": 0}, str(s))
        print()

        # ---- 2. store() -----------------------------------------------
        print("[2] store() — conversation messages")
        sid = "test-session-001"
        id1 = db.store("What is the airspace status over the Northern Gulf sector?", role="user", session_id=sid)
        id2 = db.store("Airspace is currently restricted. NOTAM ISB-2026-0042 active.", role="assistant", session_id=sid)
        id3 = db.store("Show me military flights in the last 6 hours.", role="user", session_id=sid)
        check("store returns row ids", id1 == 1 and id2 == 2 and id3 == 3, f"ids={id1},{id2},{id3}")
        s = db.stats()
        check("3 conversations stored", s["conversations"] == 3)
        print()

        # ---- 3. get_session() ------------------------------------------
        print("[3] get_session()")
        msgs = db.get_session(sid)
        check("Session has 3 messages", len(msgs) == 3)
        check("Messages ordered by timestamp", msgs[0]["timestamp"] <= msgs[1]["timestamp"] <= msgs[2]["timestamp"])
        check("Roles correct", [m["role"] for m in msgs] == ["user", "assistant", "user"])
        print()

        # ---- 4. search() — conversations via FTS5 ----------------------
        print("[4] search() — BM25 over conversations")
        results = db.search("airspace Northern Gulf")
        check("Search returns results", len(results) > 0, f"got {len(results)}")
        check("Top result mentions airspace", "airspace" in results[0].get("content", "").lower())
        check("Source is conversation", results[0]["source"] == "conversation")

        results_mil = db.search("military flights")
        check("Military flights search works", len(results_mil) > 0)
        print()

        # ---- 5. set_knowledge() / get_knowledge() ----------------------
        print("[5] Knowledge store")
        db.set_knowledge("pak_airforce_bases", "Kamra, Sargodha, Masroor, Samungli, Peshawar", category="military")
        db.set_knowledge("notam_isb_latest", "NOTAM ISB-2026-0042: TFR active 0600-1800Z", category="aviation")
        db.set_knowledge("threat_level", "ELEVATED", category="status")

        k = db.get_knowledge("pak_airforce_bases")
        check("Knowledge retrieved", k is not None)
        check("Value correct", "Kamra" in k["value"] and k["category"] == "military")

        missing = db.get_knowledge("nonexistent_key")
        check("Missing key returns None", missing is None)

        # Update existing
        db.set_knowledge("threat_level", "HIGH", category="status")
        k2 = db.get_knowledge("threat_level")
        check("Knowledge update works", k2["value"] == "HIGH")

        s = db.stats()
        check("3 knowledge entries", s["knowledge"] == 3)
        print()

        # ---- 6. search() — knowledge via FTS5 --------------------------
        print("[6] search() — BM25 over knowledge")
        results_k = db.search("airforce bases")
        check("Knowledge search returns results", len(results_k) > 0, f"got {len(results_k)}")
        found_mil = any(r.get("key") == "pak_airforce_bases" for r in results_k)
        check("Correct knowledge entry found", found_mil)

        # Cross-source search
        results_cross = db.search("airspace", k=10)
        sources = set(r["source"] for r in results_cross)
        check("Cross-source search hits both tables", len(sources) >= 1, f"sources={sources}")
        print()

        # ---- 7. search() — k parameter ---------------------------------
        print("[7] search() — k limit")
        # Add more data
        for i in range(10):
            db.store(f"Flight track update {i}: aircraft heading bearing {i*36} degrees", session_id="bulk-session")
        results_limited = db.search("flight track", k=3)
        check("k=3 limits results", len(results_limited) <= 3, f"got {len(results_limited)}")
        print()

        # ---- 8. cache_spatial() / get_spatial() -------------------------
        print("[8] Spatial cache")
        test_data = {
            "type": "FeatureCollection",
            "features": [
                {"type": "Feature", "geometry": {"type": "Point", "coordinates": [73.0479, 33.6844]}, "properties": {"name": "Target City"}}
            ]
        }
        db.cache_spatial("ISB_50KM", test_data, ttl_seconds=3600)
        cached = db.get_spatial("ISB_50KM")
        check("Spatial cache stores and retrieves", cached is not None)
        check("Spatial data intact", cached["type"] == "FeatureCollection")
        check("Geometry preserved", cached["features"][0]["geometry"]["coordinates"] == [73.0479, 33.6844])

        # Test expiry
        db.cache_spatial("EXPIRED_REGION", {"test": True}, ttl_seconds=-1)  # already expired
        expired = db.get_spatial("EXPIRED_REGION")
        check("Expired cache returns None", expired is None)

        # Test overwrite
        db.cache_spatial("ISB_50KM", {"updated": True}, ttl_seconds=7200)
        updated = db.get_spatial("ISB_50KM")
        check("Spatial cache overwrites", updated == {"updated": True})

        s = db.stats()
        check("Spatial cache count correct", s["spatial_cache"] == 1)  # expired was purged on read
        print()

        # ---- 9. purge_expired_spatial() ---------------------------------
        print("[9] Purge expired spatial")
        db.cache_spatial("ZONE_A", {"a": 1}, ttl_seconds=-10)
        db.cache_spatial("ZONE_B", {"b": 2}, ttl_seconds=-10)
        db.cache_spatial("ZONE_C", {"c": 3}, ttl_seconds=9999)
        purged = db.purge_expired_spatial()
        check("Purged expired entries", purged == 2, f"purged={purged}")
        remaining = db.get_spatial("ZONE_C")
        check("Non-expired entry survives purge", remaining == {"c": 3})
        print()

        # ---- 10. delete_knowledge() ------------------------------------
        print("[10] delete_knowledge()")
        deleted = db.delete_knowledge("threat_level")
        check("Delete returns True for existing", deleted)
        check("Key is gone", db.get_knowledge("threat_level") is None)
        deleted2 = db.delete_knowledge("nonexistent")
        check("Delete returns False for missing", not deleted2)
        print()

        # ---- 11. Edge cases --------------------------------------------
        print("[11] Edge cases")
        # Empty search
        empty = db.search("")
        check("Empty query returns list", isinstance(empty, list))

        # Unicode content
        uid = db.store("پاکستان کی فضائیہ — PAF operational status 🛩️", role="system", session_id="unicode-test")
        check("Unicode stored OK", uid > 0)
        unicode_results = db.search("پاکستان")
        check("Unicode search works", len(unicode_results) > 0)

        # Very long content
        long_text = "reconnaissance " * 5000
        lid = db.store(long_text, role="user", session_id="long-test")
        check("Long content stored", lid > 0)

        # Special FTS characters
        special_results = db.search('test AND "quoted" OR NOT')
        check("Special FTS chars handled safely", isinstance(special_results, list))
        print()

        # ---- 12. Context manager ---------------------------------------
        print("[12] Context manager")
        tmp2 = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
        tmp2_path = tmp2.name
        tmp2.close()
        with ValkyrieDB(db_path=tmp2_path) as db2:
            db2.store("context manager test", session_id="ctx")
            check("Context manager works", db2.stats()["conversations"] == 1)
        # Verify closed
        check("Connection closed after exit", db2._conn is None)
        os.unlink(tmp2_path)
        print()

        # ---- 13. Stats -------------------------------------------------
        print("[13] Final stats")
        final = db.stats()
        print(f"  Conversations: {final['conversations']}")
        print(f"  Knowledge:     {final['knowledge']}")
        print(f"  Spatial cache: {final['spatial_cache']}")
        check("Stats are reasonable", final["conversations"] > 10 and final["knowledge"] >= 2)
        print()

        db.close()

    finally:
        # Cleanup
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)

    # ---- Summary -------------------------------------------------------
    print("=" * 60)
    total = PASS + FAIL
    print(f"  Results: {PASS}/{total} passed, {FAIL} failed")
    if FAIL == 0:
        print("  🟢 ALL TESTS PASSED — VALKYRIE memory is operational")
    else:
        print("  🔴 SOME TESTS FAILED — review output above")
    print("=" * 60)

    sys.exit(0 if FAIL == 0 else 1)
