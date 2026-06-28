import { Company, Project, DocumentFile, RoadmapMilestone } from '../types';

export const COMPANY_DATA: Company = {
  name: "Artifact Virtual (SMC-Private) Limited",
  registration: "SECP #0325693",
  founded: "2025",
  headquarters: "Islamabad, Pakistan",
  mission: "Build the AI-native enterprise stack that hyperscalers are too large to specialize in and startups are too narrow to complete.",
  vision: "Democratize access to enterprise-grade AI/ML capabilities via specialized infrastructure.",
  divisions: [
    { code: "AVRD", name: "Research & Development", focus: "Product engineering, AI/ML research" },
    { code: "AVML", name: "Machine Learning", focus: "ML platforms, model training, MLOps" },
    { code: "AVRM", name: "Resource Management", focus: "Infrastructure, operations, business systems" }
  ],
  social: {
    github: "https://github.com/Artifact-Virtual",
    website: "https://artifactvirtual.com",
    email: "investors@artifactvirtual.com"
  },
  stats: {
    products: 17,
    projects: 18,
    categories: 4
  }
};

export const PROJECTS_DATA: Project[] = [
  // AI/ML Core
  {
    id: "hektor",
    name: "HEKTOR",
    category: "AI/ML Core",
    status: "Production",
    priority: "P0",
    description: "World-first spectral and perceptual vector database with hyperspectral support. C++23 engine, sub-3ms latency.",
    revenuePotential: "$30M-120M",
    technologies: ["C++23", "Python", "SIMD", "HNSW"],
    repo: "github.com/amuzetnoM/hektor",
    version: "4.1.7"
  },
  {
    id: "gladius",
    name: "GLADIUS",
    category: "AI/ML Core",
    status: "Development",
    priority: "P0",
    description: "Enterprise AI platform with proprietary 71M-parameter model and 26-agent ecosystem.",
    revenuePotential: "$30M-120M",
    technologies: ["Python", "PyTorch", "Transformers", "React"],
    repo: "github.com/Artifact-Virtual/GLADIUS",
    version: "1.x"
  },
  {
    id: "cthulu",
    name: "CTHULU",
    category: "AI/ML Core",
    status: "Production",
    priority: "P0",
    description: "Autonomous trading system with pure NumPy TNT transformer architecture and 7 strategies.",
    revenuePotential: "$30M-120M",
    technologies: ["Python", "NumPy", "MetaTrader 5"],
    repo: "github.com/amuzetnoM/cthulu",
    version: "5.3.0"
  },
  {
    id: "reason",
    name: "REASON",
    category: "AI/ML Core",
    status: "Active",
    priority: "P1",
    description: "Multi-step reasoning and logical inference engine for scientific discovery.",
    revenuePotential: "$1M-5M",
    technologies: ["Python", "Lean 4", "PySR"],
    repo: "github.com/Artifact-Virtual/REASON",
    version: "1.1.0"
  },
  {
    id: "sentinel",
    name: "SENTINEL",
    category: "AI/ML Core",
    status: "Active",
    priority: "P1",
    description: "AI security monitoring, anomaly detection, and compliance auditing system.",
    revenuePotential: "$1M-5M",
    technologies: ["Python", "Scikit-learn"],
    repo: "github.com/Artifact-Virtual/SENTINEL",
    version: "1.0.0"
  },
  // Enterprise Software
  {
    id: "artifact-erp",
    name: "Artifact ERP",
    category: "Enterprise Software",
    status: "Development",
    priority: "P1",
    description: "AI-native ERP with finance, HR, and ops modules. 50% lower TCO than SAP.",
    revenuePotential: "$15M-30M",
    technologies: ["Python", "React", "PostgreSQL"],
    repo: "github.com/amuzetnoM/business_erp"
  },
  {
    id: "avpm",
    name: "AVPM",
    category: "Enterprise Software",
    status: "Active",
    priority: "P2",
    description: "GitHub-native project management with AI planning.",
    revenuePotential: "$1M-5M",
    technologies: ["Python", "GitHub API"],
    repo: "github.com/amuzetnoM/gh_projects"
  },
  // Blockchain
  {
    id: "arc",
    name: "ARC",
    category: "Blockchain / Web3",
    status: "Active",
    priority: "P1",
    description: "Utility token ecosystem on Base L2 (Coinbase) for platform services.",
    revenuePotential: "$5M-40M",
    technologies: ["Solidity", "Base L2", "React"],
    repo: "github.com/Artifact-Virtual/ARC"
  },
  // Developer Tools
  {
    id: "sdk",
    name: "ARTIFACT-SDK",
    category: "Developer Tools & Platform",
    status: "Active",
    priority: "P1",
    description: "Unified SDK for all AV products with multi-language support.",
    revenuePotential: "$1M-5M",
    technologies: ["Python", "TypeScript"],
    repo: "github.com/amuzetnoM/ARTIFACT-SDK"
  }
];

