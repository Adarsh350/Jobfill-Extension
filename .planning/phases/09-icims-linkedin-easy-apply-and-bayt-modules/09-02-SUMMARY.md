---
phase: 09-icims-linkedin-easy-apply-and-bayt-modules
plan: 02
subsystem: platform-modules
tags: [icims, tdd, cross-origin, iframe, platform-module]
dependency_graph:
  requires: [09-01]
  provides: [platforms/icims.js]
  affects: [content.js, background.js]
tech_stack:
  added: []
  patterns: [IIFE-platform-module, two-step-cross-origin-guard, hasValue-skip]
key_files:
  created:
    - platforms/icims.js
  modified:
    - tests/unit/icims.test.js
decisions:
  - "window.top mock in beforeEach must be set to window (not deleted) so detectCrossOrigin() step-1 returns false by default in same-origin tests"
  - "Resume field always skipped with 'resume upload in Phase 11' consistent with Phase 07 decision"
  - "chrome.runtime.sendMessage wrapped in try/catch so it doesn't throw in test environment"
metrics:
  duration: "3 minutes"
  completed: "2026-03-15T04:48:49Z"
  tasks_completed: 2
  files_changed: 2
---

# Phase 9 Plan 02: iCIMS Platform Module Summary

One-liner: iCIMS IIFE module with two-step cross-origin iframe guard, camelCase/lowercase selector variants, and 7/7 TDD tests GREEN.

## What Was Built

`platforms/icims.js` — a ~230-line IIFE that registers on `window.JobFill.platforms.icims` and handles iCIMS job application forms running inside iframes (`all_frames: true`).

Key behaviors:
- `matches(hostname)` — returns true for any hostname containing `icims.com`
- `detectCrossOrigin()` — two-step guard: step 1 `window === window.top` (not in iframe), step 2 `try { window.top.location.href }` (SecurityError = cross-origin)
- `fill()` — returns `[{ field: 'iCIMS Form', status: 'failed', reason: 'cross-origin iframe — manual fill required' }]` + sends `ICIMS_CROSS_ORIGIN` message if cross-origin; otherwise runs two-pass fill
- `fillStandardFields()` — FIELDS table covers both `firstname`/`firstName` and `lastname`/`lastName` name variants
- `hasValue()` guard — skips fields that already have content
- `getJobDetails()` — `.iCIMS_JobTitle, h1.iCIMS_Header` primary, `window.parent.document.title` fallback, `document.title` split fallback

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 (RED) | Convert icims stubs to failing assertions | 37369b7 | tests/unit/icims.test.js |
| 2 (GREEN) | Implement platforms/icims.js | daed40d | platforms/icims.js, tests/unit/icims.test.js |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] window.top mock defaulted to undefined in Node.js test environment**
- **Found during:** Task 2 GREEN (tests 4 and 5 failing: "results must include First Name")
- **Issue:** In Node.js, `global.top` is `undefined` by default. `detectCrossOrigin()` step 1 evaluates `window === window.top` → `global === undefined` → false. Step 2 then tries `undefined.location.href` → TypeError → incorrectly returns `true` (cross-origin), so `fill()` returned early without filling any fields.
- **Fix:** Added `Object.defineProperty(window, 'top', { value: window, configurable: true })` in `beforeEach` so same-origin tests get correct default. Cross-origin test overrides this with a getter that throws SecurityError, then restores it after.
- **Files modified:** tests/unit/icims.test.js
- **Commit:** daed40d (included in GREEN commit)

## Verification

```
node --test tests/unit/icims.test.js
pass 7 / fail 0 / todo 0

node --test tests/unit/*.test.js
pass 95 / fail 0 / todo 0
```

## Self-Check: PASSED
- platforms/icims.js exists: YES (230 lines)
- tests/unit/icims.test.js updated: YES
- RED commit 37369b7: EXISTS
- GREEN commit daed40d: EXISTS
- 7/7 icims tests GREEN: CONFIRMED
- 95/95 full suite GREEN: CONFIRMED
