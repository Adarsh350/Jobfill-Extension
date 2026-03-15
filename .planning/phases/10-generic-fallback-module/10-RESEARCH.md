# Phase 10: Generic Fallback Module - Research

**Researched:** 2026-03-15
**Domain:** Heuristic form field detection and autofill for unknown ATS platforms
**Confidence:** HIGH

---

## Summary

Phase 10 implements `platforms/generic.js` — the catch-all platform module that activates when no specific platform (Greenhouse, Lever, Workday, Ashby, iCIMS, LinkedIn, Bayt) matches the current hostname. Unlike the seven specific modules which use known DOM selectors, the generic module must infer field identity purely from heuristic scoring of element attributes (`name`, `id`, `placeholder`, `aria-label`, `autocomplete`).

The module follows the identical structural pattern as all other platform modules: an IIFE exposing `{ matches, fill, getJobDetails }` on `window.JobFill.platforms.generic`. The key design difference is that `matches()` always returns `true` (it is last in the platform priority check in `content.js`), and all fills are marked `needs_review` in the overlay because generic detection cannot guarantee accuracy.

The existing `platforms/generic.js` stub was created in Phase 1 scaffold. Phase 10 replaces it with the full implementation. The test infrastructure follows the same Node.js `node:test` runner pattern established across all prior platform test files.

**Primary recommendation:** Implement heuristic scoring with 30+ keyword mappings, mark all results `needs_review`, and follow the exact same IIFE + FIELDS-table + `fillStandardFields` + `fillCustomQuestions` structure as greenhouse.js and lever.js.

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| FR-2.1 | Detect platform by hostname | `matches()` returns `true` as last-resort fallback |
| FR-2.2 | Support 8 targets including generic fallback | generic.js is the 8th entry |
| FR-2.3 | Fill standard fields from profile data | Heuristic FIELDS table with keyword scoring |
| FR-2.4 | Fill dropdowns using fuzzy matching | `window.JobFill.filler.fillField` handles select elements |
| FR-2.5 | Fill checkboxes/radio where value matches | `fillField` dispatcher handles these element types |
| FR-2.6 | Do NOT overwrite fields already containing a value | `hasValue()` guard — same as all other modules |
| FR-2.9 | Platform module exposes matches/fill/getJobDetails | Established IIFE pattern |
| FR-3.4 | Match open-ended questions vs answer bank at >0.75 confidence | `window.JobFill.matcher.findBestAnswer` |
| FR-3.5 | Variable substitution in answers | `window.JobFill.matcher.substituteVariables` |
| FR-3.6 | Extract company/job title via getJobDetails() | Heuristic from title/h1/meta description |
| FR-7.6 | Generic heuristic detection by name/id/placeholder/aria-label | Core of Phase 10 |
</phase_requirements>

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Node.js `node:test` | Built-in (v18+) | Unit test runner | Used by all 8 prior platform test files |
| Node.js `node:assert/strict` | Built-in | Assertions | Used by all prior test files |
| Vanilla JS (ES5-compatible) | — | Implementation | NFR-1.2: no build tools, no npm |

### No External Dependencies
Per NFR-1.2 through NFR-1.4: zero npm packages, zero bundlers, zero network requests. All code is self-contained vanilla JS.

**Test run command:**
```bash
node --test tests/unit/generic.test.js
```

**Full suite:**
```bash
node tests/run-all.js
```

---

## Architecture Patterns

### Established Platform Module Structure
All 7 prior platform modules (greenhouse.js, lever.js, workday.js, ashby.js, icims.js, linkedin.js, bayt.js) follow this exact pattern — generic.js MUST match it:

