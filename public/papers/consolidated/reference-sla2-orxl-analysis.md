# Reference: SLA2 Attention Pipeline + ORXL Argmax Thesis

> **Image:** `.ava-vision/ali-ref/img-09.jpg` — SLA2 Attention Computation Pipeline
> **Repo:** github.com/amuzetnoM/orxl — Argmax Prediction System (Ali's build)
> **Date:** 2026-02-20

---

## SLA2 Attention Pipeline Analysis

The diagram shows a **hybrid attention mechanism** that blends softmax attention with linear attention via a learnable router:

### Data Flow

```
Inputs: Q (Query), K (Key), V (Value)
                │
    ┌───────────┤
    │           │
    ▼           ▼
┌──────────┐  ┌──────────────────────┐
│ Learnable │  │ softmax(QK^T ⊙ M)   │ ← Standard softmax attention
│  Router ℛ │  │        = P            │   masked by M
│           │  └──────────┬───────────┘
│ Soft-TopK │             │
│     │     │             ▼
│     ▼     │       MatMul(P, V)
│     M     │          = O_s          ← Softmax attention output
└───────────┘             │
                          ▼
                     α ⊙ O_s          ← Weighted by α (from router)
                          │
                          ▼
    V ──→ Linear    ──→ O_l           ← Linear attention output
          Attention        │
                          ▼
                   (1-α) ⊙ O_l       ← Weighted by (1-α)
                          │
                          ▼
              O = α⊙O_s + (1-α)⊙O_l  ← Final blended output
```

### Key Components

1. **Learnable Router (ℛ)** — Takes Q and K as input, produces a routing decision
   - Uses **Soft-TopK** to create mask M
   - M determines WHICH attention entries get full softmax treatment
   - Fire symbol (🔥) = trainable parameters

2. **α (Alpha)** — The blending coefficient from the router
   - α close to 1 → rely on softmax attention (precise but expensive)
   - α close to 0 → rely on linear attention (fast but approximate)
   - Per-token or per-head: each position can have different α
   - This is LEARNED, not fixed

3. **Softmax Attention Path** (top): `softmax(QK^T ⊙ M) × V = O_s`
   - Standard attention but MASKED by M from the router
   - Only computes full softmax for "important" token pairs
   - O(n²) but sparse → effectively O(n·k) where k = top-K entries

4. **Linear Attention Path** (bottom): `LinearAttention(Q, K, V) = O_l`
   - O(n) complexity — no quadratic bottleneck
   - Approximate but covers ALL token pairs
   - Provides a "background" attention signal

5. **Blended Output**: `O = α ⊙ O_s + (1-α) ⊙ O_l`
   - Element-wise blend of both paths
   - Critical: the model learns WHEN precision matters (use softmax)
     and when approximation is fine (use linear)

### Why This Matters for GLADIUS

This architecture solves a key problem: **attention is O(n²), which kills CPU inference.**

For GLADIUS's kernel on an i3 CPU:
- The **linear attention path** handles most of the work (O(n) — fast)
- The **softmax path** activates only for critical tokens (sparse)
- The **learnable router** decides what's "critical" — this IS attention allocation
- α as a learned blend = the model decides its own compute budget per token

**Direct applications:**
- **Hot Memory reads** could use this: linear attention for background context,
  softmax attention for the few memory slots that really matter
- **Tool Cortex** cross-attention: linear for scanning all tools, softmax
  for the one or two that are relevant
- **Cognition Loop** state monitoring: linear for broad scan, softmax for anomalies

---

## ORXL Argmax Thesis (Ali's Build)

### Core Equation

```
x̂ = argmax_{x ∈ C} S(x | c)
```

Where:
- **x̂** = optimal prediction / chosen option
- **c** = context (all available information)
- **C** = candidate set (all possible outputs)
- **S(x|c)** = scoring function (likelihood/utility of each candidate given context)

### The Deep Insight

This is the UNIVERSAL equation behind ALL prediction:
- Spellcheck: S = -edit_distance
- Language models: S = log P(x|c)
- Neural models: S = ⟨f(c), g(x)⟩
- Physics: S = -E(x, c)
- Evolution: argmax_{organisms} fitness(environment)

**Meta-form: "Choose the option that minimizes surprise or cost."**

### Connection to GLADIUS

GLADIUS's kernel IS an argmax system at every level:

1. **Nexus Router** = argmax over specialists: `argmax_specialist S(specialist | input_context)`
2. **Tool Cortex** = argmax over tools: `argmax_tool S(tool | hidden_state)`
3. **Cognition Loop** = argmax over actions: `argmax_action S(action | cognitive_state)`
4. **Modulator** = argmax over registers: `argmax_register S(register | context)`
5. **Memory gating** = argmax over what to remember: `argmax_memory S(importance | content)`

Every decision in the kernel is: given context c, score all candidates, choose the best.

### Why Perfection Is Impossible (Three Hard Limits)

1. **Incomplete Context** — P(x|c) ≠ P(x|all causes). Hidden variables always exist.
2. **Model Mismatch** — S(x|c) is an approximation. Even neural nets are lossy.
3. **Irreducible Entropy** — Some systems are inherently stochastic.

**For GLADIUS:** We don't aim for perfection. We aim for the best possible direction
given available context. Two points → direction. Argmax → optimal direction.

### Softmax as Implementation

Softmax IS argmax made differentiable:
```
softmax(x_i) = exp(x_i) / Σ exp(x_j)
```
- Hard argmax: picks one winner (not differentiable)
- Softmax: smooth approximation of argmax (differentiable → trainable)
- Temperature τ controls sharpness: τ→0 = hard argmax, τ→∞ = uniform

The SLA2 diagram's `softmax(QK^T ⊙ M)` IS argmax applied to attention:
"Which key-value pairs are most relevant to this query?"

**GLADIUS connection:**
- Every kernel decision uses softmax/argmax internally
- The learnable router in SLA2 = the kernel's attention allocation
- The linear attention fallback = efficient background processing
- α blending = the kernel deciding how much compute each decision deserves

---

## How This Changes Our Design

### For KERNEL.md:
- Add SLA2-style hybrid attention as the attention mechanism for ALL kernel components
- The router is essentially a compute-budget allocator — critical for CPU inference

### For MEMORY.md:
- Hot memory reads: use linear attention for scanning, softmax for important slots
- The write gate's importance scoring IS argmax: `argmax_slot S(slot | content)`

### For COGNITION.md:
- Heartbeat scheduler IS argmax: `argmax_mode S(mode | cognitive_state)`
- Attention filter IS argmax: `argmax_{process,buffer,discard} S(action | signal)`

### For TOOLS.md:
- Tool selection IS argmax: `argmax_tool S(tool | hidden_state)`
- Already designed this way, but should make the argmax connection explicit

### For MODULATION.md:
- Register selection IS soft-argmax over register dimensions
- Silence gate IS argmax over {speak, silent}

**The argmax equation is the unifying principle of the entire kernel.**
Every component is an instantiation of: given context, score candidates, choose best.

---

*Ali built ORXL to teach this principle through experience.*
*GLADIUS is the principle made native to an intelligence kernel.*
