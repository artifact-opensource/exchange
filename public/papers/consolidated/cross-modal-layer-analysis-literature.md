# Cross-Modal Layer Analysis: Literature Review & GLADIUS Positioning

**Date:** 2026-03-14 | **Author:** Ali Shakil (Artifact Virtual)
**Purpose:** Map what the field knows about layer-wise modality independence in transformers, and position our GLADIUS empirical findings within that landscape.

---

## 1. The Core Question

When a transformer trained on text encounters visual data (or vice versa), which layers adapt and which remain frozen? Our MNIST Cognitive Geometry experiment (Day 30) produced a clean answer for a 12-layer, 60.1M param model:

- **Layers 0-6:** <1% weight change. Modality-agnostic. Frozen in place.
- **Layers 7-11:** Massive restructuring (2-36% change). Cognitive geometry completely rewired.
- **Transition point:** Layer 7 (58% depth = ~2N/3 for N=12).

The question is: does the literature support this, contradict it, or — more interestingly — fail to measure it at all?

---

## 2. Key Papers Reviewed

### 2.1 Cui et al. (2602.19058) — "Do LLMs and VLMs Share Neurons for Inference?"
**Venue:** arXiv, Feb 2026 | **Models:** Qwen2.5-VL-7B, Qwen2.5-Math-7B, Intern2.5-VL, Idefics3, LLaVA-Next-8B

#### What They Found
- **>50% neuron overlap** between LLMs and LVLMs during multi-step inference (specifically 74.5% overlap in the Qwen 7B pair — 4,703 shared neurons out of 6,312 union).
- Shared neurons concentrate in **attn.k** matrices across nearly all layers, with secondary presence in **attn.v**.
- **Layer distribution is bimodal:** clustering in early layers (before layer 6) AND late layers (after layer 20) in a 28-layer model.
- Deactivating shared neurons → performance collapses to **0.0** on MathVista. Random ablation of same count → only partial degradation.
- Proposed SNRF (Shared Neuron Low-Rank Fusion): transfer inference circuitry from LLM to VLM via shared neuron subspace. Works with minimal parameter changes, no multimodal fine-tuning.

#### What This Means for GLADIUS
- **Validates the invariant hypothesis at scale.** If >50% of neurons are shared between text-only and vision-language models at 7B parameters, the modality-agnostic subspace is real and massive.
- **Their bimodal layer distribution** (early + late clustering) is interesting — our finding shows a cleaner **binary split** (layers 0-6 frozen, 7-11 restructured). Possible explanation: at 60M params with 12 layers, the architecture is lean enough that the "early invariant" and "late task-specific" zones are sharply delineated. At 7B/28 layers, the transition region may be wider, creating a middle zone that blurs the boundary.
- **Their focus is neuron-level, ours is weight-level.** They identify which individual neurons fire; we measure how much entire weight matrices change. These are complementary views of the same phenomenon.
- **Gap they don't fill:** They don't measure weight magnitude changes layer-by-layer during cross-modal transfer. They profile activations on pre-trained models, not training dynamics. Our dissection captures the *process* of adaptation, not just the *outcome*.

#### What We Can Use
- Their 74.5% overlap figure is a benchmark. We should compute neuron activation overlap in our Drake checkpoints (text-trained vs. MNIST-trained) to see if the same proportion holds at 60M scale.
- Their SNRF method could be tested on GLADIUS: profile shared neurons, then inject low-rank updates. This is essentially what our warm memory mechanism does architecturally — worth making this connection explicit.

---

### 2.2 Fan et al. (2603.00510) — "What Do Visual Tokens Really Encode?" (EmbedLens)
**Venue:** CVPR 2026 | **Models:** LLaVA-1.5-7B/13B, InternVL-3-8B, Qwen2.5-VL-8B

