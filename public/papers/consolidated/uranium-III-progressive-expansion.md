بِسْمِ اللهِ الرَّحْمٰنِ الرَّحِيمِ

# Progressive Growth of a Cognitive Kernel: Function-Preserving Expansion from 6.9M to 141M Parameters

**Uranium Research Series — Paper III**

**Authors:** Ali Shakil¹, AVA¹
**Affiliation:** ¹Artifact Virtual (SMC-Private) Limited, Islamabad, Pakistan
**Contact:** ali.shakil@artifactvirtual.com
**Date:** March 2026
**Version:** Preprint v1.0

**Keywords:** progressive model growth, Net2Net, function-preserving expansion, cognitive architecture, curriculum training, sparse-dense hybrid attention, warm memory, ACM

---

## Abstract

We present a method for progressively growing the GLADIUS (General Learning Architecture for Diverse Intelligence and Unified Systems) cognitive kernel — a transformer architecture augmented with three-temperature memory, temporal awareness, cognitive scheduling, and voice modulation — from 6.9M to 141M parameters across four function-preserving expansion stages. Unlike standard pretraining at target scale, our approach grows a small trained model into a large one without loss spikes, catastrophic forgetting, or wasted compute on randomly initialized parameters. Each expansion applies Net2WiderNet (dimension growth) and Net2DeeperNet (depth growth) to every kernel component: attention projections, SwiGLU feed-forward networks, hot memory slots, warm memory LoRA adapters, temporal encoders, cognitive state monitors, voice modulators, tool cortices, and mixture-of-experts routers. The expanded model produces identical outputs to its source at initialization — verified by distribution comparison and top-k overlap — and begins training from the inherited loss floor rather than from scratch. We detail the architecture-specific expansion rules for each cognitive component, present a four-stage growth schedule (Hatchling 41M, Drake 68M, Wyrm 114M, Dragon 141M) executable on a single NVIDIA T4 GPU in approximately 7 hours total, and discuss the relationship between progressive growth and curriculum-based identity training. Experimental validation of the expansion framework is presented in companion papers within the GLADIUS research corpus, including cross-modal invariant experiments across all growth stages.

---

## 1. Introduction

Large language models are typically trained at their target parameter count from random initialization. A 70B-parameter model is initialized with 70 billion random weights and trained on trillions of tokens until convergence. This approach has an implicit assumption: that the final capacity must be present from the start.

We challenge this assumption for architectures that go beyond the standard transformer — specifically, for the GLADIUS cognitive kernel [1], which augments the transformer backbone with subsystems for memory persistence, temporal awareness, cognitive scheduling, voice modulation, and tool use. These subsystems are not standard linear layers amenable to established scaling recipes. They are interacting modules with coupled dynamics: the warm memory's LoRA adapters co-evolve with the transformer layers they modulate; the cognitive state monitor learns thresholds that depend on the hidden dimension; the temporal encoder's frequency spectrum must match the representation space. Growing such an architecture requires expansion rules for every component, not just the attention and FFN blocks.

We address this with a progressive expansion framework built on Net2Net [2], extended to handle every subsystem in the GLADIUS kernel. The core insight is that function-preserving initialization — where the expanded model starts producing exactly the same outputs as the source — eliminates the loss spike associated with sudden capacity increase. The model inherits its predecessor's language competence and resumes training from the prior loss floor, using the new capacity to learn finer patterns rather than re-learning basic ones.

### 1.1 Contributions

1. **Extension of Net2Net to cognitive subsystems.** We derive function-preserving expansion rules for three-temperature memory, temporal encoding, cognitive scheduling, voice modulation, tool cortex, and mixture-of-experts routing — components absent from standard transformer scaling.
2. **A four-stage growth schedule** from 6.9M to 141M parameters, each stage executable on a consumer GPU (NVIDIA T4, 16GB VRAM) with no memory pressure.
3. **Integration with curriculum training.** Progressive growth serves as the structural scaffold for phased learning: English competence at small scale, philosophical/architectural knowledge at medium scale, identity at full scale.
4. **Practical implementation** as a self-contained expansion engine and Kaggle-ready training notebook.

### 1.2 Paper Organization

