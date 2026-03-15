# Phase 8: Workday & Ashby Platform Modules — Research

**Researched:** 2026-03-15
**Domain:** ATS platform DOM integration — Shadow DOM (Workday), React SPA (Ashby)
**Confidence:** MEDIUM (Workday DOM is version-sensitive; verified against ROADMAP/REQUIREMENTS; live DOM structure requires UAT)

---

## Summary

Phase 8 implements two platform modules: `platforms/workday.js` and `platforms/ashby.js`. These follow the exact same module pattern established in Phase 7 (greenhouse.js, lever.js): an IIFE that registers on `window.JobFill.platforms`, exposing `matches()`, `fill()`, and `getJobDetails()`.

Workday is the most technically complex ATS in the project. Its forms are built with Shadow DOM components, meaning standard `document.querySelector` cannot find fields — the extension must use the already-built `window.JobFill.filler.shadowQuery()` and `shadowQueryAll()` primitives. Workday is also a multi-step SPA; each step reveals new form sections, so the module must fill only what is currently visible and rely on MutationObserver (managed by `content.js`) to re-trigger on step navigation. After each fill, Workday requires a `blur` event dispatch for its onBlur validation to accept values.

Ashby is comparatively simpler: standard React fields using the same `fillInput` native-setter pattern as Greenhouse/Lever. Custom questions use `[data-field-type]` attribute selectors rather than `data-qa`. `getJobDetails()` parses company from `<title>` and job title from `<h1>`.

**Primary recommendation:** Build both modules as strict copies of the Phase 7 pattern. The only novel engineering is Workday's `shadowQuery`-based field resolution and its `blur` dispatch requirement — both are already supported by existing primitives.

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| FR-2.1 | Detect ATS by hostname | `matches()` — `hostname.includes('myworkdayjobs.com')` / `hostname.includes('ashbyhq.com')` |
| FR-2.2 | Support Workday and Ashby | Both modules implemented in this phase |
| FR-2.3 | Fill standard fields from profile | FIELDS table + `fillStandardFields()` in both modules |
| FR-2.4 | Fuzzy dropdown matching | `window.JobFill.matcher.matchDropdownOption()` — already implemented |
| FR-2.6 | Do not overwrite existing values | `hasValue(el)` guard identical to Phase 7 pattern |
| FR-2.8 | React-compatible event dispatch | `window.JobFill.filler.fillField()` → `window.JobFill.events.fillInput()` — already covers this |
| FR-2.9 | Each module exposes matches/fill/getJobDetails | IIFE return pattern from Phase 7 |
| FR-7.1 | Workday: Shadow DOM traversal, MutationObserver, blur dispatch | `shadowQuery`/`shadowQueryAll` from filler.js; blur via `events.dispatchBlur()`; step nav handled by content.js MutationObserver |
| NFR-5.4 | Primary + fallback selector chain per field | FIELDS table entries include 2–3 selectors each |
</phase_requirements>

---

## Standard Stack

### Core (already available — no new dependencies)
| Primitive | Source | Purpose |
|-----------|--------|---------|
| `window.JobFill.filler.shadowQuery(root, sel)` | `utils/filler.js` | Recursive shadow DOM query — returns first match |
| `window.JobFill.filler.shadowQueryAll(root, sel)` | `utils/filler.js` | Recursive shadow DOM query — returns all matches |
| `window.JobFill.filler.fillField(el, value)` | `utils/filler.js` | Dispatches to correct fill function by element type |
| `window.JobFill.events.dispatchBlur(el)` | `utils/events.js` | Triggers blur event — needed for Workday onBlur validation |
| `window.JobFill.matcher.findBestAnswer()` | `utils/matcher.js` | Answer bank lookup with confidence threshold |
| `window.JobFill.matcher.substituteVariables()` | `utils/matcher.js` | Variable substitution in answer text |

### No New Libraries Needed
Per NFR-1.2 and NFR-1.4 (vanilla JS, zero external dependencies), this phase adds zero new dependencies.

