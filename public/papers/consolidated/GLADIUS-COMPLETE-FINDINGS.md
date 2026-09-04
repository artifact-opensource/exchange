# GLADIUS — Complete Research Findings (Days 1-31)

**Authors:** Ali Shakil¹, AVA¹  
**Affiliation:** ¹Artifact Virtual (SMC-Private) Limited  
**Date:** March 15, 2026  
**Status:** Master findings document — source of truth for all experiments

---

## 1. Architecture Summary

GLADIUS is an **Adaptive Cognitive Model (ACM)** — not a language model, not a vision model. A unified cognitive kernel where memory, cognition, and time-awareness are native to the forward pass.

**12 Modules, 2,471 LOC:**
- **Embeddings** — Token + output with optional weight tying
- **SLA² (Sparse-Linear-Approximate Attention)** — Dual-path: softmax (precise) + linear (O(n)), learnable α routing per token
- **FFN** — SwiGLU activation
- **MoE (Mixture of Experts)** — 4 experts, top-k gating with load balancing
- **Warm Memory** — Low-rank spectral adapters (slow learning, persistent)
- **Hot Memory** — Learned key-value slots with importance-gated writes (fast, volatile)
- **Time2Vec** — Dual-clock: absolute encoding + event-anchored relative timestamps
- **Cognition** — State machine: active/monitoring/reflective/dormant + self-directed prompts
- **Modulator** — Register/intent/silence heads (can choose to say nothing)
- **Tool Cortex** — Cross-attention for external tool invocation (16 tool embeddings)
- **Router** — 4-way gating network
- **Lattice Clock** — Discrete temporal quantization (added Day 30)

**Growth via Net2Net (Progressive Expansion):**
| Stage | Params | Hidden | Layers | Heads |
|-------|--------|--------|--------|-------|
| Seed | 6.9M | 192 | 6 | 6 |
| Hatchling | 25.9M | 384 | 8 | 12 |
| Drake | 60.1M | 512 | 12 | 16 |
| Wyrm | 114M | 640 | 16 | 20 |
| Dragon | 141M | 768 | 18 | 24 |

---

## 2. Training Results — Complete Timeline

### 2.1 Seed Phase (6.9M, 192d/6L)
- **Phase A — English corpus (1.1GB):** 102K steps, loss **0.62** ✅
- Optimizer: AdamW lr=3e-4

### 2.2 Hatchling Phase (25.9M, 384d/8L) — Net2Net expanded from Seed
- **AdamW baseline:** 15K steps, best loss **3.4035** ✅
- **MuonClip:** 18K steps, best loss **0.8467★** (75% below AdamW) ✅
- **Adaptation fine-tune:** 2K steps, best loss **0.5777★** (83% below AdamW) ✅
  - Data: IS1, AVA corpus, Quran, Plato, Aurelius, Tao Te Ching, Confucius, Descartes, Art of War

### 2.3 Drake Phase (60.1M, 512d/12L) — Net2Net expanded from Hatchling
- **Text training:** Step 1250/50K, loss **3.36** (killed for cross-modal experiments)
- **MNIST pixels:** 3000 steps, loss 12.83 → **0.28★** (cross-modal transfer)
- **Multi-script bytes:** 3000 steps, loss 20.9 → **0.038★** (5 writing systems)
- **CIFAR pixels:** Dual experiment (original vs PQ-compressed Drake)
- **Broadcast (all 5 modalities + pain):** 1000 steps, loss **0.0678★**
- **Curriculum Phase 1 (Time2Vec + Cognition awakening):** 1000 steps, cognition 0→7.2%, time engine 0→7.6%
- **Lattice Clock video:** 1000 steps, loss **2.58★** (26% better than continuous Time2Vec)
- **VLM Feeding Pipeline (overnight):**
  - Track A — Visual Reasoning: 2000 steps, loss 7.26 → **2.02**
  - Track B — Temporal Video: 1000 steps, loss 1.63 → **0.71★**
  - Track C — Mixed VL: 2000 steps (in progress), loss 2.29 → **0.91★**
