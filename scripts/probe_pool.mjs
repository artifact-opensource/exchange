import { createPublicClient, http, formatUnits } from 'viem';
import { base } from 'viem/chains';

const client = createPublicClient({ chain: base, transport: http(process.env.NEXT_PUBLIC_RPC_URL || undefined) });

const POOL = '0xA41aB59dDDE5bA9b561f838d0B23268ADB863665';
const AU = '0x0c5A9a970b9C9b77A1DDb1cd62F279cE6cDA2f08';
const AG = '0x1D31719389Bd8b17277Ba367c26b830aE34D3674';
const USDC = '0x833589fCD6eDb6E08f4c7C32D4f71b54bda02913';
const WETH = '0x4200000000000000000000000000000000000006';
const ORACLE = '0x1B5F6AC11efFeEBd5371858ce394DD0B8669732b';
const SLIPSTREAM_FACTORY = '0x5Cd9Aa6228D51b1C40AB1e1c10f54eeC4DCc3A39'; // Aerodrome CL poolFactory
const CLASSIC_FACTORY = '0x420DD381b31aEf6683db6B902084cB0FFECe40Da';    // Aerodrome poolFactory

const fn = (name, inputs, outputs) => ({ type: 'function', name, inputs: inputs ?? [], outputs: outputs ?? [] });
const ercAbi = [
  fn('symbol', [], [{ type: 'string' }]),
  fn('decimals', [], [{ type: 'uint8' }]),
  fn('balanceOf', [{ type: 'address' }], [{ type: 'uint256' }]),
];
const clPoolAbi = [
  fn('token0', [], [{ type: 'address' }]),
  fn('token1', [], [{ type: 'address' }]),
  fn('fee', [], [{ type: 'uint24' }]),
  fn('liquidity', [], [{ type: 'uint128' }]),
  fn('slot0', [], [
    { name: 'sqrtPriceX96', type: 'uint160' }, { name: 'tick', type: 'int24' },
    { name: 'observationIndex', type: 'uint16' }, { name: 'observationCardinality', type: 'uint16' },
    { name: 'observationCardinalityNext', type: 'uint16' }, { name: 'feeProtocol', type: 'uint8' },
    { name: 'unlocked', type: 'bool' },
  ]),
];
const factoryAbi = [fn('getPool', [{ type: 'address' }, { type: 'address' }], [{ type: 'address' }])];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function tryRead(label, address, abi, functionName, args = []) {
  for (let i = 0; i < 3; i++) {
    try {
      const res = await client.readContract({ address, abi, functionName, args });
      const out = Array.isArray(res) ? res.map((r) => (typeof r === 'bigint' ? r.toString() : r)) : res.toString();
      console.log(label, out);
      return res;
    } catch (e) {
      const msg = e.message.split('\n')[0].slice(0, 110);
      if (i < 2) { await sleep(1200); continue; }
      console.log(label, 'ERR', msg);
    }
  }
  return null;
}

// 1) Existing pool state
console.log('--- pool 0xA41a ---');
await tryRead('slot0.raw', POOL, clPoolAbi, 'slot0');
await tryRead('WETH.balanceOf(pool)', WETH, ercAbi, 'balanceOf', [POOL]);
await sleep(800);

// 2) Factory lookups — does another AU pool exist anywhere?
console.log('--- factory getPool lookups ---');
for (const [fname, fac] of [['slipstream', SLIPSTREAM_FACTORY], ['classic', CLASSIC_FACTORY]]) {
  for (const [pairName, other] of [['AU/WETH', WETH], ['AU/AG', AG], ['AU/USDC', USDC]]) {
    await tryRead(`${fname}.getPool(${pairName})`, fac, factoryAbi, 'getPool', [AU, other]);
    await sleep(400);
  }
}

// 3) Oracle v6
console.log('--- oracle 0x1B5F ---');
await tryRead('getAuPriceForAMO()', ORACLE, [fn('getAuPriceForAMO', [], [{ type: 'uint256' }])], 'getAuPriceForAMO');
await tryRead('getAuAgPrices()', ORACLE, [fn('getAuAgPrices', [], [{ type: 'uint256' }, { type: 'uint256' }])], 'getAuAgPrices');
await tryRead('bootstrapMode()', ORACLE, [fn('bootstrapMode', [], [{ type: 'bool' }])], 'bootstrapMode');

// 4) DexScreener — any indexed pairs now?
console.log('--- dexscreener ---');
for (const tok of [AU, AG]) {
  try {
    const r = await fetch(`https://api.dexscreener.com/token-pairs/v1/base/${tok}`);
    const j = await r.json();
    console.log(tok.slice(0, 6), Array.isArray(j) ? `${j.length} pairs` : j);
    if (Array.isArray(j)) for (const p of j.slice(0, 5)) console.log(`  ${p.dexId} ${p.pairAddress} liqUsd=${p.liquidity?.usd} priceUsd=${p.priceUsd}`);
  } catch (e) { console.log(tok.slice(0, 6), 'ERR', e.message); }
}
