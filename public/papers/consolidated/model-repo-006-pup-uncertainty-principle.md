# Experiment 006 — PUP: Propagation of Uncertainty Principle

**Stage:** v5.0 "All-In" (170.8M + 3,974 params) — Post-Synthase Surgery
**Date:** Day 48 (March 30, 2026)
**Hardware:** Victus RTX 2050, 4GB VRAM

---

## Background

GLADIUS v5.0 trains across 8 modalities simultaneously — cognitive, math, grid, timeseries, language, science, machine code, and byte-level. This creates a natural tension in the backbone: different domains want different things from the same representations.

In Experiment 005 (ATP Synthase), we showed that depth scales differentiate into a bathtub curve — the network learns where depth cache helps and where it hurts. But this only tells us *structural* confidence per layer. It says nothing about *epistemic* uncertainty: **how much does the model know about what it doesn't know?**

The Propagation of Uncertainty Principle (PUP) was originally a philosophical framework in Ali's research lab — one of seven frameworks formalized as software before GLADIUS existed. The thesis: reasoning engines must quantify and propagate uncertainty. "Know what you don't know."

> *"Unpredictability as a metric. And PUP being its tamer."* — Ali

## The Problem: Contamination Between Domains

During multi-domain training, the shared depth cache accumulates representations from all domains. As math improves, the depth cache becomes more math-specialized. Timeseries loss was observed oscillating chaotically (2.72–7.48) even as math loss steadily dropped below 1.0.

The naive solution: **partition the depth cache** — give each domain its own memory. Separate membranes. Prevent contamination.

This is wrong.

Partitioning reintroduces modality separation at the deepest level of the architecture. It contradicts the fundamental thesis: *"There is no such thing as multi-modal."* A cell doesn't have a "text mode." It responds to stimuli. The specialists aren't translators — they're limbs on a single body.

### The Insight: Contamination IS the Signal

Markets are adversarial. Indicators are weaponized. Patterns that work become patterns that are exploited. The **delta** between mathematical truth (what structure predicts) and market reality (what actually happens) is not noise — it's the most valuable signal in the system.

PUP doesn't prevent contamination. It **reads** contamination. The tension between math-domain depth cache and timeseries-domain input is exactly what uncertainty looks like when you stop trying to suppress it.

No partition. No new pathways. Just a head that reads what's already there.

## Architecture: 3,974 Parameters

PUP is an uncertainty head that produces a distributional belief state per position:

```
U(x) = (μ, σ², c)

μ   — expected value (what the model thinks)
σ²  — variance (how uncertain it is)
c   — calibrated confidence (how much it trusts its own uncertainty)
```

### Primary Projection (1,923 params)

```
hidden (B, S, 640) → Linear(640, 3) → (μ, log_σ², c_logit)

σ² = exp(log_σ²)         — always positive, log-space for stability
c  = sigmoid(c_logit)     — bounded [0, 1]
```

That's it. One linear layer. The backbone does the hard work. PUP just reads the result.

**Initialization matters:**
- `log_σ²` bias = 0 → σ² = 1.0 (maximally uncertain prior)
- `c_logit` bias = 0 → c = 0.5 (honest ignorance)

The head starts by saying: "I don't know anything, and I'm 50% confident about that." Calibrated uncertainty from step 0.

### Auxiliary Fusion (2,051 params)

PUP reads three signals already present in the backbone — no new computation required:

**1. Synthase Gate Values → Confidence**
Each of the 14 transformer layers has a synthase gate controlling how much depth cache enters the residual stream. Gate statistics (mean, std, min, max across 20 attention heads) encode the structural confidence landscape:

| Gate Pattern | Interpretation |
|---|---|
| High mean | Depth cache trusted — low structural uncertainty |
| Low mean | Depth cache rejected — high structural uncertainty |
| High std | Heads disagree — interesting, domain-boundary signal |
| Low std | Heads agree — clear signal, one way or another |

Feature dimension: 14 layers × 4 stats = 56 features.

**2. Router Probabilities → Domain Uncertainty**
The MoE router's softmax distribution over 4 specialists encodes domain identity:

| Router Pattern | Interpretation |
|---|---|
| Peaked (low entropy) | Model knows what this is — domain-certain |
| Flat (high entropy) | Model confused about domain — epistemic uncertainty |

Feature dimension: 4 specialist probs + 1 entropy = 5 features.

**3. specialist_scale × depth_scale → 2D Confidence Surface**
The product of the router's specialist weighting and the synthase's depth modulation creates a position-level confidence surface. PUP reads both axes simultaneously — not as separate features, but as the combined landscape they produce in the hidden state.