```javascript
// platforms/generic.js
window.JobFill = window.JobFill || {};
window.JobFill.platforms = window.JobFill.platforms || {};

window.JobFill.platforms.generic = (function () {
  'use strict';

  // FIELDS table — heuristic mappings
  var FIELDS = [ /* ... */ ];

  function matches(hostname) {
    return true; // always matches — last checked by content.js
  }

  function resolveSelector(selectors) { /* ... */ }
  function hasValue(el) { /* ... */ }
  function getAdjacentLabel(el) { /* 4-method extraction: for=, closest label, prev sibling, aria-label/placeholder */ }
  function scoreField(el, keywords) { /* heuristic scoring */ }
  function getJobDetails() { /* title/h1/meta heuristics */ }
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

### Pattern 1: Heuristic Field Scoring
**What:** Each form element is scored against a keyword list. Highest-scoring element above a threshold wins the profile field mapping.
**When to use:** When platform-specific selectors don't exist.

```javascript
// Keyword maps — profile key -> scoring keywords
var KEYWORD_MAP = {
  firstName:    ['first', 'fname', 'given', 'forename'],
  lastName:     ['last', 'lname', 'surname', 'family'],
  email:        ['email', 'e-mail', 'mail'],
  phone:        ['phone', 'tel', 'mobile', 'cell', 'contact'],
  city:         ['city', 'location', 'town', 'locale'],
  country:      ['country', 'nation', 'region'],
  linkedinUrl:  ['linkedin', 'linked-in', 'profile'],
  portfolioUrl: ['portfolio', 'website', 'personal', 'site', 'url'],
  currentTitle: ['title', 'position', 'role', 'job', 'designation'],
  yearsExperience: ['years', 'experience', 'exp'],
  workAuthorization: ['work', 'auth', 'visa', 'permit', 'eligible', 'sponsor'],
  nationality:  ['nationality', 'citizenship', 'citizen'],
  summary:      ['cover', 'letter', 'summary', 'about', 'message', 'motivation'],
};

