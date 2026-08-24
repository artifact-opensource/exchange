export const BASE_CHAIN_ID = 8453

export const AV_CONTRACTS = {
  auToken: '0x0c5A9a970b9C9b77A1DDb1cd62F279cE6cDA2f08' as `0x${string}`,
  agToken: '0x1D31719389Bd8b17277Ba367c26b830aE34D3674' as `0x${string}`,
  oracle: '0x6A4BFA98EA5FD675C907B48C65AD2243D80DED19' as `0x${string}`,
  pidController: '0xB8F240870DBc1cD5F9262F8180350A29ea404268' as `0x${string}`,
  treasuryAMO: '0xF096cD4D24811B0F824c929907196bCB796bca88' as `0x${string}`,
  staking: '0x8F638B6C2EBD61A638561B6993930CF25D53ACB9' as `0x${string}`,
  // Governor contract not yet published in address.book — wire when deployed.
  // Until then governance page reads resolve to empty state instead of crashing the build.
  governor: '0x0000000000000000000000000000000000000000' as `0x${string}`,
};

export const CHAINLINK_FEEDS = {
  ethUsd: '0x5f4eC3Df9cbd43714FE2740f5E361615511B1b42' as `0x${string}`,
};

export const TOKEN_META: Record<string, { name: string; symbol: string; icon: string; color: string }> = {
  au: { name: "Artifact Utility", symbol: "Au", icon: "https://raw.githubusercontent.com/artifact-virtual/assets/main/tokens/au-gold.svg", color: "#FFD700" },
  ag: { name: "Artifact Governance", symbol: "Ag", icon: "https://raw.githubusercontent.com/artifact-virtual/assets/main/tokens/ag-silver.svg", color: "#C0C0C0" },
  eth: { name: "Ethereum", symbol: "ETH", icon: "https://cryptologos.cc/logos/ethereum-eth-logo.svg", color: "#627EEA" },
  weth: { name: "Wrapped Ethereum", symbol: "WETH", icon: "weth", color: "#627EEA" },
  usdc: { name: "USD Coin", symbol: "USDC", icon: "usdc", color: "#2775CA" },
  aero: { name: "Aerodrome", symbol: "AERO", icon: "aero", color: "#0052FF" },
};

export const TOKENS = {
  au: AV_CONTRACTS.auToken,
  ag: AV_CONTRACTS.agToken,
  weth: '0x4200000000000000000000000000000000000006' as `0x${string}`,
  usdc: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as `0x${string}`,
  aero: '0x940181a94A35A4569E4529A3CDfB74E38FD98631' as `0x${string}`,
  eth: '0x0000000000000000000000000000000000000000' as `0x${string}`, // native ETH sentinel
} as const;

// ---------- Aerodrome + explorer (restored; consumers: swap, liquidity) ----------
export const AERODROME = {
  routerV2: '0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43' as `0x${string}`,
  poolFactory: '0x420DD381b31aEf6683db6B902084cB0FFECe40Da' as `0x${string}`,
  voter: '0x16613524e02ad97eDfe571131b8c2625c21200c4' as `0x${string}`,
} as const;

export const EXPLORER = {
  name: 'BaseScan',
  url: 'https://basescan.org',
  tx: (hash: string) => `https://basescan.org/tx/${hash}`,
  address: (addr: string) => `https://basescan.org/address/${addr}`,
} as const;

export interface KnownPool {
  id: string;
  name: string;
  address: `0x${string}`;
  tokenA: `0x${string}`;
  tokenB: `0x${string}`;
  stable?: boolean | undefined;
}

export const KNOWN_POOLS: KnownPool[] = [
  {
    id: 'au-usdc',
    name: 'Au / USDC',
    // seeded CL pool from av_treasury address.book
    address: '0x5E1aA37C424A5cba4b86AFf533cf369aeF0Def70',
    tokenA: '0x0c5A9a970b9C9b77A1DDb1cd62F279cE6cDA2f08',
    tokenB: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  },
  {
    id: 'eth-usdc',
    name: 'ETH / USDC',
    address: '0xd0b53D9277642d899DF5C87A39684A8948EFE474',
    tokenA: '0x4200000000000000000000000000000000000006',
    tokenB: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    stable: false,
  },
];
