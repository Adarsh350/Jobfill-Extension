---
phase: 05-fuzzy-matcher-and-answer-bank-engine
plan: 02
subsystem: utils/matcher.js
tags: [tdd, matching, fuzzy, answer-bank, offline]
requirements: [FR-2.4, FR-3.4, FR-3.5, FR-3.7]

dependency_graph:
  requires: [05-01]
  provides: [utils/matcher.js, window.JobFill.matcher]
  affects: [platform modules, content script coordinator]

tech_stack:
  added: []
  patterns:
    - top-level function declarations with dual browser/CJS export shim
    - single-row space-optimised Levenshtein DP
    - Jaccard similarity with category bonus scoring (0.8/0.2 weights)
    - ALIAS_MAP exact lookup prevents fuzzy cross-expansion (US vs UAE)

key_files:
  created: []
  modified:
    - utils/matcher.js
    - tests/unit/matcher.test.js

decisions:
  - Top-level declarations pattern used (not IIFE) — avoids levenshtein scoping conflict with module.exports shim outside closure
  - levenshtein exposed via module.exports for direct unit testing even though not on window.JobFill.matcher
  - ALIAS_MAP lookup is exact on targetLower — prevents 'us' fuzzy-matching to 'uae'
  - substituteVariables returns match (not '') for unknown keys — keeps {{token}} visible per FR-3.7
  - findBestAnswer threshold is 0.75 — returns null below, consistent with FR-3.7 confidence gate

metrics:
  duration: ~10 minutes
  completed: 2026-03-14
  tasks_completed: 1
  files_modified: 2
---

# Phase 5 Plan 02: utils/matcher.js — Complete Offline Matching Engine Summary

**One-liner:** Jaccard + Levenshtein offline matcher with 4-tier dropdown cascade, alias map, and 0.75-threshold answer bank lookup.

---

## What Was Built

`utils/matcher.js` — complete offline matching engine with 6 exported functions and a dual browser/CJS shim. All 29 tests pass (0 fail, 0 todo).

### Functions Implemented

| Function | Description |
|----------|-------------|
| `levenshtein(a, b)` | Space-optimised single-row DP, swaps so shorter string is `a` |
| `matchDropdownOption(options, targetValue)` | 4-tier cascade: exact → alias exact → case-insensitive includes → Levenshtein ≤3 |
| `extractKeywords(text)` | Lowercase, strip punctuation, split, filter stop words and length ≤1 |
| `scoreAnswerBankEntry(questionText, entry)` | Jaccard(question tokens, entry tokens+keywords) × 0.8 + category bonus × 0.2 |
| `findBestAnswer(questionText, answerBank)` | Returns `{entry, score}` if best ≥ 0.75, else null |
| `substituteVariables(answerText, variables)` | Regex replace; leaves `{{token}}` visible if key absent |

---

## Test Results

```
tests 29  |  pass 29  |  fail 0  |  todo 0  |  skipped 0
```

All 6 describe blocks green. Exit code 0.

---

## Verification Spot-Checks

- `matchDropdownOption([...], 'US').text` → `United States` (not UAE)
- `substituteVariables('At {{company_name}}', {})` → `At {{company_name}}`
- `findBestAnswer('unrelated random text', [...salary entry...])` → `null`

---

## Deviations from Plan

None — plan executed exactly as written.

---

## Self-Check: PASSED

- `utils/matcher.js` — exists and loads via require()
- `tests/unit/matcher.test.js` — 29 pass, 0 todo confirmed
- Commit `341fe19` — verified in git log