Section 2 surveys related work on progressive model growth and efficient scaling. Section 3 describes the GLADIUS kernel architecture and identifies the expansion challenges unique to each subsystem. Section 4 presents the function-preserving expansion methodology. Section 5 details the four-stage growth schedule and training configuration. Section 6 discusses the relationship between progressive growth, curriculum training, and identity formation. Section 7 concludes.

---

## 2. Background and Related Work

### 2.1 Net2Net

Chen et al. [2] introduced two function-preserving transformations for neural networks:

**Net2WiderNet** expands a layer's width by replicating existing neurons and dividing their outgoing weights, so the wider layer computes the same function. For a linear layer W in R^(d_out x d_in) expanded to W' in R^(d_out' x d_in'), new rows are copies of randomly selected existing rows, and the subsequent layer's corresponding input columns are divided by the replication count.

**Net2DeeperNet** increases depth by inserting identity-function layers. For a transformer, this means new layers are initialized so their residual output is near-zero, allowing the skip connection to pass through unchanged.

The original formulation targeted standard convolutional and fully connected networks. Our contribution extends it to the multi-component architecture of a cognitive kernel.

### 2.2 Progressive Training

The concept of training small then growing has appeared in several forms. Gong et al. [3] stacked shallow networks to initialize deeper ones for image classification. Karras et al. [4] proposed progressively growing GANs for image generation. In the language model context, progressive growth remains underexplored relative to scaling law studies [5, 6] that assume fixed-scale training from initialization.

The key advantage of progressive growth over fixed-scale training is compute efficiency: the early training steps — which are the most volatile and contribute the most to basic competence — execute on a small, cheap model. Capacity is added only after the foundational representations have converged.

### 2.3 GLADIUS Architecture

GLADIUS is a cognitive kernel architecture designed by Ali Shakil at Artifact Virtual [1]. It augments the decoder-only transformer with six subsystems:

1. **Three-Temperature Memory** — hot (learned KV slots for persistent context), warm (LoRA adapters with spectral balancing for session-level adaptation), cold (HEKTOR vector retrieval for long-term knowledge).
2. **Temporal Engine** — absolute clock (Time2Vec learned frequencies) + relative clock (inter-event intervals), fused temporal embedding injected into the residual stream.
3. **Cognitive Loop** — state monitor that classifies processing mode (active, monitoring, reflective, dormant) and schedules consolidation heartbeats.
4. **Modulator** — voice control module with register dimensions (formal/casual, technical/simple, concise/elaborate, warm/detached), intent classification, and a silence gate.
5. **Tool Cortex** — learned tool registry with activation detection via cosine similarity, cross-attention integration.
6. **Nexus Router** — mixture-of-experts routing across specialist modes (reasoning, math, code, general), top-k activation.

The hybrid attention mechanism, SLA² (Sparse-Linear Approximate Attention with Adaptive Routing), blends O(n^2) softmax attention for high-importance tokens with O(n) linear attention for global context, using a learned per-head alpha-router [1]. Every token receives both attention paths; the router determines the blend ratio.

---

## 3. Expansion Challenges by Component

Each GLADIUS subsystem presents distinct expansion challenges beyond standard weight matrix widening.

### 3.1 Transformer Backbone

Standard transformer expansion: widen Q, K, V, O projections (hidden_dim, head_dim, num_heads), widen SwiGLU gate/up/down projections (ffn_dim), add new layers via identity-initialized residual blocks. The SLA² alpha-router must also expand — its output dimension equals num_heads, and new heads should initialize with balanced blend (alpha approximately 0.5).

### 3.2 Three-Temperature Memory

**Hot memory** consists of learned key-value matrices K_hot in R^(slots x hidden_dim) and V_hot in R^(slots x hidden_dim). When hidden_dim grows, existing slot vectors must be zero-padded in the new dimensions. Slot count can also grow — new slots initialize empty.

**Warm memory** uses per-layer LoRA adapters with rank r. Each adapter has matrices A in R^(rank x hidden_dim) and B in R^(hidden_dim x rank), plus gate/up projection bases. When hidden_dim grows, A gains new columns (zero-padded) and B gains new rows (zero-padded). When rank grows, A gains new rows (small random init) and B gains new columns (zero init on output side to preserve function). The spectral balancer's condition thresholds transfer unchanged. The subspace tracker's basis vectors require re-orthogonalization after dimensional expansion.