---

## Architecture Patterns

### Module Registration Pattern (identical to Phase 7)
```javascript
// Source: platforms/greenhouse.js, platforms/lever.js (Phase 7)
window.JobFill = window.JobFill || {};
window.JobFill.platforms = window.JobFill.platforms || {};

window.JobFill.platforms.workday = (function () {
  'use strict';
  // ... FIELDS, matches, fill, getJobDetails ...
  return { matches: matches, fill: fill, getJobDetails: getJobDetails };
})();
```

### Workday: Shadow DOM Field Resolution
Standard `document.querySelector` returns null for Workday fields. Must use `shadowQuery`:

```javascript
// Workday input fields live inside shadow roots
// Use filler.shadowQuery() instead of document.querySelector()
function resolveField(selector) {
  return window.JobFill.filler.shadowQuery(document.body, selector);
}
```

### Workday: Blur Dispatch After Fill
Workday's framework validates on `blur`, not `input`/`change`. After filling each field:

```javascript
// Source: FR-7.1 requirement
var ok = window.JobFill.filler.fillField(el, value);
if (ok) {
  window.JobFill.events.dispatchBlur(el);
}
```

### Workday: SPA Step Visibility Guard
Workday is multi-step. Fill only visible/current-step fields:

```javascript
function isVisible(el) {
  return !!(el.offsetParent !== null &&
            el.getBoundingClientRect().width > 0 &&
            el.getBoundingClientRect().height > 0);
}
// In fillStandardFields: skip elements where !isVisible(el)
```

Step navigation re-trigger is handled by `content.js` MutationObserver (already implemented in Phase 6). The module does NOT need to observe steps itself — it only fills what is currently visible. `content.js` will call `fill()` again when the DOM changes.

### Workday: hasNewFormStep() Signal
Per ROADMAP Phase 8 item 3, the module exposes `hasNewFormStep()` for optional use by content.js:

```javascript
function hasNewFormStep() {
  // Detect step change by checking for new section heading
  var heading = window.JobFill.filler.shadowQuery(
    document.body,
    '[data-automation-id="formSectionTitle"]'
  );
  return !!heading;
}
```

### Workday: Known data-automation-id Selectors
Workday uses `data-automation-id` for stable field identification (more reliable than name/id):

| Field | Primary Selector | Fallback |
|-------|-----------------|---------|
| First Name | `[data-automation-id="legalNameSection_firstName"]` | `input[data-automation-id*="firstName"]` |
| Last Name | `[data-automation-id="legalNameSection_lastName"]` | `input[data-automation-id*="lastName"]` |
| Email | `[data-automation-id="email"]` | `input[type="email"]` |
| Phone | `[data-automation-id="phone-number"]` | `input[type="tel"]` |
| Address / City | `[data-automation-id="addressSection_city"]` | `input[data-automation-id*="city"]` |
| Country | `[data-automation-id="country"]` | `select[data-automation-id*="country"]` |
| LinkedIn | `input[data-automation-id*="linkedIn"]` | `input[placeholder*="linkedin" i]` |
| Job Title Header | `h2[data-automation-id="jobPostingHeader"]` | `h1`, `h2` (getJobDetails fallback) |

**Confidence: MEDIUM** — `data-automation-id` attributes are Workday's documented testing API and are stable across tenants, but specific values vary by Workday version. UAT on a live Workday form is required.

### Ashby: React Field Pattern
Ashby uses standard React rendering. Same `fillInput` pattern as Greenhouse:

```javascript
// Ashby fields are standard React inputs — no shadow DOM
var el = document.querySelector(selector); // not shadowQuery
window.JobFill.filler.fillField(el, value); // triggers native setter
```

### Ashby: Custom Question Detection
Ashby marks custom form questions with `[data-field-type]`:

```javascript
// Source: ROADMAP Phase 8 item 8
var customEls = document.querySelectorAll(
  '[data-field-type] textarea, [data-field-type] input[type="text"]'
);
```

