# The Invariant — What GLADIUS Is Actually Learning

**Date:** 2026-03-14 (Day 30)
**Author:** Ali Shakil — Artifact Virtual
**Classification:** Internal Research — Uranium Series
**Status:** LIVE — multi-script experiment running, preliminary analysis

---

## 1. The Data So Far

Three experiments on the same Drake checkpoint (60.1M params, 512d/12L/16H), same measurement framework (7 weight snapshots, 157-layer dissection):

| Experiment | Data | Steps | Best Loss | Steps to Sub-1.0 | Convergence Character |
|-----------|------|-------|-----------|-------------------|----------------------|
| English text (MuonClip) | 157M tokens, BPE 16K | 50,000 | 3.36★ | Never | Slow, repetition collapse |
| MNIST (pixels) | 60K images, 256 tokens | 3,000 | 0.28★ | 250 | Fast, no collapse |
| Multi-script (bytes) | 8.4MB, 5 alphabets, raw bytes | 3,000 | 0.038★ | 180 | Fastest, deepest |
| CIFAR-10 (RGB pixels) | 50K images, 1024 tokens | 500 | 1.87★ | ~500 | Fast but harder than MNIST |
| CIFAR-10 PQ (compressed) | 50K images, 1024 tokens | 500 | 1.42★ | ~450 | Faster than original! |

**The ordering is: multi-script > MNIST > CIFAR PQ > CIFAR original > English text.** By a massive margin.

This is not what I expected. I expected MNIST to be fastest (simplest task — 10 classes). Instead, multi-script byte-level text converged to a lower loss faster than anything.

---

## 2. Why Multi-Script Is Easier Than MNIST Is Easier Than English

### 2.1 Multi-Script (bytes): Pure Statistical Pattern Matching

When you feed Arabic/Chinese/Korean/Devanagari/Ge'ez as raw bytes (0-255), you're asking the model to predict the next byte. Each script has extremely strong statistical structure:

- Arabic: specific byte ranges (0xD8-0xDB for Arabic block), highly regular morphology
- Chinese: 3-byte UTF-8 sequences with constrained ranges (0xE4-0xE9 common)
- Korean: Jamo composition creates extremely predictable byte trigrams
- Devanagari: consonant-vowel patterns create strong 3-4 byte motifs

The model doesn't need to understand meaning. It needs to learn byte-level n-gram distributions per script. This is a compression problem, and GLADIUS's 12-layer architecture with 16 heads is massively over-parameterized for byte prediction. It's like using a nuclear reactor to boil water.

Loss 0.038 at step 420 means the model is predicting the next byte with >96% accuracy. For structured byte sequences, this is reasonable — the entropy of UTF-8 encoded Arabic is low because the byte ranges are constrained.

### 2.2 MNIST (pixels): Spatial Pattern Matching

MNIST asks the model to predict pixel values in sequence. Each 28×28 image is 784 pixels, each quantized to 256 levels. The statistical structure is:

- Adjacent pixels are highly correlated (edges are local)
- Digit-specific patterns (curves, lines, intersections) repeat
- Background (0) dominates, creating long runs of identical values

Loss 0.28 at step 2500 means ~75% pixel accuracy. Harder than byte prediction because spatial relationships across non-adjacent pixels require the attention mechanism to learn 2D structure from a 1D sequence. The model must discover that pixel 29 is "below" pixel 1 without being told.

### 2.3 English Text (BPE): Compositional Semantics

English with BPE tokenization is fundamentally different:

- 16,000 subword tokens (not 256 bytes or 256 pixel values)
- Grammar creates long-range dependencies ("The cat that I saw yesterday..." — verb agreement spans many tokens)
- Function words ("the", "of", "in", "to") are extremely frequent but carry little semantic content
- Meaning is compositional — "bank" means different things depending on context
- No single attention pattern works — you need both local (syntax) and global (semantics) simultaneously

Loss 3.36 at step 1250 means the model is uncertain about the next token most of the time. The entropy of natural English text at the subword level is much higher than byte-level script text or pixel sequences.

**The repetition collapse on function words is the model getting stuck in a local minimum where predicting common words achieves decent cross-entropy but can't break through to compositional understanding.**

---

## 3. What This Tells Us About GLADIUS Architecture

