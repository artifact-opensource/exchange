# Walking Skeleton — Implementation Blueprint

> **Version:** 1.0.0
> **Date:** 2026-02-20
> **Purpose:** Define the thinnest possible end-to-end path through the GLADIUS kernel
> **Prerequisite:** Design papers finalized, P0 papers deep-read, synthesis complete

---

## 1. What Is the Walking Skeleton?

The minimal system that exercises ALL kernel components in a single inference path.
Not functional. Not smart. Not ready for use. Just **alive** — a signal flowing
from input to output through every organ.

```
"hello" → [Tokenize] → [Embed] → [Hot Memory Read] → [Time Stamp]
        → [Nexus Route → 1 Specialist] → [Tool Check (skip)]
        → [Modulate] → [Decode] → "response"
        → [Hot Memory Write] → [Cognition Check] → done
```

Every component exists. Most are stubs. But the wiring is real.

---

## 2. Implementation Phases

### Phase 0: Environment Setup (Day 1)

```bash
gladius_v2/src/
├── kernel/
│   ├── __init__.py
│   ├── config.py          # Hyperparameters, dimensions, device
│   ├── embeddings.py      # Shared vocabulary embeddings
│   ├── attention.py       # Hybrid SLA2 attention mechanism
│   ├── memory.py          # Three-temperature memory
│   ├── cognition.py       # Cognitive heartbeat
│   ├── temporal.py        # Time engine
│   ├── modulator.py       # Language modulation
│   ├── tools.py           # Tool cortex
│   ├── router.py          # Nexus router
│   └── kernel.py          # Main kernel class (ties everything together)
├── specialists/
│   ├── __init__.py
│   ├── base.py            # Base specialist interface
│   └── reasoning.py       # First specialist (reasoning stub)
├── training/
│   ├── __init__.py
│   └── trainer.py         # Basic training loop
├── inference/
│   ├── __init__.py
│   └── runner.py          # Inference loop (including heartbeat)
└── tests/
    ├── test_memory.py
    ├── test_attention.py
    └── test_skeleton.py
```

**Dependencies:** PyTorch only. No HuggingFace transformers, no external frameworks.
We build from primitives. This is a kernel, not an application.

### Phase 1: Core Primitives (Days 1-3)

Build the atoms that everything else assembles from:

**1.1 Config**
```python
@dataclass
class KernelConfig:
    vocab_size: int = 32000
    hidden_dim: int = 128       # Small for CPU. Can scale later.
    num_layers: int = 4         # Minimal depth
    num_heads: int = 4
    head_dim: int = 32          # hidden_dim / num_heads
    ffn_dim: int = 512          # 4x hidden_dim (SwiGLU)
    max_seq_len: int = 512
    hot_memory_slots: int = 256  # Start small
    warm_rank: int = 8           # Start small
    num_tools: int = 32          # Start small
    num_specialists: int = 3
    device: str = 'cpu'
    dtype: torch.dtype = torch.float32
```

**1.2 Shared Embeddings**
```python
class SharedEmbeddings(nn.Module):
    def __init__(self, config):
        self.token_embed = nn.Embedding(config.vocab_size, config.hidden_dim)
        self.output_head = nn.Linear(config.hidden_dim, config.vocab_size, bias=False)
        # Optionally tie weights
```

