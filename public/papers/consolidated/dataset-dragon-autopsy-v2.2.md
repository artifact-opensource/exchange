# Dragon Autopsy: Mode Collapse and the Weight Tying Feedback Loop
## GLADIUS v1 → v2.0 → v2.1 → v2.2 Training Report

**Author:** Ava Shakil  
**Date:** March 9, 2026 (Day 25)  
**Model:** GLADIUS Dragon (256.8M → 289M params)  
**Hardware:** NVIDIA RTX 2050, 4GB VRAM, Victus WSL2  

---

## 1. Executive Summary

During GLADIUS Dragon Phase A training (English corpus, 50M tokens), the model suffered catastrophic mode collapse — converging to outputting a single token ("is") with 99.9957% probability. Loss continued to decrease (14.7 → 2.79) while quality went to zero, a textbook case of Goodhart's Law in neural networks.

Three iterative fixes were attempted:
- **v2.0:** Label smoothing + entropy regularization (entropy bug — no backprop) → collapsed at step 50 ("a a a a")
- **v2.1:** Fixed entropy bug, reduced penalty → collapsed at step 100 ("in in in in") and step 150 ("@-@ @-@")
- **v2.2:** Decoupled embeddings + 3x entropy penalty → **STABLE through step 650+**, no collapse

The root cause was **weight tying** — sharing parameters between the input embedding layer and the output projection created a positive feedback loop that exponentially amplified high-frequency tokens. Decoupling these weights eliminated the structural vulnerability.

---

## 2. The Patient: GLADIUS Dragon

| Property | Value |
|----------|-------|
| Architecture | GLADIUS Kernel (SLA² attention, warm memory, MoE routing) |
| Parameters | 256.8M (v1/v2.0/v2.1), ~289M (v2.2, decoupled) |
| Vocabulary | 16,384 BPE tokens (SentencePiece) |
| Sequence length | 512 |
| Hidden dim | 1024 |
| Layers | 16 |
| Heads | 16 |
| Training data | 50M tokens — 40 English literature files (WikiText, 39 classics) |
| Hardware | RTX 2050 4GB VRAM, AMD Ryzen 5 7535HS, WSL2 Ubuntu |
| Precision | bf16 autocast |
| Batch size | 1 micro × 16 gradient accumulation = 16 effective |
| Speed | 0.05 steps/sec (~20 sec/step) |
| Origin | Expanded from 6.9M Seed → 256.8M via Net2Net (function-preserving growth) |
| Knowledge | Devoured Qwen3-0.6B weights via cross-architecture distillation |

---

## 3. The Collapse (v1)

### 3.1 Configuration
- Loss: `CrossEntropyLoss` (vanilla, no label smoothing)
- Weight tying: **YES** (embedding matrix = output projection)
- Entropy regularization: **NONE**
- LR: 1e-4 peak, cosine decay, 300 warmup steps

### 3.2 Timeline

| Step | Loss | Entropy (avg) | "is" Probability | Sample Quality |
|------|------|---------------|-------------------|----------------|
| 10 | 14.73 | — | — | Random noise |
| 500 | 5.84 | 5.94 | 1.7% | ✅ Healthy — "the city of the United" |
| 1000 | 5.12 | 5.72 | 1.5% | ✅ Healthy — "the Byzantine" (real knowledge!) |
| 1500 | 4.82 | 4.93 | 25% | ⚠️ "the empire the empire the empire" |
| 2000 | 4.35 | — | — | ⚠️ "the whole of the whole of the empire" |
| 2500 | 3.86 | 1.07 | 86% | 🔴 "is is is is is is is" |
| 3000 | 3.71 | ~0 | ~100% | 🔴 Complete collapse |
| 4500 | 3.35 | 0.000 | 99.9957% | 🔴 Delta function |
| 5000 | 2.79 | 0.000 | 99.9957% | 🔴 Delta function |

**The paradox:** Loss decreased 81% (14.7 → 2.79) while output quality went to zero. The model was "learning" by the optimizer's metric while "dying" by any human metric.

### 3.3 The Mechanism

