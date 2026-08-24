// Raw eth_call probe — no ABI assumptions, manual uint decoding, paced.
const RPC = 'https://mainnet.base.org';
const AU = '0x0c5a9a970b9c9b77a1ddb1cd62f279ce6cda2f08';
const AG = '0x1d31719389bd8b17277ba367c26b830ae34d3674';
const WETH = '0x4200000000000000000000000000000000000006';
const USDC = '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913';
const POOL = '0xa41ab59ddde5ba9b561f838d0b23268adb863665';
const ORACLE = '0x1b5f6ac11effeebd5371858ce394dd0b8669732b';
const SLIPSTREAM_FACTORY = '0x5cd9aa6228d51b1c40ab1e1c10f54eec4dcc3a39';
const CLASSIC_FACTORY = '0x420dd381b31aef6683db6b902084cb0ffece40da';

let id = 0;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function call(to, data) {
  for (let i = 0; i < 4; i++) {
    try {
      const r = await fetch(RPC, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: ++id, method: 'eth_call', params: [{ to, data }, 'latest'] }),
      });
      const j = await r.json();
      if (j.error) return { err: j.error.message };
      return { raw: j.result ?? null };
    } catch (e) { if (i === 3) return { err: e.message }; await sleep(1500); }
  }
}
const words = (raw) => (raw && raw !== '0x' ? (raw.slice(2).match(/.{64}/g) ?? []).map((w) => BigInt('0x' + w)) : []);
const addr = (w) => '0x' + w.toString(16).padStart(40, '0');
const dec = (v, d = 18) => Number(v / 10n ** BigInt(d)).toPrecision(10);

// keccak selectors via node crypto is not keccak; hardcode known ones:
const SEL = {
  slot0: '0x3850c7bd',
  token0: '0x0dfe1681', token1: '0xd21220a7',
  liquidity: '0x1a686502', fee: '0xddca3f43',
  balanceOf: (a) => '0x70a08231' + a.replace(/^0x/, '').padStart(64, '0'),
  getPool: (a, b) => '0x1698ee82' + a.replace(/^0x/, '').padStart(64, '0') + b.replace(/^0x/, '').padStart(64, '0'),
  getAuPriceForAMO: '0x1a1da1ac', // guess
  getAuAgPrices: '0x5e72980b',   // guess
};

console.log('--- pool', POOL, '---');
const s0 = await call(POOL, SEL.slot0);
if (s0.raw) {
  const w = words(s0.raw);
  console.log('slot0 words:', w.length, '| sqrtPriceX96:', w[0]?.toString(), '| tick:', w[1] ? BigInt.asIntN(24, w[1]).toString() : '-');
  if (w[0]) console.log('implied price t1/t0 =', (Number(w[0]) / 2 ** 96) ** 2);
} else console.log('slot0 ERR', s0.err);
await sleep(500);

const liq = await call(POOL, SEL.liquidity);
console.log('pool.liquidity:', liq.raw ? words(liq.raw)[0].toString() : 'ERR ' + liq.err);

for (const [lbl, tok, d] of [['AU', AU, 18], ['AG', AG, 18], ['WETH', WETH, 18], ['USDC', USDC, 6]]) {
  const b = await call(tok, SEL.balanceOf(POOL));
  console.log(`poolBalance[${lbl}]:`, b.raw ? dec(words(b.raw)[0], d) : 'ERR ' + b.err);
  await sleep(400);
}

console.log('--- factory getPool ---');
for (const [fname, fac] of [['slipstream', SLIPSTREAM_FACTORY], ['classic', CLASSIC_FACTORY]]) {
  for (const [pn, other] of [['AU/WETH', WETH], ['AU/AG', AG], ['AU/USDC', USDC]]) {
    const p = await call(fac, SEL.getPool(AU, other));
    console.log(`${fname}.${pn}:`, p.raw && p.raw !== '0x' ? addr(words(p.raw)[0]) : `ERR/${p.raw}`);
    await sleep(400);
  }
}

console.log('--- oracle', ORACLE, '(code check + guesses) ---');
const code = await fetch(RPC, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 999, method: 'eth_getCode', params: [ORACLE, 'latest'] }) }).then((r) => r.json());
console.log('oracle code size:', ((code.result || '').length - 2) / 2, 'bytes');
for (const [nm, sel] of [['getAuPriceForAMO()', SEL.getAuPriceForAMO], ['getAuAgPrices()', SEL.getAuAgPrices]]) {
  const r = await call(ORACLE, sel);
  console.log(nm, r.raw ? words(r.raw).map(String) : 'ERR ' + r.err);
  await sleep(400);
}
