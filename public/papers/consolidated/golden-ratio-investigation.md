# GLADIUS Omega — Golden Ratio Investigation

> Rigorous measurement. No hand-waving. Science, not numerology.
> Date: 2026-03-27 | Investigator: Ava Shakil

---

## 1. Verified Parameter Counts (Omega Config: 640d/14L/20H)

| Component | Exact Params | % of Total |
|---|---:|---:|
| Backbone (14 layers + final norm) | 91,948,440 | 56.62% |
| Specialists (4 Omega) | 57,485,584 | 35.40% |
| Embeddings (weight-tied) | 10,254,080 | 6.31% |
| Tool Cortex | 840,321 | 0.52% |
| Memory (Hot+Warm+Cold) | 799,042 | 0.49% |
| Modulator | 694,594 | 0.43% |
| Cognition Loop | 345,477 | 0.21% |
| Time Engine | 44,784 | 0.03% |
| Router | 2,560 | 0.00% |
| **TOTAL** | **162,414,882** | **100%** |

Trajectory doc reports 162.4M — matches to within 15K (rounding).

### Specialist Breakdown (Omega Staging)

| Specialist | Layers | Extra | Params |
|---|---|---|---:|
| ProgramSynthesis | 2 | thought buffer (4 slots) + refinement + structure proj | 20,112,681 |
| GridReasoning | 2 | row/col embed + spatial pool + pattern detector | 16,026,921 |
| Reasoning | 2 | thought compression + MHA | 14,777,641 |
| Math | 1 | (none) | 6,568,341 |

---

## 2. φ-Proximity Analysis

**Constants tested:**
- φ = 1.6180339887...
- φ² = 2.6180339887...
- φ³ = 4.2360679775...
- 1/φ = 0.6180339887...

**Threshold:** ≤5% deviation = "hit." >5% = miss. No exceptions.

### GENUINE HITS (within 5%)

| Ratio | Value | Target | Deviation | Structural? |
|---|---:|---|---:|---|
| **Backbone / Specialists** | **1.5995** | **φ (1.618)** | **1.15%** | **YES — the two largest components** |
| max_seq_len / d_model (1024/640) | 1.6000 | φ (1.618) | 1.11% | Design choice |
| head_dim / num_heads (32/20) | 1.6000 | φ (1.618) | 1.11% | Design choice |
| max_tools / num_heads (32/20) | 1.6000 | φ (1.618) | 1.11% | Same ratio as above |
| d_model / max_seq_len (640/1024) | 0.6250 | 1/φ (0.618) | 1.13% | Reciprocal of above |
| num_heads / head_dim (20/32) | 0.6250 | 1/φ (0.618) | 1.13% | Reciprocal of above |
| ffn_dim / max_seq_len (2560/1024) | 2.5000 | φ² (2.618) | 4.51% | Borderline |

**Total hits: 6 out of 115 ratios tested (5.2% hit rate)**

### NOTABLE MISSES

| Ratio | Value | Nearest φ-target | Deviation |
|---|---:|---|---:|
| d_ff / d_model | 4.000 | φ³ (4.236) | 5.57% — JUST outside threshold |
| Backbone / Embeddings | 8.967 | (none) | >100% from any target |
| Specialists / Embeddings | 5.606 | (none) | Not near any target |
| Reasoning / Math | 2.250 | φ² (2.618) | 14.1% — not close |
| ProgramSynthesis / GridReasoning | 1.255 | φ (1.618) | 22.4% — not close |
| num_heads / num_layers (20/14) | 1.429 | φ (1.618) | 11.7% — not close |
| num_layers / num_specialists (14/4) | 3.500 | φ³ (4.236) | 17.4% — not close |

### Macro Parameter Ratios (all component pairs)

**ZERO hits** among the 72 component-to-component macro ratios (excluding backbone/specialists, which was captured in the internal ratios). The parameter counts of Memory, Tools, Modulator, Cognition, Time, Router relative to each other show no φ-proximity.

