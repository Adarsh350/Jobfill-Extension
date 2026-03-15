---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: unknown
last_updated: "2026-03-15T11:00:00.000Z"
progress:
  total_phases: 12
  completed_phases: 11
  total_plans: 25
  completed_plans: 25
---

# Project State

**Project:** JobFill Chrome Extension
**Milestone:** 1 — Functional Personal Tool
**Last Updated:** 2026-03-15

---

## Current Status

**Phase:** 12-popup-ui — In Progress
**Active Phase:** Phase 12 — Popup UI, Answer Bank & Templates
**Next Action:** Execute Phase 12 Plan 02

---

## Planning Completion

| Artifact | Status |
|----------|--------|
| `.planning/PROJECT.md` | Complete |
| `.planning/config.json` | Complete |
| `.planning/research/STACK.md` | Complete |
| `.planning/research/ARCHITECTURE.md` | Complete |
| `.planning/research/CONCERNS.md` | Complete |
| `.planning/research/FEATURES.md` | Agent running (rate-limited, resumed) |
| `.planning/research/SUMMARY.md` | Complete |
| `.planning/REQUIREMENTS.md` | Complete |
| `.planning/ROADMAP.md` | Complete |
| `.planning/STATE.md` | Complete — This file |

---

## Roadmap Summary

| Phase | Title | Status |
|-------|-------|--------|
| 1 | Project Scaffold & Manifest | In Progress (UAT pending) |
| 2 | Chrome Storage Utility Layer | Complete (UAT passed 2026-03-14) |
| 3 | Background Service Worker | Complete (2026-03-14) |
| 4 | React/Angular Event Dispatch & Fill Primitives | Complete (2026-03-14) |
| 5 | Fuzzy Matcher & Answer Bank Engine | In Progress (Plans 01-02 complete) |
| 6 | Content Script Coordinator & Fill Overlay | Complete (verified 2026-03-15) |
| 7 | Greenhouse & Lever Platform Modules | Complete (verified 2026-03-15) |
| 8 | Workday & Ashby Platform Modules | Complete (verified 2026-03-15) |
| 9 | iCIMS, LinkedIn Easy Apply & Bayt Modules | Complete (verified 2026-03-15) |
| 10 | Generic Fallback Module | Complete (2026-03-15) |
| 11 | Resume Auto-Upload | Complete (verified 2026-03-15) |
| 12 | Popup UI, Answer Bank & Templates | In Progress (Plan 01 complete) |

---

## Decisions

- **Phase 1:** `all_frames: true` included per FR-7.2 (iCIMS cross-frame injection), overriding RESEARCH.md recommendation to defer to Phase 9
- **Phase 1:** `window.JobFill` namespace guard applied to all JS stubs for safe multi-file content script sharing in isolated world
- **Phase 1:** PNG icons use RGB color_type=2 (per PLAN.md spec) rather than RGBA — both valid formats
- **Phase 2:** Resume routes to chrome.storage.local (not sync) — base64 PDF can reach 400 KB; sync per-item limit is 8,192 bytes
- **Phase 2:** getBytesInUse uses callback form wrapped in Promise — Promise API unreliable across Chrome versions
- **Phase 2:** getFillStatus/saveFillStatus require Phase 3 session.setAccessLevel before working from content scripts
- **Phase 3:** triggerFill uses callback form of chrome.tabs.sendMessage (not await) — lastError only reliably accessible synchronously inside callback
- **Phase 3:** handleMessage declared as plain function not async — async listeners cannot return true synchronously, breaking Chrome message channel
- **Phase 3:** RESUME_UPLOAD_FALLBACK stub registered now so Phase 11 has clean integration point without router restructure
- **Phase 4-01:** todo stub pattern used (not skip) — node:test todo stubs show as passing with annotation, keeping CI green and requirement coverage visible
- **Phase 4-01:** native setter spy installed at Object.defineProperty on HTMLInputElement.prototype — mirrors how events.js must call it to trigger React/Angular synthetic events
- **Phase 4-01:** MockMutationObserver._trigger() exposes manual callback firing for deterministic waitForElement tests without real timers
- **Phase 4-03:** window.JobFill.events referenced at call time in fillField (not cached at load) — avoids stale reference if load order changes during testing
- **Phase 4-03:** waitForElement default timeout is 3000ms per NFR-3.3 (not 5000ms from research Pattern 8)
- **Phase 4-03:** type=file returns false without throwing — Phase 11 scope stub per plan spec

