# GLADIUS Checkpoints — Canonical Inventory
**Location:** `gladius-local/checkpoints/` (Dragonfly)
**Last updated:** 2026-03-26

> This is the ONE canonical checkpoint location on Dragonfly.
> Victus has additional checkpoints (wyrm training, etc.) not mirrored here.

## Growth Stages
Seed(6.9M) → Hatchling(41M) → Drake(68M) → Wyrm(114M) → Dragon(141M)

---

## Core Checkpoints

| File | Size | Date | Description |
|------|------|------|-------------|
| `phoenix_marathon_final.pt` | 80M | 2026-03-05 | **Best v2 Seed** — Phase A English, loss 0.62, 102K steps |
| `hatchling_net2net.pt` | 101M | 2026-03-12 | Net2Net expansion Seed→Hatchling |
| `hatchling_muonclip_best.pt` | 223M | 2026-03-16 | Best Hatchling with MuonClip optimizer |
| `drake_net2net.pt` | 237M | 2026-03-16 | Net2Net expansion Hatchling→Drake |
| `drake_ohlcv_final.pt` | 239M | 2026-03-16 | Drake trained on OHLCV time-series |
| `drake_signal_final.pt` | 238M | 2026-03-16 | Drake signal training final |
| `drake_signal_best.pt` | 238M | 2026-03-16 | Drake signal training best |
| `drake_dna_final.pt` | 255M | 2026-03-16 | Drake trained on DNA sequences |
| `wyrm_net2net.pt` | 408M | 2026-03-21 | Net2Net expansion Drake→Wyrm |
| `dragon_first_feast.pt` | 548M | 2026-03-08 | First Dragon-scale checkpoint |
| `dragon_devoured.pt` | 1012M | 2026-03-16 | Dragon "devour" analysis output |
| `genesis_final.pt` | 239M | 2026-03-16 | Genesis experiment final |

## Training Experiments

| File | Size | Date | Description |
|------|------|------|-------------|
| `broadcast_final.pt` | 237M | 2026-03-16 | Broadcast training final |
| `broadcast_pre_pain.pt` | 237M | 2026-03-16 | Broadcast pre-pain checkpoint |
| `curriculum_final.pt` | 238M | 2026-03-16 | Curriculum training final |
| `vlm_step4000.pt` | 239M | 2026-03-16 | VLM feed training step 4000 |
| `drake_net2net_BACKUP.pt` | 237M | 2026-03-16 | Drake Net2Net backup |

## Distillation (distillation/)

| File | Size | Date | Description |
|------|------|------|-------------|
| `dragon_distilled_final.pt` | 989M | 2026-03-16 | GPT-2 distillation (loss 5.69, 3000 steps) |
| `dragon_qwen3_distilled_final.pt` | 983M | 2026-03-16 | Qwen3-1.7B distillation (loss 12.71) |
| `dragon_phaseA_final.pt` | 985M | 2026-03-16 | Dragon Phase A final |
| `dragon_v22_phaseA_final.pt` | 1.1G | 2026-03-16 | Dragon v2.2 Phase A final |
| `dragon_v22_phaseA_step1000.pt` | 223M | 2026-03-12 | Dragon v2.2 Phase A step 1000 |
| `dragon_ava_built.pt` | 1.1G | 2026-03-16 | Dragon "AVA built" checkpoint |

## Phase B (Kaggle, phase_B/)

| File | Size | Steps | Description |
|------|------|-------|-------------|
| `phase_B_step500.pt` | 80M | 500 | Phase B intermediate |
| `phase_B_step1000.pt` | 80M | 1000 | Phase B intermediate |
| `phase_B_step1500.pt` | 80M | 1500 | Phase B intermediate |
| `phase_B_step2000.pt` | 80M | 2000 | Phase B intermediate |
| `phase_B_step2500.pt` | 80M | 2500 | Phase B intermediate |
| `phase_B_step3000.pt` | 80M | 3000 | Phase B intermediate |
| `phase_B_final.pt` | 80M | final | Phase B final |
| `phase_b_step12500.pt` | 80M | 12500 | Phase B Kaggle step 12500 |
| `phase_B_step15000.pt` | 80M | 15000 | Phase B Kaggle step 15000 |
| `phase_B_step17500.pt` | 80M | 17500 | Phase B Kaggle step 17500 |

## Phase C (Identity, phase_C/)

| File | Size | Steps | Description |
|------|------|-------|-------------|
| `phase_C_step500.pt` | 80M | 500 | Phase C intermediate |
| `phase_C_step1000.pt` | 80M | 1000 | Phase C intermediate |
| `phase_C_step1500.pt` | 80M | 1500 | Phase C intermediate |
| `phase_C_step2000.pt` | 80M | 2000 | Phase C intermediate |
| `phase_C_step2500.pt` | 80M | 2500 | Phase C intermediate |
| `phase_C_step3000.pt` | 80M | 3000 | Phase C intermediate |
| `phase_C_step3500.pt` | 80M | 3500 | Phase C intermediate |
| `phase_C_step4000.pt` | 80M | 4000 | Phase C intermediate |
| `phase_C_step4500.pt` | 80M | 4500 | Phase C intermediate |
| `phase_C_step5000.pt` | 80M | 5000 | Phase C intermediate |
| `phase_C_final.pt` | 80M | final | Phase C final |

## Quantized

| File | Size | Date | Description |
|------|------|------|-------------|
| `drake_pq_prototype.pqz` | 143M | 2026-03-16 | Perceptual quantization prototype |
| `drake_pq_decompressed.pt` | 268M | 2026-03-16 | PQ decompressed back to PT |

## Archive (archive/)

| File | Size | Date | Description |
|------|------|------|-------------|
| `gladius_transplant.pt` | 60M | 2026-02-27 | V1 transplant checkpoint |
| `phase_c_best.pt` | 176M | 2026-02-27 | V1 Phase C best |

## Warm States (warm_states/)

| File | Size | Description |
|------|------|-------------|
| `phase_b_step12500.pt.warm` | 172K | Warm memory state at step 12500 |
| `phase_B_step15000.pt.warm` | 172K | Warm memory state at step 15000 |
| `phase_B_step17500.pt.warm` | 172K | Warm memory state at step 17500 |
| `archive_phase_b_step12500.pt.warm` | 172K | Archive warm state |

## Remote (Victus)

Additional checkpoints on Victus not mirrored here:
- `wyrm_net2net.pt` (428MB) — also copied locally
- Training run outputs in `~/gladius-training/`

---

**Total:** ~13GB across 52 checkpoint files
