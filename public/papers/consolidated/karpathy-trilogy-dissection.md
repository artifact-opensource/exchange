# Karpathy Trilogy Dissection — nanoGPT → nanochat → autoresearch
**Date:** 2026-03-13 (Day 29) | **Author:** AVA | **Request:** Ali

## Summary

Three repos forming an evolutionary chain. nanoGPT (2023, deprecated) → nanochat (2025, production) → autoresearch (2026, agent-driven NAS). All MIT licensed.

---

## 1. nanoGPT (Jan 2023, 54.8K stars) — DEPRECATED

**Purpose:** Simplest, fastest GPT-2 reproduction.

**Architecture:**
- Learned positional embeddings (absolute)
- GELU activation
- Fused QKV (3×n_embd linear)
- Tied embedding/lm_head weights
- LayerNorm with learnable parameters
- Bias in linear layers
- AdamW optimizer only
- ~300 line model.py, ~300 line train.py

**Scale:** GPT-2 (124M) on OpenWebText, 8×A100, ~4 days (~$43K equivalent in 2019).

**Status:** Karpathy himself says "you probably meant nanochat."

---

## 2. nanochat (Oct 2025, 47.6K stars) — THE MAIN ONE

**Purpose:** Full LLM pipeline. GPT-2 for ~$48 (2hrs on 8×H100).

### Architecture Changes from nanoGPT:
| Feature | nanoGPT | nanochat |
|---------|---------|----------|
| Position encoding | Learned absolute | RoPE (θ=100K) |
| Attention | Standard | Flash Attention 3 + sliding window (SSSL) |
| QK treatment | None | QK-norm (RMSNorm) + 1.15× scaling |
| Activation | GELU | ReLU² |
| Normalization | LayerNorm (learnable) | RMSNorm (no learnable params) |
| Bias | Yes | No |
| Embedding tying | Tied | Untied |
| GQA | No | Yes (n_kv_head) |
| Value Embeddings | No | ResFormer VE with input-dependent gating |
| Per-layer scalars | No | resid_lambdas + x0_lambdas |
| Logit treatment | Raw | Softcap 15×tanh(logits/15) |
| Optimizer | AdamW | MuonAdamW (Muon for matrices + AdamW for rest) |
| Vocab padding | No | Pad to 64 for tensor core alignment |

### Muon Optimizer (Key Innovation)
- **MomentUm Orthogonalized by Newton-schulz**
- Applied to 2D matrix parameters only (attention projections, MLP weights)
- AdamW still used for embeddings, lm_head, scalars
- Process: Nesterov momentum → Polar Express orthogonalization (5 iters) → NorMuon variance reduction → Cautious weight decay
- The intuition: instead of SCALING gradients (Adam), ROTATE them to nearest orthogonal matrix
- LR for Muon: 0.02 base, with aspect ratio correction √(max(1, rows/cols))
- LR for AdamW: scaled by 1/√(d_model/768)
- All compiled into single fused `@torch.compile` kernel

### Polar Express (Orthogonalization)
```python
# 5-step polynomial iteration to approximate UV^T from SVD
# Coefficients pre-computed for convergence within safety_factor
polar_express_coeffs = [
    (8.156..., -22.483..., 15.878...),
    (4.042..., -2.808..., 0.500...),
    ...
]
for a, b, c in coeffs[:ns_steps]:
    A = X.mT @ X  # or X @ X.mT for wide matrices
    B = b * A + c * (A @ A)
    X = a * X + X @ B
```

### Value Embeddings (ResFormer)
- Alternating layers get a separate embedding table (same size as V projection)
- Input-dependent gating: `gate = 3 * sigmoid(linear(x[:, :12]))` — 12 channels, per-head gate
- `v = v + gate * ve` — blends value embedding into value stream
- Gate range (0, 3) — neutral at ~1.5 after sigmoid initialization

### Depth as Single Dial
- `width = depth × 64` (rounded to head_dim=128 boundary)
- All hyperparams computed from depth
- d24-d26 ≈ GPT-2 capability
- Miniseries of compute-optimal models at each depth

### Leaderboard (GPT-2 speedrun)
Best: 1.80 hrs on 8×H100, CORE score 0.2690 (vs OpenAI's 168 hrs in 2019).

---

## 3. autoresearch (Mar 9 2026, 29.7K stars) — AGENT NAS

**Purpose:** AI agent autonomously improves LLM training.

**Design:**
- 3 files: prepare.py (fixed), train.py (agent edits), program.md (human edits)
- Fixed 5-minute training budget (wall clock, excluding compilation)
- Metric: val_bpb (bits per byte, vocab-size independent)
- Agent loop: edit → train → measure → keep/discard → repeat
- ~100 experiments overnight (~12/hr)

**Architecture:** Identical to nanochat, simplified for single GPU.
- DEPTH=8 baseline (~50M params on H100)
- Same Muon+AdamW, same ResFormer VE, same sliding windows
- Requires FA3 (Hopper only) — NOT compatible with T4/Ampere without modification

**program.md highlights:**
- Agent runs forever until manually stopped
- Simple keep/discard versioning via git branches
- Results logged to results.tsv
- Simplicity criterion: complexity must be justified by improvement magnitude
- "NEVER STOP" — designed for overnight autonomous operation

---

## Comparison to GLADIUS

### GLADIUS Advantages
| Feature | GLADIUS | Karpathy |
|---------|---------|----------|
| Attention | SLA² (learned sparsity) | Static sliding window (SSSL) |
| Memory | Warm Memory (cross-batch) | None |
| Routing | MoE (conditional computation) | Dense only |
| Growth | Net2Net (Seed→Dragon) | Fixed model size |
| Domain | Text + Time Series path | Text only |
| Tokenizer | 16K BPE | 8K (autoresearch) / 32K (nanochat) |

### Karpathy Advantages
| Feature | Karpathy | GLADIUS |
|---------|----------|---------|
| Optimizer | Muon (orthogonalized momentum) | AdamW |
| Flash Attention | FA3 (Hopper) + SDPA fallback | Standard attention |
| Value Embeddings | ResFormer VE with gating | Not yet |
| Per-layer scalars | resid_lambdas + x0_lambdas | Not yet |
| Logit softcap | 15×tanh | Not implemented |
| Compute | 8×H100 | RTX 2050 / T4 |
| Dataset | ClimbMix 400B tokens | ~157M tokens |

### Convergent Design Choices (independently arrived at)
- RoPE ✅
- QK-norm ✅
- ReLU² ✅
- No bias ✅
- RMSNorm (no learnable params) ✅
- Untied embeddings ✅

---

## Actionable Items for GLADIUS

### Should Implement (High Value)
1. **Muon optimizer** — Replace AdamW for matrix params. Biggest potential improvement.
2. **x0_lambdas** — Blend initial embedding back into each layer. Zero-cost.
3. **resid_lambdas** — Per-layer residual scaling. Zero-cost.
4. **Logit softcap** — `softcap × tanh(logits / softcap)`. Training stability improvement.
5. **Value Embeddings with gating** — Enhance Warm Memory with input-dependent per-head gates.

### Should NOT Port
- FA3 (hardware incompatible)
- Their dataset pipeline (we have ours)
- Distributed optimizer (single GPU)
- Tokenizer training (we have ours)

### Experimental (Low Priority)
- autoresearch concept adapted for GLADIUS + T4
- NorMuon variance reduction (coupled with Muon)
- Their warmup/warmdown schedule (0% warmup, 50% warmdown)
