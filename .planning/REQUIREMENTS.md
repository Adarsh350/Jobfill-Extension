# REQUIREMENTS: JobFill Chrome Extension

**Version:** 1.0.0
**Date:** 2026-03-14
**Status:** Active

---

## Functional Requirements

### FR-1: User Profile Storage
- **FR-1.1** Store user profile fields in `chrome.storage.sync`: full name, first name, last name, email, phone, city, country, nationality, work authorization status, years of experience, LinkedIn URL, portfolio URL, current title, current/last company name.
- **FR-1.2** Store resume file in `chrome.storage.local` as base64 data URL (never in sync storage — exceeds 8KB per-item limit).
- **FR-1.3** Profile data syncs across devices when user is signed into Chrome.
- **FR-1.4** Resume is device-local only (acceptable — file size prevents sync).
- **FR-1.5** Profile editable from the popup UI with auto-save on input (no explicit save button needed — popup may close without notice).
- **FR-1.6** Resume upload via file picker in popup; stored with filename, MIME type, and base64 data.
- **FR-1.7** Profile fields support template variable references: `{{my_name}}`, `{{my_email}}`, `{{years_experience}}`, etc.

### FR-2: Form Detection & Auto-Fill
- **FR-2.1** Detect which ATS platform is active based on `window.location.hostname`.
- **FR-2.2** Support 8 targets: Greenhouse, Lever, Workday, Ashby, iCIMS, LinkedIn Easy Apply, Bayt, Generic fallback.
- **FR-2.3** Fill standard fields (name, email, phone, location, LinkedIn, work auth) from profile data.
- **FR-2.4** Fill dropdown fields using fuzzy matching: exact → alias map → case-insensitive includes → Levenshtein ≤ 3.
- **FR-2.5** Fill checkboxes and radio buttons where value matches profile data.
- **FR-2.6** Do NOT overwrite fields that already contain a value (unless user enables force-overwrite).
- **FR-2.7** Trigger fill via: (a) Fill button in popup, (b) floating page button, (c) Alt+Shift+F keyboard shortcut.
- **FR-2.8** Use React/Angular-compatible event dispatch: native `HTMLInputElement.prototype` value setter + `input` + `change` events with `bubbles: true`.
- **FR-2.9** Each platform module exposes: `matches(hostname)`, `fill(profile, answerBank)`, `getJobDetails()`.

### FR-3: Smart Answer Bank
- **FR-3.1** Store answer bank in `chrome.storage.sync` under `"answerBank"` key as array of objects.
- **FR-3.2** Each entry: `{ id, question, keywords: string[], answer, category, variables: string[] }`.
- **FR-3.3** Categories: `work_auth`, `salary`, `experience`, `motivation`, `skills`, `location`, `availability`, `diversity`, `cover_letter`, `other`.
- **FR-3.4** Match open-ended text area questions against answer bank by: keyword overlap scoring + category alignment. Require match confidence > 0.75 before autofilling.
- **FR-3.5** Perform variable substitution in answers: `{{company_name}}`, `{{job_title}}`, `{{my_name}}`, `{{years_experience}}`, `{{current_company}}`, `{{target_role}}`.
- **FR-3.6** Extract `company_name` and `job_title` from the current ATS page via `getJobDetails()` for variable substitution.
- **FR-3.7** If confidence < 0.75 or variable cannot be resolved: leave field blank and flag in overlay for user review.
- **FR-3.8** Ship with 10 pre-populated answer templates focused on marketing/CRM/lifecycle roles.
- **FR-3.9** Answer bank manageable from popup (add, edit, delete entries). Show storage usage bar (warn at 75% of 8KB).

### FR-4: Fill Status Overlay
- **FR-4.1** Show a floating overlay after fill completes, summarizing results: filled (green), skipped (yellow), failed (red), needs-review (orange).
- **FR-4.2** Overlay mounted in Shadow DOM — styles scoped to extension, cannot bleed into page.
- **FR-4.3** Each row shows: field label, fill result, value used (or skip reason).
- **FR-4.4** "Needs review" items are clickable — clicking opens the answer bank entry for quick edit.
- **FR-4.5** Overlay dismissible (X button). Stores last fill status in `chrome.storage.session`.
- **FR-4.6** Overlay position: bottom-right corner, draggable.

### FR-5: Import / Export
- **FR-5.1** Export full profile + answer bank as a single JSON file (resume excluded — too large).
- **FR-5.2** Import JSON file: validate structure before writing to storage. Show descriptive error on invalid file.
- **FR-5.3** Import is non-destructive by default: merges answer bank entries (deduplicates by ID), overwrites profile fields.
- **FR-5.4** Export available from popup Import/Export tab.
- **FR-5.5** JSON schema versioned (`"schemaVersion": 1`) for future migration support.

### FR-6: Resume Auto-Upload
- **FR-6.1** Detect `<input type="file">` fields on application forms.
- **FR-6.2** Programmatically attach stored resume using DataTransfer API + File constructor.
- **FR-6.3** Dispatch `change` event with `bubbles: true` after attachment.
- **FR-6.4** If DataTransfer attach fails (React isolated-world `instanceof File` check): fallback to `chrome.scripting.executeScript({ world: 'MAIN' })`.
- **FR-6.5** Verify attachment succeeded by checking `input.files.length > 0`. Surface error if not.

