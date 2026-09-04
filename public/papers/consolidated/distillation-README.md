# GLADIUS Distillation Pipeline — Qwen3.5:27B → GLADIUS

## Problem
GLADIUS at step ~9400 has learned math and cognitive patterns but **zero English** (language_ratio=0.00 in curriculum phases 0-7000). We need to inject rich English knowledge.

## Solution: Curriculum Enrichment via Ollama
Ollama's API does **NOT** support logprobs (verified April 3, 2026). Traditional KL-divergence distillation is impossible via the API. Instead, we use the 27B model as a **high-quality text generator** to create curriculum data.

### Architecture
```
Victus GPU: GLADIUS training (RTX 2050, 4GB VRAM) — UNCHANGED
Victus CPU: Qwen3.5:27B via Ollama → generates English text → saved as .pt
                                                                    ↓
                                              Training loop loads .pt as English curriculum
```

### Generation Modes
| Mode | What | Temperature | Purpose |
|------|------|-------------|---------|
| **Completion** (35%) | Continues passages from diverse_corpus.txt | 0.75 | Natural English flow |
| **Free** (25%) | Educational explanations on 30 topics | 0.8 | Diverse knowledge |
| **Paraphrase** (25%) | Rewrites in 7 styles (formal, simple, narrative...) | 0.7 | Style diversity |
| **QA** (15%) | Question-answer pairs from source material | 0.6 | Structured knowledge |

### Output
- `data/distilled/qwen27b_distilled_corpus.txt` — unified plain text
- `data/distilled/qwen27b_distilled_tokens.pt` — tokenized with GLADIUS BPE tokenizer
- Individual: `completion_samples.txt`, `paraphrase_samples.txt`, etc.

## Usage

### On Victus (Windows):
```bash
# Start Ollama if not running
ollama serve

# Run distillation (500 samples ≈ 1-2 hours on CPU)
python distill_qwen27b.py --mode all --samples 500

# Or just tokenize existing text
python distill_qwen27b.py --mode tokenize
```

### Deploy from Dragonfly:
```bash
# Copy scripts to Victus
scp projects/gladius-distillation/distill_qwen27b.py victus:C:/Users/ali/gladius-training/distillation/
scp projects/gladius-distillation/distilled_loader.py victus:C:/Users/ali/gladius-training/distillation/

# Run remotely
ssh victus "cd C:\Users\ali\gladius-training\distillation && C:\Users\alish\AppData\Local\Programs\Python\Python312\python.exe distill_qwen27b.py --mode all --samples 500"
```

### Integration in train_v5.py:
```python
from distilled_loader import DistilledDataLoader

# At initialization:
distilled = DistilledDataLoader("data/distilled/qwen27b_distilled_tokens.pt")

# In training loop (every Nth step for English curriculum injection):
if step % 3 == 0 and distilled.has_data():
    batch = distilled.get_batch(batch_size=32, seq_len=512, device="cuda")
    # Forward pass with batch["input_ids"], loss on batch["labels"]
```

## Speed Estimates
- 27B model on Ryzen 5 7535HS (6c/12t, CPU): ~2-5 tok/s
- 512 tokens per sample × 500 samples ≈ 256K tokens
- ETA: ~1-2 hours for 500 samples
- Runs entirely on CPU — GPU training is unaffected

## Previous Distillation Results
| Teacher | Steps | Final Loss | Quality |
|---------|-------|------------|---------|
| GPT-2 (124M) | 3000 | 5.69 | Good — real English words + grammar |
| Qwen3-1.7B | 3000 | 12.71 | Poor — vocab mismatch (16K→151K) |
| **Qwen3.5:27B** | N/A | N/A | **Curriculum enrichment approach** |

The 27B model's advantage: it generates **much higher quality** English that GLADIUS absorbs through standard training, avoiding the vocab mapping problems of direct distillation.
