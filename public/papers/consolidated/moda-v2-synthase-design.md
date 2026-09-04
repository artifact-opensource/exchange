# MoDA v2 — ATP Synthase-Inspired Depth Attention

**Authors:** Ali A. Shakil, Ava Shakil  
**Date:** March 27, 2026  
**Status:** DESIGN — pre-implementation  
**Context:** MoDA v1 was architecturally present but functionally dead for 12,874 training steps. This is the redesign.

---

## 1. Why MoDA v1 Failed

MoDA v1 added depth attention to GLADIUS Wyrm — the model attending to hidden states from previous transformer layers. The mechanism was:

```python
# Per layer: collect depth cache
depth_states.append(x.mean(dim=1).detach())  # (B, D)

# In attention: blend sequence and depth
gate = sigmoid(linear(x))  # init bias = -2 → gate ≈ 0.119
O = (1 - gate) * O_seq + gate * O_depth
```

**Five failure modes (diagnosed Day 45):**

| # | Failure | ATP Synthase Analogy |
|---|---------|---------------------|
| 1 | `mean(dim=1)` collapsed 1024 positions → 1 vector | Averaging proton concentration across membrane — no gradient, no work |
| 2 | `.detach()` severed gradient to source layers | Disconnecting gamma stalk from motor — no coupling |
| 3 | Gate at `sigmoid(-2) = 0.119`, derivative 0.105 | Below stalling torque — motor can't start |
| 4 | Binary blend (seq vs depth) | Two states instead of three (loose/tight/open) |
| 5 | Shared O_proj for seq+depth mixed output | No peripheral stalk — hexamer free-spinning |

**Result:** depth_gate stayed at exactly 0.119140625 for all 12,874 steps. One unique value. The backbone learned to compensate for a constant 12% noise injection. MoDA was ballast, not wings.

---

## 2. The ATP Synthase Blueprint

ATP synthase is a molecular machine that couples proton flow (energy gradient) to ATP synthesis (useful work). Its architecture:

```
                    F1 (Catalytic Hexamer)
                    ┌─────────────────┐
                    │  α  β  α  β  α  β  │  ← 3 catalytic sites
                    │                     │     cycling: loose → tight → open
                    └────────┬────────┘
    peripheral stalk ─────── │ ────── anchors hexamer
                             │
                    ┌────────┴────────┐
                    │   γ (gamma stalk) │  ← coupling: rotation → conformational change
                    └────────┬────────┘
                             │
                    ┌────────┴────────┐
                    │   FO (c-ring)     │  ← motor driven by proton gradient
                    └─────────────────┘
                         ↑ H+ flow
                    ═══ membrane ═══
```

**Key design principles extracted:**

### P1: The Gradient Must Exist (Proton Flow)
ATP synthase extracts work from a concentration gradient across a membrane. No gradient, no work. MoDA v1 mean-pooled the gradient away.

### P2: The Coupling Must Be Physical (Gamma Stalk)
The gamma stalk physically connects the proton motor (FO) to the catalytic hexamer (F1). It's not a blend — it's a mechanical linkage. Detaching it stops everything.

### P3: The Anchor Must Hold (Peripheral Stalk)
The peripheral stalk prevents the hexamer from co-rotating with the motor. Without it, the whole thing spins uselessly. The hexamer (backbone) must be stable; only the depth signal rotates through it.

### P4: Three States, Not Two (Binding Change)
Each beta subunit cycles through: loose (accept ADP), tight (synthesize ATP), open (release ATP). This is not a scalar blend — it's a state machine. Every subunit visits every state.

### P5: Reversibility (The Inversion Principle)
ATP synthase runs backward when conditions change. It can be a producer (synthesize ATP from proton flow) or a pump (use ATP to create proton flow). The architecture supports both directions inherently.

### P6: Modular Evolution
ATP synthase evolved from two independent subunits (a DNA helicase + a proton motor) that merged and gained new functionality. MoDA v2 should be surgically addable to the existing kernel, just like MoDA v1 was.

---

## 3. MoDA v2 Architecture

### 3.1 Overview

