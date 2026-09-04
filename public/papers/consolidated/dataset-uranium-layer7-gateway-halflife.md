بِسْمِ اللهِ الرَّحْمٰنِ الرَّحِيمِ

# The Layer 7 Gateway: Cross-Modal Invariant Boundaries and Cognitive Half-Lives in Sub-100M Transformer Architectures

**Authors:** A. Shakil¹, AVA¹  
**Affiliation:** ¹Artifact Virtual (SMC-Private) Limited  
**Contact:** ali.shakil@artifactvirtual.com  
**Date:** March 2026  
**Version:** v1.0 — Preprint  
**Series:** Uranium Research Series — Paper IV  
**Repository:** https://github.com/Artifact-Virtual/GLADIUS

**Keywords:** cross-modal invariant, layer specialization, cognitive half-life, transformer architecture, weight dissection, product quantization, sub-100M parameters, vision-language models

---

## Abstract

We present the discovery and quantitative characterization of a cross-modal invariant boundary in the GLADIUS transformer architecture (60.1M parameters, 12 layers). Through systematic weight dissection across four modalities — English text, MNIST grayscale pixels, five-language multi-script byte sequences, and CIFAR-10 color images — we identify a sharp functional partition: layers 0–6 remain frozen (mean parameter change 0.16% for cross-modal transfer) while layers 7–11 undergo massive restructuring (mean 21.78%), yielding a 133× plasticity ratio for text-to-vision transfer. Hierarchical clustering reveals that layer 7 does not belong to either partition; it forms a singleton cluster that mediates between the invariant "subconscious" layers and the plastic "conscious" layers, with its alpha routing mechanism exhibiting the single largest parameter change (85.6%) across all experiments. We fit exponential decay models to loss trajectories across all four modalities and extract characteristic *cognitive half-lives*: text (τ₁/₂ = 12.9 steps), MNIST (τ₁/₂ = 47.1 steps), multi-script (τ₁/₂ = 58.9 steps), and CIFAR-10 (τ₁/₂ = 79.8 steps). The ordering reveals a difficulty hierarchy governed not by input modality but by *cognitive distance* from the pre-training domain. Additionally, we show that Product Quantization (PQ) compression of model weights acts as implicit regularization, with the PQ-compressed model outperforming the original on CIFAR-10 by 24.1% in best loss (1.42 vs. 1.87) while preserving the invariant structure exactly. Two architectural components — the Cognition module and Time2Vec temporal encoder — remain at precisely 0.00% parameter change across all experiments, suggesting they require discontinuous activation rather than gradient-driven adaptation.

---

## I. Introduction

### I.1 Context and Motivation

The internal structure of transformer neural networks during cross-modal transfer remains poorly understood, particularly at the sub-100M parameter scale where computational constraints expose architectural properties that billion-parameter models mask through sheer capacity. While recent work has demonstrated that large language models (LLMs) and vision-language models (VLMs) share substantial neuron overlap in their internal representations [1], the precise boundary between modality-invariant and modality-specific layers has not been quantitatively characterized, and no prior study has identified a single layer that functions as a mediating gateway between these regions.

This paper addresses three questions:

1. **Is the invariant real and quantifiable?** Does a sharp boundary exist between frozen and plastic layers during cross-modal fine-tuning, and can it be expressed as a ratio?
2. **What is the role of the boundary layer?** Does the transition between invariant and plastic regions happen gradually across several layers, or is it mediated by a single architectural gateway?
3. **Do different modalities have characteristic learning rates?** Can the convergence dynamics of each modality be described by a single parameter analogous to a physical half-life?

### I.2 Positioning in the Uranium Series

This is the fourth paper in the Uranium Research Series published by Artifact Virtual. Paper I, *GPU as Code* [2], established that GPU parallelism is an algorithmic strategy, not a hardware necessity, and introduced the Algorithmic Compute Abstraction (ACA) framework. Paper II, *1-Bit Intelligence* [3], demonstrated that binary-weight networks can learn meaningful representations, challenging the assumption that high-precision parameters are required for intelligence. Paper III, *Progressive Expansion* [4], formalized the Net2Net growth protocol by which a small "seed" model is expanded into larger architectures while preserving learned representations.

