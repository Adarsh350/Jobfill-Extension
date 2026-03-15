---
phase: 12-popup-ui
plan: "04"
subsystem: popup
tags: [answer-bank, crud, modal, xss-guard, default-templates, resume-tab]
dependency_graph:
  requires: [12-02, 12-03]
  provides: [answer-bank-crud, default-templates-seed, resume-tab-merged]
  affects: [popup.js]
tech_stack:
  added: []
  patterns: [event-delegation, escapeHtml-xss-guard, crypto.randomUUID, async-storage-crud]
key_files:
  created: []
  modified:
    - popup.js
decisions:
  - "escapeHtml() applied to all entry fields in innerHTML (question, category, id) — not just question — for defense-in-depth"
  - "event delegation via .closest() on #answers-list for edit/delete — avoids per-card listener leak"
  - "DEFAULT_TEMPLATES ids assigned at module parse time via crypto.randomUUID() — stable per load"
metrics:
  duration: "~10 minutes"
  completed: "2026-03-15"
  tasks_completed: 1
  files_modified: 1
---

# Phase 12 Plan 04: Answer Bank Tab and Resume Tab Merge Summary

**One-liner:** Answer bank CRUD with 10 marketing templates seeded on first install, escapeHtml XSS guard, event delegation, and resume tab functions merged into popup.js.

## What Was Built

- Merged 5 resume tab functions from `resume-tab-fragment.js` into the popup.js IIFE
- Added `DEFAULT_TEMPLATES` constant: 10 pre-written marketing/job-search answer entries covering motivation, CRM skills, email metrics, product launch, company fit, work auth, notice period, salary, remote work, and professional achievement
- `maybeLoadDefaultTemplates()` seeds the bank on first open (no-op if entries exist)
- `renderAnswerBank()` / `renderAnswerCard()` render the answer list with edit+delete buttons
- `openModal(entry)` / `closeModal()` / `saveModalEntry()` handle add and edit flows
- `deleteEntry(id)` removes an entry and re-renders
- `bindAnswerBank()` wires all event listeners using delegation on `#answers-list`
- `escapeHtml()` applied to all user-content fields injected via innerHTML
- `updateAnswersQuota()` refreshes `#answers-quota-bar` after every save
- DOMContentLoaded updated with: `loadResume`, `bindResumeTab`, `maybeLoadDefaultTemplates`, `renderAnswerBank`, `bindAnswerBank`

## Verification Results

| Check | Result |
|-------|--------|
| `crypto.randomUUID` used in DEFAULT_TEMPLATES (10x) and new entries | PASS |
| `escapeHtml()` on question, id, category in innerHTML | PASS |
| `maybeLoadDefaultTemplates` called in DOMContentLoaded | PASS |
| DEFAULT_TEMPLATES defined and referenced (count: 2) | PASS |
| Event delegation via `.closest()` on answer list | PASS |

## Deviations from Plan

**1. [Rule 2 - Security] escapeHtml() also applied to entry.id in data-id attributes**
- Found during: Task 1 implementation
- Issue: Plan only required escapeHtml on question/category, but data-id attributes in buttons also receive entry.id (UUIDs are safe but defense-in-depth is correct)
- Fix: Applied escapeHtml to entry.id in both button data-id attributes
- Files modified: popup.js
- Commit: 42cafd7

Otherwise plan executed exactly as written.

## Self-Check: PASSED

- popup.js exists and was modified (+287 lines)
- Commit 42cafd7 confirmed in git log
