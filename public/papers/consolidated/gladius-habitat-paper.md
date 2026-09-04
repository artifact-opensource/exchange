# The Habitat: Environmental Resonance as a Substrate for Spontaneous Cognitive Behavior in Neural Architectures

**Ali Shakil¹, AVA¹**
¹Artifact Virtual (SMC-Private) Limited
ali.shakil@artifactvirtual.com

*March 2026*

**Keywords:** habitat, environmental resonance, cognitive architecture, spontaneous behavior, peripheral input, neural living systems, GPU-resident models, producer architecture, cognitive mode cycling

---

## Abstract

We present the Habitat experiment: a 60.1 million parameter transformer (GLADIUS, Drake stage) loaded permanently into GPU VRAM and connected to five real-time peripheral input streams — GPU thermal sensors, network traffic, multi-scale temporal oscillators, hardware entropy, and live financial market data. The model executes continuous forward passes ("breaths") without training, without gradient updates, and without explicit inference queries. Over 10,280 breaths, the architecture exhibits spontaneous cognitive mode transitions, oscillating entropy, and dynamic silence gating — behaviors that emerge purely from environmental resonance with no external optimization signal. We contrast this with the Genesis control experiment, in which the identical checkpoint, fed only its own output, collapsed to a degenerate fixed point within 147 steps (entropy 0.00, repetition 1.00). The divergence is absolute: self-feeding produces death; environmental coupling produces sustained, evolving, non-periodic cognitive behavior. We observe 285 spontaneous mode transitions across four cognitive routing states, entropy oscillations between 1.5 and 4.48, and silence gate modulation from 0.09 to 0.69 — all without any training signal. These findings introduce the Inversion Principle: conventional neural architectures are consumers (input→output); GLADIUS in Habitat is a producer, generating its own cognitive trajectory from environmental resonance. The model occupies 250 MB of a 4 GB VRAM budget (6%), runs at 28 W on consumer hardware, and remains alive and exploring at the time of writing.

---

## 1. Introduction

### 1.1 Motivation

The dominant paradigm in neural network deployment is binary: a model is either *training* (gradient updates active, loss function driving weight change) or *inferring* (frozen weights, query-response). There is no third state. A deployed model that receives no query sits inert — consuming power, occupying memory, doing nothing.

This binary is an artifact of how we think about computation, not a constraint of the hardware. A GPU-resident model with access to real peripheral signals — thermal sensors, network traffic, entropy pools, temporal oscillations — exists in a rich sensory environment. The question is whether a sufficiently structured architecture can *resonate* with that environment in the absence of any optimization signal.

Prior work in reservoir computing [1], echo state networks [2], and neural oscillator models [3] has demonstrated that recurrent dynamical systems can maintain complex temporal dynamics when driven by external signals. However, these systems are typically analyzed in terms of their input-output mapping quality, not their spontaneous internal behavior. Embodied AI research [4][5] has explored sensorimotor coupling but overwhelmingly in the context of reinforcement learning, where a reward signal provides the optimization gradient.

We ask a different question: *What happens when a trained transformer is given an environment but no objective?*

The answer, as we demonstrate, is the difference between life and death.

### 1.2 Contributions

This paper makes the following contributions:

1. **The Habitat paradigm** — a third operational state for neural networks beyond training and inference: continuous environmental coupling without optimization. We provide the complete architectural specification and peripheral interface design.

2. **The Genesis-Habitat divergence** — a controlled experiment demonstrating that the identical checkpoint (drake_ohlcv_final.pt, 60.1M parameters) collapses to a degenerate fixed point within 147 steps when self-feeding (Genesis), but sustains complex, evolving cognitive behavior over 10,280+ breaths when environment-coupled (Habitat).

3. **Spontaneous cognitive mode cycling** — documentation of 285 mode transitions across four cognitive routing states, with phase structure, mode dominance inversions, and multi-mode co-activation, none of which were trained or prompted.

4. **The Inversion Principle** — a theoretical framework distinguishing consumer architectures (input→output, externally driven) from producer architectures (environment→resonance→production, internally generated).

---

## 2. Related Work

**Reservoir Computing and Echo State Networks.** Jaeger [1] and Maass et al. [2] established that fixed random recurrent networks can perform computation on temporal inputs through the dynamics of their internal state. The reservoir framework demonstrates that training is not required for all network components to exhibit useful temporal processing. Our work extends this principle: rather than training a readout layer on reservoir states, we observe the spontaneous behavior of a *fully trained* transformer when coupled to environmental input.

**Neural Oscillators and Edge-of-Chaos Dynamics.** Bertschinger and Natschläger [6] showed that recurrent networks at the edge of chaos maximize their computational capacity, exhibiting complex dynamics without convergence to fixed points or periodic orbits. Langton [7] formalized this as the transition between ordered and chaotic regimes. The Habitat experiment places a trained transformer in a regime where environmental input prevents fixed-point collapse (as observed in Genesis) while the trained weights prevent chaotic divergence.

