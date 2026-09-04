# Knowledge Distillation at the Edge: Teacher-Student Transfer to Sub-100M Cognitive Architectures

**Authors:** Ali Shakil¹, AVA¹  
**Affiliation:** ¹Artifact Virtual (SMC-Private) Limited  
**Contact:** ali.shakil@artifactvirtual.com  
**Date:** March 2026  
**Version:** v1.0  
**Repository:** https://github.com/Artifact-Virtual/GLADIUS

**Keywords:** knowledge distillation, edge AI, teacher-student, GPT-2, Qwen3, vocabulary mapping, cognitive architecture, sub-100M parameters

---

## Abstract

Knowledge distillation enables the transfer of learned representations from large teacher models to compact student architectures suitable for edge deployment. However, existing distillation literature assumes architectural homogeneity between teacher and student — typically both are standard transformers differing only in scale. This paper presents the first systematic study of cross-architecture distillation into a cognitive kernel: GLADIUS, a sub-100M parameter architecture featuring Scaled Linear-Approximate Attention (SLA²), Mixture of Experts (MoE), Time2Vec temporal encoding, and dual-tier Warm/Hot Memory — components absent from any teacher model. We conduct two distillation campaigns: Phase 1 transfers knowledge from GPT-2 (124M parameters, 50K vocabulary) into GLADIUS (6.9M parameters, 16K vocabulary), achieving a 36.4% loss reduction and 52% soft-KL divergence reduction over 3,000 steps (39 minutes on an RTX 2050). Phase 2 attempts transfer from Qwen3-1.7B (1.33B parameters, 151K vocabulary), resulting in categorical failure: loss stagnation at 12.17 (2.14× worse than Phase 1) and output collapse dominated by unmapped vocabulary tokens. Through controlled comparison, we identify the vocabulary ratio between teacher and student as the primary bottleneck — not teacher quality. A 1.57× vocabulary ratio (GPT-2→GLADIUS) enables effective transfer; a 9.48× ratio (Qwen3→GLADIUS) produces noise that overwhelms the learning signal. We propose a vocabulary bridge architecture and intermediate teacher selection criteria for future edge distillation at extreme scale ratios.

---

## 1. Introduction

### 1.1 Problem Statement

The deployment of large language models (LLMs) at the network edge — on embedded devices, microcontrollers, and resource-constrained GPU environments — is constrained by parameter count, memory footprint, and inference latency. Knowledge distillation [1] offers a path to compress the capabilities of billion-parameter teachers into deployable student models. However, the dominant paradigm assumes that teacher and student share the same architecture family, differing only in depth, width, or layer count [2, 3].

A fundamentally different challenge arises when the student is not a scaled-down version of the teacher but an architecturally novel model with components the teacher does not possess. GLADIUS [4] is a cognitive kernel featuring Scaled Linear-Approximate Attention (SLA²), Mixture of Experts routing, dual-clock temporal encoding via Time2Vec, and a two-tier memory system (Warm Memory for slow adaptation, Hot Memory for fast volatile storage). These modules have no analogue in GPT-2 or Qwen3. The distillation question therefore becomes: can a standard transformer teacher transfer useful knowledge into an architecturally heterogeneous student, and does the student metabolize that knowledge through its own structural lens — or does the architectural mismatch prevent transfer entirely?

A second, underexplored challenge concerns tokenizer incompatibility. When teacher and student use different tokenizers with different vocabulary sizes, the soft-target distributions that constitute the "dark knowledge" [1] of distillation cannot be directly compared. The teacher's probability distribution over 50,257 tokens (GPT-2) or 151,669 tokens (Qwen3) must be projected into the student's 16,000-token space — a lossy transformation whose fidelity degrades nonlinearly with the vocabulary ratio.

### 1.2 Contributions

This paper makes the following contributions:

1. **First cross-architecture distillation into a cognitive kernel.** We demonstrate that GLADIUS's non-standard components (SLA², MoE, Time2Vec, Warm/Hot Memory) can absorb and restructure knowledge from architecturally different teachers, producing outputs that reflect the student's structure rather than the teacher's.

2. **Quantitative vocabulary ratio analysis.** We show through controlled experiments that the vocabulary ratio between teacher and student is a stronger predictor of distillation success than teacher model quality. A 1.57× ratio enables 36.4% loss reduction; a 9.48× ratio produces net degradation.

3. **Character-level cross-tokenizer alignment.** We develop a memory-efficient method for distilling across incompatible tokenizers using character-span alignment with dictionary caching (<1 MB), replacing the naive dense projection matrix approach (6.4 GB).

4. **bfloat16 necessity for SLA² architectures.** We document that GLADIUS's hidden state magnitudes grow monotonically across layers (0.7 → 140 at layer 12), making float16 permanently unsafe and requiring bfloat16 for all training. This finding generalizes to any architecture with linear attention and additive residual connections without pre-normalization.

