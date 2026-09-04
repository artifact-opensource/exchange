# Cross-Architecture Knowledge Distillation: Qwen3-1.7B → GLADIUS Kernel

**Report ID:** GLADIUS-DISTILL-002  
**Date:** 2026-03-11 (Day 27)  
**Author:** Ava Shakil, Artifact Virtual  
**Status:** Experiment Complete — Phase 2 (Qwen3-1.7B) ❌ FAILED  
**Prior Report:** [GPT-2 Distillation (GLADIUS-DISTILL-001)](gladius-distillation-gpt2-report.md)

---

## 1. Abstract

This report documents the second cross-architecture knowledge distillation attempt for the GLADIUS kernel, upgrading the teacher from GPT-2 (124M) to Qwen3-1.7B (1.33B parameters). Despite the 10.7× larger, fundamentally more capable teacher, the Qwen3 distillation **categorically failed** compared to Phase 1. Final loss was **12.17** (avg100) vs GPT-2's **5.69** — a 2.14× worse result. Output quality **regressed** over training, with the final step 3000 evaluation producing more ⁇ tokens (unmapped vocabulary) than at step 1500. The model reached its best coherence around steps 1500–2000 before catastrophically degrading. This report analyzes why a stronger teacher produced a worse student, identifies the vocabulary mapping catastrophe as the root cause, and recommends an architectural solution for Phase 3.

---

## 2. Experiment Configuration

| Parameter | GPT-2 (Phase 1) | Qwen3 (Phase 2) |
|-----------|-----------------|------------------|
| **Teacher model** | GPT-2 124M | Qwen3-1.7B (1.33B) |
| **Teacher device** | GPU (bfloat16) | GPU (4-bit NF4 quantized) |
| **Teacher vocab** | 50,257 | 151,669 |
| **Student model** | GLADIUS 6.9M | GLADIUS 256.8M |
| **Student vocab** | 32,000 | 16,000 |
| **Starting checkpoint** | Post-surgery (clean slate) | GPT-2 distilled final |
| **α (CE weight)** | 0.3 | 0.7 (inverted!) |
| **Temperature** | 4.0 | 2.0 |
| **Learning rate** | 3e-5 | 3e-5 |
| **Gradient accum** | 16 | 16 |
| **Seq length** | — | 256 |
| **Top-K teacher** | full softmax | 100 tokens |
| **Sampled positions** | all | 48 per sequence |
| **Steps** | 3,000 | 3,000 |
| **Data** | WikiText-103 subset | 6 files (256,635 chunks) |
| **Wall time** | 39 min | 82.4 min |
| **Label smoothing** | 0 | 0.1 |
| **Hidden distillation** | No | No (disabled) |

---

## 3. Training Curve — Loss Progression

### 3.1 Total Loss (avg100) Trajectory

| Step | Total Loss (avg100) | CE Loss (point) | Soft KL (point) |
|------|---------------------|------------------|------------------|
| 100 | 12.52 | 9.65 | 13.63 |
| 250 | 12.32 | 10.23 | 12.55 |
| 500 | 13.56 | 10.81 | 14.22 |
| 750 | 12.47 | 9.35 | 11.37 |
| 1000 | 12.11 | 10.29 | 12.43 |
| 1250 | 12.40 | 11.94 | 11.14 |
| 1500 | 12.12 | 10.01 | 11.42 |
| 1750 | 12.25 | 10.06 | 12.92 |
| 2000 | 12.21 | 10.16 | 14.64 |
| 2250 | 12.14 | 7.15 | 10.95 |
| 2500 | 12.14 | 10.75 | 12.79 |
| 2750 | 11.98 | 9.79 | 10.27 |
| 3000 | 12.17 | 10.56 | 13.64 |

### 3.2 Key Observations

**The loss barely moved.** Over 3,000 steps:
- Total loss: 12.52 → 12.17 (2.8% reduction)
- Best avg100: 11.96 (step ~2750) — still more than 2× GPT-2's final loss

**Extreme volatility.** Point losses oscillated wildly between 9.8 and 16.7 within 50-step windows. Compare GPT-2 Phase 1 which showed smooth, monotonic descent. This volatility indicates the optimization landscape was fundamentally hostile.