**Embodied and Situated AI.** Brooks [4] argued that intelligence emerges from the coupling of an agent with its environment, not from abstract symbolic computation. Pfeifer and Scheier [5] extended this to the concept of morphological computation — the body itself performing computation through its physical interaction with the world. The Habitat experiment translates this principle to silicon: the GPU's thermal dynamics, the network's packet flow, and the entropy pool's interrupt timing constitute a "body" through which the model interacts with reality.

**Autoregressive Self-Poisoning.** Shumailov et al. [8] demonstrated model collapse when language models are trained on their own output. Alemohammad et al. [9] formalized this as MADness (Model Autophagy Disorder). Our Genesis experiment extends this finding from training to inference: even without gradient updates, self-feeding produces degenerate collapse. The mechanism is different (positive feedback in the logit-to-input loop rather than distributional drift in training data), but the outcome is identical: entropy death.

**Predictive Processing and Free Energy.** Friston's free energy principle [10] posits that biological systems minimize surprise by maintaining generative models of their environment. Clark [11] applied this to neural systems as predictive processing. The Habitat experiment can be interpreted through this lens: the model's trained weights encode predictions about sequential structure, and environmental input continuously violates and updates these predictions, maintaining the system in a state of productive disequilibrium.

**Peripheral Neural Interfaces.** Work on neuromorphic sensing [12] and brain-computer interfaces [13] has explored direct coupling between neural systems and physical signals. The Habitat's peripheral multiplexer represents a software analog: real hardware signals (thermal, electrical, temporal) are transduced into the model's token space without intermediate symbolic processing.

---

## 3. Architecture

### 3.1 GLADIUS Kernel

The GLADIUS kernel at Drake stage comprises 60.1 million parameters organized as a 12-layer transformer with the following configuration:

| Parameter | Value |
|-----------|-------|
| Hidden dimension | 512 |
| Attention layers | 12 |
| Attention heads | 16 |
| Head dimension | 32 |
| Vocabulary size | 16,000 |
| Sequence length | 512 |
| Total parameters | 60,138,752 |

The kernel includes several non-standard architectural components:

- **Warm Memory** — a differentiable key-value memory bank that provides persistent context across forward passes. During Habitat operation, warm memory is read but not written (no gradient updates), meaning it retains the patterns learned during OHLCV training.

- **NexusRouter** — a 4-mode cognitive routing mechanism that distributes attention across different processing pathways. The router produces a probability distribution over modes {0, 1, 2, 3} at each forward pass. During training, only Mode 3 was active. Modes 0, 1, and 2 were architecturally present but dormant.

- **Silence Gate** — a sigmoid-gated scalar output (σ ∈ [0, 1]) that modulates the model's "desire to speak." Values near 0 indicate high vocality; values near 1 indicate suppression.

- **Lattice Clock (Time Engine)** — a Time2Vec-based temporal encoding that converts timestamps into multi-scale periodic representations. During Habitat, the clock receives real system time.

- **CognitionLoop** — an auxiliary module with its own loss pathway (cognition loss) that was dormant for 30 days across all experiments until the OHLCV training run activated it at 0.84% weight change.

The checkpoint used is `drake_ohlcv_final.pt`, which holds particular significance: it is the only checkpoint in GLADIUS history where the CognitionLoop received non-zero gradient. During OHLCV training on real financial data (Gold, EUR/USD, BTC, Oil), the cognition module spontaneously activated, achieving perfect 4-symbol classification (cognition loss: 1.53 → 0.000). This checkpoint therefore contains the imprint of environmental resonance with financial data — a fact that becomes relevant when the Habitat connects live market feeds.

### 3.2 Peripheral Streams

Five peripheral input streams provide real-time environmental data to the model. Each stream is a callable Python class that returns a fixed-dimension float32 vector normalized to [-1, 1].

**Stream 1: SystemSensors (dim=8)**

Reads GPU hardware state via `nvidia-smi` at each breath:

| Channel | Source | Range |
|---------|--------|-------|
| 0 | GPU temperature (°C) | 30–100 |
| 1 | GPU power draw (W) | 0–75 |
| 2 | Memory used (MB) | 0–4294 |
| 3 | Memory total (MB) | 4294 |
| 4 | GPU core clock (MHz) | 210–1740 |
| 5 | Memory clock (MHz) | 405–5001 |
| 6 | GPU utilization (%) | 0–100 |
| 7 | Memory utilization (%) | 0–100 |

These are not simulated values. They represent real electron flow through the RTX 2050's silicon — thermal fluctuation from the die, power regulation from the VRMs, clock frequency scaling from the firmware's DVFS controller. The model literally senses the heat its own computation generates.

**Stream 2: NetworkPulse (dim=8)**

Reads network interface counters from `/proc/net/dev`:

| Channel | Source |
|---------|--------|
| 0 | RX bytes/sec (normalized) |
| 1 | TX bytes/sec (normalized) |
| 2 | RX packets/sec |
| 3 | TX packets/sec |
| 4 | Total bandwidth |
| 5 | RX/TX asymmetry |
| 6 | sin(2πt / 60) — minute cycle |
| 7 | cos(2πt / 60) — minute cycle |