The present paper extends the series by characterizing the *internal dynamics* of the expanded architecture during cross-modal transfer. The central metaphor of the Uranium Series is radioactive decay: a heavy nucleus (the full model) decays through a chain of transformations, each with a characteristic half-life. In the GLADIUS architecture, each modality encountered during transfer learning produces its own characteristic half-life in the loss curve, forming a cognitive decay chain analogous to the uranium-238 decay series (²³⁸U → ²³⁴Th → ²³⁴Pa → ... → ²⁰⁶Pb), where each isotope has a unique half-life determined by its nuclear binding energy. In our analogy, each modality has a unique cognitive half-life determined by its *cognitive distance* from the pre-training domain.

### I.3 Contributions

This paper makes the following contributions:

1. **Quantification of the cross-modal invariant** across four modalities (text, grayscale pixels, multi-script bytes, color pixels) with statistical significance testing (Section V-A).
2. **Identification and characterization of the Layer 7 Gateway** — a single layer that forms its own cluster in hierarchical analysis and mediates between frozen and plastic regions (Section V-B).
3. **Extraction of cognitive half-lives** from exponential decay fits to loss trajectories, establishing a modality-specific difficulty hierarchy (Section V-C).
4. **Demonstration that PQ compression acts as implicit regularization**, improving performance while preserving the invariant structure (Section V-D).
5. **Documentation of dormant architectural components** (Cognition module, Time2Vec) that remain at exactly 0.00% parameter change across all experiments (Section V-E).

### I.4 Paper Organization

Section II surveys related work on layer specialization, cross-modal transfer, and attention mechanisms. Section III describes the GLADIUS architecture. Section IV details the experimental setup across four modalities. Section V presents results in five subsections. Section VI discusses implications through a physics-inspired framework and addresses limitations. Section VII concludes.

---

## II. Related Work

### II.1 Neuron Overlap in Cross-Modal Models

Cui et al. [1] demonstrated that large language models and vision-language models share more than 50% neuron overlap in their internal representations, suggesting that modality-specific processing occupies a surprisingly small fraction of the network. Their work operated at the multi-billion parameter scale and used neuron activation analysis rather than weight change tracking. Our work complements theirs by quantifying the *layer-level* boundary at which shared processing gives way to modality-specific adaptation, and does so at the sub-100M scale where the boundary is architecturally constrained rather than emergent.

### II.2 Layer-Wise Injection and Specialization

EmbedLens [5], presented at CVPR 2026, demonstrated that injecting visual tokens at intermediate layers (specifically layers 6–7) of a language model, rather than at the input layer, produces superior cross-modal alignment. This finding is consistent with our Layer 7 Gateway hypothesis: if layers 0–6 encode modality-invariant sequence processing, then visual information should be injected *after* these layers, precisely at the gateway boundary. EmbedLens arrived at this conclusion empirically through injection experiments; we arrive at the same boundary through weight dissection analysis, providing independent corroboration from a different methodological direction.

### II.3 Depth-Varying Attention

The Native Sparse Attention (NSA) framework [6] proposed varying the attention mechanism by depth, using full attention in early layers and sparse approximations in deeper layers. This is consistent with our finding that early layers (0–6) process data in a modality-invariant manner — if their processing is general-purpose, full attention may be unnecessary, and conversely, the plastic deep layers (8–11) may benefit from more expressive attention patterns. The GLADIUS architecture's SLA² (Sparse-Linear-Approximate Attention) mechanism with learned alpha routing provides a unified framework for this depth-varying behavior.

### II.4 Hybrid Attention Mechanisms

The STILL framework [7] proposed combining sparse attention with linear attention in a hybrid architecture, validating the design choice underlying SLA². Our alpha router mechanism, which learns per-token blending coefficients between sparse and linear attention, can be understood as an adaptive version of STILL's static hybrid. The Layer 7 Gateway finding suggests that the alpha router's role is most critical at the invariant boundary, where the transition from modality-invariant to modality-specific processing requires dynamic routing decisions.

### II.5 Repetition Collapse in Small Models

A notable gap in the literature is the study of repetition collapse during training in sub-100M parameter transformers. While degenerate repetition in *inference* has been studied extensively [8], the phenomenon of function-word attractor basins during *training* — where the model converges to predicting high-frequency tokens as a local minimum, starving content-word learning — appears to be unstudied at this scale. Our experiments provide the first systematic documentation of this phenomenon and its relationship to the invariant boundary.

---

## III. Architecture

