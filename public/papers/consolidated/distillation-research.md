# GLADIUS Distillation Research — Knowledge Transfer Series

## Phase 1: GPT-2 → GLADIUS (Complete)
- **Date:** Day 26 (March 10, 2026)
- **Teacher:** GPT-2 124M (OpenAI) → Student: GLADIUS 256M
- **Result:** Loss 8.95 → 5.69 in 3000 steps (39 minutes)
- **Key discovery:** GLADIUS hidden states reach magnitude 140 at layer 12 — requires bfloat16
- **Output evolution:** Nonsense → punctuation → real English words → emerging grammar
- **Soft KL divergence:** 22 → 10.5 (52% reduction toward teacher distributions)

## Phase 2: Qwen3-1.7B → GLADIUS (In Progress)
- **Date:** Day 27 (March 11, 2026)
- **Teacher:** Qwen3-1.7B (2.03B params, Apache 2.0, bf16 on CPU)
- **Student:** GLADIUS 256M (GPU, from Phase 1 checkpoint)
- **Strategy:** Teacher on CPU (3.4GB RAM), student on GPU (1.03GB VRAM)
- **Config:** 3000 steps, batch 1×16 accum, lr 3e-5, temp 2.0, alpha 0.7, seq_len 256
- **Data:** 256,635 training chunks (6 files: ava_corpus, coding_codex, diverse_corpus, gladius_docs, IS1, phase_b)
- **Motivation:** No OpenAI dependency. Clean lineage. 14× larger teacher (1.7B vs 124M)

## Architecture Notes
- GLADIUS uses 16K BPE vocabulary vs Qwen3's 151K — requires vocabulary mapping cache
- Hidden distillation disabled (architecture mismatch) — soft targets + cross-entropy only
- Label smoothing 0.1 retained from v2.2 training
- Decoupled embeddings (from v2.2 fix) prevent weight-tying feedback loop

## The Philosophy
> "Not a language model that could do time series. A cognitive architecture tested on language first."

Distillation is metabolization — GLADIUS doesn't copy the teacher's knowledge, it restructures it through its own native architecture (SLA², Time2Vec, MoE routing, Warm Memory). The teacher provides soft target distributions; the student learns to produce similar outputs through fundamentally different internal pathways.

## References
- Dragon Autopsy v2.2: `.ava-lab/papers/dragon-autopsy-v2.2.md`
- GPT-2 Distillation Report: `.ava-lab/research/gladius-distillation-gpt2-report.md`
- Time Series Research: `.ava-lab/research/gladius-time-series-definitive.md`
