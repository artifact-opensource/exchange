# GDI OVERHAUL — Operation Sovereign Eye
**Date:** 2026-03-05
**Classification:** INTERNAL — Artifact Virtual
**Directive:** Sovereign. Proprietary. The anti-Palantir.

---

## Vision
GDI becomes the world's first sovereign intelligence platform for governments and authorised institutions. Not a public product. A sovereign capability. Every allied nation, defence ministry, and civil security agency gets what Palantir sells for $50M/year — on sovereign infrastructure, zero FISA surface area, zero US corporate dependencies. Air-gapped from day one.

## Architecture: The Sovereign Stack

```
┌──────────────────────────────────────────────────────┐
│                    GDI FRONTEND                       │
│         CesiumJS Globe + Military HUD + GLSL         │
│         Alerting Dashboard + Analyst Workspace        │
└───────────────────────┬──────────────────────────────┘
                        │ WebSocket + REST
┌───────────────────────▼──────────────────────────────┐
│                  GDI BACKEND (FastAPI)                │
│  Auth/RBAC │ API Gateway │ WebSocket Hub │ Alerting  │
│  Audit Log │ Report Gen  │ Correlation   │ Scheduler │
└──┬────────┬────────┬────────┬────────┬───────────────┘
   │        │        │        │        │
   ▼        ▼        ▼        ▼        ▼
┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────────────┐
│HEKTOR│ │GLADIUS│ │ SATx │ │Courier│ │  PostgreSQL   │
│Memory│ │ LLM  │ │SIGINT│ │ Dark  │ │   + PostGIS   │
│Search│ │Local │ │ Feed │ │ Comms │ │  Geospatial   │
└──────┘ └──────┘ └──────┘ └──────┘ └──────────────┘
```

## Phase 1: HEKTOR Integration (BRAIN) — Priority 1
Wire HEKTOR as the correlation engine. Everything gets indexed. Everything becomes searchable.

**Tasks:**
- [ ] HEKTOR REST API service (FastAPI wrapper around C++ core)
- [ ] Ingest pipeline: flights → HEKTOR, seismic → HEKTOR, satellites → HEKTOR, SIGINT → HEKTOR
- [ ] Cross-layer correlation queries: "Aircraft near seismic event at time T"
- [ ] Natural language intelligence search via Valkyrie
- [ ] Persistent memory: GDI gets smarter every day (patterns, anomalies, baselines)

## Phase 2: Alerting Engine — Priority 1
No alerts = blind. Build the nervous system.

**Tasks:**
- [ ] Geofence system (draw regions on globe, trigger on entity enter/exit)
- [ ] Threshold alerts (configurable per layer: magnitude, altitude, count, proximity)
- [ ] Alert types: toast notification, WebSocket push, Discord webhook, email, SMS
- [ ] Escalation chains (Alert → Analyst → Commander → Admin)
- [ ] Alert history + acknowledgment tracking
- [ ] Anomaly detection: ML-based baseline deviation (uses HEKTOR patterns)

## Phase 3: Auth Hardening — Priority 2
Current: single admin user, JWT. Needs real RBAC.

**Tasks:**
- [ ] PostgreSQL user store (replace .users.json)
- [ ] Role hierarchy: Viewer → Analyst → Commander → Admin → SuperAdmin
- [ ] Permission matrix per layer, per tool, per data classification
- [ ] Session management with secure token rotation
- [ ] Audit trail: every action logged (who, what, when, where)
- [ ] MFA support (TOTP)
- [ ] API key management for programmatic access

## Phase 4: Sovereign AI (GLADIUS/Ollama) — Priority 2
Replace all cloud AI with local inference.

**Tasks:**
- [ ] Valkyrie switches to Ollama as primary (qwen3:4b or larger)
- [ ] GLADIUS integration when ready (our weights, our architecture)
- [ ] Intelligence workers run on local LLM (FININT, OSINT, GEOINT analysis)
- [ ] Zero cloud dependency for all intelligence processing
- [ ] Fallback chain: GLADIUS → Ollama → cloud (sanitized only)

## Phase 5: SATx Integration — Priority 3
Satellite ground station feeding live intercepts into the globe.

**Tasks:**
- [ ] SATx → HEKTOR → GDI pipeline (signal catalog, indexed, searchable)
- [ ] Live satellite pass overlay on globe (real-time footprint)
- [ ] Signal classification display (frequency, modulation, source)
- [ ] Automated detection results on globe entity
- [ ] Ghost Mode integration for sensitive operations

## Phase 6: Foundry Courier Dark Comms — Priority 3
When internet dies, GDI still communicates.

**Tasks:**
- [ ] Courier integration for alert distribution (signed tx → radio/mesh/SMS)
- [ ] Offline intelligence package export (encrypted, portable)
- [ ] Mesh network discovery for multi-node GDI deployments
- [ ] Blockchain-based audit trail (immutable, tamper-proof)

## Phase 7: Hardened Deployment — Priority 4
Ship it to authorised operators worldwide.

**Tasks:**
- [ ] License: Proprietary — Artifact Virtual. Restricted deployment.
- [ ] Documentation: installation, configuration, deployment, air-gap guide
- [ ] Docker compose for one-command deployment
- [ ] Helm charts for Kubernetes
- [ ] CI/CD pipeline (internal)
- [ ] Security hardening checklist
- [ ] Demo video + screenshots
- [ ] README that explains WHY, not just HOW

---

## What Gets Built TONIGHT (Sprint 0)

1. **HEKTOR REST API** — wrap HEKTOR C++ as a FastAPI microservice
2. **Correlation Engine** — cross-layer intelligence fusion module
3. **Alerting Foundation** — geofence + threshold alerts + WebSocket push
4. **Auth upgrade** — PostgreSQL user store + RBAC skeleton
5. **Ollama primary** — Valkyrie switches to local LLM

---

*"We are not Palantir. And frankly we are more intelligent."*
*Now we prove it. Open. Free. Sovereign.*
