# ROADMAP: JobFill Chrome Extension

**Version:** 1.0.0
**Created:** 2026-03-14
**Granularity:** Fine (8–12 phases, 5–10 plans each)

---

## Milestone 1: Functional Personal Tool

**Goal:** A fully working Chrome extension that Adarsh can load unpacked and use immediately for job applications on all 8 platforms.

**Success Criteria:**
- Loads in Chrome via `chrome://extensions > Load Unpacked` with zero errors
- Fills Greenhouse and Lever forms in one click from stored profile
- Answer bank handles marketing-role questions with variable substitution
- Resume uploads programmatically on all supported platforms
- Fill status overlay shows results after every fill
- Data survives browser restarts (profile + answer bank in sync, resume in local)

---

## Phase 1: Project Scaffold & Manifest

**Goal:** Create the complete directory structure and a valid, loadable `manifest.json` that Chrome accepts without errors.

**Status:** In Progress (UAT pending)

**Plans:** 1/1 plans complete

Plans:
- [x] 01-PLAN.md — Create all 22 scaffold files: manifest.json (MV3), 3 PNG icons, 14 JS stubs (utils + platforms + coordinators), popup shell, and verify Chrome load with zero errors — Tasks 1-3 complete; Task 4 (UAT) pending
**UAT Criteria:** Extension icon appears in Chrome toolbar. No errors in `chrome://extensions`. Popup opens (blank is fine).

---

## Phase 2: Chrome Storage Utility Layer

**Goal:** `utils/storage.js` exposes a complete, quota-safe storage API that all other modules use.

**Status:** Complete (UAT passed 2026-03-14) — 1/1 plans complete

**Plans:**
1. Implement `window.JobFill.storage` namespace object with guard (`window.JobFill = window.JobFill || {}`)
2. `getProfile()` / `saveProfile(data)` — reads/writes `chrome.storage.sync["profile"]`
3. `getAnswerBank()` / `saveAnswerBank(entries)` — reads/writes `chrome.storage.sync["answerBank"]` with `.catch()` quota error handler
4. `getResume()` / `saveResume(resumeObj)` / `clearResume()` — reads/writes `chrome.storage.local["resume"]`
5. `getSettings()` / `saveSettings(settings)` — reads/writes `chrome.storage.sync["settings"]`
6. `getFillStatus(tabId)` / `saveFillStatus(tabId, results)` — reads/writes `chrome.storage.session["lastFillStatus"]`
7. `getBytesInUse(key)` — wraps `chrome.storage.sync.getBytesInUse()` for quota monitoring
8. All write functions return Promises; `.catch()` handlers log and surface errors; never throw silently

**UAT Criteria:** Open Chrome DevTools on a page with the extension loaded. Console test: `window.JobFill.storage.saveProfile({firstName: "Test"})` then `window.JobFill.storage.getProfile()` returns the value.

---

## Phase 3: Background Service Worker

**Goal:** `background.js` routes messages between popup and content scripts, handles keyboard shortcut, and initializes session storage access.

**Plans:**
1. Top-level `chrome.storage.session.setAccessLevel({ accessLevel: 'TRUSTED_AND_UNTRUSTED_CONTEXTS' })` on service worker startup
2. `chrome.runtime.onMessage` listener registered at top level (not async — returns `true` for async paths)
3. Handle `TRIGGER_FILL` message: query active tab, send `DO_FILL` to tab via `chrome.tabs.sendMessage`, forward response back to popup
4. Handle `GET_STATUS` message: read `lastFillStatus` from session storage, send back to popup
5. Handle `EXPORT_DATA` message: read profile + answer bank, return as JSON object
6. Handle `IMPORT_DATA` message: validate + write profile + answer bank to storage
7. `chrome.commands.onCommand` listener: on `"fill-form"` command, trigger same flow as `TRIGGER_FILL`
8. Error handling: tab not found, content script not responding, extension context invalidated

**UAT Criteria:** Open extension popup, open DevTools background page (`chrome://extensions > Inspect`), verify no console errors. Send test message from popup → verify it reaches background → verify `DO_FILL` sent to tab.

---

## Phase 4: React/Angular Event Dispatch & Form Fill Primitives

**Goal:** `utils/events.js` and `utils/filler.js` implement the correct patterns for filling inputs on React/Angular/vanilla forms.

