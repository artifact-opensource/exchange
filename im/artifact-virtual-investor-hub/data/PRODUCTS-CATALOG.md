# Products Catalog

**Artifact Virtual (SMC-Private) Limited**  
**Classification:** Confidential - Investor Relations  
**Version:** 1.0.0  
**Date:** February 10, 2026

---

## Portfolio Overview

**Total Products:** 17  
**Categories:** 4  
**Open Source:** 8 products (MIT/AGPL licensed)  
**Proprietary:** 9 products  
**Revenue Model:** Open-core (free OSS + premium enterprise licensing)

| Category | Products | Status Breakdown |
|----------|----------|-----------------|
| AI/ML Innovation | 8 | 4 Production/Active, 2 Planning, 2 Research |
| Blockchain Infrastructure | 2 | 2 Active Development |
| Enterprise & Operations | 5 | 1 Active, 3 Planning, 1 Development |
| Developer Tools | 2 | 1 Planning, 1 Conceptual |

---

## Category 1: AI/ML Innovation (8 Products)

### 1. HEKTOR - Spectral Vector Database Engine

| Field | Detail |
|-------|--------|
| **One-Line** | World-first spectral and perceptual vector database with hyperspectral support |
| **Status** | Production (v4.1.7) |
| **Priority** | High |
| **License** | Open Source (MIT) + Enterprise |
| **Repository** | [github.com/amuzetnoM/hektor](https://github.com/amuzetnoM/hektor) |
| **Package** | PyPI: `hektor-vdb` |

**Technical Specifications:**
- **Engine:** C++23 with SIMD optimization (AVX2/AVX-512)
- **Architecture:** 6-layer (L0-L5), 60+ classes, 30+ CLI commands
- **Indexing:** HNSW (Hierarchical Navigable Small World) graph
- **Search:** Hybrid vector + BM25, spectral similarity, perceptual quantization
- **Performance:** Sub-3ms query latency at billion-scale
- **Encoders:** Text (MiniLM-L6-v2), Image (CLIP ViT-B/32), 512-dimensional unified space
- **API:** FastAPI REST interface
- **Desktop:** Quantization Studio (Electron app)
- **Quality:** 85% test coverage, Production Readiness Score 9.2/10

**Market Differentiation:**  
No competing vector database (Pinecone, Weaviate, Milvus, Qdrant, Chroma) offers spectral or perceptual vector capabilities. HEKTOR operates on entirely different mathematical principles, enabling applications in hyperspectral imaging, satellite remote sensing, medical diagnostics, and scientific research that are impossible with conventional cosine-similarity approaches.

**Pricing:**

| Tier | Price | Includes |
|------|-------|----------|
| Community (OSS) | Free | Core engine, CLI, Python bindings |
| Professional | $5,000/year | Priority support, advanced analytics |
| Enterprise | $25,000-$50,000/year | Custom deployment, SLA, dedicated support |

---

### 2. GLADIUS - Novel AI Algorithms Platform

| Field | Detail |
|-------|--------|
| **One-Line** | Flagship AI platform with proprietary 71M-parameter model and 26-agent autonomous ecosystem |
| **Status** | Active Development / Research |
| **Priority** | P0 Critical (Flagship) |
| **License** | Proprietary |
| **Repository** | [github.com/Artifact-Virtual/GLADIUS](https://github.com/Artifact-Virtual/GLADIUS) |

**Technical Specifications:**
- **Core Model:** GLADIUS 1.1 - 71M-parameter native model (proprietary architecture)
- **Agent System:** LEGION - 26 autonomous agents (Research, Analysis, Finance, Trading, DevOps, Governance, etc.)
- **Dashboard:** Enterprise-grade (React 18 + Tailwind CSS)
- **Research System:** "Arty" - autonomous research team
- **Market Intelligence:** Syndicate market research subsystem
- **Trading:** UniXchange trading interface
- **Infrastructure:** Deployment automata, organizational governance module
- **Stack:** Python, Electron, React 18, Tailwind CSS, Node.js, Celery, Redis

**Market Position:**  
GLADIUS represents the company's highest-risk, highest-reward technical bet. The 71M-parameter proprietary model and 26-agent LEGION ecosystem are designed to provide enterprise-grade AI orchestration capabilities that do not exist as integrated offerings from any current competitor.

**Pricing:**

| Tier | Price |
|------|-------|
| Enterprise License | $50,000-$500,000+/year |
| Custom Deployment | Negotiated |

---

### 3. CTHULU - Autonomous Trading & ML Orchestration

| Field | Detail |
|-------|--------|
| **One-Line** | Autonomous multi-strategy trading system with ML/RL pipeline and Trading-Native Transformer |
| **Status** | Production (v5.3.0 "EVOQUE") |
| **Priority** | High (Flagship) |
| **License** | AGPL-3.0 |
| **Repository** | [github.com/amuzetnoM/cthulu](https://github.com/amuzetnoM/cthulu) |
| **Model Hub** | [huggingface.co/amuzetnoM/CTHULU](https://huggingface.co/amuzetnoM/CTHULU) |

**Technical Specifications:**
- **Trading:** 7 active strategies, 12 technical indicators, SAFE (Set And Forget Engine)
- **ML Pipeline:** Full ML/RL training and inference pipeline
- **Cognition:** AI reasoning layer for market analysis
- **TNT v2.0:** Trading-Native Transformer (472K parameters, pure NumPy implementation)
- **EVOQUE Model:** ~3,715 trainable parameters (lightweight edge deployment)
- **Platform:** MetaTrader 5 integration
- **Scale:** 288 files, 72,546 LOC, 2,275 functions, 503 classes, 32 modules
- **Quality:** 185+ tests passing, 95% coverage; TNT: 45 tests, 100% coverage
- **Stack:** Python 3.10-3.13, PyTorch, NumPy, SQLite (WAL mode), Angular, Prometheus, Docker, GCP

**Pricing:**

| Tier | Price |
|------|-------|
| Enterprise License | Starting $100,000/year |
| Managed Service | Custom pricing |

---

### 4. REASON - Logical Reasoning & Inference AI

| Field | Detail |
|-------|--------|
| **One-Line** | Production-grade multi-agent reasoning system for scientific discovery and theorem generation |
| **Status** | Active Development (v1.1.0) |
| **Priority** | Medium |
| **License** | MIT (Open Source) |
| **Repository** | [github.com/Artifact-Virtual/REASON](https://github.com/Artifact-Virtual/REASON) |

**Technical Specifications:**
- **Core:** Autonomous Theorem Discovery System
- **Capabilities:** Multi-agent hypothesis generation, symbolic regression (PySR), formal proof verification (Lean 4), academic paper generation (LaTeX/PDF)
- **Performance:** Conjecture generation ~50ms, iteration cycle ~100ms, paper generation ~2-3ms
- **Quality:** 23/23 tests passing (100%), 80% roadmap complete
- **Stack:** Python 3.12+, FastAPI, Streamlit, Pydantic, asyncio, SymPy, PySR, scikit-learn, Ollama, Celery + Redis, Docker, Kubernetes

**Pricing:** Free (Open Source) with enterprise support available

---

### 5. SENTINEL - AI Monitoring & Anomaly Detection

| Field | Detail |
|-------|--------|
| **One-Line** | Autonomous Security & Audit System (ASAS) with ML-based threat detection |
| **Status** | Active Development (v1.0.0, released 2026-01-13) |
| **Priority** | High |
| **License** | Open Source |
| **Repository** | [github.com/Artifact-Virtual/SENTINEL](https://github.com/Artifact-Virtual/SENTINEL) |

**Technical Specifications:**
- **Framework:** Constitutional AI for security governance
- **ML Models:** IsolationForest, DBSCAN anomaly detection
- **CLI:** 24 commands
- **Coverage:** 83 functions, 6 core components, 14 target types
- **Stack:** Python 3.8+, scikit-learn

**Pricing:** Free (Open Source) with enterprise support available

---

### 6. ORXL - Universal Argmax Prediction System

| Field | Detail |
|-------|--------|
| **One-Line** | Universal prediction system based on argmax scoring - predict anything from markets to weather |
| **Status** | Active Development (v1.0.0) |
| **Priority** | Medium |
| **License** | MIT (Open Source) |
| **Repository** | [github.com/amuzetnoM/orxl](https://github.com/amuzetnoM/orxl) |

**Technical Specifications:**
- **Core Equation:** x-hat = argmax over C of S(x|c)
- **Modules:** 8 (data ingestion, feature engineering, prediction core, risk management, execution, monitoring, orchestrator, web UI)
- **Data Sources:** FRED, Yahoo Finance, Binance, CoinGecko, universal file
- **Quality:** 24/25 tests (96%), 0 security alerts, 56K+ lines documentation
- **Stack:** Python 3.8+, NumPy/SciPy (no ML frameworks), Flask, vanilla JS

**Pricing:** Free (Open Source)

---

### 7. Artifact IDK - Interdisciplinary Knowledge Base

| Field | Detail |
|-------|--------|
| **One-Line** | AI-powered interdisciplinary knowledge base for research and knowledge discovery |
| **Status** | Research / Planning |
| **Priority** | Medium-High |
| **License** | Proprietary |

**Pricing:** TBD (Research phase)

---

### 8. Virtual Lab (artifact_lab) - Research & Experimentation Platform

| Field | Detail |
|-------|--------|
| **One-Line** | Comprehensive development studio with AI assistance, 3D visualization, and research sub-projects |
| **Status** | WIP / Planning |
| **Priority** | High |
| **License** | Open Source |
| **Repository** | [github.com/amuzetnoM/artifact_lab](https://github.com/amuzetnoM/artifact_lab) |

**Technical Specifications:**
- **ADE:** Monaco Editor, AI-powered assistance (Ollama), 3D codebase visualization, file watcher, dependency indexer
- **Research Sub-Projects:** Quantum engine, multi-agent orchestration, GPTransformer training suite, ADAM Protocol, BlackNet networking protocol, multi-modal embedding system
- **AI Frameworks:** Laws of Robotics, Social Dimensionality, PUP, ANF, Temporal Locationing
- **worxpace:** Enterprise AI automation platform (React, Vite, Drizzle ORM, Neon PostgreSQL)
- **Stack:** Python 3.9+, Ollama, Flask, Pygame, Electron, TypeScript, React, Vite, Docker

**Pricing:** Free (Open Source) with commercial licensing planned

---

## Category 2: Blockchain Infrastructure (2 Products)

### 9. ARC - Blockchain Identity & SBT Platform

| Field | Detail |
|-------|--------|
| **One-Line** | Full blockchain ecosystem with ERC20 token, NFTs, DAO governance, and AI engine on Base L2 |
| **Status** | Active Development |
| **Priority** | High (Flagship) |
| **License** | Open Source |
| **Repository** | [github.com/Artifact-Virtual/ARC](https://github.com/Artifact-Virtual/ARC) |

**Technical Specifications:**
- **Token:** ARCx V2 ERC20 (UUPS proxy on Base L2)
- **Contract:** `0xA4093669DAFbD123E37d52e0939b3aB3C2272f44`
- **Components:** Uniswap V4 LP, NFT ecosystem (ERC721 + ERC1155), DAO governance, AI engine (multi-LLM), ADAM Constitutional Policy Engine
- **Consensus:** Hybrid Type Theory - claimed 10x faster than Ethereum
- **SBT:** Soulbound Token implementation
- **Stack:** Solidity 0.8.21, Hardhat 2.26.x, OpenZeppelin, Ethers.js, TypeScript, React, Next.js 13, Base L2

**Pricing:**

| Tier | Price |
|------|-------|
| Public (Gas fees only) | Variable |
| Enterprise Private Deployment | $50,000/year |

---

### 10. OUTCOME - On-Chain Outcome Verification

| Field | Detail |
|-------|--------|
| **One-Line** | Blockchain protocol for verifiable outcome tracking, settlement, and dispute resolution |
| **Status** | Active Development (Concept) |
| **Priority** | Medium |
| **License** | Open Source |
| **Repository** | [github.com/Artifact-Virtual/PROJECT-OUTCOME](https://github.com/Artifact-Virtual/PROJECT-OUTCOME) |

**Use Cases:** Prediction markets, insurance, supply chain verification, milestone-based payments

**Pricing:** Free (Open Source)

---

## Category 3: Enterprise & Operations (5 Products)

### 11. Artifact ERP - Enterprise Resource Planning

| Field | Detail |
|-------|--------|
| **One-Line** | AI-native ERP with 50% lower TCO than SAP/Oracle, 4-week implementation |
| **Status** | Planning |
| **Priority** | P0 Critical |
| **License** | Proprietary (Flagship) |
| **Repository** | [github.com/amuzetnoM/business_erp](https://github.com/amuzetnoM/business_erp) |

**Technical Specifications:**
- **Modules:** Finance, Operations, HR, Supply Chain, CRM
- **AI:** AI-powered analytics, workflow automation, predictive insights
- **Dashboards:** Real-time operational dashboards
- **Integrations:** 500+ planned
- **Implementation:** 4 weeks (vs 6-12 months for SAP/Oracle)
- **Stack:** React, Node.js, PostgreSQL

**Pricing:**

| Tier | Price |
|------|-------|
| Starter (10 users) | $2,000/month |
| Business (50 users) | $5,000/month |
| Enterprise (unlimited) | $10,000-$100,000/year |

---

### 12. AVPM - GitHub-Native Project Management

| Field | Detail |
|-------|--------|
| **One-Line** | Bi-directional GitHub project sync with AI-assisted planning and developer analytics |
| **Status** | Development |
| **Priority** | High |
| **License** | Proprietary |
| **Repository** | [github.com/amuzetnoM/gh_projects](https://github.com/amuzetnoM/gh_projects) |

**Pricing:** Free (OSS core) / $15/user/month (commercial)

---

### 13. AVA - Agency Management System

| Field | Detail |
|-------|--------|
| **One-Line** | Specialized ERP for creative and professional service agencies |
| **Status** | Active Development (Concept) |
| **Priority** | Medium-High |
| **License** | Proprietary |
| **Repository** | [github.com/amuzetnoM/AVA](https://github.com/amuzetnoM/AVA) |

**Features:** Client portal, resource scheduling, project profitability tracking, time tracking, invoicing

**Pricing:** $99/month (5 users) / $299/month (25 users) / Enterprise custom

---

### 14. METEOR - Project Intelligence & Analytics

| Field | Detail |
|-------|--------|
| **One-Line** | AI-driven predictive analytics for project portfolio management |
| **Status** | Planning |
| **Priority** | High |
| **License** | Proprietary |
| **Repository** | [github.com/amuzetnoM/project_manager](https://github.com/amuzetnoM/project_manager) |

**Features:** ML predictions for delays/budget overruns, portfolio optimization, risk detection, what-if scenarios

**Pricing:** $199/month + $50/project/month

---

### 15. DOCKIT - Document Management & Workflow

| Field | Detail |
|-------|--------|
| **One-Line** | AI-powered document management with classification, extraction, and workflow automation |
| **Status** | Planning |
| **Priority** | Medium |
| **License** | Proprietary |
| **Repository** | [github.com/amuzetnoM/dockit-app](https://github.com/amuzetnoM/dockit-app) |

**Pricing:** $49/user/month

---

## Category 4: Developer Tools (2 Products)

### 16. Artifact SDK - Developer Integration Toolkit

| Field | Detail |
|-------|--------|
| **One-Line** | Multi-language SDK (Python, JS, Java, Go, Rust, C#) with unified API and code generation |
| **Status** | Planning |
| **Priority** | High |
| **License** | Open Source |
| **Repository** | [github.com/amuzetnoM/ARTIFACT-SDK](https://github.com/amuzetnoM/ARTIFACT-SDK) |

**Pricing:** Free (Open Source)

---

### 17. SYNDICATE - Collaboration Platform

| Field | Detail |
|-------|--------|
| **One-Line** | Open source collaboration platform with real-time communication and integration hub |
| **Status** | Conceptual (evolved from GOLDMAX) |
| **Priority** | Medium |
| **License** | Open Source |
| **Repository** | [github.com/amuzetnoM/syndicate](https://github.com/amuzetnoM/syndicate) |

**Features:** Real-time chat/video/screen sharing, document workspace, integrations (GitHub, Jira, Slack, Google), self-hosted (Docker/Kubernetes)

**Pricing:** Free (OSS) / $5/user/month (managed hosting)

---

## Revenue Potential Summary

| Product | Year 1 Revenue Potential | Year 3 Revenue Potential |
|---------|--------------------------|--------------------------|
| HEKTOR | $25K-$150K | $500K-$2M |
| GLADIUS | $100K-$500K | $2M-$10M |
| CTHULU | $100K-$300K | $1M-$5M |
| Artifact ERP | - (planning) | $500K-$3M |
| ARC | $50K | $200K-$500K |
| Infrastructure Services | $200K-$600K | $5M-$15M |
| Other Products | $25K-$100K | $500K-$2M |
| **Total** | **$500K-$1.7M** | **$9.7M-$37.5M** |

---

*Confidential - Artifact Virtual (SMC-Private) Limited*
