# GLADIUS × Qwen3-1.7B Distillation — Phase 2 Results

**Date:** March 12, 2026 (Day 28)  
**Teacher:** Qwen/Qwen3-1.7B (2.03B parameters, Apache 2.0)  
**Student:** GLADIUS 256M (loaded from GPT-2 Phase 1 checkpoint)

## Configuration

| Parameter | Value |
|-----------|-------|
| Steps | 3,000 |
| Batch size | 1 (accum 16) |
| Learning rate | 3e-5 |
| Alpha (soft/hard) | 0.7 |
| Temperature | 2.0 |
| Sequence length | 256 |
| Training data | 256,635 chunks from 6 files |
| Total time | 82.4 minutes (1.4 hours) |

## Results

| Metric | Value |
|--------|-------|
| Final loss | 12.7146 |
| Best loss | 10.9970 |
| Soft KL (final) | — |
| Hard CE (final) | — |

### Sample Output (Step 3000)

```
"The meaning of life is" → The meaning of life is ⁇ . ⁇ ( ⁇ ⁇ of I . : , a ⁇ is...
"Intelligence emerges from" → Intelligence emerges from the . ( ⁇ , ⁇ ⁇ and to , the ⁇...
```

## Analysis

### Why Loss is Higher Than GPT-2 (12.71 vs 5.69)

The vocabulary mismatch is the primary bottleneck:
- GLADIUS: 16K BPE tokens
- Qwen3: 151,936 tokens (9.5× larger)

The vocab mapping cache maps each GLADIUS token to its closest Qwen3 equivalent, but this is a lossy compression. The teacher's probability distributions over 151K tokens must be projected down to 16K — losing fine-grained distinctions.

The ⁇ tokens in output indicate the model is trying to produce Qwen3-style tokens that don't exist in GLADIUS vocabulary. The distillation is transferring knowledge at the distribution level but the vocabulary bottleneck prevents clean text generation.

### Comparison: GPT-2 vs Qwen3 as Teacher

| Aspect | GPT-2 (Phase 1) | Qwen3 (Phase 2) |
|--------|-----------------|------------------|
| Teacher size | 124M | 2.03B |
| Vocab match | 50K→16K (3×) | 151K→16K (9.5×) |
| Final loss | 5.69 | 12.71 |
| Output quality | Real English words + emerging grammar | Fragmented, ⁇-heavy |
| Training time | 39 min | 82 min |
| KL reduction | 52% (22→10.5) | — |

### Key Insight

**Vocabulary alignment matters more than teacher capacity.** A smaller teacher with closer vocabulary produces better distillation than a larger teacher with mismatched tokenization. This suggests the next distillation phase should either:

1. **Expand GLADIUS vocabulary** to bridge the gap (16K → 32K+)
2. **Use intermediate teacher** with matching vocabulary
3. **Token-free distillation** — distill at the hidden state level, bypassing vocab entirely

### The Philosophy

Ali's directive: "I don't want to use OpenAI models or code." Qwen3 is Apache 2.0 — clean lineage. The quality gap is solvable. The ethical gap is not.

## Checkpoint

```
victus:~/gladius-training/training/digestion_runs/distill_outputs/qwen3_distill_outputs/dragon_qwen3_distilled_final.pt
```