---
- [Phase 05-01]: ESM import with createRequire + try/catch fallback allows test file to run before utils/matcher.js exists
- [Phase 05-01]: todo stubs (not skip) keep CI green and requirement coverage visible per Phase 4-01 precedent
- [Phase 05-02]: Top-level function declarations used (not IIFE) — avoids levenshtein scoping conflict with module.exports shim outside IIFE closure
- [Phase 05-02]: ALIAS_MAP lookup is exact on targetLower — prevents 'us' fuzzy-matching to 'uae'
- [Phase 05-02]: substituteVariables returns match (not '') for unknown keys — keeps {{token}} visible per FR-3.7
- [Phase 05-02]: findBestAnswer threshold 0.75 — returns null below, consistent with FR-3.7 confidence gate
- [Phase 06-01]: tabId injected by background.js into DO_FILL payload — chrome.tabs.getCurrent() unavailable in content scripts
- [Phase 06-01]: onMessage listener is non-async returning true synchronously — async listeners break Chrome message channel
- [Phase 06-01]: MutationObserver guarded with n.closest('#jobfill-overlay-host') — prevents infinite loop when overlay renders inputs
- [Phase 06-01]: Platform detection runs once at IIFE init — hostname is stable for page lifetime
- [Phase 06-02]: _container div pattern used — style tag appended directly to _shadow, only _container.innerHTML cleared, preserving injected CSS across all overlay calls
- [Phase 06-02]: showButton guards against re-render if results panel already visible — prevents double-mount on rapid content.js calls
- [Phase 06-02]: chrome.runtime.sendMessage wrapped in try/catch — context invalidation expected on tab navigation (NFR-4.4)
- [Phase 06-02]: dismiss() calls _obs.disconnect() before nulling _host — prevents orphaned MutationObserver leak
- [Phase 07]: File inputs pushed as skipped/reason='resume upload in Phase 11' in both modules — filler.js returns false for type=file by design
- [Phase 07]: 07-02 and 07-03 are Wave 2 parallel — both depend only on 07-01 scaffold, no shared files
- [Phase 07]: Lever urls[LinkedIn] bracket selector works via querySelector (quoted value) + iterative .name check fallback
- [Phase 07]: Greenhouse work-auth handles both select and radio variants (open question from RESEARCH.md)
- [Phase 07-03]: Self-contained mini DOM parser in lever.test.js — no jsdom/npm; project has no package.json
- [Phase 07-03]: document mock built per-test-file rather than dom-mock.js — avoids breaking existing tests
- [Phase 08]: createRequire uses __filename not import.meta.url — project is CJS-only, import.meta triggers ESM parse error
- [Phase 08-02]: fillCustomQuestions deferred for Workday — custom questions require UAT before implementing
- [Phase 08-02]: isVisible uses offsetParent !== null — standard DOM visibility check, testable in Node with mock objects
- [Phase 08-03]: Ashby uses hostname.indexOf over regex for matches(); bare textarea fallback appended after data-field-type scan; getJobDetails tiered parse: at-X regex -> pipe split -> empty
- [Phase 09]: Wave 2 has 3 parallel TDD plans (09-02, 09-03, 09-04) — all depend only on 09-01 scaffold, no shared files
- [Phase 09]: iCIMS cross-origin detection uses two-step check: window===window.top (not in iframe) then try/catch on window.top.location.href — avoids pitfall 1 (treating all iframes as cross-origin)
- [Phase 09]: getAdjacentLabel() intentionally omitted from bayt.js — enforces RTL constraint at source level, label text cannot accidentally be used for field matching
- [Phase 09]: Bayt fillCustomQuestions pushes needs_review for all textarea (no findBestAnswer call) — Arabic question text breaks keyword matching per FR-7.5
- [Phase 09]: LinkedIn fill() returns [] (not error) when .jobs-easy-apply-modal absent — safe on all non-Easy-Apply LinkedIn pages
- [Phase 09]: window._jobfillLinkedInObserver stores observer ref — allows content.js to disconnect on overlay dismiss, prevents memory leak
- [Phase 09]: Modal-scoped selectors require test mock to strip MODAL_SCOPE prefix for querySelector resolution
- [Phase 09]: Attribute-only selectors enforced structurally in bayt.js — getAdjacentLabel() intentionally omitted
- [Phase 09]: RTL audit test reads source as text — aria-label/placeholder banned from entire file including comments
- [Phase 09]: window.top mock must be set to window in beforeEach so detectCrossOrigin() returns false by default in same-origin Node.js tests
- [Phase 09]: iCIMS resume field always skipped with 'resume upload in Phase 11' consistent with Phase 07 decision
- [Phase 10]: matches() always returns true — generic is last in content.js platform priority order; correct ordering enforced by manifest.json load sequence not by this module
- [Phase 10]: All successful fills in generic.js use status 'needs_review' (never 'filled') — heuristic detection cannot guarantee correctness per ROADMAP Phase 10 spec
- [Phase 10]: fullName key added to KEYWORD_MAP to handle single-name-field forms; value = firstName + ' ' + lastName
- [Phase 10]: discoverFields() uses usedEls Set — prevents same element being assigned to two profile keys
- [Phase 10]: Score threshold >= 1 required — prevents random unrelated fields (search bars, newsletter checkboxes) from matching
- [Phase 10]: shouldSkip() checks both EXCLUDED_TYPES array and CAPTCHA_PATTERNS regex — double-layer CAPTCHA protection
- [Phase 11-01]: attachResume returns null (not error) on files.length===0 — signals caller to send RESUME_UPLOAD_FALLBACK
- [Phase 11-01]: attachResumeInMainWorld uses var throughout — serialization safety across page JS engines
- [Phase 11-01]: handleResumeUploadFallback reads resume fresh from chrome.storage.local — avoids message size limit for large PDFs
- [Phase 11-01]: frameId defaults to 0 when absent — safe for top-level frame; iCIMS passes explicit frameId
- [Phase 11-02]: fillStandardFields made async in greenhouse, lever, icims — contains await attachResume call
- [Phase 11-02]: Workday: findResumeFileInput called first; shadowQueryAll loop only when it returns null
- [Phase 11-02]: LinkedIn upload scoped to .jobs-easy-apply-modal; graceful skip when modal absent or no file input found
- [Phase 11-02]: Generic marks resume result needs_review on success — consistent with Phase 10 heuristic policy
- [Phase 11-02]: iCIMS forwards frameId in RESUME_UPLOAD_FALLBACK for iframe executeScript targeting

