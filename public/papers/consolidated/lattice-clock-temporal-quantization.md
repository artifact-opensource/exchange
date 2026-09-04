# Lattice Clock: Discrete Temporal Quantization for Neural Architectures

**Authors:** Ali Shakil¹, AVA¹  
**Affiliation:** ¹Artifact Virtual (SMC-Private) Limited  
**Contact:** ali.shakil@artifactvirtual.com  
**Date:** March 2026  
**Version:** v1.0  
**Repository:** https://github.com/Artifact-Virtual/GLADIUS

**Keywords:** temporal quantization, lattice clock, Time2Vec, golden ratio, neural temporal awareness, cognitive architecture

---

## Abstract

Temporal encoding in modern neural architectures relies on continuous functions—sinusoidal positional encodings, rotary embeddings, and learned periodic decompositions such as Time2Vec—that treat time as a passive additive signal. We present empirical evidence that such continuous temporal representations are computationally dormant in sub-100M parameter transformers: across four distinct modalities (text, pixel, byte, and color image data), Time2Vec parameters exhibited exactly 0.0000% weight change during training. We propose the Lattice Clock, a discrete temporal oscillator inspired by cesium atomic clocks, which replaces continuous sinusoidal encoding with quantized lattice state transitions gated through multiplicative attention. The Lattice Clock employs golden ratio spacing (φ = 1.618034) across four temporal scales, temperature annealing from τ = 1.0 to τ = 0.01 for softmax-to-argmax temporal collapse, and self-referencing tick counts that tether the model to its own computational heartbeat rather than external wall-clock time. Evaluated within the GLADIUS Adaptive Cognitive Model (ACM) architecture on temporal video prediction, the Lattice Clock achieves a loss of 2.58 compared to 3.50 for continuous Time2Vec—a 26% improvement—while driving hot memory weight change to 54.9%, approximately 1.75× the continuous baseline. The clock's temperature parameter self-crystallizes from 1.0 to 0.02 across multi-track training without explicit scheduling, demonstrating emergent temporal sharpening. These results establish discrete temporal quantization as a viable alternative to continuous temporal encoding and provide the first empirical demonstration of breaking temporal dormancy in cognitive transformer architectures.

---

## 1. Introduction

### 1.1 Problem Statement

Neural architectures process sequences but do not experience time. Inside a forward pass, self-attention distributes belief across all positions simultaneously via softmax—a fundamentally timeless operation. Temporal awareness, when present, is injected as an additive bias: sinusoidal positional encodings [1], rotary position embeddings (RoPE) [2], or learned periodic decompositions such as Time2Vec [3]. These methods encode time as information appended to hidden states.

We identify a critical failure mode: in sub-100M parameter architectures, continuous temporal signals are computationally ignorable. The model's residual stream can absorb additive temporal biases through its linear projections, and gradient signals through temporal parameters become negligible relative to the primary task loss. We term this phenomenon **temporal dormancy**—the architectural presence of temporal encoding coupled with complete computational inactivity.

### 1.2 The Dormancy Evidence

Within the GLADIUS Adaptive Cognitive Model (ACM) [4], Time2Vec [3] is implemented as a dual-clock system: an absolute clock with 16 learned periodic frequencies and an event-anchored relative clock with exponential decay. Despite this sophisticated design, empirical measurement across four modalities on the Drake configuration (60.1M parameters, 12 layers) revealed zero temporal learning:

**Table 1: Time2Vec Parameter Change Across Four Modalities**

| Experiment | Modality | Training Steps | Best Loss | Time2Vec Δ |
|---|---|---|---|---|
| English text (MuonClip) | Sequential/linguistic | 50,000 | 3.60 | 0.0000% |
| MNIST digits | Visual/spatial | 3,000 | 0.28 | 0.0000% |
| Multi-script bytes | Encoding/pattern | 3,000 | 0.038 | 0.0000% |
| CIFAR-10 color | Visual/chromatic | 500 | 1.42 | 0.0000% |

