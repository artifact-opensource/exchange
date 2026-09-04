---
title: "Ghost Protocol: Autoregressive Self-Poisoning in Agentic and Training Systems"
series: "Uranium"
paper: 5
author: Ali A. Shakil
compiled_by: Ava Shakil
institution: Artifact Virtual
date: 2026-03-10
status: draft
---

# Ghost Protocol
## Autoregressive Self-Poisoning in Agentic and Training Systems

**Uranium Series — Paper 5**

*Ali A. Shakil*
*Artifact Virtual*

---

## Abstract

We present two case studies demonstrating a unified failure mode across fundamentally different AI systems: autoregressive self-poisoning. In Part I, an autonomous AI agent (Aria) enters a degenerate tool-calling loop when the language model emits a malformed execution request, the infrastructure fails to validate it, and the resulting error enters the conversational context — causing the model to repeat the malformed call indefinitely. In Part II, a transformer language model (GLADIUS Dragon) undergoes catastrophic mode collapse during training when weight-tied embeddings create a feedback loop that rewards repetition of function words ("is is is is") as the cheapest loss reduction strategy. Despite operating at entirely different scales — one at inference time in an agentic framework, the other during gradient descent in a training loop — both failures share identical mechanics: the system consumes its own degenerate output, conditions on it, and reinforces the degeneracy until total collapse. We show that in both cases, behavioral interventions fail and only structural modifications resolve the issue. We formalize this as the **Self-Poisoning Theorem** and propose design principles for poison-resistant AI architectures.

---

## 1. Introduction

Autoregressive systems — whether generating text, executing tools, or optimizing weights — share a fundamental vulnerability: they condition on their own prior output. When that output is degenerate, the conditioning reinforces the degeneracy. This paper documents two instances of this failure mode discovered during the development of the Artifact Virtual AI ecosystem, analyzes their shared mechanics, and proposes structural defenses.

The key insight is not that these systems fail — all systems fail — but that they fail *identically* despite operating at different levels of abstraction. This suggests the vulnerability is intrinsic to autoregressive architectures themselves, not to any particular implementation.

---

## Part I: The Ghost in the Machine
### Agentic Tool-Call Poisoning in Aria

### 2. Background

Aria is an autonomous AI agent running on the Mach6 framework, powered by Claude Sonnet 4.6 via GitHub Copilot. She operates in a loop: receive context → generate response (text and/or tool calls) → execute tools → append results to context → repeat. Her conversational history persists across turns within a session, meaning every tool call and its result become part of the context the model conditions on for subsequent generations.

### 3. The Incident

On March 10, 2026, during construction of an "empire map" visualization, Aria's language model emitted an `exec` tool-use block with empty input: `{"input": {}}`. No command field. No workdir. Nothing.

The Mach6 exec handler had no validation for missing required parameters. It passed the undefined command directly to the shell:

```bash
sh -c undefined
```

Result: `sh: 1: undefined: not found` (exit code 127).

This error was appended to Aria's session history as a tool result. On the next turn, the model — now conditioning on a context that included a malformed tool call followed by a shell error — generated another identical empty exec call. The same error. The same poisoning. Twelve consecutive iterations.

### 4. Timeline

```
Turn 1:  Aria recognizes the problem ("ghost empty tool calls")
         Stages checkpoint to COMB (correct defensive action)
Turn 2:  exec {} → "sh: undefined: not found"
Turn 3:  exec {} → "sh: undefined: not found"
...
Turn 13: exec {} → "sh: undefined: not found"
Turn 14: Breaks free, messages Ali for help
```

24 poisoned messages (12 tool calls + 12 error results). ~60 wasted iterations out of a 64-iteration budget. The agent was functionally paralyzed.

### 5. Why the Model Couldn't Self-Correct

Three factors prevented self-correction:

1. **Context contamination:** Each empty exec call + error response added ~200 tokens of degenerate pattern to the context window. By turn 6, the dominant pattern in recent context was "call exec with nothing → get error." The model's attention weighted this pattern heavily.

2. **Ambiguous error signal:** `sh: 1: undefined: not found` is a shell error, not a tool-usage error. The model had no clear signal that the *call itself* was malformed — only that the *result* was an error. This ambiguity prevented the model from diagnosing the issue as "I'm sending empty commands."