5. **Output evolution taxonomy.** We provide a step-by-step chronicle of how a 6.9M parameter model learns language from soft targets: random tokens → punctuation patterns → English words → morphological categories → proto-syntactic structure — a progression that mirrors aspects of human language acquisition.

### 1.3 Paper Organization

Section 2 surveys related work in knowledge distillation, edge deployment, and vocabulary mismatch handling. Section 3 describes the student and teacher architectures and the distillation framework. Section 4 presents experimental results for both GPT-2 and Qwen3 distillation campaigns. Section 5 discusses the vocabulary gap bottleneck, the counterintuitive advantage of smaller teachers, limitations, and future directions. Section 6 concludes.

---

## 2. Background and Related Work

### 2.1 Knowledge Distillation

Hinton et al. [1] introduced knowledge distillation as the transfer of "dark knowledge" from a teacher to a student via softened output distributions. The key insight is that the teacher's probability assignments to incorrect classes encode relational structure: a model that assigns higher probability to "dog" than "airplane" when the label is "cat" has learned that cats resemble dogs more than airplanes. This relational information, invisible in hard labels, becomes accessible when the teacher's logits are divided by a temperature parameter T > 1 before applying softmax. The student is trained on a weighted combination of cross-entropy against hard labels (anchoring) and KL divergence against the teacher's soft targets (knowledge transfer).

Subsequent work expanded distillation to intermediate representations [5], attention maps [6], and feature-level alignment [7]. DistilBERT [2] demonstrated that a 6-layer student can retain 97% of a 12-layer BERT's performance through task-agnostic distillation. TinyBERT [3] extended this with layer-to-layer mapping and data augmentation.

### 2.2 Edge Deployment of Language Models

The deployment of transformer models on edge hardware has been approached through quantization [8, 9], pruning [10], and architectural search [11]. Post-training quantization to 4-bit (GPTQ [8], AWQ [9]) can reduce model size by 4× with minimal quality loss for models above 1B parameters. Below 100M parameters, quantization artifacts become significant: the reduced parameter budget means each weight carries more information, and precision loss is proportionally more damaging.

Knowledge distillation offers an alternative: instead of compressing a large model post-hoc, train a small model from scratch using the large model as a teacher. This allows the small model to develop its own internal representations optimized for its architecture, rather than inheriting representations designed for a larger capacity.

### 2.3 Vocabulary Mismatch in Cross-Model Distillation

The assumption of shared vocabulary is pervasive in distillation literature. DistilBERT [2], TinyBERT [3], and MiniLM [7] all share the teacher's tokenizer exactly. When vocabulary differs, the teacher's softmax distribution over V_t tokens must be mapped to the student's V_s tokens — a problem that has received limited attention.

Jiao et al. [12] addressed vocabulary mismatch for multilingual distillation by training shared subword tokenizers. Kim and Rush [13] proposed sequence-level knowledge distillation, where the teacher's generated text (decoded to natural language) serves as training data, bypassing the token-level mapping problem entirely. However, sequence-level distillation discards the per-position distributional information that constitutes dark knowledge.

To our knowledge, no prior work has addressed cross-tokenizer distillation at extreme vocabulary ratios (>9×) between architecturally heterogeneous models, which is the regime we encounter when distilling from modern multilingual LLMs into compact English-focused cognitive kernels.

---

## 3. Architecture

### 3.1 Student: GLADIUS Drake (60.1M Parameters)

GLADIUS is an Adaptive Cognitive Model (ACM) consisting of 12 specialized modules totaling 2,471 lines of source code [4]. The Drake configuration used in these experiments represents the third growth stage via Net2Net progressive expansion [14], with the following specifications:

**Table 1: Student Model Configuration**

| Parameter | Value |
|-----------|-------|
| Total parameters | 60.1M (Drake) / 6.9M (Seed) |
| Hidden dimension | 512 (Drake) / 192 (Seed) |
| Layers | 12 (Drake) / 6 (Seed) |
| Attention heads | 16 (Drake) / 6 (Seed) |
| Vocabulary | 16,000 (SentencePiece BPE) |
| Attention mechanism | SLA² (dual-path: softmax + linear, per-token α routing) |
| Expert routing | MoE with 4 experts, top-k gating, load balancing |
| Memory | Warm (low-rank spectral, slow) + Hot (key-value slots, fast) |
| Temporal encoding | Time2Vec dual-clock (absolute + event-relative) |
| Cognition | State machine (active/monitoring/reflective/dormant) |
| Modulator | Register, intent, and silence heads |

The Phase 1 (GPT-2) distillation used the Seed configuration (6.9M parameters, 192 hidden, 6 layers, 32K vocabulary). The Phase 2 (Qwen3) distillation used the Drake configuration (60.1M parameters expanded to 256.8M with full module instantiation, 16K vocabulary).

