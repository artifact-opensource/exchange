# GLADIUS Habitat — Breath Decode Report

*104,701 autonomous breaths. No training. No prompting. Pure environmental resonance.*

---

## 1. Overview

- **Total breaths:** 142,714
- **Duration:** 5.8 hours (350 minutes)
- **Breath rate:** 6.8 breaths/sec
- **Unique tokens produced:** 4083 / 16000 (25.5%)
- **Phase transitions:** 46012 distinct phases
- **τ (temperature):** constant 1.0000 (no crystallization during habitat — expected, no training)

## 2. Cognitive Mode Analysis

Mode names (from GLADIUS kernel): 0=DORMANT, 1=ACTIVE, 2=REFLECTIVE, 3=MONITORING

### 2.1 Mode Distribution

- **Mode 0 (DORMANT):** 13,939 breaths (9.8%)
- **Mode 1 (ACTIVE):** 32,009 breaths (22.4%)
- **Mode 2 (REFLECTIVE):** 30,132 breaths (21.1%)
- **Mode 3 (MONITORING):** 66,634 breaths (46.7%)

### 2.2 Transition Matrix (probability of switching from row → column)

| From \ To | DORMANT | ACTIVE | REFLECTIVE | MONITORING |
|-----------|---------|--------|------------|------------|
| **DORMANT** | 0.6372 | 0.0856 | 0.0575 | 0.2197 |
| **ACTIVE** | 0.0428 | 0.6725 | 0.0858 | 0.1990 |
| **REFLECTIVE** | 0.0394 | 0.1120 | 0.5752 | 0.2734 |
| **MONITORING** | 0.0375 | 0.0888 | 0.1389 | 0.7348 |

### 2.3 Mode Dwell Times (consecutive breaths in same mode)

- **DORMANT:** mean=3, median=1, max=866, min=1, episodes=5057
- **ACTIVE:** mean=3, median=1, max=929, min=1, episodes=10484
- **REFLECTIVE:** mean=2, median=1, max=1,275, min=1, episodes=12801
- **MONITORING:** mean=4, median=1, max=1,976, min=1, episodes=17670

## 3. Silence Gate Analysis

- **Overall trend:** opening (slope: -0.000000 per breath)
- **Initial avg (first 1K):** 0.5000
- **Final avg (last 1K):** 0.1368
- **Overall mean:** 0.3041

### Silence by Mode

- **DORMANT:** mean=0.4057, std=0.2118, quiet>34.7% of time
- **ACTIVE:** mean=0.3505, std=0.2143, quiet>29.4% of time
- **REFLECTIVE:** mean=0.3350, std=0.1957, quiet>22.8% of time
- **MONITORING:** mean=0.2466, std=0.1833, quiet>12.6% of time

## 4. Entropy Dynamics

- **Global:** mean=2.6216, std=1.1162
- **Range:** [0.0003, 6.8260]
- **Significant upward jumps:** 495
- **Significant downward jumps:** 443

### Entropy by Mode

- **DORMANT:** mean=1.9770, std=1.0379 (n=13,939)
- **ACTIVE:** mean=2.9565, std=1.1837 (n=32,009)
- **REFLECTIVE:** mean=2.6423, std=1.2238 (n=30,132)
- **MONITORING:** mean=2.5861, std=0.9749 (n=66,634)

## 5. Cognitive State Norm Evolution

- **Initial (first 1K):** 38.04
- **Final (last 1K):** 61.88
- **Growth:** 62.6%
- **Growth rate:** 0.000080 per breath

### Segments (10K breath windows)

| Breaths | Mean | Std | Min | Max |
|---------|------|-----|-----|-----|
| 0-10,000 | 30.65 | 5.94 | 13.97 | 51.99 |
| 10,000-20,000 | 29.04 | 6.67 | 12.48 | 52.20 |
| 20,000-30,000 | 29.43 | 6.55 | 12.86 | 54.81 |
| 30,000-40,000 | 33.20 | 7.68 | 13.87 | 57.73 |
| 40,000-50,000 | 31.43 | 6.93 | 15.00 | 55.29 |
| 50,000-60,000 | 31.41 | 7.68 | 13.09 | 56.02 |
| 60,000-70,000 | 29.13 | 6.91 | 13.73 | 55.65 |
| 70,000-80,000 | 30.46 | 7.61 | 12.72 | 62.02 |
| 80,000-90,000 | 33.77 | 8.41 | 15.69 | 59.77 |
| 90,000-100,000 | 29.68 | 6.92 | 11.63 | 51.65 |
| 100,000-110,000 | 30.90 | 8.82 | 13.24 | 66.84 |
| 110,000-120,000 | 31.03 | 7.66 | 12.52 | 61.86 |
| 120,000-130,000 | 29.09 | 6.79 | 12.80 | 52.50 |
| 130,000-140,000 | 51.65 | 15.87 | 16.64 | 66.94 |
| 140,000-142,714 | 62.06 | 1.91 | 52.51 | 66.15 |