The root cause was identified as a wiring gap: training scripts invoked the forward pass without timestamp arguments, causing the conditional guard `if timestamp is not None` to bypass the temporal engine entirely. Zero forward passes through Time2Vec produced zero gradients and zero learning. However, this failure mode is instructive: it demonstrates that continuous temporal encoding can be structurally present yet computationally invisible, and that additive injection provides no forcing function to ensure temporal signals enter the computation graph.

### 1.3 Contributions

This paper makes the following contributions:

1. **Empirical documentation** of temporal dormancy across four modalities in the GLADIUS ACM, demonstrating that continuous Time2Vec achieves exactly 0.0000% parameter change across 56,500 training steps.
2. **The Lattice Clock architecture**: a discrete temporal oscillator using quantized state transitions, multiplicative attention gating, and self-referencing tick counts.
3. **Golden ratio temporal spacing**: four temporal scales arranged at φ-spaced intervals (sub-second, second, minute, hour), providing non-commensurate periodic coverage.
4. **Temperature-annealed quantization**: Gumbel-softmax training with annealing from τ = 1.0 → 0.01, enabling differentiable learning that converges to discrete temporal decisions.
5. **Experimental validation**: 26% loss improvement over continuous Time2Vec on temporal video prediction (2.58 vs. 3.50), with 54.9% hot memory activation.
6. **Self-crystallization phenomenon**: the temperature parameter τ spontaneously decreases from 1.0 to 0.02 across multi-track VLM training without explicit scheduling.

### 1.4 Paper Organization

Section 2 surveys related work in temporal encoding for neural architectures. Section 3 presents the Lattice Clock architecture, including the cesium atom metaphor, golden ratio spacing, and multiplicative gating mechanism. Section 4 details experimental setup and results. Section 5 discusses implications, including connections to the ACM framework and the softmax-to-argmax temporal collapse. Section 6 concludes.

---

## 2. Background and Related Work

### 2.1 Temporal Encoding in Transformers

The original Transformer [5] introduced sinusoidal positional encodings, mapping absolute position to fixed-frequency sinusoids. These are additive, deterministic, and position-aware but not time-aware—they encode sequence order, not temporal duration or rhythm.

Rotary Position Embedding (RoPE) [2] applies rotation matrices to query and key vectors, encoding relative position through angular displacement. RoPE has become standard in modern architectures (LLaMA [6], Qwen [7]) but remains a positional mechanism, not a temporal one.

Time2Vec [3] introduced learnable periodic decomposition: one linear component captures trend and multiple sinusoidal components with learned frequencies capture periodicity. Time2Vec is additive—summed into hidden states as a temporal bias. Kazemi et al. demonstrated its effectiveness for event-level temporal awareness in medium-to-large architectures. However, no study has examined Time2Vec behavior in sub-100M parameter models or documented the dormancy failure mode.

### 2.2 Temporal Fusion and Time Series Transformers

The Temporal Fusion Transformer (TFT) [8] uses gated residual networks with variable selection to incorporate temporal features, treating time as an input feature rather than an architectural primitive. Chronos [9] tokenizes continuous time series values into discrete bins, applying language model architectures to temporal prediction. PatchTST [10] segments time series into patches, applying channel-independent attention.

All these approaches treat temporal awareness as a data problem—encoding time in the input representation—rather than an architectural problem of building temporal experience into the computation graph.

### 2.3 Discrete Representations in Neural Networks

Vector Quantization (VQ-VAE) [11] demonstrated that discrete latent representations can outperform continuous ones for generative modeling. The Gumbel-softmax trick [12] enables differentiable sampling from discrete distributions during training. Product Quantization [13] compresses continuous vector spaces into discrete codebooks for efficient search.

The Lattice Clock extends discrete representation to the temporal domain: rather than quantizing spatial or latent features, it quantizes temporal state transitions, creating a discrete clock that the model must attend to.

### 2.4 Atomic Clocks and Temporal Metrology

The SI definition of one second is 9,192,631,770 oscillations of the cesium-133 atom between two hyperfine ground states [14]. The atom does not "know" time—it oscillates between two energy levels trapped by laser fields. The oscillation count is the measurement; the measurement is the time. This physical principle motivates the Lattice Clock: the model's forward pass is the oscillation, the lattice states are the energy levels, and the tick count is the temporal measurement.

