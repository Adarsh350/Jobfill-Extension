---
phase: 09-icims-linkedin-easy-apply-and-bayt-modules
plan: 01
subsystem: test-scaffolding
tags: [fixtures, test-stubs, icims, linkedin, bayt, tdd]
dependency_graph:
  requires: []
  provides:
    - tests/fixtures/dom-icims.html
    - tests/fixtures/dom-linkedin.html
    - tests/fixtures/dom-bayt.html
    - tests/unit/icims.test.js
    - tests/unit/linkedin.test.js
    - tests/unit/bayt.test.js
  affects:
    - 09-02-PLAN.md
    - 09-03-PLAN.md
    - 09-04-PLAN.md
tech_stack:
  added: []
  patterns:
    - per-file inline DOM mock (no jsdom, no shared mock)
    - node:test todo stubs for TDD RED anchors
    - createRequire(__filename) CJS module loading
key_files:
  created:
    - tests/fixtures/dom-icims.html
    - tests/fixtures/dom-linkedin.html
    - tests/fixtures/dom-bayt.html
    - tests/unit/icims.test.js
    - tests/unit/linkedin.test.js
    - tests/unit/bayt.test.js
  modified: []
decisions:
  - Per-file inline DOM mocks continued (Phase 07-03 pattern) — no shared dom-mock.js
  - Bayt DOM mock uses PascalCase name attributes as authoritative (snake_case absent)
  - LinkedIn mock tracks _modalPresent flag to support isEasyApplyContext guard tests
metrics:
  duration_minutes: 12
  completed_date: "2026-03-15"
  tasks_completed: 2
  files_created: 6
  files_modified: 0
---

# Phase 9 Plan 01: DOM Fixtures and Test Stubs Summary

DOM fixtures and test stub files for iCIMS, LinkedIn Easy Apply, and Bayt — 20 todo-annotated stubs across 3 test files with platform-accurate inline DOM mocks, enabling Wave 2 TDD plans (09-02, 09-03, 09-04) to proceed immediately.

## Tasks Completed

| Task | Name | Commit | Files |
| --- | --- | --- | --- |
| 1 | Create DOM fixtures for all 3 platforms | b91a8cf | dom-icims.html, dom-linkedin.html, dom-bayt.html |
| 2 | Create test stub files for all 3 platforms | b91a8cf | icims.test.js, linkedin.test.js, bayt.test.js |

## Verification

```
node --test tests/unit/icims.test.js tests/unit/linkedin.test.js tests/unit/bayt.test.js
tests 20 | pass 0 | fail 0 | todo 20
```

All 20 stubs show as todo-annotated passing. Zero failures. Zero external dependencies added.

## Key Decisions

1. **Per-file inline DOM mocks** — continued Phase 07-03 pattern; no shared mock file. Each test file builds its own `makeElement`/`buildDom` stack so mocks stay tight to the platform's real selector surface.

2. **Bayt PascalCase as authoritative** — DOM mock and fixture contain only PascalCase names (`FirstName`, `LastName`, `Email`, `Phone`). Comment in fixture explicitly notes snake_case is absent, matching RESEARCH.md pitfall 3.

3. **LinkedIn `_modalPresent` flag** — mock exposes a module-scoped toggle so the "returns empty array when modal not present" stub (FR-7.3 isEasyApplyContext guard) can be tested without restructuring the DOM each time.

4. **Button click tracking via `_clicked` flag** — LinkedIn mock buttons expose a `_clicked` property so the "does not click Submit or Next" test can assert `_clicked === false` without spy infrastructure.

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check

- [x] tests/fixtures/dom-icims.html — exists, contains `iCIMS_MainContent` + `iCIMS_JobTitle`
- [x] tests/fixtures/dom-linkedin.html — exists, contains `.jobs-easy-apply-modal`
- [x] tests/fixtures/dom-bayt.html — exists, contains `applyForm` with PascalCase names and Arabic labels
- [x] tests/unit/icims.test.js — 7 stubs
- [x] tests/unit/linkedin.test.js — 7 stubs
- [x] tests/unit/bayt.test.js — 6 stubs
- [x] Commit b91a8cf — verified

## Self-Check: PASSED