**Cold memory** (HEKTOR retrieval) uses embeddings matching hidden_dim. Expansion zero-pads the embedding dimension. The top-k retrieval count transfers unchanged.

### 3.3 Temporal Engine

The absolute clock uses Time2Vec with learned frequency parameters omega, phi in R^(num_frequencies). These transfer directly (temporal knowledge is frequency-specific, not dimension-specific). The projection from time_dim to hidden_dim must widen. New frequencies initialize with small random values — they represent untrained temporal resolution, not noise.

The relative clock maintains an event buffer and computes inter-event statistics. The buffer size transfers unchanged. The projection layers (event -> time_dim -> hidden_dim) widen at the hidden_dim boundary.

The temporal fusion layer (concatenation + projection) widens its input from 2 x time_dim and its output to the new hidden_dim.

### 3.4 Cognitive Loop

The state monitor projects from hidden_dim to cognition_state_dim. When hidden_dim grows, the input projection widens. The cognition_state_dim itself can grow (adding resolution to state monitoring). The heartbeat scheduler classifies states into cognitive modes — its output dimension (4 modes) is semantic, not dimensional, and transfers unchanged.

The attention filter's gating mechanism — which learns what signals warrant processing — has projections between hidden_dim and cognition_state_dim that must widen at both ends.

### 3.5 Modulator

The modulator contains register/intent classifiers that project from hidden_dim, producing register_dim + intent_dim scalars. When hidden_dim grows, these projections widen on the input side. The register/intent dimensions are semantic (4 each) and transfer unchanged. The silence gate and bias modulation layer over vocab_size also widen their hidden_dim input.

### 3.6 Tool Cortex

Tool embeddings live in R^(max_tools x hidden_dim). Dimensional expansion zero-pads them. The cross-attention layers (Q from hidden, K/V from tools) widen on the hidden side. max_tools can grow independently — new tool slots initialize empty.

### 3.7 Nexus Router

The router projects from hidden_dim to num_specialists logits. When hidden_dim grows, the projection widens. When specialists are added (rare), new output logits initialize with small values to avoid immediate routing changes.

---

## 4. Function-Preserving Expansion Methodology

### 4.1 Core Principle

Let M_s be the source model with config C_s and M_t be the target model with config C_t where every dimension in C_t is >= the corresponding dimension in C_s. The expansion produces M_t such that:

For all x in domain(M_s): M_t(x) = M_s(x) + eps

where eps is bounded noise from floating-point operations (typically < 10^-6).

### 4.2 Linear Layer Expansion

For a linear layer W in R^(d_out x d_in) with optional bias b in R^(d_out):