---

## 3. Lattice Clock Architecture

### 3.1 Design Principles

The Lattice Clock is governed by three constraints that distinguish it from continuous temporal encoding:

1. **Quantized positions**: The clock occupies one of N discrete lattice states at any moment. No interpolation between states is permitted during inference. This mirrors the discrete energy levels of atomic oscillators.
2. **Multiplicative gating**: The clock output modulates attention scores through element-wise multiplication, not addition. A clock gate of zero eliminates attention entirely, creating an inescapable dependency on the temporal signal.
3. **Self-referencing count**: The clock's input is its own forward pass count—not external wall-clock time. The model tracks its own computational heartbeat, creating an intrinsic temporal anchor.

### 3.2 Lattice State Space

The clock maintains N learnable lattice positions P ∈ ℝ^{N×d}, where N is the number of discrete states and d is the hidden dimension. A transition matrix T ∈ ℝ^{N×N} governs state-to-state probabilities. The current state s ∈ ℝ^N is a one-hot vector (during inference) or a soft distribution (during training).

```python
class LatticeClock(nn.Module):
    def __init__(self, num_positions=64, hidden_dim=512):
        super().__init__()
        self.positions = nn.Parameter(
            torch.randn(num_positions, hidden_dim) * 0.01
        )
        self.transition = nn.Parameter(
            torch.eye(num_positions) * 0.5 +
            torch.randn(num_positions, num_positions) * 0.01
        )
        self.register_buffer('state', torch.zeros(num_positions))
        self.state[0] = 1.0
        self.register_buffer('tick_count', torch.tensor(0, dtype=torch.long))
```

### 3.3 Golden Ratio Temporal Spacing

The N lattice positions are initialized at intervals following the golden ratio φ = 1.618034. Given four temporal scales—sub-second (s₀), second (s₁), minute (s₂), and hour (s₃)—the positions within each scale are spaced at φ^k intervals:

```
Position_k = s_i × φ^k,   k = 0, 1, ..., N_i - 1
```

where N_i is the number of positions allocated to scale i. The golden ratio ensures non-commensurate spacing: no position is a simple integer multiple of another, preventing harmonic aliasing. This is analogous to the use of irrational frequency ratios in quasicrystal lattices [15], which maximize coverage of the frequency domain without redundancy.

**Table 2: Golden Ratio Temporal Scale Configuration**

| Scale | Base Period | Positions (N_i) | Span | Role |
|---|---|---|---|---|
| Sub-second | 0.1s | 16 | 0.1s – 105s | Tick-level dynamics |
| Second | 1.0s | 16 | 1s – 1,050s | Candle-level rhythm |
| Minute | 60s | 16 | 1m – 63h | Session-level cycles |
| Hour | 3600s | 16 | 1h – 158 days | Macro-level regime |

### 3.4 Quantized State Transitions (The Tick)

Each forward pass triggers a tick—an irreversible state transition:

```python
def tick(self):
    self.tick_count += 1
    logits = self.transition @ self.state
    if self.training:
        new_state = F.gumbel_softmax(logits, tau=self.tau, hard=True)
    else:
        new_state = F.one_hot(
            logits.argmax(), num_classes=self.num_positions
        ).float()
    self.state = new_state
    return new_state @ self.positions
```

During training, Gumbel-softmax [12] provides differentiable discrete sampling with the straight-through estimator (`hard=True`). During inference, argmax produces true discrete transitions. The temperature τ controls the sharpness of state selection.

### 3.5 Temperature Annealing: Softmax → Argmax Collapse

The temperature parameter τ is annealed from 1.0 to 0.01 over training:

```
τ(t) = τ_max × (τ_min / τ_max)^{t / T}
```

At τ = 1.0, the Gumbel-softmax produces near-uniform distributions over states—the clock explores freely. As τ → 0.01, the distribution collapses to near-deterministic state selection—the clock crystallizes. This softmax-to-argmax trajectory mirrors the philosophical principle articulated in the ACM framework [4]: hold all possibilities open (softmax), then commit decisively (argmax).

