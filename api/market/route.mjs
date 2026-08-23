/**
 * GET /api/market/route          -> { au: {...}, ag: {...}, checkedAt }
 * GET /api/market/route?token=au -> single
 *
 * Price resolution order (all REAL sources, no simulation):
 *   1. CL pool spot via slot0().sqrtPriceX96   (env NEXT_PUBLIC_POOL_AU_USDC)
 *      - USDC-quoted pools are already USD; WETH-quoted × Chainlink ETH/USD
 *   2. DexScreener aggregate API
 *   3. AV Oracle v6 (bootstrap mode => nominal price, labelled as such)
 *   4. { status: "no_market" }                 <- honest state if all fail
 *
 * Addresses come from env (av_treasury address.book is source of truth);
 * constants below are canonical fallbacks only.
 */

const RPC = process.env.BASE_RPC_URL || "https://mainnet.base.org";

const ADDRESSES = {
  au:
    process.env.NEXT_PUBLIC_AU_TOKEN ||
    "0x0c5A9a970b9C9b77A1DDb1cd62F279cE6cDA2f08",
  ag:
    process.env.NEXT_PUBLIC_AG_TOKEN ||
    "0x1D31719389Bd8b17277Ba367c26b830aE34D3674",
};
const ORACLE =
  process.env.NEXT_PUBLIC_ORACLE || "0x1B5F6AC11efFeEBd5371858ce394DD0B8669732b";
const POOLS = [
  { addr: process.env.NEXT_PUBLIC_POOL_AU_USDC || "0x5E1aA37C424A5cba4b86AFf533cf369aeF0Def70", base: "au", quote: "usdc", label: "Au/USDC (Aerodrome CL)" },
];
const QUOTE = {
  usdc: { addr: "0x833589fCD6eDb6E08f4c7C32D4f71b54bda02913", dec: 6 },
  weth: { addr: "0x4200000000000000000000000000000000000006", dec: 18 },
};
const BASE_DEC = 18;
const ETH_USD_FEED = "0x71041dDDad3595F9CEd3DcCFBe3D2b2588796fb8";

const SEL = {
  slot0: "0x3850c7bd",
  getReserves: "0x0902f1ac",
  getPrice: "0x41976e09",
  cachedPrices: "0x837479c9",
  latestRoundData: "0xfeaf968c",
  decimals: "0x313ce567",
};

async function ethCall(to, data) {
  const r = await fetch(RPC, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_call", params: [{ to, data }, "latest"] }),
  });
  const j = await r.json();
  if (j.error || !j.result || j.result === "0x") throw new Error(j.error?.message || "empty result");
  return j.result;
}

const padAddr = (addr) => addr.toLowerCase().replace(/^0x/, "").padStart(64, "0");
const uintAt = (hex, i) => BigInt("0x" + hex.slice(2 + i * 64, 2 + (i + 1) * 64));

async function tryOracle(fnSelector, token) {
  const hex = await ethCall(ORACLE, fnSelector + padAddr(token));
  const price = uintAt(hex, 0); // 1e18-precision USD
  const ts = Number(uintAt(hex, 1));
  const valid = uintAt(hex, 3) !== 0n;
  if (!valid || price <= 0n) throw new Error("no valid oracle price");
  // Bootstrap-mode oracle returns a fixed nominal value (per av_treasury
  // address.book: AvOracle v6 bootstrap ON => Au=Ag=0.01). Label it so UIs
  // never present a nominal number as a market price.
  const NOMINAL = 10n ** 16n; // 0.01
  const nominal = price === NOMINAL;
  return {
    priceUsd: Number(price) / 1e18,
    source: nominal ? "oracle_bootstrap" : fnSelector === SEL.getPrice ? "oracle" : "oracle_cache",
    note: nominal
      ? "Nominal bootstrap value from AV Oracle v6 — not a market price."
      : "AV Oracle v6 price feed.",
    updatedAt: ts ? new Date(ts * 1000).toISOString() : undefined,
  };
}

async function ethUsd() {
  const hex = await ethCall(ETH_USD_FEED, SEL.latestRoundData);
  const answer = BigInt("0x" + hex.slice(2 + 64, 2 + 128));
  return Number(answer) / 1e8;
}

