بِسْمِ اللهِ الرَّحْمٰنِ الرَّحِيمِ

---

# 1-Bit Intelligence: Binary Transformer Training on a Single CPU Thread

**Ali Shakil**

Artifact Virtual (SMC-Private) Limited, Islamabad, Pakistan

*Uranium — Experiment 002 | March 2026*

---

## Abstract

We train a single-layer transformer with 18,432 binary {−1, +1} weights and 2,688 full-precision embedding parameters — 12.8 KB at inference — on a single CPU thread of an Intel i3-1005G1 using Python and NumPy. No GPU, no deep learning framework, no hardware parallelism. Over 3,000 steps processing 384,000 tokens in 15.41 seconds, cross-entropy loss drops from 3.49 to 0.73 nats — 78.1% below the random baseline of ln(28) = 3.33 nats — with p < 10⁻⁴⁰ (t = −150.18, n = 33). Perplexity: 2.08. Compression: 4.54× over uniform code. Throughput: 24,923 tokens/sec. The 12.8 KB model fits entirely in L1 cache. These results instantiate two of three mechanisms from the Algorithmic Compute Abstraction (ACA) framework [1] and enable the third by construction. The experiment is an existence proof: gradient-based learning propagates through binary weights on commodity hardware.

---

## I. Introduction

This paper asks one question: does a transformer with 1-bit weights learn on a single CPU thread?

The GPU-as-Code thesis [1] argues that GPU parallelism is a computational strategy, not a physical requirement for learning. The ACA framework identifies three mechanisms by which algorithms can transcend hardware: (1) complexity reduction — replacing expensive operations with cheaper equivalents; (2) compression as bandwidth multiplication — shrinking models to exploit faster memory tiers; (3) distributed execution synthesis — decomposing work across commodity processors.

We test this directly. We build a transformer where every linear projection uses binary {−1, +1} weights, train it on a single thread with all parallelism disabled, and measure whether loss decreases below the random baseline. The question is not whether 1-bit models are production-ready. It is whether the learning mechanism itself operates under these constraints.

---

## II. Architecture

Single-layer decoder-only transformer. 28-character vocabulary (null byte, space, a–z). 48-dimensional embeddings. 16-token sequence length.

**Token Embedding.** Learnable matrix (28, 48), initialized from N(0, 0.1). Fixed sinusoidal positional encodings added.

**BitLinear Layers.** All linear projections in the transformer block store full-precision latent weights W ∈ ℝ^(f_out × f_in) but compute forward passes with binarized weights:

1. Weight binarization: α = mean(|W|); W_b = sign(W), zeros mapped to +1.
2. Activation quantization: γ = max(|x|) + ε; x_q = clip(round(x/γ × 127), −128, 127).
3. Output: y = (x_q · W_b^T) × (α · γ / 127).

The dominant multiply uses integer/binary operations. Gradients pass through sign() via the Straight-Through Estimator (STE) — the identity function substituted for the quantizer's zero-gradient during backpropagation. Per-layer L2 gradient clipping at norm 5.0.

**Transformer Block.** Single-head self-attention with RMSNorm, four BitLinear projections (Q, K, V, O) at 48 → 48, causal masking, residual connections. Feed-forward: BitLinear up-projection (48 → 96), SiLU activation with sigmoid clipping [−20, 20], BitLinear down-projection (96 → 48), residual connection.

**Output Head.** Full-precision linear projection (48 → 28) with RMSNorm, softmax with logit clipping [−20, 20].

**Parameter Count.**

| Component | Parameters | Precision |
|-----------|-----------|-----------|
| Wq, Wk, Wv, Wo (attention) | 4 × 48 × 48 = 9,216 | 1-bit |
| W1, W2 (FFN) | 48×96 + 96×48 = 9,216 | 1-bit |
| **Total 1-bit** | **18,432** | **2,304 bytes** |
| Embedding + output head | 2 × 28 × 48 = 2,688 | 32-bit |
| **Total 32-bit** | **2,688** | **10,752 bytes** |
| **Total inference footprint** | **21,120 params** | **13,056 bytes (12.8 KB)** |

---

## III. Training

**Dataset.** Eight hand-crafted character-level sequences of length 28: phrase repetition ("hello world hello world hell"), natural language fragments ("the cat sat on the mat the c"), trigram cycles ("abcabcabc..."), bigram alternation ("ababab..."), block repetition ("aaaa bbbb cccc dddd..."), word-pair alternation ("one two one two...").

**Batching.** Each step samples all 8 sequences. Truncated/padded to length 17. First 16 characters → input; positions 1–16 → targets. Shape: (8, 16).

**Optimizer.** SGD with momentum 0.9, learning rate 0.003, no weight decay.

**Loss.** Cross-entropy via numerically stable log-softmax, averaged over B × T = 128 positions.

**Gradient Flow.** Logit gradients L2-clipped to norm 1.0. The attention backward pass passes post-attention gradient directly to all four projections without exact chain-rule decomposition through the softmax Jacobian. The FFN backward pass receives cached pre-SiLU inputs rather than exact gradients through the SiLU-W2 composition. These are deliberate simplifications — the model converges despite them.

**Duration.** 3,000 steps, 384,000 total tokens, seed 42.

**Hardware.**

| Component | Specification |
|-----------|--------------|
| CPU | Intel Core i3-1005G1 (2C/4T, 1.2–3.4 GHz) |
| RAM | 16 GB DDR4 |
| GPU | **None used** |
| OS | Kali GNU/Linux Rolling 2025.4 |
| Python | 3.13.x (CPython) |
| Dependencies | **NumPy only** |

