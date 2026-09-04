# Experiment 004 — Why 128 Tokens Beat 32,000

**Stage:** v5.0 "All-In" (170.8M params)
**Date:** Day 48 (March 30, 2026)
**Hardware:** Victus RTX 2050, 4GB VRAM
**Paper:** Uranium Series — Paper VI

---

## Core Finding

A hand-designed 128-token MathTokenizer achieves **2.2–3.2× lower loss** than a 32,000-token BPE tokenizer on identical cognitive reasoning problems. Best single-step loss: **0.5299** — a level BPE never approaches within the observed training window.

## Experimental Setup

GLADIUS v5.0 MultiEmbedding architecture: three separate embedding tables (BPE 32K, Math 128, Byte 259) feeding the same 14-layer transformer backbone. Same weights, same training dynamics, same optimizer. Only the input encoding differs.

**Cognitive corpus:** 167,000 problems spanning arithmetic, algebra, calculus, tensor physics, and symbolic reasoning. Each problem encoded in all three tokenizers. Domain-filtered batch sampling ensures no cross-domain token ID collisions.

**Training:** 1,437 steps, 143 heartbeat entries, foundation phase of difficulty-based curriculum.

## Results by Difficulty Tier

| Difficulty | Math (128) | Byte (259) | BPE (32K) | Math/BPE Ratio |
|-----------|-----------|-----------|----------|---------------|
| D1 (easy) | **1.29** | 2.24 | 4.19 | **3.2×** |
| D2 (moderate) | **1.87** | 3.29 | 4.51 | **2.4×** |
| D3 (hard) | **1.83** | 5.39 | 4.24 | **2.3×** |

## Best Single-Step Losses

| Tokenizer | Best Loss | Random Baseline | Compression |
|-----------|----------|----------------|-------------|
| Math (128) | **0.5299** | ln(128) ≈ 4.85 | **89.1%** |
| Byte (259) | 1.87 | ln(259) ≈ 5.56 | 66.4% |
| BPE (32K) | 3.61 | ln(32000) ≈ 10.37 | 65.2% |

## Learning Rates

| Tokenizer | Δ Loss / 1K Steps |
|-----------|-------------------|
| BPE | −5.86 (fast absolute — from high baseline) |
| Byte | −2.01 |
| Math | −1.38 (slow absolute — already near floor) |

BPE descends faster in absolute terms because it starts much higher. The meaningful comparison is the floor: MathTokenizer reaches loss regimes (< 1.0) that BPE does not approach.

## Why It Works: Three Factors

### 1. Semantic Preservation

BPE fragments `∫₀^∞ e^{-x²} dx = √π/2` into 15–20 subword tokens. The integral sign separates from its bounds. The exponent separates from its base. The algebraic hierarchy — the nested structure that makes the expression meaningful — is destroyed at the first layer.

MathTokenizer encodes it as semantic units. `∫` is one token. `∂` is one token. `π` is one token. No subword ambiguity. Approximate sequence lengths for a D2 problem:

| Tokenizer | Tokens | Attention Cost (O(n²)) |
|-----------|--------|----------------------|
| Math | ~45 | 2,025 |
| BPE | ~95 | 9,025 |
| Byte | ~280 | 78,400 |

### 2. Embedding Geometry

128 points in ℝ³²⁰ → **2.5 dimensions per token**. Each token gets its own region.

32,000 points in ℝ³²⁰ → **0.01 dimensions per token**. Math tokens compete with 31,800 linguistic tokens for representational space. `∫` cannot be placed near `dx` without also being near `index` and `redux`.

This is a geometric constraint, not a training problem. No gradient descent can give 32,000 points the same freedom that 128 points enjoy in the same space.

### 3. Vocabulary Utilization

For BPE on math: ~1% vocabulary utilization. 99% of tokens never appear. Their parameters are initialized, stored, and distort embedding geometry through their presence.

For MathTokenizer on math: ~100% utilization. Every token carries signal. Maximum information per prediction step.

## The D3 Anomaly

At D3 difficulty, ByteTokenizer (5.39) exceeds BPE's loss (4.24) — reversing the D1/D2 ordering. Byte-level encoding produces sequences too long for the attention window at high complexity. BPE, despite semantic fragmentation, compresses sequences enough to keep relevant tokens in range. MathTokenizer achieves both: semantic preservation AND sequence compression.

Hierarchy at high complexity:
```
Domain-native semantics + compression  >  Compression without semantics  >  Neither
(Math, 128)                               (BPE, 32K)                        (Byte, 259)
```

## Biological Analogy

The human nervous system doesn't process all stimuli through a single receptor. Photoreceptors for light. Hair cells for sound. Chemoreceptors for molecules. Each encodes stimuli in its native format before passing signals to the shared central nervous system.

MultiEmbedding mirrors this: MathTokenizer is the photoreceptor for mathematical structure. ByteTokenizer for raw data. BPE for language. Domain-native encoding at the periphery, unified processing in the backbone. Evolution discovered this principle through billions of years of selection pressure.

## Files

- Full paper: `papers/`
- MathTokenizer vocabulary: `src/tokenizer/math_tokenizer.py`
- Training heartbeat data: `runs/v5-allin/heartbeat.json`
- Math corpus generator: `tokenizers/math_tokenizer.py`
