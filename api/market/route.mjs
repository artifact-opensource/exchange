/**
 * GET /api/market/route          -> { au: {...}, ag: {...} }
 * GET /api/market/route?token=au -> single
 *
 * Price resolution order (all REAL sources, no simulation):
 *   1. AV Oracle getPrice()          (Base 0x6A4B...)
 *   2. AV Oracle cachedPrices()
 *   3. Aerodrome AU/WETH reserves × Chainlink ETH/USD
 *   4. DexScreener aggregate API
 *   5. { status: "no_market" }       <- honest state until liquidity exists
 */

const RPC = process.env.BASE_RPC_URL || "https://mainnet.base.org";

const ADDRESSES = {
  au: "0x0c5A9a970b9C9b77A1DDb1cd62F279cE6cDA2f08",
  ag: "0x1D31719389Bd8b17277Ba367c26b830aE34D3674",
};
const ORACLE = "0x6A4BFA98EA5FD675C907B48C65AD2243D80DED19";
const AU_WETH_POOL = "0xA41aB59dDE5bA9b561f838d0B23268ADB863665";
const WETH = "0x4200000000000000000000000000000000000006";
const ETH_USD_FEED = "0x71041dDDad3595F9CEd3DcCFBe3D2b2588796fb8";

const SEL = {
  getPrice: "0x41976e09",
  cachedPrices: "0x837479c9",
  getReserves: "0x0902f1ac",
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
  const price = uintAt(hex, 0);
  const ts = Number(uintAt(hex, 1));
  const valid = uintAt(hex, 3) !== 0n;
  if (!valid || price <= 0n) throw new Error("no valid cached price");
  // Oracle prices are 1e18-precision USD
  return { priceUsd: Number(price) / 1e18, source: fnSelector === SEL.getPrice ? "oracle" : "oracle_cache", updatedAt: new Date(ts * 1000).toISOString() };
}

async function ethUsd() {
  const hex = await ethCall(ETH_USD_FEED, SEL.latestRoundData);
  const answer = BigInt("0x" + hex.slice(2 + 64, 2 + 128)); // int256 answer in slot 1
  const dh = await ethCall(ETH_USD_FEED, SEL.decimals);
  const dec = Number(BigInt(dh));
  return Number(answer) / 10 ** dec;
}

async function tryPoolReserves() {
  const hex = await ethCall(AU_WETH_POOL, SEL.getReserves);
  const rAU = Number(uintAt(hex, 0)) / 1e18;   // token0 = AU
  const rWETH = Number(uintAt(hex, 1)) / 1e18; // token1 = WETH
  if (!(rAU > 0)) throw new Error("empty reserves");
  const ethPrice = await ethUsd();
  return {
    priceUsd: (rWETH / rAU) * ethPrice,
    source: "pool_spot",
    detail: `${rWETH.toFixed(2)} WETH / ${rAU.toLocaleString()} AU`,
  };
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
    () => tryOracle(SEL.getPrice, token),
    () => tryOracle(SEL.cachedPrices, token),
    ...(key === "au" ? [tryPoolReserves] : []),
    () => tryDexScreener(token),
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
    note: key === "ag"
      ? "AG has zero circulating supply and no liquidity pools yet."
      : "No live market yet — oracle unpopulated, no funded Aerodrome pool, no aggregator listings.",
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
