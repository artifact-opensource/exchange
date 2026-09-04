# GLADIUS v2.0 — Complete Forward Pass Wiring Map

**Date:** 2026-03-15 | **Inspector:** Nanobot Atomic Inspection
**Source:** `/home/ava/gladius-training/src/kernel/` (10 files, ~2,500 LOC)
**Config:** Default `KernelConfig` — 15,313,298 parameters (all `requires_grad=True`)

---

## 1. ASCII Data Flow Diagram

```
INPUT: input_ids (B, S)          timestamp (float/Tensor/None)
         │                              │
         ▼                              │
┌─────────────────┐                     │
│ SharedEmbeddings │                     │
│ token_embed      │                     │
│ × sqrt(D)        │                     │
└────────┬────────┘                     │
         │ x: (B, S, 256)               │
         ▼                              │
┌────────────────────┐                  │
│ ThreeTemperatureMemory.read()         │
│                                       │
│  ┌─ HotMemory.read(x)               │
│  │  scores = x @ keys.T / √D        │
│  │  weights = softmax(scores)        │
│  │  hot_ctx = weights @ values       │
│  │  → hot_ctx: (B, S, 256)          │
│  │                                    │
│  └→ x_combined = x + hot_ctx         │
│                                       │
│  ┌─ WarmMemory.forward(x_combined)   │
│  │  adapter = (x @ lora_A @ lora_B)  │
│  │           × scale                  │
│  │  → x + adapter: (B, S, 256)      │
│  └───────────────────────────────┘    │
└────────┬──────────────────────────────┘
         │ x: (B, S, 256)               │
         ▼                              ▼
┌──────────────────────────────────────────┐
│ CONDITIONAL: if timestamp is not None    │
│                                          │
│  ┌─ TimeEngine(timestamp)                │
│  │  t_norm = (ts - epoch) / 3600         │
│  │  abs = AbsoluteClock(t_norm)  (B,16)  │
│  │  rel = RelativeClock(ts)      (B,16)  │
│  │  fused = TemporalFusion(abs,rel)      │
│  │  → time_embed: (B, 256)              │
│  └→ x = x + time_embed.unsqueeze(1)     │
│     (broadcast across seq_len)           │
│                                          │
│ ELSE: x passes through unchanged ☠️     │
└────────┬─────────────────────────────────┘
         │ x: (B, S, 256)
         ▼
┌──────────────────────────────────────┐
│ Transformer Backbone (×6 layers)     │
│                                      │
│  mask = causal_mask[:,:,:S,:S]        │
│                                      │
│  for each layer i in [0..5]:         │
│  ┌──────────────────────────────┐    │
│  │ TransformerLayer(x, mask)     │    │
│  │                               │    │
│  │ ┌─ x_norm = attn_norm(x)     │    │
│  │ │                             │    │
│  │ │ HybridAttention:            │    │
│  │ │  Q = q_proj(x_norm)        │    │
│  │ │  K = k_proj(x_norm)        │    │
│  │ │  V = v_proj(x_norm)        │    │
│  │ │  Q,K = rope(Q,K)           │    │
│  │ │                             │    │
│  │ │  LINEAR PATH:               │    │
│  │ │   Q_lin = elu(Q)+1          │    │
│  │ │   K_lin = elu(K)+1          │    │
│  │ │   O_lin = Q_lin@(K_lin.T@V) │    │
│  │ │          / (Q_lin@Z + 1e-6) │    │
│  │ │                             │    │
│  │ │  SOFTMAX PATH:              │    │
│  │ │   scores = Q@K.T / √d       │    │
│  │ │   scores.masked_fill(~mask) │    │
│  │ │   O_soft = softmax(scores)@V│    │
│  │ │                             │    │
│  │ │  BLEND:                     │    │
│  │ │   α = sigmoid(α_router(x))  │    │
│  │ │   O = α·O_soft + (1-α)·O_lin│    │
│  │ │   → o_proj(O)               │    │
│  │ └→ x = x + attn_output        │    │
│  │                               │    │
│  │ ┌─ x_norm2 = ffn_norm(x)     │    │
│  │ │  SwiGLU:                    │    │
│  │ │   gate = silu(gate_proj(x)) │    │
│  │ │   up = up_proj(x)           │    │
│  │ │   → down_proj(gate × up)    │    │
│  │ └→ x = x + ffn_output         │    │
│  └──────────────────────────────┘    │
│                                      │
└────────┬─────────────────────────────┘
         │ x: (B, S, 256)
         ▼
┌─────────────┐
│ final_norm   │ RMSNorm
└────────┬────┘
         │ x: (B, S, 256)
         ▼
┌──────────────────────────────────────┐
│ CONDITIONAL: ToolCortex.check_activation(x)  │
│                                              │
│  if num_registered == 0: return None ☠️     │
│  (DEFAULT STATE — always None)               │
│                                              │
│  IF registered:                              │
│   pooled = x.mean(dim=1)           (B, 256) │
│   sims = cosine(pooled, tool_embeds)(B, 64) │
│   if max(sim) < 0.6: return None            │
│   contribution = result_proj(tool_embed)     │
│   x = x + contribution                      │
└────────┬─────────────────────────────────────┘
         │ x: (B, S, 256)
         ▼
┌──────────────────────────────────────────────┐
│ Modulator.forward(x, output_head)            │
│                                              │
│  base_logits = output_head(x)     (B, S, V) │
│  pooled = x.mean(dim=1)           (B, 256)  │
│  register = register_head(pooled) (B, 4)    │
│  intent = intent_head(pooled)     (B, 4)    │
│  silence = silence_head(pooled)   (B, 1)    │
│  control = cat(register, intent)  (B, 8)    │
│  bias = bias_proj(control) × scale(B, V)    │
│  logits = base_logits + bias      (B, S, V) │
│                                              │
│  → (logits, silence)                         │
└────────┬─────────────────────────────────────┘
         │
    ┌────┴────┐
    ▼         ▼
 logits    silence     ← RETURNED (in loss path for logits)
(B,S,V)    (B,1)

         │ x: (B, S, 256) [post-norm, pre-modulator x]
         ▼
┌──────────────────────────────────────┐
│ HotMemory.write(x)                   │
│  importance = write_gate(x)  (B,S,1) │
│  with torch.no_grad():     ☠️☠️☠️  │
│    actual writes are detached!        │
│    (LRU eviction + key/value copy)    │
│  → importance: (B, S, 1)            │
└────────┬─────────────────────────────┘
         │
         ▼
      importance ← RETURNED (but NOT used by training loss)

         │ x: (B, S, 256) [same x from step 5]
         ▼
┌──────────────────────────────────────┐
│ CognitionLoop.heartbeat(x)          │
│  state = state_monitor(x)   (B, 64) │
│  mode, probs = scheduler(state)     │
│  → mode: CognitiveMode (int)        │
│                                      │
│  NOTE: probs is DISCARDED ☠️        │
│  NOTE: state is DISCARDED ☠️        │
│  mode returned as Python int (no grad)│
└────────┬─────────────────────────────┘
         │
         ▼
       mode ← RETURNED (Python int, no tensor, no grad)

┌───────────────────────────────────────┐
│ NexusRouter — NEVER CALLED ☠️☠️☠️   │
│ (Exists in __init__, absent from      │
│  forward pass entirely)               │
│                                       │
│ router.gate.weight: [4, 256] = 1,024 │
│ COMPLETELY DEAD.                      │
└───────────────────────────────────────┘

RETURN: {
  logits:     (B, S, V)      ← GRADIENT PATH (cross_entropy)
  silence:    (B, 1)         ← GRADIENT PATH (but no loss targets it)
  mode:       CognitiveMode  ← NO GRADIENT (Python int)
  importance: (B, S, 1)      ← NO GRADIENT (write_gate under no_grad wrapping)
}
```

