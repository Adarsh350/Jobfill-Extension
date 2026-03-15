---
phase: 08-workday-and-ashby-platform-modules
plan: "01"
subsystem: test-scaffold
tags: [workday, ashby, fixtures, tdd, shadow-dom]
dependency_graph:
  requires: []
  provides:
    - tests/fixtures/dom-workday.html
    - tests/fixtures/dom-ashby.html
    - tests/unit/workday.test.js
    - tests/unit/ashby.test.js
  affects: []
tech_stack:
  added: []
  patterns:
    - node:test todo stubs (same as Phase 7)
    - attachShadow fixture pattern
    - createRequire try/catch for missing platform modules
key_files:
  created:
    - tests/fixtures/dom-workday.html
    - tests/fixtures/dom-ashby.html
    - tests/unit/workday.test.js
    - tests/unit/ashby.test.js
  modified: []
decisions:
  - "Used createRequire(__filename) instead of import.meta.url — project has no package.json so Node defaults to CJS; import.meta reference triggers ESM parse error"
  - "import.meta removed from try/catch block; plain __filename used for createRequire path resolution"
metrics:
  duration: "~10 minutes"
  completed_date: "2026-03-15"
  tasks_completed: 2
  tasks_total: 2
  files_created: 4
  files_modified: 0
requirements:
  - FR-2.1
  - FR-2.3
  - FR-2.6
  - FR-2.9
  - FR-7.1
---

# Phase 08 Plan 01: Workday & Ashby DOM Fixtures and Test Stubs — Summary

Wave 1 RED baseline: shadow DOM fixture for Workday (attachShadow + data-automation-id fields) and standard React fixture for Ashby (data-field-type custom questions), with 7 and 6 todo test stubs respectively.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Create DOM fixtures (dom-workday.html, dom-ashby.html) | 6efbb86 | tests/fixtures/dom-workday.html, tests/fixtures/dom-ashby.html |
| 2 | Create test stub files (workday.test.js, ashby.test.js) | 6efbb86 | tests/unit/workday.test.js, tests/unit/ashby.test.js |

## Verification Results

- `node tests/unit/workday.test.js` — 7 tests, 0 fail, 7 todo, exit 0
- `node tests/unit/ashby.test.js` — 6 tests, 0 fail, 6 todo, exit 0
- `node tests/run-all.js` — full suite passes, no regressions

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Removed import.meta reference from CJS test files**
- **Found during:** Task 2 — first test run
- **Issue:** Both test files contained `import.meta ? import.meta.url : __filename` inside a ternary. Node parsed `import.meta` as an ESM syntax token and rejected the file with "require is not defined in ES module scope", even though the project has no package.json and defaults to CJS.
- **Fix:** Replaced `createRequire(import.meta ? import.meta.url : __filename)` with `createRequire(__filename)` in both test files.
- **Files modified:** tests/unit/workday.test.js, tests/unit/ashby.test.js
- **Commit:** 6efbb86

## Decisions Made

1. `createRequire(__filename)` — no `import.meta` reference. Project is CJS-only (no package.json, no `"type":"module"`). Using `import.meta` in any form triggers ESM parse, breaking the entire file.

## Self-Check: PASSED

- tests/fixtures/dom-workday.html: EXISTS
- tests/fixtures/dom-ashby.html: EXISTS
- tests/unit/workday.test.js: EXISTS
- tests/unit/ashby.test.js: EXISTS
- Commit 6efbb86: EXISTS