**Plans:**
1. `utils/events.js` → `window.JobFill.events`: implement `fillInput(el, value)` using native `HTMLInputElement.prototype` value setter + dispatch `input` + `change` events with `{ bubbles: true }`
2. `fillSelect(el, value)` — exact match first, then case-insensitive includes, then dispatch `change` event
3. `fillCheckbox(el, checked)` — set `.checked`, dispatch `change` event
4. `fillRadio(el)` — set `.checked = true`, dispatch `change` + `.click()`
5. `fillTextarea(el, value)` — same as `fillInput` using `HTMLTextAreaElement.prototype` setter
6. `utils/filler.js` → `window.JobFill.filler`: `fillField(el, value)` dispatcher that detects element type and calls the right events.js method
7. `waitForElement(selector, timeout)` — returns Promise, polls for element up to timeout (for cascading dropdowns)
8. `shadowQuery(root, selector)` — recursive shadow-piercing querySelector for Workday
9. Fill lock: `window.JobFill.filler.isFilling` boolean, `startFill()` / `endFill()` methods

**UAT Criteria:** Open a Greenhouse test job application. Open DevTools console. Run `window.JobFill.events.fillInput(document.querySelector('input[name="first_name"]'), "Test")` — verify React state updates (field shows value, no blank on blur).

---

## Phase 5: Fuzzy Matcher & Answer Bank Engine

**Goal:** `utils/matcher.js` implements the complete offline keyword + fuzzy matching system for answer bank lookups and dropdown value matching.

**Plans:**
1. `window.JobFill.matcher` namespace with Levenshtein distance function (single-row optimized, ~20 lines)
2. Country/value alias map: `{ "UAE": "United Arab Emirates", "US": "United States", "UK": "United Kingdom", "US Citizen": "United States Citizen", ... }` (15–20 key entries for Gulf/MENA context)
3. `matchDropdownOption(options, targetValue)` — exact → alias → case-insensitive includes → Levenshtein ≤ 3 → null
4. `scoreAnswerBankEntry(question, entry)` — returns 0–1 score based on keyword overlap (Jaccard) + category alignment
5. `findBestAnswer(questionText, answerBank)` — returns `{ entry, score }` or null if best score < 0.75
6. `substituteVariables(answerText, variables)` — replaces `{{key}}` placeholders with values from a variables map
7. `extractKeywords(text)` — lowercase, strip punctuation, remove stop words, return array
8. Unit-testable: each function is pure (no side effects, no storage reads)

**UAT Criteria:** Open DevTools console on any page with content script loaded. Test `window.JobFill.matcher.matchDropdownOption([{text:'United Arab Emirates',value:'UAE'}], 'UAE')` returns the option. Test `window.JobFill.matcher.findBestAnswer("Why do you want to work here?", answerBankSample)` returns expected result.

---

## Phase 6: Content Script Coordinator & Fill Overlay

**Goal:** `content.js` detects the platform, shows floating UI, handles fill trigger messages, and renders the fill status overlay.

**Plans:**
1. `content.js` IIFE: detect platform via `Object.values(window.JobFill.platforms).find(p => p.matches(hostname))`
2. Register `chrome.runtime.onMessage` listener for `DO_FILL`: call `runFill(platform)`, `return true` for async
3. MutationObserver on `document.body` for SPA navigation: detect new form elements, re-show fill button
4. Disconnect MutationObserver when overlay is dismissed (memory management)
5. Fill lock check in `runFill()`: if `isFilling` true, send back `{ status: 'busy' }`
6. `utils/overlay.js` → `window.JobFill.overlay`: `showButton()` — renders floating "✨ Fill Form" button (Shadow DOM mounted)
7. `overlay.showResults(fillResults)` — renders colour-coded result list (filled/skipped/failed/needs_review) in Shadow DOM
8. Overlay styles scoped inside shadow tree; draggable; X to dismiss; position saved in settings
9. Extension context invalidated handler: catch error, show non-alarming banner to reload tab

**UAT Criteria:** Open a Greenhouse job application. Verify "✨ Fill Form" button appears bottom-right. Verify clicking it sends fill trigger. Verify overlay renders after fill with results.

---

## Phase 7: Greenhouse & Lever Platform Modules

**Goal:** `platforms/greenhouse.js` and `platforms/lever.js` implement full field mapping, fill logic, and job detail extraction for both platforms.

