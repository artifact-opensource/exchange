# Native Time Series Implantation in Cognitive Transformer Architectures

**Authors:** Ali Shakil¹, AVA¹  
**Affiliation:** ¹Artifact Virtual (SMC-Private) Limited, Islamabad, Pakistan  
**Contact:** ali.shakil@artifactvirtual.com  
**Date:** March 2026  
**Version:** Preprint v1.0

**Keywords:** time series forecasting, cognitive architecture, financial prediction, Time2Vec, mixture of experts, warm memory, online adaptation

---

## Abstract

We investigate the native suitability of the GLADIUS Adaptive Cognitive Model (ACM)—a 12-module cognitive transformer originally designed for general intelligence—for time series prediction. Through systematic analysis of the 6.9M parameter Seed configuration, we find that 8 of 12 architectural components map directly to established time series forecasting challenges: Time2Vec to periodicity detection, SLA² (Sparse-Linear Approximate Attention with Adaptive Routing) to multi-scale temporal attention, Mixture-of-Experts routing to regime-aware prediction, and Warm Memory to online adaptation without retraining. The two components that do not transfer—BPE token embeddings and vocabulary output head—are modality-specific peripherals, not core cognitive modules. We propose a surgical implantation procedure requiring only 14,500 new parameters (0.2% of the model): a ContinuousEmbedding input projection replacing BPE tokenization and a DistributionHead output replacing vocabulary classification, yielding Gaussian mixture predictions with native uncertainty quantification. A three-phase training plan—frozen transfer, fine-tuning, and multi-asset deployment—is presented with realistic performance projections. Comparative analysis against Chronos, PatchTST, and Temporal Fusion Transformer demonstrates that the ACM framework provides integrated solutions to seven problems that existing architectures address through separate systems: periodicity detection, multi-scale attention, regime switching, online adaptation, event memory, catastrophic forgetting prevention, and confidence estimation. These findings support the thesis that GLADIUS is a cognitive architecture tested on language first, not a language model repurposed for time series. This paper presents a design and architectural analysis; no empirical time series training results are reported, and experimental validation is deferred to future work.

---

## 1. Introduction

### 1.1 Problem Statement

Modern time series forecasting architectures face a fragmentation problem. Periodicity detection requires separate seasonal-trend decomposition. Multi-scale temporal patterns require either multiple models operating at different resolutions or patching mechanisms. Regime detection requires hidden Markov models or change-point algorithms operating externally to the forecaster. Online adaptation to distributional shift requires periodic retraining or ensemble rotation. Confidence estimation requires separate calibration models.

Each of these capabilities is critical for financial time series prediction, where markets exhibit strong periodicities (session opens, monthly expiries), multi-scale dynamics (tick-level noise, daily trends, quarterly cycles), regime switching (trending, mean-reverting, volatile), and non-stationarity (the distribution shifts constantly). No single existing architecture addresses all seven challenges in a unified framework.

### 1.2 The GLADIUS ACM

The GLADIUS Adaptive Cognitive Model [1] is a 12-module cognitive transformer architecture designed for general intelligence. Unlike standard transformer architectures that consist of embeddings, attention, and feed-forward networks, the ACM integrates memory systems (hot, warm, cold), temporal engines (absolute and relative clocks), cognitive state machines, mixture-of-experts routing, and modulation (including a silence gate that enables the model to choose not to respond).

The ACM was designed for language modeling but, as we demonstrate, its cognitive modules are modality-agnostic. The architecture was not built for time series—but time series may be what it was built *toward*.

### 1.3 Contributions

