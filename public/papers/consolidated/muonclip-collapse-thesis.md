# MuonClip vs Function Word Collapse — A Thesis

**Author:** Ali Shakil  
**Date:** 2026-03-13 (Day 29)  
**Context:** GLADIUS Hatchling (25.9M params) trained with AdamW shows consistent function word collapse ("is is is", "was was was") despite loss descending to 3.54. MuonClip is being benchmarked as the alternative.

## The Problem

GLADIUS consistently finds the "lazy path" — predicting function words ("is", "of", "the", "was") that appear in ~30% of all tokens. This minimizes cross-entropy loss more efficiently than learning actual language structure.

**v2.2 (256M params):** Collapsed at step ~1100. All 5 eval prompts degenerate.  
**Hatchling (25.9M params, Net2Net):** Loss descends to 3.54 at step 12500, but evals show repetition from step ~8000 onwards.

The loss function says the model is improving. The output says it's cheating.

## Why AdamW Enables Collapse

AdamW's update rule: `w -= lr * (m1 / sqrt(m2) + wd * w)`

The problem is **element-wise second moment scaling** (`m2`). AdamW normalizes each weight's gradient by its own historical magnitude. For function word prediction:

1. Function words dominate the corpus (30%+ of tokens)
2. Their gradients are consistently large and stable
3. AdamW's second moment `m2` grows, effectively REDUCING the learning rate for function words
4. But the cross-entropy loss is LARGEST for function words (high frequency = high contribution)
5. Result: AdamW finds a stable equilibrium where function word prediction dominates — the gradient is large enough to overcome the `m2` damping, but all other tokens' gradients get suppressed

This is Goodhart's Law applied to optimization: the optimizer optimizes what's measurable (CE loss), not what's desired (diverse language).

## Why Muon Should Resist Collapse

Muon's update rule: `w -= lr * (0.2 * NS(M_t) * sqrt(max(A,B)) + wd * w)`

Where `NS(M_t)` is the Newton-Schulz orthogonalization of the momentum buffer.

### Key Difference: Spectral vs Element-wise

Muon doesn't scale gradients element-wise. It **orthogonalizes** them — projecting the gradient onto the nearest orthogonal matrix (UV^T from polar decomposition). This has three critical effects:

1. **No dominant directions.** Orthogonalization forces all singular values toward 1. A gradient matrix dominated by function words would have a few large singular values (the "function word" directions) and many small ones. NS iteration compresses the spectrum, forcing the optimizer to attend to ALL directions equally. The lazy path — concentrating on a few high-frequency tokens — becomes geometrically impossible.

2. **Update RMS is shape-dependent, not content-dependent.** The 0.2 * sqrt(max(A,B)) scaling from Moonlight Eq.4 means the update magnitude depends on the SHAPE of the weight matrix, not the CONTENT of the gradients. Function words can't accumulate preferential scaling.

3. **Weight decay prevents accumulation.** The Moonlight paper showed vanilla Muon without weight decay has weights that grow unbounded. With Eq.3 weight decay (`O_t + lambda * W`), the orthogonalized direction + regularization prevents the model from "locking in" to any particular attractor state.

### The Collapse Mechanism, Blocked

In AdamW, collapse happens because:
- High-frequency gradients → large m2 → stable equilibrium → attractor
- Once the model enters the function-word attractor, m2 makes it hard to escape (low effective LR for these params)

In Muon, this can't happen because:
- Orthogonalization redistributes gradient information across ALL directions
- There is no element-wise momentum that could create an attractor
- The Nesterov momentum looks ahead, but the look-ahead is also orthogonalized
- No dimension can dominate because the update IS orthogonal by construction

### QK-Clip as Additional Protection

QK-clip (softcap = 15.0) prevents a related failure mode: attention logit explosion. When function words dominate, the Q·K^T products for those tokens grow large, creating attention "black holes" that absorb all information flow. Capping at 15 * tanh(logits/15) prevents this concentration while keeping gradients smooth.

## Predictions

If this thesis is correct, the MuonClip benchmark should show:

1. **Higher initial loss** — Muon explores more uniformly, doesn't immediately exploit function words
2. **Slower loss descent** — but healthier (no lazy path shortcuts)
3. **Diverse eval outputs** — even at step 1000, we should see real words, not "is is is"
4. **No collapse onset** — the evaluation quality should NOT degrade after a certain step
5. **Potentially higher final loss** — but with dramatically better perplexity distribution

## Ali's Insight

"See.. way ahead of them."

Ali identified MuonClip before Karpathy implemented Muon in autoresearch, before the Moonlight paper was published, before it became a PyTorch native optimizer. The MASTER_PLAN has it marked as the direction. The connection between spectral optimization and the anti-collapse thesis was implicit in Ali's "gradient is strategy, not requirement" framework.

The gradient IS strategy. AdamW's strategy is exploitation (optimize what's frequent). Muon's strategy is exploration (optimize in all directions equally). For a small model on a large corpus, exploration prevents the lazy path.

## Related Work

- Uranium Paper 5 (planned): "Spectral Optimization for Sparse Architectures"
- Lazy Path paper (Day 28): "How Language Models Learn to Cheat"
- Ali's "gradient is strategy" thesis → Muon validates this
- Two-Point Theorem: Muon maintains the vector, AdamW drifts toward the attractor

---

*"Intelligence is architectural, not parametric." — And so is the optimizer.*