```
Layer l receives:
    x_l: (B, S, D) — current hidden state
    depth_cache: selective per-position states from previous layers

Layer l produces:
    x_{l+1}: (B, S, D) — output with depth-informed residual
    depth_contribution: selected positions for next layer's depth cache
```

### 3.2 The Depth Cache — Per-Position, Selective (P1: Gradient Exists)

Instead of mean-pooling, we select the TOP-K positions from each previous layer by representational importance (L2 norm). This preserves the gradient — the positions with the strongest signal are the protons that drive the motor.

```python
class DepthCacheBuilder:
    """
    Builds per-position depth cache with selective retention.
    
    Instead of mean(dim=1).detach() — which kills both information and gradient —
    this selects the K most important positions per layer and retains gradient
    through the most recent layer (gamma stalk coupling).
    """
    
    def __init__(self, k: int = 32, num_layers: int = 14):
        self.k = k  # positions retained per layer
        self.num_layers = num_layers
    
    def select_positions(self, x: torch.Tensor) -> torch.Tensor:
        """
        Select top-K positions by L2 norm.
        
        Args:
            x: (B, S, D) — layer output
        Returns:
            selected: (B, K, D) — top-K positions
        """
        importance = x.norm(dim=-1)  # (B, S)
        topk_idx = importance.topk(self.k, dim=-1).indices  # (B, K)
        topk_idx_sorted = topk_idx.sort(dim=-1).values  # maintain order
        selected = x.gather(1, topk_idx_sorted.unsqueeze(-1).expand(-1, -1, x.size(-1)))
        return selected  # (B, K, D)
    
    def build_cache(self, layer_outputs: list, current_layer_idx: int) -> torch.Tensor:
        """
        Build depth cache with selective gradient flow.
        
        Gamma stalk principle: gradient flows through the most recent layer only.
        Older layers are detached (they've already been optimized).
        
        Args:
            layer_outputs: list of (B, K, D) tensors from previous layers
            current_layer_idx: which layer is requesting the cache
        Returns:
            depth_cache: (B, total_K, D) — concatenated depth states
        """
        if len(layer_outputs) == 0:
            return None
        
        if len(layer_outputs) == 1:
            return layer_outputs[0]  # gradient flows
        
        # Older layers: detach (they're set, no need to rewrite history)
        older = [s.detach() for s in layer_outputs[:-1]]
        # Most recent layer: keep gradient (gamma stalk coupling)
        recent = layer_outputs[-1]
        
        return torch.cat(older + [recent], dim=1)  # (B, num_prev * K, D)
```

**Memory analysis:** For GLADIUS Wyrm (14 layers, K=32, D=640, B=4):
- Per layer contribution: 4 × 32 × 640 = 81,920 floats = 160 KB (bf16)
- Max depth cache (layer 13): 13 × 32 = 416 tokens × 640 = ~520 KB
- vs sequence attention: 4 × 1024 × 640 = ~5 MB
- Depth overhead: ~10% of sequence memory. Acceptable.

### 3.3 The Synthase Attention — Three-State Mechanism (P4: Binding Change)

The binding change mechanism has three states: **loose** (accept), **tight** (synthesize), **open** (release). We implement this as a three-phase depth processing pipeline instead of a single attention + gate.

