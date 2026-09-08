# VALKYRIE Agent Memory — `valkyrie_db.py`

Standalone SQLite + FTS5 memory database for the GDI VALKYRIE agent.

## Quick Start

```python
from valkyrie_db import ValkyrieDB

db = ValkyrieDB("/path/to/valkyrie.db")

# Store conversation
db.store("What's the airspace status?", role="user", session_id="s1")
db.store("Restricted — NOTAM active.", role="assistant", session_id="s1")

# BM25 search across conversations + knowledge
results = db.search("airspace status", k=5)

# Knowledge store
db.set_knowledge("threat_level", "HIGH", category="status")
db.get_knowledge("threat_level")

# Spatial cache with TTL
db.cache_spatial("ISB_50KM", geojson_data, ttl_seconds=3600)
db.get_spatial("ISB_50KM")  # None if expired

# Cleanup
db.purge_expired_spatial()
db.close()
```

## Self-Test

```bash
python3 valkyrie_db.py
```

## No External Dependencies

Pure Python 3, stdlib only (`sqlite3`, `json`, `uuid`, `time`, `pathlib`).
