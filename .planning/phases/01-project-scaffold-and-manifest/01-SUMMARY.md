---
phase: 01-project-scaffold-and-manifest
plan: 01
subsystem: infra
tags: [chrome-extension, manifest-v3, png, scaffold, stub-files]

requires: []

provides:
  - manifest.json: MV3 manifest with all required fields, 7 ATS platform host_permissions, fill-form command
  - icons/icon16.png, icons/icon48.png, icons/icon128.png: valid PNG binaries (indigo #6366F1)
  - background.js: service worker stub (Phase 3 target)
  - content.js: content script coordinator stub (Phase 6 target)
  - popup.html + popup.js + popup.css: popup shell with no inline scripts
  - content.css: empty stub declared in manifest content_scripts css array
  - utils/storage.js, utils/matcher.js, utils/events.js, utils/filler.js, utils/overlay.js: util stubs
  - platforms/greenhouse.js, lever.js, workday.js, ashby.js, icims.js, linkedin.js, bayt.js, generic.js: platform stubs
  - create_icons.py: pure Python 3 stdlib PNG generator (no dependencies)

affects:
  - 02-chrome-storage-utility-layer (implements utils/storage.js)
  - 03-background-service-worker (implements background.js)
  - 04-event-dispatch-fill-primitives (implements utils/events.js, utils/filler.js)
  - 05-fuzzy-matcher-answer-bank (implements utils/matcher.js)
  - 06-content-script-coordinator (implements content.js, utils/overlay.js)
  - 07-greenhouse-lever (implements platforms/greenhouse.js, platforms/lever.js)
  - 08-workday-ashby (implements platforms/workday.js, platforms/ashby.js)
  - 09-icims-linkedin-bayt (implements platforms/icims.js, platforms/linkedin.js, platforms/bayt.js)
  - 10-generic-fallback (implements platforms/generic.js)

tech-stack:
  added: [Python 3 stdlib (struct, zlib) for PNG generation]
  patterns:
    - "window.JobFill namespace guard in every content script JS file"
    - "MV3 content_security_policy as object with extension_pages key"
    - "content_scripts js array load order: utils first, platforms second, content.js last"
    - "Pure Python stdlib PNG generation with no external dependencies"

key-files:
  created:
    - manifest.json
    - background.js
    - content.js
    - content.css
    - popup.html
    - popup.js
    - popup.css
    - icons/icon16.png
    - icons/icon48.png
    - icons/icon128.png
    - utils/storage.js
    - utils/matcher.js
    - utils/events.js
    - utils/filler.js
    - utils/overlay.js
    - platforms/greenhouse.js
    - platforms/lever.js
    - platforms/workday.js
    - platforms/ashby.js
    - platforms/icims.js
    - platforms/linkedin.js
    - platforms/bayt.js
    - platforms/generic.js
    - create_icons.py
  modified: []

key-decisions:
  - "all_frames: true included per planning spec requirement FR-7.2 (iCIMS cross-frame injection), overriding RESEARCH.md recommendation to defer"
  - "PNG color format: RGB (color_type=2) per PLAN.md spec, not RGBA (color_type=6) from RESEARCH.md — both valid, plan is authoritative"
  - "window.JobFill namespace guard in all JS stubs for safe multi-file content script sharing"
  - "Indigo #6366F1 used as placeholder icon color — replaced with branded icon in Phase 12"

patterns-established:
  - "Pattern 1: Every content script JS file starts with window.JobFill = window.JobFill || {} guard"
  - "Pattern 2: CSP as MV3 object form — { extension_pages: 'script-src self; object-src none' }"
  - "Pattern 3: content_scripts js array load order contract — utils > platforms > content.js (hard runtime guarantee)"

requirements-completed: [NFR-1.1, NFR-1.2, NFR-1.5, FR-2.7]

duration: 15min
completed: 2026-03-14
---

# Phase 1 Plan 01: Project Scaffold and Manifest Summary

**MV3 Chrome extension scaffold: manifest.json with 7-platform host_permissions and fill-form shortcut, 3 valid indigo PNG icons, 19 JS/CSS stub files ready for Load Unpacked — awaiting UAT**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-03-14T15:30:00Z
- **Completed:** 2026-03-14T15:45:42Z
- **Tasks:** 3/4 (Task 4 is checkpoint:human-verify — awaiting UAT approval)
- **Files modified:** 24 (23 extension files + create_icons.py)

## Accomplishments

- manifest.json written verbatim per spec: MV3, object-form CSP, service_worker, 7 ATS host_permissions, fill-form command (Alt+Shift+F), content_scripts with 14 files in guaranteed load order
- 3 valid PNG binaries generated via pure Python 3 stdlib (no dependencies): icon16.png 79 bytes, icon48.png 123 bytes, icon128.png 306 bytes — all with correct PNG magic number
- 19 stub JS/CSS files created: popup.html with no inline scripts, all JS stubs with window.JobFill namespace guard
- All 7 pre-UAT automated checks pass

## Task Commits

Each task was committed atomically:

1. **Task 1: Create directory structure and manifest.json** - `50bf4d9` (feat)
2. **Task 2: Create all stub JS/CSS files and popup.html** - `49daa0f` (feat)
3. **Task 3: Generate valid PNG icon files** - `1f2f2c9` (feat)

**Plan metadata:** pending (after UAT approval)

## Files Created/Modified

- `manifest.json` — MV3 manifest: permissions, host_permissions, background SW, popup action, commands, content_scripts, CSP object
- `icons/icon16.png` — 16x16 RGB PNG, indigo #6366F1, 79 bytes
- `icons/icon48.png` — 48x48 RGB PNG, indigo #6366F1, 123 bytes
- `icons/icon128.png` — 128x128 RGB PNG, indigo #6366F1, 306 bytes
- `background.js` — service worker stub with namespace guard
- `content.js` — content script coordinator stub with namespace guard
- `content.css` — empty stub (declared in manifest content_scripts css array)
- `popup.html` — popup shell, no inline scripts, loads popup.css and popup.js
- `popup.js` — popup logic stub with namespace guard
- `popup.css` — empty stub (prevents 404 resource error)
- `utils/storage.js` — storage utility stub (Phase 2 target)
- `utils/matcher.js` — fuzzy matcher stub (Phase 5 target)
- `utils/events.js` — React/Angular event dispatch stub (Phase 4 target)
- `utils/filler.js` — fill primitives stub (Phase 4 target)
- `utils/overlay.js` — Shadow DOM overlay stub (Phase 6 target)
- `platforms/greenhouse.js` — Greenhouse module stub (Phase 7 target)
- `platforms/lever.js` — Lever module stub (Phase 7 target)
- `platforms/workday.js` — Workday module stub (Phase 8 target)
- `platforms/ashby.js` — Ashby module stub (Phase 8 target)
- `platforms/icims.js` — iCIMS module stub (Phase 9 target)
- `platforms/linkedin.js` — LinkedIn Easy Apply stub (Phase 9 target)
- `platforms/bayt.js` — Bayt module stub (Phase 9 target)
- `platforms/generic.js` — generic fallback stub (Phase 10 target)
- `create_icons.py` — pure Python 3 stdlib PNG generator helper

## Decisions Made

1. **all_frames: true** — Included per planning spec FR-7.2 (iCIMS cross-frame injection). RESEARCH.md recommended deferring to Phase 9, but the PLAN.md explicitly states planning spec takes precedence.
2. **RGB vs RGBA PNG** — Used color_type=2 (RGB) per PLAN.md spec. RESEARCH.md script used color_type=6 (RGBA). Both are valid PNG formats; plan is authoritative.
3. **window.JobFill namespace guard** — Applied to all JS stubs (not just utils/platforms). background.js and popup.js get the guard for consistency even though they run in separate contexts.
4. **Indigo #6366F1 placeholder color** — Used per PLAN.md spec for visual distinctiveness. Will be replaced with branded icon in Phase 12.

## Deviations from Plan

None — plan executed exactly as written. The `python` command was used instead of `python3` on Windows (both invoke Python 3.13 on this system; `python3` is not aliased on Windows).

## Issues Encountered

- `python3` command not available on Windows (Microsoft Store alias interference). Used `python` which maps to Python 3.13 on this system. PNG generation succeeded identically.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- All 22 extension files exist at declared paths
- manifest.json passes JSON.parse with all required MV3 fields
- PNG icons are valid binaries with correct magic number
- popup.html has no inline scripts
- Extension is ready to be loaded via chrome://extensions > Load Unpacked
- **Blocking:** Task 4 UAT must be approved before phase is marked complete
- **Next after UAT:** Phase 2 — Chrome Storage Utility Layer (implements utils/storage.js with sync/local/session wrappers)

---
*Phase: 01-project-scaffold-and-manifest*
*Completed: 2026-03-14*
