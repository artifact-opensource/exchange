/**
 * INVESTOR PORTAL — content + data layer.
 * Source: artifactvirtual.gitbook.io/home (exported Aug 24).
 *
 * NUMBERS POLICY (per Sirius): every financial figure carries percentile bands
 * [P6, P50, P75]. The portal displays the SELECTED band (default P50) so all
 * public-facing claims stay inside the conservative 6th–75th percentile window.
 * Edit values HERE only — every dashboard reads from this file.
 */

export type Band = 'P6' | 'P50' | 'P75';
export interface Banded { label: string; unit?: string; p6: number; p50: number; p75: number; note?: string }

export const TIERS = {
  free: {
    id: 'free', name: 'OPERATOR', priceUSD: 0, cadence: 'free forever',
    tagline: 'Watch the build. Learn the machine.',
    accent: '#8b8b9e',
    benefits: [
      'Public company profile & mission briefings',
      'WIP project board previews (read-only)',
      'Products & services catalog summaries',
      'Market research teasers & public changelog',
      'Space Division Academy access',
    ],
    gates: 'No account required for most public views · signup unlocks watchlists',
  },
  backer: {
    id: 'backer', name: 'BACKER', priceUSD: 200, cadence: 'one-time',
    tagline: 'Put skin in the game. Get it back as credits.',
    accent: '#fbbf24',
    benefits: [
      '$200 becomes 200 platform CREDITS — spendable on Artifact products, services & compute',
      'Personal account + Backer dashboard with live metrics',
      'Project KANBANS — real boards, real statuses, updated by the teams',
      'PROPOSAL & VOTING system — train wheels for SovereignTreasury governance',
      'Build-in-public changelog & contributor channels',
      'Founder update dispatches',
    ],
    gates: 'Account required · verified payment (crypto or IBAN)',
  },
  pillar: {
    id: 'pillar', name: 'PILLAR', priceUSD: 2000, cadence: 'per year',
    tagline: 'Carry the structure. See through every wall.',
    accent: '#7dd3fc',
    benefits: [
      'EVERYTHING in Backer, plus:',
      'Company LIVE LEDGER — cash position, burn, runway (percentile-banded)',
      'FINANCING room: funding strategy, raise structure, cap context',
      'Full FINANCIAL PROJECTIONS model view (P6/P50/P75 bands)',
      'Complete company PORTFOLIO with per-project economics',
      'Markets RESEARCH & BUSINESS-INTELLIGENCE archive — full documents',
      'Business plan + regulatory strategy vault',
      'Governance weight ×5 in proposal voting',
      'Quarterly Pillar briefing (live) + direct founder line',
      'Priority allocation windows on future instruments',
    ],
    gates: 'Account required · verified payment · annual review',
  },
} as const;

export type TierId = keyof typeof TIERS;

/** Percentile-banded headline metrics (edit here). */
export const METRICS: Record<string, Banded> = {
  arr_target_y1:   { label: 'Year-1 revenue target',     unit: 'USD', p6: 250_000,   p50: 600_000,    p75: 1_000_000 },
  arr_target_y3:   { label: 'Year-3 revenue target',     unit: 'USD', p6: 1_500_000, p50: 3_000_000,  p75: 6_700_000 },
  raise_seed:      { label: 'Seed raise (planned)',      unit: 'USD', p6: 750_000,   p50: 4_000_000,  p75: 5_000_000 },
  series_a_later:  { label: 'Series A horizon',          unit: 'USD', p6: 15_000_000,p50: 25_000_000, p75: 50_000_000 },
  long_term_cap:   { label: 'Long-term capital program', unit: 'USD', p6: 100_000_000,p50: 300_000_000,p75: 500_000_000 },
  projects_active: { label: 'Active R&D projects',       unit: 'count', p6: 8, p50: 14, p75: 22 },
  markets_served:  { label: 'Target market verticals',   unit: 'count', p6: 3, p50: 5, p75: 7 },
};

/** Gated content map — what each tier sees. */
export const CONTENT_MAP: Record<TierId, string[]> = {
  free: ['business-profile', 'products-catalog', 'services-catalog'],
  backer: ['business-profile', 'products-catalog', 'services-catalog', 'project-portfolio', 'strategic-roadmap'],
  pillar: [
    'business-profile', 'products-catalog', 'services-catalog', 'project-portfolio',
    'market-research', 'financial-projections', 'funding-strategy',
    'competitive-landscape', 'business-intelligence', 'regulatory-strategy',
    'strategic-roadmap', 'digital-silkroad',
  ],
};