/** Concentrated-liquidity spot price from slot0().sqrtPriceX96 */
async function tryClPool(poolCfg) {
  if (!poolCfg.addr) throw new Error("pool not configured");
  const hex = await ethCall(poolCfg.addr, SEL.slot0);
  const sqrtPriceX96 = uintAt(hex, 0);
  if (sqrtPriceX96 <= 0n) throw new Error("uninitialized pool");
  const q = QUOTE[poolCfg.quote];
  // price_quote_per_base = (sp/2^96)^2 * 10^(decBase-decQuote)
  const ratio = (Number(sqrtPriceX96) / 2 ** 96) ** 2;
  let priceUsd = ratio * 10 ** (BASE_DEC - q.dec);
  if (poolCfg.quote === "weth") priceUsd *= await ethUsd();
  if (!(priceUsd > 0)) throw new Error("non-positive pool price");
  return {
    priceUsd,
    source: "cl_pool_spot",
    detail: `${poolCfg.label} · ${poolCfg.addr}`,
  };
}

/** Classic AMM fallback (getReserves) for non-CL pools */
async function tryClassicPool(poolCfg) {
  if (!poolCfg.addr) throw new Error("pool not configured");
  const hex = await ethCall(poolCfg.addr, SEL.getReserves);
  const rBase = Number(uintAt(hex, 0)) / 10 ** BASE_DEC;
  const q = QUOTE[poolCfg.quote];
  const rQuote = Number(uintAt(hex, 1)) / 10 ** q.dec;
  if (!(rBase > 0 && rQuote > 0)) throw new Error("empty reserves");
  let priceUsd = (rQuote / rBase);
  if (poolCfg.quote === "weth") priceUsd *= await ethUsd();
  return { priceUsd, source: "pool_spot", detail: `${rQuote.toFixed(2)} ${poolCfg.quote.toUpperCase()} / ${rBase.toLocaleString()} AU` };
}

async function tryPools() {
  const errs = [];
  for (const p of POOLS.filter((p) => p.base === "au")) {
    for (const fn of [tryClPool, tryClassicPool]) {
      try {
        return await fn(p);
      } catch (e) {
        errs.push(`${fn.name}: ${e.message}`);
      }
    }
  }
  throw new Error(errs.join(" | ") || "no pools configured");
}

async function tryDexScreener(token) {
  const r = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${token.toLowerCase()}`);
  const j = await r.json();
  const pair = (j.pairs || []).find((p) => p.priceUsd);
  if (!pair) throw new Error("no pairs");
  return { priceUsd: parseFloat(pair.priceUsd), source: `dexscreener:${pair.dexId}`, detail: `liq $${(pair.liquidity?.usd || 0).toLocaleString()}` };
}

async function priceFor(key) {
  const token = ADDRESSES[key];
  const attempts = [
    ...(key === "au" ? [tryPools] : []),
    () => tryDexScreener(token),
    () => tryOracle(SEL.getPrice, token),
    () => tryOracle(SEL.cachedPrices, token),
  ];
  let lastErr = null;
  for (const attempt of attempts) {
    try {
      const { priceUsd, ...rest } = await attempt();
      if (Number.isFinite(priceUsd) && priceUsd > 0 && priceUsd < 1e9) {
        return { token, symbol: key.toUpperCase(), priceUsd, status: "live", ...rest };
      }
      lastErr = new Error("implausible price value");
    } catch (e) {
      lastErr = e;
    }
  }
  return {
    token,
    symbol: key.toUpperCase(),
    priceUsd: null,
    status: "no_market",
    note:
      key === "ag"
        ? "AG has zero circulating supply and no liquidity pools yet."
        : `No live market yet (${lastErr?.message || "all sources failed"}).`,
  };
}

export default async function handler(req, res) {
  try {
    const url = new URL(req.url, `https://${req.headers.host || "localhost"}`);
    const t = (url.searchParams.get("token") || "").toLowerCase();
    if (t === "au" || t === "ag") {
      return res.status(200).json(await priceFor(t));
    }
    const [au, ag] = await Promise.all([priceFor("au"), priceFor("ag")]);
    return res.status(200).json({ au, ag, checkedAt: new Date().toISOString() });
  } catch (e) {
    return res.status(500).json({ error: String(e?.message || e) });
  }
}
