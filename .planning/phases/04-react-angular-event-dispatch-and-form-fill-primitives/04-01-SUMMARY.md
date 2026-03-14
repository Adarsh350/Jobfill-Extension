---
phase: 04-react-angular-event-dispatch-and-form-fill-primitives
plan: 01
subsystem: testing
tags: [node:test, dom-mock, tdd, stub-tests, wave-0]

requires:
  - phase: 03-background-service-worker
    provides: completed extension scaffold and storage layer that test infrastructure builds upon

provides:
  - Node.js DOM shim (tests/helpers/dom-mock.js) with MockElement, MockEvent, MockFocusEvent, MockMutationObserver, setupGlobals
  - 9 todo stub tests in tests/unit/events.test.js anchored to FR-2.8, FR-2.4, FR-2.5
  - 6 todo stub tests in tests/unit/filler.test.js anchored to NFR-5.1, FR-2.2, NFR-3.3
  - tests/run-all.js runner executing both unit test files

affects:
  - 04-02 (events.js implementation — will un-todo events.test.js stubs)
  - 04-03 (filler.js implementation — will un-todo filler.test.js stubs)

tech-stack:
  added: [node:test (built-in), node:assert (built-in)]
  patterns: [Wave-0 TDD scaffold — todo stubs allow CI-green before implementation, native setter spy via Object.defineProperty on prototype]

key-files:
  created:
    - tests/helpers/dom-mock.js
    - tests/unit/events.test.js
    - tests/unit/filler.test.js
    - tests/run-all.js
  modified: []

key-decisions:
  - "todo stub pattern used (not skip) — node:test todo stubs show as passing with annotation, keeping CI green and making requirement coverage visible"
  - "native setter spy uses Object.defineProperty on HTMLInputElement.prototype — mirrors how events.js must call the setter to trigger React/Angular synthetic event detection"
  - "MockMutationObserver._trigger() exposes manual callback firing for deterministic waitForElement tests without real timers"

patterns-established:
  - "Wave-0 TDD: write all test stubs before implementation so CI is green and requirement traceability exists from day 1"
  - "dom-mock.js is the single source of truth for DOM shim — both test files require it via relative path"

requirements-completed: [FR-2.8, FR-2.4, FR-2.5, NFR-5.1, NFR-3.3, FR-2.2]

duration: 8min
completed: 2026-03-14
---

# Phase 4 Plan 01: Test Infrastructure Summary

**Node.js DOM shim and 15-stub Wave-0 TDD scaffold covering all 6 requirements for events.js and filler.js**

## Performance

- **Duration:** 8 min
- **Started:** 2026-03-14T22:07:22Z
- **Completed:** 2026-03-14T22:15:30Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- DOM shim with native setter spy on HTMLInputElement/HTMLTextAreaElement prototypes (Object.defineProperty) — prerequisite for testing React/Angular event dispatch
- 14 requirement-anchored TEST: stubs across both test files, all passing as todo (exit 0)
- run-all.js runner executing both files sequentially via spawnSync

## Task Commits

1. **Task 1: Create tests/helpers/dom-mock.js** — `2e104d2` (feat)
2. **Task 2: Create stub test files and run-all runner** — `b73272d` (test)

## Files Created/Modified

- `tests/helpers/dom-mock.js` — MockElement, MockEvent, MockFocusEvent, MockMutationObserver, setupGlobals with native setter spy
- `tests/unit/events.test.js` — 9 todo stubs: fillInput (3), fillSelect (3), fillCheckbox (1), fillRadio (1), fillTextarea (1)
- `tests/unit/filler.test.js` — 6 todo stubs: fill lock (2), shadowQuery (2), waitForElement (2)
- `tests/run-all.js` — spawnSync runner for both unit test files

## Decisions Made

- todo stub pattern (not skip): `{ todo: 'implement in Wave 1' }` keeps tests visible and CI green without masking them
- Native setter spy installed at prototype level, matching how events.js must invoke it to trigger framework synthetic events
- MockMutationObserver._trigger() provided as escape hatch for deterministic async tests in Plan 03

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- tests/helpers/dom-mock.js ready for require() in events.test.js and filler.test.js
- All 14 TEST: anchors in place; Plan 02 (events.js) and Plan 03 (filler.js) can un-todo stubs as implementation proceeds
- node tests/run-all.js exits 0 — CI baseline established

---
*Phase: 04-react-angular-event-dispatch-and-form-fill-primitives*
*Completed: 2026-03-14*
