# Phase 7: Greenhouse & Lever Platform Modules - Research

**Researched:** 2026-03-15
**Domain:** Chrome Extension content script DOM manipulation, React SPA form-filling, ATS platform selectors
**Confidence:** HIGH (based on REQUIREMENTS.md, ROADMAP.md, and direct inspection of all existing utility code)

---

## Summary

Phase 7 implements two platform modules — `platforms/greenhouse.js` and `platforms/lever.js` — that fill job application forms on Greenhouse (greenhouse.io) and Lever (lever.co). Both platforms use React SPAs, so React-compatible event dispatch (native prototype setter + bubbling events) is the critical technique. The utilities to do this (`window.JobFill.events`, `window.JobFill.filler`, `window.JobFill.matcher`, `window.JobFill.storage`) are already fully built and tested in Phases 2–5.

The platform modules are the first consumers of the entire utility stack. Each module must expose exactly three functions: `matches(hostname)`, `fill(profile, answerBank)`, and `getJobDetails()`. The `content.js` coordinator (Phase 6) calls `_platform.fill(profile, answerBank)` and passes results directly to `overlay.showResults()`, so the return shape — an array of `{ field, status, value?, reason? }` objects — is contractually fixed.

**Primary recommendation:** Build each platform module as a self-contained IIFE that registers into `window.JobFill.platforms`, iterates a static field-map array for standard fields, then handles custom questions via answer bank lookup. Keep selectors in a dedicated config object at the top of each file for easy maintenance.

---

## Standard Stack

### Core (already built — no new installs)

| Module | Location | Purpose | Used by Phase 7 |
|--------|----------|---------|-----------------|
| `window.JobFill.events` | `utils/events.js` | `fillInput`, `fillSelect`, `fillTextarea`, `fillCheckbox`, `fillRadio`, `dispatchInputChange`, `dispatchBlur` | YES — every field fill |
| `window.JobFill.filler` | `utils/filler.js` | `fillField(el, value)` dispatcher, `waitForElement`, `shadowQuery` | YES — `fillField` for each el |
| `window.JobFill.matcher` | `utils/matcher.js` | `matchDropdownOption`, `findBestAnswer`, `substituteVariables` | YES — dropdowns + answer bank |
| `window.JobFill.storage` | `utils/storage.js` | `getProfile`, `getAnswerBank`, `saveFillStatus` | Called by content.js, not platform module directly |

### No new dependencies. NFR-1.4: zero external dependencies.

---

## Architecture Patterns

### Platform Module Shape (contractually required by content.js)

```javascript
// platforms/greenhouse.js
window.JobFill = window.JobFill || {};
window.JobFill.platforms = window.JobFill.platforms || {};

window.JobFill.platforms.greenhouse = (function () {
  'use strict';

  function matches(hostname) {
    return hostname.includes('greenhouse.io');
  }

  async function getJobDetails() {
    // Returns { companyName, jobTitle } for variable substitution
  }

  async function fill(profile, answerBank) {
    // Returns Array<{ field, status, value?, reason? }>
  }

  return { matches, fill, getJobDetails };
})();
```

`content.js` line 14 does:
```javascript
var platforms = window.JobFill.platforms || {};
var _platform = Object.values(platforms).find(function (p) {
  return p.matches(hostname);
}) || null;
```
So each module MUST register into `window.JobFill.platforms` under a named key.

### Fill Result Shape (required by overlay.showResults)

```javascript
// Each entry must conform to this shape:
{ field: 'First Name', status: 'filled',       value: 'Adarsh' }
{ field: 'Cover Letter', status: 'needs_review', reason: 'confidence: 0.65' }
{ field: 'Work Auth',   status: 'skipped',      reason: 'already has value' }
{ field: 'Phone',       status: 'failed',        reason: 'selector not found' }
```

Status values used by overlay: `filled`, `skipped`, `failed`, `needs_review`.

### Field Map Pattern

Define a static array of field descriptors at the top of each module. Iterate it during fill. This makes selectors easy to find/audit:

```javascript
const FIELDS = [
  {
    label: 'First Name',
    selectors: ['input#first_name', 'input[name="first_name"]'],
    profileKey: 'firstName',
    type: 'input',
  },
  {
    label: 'Last Name',
    selectors: ['input#last_name', 'input[name="last_name"]'],
    profileKey: 'lastName',
    type: 'input',
  },
  // ...
];
```

### Skip-if-Filled Guard (FR-2.6)

Before filling any field, check if it already has a value:

```javascript
function hasValue(el) {
  if (el.tagName === 'SELECT') return el.value !== '' && el.selectedIndex > 0;
  return el.value && el.value.trim() !== '';
}
// In the fill loop:
if (hasValue(el)) {
  results.push({ field: descriptor.label, status: 'skipped', reason: 'already has value' });
  continue;
}
```

### Selector Chain Resolution

Each field has a primary selector + fallbacks (NFR-5.4). Try each in order, stop at first hit:

```javascript
function resolveSelector(selectors) {
  for (const sel of selectors) {
    const el = document.querySelector(sel);
    if (el) return el;
  }
  return null;
}
```

---

## Greenhouse — Selector Reference

**matches:** `hostname.includes('greenhouse.io')`

| Field | Primary Selector | Fallback 1 | Fallback 2 |
|-------|-----------------|------------|------------|
| First Name | `input#first_name` | `input[name="first_name"]` | `input[autocomplete="given-name"]` |
| Last Name | `input#last_name` | `input[name="last_name"]` | `input[autocomplete="family-name"]` |
| Email | `input#email` | `input[name="email"]` | `input[type="email"]` |
| Phone | `input#phone` | `input[name="phone"]` | `input[type="tel"]` |
| LinkedIn | `input#job_application_linkedin_profile` | `input[name*="linkedin"]` | `input[placeholder*="linkedin" i]` |
| Resume (file) | `input#resume` | `input[name="resume"]` | `input[type="file"][id*="resume"]` |
| Cover Letter | `textarea#cover_letter` | `textarea[name="cover_letter"]` | `textarea[id*="cover"]` |
| Location | `select#job_application_location` | `input[name*="location"]` | `input[placeholder*="location" i]` |
| Work Auth | `select[name*="work_auth"]` | `select[name*="authorization"]` | `input[type="radio"][name*="auth"]` |

**getJobDetails:**
- `companyName`: `document.querySelector('h1.company-name')?.textContent` or `document.title` split on `–` or `|`
- `jobTitle`: `document.querySelector('h1.app-title')?.textContent` or `document.querySelector('h1')?.textContent`

**Custom questions:** Greenhouse renders open-text questions as `<div.field>` containing `<label>` + `<textarea>` or `<input>`. Select all `textarea` and `input[type="text"]` not in the FIELDS map, read adjacent `label` text, run `findBestAnswer(labelText, answerBank)`.

---

## Lever — Selector Reference

**matches:** `hostname.includes('lever.co')`

Lever is a React SPA. Fields use `name` attributes consistently.

| Field | Primary Selector | Fallback 1 | Fallback 2 |
|-------|-----------------|------------|------------|
| Full Name | `input[name="name"]` | `input[placeholder*="name" i]` | `input[autocomplete="name"]` |
| Email | `input[name="email"]` | `input[type="email"]` | `input[placeholder*="email" i]` |
| Phone | `input[name="phone"]` | `input[type="tel"]` | `input[placeholder*="phone" i]` |
| LinkedIn | `input[name="urls[LinkedIn]"]` | `input[name*="linkedin" i]` | `input[placeholder*="linkedin" i]` |
| Resume (file) | `input[name="resume"]` | `input[type="file"]` | — |
| Cover Letter | `textarea[name="comments"]` | `textarea[placeholder*="cover" i]` | `textarea[placeholder*="message" i]` |
| Portfolio | `input[name="urls[Portfolio]"]` | `input[name*="portfolio" i]` | — |

**getJobDetails:**
- `companyName`: `document.querySelector('.main-header-logo img')?.alt` or parse `document.title`
- `jobTitle`: `document.querySelector('h2')?.textContent` or `document.querySelector('h1')?.textContent`

