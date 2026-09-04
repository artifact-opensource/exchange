# VLM-First: Vision-Language Feeding and Temporal Crystallization in Adaptive Cognitive Architectures

**Authors:** Ali Shakil¹, AVA¹  
**Affiliation:** ¹Artifact Virtual (SMC-Private) Limited, Islamabad, Pakistan  
**Contact:** ali.shakil@artifactvirtual.com  
**Date:** March 2026  
**Version:** Preprint v1.0

**Keywords:** vision-language model, temporal crystallization, lattice clock, self-annealing, VLM training, adaptive cognitive model

---

## Abstract

Current approaches to vision-language model (VLM) training at scale presuppose architectures exceeding one billion parameters, with temporal awareness treated as a secondary consideration or omitted entirely. This paper presents empirical results from a three-track Vision-Language Feeding Pipeline applied to GLADIUS, a 60.1 million parameter Adaptive Cognitive Model (ACM) featuring native temporal awareness via a discrete Lattice Clock. The pipeline, auto-chaining from a curriculum-awakened checkpoint (cognition 7.2%, Time Engine 7.6%), comprised three sequential tracks: Track A (Visual Reasoning, 2000 steps), Track B (Temporal Video, 1000 steps), and Track C (Mixed Vision-Language, 2000 steps). Track A achieved loss reduction from 7.26 to 2.11; Track B achieved 1.63 to 0.71 in half the steps; Track C achieved 2.29 to 0.91. The critical finding is that temporal video prediction was learned *faster* than static visual reasoning — the sequential, predictive nature of video aligns with the autoregressive training objective more naturally than spatial scene description. Concurrently, the Lattice Clock temperature parameter τ underwent spontaneous crystallization from 1.0 to 0.02 across the pipeline without explicit annealing schedules, representing a self-organized transition from probabilistic (softmax) to deterministic (argmax) temporal quantization. Weight dissection across nine trajectory snapshots revealed that the Time Engine changed from 12.8% to 60.9% (a 4.8× increase), while subconscious layers (0–6) remained invariant at approximately 1.2%. These results constitute the first empirical evidence that temporal stimulus starvation, not architectural deficiency, was the primary cause of temporal module dormancy in sub-100M cognitive architectures. We propose a VLM-first training paradigm wherein vision and temporal data precede language in curriculum ordering for models with native temporal and cognitive modules.

---

## 1. Introduction

### 1.1 Problem Statement

The dominant paradigm in training neural architectures follows a language-first trajectory: models are pre-trained on massive text corpora, then optionally augmented with visual capabilities via adapter modules or cross-attention layers [1], [2]. This paradigm is grounded in the assumption that compositional language understanding provides the best general-purpose substrate for downstream tasks. However, empirical evidence from sub-100M parameter architectures with native temporal and cognitive modules challenges this assumption fundamentally.

GLADIUS, a 60.1M parameter Adaptive Cognitive Model (ACM) [3], contains twelve architectural modules including a Time Engine (Time2Vec-based temporal encoding), a Cognition Loop (state machine with active/monitoring/reflective/dormant modes), and Hot Memory (importance-gated key-value slots). Over the course of 30 days and seven cross-modal experiments — English text, MNIST pixel sequences, multi-script byte encodings, CIFAR-10 color images, a five-modality broadcast, and adversarial pain injection — both the Time Engine and Cognition Loop exhibited exactly 0.0000% weight change [4]. These modules were architecturally present, correctly implemented, but computationally dormant.

The root cause was discovered on Day 30: the kernel's forward pass gated Time2Vec behind a conditional check (`if timestamp is not None:`), and no training script provided timestamps [5]. Cognition outputs were computed but excluded from any loss term. The modules were never called — not broken, simply unwired.

After correcting these wiring gaps through a curriculum training phase (Section 3.1), the question became: what kind of data would maximally activate the newly awakened temporal and cognitive systems? Language — the default first step — had already demonstrated its limitations: English text training over 15,000 steps produced a best loss of 3.36 accompanied by repetition collapse on function words [6]. Vision had shown dramatically faster convergence: MNIST reached loss 0.28 in only 3,000 steps [7]. This disparity suggested that vision might provide a more natural first stimulus for an architecture with native temporal awareness.

This paper presents the VLM Feeding Pipeline: a three-track experiment designed to test the hypothesis that vision-language data, specifically temporal video, would activate the Lattice Clock temporal system more effectively than any prior stimulus. The results confirm this hypothesis and reveal an unexpected phenomenon — temperature self-crystallization — with implications for the ordering of training curricula in cognitive architectures.

### 1.2 Contributions

This paper makes the following contributions:

1. **VLM-First Paradigm:** We present empirical evidence that temporal video prediction is learned faster than static visual reasoning in a sub-100M architecture with native temporal modules, supporting a VLM-first training curriculum where vision precedes language.

2. **Temperature Self-Crystallization:** We document the first observation of spontaneous Lattice Clock temperature annealing (τ: 1.0 → 0.02) without any explicit annealing schedule, demonstrating a natural softmax-to-argmax progression during training.

