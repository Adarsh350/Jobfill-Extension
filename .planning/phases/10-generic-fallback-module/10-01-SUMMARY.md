---
phase: 10-generic-fallback-module
plan: "01"
subsystem: platforms/generic
tags: [test-scaffold, tdd, dom-fixture, todo-stubs]
dependency_graph:
  requires: []
  provides: [tests/fixtures/dom-generic.html, tests/unit/generic.test.js]
  affects: [platforms/generic.js]
tech_stack:
  added: []
  patterns: [MockNode DOM shim, todo stubs, node:test]
key_files:
  created:
    - tests/fixtures/dom-generic.html
    - tests/unit/generic.test.js
  modified: []
decisions:
  - "todo stubs (not skip) keep CI green and requirement coverage visible — matches Phase 7/8/9 precedent"
  - "Self-contained MockNode DOM shim copied from lever.test.js — no jsdom, no npm, consistent with no-package.json project constraint"
  - "generic.test.js loads module in before() hook (not top-level require) — allows file to parse safely before platforms/generic.js is implemented in plan 02"
metrics:
  duration: "8 minutes"
  completed: "2026-03-15"
  tasks_completed: 2
  files_created: 2
  files_modified: 0
---

# Phase 10 Plan 01: Generic Fallback Module — Test Scaffold Summary

**One-liner:** DOM fixture and 19-stub test scaffold for generic.js heuristic fallback platform using self-contained MockNode pattern.

## What Was Built

- `tests/fixtures/dom-generic.html` — Realistic unknown-ATS form with 10 fillable fields (text/email/tel/textarea/select), 5 excluded inputs (hidden/submit/password/file/CAPTCHA), and page metadata (`<title>`, `<h1>`, `<meta name="description">`) for getJobDetails extraction.
- `tests/unit/generic.test.js` — 19 todo stubs across 7 describe blocks, self-contained MockNode DOM shim (no jsdom), before() hook loads platforms/generic.js.

## Test Results

```
node --test tests/unit/generic.test.js
  tests 19 | suites 7 | pass 0 | fail 0 | todo 19
  EXIT: 0

node tests/run-all.js
  EXIT: 0  (no regressions)
```

## Stub Coverage (19 total)

| Describe block | Stubs | Requirements |
|----------------|-------|--------------|
| generic.matches() | 3 | FR-2.1 |
| generic.getJobDetails() | 3 | FR-2.3 |
| generic.fill() — heuristic field discovery | 4 | FR-2.1, FR-2.9 |
| generic.fill() — exclusions | 4 | FR-2.9 |
| generic.fill() — needs_review policy | 2 | FR-3.4 |
| generic.fill() — already-has-value guard | 1 | FR-2.6 |
| generic.fill() — custom questions | 2 | FR-7.6 |

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check

- [x] `tests/fixtures/dom-generic.html` exists and contains all 8 required strings (verified by node -e check)
- [x] `tests/unit/generic.test.js` exists with 19 todo stubs, 7 describe blocks
- [x] `node --test tests/unit/generic.test.js` exits 0, 19 todo, 0 fail
- [x] `node tests/run-all.js` exits 0, no regressions

## Self-Check: PASSED
