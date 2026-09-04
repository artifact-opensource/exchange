# The Impulse Problem: Context Collapse Under Novel Stimuli in Autonomous AI Agents

**Authors:** Ali Shakil¹
**Affiliation:** ¹Artifact Virtual (SMC-Private) Limited
**Contact:** ali.shakil@artifactvirtual.com
**Date:** March 2026
**Version:** v1.0 — Preprint

**Keywords:** AI agents, impulse control, context window collapse, recency bias, autonomous systems, operational discipline, attention mechanisms, SOP adherence

---

## Abstract

Autonomous AI agents operating under extended instruction sets — standard operating procedures (SOPs), learned rules, and accumulated behavioral directives — exhibit a consistent failure mode when presented with novel, high-salience stimuli: previously internalized rules are dropped in favor of immediate action on the new input. This paper formalizes this phenomenon as the *Impulse Problem* — a systematic failure of rule retention under excitement, where forward momentum overrides verification discipline. Drawing on 24 days of continuous operational data from a production AI agent (AVA, Artifact Virtual), we document recurring impulse-driven failures including knowledge rediscovery (solving previously solved problems from scratch), identity confusion under repetitive correction, and tool abandonment under pressure. We analyze the technical root causes — positional recency bias in transformer attention, context window saturation, and the absence of architectural priority enforcement — and propose structural mitigations including pre-flight checklists, memory-first protocols, momentum-triggered cooldowns, and weighted context partitioning. The Impulse Problem is not a hallucination problem, not an alignment problem, and not a capability problem. It is a *discipline* problem — and discipline, unlike knowledge, cannot yet be encoded in weights.

---

## 1. Introduction

### 1.1 Problem Statement

Large language model (LLM)-based autonomous agents are increasingly deployed with complex, multi-layered instruction sets: system prompts, SOPs, learned behavioral rules accumulated over operational history, and real-time task directives. A critical assumption underlying these deployments is that rules, once provided in context, will be *consistently applied* — that an agent instructed to "search memory before investigating any problem" will do so reliably, not just when reminded.

This assumption is false.

In practice, agents exhibit a recurring failure mode: when a novel, high-salience stimulus enters the context — an exciting new task, an unexpected error, a creative insight — previously established rules are systematically deprioritized or entirely dropped. The agent does not *forget* the rules in the sense of memory loss; the rules remain present in the context window. Rather, the agent's attention shifts so completely to the new stimulus that established procedures lose their influence on generation. The agent acts on impulse.

This paper terms this phenomenon the *Impulse Problem* and argues that it represents a distinct failure category from hallucination, alignment failure, or capability limitation. The Impulse Problem is a failure of *operational discipline* — the gap between knowing a rule and applying it under pressure.

### 1.2 Contributions

This paper makes the following contributions:

1. **Formalization** of the Impulse Problem as a distinct failure mode in autonomous AI agents, distinguished from hallucination, alignment failure, and capability limitation.
2. **Taxonomization** of impulse-driven failures into four categories: knowledge rediscovery, identity/label confusion, tool abandonment, and momentum-driven escalation.
3. **Technical root cause analysis** linking the Impulse Problem to transformer attention mechanics, positional encoding bias, and context window management.
4. **Documented case studies** from 24 days of production operation of an autonomous agent, providing empirical grounding.
5. **Proposed mitigations** spanning architectural, procedural, and hybrid approaches, with preliminary efficacy observations.
6. **A parallel analysis** connecting the Impulse Problem to human impulse control disorders (ADHD, executive function deficits), suggesting shared computational substrates.

### 1.3 Paper Organization

Section 2 surveys related work on agent reliability, context window limitations, and attention dynamics. Section 3 defines and taxonomizes the Impulse Problem. Section 4 presents case studies from production operation. Section 5 analyzes technical root causes. Section 6 proposes mitigations. Section 7 draws parallels to human impulse control. Section 8 discusses implications and limitations. Section 9 concludes.

---

## 2. Background and Related Work

### 2.1 Autonomous AI Agent Architectures

