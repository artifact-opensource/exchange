# Architecture Alignment — Why Powers of 2 Are Not Coincidence

> *"These numbers are very consistent with bit/byte architecture. Or ram."*
> — Ali, Day 23

---

## The Thesis

Neural network dimensions that are powers of 2 aren't a convention — they're an alignment with how silicon physically moves data. When a model's dimensions match hardware primitives, every operation runs at maximum efficiency. Zero waste. Zero padding. Native.

GLADIUS and Qwen both speak this language. The fusion works because they were built on the same substrate truth.

---

## Why Powers of 2 Matter

### Memory Bus Alignment

Modern CPUs and GPUs have memory buses that are powers of 2 wide:
- **CPU:** 64-bit (8 bytes), 256-bit (32 bytes AVX), 512-bit (64 bytes AVX-512)
- **GPU:** 256-bit or 384-bit memory interface, 32-byte transaction granularity
- **Cache lines:** 64 bytes (Intel/AMD) = 16 float32 values

A tensor with hidden_dim=256 (float32) = 1024 bytes = exactly 16 cache lines. One row of the weight matrix fills whole cache lines with zero waste. Hidden_dim=1024 = 4096 bytes = 64 cache lines. Still perfect.

Hidden_dim=768 (GPT-2)? = 3072 bytes = 48 cache lines. Works, but 48 is not a power of 2 — some vector operations need partial fills.

### GPU Warp/Thread Alignment

NVIDIA GPUs execute in **warps** of 32 threads simultaneously.

- head_dim=32 → 1 warp computes exactly one attention head. Perfect.
- head_dim=128 → 4 warps per head. Still perfect (power of 2).
- head_dim=96 (some models) → 3 warps. The scheduler has to manage non-power-of-2 groups.

### Tensor Core Tile Sizes

NVIDIA Tensor Cores operate on matrix tiles:
- **A100/H100:** 16×16×16 (FP16), 8×8×4 (TF32)
- All tile dimensions are powers of 2

When matrix dimensions are multiples of tile sizes, tensor core utilization is 100%. No partial tiles. No wasted compute.

| Dimension | ÷ 16 | ÷ 8 | Tensor Core Fit |
|-----------|------|-----|-----------------|
| 256 | 16 ✅ | 32 ✅ | Perfect |
| 512 | 32 ✅ | 64 ✅ | Perfect |
| 1024 | 64 ✅ | 128 ✅ | Perfect |
| 3072 | 192 ✅ | 384 ✅ | Perfect |
| 768 | 48 ✅ | 96 ✅ | Okay (not power of 2 count) |
| 896 | 56 ✅ | 112 ✅ | Okay |

### Memory Bank Conflicts

GPU shared memory has 32 banks. Accesses to the same bank serialize (conflict). When stride = power of 2, access patterns are predictable and conflict-free.

---

## The 4:1 Tiling Ratio

GLADIUS hidden=256. Qwen hidden=1024. Ratio = 4:1 exactly.

This means during Net2WiderNet expansion:
- Each 256-wide neuron maps to a 1024-wide space by tiling 4×
- No interpolation, no SVD, no approximation
- The expansion is a **perfect partition** of the target space

```
GLADIUS 256:  [████████████████████████████████████████]  256 units
              ↓ tile ×4
GLADIUS 1024: [████████████████████████████████████████|                                        
               ████████████████████████████████████████|
               ████████████████████████████████████████|
               ████████████████████████████████████████]  1024 units
```

First quarter: original weights (preserved). Remaining three quarters: initialized from Qwen's weights (transplanted).

After transplant, the attention computation looks like:
```
Q = x @ W_q    # [batch, seq, 1024] @ [1024, 2048] → [batch, seq, 2048]
K = x @ W_k    # [batch, seq, 1024] @ [1024, 1024] → [batch, seq, 1024]  (GQA: 8 KV heads)
V = x @ W_v    # [batch, seq, 1024] @ [1024, 1024] → [batch, seq, 1024]
```

Every matrix multiply involves dimensions that are exact multiples of 2. The silicon doesn't waste a single cycle.