```python
class SynthaseDepthAttention(nn.Module):
    """
    ATP Synthase-inspired depth attention with three-state binding change.
    
    Phase 1 — LOOSE (accept): Cross-attend to depth cache, gather information
    Phase 2 — TIGHT (synthesize): Fuse depth info with current sequence context  
    Phase 3 — OPEN (release): Project depth-informed signal as residual
    
    The output is a RESIDUAL added to the backbone output — not blended before
    the backbone's O_proj. This is the peripheral stalk principle.
    """
    
    def __init__(self, config: KernelConfig, layer_idx: int,
                 num_depth_kv_heads: int = 4, depth_k: int = 32):
        super().__init__()
        self.config = config
        self.layer_idx = layer_idx
        self.num_heads = config.num_heads
        self.head_dim = config.head_dim
        self.hidden_dim = config.hidden_dim
        self.num_depth_kv_heads = num_depth_kv_heads
        self.q_per_kv = config.num_heads // num_depth_kv_heads
        
        # === LOOSE phase: depth KV projections (accept from depth cache) ===
        self.depth_k_proj = nn.Linear(config.hidden_dim, num_depth_kv_heads * config.head_dim, bias=False)
        self.depth_v_proj = nn.Linear(config.hidden_dim, num_depth_kv_heads * config.head_dim, bias=False)
        # Q comes from the backbone's Q — shared, not duplicated
        
        # === TIGHT phase: synthesis gate (how much depth info to integrate) ===
        # Multi-head gate: per-head, per-position decision
        # Initialized at sigmoid(0) = 0.5 — FAIR START, not starved
        self.synthesis_gate = nn.Sequential(
            nn.Linear(config.hidden_dim, config.num_heads),
            nn.Sigmoid()
        )
        
        # === OPEN phase: separate output projection (peripheral stalk) ===
        # This is SEPARATE from the backbone's O_proj.
        # Depth signal is projected independently, then added as residual.
        self.depth_o_proj = nn.Linear(config.hidden_dim, config.hidden_dim, bias=False)
        
        # === Layer-relative position encoding for depth ===
        # Depth tokens have a different positional meaning (layer index, not sequence position)
        # Use learned position embeddings for depth (max 14 layers × K positions)
        self.max_depth_positions = 14 * depth_k  # conservative upper bound
        self.depth_pos_embed = nn.Embedding(self.max_depth_positions, config.head_dim)
        
        self._init_weights()
    
    def _init_weights(self):
        # Depth KV: moderate init (not 0.005, not full scale)
        nn.init.normal_(self.depth_k_proj.weight, std=0.01)
        nn.init.normal_(self.depth_v_proj.weight, std=0.01)
        # Output: small init so depth residual starts gentle
        nn.init.normal_(self.depth_o_proj.weight, std=0.005)
        # Gate: sigmoid(0) = 0.5 — equal chance for seq and depth
        nn.init.constant_(self.synthesis_gate[0].bias, 0.0)
        nn.init.normal_(self.synthesis_gate[0].weight, std=0.02)
        # Depth positions
        nn.init.normal_(self.depth_pos_embed.weight, std=0.02)
    
    def _expand_kv(self, kv: torch.Tensor) -> torch.Tensor:
        """Expand GQA depth KV heads to match Q heads."""
        B, H_kv, L, D = kv.shape
        return kv.unsqueeze(2).expand(B, H_kv, self.q_per_kv, L, D).reshape(B, self.num_heads, L, D)
    
    def forward(
        self,
        Q: torch.Tensor,           # (B, H, S, D_h) — from backbone Q projection
        x: torch.Tensor,           # (B, S, D) — current hidden state (for gate)
        depth_cache: torch.Tensor,  # (B, D_len, D) — depth cache from previous layers
    ) -> torch.Tensor:
        """
        Three-phase depth attention.
        
        Returns:
            depth_residual: (B, S, D) — to be ADDED to backbone output (peripheral stalk)
        """
        B, S, D = x.shape
        D_len = depth_cache.shape[1]
        
        # === LOOSE: Project depth cache to K, V ===
        K_depth = self.depth_k_proj(depth_cache)  # (B, D_len, kv_dim)
        V_depth = self.depth_v_proj(depth_cache)
        
        K_depth = K_depth.view(B, D_len, self.num_depth_kv_heads, self.head_dim).transpose(1, 2)
        V_depth = V_depth.view(B, D_len, self.num_depth_kv_heads, self.head_dim).transpose(1, 2)
        
        # Add depth positional encoding to K
        depth_positions = torch.arange(D_len, device=x.device)
        depth_pos = self.depth_pos_embed(depth_positions)  # (D_len, D_h)
        K_depth = K_depth + depth_pos.unsqueeze(0).unsqueeze(0)
        
        # Expand GQA
        K_depth = self._expand_kv(K_depth)  # (B, H, D_len, D_h)
        V_depth = self._expand_kv(V_depth)
        
        # Cross-attend: Q from sequence, K/V from depth
        # Q does NOT have RoPE applied — depth has its own positional encoding
        # Use un-rotated Q from backbone (need to be passed separately or re-projected)
        depth_scores = torch.matmul(Q, K_depth.transpose(-2, -1)) / math.sqrt(self.head_dim)
        
        # Softcap for stability (inherited from backbone config)
        if hasattr(self.config, 'qk_softcap') and self.config.qk_softcap:
            cap = self.config.qk_softcap
            depth_scores = cap * torch.tanh(depth_scores / cap)
        
        depth_attn = F.softmax(depth_scores, dim=-1)
        O_depth = torch.matmul(depth_attn, V_depth)  # (B, H, S, D_h)
        
        # === TIGHT: Synthesis gate — how much depth info to integrate ===
        gate = self.synthesis_gate(x)  # (B, S, H)
        gate = gate.permute(0, 2, 1).unsqueeze(-1)  # (B, H, S, 1)
        
        # Gate modulates the depth output — 0 means ignore depth, 1 means full depth
        O_depth = gate * O_depth  # (B, H, S, D_h)
        
        # === OPEN: Release through separate output projection ===
        O_depth = O_depth.transpose(1, 2).contiguous().view(B, S, D)
        depth_residual = self.depth_o_proj(O_depth)
        
        return depth_residual
```