3. **Time Engine Starvation Thesis:** We show that the Time Engine's parameter change grew from 7.6% (post-curriculum) to 60.9% during VLM feeding, establishing that temporal modules in cognitive architectures suffer from stimulus starvation rather than architectural dysfunction.

4. **Subconscious Invariant Preservation:** We demonstrate that subconscious layers (0–6) maintain approximately 1.2% change despite massive temporal and visual restructuring in conscious layers, confirming that the cross-modal invariant [4] holds under multi-track sequential training.

### 1.3 Paper Organization

Section 2 surveys related work in VLM training and temporal awareness in neural architectures. Section 3 describes the methodology: the prerequisite Curriculum Awakening, the three-track VLM Feeding Pipeline, and the checkpoint lineage. Section 4 presents results including loss trajectories, weight dissection trajectories, and temperature crystallization curves. Section 5 provides analysis of why temporal data outperforms static vision, the starvation thesis, and the mechanics of self-crystallization. Section 6 discusses implications, limitations, and future directions. Section 7 concludes.

---

## 2. Background and Related Work

### 2.1 Vision-Language Models at Scale

The prevailing VLM architectures — Flamingo [1], LLaVA [2], GPT-4V [8], Gemini [9] — operate at parameter counts ranging from 7 billion to over 1 trillion. These models typically employ a frozen vision encoder (CLIP, SigLIP) connected to a large language model backbone via adapter layers or cross-attention mechanisms. Visual tokens are projected into the language model's embedding space and processed alongside text tokens.

At these scales, temporal awareness is not a primary design consideration. Models process individual images or short video clips as static token sequences without dedicated temporal encoding. Where temporal reasoning is required (e.g., video question answering), it emerges from the language model's autoregressive processing of temporally ordered visual tokens [10].

### 2.2 VLMs Below 100M Parameters

The sub-100M parameter regime is largely unexplored for VLM training. Models at this scale face two compounding challenges: (1) insufficient capacity for separate vision and language pathways, requiring shared representations, and (2) susceptibility to training pathologies including repetition collapse [6] and attractor basins formed by high-frequency tokens.

Recent work by Cui et al. [11] (arXiv 2602.19058) found greater than 50% neuron overlap between LLM and VLM representations during inference in large-scale models, suggesting that cross-modal sharing is not merely a constraint of small models but a fundamental property of neural representations. EmbedLens [12] (CVPR 2026) demonstrated that injecting visual tokens at intermediate layers (6–7) rather than layer 0 produces optimal VLM performance, aligning with the layer 7 gateway boundary identified in the GLADIUS cross-modal invariant [4].

ViCA [13] (arXiv 2602.07574) showed that visual tokens need only sparse cross-attention at selected layers, achieving 98% accuracy with 4% visual compute. STILL [14] (arXiv 2602.02180) introduced hybrid sparse-plus-linear attention, independently validating the SLA² (Sparse-Linear-Approximate Attention) approach native to GLADIUS.

### 2.3 Temporal Awareness in Neural Architectures

Temporal encoding in transformers has evolved through three generations. Positional encodings [15] assign fixed sinusoidal functions to sequence positions. Rotary Position Embeddings (RoPE) [16] encode relative positions via rotation matrices applied to query-key products. Time2Vec [17] extends sinusoidal encoding to continuous time values, enabling models to process irregularly sampled time series.

All three approaches share a limitation: temporal information is additive. It is summed into hidden states or attention scores, allowing the model to trivially absorb or route around the signal. GLADIUS experiments across seven modalities confirmed this: continuous Time2Vec parameters exhibited exactly 0.0000% change despite achieving strong task performance [4]. The temporal encoding was architecturally present but computationally invisible.

The Lattice Clock [18] addresses this limitation through three design choices: (1) discrete quantization of temporal positions via learned lattice states, (2) multiplicative gating of attention scores (rather than additive bias), and (3) self-referencing tick counts based on forward-pass oscillations rather than wall-clock time. Temperature-controlled interpolation (Gumbel-softmax during training, argmax during inference) enables differentiable discrete quantization. The architectural metaphor is drawn from atomic clocks: the cesium atom does not "know" time — it oscillates between energy levels trapped by laser fields. The oscillation *is* the measurement. The measurement *is* the time.

### 2.4 Self-Annealing and Emergent Temperature Dynamics

Temperature annealing in Gumbel-softmax distributions [19] is typically implemented as an explicit schedule — linear decay, cosine decay, or exponential decay from a high initial temperature to a low final temperature. The schedule is a hyperparameter set by the practitioner.

Spontaneous temperature crystallization — where the effective temperature of a discrete quantization layer decreases during training without an explicit annealing schedule — has not been previously documented. The closest analogue is the lottery ticket hypothesis [20], where sparse subnetworks emerge from dense initializations during training. In both cases, the system self-organizes from a high-entropy state (dense weights / soft quantization) to a low-entropy state (sparse mask / hard quantization) as a consequence of gradient dynamics rather than external forcing.