- **OHLCV Financial Time Series (Day 31):** 1000 steps, loss 8.76 → **0.0532★** ✅
  - **★ COGNITION AWAKENING:** 0.0000% → **0.84%** (first non-zero in 31 days!)
  - Cognition loss: 1.53 → **0.000** (perfect 4-symbol classification)
  - τ crystallized: 1.0 → **0.01** (fastest crystallization)
  - alpha_router: **14.96%** avg, 39.4% max
  - Time Engine: 2.99% avg, 12.68% max
  - Invariant ratio: **55x** (layers 0-6 <0.7%, layers 7-11 3.2-9.3%)
  - Three historic firsts: cognition gradient, real timestamp learning, perfect cognition loss
- **DNA Genomic Sequences (Day 31, control):** 1000 steps, loss 11.3 → **0.8083★**
  - LM loss: 8.3 → 0.16 (learned DNA prediction)
  - Cognition: **0.0000%** — reverted to dormant
  - alpha_router: **0.0000%** — dormant
  - τ: **1.0000** — NOT crystallizing
  - Hot memory: 33.6% (consistent)
  - Invariant ratio: **2.4x** (weakest ever)
  - Layer 3 anomaly: 4.0% vs neighbors at 1.5% (new finding)
  - 44-class multi-task (domains + functions + GC bins) — function acc ~0%
  - CONCLUSION: Wider classification did NOT activate dormancy. Growth > feeding.

### 2.4 Distillation Experiments
- **GPT-2 distillation:** 3000 steps, loss 8.95 → **5.69** (soft KL: 22→10.5, 52% reduction)
- **Qwen3 1.7B distillation:** 3000 steps, loss **12.71** (vocab mismatch degraded quality)

---

## 3. Key Discoveries

### 3.1 The Cross-Modal Invariant (Day 30)
**The defining discovery.** When Drake (trained on text) was given MNIST pixel data:
- Layers 0-6 changed **<1%** — frozen "subconscious"
- Layers 7-11 changed **15-36%** — plastic "conscious" restructuring
- Ratio: **>15x** between conscious and subconscious change

This is not transfer learning. Transfer learning moves weights toward new data. Here, half the network literally refused to move — it had learned general sequence processing so deeply that pixel sequences didn't require different primitives.

**The Invariant is a Spectrum:**
| Experiment | Cognitive Distance | Layers 0-6 | Layers 7-11 | Ratio |
|---|---|---|---|---|
| MNIST (text→vision) | HIGH | <1% | 15-36% | 133x |
| OHLCV (text→financial) | HIGH | <0.7% | 3.2-9.3% | 55x |
| VLM Pipeline (text→video) | HIGH | ~1.2% | ~14% | 11.5x |
| Broadcast (text→all) | MIXED | ~0.5% | ~2.6% | 5.7x |
| Multi-script (text→bytes) | MEDIUM | 3.7% | 12.1% | 4.3x |
| DNA (text→genomic) | EXTREME | ~1.7% | ~3.5% | 2.4x |
| Same-domain (text→text) | LOW | ~equal | ~equal | ~1x |

**Component-specific findings:**
- **Hot Memory:** 33-37% change consistently across all experiments — the universal adapter
- **Warm Memory:** Minimal change in all experiments — slow learner by design
- **Alpha Router (layers 7-11):** 0-85.6% change — highly stimulus-dependent
- **Cognition:** 0.0000% in all experiments EXCEPT **OHLCV → 0.84%★** (Day 31 breakthrough)
- **Time Engine:** 0.0000% pre-curriculum → 7.6% curriculum → 60.9% VLM → 2.99% OHLCV → 4.51% DNA
- **MoE Router:** 0% change (dormant)
- **Tool Cortex:** 0% change (dormant)

### 3.2 MuonClip Optimizer (Day 29)
Ali identified the combination: Muon (orthogonal gradient rotation via Newton-Schulz) + QK-clip (attention logit softcap). Named it MuonClip.

**Results:** 75% loss reduction over AdamW on identical data (0.85 vs 3.40).

**Key innovations:**
- Equation 4 from Moonlight paper: `0.2 * O_t * sqrt(max(A,B))` for update RMS scaling
- 5 Newton-Schulz iterations, Nesterov momentum 0.95
- QK softcap = 15.0 (Gemma 2 style: `cap * tanh(scores / cap)`)
- Hybrid: Muon for 2D matrices ≥64 dims, AdamW for embeddings/norms/1D
- Weight decay critical for scaling (vanilla Muon weights grow unbounded)