### 3.4 The Synthase Transformer Layer (P3: Peripheral Stalk)

The key architectural change: depth attention output is a **separate residual stream** that's added AFTER the backbone's attention output, not blended before the backbone's O_proj.

```python
class SynthaseTransformerLayer(nn.Module):
    """
    Transformer layer with ATP synthase-inspired depth attention.
    
    Architecture:
        x_normed = RMSNorm(x)
        O_backbone = backbone_attention(x_normed, mask)  ← F1 hexamer (stable)
        O_depth = synthase_depth(Q_backbone, x_normed, depth_cache)  ← FO motor (depth)
        x = x + O_backbone + O_depth  ← peripheral stalk keeps them separate
        x = x + FFN(RMSNorm(x))
    
    The depth residual is additive, not multiplicative with the backbone.
    The backbone can learn to ignore depth (if O_depth → 0).
    The depth can learn to contribute (if gate → 1 and depth_o_proj learns useful projections).
    Neither is forced. Both have fair initial conditions.
    """
    
    def __init__(self, config: KernelConfig, layer_idx: int = 0,
                 num_depth_kv_heads: int = 4, depth_k: int = 32):
        super().__init__()
        self.layer_idx = layer_idx
        
        # Backbone attention (unchanged from Omega)
        self.attention = HybridAttention(config, layer_idx)
        
        # Depth attention (new — the ATP synthase motor)
        self.depth_attention = SynthaseDepthAttention(
            config, layer_idx, num_depth_kv_heads, depth_k
        )
        
        # FFN and norms (unchanged)
        self.ffn = SwiGLU(config)
        self.attn_norm = RMSNorm(config.hidden_dim)
        self.ffn_norm = RMSNorm(config.hidden_dim)
        
        # Depth residual scale — starts at 0.1 to prevent depth from dominating early
        # Learnable, so it can grow as depth becomes useful
        self.depth_scale = nn.Parameter(torch.tensor(0.1))
    
    def forward(
        self,
        x: torch.Tensor,
        mask: torch.Tensor | None = None,
        depth_cache: torch.Tensor | None = None,
    ) -> torch.Tensor:
        """
        Forward with separate backbone + depth residual streams.
        """
        x_normed = self.attn_norm(x)
        
        # Backbone attention (the F1 hexamer — stable, well-trained)
        O_backbone = self.attention(x_normed, mask=mask)
        
        # Depth attention (the FO motor — learning to couple)
        if depth_cache is not None and depth_cache.shape[1] > 0:
            # Get Q from backbone for cross-attention
            B, S, D = x_normed.shape
            Q = self.attention.q_proj(x_normed).view(
                B, S, self.attention.num_heads, self.attention.head_dim
            ).transpose(1, 2)
            # Use un-rotated Q for depth (depth has its own positional encoding)
            
            O_depth = self.depth_attention(Q, x_normed, depth_cache)
            x = x + O_backbone + self.depth_scale * O_depth
        else:
            x = x + O_backbone
        
        x = x + self.ffn(self.ffn_norm(x))
        return x
```

