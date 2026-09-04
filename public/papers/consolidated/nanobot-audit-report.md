# GLADIUS Nanobot Audit — Final Issues List

**Date:** March 28, 2026 (Day 46)
**Scope:** 29 production files, 10,417 lines — staging/kernel/ + omega/train_multimodal_synthase.py + data pipeline
**Method:** 12 specialized sub-agents, each assigned a domain. Cross-verified.

---

## 🔴 CRITICAL — Training is Broken

### C1. Double Shift in Loss — Model Trains on t+2 Instead of t+1
**Source:** Nanobot 8 (Training Loop)
**Files:** `train_multimodal_synthase.py` compute_loss(), `omega_pipeline.py`

The data pipeline (`MultilingualCorpus.sample()`) returns pre-shifted targets: `x = tokens[:seq_len]`, `y = tokens[1:seq_len+1]`. The `MultimodalSampler` preserves this shift. Then `compute_loss()` shifts AGAIN:
```python
shift_logits = logits[:, :-1, :].contiguous()
shift_targets = target_ids[:, 1:].contiguous()
```
Result: position `i` of logits is compared against `tokens[i+2]`. Every gradient update is on misaligned targets. This is the most likely cause of the loss plateau at step 1543.

**Fix:** Remove the second shift. Targets are already aligned:
```python
loss = F.cross_entropy(logits.view(-1, vocab_size), target_ids.view(-1), ignore_index=0)
```
Or verify the pipeline end-to-end by printing `input_ids[0, :5]` and `target_ids[0, :5]` — target should be input shifted by exactly 1.

---

### C2. Linear Attention is NOT Causal — Future Information Leakage
**Source:** Nanobot 2 (Attention)
**File:** `attention.py`, SLA² linear attention path

```python
KV_lin = torch.matmul(K_lin.transpose(-2, -1), V)  # Global KV: (B, H, D, D)
O_linear = torch.matmul(Q_lin, KV_lin) / (torch.matmul(Q_lin, Z_lin) + 1e-6)
```
This computes a GLOBAL outer-product summary across ALL positions. Position `i` sees positions `i+1, i+2, ...` through the linear branch. The softmax path is correctly causal (`is_causal=True` in SDPA), but the `(1-α)` linear branch leaks future information.

During training with teacher forcing, the model can cheat through the linear attention path. The alpha parameters may be learning to keep the linear branch active precisely BECAUSE it provides free information from the future.

**Fix:** Replace global KV with causal cumulative sum:
```python
# Feature maps
phi_Q = F.elu(Q_lin) + 1
phi_K = F.elu(K_lin) + 1
# Causal: KV[t] = sum_{j<=t} k_j outer v_j
KV_outer = torch.einsum('bhsd,bhse->bhsde', phi_K, V)
KV_cum = torch.cumsum(KV_outer, dim=2)  # Cumulative along seq
Z_cum = torch.cumsum(phi_K, dim=2)      # Normalizer
O_linear = torch.einsum('bhsd,bhsde->bhse', phi_Q, KV_cum) / (torch.einsum('bhsd,bhsd->bhs', phi_Q, Z_cum).unsqueeze(-1) + 1e-6)
```

---

### C3. CognitionAuxLoss Exists But Was NEVER Connected
**Source:** Nanobot 4 (Cognition)
**Files:** `cognition_loss.py` (entire file), `train_multimodal_synthase.py`

`CognitionAuxLoss` was written specifically to fix cognition dormancy. Its docstring says: "Cognition module was dormant across ALL experiments because its outputs are never consumed by a loss function." But the class is NEVER imported, instantiated, or called in the training script. The trainer uses only cross-entropy + balance_loss.

This is WHY cognition is 60% near-zero. No loss flows to the cognition module. It produces `cognitive_state`, `mode_probs`, `memory_importance` — all computed, none consumed by any loss.

**Fix:**
1. In `kernel.py` forward(), add `'_hidden': x` to return dict (before modulator)
2. In training script, add:
```python
from kernel.cognition_loss import CognitionAuxLoss
cog_loss_fn = CognitionAuxLoss(config, num_tasks=6)
# In compute_loss:
cog_loss = cog_loss_fn(result['cognitive_state'], result['mode_probs'], task_id)
total_loss += 0.1 * cog_loss
```

---

### C4. ToolCortex is PERMANENTLY DEAD — Never Registered
**Source:** Nanobot 5 (Tools)
**Files:** `tools.py`, `kernel.py`, `train_multimodal_synthase.py`

`ToolCortex` starts with `num_registered = 0`. The training script NEVER calls `register_grid_tools()` or `register_tool()`. Therefore `check_activation()` always returns `None` at:
```python
if self.num_registered == 0:
    return None
```
430K parameters are allocated, assigned to optimizer group 4 (`lr=5e-4`), but get ZERO gradient. The crystallization confirmed this: Xavier ratio 0.27 — the optimizer is decaying the weights toward zero since there's no countervailing gradient.

