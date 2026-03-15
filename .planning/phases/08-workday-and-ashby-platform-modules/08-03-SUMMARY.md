---
phase: 08-workday-and-ashby-platform-modules
plan: "03"
subsystem: platforms
tags: [ashby, platform-module, tdd, custom-questions, data-field-type]
dependency_graph:
  requires: [utils/filler.js, utils/matcher.js, utils/events.js]
  provides: [window.JobFill.platforms.ashby]
  affects: [content.js, background.js]
tech_stack:
  added: []
  patterns: [IIFE-platform-module, data-field-type-scanning, tiered-title-parse]
key_files:
  created: [platforms/ashby.js]
  modified: [tests/unit/ashby.test.js]
decisions:
  - "Used hostname.indexOf('ashbyhq.com') over regex — simpler, no regex overhead needed"
  - "Bare textarea fallback appended to candidates array after [data-field-type] scan — preserves priority order"
  - "getJobDetails tiered parse: 'at X' regex first, then pipe/dash split, then empty — matches RESEARCH.md Pitfall 4 spec"
metrics:
  duration: "~10 minutes"
  completed: "2026-03-15T04:33:17Z"
  tasks_completed: 2
  files_changed: 2
---

# Phase 8 Plan 03: Ashby Platform Module Summary

Ashby IIFE platform module with [data-field-type] custom question scanning and tiered title parse — 6 TDD tests GREEN.

## What Was Built

`platforms/ashby.js` — standard React SPA filler module registered as `window.JobFill.platforms.ashby`. Covers 5 standard fields (firstName, lastName, email, phone, LinkedIn) via `document.querySelector` (no shadow DOM), custom question scanning via `[data-field-type]` attribute wrappers, bare `textarea` fallback for self-hosted Ashby instances, and tiered company name extraction from `document.title`.

## TDD Cycle

### RED Phase — commit `e856e47`
Updated `tests/unit/ashby.test.js`: removed `{ todo: true }` stubs, added 6 real assertions covering `matches()`, `fill()` standard fields, `fill()` skip-on-value, `[data-field-type]` custom question scanning, and `getJobDetails()`. All 6 failed as expected (module stub was empty).

### GREEN Phase — commit `b20c4d5`
Implemented `platforms/ashby.js` in full. All 6 tests passed on first run.

## Test Results

```
tests 6  |  pass 6  |  fail 0  |  todo 0  |  skipped 0
```

Full regression suite: 6 pass, 0 fail.

## Key Implementation Details

| Component | Detail |
|-----------|--------|
| `matches()` | `hostname.indexOf('ashbyhq.com') !== -1` |
| `resolveSelector()` | Standard `document.querySelector` loop — no shadow DOM |
| `fillCustomQuestions()` | Primary: `[data-field-type] textarea, [data-field-type] input[type="text"]`; Fallback: bare `textarea` |
| Label extraction | `el.closest('[data-field-type]').querySelector('label')` → `data-field-type` attr → `placeholder` |
| `getJobDetails()` | `h1.textContent` for jobTitle; tiered company parse: `\bat\s+(.+?)` regex → pipe/dash split → empty |
| `hasValue()` | Guards all standard fields — skips pre-filled inputs |

## Deviations from Plan

None — plan executed exactly as written.

## Commits

| Hash | Type | Description |
|------|------|-------------|
| `e856e47` | test | add failing ashby tests (RED) |
| `b20c4d5` | feat | implement ashby.js — 6 tests GREEN |

## Self-Check: PASSED

- FOUND: `platforms/ashby.js`
- FOUND: commit `e856e47` (test RED)
- FOUND: commit `b20c4d5` (feat GREEN)
