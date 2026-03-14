---
phase: 4
slug: react-angular-event-dispatch-and-form-fill-primitives
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-14
---

# Phase 4 — Validation Strategy

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | node:test + node:assert (built-in, no npm) |
| **Config file** | none |
| **Quick run command** | `node --test tests/unit/events.test.js` |
| **Full suite command** | `node --test tests/unit/events.test.js tests/unit/filler.test.js` |
| **Estimated runtime** | ~5 seconds |

---

## Wave 0 Requirements

- [ ] `tests/helpers/dom-mock.js` — Node.js shim for HTMLInputElement, HTMLSelectElement, Event, MutationObserver
- [ ] `tests/unit/events.test.js` — stubs for all fillInput/fillSelect/fillCheckbox/fillRadio/fillTextarea tests
- [ ] `tests/unit/filler.test.js` — stubs for fillField dispatcher, waitForElement, shadowQuery, fill lock

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Command | Status |
|---------|------|------|-------------|-----------|---------|--------|
| 4-01-00 | 01 | 0 | test infra | automated | `node --test tests/unit/events.test.js` exits 0 (all skipped) | ⬜ pending |
| 4-01-01 | 01 | 1 | fillInput native setter | automated | `node --test tests/unit/events.test.js` — fillInput test passes | ⬜ pending |
| 4-01-02 | 01 | 1 | fillSelect exact+fuzzy | automated | fillSelect tests pass | ⬜ pending |
| 4-01-03 | 01 | 1 | fillCheckbox/fillRadio | automated | checkbox+radio tests pass | ⬜ pending |
| 4-01-04 | 01 | 1 | fillTextarea | automated | textarea test passes | ⬜ pending |
| 4-02-01 | 02 | 1 | fillField dispatcher | automated | `node --test tests/unit/filler.test.js` | ⬜ pending |
| 4-02-02 | 02 | 1 | waitForElement | automated | waitForElement timeout+resolve tests pass | ⬜ pending |
| 4-02-03 | 02 | 1 | shadowQuery | automated | shadowQuery pierce test passes | ⬜ pending |
| 4-02-04 | 02 | 1 | fill lock | automated | isFilling/startFill/endFill tests pass | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| React state updates on fillInput | FR-2.8 | Requires live React app | Greenhouse job page: `window.JobFill.events.fillInput(document.querySelector('input[name="first_name"]'), "Test")` — value persists on blur |
| Shadow DOM pierce on Workday | FR-2.4 | Requires live Workday page | Workday job: `window.JobFill.filler.shadowQuery(document.body, 'input[data-automation-id]')` returns element |

---

## Validation Sign-Off

- [ ] Wave 0 test stubs created and passing (skipped)
- [ ] All unit tests green after implementation
- [ ] No watch-mode flags
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
