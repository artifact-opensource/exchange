# GLADIUS v1 Baseline Reference

> Imported from `/home/adam/worxpace/gladius/GLADIUS/` for reference only.
> v1 is paused, not abandoned. It may inform v2 decisions.

## v1 Model

| Property | Value |
|----------|-------|
| Name | GLADIUS-125M-v1 |
| Architecture | LlamaForCausalLM |
| Parameters | 124,668,672 (124.7M) |
| Layers | 12 |
| Hidden Size | 768 |
| Attention | GQA 12:4 (query:kv heads) |
| MLP | SwiGLU, intermediate 2048 |
| Position | RoPE (theta=10000, max=2048) |
| Vocab | 32,000 tokens |
| Precision | float32 (475.57 MB) |

## Training Status (Paused)

| Metric | Value |
|--------|-------|
| Phase | 2 of 4 (Qwen distillation) |
| Step | 380 / 2000 |
| Loss | 128.58 → 61.39 (52.3% reduction) |
| Teachers | Qwen 2.5-1.5B (tool-calling, JSON), TinyLlama 1.1B (instruction) |
| Hardware | CPU only (i3-1005G1) |
| Batch | 1 (×8 gradient accumulation) |
| LR | 1e-4, AdamW |

## Loss Curve (380 steps)

```
Step 0:   128.58  ████████████████████████████████████████
Step 100:  83.74  ██████████████████████████
Step 200:  71.51  ██████████████████████
Step 300:  65.02  ████████████████████
Step 380:  61.39  ███████████████████
```

Convergence slowing — diminishing returns from distillation alone.

## What v1 Taught Us

1. **Distillation works** — 52% loss reduction from Qwen teacher on CPU
2. **CPU training is viable** — slow but functional for <200M models
3. **Monolithic scaling hits walls** — 125M params can't hold the breadth needed
4. **Memory is external** — no persistence between sessions
5. **Tool calling is bolted on** — Qwen teaches the pattern but it's not native

## What v2 Must Do Differently

- Memory as substrate, not specialist
- Tool understanding woven into every module
- Self-initiating inference loop
- Train on direction (state pairs), not volume
- ~30M total but specialized > 125M generalized

## Files

- Model: `/home/adam/worxpace/gladius/GLADIUS/models/archive/gladius_primary/gladius-125m-v1/`
- Config: Same directory, `config.json`
- HuggingFace: `amuzetnoM/Gladius`
- GGUFs: 24M, 39M, 71M, 125M quantized versions available