## Session Log

- **2026-03-13:** Project initialized. PROJECT.md and config.json created and committed.
- **2026-03-14:** Research agents completed (STACK, ARCHITECTURE, CONCERNS). FEATURES.md agent hit rate limit twice, resumed. SUMMARY.md, REQUIREMENTS.md, ROADMAP.md, STATE.md created. Planning phase complete.
- **2026-03-14:** Phase 1 Plan 01 execution: Tasks 1-3 complete (manifest.json, 19 stub files, 3 PNG icons). Stopped at checkpoint:human-verify — awaiting Chrome UAT.
- **2026-03-14:** Phase 2 Plan 01 execution: Tasks 1-2 complete (utils/storage.js — 12 functions, sync/local/session routing). Stopped at checkpoint:human-verify — awaiting browser UAT.
- **2026-03-14:** Phase 2 Plan 01 UAT passed — "ALL STORAGE TESTS PASSED" confirmed in Brave DevTools. Phase 2 complete.
- **2026-03-14:** Phase 3 Plan 01 execution: background.js fully implemented (124 lines). Message router, triggerFill relay, getStatus, exportData, importData, mergeAnswerBank, keyboard shortcut handler. Zero window references. Phase 3 complete.
- **2026-03-14:** Phase 4 Plan 01 execution: Wave 0 TDD scaffold complete. tests/helpers/dom-mock.js (Node DOM shim, native setter spy), tests/unit/events.test.js (9 todo stubs), tests/unit/filler.test.js (6 todo stubs), tests/run-all.js. All 14 TEST: anchors present. node --test exits 0.
- **2026-03-14:** Phase 4 Plan 02 execution: utils/events.js implemented (7 functions, IIFE pattern, native setter). All 9 events.test.js tests pass (0 fail, 0 todo). Commit c07b961.
- **2026-03-14:** Phase 4 Plan 03 execution: utils/filler.js implemented (7 functions, IIFE pattern, fill lock, shadowQuery, waitForElement). All 6 filler.test.js tests pass. Full suite 14/14. Commit a8d10d9. Phase 4 complete.
- **2026-03-14:** Phase 5 Plan 02 execution: utils/matcher.js implemented (6 exported functions, top-level declarations, dual browser/CJS shim). All 29 matcher.test.js tests pass (0 fail, 0 todo). Commit 341fe19.
- **2026-03-15:** Phase 6 Plan 01 execution: content.js IIFE coordinator implemented (115 lines). Platform detection, fill lock, non-async DO_FILL listener, MutationObserver with loop guard, initial showButton. background.js patched to inject tabId. All 10 checks pass. Commits 396b53b, 2331ef8.
- **2026-03-15:** Phase 6 Plan 02 execution: utils/overlay.js implemented (265 lines, Shadow DOM IIFE). showButton, showResults, showBanner, dismiss, setObserverRef. All 18 plan checks pass. Commit cb1ab11.
- **2026-03-15:** Phase 6 verification complete. 13/13 observable truths verified, 6/6 key links wired, 12/12 requirements satisfied. Phase 6 marked complete.
- **2026-03-15:** Phase 7 planning complete. 3 plans created: 07-01 (Wave 1: DOM fixtures + test stubs), 07-02 (Wave 2: greenhouse.js TDD), 07-03 (Wave 2: lever.js TDD, parallel with 07-02).
- **2026-03-15:** Phase 7 Plan 01 execution complete. 4 files created: 2 HTML DOM fixtures, 2 test stub files (10 greenhouse + 8 lever todo stubs). 44 pass, 18 todo, 0 fail. Commits b744c69, 908f486.
- **2026-03-15:** Phase 7 Plan 02 execution complete. platforms/greenhouse.js implemented (336 lines, IIFE). All 10 greenhouse tests GREEN. Commits 4fb3ca1 (RED), 3c756f2 (GREEN).
- **2026-03-15:** Phase 7 Plan 03 execution complete. platforms/lever.js implemented (219 lines, IIFE). All 8 lever tests GREEN. Self-contained mini DOM parser built in test file (no jsdom). Commits 2ceb7c4 (RED), 559efa2 (GREEN).
- **2026-03-15:** Phase 7 verification complete. 9/9 observable truths verified, all key links wired, 11/11 requirements satisfied. greenhouse.js 10/10 GREEN, lever.js 8/8 GREEN. Phase 7 marked complete.
- **2026-03-15:** Phase 8 planning complete. 3 plans created: 08-01 (Wave 1: DOM fixtures + test stubs for Workday + Ashby), 08-02 (Wave 2: workday.js TDD — 7 tests, shadow DOM + blur dispatch), 08-03 (Wave 2: ashby.js TDD — 6 tests, [data-field-type] custom questions, parallel with 08-02).
- **2026-03-15:** Phase 8 execution complete. platforms/workday.js (7 tests GREEN) and platforms/ashby.js (6 tests GREEN) implemented. All 13 tests pass, 0 fail, 0 todo.
- **2026-03-15:** Phase 8 verification complete. 13/13 observable truths verified, all key links wired, 7/7 requirements satisfied. workday.js 7/7 GREEN, ashby.js 6/6 GREEN. Phase 8 marked complete.
- **2026-03-15:** Phase 9 planning complete. 4 plans created: 09-01 (Wave 1: DOM fixtures + test stubs for iCIMS/LinkedIn/Bayt — 20 todo stubs total), 09-02 (Wave 2: icims.js TDD — 7 tests, cross-origin guard), 09-03 (Wave 2: linkedin.js TDD — 7 tests, modal + delay + MutationObserver, parallel), 09-04 (Wave 2: bayt.js TDD — 6 tests, RTL attribute-only selectors, parallel).
- **2026-03-15:** Phase 9 Plan 01 execution complete. 6 files created: dom-icims.html, dom-linkedin.html, dom-bayt.html, icims.test.js (7 stubs), linkedin.test.js (7 stubs), bayt.test.js (6 stubs). 20 todo stubs, 0 fail. Commit b91a8cf.
- **2026-03-15:** Phase 9 execution complete. icims.js (345 lines, 7/7 GREEN), linkedin.js (203 lines, 7/7 GREEN), bayt.js (231 lines, 6/6 GREEN). Full suite 95/95 pass, 0 fail, 0 todo.
- **2026-03-15:** Phase 9 verification complete. 20/20 observable truths verified, all key links wired, 6/6 requirements satisfied. Phase 9 marked complete.
- **2026-03-15:** Phase 10 planning complete. 2 plans created: 10-01 (Wave 1: dom-generic.html fixture + generic.test.js 19 todo stubs), 10-02 (Wave 2: generic.js TDD — 19 tests, heuristic scoring, needs_review policy, CAPTCHA exclusion).
- **2026-03-15:** Phase 10 Plan 01 execution complete. 2 files created: tests/fixtures/dom-generic.html (10 fillable fields, 5 excluded inputs, page metadata), tests/unit/generic.test.js (19 todo stubs, 7 describe blocks, self-contained MockNode shim). 19 todo, 0 fail. Full suite exits 0.
- **2026-03-15:** Phase 10 Plan 02 execution complete. platforms/generic.js implemented (388 lines, IIFE). 19 todo stubs converted to real assertions. All 19 tests GREEN. Auto-fixed: broad selector replaces :not() chains; hasValue checks _attrs.value for test mock. Phase 10 complete. Commits c576e38 (RED), 8295e1b (GREEN).
- **2026-03-15:** Phase 11 Plan 01 execution complete. utils/filler.js extended with dataUrlToFile, getUniqueSelector, findResumeFileInput, attachResume (4 new exports). background.js RESUME_UPLOAD_FALLBACK stub replaced with handleResumeUploadFallback + attachResumeInMainWorld. 8 new tests added to filler.test.js — 14/14 GREEN, 0 fail, 0 todo. Commit bc25a76.
- **2026-03-15:** Phase 11 Plan 02 execution complete. All 8 platform modules wired with attachResume + inline RESUME_UPLOAD_FALLBACK. Zero Phase 11 stubs remaining. 23/23 tests GREEN. Commits 3269031, 55c51eb. Phase 11 complete.
- **2026-03-15:** Phase 12 Plan 01 execution complete. popup.html (4-tab shell, 27 profile fields, modal skeleton) and popup.css (indigo scheme, system fonts, no CDN) created. Zero CSP violations. Commit 4ef5b89.
- **2026-03-15:** Phase 12 Plan 03 execution complete. resume-tab-fragment.js created (5 functions: formatBytes, showResumeInfo, clearResumeUI, loadResume, bindResumeTab). Fragment approach used to avoid popup.js write conflict with parallel plan 12-02. Auto-fixed: 5 MB size guard (Rule 2 — plan spec mentioned guard but omitted from template). Plan 12-04 will merge. Commit fd3c803.

---

## Config

```json
{
  "mode": "yolo",
  "granularity": "fine",
  "parallelization": true,
  "commit_docs": true,
  "model_profile": "balanced"
}
```