export const FINANCIAL_DATA = {
  // Projections matched to FINANCIAL-PROJECTIONS.md Revenue Summary
  projections: [
    { year: '2026', revenue_base: 0.6, revenue_bull: 1.5, revenue_bear: 0.4, type: 'Projected' },
    { year: '2027', revenue_base: 2.5, revenue_bull: 7.0, revenue_bear: 1.5, type: 'Projected' },
    { year: '2028', revenue_base: 8.0, revenue_bull: 25.0, revenue_bear: 5.0, type: 'Projected' },
    { year: '2029', revenue_base: 23.0, revenue_bull: 70.0, revenue_bear: 15.0, type: 'Projected' },
    { year: '2030', revenue_base: 56.5, revenue_bull: 250.0, revenue_bear: 30.0, type: 'Projected' },
  ],
  market: [
    { name: 'TAM (Global AI)', value: 135800, fill: '#14b8a6' }, // $135.8B
    { name: 'SAM (Target)', value: 10000, fill: '#0f766e' }, // $10B
    { name: 'SOM (Obtainable)', value: 250, fill: '#0d9488' } // $250M
  ],
  useOfFunds: [
    { name: 'Engineering & Product', value: 40, fill: '#14b8a6' },
    { name: 'Team & Hiring', value: 30, fill: '#0f766e' },
    { name: 'Infrastructure', value: 20, fill: '#0d9488' },
    { name: 'Working Capital', value: 10, fill: '#115e59' },
  ]
};

export const INVESTOR_ROADMAP_DATA: RoadmapMilestone[] = [
  {
    id: "rm-01",
    quarter: "Q1 2026",
    title: "Regulatory Foundation",
    description: "Establishment of legal and compliance frameworks for export-grade IT operations.",
    status: "in-progress",
    category: "Regulatory",
    tasks: [
      { id: "t-1", name: "PSEB TechDestination Registration", status: "completed" },
      { id: "t-2", name: "PTA OASIS Portal Registration", status: "in-progress" },
      { id: "t-3", name: "Legal Opinion on ARC Token", status: "pending" }
    ],
    dependencies: ["SECP Incorporation (Completed)"]
  },
  {
    id: "rm-02",
    quarter: "Q2 2026",
    title: "Infrastructure & Launch",
    description: "Deployment of physical infrastructure and initial commercial launch in Pakistan.",
    status: "upcoming",
    category: "Infrastructure",
    tasks: [
      { id: "t-4", name: "CVAS License Approval", status: "pending" },
      { id: "t-5", name: "HEKTOR Cloud Beta Launch", status: "pending" },
      { id: "t-6", name: "Pre-Seed Round Closing", status: "pending" }
    ],
    dependencies: ["PSEB Registration", "Capital Injection"]
  },
  {
    id: "rm-03",
    quarter: "Q3 2026",
    title: "Operational Scale",
    description: "Scaling of managed hosting services and initial US/EU virtual service offering.",
    status: "upcoming",
    category: "Product",
    tasks: [
      { id: "t-7", name: "PKNIC Reseller Accreditation", status: "pending" },
      { id: "t-8", name: "CTDISR Security Implementation", status: "pending" },
      { id: "t-9", name: "US Virtual Sales Team Setup", status: "pending" }
    ],
    dependencies: ["CVAS License", "Infrastructure Deployment"]
  },
  {
    id: "rm-04",
    quarter: "Q4 2026",
    title: "Enterprise Readiness",
    description: "Preparation for enterprise-grade audits and global expansion.",
    status: "upcoming",
    category: "Corporate",
    tasks: [
      { id: "t-10", name: "SOC 2 Readiness Assessment", status: "pending" },
      { id: "t-11", name: "GLADIUS Enterprise v1 Launch", status: "pending" },
      { id: "t-12", name: "$50K MRR Milestone", status: "pending" }
    ],
    dependencies: ["Operational Stability", "Initial Customer Traction"]
  },
  {
    id: "rm-05",
    quarter: "H1 2027",
    title: "Series A & Global SaaS",
    description: "Major funding round to fuel international physical presence and SaaS platform.",
    status: "upcoming",
    category: "Corporate",
    tasks: [
      { id: "t-13", name: "Series A Fundraising ($3-5M)", status: "pending" },
      { id: "t-14", name: "Artifact ERP Global Launch", status: "pending" },
      { id: "t-15", name: "EU Office Establishment", status: "pending" }
    ],
    dependencies: ["$1M ARR", "SOC 2 Audit Start"]
  }
];