#### What They Found
- Visual tokens partition into **three categories**: sink (~10%), dead (~30%), alive (~60%).
- Only alive tokens carry image-specific semantics. The rest are structural artifacts or inert residues.
- **Alive tokens are "pre-linguistic"** — they already encode rich semantic cues (objects, colors, OCR) *before* entering the LLM. Internal visual FFN/attention is redundant for most tasks.
- **Critical finding: alive token norms naturally align with INTERMEDIATE LLM layers, not the input embedding space.**
- Shallow-layer processing (layers 0-2) is not just unnecessary — it can **degrade performance**. Layer 2 specifically functions as a "sink aligner" that reshapes attention distribution, not content.
- **Mid-layer injection is sufficient** for vision-centric tasks. The projector maps visual embeddings to middle-layer representations.

#### What This Means for GLADIUS
- **This is the smoking gun for our layer 7 transition.** In their 32-layer models, projectors map visual tokens to align with ~layer 8-16 representations (roughly the middle third). In our 12-layer model, layer 7 is 58% depth — the exact zone where their "mid-layer alignment" would fall.
- **Their "shallow layers are unnecessary for visual processing" maps directly to our "layers 0-6 are frozen."** Same phenomenon observed from opposite directions: they show shallow layers don't process visual semantics; we show shallow layers don't *need to change* when switching to visual data.
- **The sink/dead/alive taxonomy** may explain why our MNIST training was so efficient (loss 12.83 → 0.28 in 3000 steps). If the model learned to ignore ~40% of input tokens as structural artifacts, the effective learning signal was concentrated in the alive subset.

#### What We Can Use
- Apply EmbedLens methodology to GLADIUS: probe which pixels map to sink/dead/alive after training. Our byte-level tokenization means every pixel is a token — we can measure semantic sparsity directly.
- Their mid-layer injection finding suggests we should try feeding MNIST data directly into layer 7, bypassing layers 0-6 entirely. If performance is maintained, it proves those layers are truly modality-agnostic feature extractors.
- **Quantitative benchmark:** They show alive tokens align with layers at ~25-50% depth (in 32-layer models). Our transition at 58% depth in a 12-layer model is slightly deeper — potentially because smaller models have less redundancy and need more layers for "general" processing.

---

### 2.3 Nadipalli (2502.16722) — "Layer-Wise Evolution of Representations in Fine-Tuned Transformers"
**Venue:** arXiv, Feb 2025 | **Model:** BERT (12 layers)

#### What They Found
- Using Sparse AutoEncoders (SAEs) across all 12 BERT layers:
  - **Early layers:** retain general representations
  - **Middle layers:** transition zone between general and task-specific
  - **Later layers:** fully specialize for task adaptation
- Three-phase progression confirmed across multiple datasets.

#### What This Means for GLADIUS
- **Directly comparable architecture** (12 layers, similar scale). Their finding of a three-phase progression (general → transition → specialized) maps cleanly onto our binary observation, but with important differences:
  - They study *fine-tuning* (same modality, different task). We study *cross-modal transfer* (different modality entirely).
  - In fine-tuning, middle layers act as a gradual transition. In cross-modal transfer, our data suggests the transition is **sharper** — almost a step function between layers 6 and 7.
  - This makes sense: switching modalities is a more dramatic representational shift than switching tasks within the same modality. The adaptation boundary should be more defined.

#### Gap We Fill
- They don't do cross-modal analysis. The question of whether the three-phase pattern holds when you change not just the task but the entire input modality is exactly what our MNIST experiment answers.

---

### 2.4 Mahaut & Baroni (2601.21621) — "Similarity of Processing Steps in Vision Model Representations"
**Venue:** arXiv, Jan 2026

#### What They Found
- Across different vision models (CNN and transformer), layers at similar relative positions have the most similar representations.
- Transformers apply **smoother changes** from layer to layer than CNNs.
- Classifier models discard low-level image statistics in their final layers.
- Models converge toward "universal representations" regardless of training objective, dataset, or modality — the bigger the model, the stronger the convergence.

#### What This Means for GLADIUS
- **"Universal representations" at early layers is consistent with our finding.** If all models converge to similar representations at similar depths, then early-layer invariance isn't a GLADIUS-specific quirk — it's a fundamental property of transformer depth.
- Their observation about **smoother per-layer changes in transformers** may explain why our weight dissection shows a clean step function rather than a gradient: with SLA² (our attention variant), the layer-to-layer smoothness might be different from vanilla attention, creating a sharper transition.