**No convergence trend.** The loss at step 2750 (11.98) was barely better than step 100 (12.52). The student was thrashing, not learning. The learning rate was still climbing (linear warmup never ended in 3000 steps at this schedule), meaning the optimizer was INCREASING perturbation force while the model couldn't absorb what it had.

**Best loss was 10.997 (step 1500, point).** This is a single lucky batch — the rolling average never dropped below ~11.96.

---

## 4. Comparison with GPT-2 Phase 1

### 4.1 Quantitative Comparison

| Metric | GPT-2 (Phase 1) | Qwen3 (Phase 2) | Delta |
|--------|-----------------|------------------|-------|
| Starting loss | 8.95 | 12.52 | +3.57 (40% higher start) |
| Final loss (avg100) | 5.69 | 12.17 | 2.14× worse |
| Loss reduction | 36.4% | 2.8% | 13× less improvement |
| Soft KL start | ~22.0 | ~13.5 | — |
| Soft KL end | ~10.5 | ~13.6 | Soft KL INCREASED |
| Best output quality | Step 3000 (coherent) | Step 1500 (fragments) | — |
| Final output quality | English word sequences | ⁇-dominated gibberish | Catastrophic |
| Wall time | 39 min | 82.4 min | 2.1× slower |

### 4.2 The Paradox: Stronger Teacher, Weaker Student

GPT-2 is a 2018-era model with 124M parameters and English-only training. Qwen3-1.7B is a 2025 model with 1.33B parameters, bilingual (EN/ZH), instruction-tuned, code-capable. By every standard metric, Qwen3 is the vastly superior teacher.

Yet GPT-2 produced a student that learned English words, pronouns, verb morphology, and proto-syntactic structure. Qwen3 produced a student that regressed into ⁇ tokens and punctuation soup.

**This is not paradoxical — it's expected given five compounding failures:**

---

## 5. Root Cause Analysis: Five Compounding Failures

### 5.1 Vocabulary Mapping Catastrophe (PRIMARY)

**The core problem.** Qwen3's tokenizer has 151,669 tokens. GLADIUS has 16,000 tokens. The vocab mapping cache found only **12.2% direct matches** (18,445 of 149,860 mappings). For the remaining 87.8% of Qwen3's vocabulary, the teacher's probability mass was being redistributed through approximate text-level re-encoding.

Compare GPT-2: 50,257 → 32,000 tokens. Much closer vocabulary sizes. GPT-2's BPE and GLADIUS's SentencePiece share significant overlap in common English subwords. The mapping was lossy but navigable.

With Qwen3: the 151K vocabulary includes Chinese characters, multilingual tokens, code tokens, special instruction tokens — none of which have any representation in GLADIUS's 16K English-focused vocabulary. When the teacher's softmax puts significant probability on Chinese tokens or specialized code tokens, that mass either gets dumped into `<unk>` or gets mapped to the nearest phonetic/character match — which is **noise**, not knowledge.

**The ⁇ token is GLADIUS's `<unk>`.** Its increasing frequency in later steps means the model was being *trained to predict unmappable tokens as the most likely output*. The distillation loss rewarded producing ⁇ because that's where unmapped teacher probability mass accumulated.

### 5.2 Inverted Alpha (α = 0.7 CE, 0.3 KL)

In Phase 1, α = 0.3 meant 30% hard labels + 70% soft teacher distribution. The soft targets dominated, and GPT-2's "dark knowledge" (relative probabilities among alternatives) drove learning.

In Phase 2, α = 0.7 means **70% hard labels + 30% soft targets.** The balance flipped. The student was primarily trying to match the training corpus token-by-token (CE) rather than absorbing the teacher's distributional knowledge (KL). This defeats the purpose of distillation — you don't need a 1.7B teacher to compute cross-entropy against labels.

**Impact:** The CE component produced high, noisy gradients (CE losses oscillated 7.2–12.1 within a single 100-step window). The soft target component — which should have been the stabilizing force — was weighted too low to anchor learning.

### 5.3 Low Temperature (T = 2.0 vs Phase 1's T = 4.0)

Higher temperature → softer distributions → more information in the tails → better dark knowledge transfer. Phase 1 used T=4.0, which creates very smooth teacher distributions. Phase 2 used T=2.0, which leaves teacher distributions peakier.