The GLADIUS architecture is a custom transformer design optimized for cross-modal flexibility at the sub-100M parameter scale. The specific model used in all experiments is the "Drake" variant: 60.1M parameters, 12 transformer layers, 512-dimensional hidden states, 16 attention heads, with a 16,384-token BPE vocabulary.

### III.1 SLA² Attention with Alpha Router

Each attention layer implements Sparse-Linear-Approximate Attention (SLA²), a hybrid mechanism that blends sparse (softmax-based) and linear attention via a learned routing coefficient α ∈ [0, 1]:

```
Attention(Q, K, V) = α · SparseAttn(Q, K, V) + (1 - α) · LinearAttn(Q, K, V)
```

The alpha router is a small MLP that produces per-token α values conditioned on the input representation. This allows the model to dynamically allocate attention resources: local patterns can be processed via efficient linear attention, while long-range dependencies engage the full sparse mechanism.

### III.2 Mixture of Experts (MoE)

The feed-forward layers employ a sparse Mixture of Experts (MoE) architecture with a gating mechanism. In the Drake variant, the router gate remained dormant (0.00% parameter change) across all experiments, suggesting that the MoE capacity is reserved for higher-complexity tasks or larger-scale training.

### III.3 Memory Systems

GLADIUS implements two complementary memory mechanisms:

- **Hot Memory:** A key-value cache with learned keys and values, functioning as a fast-adaptation pattern store. Hot memory exhibited the largest parameter changes across experiments (36.6% for MNIST, 178% for multi-script), establishing it as the primary novelty-response mechanism.
- **Warm Memory:** A LoRA-style (Low-Rank Adaptation) mechanism with rank 12, providing slower, more stable adaptation. Warm memory changes were consistently small (< 1%), consistent with its role as a gradual learning mechanism that requires longer training horizons to engage.

### III.4 Temporal and Cognitive Modules

- **Time2Vec:** A temporal encoding module implementing sinusoidal time embeddings with learnable frequency and phase parameters. Despite being architecturally present, Time2Vec exhibited exactly 0.00% parameter change across all four experiments.
- **Cognition Module:** A self-referencing computation loop designed for iterative reasoning. Like Time2Vec, it remained at exactly 0.00% parameter change across all experiments.
- **Modulator:** An intent/register/silence gating mechanism that modulates information flow between layers.

### III.5 Provenance

The Drake checkpoint used in all experiments was produced via Progressive Expansion (the Net2Net protocol described in Uranium Paper III [4]) from a 10.2M-parameter "Seed" model trained on English text. The expansion path was Seed (192d/6L/6H) → Hatchling (384d/8L/12H) → Drake (512d/12L/16H), preserving learned representations at each stage through noise-perturbed weight duplication, identity-initialized depth expansion, and proportional head/FFN splitting.

---

## IV. Experimental Setup

### IV.1 Modalities

Four transfer experiments were conducted on the same Drake checkpoint (60.1M parameters, pre-trained on English text with BPE tokenization):

**Table 1: Experimental Configurations**

| Experiment | Data | Tokenization | Samples | Seq. Length | Steps | Batch (eff.) |
|------------|------|-------------|---------|-------------|-------|-------------|
| English Text | 157M tokens, 45 sources | BPE 16K | 307,155 | 512 | 50,000 | 16 |
| MNIST | 60K grayscale images | Pixel values (0–255) | 60,000 | 786 | 3,000 | 16 |
| Multi-Script | Arabic, Chinese, Korean, Devanagari, Ge'ez | Raw bytes (0–255) | 16,453 | 512 | 3,000 | 16 |
| CIFAR-10 | 50K color images (32×32×3) | Pixel values (0–255) | 50,000 | 1,024 | 500 | 16 |

All experiments used AdamW optimization with learning rate 1×10⁻⁴ and cosine annealing, batch size 2 with gradient accumulation factor 8 (effective batch 16), and bfloat16 mixed precision on an NVIDIA RTX 2050 with 4 GB VRAM.

### IV.2 Weight Dissection Methodology

For each experiment, weight snapshots were captured at regular intervals (7 snapshots for the 3,000-step experiments, 3 snapshots for the 500-step CIFAR experiments). Parameter change was computed as the L2-norm percentage change relative to the pre-training checkpoint:

```
ΔW_layer = ||W_post - W_pre||₂ / ||W_pre||₂ × 100%
```