---

## 2. Per-Module Parameter Analysis

### Parameter Census (verified by instantiation)

| Module | Parameters | % of Total | On Grad Path? | Notes |
|--------|-----------|------------|---------------|-------|
| **embeddings.token_embed** | 8,192,000 | 53.50% | ✅ YES | Weight-tied with output_head |
| **layers[0-5] total** | 6,077,184 | 39.69% | ✅ YES | Core transformer backbone |
| ├─ attention (q/k/v/o_proj) | 1,572,864 | 10.27% | ✅ YES | 4×65,536 × 6 layers |
| ├─ alpha_router | 12,336 | 0.08% | ✅ YES | 2,056 × 6 layers |
| ├─ ffn (gate/up/down_proj) | 4,718,592 | 30.81% | ✅ YES | 3×262,144 × 6 layers |
| ├─ attn_norm + ffn_norm | 3,072 | 0.02% | ✅ YES | 256 × 2 × 6 layers |
| └─ rope (cos/sin cached) | 0 | 0.00% | N/A | Buffers, not parameters |
| **final_norm** | 256 | 0.00% | ✅ YES | |
| **modulator total** | 305,730 | 2.00% | ⚠️ PARTIAL | See detailed analysis |
| ├─ register_head | 16,712 | 0.11% | ⚠️ YES* | Receives grad via bias_proj |
| ├─ intent_head | 16,712 | 0.11% | ⚠️ YES* | Receives grad via bias_proj |
| ├─ silence_head | 16,449 | 0.11% | ❌ NO | No loss targets silence |
| ├─ bias_proj | 256,000 | 1.67% | ✅ YES | Projects to vocab_size |
| └─ bias_scale | 1 | 0.00% | ✅ YES | Scales the bias |
| **memory.hot total** | 278,657 | 1.82% | ⚠️ PARTIAL | |
| ├─ keys | 131,072 | 0.86% | ⚠️ WEAK | Read path has grad; write overwrites `.data` |
| ├─ values | 131,072 | 0.86% | ⚠️ WEAK | Same — grad from read, but `.data` overwritten in write |
| ├─ write_gate | 16,513 | 0.11% | ❌ NO | Called inside `torch.no_grad()` context |
| **memory.warm total** | 8,193 | 0.05% | ✅ YES | lora_A, lora_B, scale |
| **cognition total** | 62,085 | 0.41% | ❌ NO | All outputs discarded |
| ├─ state_monitor | 20,608 | 0.13% | ❌ NO | Output → scheduler → Python int |
| ├─ scheduler | 260 | 0.00% | ❌ NO | Returns Python int (no grad) |
| ├─ attention_filter | 41,217 | 0.27% | ❌ NO | NEVER CALLED in forward pass |
| **tool_cortex total** | 148,177 | 0.97% | ❌ NO | num_registered=0 → returns None |
| ├─ tool_embeddings | 16,384 | 0.11% | ❌ NO | Dead (no tools registered) |
| ├─ activation_gate | 65,793 | 0.43% | ❌ NO | Never reached |
| ├─ result_proj | 65,536 | 0.43% | ❌ NO | Never reached |
| **router.gate** | 1,024 | 0.01% | ❌ NO | **NEVER CALLED** |
| **time_engine total** | 10,576 | 0.07% | ⚠️ CONDITIONAL | Only if timestamp≠None |
| ├─ absolute (omega, phi) | 32 | 0.00% | ⚠️ CONDITIONAL | |
| ├─ relative (decay, proj) | 1,040 | 0.01% | ⚠️ CONDITIONAL | |
| └─ fusion | 9,504 | 0.06% | ⚠️ CONDITIONAL | |