**Custom questions (data-qa fields):** Lever custom questions use `[data-qa]` attributes. Select `[data-qa] textarea` and `[data-qa] input[type="text"]`, read `[data-qa] label` or `[data-qa]` attribute text as the question string, run answer bank lookup.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| React state update | DOM `.value =` assignment | `window.JobFill.events.fillInput` (native setter + events) | React ignores plain value= assignment — its synthetic event system won't fire |
| Dropdown matching | Custom string compare | `window.JobFill.matcher.matchDropdownOption` | Handles alias map, case-insensitive, Levenshtein fallback |
| Answer bank lookup | Manual keyword search | `window.JobFill.matcher.findBestAnswer` | Jaccard + category scoring with 0.75 confidence threshold |
| Variable substitution | Manual string replace | `window.JobFill.matcher.substituteVariables` | Handles unresolved `{{token}}` gracefully |
| Fill field dispatch | Direct `el.type` checks | `window.JobFill.filler.fillField(el, value)` | Already dispatches correct events per tag/type |
| Wait for dynamic elements | `setTimeout` polling | `window.JobFill.filler.waitForElement(selector, 3000)` | MutationObserver-based, respects NFR-3.3 |

---

## Common Pitfalls

### Pitfall 1: React ignores plain value assignment
**What goes wrong:** `el.value = 'foo'` sets the DOM value but React's state doesn't update. Field appears filled but clears on blur.
**Why it happens:** React overrides the `value` property setter; bypassing it prevents React's onChange from firing.
**How to avoid:** Always use `window.JobFill.events.fillInput` which uses the native prototype setter.
**Warning signs:** Field shows value momentarily then goes blank.

### Pitfall 2: `window.JobFill.platforms` not initialized before module loads
**What goes wrong:** `window.JobFill.platforms.greenhouse = ...` throws if `platforms` is undefined.
**How to avoid:** First line of every platform module: `window.JobFill.platforms = window.JobFill.platforms || {};`

### Pitfall 3: File inputs — Phase 7 scope exclusion
**What goes wrong:** Calling `fillField` on `input[type="file"]` returns `false` by design (filler.js line 33: `if (tag === 'input' && type === 'file') return false; // Phase 11 scope`).
**How to avoid:** In Phase 7, detect file inputs, push a `{ status: 'skipped', reason: 'resume upload in Phase 11' }` result. Do NOT attempt to fill.

### Pitfall 4: Greenhouse work-auth field varies by job posting
**What goes wrong:** Some Greenhouse postings use a `<select>`, others use radio buttons, others omit it entirely.
**How to avoid:** Check for both `select[name*="work_auth"]` and `input[type="radio"][name*="auth"]`. If neither found, push `skipped`. Use `matchDropdownOption` for the select case.

### Pitfall 5: Lever `name="urls[LinkedIn]"` square-bracket selector syntax
**What goes wrong:** `document.querySelector('input[name="urls[LinkedIn]"]')` fails because brackets need escaping in some CSS selector contexts.
**How to avoid:** Use `document.querySelector('input[name="urls[LinkedIn]"]')` — this works in querySelector (quotes handle it), but NOT in `:is()` or complex selectors. Test this in Chrome DevTools console first.

### Pitfall 6: `getJobDetails()` called before DOM is ready
**What goes wrong:** `h1`, `h2`, title elements may not reflect job data if called synchronously too early (Lever SPA).
**How to avoid:** Call `getJobDetails()` at start of `fill()`, not at module load time. If `h2` is empty, fall back to title parse.

### Pitfall 7: Custom question fields overlap with standard fields
**What goes wrong:** Iterating ALL `textarea` elements on the page catches the cover letter textarea twice.
**How to avoid:** In custom question discovery, skip any element that was already handled by the FIELDS map. Track handled elements in a `Set`.

---

## Code Examples

### Platform module registration pattern
```javascript
// Source: content.js lines 13-16 (how it is consumed)
window.JobFill.platforms = window.JobFill.platforms || {};
window.JobFill.platforms.greenhouse = (function () {
  'use strict';
  // ...
  return { matches, fill, getJobDetails };
})();
```

