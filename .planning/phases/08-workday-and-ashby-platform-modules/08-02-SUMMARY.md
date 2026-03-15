---
phase: 08
plan: 02
subsystem: platforms
tags: [workday, shadow-dom, tdd, platform-module]
dependency_graph:
  requires: [08-01, utils/filler.js, utils/events.js]
  provides: [platforms/workday.js]
  affects: [content.js platform detection]
tech_stack:
  added: []
  patterns: [IIFE, shadowQuery, dispatchBlur, isVisible guard, TDD RED-GREEN]
key_files:
  created:
    - platforms/workday.js
  modified:
    - tests/unit/workday.test.js
decisions:
  - fillCustomQuestions deferred — Workday custom questions require UAT validation before implementing
  - isVisible() uses offsetParent !== null — matches standard DOM visibility check
  - resolveField() tries primary selector before fallback, both via shadowQuery
  - companyName parsed from subdomain split('.')[0] with hyphen-to-space normalisation
metrics:
  duration: ~10 minutes
  completed: "2026-03-15"
  tasks_completed: 2
  files_created: 1
  files_modified: 1
requirements: [FR-2.1, FR-2.3, FR-2.6, FR-2.9, FR-7.1, NFR-5.4]
---

# Phase 8 Plan 02: Workday Platform Module Summary

Workday IIFE platform module with shadowQuery traversal, isVisible guard, dispatchBlur after each fill, and 7 TDD tests — all GREEN.

## What Was Built

`platforms/workday.js` — IIFE registered on `window.JobFill.platforms.workday` (~175 lines).

Key behaviors implemented:
- `matches()` — regex test for `myworkdayjobs.com`
- `resolveField()` — loops selectors via `window.JobFill.filler.shadowQuery(document.body, sel)` — no `document.querySelector` used anywhere
- `isVisible(el)` — returns `el.offsetParent !== null`; skips hidden next-step fields
- `hasValue(el)` — skips pre-filled inputs and selects
- `fillStandardFields()` — 7 FIELDS (firstName, lastName, email, phone, city, country, linkedinUrl), applies both guards, calls `dispatchBlur` after every successful fill
- `getJobDetails()` — `shadowQuery` for `h2[data-automation-id="jobPostingHeader"]` + subdomain parse from `window.location.hostname`
- `fill()` — async entry point, returns results array

## TDD Cycle

**RED commit:** `4c3a9d7` — 7 real assertions replacing todo stubs, all fail (module not found)

**GREEN commit:** `90bc92f` — full implementation, 7/7 pass, 0 fail, 0 todo

## Test Results

```
tests 7  |  pass 7  |  fail 0  |  todo 0  |  skipped 0
```

Full suite: no regressions across events, filler, matcher, greenhouse, lever, workday test files.

## Decisions Made

1. **fillCustomQuestions deferred** — Workday custom questions use dynamic shadow DOM panels that shift across application steps. Implementing without UAT risks silent misfills. Standard fields only for this phase.
2. **isVisible via offsetParent** — Standard cross-browser technique; works in Node test environment with mock objects (`offsetParent: {}` = visible, `offsetParent: null` = hidden).
3. **resolveField primary-then-fallback** — `data-automation-id` exact match tried first, attribute-contains fallback second. Reduces risk of false matches on complex Workday forms.
4. **companyName from subdomain** — `acme.myworkdayjobs.com` → `acme`; hyphens replaced with spaces for readability.

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

| Item | Status |
|------|--------|
| `platforms/workday.js` exists | FOUND |
| RED commit `4c3a9d7` exists | FOUND |
| GREEN commit `90bc92f` exists | FOUND |