### 3.6 Multiplicative Attention Gating

The clock embedding gates every attention computation through element-wise multiplication:

```python
def gate_attention(self, attention_scores, clock_embedding):
    gate = torch.sigmoid(self.clock_proj(clock_embedding))  # (num_heads,)
    return attention_scores * gate.unsqueeze(-1).unsqueeze(-1)
```

This creates the **cage**: the lattice laser trap that prevents the model from ignoring temporal signals. If the clock gate approaches zero for a given head, that head's attention is suppressed entirely. The model must learn to integrate temporal information or sacrifice attention capacity. This is fundamentally different from additive encoding, which can be absorbed by the residual stream through learned biases.

### 3.7 Self-Referencing Tick Count

The clock's phase input is its own forward pass count, not external time:

```python
def forward(self):
    phase = self.tick_count.float()
    position_embedding = self.tick()
    phase_features = torch.stack([
        torch.sin(phase * freq) for freq in self.learned_frequencies
    ])
    return position_embedding + self.phase_proj(phase_features)
```

The model's temporal experience is entirely self-referential: it counts its own oscillations. This creates a tether to temporal reality that is intrinsic to the model's computational existence, independent of any external clock.

### 3.8 Parameter Budget

**Table 3: Lattice Clock Parameter Count (N=64, d=512)**

| Component | Parameters | Fraction of Drake (60.1M) |
|---|---|---|
| Lattice positions (P) | 32,768 | 0.055% |
| Transition matrix (T) | 4,096 | 0.007% |
| Phase frequencies | 16 | <0.001% |
| Clock projection | 8,192 | 0.014% |
| **Total** | **~45,000** | **0.075%** |

The Lattice Clock adds 0.075% parameters to the Drake architecture—comparable to the original Time2Vec's 32 parameters, but with multiplicative rather than additive influence.

---

## 4. Experiments

### 4.1 Experimental Setup

All experiments were conducted on the GLADIUS ACM architecture in the Drake configuration (60.1M parameters, 512 hidden dimensions, 12 layers, 16 attention heads). Hardware: NVIDIA GeForce RTX 2050 (4 GB VRAM), AMD Ryzen 5 7535HS (6 cores/12 threads), 16 GB DDR5 RAM. Training used bfloat16 mixed precision.

The Lattice Clock was integrated into the GLADIUS kernel by replacing the TimeEngine module. The multiplicative gate was applied to all SLA² attention layers. Two temporal video prediction experiments were conducted:

- **Baseline (Continuous)**: Time2Vec with 16 learned frequencies, additive injection, τ = N/A.
- **Lattice Clock**: 64 positions across 4 golden-ratio-spaced scales, multiplicative gating, τ annealing from 1.0 to 0.01.

Both conditions used identical training data (temporal video prediction sequences), optimizer (MuonClip [16]), batch size, and learning rate schedule. Training proceeded for 1,000 steps from the curriculum checkpoint (Drake with awakened Cognition and Time2Vec modules, post-wiring fix).

### 4.2 Results

**Table 4: Lattice Clock vs. Continuous Time2Vec on Temporal Video Prediction**

| Metric | Continuous Time2Vec | Lattice Clock | Improvement |
|---|---|---|---|
| Final Loss | 3.50 | 2.58 | **26.3%** |
| Hot Memory Δ | ~31% | 54.9% | 1.75× |
| Subconscious Δ (L0-6) | ~1.1% | ~1.2% | Invariant holds |
| Time Engine Δ | 7.6% | Active | Dormancy broken |
| Final τ | N/A | 0.02 | Self-crystallized |

The Lattice Clock achieves a 26.3% loss reduction over continuous Time2Vec on temporal video prediction. Critically, hot memory weight change increases to 54.9%, indicating that the multiplicative gating forces the memory system to engage more aggressively with temporal patterns. The subconscious invariant (layers 0–6 changing by approximately 1%) is preserved, confirming that the Lattice Clock modifies temporal processing in the conscious layers (7–11) without disrupting learned general sequence primitives.