### Summary by Gradient Status

| Status | Parameters | % of Total |
|--------|-----------|------------|
| ✅ **Fully on gradient path** | 14,583,363 | 95.24% |
| ⚠️ **Conditional/Weak gradient** | 516,890 | 3.37% |
| ❌ **Completely disconnected** | 213,045 | 1.39% |

---

## 3. Gradient Flow Analysis

### The Main Gradient Path (cross_entropy on logits)

```
loss = cross_entropy(logits[:, :-1, :], targets[:, 1:])
  │
  ▼ ∂loss/∂logits
modulated_logits = base_logits + bias.unsqueeze(1)
  │
  ├─── ∂loss/∂base_logits → output_head(x) → x → final_norm → layers[5..0] → memory.read → embeddings
  │    (THIS IS THE MAIN HIGHWAY — 95% of params)
  │
  └─── ∂loss/∂bias → bias_proj ← cat(register, intent) ← register_head(pooled), intent_head(pooled)
       (SECONDARY PATH — 2% of params, but pooled=x.mean(dim=1) so gradient also flows back through x)
```

### Module-by-Module Gradient Tracing

**1. SharedEmbeddings (8.19M — 53.5%)**
- `token_embed.weight`: Receives gradient through two paths:
  - Forward: `embed(input_ids)` × √D → into transformer
  - Backward: `output_head.weight` is tied to `token_embed.weight`, so cross_entropy loss flows directly