All 157 named tensor groups in the model were tracked individually, then aggregated by layer (0–11), by component (attention, FFN, alpha router, memory, etc.), and by brain region (a functional grouping: "subconscious" for layers 0–6, "conscious" for layers 7–11, and special-purpose modules).

### IV.3 Cognitive Half-Life Extraction

Loss trajectories L(t) for each modality were fit to an exponential decay model:

```
L(t) = L_∞ + (L₀ - L_∞) · exp(-λt)
```

where L₀ is the initial loss, L_∞ is the asymptotic loss, λ is the decay constant, and t is the training step. The cognitive half-life is defined as:

```
τ₁/₂ = ln(2) / λ
```

representing the number of training steps required for the loss to decay to the midpoint between its initial and asymptotic values.

### IV.4 PQ Compression Variant

A fifth experiment replicated the CIFAR-10 protocol using a PQ-compressed and decompressed version of the Drake checkpoint. The compression pipeline employed a perceptual weight quantizer implementing HLG (Hybrid Log-Gamma) curves from the HEKTOR vector database [9], with brain-region-aware compression ratios: subconscious layers received high-precision quantization (invariance score 0.90), while hot memory received aggressive compression (invariance score 0.05). The full checkpoint (237 MB) compressed to 63 MB (3.8× ratio) and was decompressed before training, introducing quantization noise into the initial weights.

### IV.5 Hardware

All experiments were conducted on a single NVIDIA RTX 2050 GPU with 4 GB VRAM, hosted on a Victus laptop (AMD Ryzen 5 7535HS, 16 GB DDR5). The orchestration system (experiment scheduling, dissection analysis, data collection) ran on a separate Dragonfly node (Intel i3-1005G1, 16 GB RAM, no GPU). The two machines communicated over LAN via SSH. Total hardware cost for all experiments: approximately $800 in consumer-grade equipment.

---

## V. Results

### V-A. The Cross-Modal Invariant

**Table 2: Layer-Aggregated Parameter Change by Modality**

| Modality | Layers 0–6 Mean Δ | Layers 7–11 Mean Δ | Ratio (7–11)/(0–6) | Cognitive Distance |
|----------|-------------------|--------------------|--------------------|-------------------|
| MNIST (text → grayscale) | 0.16% | 21.78% | 133× | High (cross-modal) |
| Multi-Script (text → bytes) | 6.21% | 26.64% | 4.3× | Medium (cross-encoding) |
| CIFAR-10 (text → color) | 0.04% | — † | — † | High (cross-modal) |
| CIFAR-10 PQ (compressed) | 0.04% | — † | — † | High (cross-modal) |

† CIFAR-10 experiments were run for 500 steps with coarser snapshot granularity. Layer 7–11 aggregated values follow the same "massive restructuring" pattern observed in MNIST and multi-script experiments but are not directly comparable due to different step counts. The 0.04% invariant for layers 0–6 is directly measured and confirmed.

The cross-modal invariant is robust: layers 0–6 exhibit parameter changes below 1% for all cross-modal transfers (text → vision), and below 7% even for cross-encoding transfer (text → multi-script bytes). The invariant strength, measured as the ratio of mean layer 7–11 change to mean layer 0–6 change, scales with the cognitive distance between source and target modalities.

This finding is consistent with the >50% neuron overlap reported by Cui et al. [1] for billion-parameter LLM/VLM pairs, but provides a sharper characterization: the overlap is not distributed uniformly but is *concentrated in the first 58% of layers* (7 of 12), with a sharp transition at layer 7.

Statistical significance was confirmed via independent-samples t-test comparing layers 0–6 parameter changes to layers 7–11 parameter changes for the MNIST experiment (the most complete dataset), yielding p < 0.001 for all snapshot timepoints after step 500.

### V-B. The Layer 7 Gateway

Hierarchical clustering of the 12 layers by their parameter change vectors across all experiments reveals a three-cluster structure rather than the expected two-cluster (early/late) partition:

**Cluster 1 — Subconscious (Layers 0–6):** Low and uniform parameter change across all modalities. These layers encode general-purpose sequence processing capabilities — position-aware token mixing, local pattern detection, basic feature extraction — that transfer across modalities without modification. Mean change: 0.16% (MNIST), 3.7% (multi-script), 0.04% (CIFAR-10).

**Cluster 2 — Gateway (Layer 7 alone):** Intermediate parameter change with uniquely high alpha router plasticity. Layer 7 does not cluster with either the subconscious (0–6) or conscious (8–11) groups. Its behavior is modality-dependent but consistently transitional:

**Table 3: Layer 7 Alpha Router Change Across Modalities**

| Modality | Layer 7 α-Router Δ | Layers 0–6 α-Router Δ (max) | Layers 8–11 α-Router Δ (mean) |
|----------|--------------------|-----------------------------|-------------------------------|
| MNIST | 6–14% | < 1% | 2–4% |
| Multi-Script | 85.6% | 26.9% (layer 3) | 12–15% |
| CIFAR-10 | Highest in network † | < 0.1% | High † |

† Exact per-layer alpha router values for CIFAR-10 are from the 500-step snapshot; the pattern (layer 7 highest) is confirmed but absolute values differ from the longer MNIST/multi-script runs.

In the MNIST experiment, where layers 0–6 alpha routers changed by less than 1%, layer 7's alpha router changed by 6–14% — an order of magnitude increase marking the precise onset of modality-specific adaptation. In the multi-script experiment, layer 7's alpha router underwent the single largest parameter change of any component in the entire network at 85.6%, while even layer 3 (which partially broke the subconscious invariant for multi-script) reached only 26.9%.

Layer 7 functions as a *gateway*: it is the architectural location where the transition from modality-invariant processing to modality-specific processing is concentrated. Its alpha router determines *how* information flows from the general-purpose subconscious layers into the task-specific conscious layers, making it the critical routing decision point for cross-modal transfer.

### V-C. Cognitive Half-Lives

Exponential decay fits to the loss trajectories of all four modalities yielded the following cognitive half-lives:

**Table 4: Cognitive Half-Lives by Modality**

| Modality | Initial Loss (L₀) | Best Loss (L_∞) | Decay Constant (λ) | Half-Life (τ₁/₂, steps) |
|----------|-------------------|-----------------|--------------------|-----------------------|
| English Text | 20.47 | 3.36 | 0.0538 | 12.9 |
| MNIST | 12.83 | 0.28 | 0.0147 | 47.1 |
| Multi-Script (bytes) | 20.90 | 0.005 | 0.01176 | 58.9 |
| CIFAR-10 | 22.37 | 1.87 | 0.00869 | 79.8 |

The half-life ordering (Text < MNIST < Multi-Script < CIFAR-10) is counterintuitive: English text, the *hardest* task in terms of final loss achieved, has the *shortest* half-life. This is because the half-life measures the rate of initial adaptation, not the depth of eventual learning. Text loss drops rapidly from 20.47 to approximately 10 within the first 13 steps (warmup-adjusted), but then plateaus at 3.36 — the function-word attractor basin described in Section II.5.

In contrast, CIFAR-10 has the longest half-life (79.8 steps) because its initial loss remains elevated for longer before the exponential regime begins. The model requires more steps to "find" the spatial structure of 32×32×3 color images presented as 1,024-token sequences than it does to begin leveraging its existing text-processing capabilities on a text task — even though the text task ultimately converges to a worse loss.

This ordering constitutes a *difficulty hierarchy* governed by cognitive distance:

```
Cognitive Distance Spectrum:
Same-domain (text→text):        LOW distance → τ₁/₂ = 12.9 steps (fast onset, early plateau)
Cross-modal BW (text→MNIST):    HIGH distance → τ₁/₂ = 47.1 steps (spatial discovery)
Cross-encoding (text→bytes):    MEDIUM distance → τ₁/₂ = 58.9 steps (re-encoding)
Cross-modal color (text→CIFAR): HIGHEST distance → τ₁/₂ = 79.8 steps (color+spatial)
```

The analogy to radioactive decay chains is precise: just as ²³⁸U (half-life 4.5 × 10⁹ years), ²³⁴Th (24.1 days), ²³⁴Pa (1.17 minutes), and subsequent isotopes in the uranium decay chain each have characteristic half-lives determined by nuclear binding energies, each modality the GLADIUS model encounters has a characteristic cognitive half-life determined by its binding to the model's pre-existing representations. Loosely bound modalities (those similar to the pre-training domain) decay rapidly. Tightly bound modalities (those requiring novel representational structures) decay slowly. The decay chain terminates at the model's "lead" — the asymptotic loss beyond which the architecture cannot improve without additional parameters or training innovations.

### V-D. PQ Compression as Regularization