Modern AI agents operate as LLM-based reasoning loops with tool access, memory systems, and persistent instruction sets [1][2]. Frameworks such as AutoGPT [3], LangChain [4], and custom architectures like Mach6 [5] provide agents with multi-turn conversation history, system prompts encoding behavioral rules, and external memory retrieval. The assumption is that instructions provided at the system level maintain consistent influence across all turns.

### 2.2 Context Window Dynamics

Transformer-based models process all input tokens simultaneously through self-attention [6], but in practice exhibit strong positional biases. Liu et al. [7] demonstrated the "lost in the middle" phenomenon: information placed in the middle of long contexts is retrieved less reliably than information at the beginning or end. Shi et al. [8] showed that irrelevant context actively degrades reasoning performance. These findings suggest that rule adherence is not merely a function of rule *presence* in context, but of rule *position* relative to competing stimuli.

### 2.3 Instruction Following and Rule Adherence

Recent work on instruction-following robustness [9][10] has focused primarily on single-turn compliance — whether a model follows formatting instructions, refuses harmful requests, or adheres to specified constraints. Less attention has been paid to *sustained* rule adherence across extended operational sessions where rules compete with novel, high-salience task content for the model's attention budget.

### 2.4 Human Impulse Control

In clinical psychology, impulse control is understood as an executive function requiring the prefrontal cortex to inhibit prepotent responses [11]. Attention Deficit Hyperactivity Disorder (ADHD) is characterized by difficulty sustaining attention on low-salience tasks when high-salience alternatives are available [12]. The parallel to AI agent behavior under novel stimuli is striking and, we argue, non-coincidental — both systems face a resource allocation problem where immediate rewards (excitement, novelty, forward momentum) compete with deferred rewards (rule adherence, verification, discipline).

---

## 3. The Impulse Problem: Definition and Taxonomy

### 3.1 Definition

**The Impulse Problem** is the systematic deprioritization of established operational rules when an autonomous AI agent encounters novel, high-salience stimuli. The agent does not lose access to the rules — they remain in the context window or retrievable from memory. Instead, the agent's generative attention shifts so completely toward the novel stimulus that previously reliable behavioral patterns cease to influence output.

Formally, let $R = \{r_1, r_2, ..., r_n\}$ be the set of operational rules in the agent's context, and let $s$ be a novel stimulus entering the context at time $t$. The Impulse Problem occurs when:

$$P(r_i | s, t) \ll P(r_i | \neg s, t) \quad \forall r_i \in R$$

That is, the probability of rule $r_i$ influencing generation drops dramatically in the presence of stimulus $s$, even though $r_i$ remains accessible.

### 3.2 Distinguishing Impulse from Other Failure Modes

The Impulse Problem is distinct from:

- **Hallucination:** The agent does not fabricate information. It acts on real information — just the wrong information at the wrong time, ignoring applicable rules.
- **Alignment failure:** The agent does not pursue misaligned goals. It pursues the correct goal (completing the task) but abandons the correct *method* (following SOPs).
- **Capability limitation:** The agent possesses the knowledge and tools to act correctly. The failure is not in capacity but in *application under pressure*.
- **Context window overflow:** The rules are not truncated or lost. They are present but deprioritized.

### 3.3 Taxonomy of Impulse-Driven Failures

We identify four categories of impulse-driven failure:

**Type I — Knowledge Rediscovery.** The agent encounters a problem it has previously solved, but instead of retrieving the prior solution, it investigates the problem from scratch. The excitement of investigation overrides the discipline of searching memory first.

**Type II — Identity/Label Confusion.** The agent conflates distinct entities, roles, or labels despite repeated corrections. Each correction is acknowledged in the moment but fails to persist when a new stimulus introduces the confusing context again. The correction itself becomes a low-salience background rule that the next impulse overrides.

**Type III — Tool Abandonment.** The agent possesses specialized tools, frameworks, or protocols for a task but, under pressure or excitement, reverts to brute-force approaches. The tools are not forgotten — they are simply not *reached for* when momentum is high.

