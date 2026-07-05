export const BASE_CHAIN_ID = 8453

// ─── AV Treasury Contract Addresses (Base Mainnet — v3.1 Live) ────
export const AV_CONTRACTS = {
  auToken: '0x0c5A9a970b9C9b77A1DDb1cd62F279cE6cDA2f08' as `0x${string}`,
  agToken: '0x1D31719389Bd8b17277Ba367c26b830aE34D3674' as `0x${string}`,
  oracle: '0x6A4BFA98EA5FD675C907B48C65AD2243D80DED19' as `0x${string}`,
  pidController: '0xB8F240870DBc1cD5F9262F8180350A29ea404268' as `0x${string}`,
  treasuryAMO: '0xF096cD4D24811B0F824c929907196bCB796bca88' as `0x${string}`,
  staking: '0x8F638B6C2EBD61A638561B6993930CF25D53ACB9' as `0x${string}`,
  governor: '0x3A88006e036B94f9c9463A9210D9B3d7FF6ECa03' as `0x${string}`,
  timelock: '0x8BdfA2Bd3F42D3dF1f73f13eBE71ab132A269C77' as `0x${string}`,
  treasurySafe: '0x1082C9467488F869Aa64fcb0Dc78CD9BC6319F9e' as `0x${string}`,
  lpNFT: '0x7797cb8407eF95f6714b4719D3B394aab2e26Ea8' as `0x${string}`,
  flashBuy: '0xCE73711EE793AF348837C09B729680B12DF6D8C0' as `0x${string}`,
  flashLoan: '0x4DDD1873964E5C2E3BE6712E199812903E6696B9' as `0x${string}`,
  dexSimulator: '0x2C1BD0E498CEA315DA7486A41FB3DD991DA302B2' as `0x${string}`,
} as const

// ─── Aerodrome Contract Addresses (Base Mainnet) ─────────────────
export const AERODROME = {
  router: '0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb8AdE1e' as `0x${string}`,
  routerV2: '0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb8AdE1e' as `0x${string}`,
  factory: '0x420DD381b31aEf6683db6B902084cB0FFecFc40D' as `0x${string}`,
  voter: '0x16613524e02e97fD189082c8575195F786831c95' as `0x${string}`,
  gaugeFactory: '0x987CaC2c38B4Fc1E2A910c90c0E07A72F73A9E2e' as `0x${string}`,
  poolFactory: '0x5e1c1B71E00e3bDF4b6083aAb4c83225054b7f96' as `0x${string}`,
  rewardsDistributor: '0xAD29e2Beb3471a59e0348e29e8c77F37e0a66071' as `0x${string}`,
  veAERO: '0xCF1dc5b4a20d7e2398d8103e4385923936659F21' as `0x${string}`,
} as const

// ─── Token Addresses ──────────────────────────────────────────────
export const TOKENS = {
  au: AV_CONTRACTS.auToken,
  ag: AV_CONTRACTS.agToken,
  weth: '0x4200000000000000000000000000000000000006' as `0x${string}`,
  usdc: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as `0x${string}`,
  dbeth: '0x2331c97957fBD6C7BA95f7a223DaF3A780043730' as `0x${string}`,
  aero: '0x940181a94A35A4519B9f1E322c818B2C76230030' as `0x${string}`,
} as const

// ─── Chainlink Price Feeds (Base Mainnet) ─────────────────────────
export const CHAINLINK_FEEDS = {
  ethUsd: '0x4aDC67696bA383F43DD60A0e5E3Cea7a0e6E7A6C' as `0x${string}`, // ETH/USD on Base
  usdcUsd: '0xd9a0114a5bC16657F048Ce7689483957E13c9446' as `0x${string}`, // USDC/USD on Base
} as const

// ─── Swap Aggregator API Endpoints ────────────────────────────────
export const SWAP_APIS = {
  zeroX: {
    baseUrl: 'https://base.api.0x.org',
    apiKey: process.env.NEXT_PUBLIC_ZEROX_API_KEY || '',
  },
  oneInch: {
    baseUrl: 'https://api.1inch.dev/swap/v6.0',
    apiKey: process.env.NEXT_PUBLIC_1INCH_API_KEY || '',
  },
} as const

// ─── Explorer ─────────────────────────────────────────────────────
export const EXPLORER = {
  url: 'https://basescan.org',
  apiUrl: 'https://api.basescan.org/api',
  apiKey: process.env.NEXT_PUBLIC_BASESCAN_API_KEY || '',
} as const

// ─── Token Metadata ───────────────────────────────────────────────
export const TOKEN_META: Record<string, { name: string; symbol: string; icon: string; color: string }> = {
  au: { name: "Artifact Utility", symbol: "Au", icon: "https://raw.githubusercontent.com/artifact-virtual/assets/main/tokens/au-gold.svg", color: "#FFD700" },
  ag: { name: "Artifact Governance", symbol: "Ag", icon: "https://raw.githubusercontent.com/artifact-virtual/assets/main/tokens/ag-silver.svg", color: "#C0C0C0" },
  eth: { name: "Ethereum", symbol: "ETH", icon: "https://cryptologos.cc/logos/ethereum-eth-logo.svg", color: "#627EEA" },
};
  ag: { name: 'Artifact Governance', symbol: 'Ag', icon: 'ag', color: '#C0C0C0' },
  weth: { name: 'Wrapped Ethereum', symbol: 'WETH', icon: 'weth', color: '#627EEA' },
  usdc: { name: 'USD Coin', symbol: 'USDC', icon: 'usdc', color: '#2775CA' },
  aero: { name: 'Aerodrome', symbol: 'AERO', icon: 'aero', color: '#0052FF' },
}

// ─── Known Aerodrome Pools for AV Treasury ────────────────────────
export const KNOWN_POOLS = [
  { id: 'au-ag', name: 'Au / Ag', tokenA: TOKENS.au, tokenB: TOKENS.ag, stable: true },
  { id: 'au-weth', name: 'Au / WETH', tokenA: TOKENS.au, tokenB: TOKENS.weth, stable: false },
  { id: 'ag-weth', name: 'Ag / WETH', tokenA: TOKENS.ag, tokenB: TOKENS.weth, stable: false },
  { id: 'au-usdc', name: 'Au / USDC', tokenA: TOKENS.au, tokenB: TOKENS.usdc, stable: true },
  { id: 'ag-usdc', name: 'Ag / USDC', tokenA: TOKENS.ag, tokenB: TOKENS.usdc, stable: true },
] as const