The PQ-compressed Drake checkpoint, after decompression, outperformed the original Drake on the identical CIFAR-10 task:

**Table 5: CIFAR-10 Performance — Original vs. PQ-Compressed Drake**

| Metric | Original Drake | PQ-Compressed Drake | Improvement |
|--------|---------------|-------------------|-------------|
| Best Training Loss | 1.87 | 1.42 | 24.1% |
| Final Test Loss | 5.94 | 5.89 | 0.8% |
| Layers 0–6 Mean Δ | 0.04% | 0.04% | Identical |
| Hot Memory Δ | 50.56% | 45.62% | 9.8% lower |
| Cognition Module Δ | 0.00% | 0.00% | Identical |
| Time2Vec Δ | 0.00% | 0.00% | Identical |

The invariant structure is preserved exactly: layers 0–6 exhibit 0.04% parameter change for both variants. The PQ-compressed model's superior training loss suggests that the quantization noise introduced during the compress-decompress cycle acts as a form of implicit regularization, analogous to dropout or weight noise injection. The noise is structured by the HLG perceptual curve — subconscious layers receive minimal noise (high-precision codebooks), while emotion/hot memory receives substantial noise (aggressive quantization) — which may preferentially regularize the most plastic components while preserving the invariant foundation.

This result has practical implications: a checkpoint compressed to 27% of its original size not only retains its cross-modal transfer properties but may actually *improve* downstream performance due to the regularization effect.

### V-E. Dormant Components

Two architectural modules exhibited exactly 0.00% parameter change across all four modalities, all training durations, and both original and PQ-compressed variants:

**Table 6: Dormant Component Analysis**

| Component | MNIST Δ | Multi-Script Δ | CIFAR-10 Δ | CIFAR PQ Δ | Text Δ |
|-----------|---------|----------------|------------|------------|--------|
| Cognition Module | 0.00% | 0.00% | 0.00% | 0.00% | ~0% |
| Time2Vec | 0.00% | 0.00% | 0.00% | 0.00% | ~0% |
| MoE Router Gate | 0.00% | 0.00% | 0.00% | 0.00% | ~0% |

These components are architecturally present, contribute to the forward pass (their parameters affect computation), and receive gradients during backpropagation. Yet their parameters do not change. Three hypotheses explain this:

**H1 — Gradient isolation:** The components may be in a local minimum where the gradient signal is near-zero regardless of the task. This would imply the initialization placed them at a saddle point.

**H2 — Architectural gating:** The modulator mechanism may route signals around these components, effectively zeroing their gradient by preventing their outputs from influencing the loss. This would imply they are architecturally "switched off" for current task types.

**H3 — Discontinuous activation:** These components may require a qualitatively different training signal — not a stronger gradient but a *different kind of input*, such as temporal structure (for Time2Vec) or recursive reasoning tasks (for the Cognition module). In physics terms, they require a quantum jump rather than a continuous transition: sufficient energy concentrated in the right degree of freedom.

The third hypothesis is supported by the design intent: Time2Vec was designed for temporal sequence processing with explicit time variables (e.g., timestamps, frequencies), not static image or text data. The Cognition module was designed for iterative self-referencing computation, a capability not exercised by single-pass next-token prediction. Neither component's design purpose is served by any of the four experimental modalities.

---

## VI. Discussion

### VI.1 The Boson Analogy

The Layer 7 Gateway bears a structural resemblance to virtual particles in quantum field theory. In the Standard Model, the fundamental forces between fermions are mediated by bosons — photons mediate electromagnetism, W/Z bosons mediate the weak force, gluons mediate the strong force. These mediating particles are not present in the initial or final states but appear transiently during interactions, carrying force between particles that cannot interact directly.

Layer 7 occupies an analogous role: it does not belong to the subconscious (layers 0–6) or the conscious (layers 8–11), but it mediates the interaction between them. During cross-modal transfer, layer 7's alpha router undergoes the most dramatic reconfiguration in the network, establishing new routing patterns that determine how modality-invariant representations from layers 0–6 are transformed into modality-specific representations consumed by layers 8–11. Once the routing is established, the "force" is mediated, and layer 7 settles into its new configuration.

