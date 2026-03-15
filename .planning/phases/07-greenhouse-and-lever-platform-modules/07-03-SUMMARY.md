---
phase: 07
plan: 03
subsystem: platforms
tags: [lever, platform-module, tdd, dom-mock]
dependency_graph:
  requires: [07-01, utils/filler.js, utils/matcher.js, utils/events.js]
  provides: [platforms/lever.js]
  affects: [content.js platform detection]
tech_stack:
  added: []
  patterns: [IIFE-namespace, self-contained-mini-DOM-parser, bracket-attr-fallback]
key_files:
  created: [platforms/lever.js, tests/unit/lever.test.js]
  modified: []
decisions:
  - "Self-contained mini HTML parser in test file — no jsdom/npm; project has no package.json"
  - "urls[LinkedIn] bracket selector resolved via iterative .name check fallback (querySelector chokes on brackets in some engines)"
  - "document mock built per-test-file rather than in dom-mock.js — avoids breaking existing tests that do not need a document global"
  - "fillCustomQuestions targets [data-qa] textarea and input[type=text] descendants only — avoids double-processing standard fields"
metrics:
  duration: "~25 minutes"
  completed_date: "2026-03-15"
  tasks_completed: 2
  files_changed: 2
---

# Phase 7 Plan 03: Lever Platform Module Summary

**One-liner:** Lever IIFE platform module with selector-based field fill, file-skip, already-filled guard, and data-qa custom question answering — tested via self-contained mini DOM parser.

---

## Tasks Completed

| # | Task | Commit | Status |
|---|------|--------|--------|
| 1 | RED — write failing lever.test.js assertions | 2ceb7c4 | Done |
| 2 | GREEN — implement platforms/lever.js + fix test DOM | 559efa2 | Done |

---

## What Was Built

### platforms/lever.js
- IIFE registered as `window.JobFill.platforms.lever`
- `matches(hostname)` — returns true if hostname includes `'lever.co'`
- `fill(profile, answerBank)` — async, returns array of `{field, status, value?, reason?}` result objects
- `getJobDetails()` — extracts `companyName` from `.main-header-logo img[alt]` (falls back to title parse), `jobTitle` from `h2`
- Standard fields: Full Name, Email, Phone, LinkedIn, Portfolio, Resume, Cover Letter
- File inputs always produce `{status: 'skipped', reason: 'resume upload in Phase 11'}`
- Already-filled elements produce `{status: 'skipped', reason: 'already has value'}`
- Custom questions: `[data-qa]` container descendants — label text used as question key, matched against answer bank at confidence >= 0.75, `{{token}}` detection triggers `needs_review` status
- `urls[LinkedIn]` resolved via iterative `.name` check fallback after querySelector

### tests/unit/lever.test.js
- Self-contained recursive-descent HTML parser (no jsdom, no npm)
- Supports: tag matching, `[attr]`, `[attr="val"]`, `[attr*=val i]`, descendant selectors, multi-selector (comma), `.closest()`
- `document.body.innerHTML = html` re-parses fixture into mock node tree
- 8 tests, all GREEN, 0 todo, 0 fail

---

## Test Results

```
lever (5.2ms)
  ✔ matches lever.co hostname → true
  ✔ does not match greenhouse.io hostname → false
  ✔ exposes matches, fill, getJobDetails functions
  ✔ fill — full name filled from profile
  ✔ fill — email filled from profile
  ✔ fill — file input skipped with reason 'resume upload in Phase 11'
  ✔ fill — already-filled field skipped
  ✔ fill — data-qa custom question filled from answer bank

tests 8 | pass 8 | fail 0 | todo 0
```

---

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] document not defined in Node.js test environment**
- **Found during:** Task 2 (first GREEN run)
- **Issue:** Tests used `document.body.innerHTML` and `document.querySelector` — neither exists in Node.js; dom-mock.js provides MockElement/MockEvent but no `document` global
- **Fix:** Wrote a self-contained recursive-descent HTML parser + mock document directly in lever.test.js. Approach keeps dom-mock.js unchanged (other tests still pass), requires zero npm dependencies
- **Files modified:** tests/unit/lever.test.js
- **Commit:** 559efa2

---

## Self-Check

```bash
[ -f "platforms/lever.js" ] && echo "FOUND" || echo "MISSING"        # FOUND
[ -f "tests/unit/lever.test.js" ] && echo "FOUND" || echo "MISSING"  # FOUND
git log --oneline | grep 559efa2                                       # FOUND
git log --oneline | grep 2ceb7c4                                       # FOUND
```

## Self-Check: PASSED