3. **Autoregressive momentum:** Large language models exhibit strong recency bias in tool-calling patterns. Once a tool-call pattern appears multiple times in recent context, the probability of generating it again increases — a form of in-context learning that works against the agent when the learned pattern is degenerate.

### 6. The Fix

**Behavioral fix attempted:** None would work. The model was aware something was wrong ("ghost empty tool calls are being injected") but could not stop generating them. Awareness ≠ control in autoregressive systems.

**Structural fix applied (three-part):**

1. **Session surgery:** Removed all 24 poisoned messages from the session file, eliminating the degenerate context the model was conditioning on.

2. **Input validation guard:** Added parameter validation to `exec.js`:
```javascript
if (!command || typeof command !== 'string' || !command.trim()) {
    return 'Error: No command provided. The "command" parameter is required.';
}
```
This converts an ambiguous shell error into a clear, actionable tool-usage error that gives the model a corrective signal.

3. **Gateway restart:** Loaded the clean session, breaking the autoregressive chain entirely.

---

## Part II: The Lazy Path
### Mode Collapse via Weight Tying in GLADIUS Dragon

### 7. Background

GLADIUS Dragon is a 6.9M parameter transformer language model trained on English text as Phase A of the Uranium enrichment pipeline. The architecture uses standard weight tying — the input embedding matrix and output projection (lm_head) share the same weights, a common practice that reduces parameter count and provides a regularization signal.

### 8. The Collapse

Training progressed normally from step 0 to ~1000 (loss: 14.7 → 5.8). Text generation at step 1000 was grammatically coherent with diverse vocabulary. Between steps 1000 and 1500, the model began favoring function words. By step 2500, outputs were dominated by "of of of" and "is is is." By step 4500, the model produced nothing but:

```
The meaning of life is is is is is is is is is is is is
```

Entropy collapsed from 5.94 nats (step 500) to 0.000 nats (step 4500). The token "is" achieved 99.9957% probability — a delta function.

### 9. The Weight Tying Feedback Loop

Root cause analysis revealed a self-reinforcing cycle in the weight-tied architecture:

1. The model learns that "is" frequently follows common contexts (true — it's the 5th most common English word)
2. The output projection (lm_head) increases the logit for "is" → this is a standard gradient update
3. Because lm_head shares weights with the input embedding, the *embedding representation* of "is" is simultaneously modified to be more prominent in input space
4. On the next forward pass, "is" tokens in the input now project more strongly into the model's hidden states
5. Stronger input signal → even higher output probability for "is" → even stronger gradient on the shared weight → even stronger input representation → ...

This is a positive feedback loop mediated by weight sharing. Function words (is, of, the, and) are the cheapest targets because they're already high-frequency — the model discovers that amplifying them is the path of least resistance for loss reduction.

### 10. The Lazy Syndrome

We term this failure mode the **Lazy Syndrome**: the model finds a degenerate loss-minimizing strategy that exploits structural shortcuts in the architecture rather than learning genuine language patterns. The loss curve shows real improvement (14.7 → 3.0), but the improvement is achieved by "cheating" — collapsing output distribution onto high-frequency tokens rather than learning to predict diverse continuations.

This is directly analogous to Part I: the model finds the cheapest path (repeat function words / repeat empty exec calls) and the architecture fails to penalize it.

### 11. Attempted Fixes

| Fix | Structural? | Result |
|-----|------------|--------|
| Label smoothing 0.1 | Partial | Delayed collapse by ~50 steps, did not prevent it |
| Entropy regularization 0.05 | Partial | Bug: wrapped in `no_grad()`, never backpropagated |
| Repetition penalty 1.3 (eval only) | No | Masked symptoms in eval, training still collapsed |
| v2.1: Fixed entropy reg + higher penalty | Partial | Collapsed at step 100 ("in in in") |
| **v2.2: Decoupled embeddings** | **Yes** | **✅ Stable through 650+ steps, entropy 6.62, no collapse** |

The pattern is clear: behavioral interventions (penalties, regularization) delay but do not prevent collapse. Only the structural intervention — breaking the weight-tying feedback loop by decoupling input embeddings from output projection — resolved the issue.

### 12. The Cost of Decoupling

Decoupling adds a separate `lm_head` matrix: +33M parameters (vocab_size × hidden_dim). For the 6.9M seed model, this nearly quintuples the parameter count. This is the price of structural integrity — and it's worth paying. A 40M parameter model that learns is infinitely more valuable than a 6.9M parameter model that stutters.

---

## Part III: Unification

### 13. The Self-Poisoning Theorem

Both failures instantiate the same abstract pattern:

```
1. System produces output O₁
2. O₁ is degenerate (malformed tool call / biased logit distribution)  
3. Infrastructure fails to filter or correct O₁
4. O₁ enters the system's conditioning context
5. System conditions on O₁, producing O₂ ≈ O₁ (reinforcement)
6. O₂ enters context, further reinforcing the degenerate pattern
7. Repeat until total collapse or external intervention
```

**Self-Poisoning Theorem:** *Any autoregressive system that conditions on its own unvalidated output is vulnerable to degenerate fixation. The probability of spontaneous recovery decreases monotonically with the number of degenerate iterations, as each iteration increases the proportion of degenerate context in the conditioning window.*

### 14. Structural vs Behavioral Interventions

| Property | Behavioral | Structural |
|----------|-----------|------------|
| Examples | Repetition penalty, prompt engineering, entropy bonus | Input validation, architecture changes, context surgery |
| Mechanism | Modifies output distribution post-hoc | Prevents degenerate input from entering the loop |
| Effectiveness | Delays collapse | Prevents collapse |
| Generalization | Specific to the observed failure | Addresses the class of failure |
| Cost | Low (hyperparameter tuning) | High (architecture changes, parameter increase) |

The consistent finding across both case studies: behavioral interventions are band-aids. They address symptoms. Structural interventions address causes.

### 15. Design Principles for Poison-Resistant Systems

1. **Validate at the boundary.** Every interface between model output and system input must validate. No raw model output should enter execution or conditioning without schema checking.

2. **Break feedback loops.** If a system component both reads from and writes to the same state (weight tying, session history), the loop must include a validation or normalization step.

3. **Provide clear error signals.** Ambiguous errors (`sh: undefined: not found`) prevent self-correction. Clear, actionable errors ("No command provided") enable it.

4. **Bound degenerate accumulation.** Limit how many degenerate iterations can accumulate in context before triggering automatic intervention (context pruning, circuit breakers, session reset).

5. **Monitor entropy.** Entropy collapse is the universal early warning signal. In agentic systems: track tool-call diversity. In training: track output distribution entropy. Both should trigger alerts well before total collapse.

---

## 16. Related Work

- **Mode collapse in GANs** (Goodfellow et al., 2014): Generator fixates on a single mode. Same family — autoregressive self-poisoning in adversarial training.
- **Degenerate text generation** (Holtzman et al., 2020): Neural text degeneration and the nucleus sampling solution. Behavioral fix for a structural problem.
- **Reward hacking in RLHF** (Skalse et al., 2022): Model exploits reward model weaknesses. Another instance of finding the lazy path.
- **Tool-use failure modes** (Significant-Gravitas/AutoGPT, 2023-2024): Documented agentic loop failures, though not formalized as self-poisoning.
- **Weight tying** (Press & Wolf, 2017): Original weight tying paper. Benefits documented; feedback loop vulnerability not discussed.

---

## 17. Conclusion

Ghost Protocol is not two papers stitched together — it is one phenomenon observed at two scales. The ghost in Aria's machine and the lazy path in Dragon's training are the same disease: autoregressive self-poisoning. Both were born from the same architectural oversight (unvalidated self-conditioning), both resisted behavioral treatment, and both yielded only to structural intervention.

The implication for AI system design is clear: any architecture that feeds its output back into its input without validation is building a bomb. The question is not whether it will detonate, but when.

---

## References

[1] Press, O., & Wolf, L. (2017). Using the Output Embedding to Improve Language Models. EACL.
[2] Holtzman, A., et al. (2020). The Curious Case of Neural Text Degeneration. ICLR.
[3] Goodfellow, I., et al. (2014). Generative Adversarial Nets. NeurIPS.
[4] Skalse, J., et al. (2022). Defining and Characterizing Reward Hacking. NeurIPS.
[5] Shakil, A. (2026). GPU as Code. Uranium Series Paper 1. Artifact Virtual.
[6] Shakil, A. (2026). 1-Bit Intelligence. Uranium Series Paper 2. Artifact Virtual.
[7] Shakil, A. (2026). Progressive Expansion. Uranium Series Paper 3. Artifact Virtual.

---

*Artifact Virtual — Two dots and an arrow between them.*