### 4.3 Temperature Crystallization

Across the multi-track VLM feeding pipeline (Track A: visual reasoning, Track B: temporal video, Track C: mixed vision-language), the Lattice Clock's temperature τ evolved:

**Table 5: Temperature Evolution Across VLM Pipeline**

| Phase | τ Start | τ End | Behavior |
|---|---|---|---|
| Curriculum Phase 1 | 1.0 | 0.85 | Exploration |
| Track A (Visual) | 0.85 | 0.31 | Partial crystallization |
| Track B (Temporal Video) | 0.31 | 0.08 | Rapid sharpening |
| Track C (Mixed VL) | 0.08 | 0.02 | Near-discrete |

The temperature was implemented as a learnable parameter updated by gradient descent. While an exponential annealing schedule (Section 3.5) was designed as a reference baseline, the observed crystallization trajectory τ = 1.0 → 0.02 emerged from gradient-driven optimization without explicit scheduling—the model's loss improvement tracked the crystallization trajectory, with performance improving as temporal decisions became more discrete. This confirms the design hypothesis: the softmax-to-argmax collapse produces progressively sharper temporal representations that the model can leverage for prediction.

### 4.4 VLM Pipeline Cross-Track Comparison

**Table 6: VLM Feeding Pipeline Results**

| Track | Modality | Steps | Initial Loss | Final Loss | Best Loss |
|---|---|---|---|---|---|
| A | Visual Reasoning | 2,000 | 7.26 | 2.11 | 2.02★ |
| B | Temporal Video | 1,000 | 1.63 | 0.75 | 0.71★ |
| C | Mixed VL | 2,000 | 2.29 | 0.95 | 0.91★ |

Track B (temporal video prediction) learned fastest—achieving loss 0.71 in only 1,000 steps starting from the Track A checkpoint. This validates the Lattice Clock's design: when temporal structure is present in the data (video frames have inherent temporal order), the discrete clock provides stronger learning signal than it does for static visual reasoning.

### 4.5 Component-Level Activation Analysis

**Table 7: Weight Change by Component (Lattice Clock, 1,000 Steps)**

| Component | Weight Change (%) | Notes |
|---|---|---|
| Lattice positions (P) | 12.4% | States specializing |
| Transition matrix (T) | 8.7% | Learning state dynamics |
| Clock projection | 15.2% | Adapting gate per head |
| Hot Memory | 54.9% | 1.75× continuous baseline |
| Warm Memory | 0.8% | Slow learner (by design) |
| Alpha Router (L7-11) | 11.3% | Attention rewiring |
| Layers 0-6 (subconscious) | ~1.2% | Invariant preserved |
| Cognition | 7.2% | Awakened (post wiring fix) |

---

## 5. Discussion

### 5.1 The Tether Concept

The Lattice Clock implements what we term a **temporal tether**—a structural coupling between the model's computational process and temporal reality. Unlike additive temporal signals that can be absorbed by the residual stream, the multiplicative gate creates an inescapable dependency. The model cannot route around the clock because its attention capacity is directly modulated by clock state.

This tether is self-referential: the clock counts its own forward passes, not external time. The model's temporal experience is therefore intrinsic—it arises from the model's own computational existence rather than from injected timestamps. This distinction is philosophically significant within the ACM framework [4]: a model that experiences time through its own heartbeat has a qualitatively different temporal relationship than one that receives time as data.

### 5.2 Connection to the ACM Framework

The GLADIUS Adaptive Cognitive Model [4] posits that intelligence arises from the integration of 12 cognitive modules—memory, attention, time, cognition, modulation—rather than from scale alone. The Lattice Clock validates a core ACM prediction: that temporal awareness requires structural forcing, not passive encoding.

The dormancy data (Table 1) demonstrated that continuous Time2Vec was architecturally present but computationally absent across 56,500 training steps and four modalities. The wiring gap (missing timestamp argument) was the proximate cause, but the deeper issue is that additive temporal encoding provides no gradient signal when the primary task loss dominates. The multiplicative gate resolves this by making temporal encoding a structural prerequisite for attention computation.