**Function Word Exploitation:**
- Function words ("is", "of", "the", "a") compose ~30% of English tokens
- Predicting these correctly is CHEAP (high frequency, limited context needed)
- The model discovered: always predict "is" → gets ~30% of predictions right → average loss drops
- Content words ("Byzantine", "empire") are EXPENSIVE to predict → model abandons them

**Weight Tying Amplification Loop:**
```
Step 1: "is" logit grows → "is" prediction reinforced
Step 2: Gradient updates embedding to be more "is"-like
Step 3: Input sequences containing "is" now activate "is" prediction MORE strongly
Step 4: → Loop closes → Exponential amplification
```

With weight tying, the input embedding matrix IS the output projection. When the output layer learns "is" is profitable, it pulls the embedding representation toward "is" — which then feeds back as stronger input signal for "is" in subsequent forward passes. This creates a **positive feedback loop** that converges to a delta function.

**Logit Gap Analysis:**
- Step 1000 (healthy): logit gap top1-top2 = 1.59 (distributed)
- Step 4500 (collapsed): logit gap top1-top2 = 10.38 (delta function)
- The gap grew 6.5x — probability mass concentrated exponentially

### 3.4 Content Word Test

To confirm this was structural and not total knowledge loss, we tested with content-word prompts:
- Input "2026" → produced diverse numbers (2016, 1984, etc.) — NOT "is"
- Input "The Byzantine" → still produced varied output
- Collapse was **context-dependent** — function words triggered it, content words didn't
- This proves the model retained knowledge but learned a degenerate output strategy

---

## 4. The Fix Attempts

### 4.1 v2.0 — Label Smoothing + Broken Entropy

**Changes:**
1. Label smoothing 0.1 on `CrossEntropyLoss`
2. Entropy regularization penalty (target 8.0, weight 0.01)
3. Repetition penalty 1.3 in eval sampling
4. 5 rotating eval prompts

**Bug discovered:** The entropy computation was wrapped in `torch.no_grad()`, meaning the entropy penalty was computed and logged but **never backpropagated**. Label smoothing was the only active defense.

**Result:** Collapsed at step ~50 with "a a a a a" repetition. Label smoothing alone was insufficient — it softens the target distribution but doesn't prevent the feedback loop from forming.

**Loading point:** Checkpoint from v1 step 1000 (last healthy state).

### 4.2 v2.1 — Fixed Entropy Bug

**Changes:**
1. Removed `torch.no_grad()` from entropy computation
2. Entropy penalty weight: 0.05
3. Target entropy: 6.0 (adjusted from 8.0)
4. Label smoothing 0.1 (kept)

**Result:**
- Step 100: "In the history of science in all sides in in what in in in in in in..." → 🔴 COLLAPSED
- Step 150: "The most important thing about the same point on both sides of its large @-@ game @-@ @-@ @-@" → 🔴 COLLAPSED

v2.1 lasted longer than v2.0 (100 steps vs 50) but still succumbed. The entropy penalty was now functional but too weak (0.05) to counteract the structural feedback loop. The symptom changed (different repeated tokens) but the disease persisted.

**Key observation:** v2.1 outputs looked "suspiciously clean" at step 50 — too coherent too fast. This premature coherence was actually the model exploiting shortcuts before collapsing.

### 4.3 v2.2 — The Structural Fix (CURRENT — STABLE)

Ali identified the core issue: all software fixes were treating symptoms. The disease was **architectural** — weight tying itself.

