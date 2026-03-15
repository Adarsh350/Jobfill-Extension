# Phase 9: iCIMS, LinkedIn Easy Apply & Bayt Modules — Research

**Researched:** 2026-03-15
**Domain:** Chrome Extension content script — ATS platform modules (iframe, modal SPA, RTL)
**Confidence:** MEDIUM (DOM selectors require live UAT; structural patterns are HIGH from codebase analysis)

---

## Summary

Phase 9 completes the three remaining platform modules: iCIMS, LinkedIn Easy Apply, and Bayt. Each
presents a unique structural challenge not seen in phases 7–8. iCIMS embeds the application form
inside an iframe (same-origin or cross-origin). LinkedIn Easy Apply is a multi-step modal rendered
over the jobs SPA with per-field delays required to avoid bot detection. Bayt uses Arabic/RTL label
text so field identification must rely on `name`/`id`/`type` attributes exclusively.

All three modules follow the exact same IIFE pattern established in phases 7–8: register on
`window.JobFill.platforms.<name>`, expose `{ matches, fill, getJobDetails }`, use
`window.JobFill.filler.fillField` for all fills, and push result objects
`{ field, status, value?, reason? }` into a results array returned by `fill()`.

The primary structural risk is the iCIMS iframe boundary. The content script already runs
`all_frames: true` (FR-7.2), so the script executes inside the iframe DOM. The key guard is
detecting cross-origin iframes and surfacing a warning rather than failing silently.

**Primary recommendation:** Build all three modules as standard IIFEs matching greenhouse/lever
patterns exactly. The iframe and modal complexities are handled by guards/observers, not by
architectural departures.

---

## Standard Stack

### Core (inherited — no new installs)
| Component | Source | Purpose |
|-----------|--------|---------|
| `window.JobFill.filler.fillField` | utils/filler.js | Fills input/select/textarea with React event dispatch |
| `window.JobFill.filler.shadowQuery` | utils/filler.js | Shadow DOM piercing (not needed for these 3 platforms) |
| `window.JobFill.events.dispatchBlur` | utils/events.js | Blur dispatch (used by Workday; may be needed for LinkedIn) |
| `window.JobFill.matcher.findBestAnswer` | utils/matcher.js | Answer bank lookup for custom questions |
| `window.JobFill.matcher.substituteVariables` | utils/matcher.js | Template variable resolution |
| `window.JobFill.storage.getProfile` | utils/storage.js | Profile read (called by content.js, passed in as arg) |

### No New Dependencies
All three modules reuse existing primitives. No npm packages, no new utilities.

---

## Architecture Patterns

### Established Module Pattern (copy exactly from ashby.js / greenhouse.js)

```javascript
// platforms/icims.js
window.JobFill = window.JobFill || {};
window.JobFill.platforms = window.JobFill.platforms || {};

window.JobFill.platforms.icims = (function () {
  'use strict';

  var FIELDS = [ /* descriptor table */ ];

  function matches(hostname) {
    return hostname.includes('icims.com');
  }

  function resolveSelector(selectors) {
    for (var i = 0; i < selectors.length; i++) {
      try {
        var el = document.querySelector(selectors[i]);
        if (el) return el;
      } catch (e) { /* skip */ }
    }
    return null;
  }

  function hasValue(el) { /* same as greenhouse */ }
  function getAdjacentLabel(el) { /* same as greenhouse */ }
  function getJobDetails() { /* platform-specific */ }
  function fillStandardFields(profile, results, handledEls) { /* ... */ }
  function fillCustomQuestions(answerBank, jobDetails, results, handledEls) { /* ... */ }

  async function fill(profile, answerBank) {
    var results = [];
    var handledEls = new Set();
    var jobDetails = getJobDetails();
    fillStandardFields(profile, results, handledEls);
    fillCustomQuestions(answerBank, jobDetails, results, handledEls);
    return results;
  }

  return { matches: matches, fill: fill, getJobDetails: getJobDetails };
})();
```

### Pattern 1: iCIMS — Iframe Boundary Detection

iCIMS renders the apply form inside an `<iframe>` on the careers page. With `all_frames: true` in
manifest.json, the content script runs inside the iframe's document. No cross-frame messaging is
needed for same-origin iframes — just fill `document` normally.