**Fix:** In training script, after model creation:
```python
model.tool_cortex.register_grid_tools()  # Register the 6 grid primitives
```
Or better: auto-register in `ToolCortex.__init__()` when `max_tools > 0`.

Additionally, the hard threshold `if best_sim.max().item() < threshold: return None` kills gradient flow (`.item()` detaches). Replace with soft gating:
```python
gate = torch.sigmoid((best_sim.max(dim=-1).values - threshold) * 10)
return gate.unsqueeze(-1) * tool_result  # Soft, differentiable
```

---

## 🟡 MODERATE — Affects Quality or Maintenance

### M1. Synthase Forward Patch Replaces ENTIRE forward() — Maintenance Bomb
**Source:** Nanobot 7 (Synthase)
**File:** `synthase_surgery.py`

`upgrade_kernel_to_synthase()` captures `_original_forward` but NEVER calls it. Instead, `synthase_forward()` is a complete rewrite of `GladiusKernel.forward()`. Any future change to `kernel.py`'s forward method (new features, bug fixes) will be silently ignored after surgery. The two forward methods have already diverged (timestamp handling differs).

**Fix:** Refactor to hook-based approach that only wraps the layer loop:
```python
# Override only the layer iteration, keep pre/post processing from original
original_layer_loop = kernel._run_layers  # Extract just the layer loop
kernel._run_layers = synthase_layer_loop  # Replace only that part
```

---

### M2. BF16 Timestamp Overflow in AbsoluteClock
**Source:** Nanobot 12 (Numerical Stability)
**File:** `temporal.py`, AbsoluteClock.forward()

```python
linear = self.omega[0:1] * t + self.phi[0:1]
periodic = torch.sin(self.omega[1:] * t + self.phi[1:])
```
Under autocast (bf16), if `epoch_offset` buffer fails to load during checkpoint surgery, `t_norm` becomes raw epoch seconds / 3600 ≈ 472,222. In bf16 this has ~3 digits of precision. Even with correct `epoch_offset` (~700 hours), as omega grows past 0.37, the product exceeds bf16's exact-integer range (256), and `sin()` produces meaningless noise.

**Fix:** Force float32 for temporal computations:
```python
def forward(self, timestamp):
    t = timestamp.float().unsqueeze(-1)  # Force fp32
    linear = self.omega.float()[0:1] * t + self.phi.float()[0:1]
    periodic = torch.sin(self.omega.float()[1:] * t + self.phi.float()[1:])
    return torch.cat([linear, periodic], dim=-1).to(timestamp.dtype)
```

---

### M3. specialist_residual_scale Missing from Config + State Dict
**Source:** Nanobot 1 (Kernel Core)
**File:** `kernel.py` line 61

```python
self.specialist_scale = getattr(config, 'specialist_residual_scale', 0.1)
```
This is a plain Python float, NOT in `KernelConfig`, NOT in `state_dict`. If the scale is ever changed via config override and then a checkpoint is loaded, the override is silently lost. The hyperparameter is invisible to config management, serialization, and reproducibility.

**Fix:** Add to `KernelConfig`:
```python
specialist_residual_scale: float = 0.1
```
And in kernel.py, register as buffer:
```python
self.register_buffer('specialist_scale', torch.tensor(config.specialist_residual_scale))
```

---

### M4. RelativeClock Event Buffer Initialization Kills Output at Start
**Source:** Nanobot 3 (Temporal)
**File:** `temporal.py`, RelativeClock

When `event_times` buffer is all zeros (initial state), deltas = ~1.77e9 seconds, `log1p` gives ~21.3, which after projection and `exp(-decay * ...)` collapses to ~0. The relative clock is effectively dead until the event buffer fills AND the projection learns.

**Fix:** Initialize `event_times` to the first timestamp received, or normalize timestamps before delta computation.

---

### M5. Warm Memory / Three-Temperature Memory: Complex but Disconnected
**Source:** Nanobot 6 (Memory)
**Files:** `memory.py`, `warm_memory.py`

`ThreeTemperatureMemory` in `memory.py` wraps Hot + Warm (stub) + Cold. The real `RealWarmMemory` in `warm_memory.py` (381 lines, LoRA adaptation, spectral balancing, subspace tracking) is never imported by `memory.py`. The kernel uses `ThreeTemperatureMemory` which has a stub `WarmMemory` that does nothing. 

`RealWarmMemory` is a sophisticated module with LoRA adaptation, spectral balancing, and subspace tracking — but it's NEVER wired in. All warm_* config parameters (warm_rank, warm_condition_threshold, warm_balance_frequency, warm_novelty_threshold) are consumed by the stub, not the real module.