**Plans:**
1. `platforms/greenhouse.js` — `matches`: `hostname.includes('greenhouse.io')`
2. Greenhouse field selectors: `first_name`, `last_name`, `email`, `phone`, `resume` (file input), `cover_letter` (textarea), LinkedIn, location dropdowns, work auth radio/select, custom questions
3. `getJobDetails()` for Greenhouse: extract company name from `<h1>` or page title, job title from `<h1.app-title>` or `<title>`
4. `fill(profile, answerBank)`: iterate fields, call `window.JobFill.filler.fillField()` for each, collect results
5. `platforms/lever.js` — `matches`: `hostname.includes('lever.co')`
6. Lever field selectors (React SPA): `input[name="name"]`, `input[name="email"]`, `input[name="phone"]`, LinkedIn input, resume upload, cover letter, custom `[data-qa]` fields
7. `getJobDetails()` for Lever: company from `<div.main-header-logo>` alt text or page title; job title from `<h2>` or `<title>`
8. Full fallback selector chains for each field (primary + 2 fallbacks)

**UAT Criteria:** Load a real Greenhouse job application. Click Fill Form. Verify name, email, phone, LinkedIn populated correctly. Verify React state updated (not just DOM value). Verify overlay shows results. Repeat for Lever.

---

## Phase 8: Workday & Ashby Platform Modules

**Goal:** `platforms/workday.js` and `platforms/ashby.js` handle the most complex ATS platforms.

**Plans:**
1. `platforms/workday.js` — `matches`: `hostname.includes('myworkdayjobs.com')`
2. Shadow DOM traversal helper (uses `window.JobFill.filler.shadowQuery()`): pierce all shadow roots recursively to find `input`, `select`, `textarea`
3. SPA step navigation: `hasNewFormStep()` checks DOM for presence of step-specific signals (form section heading change)
4. Fill logic: personal info section → contact section → work experience section (fill only visible/current step)
5. After each fill: dispatch `blur` event for Workday's onBlur validation
6. `getJobDetails()` for Workday: job title from `<h2[data-automation-id="jobPostingHeader"]>`, company from page meta or URL subdomain
7. `platforms/ashby.js` — `matches`: `hostname.includes('ashbyhq.com')`
8. Ashby React fields: standard `fillInput` pattern. Custom question detection via `[data-field-type]` attributes.
9. `getJobDetails()` for Ashby: company from `<title>` parse, job title from `<h1>`

**UAT Criteria:** Load a Workday job application with shadow DOM form. Verify fields found and filled. Navigate to next step, verify MutationObserver re-triggers fill button. Repeat for Ashby.

---

## Phase 9: iCIMS, LinkedIn Easy Apply & Bayt Modules

**Goal:** Complete the remaining platform modules including the tricky iframe (iCIMS) and modal-step (LinkedIn) cases.

**Plans:**
1. `platforms/icims.js` — `matches`: `hostname.includes('icims.com')` or `hostname.includes('careers.icims.com')`
2. iCIMS iframe detection: check `window !== window.top` (content script is in iframe). Fill fields in the current frame's DOM directly.
3. Cross-origin iframe detection: if `window.location.origin !== document.referrer origin` → send `ICIMS_CROSS_ORIGIN` message to trigger user warning in overlay
4. `getJobDetails()` for iCIMS: parse from page title or `<div.iCIMS_JobTitle>`
5. `platforms/linkedin.js` — `matches`: `hostname.includes('linkedin.com')`
6. Easy Apply modal detection: `document.querySelector('.jobs-easy-apply-modal')` presence check
7. Per-field delays: `await sleep(50 + Math.random() * 150)` between fields — human-speed filling
8. MutationObserver on modal container for step navigation; re-identify fields on each step
9. `platforms/bayt.js` — `matches`: `hostname.includes('bayt.com')`
10. Field detection by `name`/`id`/`type` attributes (not label text — RTL safety). Confirm `<form>` is Bayt-hosted (not ATS redirect).

**UAT Criteria:** Test iCIMS form in iframe — verify fill works from iframe content script. Test LinkedIn Easy Apply — verify modal fields fill with per-field delay, verify step navigation handled. Test Bayt form filling.

---

## Phase 10: Generic Fallback Module

**Goal:** `platforms/generic.js` provides heuristic-based autofill for any job application form not covered by the 7 specific platforms.

**Plans:**
1. `platforms/generic.js` — `matches`: always returns `true` (last checked, so only triggers if no specific platform matched)
2. Field discovery by heuristic: score each input/select/textarea by matching `name`, `id`, `placeholder`, `aria-label`, `autocomplete` attribute against profile field keywords
3. Field type inference: `email` → email field, `tel`/`phone` → phone field, `name`/`fname`/`first` → first name, etc. (30+ keyword mappings)
4. Fill detected fields using same `window.JobFill.filler` primitives
5. Explicit skip of irrelevant fields: `type="hidden"`, `type="submit"`, password inputs, CAPTCHA inputs
6. `getJobDetails()` for generic: parse `<title>`, `<h1>`, `<meta name="description">` for job title + company heuristics
7. Low-confidence fills always marked as `needs_review` in overlay (generic has no guaranteed accuracy)

