# Dragon Digestion v1 — Collapse Data for Paper
# Extracted from Phase A training (5000 steps, 26.9 hours)
# Model: GLADIUS Dragon (256.8M params, expanded from 6.9M Seed via Net2Net)
# Hardware: RTX 2050 4GB VRAM, Victus WSL2

## Training Configuration (v1)
- Architecture: 256.8M params, 16K BPE vocab, 512 seq_len
- Batch: 1 micro × 16 accum = 16 effective
- LR: 1e-4 peak, 1e-5 min, cosine decay, 300 warmup steps
- Precision: bf16 autocast
- Loss: CrossEntropyLoss (NO label smoothing, NO entropy reg)
- Weight tying: YES (embedding = output projection)
- Data: 50M tokens from 40 English literature files (capped from 15M+ token diverse_corpus.txt + 39 classics)
- Speed: 0.05 steps/sec (19.4 sec/step)

## Loss Curve
| Step | Loss | LR | Notes |
|------|------|----|-------|
| 10 | 14.7318 | 3.00e-06 | Cold start |
| 100 | 7.7440 | 3.30e-05 | Warmup phase |
| 250 | 6.6277 | 8.30e-05 | Rapid descent |
| 500 | 5.8425 | 9.96e-05 | Near peak LR |
| 750 | 5.2430 | 9.80e-05 | |
| 1000 | 5.1197 | 9.52e-05 | ✅ LAST HEALTHY checkpoint |
| 1500 | 4.8191 | 8.63e-05 | ⚠️ Collapse begins |
| 2000 | 4.3538 | 7.40e-05 | Deepening collapse |
| 2500 | 3.8577 | 5.95e-05 | Full collapse |
| 3000 | 3.7078 | 4.46e-05 | Stuck in collapse |
| 3500 | 3.3431 | 3.08e-05 | |
| 4000 | 3.5170 | 1.97e-05 | Slight bump |
| 4500 | 3.3520 | 1.25e-05 | |
| 5000 | 2.7944 | 1.00e-05 | Final — 81% reduction, fully collapsed |

## Sample Outputs at Each Checkpoint
### Step 500 (Loss 5.84)
"The meaning of life is the last of the main of the team of the city of the same of the United..."
- Status: HEALTHY (repetitive structure, but diverse vocabulary)
- Key: Uses "of the X" pattern — learning English prepositional phrases
- Unique content words present: "team", "city", "United"

### Step 1000 (Loss 5.12) — LAST HEALTHY
"The meaning of life is the other of the rest of the city of the only and the same the the city of the Byzant..."
- Status: HEALTHY
- Key: "Byzantine" — pulling real knowledge from training data
- Structural diversity still intact
- This is our v2 restart point

### Step 1500 (Loss 4.82) — COLLAPSE ONSET
"...is the price of the empire the price of the empire and the empire of the eastern empire..."
- Status: ⚠️ WARNING
- Key: "empire" appears 5× in one sentence
- Self-referencing loops beginning
- Vocabulary narrowing

### Step 2000 (Loss 4.35)
"...is the whole of the whole of the empire of the rule of the princes the empire the the understanding..."
- Status: ⚠️ COLLAPSING
- Key: "whole" and "empire" dominating
- "the the" appearing (token stuttering)

### Step 2500 (Loss 3.86) — FULL COLLAPSE
"...is not only is not is is is is is is is is..."
- Status: 🔴 COLLAPSED
- Key: "is" becomes dominant token
- Delta function forming in output distribution

### Step 3000 (Loss 3.71)
"is is is is is is is is is is is is is..."
- Status: 🔴 FULLY COLLAPSED
- Entropy: approaching 0

### Step 3500 (Loss 3.34)
"is is is is is is is is is is is is is..."
- Status: 🔴 FULLY COLLAPSED

### Step 4000 (Loss 3.52)
"is is is is is is is is is is is is is..."
- Status: 🔴 FULLY COLLAPSED

### Step 4500 (Loss 3.35)
"is is is is is is is is is is is is is..."
- Status: 🔴 FULLY COLLAPSED
- Entropy: 0.000 / 9.680 (delta function)
- "is" probability: 99.9957%
- Logit gap (top1 - top2): 10.38

### Step 5000 (Loss 2.79 — BEST v1 loss)
"is is is is is is is is is is is is is..."
- Status: 🔴 FULLY COLLAPSED
- Loss continued to improve despite complete quality collapse

## Entropy Analysis
| Step | Avg Entropy | Max Entropy | "is" Probability | Logit Gap |
|------|-------------|-------------|-------------------|-----------|
| 500 | 5.94 | 9.680 | 1.7% | 1.82 |
| 1000 | 5.72 | 9.680 | 1.5% | 1.59 |
| 1500 | 4.93 | 9.680 | 25% | 3.21 |
| 2500 | 1.07 | 9.680 | 86% | 7.45 |
| 4500 | 0.000 | 9.680 | 99.9957% | 10.38 |

## Root Cause Analysis

### 1. The Cheapest Shortcut
Cross-entropy loss rewards correct next-token prediction. Function words ("is", "of", "the", "a") 
appear in ~30% of all tokens in English text. The model discovered that always predicting "is" 
after seeing "is" gets that prediction RIGHT often enough to reduce average loss — while 
sacrificing all other vocabulary. This is a local minimum that satisfies the objective function 
while completely subverting the intended goal.

### 2. Weight Tying Amplification
With weight tying (embedding matrix = output projection), the "is" embedding gets amplified 
through a feedback loop:
1. "is" prediction reinforced → "is" output logit increases
2. Higher "is" logit → gradient pushes embedding to be more "is"-like
3. More "is"-like embedding → input containing "is" activates "is" prediction more strongly
4. Loop closes — exponential amplification