export const DOCUMENTS: DocumentFile[] = [
    {
    id: "business-profile",
    title: "Business Profile & Portfolio",
    filename: "BUSINESS-PROFILE.md",
    category: "Strategy",
    lastUpdated: "Feb 10, 2026",
    content: `# Business Portfolio

**Artifact Virtual (SMC-Private) Limited**  
**Classification:** Confidential - Investor Relations  
**Version:** 1.0.0  
**Date:** February 10, 2026

---

## Executive Summary

Artifact Virtual is a specialized AI/ML infrastructure and enterprise software company headquartered in Islamabad, Pakistan, registered with SECP under number 0325693 pursuant to the Companies Act 2017. The company builds purpose-built computing infrastructure, develops novel artificial intelligence technologies, and delivers enterprise software platforms to organizations requiring advanced computation capabilities.

**Investment Thesis:** Artifact Virtual is positioned at the intersection of three converging trends - explosive global demand for AI infrastructure, severe undersupply of specialized AI/ML computing capacity, and a largely untapped Pakistan data center market growing at 17-18% CAGR. The company's proprietary technologies (HEKTOR spectral vector database, GLADIUS novel AI platform) create genuine technical differentiation in a market dominated by commodity providers.

---

## Company Overview

### Legal Structure

| Field | Detail |
|-------|--------|
| **Legal Name** | Artifact Virtual (SMC-Private) Limited |
| **Registration** | SECP #0325693 |
| **Type** | Single Member Company (Private) Limited |
| **Jurisdiction** | Pakistan (Companies Act, 2017) |
| **Founded** | 2025 |
| **Headquarters** | Islamabad, Pakistan |
| **Operational Regions** | Pakistan (physical), US (virtual, planned), EU (virtual, planned) |

### Organizational Structure

The company operates through three core divisions and eleven departments:

**Divisions:**
- **AVRD** (Research & Development) - Core technology R&D, open-source and proprietary development
- **AVML** (Machine Learning) - ML operations, model governance, training pipelines, inference at scale
- **AVRM** (Resource Management) - AI systems, storage, compute, security, and integration management

**Departments:** Executive, AVRD, AVML, AVRM, Marketing, Operations, Research, Finance, HR, IT Infrastructure, Security, Legal & Compliance

**Governance:** Board of Directors with independent oversight, quarterly meetings, 8-phase strategic roadmap

---

## The Opportunity

### Market Size

| Market Segment | TAM | Growth Rate | Source |
|----------------|-----|-------------|--------|
| Global AI Infrastructure | $135.8B (2024) | 19.4% CAGR to $394.5B (2030) | MarketsandMarkets |
| Global AI Market (Total) | $371.7B (2025) | 30.6% CAGR to $2,407B (2032) | Fortune Business Insights |
| Cloud AI Market | $327.2B by 2029 | ~25% CAGR | Industry estimates |
| Pakistan Data Center | $280-350M | 17-18% CAGR | PSEB/Industry |
| Pakistan IT Load | 23.53 MW (2025) | 17.77% CAGR to 53.30 MW (2030) | Arizton |
| US AI/ML Infrastructure | $8-12B (current) | 25-30% CAGR to $25-30B (2028) | Industry estimates |
| EU Cloud & Data Center | EUR 35-40B | 7-9% CAGR | Industry estimates |

**Total Addressable Market (Combined):** $100B+

### Why Artifact Virtual

1. **Cost Advantage:** Pakistan operations run 60-70% cheaper than US equivalents, enabling 40-50% below hyperscaler pricing while maintaining 50-60% gross margins
2. **Technical Differentiation:** HEKTOR (world-first spectral vector database) and GLADIUS (novel AI platform) have no direct competitors
3. **First Mover:** Pakistan's data center market lacks a credible AI/ML-specialized provider; Islamabad is the fastest-growing data center hotspot (18.70% CAGR)
4. **Compliance-First:** 100% GRC compliance from inception (10/10 controls, 52 control codes documented)
5. **Multi-Model Strategy:** Physical (Pakistan) + Virtual (US/EU) + Cloud (Global SaaS from 2027) provides diversified revenue
`
  },
  {
    id: "financial-projections",
    title: "Financial Projections (5-Year)",
    filename: "FINANCIAL-PROJECTIONS.md",
    category: "Financials",
    lastUpdated: "Feb 10, 2026",
    content: `# Financial Projections

**Artifact Virtual (SMC-Private) Limited**  
**Classification:** Confidential - Investor Relations  
**Version:** 1.0.0  
**Date:** February 10, 2026

---

## Assumptions

### Revenue Assumptions
- Fiscal year aligned to calendar year (January-December)
- Multi-product revenue model: software licenses, SaaS subscriptions, infrastructure services, consulting
- Pricing in USD for international and PKR for domestic (hedged via multi-currency billing)
- Net revenue retention (NRR) improves from 105% (Y1) to 130%+ (Y5) as products mature
- Customer acquisition cost (CAC) payback period: 6-12 months

### Cost Assumptions
- Pakistan-based operations: 60-70% cost advantage over US equivalents
- Average engineer salary: PKR 400K-800K/month ($1,400-$2,800)
- Cloud infrastructure: operated on leased/collocated hardware supplemented by public cloud
- Office: Islamabad co-working initially, scaled to office at 20+ employees

## Five-Year P&L Projection

### Revenue Summary

| Metric | Year 1 | Year 2 | Year 3 | Year 4 | Year 5 |
|--------|--------|--------|--------|--------|--------|
| **Total Revenue** | $600K-1.5M | $2.5M-7M | $8M-25M | $23M-70M | $56.5M-250M |
| **Revenue Growth** | — | 300-400% | 200-250% | 180-200% | 145-260% |
| **Gross Margin** | 70-83% | 80-86% | 80-85% | 82-85% | 82-85% |
| **EBITDA Margin** | 22-37% | 46-56% | 46-51% | 47-53% | 53-63% |

### Cash Position (with Funding)

| Metric | Year 1 | Year 2 | Year 3 | Year 4 | Year 5 |
|--------|--------|--------|--------|--------|--------|
| Opening Cash | $500K-1M | $480K-1.25M | $4.23M-7.3M | $6.63M-16M | $13.33M-42.2M |
| Funding Inflow | $0 | $3M-5M | $0 | $0 | $0-10M |
| Closing Cash | $480K-1.25M | $4.23M-7.3M | $6.63M-16M | $13.33M-42.2M | $32.33M-172.2M |
`
  },
  {
    id: "funding-strategy",
    title: "Funding Strategy & Cap Table",
    filename: "FUNDING-STRATEGY.md",
    category: "Strategy",
    lastUpdated: "Feb 10, 2026",
    content: `# Funding Strategy

**Artifact Virtual (SMC-Private) Limited**  
**Classification:** Confidential - Investor Relations

## Funding Overview

### Capital Requirements Summary

| Stage | Timing | Amount | Valuation (Pre-Money) | Purpose |
|-------|--------|--------|----------------------|---------|
| **Pre-Seed** | Q1-Q2 2026 | $500K-$1M | $3M-$5M | Product launch, initial team, infrastructure setup |
| **Series A** | H1 2027 | $3M-$5M | $15M-$25M | Scale team, US/EU market entry, data center lease |
| **Series B** | 2029 | $10M-$20M | $50M-$150M | Geographic expansion, own DC, aggressive growth |

**Total Capital Requirement:** $3.5M-$6M (Pre-Seed + Series A)

## Pre-Seed Round

### Use of Funds ($750K base case)

| Category | Amount | % | Purpose |
|----------|--------|---|---------|
| **Engineering & Product** | $300K | 40% | 8-12 engineers, product development |
| **Team & Hiring** | $225K | 30% | VP Engineering, ML engineers, DevOps lead |
| **Infrastructure** | $150K | 20% | Servers, GPU hardware, colocation lease |
| **Working Capital** | $75K | 10% | Office, legal, accounting, insurance |
`
  },
  {
    id: "market-research",
    title: "Market Research & Analysis",
    filename: "MARKET-RESEARCH.md",
    category: "Strategy",
    lastUpdated: "Feb 10, 2026",
    content: `# Market Research

## Global AI Infrastructure Market

| Metric | Value |
|--------|-------|
| Global AI Infrastructure Market (2024) | $135.81 billion |
| Projected (2030) | $394.46 billion |
| CAGR (2024-2030) | 19.4% |

## Pakistan Data Center Market

| Metric | Value |
|--------|-------|
| Installed IT Load (2025) | 23.53 MW |
| Projected IT Load (2030) | 53.30 MW |
| Market Value (2025 est.) | $280-350 million |
| Islamabad CAGR | 18.70% |

**Notable Gap:** No providers specialize in AI/ML infrastructure.

## TAM/SAM/SOM Analysis

### Total Addressable Market (TAM): $100B+
- Global AI Infrastructure ($135.8B)

### Serviceable Addressable Market (SAM): $5-10B
- Pakistan data center (AI/ML segment): $50-100M
- US AI infrastructure (SMB + mid-market): $2-4B
- Vector database market: $1.5-2.5B

### Serviceable Obtainable Market (SOM): $50-250M by 2030
- Pakistan: $10-30M
- US/EU: $20-100M
- Software Products: $20-120M
`
  },
  {
    id: "project-portfolio",
    title: "Full Project Portfolio",
    filename: "PROJECT-PORTFOLIO.md",
    category: "Product",
    lastUpdated: "Feb 10, 2026",
    content: `# Project Portfolio

Artifact Virtual maintains **18 active projects** across **4 categories**.

## Category 1: AI/ML Core

### HEKTOR — High-Performance Vector Database
**Status:** Active / Production-Ready (v4.1.7)
**Key Specs:** Sub-3ms query latency, billion-scale indexing, spectral/hyperspectral vector support.
**Market:** Vector database ($1.5-2.5B)

### GLADIUS — Enterprise AI Agent Platform
**Status:** Active / Development (v1.x)
**Key Specs:** 71M-parameter language model, 26 specialized LEGION agents.
**Unique Capability:** Fully integrated agent platform with proprietary model.

### CTHULU — Autonomous Trading System
**Status:** Active / Production (v5.3.0)
**Key Specs:** TNT transformer architecture, 7 trading strategies, pure NumPy.
**Market:** Algorithmic trading ($15B → $30B by 2030)

### REASON — AI Reasoning Engine
**Status:** Active
**Key Specs:** Multi-step reasoning, chain-of-thought, logical inference engine.

### SENTINEL — AI Security & Monitoring
**Status:** Active
**Key Specs:** AI model monitoring, anomaly detection, security scanning.
`
  },
  {
    id: "competitive-landscape",
    title: "Competitive Landscape",
    filename: "COMPETITIVE-LANDSCAPE.md",
    category: "Strategy",
    lastUpdated: "Feb 10, 2026",
    content: `# Competitive Landscape

## Competitive Positioning Summary

| Arena | AV Offering | Primary Competitors | AV Advantage |
|-------|------------|---------------------|-------------|
| Vector Databases | HEKTOR | Pinecone, Weaviate | Spectral search (unique), C++23 performance |
| AI Agent Platforms | GLADIUS | LangChain, AutoGen | Proprietary 71M-param model |
| Algorithmic Trading | CTHULU | QuantConnect | Full-stack autonomous, pure NumPy |
| Cloud & Infra | VPS/Hosting | AWS, CoreWeave | Pakistan cost base, 40-50% cheaper |

## Moat Assessment

**HEKTOR:** Technological (spectral search). Deep moat (3-5 years).
**Infrastructure:** Geographic (Pakistan position) + Cost. Deep in Pakistan.
**ERP:** Integration + Localization. Medium depth.
`
  },
  {
    id: "products-catalog",
    title: "Products Catalog",
    filename: "PRODUCTS-CATALOG.md",
    category: "Product",
    lastUpdated: "Feb 10, 2026",
    content: `# Products Catalog

## Portfolio Overview

**Total Products:** 17  
**Categories:** 4  
**Open Source:** 8 products  
**Proprietary:** 9 products  

## Category 1: AI/ML Innovation (8 Products)

### 1. HEKTOR - Spectral Vector Database Engine
**Technical Specifications:** C++23, SIMD optimization, HNSW graph. Sub-3ms query latency.
**Market Differentiation:** Spectral/perceptual vector capabilities.

### 2. GLADIUS - Novel AI Algorithms Platform
**Technical Specifications:** 71M-parameter model, 26 autonomous agents.

### 3. CTHULU - Autonomous Trading
**Technical Specifications:** Pure NumPy Transformer (TNT), 7 strategies.

## Category 2: Blockchain Infrastructure
9. ARC (Base L2)
10. OUTCOME

## Category 3: Enterprise & Operations
11. Artifact ERP
12. AVPM
13. AVA
14. METEOR
15. DOCKIT

## Category 4: Developer Tools
16. Artifact SDK
17. SYNDICATE
`
  },
  {
    id: "services-catalog",
    title: "Services Catalog",
    filename: "SERVICES-CATALOG.md",
    category: "Product",
    lastUpdated: "Feb 10, 2026",
    content: `# Services Catalog

## Services Overview

Artifact Virtual provides infrastructure services, managed technology services, and professional consulting.

## 1. Managed Web Hosting
Enterprise-grade web hosting on AI-optimized infrastructure.
**Pricing:** $10-$500/month.

## 2. Virtual Private Servers (VPS)
Scalable virtual machines with optional GPU acceleration.
**Pricing:** $20-$2,000/month.

## 3. Dedicated Servers
Bare-metal servers for high-performance computing.
**Pricing:** $200-$3,000+/month.

## 4. Colocation Services
Rack space in Islamabad data center.
**Pricing:** $300-$2,000/month.

## 5. On-Premises Deployment
Deployment of AV products on customer hardware.

## 6. AI/ML Consulting
Expert advisory services. Rate: $150-$300/hour.
`
  },
  {
    id: "business-intelligence",
    title: "Business Intelligence",
    filename: "BUSINESS-INTELLIGENCE.md",
    category: "Strategy",
    lastUpdated: "Feb 10, 2026",
    content: `# Business Intelligence

## Strategic Positioning

Artifact Virtual occupies a unique position at the intersection of AI infrastructure, enterprise software, and services.

**Core Thesis:** Build the AI-native enterprise stack that hyperscalers are too large to specialize in.

## Customer Segmentation
1. AI/ML Startups
2. Mid-Market Enterprises
3. Pakistan Enterprises and Government
4. Research Institutions
5. Quantitative Finance Firms

## Go-to-Market Strategy
Phase 1: Foundation ($600K-$1.5M ARR)
Phase 2: Scale ($3M-$8M ARR)
Phase 3: Expansion ($15M-$250M ARR)

## Risk Matrix
- Power grid failure (Medium Prob / Critical Impact)
- Currency depreciation (Medium Prob / High Impact)
- Hyperscaler competition (Medium Prob / Medium Impact)
`
  },
  {
    id: "regulatory-strategy",
    title: "Regulatory Strategy",
    filename: "REGULATORY-STRATEGY.md",
    category: "Legal",
    lastUpdated: "Feb 10, 2026",
    content: `# Regulatory Strategy

## Regulatory Landscape Overview
Artifact Virtual operates at the intersection of AI, infrastructure, and fintech.

### Key Bodies
- SECP (Company Reg): Compliant
- PSEB (IT Export): Registration in progress
- PTA (Telecom/Hosting): Licensing planned (CVAS)
- STZA (Tech Zones): Monitoring

## Compliance Roadmap
- **SOC 2 Type II:** Q1-Q2 2027
- **ISO 27001:** H2 2027
- **GDPR:** Q2 2027

## Budget
Total Regulatory Budget (2026-2027): $63K-151K
`
  }
];