### FR-7: Platform-Specific Behaviors
- **FR-7.1 Workday:** Shadow DOM traversal (recursive shadowRoot walk). MutationObserver for SPA step navigation. Dispatch `blur` event after fills for onBlur validation.
- **FR-7.2 iCIMS:** `all_frames: true` in manifest. Detect cross-origin iframes and show user warning (not silent failure).
- **FR-7.3 LinkedIn Easy Apply:** MutationObserver on modal container. Per-field fill delays 50–200ms. Never auto-submit.
- **FR-7.4 Greenhouse/Lever/Ashby:** React native setter pattern. MAIN world fallback for file uploads. Per-field fallback selector chains.
- **FR-7.5 Bayt:** Target `name`/`id`/`type` attributes (not label text) — RTL/Arabic compatibility.
- **FR-7.6 Generic:** Heuristic field detection by `name`, `id`, `placeholder`, `aria-label`. Covers any unknown form.

### FR-8: Popup UI
- **FR-8.1** Three-tab layout: Profile, Answer Bank, Import/Export.
- **FR-8.2** Profile tab: all profile fields editable, resume upload/display, storage usage indicator.
- **FR-8.3** Answer Bank tab: list of entries with add/edit/delete. Storage usage bar.
- **FR-8.4** Import/Export tab: export button, import file picker with validation status.
- **FR-8.5** "Fill Form" button at top — sends fill trigger to active tab.
- **FR-8.6** Shows detected platform and field count on current tab.
- **FR-8.7** All JS in external `popup.js` — no inline scripts (MV3 CSP).
- **FR-8.8** Popup auto-saves on input (popup may close before user explicitly saves).

---

## Non-Functional Requirements

### NFR-1: Technical Constraints
- **NFR-1.1** Manifest V3 only (MV2 deprecated).
- **NFR-1.2** Vanilla JavaScript — no build tools, no npm, no bundler, no node_modules.
- **NFR-1.3** Zero network requests — fully offline after installation.
- **NFR-1.4** Zero external dependencies — all code self-contained in extension package.
- **NFR-1.5** Must load directly via `chrome://extensions > Load Unpacked` with zero configuration.
- **NFR-1.6** $0 operating cost — no API keys, subscriptions, or paid services.

### NFR-2: Storage
- **NFR-2.1** Never store resume in `chrome.storage.sync` (exceeds 8KB per-item limit).
- **NFR-2.2** Wrap all `chrome.storage.sync.set()` calls to catch quota rejections (not exceptions).
- **NFR-2.3** Warn user in UI when answer bank exceeds 75% of 8KB per-item limit (~6KB).

### NFR-3: Performance
- **NFR-3.1** MutationObserver callback must be fast — no synchronous storage reads inside callback.
- **NFR-3.2** Fill operation completes within 3 seconds for normal forms.
- **NFR-3.3** Cascading dropdown wait: poll max 3 seconds for child options to appear.

### NFR-4: Security
- **NFR-4.1** Extension overlay mounted in Shadow DOM — styles cannot leak into host page.
- **NFR-4.2** MAIN world injection kept minimal — only code that requires page-world access.
- **NFR-4.3** No user credentials or profile data passed through MAIN world scripts.
- **NFR-4.4** All chrome.runtime calls wrapped in try/catch — handle "Extension context invalidated" gracefully.

### NFR-5: Robustness
- **NFR-5.1** Fill lock (`let filling = false`) — prevents concurrent fill operations.
- **NFR-5.2** "Extension context invalidated" → show user banner: "JobFill was updated — please reload this tab."
- **NFR-5.3** All `JSON.parse()` calls wrapped in try/catch (import, storage reads).
- **NFR-5.4** Every platform module has primary + fallback selector chain per field.

---

## Data Models

### Profile Object (chrome.storage.sync → "profile")
```json
{
  "firstName": "Adarsh",
  "lastName": "Shankar",
  "fullName": "Adarsh Shankar",
  "email": "adarshwork11@gmail.com",
  "phone": "+971 XX XXX XXXX",
  "city": "Abu Dhabi",
  "country": "United Arab Emirates",
  "nationality": "Indian",
  "workAuthorization": "UAE Golden Visa",
  "yearsExperience": "6",
  "currentTitle": "Product Marketing Manager",
  "currentCompany": "",
  "linkedinUrl": "https://linkedin.com/in/...",
  "portfolioUrl": "",
  "noticePeriod": "Immediate",
  "salaryExpectation": "",
  "summary": ""
}
```

### Answer Bank Entry (chrome.storage.sync → "answerBank": [...])
```json
{
  "id": "uuid-v4",
  "question": "Why do you want to work at {{company_name}}?",
  "keywords": ["why", "work", "company", "motivation", "interest"],
  "category": "motivation",
  "answer": "I'm drawn to {{company_name}} because...",
  "variables": ["company_name", "job_title"]
}
```

### Resume Object (chrome.storage.local → "resume")
```json
{
  "name": "Adarsh_Shankar_Resume.pdf",
  "type": "application/pdf",
  "data": "data:application/pdf;base64,...",
  "size": 245678,
  "uploadedAt": "2026-03-14T10:00:00Z"
}
```

### Fill Status (chrome.storage.session → "lastFillStatus")
```json
{
  "tabId": 123,
  "platform": "greenhouse",
  "timestamp": "2026-03-14T10:00:00Z",
  "results": [
    { "field": "First Name", "status": "filled", "value": "Adarsh" },
    { "field": "Cover Letter", "status": "needs_review", "value": "...", "reason": "confidence: 0.65" },
    { "field": "Resume", "status": "failed", "reason": "file input not found" }
  ]
}
```

---

## Out of Scope

- AI-powered question answering or external AI API calls
- Application tracking, analytics, or dashboards
- Mobile or non-Chrome browser support
- Real-time sync or collaboration
- Build tools (webpack, vite, rollup, etc.)
- npm packages or node_modules
- Auto-submission of forms
- Screen scraping or data extraction for any purpose other than `getJobDetails()`