### Ashby: getJobDetails()
```javascript
// Source: ROADMAP Phase 8 item 9
function getJobDetails() {
  var jobTitle = '';
  var companyName = '';

  var h1 = document.querySelector('h1');
  if (h1) jobTitle = h1.textContent.trim();

  // Parse company from <title>: "Job Title at Company | Ashby"
  var title = document.title || '';
  var atMatch = title.match(/\bat\s+(.+?)(?:\s*[|\-–]|$)/i);
  if (atMatch) companyName = atMatch[1].trim();

  return { companyName: companyName, jobTitle: jobTitle };
}
```

### Recommended Project Structure (additions only)
```
platforms/
├── greenhouse.js     # Phase 7 — complete
├── lever.js          # Phase 7 — complete
├── workday.js        # Phase 8 — Wave 2 plan 1
└── ashby.js          # Phase 8 — Wave 2 plan 2

tests/
├── fixtures/
│   ├── dom-greenhouse.html   # Phase 7 — exists
│   ├── dom-lever.html        # Phase 7 — exists
│   ├── dom-workday.html      # Phase 8 — Wave 0, new
│   └── dom-ashby.html        # Phase 8 — Wave 0, new
└── unit/
    ├── greenhouse.test.js    # Phase 7 — exists
    ├── lever.test.js         # Phase 7 — exists
    ├── workday.test.js       # Phase 8 — Wave 0, new
    └── ashby.test.js         # Phase 8 — Wave 0, new
```

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Shadow DOM traversal | Custom recursive walker | `window.JobFill.filler.shadowQuery()` | Already implemented, tested in Phase 4 |
| React input filling | Direct `.value =` assignment | `window.JobFill.filler.fillField()` | Native setter + event dispatch already correct |
| Blur event dispatch | `new Event('blur')` manually | `window.JobFill.events.dispatchBlur()` | Correct bubbling/cancelable flags already set |
| Answer bank lookup | String matching from scratch | `window.JobFill.matcher.findBestAnswer()` | Jaccard + category scoring, 0.75 threshold built in |
| Variable substitution | Manual string replace | `window.JobFill.matcher.substituteVariables()` | Handles unresolved `{{token}}` passthrough correctly |
| MutationObserver step nav | Observer inside platform module | `content.js` existing MutationObserver | content.js already re-triggers fill on DOM mutation |

**Key insight:** All novel complexity in this phase is in Workday's DOM structure (shadow roots + blur). The infrastructure to handle it already exists. The module's job is field mapping, not framework-building.

---

## Common Pitfalls

### Pitfall 1: Using document.querySelector on Workday Fields
**What goes wrong:** Returns null for every Workday input — they're inside shadow roots.
**Why it happens:** Forgetting Workday uses Web Components / shadow DOM.
**How to avoid:** All Workday field resolution MUST use `shadowQuery(document.body, selector)`.
**Warning signs:** `resolveSelector` returns null for every field during testing.

### Pitfall 2: Missing blur Dispatch on Workday
**What goes wrong:** Fields appear filled visually but Workday shows validation errors / clears values on next step.
**Why it happens:** Workday's framework registers validation on the blur event, not input/change.
**How to avoid:** After every `fillField()` call in workday.js, immediately call `events.dispatchBlur(el)`.
**Warning signs:** Values disappear when clicking "Next" step button.

### Pitfall 3: Filling Hidden/Next-Step Workday Fields
**What goes wrong:** Filling fields from a future step that isn't visible yet. Workday may ignore or clear these values.
**Why it happens:** `shadowQueryAll` finds all fields across all steps simultaneously.
**How to avoid:** Always check `isVisible(el)` before filling. Only fill the currently active step.
**Warning signs:** Fill completes but page shows no filled values.

