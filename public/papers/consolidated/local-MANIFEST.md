# GLADIUS Local Mirror — Manifest
**Copied from:** `victus-wsl:/home/ava/gladius-training/`
**Destination:** `/home/adam/workspace/gladius-local/`
**Date:** 2026-03-16 ~14:45 PKT
**Total on disk:** ~731MB (transfers still completing for remaining checkpoints)

---

## 1. Habitat Logs (73MB) ✅ COMPLETE
- `habitat/habitat_20260315_201750.jsonl` — 7.6M
- `habitat/habitat_20260315_205229.jsonl` — 12M
- `habitat/habitat_20260315_213802.jsonl` — 54M (main run, 104K+ breaths)
- `habitat/habitat_final_state.json` — 83K
- `habitat/habitat_20260315_201345.jsonl` — empty (aborted)
- `habitat/habitat_20260315_201413.jsonl` — empty (aborted)

## 2. Checkpoints ✅ MOSTLY COMPLETE
| File | Size | Status |
|------|------|--------|
| `checkpoints/drake_ohlcv_final.pt` | 239M | ✅ SYMLINK → `/home/adam/workspace/gladius_v2/runs/drake_ohlcv_final.pt` |
| `checkpoints/genesis_final.pt` | 78M | ✅ |
| `checkpoints/drake_signal_final.pt` | 85M | ✅ |
| `checkpoints/curriculum_final.pt` | 117M | ✅ |
| `checkpoints/vlm_step4000.pt` | 48M | ✅ |
| `checkpoints/hatchling_muonclip_best.pt` | 56M | ✅ |
| `checkpoints/drake_net2net.pt` | 60M | ✅ |
| `checkpoints/broadcast_final.pt` | 57M | ✅ |
| `checkpoints/broadcast_pre_pain.pt` | 35M | ✅ |
| `checkpoints/distillation/dragon_distilled_final.pt` | 15M | ✅ |
| `checkpoints/drake_dna_final.pt` | — | 🔄 IN PROGRESS (255MB) |
| `checkpoints/phoenix_marathon_final.pt` | — | 🔄 IN PROGRESS (1GB) |
| `checkpoints/hatchling_net2net.pt` | — | 🔄 IN PROGRESS |
| `checkpoints/distillation/dragon_qwen3_distilled_final.pt` | — | 🔄 IN PROGRESS |
| `checkpoints/distillation/dragon_phaseA_final.pt` | — | 🔄 IN PROGRESS |
| `checkpoints/distillation/dragon_v22_phaseA_final.pt` | — | 🔄 IN PROGRESS |
| `checkpoints/distillation/dragon_ava_built.pt` | — | 🔄 IN PROGRESS |
| `checkpoints/drake_signal_best.pt` | — | 🔄 IN PROGRESS |

**NOT copied (intentionally skipped — intermediate/large):**
- `runs/dragon_first_feast.pt` (1GB — early checkpoint, superseded)
- All intermediate step checkpoints (step500, step1000, etc.)
- `training/digestion_runs/` intermediate .pt files (~65GB)
- `training/phase3_outputs/` (~46GB)

## 3. Kernel Source ✅ COMPLETE
- `kernel/` — 15 Python files (attention, cognition, config, embeddings, kernel, memory, modulator, router, temporal, temporal_lattice, tools, warm_memory)
- `src/` — Full source tree with kernel/, expansion/, training/, specialists/, tests/, data/
- `gladius_v2/` — V2 source with net2net growth, drake training, BPE models

## 4. Training Scripts & Experiments ✅ COMPLETE
- `experiments/train_*.py` — 12 training scripts (broadcast, curriculum, cifar, dna, mnist, ohlcv, variant, genesis2, hatchling_muonclip, signal, victus, baseline_trio)
- `experiments/distill_*.py` — 3 distillation scripts (gpt2, qwen3, phase3_extended)
- `experiments/run_*.sh` — 11 run scripts
- `experiments/launch_*.sh` — 4 launch scripts
- `experiments/habitat.py` — Habitat daemon (35K)
- `experiments/net2net.py` — Net2Net growth (34K)
- `experiments/devour.py` — Devour pipeline (22K)
- `experiments/*.py` — 8 utility scripts (oscilloscope, probes, tools, etc.)
- `experiments/training/` — 15 additional scripts from training/ dir (digests, muonclip, hatchling, video, genesis, decision)

## 5. Data ✅ MOSTLY COMPLETE
- `data/ohlcv_training.pt` — 162K (OHLCV prepared data)
- `data/dna_training.pt` — 19M (DNA prepared data)
- `data/dna_sequences.json` — 1.9M (raw DNA sequences)
- `data/phase_b_clean.txt` — 397K (Phase B text)
- `data/ava_corpus.txt` — 1.3M (AVA corpus)
- `data_transfer/cifar10/` — 51M (CIFAR-10 batches)
- `data_transfer/is1_clean.txt` — 255K (IS1 text)
- `gladius_bpe_16k.model` — 496K (BPE tokenizer)
- `tool_registry.json` — 31K

## 6. Analysis ✅ COMPLETE
### Dissections
- `analysis/dissections/genesis_dissection.json` — 85K
- `analysis/dissections/ohlcv_dissection.json` — 326K
- `analysis/dissections/signal_dissection.json` — 27K
- `analysis/dissections/dna_dissection.json` — 47K
- `analysis/dissections/curriculum_dissections.json` — 1.6K

### Logs
- `analysis/logs/GENESIS_REPORT.md` — 2.8K
- `analysis/logs/genesis_training.log` + `.json` — 17K
- `analysis/logs/signal_log.json` + training.log — 137K
- `analysis/logs/curriculum_training.log` — 9.6K
- `analysis/logs/vlm_training.log` — 45K
- `analysis/logs/training.log` (hatchling) — 42K
- `analysis/logs/hatchling_muonclip_phasemega_log.json` — 36K
- `analysis/logs/broadcast_results.json` — 30K

### Outputs
- `analysis/outputs/phase_B_final.pt` — 28M
- `analysis/outputs/phase_C_step3500.pt` — 2.3M
- `analysis/training-logs/feast.log` — 1.6K
- 🔄 More outputs still transferring (~1.5GB outputs dir)

### Pre-existing Analysis
- `analysis/decode_habitat.py` — 24K
- `analysis/habitat_analysis.json` — 7.9K
- `analysis/habitat_decode_report.md` — 11K

## 7. Genesis2 ✅ COMPLETE
- `experiments/genesis2/genesis2/genesis2.log` — 11K
- `experiments/genesis2/genesis2/trajectory.pt` — 1006K
- `experiments/genesis2/genesis2/metrics.json` — 265K
- `experiments/genesis2/genesis2/hidden_step{0,10,50,100,200,499}.pt` — 130K each

## 8. Expansion & Fusion ✅ COMPLETE
- `expansion/net2net.py` — 20K
- `fusion/` — 8 files (analyze, architecture_alignment, devour, feast, fuse, qwen_config, README)

---

## Background Transfers Still Running
Several `scp` processes are still completing in background:
- Large checkpoints (drake_dna_final 255MB, phoenix_marathon 1GB, distillation finals)
- outputs/ directory (~1.5GB)
- data/ directory (remaining items)

Check with: `ls -lh /home/adam/workspace/gladius-local/checkpoints/`

## What Was NOT Copied (by design)
- **111GB training/digestion_runs/** — intermediate distillation checkpoints (only finals extracted)
- **dragon_first_feast.pt** (1GB) — early checkpoint, superseded by all subsequent runs
- **All intermediate step checkpoints** from every experiment run
- **Total saved: ~110GB** by copying only finals/bests