**Fix:** In `memory.py`, import and use `RealWarmMemory`:
```python
from warm_memory import RealWarmMemory
# Replace stub WarmMemory with RealWarmMemory in ThreeTemperatureMemory
```

---

### M6. Depth Scales Can Go Negative — Unconstrained
**Source:** Nanobot 12 (Numerical Stability)
**File:** `synthase_surgery.py`

`depth_scale` is `nn.Parameter(torch.tensor(0.1))` with no constraints. If gradient pushes it negative, the depth signal INVERTS — adding the negative of the depth attention output. This isn't necessarily bad (could be useful) but it's unconstrained, and if it goes to large negative values, it could destabilize training.

Currently all depth scales are positive (0.069-0.159 at step 1500), but there's no guard.

**Fix:** Apply softplus or abs in usage:
```python
scale = F.softplus(self.depth_scale)  # Always positive
```

---

## 🟢 MINOR — Cosmetic or Low Impact

### N1. MoDA v1 Dead Code in Production Tree
**Source:** Nanobot 9
**File:** `moda.py` (506 lines, never imported)

Entire file is dead code. Never referenced by any production file.

**Fix:** `mv moda.py archive/moda_v1_deprecated.py`

---

### N2. config_arc.py — Potentially Stale Config Variant
**Source:** Nanobot 10
**File:** `config_arc.py`

Separate ARC-specific config that may duplicate/conflict with main config. Not imported by training script.

**Fix:** Verify if needed. If not, archive.

---

### N3. SensoryIntegration — Empty Modality Projections
**Source:** Nanobot 5
**File:** `senses.py`

`SensoryIntegration` defines projections for `image`, `audio`, `timeseries` modalities, but the training script only passes `images` (vision modality). Audio and timeseries projections exist but are never exercised. No gradient reaches them.

**Fix:** Either remove unused projections or ensure training data includes those modalities.

---

### N4. Cross-File Naming — All Clean
**Source:** Nanobot 10

Exhaustive cross-reference of all config attributes, module names, import names, and state_dict keys found NO naming mismatches across the 13 files audited. All references are consistent.

---

## Summary Table

| # | Severity | Issue | Impact | Fix Effort |
|---|----------|-------|--------|------------|
| C1 | 🔴 CRITICAL | Double shift in loss — trains on t+2 | All gradients wrong | 5 min |
| C2 | 🔴 CRITICAL | Linear attention not causal — future leak | Model can cheat | 30 min |
| C3 | 🔴 CRITICAL | CognitionLoss never wired | Cognition gradient-dead | 10 min |
| C4 | 🔴 CRITICAL | ToolCortex never registered | 430K params dead | 5 min |
| M1 | 🟡 MODERATE | Synthase patches entire forward | Maintenance bomb | 2 hr |
| M2 | 🟡 MODERATE | BF16 timestamp overflow | Time engine noise | 10 min |
| M3 | 🟡 MODERATE | specialist_scale not persisted | Reproducibility risk | 10 min |
| M4 | 🟡 MODERATE | RelativeClock dead at init | Slow temporal learning | 15 min |
| M5 | 🟡 MODERATE | RealWarmMemory never wired | Memory adaptation dead | 20 min |
| M6 | 🟡 MODERATE | Depth scales unconstrained | Stability risk | 5 min |
| N1 | 🟢 MINOR | MoDA dead code | Clutter | 1 min |
| N2 | 🟢 MINOR | config_arc.py stale | Clutter | 1 min |
| N3 | 🟢 MINOR | Unused sense projections | Wasted params | 5 min |

---

## Recommended Fix Order

**Phase 1 — STOP THE BLEEDING (before restarting training):**
1. Fix C1 (double shift) — 5 minutes, biggest impact
2. Fix C2 (causal linear attention) — 30 minutes, fundamental correctness
3. Fix M2 (bf16 temporal) — 10 minutes, prevents NaN

**Phase 2 — WAKE THE ORGANS (before expansion phase):**
4. Fix C3 (wire CognitionLoss) — 10 minutes
5. Fix C4 (register tools) — 5 minutes
6. Fix M5 (wire RealWarmMemory) — 20 minutes

**Phase 3 — HARDEN (next major checkpoint):**
7. Fix M1 (refactor synthase forward)
8. Fix M3 (persist specialist_scale)
9. Fix M4 (relative clock init)
10. Fix M6 (depth scale constraints)

**Total effort for Phase 1+2: ~1 hour of code changes.**
The model should be stopped, patched, and restarted. The double-shift alone means every step so far has trained on wrong targets.

---

*12 nanobots. 10,417 lines. 29 files. 4 critical. 6 moderate. 3 minor. Zero false positives requested.*
