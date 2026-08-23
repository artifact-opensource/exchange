const RPCS = ['https://base-rpc.publicnode.com', 'https://mainnet.base.org'];
let ri = 0;
async function call(to, data) {
  const r = await fetch(RPCS[ri++ % RPCS.length], { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: Date.now(), method: 'eth_call', params: [{ to, data }, 'latest'] }) });
  return (await r.json()).result;
}
const POOL = '0x5e1aa37c424a5cba4b86aff533cf369aef0def70';
const AU = '0x0c5a9a970b9c9b77a1ddb1cd62f279ce6cda2f08';
const USDC = '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913';
const pad = (a) => a.replace(/^0x/, '').padStart(64, '0');
const addrOf = (raw) => (raw && raw.length >= 66 ? '0x' + raw.slice(26) : raw);

console.log('token0:', addrOf(await call(POOL, '0x0dfe1681')));
console.log('token1:', addrOf(await call(POOL, '0xd21220a7')));
const feeRaw = await call(POOL, '0xddca3f43');
console.log('fee tier:', feeRaw && feeRaw.length >= 66 ? parseInt(feeRaw.slice(-64), 16) : feeRaw);
const s0 = await call(POOL, '0x3850c7bd');
if (s0?.length >= 130) {
  const sp = BigInt('0x' + s0.slice(2, 66));
  const tick = BigInt.asIntN(24, BigInt('0x' + s0.slice(66, 130)));
  console.log('sqrtPriceX96:', sp.toString(), '| tick:', tick.toString());
  // price token1 per token0, decimal-adjusted
  const rawP = Number(sp) ** 2 / 2 ** 192;
  console.log('raw t1/t0 ratio:', rawP.toExponential(8));
} else console.log('slot0:', s0);
const liq = await call(POOL, '0x1a686502');
console.log('activeLiquidity:', liq && liq.length >= 66 ? BigInt(liq).toString() : liq);
for (const [lbl, tok] of [['AU', AU], ['USDC', USDC]]) {
  const b = await call(tok, '0x70a08231' + pad(POOL));
  console.log(`balance[${lbl}] in pool:`, b?.length >= 66 ? Number(BigInt(b)) / (lbl === 'AU' ? 1e18 : 1e6) : b);
}
