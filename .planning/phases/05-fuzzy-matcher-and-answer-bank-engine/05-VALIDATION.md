---
phase: 5
slug: fuzzy-matcher-and-answer-bank-engine
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-14
---

# Phase 5 — Validation Strategy

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | node:test + node:assert (built-in) |
| **Quick run command** | `node --test tests/unit/matcher.test.js` |
| **Full suite command** | `node tests/run-all.js` |
| **Estimated runtime** | ~3 seconds |

---

## Wave 0 Requirements

- [ ] `tests/unit/matcher.test.js` — stub tests for all 7 functions

---

## Per-Task Verification Map

| Task | Plan | Wave | Test Command | Status |
|------|------|------|-------------|--------|
| Wave 0: stubs | 05-01 | 0 | `node --test tests/unit/matcher.test.js` exits 0 (all todo) | ⬜ pending |
| Levenshtein + alias map | 05-01 | 1 | matchDropdownOption tests pass | ⬜ pending |
| scoreAnswerBankEntry + findBestAnswer | 05-01 | 1 | scoring tests pass | ⬜ pending |
| substituteVariables + extractKeywords | 05-01 | 1 | pure function tests pass | ⬜ pending |

---

## Validation Sign-Off

- [ ] All unit tests green
- [ ] substituteVariables leaves unresolved {{tokens}} visible
- [ ] UAE/US alias map correctly resolves
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