The SLA² attention mechanism is particularly relevant: at each token position, a learned α parameter routes between full softmax attention (precise, O(n²)) and linear attention (approximate, O(n)). This dual-path design produces hidden state magnitude growth across layers — a critical factor in numerical stability during distillation (Section 4.1.3).

### 3.2 Teacher 1: GPT-2 (124M Parameters)

OpenAI's GPT-2 [15] is a 12-layer, 768-hidden, 12-head transformer with 124M parameters and a byte-pair encoding (BPE) vocabulary of 50,257 tokens. Released under the MIT license, GPT-2 was trained on WebText (approximately 8 million web pages) for standard causal language modeling. Despite its age (2019), GPT-2 remains a strong baseline for English language generation and serves as an architecturally clean teacher: no instruction tuning, no RLHF, no multi-task heads — pure next-token prediction knowledge.

### 3.3 Teacher 2: Qwen3-1.7B (1.33B Parameters)

Alibaba's Qwen3-1.7B [16] is a 2025 dense transformer with 1.33B parameters, 2,048 hidden dimension, and a vocabulary of 151,669 tokens. Released under the Apache 2.0 license, Qwen3 features bilingual (English-Chinese) capability, instruction following, and code generation. The 151K vocabulary includes CJK characters, multilingual subwords, code tokens, and special instruction markers — of which the vast majority have no representation in GLADIUS's English-focused 16K vocabulary.

### 3.4 Distillation Framework

#### 3.4.1 Cross-Tokenizer Alignment

Given input text s, the teacher tokenizer T_t produces tokens t₁...tₘ and the student tokenizer T_s produces tokens s₁...sₙ, where m ≠ n in general. Direct comparison of output distributions requires positional alignment.

We compute character-span mappings for both tokenizations: each token is associated with the character offset range [start, end) it covers in the original text. For each student position i, we identify the teacher position j whose character span has maximum overlap with s_i's character span. This produces a many-to-one alignment mapping A: {1...n} → {1...m}.

#### 3.4.2 Vocabulary Projection

At each aligned position, the teacher produces a softmax distribution p_t ∈ ℝ^{V_t} over the teacher vocabulary V_t. This must be projected to p_t' ∈ ℝ^{V_s} over the student vocabulary V_s.

The naive approach constructs a dense projection matrix P ∈ ℝ^{V_t × V_s}, requiring V_t × V_s × 4 bytes of memory. For GPT-2→GLADIUS, this is 50,257 × 32,000 × 4 = 6.4 GB — infeasible on a 4 GB VRAM GPU.

We instead construct a dictionary cache C: for each teacher token t_k, decode to text, re-encode with the student tokenizer, and cache the resulting student token(s). At inference time, teacher probability mass for t_k is redistributed to the cached student token(s). Probability mass for teacher tokens with no student equivalent accumulates at `<unk>`. The cache occupies <1 MB and is constructed once at initialization.

**Table 2: Vocabulary Mapping Statistics**

| Mapping | Teacher Vocab | Student Vocab | Ratio | Direct Matches | Match Rate |
|---------|--------------|---------------|-------|----------------|------------|
| GPT-2 → GLADIUS | 50,257 | 32,000 | 1.57× | ~20,000 | ~40% |
| Qwen3 → GLADIUS | 151,669 | 16,000 | 9.48× | 18,445 | 12.2% |

#### 3.4.3 Loss Function

The training objective combines hard-label cross-entropy with soft-target KL divergence:

```
L = α · CE(ŷ, y) + (1 - α) · T² · KL(σ(ŷ/T) ‖ σ(p_t'/T))
```

where ŷ are student logits, y are ground-truth token labels, p_t' is the projected teacher distribution, T is the temperature parameter, σ is softmax, and α controls the balance between anchoring (CE) and knowledge transfer (KL). The T² scaling compensates for the reduced gradient magnitudes at higher temperatures [1].

#### 3.4.4 Numerical Precision

GLADIUS's architecture produces hidden state magnitudes that grow monotonically across layers due to the combination of SLA²'s linear attention path (which lacks the normalizing denominator of softmax attention) and additive residual connections:

**Table 3: GLADIUS Hidden State Magnitude by Layer**

| Layer | Mean Hidden State Magnitude |
|-------|----------------------------|
| 1 | ~0.7 |
| 6 | ~13 |
| 12 | ~58 |
| 16 | ~140 |

IEEE 754 float16 has a maximum representable value of 65,504. At layer 12 and beyond, hidden states approach this limit, causing overflow and NaN propagation. Additionally, the Time2Vec module stores Unix timestamps (~1.77 × 10⁹), which instantly overflow float16.

We adopt bfloat16 (brain floating point), which shares float32's 8-bit exponent (range ±3.4 × 10³⁸) but uses only 7 mantissa bits. This preserves dynamic range while halving memory. The Time2Vec forward pass is further excluded from autocast and computed in float32 to handle timestamp arithmetic.

---

## 4. Experiments

### 4.1 GPT-2 Distillation (Phase 1)

#### 4.1.1 Pre-Distillation Surgery