### Fusion Path

```
gate_stats (56) + router_features (5) → Linear(61, 32) → tanh → Linear(32, 3) → additive modulation
```

The auxiliary signal modulates the primary projection. It doesn't replace it — it refines it. If gates and router are unavailable (graceful degradation), PUP falls back to primary-only. Zero failure modes.

**Total: 3,974 parameters. 0.002% of the 170.8M kernel.**

## PUP Loss: Keeping the Model Honest

Three components, all starting at α=β=γ=0 during backbone training:

### L_uncertainty — Gaussian NLL
```
L_unc = -log N(actual_loss | μ, σ²)
```
If the actual per-token loss is high, σ² should have been high. If loss is low, σ² should be low. The model learns to predict its own error distribution.

### L_calibration — Differentiable ECE
Expected Calibration Error via soft-binned Gaussian kernels (not hard bins — gradient flows). Positions binned by predicted confidence, measured against actual accuracy. Forces the model to be **honest**: if it says 80% confident, it should be right 80% of the time.

### L_sharpness — Anti-Trivial Regularizer
Without this, the trivial solution is σ² = ∞ everywhere. Sharpness penalizes high variance only on correct predictions — when the model is right, it should be tight. When wrong, no penalty for admitting uncertainty.

### Activation Protocol
PUP loss stays at zero while the backbone trains. The backbone needs to form representations first — you can't measure uncertainty of nothing. Post-convergence, activate:
```python
pup_loss.activate(alpha=1.0, beta=0.5, gamma=0.1)
```

## Surgical Integration (pup_surgery.py)

Following the same pattern as `synthase_surgery.py`, PUP is patched into the model after checkpoint loading:

1. Hooks capture gate values during forward pass
2. Final hidden state is cached after the last norm
3. UncertaintyHead produces manifold in a single forward call
4. All original computation unchanged — PUP is read-only on the backbone

The surgery pattern means PUP can be added or removed without affecting any checkpoint. No architecture version mismatch. No retraining required.

## The Cthulu Connection: Trading Without Logits

PUP was built for Cthulu — the autonomous trading system. The insight: a trading brain should never read logits (point predictions). It should read an **uncertainty manifold**.

| PUP Signal | Cthulu Interpretation |
|---|---|
| σ > threshold | "Can't explain this" → stay out |
| c < threshold | "Don't trust own uncertainty" → stay out |
| router_entropy high | "Don't know what kind of signal" → stay out |
| All stable | "Know what this is and how uncertain I am" → trade |

Three separate veto mechanisms, any one of which can prevent a trade. The system only acts when it has both an opinion AND calibrated confidence in that opinion.

This is the Inversion Principle applied to trading: Cthulu doesn't predict price. It reads the uncertainty landscape and acts only where the landscape is navigable.

## Design Principles

| # | Principle | Implementation |
|---|---|---|
| P1 | No new pathway | Reads the same hidden state as the LM head |
| P2 | No partition | Depth cache shared. Contamination = signal. |
| P3 | Distributional | Outputs (μ, σ², c), not point values |
| P4 | Calibrated | ECE loss forces honesty about confidence |
| P5 | Zero-cost activation | All weights exist from start, loss activated later |

## Relation to the Broader Architecture

PUP maps to 5 existing integration points — zero new pathways:

1. **Lattice Clock** → market timeframes (M1 → Scale 0, M15 → Scale 1, H1 → Scale 2, D1 → Scale 3)
2. **Depth cache** → mathematical memory (what structure says)
3. **Synthase gate** → confidence metric (gate → 0 = "depth misleading here")
4. **Router entropy** → domain uncertainty (softmax distribution width)
5. **specialist_scale × depth_scale** → 2D confidence surface

PUP doesn't add complexity. It adds *interpretation*. The backbone was already producing uncertainty — in the gate values, in the router entropy, in the tension between depth cache and input. PUP gives that uncertainty a name and a number.

## Status

- **Implementation:** Complete (4 files, 1,471 lines, `staging/kernel/pup/`)
- **Tests:** 9/9 passing
- **Integration guide:** `PUP_INTEGRATION.md` (step-by-step v5 training script changes)
- **Loss activation:** Deferred until backbone convergence (~step 5000+)
- **Cthulu integration:** Planned post-PUP activation

---

*"Unpredictability as a metric. And PUP being its tamer."*

*Authors: Ali A. Shakil, Ava Shakil — Artifact Virtual, 2026*