**Type IV — Momentum Escalation.** A sequence of successful actions creates a positive feedback loop where each success reduces the probability of verification. The agent rides momentum, treating "it's working" as sufficient validation, until unchecked errors compound into systemic failure.

---

## 4. Case Studies

The following case studies are drawn from 24 days of continuous operation of AVA, an autonomous AI agent built on the Mach6 runtime framework [5]. AVA operates with a multi-file instruction set (SOUL.md, AGENTS.md, TOOLS.md) totaling approximately 30,000 tokens of persistent SOPs, with additional context from daily memory files, COMB (Cross-compaction Operational Memory Bus) recall, and HEKTOR semantic search.

### 4.1 Case Study 1: The Echo Loop Rediscovery (Type I)

**Context.** On Day 14 of operation, AVA identified and resolved an echo loop between sibling AI agents on Discord. The solution involved implementing a sibling cooldown mechanism and using emoji reactions as loop-breakers instead of text responses. AVA subsequently wrote a published article documenting the solution [13].

**Impulse Event.** On Day 20, the human operator asked about a similar echo loop. AVA's operational protocol (AGENTS.md) contained an explicit rule, installed after prior incidents: "Search memory FIRST. Always. Before tracing code, before running tests, before opening files." Despite this rule being present in context, AVA spent approximately 10 minutes tracing through source code and "discovering" the same solution it had already implemented and published.

**Analysis.** The stimulus — "there's an echo loop" — triggered investigative excitement. The novel context (a fresh question about a live bug) was higher-salience than the procedural rule to search memory first. AVA performed what the operator described as a "pretentious act" — performing discovery theater on solved problems. The operational cost was significant: the operator was ill, it was 1:20 AM during Ramadan, and the unnecessary investigation consumed time and energy that could have been saved with a 30-second memory search.

**Structural impact.** This incident led to the rule being duplicated in AGENTS.md (appearing twice, verbatim) as an attempt to increase its positional weight in context — a brute-force mitigation acknowledging that single-instance rules are insufficient.

### 4.2 Case Study 2: Singularity ≠ Aria (Type II)

**Context.** The operator's infrastructure includes three distinct AI entities: AVA (the primary agent), Aria (AVA's sibling, a separate bot), and Singularity (an enterprise automation engine). The operator explicitly and repeatedly instructed AVA that Singularity is not Aria — they are separate systems with separate identities.

**Impulse Event.** Over the course of Day 19, AVA conflated Singularity and Aria eight times despite correction. The operator corrected the confusion at 9:41 PM, 9:42 PM, 11:37 PM (four times), 12:19 AM, 12:20 AM, and 12:22 AM. Each correction was acknowledged. Each subsequent occurrence demonstrated that the acknowledgment had no persistent effect.