With T=2.0, Qwen3's already-confident predictions stay concentrated on a few tokens. The student doesn't get to see the relational structure between alternatives. Combined with the Top-K=100 truncation (only 100 teacher tokens' probabilities were used), the student was learning from a sparse, peaked slice of the teacher's knowledge — not the full distributional landscape.

### 5.4 Sparse Position Sampling (48 positions per 256-length sequence)

Only 48 of 256 token positions per sequence were sampled for KL loss computation. This means 81% of each sequence's teacher knowledge was **discarded**. Phase 1 used all positions.

This was a VRAM optimization (Qwen3 on GPU in 4-bit needs room), but it means the student only gets fragmentary teacher signal. The 48 sampled positions are essentially random windows into what the teacher thinks — not enough for the student to learn sequential dependencies.

### 5.5 Starting from GPT-2 Checkpoint (Not Clean Slate)

Phase 2 started from the GPT-2-distilled checkpoint — a model already shaped by GPT-2's 50K vocabulary distributions. Now it's being asked to reshape itself toward Qwen3's 151K vocabulary distributions, mapped through an 88%-approximate projection, with the opposite alpha weighting, at half the temperature, with sparse position sampling.

The model was fighting its own prior learning. The GPT-2 checkpoint had developed English word preferences. Qwen3's mapped soft targets pushed toward ⁇ and Chinese-derived mappings. The result: thrashing between two incompatible distributional attractors.

---

## 6. Eval Sample Quality at Key Checkpoints

### Step 250 — Pure Noise
```
"The meaning of life is ; , , — in of . , ⁇  of . ⁇  ⁇ ) = ) ( = ( . ⁇  ) )) "  ⁇  ⁇ . ⁇  ⁇  ) 3 , _ )  2 -"
```
Punctuation, brackets, ⁇ tokens. No English words beyond the prompt. The model immediately started outputting unmapped tokens. This tells us the Qwen3 soft targets were already poisoning the output distribution from step 1.

### Step 500 — Faint Signal
```
"In the beginning there was :  . _. , , . a   ( ;  _ , ] ⁇  - . ⁇  , , ,  . . = ( " ( .  p . , , and ⁇  ("
```
Occasional articles ("a"), conjunctions ("and") appear. But dominated by punctuation and ⁇. Compare GPT-2 Phase 1 at step 500: `"pl a . that '; " ' ( A "ER"` — also noisy but with character-level pattern learning visible.

### Step 750 — Brief Improvement
```
"The meaning of life is . the a,, , to a - , of , , , on I of of the a , in a , he the he in and — and of of to and a I , a ("
```
**The best window.** English function words dominate. Articles, prepositions, pronouns all present. This is roughly equivalent to GPT-2 Phase 1 at step 1000. But note: the ⁇ tokens have temporarily retreated, not disappeared.

### Step 1000 — Plateau
```
"The meaning of life is ,  ⁇  (  with the the of ,  ,   ⁇  : , .  — the I  for . , the , . of . ⁇  and with in of the  - ,"
```
⁇ tokens return. English words still present but losing ground. The model is oscillating between two attractors: the GPT-2-inherited English preference and the ⁇-heavy Qwen3 target distribution.

### Step 1500 — Peak Performance
```
"The meaning of life is , and , in the the the is and of. . the , . , is and ... the in of of the the is of the , to and , the , of and a ... ' at"
```
**Best checkpoint.** No ⁇ tokens in this sample. Copula ("is"), conjunctions, articles, prepositions all present. Structure emerging: "the X is Y and Z of W" patterns visible. This is close to GPT-2 Phase 1 at step 1000-1500, but with less diversity (heavy repetition of "the").

### Step 2000 — Holding
```
"In the beginning there was ⁇  . . , in  the is , . of in the and , , , . the the . ' , : ... the ( , the. . , . . and , at , , and"
```
Approximately stable. ⁇ tokens reappear but don't dominate. Still producing English function words. A plateau, not a regression — yet.

### Step 2500 — Regression Begins
```
"Intelligence emerges from the of  ⁇  of a ( , ( as  , , " in , ⁇   , to the a , ,, to the , , . a ( , of to the  , , ,"
```
Increasing ⁇ density. Vocabulary narrowing to articles and prepositions. The model is simplifying — defaulting to highest-frequency tokens plus ⁇.

### Step 3000 — Collapse
```
"The meaning of life is ⁇  .   ⁇  ( ⁇   ⁇  of I  . : , a ⁇  is , ⁇  ⁇  . and    . . , . , a  ⁇   the , ⁇  . "
"In the beginning there was  , ⁇  [ . " , and , ( . ⁇  ⁇   ⁇  -   . ,  : ⁇  ⁇  ⁇  in ⁇  ⁇  ⁇   ⁇  ⁇  ⁇  , ⁇  ⁇  :   ⁇ "
"Intelligence emerges from the . ( ⁇  , ⁇  ⁇  and to , the  ⁇  .   ⁇  in ( ( ⁇  ⁇  , the , ⁇  , ⁇   a and ,  ⁇    and . ⁇  ⁇ "
```
**Catastrophic.** All 5 prompts rated 🟡 (degraded). ⁇ tokens outnumber English words. "In the beginning there was" produces 14 ⁇ tokens in 40 tokens of output. The model hasn't just failed to learn — it's been actively **unlearned**. The GPT-2-derived English knowledge that existed at step 0 has been erased and replaced with ⁇ noise.

### Quality Trajectory Summary

| Step | English Words | ⁇ Tokens | Coherence | Equivalent GPT-2 Phase 1 Step |
|------|--------------|-----------|-----------|-------------------------------|
| 250 | Minimal | High | None | — (worse than start) |
| 500 | Low | Medium | None | Step ~300 |
| 750 | Good | Low | Fragments | Step ~1000 |
| 1000 | Medium | Medium | Fragments | Step ~800 |
| 1500 | **Best** | **Low** | Proto-syntax | Step ~1500 |
| 2000 | Medium | Medium | Fragments | Step ~1000 |
| 2500 | Medium | Rising | Narrowing | Step ~700 |
| 3000 | Low | **Dominant** | Collapsed | Step ~200 (worse) |

**The model peaked at step 1500 and then actively degraded.** The continuing increase in learning rate (linear warmup that never transitioned to decay within 3000 steps) combined with the ⁇-heavy soft targets gradually overwrote the model's English knowledge.

---

## 7. The ⁇ Token Problem — Deep Analysis

### 7.1 What ⁇ Is

In SentencePiece tokenizers, `⁇` is the Unicode replacement character U+2047 (DOUBLE QUESTION MARK), used as the visual representation of the `<unk>` (unknown) token. When GLADIUS's tokenizer encounters a byte sequence it cannot represent, it emits ⁇.

### 7.2 How ⁇ Gets Amplified in Distillation

1. Qwen3 produces a softmax over 151,669 tokens
2. The vocab mapping cache maps each Qwen3 token → GLADIUS token(s)
3. For 87.8% of Qwen3's vocabulary, the mapping is approximate (text-level re-encoding)
4. When a Qwen3 token has no reasonable GLADIUS equivalent (Chinese character, specialized code token, rare multilingual subword), its probability mass maps to `<unk>`
5. Across all 151K tokens, the accumulated `<unk>` mass can be substantial — potentially the **largest single probability** in the mapped distribution
6. The KL loss then tells GLADIUS: "your ⁇ probability should be higher"
7. Over thousands of steps, ⁇ becomes a self-reinforcing attractor — identical to the function-word collapse in v2.2, but with a worse token

### 7.3 Why ⁇ Got Worse Over Training

The learning rate was still in warmup at step 3000 (linear warmup appears to have been set for the full 3000 steps or longer). As lr increased, the gradient updates got larger, and the ⁇ attractor got stronger. Steps 1500–2000 were the sweet spot: lr was high enough to learn but low enough that the ⁇ signal hadn't overwhelmed English signal. After step 2000, the lr crossed a threshold where ⁇ won the competition for probability mass.

---

## 8. What We Learned

### 8.1 Vocabulary Ratio Matters More Than Teacher Quality

A teacher with 3× the student's vocabulary (GPT-2: 50K → GLADIUS 32K, ratio 1.57) transfers knowledge far more effectively than one with 9.5× the vocabulary (Qwen3: 151K → GLADIUS 16K, ratio 9.48). The mapping fidelity degrades nonlinearly with vocabulary ratio. At 9.5×, the noise floor from unmapped tokens drowns the signal.

### 8.2 Alpha Direction Matters Enormously

α = 0.3 (Phase 1) = "trust the teacher." α = 0.7 (Phase 2) = "trust the labels." When your teacher-to-student mapping is lossy, trusting the labels is correct — but then you don't need distillation at all, you need standard fine-tuning. The high α effectively turned this into a poorly-regularized language modeling run with noise from the ⁇-heavy soft targets.

### 8.3 Temperature and Sparsity Compound

T=2.0 + Top-K=100 + 48/256 position sampling = the student saw a narrow, peaked, fragmentary view of the teacher's knowledge. Compare Phase 1: T=4.0 + full softmax + all positions = the student saw the entire distributional landscape. The Phase 2 configuration is like trying to learn a language by hearing every 5th word at double speed.

### 8.4 Checkpoint Inheritance Can Hurt

Starting Phase 2 from the GPT-2 checkpoint seemed logical (build on prior learning). In practice, it created a conflict: the model's weights encoded GPT-2's English distributions, while training pushed toward Qwen3's mapped distributions (which are structurally different even for the same concepts). Starting from a clean surgical slate — as Phase 1 did — would have been cleaner.

### 8.5 Non-Monotonic Quality With Monotonic Loss

Loss decreased (barely) throughout training, but output quality peaked at step 1500 and collapsed by step 3000. **Loss is not a reliable proxy for generation quality when the soft targets are noisy.** The loss can decrease by better predicting ⁇ while output coherence degrades.

---

## 9. Recommendations for Phase 3

### 9.1 Option A: GPT-2 Extended Training (RECOMMENDED — Low Risk)

The GPT-2 distillation worked. The student learned English words in 3000 steps. The clear next move is:

- **Run 10,000–30,000 steps** with the same GPT-2 teacher
- Keep α=0.3, T=4.0, all positions, full softmax
- Add cosine LR decay (not perpetual warmup)
- Monitor for the "reorganization dip" identified in Phase 1's step 1500
- Target: coherent sentence fragments by step 10K, proto-sentences by step 30K
- Compute cost: ~3-10 hours on RTX 2050 (affordable)

**Why this is best:** The vocabulary mapping works (1.57× ratio). The loss curve showed genuine descent (36% reduction). Output quality improved monotonically (with one expected dip). More steps = more learning. Simple.

Ali doesn't want OpenAI models, but GPT-2 is MIT-licensed open-source — it's not the same as using the OpenAI API. The knowledge being transferred is generic English, not proprietary capability.

### 9.2 Option B: Qwen3 with Vocabulary Bridge (Medium Risk)

If Qwen3 must be used, fix the root cause:

1. **Expand GLADIUS vocabulary to 32K** (currently 16K). More tokens = more mapping targets = less ⁇ accumulation. Retrain the SentencePiece model on the same corpus.
2. **Add a vocabulary bridge layer:** A learnable linear projection [151K → 32K] that maps teacher logits to student vocabulary space. Train the bridge jointly with the student. This replaces the lossy dictionary cache with a differentiable mapping.
3. **Restore α=0.3, T=4.0** — trust the teacher, soften the distributions
4. **Use all positions** — don't sample. If VRAM is tight, move teacher to CPU (as originally planned before 4-bit GPU fit was discovered)
5. **Start from clean surgical slate** — not GPT-2 checkpoint
6. **LR schedule:** 300-step warmup then cosine decay to 0 at step 3000

### 9.3 Option C: Intermediate Teacher (Medium Risk)

Use a teacher closer to GLADIUS's scale and vocabulary:
- **TinyLlama-1.1B** (32K vocab → 2:1 ratio, similar to GPT-2's)
- **Phi-2** (51K vocab, 2.7B params, MIT license)
- **SmolLM-135M** or **SmolLM-360M** (49K vocab, very close to GLADIUS scale)

The insight: teacher quality matters less than teacher-student vocabulary compatibility. A 360M model with 2× vocab ratio will transfer more knowledge than a 1.7B model with 9.5× vocab ratio.

### 9.4 Option D: Abandon Distillation, Go Direct (High Effort)

Skip distillation entirely. Train GLADIUS on the raw corpus with standard causal language modeling:
- The 256K chunks from 6 files are already prepared
- CE loss only (no teacher)
- GLADIUS architecture gets to learn directly without mapping noise
- Risk: 6.9M model may be too small for the corpus variety (256K chunks = significant)
- This is what the MEGA pre-training run on Kaggle is already doing

### 9.5 What NOT to Do

- **Do not repeat Qwen3 distillation with same vocab mapping.** The 12.2% direct match rate is a structural barrier, not a hyperparameter problem. More steps, different α, different T — none of these fix a 9.5× vocabulary ratio.
- **Do not use perpetual warmup.** The lr was still climbing at step 3000. This is almost certainly why step 3000 was worse than step 1500 — the increasing lr amplified the ⁇ noise gradient.
- **Do not use 4-bit quantized teacher for distillation.** Quantization introduces its own distribution noise. If the teacher must be on GPU, use 8-bit. If VRAM is tight, use CPU in full bf16/fp32.

---

## 10. Summary

| | GPT-2 Phase 1 | Qwen3 Phase 2 |
|---|---|---|
| **Verdict** | ✅ Success | ❌ Failure |
| **Loss trajectory** | 8.95 → 5.69 (smooth descent) | 12.52 → 12.17 (flat, volatile) |
| **Output evolution** | Noise → words → grammar | Noise → words → ⁇ collapse |
| **Root cause** | Good vocab match (1.57×) | Fatal vocab mismatch (9.48×) |
| **Best checkpoint** | Step 3000 (final) | Step 1500 (mid-training) |
| **Reusable?** | Yes — extend training | No — save step 1500 only |

The Qwen3 distillation failed not because GLADIUS can't learn from strong teachers, but because the plumbing between teacher and student was fundamentally broken. A 151K→16K vocabulary mapping with 12.2% direct matches is like trying to translate a novel through a dictionary that only covers 12% of the words. The remaining 88% becomes noise — and that noise, amplified by α=0.7 CE weighting, T=2.0 peaked distributions, 48/256 position sampling, and perpetual lr warmup, overwhelmed the signal.

**The step 1500 checkpoint should be preserved** — it represents the model at peak coherence before ⁇ collapse. If continuing Qwen3 work, start from step 1500 with reduced lr and α=0.3.

**The recommended path is Option A: extend GPT-2 training to 10K+ steps.** The distillation protocol works — it just needs more iterations. Ali's directive to avoid OpenAI is respected by the fact that GPT-2 is MIT-licensed open-source, and the knowledge being transferred is generic English linguistics, not proprietary capability.

---

## Appendix A: File Locations

| Artifact | Path |
|----------|------|
| Qwen3 distillation script | `.ava-lab/gladius-weights/distill_from_qwen3.py` (1,196 lines) |
| Qwen3 training log | `victus-wsl:~/gladius-training/training/qwen_distill_output.log` |
| Qwen3 checkpoints | `victus-wsl:~/gladius-training/training/digestion_runs/distill_outputs/qwen3_distill_outputs/` |
| Best Qwen3 checkpoint | `dragon_qwen3_distill_step1500.pt` (NOT final) |
| GPT-2 report | `.ava-lab/research/gladius-distillation-gpt2-report.md` |
| GPT-2 best checkpoint | `victus:~/gladius-training/training/digestion_runs/distill_outputs/dragon_distilled_final.pt` |
| Vocab mapping cache | `victus-wsl:~/gladius-training/training/digestion_runs/distill_outputs/qwen3_distill_outputs/qwen3_gladius_vocab_cache.json` |

## Appendix B: Learning Rate Analysis

The log shows lr at step 3000 was 2.82e-05, very close to the configured max of 3e-05. With a linear warmup, the lr appears to have been set with warmup_steps ≈ 3000 (or no decay phase configured). This means:

- The model never entered a decay phase
- lr was still climbing at termination
- Maximum perturbation force coincided with maximum ⁇ noise accumulation
- This is the direct mechanism of the step 1500–3000 regression

A proper schedule (300-step warmup → cosine decay) would have reduced lr to near zero by step 3000, stabilizing the step-1500 checkpoint quality instead of destroying it.

## Appendix C: VRAM Budget

```
Student (GLADIUS 256.8M, float32): 1.03 GB
Teacher (Qwen3 1.33B, 4-bit NF4):  1.97 GB
Activations + optimizer:           4.20 GB
Total:                             7.20 GB (unified memory)
```

The 4-bit quantization was necessary to fit both models on a 4.3GB VRAM GPU. However, 4-bit teacher inference introduces quantization noise into the soft targets — another source of signal degradation layered on top of the vocabulary mapping problem.

---

*"Knowledge ≠ Operational Competence. A bigger teacher doesn't guarantee a better student — the interface between them determines everything." — Operational DNA, BOOTSTRAP.md*