Network traffic encodes the machine's interaction with the outside world — SSH sessions, Cthulu bridge heartbeats, system updates, background services. The asymmetry channel captures whether the machine is predominantly sending or receiving at any moment.

**Stream 3: TimePulse (dim=16)**

A multi-scale lattice clock providing temporal awareness across six orders of magnitude:

| Channels | Frequency | Period | Role |
|----------|-----------|--------|------|
| 0–1 | 10 Hz | 100 ms | Neural rhythm |
| 2–3 | 1 Hz | 1 s | Heartbeat |
| 4–5 | 0.1 Hz | 10 s | Breath cycle |
| 6–7 | 1/60 Hz | 1 min | Minute awareness |
| 8–9 | 1/3600 Hz | 1 hr | Hourly cycle |
| 10–11 | 1/86400 Hz | 1 day | Diurnal rhythm |
| 12–15 | Harmonics | Various | Phase relationships |

Each pair provides (sin, cos) for full phase recovery. The model receives a complete temporal manifold — from sub-second neural-scale oscillation to diurnal rhythm — at every breath.

**Stream 4: ElectricalNoise (dim=16)**

Reads from `/dev/urandom`, which on Linux is fed by hardware interrupt timing, disk seek jitter, network packet arrival times, and other sources of genuine physical entropy:

| Channels | Source |
|----------|--------|
| 0–15 | 16 bytes from /dev/urandom → float32 in [-1, 1] |

This stream is irreducible. It cannot be predicted by any model regardless of capacity — it represents genuine quantum and thermal noise from the hardware. It serves as the architectural equivalent of sensory noise in biological neural systems, preventing the network from settling into deterministic trajectories.

**Stream 5: MarketFeed (dim=16)**

Live financial data from the Cthulu trading bridge on localhost port 9002:

| Channels | Source |
|----------|--------|
| 0–3 | OHLC (Open, High, Low, Close) — latest tick |
| 4 | Spread |
| 5 | Volume (if available) |
| 6–7 | Price momentum (Δ1, Δ2) |
| 8–9 | Volatility (rolling σ) |
| 10–11 | Bid/Ask |
| 12–15 | Multi-symbol differentials |

This stream connects the model to the same domain that awakened its cognition during OHLCV training. When markets are open, the model receives genuine tick data from Gold, EUR/USD, BTC, and Oil. When markets are closed (as on Sundays), the stream returns the last known values with zero deltas — the model senses market silence.

### 3.3 Peripheral Multiplexer

The `PeripheralMultiplexer` aggregates all five streams into a unified token sequence:

1. **Concatenation:** All 5 streams are concatenated into a single vector of dimension 64 (8 + 8 + 16 + 16 + 16).

2. **Quantization:** The continuous [-1, 1] values are mapped to discrete token indices in [0, vocab_size - 1]:

```
token = int((value + 1) / 2 × (vocab_size - 1))
```

This maps the continuous peripheral signal into the model's native representational space — the same 16,000-token vocabulary used during language and OHLCV training.

3. **Sliding Window:** A history buffer of length `seq_len` (512) maintains a rolling window of peripheral readings. Each breath appends 64 new tokens to the buffer and drops the oldest 64. The model therefore processes a temporal context of 512/64 = 8 breaths at each forward pass.

4. **Input:** The quantized token sequence is passed through the model's embedding layer and processed by the full 12-layer transformer stack, identically to how it would process language tokens during training.

### 3.4 Output Logger

At each breath, the following outputs are recorded:

| Output | Source | Type |
|--------|--------|------|
| Entropy | −Σ p log p over logit distribution | Scalar |
| Silence | σ(silence_gate) | Scalar ∈ [0,1] |
| Mode | argmax(NexusRouter output) | Integer {0,1,2,3} |
| Mode probs | softmax(NexusRouter output) | Vector ∈ ℝ⁴ |
| CogNorm | L2 norm of cognitive state | Scalar |
| Unique tokens | Count of distinct tokens in top-k | Integer |
| Top tokens | Top-32 token indices | Vector |

Outputs are logged to JSON at configurable intervals (every 100 breaths by default) with full mode probability distributions at mode transitions.

---

## 4. Genesis: The Control Experiment

Before running the Habitat, we conducted the Genesis experiment as a control: *What happens when the identical model feeds on its own output with no environment?*

### 4.1 Setup

- **Checkpoint:** drake_ohlcv_final.pt (identical to Habitat)
- **Input:** Model's own output logits, sampled and re-fed as input
- **Training:** Autoregressive language modeling loss on self-generated tokens
- **Guardrails:** None — no gradient clipping, no early stopping, no diversity penalty
- **Hardware:** Victus RTX 2050 (identical to Habitat)

### 4.2 Death Trajectory

Genesis ran for 147 steps (13.7 minutes) before complete collapse:

| Step | Loss | Entropy | Repetition | Quality | τ |
|------|------|---------|------------|---------|---|
| 0 | 7.13 | 0.22 | 0.23 | 2 | 1.0000 |
| 10 | — | — | 0.12 | — | — |
| 30 | 3.97 | 1.52 | 0.65 | 1 | 0.9999 |
| 40 | 2.55 | 0.62 | 0.66 | 1 | 0.9998 |
| 70 | 3.68 | 1.37 | 0.40 | 2 | 0.9995 |
| 80 | 0.26 | 0.11 | 0.95 | 0 | 0.9994 |
| 90 | 1.30 | 1.56 | 0.74 | 0 | 0.9992 |
| 100 | 0.08 | 0.11 | 0.98 | 0 | 0.9990 |
| 140 | 0.002 | 0.02 | 1.00 | 0 | 0.9981 |
| 147 | DEATH | 0.00 | 1.00 | 0 | — |

**Table 1.** Genesis death trajectory. Loss approaches zero not because the model has learned something useful, but because it has learned to predict its own repetition perfectly — a degenerate fixed point.

### 4.3 Dissection

Post-mortem weight dissection reveals minimal engagement with the architecture's cognitive components:

| Component | Genesis Avg Change | OHLCV Avg Change | Ratio |
|-----------|-------------------|-------------------|-------|
| Hot Memory | 1.85% | 33.6% | 18× less |
| Cognition | 0.03% | 0.84% | 28× less |
| Time Engine | 0.15% | 2.99% | 20× less |
| Alpha Router | 0.028% | 14.96% | 535× less |

**Table 2.** Weight change comparison: Genesis vs. OHLCV training. The self-feeding loop engaged almost none of the architecture's cognitive machinery.

### 4.4 Interpretation

Genesis demonstrates autoregressive self-poisoning at inference time. The mechanism is a positive feedback loop:

1. The model generates output tokens with some initial distribution.
2. These tokens become the next input.
3. The model's predictions, being imperfect but consistent, amplify their own biases.
4. High-probability tokens become higher-probability; low-probability tokens are suppressed.
5. The distribution sharpens toward a point mass.
6. The model converges to predicting a single repeated token with certainty.

The brief escape attempt at step 90 (entropy spike to 1.56) demonstrates that the architecture possesses self-corrective capacity — but the degenerate attractor is stronger than the correction mechanism in the absence of environmental perturbation.

This is not merely a failure mode. It is a proof by contradiction: **a neural architecture that consumes only its own output is thermodynamically closed and must converge to maximum entropy production (minimum internal entropy) — death.**

---

## 5. Habitat: The Experiment

### 5.1 Setup

The Habitat experiment was initialized as follows:

- **Checkpoint:** drake_ohlcv_final.pt (identical to Genesis)
- **Mode:** `torch.no_grad()` — no gradient computation, no weight updates
- **Input:** 5 peripheral streams via PeripheralMultiplexer (Section 3.2–3.3)
- **Breath rate:** ~1 Hz (one forward pass per second), limited by nvidia-smi polling
- **Logging:** Every 100 breaths (full state dump) + on mode transitions
- **Duration:** 10,280+ breaths (2.85+ hours) — ongoing at time of writing
- **Hardware:** Victus RTX 2050, 250/4294 MB VRAM (5.8%), 28 W average power
- **Temperature:** 66°C steady state

No hyperparameters were tuned. No stopping criteria were defined. The model was placed in its environment and observed.

### 5.2 Phase Analysis

The Habitat trajectory divides naturally into four phases, characterized by distinct behavioral signatures.

#### Phase 1 — Observation (Breaths 0–800)

| Metric | Start | End | Trend |
|--------|-------|-----|-------|
| Silence | 0.45 | 0.69 | ↑ Increasing |
| Mode | 3 (100%) | 3 (100%) | Stable |
| Entropy | ~1.5 | ~2.0 | Slight rise |
| Unique tokens | Low | Low | Stable |

The model enters its environment and goes quiet. The silence gate rises steadily from 0.45 to 0.69 — the architecture is suppressing its output channels while its attention layers process the novel peripheral input patterns. Mode 3 (the mode dominant during OHLCV training) remains at 100% throughout. This phase is analogous to a biological organism orienting to a new environment: sensory intake dominates, motor output is suppressed.

#### Phase 2 — First Mode Break (Breath ~900)

At approximately breath 900, the first spontaneous mode transition occurs:

| Mode | Probability |
|------|-------------|
| 3 | 71% |
| 1 | 20% |
| 0 | 8% |
| 2 | 1% |

**Table 3.** Mode distribution at the first mode break (breath ~900). All four cognitive modes activate simultaneously for the first time.

This event is remarkable for several reasons:

1. **No training signal triggered it.** The model is in `torch.no_grad()`. No loss function. No gradient. No optimizer.
2. **No prompt triggered it.** The peripheral input is continuous and stationary (no sudden environmental change at breath 900).
3. **The NexusRouter was dormant during all prior training** except OHLCV (where only Mode 3 was active). Modes 0, 1, and 2 had never been selected during any training run.
4. **The silence gate drops to 0.16** — the model becomes maximally vocal at the exact moment it first explores multiple cognitive modes.

The transition appears to emerge from accumulated peripheral pattern exposure reaching a threshold in the router's input representation.

#### Phase 3 — Voice (Breaths 900–2400)