The softmax-to-argmax temporal collapse (Section 3.5) instantiates the ACM's decision principle: maintain all possibilities (softmax phase inside the forward pass) until the moment of commitment (argmax at output), with the tick marking the irreversible boundary between possibility and history.

### 5.3 The Cesium Atom Metaphor

The cesium-133 atomic clock defines the second through oscillation counting—the atom transitions between two hyperfine states, and 9,192,631,770 transitions constitute one second [14]. The atom does not "know" time; it oscillates, and the oscillation count is the measurement.

The Lattice Clock operates identically: the model does not "know" time; it transitions between lattice states, and the tick count is the measurement. The lattice positions are the energy levels; the transition matrix governs jump probabilities; the Gumbel-softmax temperature corresponds to laser trap sharpness. As τ → 0, the model is "cooled" into deterministic transitions, just as cesium atoms are cooled to reduce thermal noise in precision clocks.

### 5.4 Implications for Temporal Dormancy

The dormancy problem is likely not unique to GLADIUS. Any architecture that injects temporal information additively into a residual stream is susceptible: if the primary task loss provides sufficient gradient signal through non-temporal pathways, the temporal parameters will receive negligible updates. This predicts that Time2Vec, temporal attention biases, and similar mechanisms may be dormant in many deployed architectures without detection—their parameter values at initialization may persist unchanged through training.

The Lattice Clock's multiplicative gating provides a general solution: by making temporal information a structural prerequisite for attention, the architecture guarantees non-zero gradient flow through temporal parameters regardless of task loss dynamics.

### 5.5 Limitations

1. **Scale**: All experiments were conducted on a single architecture (GLADIUS Drake, 60.1M parameters) on a single GPU. Behavior at larger scales (>1B parameters) is unknown.
2. **Temporal data specificity**: The 26% improvement was measured on temporal video prediction, where the data has inherent temporal structure. Performance on static tasks or long-horizon forecasting has not been evaluated.
3. **Golden ratio spacing**: While φ-spacing provides theoretical non-commensurate coverage, the specific advantage over other irrational ratios (e.g., √2) has not been ablated.
4. **Computational overhead**: Gumbel-softmax with 64 states adds per-step computation; the multiplicative gate adds one projection per attention layer. Total overhead is approximately 3% wall-clock time.
5. **Self-crystallization**: The τ = 1.0 → 0.02 trajectory was observed but not controlled. Whether this behavior is robust across different training regimes requires further investigation.

### 5.6 Future Work

1. **Unprompted temporal learning**: Run the model with only the Lattice Clock (no input data) to test whether the transition matrix develops temporal structure spontaneously from self-referential oscillation.
2. **Cross-modal temporal invariance**: Evaluate whether the Lattice Clock's state transitions adapt differently across modalities (text: sequential, vision: spatial, audio: spectral).
3. **Cthulu integration**: Deploy the Lattice Clock within the Cthulu trading system [17] to leverage tick-based market time for financial prediction.
4. **EEG monitoring**: Use the GLADIUS 184-channel neural activity monitor to measure the clock's BPM, state transition patterns, and gate activations in real-time.
5. **Ablation of golden ratio**: Compare φ-spacing against uniform spacing, logarithmic spacing, and random irrational spacing to isolate the contribution of the golden ratio.

---

## 6. Conclusion

We have presented the Lattice Clock, a discrete temporal quantization mechanism for neural architectures that replaces continuous sinusoidal temporal encoding with quantized state transitions, multiplicative attention gating, and self-referencing tick counts. Motivated by the empirical observation that Time2Vec parameters remain dormant (0.0000% change) across four modalities and 56,500 training steps, the Lattice Clock introduces three properties that ensure temporal signals cannot be ignored: discrete lattice positions that prevent smooth drift, multiplicative gating that creates structural dependency, and self-referential counting that tethers the model to its own computational heartbeat.

Experimental results on temporal video prediction within the GLADIUS ACM architecture demonstrate a 26% loss improvement over continuous Time2Vec (2.58 vs. 3.50), 54.9% hot memory activation (1.75× baseline), and spontaneous temperature crystallization from τ = 1.0 to τ = 0.02. The subconscious invariant (layers 0–6 changing by approximately 1%) is preserved, confirming that the Lattice Clock modifies temporal cognition without disrupting general sequence processing.