### Standard field fill loop
```javascript
async function fillStandardFields(profile, results, handledEls) {
  const filler = window.JobFill.filler;
  for (const fd of FIELDS) {
    const el = resolveSelector(fd.selectors);
    if (!el) {
      results.push({ field: fd.label, status: 'failed', reason: 'selector not found' });
      continue;
    }
    handledEls.add(el);
    if (hasValue(el)) {
      results.push({ field: fd.label, status: 'skipped', reason: 'already has value' });
      continue;
    }
    const value = profile[fd.profileKey];
    if (!value) {
      results.push({ field: fd.label, status: 'skipped', reason: 'no profile value' });
      continue;
    }
    const ok = filler.fillField(el, value);
    results.push({ field: fd.label, status: ok ? 'filled' : 'failed', value: ok ? value : undefined });
  }
}
```

### Custom question discovery and answer bank fill
```javascript
async function fillCustomQuestions(answerBank, jobDetails, results, handledEls) {
  const matcher = window.JobFill.matcher;
  const filler  = window.JobFill.filler;
  const textAreas = Array.from(document.querySelectorAll('textarea, input[type="text"]'))
    .filter(el => !handledEls.has(el));

  for (const el of textAreas) {
    const label = getAdjacentLabel(el);
    if (!label) continue;

    const match = matcher.findBestAnswer(label, answerBank);
    if (!match) {
      results.push({ field: label, status: 'skipped', reason: 'no answer bank match' });
      continue;
    }

    const vars = {
      company_name:     jobDetails.companyName || '',
      job_title:        jobDetails.jobTitle || '',
      my_name:          profile.fullName || '',
      years_experience: profile.yearsExperience || '',
      current_company:  profile.currentCompany || '',
      target_role:      profile.currentTitle || '',
    };
    const answer = matcher.substituteVariables(match.entry.answer, vars);
    const hasUnresolved = answer.includes('{{');

    filler.fillField(el, answer);
    results.push({
      field: label,
      status: hasUnresolved ? 'needs_review' : 'filled',
      value: answer,
      reason: hasUnresolved ? 'unresolved variables' : undefined,
    });
  }
}
```