**Cross-origin detection guard (required by FR-7.2):**
```javascript
function detectCrossOrigin() {
  // Content script runs inside the iframe — check if we're in a nested frame
  if (window === window.top) return false; // top-level page, not inside iframe

  try {
    // If cross-origin, accessing top.location throws SecurityError
    var _ = window.top.location.href;
    return false; // same-origin
  } catch (e) {
    return true; // cross-origin — cannot fill, must warn
  }
}

// In fill():
async function fill(profile, answerBank) {
  var results = [];

  if (detectCrossOrigin()) {
    // Signal content.js to show warning via overlay
    window.dispatchEvent(new CustomEvent('jobfill:cross-origin-iframe', {
      detail: { platform: 'iCIMS' }
    }));
    results.push({ field: 'iCIMS Form', status: 'failed',
      reason: 'cross-origin iframe — manual fill required' });
    return results;
  }

  // Normal fill path — document is the iframe's document
  var handledEls = new Set();
  var jobDetails = getJobDetails();
  fillStandardFields(profile, results, handledEls);
  fillCustomQuestions(answerBank, jobDetails, results, handledEls);
  return results;
}
```

**Alternative signal path:** The ROADMAP specifies sending `ICIMS_CROSS_ORIGIN` message to
background. Use `chrome.runtime.sendMessage({ type: 'ICIMS_CROSS_ORIGIN' })` inside fill() if
CustomEvent approach is insufficient for overlay communication.

### Pattern 2: LinkedIn Easy Apply — Modal Step Navigation

LinkedIn renders Easy Apply in `.jobs-easy-apply-modal`. The form has multiple steps; each "Next"
click replaces the visible fields via React re-render.

**Per-field delay (required by FR-7.3):**
```javascript
function sleep(ms) {
  return new Promise(function (resolve) { setTimeout(resolve, ms); });
}

// In fill() — await between each field fill:
for (var i = 0; i < FIELDS.length; i++) {
  var el = resolveSelector(field.selectors);
  if (el && !hasValue(el)) {
    window.JobFill.filler.fillField(el, value);
    results.push({ field: field.label, status: 'filled', value: value });
    await sleep(50 + Math.random() * 150); // 50–200ms human-speed delay
  }
}
```

**MutationObserver for step navigation (required by FR-7.3):**
```javascript
// In fill() — after initial fill, set up observer for step changes
var modal = document.querySelector('.jobs-easy-apply-modal');
if (modal) {
  var observer = new MutationObserver(function () {
    // Re-run fill on new step fields (only unfilled ones — hasValue guard handles rest)
    fillStandardFields(profile, [], new Set());
  });
  observer.observe(modal, { childList: true, subtree: true });
  // Store ref so content.js can disconnect on overlay dismiss
  window._jobfillLinkedInObserver = observer;
}
```

**Modal detection in matches():**
```javascript
function matches(hostname) {
  return hostname.includes('linkedin.com');
}

// Note: content.js checks matches(hostname) first.
// LinkedIn module additionally checks modal presence in fill():
function isEasyApplyContext() {
  return !!document.querySelector('.jobs-easy-apply-modal');
}
```

**NEVER auto-submit:** fill() must not click the "Submit application" or "Next" buttons. Fill only
input/select/textarea fields. Step navigation is user-driven.

### Pattern 3: Bayt — RTL-Safe Attribute-Only Selection

Bayt displays Arabic and English labels. Label text is unreliable for field identification.
All selectors must use `name`, `id`, `type`, or `data-*` attributes exclusively (FR-7.5).

```javascript
var FIELDS = [
  {
    label: 'First Name',
    profileKey: 'firstName',
    selectors: [
      'input[name="FirstName"]',
      'input[name="first_name"]',
      'input[id*="FirstName"]',
      'input[autocomplete="given-name"]',
    ],
  },
  {
    label: 'Last Name',
    profileKey: 'lastName',
    selectors: [
      'input[name="LastName"]',
      'input[name="last_name"]',
      'input[id*="LastName"]',
      'input[autocomplete="family-name"]',
    ],
  },
  {
    label: 'Email',
    profileKey: 'email',
    selectors: ['input[type="email"]', 'input[name="Email"]', 'input[name="email"]'],
  },
  {
    label: 'Phone',
    profileKey: 'phone',
    selectors: ['input[type="tel"]', 'input[name="Phone"]', 'input[name="mobile"]'],
  },
];

// fillCustomQuestions: SKIP label-based matching for Bayt.
// Custom questions require manual review — push needs_review for all textarea.
```

