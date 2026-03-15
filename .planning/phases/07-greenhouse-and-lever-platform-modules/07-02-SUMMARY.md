---
phase: 07-greenhouse-and-lever-platform-modules
plan: "02"
subsystem: platforms
tags: [greenhouse, platform-module, tdd, fill-engine]
dependency_graph:
  requires: [utils/filler.js, utils/matcher.js, utils/events.js, 07-01]
  provides: [window.JobFill.platforms.greenhouse]
  affects: [content.js, utils/overlay.js]
tech_stack:
  added: []
  patterns: [IIFE-module, selector-fallback-chain, skip-if-filled, answer-bank-custom-questions]
key_files:
  created: [platforms/greenhouse.js]
  modified: [tests/unit/greenhouse.test.js]
decisions:
  - Inline DOM mock in test file — no jsdom/happy-dom dependency; Map-backed querySelector with explicit selector routing
  - before() hook (not beforeEach) for stub setup + module load; beforeEach resets DOM state only
  - getAdjacentLabel uses 4-method chain: label[for=id] → closest(label) → prevSibling → aria-label/placeholder
metrics:
  duration: ~25min
  completed: 2026-03-15
  tasks_completed: 2
  files_created: 1
  files_modified: 1
---

# Phase 7 Plan 02: Greenhouse Platform Module Summary

**One-liner:** Greenhouse fill module with 9-field selector-fallback chain, skip-if-filled guard, custom question answer bank, and needs_review detection for unresolved template variables.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | RED — 10 failing assertions | 4fb3ca1 | tests/unit/greenhouse.test.js |
| 2 | GREEN — implement greenhouse.js | 3c756f2 | platforms/greenhouse.js |

## Verification

- `node --test tests/unit/greenhouse.test.js` — 10 pass, 0 fail, 0 todo
- `node --test tests/unit/events.test.js tests/unit/filler.test.js tests/unit/matcher.test.js tests/unit/greenhouse.test.js tests/unit/lever.test.js` — 62 pass, 0 fail, 0 todo

## What Was Built

`platforms/greenhouse.js` is an IIFE that registers `window.JobFill.platforms.greenhouse` with three methods:

- **matches(hostname)** — regex test for `greenhouse.io`
- **fill(profile, answerBank)** — two-pass fill: standard fields then custom questions
- **getJobDetails()** — extracts companyName and jobTitle from DOM h1 elements with title fallback

**FIELDS table** defines 9 standard fields (First Name, Last Name, Email, Phone, LinkedIn, Resume, Cover Letter, Location, Work Authorization) each with a 2-3 selector fallback chain.

**Fill logic:**
1. resolveSelector() walks the selector array, returns first matching DOM element
2. File inputs (`isFile: true`) are always skipped with reason `'resume upload in Phase 11'`
3. hasValue() guard skips already-filled fields with reason `'already has value'`
4. Missing profile value → skipped/no profile value
5. Calls `window.JobFill.filler.fillField(el, value)`

**Custom questions:** collects all `textarea, input[type="text"]` not in the handledEls Set, extracts label via getAdjacentLabel, calls `findBestAnswer`, runs `substituteVariables`, detects `{{` in resolved text → `needs_review` status.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Node test runner has no document global**
- **Found during:** Task 1 (RED)
- **Issue:** `document.querySelector` used in tests and platform module; Node 24 has no DOM API; jsdom/happy-dom not installed
- **Fix:** Wrote inline Map-backed `global.document` mock directly in greenhouse.test.js with explicit selector routing matching all selectors used by the module
- **Files modified:** tests/unit/greenhouse.test.js
- **Commit:** 4fb3ca1

**2. [Rule 3 - Blocking] window undefined before module loads**
- **Found during:** Task 1 (RED) — previous attempt used beforeEach to set up window but module was required at file top before any hooks ran
- **Fix:** Moved `global.window = global` and stub setup into `before()` hook; moved `require('../../platforms/greenhouse')` inside that hook so window is ready when the IIFE executes
- **Files modified:** tests/unit/greenhouse.test.js
- **Commit:** 4fb3ca1

## Self-Check

- [x] platforms/greenhouse.js exists (334 lines)
- [x] tests/unit/greenhouse.test.js updated with real assertions
- [x] Commit 4fb3ca1 exists (RED)
- [x] Commit 3c756f2 exists (GREEN)
- [x] 10/10 greenhouse tests pass
- [x] 62/62 full suite tests pass

## Self-Check: PASSED