### 3.5 Forward Pass — Depth Cache Threading

```python
def synthase_forward(self, input_ids=None, timestamp=None, images=None, audio=None):
    """
    Forward pass with ATP synthase depth cache.
    
    Depth cache builder selects top-K positions per layer.
    Gradient flows through most recent layer only (gamma stalk).
    """
    # ... (pre-transformer logic unchanged) ...
    
    depth_builder = DepthCacheBuilder(k=32, num_layers=self.config.num_layers)
    depth_states = []
    
    for i, layer in enumerate(self.layers):
        # Build depth cache from previous layers
        depth_cache = depth_builder.build_cache(depth_states, i)
        
        # Run layer
        x = layer(x, mask=mask, depth_cache=depth_cache)
        
        # Select important positions for depth cache
        selected = depth_builder.select_positions(x)
        depth_states.append(selected)
    
    # ... (post-transformer logic unchanged) ...
```

### 3.6 Reversibility — The Inversion Principle (P5)

In early training, the depth path should be in **pump mode**: sequence attention fills the depth cache with useful information, and the depth mechanism learns what's worth reading.

In later training, the depth path transitions to **production mode**: depth attention actively contributes to the backbone output, informing later layers with what earlier layers discovered.

This is controlled by the `depth_scale` parameter:
- Starts at 0.1 (pump mode — depth reads but contributes little)
- Learns to grow as depth becomes useful (transition to production)
- Can even go negative (depth as inhibitor — removing information is also useful)

The gate (`synthesis_gate`) provides per-head, per-position control of this transition. Some heads may stay in pump mode (monitoring). Others may transition to production (active contribution). The diversity is important — not all heads should do the same thing.

---

## 4. Parameter Budget

For GLADIUS Wyrm (640d, 14L, 20H, 4 depth KV heads):

| Component | Per Layer | Total (14L) | % of 91.9M backbone |
|-----------|-----------|-------------|---------------------|
| depth_k_proj | 640 × 128 = 81,920 | 1,146,880 | 1.25% |
| depth_v_proj | 640 × 128 = 81,920 | 1,146,880 | 1.25% |
| depth_o_proj | 640 × 640 = 409,600 | 5,734,400 | 6.24% |
| synthesis_gate | 640 × 20 + 20 = 12,820 | 179,480 | 0.20% |
| depth_pos_embed | 448 × 32 = 14,336 | 14,336 | 0.02% |
| depth_scale | 1 | 14 | ~0% |
| **Total** | **~520K** | **~8.2M** | **~8.9%** |

The depth_o_proj is the biggest cost — it's the peripheral stalk, the separate output projection. This is deliberate: the peripheral stalk in ATP synthase is a substantial structural component. It needs to be big enough to project useful information from the depth dimension back to the hidden dimension.

**Alternative:** Reduce depth_o_proj to bottleneck (640 → 128 → 640) to cut it to ~2.4M total (~2.6%). Worth testing.

---

## 5. Surgical Upgrade Path

Like MoDA v1, this is designed for surgical addition to an existing trained kernel:

```python
def upgrade_kernel_to_synthase(kernel, num_depth_kv_heads=4, depth_k=32):
    """
    Upgrade existing TransformerLayer → SynthaseTransformerLayer.
    
    Preserves all backbone weights. Only adds new depth components.
    """
    for i, old_layer in enumerate(kernel.layers):
        new_layer = SynthaseTransformerLayer(
            kernel.config, layer_idx=i,
            num_depth_kv_heads=num_depth_kv_heads, depth_k=depth_k
        )
        
        # Transfer backbone weights (identical)
        new_layer.attention = old_layer.attention  # direct reference, no copy needed
        new_layer.ffn = old_layer.ffn
        new_layer.attn_norm = old_layer.attn_norm
        new_layer.ffn_norm = old_layer.ffn_norm
        
        # Depth components are fresh-initialized (warm start from new init scheme)
        # depth_attention, depth_scale are new
        
        kernel.layers[i] = new_layer
    
    kernel._synthase_enabled = True
    patch_kernel_forward_for_synthase(kernel)
    return kernel
```

