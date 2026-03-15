---
phase: 11
plan: "01"
subsystem: resume-upload
tags: [filler, background, resume, file-input, main-world, datatransfer]
dependency_graph:
  requires: [utils/storage.js, utils/events.js]
  provides: [attachResume, findResumeFileInput, dataUrlToFile, getUniqueSelector, handleResumeUploadFallback]
  affects: [utils/filler.js, background.js, tests/unit/filler.test.js]
tech_stack:
  added: []
  patterns:
    - DataTransfer + File constructor pattern for file input assignment
    - chrome.scripting.executeScript world=MAIN for React cross-world File instanceof fix
    - Self-contained injected function (no closure) for MAIN world serialization safety
key_files:
  created: []
  modified:
    - utils/filler.js
    - background.js
    - tests/unit/filler.test.js
decisions:
  - attachResume returns null (not error) on files.length===0 — signals caller to send RESUME_UPLOAD_FALLBACK
  - attachResumeInMainWorld uses var throughout — serialization safety across page JS engines
  - handleResumeUploadFallback reads resume from chrome.storage.local fresh — avoids message size limit for large PDFs
  - frameId defaults to 0 when not provided — safe for top-level frame, iCIMS passes explicit frameId
  - filled_via_main_world token lives in background.js attachResumeInMainWorld return value only
metrics:
  duration: "~8 minutes"
  completed: "2026-03-15"
  tasks_completed: 2
  files_modified: 3
---

# Phase 11 Plan 01: Resume Upload Primitives Summary

**One-liner:** DataTransfer+File upload primitives in filler.js with MAIN world chrome.scripting fallback for React cross-world isolation.

---

## What Was Built

Extended `utils/filler.js` with four new functions inside the existing IIFE and replaced the `RESUME_UPLOAD_FALLBACK` stub in `background.js` with a live MAIN world handler.

### utils/filler.js additions

- `dataUrlToFile(dataUrl, filename, mimeType)` — splits base64 data URL, decodes via atob, builds Uint8Array → Blob → File
- `getUniqueSelector(el)` — returns `#id`, `input[name="x"]`, or nth-of-type fallback for file inputs
- `findResumeFileInput(root)` — scores file inputs by RESUME_KEYWORDS presence in name/id/aria-label/accept/label; returns highest scorer
- `attachResume(inputEl)` — async; reads resume from storage, guards size > 5 MB, applies DataTransfer pattern, dispatches change+input events, returns `null` if files.length stays 0 (React cross-world signal)
- `fillField` type=file branch now calls `attachResume(el)` instead of returning false

### background.js additions

- `attachResumeInMainWorld(resumeData, selector)` — self-contained top-level function (no closure), uses `var`, injected into page's MAIN world via chrome.scripting
- `handleResumeUploadFallback(msg, sender, sendResponse)` — reads resume fresh from `chrome.storage.local`, calls `executeScript` with `world: 'MAIN'`, forwards `frameId` for iCIMS iframe scenarios

### Tests

8 new tests added to `tests/unit/filler.test.js`:
- `dataUrlToFile` — File name/type/instance assertion
- `findResumeFileInput` — null when empty, single input return, keyword scoring with two inputs
- `attachResume` — skipped/no_resume, failed/too_large, filled on success, null on cross-world isolation

Full suite: **14/14 pass, 0 fail, 0 todo**

---

## Deviations from Plan

None — plan executed exactly as written.

---

## Self-Check

- [x] `utils/filler.js` — modified, exports 4 new functions
- [x] `background.js` — stub replaced, 2 new functions added
- [x] `tests/unit/filler.test.js` — 8 new tests, all GREEN
- [x] Commit `bc25a76` — verified via git log
- [x] node --check both files — syntax OK
- [x] All plan verification checks — exit 0

## Self-Check: PASSED