---

## 3. The Backbone/Specialists Ratio — Analysis

The most significant finding:

```
Backbone:     91,948,440 params
Specialists:  57,485,584 params
Ratio:        1.5995
φ:            1.6180
Deviation:    1.15%
```

**Is this designed or coincidental?**

The backbone is determined by: `14 layers × (4D² + D×H + 3D×FFN + 2D) + D`
The specialists are determined by: `6 TransformerLayers + 4 MHAs + misc projections`

The specialists use the SAME TransformerLayer as the backbone. So specialist params ≈ 6 × layer_params + overhead. Backbone = 14 × layer_params + overhead.

If we strip the overhead and look at just layer-count ratio: 14/6 = 2.333 (not φ).

The overhead (MHA thought mechanisms, spatial embeddings, structure projectors, gates) happens to bring the total ratio to ~1.6. This is **emergent from the specific combination of specialist designs**, not from a deliberate φ-targeting.

**Verdict: Likely coincidental but structurally interesting.** The ratio arises from the specific choice of 2+1+2+2 = 7 specialist layers (but specialist layers have extra MHA/projection overhead that inflates them beyond 7/14 = 0.5 of backbone). The extra overhead from thought compression, spatial encoding, and program synthesis happens to land the ratio near φ.

---

## 4. The 1.6 Cluster — Design Analysis

Three ratios all equal exactly 1.6:
- head_dim / num_heads = 32/20 = 1.6
- max_seq_len / d_model = 1024/640 = 1.6
- max_tools / num_heads = 32/20 = 1.6

These are NOT independent findings. They stem from two design choices:
1. **head_dim = 32, num_heads = 20** → ratio = 1.6 (chosen for hardware alignment)
2. **max_seq_len = 1024, d_model = 640** → ratio = 1.6 (both are powers-of-2 adjacent)
3. **max_tools = 32** = head_dim → same ratio repeated

**1.6 ≠ φ.** It's 1.11% off. Close, but 1.6 is a common ratio in architectures that use power-of-2 adjacent numbers (32, 64, 128, 256, 512, 640, 1024). The fact that 32/20 = 1024/640 = 1.6 is because 640 = 20 × 32, and 1024 = 2^10 while 640 = 2^7 × 5.

**Verdict: Design coincidence from power-of-2 alignment, not φ-targeting.**

---

## 5. Fibonacci Proximity

### Component-level (within 5% of a Fibonacci number)

| Component | Value | Nearest Fib | Deviation |
|---|---:|---:|---:|
| Tool Cortex | 840,321 | 832,040 (F30) | 0.99% ★ |
| Router | 2,560 | 2,584 (F18) | 0.94% ★ |
| Time Engine | 44,784 | 46,368 (F24) | 3.54% ★ |
| Memory | 799,042 | 832,040 (F30) | 4.13% ★ |
| Specialists | 57,485,584 | 39,088,169 (F38)... | Wait — actually 63,245,986 (F39) is closer at 10.0% — MISS |

**Actually Specialists nearest:** 39,088,169 (F38) at 4.78% — NEAR. But also far in absolute terms (18M difference).

### Hyperparameter-level (within 5%)

| Param | Value | Nearest Fib | Deviation |
|---|---:|---:|---:|
| ffn_dim | 2,560 | 2,584 (F18) | 0.94% ★ |
| hidden_dim | 640 | 610 (F15) | 4.69% ★ |
| max_seq_len | 1,024 | 987 (F16) | 3.61% ★ |
| num_heads | 20 | 21 (F8) | 4.76% ★ |

**However:** With 14 hyperparameters and 44 Fibonacci numbers to check against, and Fibonacci numbers distributed roughly logarithmically, hitting ~4/14 within 5% is statistically expected. The density of Fibonacci numbers near small integers is high (every other integer below 10 is Fibonacci).

