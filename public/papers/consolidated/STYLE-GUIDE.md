# IEEE Paper Style Guide — Artifact Virtual
## Mandatory Standards for All Papers

### Front Matter (EXACT ORDER)
```
# [Full Paper Title]

**[Series Name — Paper N]** (if applicable, e.g. "Uranium Research Series — Paper II")

**Authors:** Ali Shakil¹, AVA¹
**Affiliation:** ¹Artifact Virtual (SMC-Private) Limited, Islamabad, Pakistan
**Contact:** ali.shakil@artifactvirtual.com
**Date:** March 2026
**Version:** Preprint v1.0

**Keywords:** keyword1, keyword2, keyword3, keyword4, keyword5

---
```

### Footer (LAST LINES OF EVERY PAPER)
```
---

**Ali Shakil, AVA**
Artifact Virtual (SMC-Private) Limited
ali.shakil@artifactvirtual.com

© 2026 Artifact Virtual (SMC-Private) Limited. All rights reserved.
```

### Canonical Values (USE THESE EVERYWHERE)
- **GLADIUS full name:** General Learning Architecture for Diverse Intelligence and Unified Systems
- **SLA² full name:** Sparse-Linear Approximate Attention with Adaptive Routing
- **Seed params:** 6.9M (10.2M with embeddings — clarify in footnote if needed)
- **Drake params:** 60.1M (60,132,162 exact)
- **Hidden dim (Drake):** 512
- **Layers:** 12
- **Vocabulary:** 16,384 BPE tokens
- **English text baseline loss:** 3.36
- **MNIST best loss:** 0.28
- **Multi-script best loss:** 0.038
- **Multi-script invariant ratio:** 3.3× (NOT 4.3×)
- **OHLCV best loss:** 0.0532
- **Cognition change (OHLCV):** 0.84%
- **MNIST invariant ratio:** 133×
- **OHLCV invariant ratio:** 55×
- **Track A VLM best loss:** 2.11★ (pending log verification)
- **Hardware:** NVIDIA RTX 2050 (4GB VRAM), HP Victus laptop
- **Orchestrator:** Intel i3-1005G1, 16GB RAM, Kali Linux

### Newton-Schulz (MuonClip) — Canonical Spec
- 5 iterations
- Cubic polynomial: a=3.4445, b=-4.7750, c=2.0315
- Nesterov momentum 0.95

### Uranium Series Numbering
- Paper I: GPU as Code
- Paper II: 1-Bit Intelligence
- Paper III: Progressive Expansion
- Paper IV: The Layer 7 Gateway
- Paper V: Ghost Protocol (Autoregressive Self-Poisoning)

### Author Format in References
- Self-citations: "A. Shakil and AVA" (NOT "A. Shakil and A. Shakil")

### Formatting Rules
- NO emojis anywhere in papers
- NO "Continued in Part 2" or similar seams
- NO placeholder text (TODO, TBD, FIXME)
- Tables numbered with Roman numerals (Table I, Table II, ...)
- Sections numbered hierarchically (1, 1.1, 1.1.1)
- References in IEEE numbered style [1], [2], ...
- No duplicate references
- All LaTeX math notation acceptable ($\mathcal{L}$, etc.)
- Bismillah (بِسْمِ اللهِ الرَّحْمٰنِ الرَّحِيمِ) at very top of paper is ALLOWED and ENCOURAGED
- Code blocks with language identifiers (```python)

### Dormant Components
- Time2Vec: 0.0000% across all experiments (unless explicitly activated by Lattice Clock)
- CognitionLoop: 0.0000% except OHLCV (0.84%) — requires CognitionAuxLoss + real timestamps
- NexusRouter: 0.0000% always
- ToolCortex: 0.0000% always