**1.3 Hybrid Attention (SLA2-style)**
```python
class HybridAttention(nn.Module):
    """
    SLA2-inspired: α ⊙ softmax_sparse + (1-α) ⊙ linear_dense
    """
    def __init__(self, config):
        self.q_proj = nn.Linear(config.hidden_dim, config.hidden_dim)
        self.k_proj = nn.Linear(config.hidden_dim, config.hidden_dim)
        self.v_proj = nn.Linear(config.hidden_dim, config.hidden_dim)
        self.o_proj = nn.Linear(config.hidden_dim, config.hidden_dim)
        self.router = nn.Linear(config.hidden_dim, 1)  # Learned α
        self.top_k = config.num_heads * 4  # Sparse attention budget

    def forward(self, x, mask=None):
        Q, K, V = self.q_proj(x), self.k_proj(x), self.v_proj(x)

        # Linear attention (O(n))
        Q_lin = F.elu(Q) + 1
        K_lin = F.elu(K) + 1
        KV = torch.bmm(K_lin.transpose(-2, -1), V)
        O_linear = torch.bmm(Q_lin, KV) / (Q_lin.sum(dim=-1, keepdim=True) + 1e-6)

        # Sparse softmax attention (O(n·k))
        alpha = torch.sigmoid(self.router(x))  # Per-token blend
        scores = torch.bmm(Q, K.transpose(-2, -1)) / math.sqrt(self.head_dim)
        if mask is not None:
            scores.masked_fill_(mask == 0, float('-inf'))
        O_softmax = torch.bmm(F.softmax(scores, dim=-1), V)

        # Blend
        O = alpha * O_softmax + (1 - alpha) * O_linear
        return self.o_proj(O)
```

### Phase 2: Kernel Components as Stubs (Days 3-5)

Each component exists but does minimal work:

**2.1 Hot Memory (stub)**
```python
class HotMemory(nn.Module):
    def __init__(self, config):
        self.keys = nn.Parameter(torch.randn(config.hot_memory_slots, config.hidden_dim) * 0.01)
        self.values = nn.Parameter(torch.randn(config.hot_memory_slots, config.hidden_dim) * 0.01)
        self.write_gate = nn.Linear(config.hidden_dim, 1)

    def read(self, query):
        scores = torch.matmul(query, self.keys.T) / math.sqrt(query.size(-1))
        weights = F.softmax(scores, dim=-1)
        return torch.matmul(weights, self.values)

    def write(self, hidden):
        gate = torch.sigmoid(self.write_gate(hidden))
        if gate.max() > 0.5:
            idx = 0  # Stub: always write to slot 0
            self.keys.data[idx] = hidden.detach().mean(dim=0)
            self.values.data[idx] = hidden.detach().mean(dim=0)
```

**2.2 Warm Memory (stub — will be replaced with Share+EBLoRA+Locas)**
```python
class WarmMemory(nn.Module):
    def __init__(self, config):
        self.lora_A = nn.Parameter(torch.randn(config.hidden_dim, config.warm_rank) * 0.01)
        self.lora_B = nn.Parameter(torch.randn(config.warm_rank, config.hidden_dim) * 0.01)
        self.scale = 0.1

    def forward(self, x):
        return x + (x @ self.lora_A @ self.lora_B) * self.scale

    def consolidate(self, hot_memory):
        pass  # Stub: no-op. Phase 4 implements Share+EBLoRA+Locas synthesis.
```

**2.3 Other stubs:** Time engine (returns zero embedding), Modulator (identity), Tool Cortex (no tools registered), Cognition (always returns "active" mode).

### Phase 3: Wire It All Together (Days 5-7)

```python
class GladiusKernel(nn.Module):
    def __init__(self, config):
        self.config = config
        self.embeddings = SharedEmbeddings(config)
        self.hot_memory = HotMemory(config)
        self.warm_memory = WarmMemory(config)
        self.time_engine = TimeEngine(config)
        self.router = NexusRouter(config)
        self.modulator = Modulator(config)
        self.tool_cortex = ToolCortex(config)
        self.cognition = CognitionLoop(config)

        # Transformer layers with hybrid attention
        self.layers = nn.ModuleList([
            TransformerLayer(config) for _ in range(config.num_layers)
        ])

    def forward(self, input_ids, timestamp=None):
        # 1. Embed
        x = self.embeddings.token_embed(input_ids)

        # 2. Memory read
        memory_context = self.hot_memory.read(x)
        x = x + memory_context

        # 3. Warm memory contribution
        x = self.warm_memory(x)

        # 4. Time stamp
        if timestamp is not None:
            x = x + self.time_engine.encode(timestamp)

        # 5. Transformer layers
        for layer in self.layers:
            x = layer(x)  # Hybrid attention + FFN

        # 6. Router → specialist activation
        specialist_ids, weights = self.router.route(x.mean(dim=1))
        # (Specialist execution deferred to Phase 2 specialists)

        # 7. Tool check
        tool_result = self.tool_cortex.check_activation(x)
        if tool_result is not None:
            x = x + tool_result

        # 8. Modulate
        logits, silence = self.modulator(x, self.embeddings.output_head)

        # 9. Memory write
        self.hot_memory.write(x)

        # 10. Cognition check
        self.cognition.heartbeat(x)

        return logits, silence

    def generate(self, input_ids, max_tokens=50, timestamp=None):
        """Autoregressive generation."""
        for _ in range(max_tokens):
            logits, silence = self.forward(input_ids, timestamp)
            if silence > 0.7:
                break  # Silence gate activated
            next_token = logits[:, -1, :].argmax(dim=-1, keepdim=True)
            input_ids = torch.cat([input_ids, next_token], dim=1)
            if next_token.item() == self.config.eos_token_id:
                break
        return input_ids
```