---

### 2.5 Ahmad et al. (2411.18115) — "Dynamic Layer Freezing for Cross-Domain Transfer"
**Venue:** IEEE JSTARS, 2025

#### What They Found
- Dynamic layer freezing strategy for cross-domain hyperspectral image classification.
- Selective adaptation based on domain shift characteristics — freeze layers that don't need to change, train those that do.
- Reduces labeling costs and computational overhead significantly.

#### What This Means for GLADIUS
- **Validates layer freezing as a legitimate transfer strategy**, though in a different domain.
- We have empirical data for *which* layers to freeze in cross-modal transfer. Their method uses uncertainty-driven selection; ours could use the weight-change magnitude from our dissection as a direct freezing criterion.
- **Practical implication:** For future GLADIUS cross-modal training, we can freeze layers 0-6 explicitly (reducing trainable parameters by ~50%) and only train layers 7-11. This should maintain performance while cutting compute in half.

---

## 3. The "Two-Thirds Rule"

No paper explicitly names a "two-thirds rule" for the general→task-specific transition in transformers. However, the evidence converges:

| Source | Layers | Transition Point | Depth % |
|--------|--------|-----------------|---------|
| **GLADIUS MNIST** (our data) | 12 | Layer 7 | **58%** |
| **Cui et al.** (shared neuron clustering) | 28 | ~Layer 6 + Layer 20+ | **21% + 71%** (bimodal) |
| **EmbedLens** (mid-layer alignment) | 32 | ~Layer 8-16 | **25-50%** |
| **Nadipalli** (BERT fine-tuning) | 12 | ~Layer 5-8 | **42-67%** |
| **BERT probing literature** (classic) | 12 | ~Layer 8 | **67%** |

The classic BERT probing literature (Tenney et al. 2019, "BERT Rediscovers the Classical NLP Pipeline") found that syntactic tasks peak around layers 4-8 while semantic tasks peak at layers 8-12 in a 12-layer model — putting the transition at roughly 67% depth. Our finding of 58% is slightly earlier, which could reflect:
1. Cross-modal transfer creating a sharper, earlier boundary than within-modality task adaptation
2. Our SLA² attention mechanism enabling more efficient feature extraction in fewer layers
3. The warm memory component absorbing some of the adaptation that would otherwise require middle layers

**Working hypothesis:** The transition from modality-agnostic to task-specific processing occurs at **N/2 to 2N/3** depth (50-67%), with the exact position depending on the severity of the domain shift. Cross-modal shifts (text→vision) trigger earlier transitions than within-modality fine-tuning.

---

## 4. What THEY Know That WE Can Use

1. **Neuron-level overlap is measurable** (Cui et al.). We should run activation profiling on our text vs. MNIST checkpoints to quantify the overlap. Expected result: >50% based on their work, possibly higher since our early layers barely changed.

2. **Mid-layer injection works** (EmbedLens). We can skip layers 0-6 for visual input and inject directly into layer 7. This would validate our finding architecturally, not just analytically.

3. **40% of visual tokens are wasted** (EmbedLens). Our byte-level MNIST tokenization treats every pixel equally. If we implement sink/dead/alive classification, we can prune ~40% of pixel tokens and train faster.

4. **SNRF** (Cui et al.) as a transfer mechanism. Our warm memory + alpha routing effectively serve the same role as their shared neuron subspace + low-rank fusion. Making this connection explicit strengthens both our paper and our architecture narrative.

5. **Layer freezing has empirical backing** (Ahmad et al., plus our own data). We should implement progressive layer freezing for GLADIUS multi-modal training: freeze layers 0-6, train 7-11 only.

---

## 5. What WE Know That THEY Don't

1. **Weight-level dissection during training.** All cited papers analyze *pre-trained* models or *post-training* snapshots. Our 7-snapshot weight evolution captures the *dynamics* — how and when each layer adapts. Nobody else has published this for cross-modal transfer at any scale.

