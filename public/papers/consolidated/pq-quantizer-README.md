# GLADIUS PQ Quantizer — Perceptual Weight Compression

Applies HEKTOR's Perceptual Quantization (PQ/HLG curves) to GLADIUS model weights.

## Core Idea

GLADIUS has an empirically-proven layer invariant:
- **Layers 0-6 (Subconscious):** <1% change during cross-modal transfer — stable, delicate
- **Layers 7-11 (Conscious):** 15-36% change — plastic, adaptive
- **Hot Memory:** 36-178% change — volatile, pattern-responsive

Standard quantization (int8, int4) applies uniform precision everywhere.
This quantizer applies **perceptual curves** — more bits where precision matters most,
fewer bits where magnitude/direction matters more than exact value.

## Perceptual Curves (from HEKTOR)

- **HLG (Hybrid Log-Gamma):** sqrt(3x) for small values, A*log(12x-B)+C for large values
  - Maps perfectly: small weight changes (invariant layers) get high precision
  - Large weight changes (plastic layers) get compressed logarithmically
  
- **PQ (SMPTE ST 2084):** Power-law perceptual encoding
  - 10,000:1 dynamic range compressed to [0,1]
  - Better for extreme value ranges (hot memory spikes)

## Architecture

```
GLADIUS Checkpoint (237MB, float32)
    │
    ├── SVD Analysis (per-layer rank structure)
    │
    ├── Layer Classification (invariant score 0-1)
    │   ├── Subconscious (0-6): invariant_score > 0.8
    │   ├── Conscious (7-11): invariant_score 0.2-0.8  
    │   └── Volatile (hot_mem): invariant_score < 0.2
    │
    ├── Perceptual Encoding (HLG/PQ per classification)
    │   ├── Subconscious → HLG encode → 12-bit quantize
    │   ├── Conscious → PQ encode → 8-bit quantize
    │   └── Volatile → delta-encode → 4-bit quantize
    │
    └── Product Quantization (codebook compression)
        ├── 256 centroids per subquantizer
        ├── ADC distance computation
        └── 8-32x additional compression

Target: 237MB → ~30MB with <1% loss in invariant layers
```

## Usage

```bash
python quantizer.py compress --checkpoint path/to/drake.pt --output compressed.pqz
python quantizer.py decompress --input compressed.pqz --output restored.pt
python quantizer.py analyze --checkpoint path/to/drake.pt  # show per-layer stats
python quantizer.py compare --original path/to/drake.pt --compressed compressed.pqz
```

## Connection to GLADIUS Training

The dissection data from MNIST/multi-script/CIFAR experiments provides the
invariant scores. Layers that DON'T change during cross-modal transfer are
the ones that need the MOST precision in storage — they're the foundation.

## Origin

- Perceptual curves: HEKTOR (worxpace/hektor/include/vdb/quantization/)
- Layer invariant: GLADIUS cross-modal experiments (Day 30)
- Product Quantization: HEKTOR PQ with codebook learning
- Concept: Ali's directive — apply HEKTOR's compression to GLADIUS weights