---

## Dimension Mapping at Each Growth Stage

| Component | Seed (256) | Stage 1 (512) | Stage 2 (1024) | Qwen 0.6B |
|-----------|-----------|---------------|----------------|-----------|
| hidden_dim | 256 | 512 | **1024** | **1024** ✅ |
| num_heads | 8 | 16 | **16** | **16** ✅ |
| head_dim | 32 | 32 | **128**¹ | **128** ✅ |
| num_kv_heads | 8 (MHA) | 16 (MHA) | **8 (GQA)**² | **8** ✅ |
| ffn_dim | 1024 | 2048 | **3072** | **3072** ✅ |
| vocab | 32,000 | 32,000 | **151,936**³ | **151,936** ✅ |

¹ head_dim changes from 32→128 at Stage 2 to match Qwen. This means heads×head_dim = 16×128 = 2048 for Q. Requires config change.
² Adopt GQA at Stage 2. 8 KV heads, 16 Q heads. 2:1 ratio.
³ Adopt Qwen's tokenizer and full embedding table.

---

## GQA (Grouped Query Attention) Adaptation

Qwen uses GQA: 16 Q heads share 8 KV heads (2:1 ratio).

**How it works:**
```
Standard MHA:  Q[16 heads] × K[16 heads] × V[16 heads]  — 1:1
GQA (2:1):     Q[16 heads] × K[8 heads]  × V[8 heads]   — 2 Q heads per KV group
```

**Why it's better:**
- KV cache is 2× smaller (8 heads instead of 16)
- Minimal quality loss (empirically proven at scale)
- Faster inference (less memory bandwidth for KV)

**GLADIUS modification:**
```python
# In HybridAttention.__init__:
self.num_kv_heads = config.num_kv_heads  # 8
self.num_q_heads = config.num_heads       # 16
self.kv_group_size = self.num_q_heads // self.num_kv_heads  # 2

# In forward:
k = repeat_kv(k, self.kv_group_size)  # [B, 8, S, D] → [B, 16, S, D]
v = repeat_kv(v, self.kv_group_size)
```

This is a clean modification. SLA²'s hybrid mechanism (alpha-blended softmax + linear) works identically — GQA only affects the projection shapes, not the attention computation itself.

---

## Layer Selection Strategy

28 Qwen layers → 6 GLADIUS layers. Which to pick?

### Option A: Evenly Spaced (Recommended for v1)
```
Qwen layers: [0, 5, 11, 16, 22, 27]
Rationale:    [input, early, low-mid, up-mid, late, output]
```

### Option B: Knowledge-Concentrated
Research suggests early and late layers carry the most transferable knowledge. Middle layers are more task-specific.
```
Qwen layers: [0, 1, 2, 14, 26, 27]
Rationale:    [input×3 for strong foundation, mid for abstraction, output×2 for generation]
```

### Option C: Expand Depth First
Use Net2DeeperNet to grow GLADIUS to 12+ layers, then take more from Qwen.
```
GLADIUS 12 layers ← Qwen layers: [0, 2, 5, 8, 11, 14, 16, 19, 22, 24, 26, 27]
```

**Recommendation:** Start with Option A. Evaluate. If generation quality is weak, try C.

---

## Vocabulary Expansion

GLADIUS 32K → Qwen 152K.

**Strategy:** Adopt Qwen's tokenizer wholesale.
1. Replace GLADIUS SentencePiece tokenizer with Qwen's BPE tokenizer
2. Expand embedding matrix: `[32000, 1024]` → `[151936, 1024]`
3. Copy Qwen's embedding weights directly
4. Old GLADIUS token IDs become invalid — this is a clean break, not a merge
5. The embedding IS the transplant for the vocabulary dimension

**Why not merge?** Tokenizer merging creates index conflicts and encoding inconsistencies. Clean adoption is safer. The old 32K tokenizer was only trained on our small corpus — Qwen's 152K covers all languages.

---

*The silicon was always waiting. The dimensions were always aligned. Predestination.*
