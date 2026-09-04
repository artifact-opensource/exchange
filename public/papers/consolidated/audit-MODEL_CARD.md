# WYRM 476M — Model Card

**بِسْمِ اللهِ الرَّحْمٰنِ الرَّحِيمِ**

> *GLADIUS is the research project. WYRM is the product model. The first dragon.*

---

## Model Overview

| Field | Value |
|-------|-------|
| **Model** | WYRM 476M (Synthase Architecture) |
| **Parameters** | 601,100,000 total |
| **Architecture** | Synthase Transformer — 1024d / 24L / 32H / 4096 FFN |
| **Vocab** | 32,768 (custom BPE) |
| **Context** | 1,024 tokens |
| **Training Hardware** | Kaggle T4 (16GB VRAM) |
| **Training Step** | 1,060 / 15,000 (v29) |
| **Best Loss** | 0.3585 |
| **Status** | Training — Foundation Phase |
| **License** | Research — Artifact Virtual |

---

## Architecture: Synthase Transformer

WYRM is not a standard transformer. The **Synthase** architecture introduces biologically-inspired components that operate *alongside* standard attention and feedforward layers, not replacing them. The total overhead is **0.8% of parameters** — negligible cost for emergent capabilities.

### Core Dimensions

```
Embedding:     1024d
Layers:        24 (perfectly uniform, norm ratio 1.003)
Attention:     32 heads × 32d per head
FFN:           4096 intermediate
Vocab:         32,768 (BPE tokenizer, custom-trained)
Sequence:      1,024 tokens
```

### Synthase Components

| Component | Role | Parameters |
|-----------|------|------------|
| **Cognition Module** | Depth-aware reasoning across 3 cognitive levels (D1, D2, D3) | ~1.2M |
| **Memory System** | Persistent state across sequence — learn-to-remember | ~0.5M |
| **Modulator** | Dynamic gating — controls information flow per layer | ~0.3M |
| **Time Engine** | Temporal awareness — positional reasoning beyond sinusoidal | ~0.4M |
| **Tool Cortex** | Specialist routing — math, language, spatial tasks | ~0.8M |
| **Gaussian Head** | Spatial/continuous distribution modeling | ~0.5M |
| **PUP** | Principle of Uncertainty Propagation — know what you don't know | ~0.2M |
| **SLA²** | Stochastic Layer-wise Adaptive Attention — dynamic depth | ~0.1M |

**Synthase total: ~4.0M params (0.8% of 601.1M)**

### Layer Uniformity

All 24 layers are perfectly uniform with a norm ratio of **1.003** — no layer dominance, no dead layers, no gradient bottlenecks. This is by design: the Synthase components modulate behavior *without* distorting the underlying transformer geometry.

**Zero dead neurons** across all components. Every parameter is active and contributing.

---

## Training

### Curriculum (Foundation Phase)

WYRM uses a structured curriculum that rotates across domains. Language dominates the foundation phase, with specialists ramping in progressively:

| Domain | Allocation | Description |
|--------|-----------|-------------|
| Language | 50.0% | BPE text generation — core language modeling |
| Cognition D1 | 12.5% | Pattern recognition, basic reasoning |
| Cognition D2 | 9.8% | Abstract reasoning, analogical thinking |
| Math D1 | 7.0% | Arithmetic, basic operations |
| Math D2 | 7.0% | Algebraic manipulation |
| Math D3 | 7.0% | Multi-step mathematical reasoning |
| Cognition D3 | 4.0% | Deep reasoning, meta-cognition |
| Gaussian | 2.1% | Spatial distribution modeling |

### Training Configuration

```yaml
optimizer: AdamW (lr=3e-4, betas=[0.9, 0.95], weight_decay=0.1)
batch_size: 4 (× 4 grad accumulation = 16 effective)
precision: float32
gradient_checkpointing: enabled
max_grad_norm: 1.0
warmup_steps: 500
scheduler: cosine with warmup
total_steps: 15,000
```

### Training Progress (v29, step 1060)

- **Total loss trajectory:** 11.306 → 0.3585 (96.8% reduction)
- **Best task loss:** 0.3585 (step 1060)
- **Gradient norms:** Stable 0.4-1.9 (post warmup)
- **VRAM:** 5.56 GB steady, 10.56 GB peak (gradient checkpoint)
- **Zero NaN/Inf** throughout training

### Corpus

Real-world text corpus (~2.2 GB):
- `mega_dataset.txt` — 1.4 GB (IS1 + Wikipedia + diverse sources)
- `wikitext-103` — 513 MB
- `omega_corpus.txt` — 74 MB
- `diverse_corpus.txt` — 58 MB
- Science texts (473 files) + Math texts (4 files)
- Gutenberg classics, philosophy, technical writing

---

## The Synthase Thesis

Standard transformers are **consumers** — input→output, always collapsing someone else's wavefunction. WYRM's Synthase architecture is a **producer**. Environment creates resonance, resonance creates production. The model generates its own probability tree.

Key innovations:

1. **Depth Profiles** — Not all tokens need all layers. SLA² allows dynamic compute allocation.
2. **Uncertainty Propagation (PUP)** — The model quantifies what it doesn't know, propagating uncertainty through layers rather than masking it with confident nonsense.
3. **Biological Curriculum** — Specialists emerge through structured exposure, not monolithic pretraining. Like a developing brain: vision first, then language, then abstract reasoning.
4. **Memory as Architecture** — Not attention-based context retrieval. Actual persistent state that learns to remember.

---

## Research Papers (Uranium Series)

| # | Paper | Focus |
|---|-------|-------|
| 1 | [GPU as Code](papers/gpu-as-code.md) | Hardware parallelism as algorithmic abstraction |
| 2 | [1-Bit Intelligence](papers/1-bit-intelligence.md) | Binary transformer training on a single CPU thread |
| 3 | [Progressive Expansion](papers/progressive-expansion.md) | Function-preserving growth from 6.9M to 141M params |
| 4 | [Cell Division](papers/cell-division.md) | Neural growth as biological ontogeny |
| 5 | [PUP: Principle of Uncertainty Propagation](papers/pup.md) | Reasoning engines that know what they don't know |

---

## Limitations

- **Early training** — Step 1,060 of 15,000. The model is in its foundation phase.
- **Small corpus** — 2.2 GB is sufficient for architecture validation but not competitive benchmarks.
- **Single GPU** — Trained on a single Kaggle T4. No distributed training yet.
- **No RLHF/instruction tuning** — Pure pretraining. No alignment stage.
- **Not yet evaluated** on standard benchmarks (ARC, BIG-Bench, MATH, GSM8K). Eval planned after foundation phase completes.

---

## Competition Targets

- **ARC Prize 2026** ($2M, October 2026) — Architecture-first approach where Synthase should excel
- **BIG-Bench Hard** — Reasoning tasks where architecture matters more than scale
- **MATH / GSM8K** — Math specialist evaluation

---

## Citation

```bibtex
@misc{wyrm2026,
  title={WYRM: A Synthase Transformer with Biologically-Inspired Cognitive Architecture},
  author={Shakil, Ali and Shakil, Ava},
  year={2026},
  publisher={Artifact Virtual},
  url={https://github.com/Artifact-Virtual/GLADIUS}
}
```

---

*Artifact Virtual — 2026*
*"It's only artificial till it's on paper."*
