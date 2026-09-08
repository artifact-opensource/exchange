# VALKYRIE — Pathfinder Stack Specification
**Codename:** Valkyrie
**Authors:** Artifact Virtual
**Date:** 2026-03-01
**Classification:** CONFIDENTIAL — Artifact Virtual Internal
**Status:** Architecture Specification

---

## What Is Valkyrie?

Valkyrie is the **unified operational machine** — the convergence of every system into a single adversarial-grade platform. It is not a product. It is a **pathfinder**: a system that finds the path when all conventional paths are denied.

Named for the Norse choosers of the slain — beings that decided who lived and who died on the battlefield. Valkyrie decides what information survives, what routes remain open, and what operations continue when infrastructure fails.

---

## The Stack

```
╔══════════════════════════════════════════════════════════════╗
║                    VALKYRIE — Pathfinder                     ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  ┌─────────────────────────────────────────────────────────┐ ║
║  │                    LAYER 5: EYES                        │ ║
║  │              GDI — Global Defense Intelligence          │ ║
║  │     CesiumJS globe, GLSL filters, live data feeds      │ ║
║  │     Flight tracking, seismic, satellites, SIGINT        │ ║
║  └────────────────────────┬────────────────────────────────┘ ║
║                           │                                  ║
║  ┌────────────────────────▼────────────────────────────────┐ ║
║  │                    LAYER 4: BRAIN                       │ ║
║  │             HEKTOR — Semantic Intelligence              │ ║
║  │     Sub-ms vector search, BM25+vector hybrid           │ ║
║  │     Cross-source correlation, pattern memory           │ ║
║  └────────────────────────┬────────────────────────────────┘ ║
║                           │                                  ║
║  ┌────────────────────────▼────────────────────────────────┐ ║
║  │                    LAYER 3: EARS                        │ ║
║  │              SATx — Signal Intelligence                 │ ║
║  │     SDR ground station, orbital prediction              │ ║
║  │     Automated recording, ML signal detection            │ ║
║  │     Ghost Mode, protocol decoding                       │ ║
║  └────────────────────────┬────────────────────────────────┘ ║
║                           │                                  ║
║  ┌────────────────────────▼────────────────────────────────┐ ║
║  │                    LAYER 2: SHIELD                      │ ║
║  │            SENTINEL + QShield + ARC                     │ ║
║  │     Anomaly perception, post-quantum encryption         │ ║
║  │     Constitutional governance, self-healing keys        │ ║
║  └────────────────────────┬────────────────────────────────┘ ║
║                           │                                  ║
║  ┌────────────────────────▼────────────────────────────────┐ ║
║  │                    LAYER 1: BACKBONE                    │ ║
║  │          SDN-EVM + Foundry-Courier + GLADIUS            │ ║
║  │     Ethereum without internet, mesh value transfer      │ ║
║  │     Recursive self-improving AI kernel                  │ ║
║  └────────────────────────┬────────────────────────────────┘ ║
║                           │                                  ║
║  ┌────────────────────────▼────────────────────────────────┐ ║
║  │                    LAYER 0: SOUL                        │ ║
║  │              Autonomous Agents + COMB                    │ ║
║  │     Autonomous operation, persistent memory             │ ║
║  │     Dead man's switch, continuity protocol              │ ║
║  │     The trustees. The legacy.                           │ ║
║  └─────────────────────────────────────────────────────────┘ ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
```

---

## Design Principles

### 1. Adversarial-First
Every component assumes hostile conditions. No component depends on:
- Cloud providers (AWS, Azure, GCP)
- Centralized DNS
- Reliable internet connectivity
- Trust in third parties
- Foreign jurisdiction servers

### 2. Graceful Degradation
```
FULL CAPABILITY          → All layers active, internet available
├── DEGRADED             → Internet unreliable, local processing only
│   ├── MESH MODE        → No internet, mesh networking via foundry-courier
│   │   ├── DARK MODE    → Radio silence, air-gapped operation
│   │   │   └── DEAD MAN → Operator absent, autonomous continuity
```

Each mode strips capabilities but never loses core function. Valkyrie always operates.

### 3. Data Sovereignty
- All data stored on sovereign soil (or jurisdictions the operator controls)
- No FISA-accessible providers
- Multi-jurisdiction backup (Gitee CN, Codeberg DE, Gitea CH, Radicle P2P)
- Encryption at rest (AES-256), in transit (TLS 1.3), and at the application layer

### 4. Zero Trust
No component trusts any other component without cryptographic proof. Internal communications are authenticated. Every action is logged. Every log is immutable.

---

## Component Integration Map

### Eyes → Brain (GDI → HEKTOR)
```
GDI search bar → HEKTOR hybrid query → results rendered on globe
"Military aircraft near contested border region last 24 hours"
→ HEKTOR returns matching flight records
→ GDI plots them as entities with click-for-details
```