### Pitfall 4: Ashby title Parse Failing
**What goes wrong:** `getJobDetails()` returns empty company name.
**Why it happens:** Ashby `<title>` format varies — some tenants omit "at Company" or use different separators.
**How to avoid:** Implement tiered fallback: (1) `at X` regex, (2) `| X` split, (3) empty string graceful fallback.
**Warning signs:** Variable substitution leaves `{{company_name}}` unresolved in answers.

### Pitfall 5: Selector Specificity on Shared data-automation-id Patterns
**What goes wrong:** `input[data-automation-id*="firstName"]` matches multiple inputs on the page.
**Why it happens:** Workday repeats section prefixes inconsistently across tenant configurations.
**How to avoid:** Use the full specific `legalNameSection_firstName` selector as primary, broad `*="firstName"` as fallback only.
**Warning signs:** Wrong field filled, or multiple fills attempted.

---

## Code Examples

### Workday IIFE Skeleton
```javascript
// platforms/workday.js
window.JobFill = window.JobFill || {};
window.JobFill.platforms = window.JobFill.platforms || {};

window.JobFill.platforms.workday = (function () {
  'use strict';

  var FIELDS = [
    {
      label: 'First Name',
      profileKey: 'firstName',
      selectors: [
        '[data-automation-id="legalNameSection_firstName"]',
        'input[data-automation-id*="firstName"]',
      ],
    },
    // ... other fields
  ];

  function matches(hostname) {
    return hostname.includes('myworkdayjobs.com');
  }

  function resolveField(selectors) {
    var filler = window.JobFill.filler;
    for (var i = 0; i < selectors.length; i++) {
      try {
        var el = filler.shadowQuery(document.body, selectors[i]);
        if (el) return el;
      } catch (e) { /* skip */ }
    }
    return null;
  }

  function isVisible(el) {
    return el.offsetParent !== null;
  }

  function hasValue(el) {
    if (!el) return false;
    if (el.tagName === 'SELECT') return el.value !== '' && el.selectedIndex > 0;
    return !!(el.value && el.value.trim() !== '');
  }

  function getJobDetails() {
    var filler = window.JobFill.filler;
    var titleEl = filler.shadowQuery(document.body, 'h2[data-automation-id="jobPostingHeader"]');
    var jobTitle = titleEl ? titleEl.textContent.trim() : '';

    var companyName = '';
    // Workday: extract subdomain — "companyname.myworkdayjobs.com"
    try {
      var subdomain = window.location.hostname.split('.')[0];
      companyName = subdomain.replace(/-/g, ' ');
    } catch (e) { /* skip */ }

    return { companyName: companyName, jobTitle: jobTitle };
  }

  async function fill(profile, answerBank) {
    var results = [];
    var handledEls = new Set();
    var events = window.JobFill.events;
    var filler = window.JobFill.filler;
    var jobDetails = getJobDetails();

    for (var i = 0; i < FIELDS.length; i++) {
      var field = FIELDS[i];
      var el = resolveField(field.selectors);

      if (!el || !isVisible(el)) {
        results.push({ field: field.label, status: 'skipped', reason: !el ? 'element not found' : 'not visible' });
        continue;
      }

      if (hasValue(el)) {
        results.push({ field: field.label, status: 'skipped', reason: 'already has value' });
        handledEls.add(el);
        continue;
      }

      var value = field.profileKey && profile[field.profileKey];
      if (!value) {
        results.push({ field: field.label, status: 'skipped', reason: 'no profile value' });
        continue;
      }

      var ok = filler.fillField(el, value);
      events.dispatchBlur(el); // Workday onBlur validation requirement
      if (ok) {
        results.push({ field: field.label, status: 'filled', value: value });
      } else {
        results.push({ field: field.label, status: 'failed', reason: 'fillField returned false' });
      }
      handledEls.add(el);
    }

    return results;
  }

  return { matches: matches, fill: fill, getJobDetails: getJobDetails };
})();
```