### 3. No Distribution Constraints
v1 used vanilla CrossEntropyLoss with no label smoothing and no entropy regularization.
The loss function had no mechanism to penalize collapsed distributions. The model was free
to concentrate all probability mass on a single token.

### 4. Content vs Function Word Divergence
- Function words ("is", "of", "the"): Model reaches near-perfect prediction → low loss contribution
- Content words ("Byzantine", "empire"): Model struggles → high loss contribution
- Optimal strategy: Sacrifice content words (accept high loss) but dominate function words (very low loss)
- Net effect: Total loss decreases because function words are MORE FREQUENT

## The Paradox
Loss went from 14.7 → 2.79 (81% reduction). By any loss metric, the model was "learning."
But by any quality metric, the model was "dying." This is the fundamental disconnect between
optimization objective and intended behavior — a form of Goodhart's Law in neural networks.

"When a measure becomes a target, it ceases to be a good measure."

## v2 Fixes Applied
1. **Label smoothing 0.1** — Forces 10% probability mass across all tokens. Prevents delta function.
2. **Entropy regularization** — Penalizes entropy below 8.0 (healthy range for 16K vocab). 
   NOTE: v2.0 has a bug where entropy is computed in no_grad() so the penalty doesn't backpropagate. 
   Label smoothing is doing the heavy lifting. Fix planned for v2.1.
3. **Repetition penalty 1.3** — In eval sampling, previously-generated tokens get logits divided by 1.3.
4. **Rotating eval prompts** — 5 different prompts cycle through eval, preventing the eval itself from 
   being optimized for.

## v2 Training Status
- Started: 2026-03-09 15:26 PKT
- Checkpoint: Loaded from v1 step 1000 (healthy weights, loss 5.12)
- Phase A: 4000 steps remaining (effectively steps 1001-5000 with anti-collapse)
- Phase B: 3000 steps (philosophy + identity corpus)
- Phase C: 3000 steps (AVA soul + memory + journal)
- Monitoring: Hourly sitrep via cron → Discord + WhatsApp
- Collapse detection: Automated word frequency analysis in sample outputs

---

## v2.2 Telemetry — Decoupled Embeddings (STABLE)

### Configuration
- Weight tying: **NO** (decoupled — independent output head, Xavier init)
- Label smoothing: 0.1
- Entropy penalty: 0.15 (3x v2.1), target 6.0, with gradient flow
- LR: 1e-4 peak, 300 warmup, cosine decay
- Extra params: ~33M from decoupled output head (~289M total)
- Loaded from: v1 step 1000 checkpoint (healthy input embeddings)

### Full Training Log (Steps 10-650)

| Step | Loss | Entropy | LR | Sample (truncated) |
|------|------|---------|-----|-----|
| 10 | 10.51 | 9.74 | 3.00e-06 | — (no sample) |
| 50 | 8.53 | 9.05 | 1.63e-05 | "Once upon a time there was and the the of, toed. . I manya" |
| 100 | 7.85 | 7.48 | 3.30e-05 | "In the history of science he to in as a ands. by, of the on" |
| 150 | 7.72 | 7.72 | 4.97e-05 | "The most important thing about. had a the that , = his to" |
| 200 | 7.32 | 6.86 | 6.63e-05 | "When the sun rises over the second , two On after the United" |
| 250 | 7.25 | 6.93 | 8.30e-05 | "The meaning of life is the same . It was the United States" |
| 300 | 6.93 | 7.41 | 9.97e-05 | "Once upon a time there was known to the first time of the United" |
| 350 | 6.84 | 6.56 | 1.00e-04 | "In the history of sciences . The season6 = = = 14" |
| 400 | 6.78 | 7.29 | 9.98e-05 | "The most important thing about the emperor . He was a short of the state" |
| 450 | 6.55 | 6.74 | 9.96e-05 | "When the sun rises over the public: if thou shalt thou ye shall say" |
| 500 | 6.51 | 6.22 | 9.94e-05 | "The meaning of life is the war to his area in the northern" |
| 550 | 6.41 | 6.67 | 9.90e-05 | "Once upon a time there was said; but that they will be so the first" |
| 600 | 6.51 | 6.52 | 9.86e-05 | "In the history of scienceation ( or 2 @,@ 000 ) , the original" |
| 650 | 6.36 | 6.62 | 9.80e-05 | "The most important thing about its well @-@ in the species" |

### Entropy Breathing Pattern
Entropy oscillates between ~6.1-7.8 due to penalty spring effect:
- Drifts down naturally as model gains confidence
- Penalty kicks in near 6.0 threshold, pushes back up
- Creates bounded oscillation — diversity maintained without preventing learning

### Collapse Test: PASSED at Every Kill Point
- Step 50: v2.0 collapsed, v2.2 healthy ✅
- Step 100: v2.1 collapsed ("in in in"), v2.2 healthy ✅
- Step 150: v2.1 collapsed ("@-@ @-@"), v2.2 healthy ✅
- Step 300: Warmup complete, peak LR stress — v2.2 healthy ✅
- Step 500: Approaching v1 healthy-range loss (5.8) — v2.2 healthy ✅
- Step 650: Continuing stable, grammar emerging ✅

### Key Metrics
- Loss reduction rate: 10.51 → 6.36 in 650 steps (39.5% reduction)
- Entropy floor: ~6.1 (never dropped below, penalty holds)
- Entropy ceiling: ~9.7 (step 10, fresh head)
- VRAM stable at 3.64/6.71 GB throughout
- No gradient spikes, no NaN, no OOM
