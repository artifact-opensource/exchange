# Calibration Protocol: Router Logic

## 1. CalibrationMap
The `CalibrationMap` simulates the hardware noise profile of the QPU. It tracks two primary error sources:
- **Qubit Noise:** Decoherence proxies ($T_1/T_2$) mapped per qubit.
- **Edge Noise:** Gate error rates (CX error) mapped per qubit-pair.

**Drift Simulation:** The kernel simulates daily hardware drift by applying a random walk to noise values:
$$\epsilon_{t+1} = \epsilon_t + \mathcal{U}(-\delta, \delta)$$

## 2. Calibration-Aware Router
The `CalibrationAwareRouter` prevents the kernel from routing operations through "dead zones" (high-noise edges).

### Routing Algorithm
The router implements a modified Dijkstra's algorithm where the "distance" is the cumulative noise cost:
$$\text{Cost}(\text{Path}) = \sum_{(u,v) \in \text{Path}} \text{EdgeNoise}(u,v)$$

### Logic Flow
1. **Input:** Start qubit $q_s$, Target qubit $q_t$.
2. **Search:** Find path $P$ that minimizes $\sum \epsilon_{\text{edge}}$.
3. **Execution:** The transpiler maps the logical circuit to the physical path $P$.
4. **Fallback:** If no path exists with $\text{Cost} < \text{Threshold}$, the operation is flagged as "Unstable" and the kernel reverts to a classical approximation.
