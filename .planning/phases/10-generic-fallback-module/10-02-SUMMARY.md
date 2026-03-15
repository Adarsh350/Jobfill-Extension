---
phase: 10
plan: "02"
subsystem: platforms
tags: [generic, heuristic, tdd, fallback, needs_review]
dependency_graph:
  requires: [utils/filler.js, utils/matcher.js, platforms/generic.js stub]
  provides: [platforms/generic.js]
  affects: [content.js platform dispatch]
tech_stack:
  added: []
  patterns: [IIFE, heuristic scoring, KEYWORD_MAP, shouldSkip exclusion guard, hasValue guard]
key_files:
  created: [platforms/generic.js]
  modified: [tests/unit/generic.test.js]
decisions:
  - "discoverFields() uses broad 'input, select, textarea' selector + JS shouldSkip() filter — avoids :not() chains unsupported in test DOM shims"
  - "hasValue() checks both el.value and el._attrs.value — accommodates live DOM and test mock attribute storage"
  - "All fills produce status needs_review (never filled) — heuristic detection cannot guarantee correctness per Phase 10 spec"
  - "CAPTCHA exclusion via CAPTCHA_PATTERNS regex on name+id — covers g-recaptcha, hcaptcha, captcha variants"
  - "fillCustomQuestions confidence threshold 0.75 — consistent with matcher.js FR-3.7 gate"
metrics:
  duration: "~15 minutes"
  completed: "2026-03-15"
  tasks_completed: 2
  files_created: 1
  files_modified: 1
---

# Phase 10 Plan 02: Generic Heuristic Fallback Module Summary

**One-liner:** Heuristic fallback platform module using KEYWORD_MAP scoring (14 keys, 30+ mappings) with universal needs_review policy and CAPTCHA exclusion.

---

## What Was Built

`platforms/generic.js` — IIFE that registers `window.JobFill.platforms.generic`. The last-resort platform module that fires on every page not matched by a specific platform handler.

**Key behaviours:**

- `matches()` always returns `true` — load order in manifest.json determines priority
- `discoverFields()` scores every `input/select/textarea` against 14 profile keys using keyword presence in `name`, `id`, `placeholder`, `aria-label`, and `autocomplete` attributes. Highest-score assignment wins; each element assigned to at most one key; each key gets at most one element.
- KEYWORD_MAP: firstName, lastName, fullName, email, phone, city, country, linkedinUrl, portfolioUrl, currentTitle, yearsExperience, workAuthorization, nationality, summary — 30+ keyword aliases total.
- `shouldSkip()` blocks: `hidden`, `submit`, `button`, `reset`, `image`, `password`, `file`, `checkbox`, `radio` types, plus CAPTCHA patterns (`/captcha|recaptcha|g-recaptcha|hcaptcha/i`).
- `hasValue()` skips already-filled elements — checks `el.value` (live DOM) and `el._attrs.value` (test mock).
- All successful fills use `status: 'needs_review'` — never `'filled'`.
- `fillCustomQuestions()` uses `matcher.findBestAnswer()` with 0.75 confidence gate and `substituteVariables()`.
- `getJobDetails()`: title pipe/dash split → h1 fallback → meta description `at X` pattern.

---

## Test Results

| Suite | Tests | Pass | Fail | Todo |
|-------|-------|------|------|------|
| generic.test.js | 19 | 19 | 0 | 0 |
| Full suite (run-all.js) | 114+ | All | 0 | 0 |

---

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] discoverFields() complex :not() selector broke test DOM shim**
- **Found during:** GREEN phase (tests failing for firstName/email/phone)
- **Issue:** The compound `:not([type="hidden"]):not([type="submit"])...` selector returned `[]` from the mock's mini CSS parser — it doesn't support chained `:not()`.
- **Fix:** Changed to broad `'input, select, textarea'` selector; JS `shouldSkip()` already handles all exclusion logic.
- **Files modified:** `platforms/generic.js`
- **Commit:** 8295e1b

**2. [Rule 1 - Bug] hasValue() didn't detect test-mock pre-filled values**
- **Found during:** GREEN phase (already-has-value guard tests failing)
- **Issue:** MockNode stores attribute `value` in `el._attrs.value`, but `hasValue()` only checked `el.value`. The `value` property accessor returns `el._value` which is only set on write, not from HTML attribute parsing.
- **Fix:** `hasValue()` now checks `el.value` first, falls back to `el._attrs.value`.
- **Files modified:** `platforms/generic.js`
- **Commit:** 8295e1b

---

## Self-Check

- [x] `platforms/generic.js` exists
- [x] `tests/unit/generic.test.js` updated (19 real assertions)
- [x] Commit c576e38 (RED) exists
- [x] Commit 8295e1b (GREEN) exists
- [x] 19/19 tests pass, 0 fail, 0 todo

## Self-Check: PASSED
