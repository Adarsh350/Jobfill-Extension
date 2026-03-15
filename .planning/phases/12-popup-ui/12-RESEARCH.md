# Phase 12: Popup UI, Answer Bank Management & Pre-filled Templates — Research

**Researched:** 2026-03-15
**Domain:** Chrome Extension MV3 Popup HTML/CSS/JS
**Confidence:** HIGH

---

## Summary

Phase 12 builds the complete user interface for the JobFill extension popup. All three source files (`popup.html`, `popup.js`, `popup.css`) are pure placeholders with no functional content. The storage layer (`utils/storage.js`) and message router (`background.js`) are fully implemented and ready to wire up.

The popup must implement a three-tab layout: Profile (25+ fields + resume), Answer Bank (CRUD with modal), and Import/Export. CSP in `manifest.json` is `script-src 'self'` — no inline scripts, no `onclick` attributes, no CDN-loaded CSS frameworks. All styling must be vanilla CSS in `popup.css`; all JavaScript in `popup.js` loaded via `<script src="popup.js">` (placed before `</body>` or with `defer`).

The existing script tag in `popup.html` is already correctly placed (`<script src="popup.js">` at end of `<body>`). Phase 12 replaces the placeholder `<p>` with the real UI and fills `popup.js` and `popup.css` with complete implementations.

**Primary recommendation:** Build a single `popup.html` with three tab panels and a single `popup.js` that wires all `addEventListener` calls on `DOMContentLoaded`. Auto-save profile on every `input` event. No frameworks — vanilla DOM + `chrome.runtime.sendMessage` only.

---

## Current State vs What Needs Building

### What Exists (Placeholders)

| File | Current Content | Status |
|------|----------------|--------|
| `popup.html` | Boilerplate shell, `<p>JobFill popup — coming soon</p>`, correct `<script src="popup.js">` | Placeholder — replace body |
| `popup.js` | 3-line stub: `window.JobFill = window.JobFill || {}` | Placeholder — implement fully |
| `popup.css` | Empty (1 line) | Placeholder — implement fully |

### What Is Ready to Use

