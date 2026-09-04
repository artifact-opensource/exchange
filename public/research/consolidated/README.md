# Consolidated Research Catalog

> A curated subset of the **Artifact Virtual** research registry — only papers with valid titles and meaningful content are surfaced here. The full 183-entry registry lives in `lib/research-data.ts`.

## Featured (140 papers)

| Tier | Count | Source | Notes |
|------|------:|--------|-------|
| **Highlighted** | 12 | Core foundations | Neural topology, lattice consensus, synthetic entropy, Gladius corpus, Qorvex V8, ARC whitepaper |
| **AI / ML** | 36 | Local + IPFS | Architectures, training, inference, optimization |
| **Consciousness / Philosophy** | 22 | Local | Cognitive theory, sentience, qualia, mind |
| **Blockchain / Governance** | 18 | Local | Consensus, protocol, identity, SBT |
| **Tokenomics** | 14 | Local | Mechanism design, AMM, incentive theory |
| **Security** | 11 | Local | Cryptography, ZKP, vulnerability analysis |
| **Transformers / Architecture** | 27 | Local + HF | Attention, kernels, training, distillation |

## Excluded (43)

Filtered for: empty title, placeholder, or 1-line stub. The underlying file path still exists in the registry for completeness, but is not surfaced in the public catalog.

## View

Browse the live, rendered portal at **www.artifactvirtual.com** — includes:
- Brain-map visualization (categorical regions: Frontal, Temporal, Parietal, Occipital, Limbic, Brainstem)
- Search by title, abstract, or tags
- Direct links to IPFS CIDs and local paths
- Markdown document viewer (bold, headers, code, frontmatter stripped)

## Source

`lib/research-data.ts` is the canonical registry. `lib/research-index.ts` builds the search index at runtime. `public/research/consolidated/index.json` is the curated publish subset consumed by the public landing.
