# Integration Guide: Quantum Attention Head

## 1. Prerequisites
- `torch` $\ge 2.0$
- `numpy` $\ge 1.21$
- `cupy` (Optional, for GPU acceleration)

## 2. Implementation Steps

### Step 1: QPU Initialization
Initialize the `HyperspaceQPU` with the desired qubit count and bond dimension.
```python
from core.mini_qpu import HyperspaceQPU
qpu = HyperspaceQPU(n_qubits=4, bond_dimension=16)
```

### Step 2: Projection Layer
Create a linear layer to map the model dimension $d_{\text{model}}$ to the QPU parameter space.
```python
self.proj = nn.Linear(d_model, n_qubits * 2)
```

### Step 3: The Forward Pass
Integrate the QPU call within the attention mechanism:
1. Project input to rotation angles.
2. Apply gates to the QPU state.
3. Extract the expectation value as a scalar.
4. Scale the attention output by this scalar.

### Step 4: Block Integration
Wrap the `QuantumAttentionHead` within a standard Transformer block, ensuring a `LayerNorm` follows the quantum path to prevent gradient explosion.

## 3. Verification
Run the sanity test provided in `core/sovereign_transformer.py`. A successful integration is confirmed when the output shape matches the input shape and the expectation value is non-zero.