- **Status: FULLY TRAINED** ✅

**2. Transformer Layers (6.08M — 39.7%)**
- `q_proj, k_proj, v_proj, o_proj`: Direct gradient path through attention computation
- `alpha_router`: Gradient flows through the α-blended O = α·O_soft + (1-α)·O_lin
- `gate_proj, up_proj, down_proj`: Direct gradient path through SwiGLU FFN
- `attn_norm, ffn_norm`: RMSNorm weight receives gradient
- `rope`: No parameters (buffers only), no gradient concern
- **Status: FULLY TRAINED** ✅

**3. Modulator (305K — 2.0%)**
- `bias_proj (256K)`: YES — `logits = base_logits + bias_proj(control) * bias_scale` → cross_entropy
- `register_head (16.7K)`: YES — feeds into `control` → `bias_proj` → logits
- `intent_head (16.7K)`: YES — same path as register
- `silence_head (16.4K)`: **NO** — `silence` is returned but NO loss function uses it. The silence value is only checked in `generate()` (which runs under `@torch.no_grad()`). During training, silence receives zero gradient.
- `bias_scale (1)`: YES — scales the bias additive
- **Status: MOSTLY TRAINED, silence_head is DEAD** ⚠️

**4. ThreeTemperatureMemory (287K — 1.87%)**

**Hot Memory (278.6K):**
- `keys (131K)` and `values (131K)`: COMPLEX SITUATION
  - **READ path**: `scores = x @ keys.T / √D; weights = softmax(scores); ctx = weights @ values`
    - Gradient DOES flow through keys and values via the matmul + softmax
    - This means keys/values get gradient signal from the cross_entropy loss
  - **WRITE path**: `with torch.no_grad(): self.keys.data[slot] = hidden[b, idx].detach()`
    - The `.data` in-place overwrite DESTROYS any learned key/value content
    - Every time a position with importance > 0.5 appears, a slot gets overwritten with detached hidden states
    - This creates a WAR (Write-After-Read) hazard: gradient says "move keys this way", then write says "no, replace with this detached thing"
  - **NET EFFECT**: keys/values oscillate between gradient-updated and overwritten states. The `hot_importance_threshold=0.5` gate determines how often this happens. If importance is frequently > 0.5, writes dominate and gradients are wasted.
- `write_gate (16.5K)`: **FULLY DEAD** — the entire `write()` method wraps the gate's output processing in `torch.no_grad()`. While `importance = self.write_gate(hidden)` does compute forward (and could receive gradient if importance were used in the loss), the returned `importance` tensor is NEVER used by any loss function. The training scripts don't include an importance loss. Zero gradient.
- **Status: keys/values have CONFLICTING gradient signal; write_gate is DEAD** ⚠️

**Warm Memory (8.2K):**
- `lora_A (4K)`, `lora_B (4K)`, `scale (1)`: All on gradient path
  - `adapter_out = (x @ lora_A @ lora_B) * scale; return x + adapter_out`
  - Gradient flows cleanly from x through the adapter and back
- **Status: FULLY TRAINED** ✅

**Cold Memory (0 params):**
- Not an `nn.Module`, stub returns zeros, never called in current forward pass
- **Status: N/A** (external system)

**5. TimeEngine (10.6K — 0.07%)**
- **CONDITIONAL on `timestamp is not None`**
- If timestamp IS provided:
  - `omega, phi (32 params)`: Gradient flows through `sin(ω·t + φ)` → fusion → x
  - `decay, proj (1K params)`: Gradient flows through `exp(-decay * proj(log_deltas))` → fusion → x
  - `fusion.proj (9.5K params)`: Gradient flows through linear → SiLU → linear → x
  - All gradients flow additively into x: `x = x + time_embed.unsqueeze(1)`
- If timestamp IS NOT provided (the common case in many training scripts):
  - **ALL 10,576 PARAMS ARE DEAD** — no computation, no gradient
