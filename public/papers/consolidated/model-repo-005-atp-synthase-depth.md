# Experiment 005 — ATP Synthase Depth Dynamics

**Stage:** v5.0 "All-In" (170.8M params) — Synthase = MoDA v2
**Date:** Day 45–48 (March 27–30, 2026)
**Hardware:** Victus RTX 2050, 4GB VRAM

---

## Background

MoDA v1 (Mixture of Depth Attention) was added at the Wyrm stage. It had per-layer depth gates initialized at `sigmoid(-2) = 0.119` — heavily suppressed from birth. After **12,874 training steps**, every depth scale was still identical. The motor never turned.

Synthase (MoDA v2) redesigned the depth mechanism based on ATP synthase biology. Two critical changes:

1. **Fair initialization:** `sigmoid(0) = 0.5` instead of `sigmoid(-2) = 0.119`
2. **Depth scale init:** 0.1 (pump mode → production mode, learned)
3. **Gamma stalk:** Only the most recent layer has gradient flow through depth, preventing gradient explosion across 14 modules
4. **Three-phase binding change mechanism** modeled after F₁ hexamer conformational states

## MoDA v1 vs Synthase: The Difference

| Metric | MoDA v1 (12,874 steps) | Synthase (1,437 steps) |
|--------|----------------------|----------------------|
| Depth scale differentiation | **0%** (all identical) | **18.8% CV** |
| Steps to first differentiation | Never | **8 steps** |
| Gate initialization | sigmoid(-2) = 0.119 | sigmoid(0) = 0.5 |
| Depth scale initialization | 1.0 (full from start) | 0.1 (pump → production) |
| Gradient coupling | All layers equal | Gamma stalk (recent layer only) |

The motor turned in 8 steps. MoDA v1 never turned in 12,874.

## Depth Scale Distribution at Step ~1,437

Across 14 transformer layers, the depth scales (initialized uniformly at 0.1) have differentiated into a **bathtub curve**:

```
Layer:  0    1    2    3    4    5    6    7    8    9   10   11   12   13
Scale: .071 .068 .073 .076 .081 .085 .091 .103 .088 .064 .052 .067 .077 .089
       ─────── suppress ───────── ↑amp ─── suppress ──── ──── recover ────
                                  L7
```

### Reading the Curve

**Early layers (L0–L6): Suppression.** Depth scales below initialization. The network is saying: "at these layers, the depth cache doesn't help yet." The input hasn't been sufficiently processed for depth refinement to add value.

**Layer 7: Amplification.** The only layer above initialization (0.103). L7 has an auxiliary prediction head that creates an explicit gradient target — the network gets a training signal specifically at this depth. This is the "catalytic site" of the synthase motor.

**Middle layers (L8–L10): Deep suppression.** L10 is the most suppressed (0.052 — 48% below init). The backbone's own representations are sufficient at this depth. The depth cache (which carries information from earlier layers) is actually counterproductive here.

**Late layers (L11–L13): Recovery.** Depth scales rise back toward initialization. Output layers benefit from depth integration — they need the accumulated refinement from the full processing chain.

## Coefficient of Variation

**CV = 18.8%** across all 14 layers.

For reference:
- At initialization: CV = 0% (all layers identical at 0.1)
- After 12,874 steps of MoDA v1: CV = 0% (never differentiated)
- After 1,437 steps of Synthase: CV = 18.8%

The motor is not just turning — it's making *layer-specific decisions*. Different layers are using depth differently. This is the Synthase binding change mechanism in action: loose phase (early), tight phase (L7 catalysis), open phase (late release).

## Timeseries Prediction

Analyzing depth behavior across domains revealed a critical finding: **timeseries loss is chaotic** (oscillating 2.72–7.48) while math/cognitive loss converges smoothly.

**Root cause:** The shared depth cache is being contaminated by math-domain representations. As math training improves, the depth cache becomes more math-specialized — representations optimized for symbolic structure. When timeseries data flows through the same cache, it encounters math-shaped depth representations that are actively counterproductive.

The gamma stalk coupling (only the most recent layer has gradient flow through depth) creates specialization pressure: depth parameters optimize for whatever domain was most recent, not for universal representation.

**Prediction (Day 48):** Timeseries will NOT self-resolve with continued training. The depth cache needs domain-conditioned partitioning.

**Proposed fix:** Soft mitochondrial partition — domain-conditioned depth cache with compatibility gating. Same synthase motor, different membranes. Zero new parameters for cache separation, approximately 2K parameters per layer for a compatibility gate. Preserves the possibility of cross-domain transfer while preventing domain contamination.

## Connection to Biology

The timeseries problem maps directly to a biological phenomenon: **substrate competition** in ATP synthase. When multiple substrates compete for the same catalytic site, the enzyme's efficiency drops. Biological cells solve this with **compartmentalization** — different reactions in different organelles, each with their own membrane.

The proposed soft mitochondrial partition is the same solution: shared machinery (the synthase motor), separated substrates (domain-specific depth caches), permeable membranes (compatibility gates that allow cross-domain information when it helps).

## Files

- Synthase implementation: `src/kernel/synthase/synthase_attention.py`
- Depth analysis: `runs/v5-allin/heartbeat.json` (per-layer depth diagnostics)
- MoDA v1 comparison: `runs/wyrm_moda_training/` (12,874 steps, zero differentiation)
- Temporal lattice: `src/kernel/temporal_lattice.py`