| File | What It Provides | How Popup Uses It |
|------|-----------------|-------------------|
| `utils/storage.js` | `window.JobFill.storage.*` — full async CRUD for profile, answerBank, resume, settings | Import-free; auto-available because `popup.html` loads it explicitly (must add to popup's `<head>`) |
| `background.js` | Message types: `TRIGGER_FILL`, `GET_STATUS`, `EXPORT_DATA`, `IMPORT_DATA` | `chrome.runtime.sendMessage({type}, callback)` |
| `manifest.json` | `"default_popup": "popup.html"` confirmed; CSP `script-src 'self'` confirmed | No changes needed |

**Critical:** `popup.html` must load `utils/storage.js` via `<script src="utils/storage.js">` before `popup.js`, because `popup.js` calls `window.JobFill.storage.*` directly.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Vanilla JS | ES2020 | All popup logic | MV3 CSP forbids eval/inline; no bundler in this project |
| Vanilla CSS | — | All styling | No external CSS allowed; keeps extension self-contained |
| `chrome.storage.*` | MV3 built-in | Data persistence | Already implemented in storage.js |
| `chrome.runtime.sendMessage` | MV3 built-in | Popup ↔ background communication | Already implemented in background.js |

### No External Dependencies
This project uses no npm, no bundler, no CDN. All code is plain files loaded directly by Chrome. Do not introduce any external library.

---

## Architecture Patterns

### Recommended File Structure

```
popup.html        — shell with tab nav, three panels, modal skeleton
popup.css         — all visual styling (360px wide, tab transitions, form layout)
popup.js          — all event wiring (DOMContentLoaded, addEventListener only)
utils/storage.js  — already built; loaded by popup.html before popup.js
```

### Pattern 1: Script Loading Order

`popup.html` must load scripts in this exact order:

```html
<head>
  <meta charset="utf-8">
  <link rel="stylesheet" href="popup.css">
  <script src="utils/storage.js" defer></script>
  <script src="popup.js" defer></script>
</head>
```

`defer` ensures both scripts execute after DOM is parsed, in order. `storage.js` must come first so `window.JobFill.storage` is available when `popup.js` runs.

**Alternative (current pattern in placeholder):** `<script src="popup.js">` at end of `<body>` also works — either is acceptable. Using `defer` in `<head>` is slightly cleaner.

### Pattern 2: Tab Navigation

Three tabs controlled by CSS classes + `data-tab` attributes. No framework needed.

```html
<nav class="tabs">
  <button class="tab-btn active" data-tab="profile">Profile</button>
  <button class="tab-btn" data-tab="answers">Answer Bank</button>
  <button class="tab-btn" data-tab="importexport">Import / Export</button>
</nav>
<div id="tab-profile" class="tab-panel active">...</div>
<div id="tab-answers" class="tab-panel">...</div>
<div id="tab-importexport" class="tab-panel">...</div>
```

```javascript
// popup.js — tab switching
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
  });
});
```

### Pattern 3: Auto-Save Profile (Input Event)

Save profile on every field change — no Save button needed.

```javascript
// popup.js
const PROFILE_FIELDS = ['firstName','lastName','email','phone', /* ...all 25+ fields */];

async function loadProfile() {
  const profile = await window.JobFill.storage.getProfile() || {};
  PROFILE_FIELDS.forEach(key => {
    const el = document.getElementById('profile-' + key);
    if (el) el.value = profile[key] || '';
  });
}

function bindProfileAutoSave() {
  PROFILE_FIELDS.forEach(key => {
    const el = document.getElementById('profile-' + key);
    if (!el) return;
    el.addEventListener('input', debounce(async () => {
      const profile = await window.JobFill.storage.getProfile() || {};
      profile[key] = el.value.trim();
      await window.JobFill.storage.saveProfile(profile);
    }, 300));
  });
}
```

### Pattern 4: Resume File Picker

Resume is stored as `{ name, dataUrl, mimeType, size }` in `chrome.storage.local`.

```javascript
// popup.js — resume upload
document.getElementById('resume-input').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async (evt) => {
    const resumeObj = {
      name: file.name,
      dataUrl: evt.target.result,   // base64 data URL
      mimeType: file.type,
      size: file.size,
    };
    await window.JobFill.storage.saveResume(resumeObj);
    document.getElementById('resume-filename').textContent = file.name;
    document.getElementById('resume-clear').style.display = 'inline';
  };
  reader.readAsDataURL(file);
});

document.getElementById('resume-clear').addEventListener('click', async () => {
  await window.JobFill.storage.clearResume();
  document.getElementById('resume-filename').textContent = 'No file selected';
  document.getElementById('resume-clear').style.display = 'none';
  document.getElementById('resume-input').value = '';
});
```

### Pattern 5: Background Message Calls

```javascript
// Export
chrome.runtime.sendMessage({ type: 'EXPORT_DATA' }, (response) => {
  if (response.error) { showError(response.error); return; }
  downloadJSON(response.data, 'jobfill-export.json');
});

// Import
chrome.runtime.sendMessage({ type: 'IMPORT_DATA', payload: parsed }, (response) => {
  if (response.error) { showError(response.error); return; }
  showSuccess('Data imported successfully.');
});

// Fill trigger
chrome.runtime.sendMessage({ type: 'TRIGGER_FILL' }, (response) => {
  if (response.error) { showError(response.error); return; }
  // response contains fill results from content script
});
```

### Pattern 6: Answer Bank CRUD

Answer bank entries are plain objects in an array stored under `answerBank` key.

Recommended entry schema (inferred from matcher.js usage and ROADMAP):

```javascript
{
  id: crypto.randomUUID(),          // stable ID for import merge deduplication
  question: "Why do you want...",   // full question text
  keywords: ["motivation", "career"], // array (UI: comma-separated input)
  category: "motivation",           // string from fixed category list
  answer: "I am passionate...",     // answer text, may contain {{company_name}} etc.
}
```

CRUD flow in popup.js:
- **List:** `getAnswerBank()` → render `<ul>` with one `<li>` per entry
- **Add:** open modal with blank fields → on Save: push new entry, `saveAnswerBank(entries)`
- **Edit:** open modal pre-filled with entry data → on Save: replace entry by id, save
- **Delete:** confirm, filter out entry by id, save

### Pattern 7: Import/Export JSON Format

Export format (from `background.js` `exportData`):

```javascript
{
  schemaVersion: 1,
  exportedAt: "2026-03-15T10:00:00.000Z",
  profile: { /* all profile fields */ },
  answerBank: [ /* array of entries */ ]
  // resume intentionally excluded — stored in .local, not exported
}
```

Import validation (from `background.js` `importData`):
- Must be object
- `schemaVersion` must equal `1`
- `profile` must be object (optional)
- `answerBank` must be array (optional)
- Merge strategy: incoming entries overwrite existing entries with the same `id`

### Pattern 8: Storage Usage Bar

```javascript
async function updateQuotaDisplay() {
  const profileQuota = await window.JobFill.storage.getBytesInUse('profile');
  const bankQuota = await window.JobFill.storage.getBytesInUse('answerBank');
  // getBytesInUse limit is 8192 bytes per key
  document.getElementById('profile-quota').style.width = profileQuota.percentFull + '%';
  document.getElementById('answers-quota').style.width = bankQuota.percentFull + '%';
}
```

### Anti-Patterns to Avoid

- **`onclick` attributes in HTML:** CSP `script-src 'self'` blocks inline event handlers. All events must be wired via `addEventListener` in `popup.js`.
- **`eval()` or `new Function()`:** Blocked by CSP.
- **Loading CSS from CDN:** Blocked by CSP `script-src 'self'`; also blocked by `object-src 'none'`.
- **Storing resume in sync storage:** Resume base64 can be 400KB+; sync limit is 8,192 bytes per item. Always use `chrome.storage.local` via `saveResume()`.
- **Async message listeners returning false:** `chrome.runtime.sendMessage` callback is one-time; do not use async functions as direct listener callbacks.
- **Popup accessing `chrome.storage.session` directly:** Session storage access level is set by background.js; popup can read it but should go through `GET_STATUS` message instead.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| File download (export) | Custom XHR or fetch | `URL.createObjectURL(blob)` + `<a download>` click | Built into browser, no permissions needed |
| UUID generation | Custom random string | `crypto.randomUUID()` | Available in MV3 extension context, collision-safe |
| Debounce | Custom timer class | Simple closure debounce (3 lines) | No library needed at this scale |
| Import merge logic | Custom diff | Already in `background.js` `mergeAnswerBank()` | Re-use existing; send `IMPORT_DATA` message |
| Export logic | Read storage directly in popup | Send `EXPORT_DATA` message to background | Background already handles it correctly |

---

## Common Pitfalls

### Pitfall 1: Script Not Found — storage.js Not Loaded in Popup

**What goes wrong:** `popup.js` calls `window.JobFill.storage.getProfile()` but `window.JobFill.storage` is undefined.
**Why it happens:** `storage.js` is in the content script injection list but is NOT automatically available in the popup context. Popup has its own separate JS environment.
**How to avoid:** Add `<script src="utils/storage.js" defer></script>` to `popup.html` before `popup.js`.
**Warning signs:** `TypeError: Cannot read properties of undefined (reading 'getProfile')` in popup DevTools console.

### Pitfall 2: Inline Script / onclick Blocked by CSP

**What goes wrong:** Chrome silently refuses to execute inline `<script>` blocks or `onclick="..."` attributes.
**Why it happens:** `manifest.json` sets `"extension_pages": "script-src 'self'; object-src 'none'"`.
**How to avoid:** All JS in `popup.js`. All event binding via `addEventListener`. Zero `onclick`, `onchange`, `onsubmit` attributes in HTML.
**Warning signs:** No errors thrown — handlers simply never fire.

### Pitfall 3: Popup Closes During Async Operation

**What goes wrong:** User clicks Export, popup closes before `chrome.runtime.sendMessage` callback fires.
**Why it happens:** Chrome closes popup when it loses focus. Background receives the message but popup is gone by response time.
**How to avoid:** Trigger file download inside the `sendMessage` callback, not after. For imports, give immediate UI feedback. Keep popup open during action by showing a loading state.
**Warning signs:** Export sometimes works, sometimes produces no file download.

### Pitfall 4: Resume Not Displayed on Popup Open

**What goes wrong:** Resume was saved previously but filename shows "No file selected" on popup open.
**Why it happens:** Resume loaded from storage asynchronously but display code runs synchronously before promise resolves.
**How to avoid:** Load resume in `DOMContentLoaded` handler: `getResume().then(r => { if (r) showResumeInfo(r); })`.

### Pitfall 5: Answer Bank Entry Missing ID Field

**What goes wrong:** Import merge in `background.js` `mergeAnswerBank()` uses `entry.id` as the dedup key. Entries without `id` all get mapped to `undefined`, so only one survives.
**Why it happens:** Manually created entries skip `crypto.randomUUID()`.
**How to avoid:** Always generate `id: crypto.randomUUID()` when creating a new answer bank entry in the Add modal.

### Pitfall 6: `getBytesInUse` Called with Wrong Argument Type

**What goes wrong:** `storage.getBytesInUse(null)` returns total bytes across ALL keys, not per-key.
**Why it happens:** Chrome's API accepts null for "all keys" — easy to misuse.
**How to avoid:** Always pass the specific string key: `getBytesInUse('profile')` or `getBytesInUse('answerBank')`.

---

## Code Examples

### Download JSON File (Export)

```javascript
// No library needed — pure browser API
function downloadJSON(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
```

### Read Imported JSON File

```javascript
document.getElementById('import-input').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (evt) => {
    let parsed;
    try {
      parsed = JSON.parse(evt.target.result);
    } catch {
      showImportError('Invalid JSON file.');
      return;
    }
    chrome.runtime.sendMessage({ type: 'IMPORT_DATA', payload: parsed }, (response) => {
      if (response.error) { showImportError(response.error); return; }
      showImportSuccess('Import complete.');
      loadProfile();        // re-render profile tab
      loadAnswerBank();     // re-render answer bank tab
    });
  };
  reader.readAsText(file);
});
```

### Simple Debounce

```javascript
function debounce(fn, ms) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}
```

### Pre-Populate Answer Bank on First Install

```javascript
// popup.js — called on DOMContentLoaded
async function maybeLoadDefaultTemplates() {
  const existing = await window.JobFill.storage.getAnswerBank();
  if (existing.length > 0) return; // already has entries — skip
  await window.JobFill.storage.saveAnswerBank(DEFAULT_TEMPLATES);
}
```

---

## Profile Fields Reference (FR-1.1)

All 25+ profile fields the popup Profile tab must render:

| Field ID | Label | Input Type | Notes |
|----------|-------|------------|-------|
| firstName | First Name | text | |
| lastName | Last Name | text | |
| email | Email | email | |
| phone | Phone | tel | |
| linkedinUrl | LinkedIn URL | url | |
| portfolioUrl | Portfolio URL | url | |
| githubUrl | GitHub URL | url | |
| websiteUrl | Website URL | url | |
| currentTitle | Current Title | text | |
| currentCompany | Current Company | text | |
| yearsExperience | Years of Experience | number | |
| city | City | text | |
| country | Country | text | |
| workAuthorization | Work Authorization | select | e.g. UAE Golden Visa, Citizen, Requires Sponsorship |
| noticePeriod | Notice Period | text | e.g. "1 month", "Immediate" |
| salaryExpectation | Salary Expectation | text | e.g. "AED 25,000/month" |
| currency | Currency | select | AED, USD, EUR, GBP |
| remotePreference | Remote Preference | select | Remote, Hybrid, On-site, Any |
| summary | Professional Summary | textarea | |
| coverLetterDefault | Default Cover Letter | textarea | |
| skills | Key Skills | text | comma-separated |
| languages | Languages | text | comma-separated |
| university | University | text | |
| degree | Degree | text | |
| graduationYear | Graduation Year | number | |

Resume is a separate section within the Profile tab, not a text field.

---

## Pre-Populated Answer Bank Templates (Phase 12 Plan 5)

10 marketing-role templates to seed on first install:

| # | Question (approximate) | Category | Variable Used |
|---|----------------------|----------|---------------|
| 1 | Why marketing? / career motivation | motivation | — |
| 2 | CRM experience (Salesforce, HubSpot, Klaviyo) | skills/tools | — |
| 3 | Email marketing metrics / results | skills/results | — |
| 4 | Product launch experience | experience | — |
| 5 | Why {{company_name}}? | motivation/company | `{{company_name}}` |
| 6 | Work authorization / UAE Golden Visa | work_auth | — |
| 7 | Notice period / availability | availability | — |
| 8 | Salary expectations | salary | — |
| 9 | Remote work experience | experience | — |
| 10 | Biggest achievement / impact | experience/impact | — |

Each template needs: `id` (UUID), `question`, `keywords` (array), `category`, `answer`.

---

## Popup Dimensions & CSS Constraints

- **Width:** 360px fixed (standard Chrome extension popup width)
- **Max height:** Chrome clips popup at ~600px — use `overflow-y: auto` on scrollable panels
- **No external CSS frameworks** — Bootstrap, Tailwind, etc. are blocked by CSP
- **No Google Fonts** — external URLs blocked by CSP `script-src 'self'`; use system font stack: `font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`
- **Tab panel switching:** Use CSS `display: none` / `display: block` toggled by `.active` class

---

## Validation Architecture

`nyquist_validation` is enabled in `.planning/config.json`.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | None detected — this project has no automated test suite (ROADMAP: "No automated test suite in Milestone 1") |
| Config file | None |
| Quick run command | Manual: open popup in Chrome, verify each tab |
| Full suite command | Manual UAT per ROADMAP criteria |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| P12-01 | Three-tab layout renders | manual | Open popup in Chrome | N/A |
| P12-02 | Profile fields auto-save on input | manual | Edit a field, close/reopen popup | N/A |
| P12-03 | Resume upload stores `{name,dataUrl,mimeType,size}` | manual | Upload PDF, verify in DevTools storage | N/A |
| P12-04 | Answer bank add/edit/delete works | manual | CRUD all three operations | N/A |
| P12-05 | Export downloads valid JSON | manual | Click Export, open file, verify schema | N/A |
| P12-06 | Import restores data from exported JSON | manual | Import exported file, verify data | N/A |
| P12-07 | Fill button triggers TRIGGER_FILL message | manual | Click Fill, verify message in BG inspector | N/A |
| P12-08 | 10 default templates pre-populated on first install | manual | Clear answerBank, reopen popup | N/A |
| P12-09 | No CSP violations in popup console | manual | Open popup DevTools, check console | N/A |

### Wave 0 Gaps

No test framework to set up — this project deliberately has no automated tests in Milestone 1. All validation is manual UAT.

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|-----------------|--------|
| MV2 inline scripts in popup | MV3 requires `script-src 'self'` — external `.js` file only | All popup JS must live in `popup.js` |
| `background.html` persistent background | MV3 service worker (ephemeral) | Popup cannot rely on background holding state; use `chrome.storage.session` |
| `chrome.extension.getBackgroundPage()` | Removed in MV3 | Use `chrome.runtime.sendMessage` instead |
| Synchronous `chrome.storage` | All async (Promise-based) | All storage calls in popup.js must use `async/await` or `.then()` |

---

## Open Questions

1. **Profile field list completeness**
   - What we know: ROADMAP says "all FR-1.1 fields". The 25 fields above are inferred from ROADMAP + typical job application forms.
   - What's unclear: The REQUIREMENTS.md may have a definitive FR-1.1 list — planner should verify.
   - Recommendation: Read `.planning/REQUIREMENTS.md` FR-1.1 section before writing Profile tab HTML.

2. **Answer bank entry schema canonical definition**
   - What we know: `matcher.js` uses entries but that file is a stub (Phase 5 not complete). Background `mergeAnswerBank` uses `entry.id`.
   - What's unclear: Exact field names for `keywords` (array vs string), whether `category` is a fixed enum.
   - Recommendation: Define the schema explicitly in Phase 12 Plan 1 and use it consistently.

3. **"Fill Form" button in popup**
   - What we know: ROADMAP Phase 12 Plan 8 mentions a Fill Form button; background.js handles `TRIGGER_FILL`.
   - What's unclear: Whether this button should be in all three tabs or only on a specific tab/header.
   - Recommendation: Place it in the popup header bar (always visible, not tab-specific).

---

## Sources

### Primary (HIGH confidence)
- `background.js` (read directly) — message types, export/import schema, merge logic
- `utils/storage.js` (read directly) — all storage functions, resume object shape, quota API
- `manifest.json` (read directly) — CSP policy, popup action config, permissions
- `popup.html` / `popup.js` / `popup.css` (read directly) — confirmed placeholder state
- `.planning/ROADMAP.md` Phase 12 section — authoritative feature requirements

### Secondary (MEDIUM confidence)
- Chrome MV3 CSP documentation — `script-src 'self'` blocks inline scripts and `onclick` attributes (well-established, stable)
- Chrome Extension popup behavior — closes on focus loss (well-known constraint)

### Tertiary (LOW confidence)
- Profile field list (25 fields above) — inferred from ROADMAP description + job application norms; REQUIREMENTS.md may differ

---

## Metadata

**Confidence breakdown:**
- Current file state: HIGH — read directly
- Storage API surface: HIGH — read directly from storage.js
- Background message types: HIGH — read directly from background.js
- CSP constraints: HIGH — read directly from manifest.json
- Profile field list: MEDIUM — inferred from ROADMAP, REQUIREMENTS.md is authoritative
- Architecture patterns: HIGH — standard MV3 popup patterns

**Research date:** 2026-03-15
**Valid until:** 2026-04-15 (stable domain — MV3 popup patterns change rarely)