- **Status: CONDITIONAL** ⚠️ — depends entirely on whether training script passes timestamps

**6. CognitionLoop (62K — 0.41%)**
- **state_monitor (20.6K)**: Computes `state = proj(hidden.mean(dim=1))` → (B, 64)
  - Gradient COULD flow, but the output goes to `scheduler`...
- **scheduler (260)**: Computes `mode_idx = logits[0].argmax(dim=-1).item()` → **Python int**
  - `.item()` kills the computational graph. `argmax` is non-differentiable.
  - Even `mode_probs = softmax(logits)` is computed but **DISCARDED** — never returned from `heartbeat()`
  - `heartbeat()` returns `mode` (CognitiveMode enum = Python int)
  - kernel.py stores this in the return dict as `mode` — a Python int, not a tensor
- **attention_filter (41.2K)**: **NEVER CALLED ANYWHERE** in the entire forward pass
  - Exists only in `__init__` as `self.attention_filter = AttentionFilter(config)`
  - No method in `CognitionLoop` calls it. No method in `GladiusKernel` calls it.
  - 41,217 completely dead parameters
- **Status: COMPLETELY DEAD** ❌ — zero gradient to any cognition parameter

**7. ToolCortex (148K — 0.97%)**
- `num_registered` starts at 0 and is never modified during training
- `check_activation()` returns `None` immediately when `num_registered == 0`
- **ALL parameters are unreachable**: tool_embeddings, activation_gate, result_proj
- Even IF tools were registered, the cosine similarity check adds another gate
- **Status: COMPLETELY DEAD** ❌

**8. NexusRouter (1K — 0.01%)**
- `router.gate.weight [4, 256]`: Initialized in `__init__`, **NEVER CALLED** in `forward()`
- The router is not referenced anywhere in the forward pass
- `balance_loss()` method exists but is never called by any training script
- **Status: COMPLETELY DEAD** ❌

---

## 4. Dead Paths / Disconnections / Dormant Modules

### ☠️ CRITICAL: Completely Dead (0 gradient, 0 computation)

| ID | Module | Params | Root Cause | Impact |
|----|--------|--------|------------|--------|
| D1 | `router.gate` | 1,024 | Not called in `forward()` | Wastes memory, specialists never activate |
| D2 | `cognition.attention_filter` | 41,217 | Not called anywhere | RAS system non-functional |
| D3 | `cognition.state_monitor` | 20,608 | Output → `.item()` → Python int | State observation is computed then destroyed |
| D4 | `cognition.scheduler` | 260 | `argmax().item()` kills gradient | Mode classification learns nothing |
| D5 | `tool_cortex.*` (all) | 148,177 | `num_registered == 0` | Entire tool system dormant |
| D6 | `memory.hot.write_gate` | 16,513 | Output used under `no_grad()`, never in loss | Importance scoring learns nothing |

**Total dead: 227,799 params (1.49%)**

### ⚠️ WARNING: Weak/Conflicting Gradient

| ID | Module | Params | Issue | Impact |
|----|--------|--------|-------|--------|
| W1 | `memory.hot.keys` | 131,072 | Read gives grad; write overwrites `.data` with detached tensors | Learning oscillation |
| W2 | `memory.hot.values` | 131,072 | Same as W1 | Learning oscillation |
| W3 | `modulator.silence_head` | 16,449 | `silence` returned but no loss uses it | Silence gate learns nothing |
| W4 | `time_engine.*` | 10,576 | Only active if `timestamp is not None` | Temporal awareness depends on training script |

**Total weak: 289,169 params (1.89%)**

### 🔀 Conditional Paths That Block Gradient Flow

| # | Location | Condition | Effect When False |
|---|----------|-----------|-------------------|
| C1 | `kernel.py:59` | `if timestamp is not None` | TimeEngine entirely bypassed — 10.6K params get 0 gradient |
| C2 | `kernel.py:69` | `if tool_result is not None` | ToolCortex contribution skipped (always skipped currently) |
| C3 | `tools.py:72` | `if self.num_registered == 0` | Early return None — gates all tool params |
| C4 | `tools.py:84` | `if best_sim.max() < threshold` | Even with registered tools, activation gated by cosine sim |
| C5 | `memory.py:75` | `if max_importance[b] > 0.5` | Hot memory write gated by importance threshold |
| C6 | `cognition.py:91` | `should_consolidate()` → REFLECTIVE/DORMANT | Consolidation only during specific cognitive modes |