function scoreField(el, keywords) {
  var score = 0;
  var attrs = [el.name, el.id, el.placeholder,
               el.getAttribute('aria-label') || '',
               el.getAttribute('autocomplete') || ''];
  var text = attrs.join(' ').toLowerCase();
  keywords.forEach(function (kw) {
    if (text.indexOf(kw) !== -1) score += 1;
  });
  // Exact autocomplete attribute match = high confidence
  var ac = (el.getAttribute('autocomplete') || '').toLowerCase();
  if (ac === 'given-name' || ac === 'email' || ac === 'tel') score += 3;
  return score;
}
```

### Pattern 2: Field Discovery Loop
**What:** Iterate all `input`, `select`, `textarea` elements; score each against all profile keys; assign best match above threshold.
**Key constraint:** Each element assigned to at most one profile key. Each profile key assigned to at most one element (first-wins).

```javascript
function discoverFields(profile) {
  var discovered = {}; // profileKey -> element
  var usedEls = new Set();
  var inputs = Array.from(
    document.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="password"]):not([type="file"]), select, textarea')
  );
  Object.keys(KEYWORD_MAP).forEach(function (profileKey) {
    var bestEl = null;
    var bestScore = 0;
    inputs.forEach(function (el) {
      if (usedEls.has(el)) return;
      var s = scoreField(el, KEYWORD_MAP[profileKey]);
      if (s > bestScore) { bestScore = s; bestEl = el; }
    });
    if (bestEl && bestScore >= 1) {
      discovered[profileKey] = bestEl;
      usedEls.add(bestEl);
    }
  });
  return discovered;
}
```

### Pattern 3: All Generic Fills = needs_review
**What:** Every fill result from the generic module uses `needs_review` status, never `filled`.
**Why:** Heuristic detection has no guarantee of correctness. User must verify.

```javascript
results.push({
  field: labelText,
  status: 'needs_review',
  value: value,
  reason: 'generic heuristic — verify field mapping'
});
```

### Pattern 4: getJobDetails() — Multi-Signal Heuristic
```javascript
function getJobDetails() {
  var jobTitle = '';
  var companyName = '';

  // Signal 1: <h1>
  var h1 = document.querySelector('h1');
  if (h1) jobTitle = h1.textContent.trim();

  // Signal 2: <title> split on | – /
  var titleParts = (document.title || '').split(/\s*[|\-–\/]\s*/);
  if (!jobTitle && titleParts[0]) jobTitle = titleParts[0].trim();
  if (!companyName && titleParts[1]) companyName = titleParts[1].trim();

  // Signal 3: <meta name="description">
  var meta = document.querySelector('meta[name="description"]');
  if (meta && !companyName) {
    var desc = meta.getAttribute('content') || '';
    // "Apply to [Company]" pattern
    var m = desc.match(/at\s+([A-Z][a-zA-Z\s]+)/);
    if (m) companyName = m[1].trim();
  }

  return { companyName: companyName, jobTitle: jobTitle };
}
```

### Anti-Patterns to Avoid
- **Label-text-only detection:** RTL-safety requires checking attributes, not just visible labels (consistent with FR-7.5 Bayt pattern)
- **Greedy el selection:** Never assign the same element to two profile keys
- **Filling hidden/password/submit/CAPTCHA inputs:** Always exclude via selector or type check
- **Marking generic fills as `filled`:** All must be `needs_review` — this is a hard requirement from ROADMAP
- **Skipping the handledEls Set:** Every discovered element must be added to prevent double-processing in fillCustomQuestions

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| React-compatible value setting | Custom setter logic | `window.JobFill.filler.fillField()` | Already handles native prototype setter + event dispatch |
| Fuzzy answer matching | Custom string distance | `window.JobFill.matcher.findBestAnswer()` | Phase 5 — Levenshtein + keyword scoring already implemented |
| Variable substitution | String replace loops | `window.JobFill.matcher.substituteVariables()` | Phase 5 — handles `{{var}}` pattern |
| Shadow DOM traversal | Recursive walk | `window.JobFill.filler.shadowQuery()` | Phase 4 — already implemented |
| Fill locking | Boolean flags | `window.JobFill.filler.isFilling/startFill/endFill` | Phase 4 — race condition prevention |
| Label extraction | Ad-hoc DOM walk | 4-method pattern from greenhouse.js | Proven: for=, closest label, prev sibling, aria-label |

---

## Common Pitfalls

### Pitfall 1: CAPTCHA and Password Field Pollution
**What goes wrong:** Heuristic discovery picks up password fields or CAPTCHA inputs, filling them incorrectly and causing form errors.
**Why it happens:** Generic selector sweeps all `input` elements without type filtering.
**How to avoid:** Explicitly exclude via selector: `input:not([type="hidden"]):not([type="submit"]):not([type="password"]):not([type="file"])`. Also check for CAPTCHA by `name`/`id` containing `captcha`, `recaptcha`, `g-recaptcha`.
**Warning signs:** Fill result shows a password field filled, or CAPTCHA field modified.

### Pitfall 2: Multi-Key Element Contention
**What goes wrong:** Both `firstName` and `lastName` keyword lists partially match a `fullName` input, leading to one of them winning incorrectly.
**Why it happens:** Greedy per-key scoring without conflict resolution.
**How to avoid:** Build a `fullName` keyword entry in KEYWORD_MAP. If `fullName` wins with higher score than separate first/last, use `profile.firstName + ' ' + profile.lastName` as value. Add `usedEls` Set — once an element is assigned, it cannot be reassigned.
**Warning signs:** First name field filled with full name, or last name field left blank.

### Pitfall 3: matches() Priority Violation
**What goes wrong:** If `generic.matches()` is checked before specific platforms in content.js, it shadows them all.
**Why it happens:** `matches()` always returns `true`.
**How to avoid:** content.js (Phase 6) already iterates platforms in registration order. Generic MUST be loaded last in manifest.json `content_scripts` array, and content.js must check specific platforms first. Verify manifest ordering.
**Warning signs:** Greenhouse form gets `needs_review` results instead of `filled`.

### Pitfall 4: Score Threshold Too Low
**What goes wrong:** Setting minimum score of 0 causes random unrelated fields (e.g., newsletter checkbox, search bars) to get filled.
**Why it happens:** Any element with any attribute partially matching a keyword gets included.
**How to avoid:** Minimum score threshold of 1 (at least one full keyword match required). Test against a form with irrelevant fields.

### Pitfall 5: `getJobDetails()` h1 Returns Navigation Text
**What goes wrong:** `document.querySelector('h1')` on some pages returns a nav logo or site header, not the job title.
**Why it happens:** Some sites use `<h1>` for brand name, not content.
**How to avoid:** Prefer `document.title` parse as primary signal. Use h1 as confirmation only if it matches title-parsed job title semantically.

---

## Code Examples

### Test File Structure (established pattern from lever.test.js)
```javascript
// tests/unit/generic.test.js
'use strict';
const { test, describe, before } = require('node:test');
const assert = require('node:assert/strict');

// DOM shim + window.JobFill.filler + window.JobFill.matcher stubs
// [same MockNode infrastructure as lever.test.js]

// Load module under test
require('../../platforms/generic.js');
const mod = global.window.JobFill.platforms.generic;

describe('generic.matches()', function () {
  test('returns true for any hostname', function () {
    assert.strictEqual(mod.matches('example.com'), true);
    assert.strictEqual(mod.matches('unknownats.io'), true);
    assert.strictEqual(mod.matches(''), true);
  });
});

