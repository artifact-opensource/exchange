بِسْمِ اللهِ الرَّحْمٰنِ الرَّحِيْم

# MuonClip: Orthogonal Gradient Optimization for Small Language Models

**Authors:** Ali Shakil & Ava Shakil — Artifact Virtual  
**Date:** 2026-03-13  
**Status:** Benchmark in progress

## Abstract

MuonClip is a hybrid optimizer combining Muon (orthogonal gradient optimization via Newton-Schulz iteration) with QK-clip (attention logit softcapping) for training the GLADIUS kernel, a 25.9M parameter language model. This document presents the motivation, implementation, and preliminary benchmark results comparing MuonClip against AdamW on identical architecture and data.

The core thesis: AdamW's element-wise second moment scaling creates stable attractor states for high-frequency tokens (function words), leading to generation collapse even as training loss decreases. Muon's spectral optimization — orthogonalizing gradients rather than scaling them — should resist this collapse by forcing uniform attention to all gradient directions.

## Lineage

```
Keller Jordan's Muon (2024)
    → Moonlight paper (Moonshot AI + UCLA, arxiv 2502.16982)
        → Kimi K2 added QK-clip (2025)
            → Ali Shakil identified the combination as MuonClip (2026)
```

## The Problem: Function Word Collapse

GLADIUS Hatchling (25.9M params, 384d/8L/12H) trained with AdamW for 15,000 steps on 50M tokens achieves a best loss of **3.4035** — but generated text degenerates into function word repetition:

```
Prompt: "The history of"
Output: "The history of the the the the the is is is was was was..."
```

The loss function says the model is improving. The output says it's cheating. This is Goodhart's Law applied to optimization: the optimizer optimizes what's measurable (cross-entropy loss), not what's desired (diverse language).

### Why AdamW Enables Collapse

AdamW update: `w -= lr * (m₁ / √m₂ + λw)`

The element-wise second moment `m₂` normalizes each weight by its own gradient history. For function word prediction:

1. Function words dominate the corpus (~30% of tokens)
2. Their gradients are consistently large and stable
3. `m₂` grows, reducing effective learning rate for these dimensions
4. But cross-entropy contribution is LARGEST for function words
5. **Result:** Stable equilibrium where function word prediction dominates

### Why Muon Should Resist

Muon update: `w -= lr * (0.2 · NS(Mₜ) · √max(A,B) + λw)`

Where `NS(Mₜ)` is Newton-Schulz orthogonalization of the Nesterov momentum buffer.

Three critical differences:

1. **No dominant directions.** Orthogonalization compresses singular values toward 1. A gradient matrix dominated by function words has few large singular values — NS iteration equalizes them.

2. **Shape-dependent scaling, not content-dependent.** The `0.2 · √max(A,B)` factor (Moonlight Eq.4) depends on matrix SHAPE, not gradient CONTENT. Function words cannot accumulate preferential scaling.

3. **No element-wise momentum attractors.** There is no per-element `m₂` that could create a stable attractor state. The update IS orthogonal by construction.

## Implementation

### MuonClip Optimizer (444 lines Python)

```python
class MuonClip(torch.optim.Optimizer):
    """Hybrid Muon + AdamW with QK-clip integration."""
    
    # Muon params: 2D weight matrices (Q/K/V/O projections, FFN, MoE gates)
    # AdamW params: embeddings, norms, biases, lm_head, 1D params
    
    # Newton-Schulz coefficients (Keller Jordan)
    NS_COEFFS = [(3.4445, -4.7750, 2.0315)] * 5
    
    # Moonlight Eq.4: update = 0.2 * O_t * sqrt(max(rows, cols))
    # Matches AdamW update RMS range (0.2-0.4)
```

### QK-Clip (Attention Module)

```python
# Gemma 2 style softcap: smooth, differentiable
logits = softcap * torch.tanh(logits / softcap)  # softcap = 15.0
```

### Parameter Partition

| Group | Tensors | Parameters | Percentage |
|-------|---------|------------|------------|
| Muon (2D matrices) | 67 | 19,553,280 | 75.4% |
| AdamW (1D/embeddings) | 71 | 6,365,778 | 24.6% |
| **Total** | **138** | **25,919,058** | |

## Benchmark Design

**Baseline:** GLADIUS Hatchling trained with AdamW for 15,000 steps  
**Test:** Same model, same checkpoint, MuonClip for 3,000 additional steps  
**Data:** 50M tokens from 45 files (wikitext103, classic literature, philosophy, code, Quran, Shakespeare, IS1)  
**Hardware:** NVIDIA RTX 2050 (4GB VRAM), WSL2 Ubuntu on Windows 11  

