# Fusion Implementation Roadmap

> Dragon Devours — Phase by phase.

---

## Phase 1: Analyze Qwen Weights ✅

**Status:** COMPLETE (Qwen3 0.6B downloaded to Victus WSL2)

**Inputs:** Qwen3-0.6B model from HuggingFace
**Location:** `/home/ava/models/qwen3-0.6b/` on Victus WSL2

**Outputs:**
- [x] config.json parsed — all dimensions confirmed power-of-2 aligned
- [x] 311 tensors cataloged with shapes
- [x] Weight mapping to GLADIUS components identified
- [ ] Per-layer parameter count breakdown
- [ ] Layer importance analysis (which layers carry most knowledge)

**Key findings:**
- `model.embed_tokens.weight`: [151936, 1024]
- `self_attn.q_proj.weight`: [2048, 1024] (2048 = 16 heads × 128 head_dim)
- `self_attn.k_proj.weight`: [1024, 1024] (1024 = 8 KV heads × 128 head_dim)
- `self_attn.v_proj.weight`: [1024, 1024]
- `self_attn.o_proj.weight`: [1024, 2048]
- `mlp.gate_proj.weight`: [3072, 1024]
- `mlp.up_proj.weight`: [3072, 1024]
- `mlp.down_proj.weight`: [1024, 3072]
- `input_layernorm.weight`: [1024]
- `post_attention_layernorm.weight`: [1024]
- `model.norm.weight`: [1024] (final RMSNorm)
- `tie_word_embeddings: true` (lm_head = embed_tokens)

---

## Phase 2: Expand GLADIUS 256 → 512

**Status:** NOT STARTED

**Inputs:**
- Best GLADIUS checkpoint: `gladius_v2/runs/phoenix_marathon_final.pt` (6.9M params)
- Net2Net expansion engine: `gladius_v2/src/expansion/net2net.py`
- Target config: hidden=512, heads=16, head_dim=32, FFN=2048

**Process:**
1. Load seed checkpoint
2. Create target config (512 hidden)
3. Run `expand_kernel(seed_kernel, target_config)`
4. Verify function preservation: same inputs → same outputs (within float tolerance)
5. Save expanded checkpoint

**Success criteria:**
- [ ] Forward pass output matches seed within 1e-5 tolerance
- [ ] Parameter count ~64M
- [ ] All novel organs (SLA², memory, cognition, etc.) expanded correctly
- [ ] Loss on validation set matches seed (no degradation)

**Estimated time:** 1-2 hours

---

## Phase 3: Expand GLADIUS 512 → 1024

**Status:** NOT STARTED

**Inputs:**
- GLADIUS 512 checkpoint from Phase 2
- Target config: hidden=1024, heads=16, head_dim=64 OR head_dim=128, FFN=3072

**Process:**
1. Load 512 checkpoint
2. Create target config matching Qwen's dimensions where possible:
   - hidden_dim: 1024 (matches Qwen)
   - num_heads: 16 (matches Qwen Q heads)
   - head_dim: 64 (GLADIUS native) OR 128 (match Qwen — requires config change)
   - ffn_dim: 3072 (matches Qwen, change from SwiGLU 4x to 3x)
3. Run `expand_kernel()`
4. Verify function preservation

**Decision point:** head_dim 64 vs 128
- 64: keeps GLADIUS's ratio, simpler expansion
- 128: matches Qwen exactly, enables direct Q/K/V weight transplant without reshape
- **Recommend 128** — makes Phase 4 surgical

**Success criteria:**
- [ ] Forward pass preserved
- [ ] Parameter count ~250M
- [ ] Dimensions match Qwen: hidden=1024, heads=16, head_dim=128, FFN=3072

**Estimated time:** 1-2 hours

---

## Phase 4: Weight Transplant

**Status:** NOT STARTED

**Inputs:**
- GLADIUS 1024 expanded checkpoint (Phase 3)
- Qwen3 0.6B weights (`/home/ava/models/qwen3-0.6b/`)

**Process:**

### 4a. Layer Selection
GLADIUS has 6 layers, Qwen has 28. Strategy: **evenly-spaced selection.**

| GLADIUS Layer | Qwen Layer | Rationale |
|---------------|------------|-----------|
| 0 | 0 | First layer — input processing |
| 1 | 5 | Early representation |
| 2 | 11 | Lower-middle abstraction |
| 3 | 16 | Upper-middle reasoning |
| 4 | 22 | Late abstraction |
| 5 | 27 | Final layer — output preparation |

*Alternative: expand GLADIUS to more layers first. Decision based on Phase 3 results.*