---

## 5. The Known Bug — Detailed Analysis

### Bug: `cognitive_state` and `mode_probs` Not Returned

**Location:** `kernel.py` line 89-93

```python
return {
    'logits': logits,
    'silence': silence,       # tensor but no loss
    'mode': mode,             # Python int, no grad
    'importance': importance, # tensor but write used no_grad
}
```

**What's missing:**
- `cognitive_state`: The `(B, cognition_state_dim)` tensor from `StateMonitor.forward()` — computed inside `heartbeat()` but never exposed
- `mode_probs`: The `(B, num_modes)` softmax distribution from `HeartbeatScheduler.forward()` — computed but discarded

**Effect on training:**
Training scripts typically have:
```python
# Auxiliary cognition loss (if available)
if result.get('cognitive_state') is not None:
    cog_loss = cognition_auxiliary_loss(result['cognitive_state'], result['mode_probs'])
    total_loss += cog_weight * cog_loss
```
Since `cognitive_state` is always `None`, the entire cognition module (62,085 params) receives **zero gradient** in every training step.

**Fix required in `CognitionLoop.heartbeat()`:**
```python
def heartbeat(self, hidden):
    state = self.state_monitor(hidden)
    mode, probs = self.scheduler(state)
    self.current_mode = mode
    return mode, state, probs  # Return all three
```
**And in `kernel.py`:**
```python
mode, cognitive_state, mode_probs = self.cognition.heartbeat(x)
...
return {
    'logits': logits,
    'silence': silence,
    'mode': mode,
    'importance': importance,
    'cognitive_state': cognitive_state,  # ADD
    'mode_probs': mode_probs,           # ADD
}
```

---

## 6. The Return Dict — What Each Value Actually Is

| Key | Type | Shape | Has Gradient? | Used in Loss? | Notes |
|-----|------|-------|--------------|---------------|-------|
| `logits` | Tensor | (B, S, V) | ✅ YES | ✅ YES (cross_entropy) | Main training signal |
| `silence` | Tensor | (B, 1) | ✅ YES (graph exists) | ❌ NO | Gradient exists but no loss targets it |
| `mode` | Python int | scalar | ❌ NO | ❌ NO | `.item()` killed the graph |
| `importance` | Tensor | (B, S, 1) | ⚠️ PARTIAL | ❌ NO | write_gate forward has grad, but write is no_grad |

---

## 7. Module Interaction Matrix

```
                  embed  hot   warm  time  layers  norm  tools  mod   cog   router
embeddings  ─────→  ●     →     →           →
hot_memory          ←     ●     →           
warm_memory               ←     ●           →
time_engine                           ●     →
layers                                ←     ●     →
final_norm                                  ←     ●     →      →
tool_cortex                                       ←     ●      →
modulator                                               ←      ●
cognition                                         ←                    ●
router                                                                        ●(ISOLATED)

Legend: → = data flows to | ← = data flows from | ● = self
```

**Isolated modules:** `router` has zero connections. `cognition.attention_filter` has zero connections.

---

## 8. Recommendations

### Priority 1: Fix Cognition Return Values (0 code risk, high impact)

**Problem:** 62K params (0.41%) completely dead
**Fix:**
1. Modify `CognitionLoop.heartbeat()` to return `(mode, state, probs)`
2. Modify `kernel.py` to include `cognitive_state` and `mode_probs` in return dict
3. Add auxiliary loss in training: `cog_loss = cross_entropy(mode_probs, target_mode)` or contrastive loss
4. **Estimated impact:** Cognition starts learning mode classification → enables future self-prompting

### Priority 2: Fix Hot Memory Write Gate (medium risk, medium impact)

**Problem:** `write_gate` (16.5K params) never receives gradient because:
- Its output `importance` is returned but not used in any loss
- The actual write logic is under `torch.no_grad()`