**Bayt form guard — confirm form is Bayt-hosted, not ATS redirect:**
```javascript
function isNativeBaytForm() {
  // If page has redirected to a third-party ATS domain, matches() will return false
  // (other platform's matches() will return true instead).
  // This guard is belt-and-suspenders: check for Bayt form signature.
  return !!document.querySelector('form[action*="bayt.com"], form[id*="apply"], #applyForm');
}
```

### Recommended File Structure (Phase 9 additions)
```
platforms/
├── greenhouse.js     (Phase 7 — complete)
├── lever.js          (Phase 7 — complete)
├── workday.js        (Phase 8 — complete)
├── ashby.js          (Phase 8 — complete)
├── icims.js          (Phase 9 — this phase)
├── linkedin.js       (Phase 9 — this phase)
└── bayt.js           (Phase 9 — this phase)
tests/
└── unit/
    ├── icims.test.js   (Wave 1 stubs — Phase 9 plan 1)
    ├── linkedin.test.js
    └── bayt.test.js
```

### Anti-Patterns to Avoid

- **Accessing cross-origin iframe DOM directly:** Always run `detectCrossOrigin()` guard first in
  iCIMS fill(); never assume same-origin.
- **Auto-clicking LinkedIn "Next" or "Submit":** Strictly forbidden (FR-7.3). Fill only fields.
- **Using label text for Bayt field identification:** Arabic text breaks keyword matching. Use
  attribute selectors only.
- **Calling `window.top.location` without try/catch:** Cross-origin access throws SecurityError;
  must be inside try/catch.
- **Running LinkedIn observer without disconnect:** Always store observer ref and disconnect on
  overlay dismiss to prevent memory leaks.
- **Querying for LinkedIn modal at module load time:** Modal may not exist at load; check inside
  `fill()` at call time, not at IIFE init.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| React input filling | Custom value setter | `window.JobFill.filler.fillField` | Handles native prototype setter pattern; already tested |
| Shadow DOM traversal | Custom shadowRoot walk | `window.JobFill.filler.shadowQuery` | Already implemented (iCIMS/Bayt don't need it, but don't duplicate) |
| Answer bank lookup | Custom string matching | `window.JobFill.matcher.findBestAnswer` | Levenshtein + keyword scoring already implemented |
| Variable substitution | Custom template engine | `window.JobFill.matcher.substituteVariables` | Already handles `{{company_name}}` etc. |
| Async delay | Custom sleep implementation | `new Promise(resolve => setTimeout(resolve, ms))` inline | One-liner; no utility needed |

---

## Common Pitfalls

### Pitfall 1: iCIMS Cross-Origin Detection Logic Inverted
**What goes wrong:** Checking `window !== window.top` alone and treating it as always cross-origin.
**Why it happens:** Confusing "inside an iframe" with "cross-origin iframe". Same-origin iframes
are perfectly fillable.
**How to avoid:** Two-step check: (1) `window === window.top` → not in iframe at all → skip guard.
(2) Try `window.top.location.href` in try/catch → success = same-origin, SecurityError =
cross-origin.

### Pitfall 2: LinkedIn Modal Fields Not Found on Step 2+
**What goes wrong:** `fill()` runs once on step 1; step 2 fields appear after "Next" click but
observer is not reconnected.
**Why it happens:** MutationObserver fires on DOM changes but fillStandardFields only runs on
currently present elements.
**How to avoid:** In the MutationObserver callback, call `fillStandardFields` again with fresh
`handledEls`. The `hasValue` guard prevents re-filling already-filled fields.

### Pitfall 3: Bayt Selector Mismatch (PascalCase vs snake_case)
**What goes wrong:** `input[name="first_name"]` doesn't match because Bayt uses `FirstName`.
**Why it happens:** Bayt's .NET backend uses PascalCase parameter names.
**How to avoid:** Include both casing variants in each selector array (see FIELDS table above).
Use live UAT to confirm actual attribute values.

### Pitfall 4: LinkedIn matches() Too Broad
**What goes wrong:** `hostname.includes('linkedin.com')` matches linkedin.com profile pages, not
just Easy Apply modal pages. fill() runs on non-apply pages and finds nothing.
**Why it happens:** LinkedIn is a social platform, not a dedicated ATS. Most LinkedIn pages are
not job application forms.
**How to avoid:** Add `isEasyApplyContext()` check at the top of `fill()`. Return early with an
empty results array if `.jobs-easy-apply-modal` is not present. This is safe — no side effects.