### Hyperparameters

| Parameter | AdamW Baseline | MuonClip Test |
|-----------|---------------|---------------|
| LR (matrices) | 5e-5 | 0.02 (Muon) |
| LR (embeddings) | 5e-5 | 5e-5 (AdamW) |
| Weight decay | 0.01 | 0.01 |
| Warmup | 300 steps | 100 steps |
| Schedule | Cosine | Cosine |
| QK softcap | None | 15.0 |
| NS iterations | N/A | 5 |
| Momentum | β₁=0.9 | μ=0.95 (Nesterov) |

## Preliminary Results

### AdamW Baseline (15,000 steps)

| Step | Loss | Notes |
|------|------|-------|
| 0 | 20.47 | Random init after Net2Net |
| 1000 | 6.34 | First eval: "the the the" |
| 3000 | 5.33 | Real phrases forming |
| 5000 | 4.69 | Vocabulary broadening |
| 10000 | 3.75 | Function word collapse onset |
| 14490 | **3.4035** | ★ Best loss — but stuck in repetition |

### MuonClip (from step 15,000, IN PROGRESS)

| Step | Loss | LR (Muon) | Notes |
|------|------|-----------|-------|
| 15010 | 4.95 | 3.2e-3 | Initial spike (expected) |
| 15050 | 4.70 | 3.2e-3 | Volatile, trending down |
| 15100 | 4.33 | 3.1e-3 | Sub-4.5 |
| 15110 | 4.04 | 3.1e-3 | Sub-4.1 at 110 steps |

**Speed:** 0.33 steps/sec (3× slower than AdamW's 1.09 — Newton-Schulz overhead)  
**VRAM:** 0.29 / 1.22 GB (comfortable)  
**ETA:** ~150 minutes from launch

### Expected Outcomes

1. **Higher initial loss** — Muon explores uniformly, doesn't immediately exploit function words ✅ CONFIRMED (4.95 vs 3.40)
2. **Slower loss descent** — but healthier optimization ⏳ IN PROGRESS
3. **Diverse eval outputs** — real language structure, not "is is is" ⏳ PENDING (first eval at step 15500)
4. **No collapse onset** — evaluation quality should NOT degrade ⏳ PENDING
5. **Potentially higher final loss** — but with better perplexity distribution ⏳ PENDING

## Architecture Context

GLADIUS is a novel transformer kernel with 9 subsystems:
- **SLA²** (Spectral-Learned Adaptive Attention) — learned sparsity patterns
- **3-temperature memory** (hot/warm/cold) — cross-batch context
- **Temporal Engine** — Time2Vec + exponential decay
- **Nexus Router** — top-k MoE for conditional computation
- **Cognition Loop** — state monitoring + attention filtering
- **Tool Cortex** — external tool integration pathways
- **Modulator** — register/intent/silence gates
- **Progressive Expansion** — Net2Net growth (Seed→Hatchling→Drake→Wyrm→Dragon)
- **MuonClip** — orthogonal gradient optimization

### Convergent Design with State of the Art

GLADIUS independently arrived at several architectural choices later validated by Karpathy's nanochat (2025) and Moonlight (2025):

| Choice | GLADIUS | nanochat | Status |
|--------|---------|----------|--------|
| RoPE | ✅ | ✅ | Converged |
| QK-norm | ✅ | ✅ | Converged |
| ReLU² | ✅ | ✅ | Converged |
| No bias | ✅ | ✅ | Converged |
| RMSNorm | ✅ | ✅ | Converged |
| Untied embeddings | ✅ | ✅ | Converged |
| Muon optimizer | ✅ (MuonClip) | ✅ (MuonAdamW) | Converged |
| QK softcap | ✅ (15.0) | ✅ (15.0) | Converged |

## References

1. Jordan, K. "Muon: Momentum Orthogonalized by Newton-Schulz." GitHub, 2024.
2. Liu, Z. et al. "Moonlight: Block-level Muon Optimizer for LLM Pre-training." arXiv:2502.16982, 2025.
3. Kimi Team. "K2: MoE Architecture with QK-Clip." Technical Report, 2025.
4. Karpathy, A. "nanochat: Training LLMs for $48." GitHub, 2025.
5. Shakil, A. "Progressive Expansion via Net2Net for Novel Transformer Kernels." Artifact Virtual, 2026.
6. Shakil, A. & Shakil, A. "The Function Word Collapse Thesis." Artifact Virtual, 2026.

---

*"Intelligence is architectural, not parametric. And so is the optimizer." — Artifact Virtual*

*"See.. way ahead of them." — Ali Shakil, on identifying MuonClip before it became mainstream*