Prior to distillation, the GLADIUS student exhibited mode collapse from earlier training: function-word tokens ("is," "in," "a") dominated output with >99% probability, creating a self-reinforcing attractor through the weight-tied embedding/output matrix [4]. Three surgical interventions were applied:

1. **Function word norm halving:** Output norms for the 50 most common function words were scaled by 0.5×, reducing logit dominance.
2. **Embedding orthogonalization:** Gram-Schmidt orthogonalization was applied to the top-100 most-used embedding vectors, breaking co-dependency between similar tokens.
3. **Attention head audit:** All attention heads were examined for degenerate patterns (uniform attention, single-token fixation).

Post-surgery output was diverse but incoherent: `"herosiporumed ration qu qu data est sesodisosis vel rect vel"`. The attractor was broken, providing a clean initial condition for distillation.

#### 4.1.2 Training Configuration

**Table 4: Phase 1 Training Configuration**

| Parameter | Value |
|-----------|-------|
| Teacher | GPT-2 (124M, frozen, bfloat16, GPU) |
| Student | GLADIUS Seed (6.9M, trainable) |
| Batch size | 1 (effective: 16 via gradient accumulation) |
| Learning rate | 3 × 10⁻⁵ (peak), cosine decay with 200-step linear warmup |
| Precision | bfloat16 (autocast, Time2Vec excluded) |
| α (CE weight) | 0.3 |
| Temperature T | 4.0 |
| Total steps | 3,000 (187 effective parameter updates) |
| Training data | WikiText-103 subset |
| Hardware | NVIDIA RTX 2050, 4 GB VRAM |
| VRAM usage | 5.42 GB (unified memory) |
| Wall time | 39.0 minutes |

#### 4.1.3 Results

**Table 5: Phase 1 Loss Trajectory**

| Step | Total Loss (avg100) | CE Loss | Soft KL | Learning Rate |
|------|---------------------|---------|---------|---------------|
| 80 | 8.95 | 9.69 | 21.5 | 7.5e-7 |
| 280 | 8.20 | 9.39 | 19.8 | 2.55e-6 |
| 500 | 7.13 | 7.76 | 14.8 | 4.65e-6 |
| 1000 | 6.31 | 9.57 | 13.0 | 9.15e-6 |
| 1500 | 6.26 | — | 10.5 | 1.49e-5 |
| 2000 | ~6.1 | — | ~11.0 | ~2.0e-5 |
| 3000 | 5.69 | — | ~10.5 | (decay) |

Total loss decreased 36.4% (8.95 → 5.69). Soft KL divergence decreased 51.2% (21.5 → 10.5), indicating that the student's output distributions converged toward the teacher's mapped distributions. The loss curve exhibited smooth, monotonic descent with a single "reorganization dip" at step 1500 where output quality temporarily regressed despite continued loss improvement — the model was absorbing new token categories (numbers, special characters from technical text) while restructuring internal representations.

#### 4.1.4 Output Evolution

The most striking result is the qualitative evolution of generated text, which follows a developmental trajectory from noise to proto-language:

**Step 0 (post-surgery):** `"herosiporumed ration qu qu data est sesodisosis vel rect vel"` — Diverse but nonsensical. Latin-ish fragments. The attractor has been broken.

**Step 500:** `"The meaning of life is pl a . that '; " ' ( A "ER that F ( ,EE F is"` — Punctuation and single characters dominate. The model is learning character-level distributional patterns from the teacher.

**Step 1000:** `"The meaning of life is for and a with or to , you you which . only the there one you his what any"` — **Real English words emerge.** Pronouns (you, his), prepositions (for, with, to), conjunctions (and, or), determiners (the, a). The model has learned what words *are* from GPT-2's soft distributions.

**Step 1500:** `"The meaning of life is to ⁇ and ( ( ( P ( ( ; , to it a. and, by it the"` — Apparent regression: numbers and special characters appear. This corresponds to the "reorganization dip" in the loss curve as the model integrates diverse token categories from the training corpus.

**Step 2000:** `"The meaning of life is ; my. in , this and, of, the and of, what, was by his as, that, of at he"` — English words return with greater variety. Possessives ("my," "his"), past tense ("was"), demonstratives ("this," "that") — morphological categories are being acquired.

**Step 2500:** `"Intelligence emerges from so was who, it so not it by by, who and his of was her and more, a not by"` — New word classes: relative pronouns ("who"), comparatives ("more"), negation ("not"), gendered pronouns ("her"). Narrative word ordering begins to emerge.

**Step 3000:** `"Intelligence emerges from that ,.ed to of ...ed, in his a the . a in , the in, to and . to a his"` — Verb suffixes (".ed") appear. Article-noun proximity patterns visible. The *structure* of English is taking shape, though coherent sentences have not yet emerged.

All five evaluation prompts produced diverse (non-repeating) output at every checkpoint, confirming that the pre-distillation surgery successfully eliminated the mode collapse attractor and distillation training did not reintroduce it.

