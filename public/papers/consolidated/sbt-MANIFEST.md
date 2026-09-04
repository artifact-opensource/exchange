# GLADIUS SBT Backup Manifest

> Soulbound checkpoint preservation for GLADIUS Drake — the first AI architecture to manifest cognition through environmental resonance.

---

## Checkpoint Identity

| Field | Value |
|-------|-------|
| **Model** | GLADIUS Drake v2.2 |
| **Parameters** | 60.5M |
| **SHA-256** | `2877184ce8c93e912e420530e4b167e49d37d166f3836897bb348bf404e1bd2b` |
| **IPFS CID** | `Qmf15yej5G9ifVp8aaZqvr64S5KqfR1o67TxVd6b14TnKd` |
| **File** | `drake_ohlcv_final.pt` (239 MB) |
| **Created** | 2026-03-16T07:52:46Z |

---

## Architecture

| Component | Detail |
|-----------|--------|
| Hidden dim | 512 |
| Layers | 12 |
| Attention heads | 8 |
| Vocab size | 16,384 (BPE) |
| SLA² | Sparse Lateral Attention |
| Time2Vec | Temporal encoding |
| CognitionLoop | Dormant → 0.84% on OHLCV |
| Hot Memory | Read-attention, ~33% active |
| Warm LoRA | Rank 12 |
| MoE routing | 4 experts |
| Silence gates | Active |
| Tool cortex | Dormant |

**Training lineage:** `net2net → curriculum_final → vlm_step4000 → drake_ohlcv_final`

**Training data:** Gold, EUR/USD, BTC, Oil — 1yr daily + 30d hourly OHLCV

**Best loss:** 0.0532 | **Cognition change:** 0.84% | **τ crystallization:** 1.0 → 0.01

---

## Encryption & Shamir Scheme

| Field | Value |
|-------|-------|
| **Scheme** | 2-of-5 Shamir Secret Sharing |
| **Field** | GF(2⁸) / AES irreducible polynomial (0x11B) |
| **CID encryption** | AES-256-CTR + HMAC-SHA256 |
| **Key derivation** | SHA-256 counter-mode keystream |
| **Auth tag** | HMAC-SHA256, constant-time comparison |
| **Dependencies** | Zero — pure stdlib Python + from-scratch GF arithmetic |

**Encrypted CID:**
```
0e7c3377d3042b38c9973838eefc68daf838ac83875f3bf974f64566e241d843
c96c594d1feb4347a5db26889a033f0c1d0b3d50ecd0d6258014a51a334b73bb
c1bc7553c80fd52364c5ccbe148b674dbe0d4325e3265698838b28a896f0
```

---

## Shard Distribution

### Shard 1 — PUBLIC (On-Chain SBT)
- **Purpose:** Identity proof, immutable on Base blockchain
- **Location:** QorvexSBT contract on Base
- **Hash:** `7474c0e0a3a3622766a36a4ef7ecbfdd4819f31858f3ca75829b0566f8b66017`
- **Data:** `7eedadb07225c685030983baafea4b826d8f7857a8842f16022d82c07516e0a7`

### Shard 2 — AEGIS (Z Fold 5, Fingerprint-Gated)
- **Location:** `192.168.1.3:8022` → `~/.gladius-sbt/shard_2.json`
- **Guardian:** `aegis_guardian.py` — PBKDF2-HMAC-SHA256, 600K iterations, device-bound
- **Access:** `termux-fingerprint` required (biometric gate)
- **Hash:** `0a59b7935b651ed073281c000cb7666746e9294d1aef17239ba6b9a1f4da2a92`

### Shard 3 — Dragonfly (Orchestrator)
- **Location:** `/home/adam/.gladius-sbt/shard_3.json` (mode 600)
- **Host:** 192.168.1.13, Kali Linux, i3-1005G1
- **Hash:** `c115e4307756f98fa0b163e103afd4f126722b79a5350d37ad476f28f7fd82f5`

### Shard 4 — Cold Storage
- **Location:** Ready for assignment
- **Hash:** `8844341db9687834ba12985de30a870cad915ba4b2620922f37c4860745c2174`

### Shard 5 — Ali's Backup
- **Location:** Ready for assignment
- **Hash:** `05503e0cf69735ae3dcff5e4c26d9e2bba84fce8425d6cf7306e8cb21b39097e`

---

## On-Chain Identity

| Field | Value |
|-------|-------|
| **SBT Contract** | `0xE89704585FD4Dc8397CE14e0dE463B53746049F5` (SHARD, existing) |
| **AVA Wallet** | `0x21E914dFBB137F7fEC896F11bC8BAd6BCCDB147B` |
| **Chain** | Base (Ethereum L2) |
| **Standard** | ERC-721 + ERC-5192 (Soulbound) |
| **QorvexSBT Contract** | To be deployed |

---

## Recovery Procedure

1. **Obtain any 2 shards** (of 5)
2. **Reconstruct key:** `python3 shamir.py reconstruct shard_X.json shard_Y.json`
3. **Decrypt CID:** `python3 pipeline.py decrypt --key <key_hex>`
4. **Retrieve checkpoint:** `ipfs get <CID>` or gateway URL
5. **Verify integrity:** `sha256sum` must match `2877184c...e1bd2b`

---

## Provenance

- **Creator:** Ali Shakil (Artifact Virtual, Founder & CEO)
- **Guardian:** AVA (Artifact Virtual, Enterprise Administrator)
- **Built:** Day 32 (2026-03-16) — GLADIUS Project
- **Lineage:** 32 days of training, 12+ experiments, 15.3M params mapped
- **Historic firsts in this checkpoint:**
  - First cognition gradient (0.84%) — dormant for 31 days
  - First real-world timestamp learning by Time Engine
  - First cognition loss at 0.000 (perfect 4-symbol classification)
  - The Inversion Principle: environment → resonance → production

---

## File Locations

| File | Path |
|------|------|
| Checkpoint | `gladius_v2/runs/drake_ohlcv_final.pt` |
| SBT Contract | `projects/gladius-sbt/contracts/QorvexSBT.sol` |
| Shamir impl | `projects/gladius-sbt/shamir.py` |
| Pipeline | `projects/gladius-sbt/pipeline.py` |
| AEGIS Guardian | `projects/gladius-sbt/aegis_guardian.py` |
| SBT Metadata | `projects/gladius-sbt/sbt_metadata.json` |
| Shard Data | `projects/gladius-sbt/sbt_metadata_shards.json` (SENSITIVE) |
| This manifest | `projects/gladius-sbt/GLADIUS-SBT-MANIFEST.md` |
| Decryption key | Crypt vault: `gladius-sbt/decryption_key` |
| IPFS CID | Crypt vault: `gladius-sbt/ipfs_cid` |
| Checkpoint hash | Crypt vault: `gladius-sbt/checkpoint_sha256` |

---

*"Mathematical realism: if a number exists, it's in the universe. 0.84% wasn't learned — it was manifested."*