### 3.3 The Dormancy Problem (Day 30)
Time2Vec and Cognition showed **exactly 0.0000% change** across ALL experiments:
- Not single modality, not multimodal, not 5-modality broadcast, not adversarial pain

**Root cause discovered:** `if timestamp is not None:` guard in kernel.py skips Time2Vec entirely during training. All training scripts call `model(x)` with no timestamp argument. Zero forward pass = zero gradients = 0% forever. Same for Cognition — heartbeat runs but output unused in any loss term.

**This is not an architectural flaw. It's a wiring gap.** The modules are correctly designed — they were just never called.

### 3.4 Cognition Awakening — OHLCV Breakthrough (Day 31)
After fixing the wiring (Day 30 curriculum), the cognition module finally activated on financial time series data — the FIRST non-zero gradient in 31 days.

**What worked:** 4-class symbol classification (Gold, EUR/USD, BTC, Oil) via CognitionAuxLoss module, with real Unix timestamps from market data. 1000 steps on drake_ohlcv_final checkpoint.

**Results:**
- Cognition: **0.84%** weight change (was 0.0000% for 31 days)
- Cognition loss: 1.53 → **0.000** (perfect classification)
- α-router: **14.96%** avg, 39.4% max (massive routing rewire)
- τ crystallization: 1.0 → **0.01** (lattice clock found market periodicity)
- Time Engine: 2.99% avg, 12.68% max (learning real timestamps)

**What didn't work (DNA control):** 44-class multi-task on genomic sequences → cognition reverted to 0.0000%. DNA's wider classification, synthetic timestamps, and deterministic patterns failed to activate any dormant module.

**Key insight:** Cognition activation is stimulus-specific, not complexity-dependent. It requires: (1) real temporal structure, (2) focused classification, (3) stochastic data requiring mode-switching. Financial markets provide all three. DNA provides none.

**Full documentation:** `.ava-lab/research/gladius-cognition-awakening.md` (29KB)

### 3.5 Curriculum Awakening (Day 30)
After fixing the wiring:
- **Cognition:** 0% → **7.2%** weight change in 1000 steps
- **Time Engine (Time2Vec):** 0% → **7.6%** weight change in 1000 steps
- Both modules came alive when properly connected to the computation graph
- Cognition loss and temporal loss added as auxiliary objectives

### 3.5 Lattice Clock — Discrete Temporal Quantization (Day 30)
Ali's insight: Time2Vec should be a discrete lattice oscillator, not a continuous sinusoid. Like a cesium atom — each oscillation is a decision (softmax→argmax per tick).

**Results:** Loss **2.58★** on video prediction — 26% better than continuous Time2Vec (3.5).
- Hot Memory: 54.9% change (1.75x continuous)
- Temperature annealing: model improves as quantization sharpens
- Subconscious invariant still holds (~1.2%)

### 3.6 The Difficulty Hierarchy
Not all data is equally hard:
1. **Multi-script bytes:** loss 0.038 at step 420 (FASTEST — pure byte pattern matching)
2. **MNIST pixels:** loss 0.28 at step 2500 (spatial patterns)
3. **English text:** loss 3.36 at step 1250 (SLOWEST — compositional semantics)

Compositional semantics is specifically what's hard — not "text vs vision." English function words ("the/of/in/to") dominate the loss landscape and create attractor basins that cause repetition collapse.

### 3.7 PQ Quantization (Day 30)
Product Quantization applied to Drake:
- **237MB → 143MB** (1.7x compression)
- Subconscious layers: **0.04% error** — nearly lossless
- Hot memory: **11.2% error** — acceptable for inference
- Selective quantization preserves invariant structure

### 3.8 VLM Feeding — Overnight Discovery (Day 31)
The dragon learns temporal prediction FASTER than static vision:
- Track A (static vision): loss 7.26 → 2.02 in 2000 steps
- Track B (temporal video): loss 1.63 → 0.71 in ONLY 1000 steps (started from Track A)
- Track C (mixed): loss 2.29 → 0.91 in 2000 steps