2. **The warm memory mechanism.** Cui et al.'s Figure 4 shows shared neurons in attn.k and attn.v. Our warm memory (hot keys/values) showed the single largest weight change (36.6%) during cross-modal transfer. This suggests warm memory is *where cross-modal adaptation lives* — a discovery unique to our architecture.

3. **Alpha routing as the modality switch.** Our alpha_router in layers 7-11 changed by 6-14%. This is the attention routing mechanism deciding *how* to process inputs. No other paper has identified a discrete routing component that selectively activates for different modalities.

4. **Sub-100M cross-modal transfer.** Every cited paper operates at 3B-13B scale. Nobody is studying cross-modal invariance in models under 100M parameters. Our 60.1M Drake shows the phenomenon persists at small scale — which is both scientifically interesting (it's not an emergent property of scale) and practically important (it means small models can be multi-modal).

5. **Loss dynamics comparison.** Text training: 15K steps to reach loss 3.40 with repetition collapse. MNIST: 3000 steps to reach loss 0.28 with no collapse. The asymmetry is dramatic and quantifiable. Nobody else has this comparison because nobody else is training the same architecture on both modalities.

---

## 6. Gaps We Can Fill With Our Dissection Data

### Experiment A: Activation Overlap Measurement
Replicate Cui et al.'s neuron profiling on our text and MNIST checkpoints. Measure overlap at each layer independently to see if the bimodal pattern (early + late clustering) holds at 60M scale or collapses into our observed binary split.

### Experiment B: Layer-Skip Injection
Feed MNIST data into Drake starting at layer 7, bypassing layers 0-6. If performance matches full-model performance, we prove those layers are modality-agnostic feature extractors that visual data doesn't need.

### Experiment C: Progressive Layer Freezing
Retrain MNIST with layers 0-6 frozen. Measure loss trajectory against the full-model run. Expected: similar final loss with ~50% fewer trainable parameters and faster convergence.

### Experiment D: Token Sparsity Analysis
Apply EmbedLens-style probing to our MNIST training. Classify pixel tokens into sink/dead/alive. If the 60/40 split holds for byte-level tokenization of images, it's a universal property of the transformer's input processing, not a consequence of CLIP-style pre-training.

### Experiment E: Multi-Modal Weight Evolution Comparison
We already have weight snapshots from text training AND MNIST training AND multi-script training. Cross-compare the layer-by-layer change profiles. If layers 0-6 are invariant across text, pixels, AND multi-script — that's a three-way modality independence result that nobody in the literature has.

---

## 7. Paper Positioning Statement

Our GLADIUS dissection data occupies a unique position in the literature:
- **Scale:** Sub-100M (nobody else is here)
- **Method:** Weight-level evolution during training (everyone else does activation profiling on pre-trained models)
- **Architecture:** Custom (SLA², warm memory, alpha routing, MoE) — not fine-tuned GPT/BERT/LLaMA
- **Finding:** Sharp binary transition at ~58% depth, with warm memory as the primary adaptation mechanism

The strongest paper framing would be: *"What Cui et al. proved at 7B with activation profiling, and Fan et al. proved at 7-13B with semantic probing, we demonstrate at 60M with direct weight dissection — and we add the temporal dimension of how the invariant emerges during training."*

The title practically writes itself: **"Cognitive Geometry: Weight-Level Evidence for Modality-Invariant Layers in Sub-100M Transformers"**

---

## References

1. Cui et al. (2602.19058) "Do LLMs and VLMs Share Neurons for Inference?" — NUS/USTC/NTU
2. Fan et al. (2603.00510) "What Do Visual Tokens Really Encode?" — EIT/SJTU/PolyU (CVPR 2026)
3. Nadipalli (2502.16722) "Layer-Wise Evolution of Representations in Fine-Tuned Transformers"
4. Mahaut & Baroni (2601.21621) "Similarity of Processing Steps in Vision Model Representations"
5. Ahmad et al. (2411.18115) "Transformer-Driven Active Transfer Learning" — IEEE JSTARS 2025
6. Tenney et al. (2019) "BERT Rediscovers the Classical NLP Pipeline" — ACL 2019

---

*This review is a living document. Update as new experiments produce data.*