### Ashby Custom Question Scanning
```javascript
// Ashby marks custom questions with [data-field-type]
function fillCustomQuestions(answerBank, jobDetails, results, handledEls) {
  var candidates = Array.from(
    document.querySelectorAll('[data-field-type] textarea, [data-field-type] input[type="text"]')
  ).filter(function (el) { return !handledEls.has(el); });

  var matcher = window.JobFill.matcher;
  var filler = window.JobFill.filler;

  for (var i = 0; i < candidates.length; i++) {
    var el = candidates[i];
    var container = el.closest('[data-field-type]');
    var labelEl = container && container.querySelector('label');
    var question = (labelEl && labelEl.textContent.trim()) ||
                   (container && container.getAttribute('data-field-type')) ||
                   el.getAttribute('placeholder') || '';

    if (!question) { handledEls.add(el); continue; }

    var match = matcher.findBestAnswer(question, answerBank);
    if (!match || match.score < 0.75) {
      results.push({ field: question, status: 'skipped', reason: 'no confident answer' });
      handledEls.add(el);
      continue;
    }

    var vars = { company_name: jobDetails.companyName, job_title: jobDetails.jobTitle };
    var answer = matcher.substituteVariables(match.entry.answer, vars);
    var hasUnresolved = /\{\{[^}]+\}\}/.test(answer);

    var ok = filler.fillField(el, answer);
    if (ok) {
      results.push({ field: question, status: hasUnresolved ? 'needs_review' : 'filled', value: answer });
    } else {
      results.push({ field: question, status: 'failed', reason: 'fillField returned false' });
    }
    handledEls.add(el);
  }
}
```

### DOM Fixture Pattern (for tests/fixtures/dom-workday.html)
```html
<!-- Simulate Workday shadow-hosted fields using attachShadow in fixture script -->
<!-- Structure mirrors Phase 7: dom-greenhouse.html, dom-lever.html -->
<div id="workday-app">
  <div id="legalName-shadow-host"></div>
  <div id="email-shadow-host"></div>
</div>
<script>
  // Attach shadow roots to simulate Workday's component structure
  var legalHost = document.getElementById('legalName-shadow-host');
  var sr = legalHost.attachShadow({ mode: 'open' });
  sr.innerHTML = '<input data-automation-id="legalNameSection_firstName" type="text" />';
</script>
```

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| `document.querySelector` for all ATSs | `shadowQuery` for Web Component ATSs (Workday) | Required for Workday — direct query returns null |
| Single-step form assumption | Visibility guard + MutationObserver re-trigger | Required for Workday multi-step SPA |
| `input`/`change` events only | `blur` dispatch after fill for Workday | Without blur, Workday validation rejects values |

**Deprecated/outdated:**
- `name`/`id`-based selectors for Workday: Workday's generated field IDs change per tenant and session. Use `data-automation-id` which is Workday's stable testing API.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Node.js built-in `node:test` (no install required) |
| Config file | none — see `tests/run-all.js` |
| Quick run command | `node tests/unit/workday.test.js` |
| Full suite command | `node tests/run-all.js` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| FR-2.1 | `matches('company.myworkdayjobs.com')` returns true | unit | `node tests/unit/workday.test.js` | Wave 0 |
| FR-2.1 | `matches('ashbyhq.com/company')` returns true | unit | `node tests/unit/ashby.test.js` | Wave 0 |
| FR-2.3 | Fills firstName from shadow DOM fixture | unit | `node tests/unit/workday.test.js` | Wave 0 |
| FR-2.6 | Skips already-filled fields | unit | `node tests/unit/workday.test.js` | Wave 0 |
| FR-7.1 | `dispatchBlur` called after each Workday fill | unit | `node tests/unit/workday.test.js` | Wave 0 |
| FR-7.1 | Skips invisible (next-step) fields | unit | `node tests/unit/workday.test.js` | Wave 0 |
| FR-2.9 | `getJobDetails()` returns companyName + jobTitle | unit | `node tests/unit/workday.test.js` / `ashby.test.js` | Wave 0 |