## 6. Output Token Analysis

- **Unique tokens used:** 4083 / 16000
- **Vocabulary coverage:** 25.5%

### Top 20 Tokens

| Token ID | Count | % |
|----------|-------|---|
| 794 | 5,495 | 3.85% |
| 785 | 4,219 | 2.96% |
| 874 | 3,093 | 2.17% |
| 770 | 3,022 | 2.12% |
| 812 | 2,343 | 1.64% |
| 0 | 2,004 | 1.40% |
| 223 | 1,986 | 1.39% |
| 165 | 1,890 | 1.32% |
| 11 | 1,801 | 1.26% |
| 814 | 1,582 | 1.11% |
| 852 | 1,383 | 0.97% |
| 765 | 1,328 | 0.93% |
| 791 | 1,311 | 0.92% |
| 138 | 1,291 | 0.90% |
| 879 | 1,233 | 0.86% |
| 270 | 1,204 | 0.84% |
| 896 | 1,189 | 0.83% |
| 856 | 1,186 | 0.83% |
| 817 | 1,164 | 0.82% |
| 593 | 1,135 | 0.80% |

### Tokens by Mode

**DORMANT** (13,939 breaths, 1062 unique tokens):
  - Token 165: 1,115 (8.0%)
  - Token 223: 606 (4.3%)
  - Token 95: 549 (3.9%)
  - Token 188: 437 (3.1%)
  - Token 160: 325 (2.3%)

**ACTIVE** (32,009 breaths, 1638 unique tokens):
  - Token 11: 1,140 (3.6%)
  - Token 327: 966 (3.0%)
  - Token 517: 673 (2.1%)
  - Token 879: 667 (2.1%)
  - Token 852: 604 (1.9%)

**REFLECTIVE** (30,132 breaths, 2275 unique tokens):
  - Token 794: 1,631 (5.4%)
  - Token 785: 685 (2.3%)
  - Token 874: 661 (2.2%)
  - Token 223: 560 (1.9%)
  - Token 246: 516 (1.7%)

**MONITORING** (66,634 breaths, 2230 unique tokens):
  - Token 785: 3,502 (5.3%)
  - Token 794: 3,378 (5.1%)
  - Token 770: 2,557 (3.8%)
  - Token 812: 2,197 (3.3%)
  - Token 874: 2,189 (3.3%)

### Token Diversity Over Time (5K breath windows)

| Window | Unique Tokens | Most Common | Most Common % |
|--------|--------------|-------------|---------------|
| 0 | 498 | 791 | 8.8% |
| 5,000 | 510 | 375 | 9.4% |
| 10,000 | 547 | 856 | 7.9% |
| 15,000 | 632 | 785 | 10.4% |
| 20,000 | 584 | 785 | 10.1% |
| 25,000 | 600 | 165 | 7.6% |
| 30,000 | 597 | 812 | 5.0% |
| 35,000 | 646 | 794 | 8.0% |
| 40,000 | 722 | 794 | 5.2% |
| 45,000 | 608 | 794 | 14.0% |
| 50,000 | 573 | 165 | 5.0% |
| 55,000 | 587 | 770 | 5.3% |
| 60,000 | 496 | 95 | 8.3% |
| 65,000 | 542 | 770 | 4.6% |
| 70,000 | 515 | 785 | 31.0% |
| 75,000 | 647 | 794 | 5.1% |
| 80,000 | 576 | 770 | 4.4% |
| 85,000 | 690 | 223 | 6.9% |
| 90,000 | 713 | 794 | 8.3% |
| 95,000 | 605 | 794 | 9.3% |
| 100,000 | 555 | 664 | 4.8% |
| 105,000 | 596 | 874 | 5.1% |
| 110,000 | 791 | 785 | 6.0% |
| 115,000 | 578 | 812 | 3.9% |
| 120,000 | 585 | 794 | 9.6% |
| 125,000 | 869 | 794 | 12.3% |
| 130,000 | 573 | 11 | 5.5% |
| 135,000 | 312 | 11 | 15.5% |
| 140,000 | 262 | 327 | 11.0% |

