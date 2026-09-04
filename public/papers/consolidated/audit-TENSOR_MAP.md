# TENSOR_MAP: MPS Structure & Contraction Flow

## 1. MPS Tensor Architecture
The v8 kernel utilizes Matrix Product States (MPS) to represent the quantum state $|\psi\rangle$. Instead of a full state vector of size $2^n$, the state is decomposed into a chain of tensors.

### Tensor Shape
Each tensor $\mathcal{T}_i$ at site $i$ has the shape:
$$\text{Shape}(\mathcal{T}_i) = (L_i, P_i, R_i)$$
- $L_i$: Left bond dimension (virtual index).
- $P_i$: Physical dimension (fixed at $2$ for qubits).
- $R_i$: Right bond dimension (virtual index).

**Boundary Conditions:**
- $L_0 = 1$
- $R_{n-1} = 1$
- Internal bonds $\le \chi$ (Bond Dimension).

## 2. Contraction Flow
The projection of classical embeddings into the quantum space follows this flow:

1. **Classical Projection:** $\text{Input} \xrightarrow{\text{Linear}} \text{Rotation Angles } \theta$.
2. **Gate Application:** 
   - The gate matrix $G$ is contracted with the physical index $P_i$.
   - $\mathcal{T}'_i = \sum_{p} G_{p', p} \mathcal{T}_{L, p, R}$.
3. **Expectation Value Calculation:**
   - The kernel computes $\langle \psi | \hat{O} | \psi \rangle$ by contracting the target tensor with the operator $\hat{O}$ and its conjugate.
   - This produces a scalar scaling factor $\lambda_q$ used to modulate the attention weights.

## 3. Data Flow Diagram
`Input (B, S, D)` $\rightarrow$ `Proj (B, S, n*2)` $\rightarrow$ `QPU Gate Application` $\rightarrow$ `MPS Contraction` $\rightarrow$ `Expectation Value` $\rightarrow$ `Attention Scaling` $\rightarrow$ `Output (B, S, D)`