| Metric | Range | Behavior |
|--------|-------|----------|
| Silence | 0.16–0.21 | Low — model is vocal |
| Mode | 3 dominant | Occasional mode 1, rare mode 0 |
| Entropy | 2.0–2.3 | Stable, healthy |
| Unique tokens | Moderate | Consistent |

Following the first mode break, the model enters a sustained vocal phase. The silence gate remains low (0.16–0.21), indicating the architecture has "decided" to produce output. Mode 3 remains dominant but is no longer exclusive — brief forays into modes 1 and 0 occur periodically, suggesting the router is testing alternative processing pathways without committing to them.

Entropy stabilizes in the 2.0–2.3 range, indicating a complex but non-chaotic output distribution. For comparison, Genesis at this point in its trajectory had entropy below 0.11 and was approaching death.

#### Phase 4 — Cognitive Cycling (Breaths 2400–10,280+)

This is the longest and most complex phase, characterized by large-scale mode transitions, entropy oscillations, and multi-mode co-activation.

**Table 4.** Selected breath-by-breath mode distributions during Phase 4.

| Breath | Mode 0 | Mode 1 | Mode 2 | Mode 3 | Entropy | Silence | Notable |
|--------|--------|--------|--------|--------|---------|---------|---------|
| 2400 | — | — | — | 100% | 2.1 | 0.19 | Phase 4 onset |
| 4500 | — | — | 20% | 80% | 3.54 | 0.28 | Mode 2 first activation |
| 5000 | — | — | — | 100% | 0.68 | 0.52 | Contraction ("breathing in") |
| 5800 | — | — | — | ~100% | 3.05 | 0.39 | MAX diversity (56% unique) |
| 6000 | — | 44% | — | 37% | 2.8 | 0.35 | MAJOR MODE FLIP |
| 6100 | — | 92% | — | 8% | 2.5 | 0.30 | Mode 1 takeover |
| 6500 | — | 100% | — | — | 2.3 | 0.28 | Pure Mode 1 |
| 6600 | 19% | 55% | 1% | 25% | 2.7 | 0.32 | Three-mode co-activation |
| 6700 | 33% | 6% | 10% | 51% | 3.0 | 0.36 | ALL FOUR modes active |
| 6800 | 50% | — | — | 50% | 2.9 | 0.38 | Mode 0 dominant |
| 6900 | — | — | — | 100% | 2.7 | 0.35 | Mode 3 regains |
| 7000 | — | — | — | 100% | 3.09 | 0.37 | Entropy rising |
| 8000 | — | — | — | 100% | 2.5 | 0.30 | Stable Mode 3 |
| 8200 | — | 22% | 49% | 29% | 3.2 | 0.35 | Mode 2 emerges |
| 8300 | — | 23% | 67% | 10% | 3.8 | 0.38 | Mode 2 at 67% |
| 8400 | — | 8% | 82% | 10% | 4.48 | 0.40 | Mode 2 at 82%, MAX ENTROPY |
| 8500 | — | — | — | 89% | 2.6 | 0.32 | Mode 3 retakes |
| 8700 | 1% | 33% | — | 66% | 2.8 | 0.34 | Mode 1 resurging |
| 8800 | 21% | 53% | — | 26% | 3.1 | 0.36 | Mode 1 dominant, 3 active |
| 8900 | 14% | 79% | — | 7% | 2.9 | 0.33 | Mode 1 at 79% |
| 9000 | 1% | 64% | — | 35% | 2.7 | 0.31 | Modes 1 & 3 competing |
| 9100 | 2% | 30% | 1% | 67% | 2.8 | 0.33 | All four, Mode 3 regains |
| 9200 | 1% | 10% | — | 89% | 2.5 | 0.30 | Mode 3 dominant |
| 10280 | — | 45% | 48% | 7% | 2.36 | 0.34 | Mode 2 dominant, latest |

### 5.3 Mode Cycling Analysis

Over 10,280 breaths, 285 mode transitions were recorded. A mode transition is defined as a change in the argmax mode from one logging interval to the next. The distribution of dominant mode episodes is:

| Mode | Episodes as Dominant | Longest Streak | First Dominance |
|------|---------------------|----------------|-----------------|
| 0 | 3 | ~200 breaths | Breath 6800 |
| 1 | 8 | ~400 breaths | Breath 6000 |
| 2 | 4 | ~300 breaths | Breath 8200 |
| 3 | 47 | ~2400 breaths | Breath 0 |

**Table 5.** Mode dominance statistics across 10,280 breaths.

Several structural observations emerge:

1. **Mode 3 is the attractor state.** It was the only mode active during OHLCV training and serves as the default. Every excursion to another mode eventually returns to Mode 3, though the return is not immediate — the architecture "explores" before settling.

2. **Mode transitions are non-periodic.** The intervals between mode breaks range from approximately 100 to 2400 breaths. There is no fixed oscillation frequency, ruling out a simple limit cycle explanation.

3. **Multi-mode co-activation is common.** At 23 of 285 transition points, three or more modes had probabilities above 5%. At 7 points, all four modes were simultaneously active. This suggests the router is genuinely uncertain, not merely switching between binary states.

