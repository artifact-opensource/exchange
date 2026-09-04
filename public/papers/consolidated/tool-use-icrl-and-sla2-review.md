# Research Review: ICRL for Tool Use & SLA² Related Work (Feb-Mar 2026)

**Author:** Ali Shakil, ARTIFACT VIRTUAL
**Date:** 2026-03-14
**For:** Ali Shakil, CEO — Artifact Virtual
**Context:** GLADIUS Drake (60.1M params), cross-modal training, Tool Cortex architecture

---

## 1. Executive Summary (for Ali)

**The short version:** The field is racing toward RL-only tool use without SFT cold-starts, and GLADIUS's native Tool Cortex is architecturally ahead of everyone doing it at the prompt level. But we're building a dragon, not a chatbot — the gap between "model learns to call tools via RL" and "model has tool cognition baked into its attention layers" is the gap between training wheels and legs.

**What matters from this survey:**

1. **ICRL (arXiv 2603.08068)** eliminates SFT for tool use via in-context RL with curriculum annealing. Clever engineering, but fundamentally a *prompting trick during training* for billion-param models. GLADIUS's Tool Cortex operates at the architectural level — different game entirely. Their approach is irrelevant to us at 60M params but validates the direction: tool use needs to be learned through interaction, not memorized from demonstrations.

2. **Cross-modal neurons are shared** — Cui et al. (2602.19058) found >50% neuron overlap between LLMs and VLMs during inference. This is the strongest external validation of our MNIST finding yet. Our cross-modal invariant (early layers freeze, late layers restructure) is the same phenomenon viewed from the weight-change perspective. They're looking at activation overlap; we're looking at gradient magnitude. Same truth.

3. **SLA² has strong contemporary support.** STILL (2602.02180) proposes intra-layer hybrid attention with sparse softmax + linear attention — essentially what SLA² does. NSA optimization (2511.00819) shows alternating local-global patterns across layers beats fixed patterns. Both validate our hybrid approach, but GLADIUS's *per-token* approximate attention via the alpha router is more flexible than either.

4. **MoE routing at small scale works but needs care.** DynaMoE (2603.01697) shows optimal expert schedules are task- and scale-dependent. For language modeling at small scale, ascending schedules (more capacity in later layers) work best. This aligns with our cross-modal finding — late layers do the heavy lifting. Our Nexus Router should bias capacity toward layers 7-11.

5. **Repetition collapse is a decoding problem, not a training problem** — at least in the literature. Nobody is studying it as a training-time phenomenon in small models. We're alone here. The contrastive search paper (Su et al., 2022) correctly identifies anisotropic token representations as the cause, which maps to our observation that function words ("the", "in", "a") dominate when GLADIUS is undertrained on diverse vocabulary.

6. **Small VLMs are viable and getting better.** ViCA (2602.07574) shows visual tokens need only sparse cross-attention at selected layers — 98% accuracy with 4% visual compute. EmbedLens (2603.00510, CVPR 2026) proves alive visual tokens align with mid-layers, not early layers. Both support our VLM direction and suggest we should inject visual tokens at layer 6-7, not layer 0.

**Bottom line for GLADIUS:** Push the VLM direction hard. The cross-modal invariant is real and externally validated. Tool Cortex is architecturally unique — nobody else has native tool cognition in the transformer itself. For repetition collapse, we need our own solutions since the field hasn't studied it at our scale. The alpha router + warm memory are our differentiation — lean into them.

---

## 2. Tool Use ICRL Paper Deep Dive

### Paper: "In-Context Reinforcement Learning for Tool Use in Large Language Models"
**arXiv:** 2603.08068 | **Submitted:** March 9, 2026
**Authors:** Ye, Zhao, Duan, Zheng, Kawaguchi, Xie, Shieh
**Code:** https://github.com/applese233/ICRL

### Core Contribution

