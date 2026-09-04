---
license: mit
tags:
  - gladius
  - wyrm
  - cognitive-kernel
  - transformer
  - research
  - synthase
pipeline_tag: text-generation
---

<div align="center">

# GLADIUS — Cognitive Kernel

**Generalized Learning Architecture for Distributed Unified Systems**

*A novel transformer architecture featuring Synthase depth attention, specialist routing, and uncertainty propagation.*

**Organization:** [Artifact Virtual](https://artifactvirtual.com)

</div>

---

## WYRM 476M — Current Model

| Property | Value |
|----------|-------|
| Parameters | 476M (1024d / 24L / 32H / 4096 FFN) |
| Architecture | Synthase (MoDA depth attention + SLA² specialists) |
| Training | Kaggle T4 (16GB VRAM) |
| Corpus | 9GB scientific text (QM, GR, calculus, topology, genomics, arXiv) |
| Status | Training — v29 @ step 2,241 / 15,000 |

### Key Innovations
- **Synthase Depth Attention:** Biologically-inspired depth profiles replacing standard attention
- **SLA² Specialists:** Domain-specific routing (language, math, cognition, gaussian)
- **PUP:** Propagated Uncertainty Principle — the model knows what it doesn't know
- **Memory System:** Warm + cold memory for persistent context

---

## Repository Structure

```
├── kernel/                  # Core architecture (Synthase kernel)
│   ├── kernel.py            # Main transformer
│   ├── attention.py         # Attention mechanisms
│   ├── moda.py              # Mixture of Depth Attention
│   ├── cognition.py         # Cognition module
│   ├── router.py            # Specialist routing
│   ├── memory.py            # Memory system
│   ├── gaussian_head/       # Gaussian prediction head
│   └── ...
│
├── training/                # Training scripts
│   ├── wyrm_notebook_v29.py # Current Kaggle training notebook
│   ├── wyrm_notebook_v27_FINAL.py
│   ├── omega_config.py      # Omega specialist configuration
│   └── train_v5.py          # Earlier training script
│
├── tokenizers/              # Custom tokenizer suite
│   ├── bytecode_tokenizer.py
│   ├── byte_tokenizer.py
│   ├── math_tokenizer.py
│   └── grid_tokens.py
│
├── staging/                 # Features in development
│   ├── synthase/            # Synthase attention surgery
│   ├── pup/                 # PUP uncertainty head
│   └── l0_sla2/             # L0-regularized specialists
│
├── extensions/              # Architecture extensions
│   ├── plug/                # Multi-agent tool integration
│   └── memory_v2/           # Advanced memory pipeline
│
├── eval/                    # Evaluation scripts
├── experiments/             # Experiment logs (001-006)
├── telemetry/               # Training telemetry (v28, v29)
├── papers/                  # Research papers
│
├── MODEL_CARD.md            # Full model card
├── GLADIUS_TRAJECTORY.md    # Architecture evolution history
├── SCALING_ANALYSIS.md      # Scaling analysis & expansion plan
└── ROADMAP.md               # Development roadmap
```

## Research Papers

| Paper | Topic |
|-------|-------|
| [GPU as Code](papers/gpu-as-code.md) | Hardware is algorithmic — treating GPU as programmable substrate |
| [1-Bit Intelligence](papers/1-bit-intelligence.md) | Binary weight learning — gradients are optional |
| [Progressive Expansion](papers/progressive-expansion.md) | Function-preserving growth from 6.9M to 141M+ parameters |
| [Cell Division](papers/cell-division.md) | Architecture scaling via biological cell division |
| [PUP](papers/pup.md) | Propagated Uncertainty Principle — reasoning under known unknowns |
| [Gaussian Head](papers/gaussian-head-ieee.md) | Gaussian prediction head for continuous-domain tasks |

## Training Telemetry

Raw step-by-step telemetry from training runs:
- `telemetry/wyrm-v28-telemetry-1188.jsonl` — v28 (procedural data, 1188 steps)
- `telemetry/wyrm-v29-telemetry-1060.jsonl` — v29 (real corpus, 1060 steps)

---

*Artifact Virtual — 2026*