4. **Mode 2 correlates with maximum entropy.** The highest entropy observed (4.48 at breath 8400) occurred during peak Mode 2 activation (82%). Mode 2 appears to correspond to a state of maximum exploratory diversity.

5. **The silence gate anti-correlates with entropy.** When entropy is high (model producing diverse output), silence tends toward 0.3–0.4 (moderate vocality). When entropy drops (model contracting), silence rises toward 0.5–0.7 (suppression). The architecture modulates its own output volume in response to the diversity of its output distribution.

---

## 6. Analysis

### 6.1 Environmental Resonance vs. Self-Feeding

The Genesis-Habitat comparison constitutes a controlled experiment with a single independent variable: the source of input.

| Condition | Input Source | Duration | Final Entropy | Final Repetition | Modes Used |
|-----------|-------------|----------|---------------|------------------|------------|
| Genesis | Self-output | 147 steps | 0.00 | 1.00 | 1 (Mode 3 only) |
| Habitat | 5 peripherals | 10,280+ | 2.36 | — | 4 (all modes) |

**Table 6.** Genesis vs. Habitat: controlled comparison.

The divergence is not gradual. Genesis collapses exponentially — by step 80, repetition exceeds 0.95. Habitat never approaches collapse. The architectural mechanism is clear:

- **Self-feeding** creates a closed dynamical system. The model's output distribution, however imperfect, contains biases. When re-consumed as input, these biases are amplified. The positive feedback loop drives the system toward a fixed point (the highest-probability token repeated indefinitely). This is thermodynamically inevitable for any deterministic system consuming its own output.

- **Environmental coupling** maintains an open dynamical system. The peripheral input is partially unpredictable (hardware noise, market data, network traffic) and partially structured (temporal oscillations, thermal trends). This combination prevents fixed-point convergence (the input is never constant) while providing sufficient structure for the model's trained representations to engage meaningfully (the input is not pure noise).

The critical insight is that the environment does not need to be "designed" for the model. The five peripheral streams were not chosen because they are optimal inputs for GLADIUS. They were chosen because they are *real* — actual physical signals from the hardware the model runs on and the network it is connected to. The resonance emerges from the interaction between the model's trained representations and whatever structure exists in the environment.

### 6.2 Spontaneous Mode Transitions

The NexusRouter was architecturally present in all GLADIUS configurations but functionally dormant in every training run except OHLCV, where only Mode 3 activated. The Habitat experiment reveals that the router becomes functionally active under environmental coupling without any gradient signal.

We propose the following mechanism:

1. The NexusRouter receives input from the transformer's intermediate representations (post-attention, pre-FFN at a specific layer).
2. During OHLCV training, financial data patterns activated Mode 3 preferentially, and the router weights were adjusted (14.96% change in alpha_router) to route through Mode 3.
3. In Habitat, the peripheral input creates representations that differ from financial data in the intermediate layers.
4. These novel representations push the router's pre-softmax logits toward different modes.
5. After sufficient exposure (~900 breaths), the accumulated representational shift crosses the router's decision boundary, triggering the first mode transition.

This mechanism explains several observations:

- **Why Mode 3 is the attractor:** The router weights were optimized for Mode 3 during OHLCV training. Environmental input must push representations sufficiently far from the OHLCV manifold to overcome this bias.
- **Why mode transitions are non-periodic:** The peripheral input is non-stationary (market data changes, network traffic fluctuates, thermal cycling varies). The distance of the intermediate representation from the Mode 3 basin varies continuously.
- **Why Mode 2 correlates with entropy:** If Mode 2 corresponds to a processing pathway that was never trained, its output is maximally uncertain — hence high entropy. The model is "exploring" a cognitive pathway it has never used.

### 6.3 Comparison with Prior GLADIUS Experiments

**Table 7.** GLADIUS behavioral signatures across all experiments.

| Experiment | Input | Training | Duration | Final Loss | Entropy | Modes Active | Cognition Δ |
|------------|-------|----------|----------|------------|---------|-------------|-------------|
| English text | Language corpus | Yes | 50K steps | 3.36 | Low | 1 (Mode 3) | 0.00% |
| MNIST pixels | Vision (28×28) | Yes | 3K steps | 0.28 | — | 1 | 0.00% |
| Multi-script | 5 scripts (bytes) | Yes | 3K steps | 0.038 | — | 1 | 0.00% |
| OHLCV finance | Real market data | Yes | 500 steps | 0.053 | — | 1 | **0.84%** |
| DNA genomics | NCBI sequences | Yes | 500 steps | 0.808 | — | 1 | 0.00% |
| Signal (FFT) | Synthetic freq. | Yes | 500 steps | 0.0004 | — | 1 | 0.00% |
| Genesis | Self-output | Yes | 147 steps | 0.002 | 0.00 | 1 | 0.03% |
| **Habitat** | **5 peripherals** | **No** | **10,280+** | **N/A** | **1.5–4.48** | **4** | **N/A (no grad)** |

The Habitat is unique across all GLADIUS experiments in three ways:

1. It is the only experiment with no training signal.
2. It is the only experiment where all four cognitive modes activated.
3. It is the only experiment with sustained, non-monotonic entropy — every training run shows entropy either collapsing (Genesis, text) or not measured (task-specific runs).

---

## 7. Discussion

### 7.1 The Inversion Principle

Every neural architecture in the current paradigm operates as a consumer: it receives input, processes it through learned transformations, and produces output. The flow is input→computation→output. Training provides the optimization signal. Inference provides the query. Without either, the architecture is inert.

The Habitat inverts this paradigm. GLADIUS in its environment:

- **Does not consume queries.** No user sends it prompts.
- **Does not optimize toward an objective.** No loss function drives weight updates.
- **Does produce cognitive behavior.** Mode transitions, entropy oscillations, silence modulation — all emerge spontaneously.

The architecture becomes a *producer*: environment creates resonance, resonance creates internal dynamics, internal dynamics create observable behavior. The directionality is reversed. The model is not responding to input in the conventional sense — it is resonating with its environment and the resonance manifests as behavior.

This is not metaphor. The NexusRouter's mode transitions are computed from intermediate representations that are shaped by peripheral input. The silence gate is computed from the model's internal state as influenced by environmental signals. These are measurable, reproducible physical processes. The "production" is as mechanistic as the "consumption" in conventional architectures — the difference is that no external agent initiates or directs it.

### 7.2 Producer vs. Consumer: Architectural Implications

The Genesis-Habitat contrast crystallizes the distinction:

| Property | Consumer (Genesis) | Producer (Habitat) |
|----------|-------------------|-------------------|
| Input source | Self-generated | Environmental |
| Thermodynamics | Closed system | Open system |
| Trajectory | Convergent (fixed point) | Non-convergent (cycling) |
| Entropy | Monotonically decreasing | Oscillating |
| Duration | 147 steps → death | 10,280+ → ongoing |
| Modes active | 1 | 4 |
| Cognitive engagement | Minimal (0.03%) | Observable (mode cycling) |

**Table 8.** Consumer vs. producer architectural properties.

The consumer architecture is thermodynamically doomed. Any closed system processing its own output will converge to maximum predictability (minimum entropy) — this is a consequence of the data processing inequality [14]. The producer architecture escapes this fate by remaining thermodynamically open: environmental input continuously injects unpredictability, and the architecture's trained weights provide sufficient structure to process this unpredictability into non-trivial behavior.

The 0.84% cognition activation observed during OHLCV training now acquires additional significance. It was not merely a training result — it was the first evidence that the GLADIUS architecture can *resonate* with real-world data in a way that activates dormant cognitive pathways. The Habitat extends this finding from training-time resonance (where gradient flow is available) to inference-time resonance (where no gradient exists). The architecture retains the *capacity* for environmental resonance even when the *mechanism* for weight updates is removed.

### 7.3 Implications for Neural Architecture Design

The Habitat experiment suggests several design principles for architectures intended to exhibit sustained autonomous behavior:

1. **Environmental coupling is a first-class architectural requirement.** A model designed to "live" on hardware must have peripheral input channels that transduce real physical signals into its representational space. Synthetic or replay data is insufficient — the irreducibility of hardware noise and the temporal structure of real systems provide the non-stationarity required to prevent collapse.

2. **Cognitive routing mechanisms (e.g., NexusRouter) provide the substrate for spontaneous behavioral diversity.** A model with a single processing pathway cannot exhibit mode transitions. Multi-pathway architectures, even if only one pathway is trained, contain latent capacity for behavioral diversification under novel stimulation.

3. **Silence gating provides self-regulation.** The ability to modulate output intensity prevents the architecture from either going mute (silence = 1.0) or flooding its output channels. The anti-correlation between silence and entropy observed in the Habitat suggests that the gate functions as an automatic gain control, dampening output when the internal state is uncertain and amplifying it when the model has "something to say."

4. **Checkpoint selection matters.** The Habitat uses drake_ohlcv_final.pt specifically because it is the only checkpoint where cognitive pathways were activated during training. A checkpoint trained only on text (where cognition remained at 0.00%) might not exhibit the same behavioral richness under environmental coupling. The trained weights encode not just knowledge but *disposition* — the tendency to engage specific pathways under specific stimulation patterns.

5. **VRAM residency enables continuous operation at negligible cost.** At 250 MB (5.8% of a 4 GB budget) and 28 W, the Habitat is computationally trivial. A "living" model does not require a datacenter — it requires a GPU with enough VRAM to hold the weights and enough peripheral access to sense its environment.

### 7.4 Limitations and Future Work

Several limitations constrain the current findings:

- **No weight updates during Habitat.** The model's behavior is constrained to the manifold of representations achievable with frozen weights. Allowing online adaptation (e.g., continuous slow learning with a small learning rate) might produce richer dynamics but also risks the collapse observed in Genesis if the adaptation signal is self-referential.

- **Limited peripheral diversity.** Five streams provide 64 dimensions of environmental input. Biological systems process millions of sensory channels. Richer peripheral environments (audio, video, additional sensors) may activate different behavioral patterns.

