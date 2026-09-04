# GLADIUS Multi-Script Corpus — Collection Report

**Date:** 2026-03-13 (Day 29)
**Purpose:** Training data for GLADIUS Phase 3B multi-script attention
**Location:** `.ava-lab/gladius-multi-script/samples/`

## Collection Summary

| Script | File | Size | Articles | Characters | Status |
|--------|------|------|----------|------------|--------|
| Latin/English | `latin_english.txt` | SKIPPED | — | — | ✅ Already covered (121M tokens in training corpus) |
| Arabic | `arabic.txt` | 1.1 MB | 45 | 593,654 | ✅ Clean |
| Chinese (Mandarin) | `chinese.txt` | 738 KB | 36 | 263,107 | ✅ Clean |
| Korean (Hangul) | `korean.txt` | 1.2 MB | 56 | 482,475 | ✅ Clean |
| Devanagari (Hindi) | `devanagari_hindi.txt` | 14 MB | 997 | 5,380,133 | ✅ Clean (BBC Hindi via xlsum) |
| Ge'ez (Amharic) | `geez_amharic.txt` | 282 KB | 24 | 113,146 | ✅ Clean |
| **TOTAL** | | **~17.3 MB** | **1,158** | **~6.8M** | **5/5 scripts complete ✅** |

## Quality Verification

All completed files verified:
- ✅ Valid UTF-8 encoding
- ✅ Zero HTML tags (`<tag>`)
- ✅ Zero wikitext markup (`[[`, `{{`)
- ✅ Script-appropriate characters only
- ✅ No English/Latin mixed in (except header comments)

## Sources

- **Arabic:** ar.wikipedia.org — science, history, philosophy, literature, religion, technology
- **Chinese:** zh.wikipedia.org — history, philosophy, science, literature, classical texts
- **Korean:** ko.wikipedia.org — history, philosophy, science, literature, Korean culture
- **Amharic:** am.wikipedia.org — Amharic language articles using Ge'ez script
- **Hindi:** Alternative sources (Wikipedia rate-limited) — Gutenberg, HuggingFace datasets, sacred texts

## Collection Method

1. Wikipedia TextExtracts API (`explaintext=true`) for plain text extraction
2. Seed topics per language (30+ diverse categories: science, philosophy, history, math, art, religion, literature)
3. Link-following expansion from seed articles
4. Character-level cleaning: script-specific Unicode range filtering
5. Rate limiting: 0.5-0.8s delay between requests, retry on 429

## Issues Encountered

- **Wikipedia 429 Rate Limiting:** All languages hit aggressive rate limits. Arabic/Chinese/Korean/Amharic completed despite errors. Hindi collector crashed before write on first attempt (50 articles/334K chars lost in memory).
- **Hindi Retry:** Second attempt completely blocked (0 seed articles found). Switched to non-Wikipedia sources via sub-agent.
- **Amharic Corpus Size:** Smallest corpus (282KB) — am.wikipedia.org has limited content. This is the expected minimum for Ge'ez script.

## Unicode Ranges

| Script | Primary Range | Notes |
|--------|--------------|-------|
| Arabic | U+0600–U+06FF, U+0750–U+077F | Includes Arabic Supplement |
| Chinese | U+4E00–U+9FFF, U+3400–U+4DBF | CJK Unified, Extension A |
| Korean | U+AC00–U+D7AF, U+1100–U+11FF | Hangul Syllables + Jamo |
| Devanagari | U+0900–U+097F | Hindi, Sanskrit, Marathi |
| Ge'ez | U+1200–U+137F | Ethiopic script |

## Scaling Notes

Current corpus sizes (300KB-1.2MB per script) are sufficient for tokenizer training and initial multi-script experiments. For full pre-training at scale, recommended sources:

- **Wikipedia Database Dumps:** `dumps.wikimedia.org/{lang}wiki/latest/` — multi-GB per language
- **OSCAR Corpus:** High-quality web-crawled, 100+ languages
- **CC-100:** Facebook's cleaned Common Crawl, 100 languages
- **HuggingFace `wikipedia` dataset:** Pre-processed, streamable
- **Sacred texts:** Quran (Arabic), Vedas/Upanishads (Sanskrit/Hindi), Buddhist texts (Korean/Chinese)