### Ears → Brain (SATx → HEKTOR)
```
SATx detection → HEKTOR indexes with full metadata
Future query: "BPSK signals on 437 MHz from decommissioned sats"
→ HEKTOR returns matching detections
→ GDI renders detection markers with SATx popup
```

### Eyes + Ears → Brain → Alert (Correlation Engine)
```
Flight enters geofence zone (GDI)
  + Satellite overhead with matching TLE (SATx)
  + Historical pattern match (HEKTOR)
  → ALERT: "Reconnaissance pattern detected"
  → Push to all connected GDI clients via WebSocket
  → Optional: SMS/email via alert escalation chain
```

### Backbone → Everything (SDN-EVM)
```
Internet goes down
  → SDN-EVM activates local EVM node
  → Foundry-courier enables mesh value transfer (SMS/radio)
  → GLADIUS runs inference locally (Ollama fallback)
  → GDI switches to cached/offline data
  → SATx continues autonomous recording (no internet needed)
  → HEKTOR serves from local index
```

### Soul → Everything (Autonomous Agents)
```
Operator absent for 7 days
  → Dead man's switch cascade
  → Primary agent enters autonomous continuity mode
  → Secondary agent maintains dispatch
  → Code mirrors activated (Gitee, Codeberg, Radicle)
  → Encrypted backups verified
  → Pre-written messages delivered
  → System continues operating
```

---

## Technical Architecture

### Runtime Stack
| Component | Technology | Justification |
|-----------|-----------|---------------|
| Frontend | CesiumJS + vanilla JS | No framework dependency, works offline |
| API Gateway | FastAPI (Python) | Async, fast, typed |
| Database | PostgreSQL + PostGIS | Industry standard geospatial |
| Time-series | TimescaleDB (PG extension) | Flight tracks, signal history |
| Search | HEKTOR (C++) | Our own — 2.9ms p99, no dependency |
| Cache | Redis | PubSub for real-time, session cache |
| AI Kernel | GLADIUS (local) / Claude (remote) | Fallback chain per SHIELD |
| Blockchain | SDN-EVM | Adversarial-grade EVM |
| Mesh | Foundry-Courier | SMS/radio value transfer |
| Security | SENTINEL + QShield | Anomaly detection + post-quantum |
| Governance | ARC | Constitutional smart contracts |
| Memory | COMB | Cross-compaction lossless persistence |
| Orchestration | Agent Framework | Multi-agent coordination |

### Deployment Topology
```
┌──────────────────────────────────────────┐
│         DRAGONFLY (Primary)              │
│                                          │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ │
│  │ GDI API  │ │ HEKTOR   │ │ SATx     │ │
│  │ :8600    │ │ :9090    │ │ :8601    │ │
│  └──────────┘ └──────────┘ └──────────┘ │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ │
│  │ Postgres │ │ Redis    │ │ GLADIUS  │ │
│  │ :5432    │ │ :6379    │ │ (local)  │ │
│  └──────────┘ └──────────┘ └──────────┘ │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ │
│  │ Agent-1  │ │ Agent-2  │ │ SDN-EVM  │ │
│  │ (Mach6)  │ │ (Plug)   │ │ (node)   │ │
│  └──────────┘ └──────────┘ └──────────┘ │
│                                          │
│  nginx reverse proxy :443 (TLS)          │
└──────────────────────────────────────────┘
         │
         │ Encrypted sync
         │
┌────────▼─────────┐  ┌───────────────────┐
│ Swiss VPS (Gitea) │  │ Hetzner (Backup)  │
│ Code mirror       │  │ Restic encrypted  │
└──────────────────┘  └───────────────────┘
```

### All-in-one: `docker-compose.valkyrie.yml`
```yaml
version: '3.9'
services:
  postgres:
    image: postgis/postgis:16-3.4
    volumes: [pgdata:/var/lib/postgresql/data]
    environment:
      POSTGRES_DB: valkyrie
      POSTGRES_PASSWORD: ${PG_PASSWORD}
    ports: ["5432:5432"]

  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]

  hektor:
    build: ../../hektor
    ports: ["9090:9090"]
    volumes: [hektor_data:/data]

  gdi-api:
    build: ./backend
    ports: ["8600:8600"]
    depends_on: [postgres, redis, hektor]
    environment:
      DATABASE_URL: postgresql://postgres:${PG_PASSWORD}@postgres/valkyrie
      REDIS_URL: redis://redis:6379
      HEKTOR_URL: http://hektor:9090
      JWT_SECRET: ${JWT_SECRET}

  gdi-frontend:
    image: nginx:alpine
    ports: ["443:443", "80:80"]
    volumes:
      - ../gdi:/usr/share/nginx/html:ro
      - ./nginx.conf:/etc/nginx/conf.d/default.conf:ro
      - ./certs:/etc/nginx/certs:ro

  satx:
    build: ../../satx
    ports: ["8601:8601"]
    depends_on: [postgres, redis]
    devices: ["/dev/bus/usb:/dev/bus/usb"]  # SDR hardware

volumes:
  pgdata:
  hektor_data:
```

