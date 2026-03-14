---
phase: 02-chrome-storage-utility-layer
plan: 01
subsystem: storage
tags: [chrome-storage, sync, local, session, quota, utility]
dependency_graph:
  requires: []
  provides: [window.JobFill.storage]
  affects: [utils/events.js, utils/filler.js, popup/popup.js, background/background.js, content/content.js]
tech_stack:
  added: []
  patterns: [IIFE namespace, async/await chrome storage, callback-wrapped Promise]
key_files:
  created: []
  modified:
    - utils/storage.js
decisions:
  - "Resume routes to chrome.storage.local (not sync) — base64 PDF can reach 400 KB; sync per-item limit is 8,192 bytes"
  - "getBytesInUse uses callback form wrapped in Promise — Promise API unreliable across Chrome versions"
  - "getFillStatus/saveFillStatus implemented but noted as Phase 3 dependency — session.setAccessLevel must be called from background.js first"
metrics:
  duration: "~8 minutes"
  completed: "2026-03-14"
  tasks_completed: 2
  tasks_total: 3
  files_modified: 1
---

# Phase 2 Plan 01: Chrome Storage Utility Layer Summary

**One-liner:** IIFE-namespaced `window.JobFill.storage` with 12 functions spanning chrome.storage.sync, local, and session — with typed defaults, quota error surfacing, and cross-phase dependency notes.

---

## Functions Implemented

| # | Function | Storage Area | Key | Default |
|---|----------|-------------|-----|---------|
| 1 | `getProfile()` | sync | `profile` | `null` |
| 2 | `saveProfile(data)` | sync | `profile` | — |
| 3 | `getAnswerBank()` | sync | `answerBank` | `[]` |
| 4 | `saveAnswerBank(entries)` | sync | `answerBank` | — |
| 5 | `getResume()` | local | `resume` | `null` |
| 6 | `saveResume(resumeObj)` | local | `resume` | — |
| 7 | `clearResume()` | local | `resume` | — |
| 8 | `getSettings()` | sync | `settings` | `{}` |
| 9 | `saveSettings(settings)` | sync | `settings` | — |
| 10 | `getFillStatus(tabId)` | session | `lastFillStatus` | `null` |
| 11 | `saveFillStatus(tabId, results)` | session | `lastFillStatus` | — |
| 12 | `getBytesInUse(key)` | sync | (any key) | — |

---

## Storage Area Routing

| Area | Keys | Rationale |
|------|------|-----------|
| `chrome.storage.sync` | profile, answerBank, settings | Small structured data; synced across devices |
| `chrome.storage.local` | resume | Base64 PDF up to 400 KB — exceeds sync's 8,192 byte per-item limit |
| `chrome.storage.session` | lastFillStatus | Per-tab ephemeral state; cleared on session end |

---

## Cross-Phase Dependency

`getFillStatus` and `saveFillStatus` use `chrome.storage.session`. When called from a content script, Chrome will throw:

> "Access to storage is not allowed from this context"

Phase 3 (background.js) must call:
```js
chrome.storage.session.setAccessLevel({ accessLevel: 'TRUSTED_AND_UNTRUSTED_CONTEXTS' });
```

This is documented via JSDoc comment above `getFillStatus` in `utils/storage.js`.

---

## Quota Error Handling

All write functions (`saveProfile`, `saveAnswerBank`, `saveResume`, `saveSettings`, `saveFillStatus`) follow the same pattern:

```js
try {
  await chrome.storage.AREA.set({ key: value });
} catch (err) {
  console.error('[JobFill] functionName error:', err.message);
  throw err;  // never swallowed
}
```

`getBytesInUse` returns `{ used, limit: 8192, percentFull, nearLimit }` where `nearLimit = bytes > 6144` (75% threshold).

---

## Deviations from Plan

None — plan executed exactly as written.

---

## UAT Result

Pending — Task 3 (checkpoint:human-verify) awaiting user verification in browser DevTools.

---

## Self-Check: PENDING

Will update after UAT checkpoint clears.
