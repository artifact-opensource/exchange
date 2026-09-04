# Dev_Log: Hyperspace v8 Evolution

## Chronological Journal of Pivots

### Phase 1: The Genesis (v0.1)
- **Goal:** Basic quantum-classical bridge.
- **Pivot:** Initially attempted full state-vector simulation. Abandoned due to $2^n$ memory explosion. Switched to Matrix Product States (MPS) to maintain linear scaling with qubit count.

### Phase 2: The Disk Crisis
- **Issue:** Massive log files from QPU state dumps filled the `/home/adam` partition.
- **Resolution:** Implemented state-summarization; only expectation values are logged.

### Phase 3: CUDA Mismatch
- **Issue:** `cupy` version mismatch with the host NVIDIA driver on the Victus machine.
- **Resolution:** Implemented the `xp` (cross-platform) abstraction layer to allow seamless switching between `numpy` and `cupy`.

### Phase 4: Rebranding to Qorvex
- **Pivot:** Transitioned from "Hyperspace-Net" to "Qorvex v8" to reflect the shift from a simple network to a sovereign kernel architecture.

### Phase 5: Calibration Integration
- **Issue:** Noticed that static routing led to "dead" neurons in the attention head.
- **Resolution:** Introduced the `CalibrationAwareRouter` to dynamically route operations based on simulated hardware noise.