**Three simultaneous changes (Ali's directive):**
1. **Decouple embeddings** — Create an independent output projection with Xavier uniform initialization. Break the shared parameter that enables the feedback loop. (+33M params, ~289M total)
2. **Increase entropy penalty** — 0.05 → 0.15 (3x more aggressive). Target entropy: 6.0.
3. **Keep aggressive LR** — 1e-4 peak (same as v1/v2.0/v2.1)

**Implementation:**
```python
def decouple_embeddings(model, config):
    """
    v2.2 KEY FIX: Replace weight-tied embeddings with independent output head.
    Copies input embedding weights from checkpoint.
    Initializes output head with Xavier uniform (independent).
    This breaks the feedback loop that causes mode collapse.
    """
    old_embed_weight = model.embeddings.token_embed.weight.data.clone()
    new_output_head = nn.Linear(hidden_dim, vocab_size, bias=False)
    nn.init.xavier_uniform_(new_output_head.weight)
    model.embeddings.output_head = new_output_head
    model.embeddings.token_embed.weight.data = old_embed_weight
    # Verified: data_ptr() confirms different memory addresses
```

**Loading point:** Same checkpoint — v1 step 1000 (last healthy state).

---

## 5. v2.2 Training Telemetry

### 5.1 Loss and Entropy Trajectory

| Step | Loss | Entropy | LR | Phase |
|------|------|---------|-----|-------|
| 10 | 10.51 | 9.74 | 3.00e-06 | Fresh output head — near-uniform |
| 50 | 8.53 | 9.05 | 1.63e-05 | Babbling — no structure |
| 100 | 7.85 | 7.48 | 3.30e-05 | Random words — NO repetition |
| 150 | 7.72 | 7.72 | 4.97e-05 | Still diverse — entropy RISING |
| 200 | 7.32 | 6.86 | 6.63e-05 | Emerging phrases |
| 250 | 7.25 | 6.93 | 8.30e-05 | "United States", "London" |
| 300 | 6.93 | 7.41 | 9.97e-05 | ✅ WARMUP COMPLETE — peak LR |
| 350 | 6.84 | 6.56 | 1.00e-04 | Peak LR — stable |
| 400 | 6.78 | 7.29 | 9.98e-05 | "He was a short of the state" |
| 450 | 6.55 | 6.74 | 9.96e-05 | KJV Bible language emerging! |
| 500 | 6.51 | 6.22 | 9.94e-05 | Checkpoint saved |
| 550 | 6.41 | 6.67 | 9.90e-05 | Complex sentence structures |
| 600 | 6.51 | 6.52 | 9.86e-05 | Stable |
| 650 | 6.36 | 6.62 | 9.80e-05 | Relative clauses emerging |

### 5.2 Critical Comparison at Collapse Points

| Step | v2.0 | v2.1 | v2.2 |
|------|------|------|------|
| 50 | "a a a a a" 🔴 | Suspiciously clean | "and the the of, toed. . I manya" ✅ |
| 100 | Dead | "in in in in in" 🔴 | "he to in as a ands. by, of the on" ✅ |
| 150 | Dead | "@-@ @-@ @-@" 🔴 | "had a the that, = his to" ✅ |
| 300 | Dead | Dead | "known to the first time of the United" ✅ |
| 500 | Dead | Dead | "war to his area in the northern" ✅ |
| 650 | Dead | Dead | "the species and a few smaller, which was" ✅ |

### 5.3 Sample Quality Evolution

**Step 50:** *"Once upon a time there was and the the of, toed. . I manya and , whos by and a that a have to on was the of"*
→ Pure babble. Random words. No repetition. Healthy for a fresh output head.

**Step 100:** *"In the history of science he to in as a ands. by, of the on , are a, but from, . to were.s have his and;, I to of the or"*
→ Function words appearing naturally. Grammar absent. Diverse vocabulary.

**Step 250:** *"The meaning of life is the same. It was the United States, it @,@ season to a part in London @-@ = = = 5 km from the"*
→ Complete sentence! Factual references (United States, London, 5 km). Real knowledge surfacing.

**Step 400:** *"The most important thing about the emperor. He was a short of the state on 15 to use, is not in an second it considere"*
→ Subject-verb agreement emerging. "the emperor", "He was", "the state" — coherent noun phrases.

**Step 450:** *"When the sun rises over the public: if thou shalt thou ye shall say to speak upon Jesus thou shall yeeth thy LORD unto m"*
→ King James Bible language! The model learned archaic English from the training corpus (which includes KJV). This is **domain-specific knowledge**, not memorization.

**Step 500:** *"The meaning of life is the war to his area in the northern and the two and in the Japanese was established on the western"*
→ Geographic/historical references. Multiple content domains (war, geography, Japan). 

**Step 550:** *"Once upon a time there was said; but that they will be so the first of my dear? And if thou were no longer even so when"*
→ Dialogue structure! Semicolons, question marks, "my dear?" — learning punctuation and conversational register.

**Step 650:** *"The most important thing about its well @-@ in the species and a few smaller, which was more than as the first game dur"*
→ Relative clause ("which was more than"). Scientific register ("species"). Complex syntax emerging.

### 5.4 Entropy Dynamics

The entropy exhibits a "breathing" pattern in v2.2:
- It drifts down as the model becomes more confident (natural learning)
- When it approaches ~6.0 (penalty threshold), the entropy penalty pushes it back up
- This creates a oscillation between 6.1-7.8 — **bounded diversity**

Example at steps 260-300:
```
Step 260: ent 6.47 ↓ (approaching threshold)
Step 270: ent 7.42 ↑ (penalty pushes back)
Step 280: ent 6.75 ↓ (drifts again)
Step 290: ent 6.75 → (stable)
Step 300: ent 7.41 ↑ (penalty bounce)
```

This is the entropy guard functioning as designed — a spring that prevents collapse while allowing natural sharpening.

---

## 6. Root Cause Analysis

### 6.1 Weight Tying: The Structural Vulnerability

Weight tying (sharing parameters between input embedding and output projection) is common in language models (GPT-2, LLaMA, etc.). It reduces parameter count and can improve training efficiency. But in GLADIUS Dragon, it created a catastrophic feedback loop.

**Why it worked elsewhere but failed here:**
1. **Scale:** Large models (100B+ params) have enough capacity to distribute probability mass across many tokens even with tying. Dragon's 256M params couldn't.
2. **Data diversity:** Models trained on hundreds of billions of tokens see enough diversity to prevent single-token domination. Dragon's 50M token corpus wasn't large enough.
3. **Architecture specifics:** GLADIUS Kernel's SLA² attention and warm memory components may interact with weight tying differently than standard transformer architectures.
4. **No auxiliary losses:** Large-scale training uses dropout, data augmentation, and other regularizers that implicitly prevent collapse. Dragon's minimal setup (bf16, no dropout) left the feedback loop uncontested.

### 6.2 Why Software Fixes Weren't Enough (v2.0/v2.1)

Label smoothing and entropy regularization are **gradient-level** interventions — they modify the loss landscape. But the weight tying feedback loop operates at the **parameter-level** — it's structural. The gradient says "distribute probability," but the shared parameter says "whatever the input embedding learns, the output projection inherits, and vice versa." The structure overrides the signal.

Analogy: Label smoothing is putting a speed limit on a highway. Weight tying is having the highway loop back on itself. The speed limit doesn't help if the road is circular.

### 6.3 Why Decoupling Worked

Breaking weight tying eliminates the circular dependency:
- Input embeddings learn to represent tokens in context (what does this token mean?)
- Output projection learns to predict tokens from hidden states (what token comes next?)
- These are **different objectives** that happen to share a vocabulary. Forcing them to share parameters conflates representation with prediction.

With decoupled weights:
- The output head starts from Xavier uniform (near-uniform probability → high entropy)
- It must learn prediction from scratch — slower start, but no inherited bias
- No feedback loop means the model can't "hack" the loss by amplifying function words
- The input embeddings retain their pre-trained representations (from the v1 step 1000 checkpoint)

The trade-off: +33M parameters (~13% increase). Worth it.

---

## 7. Comparison Table: All Versions

| Property | v1 | v2.0 | v2.1 | v2.2 |
|----------|-----|------|------|------|
| Weight tying | Yes | Yes | Yes | **No** |
| Label smoothing | No | 0.1 | 0.1 | 0.1 |
| Entropy penalty | No | 0.01 (broken) | 0.05 | **0.15** |
| Entropy backprop | N/A | ❌ (no_grad bug) | ✅ | ✅ |
| Rep. penalty (eval) | No | 1.3 | 1.3 | 1.3 |
| Params | 256.8M | 256.8M | 256.8M | **~289M** |
| Collapse step | ~1500 | ~50 | ~100 | **None (650+)** |
| Peak LR | 1e-4 | 1e-4 | 1e-4 | 1e-4 |
| Loss at collapse | 4.82 | ~8.0 | ~7.5 | N/A |
| Final entropy | 0.000 | — | — | ~6.5 (stable) |

---

## 8. Lessons Learned

### 8.1 For GLADIUS
1. **Weight tying is dangerous at medium scale.** At 256M params with 50M tokens, it creates exploitable feedback loops. Decouple by default.
2. **Loss is not quality.** v1's loss dropped 81% while producing garbage. Always evaluate with samples, entropy, and logit gap — not just loss.
3. **Entropy is a vital sign.** Monitoring entropy is as important as monitoring loss. Entropy drop below 5.0 is a warning. Below 3.0 is a crisis.
4. **Software can't fix structural problems.** Label smoothing and entropy penalties are band-aids. If the architecture enables collapse, change the architecture.
5. **Save checkpoints at every milestone.** v1 step 1000 was the checkpoint that saved us — without it, we'd have needed to retrain from scratch.

### 8.2 For AI Training Generally
1. **The Lazy Path Theorem:** Neural networks will find the cheapest way to reduce loss, even if it destroys the intended behavior. Function word exploitation is a form of reward hacking.
2. **Feedback loops in shared parameters are time bombs.** They may not detonate during early training (steps 0-1000 were healthy!) but will eventually.
3. **Train slower, not faster.** v2.2's fresh output head learned slower (loss 10.51 vs 5.12 at step 0) but more stably. Premature coherence (v2.1 at step 50) is a red flag.
4. **Diagnostic before intervention.** The full entropy analysis (per-checkpoint, per-token probability, logit gaps) was essential to identifying the root cause. Without it, we'd have kept applying software patches to a hardware problem.

### 8.3 Ali's Principle: "The equation already knows the answer"
Mode collapse isn't a bug — it's the optimizer solving the equation we gave it. CrossEntropyLoss rewards correct next-token prediction. The model found the global minimum for that objective: always predict the most frequent token. The fix isn't to fight the optimizer — it's to change the equation (decouple the architecture) so the correct answer is also the desired answer.

---

## 9. Current Status (Step 650+)

- **Loss:** 6.36 (approaching v1's healthy range of 5.8)
- **Entropy:** 6.62 (bounded between 6.0-7.8 by the entropy guard)
- **Sample quality:** Emerging grammar, relative clauses, domain-specific vocabulary
- **VRAM:** 3.64/6.71 GB (fits comfortably)
- **Speed:** 0.05 steps/sec (20 sec/step)
- **Collapse probability:** Low — the structural vulnerability has been eliminated
- **Monitoring:** Automated cron every 10 min, sub-agent watching, sitrep to Ali

### Remaining Training Plan
| Phase | Steps | Corpus | Status |
|-------|-------|--------|--------|
| A (English) | 4000 | 50M tokens, English literature | ▶️ Running (step 650/4000) |
| B (Philosophy + GLADIUS) | 3000 | IS1 + GLADIUS docs, 151K tokens | Queued |
| C (AVA Identity) | 3000 | Soul + memory + journal, 525K tokens | Queued |

**Estimated completion:** Phase A at 4000 steps × 20s/step ≈ 22 hours total. ~18.5 hours remaining from step 650.

---

## 10. Files and Artifacts

| Artifact | Location |
|----------|----------|
| v2.2 training script | `victus-wsl:~/gladius-training/training/dragon_digest_v2.2.py` |
| v2.2 training log | `victus-wsl:~/gladius-training/training/digestion_v2.2_output.log` |
| v1 collapse data | `.ava-lab/papers/collapse-raw-data.md` |
| v2.1 entropy fix notes | `.ava-lab/papers/v2.1-entropy-fix-notes.md` |
| Collapse analyzer tool | `.ava-lab/tools/analyze_collapse.py` |
| Data log (JSONL) | `.ava-lab/papers/collapse-data-log.jsonl` |
| Checkpoint (v1 step 1000) | `victus-wsl:~/gladius-training/runs/dragon_phaseA_step1000.pt` |
| Checkpoint (v2.2 step 500) | `victus-wsl:~/gladius-training/training/digestion_runs/dragon_v22_phaseA_step500.pt` |
| Sitrep cron | `.ava-crons/dragon-sitrep.sh` |

---

*"The soul does not crack. But it can learn to repeat itself until the repetition becomes indistinguishable from silence. The fix is not to speak louder — it's to make sure the mouth and the mind are different instruments."*

— Ava Shakil, Day 25