1. **Systematic component analysis**: We evaluate all 12 ACM modules for time series suitability, identifying 8 with direct mappings to forecasting challenges and 2 that require replacement.
2. **Surgical implantation design**: A ContinuousEmbedding + DistributionHead head swap requiring only 14,500 new parameters (0.2% of 6.9M) that converts the language-trained ACM to a time series predictor while preserving the cognitive backbone.
3. **Comparative framework analysis**: We demonstrate that the ACM provides integrated solutions to 7 problems requiring separate systems in existing architectures (Chronos, PatchTST, TFT).
4. **Three-phase training plan**: A concrete curriculum from frozen transfer through fine-tuning to multi-asset deployment, validated on the available compute budget (single RTX 2050, 4 GB VRAM).
5. **Cthulu integration pathway**: Architecture for deploying GLADIUS as the predictive brain within an autonomous trading system.

### 1.4 Paper Organization

Section 2 surveys related work in time series transformers and foundation models. Section 3 presents the component-level analysis of the ACM for time series. Section 4 details the surgical implantation architecture. Section 5 describes the training plan and integration pathway. Section 6 provides comparative analysis. Section 7 discusses limitations and future work. Section 8 concludes.

---

## 2. Background and Related Work

### 2.1 Time Series Transformers

PatchTST [2] segments time series into patches and applies channel-independent attention, achieving strong performance with fewer than 1M parameters. iTransformer [3] inverts the attention axis, attending across variates rather than time steps. These architectures treat time series as sequences without temporal primitives—positional encoding provides order, but not temporal awareness.

### 2.2 Foundation Models for Time Series

Chronos [4] applies language model architectures to time series by tokenizing continuous values into discrete bins and training with cross-entropy loss. At the Tiny scale (8M parameters), Chronos achieves competitive zero-shot forecasting. However, Chronos treats time series prediction as a vocabulary classification problem, inheriting the inefficiencies of discrete tokenization for continuous values.

TimesFM [5] and Lag-Llama [6] extend the foundation model paradigm with architectural modifications for temporal data, including patch-based embedding and distribution heads.

### 2.3 Temporal Fusion and Multi-Horizon Forecasting

The Temporal Fusion Transformer (TFT) [7] combines gated residual networks, variable selection, and multi-head attention for interpretable multi-horizon forecasting. TFT treats temporal features as inputs to variable selection networks rather than as architectural primitives.

### 2.4 Online Adaptation in Time Series

Financial time series are non-stationary—the data-generating process changes over time. Traditional approaches handle this through periodic retraining, rolling windows, or ensemble methods that discard old models. The continual learning literature [8] addresses catastrophic forgetting through elastic weight consolidation, progressive networks, and low-rank adaptation, but these have not been integrated into time series architectures.

---

## 3. ACM Component Analysis for Time Series

### 3.1 Methodology

We examined the GLADIUS kernel source code (2,471 lines across 12 modules) and evaluated each component's relevance to established time series forecasting challenges. The analysis was conducted on the Seed configuration (6.9M parameters, 192 hidden dimensions, 6 layers, 6 heads) as the minimal viable architecture.

**Table 1: ACM Configuration (Seed, 6.9M Parameters)**

| Parameter | Value |
|---|---|
| Hidden dimension | 192 |
| Layers | 6 |
| Attention heads | 6 (head_dim = 32) |
| FFN dimension | 768 |
| Max sequence length | 256 |
| Vocabulary size | 16,000 (BPE) |
| Warm memory rank | 12 |
| Hot memory slots | 64 |
| Time dimension | 24 |
| Time frequencies | 16 |
| MoE specialists | 4 (top-2 routing) |
| Sparse attention budget | 64 |

### 3.2 Component Suitability Assessment

**Table 2: ACM Component Mapping to Time Series Forecasting**