describe('generic.getJobDetails()', function () {
  // ... tests for title/h1/meta parsing
});

describe('generic.fill() — standard fields', function () {
  // ... tests for heuristic discovery + needs_review status
});

describe('generic.fill() — exclusions', function () {
  // ... tests for hidden/password/submit/CAPTCHA exclusion
});
```

### Explicit Exclusion List
```javascript
// Elements to always skip
var EXCLUDED_TYPES = ['hidden', 'submit', 'button', 'reset', 'image', 'password', 'file', 'checkbox', 'radio'];
var CAPTCHA_PATTERNS = /captcha|recaptcha|g-recaptcha|hcaptcha/i;

function shouldSkip(el) {
  if (EXCLUDED_TYPES.indexOf((el.type || '').toLowerCase()) !== -1) return true;
  var combined = (el.name || '') + (el.id || '');
  if (CAPTCHA_PATTERNS.test(combined)) return true;
  return false;
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Label-text scraping | Attribute-based scoring (name/id/placeholder/aria-label) | RTL-safety requirement (FR-7.5) | Works on Arabic/RTL pages |
| Mark generic fills as `filled` | Always `needs_review` | ROADMAP Phase 10 spec | User must confirm — correct for heuristic fills |
| Single-selector fallback | Score-ranked multi-attribute heuristic | Phase 10 design | Higher hit rate on unknown forms |

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Node.js `node:test` (built-in, no install) |
| Config file | none — direct node invocation |
| Quick run command | `node --test tests/unit/generic.test.js` |
| Full suite command | `node tests/run-all.js` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| FR-2.1 | matches() returns true for all hostnames | unit | `node --test tests/unit/generic.test.js` | Wave 0 |
| FR-2.3 | Standard fields filled from profile via heuristic | unit | `node --test tests/unit/generic.test.js` | Wave 0 |
| FR-2.6 | Already-filled fields skipped | unit | `node --test tests/unit/generic.test.js` | Wave 0 |
| FR-2.9 | Module exposes matches/fill/getJobDetails | unit | `node --test tests/unit/generic.test.js` | Wave 0 |
| FR-3.4 | Answer bank matched at >0.75 confidence | unit | `node --test tests/unit/generic.test.js` | Wave 0 |
| FR-7.6 | Heuristic detection by name/id/placeholder/aria-label | unit | `node --test tests/unit/generic.test.js` | Wave 0 |
| FR-4.1 | All generic fills marked needs_review | unit | `node --test tests/unit/generic.test.js` | Wave 0 |

### Sampling Rate
- **Per task commit:** `node --test tests/unit/generic.test.js`
- **Per wave merge:** `node tests/run-all.js`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/unit/generic.test.js` — covers all requirements above (does not yet exist)

---

## Sources

### Primary (HIGH confidence)
- `platforms/greenhouse.js` — Established IIFE structure, FIELDS table, fillStandardFields, fillCustomQuestions, hasValue, getAdjacentLabel patterns
- `platforms/lever.js` — Confirmed same structure; custom question handling with confidence threshold
- `tests/unit/lever.test.js` — Confirmed Node.js node:test runner pattern, MockNode DOM shim
- `.planning/ROADMAP.md Phase 10` — Definitive spec: heuristic scoring, 30+ keyword mappings, needs_review for all fills
- `.planning/REQUIREMENTS.md` — FR-2.1, FR-2.2, FR-2.3, FR-2.6, FR-2.9, FR-3.4, FR-7.6 confirmed
- `.planning/config.json` — nyquist_validation: true, commit_docs: true

### Secondary (MEDIUM confidence)
- Prior platform test files (greenhouse.test.js, lever.test.js) — consistent MockNode pattern confirmed across multiple files

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — Node.js node:test confirmed across all 8 existing test files; no package.json (no external deps by design)
- Architecture: HIGH — IIFE pattern, FIELDS table, two-pass fill (standard + custom questions) confirmed from reading greenhouse.js and lever.js source
- Pitfalls: HIGH — CAPTCHA exclusion, priority ordering, and needs_review policy are derived directly from ROADMAP spec and existing code patterns
- Test infrastructure: HIGH — node:test runner, MockNode DOM shim, require() module loading pattern all confirmed

**Research date:** 2026-03-15
**Valid until:** 2026-06-15 (stable — all dependencies are internal to this project)
