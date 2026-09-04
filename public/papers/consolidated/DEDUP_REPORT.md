# Deduplication Report
## Gladius Research Consolidation — 2026-06-28

### Summary

Consolidated research files from **15+ repositories** into the canonical directory at `/home/adam/worxpace/gladius/research/`.

**Policy:** Longest version wins — never overwrite a longer version with a shorter one.

### Repositories Scanned

| Repository | Location | Status |
|-----------|----------|--------|
| **Canonical (worxpace/gladius)** | `/home/adam/worxpace/gladius/research/` | ✅ Base |
| papers-consolidated | `/home/adam/workspace/research/papers-consolidated/` | ✅ Merged |
| enterprise/docs/research | `/home/adam/workspace/enterprise/docs/research/` | ✅ Merged |
| gladius-model-repo | `/home/adam/gladius-model-repo/` | ✅ Merged |
| gladius-research-dataset | `/home/adam/gladius-research-dataset/` | ✅ Merged |
| gladius-local | `/home/adam/workspace/gladius-local/` | ✅ Merged |
| hf_gladius_audit | `/home/adam/workspace/hf_gladius_audit/` | ✅ Merged |
| gladius-hf-mirror | `/home/adam/workspace/projects/gladius-hf-mirror/` | ✅ (identical to canonical) |
| hf_gladius_repo | `/home/adam/workspace/hf_gladius_repo/` | ✅ (identical to canonical) |
| gladius-sbt | `/home/adam/workspace/projects/gladius-sbt/` | ✅ Merged |
| gladius-scribe | `/home/adam/workspace/projects/gladius-scribe/` | ✅ Merged |
| gladius-viz | `/home/adam/workspace/projects/gladius-viz/` | ✅ Merged |
| gladius-distillation | `/home/adam/workspace/projects/gladius-distillation/` | ✅ Merged |
| gladius-pq-quantizer | `/home/adam/workspace/projects/gladius-pq-quantizer/` | ✅ Merged |
| gladius_v7 prototype | `/home/adam/hyperspace/prototype/gladius_v7/` | ✅ Merged |
| av-erp/docs/research | `/home/adam/av-erp/docs/research/` | ✅ Merged |

### Deduplication Decisions

#### Cross-repo duplicates resolved

| Filename | Repositories | Decision |
|----------|-------------|----------|
| `cell-division.md` | canonical, formal, model-repo, gladius-research-dataset | Kept formal version (296 lines) |
| `gladius-atp-analysis-report.md` | canonical, formal | Kept formal (41 lines, identical) |
| `gladius-day30-definitive-paper.md` | canonical, formal | Kept formal (635 lines, identical) |
| `gladius-distillation-gpt2-report.md` | canonical, formal | Kept formal (262 lines, identical) |
| `gladius-invariant-deep-analysis.md` | canonical, formal | Kept formal (272 lines, identical) |
| `gladius-time-series-definitive.md` | canonical, formal | Kept formal (639 lines, identical) |
| `muonclip-collapse-thesis.md` | canonical, formal | Kept formal (89 lines, identical) |
| `progressive-expansion.md` | canonical, formal | Kept formal (332 lines, identical) |
| `gladius-cognition-awakening.md` | canonical/working, ieee | Kept ieee (574 lines) |
| `gladius-forward-pass-map.md` | canonical/working, ieee | Kept ieee (467 lines) |
| `gladius-resonance-architecture.md` | canonical/working, ieee | Kept ieee (1053 lines) |
| `gladius-multi-script-attention.md` | canonical/working (507 lines), ieee (400 lines), formal (65 lines) | **Moved to formal** (507 lines is longest) |
| `1-bit-intelligence.md` | model-repo, formal | Kept formal (176 lines, identical) |
| `gpu-as-code.md` | model-repo, formal | Kept formal (332 lines, identical) |
| IEEE papers (14 files) | canonical/ieee, consolidated/formal/ieee | Kept canonical ieee versions (all identical) |

#### Unique files added from other repos

- **From gladius-research-dataset:** `collapse-raw-data.md`, `dragon-autopsy-v2.2.md`, `ghost-protocol.md`, `gladius-cell-division.md`, `gladius-progressive-expansion.md`, `gladius-pub-warm_memory_breakthrough.md`, `impulse-paper-notes.md`, `the-impulse-problem.md`, `uranium-layer7-gateway-halflife.md`, `v2.1-entropy-fix-notes.md`, `static-analysis.md`, `ANTI_COLLAPSE_PATCHES.md`, `GLADIUS_TRAJECTORY.md`, `TRAINING_PLAN.md`, `skeleton.md`, `sla2-orxl-analysis.md`, `v1_baseline.md`
- **From gladius-local:** `MANIFEST.md`, `habitat_decode_report.md`, `COLLECTION_REPORT.md`, `CHECKPOINTS.md`, `README.md` (fusion), `architecture_alignment.md`
- **From hf_gladius_audit:** `CALIBRATION_PROTOCOL.md`, `Dev_Log.md`, `FORMALIZATION.md`, `GLADIUS_v7_Architecture.md`, `Hyperspace_Kernel_Bench.md`, `Hyperspace_Narrative.md`, `INTEGRATION_GUIDE.md`, `Manifesto.md`, `TENSOR_MAP.md`, `Version_Manifest.md`, `Iron_Gap_Report.md`
- **From gladius-model-repo:** `GLADIUS_TRAJECTORY.md`, `MODEL_CARD.md`, `README.md`, `ROADMAP.md`, `SCALING_ANALYSIS.md`, `gaussian-head-ieee.md`, `pup.md`, 6 experiment files
- **From enterprise:** 5 Argmax docs, 2 AI docs, 26 MQL5 files
- **From consolidated:** 25 ARC docs, 10 articles, 5 design docs, 5 uranium IEEE papers
- **From project repos:** sbt-MANIFEST.md, scribe.md, viz-README.md, distillation-README.md, pq-quantizer-README.md, v7-narrative.md
- **From av-erp:** Hybrid Type Theory, System Prompt, pSAT Detection

### Final Statistics

- **papers/formal/**: 45 files
- **papers/working/**: 20 files
- **ieee/**: 20 files
- **reports/**: 11 files
- **experiments/**: 7 files
- **architecture/**: 28 files
- **consolidated/**: 42 files
- **models/**: 12 files
- **enterprise/**: 33 files

**Total: 244 markdown files** in the canonical research directory.

### What Was NOT Done

- ❌ No source repositories were deleted (as requested)
- ❌ No longer versions were overwritten with shorter ones
- ✅ All unique content was preserved
- ✅ Filename prefixes (e.g., `dataset-`, `audit-`, `model-repo-`) mark files whose content originated elsewhere
- ✅ IEEE papers from `consolidated/formal/ieee/` that were identical to canonical versions were not duplicated

### Verification

To verify no data was lost, run:
```bash
find /home/adam/worxpace/gladius/research/ -name "*.md" -type f | wc -l
```

---

*Report generated automatically by the Gladius Research Consolidation Script*