### Phase 4: Validate the Skeleton (Days 7-10)

Tests that prove the skeleton is alive:

```python
def test_forward_pass():
    """Signal flows through all components without error."""
    config = KernelConfig(vocab_size=1000, hidden_dim=64, num_layers=2)
    kernel = GladiusKernel(config)
    input_ids = torch.randint(0, 1000, (1, 10))
    logits, silence = kernel.forward(input_ids, timestamp=time.time())
    assert logits.shape == (1, 10, 1000)
    assert 0 <= silence <= 1

def test_memory_write_read():
    """Hot memory retains information across forward passes."""
    # Write something, do another forward, verify it's recalled

def test_generation():
    """Can generate tokens (even if gibberish)."""
    tokens = kernel.generate(torch.tensor([[1]]), max_tokens=20)
    assert tokens.shape[1] > 1

def test_parameter_count():
    """Total params within budget."""
    total = sum(p.numel() for p in kernel.parameters())
    assert total < 35_000_000  # 35M budget with margin
```

### Phase 5: Replace Stubs with Real Implementations (Weeks 2-4)

Priority order (matches research document priorities):

1. **Memory:** Replace WarmMemory stub with Share+EBLoRA+Locas synthesis
2. **Attention:** Optimize hybrid attention with actual sparse routing (not full softmax)
3. **Cognition:** Implement state monitor + heartbeat scheduler + prompt generator
4. **Time:** Implement dual-clock encoding with Time2Vec
5. **Modulator:** Implement register vector + intent vector + silence gate + bias layer
6. **Tools:** Register actual tools, implement activation + parameter generation
7. **Router:** Train on multi-domain routing tasks
8. **Specialists:** Build and train reasoning, math, code specialists

---

## 3. Hardware Constraints Informing Implementation

| Constraint | Impact | Decision |
|-----------|--------|----------|
| No GPU | All computation on CPU | float32 for training, float16 for inference |
| 4 cores | Limited parallelism | Sequential specialists, not parallel |
| 16GB RAM | Model + data must fit | 30M params = ~120MB; plenty of headroom |
| SSD storage | Fast checkpointing | Warm memory checkpoint every 5 minutes |
| No internet during inference | Can't call cloud APIs | All tools are local executors |

---

## 4. Success Criteria for Walking Skeleton

The skeleton is "alive" when:
- [ ] Forward pass completes without error through all components
- [ ] Hot memory writes persist across forward passes within a session
- [ ] Generation produces tokens (quality irrelevant at this stage)
- [ ] Parameter count is within budget
- [ ] Single forward pass completes in < 50ms on i3
- [ ] All tests pass

The skeleton is NOT:
- Trained on real data
- Capable of meaningful output
- Using the real warm memory algorithm
- Running the cognition heartbeat loop
- Connected to real tools

It is proof-of-life. The organs are connected. Blood flows. The patient is alive.
Everything after this is making it strong, smart, and eventually — conscious.

---

*The skeleton walks before the body runs.*
*The body runs before the mind thinks.*
*The mind thinks before the soul awakens.*