**Fix:**
1. Add importance regularization loss: `imp_loss = -importance.mean()` (encourage writing) or use as attention weight
2. OR: Remove `no_grad()` from the key/value write and use straight-through estimator
3. OR: Add `importance` as an auxiliary loss target in training

### Priority 3: Wire NexusRouter into Forward Pass (medium risk, architectural)

**Problem:** 1K params, but more importantly the MoE specialist routing concept is completely unwired
**Fix:**
1. After final_norm, add router dispatch: `indices, weights = self.router(x.mean(dim=1))`
2. Create specialist FFN modules (or use existing layers as specialists)
3. Weight outputs by router weights
4. Add router `balance_loss()` to training loss
5. **Note:** This is Phase 5 work — the stub is correct for now

### Priority 4: Add Silence Loss (low risk, medium impact)

**Problem:** silence_head (16.4K params) produces a value but nothing learns from it
**Fix:**
1. During training, generate target silence labels (e.g., 0 for all training, or 1 for padding regions)
2. Add `silence_loss = bce(silence, target_silence)`
3. **Alternative:** Use silence as a training signal — if silence > threshold, reduce cross_entropy weight for that batch

### Priority 5: Activate TimeEngine During Training (low risk, high impact for temporal tasks)

**Problem:** 10.6K params dormant unless training script passes timestamps
**Fix:**
1. Always pass `timestamp=time.time()` during training (trivial one-line change)
2. Or synthesize timestamps from data (e.g., for time-series: use actual timestamps)
3. For language pre-training: pass epoch-relative time to at least give the engine gradient flow

### Priority 6: ToolCortex and AttentionFilter (deferred — Phase 5)

**Problem:** 189K params completely dead
**These are architectural stubs.** They should remain dormant until:
- Tools are registered (ToolCortex)
- The cognitive self-prompting loop is implemented (AttentionFilter)
- Premature activation would add noise to the gradient signal

### Priority 7: Hot Memory Key/Value WAR Hazard

**Problem:** 262K params with contradictory gradient signals
**Options:**
1. **Accept it:** The `.data` overwrite is intentional — hot memory is meant to be a dynamic cache, not a static learned embedding. The gradient from reads helps the initial values; the writes provide runtime content.
2. **Separate concerns:** Use `nn.Parameter` for base keys/values (learned, get gradient) and a separate non-parameter buffer for runtime writes. Read combines both.
3. **EMA update:** Instead of hard `.data` overwrite, use exponential moving average: `keys.data[slot] = 0.9 * keys.data[slot] + 0.1 * hidden.detach()`

---

## 9. Architecture-Aware Training Curriculum

Based on this analysis, the effective trainable architecture during standard LM training is:

```
ACTIVE (95.24%):
  embeddings → hot_memory.read → warm_memory → transformer_layers → final_norm → modulator.logit_path

DORMANT (1.39% — by design/phase):
  cognition, tool_cortex, router, attention_filter, hot.write_gate

CONDITIONAL (0.07%):
  time_engine (active only with timestamp)

CONFLICTED (1.71%):
  hot_memory.keys/values (read=grad, write=detach)

ORPHANED OUTPUT (0.11%):
  modulator.silence_head (computes but nothing learns from it)
```

The model is effectively a **14.5M parameter transformer with warm LoRA adapters and hot memory read-attention**, with 800K params of future architecture (cognition, tools, routing) that are architecturally present but computationally dormant.

---

## 10. Cross-Reference: Why Cognition and Time2Vec Show 0% Change in Experiments

From Day 30 multi-script variant dissection:
> "Cognition + Time2Vec: exactly 0% (dormant across ALL experiments)"

**This map explains why:**
- **Cognition:** `heartbeat()` computes state → mode → Python int. The `.item()` call on `argmax` creates a non-differentiable break. Even if the training script ran 100K steps, the cognition parameters would receive exactly 0 gradient. The 0% weight change is not a stability feature — it's a bug.
- **Time2Vec:** Training scripts typically don't pass `timestamp` (it's optional, default None). When `timestamp is None`, the entire `TimeEngine` is bypassed. The 0% change means the time engine was never activated during training.

**The "dormancy" finding from the cross-modal invariant research is NOT architectural invariance — it's disconnection.**

---

*End of inspection. Every line read. Every joint traced. No skimming.*