### Adjacent label extraction
```javascript
function getAdjacentLabel(el) {
  // Method 1: explicit label[for=id]
  if (el.id) {
    const lbl = document.querySelector('label[for="' + el.id + '"]');
    if (lbl) return lbl.textContent.trim();
  }
  // Method 2: wrapping label
  const parent = el.closest('label');
  if (parent) return parent.textContent.replace(el.value, '').trim();
  // Method 3: previous sibling label
  const prev = el.previousElementSibling;
  if (prev && prev.tagName === 'LABEL') return prev.textContent.trim();
  // Method 4: aria-label
  return el.getAttribute('aria-label') || el.getAttribute('placeholder') || null;
}
```

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Node.js built-in `node:test` (no jest/vitest — NFR-1.2 zero build tools) |
| Config file | none — run directly with `node --test` |
| Quick run command | `node --test tests/unit/greenhouse.test.js` |
| Full suite command | `node --test tests/unit/` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| FR-2.1 | `matches()` returns true for greenhouse.io hostname | unit | `node --test tests/unit/greenhouse.test.js` | ❌ Wave 0 |
| FR-2.1 | `matches()` returns true for lever.co hostname | unit | `node --test tests/unit/lever.test.js` | ❌ Wave 0 |
| FR-2.9 | Both modules expose `matches`, `fill`, `getJobDetails` | unit | `node --test tests/unit/greenhouse.test.js` | ❌ Wave 0 |
| FR-2.3 | Standard fields (name/email/phone/LinkedIn) filled from profile | unit (DOM mock) | `node --test tests/unit/greenhouse.test.js` | ❌ Wave 0 |
| FR-2.4 | Dropdown options matched via `matchDropdownOption` | unit | `node --test tests/unit/greenhouse.test.js` | ❌ Wave 0 |
| FR-2.6 | Skip fields that already have values | unit (DOM mock) | `node --test tests/unit/greenhouse.test.js` | ❌ Wave 0 |
| FR-3.4 | Custom questions filled if confidence >= 0.75 | unit (DOM mock) | `node --test tests/unit/greenhouse.test.js` | ❌ Wave 0 |
| FR-3.5 | Variable substitution applied in answers | unit | `node --test tests/unit/greenhouse.test.js` | ❌ Wave 0 |
| FR-3.7 | needs_review returned if confidence < 0.75 or unresolved vars | unit | `node --test tests/unit/greenhouse.test.js` | ❌ Wave 0 |
| NFR-5.4 | Fallback selectors tried when primary not found | unit (DOM mock) | `node --test tests/unit/greenhouse.test.js` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `node --test tests/unit/greenhouse.test.js && node --test tests/unit/lever.test.js`
- **Per wave merge:** `node --test tests/unit/`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/unit/greenhouse.test.js` — covers all Greenhouse FR items above
- [ ] `tests/unit/lever.test.js` — covers all Lever FR items above
- [ ] `tests/fixtures/dom-greenhouse.html` — static HTML fixture with Greenhouse field structure (for DOM mock tests)
- [ ] `tests/fixtures/dom-lever.html` — static HTML fixture with Lever field structure

Note: `tests/helpers/dom-mock.js` already exists from Phase 4 — reuse it.

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|-----------------|--------|
| `el.value = x` plain assignment | Native setter via `Object.getOwnPropertyDescriptor` + bubbling events | React/Angular state actually updates |
| Single CSS selector per field | Selector chain array (primary + 2 fallbacks) | Survives minor Greenhouse/Lever DOM changes |
| Hardcoded answer strings | Answer bank with variable substitution | Personalised answers per company/role |

---

## Open Questions

1. **Greenhouse work-auth field structure**
   - What we know: ROADMAP says "work auth radio/select" — both patterns exist
   - What's unclear: Which Greenhouse postings use which format; whether UAE Golden Visa is a recognized value
   - Recommendation: Implement both select and radio handling; use `matchDropdownOption` for select, `fillRadio` for radio. Log which was found.

2. **Lever `urls[LinkedIn]` selector escaping**
   - What we know: `document.querySelector('input[name="urls[LinkedIn]"]')` works in Chrome (quoted attribute value handles brackets)
   - What's unclear: Whether `querySelectorAll` with this selector has cross-browser edge cases
   - Recommendation: Test in Chrome DevTools on a live Lever page during UAT; add a `querySelectorAll` fallback that iterates inputs and checks `.name` directly.

3. **Custom question discovery scope**
   - What we know: Greenhouse and Lever both add custom questions per job posting — number and type vary
   - What's unclear: Whether Greenhouse custom questions always have a `<label>` or sometimes use `aria-label` / `placeholder` only
   - Recommendation: Implement all four label-extraction methods (label[for], wrapper, sibling, aria-label/placeholder) as shown in code examples.

---

## Sources

### Primary (HIGH confidence)
- Direct code inspection: `utils/events.js`, `utils/filler.js`, `utils/matcher.js`, `utils/storage.js`, `content.js` — interface contracts verified
- `REQUIREMENTS.md` FR-2, FR-3, FR-7.4, NFR-5.4 — selector and fill requirements
- `ROADMAP.md` Phase 7 plans — field lists and selector specifications

### Secondary (MEDIUM confidence)
- Greenhouse selector names (`first_name`, `last_name`, `email`, `phone`, `resume`, `cover_letter`) are stable HTML name attributes that have been consistent across Greenhouse versions
- Lever field naming (`name`, `email`, `phone`, `urls[LinkedIn]`, `comments`) documented in ROADMAP and consistent with known Lever SPA structure

### Tertiary (LOW — verify during UAT)
- Exact Greenhouse work-auth selector variants — verify on live job posting
- Lever `[data-qa]` custom question attribute presence — verify on live job posting

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all utilities already exist and are verified
- Architecture: HIGH — interface contract fixed by content.js source code
- Selectors: MEDIUM — based on ROADMAP specs + known stable patterns; verify on live pages during UAT
- Pitfalls: HIGH — derived from existing code inspection (filler.js line 33, content.js lines 13-16)

**Research date:** 2026-03-15
**Valid until:** 2026-04-15 (ATS DOM structures change slowly; re-verify selectors if Greenhouse/Lever ships major updates)
