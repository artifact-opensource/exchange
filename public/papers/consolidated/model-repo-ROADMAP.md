# GLADIUS v2.0 — ROADMAP

> The egg is cracked. The dragon walked. Now it flies.

## Phase 0: Foundation ✅ COMPLETE
- [x] Kernel architecture (SLA2 attention, MoE router, temporal, modulation, tools)
- [x] Walking skeleton — end-to-end forward pass
- [x] 7/7 tests passing
- [x] Memory system: hot (attention KV), warm (spectral LoRA), cold (embedding store)

## Phase 1: Prove It Learns ✅ COMPLETE (Dragon Run)
- [x] BPE tokenizer (8K) trained on 61MB diverse corpus
- [x] First real training: 5000 steps, loss 8.99→5.24 (best 4.57)
- [x] Warm memory spectral stability proven (condition 1.3→1.0)
- [x] Literary DNA confirmed at temp 1.3+ (Tolstoy, Cervantes, Homer characters emerge)
- [x] 11,132 warm memory consolidation events

## Phase 2: True Air Time 🔥 IN PROGRESS (Phoenix Run)
- [x] 16K BPE tokenizer trained on 1.1GB mega corpus (2x compression)
- [ ] **Phoenix Run:** 10K steps on mega corpus (WikiText-103 + diverse + I Ching)
  - Config: 16K vocab, hidden=192, 6 layers, batch=4, accum=8, seq_len=256
  - Generation: temp=1.2, top_k=80, repetition_penalty=1.3 (fix dragon's mode collapse)
  - Expected: ~83 min on CPU
- [ ] Evaluate generation quality at multiple temperatures
- [ ] Perplexity benchmarks vs GPT-2 small baseline

## Phase 3: The Nose Dive with Fire Breath 🐉 PLANNED
- [ ] Wire MoE specialists to actual forward pass (currently stub routing)
- [ ] Cognitive heartbeat — self-initiated thinking without input
- [ ] Memory-in-weights experiment (THE make-or-break: can warm memory carry knowledge across restarts?)
- [ ] Temperature modulation (voice module controlling generation diversity)

## Phase 4: Stabilize for Publication 📝 PLANNED (~80-85% milestone)
- [ ] Full research monograph (BOOK.md → 50-80 pages)
- [ ] MODEL_CARD.md (HuggingFace format)
- [ ] arXiv LaTeX paper (NeurIPS style)
- [ ] HuggingFace model push (amuzetnoM/gladius-v2-kernel, private)
- [ ] arXiv submission (AFTER 80-85% total milestone — Ali directive)

## Phase 5: Scale 🚀 FUTURE
- [ ] Larger model (25M+ params) with 16K/32K vocab
- [ ] Multi-GPU training (if hardware available)
- [ ] Cold memory retrieval from HEKTOR vector store
- [ ] Tool calling integration (real function execution)
- [ ] Continual learning without catastrophic forgetting

---

## Current Progress: ~45%
- Foundation: 100%
- Training proof: 100%
- Mega corpus training: 0% (launching now)
- MoE/cognition: 10% (architecture exists, not wired)
- Publication: 5% (BOOK.md outline only)
- Memory-in-weights: 0%