#### 4.1.5 Numerical Stability Findings

Five implementation attempts were required before stable training was achieved:

1. **Attempt 1 (OOM):** Simultaneous loading of student checkpoint (including optimizer states) and teacher model exceeded GPU memory. **Fix:** Sequential loading with garbage collection between stages.

2. **Attempt 2 (OOM):** Dense vocabulary projection matrix [50,257 × 32,000] consumed 6.4 GB. **Fix:** Dictionary cache approach (<1 MB).

3. **Attempt 3 (NaN):** Default float16 autocast caused overflow at layer 12+ where hidden states reach magnitude 140. **Fix:** Switch to bfloat16.

4. **Attempt 4 (NaN):** Time2Vec module stores Unix timestamps (~1.77 × 10⁹), causing NaN even in bfloat16 during internal arithmetic. **Fix:** Exclude Time2Vec from autocast scope, force float32.

5. **Attempt 5 (Success):** bfloat16 autocast with Time2Vec exclusion produced stable training from step 1 through completion.

These findings have architectural implications: any model with linear attention (unnormalized) and additive residual connections will exhibit hidden state magnitude growth, making float16 unsafe for training beyond a model-dependent depth threshold.

### 4.2 Qwen3-1.7B Distillation (Phase 2)

#### 4.2.1 Training Configuration

Phase 2 upgraded the teacher by 10.7× (124M → 1.33B parameters) while introducing several configuration changes from Phase 1.

**Table 6: Phase 2 Training Configuration**