**UAT Criteria:** Load an obscure ATS not in the supported list. Verify generic module activates. Verify it finds and fills at least name + email correctly. Verify all generic fills appear as "needs review" in overlay.

---

## Phase 11: Resume Auto-Upload

**Goal:** Programmatically attach the stored resume to file input fields across all platforms, with MAIN world fallback for React.

**Plans:**
1. `utils/filler.js` extension: `attachResume(inputEl)` — reads resume from `window.JobFill.storage.getResume()`, constructs `File` object, creates `DataTransfer`, sets `inputEl.files`, dispatches `change` event
2. Detect resume upload success: check `inputEl.files.length > 0` after attachment
3. Fallback detection: if files.length still 0 after DataTransfer attempt, send `RESUME_UPLOAD_FALLBACK` message to background
4. `background.js` handles `RESUME_UPLOAD_FALLBACK`: calls `chrome.scripting.executeScript({ target: { tabId }, world: 'MAIN', func: attachResumeInMainWorld, args: [resumeData, selector] })`
5. `attachResumeInMainWorld` function (injected into MAIN world): constructs File using page's native constructors, attaches via DataTransfer — avoids `instanceof File` cross-world failure
6. Platform modules call `attachResume()` whenever a `<input type="file">` is detected with likely-resume context (name/id contains "resume", "cv", "upload")
7. Overlay result for resume: `filled` (DataTransfer success), `filled_via_main_world` (fallback success), `failed` (both failed — show manual upload instruction)

**UAT Criteria:** Load a Greenhouse application with resume upload field. Trigger fill. Verify resume file appears in the file input. Test React-heavy Workday upload field — verify MAIN world fallback triggers when needed.

---

## Phase 12: Popup UI, Answer Bank Management & Pre-filled Templates

**Goal:** Complete the popup UI with all three tabs, functional answer bank CRUD, pre-populated marketing templates, and import/export.

**Plans:**
1. `popup.html` + `popup.css`: three-tab layout (Profile / Answer Bank / Import•Export), 360px wide, clean modern design, no inline scripts
2. Profile tab: all FR-1.1 fields as labeled inputs, resume file picker with filename display + clear button, storage usage bar
3. Answer Bank tab: scrollable entry list with add/edit/delete. Each entry: question preview, category badge, edit modal. Storage usage bar for answerBank key.
4. Add/Edit modal: fields for question, keywords (comma-separated), category dropdown, answer textarea, preview of variable substitution
5. 10 pre-populated marketing answer templates (loaded on first install if answer bank is empty):
   - "Why marketing?" (motivation/career)
   - "CRM experience" (skills/tools — Salesforce, HubSpot, Klaviyo)
   - "Email marketing metrics" (skills/results)
   - "Product launch experience" (experience)
   - "Why {{company_name}}?" (motivation/company)
   - "Work authorization / UAE Golden Visa" (work_auth)
   - "Notice period / availability" (availability)
   - "Salary expectations" (salary)
   - "Remote work experience" (experience)
   - "Biggest achievement" (experience/impact)
6. Import/Export tab: Export button (downloads JSON), Import file picker with schema validation feedback
7. Platform + field count display at top of popup (reads `lastFillStatus` from session storage)
8. `popup.js`: all event listeners via `addEventListener`, auto-save profile on `input` event, connect to background via `chrome.runtime.sendMessage`

**UAT Criteria:** Open popup. Navigate all three tabs. Add an answer bank entry, edit it, delete it. Export data as JSON, verify file downloads. Import the exported file, verify data restored. Click Fill Form button — verify fill triggers on current tab.

---

## Notes

- **Phase execution order:** Phases 1–6 are sequential foundations. Phases 7–10 (platform modules) can be partially parallelized after Phase 6. Phase 11 requires Phase 4 (filler primitives). Phase 12 is standalone (popup UI), can start after Phase 2 (storage layer).
- **Testing:** Each phase has UAT criteria. Manual testing against live ATS URLs is required for all platform phases. No automated test suite in Milestone 1 (added in Milestone 2 if published to Chrome Web Store).
- **Icons:** Placeholder icons in Phase 1; replace with real branded icons before Chrome Web Store submission.
- **FEATURES.md:** Research agent still completing. Will not affect Phase 1–6 execution. Answer bank templates (Phase 12) can be refined once FEATURES.md is available.