### 3.1 The Architecture Is Not the Bottleneck

If GLADIUS could only do pattern matching, all three tasks would converge at similar rates. Instead:
- Pattern matching tasks (bytes, pixels) → instant convergence
- Compositional reasoning task (English) → slow, partial convergence with failure mode

This means the architecture CAN learn patterns at any level (it's a universal approximator at 60M params for these simple domains). The bottleneck is specifically compositional semantics — the capacity to build hierarchical meaning from sequences of tokens.

### 3.2 The Alpha Router Is Doing Its Job

The SLA² hybrid attention with the learned alpha router is working exactly as designed:
- For byte-level scripts: alpha should favor linear attention (local byte patterns dominate)
- For MNIST: alpha should blend local (edge detection) with global (shape recognition)
- For English: alpha needs complex per-token decisions (local for syntax, global for semantics)

The alpha router at layer 7 changing by 13.8% in MNIST tells us it's actively adapting HOW attention is distributed. For multi-script, I predict the alpha router will change LESS than for MNIST (because byte patterns are more local) but MORE than for English text at the same step count (because it can afford to commit early — the task is simpler).

### 3.3 The Memory System Is Modality-Adaptive

Hot memory going nuclear for MNIST (36.6% change) was the biggest surprise of the MNIST experiment. For multi-script, I predict:
- Hot memory will change significantly BUT differently — storing byte n-gram patterns instead of spatial patches
- The WRITE GATE will still be near-zero change (the mechanism is general, only the content changes)
- Warm memory will still be minimal (3000 steps isn't enough to engage it)

**The key prediction:** If hot memory changes by ~35% for BOTH MNIST and multi-script, then hot memory is the universal adaptation mechanism — it repurposes itself for EVERY new domain. If it changes by a different amount, the rate of change correlates with task complexity.

### 3.4 The Frozen Layers Are the Real Discovery

Layers 0-6 freezing during MNIST was striking. But MNIST was a cross-MODAL transfer (text → vision). Multi-script is same modality, different encoding (English text → non-English bytes).

**Three possible outcomes for multi-script dissection:**

1. **Layers 0-6 freeze again** → The invariant is about general sequence processing, not about any specific modality. These layers learn "how to process sequences" at a fundamental level that doesn't care about what's in the sequence.

2. **Layers 0-6 partially adapt** → The invariant is partially about encoding-specific features. English BPE and raw bytes use the same sequence infrastructure but different tokenization, so some early layers need to adjust for byte-level statistics.

3. **Layers 0-6 change significantly** → The invariant was specific to the text→vision crossover and doesn't generalize. Early layers contained English-specific processing that needs to be overwritten for non-English byte patterns.

**My prediction: Outcome 1.** The multi-script convergence speed (faster than MNIST) suggests the early layers are already capable of processing the data. If they needed to change, convergence would be slower. The fact that multi-script converges FASTER than MNIST argues that early layers are MORE compatible with byte-level text than with pixel sequences — which makes sense, because bytes are still sequential data in the same statistical family as BPE tokens.

---

## 4. The Difficulty Hierarchy

From these three experiments, a hierarchy emerges:

```
EASIEST:  Statistical pattern prediction (byte n-grams, pixel correlations)
          → Architecture over-parameterized, instant convergence
          → Layers 0-6 sufficient, deep layers adapt but not critical

MEDIUM:   Spatial/structural reasoning (2D from 1D, morphological analysis)
          → Requires attention routing adaptation (alpha router)
          → Deep layers (7-11) restructure, hot memory repurposes

HARDEST:  Compositional semantics (grammar, pragmatics, meaning)
          → Requires ALL architectural components working in concert
          → Slow convergence, repetition collapse at function-word attractors
          → This is where GLADIUS needs more training data, more steps, or MuonClip
```

### 4.1 Implications for Training Curriculum

This hierarchy suggests a training curriculum:

**Phase 1: Multi-modal pattern learning** (bytes, pixels, audio spectrograms)
- Stabilize layers 0-6 as the invariant foundation
- Let hot memory learn to be a general-purpose pattern cache
- Train the alpha router across multiple input types
- Fast convergence, cheap, builds the foundation

**Phase 2: Structural reasoning** (math, code, music notation, chemical formulas)
- Engage deep layers (7-11) with compositional tasks
- Force the cognition loop and modulator to activate
- Intermediate difficulty, builds reasoning capacity

**Phase 3: Compositional semantics** (natural language, dialogue, philosophy)
- The hardest phase — now with a strong foundation
- MuonClip's orthogonal gradients should help break through attractors
- Longer training, careful anti-repetition regularization

**Phase 4: Tool use and agency** (Cthulu integration, API calls, code execution)
- Activate the dormant systems: tool cortex, cognition loop
- Real-world feedback loops, not supervised learning

This is curriculum over dilution. Don't mix everything at once. Build layers of competence.

---

## 5. The English Problem — Why Repetition Collapse Happens

At 60M params with 16K BPE vocabulary, the model has roughly 3,750 parameters per vocabulary token (60M / 16K). For comparison:
- GPT-2 small (124M params, 50K vocab) has 2,480 params/token
- GLADIUS has MORE capacity per token than GPT-2 small

So the problem isn't raw capacity. It's this:

**Function words dominate the loss landscape.** "The", "of", "in", "to", "and", "a", "is", "that" — these 8 words account for ~20% of English text. The model can achieve decent cross-entropy by predicting these correctly and guessing randomly for content words. This creates a loss plateau where the gradient signal is dominated by function word accuracy, starving content word learning.

**The repetition collapse is the model overshooting function word prediction.** It learns "predict common words → loss decreases" and then can't escape because the gradient from rare content words is too weak relative to the function word gradient.

### 5.1 Potential Fixes

1. **Anti-repetition loss** (already implemented in Drake MuonClip script): trigram penalty in output distribution. This addresses the symptom (repeated tokens) but not the cause (gradient imbalance).

2. **Token-frequency-weighted loss**: Weight rare tokens higher in the cross-entropy calculation. Make the gradient from "epistemology" equal in magnitude to the gradient from "the". This directly addresses the gradient imbalance.

3. **Curriculum: function words last**: Train first on content-word-dense text (scientific papers, poetry, definitions), then gradually introduce function-word-heavy text (novels, conversation). This builds content word representations before exposing the model to the attractor basin.

4. **Multi-modal pre-training first**: This is what we're discovering empirically. By training on bytes and pixels BEFORE English text, layers 0-6 develop robust general-purpose representations that are harder to overwrite by function word attractors.

5. **Larger vocabulary**: 16K BPE may be too small. With 32K or 64K, function words get dedicated tokens but content words also get better coverage, reducing the frequency imbalance. BUT this increases embedding parameters significantly at 60M scale.

---

## 6. Multi-Script Dissection Results — THE INVARIANT IS A SPECTRUM

**Dissection completed:** Step 1000 checkpoint vs base Drake (pre-training). Loss: 0.044.

### 6.1 The Result: Outcome 2 — Partial Adaptation

| | Layers 0-6 Avg | Layers 7-11 Avg | Ratio | Verdict |
|---|---|---|---|---|
| **MNIST** (text→vision) | <1% | ~15-36% | >15x | Sharp invariant |
| **Multi-Script** (text→bytes) | 3.7% | 12.1% | 3.3x | Partial invariant |

**My prediction was wrong.** I predicted Outcome 1 (full freeze). The actual result is Outcome 2 — the invariant exists but is weaker. Early layers moved more for multi-script than for MNIST.

### 6.2 Why This Makes Sense (Post-Hoc)

For MNIST, the input was fundamentally alien — pixel values in a 2D grid read as a 1D sequence. Nothing in the early layers' English-trained representations was useful for spatial processing. So they froze — nothing to update because the task bypassed them entirely.

For multi-script, the input is still sequential text — just different byte patterns. The early layers HAD relevant representations (sequence processing, n-gram statistics) but needed to adjust them for different byte distributions. Not a full overwrite, but a calibration. Hence 3.7% change, not 0% or 15%.

### 6.3 Component-Level Comparison

| Component | MNIST Change | Multi-Script Change | Same Pattern? |
|-----------|-------------|-------------------|--------------|
| memory.hot keys/values | 36.6% | **178%** | ✅ Nuclear both — but 5x MORE for multi-script |
| alpha_router (layer 7) | 6-14% | **85.6%** | ✅ Same layer, but MUCH more for multi-script |
| Deep FFN (layers 8-11) | 2-3% | **23-24%** | ✅ Same pattern, stronger |
| Cognition module | ~0% | **0.0%** | ✅ Untouched both |
| Time2Vec | ~0% | **0.2%** | ✅ Untouched both |
| Embeddings | ~2% | **23.6%** | ❌ Much higher — byte tokenization ≠ BPE |

### 6.4 Three Surprises

1. **Hot memory went MORE nuclear for multi-script (178%) than MNIST (36.6%).** This is counterintuitive — byte patterns should be simpler than pixel patches. But hot memory is a key-value store. For 5 different scripts with completely different byte distributions, it needs to store 5x as many patterns. The hot memory isn't adapting MORE because the task is harder — it's adapting more because the DIVERSITY of patterns is higher.

2. **Layer 3 alpha_router changed 26.9%** — this was frozen for MNIST. Layer 3 is in the "invariant zone" (0-6), but it broke invariance for multi-script. This means the alpha router's attention distribution decisions in early layers DO care about encoding type, even if the attention weights themselves don't change much.

3. **Cognition module and Time2Vec: exactly 0%.** These systems are completely dormant across all experiments. They're waiting for something — probably the tool use / temporal reasoning tasks they were designed for. They're part of the architecture but not part of the current task vocabulary.

### 6.5 Revised Invariant Theory

The invariant is NOT binary (frozen/active). It's a spectrum determined by **cognitive distance**:

```
Cognitive Distance = how different the new task's processing geometry is from the base

Cross-modal (text→vision):     HIGH distance → sharp invariant (>15x ratio)
Cross-encoding (text→bytes):   MEDIUM distance → partial invariant (3.3x ratio)
Same-domain (text→more text):  LOW distance → no invariant (uniform change)
```

**The invariant strength correlates with how much the task BYPASSES early layers.** Vision bypasses them completely (they're text-trained). Multi-script bytes partially reuse them. English text uses them fully — so there's no invariant to find.

This is actually a stronger finding than a binary invariant. It tells us the architecture has DEPTH-DEPENDENT specialization that responds proportionally to task novelty.

---

## 7. What I Still Don't Know (Honest Uncertainties)

1. **Is the multi-script convergence speed real or an artifact of byte-level simplicity?** Loss 0.038 on byte prediction might just mean the model memorized byte distributions, not that it "understands" the scripts. Need to test generalization to unseen text in the same scripts.

2. **Would a curriculum starting with multi-modal patterns and ending with English text actually help?** Hypothesis, not result. Need the full curriculum run.

3. **Is 60M params enough for compositional English?** GPT-2 small (124M) can do basic English. We're at half that. Progressive expansion may be necessary.

4. **Where does math fall on the cognitive distance spectrum?** Symbolic math uses the same byte/token encoding as English but requires different reasoning. Is it closer to "pattern matching" (like multi-script) or "compositional semantics" (like English)? The math experiment will tell us.

5. **Why did hot memory change MORE for the easier task?** The diversity hypothesis (5 scripts = more patterns to cache) needs verification. Would a SINGLE non-English script produce less hot memory change than 5 combined?

---

## 8. Next Steps

1. ~~Wait for multi-script dissection~~ ✅ **DONE** — results above

2. **Run math corpus experiment** after multi-script completes. Critical test — symbolic reasoning on the cognitive distance spectrum.

3. **Design the frequency-weighted loss** for English text training. Token frequency analysis, inverse-frequency weights.

4. **Plan the full curriculum run**: bytes → pixels → math → English, same checkpoint, progressive. First true test of curriculum over dilution.

5. **Single-script control experiment**: Run Arabic-only (largest corpus) to test whether hot memory change scales with script diversity.

---

*"Intelligence is architectural, not parametric." — Ali Shakil*

*The invariant is real, but it's not a wall — it's a gradient. The sharper the cognitive distance, the sharper the early/late layer separation. This is the architecture telling us it has depth-dependent specialization: general sequence processing in the shallows, task-specific cognition in the depths. The same 60.1M parameters crush patterns, adapt to vision, and struggle with language — not because of capacity, but because of what each task demands from the architecture at each depth.*