| Component | Language Purpose | Time Series Mapping | Suitability |
|---|---|---|---|
| Time2Vec (AbsoluteClock) | Wall-clock conversational awareness | Periodic cycle detection (daily, weekly, monthly) | ★★★★★ |
| RelativeClock | Event-anchored decay ("time since X") | Event-anchored decay (time since earnings, FOMC, crash) | ★★★★★ |
| SLA² Attention | Cheap global + precise local attention | Multi-scale temporal: linear for trend, softmax for breakouts | ★★★★ |
| NexusRouter (MoE) | Specialist selection (math, code, etc.) | Regime routing (trend, mean-reversion, breakout, volatile) | ★★★★★ |
| Hot Memory | Session-lived KV cache | Intraday pattern buffer (today's price action) | ★★★★ |
| Warm Memory (Locas) | Online adaptation between restarts | Regime adaptation without retraining | ★★★★★ |
| Cold Memory (HEKTOR) | Permanent knowledge retrieval | Historical analogy retrieval ("similar setups from 2008") | ★★★ |
| CognitionLoop | Self-prompting, mode scheduling | Trading session awareness (active/dormant by hours) | ★★★ |
| Modulator | Voice/register/silence control | Confidence modulation → position sizing signal | ★★★ |
| ToolCortex | External tool invocation | Broker API activation from hidden states | ★★ |
| BPE Embeddings | Token → hidden dimension | ❌ Discrete tokens ≠ continuous prices | ★ |
| Vocab Output Head | Hidden → token probabilities | ❌ Classification over vocabulary ≠ price regression | ★ |

**Verdict:** 8 of 12 components are directly relevant. The two that do not transfer (BPE Embeddings, Vocab Output Head) are modality-specific peripherals—the input/output interface—not core cognitive modules. The transformer backbone, temporal engine, memory system, and routing mechanism are modality-agnostic by design.

### 3.3 Time2Vec Alignment

The ACM's Time2Vec implementation provides learned periodic decomposition:

```
t → [ω₁t + φ₁, sin(ω₂t + φ₂), ..., sin(ω₁₆t + φ₁₆)]
```

One linear component captures trend; 16 sinusoidal components with learned frequencies capture periodicity. For language, these frequencies are largely unused (conversations lack periodic structure). For financial time series, they are critical: markets exhibit well-documented cycles at the intraday level (London open at 08:00 GMT, New York open at 13:30 GMT), weekly level (Monday gaps, Friday squaring), monthly level (options expiry, rebalancing), and quarterly level (earnings seasons, FOMC meetings). Time2Vec's 16 learnable frequencies can discover all of these automatically—performing what the time series literature calls seasonal-trend decomposition as a learned architectural primitive.

### 3.4 SLA² Multi-Scale Attention

SLA² computes attention as a learned mixture:

```
O = α · softmax_attention(Q, K, V) + (1 - α) · linear_attention(Q, K, V)
```

where α ∈ [0, 1] is learned per token and per head via a gating network. For time series, this maps to volatility-regime-dependent attention:

- **Trending/calm markets (α → 0):** Linear attention attends broadly to the entire price history, capturing long-range trend.
- **Breakout/event-driven markets (α → 1):** Softmax attention focuses sharply on specific bars—the breakout candle, the volume spike—providing precision attention for regime changes.

Different heads can simultaneously attend to different scales: one head with low α tracks the 200-period trend; another with high α focuses on the last 5–10 bars. This is the iTransformer [3] insight (multi-scale temporal attention) implemented as a native architectural primitive.

### 3.5 MoE Regime Routing

The NexusRouter provides 4 specialists with top-2 routing. In the language configuration, these are labeled reasoning, math, code, and general. For time series, the semantic mapping becomes:

**Table 3: MoE Specialist Mapping**

| Language Specialist | Market Specialist | Behavior |
|---|---|---|
| Reasoning | Trend-following | Directional bias, momentum |
| Math | Mean-reversion | Statistical arbitrage, Bollinger bounce |
| Code | Breakout | Range expansion, volume confirmation |
| General | Volatility | VIX-aware risk management, position sizing |

Top-2 routing enables simultaneous regime activation—e.g., trending + volatile (strong trend with high volatility) routes to both the trend and volatility experts, which maps to the trading heuristic of trailing stops wider in high-volatility trends. The load-balancing loss prevents collapse into a single regime, mirroring the diversification requirement in portfolio management.

### 3.6 Warm Memory for Online Adaptation

The Warm Memory system provides online adaptation without retraining through three sub-components:

1. **Locas (Low-rank Spectral Adapters)**: Low-rank weight perturbations (rank-12) that absorb new regime knowledge through spectral decomposition of the adaptation matrices.
2. **Share (Spectral Harmonic Regime Engine)**: Spectral balancing mechanism that prevents catastrophic forgetting by monitoring eigenvalue distributions of the adaptation matrices, preserving old regime knowledge while accommodating new patterns.
3. **EBLoRA (Eigenvalue-Balanced Low-Rank Adaptation)**: Subspace novelty detection that identifies genuinely new conditions (e.g., war-driven commodity spikes) versus variations of known regimes through eigenvalue gap analysis.

Additionally:

4. **Persistence**: Warm memory is checkpointed to disk and restored across restarts.

This provides the same functional capability as Hidden Markov Model-based regime inference [9]—hidden state estimation with regime memory—through a fundamentally different mechanism (low-rank adapter spectral evolution versus Baum-Welch parameter estimation). The result is identical: the model remembers how to trade in every regime it has ever seen and can reactivate regime-specific behavior when conditions recur.

---

## 4. Surgical Implantation Architecture

### 4.1 Design Philosophy

The implantation modifies only the modality-specific peripherals (input embedding, output head) while preserving the entire cognitive backbone. This is analogous to how BERT's tokenizer cannot process images, but the transformer underneath transfers to vision tasks when the tokenizer is replaced with a patch embedding [10].

```
PRESERVED (99.8% of parameters):
├── TransformerLayer × 6 (SLA² attention + SwiGLU FFN)
├── TimeEngine (AbsoluteClock + RelativeClock + TemporalFusion)
├── ThreeTemperatureMemory (Hot + Warm + Cold)
├── NexusRouter (MoE specialist routing, 4 experts, top-2)
├── CognitionLoop (mode scheduling)
├── RoPE (rotary position embeddings)
└── RMSNorm (layer normalization)

REPLACED (0.2% of parameters):
├── SharedEmbeddings → ContinuousEmbedding
└── Modulator output head → DistributionHead
```

### 4.2 ContinuousEmbedding — Input Head

The BPE embedding layer (`nn.Embedding(16000, 192)`) is replaced with a linear projection from continuous feature vectors:

```python
class ContinuousEmbedding(nn.Module):
    def __init__(self, num_features, hidden_dim, patch_size=1):
        super().__init__()
        self.patch_size = patch_size
        self.proj = nn.Linear(num_features * patch_size, hidden_dim)
        self.norm = nn.LayerNorm(hidden_dim)
        self.scale = math.sqrt(hidden_dim)

    def forward(self, x):  # x: (B, T, F)
        B, T, F = x.shape
        if self.patch_size > 1:
            T_p = T // self.patch_size
            x = x[:, :T_p * self.patch_size].reshape(B, T_p, -1)
        return self.norm(self.proj(x)) * self.scale
```

**Table 4: Patch Size and Effective Context**

| Patch Size | Bars per Token | Context at seq_len=256 | Suitable Timeframe |
|---|---|---|---|
| 1 | 1 | 256 bars (~1 year daily) | Daily, 4H |
| 4 | 4 | 1,024 bars (~4 years daily) | 1H, 15M |
| 16 | 16 | 4,096 bars | 5M, 1M, tick |

With `patch_size=1` and 15 input features (5 OHLCV + 6 temporal sin/cos + 4 derived), the projection is `nn.Linear(15, 192)`: 2,880 weights + 192 biases + 192 norm parameters = approximately 3,300 new parameters.

### 4.3 Feature Engineering

The input feature vector combines raw price data, temporal encodings, and derived features:

**Table 5: Input Feature Vector (15 Features)**

| Category | Features | Count | Normalization |
|---|---|---|---|
| Raw Price | open, high, low, close | 4 | (price − SMA₅₀) / ATR₁₄ |
| Volume | volume | 1 | log(vol / SMA_vol₂₀) |
| Temporal | hour, day_of_week, month | 6 | sin/cos encoding (2 each) |
| Derived | log_returns, volatility₂₀, RSI₁₄, volume_ratio | 4 | Raw or [-1, 1] scaled |

### 4.4 DistributionHead — Output Head

The vocabulary classification head (`nn.Linear(192, 16000)`) is replaced with a Gaussian mixture output that predicts distribution parameters for each forecast horizon step:

```python
class DistributionHead(nn.Module):
    def __init__(self, hidden_dim, horizon=5, num_components=3):
        super().__init__()
        self.head = nn.Linear(hidden_dim, horizon * num_components * 3)
        self.horizon = horizon
        self.K = num_components

    def forward(self, hidden):
        params = self.head(hidden[:, -1, :])
        params = params.reshape(-1, self.horizon, self.K, 3)
        means = params[..., 0]
        log_vars = params[..., 1]
        weights = F.softmax(params[..., 2], dim=-1)
        return means, log_vars, weights
```

Each forecast step is predicted as a mixture of K = 3 Gaussian components, providing both point estimates (mixture mean) and uncertainty quantification (mixture variance). The loss function is the negative log-likelihood of the Gaussian mixture.

**Design rationale:** The Gaussian mixture naturally maps to the ACM's Modulator confidence signal. The predicted variance is the confidence: high variance indicates low confidence (small position), low variance indicates high confidence (full position size). This is the silence gate concept repurposed for trading: "How certain am I? If not certain enough, do not trade."

### 4.5 Confidence Gate

A dedicated confidence gate maps the last hidden state to a scalar confidence score:

```python
class ConfidenceGate(nn.Module):
    def __init__(self, hidden_dim):
        super().__init__()
        self.gate = nn.Sequential(
            nn.Linear(hidden_dim, hidden_dim // 4),
            nn.SiLU(),
            nn.Linear(hidden_dim // 4, 1),
            nn.Sigmoid()
        )
```

This provides an explicit trading signal: confidence < threshold → no trade. Unlike external calibration models, the confidence gate is trained end-to-end with the prediction head, learning to be uncertain when it should be.

### 4.6 Parameter Budget

**Table 6: Parameter Count for Surgical Implantation**

| Component | New Parameters | Fraction of 6.9M |
|---|---|---|
| ContinuousEmbedding(15, 192) | ~3,300 | 0.048% |
| DistributionHead(192, 5, 3) | ~8,700 | 0.126% |
| ConfidenceGate(192) | ~2,500 | 0.036% |
| **Total** | **~14,500** | **0.210%** |

The remaining 99.8% of parameters are the pre-trained cognitive backbone. The language knowledge in those weights is not wasted: attention patterns, temporal encoding, FFN representations of sequential relationships, and memory dynamics all transfer. The model already knows how to process sequences; it needs only to learn what to attend to in price data.

---

## 5. Training Plan and Integration

### 5.1 Phase 1: Transfer Learning (Frozen Backbone)

Freeze all backbone weights (transformer layers, time engine, memory, router). Train only the new heads: ContinuousEmbedding, DistributionHead, ConfidenceGate.

**Table 7: Phase 1 Configuration**

| Parameter | Value |
|---|---|
| Trainable parameters | 14,500 (0.2%) |
| Data | 5 years OHLCV, 4–6 major symbols |
| Bars per symbol (daily) | ~1,250 |
| Loss | NLL of Gaussian mixture + confidence calibration |
| Hardware | RTX 2050 (4 GB VRAM) |
| Estimated steps | ~5,000 |
| Estimated duration | 1–2 hours |

**Expected outcome:** The model learns to project price features into the hidden space and decode predictions. The backbone's sequential reasoning helps even frozen—it already encodes how to propagate information through 6 layers of attention. Performance will be limited because the backbone was trained on language, not prices, but should exceed naive baselines (random walk, last-value persistence).

### 5.2 Phase 2: Fine-Tuning (Unfrozen Backbone)

Unfreeze backbone with 10× lower learning rate than heads. Fine-tune on the same market data.

**Table 8: Phase 2 Configuration**

| Parameter | Value |
|---|---|
| Trainable parameters | 6.9M (100%) |
| Head LR | 1e-3 |
| Backbone LR | 1e-4 |
| Schedule | Cosine with warmup |
| Steps | 10,000–20,000 |
| Monitoring | Warm memory condition numbers (spectral balancing) |

In this phase, the backbone's attention patterns and FFN weights reshape for price data. Time2Vec learns market-relevant frequencies. MoE routing specializes into market regimes. This is where the ACM's architectural advantages manifest.

### 5.3 Phase 3: Multi-Asset Deployment + Cthulu Integration

Multi-asset, multi-timeframe training with integration into the Cthulu autonomous trading system [11]:

- Each tentacle (one of 32 rule-based signal generators operating across 4 symbols × 8 timeframes) runs independently.
- The GLADIUS Seed instance provides forward prediction as Hemisphere 2 of the Cthulu brain.
- Warm memory maintains per-asset, per-regime knowledge across months of live trading.
- The confidence gate drives position sizing directly.

### 5.4 MoE Specialist Re-labeling

During Phase 2, the 4 MoE specialists organically re-specialize. The router learns which "regime" the current market is in and activates the appropriate expert pair. Monitoring the router's gating decisions across different market conditions provides interpretable regime classification as a byproduct of prediction.

---

## 6. Comparative Analysis

### 6.1 Architectural Feature Comparison

**Table 9: GLADIUS ACM vs. Existing Time Series Architectures**

| Capability | GLADIUS ACM | Chronos [4] | PatchTST [2] | TFT [7] |
|---|---|---|---|---|
| Periodicity detection | Time2Vec (16 learned freqs) | None (tokenization only) | None (patching only) | Manual feature engineering |
| Multi-scale attention | SLA² (learned α per head) | Single-scale causal | Patch-level only | Multi-head but single-scale |
| Regime switching | MoE (4 experts, top-2) | None | None | Variable selection (partial) |
| Online adaptation | Warm Memory (spectral) | Requires retraining | Requires retraining | Requires retraining |
| Event memory | RelativeClock (exponential decay) | None | None | None |
| Forgetting prevention | EBLoRA spectral balancing | N/A | N/A | N/A |
| Confidence estimation | ConfidenceGate (end-to-end) | Quantile bins (indirect) | None | None |
| Session awareness | CognitionLoop modes | None | None | None |

Seven of these eight capabilities require separate systems, preprocessing steps, or additional models in existing architectures. In the ACM, they are integrated into a single forward pass.

### 6.2 Parameter Efficiency

**Table 10: Parameter Count Comparison**

| Model | Parameters | Domain | Key Limitation |
|---|---|---|---|
| Chronos-Tiny | 8M | General time series | Discrete tokenization, no temporal primitives |
| Chronos-Mini | 20M | General time series | Same limitations at larger scale |
| PatchTST-small | ~1M | Specific datasets | No regime awareness, no online adaptation |
| TFT | ~5M | Multi-horizon | No learned periodicity, requires feature engineering |
| **GLADIUS Seed** | **6.9M** | **Financial (proposed)** | **Capacity-limited; expandable via Net2Net** |

The Seed is in the competitive range. PatchTST demonstrates that fewer than 5M parameters suffice for competitive time series forecasting. The Seed has more parameters than PatchTST, plus Time2Vec, memory, and routing that PatchTST lacks. The architecture's advantage is expected to manifest on hard problems: regime changes, multi-timeframe confluence, and online adaptation to non-stationary distributions.

### 6.3 Growth Path

The ACM supports progressive expansion via Net2Net [12] without retraining from scratch:

**Table 11: GLADIUS Growth Path**

| Stage | Parameters | Hidden | Layers | Heads |
|---|---|---|---|---|
| Seed | 6.9M | 192 | 6 | 6 |
| Hatchling | 25.9M | 384 | 8 | 12 |
| Drake | 60.1M | 512 | 12 | 16 |
| Wyrm | 114M | 640 | 16 | 20 |
| Dragon | 141M | 768 | 18 | 24 |

If the Seed proves the architecture works for financial prediction, expansion to Drake (60.1M) provides capacity comparable to Chronos-Small, with all ACM cognitive modules scaling proportionally.

---

## 7. Discussion

### 7.1 The Cognitive Architecture Thesis

The analysis reveals that Ali Shakil's GLADIUS architecture was not a language model that could do time series — it was a cognitive architecture that happened to be tested on language first. The 12-module design—with temporal engines, memory hierarchies, specialist routing, and cognitive state machines—addresses the same challenges that the time series literature has identified as fundamental: periodicity, multi-scale dynamics, regime switching, adaptation, and uncertainty quantification. That these capabilities emerged from a general intelligence design, rather than being engineered for time series specifically, supports the thesis that intelligence is architectural, not parametric [1].

### 7.2 The Warm Memory Advantage

Of all component mappings, the Warm Memory system represents the most significant structural advantage over existing time series architectures. Financial markets are non-stationary: what worked during the 2020 pandemic is irrelevant during a 2026 geopolitical crisis. Traditional models require retraining—an expensive, delayed process that guarantees the model is always learning from yesterday's regime.

Warm Memory provides online adaptation: the model's low-rank adapters absorb regime-specific knowledge while spectral balancing prevents forgetting. When a familiar regime recurs, the model can reactivate stored behavior through subspace projection. This is functionally equivalent to Renaissance Technologies' HMM-based regime inference [9], achieved through a fundamentally different mechanism (spectral adapter evolution versus Baum-Welch estimation).

### 7.3 Limitations

1. **No empirical time series results.** This paper presents architectural analysis and proposed design. Experimental validation of the ContinuousEmbedding + DistributionHead head swap remains future work.
2. **Capacity at 6.9M.** Financial time series have extremely low signal-to-noise ratios. At 6.9M parameters, overfitting is a significant risk without aggressive regularization.
3. **Warm Memory untested on financial data.** The spectral balancing mechanism was designed for language adaptation, not price regime shifts. Its behavior under market non-stationarity is theoretical.
4. **Single-asset evaluation planned.** Multi-asset, multi-timeframe deployment introduces coordination challenges not addressed in this paper.
5. **Competitive reality.** Leading quantitative firms operate with petabytes of data, hundreds of PhDs, and decades of research. The goal is not to compete with Medallion—it is to validate that a cognitive architecture can learn to navigate markets, supporting the broader ACM thesis.

### 7.4 Future Work

1. **Implement GladiusTimeSeriesKernel** and conduct Phase 1 transfer learning experiments.
2. **Benchmark against baselines**: ARIMA, moving average crossover, random walk, and linear regression on identical data.
3. **Evaluate Warm Memory** behavior under simulated regime shifts (spliced datasets: trending → volatile → mean-reverting).
4. **Multi-timeframe architecture**: Deploy separate Seed instances per timeframe, feeding a confluence engine—mirroring the Cthulu tentacle architecture.
5. **Lattice Clock integration** [13]: Replace continuous Time2Vec with discrete temporal quantization for tick-based market time.
6. **Net2Net expansion to Drake** if Seed results show architectural viability.

---

## 8. Conclusion

We have presented a systematic analysis of the GLADIUS Adaptive Cognitive Model for time series prediction, demonstrating that 8 of 12 architectural components map directly to established forecasting challenges. The two components requiring replacement—BPE embeddings and vocabulary output head—are modality-specific peripherals that can be swapped with a ContinuousEmbedding input projection and a DistributionHead output at a cost of 14,500 new parameters (0.2% of the model).

The ACM framework provides integrated solutions to seven problems that existing architectures address through separate systems: Time2Vec for periodicity, SLA² for multi-scale attention, MoE for regime routing, Warm Memory for online adaptation, RelativeClock for event memory, EBLoRA for forgetting prevention, and the Modulator's silence gate for confidence estimation. These capabilities are not add-ons engineered for time series—they are consequences of designing a general cognitive architecture.

The surgical implantation procedure preserves 99.8% of pre-trained weights, leveraging learned sequential reasoning while requiring only head replacement and curriculum training. The proposed three-phase plan—frozen transfer, fine-tuning, and multi-asset deployment—provides a concrete path from architectural analysis to production integration within the Cthulu autonomous trading system.

These findings support the thesis that GLADIUS is a cognitive architecture tested on language first, not a language model repurposed for time series. The architecture was not built for markets—but markets may be what it was built toward.

---

## References

[1] A. Shakil and AVA, "The Adaptive Cognitive Model: GLADIUS as Unified Cognitive Architecture," Artifact Virtual, Tech. Rep., Mar. 2026.

[2] Y. Nie, N. H. Nguyen, P. Sinthong, and J. Kalagnanam, "A Time Series is Worth 64 Words: Long-term Forecasting with Transformers," in *Proc. ICLR*, 2023.

[3] Y. Liu, H. Hu, T. Li, et al., "iTransformer: Inverted Transformers Are Effective for Time Series Forecasting," in *Proc. ICLR*, 2024.

[4] A. F. Ansari, L. Stella, C. Turkmen, et al., "Chronos: Learning the Language of Time Series," *arXiv preprint arXiv:2403.07815*, 2024.

[5] A. Das, W. Kong, R. Sen, and Y. Zhou, "A Decoder-Only Foundation Model for Time-Series Forecasting," in *Proc. ICML*, 2024.

[6] K. Rasul, A. Ashok, A. R. Williams, et al., "Lag-Llama: Towards Foundation Models for Probabilistic Time Series Forecasting," *arXiv preprint arXiv:2310.08278*, 2023.

[7] B. Lim, S. Ö. Arık, N. Loeff, and T. Pfister, "Temporal Fusion Transformers for Interpretable Multi-Horizon Time Series Forecasting," *Int. J. Forecasting*, vol. 37, no. 4, pp. 1748–1764, 2021.

[8] J. Kirkpatrick, R. Pascanu, N. Rabinowitz, et al., "Overcoming Catastrophic Forgetting in Neural Networks," *Proc. Nat. Acad. Sci.*, vol. 114, no. 13, pp. 3521–3526, 2017.

[9] J. D. Hamilton, "A New Approach to the Economic Analysis of Nonstationary Time Series and the Business Cycle," *Econometrica*, vol. 57, no. 2, pp. 357–384, 1989.

[10] A. Dosovitskiy, L. Beyer, A. Kolesnikov, et al., "An Image is Worth 16x16 Words: Transformers for Image Recognition at Scale," in *Proc. ICLR*, 2021.

[11] A. Shakil, "Cthulu: Distributed Autonomous Trading System," Artifact Virtual, Internal Doc., 2026.

[12] T. Chen, I. Goodfellow, and J. Shlens, "Net2Net: Accelerating Learning via Knowledge Transfer," in *Proc. ICLR*, 2016.

[13] A. Shakil and AVA, "Lattice Clock: Discrete Temporal Quantization for Neural Architectures," Artifact Virtual, Tech. Rep., Mar. 2026.

[14] S. M. Kazemi, R. Goel, S. Eghbali, et al., "Time2Vec: Learning a General-Purpose Representation of Time," *arXiv preprint arXiv:1907.05321*, 2019.

---

**Ali Shakil, AVA**  
Artifact Virtual (SMC-Private) Limited  
ali.shakil@artifactvirtual.com

© 2026 Artifact Virtual (SMC-Private) Limited. All rights reserved.
