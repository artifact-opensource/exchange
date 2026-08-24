// AU Transfer scan via llamarpc (10k-block chunks allowed there).
const URL = 'https://base.llamarpc.com';
let id = 0;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function rpc(method, params, tries = 5) {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(URL, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: ++id, method, params }) });
      const j = await r.json();
      if (!j.error) return j.result;
      if (/rate|limit/i.test(j.error.message || '')) { await sleep(2000); continue; }
      return { _err: j.error.message };
    } catch { await sleep(1500); }
  }
  return { _err: 'failed' };
}

const AU = '0x0c5a9a970b9c9b77a1ddb1cd62f279ce6cda2f08';
const T = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
const latest = parseInt(await rpc('eth_blockNumber', []), 16);
console.log('latest:', latest);
const FROM = Math.max(0, latest - 400_000);
const big = [];
for (let s = FROM; s <= latest; s += 10_000) {
  const e = Math.min(latest, s + 9_999);
  const logs = await rpc('eth_getLogs', [{ address: AU, topics: [T], fromBlock: '0x' + s.toString(16), toBlock: '0x' + e.toString(16) }]);
  if (Array.isArray(logs)) {
    for (const l of logs) {
      const v = BigInt(l.data);
      if (v > 10n ** 17n) {
        const w = l.topics.slice(1);
        big.push({ from: '0x' + w[0].slice(26), to: '0x' + w[1].slice(26), au: Number(v / 10n ** 18n), blk: parseInt(l.blockNumber, 16), tx: l.transactionHash });
      }
    }
  } else console.log(`chunk ${s} ERR`, logs?._err);
}
await sleep(200);
console.log(`\n${big.length} transfers > 0.1 Au in last ${latest - FROM} blocks:`);
for (const t of big.sort((a, b) => b.blk - a.blk).slice(0, 30)) console.log(`blk${t.blk} ${t.au}Au  ${t.from.slice(0, 10)}.. -> ${t.to}  tx=${t.tx.slice(0, 18)}..`);