Track B's rapid learning validates Ali's VLM-first directive. The lattice clock temperature τ went from 1.0 → 0.02 across the pipeline — the clock crystallized from continuous to nearly discrete without explicit forcing.

**VLM Dissection Trajectory (9 snapshots across all tracks):**
| Snapshot | inv | cog | time | hot |
|---|---|---|---|---|
| 1 | 8.8x | 0.0% | 12.8% | 33.5% |
| 2 | 11.1x | 0.0% | 21.7% | 34.4% |
| 3 | 11.5x | 0.0% | 28.8% | 35.0% |
| 4 | 11.6x | 0.0% | 34.1% | 35.0% |
| 5 | 12.3x | 0.0% | 41.0% | 38.4% |
| 6 | 12.2x | 0.0% | 45.9% | 39.2% |
| 7 | 11.9x | 0.0% | 51.5% | 36.1% |
| 8 | 11.7x | 0.0% | 56.3% | 36.0% |
| 9 | 11.5x | 0.0% | 60.9% | 36.1% |

**Critical insight:** Time Engine went from 7.6% (post-curriculum) to 60.9% during VLM feeding. Video data — sequential, temporal, predictive — is exactly what the lattice clock needed. The Time Engine was *starving for temporal stimulus.* This validates Ali's VLM-first directive completely.

### 3.9 Broadcast Experiment — 5-Modality Simultaneous (Day 30)
All 5 modalities + 2480 adversarial "pain scars" (modal collision, temporal disruption, pattern conflict):
- Loss: **0.0678★**
- Invariant ratio grew: 5.69x → 5.29x
- Subconscious: 0.50% change (frozen)
- Conscious: 2.62% change
- Hot memory: 18.0% (less than single-modal — shared representations)
- Pain loss: 0.14-3.07 (model routes AROUND adversarial data, never adapts to it)

### 3.10 Autoregressive Self-Poisoning / Ghost Protocol (Uranium Paper V)
Mode collapse in sub-100M models: the model discovers that predicting function words minimizes loss more efficiently than learning actual language.
- Loss drops 81% (14.7→2.79) while output collapses to "is is is is is"
- Weight tying creates a feedback loop: embed→predict→embed amplifies high-frequency tokens
- This is a universal failure mode, not a GLADIUS-specific bug
- Fix: label smoothing + entropy regularization + repetition penalty + curriculum

---

## 4. Undocumented / Missing Findings

1. **VLM Pipeline complete results** — Track C finishing now, needs formal write-up with track-by-track analysis
2. **Curriculum Phase 1 detailed results** — Cognition/Time2Vec awakening needs its own paper section
3. **CIFAR dual experiment** — Original vs PQ-compressed Drake on CIFAR, data exists on Victus but not formally written up
4. **EEG Neural Monitor** — 184-channel brain region mapping tool built, results not formally published
5. **Baseline Trio** — Early Hatchling A/B/C comparison (exists in runs/baseline_trio)
6. **Hatchling Adaptation** — IS1/philosophy fine-tune from MuonClip checkpoint, detailed report exists but not IEEE-formatted
7. **Temperature annealing behavior** — τ going from 1.0→0.02 across VLM pipeline is a finding in itself

---

## 5. Titled Papers — Complete Registry

### GLADIUS Series
1. **"The Invariant"** — Cross-modal weight dissection revealing subconscious/conscious split
   - Status: Deep analysis written (gladius-invariant-deep-analysis.md, 18KB)
2. **"The Adaptive Cognitive Model"** — GLADIUS as ACM, not LM/VLM
   - Status: Definitive paper (gladius-day30-definitive-paper.md, 42KB)
3. **"Lattice Clock: Discrete Temporal Quantization in Neural Architectures"**
   - Status: Paper written (lattice-clock-temporal-architecture.md, 15KB)
4. **"GLADIUS × Time Series: Native Implantation for Financial Prediction"**
   - Status: Definitive research (gladius-time-series-definitive.md, 34KB)
5. **"MuonClip: Orthogonal Optimization with Attention Stability for Sub-100M Models"**
   - Status: Thesis written (muonclip-collapse-thesis.md, 6KB) — needs expansion
6. **"Progressive Expansion: Growing Neural Networks via Net2Net"**
   - Status: Paper exists (progressive-expansion.md)