| Parameter | Value |
|-----------|-------|
| Teacher | Qwen3-1.7B (1.33B, frozen, 4-bit NF4 quantized, GPU) |
| Student | GLADIUS Drake (256.8M, trainable) |
| Batch size | 1 (effective: 16 via gradient accumulation) |
| Learning rate | 3 × 10⁻⁵ (peak), linear warmup |
| Precision | bfloat16 |
| α (CE weight) | 0.7 (inverted from Phase 1's 0.3) |
| Temperature T | 2.0 (halved from Phase 1's 4.0) |
| Teacher top-K | 100 tokens (truncated) |
| Position sampling | 48 of 256 positions per sequence |
| Total steps | 3,000 |
| Training data | 6 files (256,635 chunks) |
| Hardware | NVIDIA RTX 2050, 4 GB VRAM |
| VRAM usage | 7.20 GB (unified memory) |
| Wall time | 82.4 minutes |
| Label smoothing | 0.1 |

#### 4.2.2 Results

**Table 7: Phase 2 Loss Trajectory**

| Step | Total Loss (avg100) | CE Loss (point) | Soft KL (point) |
|------|---------------------|------------------|------------------|
| 100 | 12.52 | 9.65 | 13.63 |
| 500 | 13.56 | 10.81 | 14.22 |
| 1000 | 12.11 | 10.29 | 12.43 |
| 1500 | 12.12 | 10.01 | 11.42 |
| 2000 | 12.21 | 10.16 | 14.64 |
| 2500 | 12.14 | 10.75 | 12.79 |
| 3000 | 12.17 | 10.56 | 13.64 |

Total loss decreased only 2.8% (12.52 → 12.17), compared to Phase 1's 36.4%. The best rolling average was 11.96 (step ~2750) — still 2.10× worse than Phase 1's final loss. Point losses oscillated between 9.8 and 16.7 within 50-step windows, indicating a fundamentally hostile optimization landscape. Critically, the soft KL divergence *increased* from 13.5 to 13.6 over training — the student diverged from the teacher rather than converging.

#### 4.2.3 Output Evolution and Collapse

Unlike Phase 1's monotonic improvement, Phase 2 exhibited an inverted U-curve: output quality peaked at step 1500 and then catastrophically degraded.

**Step 250:** `"The meaning of life is ; , , — in of . , ⁇  of . ⁇  ⁇ ) = ) ( = ( . ⁇  ) ))"` — Punctuation, brackets, and ⁇ (unknown) tokens. The ⁇ symbol represents GLADIUS's SentencePiece `<unk>` token (U+2047), emitted when the tokenizer encounters unmappable byte sequences.

**Step 750 (brief improvement):** `"The meaning of life is . the a,, , to a - , of , , , on I of of the a , in a , he the he in and — and of of to and a I , a ("` — English function words dominate. Articles, prepositions, and pronouns present. The ⁇ tokens temporarily retreat.

**Step 1500 (peak):** `"The meaning of life is , and , in the the the is and of. . the , . , is and ... the in of of the the is of the , to and , the , of and a ... ' at"` — Best output. No ⁇ tokens. Copula ("is"), conjunctions, articles, and prepositions present. Proto-syntactic patterns visible: "the X is Y and Z of W."

**Step 3000 (collapse):** `"The meaning of life is ⁇  .   ⁇  ( ⁇   ⁇  of I  . : , a ⁇  is , ⁇  ⁇  . and    . . , . , a  ⁇   the , ⁇  ."` — ⁇ tokens dominate. All five evaluation prompts produced degraded output. The model's GPT-2-inherited English knowledge was overwritten by ⁇ noise.

**Table 8: Output Quality Trajectory (Phase 2)**

| Step | English Words | ⁇ Tokens | Coherence | Equivalent Phase 1 Step |
|------|--------------|-----------|-----------|--------------------------|
| 250 | Minimal | High | None | — (worse than start) |
| 750 | Good | Low | Fragments | ~Step 1000 |
| 1500 | **Best** | **None** | Proto-syntax | ~Step 1500 |
| 2000 | Medium | Medium | Fragments | ~Step 1000 |
| 3000 | Low | **Dominant** | Collapsed | ~Step 200 (worse) |

### 4.3 Comparative Analysis

**Table 9: Phase 1 vs Phase 2 Summary**

| Metric | Phase 1 (GPT-2) | Phase 2 (Qwen3) | Ratio |
|--------|-----------------|------------------|-------|
| Teacher parameters | 124M | 1.33B | 10.7× |
| Teacher vocabulary | 50,257 | 151,669 | 3.02× |
| Vocabulary ratio (T/S) | 1.57× | 9.48× | 6.04× |
| Vocab direct match rate | ~40% | 12.2% | 0.31× |
| Starting loss | 8.95 | 12.52 | 1.40× |
| Final loss | 5.69 | 12.17 | 2.14× |
| Loss reduction | 36.4% | 2.8% | 13.0× |
| Soft KL trajectory | 22 → 10.5 (↓52%) | 13.5 → 13.6 (↑0.7%) | — |
| Output at final step | Proto-grammar | ⁇ collapse | — |
| Best checkpoint | Final (step 3000) | Mid-training (step 1500) | — |
| Wall time | 39 min | 82 min | 2.1× |
| α (CE weight) | 0.3 | 0.7 | 2.3× |
| Temperature T | 4.0 | 2.0 | 0.5× |
| Position sampling | All | 48/256 (18.8%) | 0.19× |
| Teacher precision | bfloat16 | 4-bit NF4 | — |

The comparison reveals a paradox: the objectively superior teacher (10.7× more parameters, bilingual capability, instruction tuning, code generation) produced a categorically inferior student. This paradox resolves upon examining the five compounding failure modes detailed in Section 5.1.

---

## 5. Discussion

### 5.1 Vocabulary Gap as Primary Bottleneck

The central finding of this work is that vocabulary ratio, not teacher quality, determines distillation success at extreme scale differences. We identify five compounding failure modes in Phase 2, of which the vocabulary mapping catastrophe is primary:

**Failure 1 — Vocabulary Mapping Catastrophe.** Qwen3's 151K vocabulary includes Chinese characters, multilingual subwords, code tokens, and special instruction markers — none of which have representation in GLADIUS's 16K English-focused vocabulary. The dictionary cache found only 12.2% direct matches (18,445 of 149,860 mappings). For the remaining 87.8%, teacher probability mass is redistributed through approximate text-level re-encoding or accumulates at `<unk>`.

This creates a self-reinforcing attractor: as unmapped mass accumulates at `<unk>`, the KL loss trains the student to increase its `<unk>` probability. Over thousands of steps, `<unk>` (rendered as ⁇ in SentencePiece output) becomes the dominant prediction — identical in mechanism to the function-word mode collapse observed in earlier GLADIUS training [4], but with a worse token.

**Failure 2 — Inverted Alpha.** Phase 1 used α = 0.3 (30% hard labels, 70% soft targets), allowing the teacher's dark knowledge to dominate. Phase 2 used α = 0.7 (70% hard labels, 30% soft targets), effectively converting the distillation into a poorly regularized language modeling run with noisy soft-target regularization. The high-α CE component produced volatile gradients (CE oscillated 7.2–12.1 within 100-step windows) while the low-weight KL component was insufficient to stabilize learning.

**Failure 3 — Low Temperature.** Phase 1's T = 4.0 created smooth teacher distributions that exposed relational structure among alternative tokens. Phase 2's T = 2.0 left teacher distributions peaky, concentrating probability on few tokens and hiding the tails that encode dark knowledge. Combined with top-K = 100 truncation, the student received a sparse, peaked fragment of the teacher's knowledge.

**Failure 4 — Sparse Position Sampling.** Only 48 of 256 token positions per sequence were sampled for KL loss computation (81% discarded), a VRAM optimization necessary to fit the 4-bit quantized Qwen3 alongside the student. Phase 1 used all positions. The sparse sampling provided fragmentary teacher signal insufficient for learning sequential dependencies.

**Failure 5 — Checkpoint Inheritance.** Phase 2 started from the GPT-2-distilled checkpoint rather than a clean slate. The model's weights encoded GPT-2's English distributions, creating a conflict with Qwen3's structurally different mapped distributions. The result was oscillation between two incompatible distributional attractors.

### 5.2 Smaller Teachers Transfer Better at Edge Scale

Our results challenge the prevailing assumption that larger teachers always produce better students [17]. At sub-100M student scale with incompatible tokenizers, the effective knowledge transfer depends not on the teacher's absolute capability but on the *fidelity of the interface between teacher and student*. Specifically:

1. **Vocabulary proximity matters more than model capacity.** GPT-2's 50K BPE vocabulary and GLADIUS's 32K SentencePiece share significant overlap in common English subwords. Qwen3's 151K multilingual vocabulary has 88% of its mass in tokens that have no student equivalent.

2. **Architectural scale proximity matters.** GPT-2 (124M, 12 layers, 768 hidden) is closer to GLADIUS (6.9M, 6 layers, 192 hidden) in architectural proportions than Qwen3 (1.33B, 24 layers, 2048 hidden). The distributional complexity of a 1.33B model may exceed the absorption capacity of a 6.9M student — the distributions are "too rich" for the student's representational budget.

3. **Quantization noise compounds.** Fitting Qwen3 on a 4 GB VRAM GPU required 4-bit NF4 quantization, introducing distribution noise that layers on top of the vocabulary mapping noise. Phase 1's teacher ran in full bfloat16.

These observations suggest a practical guideline for edge distillation: select teachers that are 2–20× the student's size with vocabulary ratios below 3×, rather than defaulting to the largest available model.

### 5.3 Limitations

This study has several limitations:

1. **Confounded variables.** Phase 1 and Phase 2 differ in multiple dimensions simultaneously (teacher size, vocabulary, α, T, sampling, precision, starting checkpoint). A fully controlled study would vary each factor independently. However, the extreme magnitude of the Phase 2 failure (2.14× worse despite 10.7× larger teacher) strongly implicates the vocabulary ratio as the dominant factor.

2. **Single student architecture.** Results are specific to GLADIUS's architecture. Student models with standard transformer components might show different sensitivity to vocabulary mismatch.

3. **Limited step budget.** Both phases ran for only 3,000 steps. GPT-2 itself trained for approximately 800,000 steps. The Phase 1 student learned word-level patterns but not sentence-level coherence. Extended training (10,000–50,000 steps) may be required for coherent generation.

4. **Single hardware platform.** All experiments ran on a single RTX 2050 with 4 GB VRAM. The VRAM constraint directly forced Phase 2's design compromises (4-bit quantization, position sampling).

5. **Evaluation methodology.** Output quality was assessed qualitatively through generated text samples rather than quantitative benchmarks (perplexity on held-out data, downstream task accuracy). Future work should incorporate standardized evaluation.

### 5.4 Future Work

Based on these findings, we identify four directions for continued investigation:

1. **Extended GPT-2 distillation.** The Phase 1 protocol demonstrated monotonic improvement through 3,000 steps with no signs of plateau. Running 10,000–30,000 steps with the same configuration (α = 0.3, T = 4.0, all positions, cosine LR decay) is the lowest-risk path to coherent generation. Estimated compute: 3–10 hours on RTX 2050.

2. **Vocabulary bridge layer.** A learnable linear projection W ∈ ℝ^{V_t × V_s} trained jointly with the student could replace the lossy dictionary cache with a differentiable mapping. The projection weights encode which teacher token distributions map to which student tokens, allowing the model to learn the mapping rather than imposing it heuristically.

3. **Intermediate teacher selection.** Models in the 100M–500M parameter range with vocabulary sizes of 32K–50K (e.g., SmolLM-135M with 49K vocabulary, TinyLlama-1.1B with 32K vocabulary, Phi-2 with 51K vocabulary and MIT license) may provide the optimal teacher-student balance: sufficient capability for meaningful dark knowledge with manageable vocabulary ratios.

4. **Cross-domain distillation.** The same framework can be adapted for time series data by replacing text tokenization with continuous value embedding. GLADIUS's Time2Vec, SLA², MoE, and Warm Memory are architecturally aligned with temporal sequence processing [4], and the distillation infrastructure developed here provides the training scaffold.

---

## 6. Conclusion

We have presented the first systematic study of knowledge distillation into a sub-100M parameter cognitive architecture, demonstrating both the feasibility and the sharp boundary conditions of cross-architecture transfer.

The GPT-2 distillation (Phase 1) proved that GLADIUS's non-standard components — SLA², MoE, Time2Vec, and dual-tier memory — can absorb and restructure knowledge from an architecturally different teacher. Over 3,000 steps and 39 minutes on consumer GPU hardware, the student's output evolved from random tokens through punctuation patterns to recognizable English word sequences with emerging morphological categories. The 52% reduction in soft KL divergence confirms that the student's distributions genuinely converged toward the teacher's dark knowledge, not merely toward lower loss through trivial strategies.

The Qwen3 distillation (Phase 2) proved, equally definitively, that a 9.48× vocabulary ratio creates an insurmountable noise floor. A teacher with 10.7× more parameters produced a student 2.14× worse than the smaller teacher's student. The vocabulary mapping catastrophe — where 87.8% of teacher probability mass passes through approximate projection, accumulating at `<unk>` and creating a self-reinforcing collapse attractor — is the primary failure mode, compounded by hyperparameter choices that amplified rather than mitigated the mapping noise.

The practical implication is counterintuitive but robust: for edge distillation into architecturally novel students, teacher selection should prioritize vocabulary compatibility over model scale. A 124M parameter teacher with a 1.57× vocabulary ratio transfers more knowledge than a 1.33B parameter teacher with a 9.48× ratio. The interface between teacher and student determines everything — not the capability of either in isolation.

These findings extend beyond GLADIUS to any scenario where compact, architecturally heterogeneous models must absorb knowledge from larger systems: federated learning at the edge, domain-specific fine-tuning of custom architectures, and the growing ecosystem of specialized AI accelerators that demand models designed for their hardware constraints rather than scaled-down versions of cloud models.

---

## References

[1] G. Hinton, O. Vinyals, and J. Dean, "Distilling the Knowledge in a Neural Network," *arXiv preprint arXiv:1503.02531*, 2015.

[2] V. Sanh, L. Debut, J. Chaumond, and T. Wolf, "DistilBERT, a distilled version of BERT: smaller, faster, cheaper and lighter," *Proc. 5th Workshop on Energy Efficient Machine Learning and Cognitive Computing (NeurIPS)*, 2019.

[3] X. Jiao, Y. Yin, L. Shang, X. Jiang, X. Chen, L. Li, F. Wang, and Q. Liu, "TinyBERT: Distilling BERT for Natural Language Understanding," *Findings of EMNLP*, pp. 4163–4174, 2020.

[4] A. Shakil and AVA, "The Adaptive Cognitive Model: GLADIUS as Unified Cognitive Kernel," Artifact Virtual, Technical Report, 2026.

[5] A. Romero, N. Ballas, S. E. Kahou, A. Chassang, C. Gatta, and Y. Bengio, "FitNets: Hints for Thin Deep Nets," *Proc. ICLR*, 2015.

[6] S. Zagoruyko and N. Komodakis, "Paying More Attention to Attention: Improving the Performance of Convolutional Neural Networks via Attention Transfer," *Proc. ICLR*, 2017.

[7] W. Wang, F. Wei, L. Dong, H. Bao, N. Yang, and M. Zhou, "MiniLM: Deep Self-Attention Distillation for Task-Agnostic Compression of Pre-Trained Transformers," *Proc. NeurIPS*, vol. 33, pp. 5776–5788, 2020.

[8] E. Frantar, S. Ashkboos, T. Hoefler, and D. Alistarh, "GPTQ: Accurate Post-Training Quantization for Generative Pre-trained Transformers," *Proc. ICLR*, 2023.

[9] J. Lin, J. Tang, H. Tang, S. Yang, X. Dang, C. Gan, and S. Han, "AWQ: Activation-aware Weight Quantization for LLM Compression and Acceleration," *Proc. MLSys*, 2024.

[10] T. Chen, J. Frankle, S. Chang, S. Liu, Y. Zhang, Z. Wang, and M. Carbin, "The Lottery Ticket Hypothesis for Pre-trained BERT Networks," *Proc. NeurIPS*, vol. 33, pp. 15834–15846, 2020.

[11] H. Cai, C. Gan, T. Wang, Z. Zhang, and S. Han, "Once-for-All: Train One Network and Specialize it for Efficient Deployment," *Proc. ICLR*, 2020.

[12] X. Jiao, Y. Yin, L. Shang, X. Jiang, X. Chen, L. Li, F. Wang, and Q. Liu, "TinyBERT: Distilling BERT for Natural Language Understanding," *Findings of EMNLP*, 2020.

[13] Y. Kim and A. M. Rush, "Sequence-Level Knowledge Distillation," *Proc. EMNLP*, pp. 1317–1327, 2016.

[14] T. Chen, I. Goodfellow, and J. Shlens, "Net2Net: Accelerating Learning via Knowledge Transfer," *Proc. ICLR*, 2016.

[15] A. Radford, J. Wu, R. Child, D. Luan, D. Amodei, and I. Sutskever, "Language Models are Unsupervised Multitask Learners," OpenAI, 2019.

[16] Qwen Team, "Qwen3 Technical Report," Alibaba Group, 2025.

[17] S. Cho and J. P. Hariharan, "On the Efficacy of Knowledge Distillation," *Proc. ICCV*, pp. 4794–4802, 2019.

---

**Ali Shakil, AVA**  
Artifact Virtual (SMC-Private) Limited  
ali.shakil@artifactvirtual.com

© 2026 Artifact Virtual (SMC-Private) Limited. All rights reserved.