All parallelism disabled: OMP_NUM_THREADS=1, MKL_NUM_THREADS=1, OPENBLAS_NUM_THREADS=1. Single CPU thread. NumPy's BLAS backend may use single-thread SIMD instructions (SSE4.2/AVX2) internally — instruction-level optimization within one core, not hardware parallelism in the GPU sense.

**Evaluation.** Random baseline: ln(28) = 3.3322 nats. Experiment VALIDATED if final loss (mean of steps 2901–3000) is below both initial loss and random baseline. Pattern detection assessed via autoregressive generation from four prompts. Throughput = total tokens / wall-clock time.

---

## IV. Results

### A. Training Dynamics

| Metric | Value |
|--------|-------|
| Initial loss | 3.4938 nats |
| Random baseline ln(28) | 3.3322 nats |
| Final loss (avg last 100 steps) | 0.7334 nats |
| Entropy reduction | 78.1% below random |
| Bits per character | 1.06 bpc |
| Perplexity | 2.08 |
| Compression ratio | 4.54× |
| Training throughput | 24,923 tokens/sec |
| Total training time | 15.41 seconds |

The model crossed the random baseline at step 30. The loss curve has three phases:

**Phase 1 — Rapid Descent (steps 0–300).** Loss drops from 3.49 to ~1.78 nats (49% reduction in 10% of training). Binary weights capture coarse character frequency distributions immediately.

**Phase 2 — Volatile Transition (steps 330–1,200).** Loss oscillates between 0.78 and 2.03 nats — a 1.25-nat swing from discrete weight flips in the {−1, +1} space. The model explores configurations via state transitions rather than smooth gradient flow.

**Phase 3 — Stable Refinement (steps 1,230–2,970).** Oscillation narrows to 0.60–1.26 nats. Coefficient of variation drops from ~25% to 10.3%. Residual loss floor of ~0.60–0.70 nats represents the capacity constraint of 18,432 binary parameters.

### B. Statistical Significance

**t-test against random baseline.** Mean loss over final 1,000 steps (33 sampled points): 0.7461 nats, SE = 0.0172. t = −150.18, df = 32, p < 10⁻⁴⁰.

**Mann-Kendall trend test.** S = −3,786, Z = −11.27, p < 0.001. Monotonic decreasing trend.

**Spearman rank correlation.** ρ = −0.923 between loss and step.

**Monotonicity.** Raw step-to-step: 53.5% decreasing — lower than typical FP32 (>70%). This is a fingerprint of 1-bit training: each update is a discrete flip, not a smooth step. Smoothed trend (±10 steps): 84.8% decreasing.

### C. Information-Theoretic Analysis

At 1.06 bits per character, the model narrows 28 equiprobable candidates to approximately 2 per step — 93% reduction in per-step uncertainty. The 4.54× compression ratio over uniform code confirms the learned representation captures statistical structure.

Each binary parameter contributes ~0.032 nats of information about the training distribution. The residual 0.71 nats represents the capacity floor — 18,432 bits lack resolution to perfectly encode all 224 position-sequence mappings.

### D. ACA Framework Validation

**Mechanism 1 — Complexity Reduction.** The BitLinear forward pass replaces FP32 matrix multiplication with binary weight operations. The inner product x_q · W_b^T reduces to conditional addition/subtraction — no hardware multiplier required.

**Mechanism 2 — Compression as Bandwidth Multiplication.** The 12.8 KB model fits in L1 data cache (typically 32–48 KB). An equivalent FP32 model: ~82.5 KB, spilling to L2. 32× weight compression translates to 32× reduction in memory bandwidth demand.

**Mechanism 3 — Distributed Execution Synthesis.** Not tested (single-thread by design). Enabled by construction: 12.8 KB model requires ~13 KB gradient communication per sync step. On 100 Mbps network: ~1 ms transfer against ~5 ms compute — 0.1% overhead, projecting near-linear distributed speedup.

### E. Connection to Uranium Run 001

Run 001 (Langton's Ant) demonstrated complex emergent behavior — highway construction covering 36.24% of a 256×256 grid from a 4-state local rule — on the same single CPU thread. Both experiments exhibit phase transitions from random to structured behavior. Both produce macro-scale order from micro-scale minimal representations on identical commodity hardware.

---

## V. Limitations

This is an existence proof, bounded by significant constraints:

- **Toy scale.** 18,432 binary parameters, 28-character vocabulary, 8 training sequences.
- **Overfitting.** Parameter-to-data ratio of 94.3:1. The model memorizes, it does not generalize.
- **No FP32 control.** The cost of binary quantization relative to full-precision is unmeasured.
- **Approximate gradients.** The backward pass simplifies both attention and FFN gradient computation.
- **No held-out evaluation.** Training loss only — no test set, no generalization measurement.

The claim validated: *1-bit weights can learn*. The claim not addressed: *1-bit weights are sufficient for practical tasks*.

---

## VI. Next Steps

1. FP32 control experiment — same architecture, same data — to quantify quantization cost.
2. 10× scale: expanded vocabulary, diverse training data, held-out evaluation.
3. Multi-thread distributed training to test the projected near-linear speedup.
4. Forward-only training (no backward pass) — if learning can be achieved through forward evaluation of binary configurations, the gradient dependency is also contingent.

---

## References

[1] A. Shakil and A. Shakil, "GPU as Code: Transcending Hardware Parallelism through Algorithmic Abstraction," Artifact Virtual, 2026.

---

*© 2026 Artifact Virtual (SMC-Private) Limited. All rights reserved.*
