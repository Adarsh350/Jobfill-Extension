---
phase: 12
plan: "03"
subsystem: popup-ui
tags: [popup, resume, file-upload, storage]
one_liner: "Resume tab wiring via FileReader + storage API, delivered as a merge fragment for parallel execution"
dependency_graph:
  requires: [12-01]
  provides: [resume-tab-fragment.js]
  affects: [popup.js — merged by 12-04]
tech_stack:
  added: []
  patterns: [FileReader callback pattern, 5 MB size guard, human-readable byte formatter]
key_files:
  created:
    - .planning/phases/12-popup-ui/resume-tab-fragment.js
  modified: []
decisions:
  - "Fragment approach used: popup.js not written directly to avoid conflict with parallel plan 12-02 (same wave, same file). Plan 12-04 will merge."
  - "5 MB size guard added inline (Rule 2 — security/correctness): file > 5 MB shows error message and resets input, does not attempt FileReader or saveResume."
  - "FileReader is NOT async/await — reader.onload callback handles the async saveResume call per PLAN.md CRITICAL note."
  - "clearResumeUI resets #resume-empty textContent is NOT done here — error text from size guard is transient; reload clears it."
metrics:
  duration: "~10 minutes"
  completed: "2026-03-15"
  tasks_completed: 1
  tasks_total: 1
  files_created: 1
  files_modified: 0
---

# Phase 12 Plan 03: Resume Tab Fragment Summary

Resume tab wiring via FileReader + storage API, delivered as a merge fragment for parallel execution.

## What Was Built

`resume-tab-fragment.js` contains the complete resume tab implementation:

- `formatBytes(bytes)` — human-readable size (B / KB / MB)
- `showResumeInfo(resumeObj)` — shows #resume-info (flex), hides #resume-empty, sets filename + size
- `clearResumeUI()` — hides #resume-info, shows #resume-empty, resets file input value
- `loadResume()` — calls `window.JobFill.storage.getResume()` on popup open, branches to show/clear
- `bindResumeTab()` — wires #resume-input change (FileReader + 5 MB guard + saveResume) and #resume-clear click (clearResume + clearResumeUI)

## Fragment Approach

Plans 12-02 and 12-03 run in parallel (Wave 2) and both target `popup.js`. To avoid write conflicts:

- 12-03 saves its implementation to `resume-tab-fragment.js` (this file)
- 12-02 writes the profile tab logic directly to `popup.js`
- Plan 12-04 (Wave 3) merges the fragment into `popup.js` and adds the `loadResume()` / `bindResumeTab()` calls to `DOMContentLoaded`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical Functionality] Added 5 MB file size guard**
- **Found during:** Task 1 implementation
- **Issue:** Plan spec mentions size guard requirement ("Size guard: if file > 5MB, show error, don't save") but provided code template omitted the guard entirely.
- **Fix:** Added size check before FileReader instantiation. Files > 5 MB display an error in #resume-empty and reset the input. saveResume is never called.
- **Files modified:** resume-tab-fragment.js (the guard is in bindResumeTab)
- **Commit:** included in feat(12-03) commit

## Self-Check

- [x] `resume-tab-fragment.js` created at correct path
- [x] All 5 functions present: formatBytes, showResumeInfo, clearResumeUI, loadResume, bindResumeTab
- [x] FileReader uses callback pattern (not async)
- [x] saveResume called with {name, dataUrl, mimeType, size}
- [x] clearResume called on #resume-clear click
- [x] getResume called in loadResume on popup open
- [x] 5 MB guard present
- [x] DOMContentLoaded merge instructions documented as comments in fragment file