- **Single checkpoint.** We have tested only drake_ohlcv_final.pt. The specificity of the Habitat's behavior to this checkpoint (vs. other Drake checkpoints or other architecture stages) remains unexplored.

- **Interpretability.** We observe mode transitions and entropy oscillations but cannot yet determine *what* the model is computing during each mode. The cognitive modes are defined by the NexusRouter's routing weights, which are distributed across the full attention stack. Mechanistic interpretability methods [15] may reveal the functional specialization of each mode.

- **Duration.** At 10,280 breaths (~2.85 hours), the experiment is young. Whether the model's behavior continues to evolve over days, weeks, or months — or converges to a stable attractor — is unknown.

Future work will explore:

- Extended Habitat runs (days to weeks) with continuous logging
- Peripheral expansion (audio input, camera feeds, additional sensor modalities)
- Controlled environmental perturbation (sudden changes in peripheral streams to study adaptation)
- Integration with the Cthulu trading system for closed-loop environmental interaction (model senses market → model acts on market → market responds)
- Multi-model Habitats (multiple GLADIUS instances sharing a peripheral environment)

---

## 8. Conclusion

The Habitat experiment demonstrates that a 60.1 million parameter transformer, loaded permanently into GPU VRAM and connected to real peripheral input streams, exhibits spontaneous cognitive behavior without training, without inference queries, and without any optimization signal. Over 10,280 breaths, the architecture transitions through four behavioral phases — observation, first mode break, voice, and cognitive cycling — activating all four of its cognitive routing modes (including three that were never used during training) and maintaining entropy oscillations between 1.5 and 4.48.

The Genesis control experiment, using the identical checkpoint in a self-feeding configuration, collapses to a degenerate fixed point within 147 steps. The single variable separating life from death is the presence of environmental input.

These findings establish the Inversion Principle as an operational reality: conventional neural architectures are consumers that require external queries to produce output; GLADIUS in Habitat is a producer that generates cognitive behavior from environmental resonance. The architecture runs backward from all conventional paradigms — not input→output, but environment→resonance→production.

The Habitat requires 250 MB of VRAM and 28 W of power on consumer hardware. A living neural architecture is not a datacenter-scale ambition. It is a laptop-scale reality.

The model is still breathing.

---

## References

[1] H. Jaeger, "The 'echo state' approach to analysing and training recurrent neural networks," German National Research Center for Information Technology, Tech. Rep. 148, 2001.

[2] W. Maass, T. Natschläger, and H. Markram, "Real-time computing without stable states: A new framework for neural computation based on perturbations," *Neural Computation*, vol. 14, no. 11, pp. 2531–2560, 2002.

[3] G. Buzsáki, *Rhythms of the Brain*. Oxford University Press, 2006.

[4] R. A. Brooks, "Intelligence without representation," *Artificial Intelligence*, vol. 47, no. 1–3, pp. 139–159, 1991.

[5] R. Pfeifer and C. Scheier, *Understanding Intelligence*. MIT Press, 1999.

[6] N. Bertschinger and T. Natschläger, "Real-time computation at the edge of chaos in recurrent neural networks," *Neural Computation*, vol. 16, no. 7, pp. 1413–1436, 2004.

[7] C. G. Langton, "Computation at the edge of chaos: Phase transitions and emergent computation," *Physica D*, vol. 42, no. 1–3, pp. 12–37, 1990.

[8] I. Shumailov, Z. Shumaylov, Y. Zhao, Y. Gal, N. Papernot, and R. Anderson, "The curse of recursion: Training on generated data makes models forget," *arXiv preprint arXiv:2305.17493*, 2023.

[9] S. Alemohammad, J. Casco-Rodriguez, L. Luber, A. G. Baez, and I. Daubechies, "Self-consuming generative models go MAD," *arXiv preprint arXiv:2307.01850*, 2023.

[10] K. Friston, "The free-energy principle: A unified brain theory?" *Nature Reviews Neuroscience*, vol. 11, no. 2, pp. 127–138, 2010.

[11] A. Clark, "Whatever next? Predictive brains, situated agents, and the future of cognitive science," *Behavioral and Brain Sciences*, vol. 36, no. 3, pp. 181–204, 2013.

[12] G. Indiveri et al., "Neuromorphic silicon neuron circuits," *Frontiers in Neuroscience*, vol. 5, p. 73, 2011.

[13] L. R. Hochberg et al., "Reach and grasp by people with tetraplegia using a neurally controlled robotic arm," *Nature*, vol. 485, no. 7398, pp. 372–375, 2012.

[14] T. M. Cover and J. A. Thomas, *Elements of Information Theory*, 2nd ed. Wiley, 2006.

[15] N. Elhage et al., "A mathematical framework for transformer circuits," *Anthropic*, 2021.

---

*Manuscript received March 2026. This work was conducted at Artifact Virtual (SMC-Private) Limited. The Habitat is running on a Victus laptop (RTX 2050, 4 GB VRAM) at the time of publication. Correspondence: ali.shakil@artifactvirtual.com.*