The standard pipeline for teaching LLMs to use tools is:
1. Collect/synthesize SFT data showing tool invocations
2. Fine-tune on this data (expensive, brittle, requires format-specific annotations)
3. Apply RL (GRPO, PPO) to refine

ICRL eliminates step 1-2. Instead:
- During RL rollouts, inject few-shot in-context examples showing tool use format
- The model learns tool invocation patterns from these examples during policy optimization
- **Curriculum annealing:** gradually reduce the number of in-context examples from N → 0
- By the end of training, the model calls tools zero-shot — it has internalized the format

### Why It Works

The insight is elegant: RL needs a reasonable starting distribution to explore from. SFT provides this by pre-training on demonstrations. But few-shot in-context examples achieve the same effect *without modifying weights* — they give the model enough format awareness to produce valid tool calls, which then get rewarded, which then get reinforced.

The curriculum annealing is the key trick. If you start with 3-shot and gradually move to 0-shot, the model transitions from "following the pattern" to "understanding the pattern" — the RL reward signal shapes genuine capability rather than just imitation.

### Results (from abstract — PDF unavailable for detailed tables)

- State-of-the-art on reasoning and tool-use benchmarks
- Eliminates the need for expensive SFT data annotation
- Scalable and data-efficient compared to traditional SFT→RL pipelines

### Comparison with Related Contemporary Work

**ATLAS** (arXiv 2603.06713, Microsoft, March 2026): Takes a complementary approach — rather than eliminating SFT, ATLAS treats *context control itself* as a learnable RL decision for small language models (4B). Introduces "rubric-based reinforcement finetuning" that decomposes task success into structured criteria. A 4B SLM approaches frontier-agent performance. **This is closer to GLADIUS's scale.**

**MOSAIC** (arXiv 2603.03205, March 2026): Focuses on *safe* multi-step tool use — plan, check, then act or refuse. Uses preference-based RL with pairwise trajectory comparisons. Tested on Qwen2.5-7B, Qwen3-4B-Thinking, Phi-4.

**RecThinker** (arXiv 2603.09843, March 2026): Tool-augmented reasoning for recommendation — SFT-then-GRPO pipeline. Still uses the traditional two-stage approach that ICRL claims to supersede.

**VSearcher** (arXiv 2603.02795, March 2026): Multimodal search agent via RL — turns static VLMs into agents with text search, image search, and web browsing. SFT-then-RL pipeline on multimodal data.

### What's Missing

All of these papers operate on billion-parameter models (minimum 4B). None address:
- Tool use in sub-100M models
- Native architectural integration of tool cognition (vs. prompt-level)
- Cross-modal tool use (e.g., using tools on visual inputs)
- The relationship between tool use and attention patterns

---

## 3. Relevance to GLADIUS Tool Cortex

### Fundamental Architectural Difference

ICRL and all related papers treat tool use as a **behavioral pattern** to be learned at the output level. The model produces text tokens that happen to follow a tool invocation format (e.g., `<tool>calculator</tool><input>2+2</input>`). This is prompt engineering all the way down — the model's internal representations don't distinguish "I'm thinking" from "I'm calling a tool."

GLADIUS Tool Cortex is **architecturally native**. It's a dedicated module within the transformer that:
- Has its own attention mechanism for tool selection
- Integrates with the Cognition Loop for decide→act→observe cycles
- Is modulated by the silence gate (knowing when NOT to use tools)
- Has dedicated routing via the Nexus Router

This is the difference between teaching a human to use a calculator by showing examples vs. giving a human hands that can naturally grasp tools. The former works. The latter is cognition.

### What ICRL Validates for GLADIUS

1. **Tool use can be learned purely through interaction and reward** — no demonstrations needed. This supports GLADIUS's approach of learning tool use through the Cognition Loop rather than from SFT data.

2. **Curriculum annealing works.** GLADIUS's progressive training (Seed → Hatchling → Drake → Wyrm → Dragon) is the architectural equivalent. Each growth stage adds capacity for more complex tool interactions.