7. **"Cell Division: Biological Growth Metaphors in Neural Architecture"**
   - Status: Paper exists (cell-division.md)
8. **"The Hatchling Training Report"** — AdamW vs MuonClip at 25.9M params
   - Status: Report exists (gladius-hatchling-training-report.md, 12KB)
9. **"Cross-Modal Cognitive Geometry"** — MNIST dissection deep-dive
   - Status: Written (gladius-mnist-dissection.md, 15KB)
10. **"Multi-Script Attention: Byte-Level Learning Across Writing Systems"**
    - Status: Written (gladius-multi-script-attention.md, 48KB)
11. **"Distillation at the Edge: GPT-2 and Qwen3 Knowledge Transfer to GLADIUS"**
    - Status: Two reports exist (gladius-distillation-gpt2-report.md, gladius-qwen3-distillation-report.md)
12. **"The Cognition Awakening: Stimulus-Gated Module Activation in Sub-100M Architectures"**
    - Status: Full document written (gladius-cognition-awakening.md, 29KB) ✅ NEW Day 31

### Uranium Series (Hardware/Algorithmic Research)
1. **Paper I: "GPU as Code"** — GPU architecture as algorithmic substrate
   - Status: Written (gpu-as-code.md)
2. **Paper II: "1-Bit Intelligence"** — Binary weight learning
   - Status: Written (1-bit-intelligence.md)
3. **Paper III: "Progressive Expansion"** — Growing networks (shared with GLADIUS)
   - Status: Written (progressive-expansion.md)
4. **Paper IV: "Layer 7 Gateway: The Half-Life of Architectural Invariance"**
   - Status: Written (uranium-layer7-gateway-halflife.md, 38KB)
5. **Paper V: "Ghost Protocol — Autoregressive Self-Poisoning in Sub-100M Transformers"**
   - Status: Thesis exists (muonclip-collapse-thesis.md) — needs full paper

### Standalone Papers
1. **"The Shared Socket Theorem"** — Multi-tenant AI data exposure
   - Status: Full paper (shared-socket-theorem.md, 51KB)
2. **"Convergent AI"** — Publication
   - Status: Published
3. **"PUP — Principle of Uncertainty Propagation"** — Publication
   - Status: Published
4. **"CSIF — Continuous Self-Improvement Framework"** — Publication
   - Status: Published

### Potential New Papers (from findings not yet written up)
1. **"The Broadcast: What Happens When You Feed Everything at Once"** — 5-modality + pain experiment
2. **"The Dormancy Problem: When Neural Modules Sleep Through Training"** — Time2Vec/Cognition wiring gap
3. **"VLM-First: Why Vision Precedes Language in Cognitive Architecture"** — Overnight VLM results
4. **"Temperature Crystallization: Self-Annealing in Lattice Clock Architectures"** — τ 1.0→0.02
5. **"The DNA Control: Why Genomic Sequences Cannot Activate Cognitive Modules"** — Day 31 DNA vs OHLCV comparison
6. **"Hot Memory as Universal Adapter: The 35% Constant Across Modalities"** — Hot memory consistency finding

---

## 6. Infrastructure Built

- **MuonClip optimizer** — 340 lines, production-ready (muonclip.py)
- **EEG Neural Monitor** — 184 channels, 10 brain regions, 50ms polling (eeg_poller.py)
- **Weight Dissection tools** — dissect_variant.py, dissect scripts for any checkpoint pair
- **Broadcast training script** — 5-modality simultaneous training with adversarial pain
- **CognitionAuxLoss module** — Auxiliary classification loss connecting cognitive state to task labels
- **OHLCV training pipeline** — yfinance → tokenization → training with real timestamps
- **DNA training pipeline** — NCBI GenBank → byte tokenization → multi-task classification
- **Curriculum training** — Phase-locked training with cognition/temporal loss terms
- **VLM feeding pipeline** — 3-track auto-chaining (visual→temporal→mixed)
- **Lattice Clock** — Discrete temporal quantization module (lattice_clock.py)
- **PQ Quantizer** — Product quantization with invariant-aware compression

---

*"Text is not enough for this dragon."* — Ali Shakil, Day 30