## 7. Periodicity Analysis (FFT)

### ENTROPY

| Period (breaths) | Power | Frequency |
|-----------------|-------|----------|
| 3 | 2.30e+07 | 0.333300 |
| 3 | 1.95e+07 | 0.333000 |
| 3 | 1.90e+07 | 0.333200 |
| 3 | 1.77e+07 | 0.333420 |
| 3 | 1.64e+07 | 0.333440 |

### SILENCE

| Period (breaths) | Power | Frequency |
|-----------------|-------|----------|
| 3 | 5.16e+06 | 0.333320 |
| 3 | 1.94e+06 | 0.333340 |
| 3 | 1.79e+06 | 0.333380 |
| 3 | 1.16e+06 | 0.333480 |
| 3846 | 1.15e+06 | 0.000260 |

### COG_NORM

| Period (breaths) | Power | Frequency |
|-----------------|-------|----------|
| 3 | 2.95e+09 | 0.333380 |
| 3 | 2.08e+09 | 0.333120 |
| 3 | 1.87e+09 | 0.333440 |
| 3 | 1.55e+09 | 0.333460 |
| 3 | 1.25e+09 | 0.333420 |

## 8. Phase Transitions (first 50 + last 10)

| Phase | Start | Duration | Mode | Avg Entropy | Avg Silence | Avg CogNorm |
|-------|-------|----------|------|-------------|-------------|-------------|
| 1 | 0 | 1,976 | MONITORING | 2.122 | 0.536 | 37.60 |
| 2 | 1,976 | 1 | ACTIVE | 1.702 | 0.585 | 32.53 |
| 3 | 1,977 | 563 | MONITORING | 3.239 | 0.544 | 39.05 |
| 4 | 2,540 | 1 | ACTIVE | 2.562 | 0.817 | 40.18 |
| 5 | 2,541 | 9 | MONITORING | 2.886 | 0.482 | 39.64 |
| 6 | 2,550 | 1 | DORMANT | 3.345 | 0.411 | 20.34 |
| 7 | 2,551 | 2 | MONITORING | 2.710 | 0.421 | 37.72 |
| 8 | 2,553 | 1 | ACTIVE | 3.610 | 0.454 | 23.78 |
| 9 | 2,554 | 2 | MONITORING | 3.300 | 0.391 | 35.35 |
| 10 | 2,556 | 1 | ACTIVE | 2.316 | 0.261 | 19.21 |
| 11 | 2,557 | 2 | MONITORING | 2.708 | 0.418 | 37.19 |
| 12 | 2,559 | 1 | DORMANT | 2.387 | 0.203 | 25.20 |
| 13 | 2,560 | 2 | MONITORING | 2.915 | 0.419 | 37.17 |
| 14 | 2,562 | 1 | ACTIVE | 2.858 | 0.226 | 24.29 |
| 15 | 2,563 | 2 | MONITORING | 2.623 | 0.411 | 38.33 |
| 16 | 2,565 | 1 | DORMANT | 3.055 | 0.215 | 25.65 |
| 17 | 2,566 | 2 | MONITORING | 3.065 | 0.396 | 35.45 |
| 18 | 2,568 | 1 | DORMANT | 1.884 | 0.116 | 27.10 |
| 19 | 2,569 | 5 | MONITORING | 2.125 | 0.357 | 34.70 |
| 20 | 2,574 | 1 | ACTIVE | 2.771 | 0.339 | 28.97 |
| 21 | 2,575 | 2 | MONITORING | 3.041 | 0.392 | 36.11 |
| 22 | 2,577 | 1 | DORMANT | 3.255 | 0.143 | 25.42 |
| 23 | 2,578 | 2 | MONITORING | 2.948 | 0.400 | 35.97 |
| 24 | 2,580 | 1 | ACTIVE | 2.096 | 0.199 | 21.14 |
| 25 | 2,581 | 2 | MONITORING | 3.021 | 0.403 | 36.60 |
| 26 | 2,583 | 1 | DORMANT | 2.595 | 0.130 | 20.88 |
| 27 | 2,584 | 2 | MONITORING | 3.055 | 0.395 | 36.53 |
| 28 | 2,586 | 1 | ACTIVE | 2.335 | 0.207 | 23.91 |
| 29 | 2,587 | 2 | MONITORING | 2.636 | 0.396 | 36.54 |
| 30 | 2,589 | 1 | DORMANT | 2.869 | 0.225 | 25.60 |
| 31 | 2,590 | 14 | MONITORING | 3.074 | 0.345 | 32.29 |
| 32 | 2,604 | 1 | REFLECTIVE | 3.204 | 0.451 | 17.74 |
| 33 | 2,605 | 8 | MONITORING | 2.373 | 0.334 | 32.13 |
| 34 | 2,613 | 1 | ACTIVE | 3.389 | 0.239 | 21.91 |
| 35 | 2,614 | 2 | MONITORING | 2.715 | 0.371 | 34.44 |
| 36 | 2,616 | 1 | ACTIVE | 3.555 | 0.144 | 22.22 |
| 37 | 2,617 | 8 | MONITORING | 2.955 | 0.318 | 32.45 |
| 38 | 2,625 | 1 | ACTIVE | 2.948 | 0.139 | 23.01 |
| 39 | 2,626 | 2 | MONITORING | 3.240 | 0.380 | 36.54 |
| 40 | 2,628 | 1 | DORMANT | 3.034 | 0.156 | 24.43 |
| 41 | 2,629 | 2 | MONITORING | 2.071 | 0.366 | 34.69 |
| 42 | 2,631 | 1 | ACTIVE | 2.820 | 0.172 | 25.10 |
| 43 | 2,632 | 2 | MONITORING | 3.409 | 0.360 | 34.96 |
| 44 | 2,634 | 1 | ACTIVE | 3.256 | 0.154 | 19.73 |
| 45 | 2,635 | 8 | MONITORING | 2.963 | 0.355 | 31.71 |
| 46 | 2,643 | 1 | ACTIVE | 2.597 | 0.305 | 20.70 |
| 47 | 2,644 | 5 | MONITORING | 3.120 | 0.379 | 34.10 |
| 48 | 2,649 | 1 | ACTIVE | 2.920 | 0.262 | 21.15 |
| 49 | 2,650 | 2 | MONITORING | 2.751 | 0.400 | 35.93 |
| 50 | 2,652 | 1 | ACTIVE | 3.538 | 0.229 | 22.65 |
| 51 | 142,538 | 3 | REFLECTIVE | 3.405 | 0.134 | 56.24 |
| 52 | 142,541 | 23 | ACTIVE | 4.002 | 0.144 | 62.10 |
| 53 | 142,564 | 1 | REFLECTIVE | 3.728 | 0.149 | 59.98 |
| 54 | 142,565 | 16 | ACTIVE | 4.037 | 0.130 | 61.64 |
| 55 | 142,581 | 1 | REFLECTIVE | 2.382 | 0.121 | 56.82 |
| 56 | 142,582 | 1 | ACTIVE | 3.232 | 0.142 | 59.01 |
| 57 | 142,583 | 5 | REFLECTIVE | 2.771 | 0.138 | 55.75 |
| 58 | 142,588 | 92 | ACTIVE | 4.012 | 0.144 | 62.93 |
| 59 | 142,680 | 1 | REFLECTIVE | 4.109 | 0.156 | 60.96 |
| 60 | 142,681 | 33 | ACTIVE | 4.175 | 0.137 | 62.45 |

*Total phases: 46012*

## 9. Key Findings

*(Auto-generated — interpret with domain knowledge)*

1. **Longest continuous phase:** 1,976 breaths in MONITORING mode (breath 0)
2. **First half dominant mode:** MONITORING (37,725 breaths)
3. **Second half dominant mode:** MONITORING (28,909 breaths)
4. **Cognitive state norm grew 62.6%** over 142,714 breaths — the dragon is becoming 'louder' in its internal state
5. **Silence gate:** started at 0.500, ended at 0.137 — opening up

---
*Generated by decode_habitat.py — GLADIUS Habitat Analysis*