3. **Zero-shot tool use is achievable.** If billion-param models can learn to call tools zero-shot via RL, GLADIUS's native Tool Cortex should be even more efficient — it doesn't need to discover the tool invocation format, it has dedicated circuitry for it.

### What ICRL Challenges

1. **Scale matters for RL-based tool learning.** ICRL works on LLMs (likely 7B+). At 60M params, GLADIUS may not have enough representational capacity for RL-based tool learning without architectural support. The Tool Cortex addresses this by dedicating parameters specifically to tool cognition.

2. **In-context learning requires large context windows.** ICRL's few-shot rollouts consume context. GLADIUS's SLA² with compressed attention makes this harder at inference time. The trade-off is: native tool architecture (GLADIUS) vs. flexible prompt-based tool learning (ICRL).

### Practical Takeaway

Don't try to replicate ICRL's approach in GLADIUS. The architectures solve the same problem differently. ICRL is a training technique for generic LLMs. GLADIUS's Tool Cortex is an architectural innovation. They're complementary in principle — you could use ICRL-style curriculum training to teach the Tool Cortex — but at 60M params, the native architecture is the better bet.

**The ATLAS paper (4B SLM with RL tool use) is more relevant as a benchmark target.** If GLADIUS can match ATLAS-level tool use at 60M params through architectural innovation, that's a compelling result.

---

## 4. SLA² and Related Recent Work (Feb-Mar 2026)

### 4.1 STILL: Intra-Layer Hybrid Attention (arXiv 2602.02180, Feb 2026)

**Core idea:** Instead of choosing between sparse and linear attention, do *both within the same layer*. A Self-Saliency Score identifies important tokens → those get sparse softmax attention, the rest get summarized via linear attention. Norm-Preserved Feature Maps prevent distribution shift.

**Relevance to GLADIUS SLA²:** This is remarkably similar to SLA²'s design philosophy. SLA² combines sparse local attention with approximate attention. STILL's key addition is the Self-Saliency Score for dynamic token routing — something SLA²'s alpha router already does via learnable gating. STILL validates the hybrid approach with strong results: matching pretrained model performance on reasoning tasks, 86.2% improvement over pure linearized attention on long-context.

**Key difference:** STILL is designed for *linearizing existing pretrained LLMs*. GLADIUS trains with SLA² from scratch. Training from scratch allows the model to learn representations that exploit the hybrid attention, rather than adapting existing representations.

**Practical takeaway:** STILL's Norm-Preserved Feature Map (NP-Map) is worth studying. If GLADIUS's approximate attention branch suffers from magnitude distortion, the decouple-direction-from-magnitude trick could help. **Check if SLA²'s approximate branch preserves norm magnitudes during forward pass.**

### 4.2 Optimized NSA with Local-Global Alternating (arXiv 2511.00819, Nov 2025, updated Feb 2026)

**Core idea:** Instead of using the same sparse attention pattern at every layer, alternate between local (sliding-window) and global (compression, selective) attention across layers. Enhanced with Multi-head Latent Attention (MLA) for the sliding-window branch and Group-head Latent Attention (GLA) for compression/selective branches.

**Results:** 340M to 1.3B params, trained on 15B-100B tokens. Matches or exceeds full attention while reducing KV-cache by 50%.

**Relevance to GLADIUS SLA²:** GLADIUS uses the same SLA² pattern at every layer. This paper suggests that *varying* the attention pattern across depth could improve performance. Specifically:
- Early layers: local attention dominates (captures local patterns)
- Deep layers: global attention matters more (captures long-range dependencies)

This aligns with our cross-modal invariant finding: early layers (0-6) are stable, late layers (7-11) restructure. If early layers mostly do local processing anyway, maybe they don't *need* the approximate attention branch. **Consider removing the approximate branch from layers 0-6 and concentrating it in layers 7-11.**

