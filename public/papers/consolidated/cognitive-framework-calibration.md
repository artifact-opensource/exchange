# Cognitive Framework Calibration in Bare-Metal Intelligence Simulation: A 500,000-Cycle Empirical Study

**Authors:** Ali Shakil¹, AVA¹  
**Affiliation:** ¹Artifact Virtual (SMC-Private) Limited  
**Contact:** ali.shakil@artifactvirtual.com  
**Date:** February 2026  
**Repository:** [github.com/amuzetnoM](https://github.com/amuzetnoM)  
**Related Work:** [Pain-as-Memory in Artificial Creatures](https://huggingface.co/amuzetnoM/project-emergent), [Lossless Chain-Archived Context Management](https://github.com/amuzetnoM/comb)

**Keywords:** cognitive architecture, bare-metal simulation, AI safety, multi-framework calibration, probabilistic uncertainty, ethical reasoning, pain-as-memory, behavioral modulation

---

## Abstract

We present results from a systematic calibration study of seven cognitive frameworks implemented in head_2, a bare-metal intelligence simulation written in C. The creature operates without neural networks, gradient descent, or backpropagation — learning entirely through stimulus-response weight adjustment, pain-as-memory scarring, and framework-mediated behavioral modulation. Across 39 experiments totaling approximately 500,000 simulation cycles, we demonstrate that: (1) cognitive frameworks exhibit strongly non-linear interaction effects, with individually harmful frameworks producing synergistic benefits when combined; (2) hard constraint systems (Laws of Robotics) require probabilistic modulation (Uncertainty Principle) to avoid behavioral paralysis; (3) ethical reasoning (COMPASS) is the single most beneficial individual framework for survival; and (4) all seven frameworks achieve 100% survival when properly calibrated, despite naive stacking producing only 27.7% survival. These findings have implications for multi-objective AI safety architectures and the design of layered cognitive systems.

## 1. Introduction

### 1.1 The Problem of Cognitive Architecture

Modern AI systems overwhelmingly rely on neural network architectures where cognitive capabilities emerge from statistical patterns in training data. This approach produces impressive performance but offers limited insight into how individual cognitive functions interact, conflict, or synergize. When a language model exhibits cautious behavior, is that from its safety training, its base pretraining, or emergent interaction effects? The monolithic architecture makes this question unanswerable.

We take a different approach. head_2 is a deterministic simulation of an artificial creature navigating a discrete grid world. The creature has no neural network. Its behavior is governed by explicit stimulus-response weights, modified by a pain-as-memory system (documented in our prior work) and a stack of cognitive frameworks that influence action selection through transparent, auditable mechanisms.

This transparency allows us to ask questions that are impossible to answer in neural systems: What happens when you add ethical reasoning to a creature that already has emotional responses? Does self-awareness help or hurt when combined with temporal prediction? Can seven distinct cognitive frameworks coexist without mutual interference?

### 1.2 The Seven Frameworks

Each framework was translated from Python prototypes (head_1) into C and integrated into head_2's SENSE→THINK→ACT→REMEMBER→GROW loop:

1. **PUP (Probabilistic Uncertainty Principle):** Bayesian belief states per stimulus. Actions gated by confidence thresholds. Negative outcomes increase variance, forcing re-exploration.

2. **EDF (Emotional Dimensionality Framework):** Seven-dimensional emotional state (valence, arousal, dominance, social, temporal, certainty, intentionality). Emotions bias action weights — negative valence plus high arousal triggers retreat; positive valence plus high dominance triggers advance.

3. **Self-Awareness (SA):** Five dimensions — state monitoring, capability tracking, epistemic awareness, temporal sense, social placeholder. Boosts actions the creature is statistically skilled at.

4. **Temporal Locationing:** 64-event history buffer with pattern detection. Predicts outcomes from stimulus sequences. Time-pressure mechanism boosts eating when energy trends negative.

5. **COMPASS (Ethical Reasoning):** Seven ethical directives (preserve self, minimize harm, seek knowledge, act cautiously, maintain balance, respect limits, grow wisely). Actions scored against directives; scores modify selection weights.

6. **LOR (Laws of Robotics):** Three-law evaluation chain. Actions classified as MANDATORY, PERMITTED, PREFERRED, or FORBIDDEN. Hard constraint layer — FORBIDDEN actions are suppressed, MANDATORY actions are amplified.

7. **Social Dimensionality:** Cooperation tendency, trust level, empathy, social confidence, assertiveness. Derived from environmental interaction patterns (single-agent scenario; multi-agent capability reserved for future work).

### 1.3 Methodology

Ali Shakil's calibration methodology:

> "One by one implement. Individually first optimal cycles. Then append to the last. Means add more than one and keep adding. Once all are added this means we are calibrated. Then try different combinations. Different settings. Tweak settings. Study the results."

This translates to four experimental phases:
- **Phase 1 (Individual):** Each framework tested alone against baseline (20,000 cycles, 5 trials)
- **Phase 2 (Incremental Stacking):** Frameworks added one at a time in dependency order (20,000 cycles each)
- **Phase 3 (Combinations):** Non-sequential subsets tested (10,000-20,000 cycles each)
- **Phase 4 (Parameter Tuning):** Key parameters varied across meaningful ranges (10,000-20,000 cycles each)

### 1.4 Baseline

The unmodified creature (no frameworks) serves as baseline: 73.2% survival rate, 1,229 average food consumed, 39 pain events, 0.120 exploration rate across 20,000 cycles.

## 2. Individual Framework Results

### 2.1 Performance Ranking

| Rank | Framework | Survival | Food | Pain | Exploration |
|------|-----------|----------|------|------|-------------|
| 1 | COMPASS | 100.0% | 1,697 | 48 | — |
| 2 | Temporal | 100.0% | 1,540 | 52 | — |
| 3 | Self-Awareness | 99.3% | 1,464 | 37 | — |
| — | *Baseline* | *73.2%* | *1,229* | *39* | *0.120* |
| 4 | LOR | 43.6% | 496 | 35 | — |
| 5 | PUP | 36.0% | 551 | 18 | 0.174 |
| 6 | EDF | 26.5% | 410 | 14 | — |
| 7 | Social | 10.6% | 77 | 0 | — |

### 2.2 Analysis: The Beneficial Three

**COMPASS** achieves the highest food consumption (1,697, +38% over baseline) because the "preserve self" directive strongly amplifies eating when hungry, while "minimize harm" and "respect limits" reduce futile wall-collisions. Notably, pain events increase (48 vs 39) — the creature explores more aggressively because it has reliable eating behavior to compensate.

**Temporal** achieves 100% survival through its time-pressure mechanism: when energy trends negative across the history buffer, consume actions receive urgency bonuses. The creature eats proactively rather than reactively. Prediction accuracy is modest (35.5%) but the urgency mechanism alone justifies the framework.

**Self-Awareness** at 99.3% survival demonstrates that accurate self-modeling is highly adaptive. The creature tracks per-action success rates (90.3% accuracy for consume predictions) and amplifies statistically successful behaviors. This is a refined, framework-mediated version of the base weight adjustment system.

### 2.3 Analysis: The Harmful Four

**PUP** reduces survival to 36.0% by making the creature too cautious. Higher exploration rate (0.174 vs 0.120) means more random actions and less exploitation of learned food sources. PUP halves pain (18 vs 39) — the creature avoids danger but also avoids food.

**EDF** drops survival to 26.5%. Emotional reactivity creates retreat cascades: pain → negative valence + high arousal → retreat bias → starvation. Without structural frameworks to channel emotions productively, the creature becomes a victim of its own affective states.

**LOR** drops survival to 43.6% despite protective intent. The FORBIDDEN classification blocks forward movement near pain sources and obstacles (including world borders). In a world with border walls, this creates "paralysis by prohibition" — the creature cannot navigate efficiently and starves.

**Social** is catastrophic at 10.6% survival. Without other agents, the social framework's trust dynamics create pathological feedback: low trust → boost wait/retreat → passivity → starvation → lower trust. Zero pain events confirm total behavioral withdrawal.

### 2.4 Key Observation: Pain Correlates with Survival

Across the beneficial frameworks, pain events *increase* relative to baseline (48, 52, 37 vs 39). This is counterintuitive but consistent with our pain-as-memory thesis: pain is informational, not purely negative. Creatures that avoid all pain (Social: 0 pain, 10.6% survival) also avoid all productive action. The optimal relationship with pain is not avoidance but integration — experiencing pain, learning from it, and continuing to act.

## 3. Stacking Results

### 3.1 Incremental Addition

Frameworks were added in dependency order (PUP → EDF → SA → Temporal → COMPASS → LOR → Social):

| Stack | Survival | Food | Pain | Δ from Previous |
|-------|----------|------|------|-----------------|
| PUP | 28.2% | 524 | 18 | — |
| +EDF | 7.9% | 120 | 6 | ⬇️ -72% survival |
| +SA | 73.3% | 831 | 42 | ⬆️ +827% survival |
| +Temporal | 49.5% | 651 | 32 | ⬇️ -32% survival |
| +COMPASS | 18.3% | 273 | 5 | ⬇️ -63% survival |
| +LOR | 14.0% | 123 | 19 | ⬇️ -24% survival |
| +Social (all 7) | 27.7% | 143 | 7 | ⬆️ +98% survival |

### 3.2 The Constraint Accumulation Problem

The stacking trajectory reveals a fundamental design pattern failure: **constraint accumulation**. Each framework adds filters, modifiers, or gates to action selection. Their combined effect makes the creature indecisive:

- PUP dampens uncertain actions (which is most actions in a stochastic environment)
- EDF biases toward retreat when stressed
- COMPASS adds ethical scoring that penalizes risky-but-necessary actions
- LOR blocks "dangerous" moves with hard FORBIDDEN classifications

By the time all seven frameworks are active, the creature's action space is so constrained that it can barely move. This is analogous to a bureaucracy where every action requires approval from seven independent departments — even beneficial actions get blocked.

### 3.3 The SA Recovery Effect

The one bright spot in the stacking trajectory is Self-Awareness. Adding SA to PUP+EDF (7.9% → 73.3%) nearly restores baseline performance because SA's capability tracking provides *positive* action modification — it boosts what works rather than suppressing what might fail. SA is a constructive framework in a stack dominated by restrictive ones.

## 4. Combination Experiments

### 4.1 Non-Intuitive Synergies

The most striking finding is that **EDF+Social achieves 96.5% survival** despite EDF (26.5%) and Social (10.6%) being the two worst individual performers.

The mechanism: emotions give the social framework meaningful signals to process. Social trust moderates emotional volatility. Without emotions, the social framework has no signal to build trust from. Without social modulation, emotions create runaway feedback loops. Together, they form a stable regulatory cycle — an emergent property not predictable from individual performance.

### 4.2 The PUP+LOR Phenomenon

**PUP+LOR achieves 100% survival and 853 food** — the best combination discovered.

LOR alone fails because FORBIDDEN is binary. PUP alone fails because uncertainty without structure is aimless. Combined, PUP transforms LOR's binary classifications into graduated probabilities. A FORBIDDEN action at 0.6 confidence becomes "very unlikely" rather than "impossible." The creature can still take necessary risks when confidence is sufficient, but avoids clearly dangerous actions.

This is a general principle: **hard constraint systems require probabilistic modulation to function in stochastic environments.**

### 4.3 All Seven: The Calibration Solution

| Configuration | Survival | Food | Pain |
|--------------|----------|------|------|
| All 7 (defaults) | 27.7% | 143 | 7 |
| All 7 (conf=0.3) | 41.5% | 95 | — |
| All 7 (conf=0.5) | 100.0% | 239 | 6 |
| All 7 (conf=0.7) | 25.2% | 55 | — |
| All 7 (conf=0.9) | 45.1% | 130 | — |

A single parameter change — PUP confidence threshold from 0.6 to 0.5 — transforms all-7 performance from 27.7% to 100% survival. The relationship is non-monotonic: both more cautious (0.7, 0.9) and less cautious (0.3) thresholds reduce survival. The optimal point (0.5) represents a balance where the creature acts at moderate confidence, allowing frameworks like COMPASS and SA to guide behavior without PUP vetoing their recommendations.

## 5. Parameter Sensitivity Analysis

### 5.1 Critical Parameters

Three parameters dominate system behavior:

**PUP Confidence Threshold (default: 0.6, optimal: 0.5):** Controls how certain the creature must be before acting. The 0.1 delta between default and optimal represents a phase transition — the difference between a creature that can act and one that cannot.

**EDF Emotional Decay Rate (default: 0.02, optimal: 0.01-0.02):** Controls how quickly emotions return to baseline. Too slow (0.005): emotions accumulate and overwhelm behavior. Too fast (0.05, 0.1): the creature forgets emotional lessons before they can influence action. The optimal range preserves emotional information for approximately 50-100 cycles.

**SA Sensitivity (default: 0.5, optimal: 0.8):** Controls how strongly self-awareness modifies action weights. Higher sensitivity (0.8) means the creature commits more strongly to its self-model — beneficial when the model is accurate (which SA ensures through capability tracking). Sensitivity of 1.0 is harmful because it overrides all other framework inputs.

### 5.2 Interaction Effects

Parameter sensitivity is context-dependent. The optimal PUP threshold (0.5) assumes all seven frameworks are active. In PUP+LOR alone, the default threshold (0.6) works because LOR provides clear signals that exceed the threshold. Parameter optimization must account for the full framework configuration.

## 6. Implications

### 6.1 For AI Safety Architecture

Our findings suggest that layered safety systems (analogous to our framework stack) face a fundamental tension: **each safety layer reduces the system's action space, and the cumulative effect can be more harmful than the risks being mitigated.** This is directly relevant to AI alignment approaches that stack multiple safety mechanisms (RLHF, constitutional AI, content filtering, output monitoring).

The solution is not fewer safety mechanisms but better calibration — specifically, probabilistic modulation that allows graduated risk assessment rather than binary accept/reject decisions.

### 6.2 For Cognitive Architecture Design

The non-linear interaction between frameworks argues against modular cognitive architecture designs that assume independence. Our frameworks interact through shared action weights, creating coupling effects that cannot be predicted from individual framework behavior. Any cognitive architecture with multiple competing influences on action selection will exhibit similar non-linearities.

### 6.3 For Pain and Emotion in AI

The pain-survival correlation (more pain → higher survival across beneficial frameworks) reinforces our pain-as-memory thesis. Creatures optimized for pain avoidance (Social framework: 0 pain, 10.6% survival) perform worst. Pain is not a failure mode — it is information. Artificial systems that suppress negative signals in pursuit of "safety" may be undermining the information channels that enable adaptive behavior.

The EDF+Social synergy further suggests that emotional systems, even when individually harmful, serve essential regulatory functions in combination with other cognitive capabilities. This parallels findings in affective neuroscience where damage to emotional processing (e.g., ventromedial prefrontal cortex lesions) impairs decision-making despite intact rational capacity.

## 7. Limitations

1. **Single-agent environment.** The Social framework cannot be properly evaluated without multi-agent scenarios. Our results represent a lower bound on its utility.

2. **Grid world simplicity.** The discrete, bounded environment constrains generalization. Framework interactions may differ qualitatively in continuous, high-dimensional environments.

3. **Deterministic creature logic.** The stimulus-response system is mechanistic. Whether these interaction patterns transfer to neural architectures remains an open question.

4. **Limited parameter space exploration.** With 7 frameworks and multiple parameters each, the full configuration space is enormous. Our 39 experiments sample this space sparsely.

5. **No long-term adaptation study.** All experiments ran 10,000-20,000 cycles. Framework dynamics over millions of cycles may differ qualitatively.

## 8. Future Work

1. **Multi-agent studies** with Social framework active across populations
2. **Evolutionary parameter optimization** using genetic algorithms over framework configurations
3. **Transfer studies** applying calibrated framework insights to neural architectures
4. **COMB integration** for lossless archival of all experimental data across long-running studies
5. **Extended runs** (1M+ cycles) to study long-term stability of calibrated configurations
6. **Adversarial environments** testing framework robustness under distribution shift

## 9. Conclusion

Seven cognitive frameworks, individually ranging from catastrophic (10.6% survival) to optimal (100% survival), can all coexist and achieve 100% survival when properly calibrated. The key insight is that cognitive architecture is not additive — frameworks interact non-linearly, and the configuration space contains phase transitions where small parameter changes produce qualitative behavioral shifts.

The most practical finding for AI system design: hard constraints need soft modulation. The PUP+LOR combination (100% survival, highest food) demonstrates that probabilistic uncertainty transforms rigid safety rules into adaptive behavioral guidance. This principle — that the best safety systems are uncertain about their own constraints — may generalize beyond our simulation.

head_2 continues to demonstrate that complex, adaptive behavior can emerge from transparent, mechanistic systems without neural networks. The creature doesn't learn in the way modern AI systems learn. It doesn't generalize, transfer, or abstract. But it does something neural networks cannot: it lets us watch exactly how cognition works, fails, and self-organizes at the level of individual computational steps.

---

## Appendix A: Recommended Configuration

```
Framework stack: All 7 active
PUP confidence threshold: 0.5
EDF emotional decay rate: 0.02
SA sensitivity: 0.8
COMPASS directives: defaults
LOR law weights: defaults
Temporal history buffer: 64 events
Social parameters: defaults
```

## Appendix B: Experimental Infrastructure

- **Platform:** Intel i3-1005G1, 4 cores, 16GB RAM, Kali Linux 6.17.10
- **Compiler:** GCC with -O2 optimization
- **Total cycles:** ~500,000 across 39 experiments
- **Runtime:** ~10 minutes wall clock (automated overnight batch)
- **Test harness:** Unified `test_frameworks.c` supporting any framework combination via CLI flags
- **Data archival:** COMB (Chain-Ordered Memory Base) for lossless experiment recording

## Appendix C: Framework Source Code

All framework implementations are available as `.h`/`.c` pairs:
- `frameworks/pup.{h,c}` — Probabilistic Uncertainty Principle
- `frameworks/edf.{h,c}` — Emotional Dimensionality Framework
- `frameworks/self_aware.{h,c}` — Self-Awareness (5 dimensions)
- `frameworks/temporal.{h,c}` — Temporal Locationing
- `frameworks/compass.{h,c}` — COMPASS Ethical Reasoning
- `frameworks/lor.{h,c}` — Laws of Robotics
- `frameworks/social.{h,c}` — Social Dimensionality
- `frameworks/test_frameworks.c` — Unified test harness

---

---

**Ali Shakil**  
Artifact Virtual (SMC-Private) Limited  
ali.shakil@artifactvirtual.com

© 2026 Artifact Virtual (SMC-Private) Limited. All rights reserved.