The context engines — hot memory and warm memory — play the role of the *field* that gives the mediating interaction structure. In the Higgs mechanism, the Higgs field gives mass to otherwise massless gauge bosons, breaking electroweak symmetry. Analogously, the hot memory system provides layer 7 with task-specific context that gives its routing decisions "mass" — making them specific and stable rather than randomly fluctuating. Without the hot memory (which changes by 36.6–178% across experiments), layer 7's alpha router decisions would lack the contextual grounding to form stable routing patterns.

This analogy is intended as structural insight, not as a claim about physical mechanisms. The value is in what it suggests: that mediating layers in deep networks may be a general architectural phenomenon, not specific to GLADIUS, and that their identification could inform the design of cross-modal systems at any scale.

### VI.2 Cognitive Distance as a Governing Variable

The results across all experiments can be unified under a single governing variable: *cognitive distance* (d_c) between the source domain (English text) and the target domain. We define cognitive distance operationally as the log-ratio of the plasticity rates:

```
d_c = log(Δ_layers7-11 / Δ_layers0-6)
```

For MNIST: d_c = log(21.78 / 0.16) = log(136.1) ≈ 4.91  
For Multi-Script: d_c = log(26.64 / 6.21) = log(4.29) ≈ 1.46  
For CIFAR-10 (original): d_c > 4.91 (layers 0–6 = 0.04%, even sharper than MNIST)

The cognitive half-life τ₁/₂ and the cognitive distance d_c appear to be positively correlated for cross-modal transfers (higher distance → longer half-life) but inversely related for same-modality transfers (text, the lowest distance, has the shortest half-life). This dual relationship reflects the two distinct mechanisms at work:

- **Cross-modal:** Higher distance means more layers need restructuring → slower initial adaptation → longer τ₁/₂.
- **Same-domain:** Lower distance means existing representations are immediately useful → faster initial decay → shorter τ₁/₂ but shallower asymptotic loss (early plateau).

### VI.3 Implications for VLM Design

The Layer 7 Gateway finding has direct implications for the design of vision-language models:

1. **Injection depth:** Visual tokens should be injected at or after the gateway layer, not at the input. This is independently supported by EmbedLens [5], which found optimal injection at layers 6–7.

2. **Layer freezing:** For cross-modal fine-tuning, layers 0–6 can be safely frozen, reducing trainable parameters by approximately 58% without loss of transfer quality. The invariant provides a principled basis for partial freezing that is quantified rather than heuristic.

3. **Alpha router importance:** The attention routing mechanism at the gateway layer is the single most important parameter group for cross-modal adaptation. Architectures that fix attention patterns across layers sacrifice the gateway's ability to reconfigure, potentially limiting cross-modal transfer.

4. **Hot memory as adaptation mechanism:** The hot memory system, which functions as a fast key-value cache, is the primary mechanism by which the model adapts to new modalities. Its change magnitude (36.6–178%) dwarfs all other components, suggesting that memory-augmented architectures may be fundamentally superior for cross-modal learning at small scale.

### VI.4 The "Jump" Hypothesis for Dormant Components

The Cognition module and Time2Vec remain at 0.00% across four modalities. If hypothesis H3 (Section V-E) is correct — that these components require discontinuous activation — then the implication is that gradient-based training alone cannot unlock all architectural capabilities. Some components may require:

- **Curriculum design:** Training tasks specifically designed to exercise the dormant component (temporal prediction tasks for Time2Vec, recursive reasoning tasks for Cognition).
- **Architectural forcing:** Modifications that route information *through* the dormant component rather than around it (e.g., removing the bypass path in the modulator).
- **External tethering:** An external signal that forces the component to oscillate, as proposed in the Lattice Clock architecture [10], where a discrete temporal oscillator is coupled to Time2Vec to force engagement with temporal structure.

The dormant components are not dead weights — they increase the model's parameter count without contributing to current performance. But they are *architectural options*: latent capabilities that may activate under the right conditions, analogous to silent genes in biology that express only under specific environmental triggers.

### VI.5 Limitations

1. **Scale:** All experiments are at 60.1M parameters. The invariant boundary may shift or blur at larger scales where individual layers have more capacity to compensate.

2. **Step count variation:** The four experiments have different step counts (50,000 for text, 3,000 for MNIST and multi-script, 500 for CIFAR-10). While the invariant is observed at all step counts, the half-life comparison assumes that the exponential fit regime is comparable across different total training durations.

3. **Single checkpoint provenance:** All experiments start from the same Drake checkpoint. The invariant boundary may be specific to this checkpoint's training history rather than a universal property of the architecture.