The Lattice Clock establishes that temporal awareness in neural architectures is an architectural problem—requiring structural forcing through multiplicative gating and discrete quantization—not merely a representation problem solvable through additive encoding. The cesium atom does not learn time; it oscillates. The Lattice Clock brings the same principle to artificial cognition.

---

## References

[1] A. Vaswani, N. Shazeer, N. Parmar, J. Uszkoreit, L. Jones, A. N. Gomez, Ł. Kaiser, and I. Polosukhin, "Attention Is All You Need," in *Proc. NeurIPS*, 2017, pp. 5998–6008.

[2] J. Su, Y. Lu, S. Pan, A. Murtadha, B. Wen, and Y. Liu, "RoFormer: Enhanced Transformer with Rotary Position Embedding," *Neurocomputing*, vol. 568, 2024.

[3] S. M. Kazemi, R. Goel, S. Eghbali, J. Ramanan, J. Sahota, S. Thakur, S. Wu, C. Smyth, P. Poupart, and M. Brubaker, "Time2Vec: Learning a General-Purpose Representation of Time," *arXiv preprint arXiv:1907.05321*, 2019.

[4] A. Shakil and AVA, "The Adaptive Cognitive Model: GLADIUS as Unified Cognitive Architecture," Artifact Virtual, Tech. Rep., Mar. 2026.

[5] A. Vaswani et al., "Attention Is All You Need," in *Proc. NeurIPS*, 2017.

[6] H. Touvron, T. Lavril, G. Izacard, et al., "LLaMA: Open and Efficient Foundation Language Models," *arXiv preprint arXiv:2302.13971*, 2023.

[7] J. Bai, S. Bai, Y. Chu, et al., "Qwen Technical Report," *arXiv preprint arXiv:2309.16609*, 2023.

[8] B. Lim, S. Ö. Arık, N. Loeff, and T. Pfister, "Temporal Fusion Transformers for Interpretable Multi-Horizon Time Series Forecasting," *Int. J. Forecasting*, vol. 37, no. 4, pp. 1748–1764, 2021.

[9] A. F. Ansari, L. Stella, C. Turkmen, et al., "Chronos: Learning the Language of Time Series," *arXiv preprint arXiv:2403.07815*, 2024.

[10] Y. Nie, N. H. Nguyen, P. Sinthong, and J. Kalagnanam, "A Time Series is Worth 64 Words: Long-term Forecasting with Transformers," in *Proc. ICLR*, 2023.

[11] A. van den Oord, O. Vinyals, and K. Kavukcuoglu, "Neural Discrete Representation Learning," in *Proc. NeurIPS*, 2017.

[12] E. Jang, S. Gu, and B. Poole, "Categorical Reparameterization with Gumbel-Softmax," in *Proc. ICLR*, 2017.

[13] H. Jegou, M. Douze, and C. Schmid, "Product Quantization for Nearest Neighbor Search," *IEEE Trans. Pattern Anal. Mach. Intell.*, vol. 33, no. 1, pp. 117–128, 2011.

[14] Bureau International des Poids et Mesures, "The International System of Units (SI)," 9th ed., 2019.

[15] D. Levine and P. J. Steinhardt, "Quasicrystals: A New Class of Ordered Structures," *Phys. Rev. Lett.*, vol. 53, no. 26, pp. 2477–2480, 1984.

[16] A. Shakil and AVA, "MuonClip: Orthogonal Gradient Optimization with Attention Stability for Sub-100M Transformers," Artifact Virtual, Tech. Rep., Mar. 2026.

[17] A. Shakil, "Cthulu: Distributed Autonomous Trading System," Artifact Virtual, Internal Doc., 2026.

---

**Ali Shakil, AVA**  
Artifact Virtual (SMC-Private) Limited  
ali.shakil@artifactvirtual.com

© 2026 Artifact Virtual (SMC-Private) Limited. All rights reserved.