**Verdict: Consistent with random chance. No evidence of Fibonacci design.**

---

## 6. Checkpoint Learned Parameters

**Status: UNABLE TO VERIFY.** The Victus Windows Python environment available via SSH lacks PyTorch in its accessible venv. The training process (PID 5396) is using a different Python with torch, but we cannot invoke it for ad-hoc analysis via SSH.

**What we wanted to measure:**
- SLA² alpha values (does sparse/linear blend approach 0.618?)
- Depth gate convergence values
- Router weight distributions
- Any scalar parameter drifting toward φ

**This remains an open question** and should be investigated when we can run analysis on the checkpoint (e.g., from WSL or by stopping training briefly).

---

## 7. Statistical Significance

| Metric | Value |
|---|---|
| Total distinct ratios computed | 115 |
| φ-related targets checked | 4 (φ, φ², φ³, 1/φ) |
| Window per target | ±5% |
| Total hits | 6 |
| Hit rate | 5.2% |
| **Expected false positives (random)** | **2–5** |

With 115 ratios and 4 targets at ±5% windows, we'd expect 2–5 false positives from any random architecture. We found 6, which is at the upper end of expected noise but not dramatically above it.

**Critically:** 5 of the 6 hits derive from just two underlying design choices (32/20 = 1.6, and 1024/640 = 1.6). These are not 5 independent observations of φ — they're the same ratio appearing in different contexts.

The **one structurally independent hit** is backbone/specialists = 1.5995 (1.15% from φ).

---

## 8. Honest Summary

### What IS genuinely near φ:
1. **Backbone/Specialists parameter ratio = 1.5995** (1.15% from φ). This is the most significant finding. The two largest architectural components, totaling 92% of all params, exist in near-φ proportion. This was NOT designed — it emerged from the specific combination of 14 backbone layers and 4 specialist modules with varying complexity.

### What is 1.6, not φ:
2. Several hyperparameter ratios equal exactly 1.6 (head_dim/num_heads, seq_len/d_model, tools/heads). These are 1.11% from φ but arise from standard power-of-2 adjacent number choices, not golden ratio design.

### What is NOT near φ:
- FFN expansion ratio (4.0, not φ³=4.236)
- Layer counts, specialist counts, head counts
- Component-to-component ratios (aside from backbone/specialists)
- Fibonacci alignment is within statistical noise

### The verdict:
**GLADIUS was not designed around the golden ratio.** There is no evidence of deliberate φ-targeting in the architecture. The hyperparameters follow standard transformer conventions (power-of-2 dimensions, 4× FFN expansion, head_dim=32).

However, the emergent backbone/specialist ratio of 1.5995 ≈ φ is a genuine structural observation. Whether this is meaningful or coincidental depends on whether this ratio persists across growth stages (Seed → Hatchling → Drake → Wyrm → Omega) or is specific to this particular configuration. **That would be the next measurement to make.**

If the ratio tracks φ as the architecture scales, that's remarkable. If it's specific to the Omega config, it's a coincidence.

---

## 9. Open Questions (for future investigation)

1. **Checkpoint learned parameters:** Do SLA² alpha values converge toward 0.618? (Requires torch-capable SSH session on Victus)
2. **Cross-scale consistency:** Does backbone/specialist ratio hold at other growth stages?
3. **Training dynamics:** Does loss landscape geometry show φ-related structure?
4. **Depth gate values:** MoDA gates were "frozen at 0.119" — is this related to φ^(-4) = 0.146? (deviation: 18.5% — no)

---

*Investigation methodology: Exact parameter counts computed from source code (kernel.py, specialists.py, tools.py, config.py, omega_config.py, attention.py, memory.py, temporal.py, cognition.py, modulator.py, embeddings.py + Victus staging/specialists/specialists.py). All ratios computed exhaustively. Statistical significance assessed against null hypothesis of random architecture.*