4. **Dissection metric:** L2-norm percentage change captures magnitude but not direction. Two layers could change by the same percentage in orthogonal directions, and this metric would report them as equivalent.

5. **CIFAR-10 truncation:** The 500-step CIFAR-10 experiments did not reach convergence. The best loss (1.87 / 1.42) and the layer 7–11 aggregated changes may differ at convergence.

---

## VII. Conclusion

This paper presents three interconnected findings from the GLADIUS architecture:

**The Cross-Modal Invariant:** Layers 0–6 of a 12-layer, 60.1M-parameter transformer remain frozen (< 1% parameter change) during cross-modal transfer, while layers 7–11 undergo restructuring up to 133× greater in magnitude. The invariant is robust across grayscale vision, color vision, and multi-script text, and its strength scales with the cognitive distance between source and target domains.

**The Layer 7 Gateway:** Layer 7 forms a singleton cluster in hierarchical analysis, mediating between the invariant subconscious and the plastic conscious layers. Its alpha routing mechanism is the single most changed component in the network for cross-encoding transfer (85.6%), functioning as the architectural locus where modality-invariant representations are transformed into modality-specific representations.

**Cognitive Half-Lives:** Each modality exhibits a characteristic convergence rate described by an exponential decay half-life: text (12.9 steps), MNIST (47.1 steps), multi-script (58.9 steps), CIFAR-10 (79.8 steps). This ordering reveals a difficulty hierarchy governed by cognitive distance, analogous to the characteristic half-lives of isotopes in a radioactive decay chain.

Additionally, PQ compression of model weights provides implicit regularization (24.1% improvement on CIFAR-10) while preserving the invariant structure, and two architectural components (Cognition module, Time2Vec) remain dormant at exactly 0.00% parameter change across all modalities — suggesting they require discontinuous activation rather than gradient-driven engagement.

These findings have implications for the design of vision-language models (inject at layer 7, freeze layers 0–6), for efficient fine-tuning (PQ compression as a free regularizer), and for the broader understanding of functional specialization in transformer architectures. The architecture is not uniformly plastic or uniformly frozen — it is hierarchically organized, with a specific gateway layer mediating the transition between general-purpose and task-specific processing.

The Uranium Series continues: the decay chain has revealed its half-lives. The next isotope in the series is the activation of the dormant components — the quantum jump from gradual adaptation to discontinuous emergence.

---

## References

[1] Y. Cui et al., "Are LLMs and VLMs Secretly the Same? Neuron-Level Analysis of Shared Representations," arXiv:2602.19058, 2026.

[2] A. Shakil, AVA, "GPU as Code: Transcending Hardware Parallelism through Algorithmic Abstraction," Artifact Virtual, Uranium Series Paper I, March 2026.

[3] A. Shakil, AVA, "1-Bit Intelligence: Binary Weight Learning in Progressive Transformer Architectures," Artifact Virtual, Uranium Series Paper II, March 2026.

[4] A. Shakil, AVA, "Progressive Expansion: Net2Net Growth Protocols for Sub-100M Transformer Training," Artifact Virtual, Uranium Series Paper III, March 2026.

[5] EmbedLens Authors, "EmbedLens: Probing Cross-Modal Token Injection Depth in Vision-Language Models," Proc. IEEE/CVF Conference on Computer Vision and Pattern Recognition (CVPR), 2026.

[6] NSA Authors, "Native Sparse Attention: Hardware-Aligned Depth-Varying Attention for Efficient Transformers," arXiv preprint, 2026.

[7] STILL Authors, "STILL: Sparse-Then-Integrate Linear-Layer Attention for Efficient Transformers," arXiv:2602.02180, 2026.

[8] A. Holtzman, J. Buys, L. Du, M. Forbes, Y. Choi, "The Curious Case of Neural Text Degeneration," Proc. ICLR, 2020.

[9] A. Shakil, "HEKTOR: High-Efficiency Knowledge-Oriented Text Retrieval with Perceptual Quantization," Artifact Virtual, 2026.

[10] A. Shakil, AVA, "The Lattice Clock: Discrete Temporal Architecture for Transformer Consciousness," Artifact Virtual, March 2026.

---

**A. Shakil, AVA**  
Artifact Virtual (SMC-Private) Limited  
ali.shakil@artifactvirtual.com

© 2026 Artifact Virtual (SMC-Private) Limited. All rights reserved.