### 4b. Attention Weight Transplant
For each selected layer:
```python
# Q projection — direct copy (both [2048, 1024] after GQA adoption)
gladius.layers[i].attention.q_proj.weight = qwen.layers[j].self_attn.q_proj.weight

# K projection — [1024, 1024] (8 KV heads for GQA)
gladius.layers[i].attention.k_proj.weight = qwen.layers[j].self_attn.k_proj.weight

# V projection — same as K
gladius.layers[i].attention.v_proj.weight = qwen.layers[j].self_attn.v_proj.weight

# O projection — [1024, 2048]
gladius.layers[i].attention.o_proj.weight = qwen.layers[j].self_attn.o_proj.weight
```

### 4c. FFN Weight Transplant
```python
# SwiGLU/SiLU gate + up + down
gladius.layers[i].ffn.gate_proj.weight = qwen.layers[j].mlp.gate_proj.weight  # [3072, 1024]
gladius.layers[i].ffn.up_proj.weight = qwen.layers[j].mlp.up_proj.weight      # [3072, 1024]
gladius.layers[i].ffn.down_proj.weight = qwen.layers[j].mlp.down_proj.weight  # [1024, 3072]
```

### 4d. Normalization
```python
gladius.layers[i].norm1.weight = qwen.layers[j].input_layernorm.weight
gladius.layers[i].norm2.weight = qwen.layers[j].post_attention_layernorm.weight
```

### 4e. Embeddings
```python
# Adopt Qwen's full tokenizer + embeddings
gladius.embeddings.token_embed.weight = qwen.model.embed_tokens.weight  # [151936, 1024]
gladius.final_norm.weight = qwen.model.norm.weight                       # [1024]
# Output head tied to embeddings
```

### 4f. GQA Modification
Modify GLADIUS's `HybridAttention` to support GQA:
- Q: 16 heads × 128 dim = 2048
- K: 8 heads × 128 dim = 1024 (shared, each KV head serves 2 Q heads)
- V: 8 heads × 128 dim = 1024
- During attention: repeat K/V heads to match Q head count

**Success criteria:**
- [ ] All transplanted weights loaded without shape mismatch
- [ ] Forward pass runs (outputs will differ — that's expected)
- [ ] No NaN/Inf in outputs
- [ ] Transplanted layers produce reasonable attention patterns

**Estimated time:** 1 day

---

## Phase 5: Integration Fine-Tuning

**Status:** NOT STARTED

**Where:** Victus RTX 2050 (4GB VRAM) via GaC runtime

**Process:**
1. **Phase 5a — Organ warm-up (freeze backbone, train organs only)**
   - Freeze all transplanted Qwen weights
   - Train SLA² alpha blending, memory read/write, cognition, modulator
   - 5-10K steps, LR 1e-4
   - Objective: let organs learn to work with the new backbone representations

2. **Phase 5b — Joint fine-tuning (everything trainable)**
   - Unfreeze all weights
   - Low LR (1e-5) to preserve Qwen knowledge while adapting
   - 10-20K steps on curated curriculum (IS1 + GLADIUS + AVA identity)
   - Objective: unified organism, all components working together

3. **Phase 5c — Identity layer**
   - AVA corpus fine-tuning
   - Voice, personality, philosophical alignment
   - 5K steps

**Success criteria:**
- [ ] SLA² alpha not collapsed (meaningful blend of softmax + linear paths)
- [ ] Memory system active (hot slots being written, warm adapting)
- [ ] Generation quality: coherent, knowledgeable, personality present
- [ ] Perplexity on held-out set < Qwen standalone (fusion should help, not hurt)

**Estimated time:** 2-3 days

---

## Phase 6: GaC Integration + Evaluation

**Status:** BLOCKED (after Phase 5)

**Process:**
1. Wrap fused kernel with GaC runtime (`gladius_v2/gac/runtime.py`)
2. Run calibrator on fused model — dimensions are different, routing thresholds change
3. Benchmark: GaC-routed vs pure PyTorch on Victus
4. Standard eval: perplexity, MMLU, ARC, HellaSwag, WinoGrande
5. Custom eval: identity coherence, philosophical reasoning, tool invocation

**Success criteria:**
- [ ] GaC routing provides measurable speedup on RTX 2050
- [ ] Benchmark scores competitive with Qwen 0.6B standalone
- [ ] GLADIUS-specific capabilities (memory, cognition, tools) functional
- [ ] Identity present in generation

---

## Dependencies

```
Phase 1 ──► Phase 2 ──► Phase 3 ──► Phase 4 ──► Phase 5 ──► Phase 6
  ✅            TODO        TODO        TODO        TODO        TODO
                                          │
                                          ▼
                                    GQA modification
                                    Vocab expansion
                                    Tokenizer adoption
```

---

*Each phase is a checkpoint. Each checkpoint is a dragon that can fly on its own.*
