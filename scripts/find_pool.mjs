// Definitive pool hunt: eth_call getPool() across factories + GeckoTerminal lookup
const RPCS = ['https://base-rpc.publicnode.com', 'https://base.drpc.org', 'https://base-pokt.nodies.app', 'https://mainnet.base.org'];
let ri = 0, id = 0;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function call(to, data, tries = 5) {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(RPCS[ri++ % RPCS.length], { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: ++id, method: 'eth_call', params: [{ to, data }, 'latest'] }) });
      const j = await r.json();
      if (!j.error) return j.result;
      if (/rate|limit/i.test(j.error.message || '')) { await sleep(1200); continue; }
      return '0xERR:' + j.error.message;
    } catch { await sleep(1000); }
  }
  return '0xERR:failed';
}
const w = (raw) => BigInt(raw);
const pad = (a) => a.replace(/^0x/, '').padStart(64, '0');
const GETPOOL = '0x1698ee82';

const AU = '0x0c5a9a970b9c9b77a1ddb1cd62f279ce6cda2f08';
const AG = '0x1d31719389bd8b17277ba367c26b830ae34d3674';
const WETH = '0x4200000000000000000000000000000000000006';
const USDC = '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913';

// Aerodrome classic PoolFactory (well-known), candidate slipstream factories, Uniswap V3 Base
const FACTORIES = {
  aero_classic: '0x420dd381b31aef6683db6b902084cb0ffece40da',
  aero_slipstream_a: '0x5cd9aa6228d51b1c40ab1e1c10f54eec4dcc3a39',
  univ3_base: '0x33128a8fc17869897dce68ed026d694621f6fdfd', // getPool(a,b,fee)
};
const PAIRS = [['AU/WETH', WETH], ['AU/AG', AG], ['AU/USDC', USDC]];
const UNI_FEES = ['0x0640', '0x07d0', '0x1770', '0x38d4']; // 1600? no: 100,500(0x1F4),3000(0xBB8),10000(0x2710)

for (const [fname, fac] of Object.entries(FACTORIES)) {
  const code = await fetch(RPCS[0], { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_getCode', params: [fac, 'latest'] }) }).then((r) => r.json());
  console.log(`# ${fname} ${fac} codesize=${((code.result || '0x').length - 2) / 2}`);
  for (const [pn, other] of PAIRS) {
    const data = fname === 'univ3_base'
      ? null // handled below per-fee
      : GETPOOL + pad(AU) + pad(other);
    if (fname === 'univ3_base') continue;
    const res = await call(fac, data);
    console.log(`  ${fname}.getPool(${pn}) -> ${res.startsWith('0x') && res.length >= 66 ? '0x' + res.slice(26) : res}`);
    await sleep(300);
  }
}
console.log('\n# uniswap v3 fee tiers:');
for (const feeHex of ['0x01f4', '0x0bb8', '0x2710']) { // 500, 3000, 10000
  for (const [pn, other] of PAIRS) {
    const data = GETPOOL + pad(AU) + pad(other) + feeHex.padStart(64, '0');
    const res = await call(FACTORIES.univ3_base, data);
    console.log(`  uniV3.getPool(${pn},fee=${parseInt(feeHex, 16)}) -> ${res.startsWith('0x') && res.length >= 66 ? '0x' + res.slice(26) : res}`);
    await sleep(250);
  }
}

console.log('\n# geckoterminal:');
for (const tok of [AU, AG]) {
  try {
    const r = await fetch(`https://api.geckoterminal.com/api/v2/networks/base/tokens/${tok}/pools`);
    const j = await r.json();
    const pools = j?.data ?? [];
    console.log(tok.slice(0, 8), pools.length, 'pools');
    for (const p of pools.slice(0, 5)) {
      const a = p.attributes;
      console.log('  ', a.address, '|', a.name, '| reserve_usd=', a.reserve_in_usd, '| fdv=', a.fdv_usd);
    }
  } catch (e) { console.log('gecko ERR', e.message); }
}
