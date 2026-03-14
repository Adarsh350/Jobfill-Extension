---
phase: 03-background-service-worker
plan: 01
subsystem: infra
tags: [chrome-extension, service-worker, mv3, message-routing, keyboard-shortcut]

requires:
  - phase: 02-storage-utility-layer
    provides: Storage key constants and shape definitions (profile, answerBank, lastFillStatus, resume)

provides:
  - MV3 service worker with session setAccessLevel for content script access
  - Message router handling TRIGGER_FILL, GET_STATUS, EXPORT_DATA, IMPORT_DATA, RESUME_UPLOAD_FALLBACK
  - triggerFill relay: popup -> background -> content script via DO_FILL
  - getStatus: session storage read filtered by tabId
  - exportData: schemaVersion:1 export excluding resume (FR-5.1)
  - importData: schemaVersion validation + mergeAnswerBank by id
  - Alt+Shift+F keyboard shortcut wired to triggerFill

affects:
  - 04-event-dispatch (receives DO_FILL from this worker)
  - 06-content-script (receives DO_FILL, writes lastFillStatus to session)
  - 11-resume-upload (RESUME_UPLOAD_FALLBACK stub registered here)
  - 12-popup-ui (sends TRIGGER_FILL, GET_STATUS, EXPORT_DATA, IMPORT_DATA to this worker)

tech-stack:
  added: []
  patterns:
    - "Non-async message listener returning true synchronously on all async branches"
    - "Callback form of chrome.tabs.sendMessage for reliable lastError access"
    - "id-keyed map merge for deduplication (mergeAnswerBank)"
    - "Top-level synchronous listener registration before any async code"

key-files:
  created: []
  modified:
    - background.js

key-decisions:
  - "triggerFill uses callback form of chrome.tabs.sendMessage (not await) so chrome.runtime.lastError is reliably accessible inside the callback"
  - "handleMessage is a plain non-async function — async listeners cannot return true synchronously, breaking the message channel"
  - "RESUME_UPLOAD_FALLBACK registered as stub returning not-implemented error, keeping Phase 11 integration point clean"
  - "resume key intentionally excluded from exportData and importData per FR-5.1"

patterns-established:
  - "SW message router: plain function + switch + return true pattern for all async message handlers"
  - "All chrome API listeners registered at top level synchronously before function declarations"

requirements-completed: [BGW-01, BGW-02, BGW-03, BGW-04, BGW-05, BGW-06, BGW-07, BGW-08]

duration: 8min
completed: 2026-03-14
---

# Phase 3 Plan 01: Background Service Worker Summary

**MV3 service worker with session setAccessLevel, non-async message router (5 branches), DO_FILL relay to content scripts, and Alt+Shift+F keyboard shortcut**

## Performance

- **Duration:** 8 min
- **Started:** 2026-03-14T22:10:00Z
- **Completed:** 2026-03-14T22:18:00Z
- **Tasks:** 3
- **Files modified:** 1

## Accomplishments

- Replaced 3-line stub with 124-line complete service worker implementation
- Wired popup-to-content-script relay via DO_FILL message with full error handling for 3 failure modes (no tab, context invalidated, content script absent)
- Established SW message router pattern used by all future popup/content interactions

## Task Commits

Each task was committed atomically:

1. **Tasks 1-3: Full background.js implementation** - `840ff2f` (feat)

## Files Created/Modified

- `background.js` - MV3 service worker: setAccessLevel, message router, triggerFill/getStatus/exportData/importData/mergeAnswerBank

## Decisions Made

- triggerFill uses callback form of `chrome.tabs.sendMessage` rather than await — `chrome.runtime.lastError` is only reliably accessible synchronously inside a callback, not after an awaited promise.
- handleMessage declared as plain `function` not `async function` — async listeners cannot synchronously return `true`, which would cause Chrome to close the response channel before the async work completes.
- RESUME_UPLOAD_FALLBACK stub included now so Phase 11 has a clean integration point without needing to restructure the router.
- resume key excluded from both export and import per FR-5.1 (base64 PDF unsuitable for sync storage).

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- background.js is fully operational; content scripts can now read `chrome.storage.session` after setAccessLevel fires on SW activation
- Phase 4 (React/Angular Event Dispatch) can send DO_FILL knowing the routing path exists
- Phase 6 (Content Script Coordinator) receives DO_FILL and should write lastFillStatus to session storage using the shape: `{ tabId, timestamp, results }`
- Phase 12 (Popup UI) can call all 4 message types: TRIGGER_FILL, GET_STATUS, EXPORT_DATA, IMPORT_DATA

---
*Phase: 03-background-service-worker*
*Completed: 2026-03-14*