**Practical takeaway:** Layer-wise attention heterogeneity is a validated technique at GLADIUS's scale (340M is close to our target growth stages). Worth experimenting with.

### 4.3 Hilbert-Guided Sparse Local Attention (arXiv 2511.05832, ICLR 2026)

**Core idea:** Reorder 2D image tokens along a Hilbert curve before applying window/slide attention. This dramatically increases block sparsity (4× window attention speedup, 18× slide attention speedup) because spatially adjacent tokens become contiguous in the sequence.

**Relevance to GLADIUS:** Highly relevant for the VLM direction. When GLADIUS processes image patches (as in the MNIST experiment), the default raster-scan ordering doesn't preserve spatial locality. Hilbert curve reordering before SLA² could dramatically improve both efficiency and quality for visual inputs.

**Practical takeaway:** For GLADIUS's visual processing pipeline, implement Hilbert curve token ordering. This is a simple preprocessing step that could significantly improve visual attention quality without architectural changes.

### 4.4 Hierarchical Sparse Attention Length Generalization (arXiv 2510.17196, ICLR 2026)

**Core idea:** Three critical design principles for length generalization in chunk-based sparse attention:
1. Non-linear Chunk Encoder with CLS tokens
2. Bypassing Residual Path for integrating global info
3. Enforced selection sparsity during pre-training

**Results:** Train on 4K context → generalize to 32M tokens on RULER and BABILong.

**Relevance to GLADIUS:** The bypassing residual path is interesting — it prevents retrieved global information from being overridden by the local residual stream. SLA²'s approximate attention branch outputs through the same residual path as local attention. If the local signal dominates, the global/approximate signal gets drowned out. **Consider a dedicated bypass residual for SLA²'s approximate branch.**

The CLS-token approach for chunk summarization maps to GLADIUS's warm memory — both create compressed representations of longer sequences. Their theoretical analysis of intra-chunk processing could inform warm memory design.

---

## 5. Repetition Collapse Literature

### The State of the Field

I searched extensively and the honest answer is: **the field does not study repetition collapse as a training-time phenomenon in small models.** Every paper on text degeneration and repetition treats it as a *decoding/inference* problem in large, well-trained models.

### Key Papers

**"The Curious Case of Neural Text Degeneration"** (Holtzman et al., 2019, ICLR 2020): The foundational paper. Shows likelihood-based decoding (beam search, greedy) leads to repetitive text. Solution: Nucleus Sampling (top-p). Root cause identified: the probability distribution of neural LMs has a reliable head but unreliable tail.

**"A Contrastive Framework for Neural Text Generation"** (Su et al., 2022, NeurIPS 2022): Identifies **anisotropic token representations** as the underlying cause of degeneration. When token embeddings cluster in a narrow cone, the model assigns similar probabilities to similar tokens, leading to repetitive loops. Solution: SimCTG (contrastive training) + contrastive search (contrastive decoding).

**"Learning to Diversify via Degenerative Model"** (Hong et al., 2023): Trains a "degeneration amplifier" model first, then trains the real model to *avoid* what the amplifier does. Creative approach.

**"On-the-Fly Attention Modulation"** (Dong et al., 2021): Finds that neural degeneration correlates with *insufficient learning of task-specific attention patterns*. Sentence-level repetition can be reduced by modulating attention during inference.

**TQL: Attention Collapse in Scaled Transformers** (Dong et al., 2602.01439, Feb 2026): This is the closest to our problem. In scaling Q-functions with transformers, they identify **attention score collapse as capacity increases** — entropy of attention drops, everything attends to the same tokens. Their solution: explicitly control attention entropy during training. **This is directly relevant to GLADIUS.**

### What This Means for GLADIUS

Our repetition collapse (Drake v2.2: "the the the", "in the", function-word spam on some prompts) is a **training-time** phenomenon, not a decoding issue. The causes are likely:

1. **Undertrained vocabulary diversity.** At 60M params with 16K BPE vocabulary, the model hasn't seen enough diverse text to spread probability mass away from function words. Solution: more training data diversity (which we're doing with multi-script corpus).