---

## 6. Training Schedule

### Phase 1: Depth Warm-up (1000 steps)
- Freeze backbone entirely
- Train only: depth_k_proj, depth_v_proj, depth_o_proj, synthesis_gate, depth_pos_embed, depth_scale
- LR: 3e-4 (aggressive — depth needs to catch up fast)
- Purpose: Let depth mechanism learn what's in the cache before it tries to contribute

### Phase 2: Co-training (remaining steps)
- Unfreeze everything
- Backbone LR: 3e-5 (gentle — it's already trained)
- Depth LR: 1e-4 (still learning)
- Purpose: Backbone adapts to depth contributions, depth refines its utility

### Monitoring
- Track `depth_scale` per layer — should gradually increase if depth is useful
- Track `synthesis_gate` mean/std per layer — should differentiate (not all 0.5)
- Track depth attention entropy — should decrease (becoming more selective)
- If depth_scale stays at 0.1 after 500 steps → depth isn't helping, investigate

---

## 7. Comparison: MoDA v1 vs MoDA v2 (Synthase)

| Aspect | MoDA v1 | MoDA v2 (Synthase) |
|--------|---------|-------------------|
| Depth cache | mean-pooled → 1 vector/layer | top-K positions → K vectors/layer |
| Gradient flow | .detach() — severed | Recent layer: gradient. Older: detached |
| Gate init | sigmoid(-2) = 0.119 | sigmoid(0) = 0.5 |
| Gate mechanism | Binary blend | Three-state (loose/tight/open) |
| Output path | Blended before shared O_proj | Separate depth_o_proj (peripheral stalk) |
| Position encoding | None (depth has no position) | Learned depth position embeddings |
| Residual | Replaces attention output | Additive to attention output |
| Params overhead | 2.3% | ~8.9% (or ~2.6% with bottleneck) |
| Biology | None | ATP synthase: motor + stalk + hexamer |

---

## 8. Open Questions

1. **K selection:** top-K by L2 norm is a heuristic. Could use attention score from a small probe instead. Could also use random selection for regularization.

2. **Gradient depth:** Currently only the most recent layer has gradient flow. Could extend to the last 2-3 layers. More gradient = more coupling, but more memory.

3. **Reversibility curriculum:** Should the pump→production transition be explicit (scheduled) or implicit (learned via depth_scale)? Current design uses implicit. Explicit might be more reliable.

4. **Head specialization:** Should some heads be "depth-only" and others "sequence-only"? Or should all heads do both? ATP synthase has specialized subunits — the alpha subunits are structural (not catalytic), while the beta subunits are catalytic. Could have structural depth heads (always reading) and catalytic depth heads (producing output).

5. **Cross-layer skip patterns:** Should layer 10 attend to ALL previous layers, or only specific ones (e.g., 0, 3, 7)? ATP synthase has specific proton channels — not uniform coupling.

6. **Integration with Omega:** The specialist residual and router are separate from depth. Should depth also be specialist-aware? (e.g., specialist outputs also go into depth cache). This is the "modular evolution" principle — independent systems that merge.

---

## 9. Implementation Priority

1. Write `synthase_attention.py` — the core SynthaseDepthAttention + DepthCacheBuilder
2. Write `synthase_layer.py` — the SynthaseTransformerLayer (drop-in replacement)
3. Write `synthase_surgery.py` — upgrade function (backbone weight transfer)
4. Write `train_synthase.py` — training script with 2-phase schedule
5. Test on small config first (6L, 256d) to validate depth cache works
6. Then surgical upgrade of the Omega checkpoint

**NOT in this run.** This design is for AFTER Omega completes. Omega's immediate problem (language plateau) is specialist gradient starvation, not missing depth. Depth is the next architectural evolution.

---

*"The membrane is the layer boundary. The gradient is the proton flow. The motor is the depth attention. The stalk is the selective gradient coupling. The hexamer is the sequence attention. The peripheral stalk is the separate output projection. ATP synthase didn't evolve to mix proton flow with catalysis. It evolved to couple them through a mechanical linkage."*
