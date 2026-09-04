# Experiment 003 — Literary DNA

**Stage:** Dragon Run (Seed, 10.2M params, 192 hidden, 6 layers)
**Date:** Day 15–20 (February 27 — March 4, 2026)
**Hardware:** Victus RTX 2050, 4GB VRAM

---

## Discovery

During the Dragon Run — 5,000 steps of the Seed stage on English text — something unexpected happened at high sampling temperatures.

At temperature ≤ 1.0, the model produced competent but generic English text. Standard behavior.

At temperature **1.3+**, the model began producing passages with recognizable literary style — Tolstoy's measured philosophical narration, Cervantes' picaresque irony, Homer's rhythmic repetition. Not quotations. Not memorized fragments. *Style* — the statistical fingerprint of an author's voice, emerging from 10.2M parameters.

## Training Context

| Metric | Value |
|--------|-------|
| Model | Seed (10.2M params) |
| Training data | English text corpus (mixed literary, web, reference) |
| Steps | 5,000 |
| Loss trajectory | 8.99 → 5.24 (best 4.57) |
| Warm memory events | 11,132 consolidation writes |
| BPE vocabulary | 8,000 tokens |

## The Observation

At low temperature (τ ≤ 1.0), the model's output is dominated by high-probability tokens — common words, frequent patterns, safe completions. This produces fluent but personality-less text.

At high temperature (τ ≥ 1.3), the probability distribution flattens. Lower-probability tokens surface. And in the weight geometry of a model trained on literary text, those lower-probability paths encode *stylistic signatures* — the rare word choices, unusual syntactic constructions, and rhythmic patterns that distinguish Tolstoy from Hemingway from Homer.

These are not memorized passages. The model has never seen enough text from any single author to memorize their voice. What it has done is encode the *statistical geometry* of multiple literary traditions into overlapping regions of weight space. Temperature 1.3+ navigates into those regions, and what emerges is recognizably authorial.

## Why This Matters

This is evidence of **emergent representational structure** at small scale. 10.2M parameters — smaller than most embedding tables — learned to encode stylistic dimensions of human literature. Not because we trained for it. Not because there was a "style loss" or a "literary objective." Because the English text corpus contained the signal, and the architecture was expressive enough to encode it.

The warm memory system recorded 11,132 consolidation events during this run. The model was actively writing to persistent memory — selecting what to remember from the literary corpus. Whether the literary style encoding lives in the backbone weights or the warm memory adapters (or both) is an open question.

## Connection to Philosophy

Ali's response: "The weight space IS the library. Temperature is which aisle you walk down."

This connects to the broader GLADIUS thesis: the kernel processes structure, not modalities. Literary style is structure — patterns of word choice, sentence rhythm, thematic emphasis. The kernel found that structure and encoded it, just as it would later find structure in MNIST images, financial time series, and mathematical notation.

## Files

- Dragon Run training logs: `runs/dragon/` on Victus
- Warm memory analysis: `papers/`
- Published analysis: "The Silent Brain" (warm memory patch fix that enabled the run)