export const DOC_LIBRARY: Record<string, { title: string; source: string; summary: string }> = {
  'business-profile':       { title: 'BUSINESS PROFILE',        source: '01_business-profile',       summary: 'Legal identity, SECP registration, executive summary, operating regions.' },
  'products-catalog':       { title: 'PRODUCTS CATALOG',        source: '02_products-catalog',       summary: 'Full product lines: infrastructure, AI platforms, developer tooling.' },
  'services-catalog':       { title: 'SERVICES CATALOG',        source: '03_services-catalog',       summary: 'Enterprise engagements, custom builds, research services.' },
  'project-portfolio':      { title: 'PROJECT PORTFOLIO',       source: '04_project-portfolio',      summary: 'Every active project with stage, stack, and owners.' },
  'market-research':        { title: 'MARKET RESEARCH',         source: '05_market-research',        summary: 'TAM/SAM/SOM models, competitor scans, demand signals.' },
  'financial-projections':  { title: 'FINANCIAL PROJECTIONS',   source: '06_financial-projections',  summary: 'Revenue model, cost structure, banded projections.' },
  'funding-strategy':       { title: 'FUNDING STRATEGY',        source: '07_funding-strategy',       summary: 'Raise architecture, instrument design, deployment plan.' },
  'competitive-landscape':  { title: 'COMPETITIVE LANDSCAPE',   source: '08_competitive-landscape',  summary: 'Positioning matrix, moat analysis, threat models.' },
  'business-intelligence':  { title: 'BUSINESS INTELLIGENCE',   source: '09_business-intelligence',  summary: 'Ops KPIs, intelligence pipeline, decision cadence.' },
  'regulatory-strategy':    { title: 'REGULATORY STRATEGY',     source: '10_regulatory-strategy',    summary: 'SECP compliance posture, multi-jurisdiction roadmap.' },
  'strategic-roadmap':      { title: 'STRATEGIC ROADMAP',       source: '12_strategic_roadmap',      summary: 'Phased milestones from foundation to scale.' },
  'digital-silkroad':       { title: 'DIGITAL SILK ROAD',       source: '13_digital_silkroad',       summary: 'Corridor thesis: PK→GCC→EU digital trade lanes.' },
};

/** Project kanban (Backer+) — mirrors the public portfolio, board-formatted. */
export const KANBAN = [
  { column: 'RESEARCH', items: ['EDGE_ORBIT_PAYLOAD', 'NEURAL_TOPOLOGY_V5', 'SOVEREIGN_ID_LAYER'] },
  { column: 'BUILDING', items: ['ORBIT_SIM_CORE', 'OPEN_GROUND_STATION', 'GLADIUS_DISTILLATION'] },
  { column: 'PILOTING', items: ['SINGULARITY_ENTERPRISE', 'HEKTOR_VDB_CLUSTER'] },
  { column: 'SHIPPED', items: ['ARTIFACT_EXCHANGE', 'PLUG_GATEWAY'] },
];

/** Seed proposals (Backer+ voting). Mirrors SovereignTreasury action lifecycle. */
export const PROPOSALS = [
  { id: 'SA-001', title: 'Adopt quarterly community build-streams', state: 'VOTING', yes: 34, no: 7, closes: 'rolling', desc: 'Monthly public build sessions where division leads demo work-in-progress and take questions.' },
  { id: 'SA-002', title: 'Backer credit redemption for compute time', state: 'DELIBERATION', yes: 0, no: 0, closes: 'after quorum', desc: 'Allow platform credits to pay for GPU minutes on Artifact infrastructure at parity rate.' },
  { id: 'SA-003', title: 'Open-source the ground-station scheduler', state: 'EXECUTED', yes: 51, no: 3, closes: 'passed', desc: 'M-01 scheduling layer released under MIT as standalone module.' },
];

export const PAYMENT = {
  crypto: {
    evmAddress: '0x2b446CcB4c758c01C7D04a16E43758551F629102',
    ensBase: 'siriusalpha.base',
    network: 'Base (chain 8453) — ETH or USDC accepted; ETH also on mainnet',
  },
  iban: {
    iban: 'PK60TMFB0000000042227916',
    note: 'Include your membership reference code as the transfer memo.',
  },
};

export function fmtMetric(m: Banded, band: Band): string {
  const v = m[band];
  if (m.unit === 'count') return String(v);
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(v % 1_000_000 === 0 ? 0 : 1)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(v % 1_000 === 0 ? 0 : 0)}K`;
  return `$${v}`;
}