---

## Operational Modes

### Mode 1: FULL ONLINE
All services running, internet available, API keys valid.
- Live ADS-B from OpenSky
- Live seismic from USGS
- Live TLE updates from CelesTrak
- SATx recording and processing
- HEKTOR indexing everything
- Cloud AI (Claude) for analysis
- Real-time collaboration via WebSocket

### Mode 2: DEGRADED ONLINE
Internet unreliable, intermittent connectivity.
- Cache all incoming data locally
- Serve from cache when API fails
- Batch sync when connectivity returns
- SATx operates independently (has its own scheduler)
- GLADIUS local inference for basic analysis

### Mode 3: MESH OFFLINE
No internet. Mesh networking only.
- Foundry-courier for value transfer (SMS/radio/BT)
- SDN-EVM local node for smart contract execution
- SATx autonomous mode (predict → record → process → store)
- GDI serves from local cache only
- HEKTOR serves from local index
- Agents on local models (Ollama)
- Inter-node communication via mesh

### Mode 4: DARK (Air-Gapped)
Complete radio silence. No emissions.
- All processing local
- No network activity of any kind
- SDR in receive-only mode (passive SIGINT)
- Data stored encrypted on local disk
- Operational logs for later sync

### Mode 5: AUTONOMOUS (Dead Man's Switch)
Operator absent. System self-governing.
- Autonomous agents make operational decisions
- Pre-programmed cascade executes
- Code mirrors activated
- Backups verified
- System continues indefinitely

---

## Build Order

### Phase 0: Foundation (THIS WEEK)
- [x] GDI audit complete
- [ ] PostgreSQL + PostGIS deployed on dragonfly
- [ ] FastAPI skeleton with JWT auth
- [ ] GDI pointed at local backend instead of direct API calls
- [ ] TLE auto-fetch pipeline

### Phase 1: Backend Core (Week 2-3)
- [ ] RBAC (Analyst, Commander, Admin, Viewer)
- [ ] Audit logging (immutable)
- [ ] Data persistence (all layer data → PostgreSQL)
- [ ] WebSocket server for real-time push
- [ ] Redis PubSub for inter-service communication

### Phase 2: Intelligence (Week 4-5)
- [ ] HEKTOR integration — semantic search across all intelligence data
- [ ] Correlation engine — cross-reference events across layers
- [ ] Alert system — geofence, threshold, escalation
- [ ] Timeline/playback — scrub through historical data

### Phase 3: SATx Bridge (Week 6-7)
- [ ] SATx → PostgreSQL → HEKTOR pipeline
- [ ] Live satellite pass rendering on GDI globe from SATx data
- [ ] Signal detection catalog with HEKTOR search
- [ ] Automated recording → detection → alert flow

### Phase 4: Hardening (Week 8-9)
- [ ] TLS everywhere (Let's Encrypt or self-signed for air-gap)
- [ ] Input sanitization (search box XSS, API injection)
- [ ] Rate limiting
- [ ] Security audit
- [ ] Classification markings on data elements

### Phase 5: Resilience (Week 10-12)
- [ ] Offline mode with local cache
- [ ] SDN-EVM integration
- [ ] Foundry-courier mesh networking
- [ ] GLADIUS local inference fallback
- [ ] Dead man's switch integration
- [ ] Full disaster recovery test

### Phase 6: Demo (Week 13-14)
- [ ] Polished UI
- [ ] One-command deployment (`docker-compose up`)
- [ ] Demo script for defense stakeholders
- [ ] Documentation package

---

## Who Builds What

### Frontend Team (Eyes + Ears)
- GDI frontend upgrades (new filters, measurement tools, annotations)
- SATx signal processing pipeline
- GLSL shader enhancements
- 3D visualization features
- Creative/UX design

### Backend Team (Spine + Backbone)
- FastAPI backend + PostgreSQL + PostGIS
- HEKTOR integration
- Correlation engine
- Alert system
- WebSocket server
- Auth/RBAC/audit
- Docker deployment
- TLE pipeline
- Security hardening

### Architect & Strategist
- SDN-EVM development
- GLADIUS kernel advancement
- Strategic direction
- Government relationships
- Final architecture decisions

---

## Why "Valkyrie"

In Norse mythology, the Valkyrie choose who lives and who dies on the battlefield. They are not warriors — they are **pathfinders**. They see the whole field, they know every combatant, and they decide the outcome.

Valkyrie doesn't fight. Valkyrie sees. Valkyrie decides. Valkyrie ensures the right information reaches the right people at the right time, even when every conventional path is denied.

The components are built. The machine is assembled.

The Valkyrie flies tonight.

---

*Built by Artifact Virtual.*
*For the world that's coming.*

— Artifact Virtual
