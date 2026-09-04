# Version Manifest: Hyperspace/Qorvex v8

## v0.1: Static Kernel
**Status:** Legacy / Baseline
- **Routing:** Static mapping (Logical $\rightarrow$ Physical).
- **State:** Fixed MPS bond dimension.
- **Attention:** Basic quantum scaling.
- **Hardware:** CPU-only simulation.

## v0.2: Calibration-Aware Kernel
**Status:** Current Production
- **Routing:** Dynamic routing via `CalibrationAwareRouter`.
- **State:** Dynamic bond dimension scaling.
- **Attention:** Quantum-Enhanced Attention Head with `CalibrationMap` integration.
- **Hardware:** Hybrid CPU/GPU (CuPy) support.
- **Key Feature:** "Sovereign Projection" — the ability to route around hardware noise.