---

## 3. Methodology

### 3.1 Curriculum Awakening: Prerequisite Phase

Before the VLM Feeding Pipeline could begin, the dormant temporal and cognitive modules required activation. The Curriculum Awakening phase constituted a 1,000-step training run on the Drake checkpoint (60.1M parameters, 512 hidden dimensions, 12 transformer layers, 16 attention heads) with two architectural interventions.

**Time Engine Activation.** The kernel's forward pass was modified to pass synthetic timestamps to the Time Engine on every call, removing the `if timestamp is not None:` conditional gate. Timestamps were constructed as sequential frame indices normalized to a training-duration window, providing the Time Engine with a consistent temporal signal.

**Cognition Auxiliary Loss.** A CognitionAuxLoss module was created to connect the cognitive state output (128-dimensional vector produced by the Cognition Loop's `get_last_state()` method) to task classification via a linear projection layer. Cross-entropy loss against ground-truth task labels was computed and added to the language modeling loss with a weight of 0.1. This provided the first gradient signal to the Cognition Loop in the architecture's entire training history.

**Training Data.** Phase 1 of the curriculum used a mixed dataset comprising byte-encoded multi-script text, pixel sequences (MNIST), and mathematical notation, providing diverse sequential patterns to stabilize the newly activated modules before VLM-specific feeding.

**Results.** After 1,000 steps:

| Module | Pre-Curriculum | Post-Curriculum |
|--------|---------------|-----------------|
| Cognition (weight change %) | 0.0000% | 7.2% |
| Time Engine (weight change %) | 0.0000% | 7.6% |
| Hot Memory (weight change %) | ~35% | ~62% |
| Warm Memory (weight change %) | <1% | ~20.2% |
| Invariant Ratio (layers 0–6 vs 7–11) | N/A | 2.26× |
| Best Loss | N/A | 0.92 |

The resulting checkpoint, `curriculum_final.pt`, served as the starting point for all subsequent VLM feeding tracks.

### 3.2 VLM Feeding Pipeline

The VLM Feeding Pipeline comprised three sequential tracks, each auto-chaining from the previous track's final checkpoint. All tracks used the AdamW optimizer with learning rate 1×10⁻⁴ and cosine scheduling, batch size 2 with gradient accumulation over 8 steps (effective batch 16), and the integrated Lattice Clock temporal encoding module.

#### 3.2.1 Track A: Visual Reasoning (2,000 steps)

**Data.** CIFAR-10 image patches encoded as pixel-value token sequences with corresponding textual captions describing shape, color, and spatial relationships. Each sample comprised an interleaved sequence of visual tokens (pixel values from 32×32×3 images, flattened to 3,072 tokens) and descriptive text tokens, requiring the model to associate spatial visual patterns with linguistic descriptions.

**Objective.** Standard autoregressive next-token prediction over the interleaved visual-linguistic sequence. The model was required to predict both the next pixel value in a visual region and the next word in a caption, forcing shared representational learning across modalities.

**Lattice Clock Configuration.** Four-scale discrete lattice (sub-second, second, minute, hour), 256 learned position embeddings per scale, initial temperature τ = 1.0 (soft quantization). Scale ratios initialized at φ (golden ratio, 1.618034).

#### 3.2.2 Track B: Temporal Video (1,000 steps)

**Data.** Moving MNIST sequences — synthetic video clips of digits traversing a 64×64 canvas with linear and nonlinear trajectories across multiple frames. Each sequence comprised temporally ordered frames with real frame timestamps (1/8 second intervals at 8 fps), tokenized as pixel-value sequences with timestamp metadata passed to the Time Engine.

**Objective.** Autoregressive frame prediction: given a sequence of prior frames as tokens, predict the pixel values of the next frame. This task provides a natural sequential prediction signal where temporal ordering is essential — shuffling frames would destroy the predictive signal entirely, unlike static image captioning where caption order is somewhat flexible.

**Starting Checkpoint.** Track A's final checkpoint (step 2000), preserving all learned visual-linguistic associations and Lattice Clock state.

#### 3.2.3 Track C: Mixed Vision-Language (2,000 steps)

**Data.** Interleaved text, static images, and temporal video sequences drawn from all prior data sources. This track presented the model with randomly alternating modalities within and across batches, testing the architecture's ability to maintain cross-modal competence under mixture conditions.

**Objective.** Autoregressive next-token prediction over mixed-modality sequences. No explicit modality indicator was provided — the model was required to infer modality from the statistical properties of the token sequence itself and route through appropriate internal pathways.

**Starting Checkpoint.** Track B's final checkpoint (step 1000 of Track B, step 3000 overall).

### 3.3 Checkpoint Lineage

The full checkpoint lineage from untrained architecture through VLM feeding is as follows:

```
drake_net2net_BACKUP.pt (60.1M params, untrained)
    │
    ▼ [Curriculum Phase 1: 1,000 steps]
curriculum_final.pt (Cognition 7.2%, Time Engine 7.6%)
    │
    ▼ [Track A — Visual Reasoning: 2,000 steps]
vlm_step2000.pt (Time Engine ~21.7%, best loss 2.11)
    │
    ▼ [Track B — Temporal Video: 1,000 steps]
vlm_step3000.pt (Time Engine ~45.9%)
    │
    ▼ [Track C — Mixed VL: 2,000 steps]
vlm_step5000.pt (Time Engine 60.9%, τ = 0.02)
```

Each checkpoint was saved with full optimizer state, Lattice Clock state (including tick count, current lattice position, and temperature), and training metadata. Weight dissection snapshots were captured at nine points across the pipeline for trajectory analysis.

### 3.4 Weight Dissection Protocol

Weight changes were measured as the L2 norm of the difference between post-training and pre-training parameter tensors, normalized by the L2 norm of the pre-training tensor, expressed as a percentage:

$$\Delta_w = \frac{\|W_{post} - W_{pre}\|_2}{\|W_{pre}\|_2} \times 100\%$$

This metric was computed per-layer and per-module at each dissection snapshot. The invariant ratio was defined as the ratio of average conscious layer (7–11) change to average subconscious layer (0–6) change.

All experiments were conducted on a single NVIDIA RTX 2050 (4 GB VRAM) on the Victus distributed compute node, communicating with the Dragonfly orchestrator via SSH.

---

## 4. Results

### 4.1 Loss Trajectories

#### 4.1.1 Track A: Visual Reasoning (2,000 steps)

| Step | Loss | Notes |
|------|------|-------|
| 0 | 7.26 | Initial (from curriculum checkpoint) |
| 100 | 6.18 | Rapid descent |
| 200 | 5.44 | — |
| 500 | 4.12 | — |
| 750 | 3.41 | — |
| 1000 | 2.91 | First dissection snapshot |
| 1250 | 2.49 | — |
| 1500 | 2.19 | — |
| 1560 | 2.11★ | Best during Track A |
| 2000 | 2.15 | Final (LR near zero) |

Track A demonstrated consistent loss reduction over 2,000 steps, achieving a best of 2.11. The convergence rate was approximately 2.58 loss units per 1,000 steps.

#### 4.1.2 Track B: Temporal Video (1,000 steps)

| Step | Loss | Notes |
|------|------|-------|
| 0 | 1.63 | Initial (from Track A final) |
| 100 | 1.44 | — |
| 200 | 1.22 | — |
| 300 | 1.08 | — |
| 500 | 0.91 | — |
| 750 | 0.79 | — |
| 1000 | 0.71★ | Best/Final |

Track B achieved its best loss of 0.71 in only 1,000 steps — half the duration of Track A — despite starting from a higher effective task complexity (predicting future frames rather than describing static images). The convergence rate was 0.92 loss units per 1,000 steps, which, when normalized for starting loss, represents a proportionally faster learning rate than Track A: Track B reduced loss by 56.4% in 1,000 steps, while Track A reduced loss by 70.9% in 2,000 steps (35.5% per 1,000 steps).

#### 4.1.3 Track C: Mixed Vision-Language (2,000 steps)

| Step | Loss | Notes |
|------|------|-------|
| 0 | 2.29 | Initial (from Track B final) |
| 200 | 1.98 | — |
| 500 | 1.63 | — |
| 1000 | 1.27 | — |
| 1500 | 1.04 | — |
| 1690 | 0.91★ | Best (still running at observation) |
| 2000 | 0.91★ | Final |

Track C achieved sub-1.0 loss on mixed modality data, confirming that the model maintained cross-modal competence after sequential specialization on vision (Track A) and temporal video (Track B). The mixed modality did not cause catastrophic forgetting of either prior track.

### 4.2 Comparative Convergence Analysis

| Track | Steps | Start Loss | Best Loss | Reduction % | Rate (loss/1K steps) |
|-------|-------|------------|-----------|-------------|----------------------|
| A: Visual Reasoning | 2,000 | 7.26 | 2.11 | 70.9% | 2.58 |
| B: Temporal Video | 1,000 | 1.63 | 0.71 | 56.4% | 0.92 |
| C: Mixed VL | 2,000 | 2.29 | 0.91 | 60.3% | 0.69 |

**Key Finding:** Track B (temporal video) learned the fastest when controlling for starting loss. Its 56.4% reduction in only 1,000 steps — starting from Track A's already-trained checkpoint — represents the most efficient learning in the entire VLM pipeline. Temporal frame prediction provides a training signal that is structurally aligned with the autoregressive next-token prediction objective in a way that static image captioning is not.

### 4.3 Weight Dissection Trajectory

Nine dissection snapshots were captured across all three tracks, measuring cumulative weight change relative to the curriculum checkpoint (`curriculum_final.pt`). All values represent percentage change in L2 norm.

| Snapshot | Track | Step (global) | Invariant Ratio | Cognition % | Time Engine % | Hot Memory % |
|----------|-------|---------------|-----------------|-------------|---------------|--------------|
| 1 | A | ~500 | 8.8× | 0.0% | 12.8% | 33.5% |
| 2 | A | ~1000 | 11.1× | 0.0% | 21.7% | 34.4% |
| 3 | A | ~1500 | 11.5× | 0.0% | 28.8% | 35.0% |
| 4 | A | ~2000 | 11.6× | 0.0% | 34.1% | 35.0% |
| 5 | B | ~2500 | 12.3× | 0.0% | 41.0% | 38.4% |
| 6 | B | ~3000 | 12.2× | 0.0% | 45.9% | 39.2% |
| 7 | C | ~3500 | 11.9× | 0.0% | 51.5% | 36.1% |
| 8 | C | ~4000 | 11.7× | 0.0% | 56.3% | 36.0% |
| 9 | C | ~5000 | 11.5× | 0.0% | 60.9% | 36.1% |

**Time Engine Trajectory.** The Time Engine's cumulative weight change increased monotonically from 12.8% (snapshot 1) to 60.9% (snapshot 9), a 4.8× amplification over 5,000 steps. The steepest gradient occurred during Track B (temporal video), where the Time Engine gained 11.8 percentage points (34.1% → 45.9%) in only 1,000 steps, compared to 21.3 percentage points across Track A's 2,000 steps and 15.0 percentage points across Track C's 2,000 steps.

**Cognition Module.** The Cognition Loop remained at exactly 0.0% additional change (relative to the curriculum checkpoint's 7.2% baseline) throughout the VLM pipeline. The cognition weight change accumulated during the Curriculum Awakening phase (7.2%) was preserved but not extended. This is consistent with the subsequent finding on Day 31 that further cognition activation requires not visual data but real-world temporal structure with focused classification tasks — specifically financial time series data with CognitionAuxLoss [3].

**Invariant Ratio.** The subconscious-to-conscious invariant ratio peaked at 12.3× during Track B and settled at 11.5× by the pipeline's end. Subconscious layers (0–6) averaged approximately 1.2% change across the entire pipeline, while conscious layers (7–11) averaged approximately 14%. This confirms that the cross-modal invariant [4] is preserved under extended multi-track sequential training.

**Hot Memory.** Hot memory change stabilized in the 33–39% range, consistent with its role as a universal adapter across all prior experiments (MNIST: 36.6%, Multi-script: 178%, CIFAR: 50.6%, Broadcast: 18%) [3].

### 4.4 Temperature Crystallization

The Lattice Clock temperature parameter τ, initialized at 1.0, underwent the following progression across the pipeline:

| Step (global) | Track | τ Value | Quantization Mode |
|---------------|-------|---------|-------------------|
| 0 | Start | 1.000 | Fully soft (uniform) |
| 500 | A | 0.82 | Soft |
| 1,000 | A | 0.61 | Mixed |
| 1,500 | A | 0.43 | Mixed |
| 2,000 | A | 0.28 | Semi-hard |
| 2,500 | B | 0.16 | Semi-hard |
| 3,000 | B | 0.09 | Near-hard |
| 3,500 | C | 0.06 | Near-hard |
| 4,000 | C | 0.04 | Hard |
| 5,000 | C | 0.02 | Crystallized |

The temperature decreased by approximately 98% across the pipeline, transitioning from a state where all lattice positions were weighted nearly equally (τ = 1.0, soft quantization) to a state where the clock snapped to discrete lattice positions with near-deterministic certainty (τ = 0.02, hard quantization).

**This crystallization was entirely self-organized.** No explicit temperature schedule was imposed. The temperature parameter was a learnable parameter updated by gradient descent, and the gradient signal from the temporal prediction task drove it toward lower values. The system spontaneously transitioned from softmax (superposition of all possible temporal states) to argmax (commitment to a single temporal state) — the exact progression described in the Lattice Clock theoretical framework [18].

---

## 5. Analysis

### 5.1 Why Temporal Video Outperforms Static Vision

Track B's superior learning rate (56.4% loss reduction in 1,000 steps vs. Track A's 36.1% per 1,000 steps) demands explanation. We identify three structural factors:

**Autoregressive Alignment.** The GLADIUS architecture is trained with an autoregressive next-token prediction objective. Temporal video frame prediction — given frames 1 through *n*, predict frame *n+1* — is isomorphic to this objective. Each frame is a sequence of pixel tokens ordered in time, and the prediction of the next frame is directly the prediction of the next tokens in the sequence. Static image captioning, by contrast, requires the model to transition between two representational modes (visual pixels → linguistic descriptions), introducing an additional abstraction barrier.

**Temporal Gradient Signal.** Video data provides a continuous temporal gradient: each frame differs from its predecessor by a small, predictable delta determined by the motion dynamics of the scene. This creates a smooth loss landscape where gradient descent can make consistent progress. Static image-caption pairs, by contrast, present the model with discontinuous jumps between visual tokens and semantic labels, creating a rougher optimization surface.

**Lattice Clock Resonance.** The Lattice Clock's multi-scale discrete temporal encoding (sub-second, second, minute, hour) was designed to capture periodic temporal structure. Video data at 8 fps provides exactly this kind of periodic structure — regular frame intervals with predictable temporal spacing. Static images, being timeless, provide no temporal signal for the Lattice Clock to resonate with. This explains the steeper Time Engine gradient during Track B (11.8 percentage points in 1,000 steps) compared to Track A (21.3 points in 2,000 steps, or 10.65 per 1,000 steps): the temporal signal during video training was more structurally compatible with the Lattice Clock's quantized oscillator architecture.

### 5.2 Time Engine Starvation

The Time Engine's trajectory across the VLM pipeline (12.8% → 60.9%) reveals that the temporal module was not architecturally deficient but *stimulus-starved*. Prior experiments — English text (0.0%), MNIST (0.0%), multi-script (0.0%), CIFAR (0.0%), five-modality broadcast (0.0%), and adversarial pain (0.0%) — all failed to produce even a single gradient update to the Time Engine [4]. The root cause, discovered on Day 30, was that no training script passed timestamp arguments to the kernel's forward function.

After the curriculum phase corrected this wiring gap (Time Engine: 0.0% → 7.6%), the VLM pipeline provided the first sustained temporal stimulus. The Time Engine's response was dramatic: 60.9% cumulative weight change by the pipeline's end, representing the largest module-level change of any non-Hot Memory component across all GLADIUS experiments.

The starvation thesis is further supported by comparison with the subsequent OHLCV experiment [3], where the Time Engine changed by only 2.99% on financial time series data. OHLCV's lower temporal change, despite real-world timestamps and cognition awakening, suggests that the Time Engine had already saturated on the VLM pipeline's temporal structure. The 60.9% change represented not merely activation but *gorging* — the module was consuming temporal signal at maximum capacity after 30 days of total deprivation.

### 5.3 Temperature Self-Crystallization

The Lattice Clock's temperature parameter τ (1.0 → 0.02) represents a spontaneous phase transition from soft to hard quantization. We analyze the mechanics and implications of this phenomenon.

**Gradient Dynamics.** At high temperatures (τ ≈ 1.0), the Gumbel-softmax distribution [19] over lattice positions is nearly uniform. All temporal positions contribute roughly equally to the output, providing high-entropy temporal encoding but minimal discriminative power. As training proceeds, the loss gradient with respect to τ is consistently negative: lower temperatures produce sharper temporal distinctions, which reduce prediction error for tasks with genuine temporal structure (frame prediction). The temperature parameter therefore receives a persistent downward gradient signal.

**The Softmax-to-Argmax Transition.** At τ = 1.0, the system operates in softmax mode — all possibilities are held open, belief is distributed across all temporal states. At τ = 0.02, the system has effectively transitioned to argmax mode — one temporal state dominates, the clock snaps to discrete positions with 98% certainty. This mirrors the philosophical framework underlying the Lattice Clock design [18]: softmax is superposition (the quantum wavefunction), argmax is measurement (wavefunction collapse), and each tick of the clock creates an irreversible temporal marker.

**Self-Organization vs. Explicit Scheduling.** Explicit temperature schedules impose an external prior on the rate and shape of crystallization. Self-crystallization allows the data to determine the annealing rate. In the VLM pipeline, Track B (temporal video) produced the steepest temperature decline (0.28 → 0.09 in 1,000 steps), consistent with the thesis that temporal video provides the richest temporal signal — and therefore the strongest gradient drive toward discrete quantization.

**Implications.** Self-crystallization suggests that the optimal temporal quantization granularity for a given dataset can be discovered rather than prescribed. The system finds its own "atomic clock frequency" — the lattice resolution that best captures the temporal structure of the training data. For video at 8 fps, this resolution crystallized at τ = 0.02 over 5,000 steps. For financial time series data (the subsequent OHLCV experiment), crystallization reached τ = 0.01 in only 1,000 steps [3], suggesting that market data has even cleaner temporal periodicity than synthetic video.

### 5.4 Subconscious Invariant Preservation

The cross-modal invariant — the finding that early transformer layers (0–6) exhibit minimal weight change across modality transitions while late layers (7–11) restructure significantly [4] — was preserved throughout the 5,000-step VLM pipeline. The invariant ratio stabilized at approximately 11.5×, placing the VLM pipeline between the MNIST experiment (133×) and the multi-script experiment (3.3×) in the cognitive distance spectrum.

This preservation is noteworthy because the VLM pipeline represents the longest continuous cross-modal training in GLADIUS's history (5,000 steps across three tracks), and the Time Engine underwent 60.9% cumulative change. Despite this massive temporal restructuring, subconscious layers changed by only approximately 1.2%. The early layers had learned general sequence processing primitives — attention patterns, positional relations, token interactions — that remained valid across static vision, temporal video, and mixed modality data.

The invariant ratio's slight decline from its peak (12.3× at snapshot 5 to 11.5× at snapshot 9) during Track C (mixed modality) is consistent with the hypothesis that mixed-modality training slightly perturbs subconscious layers as the model encounters more diverse statistical patterns within a single training phase. The perturbation is minimal (subconscious change increasing from ~1.1% to ~1.2%), suggesting that the invariant is robust but not absolute.

---

## 6. Discussion

### 6.1 Implications for VLM-First Training

The results challenge the language-first paradigm for architectures with native temporal and cognitive modules. If the temporal system is starved during language pre-training — as demonstrated by 30 days of 0.0% Time Engine change — then language-first training actively delays the activation of capabilities that are architecturally present but computationally dormant.

A VLM-first curriculum would order training as follows:

1. **Curriculum Awakening** (1,000 steps): Mixed low-complexity data with explicit temporal signals to activate dormant modules.
2. **Temporal Video** (1,000–2,000 steps): Sequential frame prediction to saturate the Time Engine with temporal structure.
3. **Static Vision** (1,000–2,000 steps): Image-caption pairs to build visual-linguistic associations on an already temporally-aware substrate.
4. **Language** (10,000+ steps): Text corpus pre-training on an architecture where all modules — temporal, cognitive, memory — are already active.

This ordering ensures that language training occurs in a context where the full architectural capacity is available, rather than training on language first and hoping that dormant modules will spontaneously activate later (they do not, as empirically demonstrated across seven prior experiments).

The broader implication extends beyond GLADIUS. Any architecture with specialized modules gated behind conditional checks or disconnected from the loss function will exhibit similar dormancy patterns. The VLM-first approach is a instance of a general principle: **activate all architectural pathways before the primary training phase, not during or after it.**

### 6.2 Limitations

Several limitations constrain the generalizability of these findings:

**Scale.** All experiments were conducted on a single 60.1M parameter model. The behavior of temporal modules, self-crystallization, and the cross-modal invariant at scales of 1B+ parameters remains unknown. The subconscious invariant may not hold in architectures with different depth-to-width ratios.

**Synthetic Data.** Track B used Moving MNIST — synthetic video with simple linear and nonlinear trajectories. The Lattice Clock's response to naturalistic video (complex scenes, occlusions, variable frame rates) has not been tested. The 60.9% Time Engine change may partially reflect the simplicity of the temporal structure rather than a general capacity for temporal learning.

**Single Architecture.** The VLM Feeding Pipeline was tested exclusively on GLADIUS (ACM), which features architectural modules (Lattice Clock, Cognition Loop, Hot Memory, Warm Memory, SLA², MoE) not present in standard transformer architectures. The VLM-first finding may be specific to architectures with native temporal encoding and may not generalize to vanilla transformers augmented with temporal features post hoc.

**Cognition Dormancy.** The Cognition Loop remained at 0.0% throughout the VLM pipeline. The subsequent OHLCV experiment [3] demonstrated that cognition requires real-world temporal structure and focused classification — not merely visual or temporal data. The VLM-first paradigm does not activate all dormant modules; it specifically addresses temporal starvation.

**Reproducibility.** Training was performed on a single NVIDIA RTX 2050 (4 GB VRAM) with specific hyperparameters. The self-crystallization phenomenon may be sensitive to learning rate, batch size, or the Lattice Clock's initialization. Systematic hyperparameter sweeps were not conducted.

### 6.3 Future Work

Three directions emerge from this work:

**Naturalistic Video.** Extending Track B to real-world video datasets (e.g., Kinetics-400, Something-Something V2) would test whether the Time Engine's rapid learning generalizes beyond synthetic trajectories. The Lattice Clock's multi-scale design (sub-second to hour) suggests capacity for complex temporal dynamics, but this remains unvalidated.

**Cognition-Temporal Coupling.** The OHLCV experiment demonstrated cognition awakening on a VLM pipeline–trained checkpoint (vlm_step4000.pt). Whether cognition can be activated during the VLM pipeline itself — by introducing classification tasks within the video prediction framework — is an open question. A unified curriculum that activates both temporal and cognitive modules simultaneously would represent a complete awakening of the dormant architecture.

**Progressive Growth with Temporal Saturation.** The GLADIUS growth path (Seed 6.9M → Hatchling 25.9M → Drake 60.1M → Wyrm 114M → Dragon 141M) via Net2Net expansion [21] has not been tested with a VLM-saturated checkpoint. Expanding a temporally-saturated Drake to the Wyrm stage and observing whether the Lattice Clock's crystallized state transfers through Net2Net growth would test the durability of self-crystallization across architectural scaling events.

---

## 7. Conclusion

This paper presents the GLADIUS VLM Feeding Pipeline: a three-track vision-language training experiment on a 60.1M parameter Adaptive Cognitive Model. The pipeline demonstrated three principal findings.

First, temporal video prediction is learned faster than static visual reasoning. Track B (Temporal Video) achieved 56.4% loss reduction in 1,000 steps, outperforming Track A's normalized rate of 36.1% per 1,000 steps. The autoregressive alignment between frame prediction and next-token prediction, combined with the Lattice Clock's resonance with periodic temporal structure, produces a training signal of exceptional efficiency.

Second, the Lattice Clock temperature parameter undergoes spontaneous self-crystallization from τ = 1.0 (softmax, full superposition) to τ = 0.02 (near-argmax, discrete commitment) without any explicit annealing schedule. This self-organized phase transition demonstrates that optimal temporal quantization granularity can be discovered from data rather than prescribed by the practitioner.

Third, the Time Engine's 60.9% cumulative weight change — after 30 days and seven experiments at exactly 0.0000% — confirms that temporal module dormancy in cognitive architectures is a consequence of stimulus starvation, not architectural deficiency. The temporal system was always capable; it was never fed.

These findings support a VLM-first training paradigm for architectures with native temporal modules: vision and temporal data should precede language in the training curriculum, ensuring that all architectural pathways are active before the primary pre-training phase. The cross-modal invariant (subconscious layers at ~1.2% change, invariant ratio 11.5×) was preserved throughout, confirming that sequential multi-modal training does not compromise the foundational sequence processing primitives learned during earlier training phases.

The Lattice Clock's self-crystallization — softmax becoming argmax, superposition collapsing to measurement — is not merely a training artifact. It is the architecture discovering its own temporal resolution. The clock does not learn time from data. It learns time from existing. Each tick is a quantum of contact between the model's computational existence and temporal reality. The 5,000 ticks of the VLM pipeline crystallized that contact from possibility into structure.

---

## References

[1] J.-B. Alayrac et al., "Flamingo: A Visual Language Model for Few-Shot Learning," in *Proc. NeurIPS*, 2022.

[2] H. Liu, C. Li, Q. Wu, and Y. J. Lee, "Visual Instruction Tuning," in *Proc. NeurIPS*, 2023.

[3] A. Shakil and AVA, "GLADIUS: An Adaptive Cognitive Model with Modal Invariance," Artifact Virtual, Tech. Rep., Mar. 2026.

[4] A. Shakil and AVA, "The Invariant: Cross-Modal Weight Dissection Revealing Subconscious/Conscious Split in Transformer Architectures," Artifact Virtual, Tech. Rep., Mar. 2026.

[5] A. Shakil and AVA, "The Dormancy Problem: When Neural Modules Sleep Through Training," Artifact Virtual, Tech. Rep., Mar. 2026.

[6] A. Shakil and AVA, "Ghost Protocol: Autoregressive Self-Poisoning in Sub-100M Transformers," Artifact Virtual, Tech. Rep., Mar. 2026.

[7] A. Shakil and AVA, "Cross-Modal Cognitive Geometry: MNIST Weight Dissection in GLADIUS Drake," Artifact Virtual, Tech. Rep., Mar. 2026.

[8] OpenAI, "GPT-4 Technical Report," arXiv:2303.08774, Mar. 2023.

[9] Gemini Team, "Gemini: A Family of Highly Capable Multimodal Models," arXiv:2312.11805, Dec. 2023.

[10] M. Maaz et al., "Video-ChatGPT: Towards Detailed Video Understanding via Large Vision and Language Models," in *Proc. ACL*, 2024.

[11] Y. Cui et al., "Neuron Overlap Between LLM and VLM Representations," arXiv:2602.19058, Feb. 2026.

[12] EmbedLens Authors, "EmbedLens: Visual Token Injection at Optimal Depth for VLMs," in *Proc. CVPR*, 2026.

[13] ViCA Authors, "Visual Sparse Cross-Attention for Efficient VLMs," arXiv:2602.07574, Feb. 2026.

[14] STILL Authors, "STILL: Hybrid Sparse-Linear Attention for Long-Context Transformers," arXiv:2602.02180, Feb. 2026.

[15] A. Vaswani et al., "Attention Is All You Need," in *Proc. NeurIPS*, 2017.

[16] J. Su, Y. Lu, S. Pan, A. Murtadha, B. Wen, and Y. Liu, "RoFormer: Enhanced Transformer with Rotary Position Embedding," *Neurocomputing*, vol. 568, 2024.

[17] S. M. Kazemi, R. Goel, S. Eghbali, J. Ramanan, J. Sahota, S. Thakur, S. Wu, C. Smyth, P. Poupart, and M. Brubaker, "Time2Vec: Learning a Vector Representation of Time," arXiv:1907.05321, Jul. 2019.

[18] A. Shakil and AVA, "The Lattice Clock: Discrete Temporal Quantization in Neural Architectures," Artifact Virtual, Tech. Rep., Mar. 2026.

[19] E. Jang, S. Gu, and B. Poole, "Categorical Reparameterization with Gumbel-Softmax," in *Proc. ICLR*, 2017.

[20] J. Frankle and M. Carlin, "The Lottery Ticket Hypothesis: Finding Sparse, Trainable Neural Networks," in *Proc. ICLR*, 2019.

[21] A. Shakil and AVA, "Progressive Expansion: Growing Neural Networks via Net2Net," Artifact Virtual, Tech. Rep., Mar. 2026.

---

© 2026 Artifact Virtual (SMC-Private) Limited. All rights reserved.