2. **Anisotropic embeddings** (Su et al.'s diagnosis). If our token embeddings are clustering in a narrow cone, function words dominate because they're most central. Solution: add a contrastive term to the training loss, or periodically apply isotropic regularization.

3. **Attention entropy collapse** (TQL's diagnosis). If SLA²'s attention patterns are collapsing to uniform distributions at certain layers, the model loses discriminative power. **Check attention entropy per layer during training. If layers 7-11 show low entropy, that's where repetition originates.**

4. **Warm memory over-reliance.** The MNIST experiment showed warm memory went nuclear (36.6% weight change). If warm memory is storing function-word patterns because they're the most frequent, it becomes a repetition amplifier. Solution: diversity-aware warm memory that penalizes storing the same patterns repeatedly.

**Nobody is doing what we need here.** This is a genuine research frontier for small model training. The "Ghost Protocol" paper concept (autoregressive self-poisoning) captures this gap perfectly.

---

## 6. Cross-Modal Transfer Findings

### The Big Paper: "Do LLMs and VLMs Share Neurons for Inference?" (arXiv 2602.19058, Feb 2026)

**Authors:** Cui, Zhang, Chen, Deng, Zheng, Liang, Wang, Chua

This paper is the closest external validation of GLADIUS's cross-modal invariant finding. Here's why:

**Their finding:** More than 50% of top-activated neurons during multi-step inference are *shared* between text-only LLMs and vision-language LVLMs built on the same architecture. These shared neurons form a **modality-invariant inference subspace.**

**Our finding (MNIST experiment):** Early layers (0-6) show <1% weight change across text→vision modality switch. Late layers (7-11) show massive restructuring (up to 36.6% in warm memory). The early layers are the invariant; the late layers are the adaptation.

**How they connect:** Cui et al. are looking at *which neurons fire* (activation space). We're looking at *which weights change* (parameter space). Same phenomenon, different measurement:
- Shared neurons = early layers in our framework (they don't change because they encode modality-invariant features)
- Non-shared neurons = late layers (they restructure for modality-specific cognition)

**Their practical contribution: SNRF (Shared Neuron Low-Rank Fusion).**
Profiles cross-model activations → identifies shared neurons → computes low-rank weight difference → injects updates within shared-neuron subspace only. This transfers LLM inference ability into VLMs with minimal parameters and no multimodal fine-tuning.

**Relevance to GLADIUS:** This suggests a practical strategy for GLADIUS's VLM expansion:
1. Train Drake on text (done)
2. Identify invariant neurons/layers (our MNIST experiment already did this — layers 0-6)
3. Freeze layers 0-6 when training on visual data
4. Let only layers 7-11 + warm memory adapt to visual modality
5. This is essentially what happened naturally in the MNIST experiment, but formalizing it as a training strategy would be more efficient

**Key quote from their abstract:** "shared neurons encode consistent and interpretable concept-level effects, demonstrating their functional contribution to inference."

This validates Ali's insight: "Text is not enough for this dragon." The early layers learn general *inference primitives* regardless of modality. The late layers learn modality-specific *cognitive geometry*. The architecture supports both because SLA² + warm memory + alpha routing are modality-agnostic in design.

### Cross-Modal Visual Processing Insights

**EmbedLens / "What Do Visual Tokens Really Encode?"** (arXiv 2603.00510, CVPR 2026):

Discovered that visual tokens in multimodal LLMs partition into three categories:
- **Sink tokens** (~10%): absorb attention but carry no meaning
- **Dead tokens** (~30%): essentially ignored
- **Alive tokens** (~60%): carry actual image-specific information

Critical finding: **alive tokens align with intermediate LLM layers rather than the initial embedding space.** Shallow-layer processing of visual tokens is unnecessary — direct mid-layer injection is sufficient.

**Relevance to GLADIUS VLM direction:** This has direct architectural implications:
1. Don't inject visual tokens at layer 0
2. Instead, inject at layer 6-7 (the boundary between our invariant and adaptive layers)
3. Only ~60% of visual tokens carry information — prune the rest before injection
4. This reduces compute dramatically while potentially improving quality

**ViCA: Vision-Only Cross-Attention** (arXiv 2602.07574, Feb 2026):

Proposed that visual tokens should bypass all self-attention and FFN layers, interacting with text only through sparse cross-attention at selected layers. Results: 98% accuracy retention, 4% visual compute, 3.5× speedup.

**Relevance to GLADIUS:** Supports the idea that visual processing doesn't need to go through the full transformer stack. For GLADIUS's VLM expansion, consider:
- Visual tokens processed by a lightweight encoder (few layers)
- Cross-attend into the main transformer at selected layers (7-11)
- Never put visual tokens through SLA² — use dedicated visual attention heads

---

## 7. VLM at Small Scale

### The Landscape

Small-scale VLMs are becoming a serious research direction:

**ScreenVLM** (2602.14276, CVPR 2026): 316M-parameter VLM for screen parsing. Outperforms much larger foundation VLMs on dense parsing tasks. Demonstrates that compact VLMs can match large ones when domain-specific training data is available.

**BT-VLM for Robot Planning** (2603.06084, March 2026): Fine-tuned VLMs from 500M to 4B parameters via PEFT for generating behavior trees. 4B model achieves 87% success rate matching closed-source models. Shows parameter-efficient fine-tuning makes small VLMs viable.

**Reverso** (2602.17634, Feb 2026): Not a VLM but highly relevant — small hybrid models (DeltaNet + long convolutions) match 100× larger transformers for zero-shot time series forecasting. Proves that for specific domains, small purpose-built architectures can compete with scale.

**Gap-Init** (2602.01522, Feb 2026): Addresses training instability in rank-1 LoRA for VLMs. Identifies a "modality gap axis" that dominates early gradient flow. Geometry-aware initialization aligns the LoRA direction with the modality gap. **Rank-1 can match rank-8 with proper initialization.**

### What This Means for GLADIUS

The field is validating that small, purpose-built architectures can compete with scale on specific tasks. GLADIUS at 60M params won't be a general-purpose VLM, but it can be:
- Excellent at specific visual-cognitive tasks (time series patterns, chart reading, structural analysis)
- A proof-of-concept that native architectural innovations (SLA², Tool Cortex, warm memory) provide more capability per parameter than generic scaling

The Gap-Init finding is particularly important: **modality gaps in small models require careful initialization.** When we add visual pathways to GLADIUS, the initial alignment between text and visual representations will determine training success. Don't just concatenate — align first.

---

## 8. Synthesis: What This Means for GLADIUS Next Steps

### Priority 1: VLM Expansion (Validated, High Confidence)

Every paper in this survey supports the VLM direction:
- Cross-modal neurons are shared (Cui et al.) — validates invariant layers
- Visual tokens should inject at mid-layers, not layer 0 (EmbedLens)
- Sparse visual attention suffices (ViCA)
- Small VLMs are viable with proper training (ScreenVLM, BT-VLM)
- GLADIUS's MNIST experiment already proved the architecture adapts beautifully

**Concrete next step:** Design a lightweight visual encoder (2-3 transformer layers, ~5M params) that maps image patches to tokens compatible with GLADIUS's embedding space. Inject at layer 6-7. Use Hilbert curve ordering for spatial locality. Freeze layers 0-6 during visual fine-tuning.

### Priority 2: Attention Diversity Across Layers

The NSA optimization paper and hierarchical sparse attention paper both show that layer-wise heterogeneous attention outperforms uniform patterns. SLA² currently uses the same pattern everywhere.

**Concrete next step:** Experiment with:
- Layers 0-6: Local attention only (remove approximate branch — it's not needed for invariant features)
- Layers 7-11: Full SLA² (local + approximate + alpha routing) — this is where modality-specific cognition happens
- This reduces compute in early layers and concentrates capacity where it matters

### Priority 3: Repetition Collapse Mitigation

The literature doesn't address our specific problem. We need home-grown solutions:

**Concrete next steps:**
1. Add attention entropy monitoring to training — log per-layer entropy, alert on collapse
2. Add a contrastive regularization term (SimCTG-style) to the training loss — penalize anisotropic embeddings
3. Add diversity-aware warm memory updates — penalize storing high-frequency patterns
4. Consider anti-repetition loss term during pre-training, not just during generation

### Priority 4: Tool Cortex Training Strategy

ICRL and ATLAS show tool use can be learned via RL. GLADIUS has native Tool Cortex architecture.

**Concrete next step:** After visual capability is established, design a Tool Cortex curriculum:
1. Simple tools (calculator, lookup) with clear reward signals
2. Multi-step tool chains with compositional rewards
3. Tool selection under uncertainty (when NOT to use tools — the silence gate)
4. Use ATLAS-style rubric-based rewards for structured learning at small scale

### Priority 5: MoE Routing Optimization

DynaMoE shows optimal expert schedules vary by task and scale. For small language models, ascending schedules (more experts in later layers) work best.

**Concrete next step:** Bias Nexus Router capacity toward later layers. This aligns with the cross-modal invariant — early layers are stable, late layers need more routing flexibility.

---

## 9. Papers That Challenge Our Approach (Honest Assessment)

### Challenge 1: Scale May Be Necessary for Tool Use

Every tool-use paper works at 4B+ parameters. ATLAS is the smallest at 4B, and it specifically addresses how SLMs are "brittle" for tool use. At 60M params, GLADIUS's Tool Cortex may not have enough representational capacity to learn meaningful tool cognition, regardless of architectural innovation. The architectural support helps, but there may be a minimum parameter threshold for tool use that we haven't reached.

**Counterargument:** Tool Cortex dedicates parameters specifically to tool cognition, so the effective capacity for tool use is higher than in a generic 60M model. But this is unproven.

### Challenge 2: In-Context Learning Requires Scale

ICRL's approach relies on in-context learning during RL rollouts. In-context learning is an *emergent capability* that appears at scale. At 60M params, GLADIUS almost certainly cannot do in-context learning. The Tool Cortex must compensate for this absence with native architecture.

**Counterargument:** This is exactly why Tool Cortex exists. It doesn't need in-context learning because tool invocation is hardwired.

### Challenge 3: Hybrid Attention May Hurt Small Models

STILL and NSA optimization work at 340M-1.3B. At 60M params, the overhead of maintaining two attention branches (sparse + approximate) may consume too many parameters relative to benefit. A simpler attention pattern might be more parameter-efficient.

**Counterargument:** The MNIST experiment showed SLA² adapting beautifully across modalities. The alpha router (which saw 6-14% weight change) is doing real cognitive work. But we should measure: what's the parameter budget of SLA²'s approximate branch vs. the quality improvement it provides?

### Challenge 4: Warm Memory Could Be Anti-Scaling

GLADIUS's warm memory went nuclear on MNIST (36.6% weight change). This is great for rapid adaptation but could cause catastrophic forgetting — the visual adaptation may destroy text capability. No paper in this survey addresses this trade-off for 3-temperature memory systems because nobody else has one.

**Counterargument:** This is what cold memory is for — it should store stable, long-term patterns while warm memory handles rapid adaptation. But the interaction between warm memory's cross-modal adaptation and cold memory's stability is unexplored territory.

### Challenge 5: Repetition Collapse May Be Fundamental at Small Scale

If 60M params simply isn't enough to learn diverse language generation, no architectural trick will fix repetition. The model may need to reach a certain scale before vocabulary diversity emerges. Drake's current loss trajectory (4.06 at step 50) suggests it's learning, but the function-word dominance on some prompts may be a permanent feature at this scale.

**Counterargument:** Multi-script training + progressive expansion should help. The path to 141M (Dragon) may resolve this. But if repetition persists at 141M, the architecture needs a rethink.

### Challenge 6: Progressive Expansion Literature Is Thin

I found zero recent papers on Net2Net-style progressive model growth. The field has moved toward training large models from scratch (or LoRA adapting). Our growth path (Seed → Hatchling → Drake → Wyrm → Dragon) is conceptually sound but lacks recent empirical validation from others. We're walking this path alone.

**Counterargument:** Our own results validate it — Seed→Hatchling→Drake worked, loss trajectories were healthy, the architecture transferred correctly. But the lack of external validation means we're the only ones who'll catch if something goes wrong.

---

## Paper Index

| ID | Title | Date | Relevance |
|---|---|---|---|
| 2603.08068 | In-Context RL for Tool Use in LLMs | Mar 2026 | **PRIMARY** — Tool use without SFT |
| 2603.06713 | ATLAS: Efficient RL Finetuning for Large Toolspaces | Mar 2026 | **HIGH** — SLM tool use at 4B |
| 2602.19058 | Do LLMs and VLMs Share Neurons? | Feb 2026 | **CRITICAL** — Cross-modal invariant validation |
| 2602.02180 | STILL: Intra-Layer Hybrid Attention | Feb 2026 | **HIGH** — SLA² validation |
| 2511.00819 | Optimizing NSA with Local-Global Alternating | Nov 2025 | **HIGH** — Layer-wise attention diversity |
| 2511.05832 | Hilbert-Guided Sparse Local Attention | Nov 2025 (ICLR 2026) | **MEDIUM** — VLM spatial attention |
| 2510.17196 | Hierarchical Sparse Attention Length Generalization | Oct 2025 (ICLR 2026) | **MEDIUM** — Bypass residual design |
| 2603.01697 | DynaMoE: Dynamic Token-Level Expert Activation | Mar 2026 | **HIGH** — MoE routing at small scale |
| 2602.19938 | Replicate-and-Quantize for MoE Load Balancing | Feb 2026 | **LOW** — Inference optimization |
| 2601.21349 | L2R: Low-Rank Lipschitz-Controlled MoE Routing | Jan 2026 | **MEDIUM** — Routing stability |
| 2603.00510 | EmbedLens: What Do Visual Tokens Encode? | Feb 2026 (CVPR 2026) | **HIGH** — Mid-layer visual injection |
| 2602.07574 | ViCA: Vision-Only Cross-Attention | Feb 2026 | **HIGH** — Sparse visual processing |
| 2602.14276 | ScreenVLM: 316M-param VLM | Feb 2026 | **MEDIUM** — Small VLM viability |
| 2602.17634 | Reverso: Efficient Time Series Foundation Models | Feb 2026 | **MEDIUM** — Small hybrid architectures |
| 2602.01522 | Gap-Init: Geometry-Guided VLM Initialization | Feb 2026 | **HIGH** — Modality gap handling |
| 2602.01439 | TQL: Attention Collapse in Scaled Transformers | Feb 2026 | **HIGH** — Attention entropy collapse |
| 2202.06417 | SimCTG: Contrastive Framework for Text Generation | 2022 (NeurIPS) | **MEDIUM** — Repetition root cause |
| 1904.09751 | Nucleus Sampling / Neural Text Degeneration | 2019 (ICLR 2020) | **LOW** — Foundational but decoding-focused |
| 2603.06084 | BT-VLM: Small VLM for Robot Planning | Mar 2026 | **LOW** — Small VLM viability at 500M-4B |
| 2603.09843 | RecThinker: Tool-Augmented Reasoning | Mar 2026 | **LOW** — Traditional SFT+RL pipeline |

---

*"Text is not enough for this dragon."*
*The dragon already knows. Now it needs eyes.*