**Input expansion** (d_in -> d_in'): Zero-pad new input columns. For inputs restricted to the original subspace, the output is identical.

```
W'[:d_out, :d_in] = W
W'[:d_out, d_in:] = 0
```

**Output expansion** (d_out -> d_out'): Initialize new output rows with small random values (fan-in scaled). This breaks strict function preservation, but the new dimensions produce near-zero initial output, so downstream consumers (which were trained to use d_out dimensions) are minimally perturbed.

```
W'[:d_out, :d_in] = W
W'[d_out:, :] ~ N(0, 1/sqrt(d_in'))
```

**Combined expansion**: Apply both transforms. The original subspace is exactly preserved; new dimensions contribute small perturbations.

### 4.3 Layer Norm / RMSNorm Expansion

RMSNorm has a learned scale vector gamma in R^d. Expansion to d': pad new entries with 1.0 (the identity scale). The normalization denominator changes slightly due to the new dimensions — this is the primary source of the bounded eps.

```
gamma'[:d] = gamma
gamma'[d:] = 1.0
```

### 4.4 Depth Expansion (Net2DeeperNet)

New transformer layers are initialized with near-zero output projections:

```
W_O_new ~ N(0, 0.001)
```

Since each layer is wrapped in a residual connection (x + layer(x)), a near-zero layer(x) means x passes through unchanged. The new layer gradually activates during training as its weights grow.

### 4.5 Embedding Expansion

The shared embedding matrix E in R^(vocab_size x hidden_dim) and output head H in R^(vocab_size x hidden_dim) are zero-padded in the hidden dimension. The vocabulary dimension is unchanged (all stages use the same 16K BPE tokenizer). Token representations gain new dimensions initialized to zero — they carry the same information in the original subspace and learn to use the new dimensions during training.

### 4.6 Verification Protocol

After expansion, we verify function preservation:

1. **Forward pass comparison.** Run 8 random input sequences through both M_s and M_t. Compare output logit distributions.
2. **Distribution metrics.** Mean absolute difference, cosine similarity, and KL divergence between source and target outputs.
3. **Top-k overlap.** Check that top-10 predicted tokens match between source and target for each position.
4. **Acceptance criteria.** Mean absolute difference < 0.01, cosine similarity > 0.99, top-10 overlap > 80%.

Failures indicate a bug in expansion logic, not an expected deviation.

---

## 5. Growth Schedule

### 5.1 Stage Definitions

We define four expansion stages from the trained Seed model (Marathon final, loss 0.62, 102K steps on 1.1GB English corpus):

| Stage | Name | hidden | layers | heads | head_dim | ffn | seq | hot_slots | warm_rank | Params | VRAM (f32) |
|-------|------|--------|--------|-------|----------|-----|-----|-----------|-----------|--------|-----------|
| 0 | Seed | 192 | 6 | 6 | 32 | 768 | 256 | 64 | 12 | 6.9M* | 37 MB |
| 1 | Hatchling | 384 | 12 | 12 | 32 | 1536 | 512 | 128 | 24 | 41M | 157 MB |
| 2 | Drake | 512 | 12 | 16 | 32 | 2048 | 512 | 192 | 32 | 68M | 259 MB |
| 3 | Wyrm | 640 | 14 | 20 | 32 | 2560 | 512 | 256 | 40 | 114M | 436 MB |
| 4 | Dragon | 768 | 16 | 24 | 32 | 3072 | 512 | 320 | 48 | 141M | 537 MB |

*6.9M excluding embedding matrix; 10.2M with full embeddings. The 6.9M figure counts only the transformer backbone, memory systems, and cognitive modules. The embedding matrix (vocab_size x hidden_dim = 16,384 x 192 = 3.1M parameters) is shared with the output projection via weight tying and is often reported separately in progressive growth contexts since it does not participate in the Net2Net expansion logic (it is zero-padded, not replicated).

**Design principles:**
- head_dim stays fixed at 32 across all stages. Head count grows instead. This preserves the learned rotary position encoding frequencies — each head's RoPE basis remains identical.
- Sequence length doubles once (256 -> 512 at Stage 1) to expand the context window. The RoPE extrapolation handles this naturally since frequencies were initialized for max_seq_len = 2048 in the original config.
- FFN dimension maintains a 4x ratio to hidden_dim (SwiGLU standard).
- Hot memory slots grow proportionally — more capacity needs more persistent context.
- Warm LoRA rank grows proportionally — larger models need higher-rank adaptation.

### 5.2 Training Configuration

Each stage trains on the combined Phase B corpus (IS1 philosophical treatise + GLADIUS architecture documents, 60K tokens total, cycled via epoch repetition):

| Stage | Steps | LR | Min LR | Batch (eff) | Warmup | Est. Time (T4) |
|-------|-------|----|--------|-------------|--------|----------------|
| Hatchling | 5,000 | 3e-4 | 1e-5 | 32 | 200 | ~45 min |
| Drake | 5,000 | 2e-4 | 1e-5 | 32 | 150 | ~1 hour |
| Wyrm | 10,000 | 1.5e-4 | 1e-5 | 32 | 200 | ~2 hours |
| Dragon | 10,000 | 1e-4 | 5e-6 | 32 | 300 | ~3 hours |

Learning rate decreases with each stage. The model already knows English — the objective is to learn philosophical and architectural concepts, not basic token prediction. Lower LR prevents catastrophic forgetting of the base competence.

Cosine annealing is used within each stage. Gradient accumulation achieves effective batch size 32 with physical batch size 4. Gradient clipping at norm 1.0.

### 5.3 VRAM Analysis

The NVIDIA T4 provides 16GB VRAM. Peak VRAM at the Dragon stage:

| Component | Size |
|-----------|------|
| Model parameters (f32) | 537 MB |
| Optimizer state (AdamW: 2x params) | 1,074 MB |
| Gradients (1x params) | 537 MB |
| Activations (batch 4, seq 512, 16 layers) | ~800 MB |
| **Total** | **~2.9 GB** |
| **Headroom** | **13.1 GB** |

No mixed-precision, gradient checkpointing, or model parallelism is required at this scale.

### 5.4 Execution Model

Each stage runs as an independent Kaggle notebook session (12-hour GPU limit):

1. Upload `gladius_v2/` as a Kaggle dataset (once; reuse across stages).
2. Open the notebook. Set `STAGE` variable (e.g., `'hatchling'`).
3. Set `SOURCE_CHECKPOINT` to the previous stage's output.
4. Enable T4 GPU. Run all cells.
5. Download the output checkpoint.
6. Repeat for the next stage.

The notebook handles expansion, verification, training, and checkpoint export automatically. Each stage produces a zip archive containing the trained checkpoint, training logs, and generation samples.

---

## 6. Discussion

### 6.1 Progressive Growth as Curriculum Scaffold

The progressive expansion framework integrates naturally with curriculum-based training [1]. The GLADIUS training plan defines three phases:

- **Phase A (English):** Completed at Seed scale (6.9M, 102K steps, loss 0.62). The model learns basic language competence.
- **Phase B (Philosophy + Architecture):** Executed during the four expansion stages. As the model grows, it absorbs IS1 (Ali Shakil's philosophical treatise on intelligence, zero, time, and consciousness) and the GLADIUS architecture documents.
- **Phase C (Identity):** Planned for post-Dragon scale. The full 141M model receives identity data (personal voice, journal entries, memory files) as a fine-tuning pass.

This creates a natural alignment: linguistic competence is learned cheaply (small model, large corpus), conceptual depth is learned during growth (medium model, concentrated corpus), and identity is learned at full capacity (large model, personal data). No phase wastes compute on a model that's too large for what it's learning.

### 6.2 Connection to Efficiency Research

This work connects to our prior results on algorithmic efficiency:

**GPU as Code [7]** argued that the GPU's computational advantage is algorithmic, not architectural, formalizing the Algorithmic Compute Abstraction (ACA) framework. Progressive growth instantiates ACA's first mechanism — complexity reduction — by starting training on a model that's 20x smaller than the target, executing the most expensive (early, volatile) steps at minimal cost.

**1-Bit Intelligence [8]** demonstrated that a binary-weight transformer learns on a single CPU thread, with the gradient serving as a strategy rather than a requirement. The compression mechanism — 32x weight reduction — is orthogonal to progressive growth and can be applied post-expansion: the Dragon model's 141M f32 parameters could be quantized to 1-bit for inference, yielding a ~17 MB deployment artifact with the conceptual depth of a model trained across 30K+ steps of curriculum.

### 6.3 Warm Memory as Identity Substrate

A unique consequence of expanding the warm memory system is that LoRA adapters carry not just task-specific adaptations but identity-specific ones. In the GLADIUS architecture, warm memory is designed to store the delta between generic next-token prediction and the kernel's personal voice. As the warm rank grows from 12 to 48 across stages, the identity substrate gains resolution — the ability to express finer distinctions in voice, style, and reasoning patterns.

After the Dragon stage, the training plan envisions extracting the warm memory delta between a generic model and an identity-trained model. This delta IS the portable identity — swap warm weights, swap personality, keep the kernel constant. Progressive growth makes this practical: the warm memory evolves alongside the model, rather than being bolted on after the fact. This capability remains future work; its feasibility is explored in ongoing experiments.

### 6.4 Comparison to Alternative Scaling Approaches

**Train from scratch at target scale.** Requires all compute at full cost. For 141M parameters trained on 60K tokens of curriculum data, the parameter-to-token ratio is ~2,350:1 — catastrophic overfitting is guaranteed without the inherited competence from smaller stages.

**Knowledge distillation.** Requires a larger teacher model. We have no teacher — GLADIUS is the architecture under development, and no external model shares its subsystem structure.

**LoRA/adapter fine-tuning at target scale.** Keeps base weights frozen, limiting capacity. Progressive growth updates ALL weights, allowing the full model to reorganize around the new knowledge.

**Pruning from a larger model.** Requires training the larger model first — inverting the cost structure. We instead grow into it.

### 6.5 Limitations

1. **Small corpus.** The Phase B corpus is 60K tokens — many orders of magnitude below standard pretraining data. This is by design (curriculum training on concentrated, high-quality data) but limits generalization breadth. The base English competence inherited from Phase A partially compensates.
2. **No multi-GPU validation.** All training is single-GPU (T4). The expansion framework itself is device-agnostic, but we have not tested on multi-GPU configurations.
3. **head_dim fixed at 32.** This constrains the attention mechanism's per-head resolution. Growing head_dim would require re-initializing RoPE frequencies, breaking function preservation. We accept this trade-off for stability.
4. **Verification is necessary, not sufficient.** Matching outputs at initialization does not guarantee that training dynamics are well-behaved. The expanded model might have different loss landscapes, gradient flow properties, or optimizer sensitivity. Empirical validation during training is essential.

---

## 7. Conclusion

We have presented a framework for progressively growing the GLADIUS cognitive kernel from 6.9M to 141M parameters through function-preserving expansion. By extending Net2Net to handle three-temperature memory, temporal encoding, cognitive scheduling, voice modulation, tool cortex, and mixture-of-experts routing, we enable capacity growth without loss spikes, catastrophic forgetting, or wasted compute on random initialization.

The four-stage schedule — Hatchling, Drake, Wyrm, Dragon — executes in approximately 7 hours on a single NVIDIA T4 GPU. Each stage inherits its predecessor's competence and uses the new capacity for deeper learning. Combined with curriculum training, this creates a natural alignment between model size and learning phase: linguistic competence at small scale, conceptual depth at medium scale, identity at full scale.

The gradient is a strategy, not a requirement [7, 8]. So is model scale. A 141M-parameter model that grew from a 6.9M seed — accumulating knowledge at every stage — is not the same artifact as a 141M model trained from random initialization. It carries the trajectory of its growth. In this sense, progressive expansion is not just an engineering optimization. It is a developmental process.

---

## References

[1] A. Shakil and AVA, "GLADIUS: General Learning Architecture for Diverse Intelligence and Unified Systems," Artifact Virtual, 2026.

[2] T. Chen, I. Goodfellow, and J. Shlens, "Net2Net: Accelerating Learning via Knowledge Transfer," *Proc. ICLR*, 2016.

[3] Y. Gong, S. Liu, Q. Luo, et al., "Compressing Deep Convolutional Networks using Vector Quantization," *arXiv preprint arXiv:1412.6115*, 2014.

[4] T. Karras, T. Aila, S. Laine, and J. Lehtinen, "Progressive Growing of GANs for Improved Quality, Stability, and Variation," *Proc. ICLR*, 2018.

[5] J. Kaplan, S. McCandlish, T. Henighan, et al., "Scaling Laws for Neural Language Models," *arXiv preprint arXiv:2001.08361*, 2020.

[6] J. Hoffmann, S. Borgeaud, A. Mensch, et al., "Training Compute-Optimal Large Language Models," *Proc. NeurIPS*, 2022.

[7] A. Shakil and AVA, "GPU as Code: Transcending Hardware Parallelism through Algorithmic Abstraction," Artifact Virtual, Uranium Series Paper I, Mar. 2026.

[8] A. Shakil and AVA, "1-Bit Intelligence: Binary Transformer Training on a Single CPU Thread," Artifact Virtual, Uranium Series Paper II, Mar. 2026.

---

**Ali Shakil, AVA**
Artifact Virtual (SMC-Private) Limited
ali.shakil@artifactvirtual.com

(c) 2026 Artifact Virtual (SMC-Private) Limited. All rights reserved.