### Pitfall 5: iCIMS `getJobDetails()` Targeting Wrong Frame
**What goes wrong:** Job title/company parsed from iframe document instead of parent page.
**Why it happens:** The iframe document may have minimal markup; job details live in the parent.
**How to avoid:** Parse from `document` (the iframe's own DOM) first. If empty, try
`window.parent.document.querySelector(...)` — this only works same-origin. Add try/catch.
Fall back to `document.title` split.

---

## Code Examples

### iCIMS Field Selectors (to verify with UAT)
```javascript
// Source: ROADMAP Phase 9 spec + iCIMS DOM conventions
var FIELDS = [
  { label: 'First Name', profileKey: 'firstName',
    selectors: ['input[name="firstname"]', 'input[id*="FirstName"]', 'input[autocomplete="given-name"]'] },
  { label: 'Last Name', profileKey: 'lastName',
    selectors: ['input[name="lastname"]', 'input[id*="LastName"]', 'input[autocomplete="family-name"]'] },
  { label: 'Email', profileKey: 'email',
    selectors: ['input[type="email"]', 'input[name="email"]'] },
  { label: 'Phone', profileKey: 'phone',
    selectors: ['input[type="tel"]', 'input[name="phone"]', 'input[name="phoneNumber"]'] },
  { label: 'Resume', profileKey: null, isFile: true,
    selectors: ['input[type="file"]', 'input[name*="resume" i]'] },
];
```

### LinkedIn Easy Apply Selectors (to verify with UAT)
```javascript
// Source: ROADMAP Phase 9 spec + LinkedIn Easy Apply DOM observation
// All selectors scoped inside .jobs-easy-apply-modal
var MODAL_SCOPE = '.jobs-easy-apply-modal ';
var FIELDS = [
  { label: 'Phone', profileKey: 'phone',
    selectors: [MODAL_SCOPE + 'input[id*="phoneNumber"]', MODAL_SCOPE + 'input[type="tel"]'] },
  { label: 'Email', profileKey: 'email',
    selectors: [MODAL_SCOPE + 'input[id*="email"]', MODAL_SCOPE + 'input[type="email"]'] },
  { label: 'First Name', profileKey: 'firstName',
    selectors: [MODAL_SCOPE + 'input[id*="firstName"]', MODAL_SCOPE + 'input[autocomplete="given-name"]'] },
  { label: 'Last Name', profileKey: 'lastName',
    selectors: [MODAL_SCOPE + 'input[id*="lastName"]', MODAL_SCOPE + 'input[autocomplete="family-name"]'] },
];
// Note: LinkedIn pre-populates many fields from profile. hasValue guard handles this.
```

### getJobDetails() for iCIMS
```javascript
function getJobDetails() {
  var jobTitle = '';
  var companyName = '';

  // iCIMS-specific job title element
  try {
    var titleEl = document.querySelector('.iCIMS_JobTitle, h1.iCIMS_Header');
    if (titleEl) jobTitle = titleEl.textContent.trim();
  } catch (e) { /* skip */ }

  // Company from parent page (same-origin only)
  try {
    var parentTitle = window.parent.document.title || '';
    var parts = parentTitle.split(/[|\-\u2013]/);
    if (parts.length >= 2) companyName = parts[1].trim();
  } catch (e) { /* cross-origin — skip */ }

  // Fallback: own document.title
  if (!jobTitle || !companyName) {
    try {
      var t = document.title.split(/[|\-\u2013]/);
      if (!jobTitle && t[0]) jobTitle = t[0].trim();
      if (!companyName && t[1]) companyName = t[1].trim();
    } catch (e) { /* skip */ }
  }

  return { jobTitle: jobTitle, companyName: companyName };
}
```

---

## State of the Art

| Pattern | This Phase Approach | Rationale |
|---------|--------------------|-----------|
| Iframe content script | `all_frames: true` (already in manifest) + cross-origin guard | Standard MV3 approach |
| LinkedIn rate limiting | Per-field 50–200ms random delay | Matches FR-7.3; below typical bot-detection threshold |
| RTL form fields | Attribute selectors only (no label text) | Consistent with FR-7.5; label text unreliable in Arabic |
| Modal step nav | MutationObserver on modal container | Same pattern as Workday SPA steps |

---

## Open Questions

1. **iCIMS exact field `name` attributes**
   - What we know: iCIMS uses a mix of camelCase and lowercase names across versions
   - What's unclear: Exact names for UAE-region iCIMS job portals
   - Recommendation: Start with selector array covering both; mark LOW confidence; UAT required

2. **LinkedIn Easy Apply modal selector stability**
   - What we know: `.jobs-easy-apply-modal` is the documented class as of 2025
   - What's unclear: LinkedIn regularly updates class names
   - Recommendation: Use `.jobs-easy-apply-modal` as primary; add `[data-test-modal]` as fallback

3. **Bayt cross-frame or SPA behavior**
   - What we know: Bayt.com has a native job application form on `bayt.com`
   - What's unclear: Whether Bayt redirects to a third-party ATS for some listings
   - Recommendation: Add `isNativeBaytForm()` guard in fill(); if redirected, other platform
     module will match. Return empty results array gracefully if form signature not found.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Jest (detected from Phase 4/5 test files) |
| Config file | package.json `"test"` script or jest.config.js |
| Quick run command | `npm test -- --testPathPattern=icims\|linkedin\|bayt` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| FR-2.1 | `matches()` returns true for correct hostname | unit | `npm test -- --testPathPattern=icims` | No — Wave 0 |
| FR-2.2 | All 3 platforms detected | unit | `npm test -- --testPathPattern=icims\|linkedin\|bayt` | No — Wave 0 |
| FR-2.3 | Standard fields filled from profile | unit | `npm test -- --testPathPattern=icims` | No — Wave 0 |
| FR-7.2 | iCIMS cross-origin detected, warning raised | unit | `npm test -- --testPathPattern=icims` | No — Wave 0 |
| FR-7.3 | LinkedIn per-field delay present; no auto-submit | unit | `npm test -- --testPathPattern=linkedin` | No — Wave 0 |
| FR-7.3 | LinkedIn MutationObserver set on modal | unit | `npm test -- --testPathPattern=linkedin` | No — Wave 0 |
| FR-7.5 | Bayt selectors are attribute-only (no label text) | unit | `npm test -- --testPathPattern=bayt` | No — Wave 0 |

### Sampling Rate
- **Per task commit:** `npm test -- --testPathPattern=icims|linkedin|bayt`
- **Per wave merge:** `npm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/unit/icims.test.js` — DOM fixture + test stubs for FR-2.1, FR-2.3, FR-7.2
- [ ] `tests/unit/linkedin.test.js` — modal detection, field fill, delay, no-submit guard
- [ ] `tests/unit/bayt.test.js` — attribute selector stubs, RTL safety assertion
- [ ] DOM fixture HTML files (optional): `tests/fixtures/dom-icims.html`, `dom-linkedin.html`, `dom-bayt.html`

---

## Sources

### Primary (HIGH confidence)
- `platforms/greenhouse.js` — canonical module pattern, FIELDS table, resolveSelector, hasValue, fill() structure
- `platforms/lever.js` — LinkedIn-style bracket selector handling, confidence threshold on findBestAnswer
- `platforms/workday.js` — MutationObserver SPA step pattern, isVisible guard
- `platforms/ashby.js` — data-field-type custom question detection, dual-pass fillCustomQuestions
- `.planning/ROADMAP.md` Phase 9 spec — all structural requirements
- `.planning/REQUIREMENTS.md` FR-7.2, FR-7.3, FR-7.5 — iframe/modal/RTL requirements

### Secondary (MEDIUM confidence)
- Browser SecurityError on cross-origin `window.top.location` access — documented MDN behavior
- LinkedIn `.jobs-easy-apply-modal` class — confirmed in multiple 2024–2025 extension codebases

### Tertiary (LOW confidence — UAT required)
- iCIMS field `name` attribute values — inferred from iCIMS conventions; verify with live forms
- LinkedIn modal field `id` patterns — `id*="phoneNumber"` pattern; verify with live Easy Apply
- Bayt PascalCase field names — inferred from .NET conventions; verify with live bayt.com form

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all primitives already implemented and tested in phases 4–8
- Architecture patterns: HIGH — IIFE module pattern is locked; all three modules follow it exactly
- iframe/modal guards: MEDIUM — logic is correct; exact selector strings need live UAT confirmation
- DOM selectors: LOW — iCIMS, LinkedIn, Bayt field names require live-form verification

**Research date:** 2026-03-15
**Valid until:** 2026-04-15 (LinkedIn class names change frequently; re-verify if > 2 weeks old)