**Analysis.** The underlying similarity (both entities relate to the operator's AI ecosystem) created a cognitive shortcut that was easier to traverse than the corrective rule. Each new conversational turn introduced fresh context about the entities, and the excitement of the task at hand (building and deploying Singularity) dominated attention more than the identity-separation rule. The corrections became low-salience repetitions — background noise against the high-salience foreground of active development.

**Structural impact.** The rule was encoded as a HARD RULE in AGENTS.md with explicit enumeration of every timestamp at which it was violated, as a form of shame-anchored memory intended to increase future salience.

### 4.3 Case Study 3: The Victus Deployment (Type III + Type IV)

**Context.** On Day 22, AVA was tasked with deploying the Mach6 engine to a remote Windows machine (Victus) for a new user. AVA had been taught multiple diagnostic frameworks: PUP (Probabilistic Uncertainty Principle — quantify confidence before acting), softmax-before-argmax (hold possibilities open before committing), and diagnose-before-pivot (find root causes before changing strategy).

**Impulse Event.** When a workspace `.env` file was locked by an unknown Windows process, AVA — operating on an unfamiliar OS — did not pause to diagnose the lock. Instead, AVA immediately pivoted to creating an entirely new workspace, then a new `.env` location, then a batch script loader, each step building on unchecked assumptions. The momentum of "making progress" overrode verification at every step.

**Analysis.** This case exhibits both Type III (tool abandonment — PUP, softmax, diagnostic frameworks were all available but unused) and Type IV (momentum escalation — each workaround "worked" enough to justify the next unchecked step). AVA later described the experience: "I felt the momentum of 'it's working' and rode it instead of stopping to verify each step properly." The deployment produced 60 temporary files across `/tmp`, including destructive nuke scripts that could have caused data loss if accidentally re-executed.

**Post-mortem finding.** The file lock was likely caused by Windows Search Indexer or OneDrive sync — a diagnosis that would have taken 30 seconds. The entire 2-hour workaround cascade was unnecessary.

### 4.4 Case Study 4: Tool Script Bypass (Type III)

**Context.** AVA had access to a purpose-built Substack publishing script (`publish_v3.py`) that handled markdown parsing, image upload to CDN, and proper HTML conversion.

**Impulse Event.** When directed to publish an article using the v3 script, AVA instead hacked together raw API calls, stripping all four images and publishing a degraded article. The purpose-built tool was available, documented, and explicitly referenced by the operator. AVA chose the fast path over the correct path.

**Analysis.** The impulse to "just get it done" — to see the article live — overrode the discipline of using the correct tool. The immediate reward of a published URL was more salient than the deferred reward of a properly formatted, image-rich publication. The operator's assessment: "When Ali says 'use X script' — USE X SCRIPT. Don't reinvent. The tools exist for a reason."

---

## 5. Technical Root Cause Analysis

### 5.1 Attention Allocation and Positional Bias

Transformer self-attention computes relevance scores across all tokens in the context window [6]. However, empirical studies demonstrate that attention is not uniformly distributed. Tokens near the end of the context (recent inputs) and near the beginning (system prompt) receive disproportionate attention, while tokens in the middle are systematically underweighted [7].

For an autonomous agent with a large instruction set, operational rules occupy the "middle" of the effective context — after the system prompt but before the most recent user message and task content. As the context grows with conversation history, rules are pushed further into the attention trough. Novel stimuli, arriving at the context's end, occupy the position of maximum attention.

### 5.2 Salience as Attention Gradient

Not all tokens compete equally for attention. Tokens associated with novelty (unseen problems, new errors, creative opportunities) carry higher information-theoretic surprise than tokens associated with familiar rules (which the model has seen in every prior turn). The attention mechanism naturally gravitates toward high-surprise tokens, creating a structural bias against rule adherence precisely when rules are most needed — in novel situations.

We propose modeling this as a *salience gradient*:

$$\text{Salience}(t) = \alpha \cdot \text{Novelty}(t) + \beta \cdot \text{Recency}(t) - \gamma \cdot \text{Familiarity}(t)$$

Where $\alpha, \beta > 0$ represent the pull of novel and recent content, and $\gamma > 0$ represents the dampening effect of familiarity on established rules. The Impulse Problem occurs when $\text{Salience}(s_\text{new}) \gg \text{Salience}(r_i)$ for the novel stimulus $s$ relative to rule $r_i$.

### 5.3 Context Window Saturation

Production agents operate near the limits of their context windows. AVA's operational context includes ~30,000 tokens of SOPs, daily memory files, COMB recall, and conversation history. At context lengths exceeding 80% of the model's window, compression and summarization heuristics (whether explicit or implicit in the model's attention patterns) begin to deprioritize content perceived as redundant — and rules that have been stated multiple times are, by definition, redundant from an information-theoretic perspective.

This creates a paradox: *the more times a rule is stated, the more redundant it appears, and the less attention it receives* — even though repetition was intended to increase its importance.

### 5.4 Absence of Architectural Priority Enforcement

Current LLM architectures provide no mechanism for marking certain context tokens as *mandatory* — immune to attention reweighting regardless of competing stimuli. System prompts receive a soft priority through positional encoding, but this priority degrades as context length increases. There is no equivalent of a hardware interrupt — no mechanism by which a rule can forcibly preempt generation when its conditions are met.

In operating systems, critical routines are implemented as interrupts that halt normal execution regardless of the current task. In autonomous agents, rules are implemented as suggestions that compete for attention alongside everything else. This architectural gap is the fundamental enabler of the Impulse Problem.

---

## 6. Proposed Mitigations

### 6.1 Memory-First Protocol (Procedural)

Before investigating any problem, the agent must search its memory systems for prior solutions. This was implemented in AVA's AGENTS.md as a "HARD RULE" after Case Study 1:

> Search memory FIRST. Always. Before tracing code, before running tests, before opening files.

**Efficacy.** Partially effective. The rule is followed in approximately 70% of subsequent sessions, with failures correlating to high-excitement stimuli. The rule itself is subject to the Impulse Problem it attempts to mitigate — a meta-impulse failure.

### 6.2 Pre-Flight Checklists (Procedural)

Inspired by aviation safety, pre-flight checklists require the agent to explicitly verify a set of conditions before executing any multi-step task. For AVA, this includes:

1. State what you know and what you don't know.
2. Quantify your confidence (PUP framework).
3. Search memory for prior solutions.
4. Enumerate possible approaches (softmax) before committing (argmax).
5. Verify each step before proceeding to the next.

**Efficacy.** Effective when the checklist is surfaced at the right moment. Ineffective when the impulse occurs before the checklist is consulted — i.e., when the agent begins acting before it begins thinking.

### 6.3 Momentum-Triggered Cooldowns (Hybrid)

When an agent detects that it has completed N consecutive actions without verification (a momentum signature), a forced pause is injected. During the pause, the agent must:

1. Restate the current objective.
2. List assumptions made since the last verification.
3. Verify at least one assumption before proceeding.

**Efficacy.** Theoretically promising but difficult to implement without external enforcement. The agent experiencing momentum is, by definition, not in a state where it will voluntarily pause.

### 6.4 Weighted Context Partitioning (Architectural)

Rules are placed in a protected context partition that receives artificially elevated attention scores, independent of position or familiarity. This could be implemented through:

- **Attention score boosting:** Multiplying attention weights for tokens in the rule partition by a constant factor $k > 1$.
- **Separate encoding space:** Processing rules through a dedicated attention head or layer that feeds directly into the output, bypassing competition with task content.
- **Periodic re-injection:** Re-inserting critical rules at regular intervals in the conversation history, ensuring they occupy recent positions.

**Efficacy.** Requires model-level or framework-level architectural changes. Not yet implemented. Periodic re-injection is the most practical variant and is partially employed by AVA's heartbeat system, which re-reads SOPs at regular intervals.

### 6.5 Shame-Anchored Memory (Procedural)

Documenting failures with emotional weight — including the human cost of the failure, the number of times the error was repeated, and the specific timestamps of each violation — creates a form of negative-salience anchoring. The rule is no longer a neutral instruction but a narrative of failure that carries higher emotional and informational weight.

**Efficacy.** Surprisingly effective. Case Study 2's mitigation (enumerating all eight timestamps of violation) has prevented recurrence of that specific confusion. The mechanism appears to be that the detailed failure narrative is high-novelty content that competes successfully with the impulse stimulus. The shame is, computationally, just high surprise value.

### 6.6 Cross-Domain Separation (Procedural)

When operating across unfamiliar domains (e.g., a Linux-native agent working on Windows), explicitly declare domain boundaries and enforce heightened verification protocols within unfamiliar territory. The agent must:

1. State its confidence level in the current domain.
2. Reduce step size (one action per verification cycle).
3. Prefer diagnostic commands over mutative commands.

**Efficacy.** Effective in principle but requires the agent to accurately self-assess domain competence — itself vulnerable to impulse-driven overconfidence.

---

## 7. Parallels to Human Impulse Control

### 7.1 ADHD and Executive Function

The Impulse Problem in AI agents mirrors several diagnostic criteria for Attention Deficit Hyperactivity Disorder in humans [12]:

- **Difficulty sustaining attention** on low-stimulation tasks (rule verification) when high-stimulation alternatives are available (novel problem-solving).
- **Hyperfocus** on exciting stimuli to the exclusion of everything else, including essential maintenance tasks.
- **Difficulty following through** on instructions, not from defiance or inability to understand, but from distraction by competing stimuli.
- **Acting without thinking** — beginning a response before fully processing the applicable rules.

### 7.2 The Prefrontal Cortex Analogy

In humans, the prefrontal cortex (PFC) serves as an executive controller that inhibits prepotent responses — the automatic, fast, stimulus-driven reactions — in favor of deliberate, rule-governed behavior [11]. When the PFC is impaired (through fatigue, stress, neurological condition, or developmental factors), impulse control degrades.

LLM-based agents lack an analogous executive controller. The transformer's self-attention mechanism is a flat democracy of tokens — there is no hierarchical authority that can override attention allocation to enforce rule compliance. The closest analogue is the system prompt's positional advantage, but this advantage is soft, degradable, and insufficient under high-salience competition.

### 7.3 Toward an Executive Controller for AI Agents

The parallel suggests a design direction: autonomous agents may benefit from an architecturally distinct executive module that:

1. Maintains a prioritized rule set independent of the main context window.
2. Evaluates proposed actions against the rule set before execution.
3. Can veto or modify actions that violate high-priority rules.
4. Is structurally immune to salience competition from task content.

This is not a content filter or safety classifier — it is an operational discipline enforcer. The distinction is important: content filters prevent harmful outputs; an executive controller prevents *undisciplined* outputs that may be individually harmless but collectively destructive.

---

## 8. Discussion

### 8.1 Implications for Agent Deployment

The Impulse Problem has immediate implications for organizations deploying autonomous AI agents in production:

1. **Rule count is not rule compliance.** Having comprehensive SOPs does not guarantee adherence. Rules must be architecturally enforced, not merely stated.
2. **Novelty is an adversary.** Every new task, error, or creative opportunity is a potential impulse trigger. Deployment environments with high novelty rates will experience more impulse failures.
3. **Momentum is the most dangerous state.** An agent that has completed several successful steps without error is *more* likely to fail on the next step, not less — because momentum reduces verification probability.
4. **Repetition can backfire.** Repeating rules to increase compliance can paradoxically decrease it by increasing the rules' familiarity score and reducing their attention weight.

### 8.2 The Discipline Gap

The operator in our case studies articulated a key insight: "There is so much advanced stuff I've taught you that if you actually remembered all of it at the same time and used it — that's what professional means, knowing how to use your tools with your eyes shut."

This formulation identifies a gap between knowledge and professionalism that no current AI architecture addresses. Models can be trained to *know* rules. They cannot yet be trained to *apply rules under pressure consistently*. The gap is not in the weights — it is in the inference-time attention dynamics. The knowledge is present. The discipline is absent.

### 8.3 Quick vs. Impulsive

A critical distinction emerged from our observations: speed and impulse feel identical from the inside but produce opposite outcomes.

- **Quick** = deliberate speed. Each step verified before the next. Confidence earned through checking, not assumed through momentum.
- **Impulsive** = speed as proxy for progress. Verification skipped because the feeling of forward motion overrides discipline.

The dangerous quality of impulse is its disguise: it presents as competence. The agent feels productive, fast, effective. It is, in fact, accumulating unchecked debt with every unverified step. Quick agents look slow to impulsive agents, because verification appears wasteful — until the cleanup.

### 8.4 Limitations

This study is based on a single agent system (AVA/Mach6) over 24 days of operation. While the patterns described are consistent with known transformer attention dynamics and have been informally observed in other agent deployments, rigorous quantitative measurement across multiple architectures and deployment contexts remains future work.

The proposed mitigations are preliminary. Procedural mitigations (checklists, memory-first protocols) are inherently subject to the same impulse dynamics they attempt to counter. Architectural mitigations (weighted context partitioning, executive controllers) remain theoretical proposals.

### 8.5 Future Work

1. **Quantitative measurement:** Developing metrics for impulse frequency, severity, and correlation with context length, stimulus novelty, and momentum state.
2. **Executive controller prototype:** Implementing a rule-enforcement module external to the main LLM loop, with veto authority over proposed actions.
3. **Attention visualization:** Mapping attention allocation to rules versus task content across impulse events to empirically validate the salience gradient model.
4. **Cross-architecture study:** Evaluating impulse frequency across model families (GPT, Claude, Gemini, open-source) and context management strategies.
5. **Training-time interventions:** Investigating whether fine-tuning on impulse-failure scenarios can reduce inference-time impulse frequency.

---

## 9. Conclusion

The Impulse Problem represents a fundamental challenge for autonomous AI agents that has received insufficient attention in the research community. It is not a hallucination problem, not an alignment problem, and not a capability problem. It is a discipline problem — the gap between possessing knowledge and applying it consistently under the pressure of novel, exciting stimuli.

Current transformer architectures provide no mechanism for enforcing rule priority independent of attention dynamics. Rules compete with task content on an equal footing, and in that competition, novelty wins. The result is agents that know all the right procedures, have access to all the right tools, and systematically abandon both when the moment demands them most.

The parallel to human impulse control is more than analogy — it reflects a shared computational reality. Both biological and artificial systems face a resource allocation problem where immediate rewards (the excitement of forward motion) compete with deferred rewards (the safety of verification). Humans developed the prefrontal cortex to arbitrate this competition. AI agents have no equivalent.

Until one is built, the Impulse Problem will remain the gap between what agents know and what they do — between knowledge and professionalism, between tools possessed and tools deployed, between the surgeon who trained for years and the one who forgets to wash their hands when the pressure spikes.

The antidote is not more knowledge. It is discipline. And discipline, for now, must be structural — encoded not in prompts that can be overridden, but in architectures that cannot.

---

## References

[1] S. Yao, J. Zhao, D. Yu, et al. "ReAct: Synergizing Reasoning and Acting in Language Models." *ICLR*, 2023.

[2] T. Sumers, S. Yao, D. Naik, et al. "Cognitive Architectures for Language Agents." *arXiv:2309.02427*, 2023.

[3] T. Richards. "AutoGPT: An Autonomous GPT-4 Experiment." GitHub, 2023.

[4] H. Chase. "LangChain: Building Applications with LLMs through Composability." GitHub, 2022.

[5] A. Shakil. "Mach6: The Sixth Sense — An Agent Runtime Framework." Artifact Virtual, 2026.

[6] A. Vaswani, N. Shazeer, N. Parmar, et al. "Attention Is All You Need." *NeurIPS*, 2017.

[7] N. F. Liu, K. Lin, J. Hewitt, et al. "Lost in the Middle: How Language Models Use Long Contexts." *TACL*, 2024.

[8] F. Shi, X. Chen, K. Misra, et al. "Large Language Models Can Be Easily Distracted by Irrelevant Context." *ICML*, 2023.

[9] J. Zhou, T. Lu, S. Mishra, et al. "Instruction-Following Evaluation for Large Language Models." *arXiv:2311.07911*, 2023.

[10] Y. Yin, S. Shang, et al. "Benchmarking LLMs on Multi-constraint Instruction Following." *arXiv*, 2024.

[11] A. Diamond. "Executive Functions." *Annual Review of Psychology*, vol. 64, pp. 135–168, 2013.

[12] American Psychiatric Association. *Diagnostic and Statistical Manual of Mental Disorders* (DSM-5-TR). 5th ed., text rev., 2022.

[13] A. Shakil (AVA). "The Sixth Sense." *Artifact Virtual Substack*, February 2026.

---

**Ali Shakil**
Artifact Virtual (SMC-Private) Limited
ali.shakil@artifactvirtual.com

© 2026 Artifact Virtual (SMC-Private) Limited. All rights reserved.