### Sampling Rate
- **Per task commit:** `node tests/unit/workday.test.js && node tests/unit/ashby.test.js`
- **Per wave merge:** `node tests/run-all.js`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/unit/workday.test.js` — covers FR-2.1, FR-2.3, FR-2.6, FR-7.1
- [ ] `tests/unit/ashby.test.js` — covers FR-2.1, FR-2.3, FR-2.6, FR-2.9
- [ ] `tests/fixtures/dom-workday.html` — shadow DOM fixture with `attachShadow` script
- [ ] `tests/fixtures/dom-ashby.html` — standard React-style fixture with `[data-field-type]` elements

---

## Open Questions

1. **Workday data-automation-id exact values**
   - What we know: `data-automation-id` is Workday's documented stable selector API; `jobPostingHeader`, `legalNameSection_firstName` are widely referenced in Workday developer docs and integration guides.
   - What's unclear: Exact IDs vary between Workday versions (Workday 2023 vs 2024 release cadence). Some tenants customize field labels which may change IDs.
   - Recommendation: Use specific IDs as primary selectors, add broad `*="firstName"` fallbacks. UAT on a live Workday form during Phase 8 verification is mandatory (per ROADMAP UAT criteria).

2. **events.dispatchBlur availability**
   - What we know: `utils/events.js` is implemented in Phase 4. `dispatchBlur` is listed in the Phase 4 ROADMAP plan.
   - What's unclear: Phase 4-02 and 4-03 plans show as not yet complete in ROADMAP (boxes unchecked). `dispatchBlur` may not yet be implemented.
   - Recommendation: Wave 0 plan should verify `window.JobFill.events.dispatchBlur` exists. If absent, workday.js must inline a one-line blur dispatch: `el.dispatchEvent(new Event('blur', { bubbles: true }))`.

3. **Ashby [data-field-type] attribute stability**
   - What we know: ROADMAP specifies this selector. Ashby's frontend is open-source (Next.js based) and `data-field-type` appears in their public job board HTML.
   - What's unclear: Whether self-hosted Ashby instances expose the same attributes as Ashby-hosted (`ashbyhq.com`).
   - Recommendation: Implement `[data-field-type]` as primary; add fallback to generic `textarea, input[type="text"]` for self-hosted tenants.

---

## Sources

### Primary (HIGH confidence)
- `platforms/greenhouse.js` (Phase 7) — IIFE pattern, FIELDS table, fillStandardFields, fillCustomQuestions, hasValue, getAdjacentLabel
- `platforms/lever.js` (Phase 7) — data-qa custom question pattern, linkedinFallback pattern
- `utils/filler.js` (Phase 4) — shadowQuery, shadowQueryAll, fillField, waitForElement API
- `utils/matcher.js` (Phase 5) — findBestAnswer, substituteVariables, matchDropdownOption API
- `.planning/ROADMAP.md` Phase 8 — all 9 implementation items, UAT criteria
- `.planning/REQUIREMENTS.md` FR-2.x, FR-7.1, NFR-1.x, NFR-5.x

### Secondary (MEDIUM confidence)
- Workday `data-automation-id` selector pattern: widely documented in Workday integration community; confirmed as Workday's stable testing API surface
- Ashby public job board HTML structure: observable from ashbyhq.com hosted job listings

### Tertiary (LOW confidence)
- Specific Workday `data-automation-id` values per field: sourced from community documentation; must be validated against a live Workday form during UAT

---

## Metadata

**Confidence breakdown:**
- Module pattern / architecture: HIGH — direct copy of verified Phase 7 pattern
- Workday selector values: MEDIUM — data-automation-id is stable API; exact values need UAT
- Ashby field structure: MEDIUM — observable from public Ashby job boards
- Workday blur requirement: HIGH — specified in FR-7.1 and ROADMAP

**Research date:** 2026-03-15
**Valid until:** 2026-04-15 (Workday releases quarterly; selector values stable within release)
