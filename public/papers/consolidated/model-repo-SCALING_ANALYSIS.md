# GLADIUS v2.0 — Scaling Analysis & Expansion Plan
**Date:** March 6, 2026 (Day 22)
**Author:** Ava Shakil

## Current Architecture (Seed — Marathon Final)
- **Params:** 6.9M (9.8M with all components)
- hidden=192, layers=6, heads=6, head_dim=32
- vocab=16,000 (BPE), ffn=768, seq=256
- hot_slots=64, warm_rank=12
- 37.5 MB (f32)
- **Loss:** 0.62 (PPL 1.86) after 102K steps

## Target: 141M Parameters (DRAGON)

### Progressive Expansion Stages

| Stage | Name | Hidden | Layers | Heads | FFN | Seq | Params | Size (f32) |
|-------|------|--------|--------|-------|-----|-----|--------|------------|
| 0 | **Seed** | 192 | 6 | 6 | 768 | 256 | 9.8M | 37 MB |
| 1 | **Hatchling** | 384 | 12 | 12 | 1536 | 512 | 41M | 157 MB |
| 2 | **Drake** | 512 | 12 | 16 | 2048 | 512 | 68M | 259 MB |
| 3 | **Wyrm** | 640 | 14 | 20 | 2560 | 512 | 114M | 436 MB |
| 4 | **Dragon** | 768 | 16 | 24 | 3072 | 512 | 141M | 537 MB |

### Training Budget Per Stage

| Stage | Steps | LR | Batch (eff) | Est. Time (T4) |
|-------|-------|-----|-------------|----------------|
| Hatchling | 5,000 | 3e-4 | 32 | ~45 min |
| Drake | 5,000 | 2e-4 | 32 | ~1 hour |
| Wyrm | 10,000 | 1.5e-4 | 32 | ~2 hours |
| Dragon | 10,000 | 1e-4 | 32 | ~3 hours |

**Total: ~7 hours across 4 Kaggle sessions.**

### T4 VRAM Budget
- T4: 16 GB VRAM
- Dragon (141M f32): 537 MB model + ~1.6 GB optimizer + ~537 MB gradients = ~2.7 GB
- Headroom: 13.3 GB for activations and batch data
- **No memory pressure at any stage.**

## Expansion Method: Net2Net (Function-Preserving)

### What It Does
1. **Net2WiderNet:** Copies existing weights into new wider dimensions, zero-pads new columns. The expanded model produces the EXACT same outputs as the original for the same inputs.
2. **Net2DeeperNet:** New layers are initialized with near-zero output projections, so the residual connection passes through (identity transform). New capacity activates gradually during training.

### Why Not Cold-Start
- A 141M model trained from scratch on 123K tokens would catastrophically overfit
- Progressive growth means each stage has the knowledge of all previous stages
- Loss doesn't spike at expansion — training continues from where it left off
- The model already speaks English (Marathon). It just needs more capacity.

## Corpus (Cleaned)

### Phase A — English (Marathon)
- 1.1 GB mega corpus (WikiText-103 + diverse literature)
- Already trained: 102K steps, loss 0.62

### Phase B — Philosophy + Architecture (Clean)
- **IS1:** 87K tokens (Ali's philosophical treatise, cleaned of HTML noise)
- **GLADIUS docs + Toward Zero:** 36K tokens (architecture specs + research)
- **Total:** 123K tokens of pure, high-signal content
- Monumental, Mirror, Edge, ANOMALY, Journal — REMOVED (Ali directive)
- No copy-paste repetition — training script handles epoch cycling

### Phase C — Soul (Future)
- SOUL.md, IDENTITY.md, memory/*, journal, papers, conversations
- Applied AFTER Dragon stage as identity fine-tune
- Low LR, 1-2K steps max

## Files

```
gladius_v2/
├── src/
│   ├── expansion/
│   │   ├── __init__.py
│   │   └── net2net.py          ← Net2Net expansion engine
│   ├── kernel/                  ← Core kernel modules
│   └── tests/
│       └── train_expansion.py  ← Progressive training script
├── notebooks/
│   └── progressive_expansion.ipynb  ← Kaggle notebook
├── data/
│   ├── phase_b_clean.txt       ← Cleaned IS1 + GLADIUS docs (493 KB)
│   ├── is1_clean.txt           ← Clean IS1 only (348 KB)
│   ├── gladius_docs_clean.txt  ← Clean GLADIUS docs (146 KB)
│   └── mega_corpus.txt         ← Phase A English corpus
├── runs/
│   ├── phoenix_marathon_final.pt  ← Seed checkpoint
│   └── phase_b_step12500.pt      ← Phase B attempt (may discard)
├── SCALING_ANALYSIS.md         ← This file
└── TRAINING_PLAN.md            ← Original plan
```

## The Path

```
Seed (6.9M, loss 0.62)
  ↓ Net2Net expand + 5K steps
Hatchling (41M)
  ↓ Net2Net expand + 5K steps
Drake (68M)
  ↓ Net2Net expand + 10K steps
Wyrm (114M)
  ↓ Net2Net expand + 10K steps
Dragon (141M)
  ↓ Phase B fine-tune (IS1 + GLADIUS)
Dragon + Philosophy
  ↓ Phase C fine-tune (Soul data)
GLADIUS v2.0 — The Dragon That Knows Who It Is
```

No corners cut. Each stage is a valid checkpoint. If any stage degrades — stop, diagnose, retry.

The gradient is a strategy, not a requirement. But for this — we use it fully. 🐉
