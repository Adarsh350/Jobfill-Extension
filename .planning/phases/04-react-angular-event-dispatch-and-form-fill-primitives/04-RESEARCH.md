# Phase 4: React/Angular Event Dispatch & Form Fill Primitives - Research

**Researched:** 2026-03-14
**Domain:** Browser form automation — React/Angular synthetic event compatibility, Shadow DOM, content script isolation
**Confidence:** HIGH

---

## Summary

Phase 4 implements the lowest-level building blocks that all ATS platform modules depend on. The central problem is that React and Angular maintain their own internal state trees that are decoupled from the native DOM value properties. A plain `element.value = "x"` assignment updates the DOM but leaves the framework's internal fiber/zone state unchanged, so the framework either ignores the change or reverts it on the next render cycle.

The fix is well-established: obtain the native `HTMLInputElement.prototype` value setter via `Object.getOwnPropertyDescriptor`, call it directly on the element to bypass any framework override, then dispatch a bubbling `input` event. React's onChange handler fires on `input`; Angular's `(ngModelChange)` also fires on `input`. A follow-up `change` event satisfies legacy listeners and some Angular reactive forms validators. For Workday, a `blur` event is additionally needed because onBlur validation is common there.

Shadow DOM piercing is required for Workday (Web Components with open shadow roots) and the fill overlay itself. Standard `querySelector` is blocked at shadow boundaries; a recursive walk through `element.shadowRoot` is the correct approach. All patterns here are zero-dependency vanilla JS, consistent with NFR-1.2 (no npm, no bundler).

**Primary recommendation:** Implement `utils/events.js` and `utils/filler.js` as pure vanilla JS modules exposing `window.JobFill.events` and `window.JobFill.filler`. Every pattern below is verified against CONCERNS.md (HIGH confidence) and the authoritative React GitHub issue #14694.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Vanilla JS | ES2020 | All implementation | NFR-1.2: zero dependencies |
| `Object.getOwnPropertyDescriptor` | Built-in | Access native prototype setter | Only way to bypass React/Angular value override |
| `CustomEvent` / `Event` / `FocusEvent` | Built-in | Dispatch synthetic events | Matches what frameworks listen for |

### No External Libraries
This phase must not introduce any external libraries. Shadow DOM traversal helpers like `query-selector-shadow-dom` exist but cannot be bundled (NFR-1.4). Implement the recursive walk inline.

---

## Architecture Patterns

### Recommended File Structure
```
utils/
├── events.js    # window.JobFill.events — native setter + event dispatch
└── filler.js    # window.JobFill.filler — type dispatcher, waitForElement, shadowQuery, fill lock
```

### Pattern 1: React/Angular Native Prototype Value Setter

**What:** Bypasses framework value property overrides by calling the original native setter directly, then dispatching a bubbling `input` event to trigger framework onChange/ngModelChange.

**When to use:** Any `<input type="text|email|tel|number|password|url">` on Greenhouse, Lever, Ashby, Workday, LinkedIn Easy Apply (all React-based).

```javascript
// Source: CONCERNS.md — ATS Platform Pitfalls: Greenhouse/Lever/Ashby (HIGH confidence)
// Verified: React issue #14694 (github.com/facebook/react/issues/14694)

function fillInput(el, value) {
  const nativeSetter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    'value'
  ).set;
  nativeSetter.call(el, value);
  el.dispatchEvent(new Event('input',  { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
}
```

**Critical note:** `window.HTMLInputElement.prototype` must be resolved in the same JS world where this code executes (content script ISOLATED world). Do NOT cache the descriptor across world boundaries. Do NOT pass the setter function through `chrome.scripting.executeScript` — it will reference the wrong world's prototype.

### Pattern 2: Textarea Native Setter

```javascript
// Source: same principle as Pattern 1 — HTMLTextAreaElement.prototype

function fillTextarea(el, value) {
  const nativeSetter = Object.getOwnPropertyDescriptor(
    window.HTMLTextAreaElement.prototype,
    'value'
  ).set;
  nativeSetter.call(el, value);
  el.dispatchEvent(new Event('input',  { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
}
```

### Pattern 3: Select Fill

**What:** Set select value and dispatch `change` event. React and Angular both listen on `change` for `<select>`. No native setter trick needed — React does not override the select value property the same way.

```javascript
// Source: CONCERNS.md — ATS pitfalls (MEDIUM confidence — select behavior verified via community sources)

function fillSelect(el, value) {
  // 1. Exact match
  let matched = Array.from(el.options).find(o => o.value === value || o.text === value);

  // 2. Case-insensitive match
  if (!matched) {
    const lower = value.toLowerCase();
    matched = Array.from(el.options).find(
      o => o.value.toLowerCase() === lower || o.text.toLowerCase() === lower
    );
  }

  // 3. Alias normalization (caller should pre-normalize before calling)
  if (!matched) return false;

  el.value = matched.value;
  el.dispatchEvent(new Event('change', { bubbles: true }));
  return true;
}
```

### Pattern 4: Checkbox Fill

```javascript
function fillCheckbox(el, checked) {
  el.checked = Boolean(checked);
  el.dispatchEvent(new Event('change', { bubbles: true }));
}
```

### Pattern 5: Radio Fill

**Note:** Radio inputs require both `change` event AND `.click()` — some frameworks (Angular Material) only respond to the click.

```javascript
// Source: CONCERNS.md (MEDIUM) — Angular Material radio behavior

function fillRadio(el) {
  el.checked = true;
  el.dispatchEvent(new Event('change', { bubbles: true }));
  el.click(); // Angular Material and some React radio components require this
}
```

### Pattern 6: Event Dispatch Order and Options

**Canonical event sequence for text inputs (React + Angular compatible):**

| Step | Event | Constructor | Options | Reason |
|------|-------|-------------|---------|--------|
| 1 | Set value | native setter | — | Updates DOM without triggering React's override |
| 2 | `input` | `Event` | `{ bubbles: true }` | Triggers React onChange, Angular ngModelChange |
| 3 | `change` | `Event` | `{ bubbles: true }` | Satisfies legacy listeners, Angular reactive forms |
| 4 | `blur` | `FocusEvent` | `{ bubbles: true }` | Workday onBlur validators ONLY — do not dispatch by default |

`cancelable: false` is acceptable for all of these. `composed: true` is not required unless the input is inside a shadow root and the listener is on the host.

### Pattern 7: Shadow DOM Recursive Pierce

**What:** Descends into shadow roots recursively to find an element matching a CSS selector. Required for Workday (Web Components) and any host-page component that uses shadow DOM.

```javascript
// Source: CONCERNS.md — Workday: "Shadow DOM — standard querySelector returns null" (HIGH confidence)
// See also: wavebeem.com/blog/2024/querying-shadow-dom/

function shadowQuery(root, selector) {
  // Try direct match first
  const direct = root.querySelector(selector);
  if (direct) return direct;

  // Walk all elements with a shadowRoot
  const all = root.querySelectorAll('*');
  for (const el of all) {
    if (el.shadowRoot) {
      const found = shadowQuery(el.shadowRoot, selector);
      if (found) return found;
    }
  }
  return null;
}

function shadowQueryAll(root, selector) {
  const results = [];
  const direct = Array.from(root.querySelectorAll(selector));
  results.push(...direct);

  const all = root.querySelectorAll('*');
  for (const el of all) {
    if (el.shadowRoot) {
      results.push(...shadowQueryAll(el.shadowRoot, selector));
    }
  }
  return results;
}
```

**Performance note:** On pages with deep component trees, this traversal can be slow. Call only when standard `querySelector` returns null. Cache results per fill operation — do not call on every MutationObserver tick.

### Pattern 8: waitForElement — Promise-Based Polling

**What:** Polls the DOM until a selector matches or timeout expires. Used after SPA navigation where fields appear asynchronously.

```javascript
// Source: CONCERNS.md — Content Script Pitfalls: "document_idle fires before dynamic form loads" (HIGH)

function waitForElement(selector, timeout = 5000, root = document) {
  return new Promise((resolve, reject) => {
    // Check immediately
    const el = root.querySelector(selector);
    if (el) { resolve(el); return; }

    const deadline = Date.now() + timeout;
    const observer = new MutationObserver(() => {
      const found = root.querySelector(selector);
      if (found) {
        observer.disconnect();
        resolve(found);
        return;
      }
      if (Date.now() > deadline) {
        observer.disconnect();
        reject(new Error(`waitForElement: "${selector}" not found within ${timeout}ms`));
      }
    });

    observer.observe(root, { childList: true, subtree: true });

    // Safety: also reject after timeout even if observer stalls
    setTimeout(() => {
      observer.disconnect();
      reject(new Error(`waitForElement: "${selector}" timed out after ${timeout}ms`));
    }, timeout);
  });
}
```

**Note:** The observer self-disconnects on both success and timeout. This prevents the MutationObserver memory leak documented in CONCERNS.md section 3.

### Pattern 9: Fill Lock

**What:** Boolean semaphore preventing concurrent fill operations. Required by NFR-5.1.

```javascript
// Source: REQUIREMENTS.md NFR-5.1; CONCERNS.md — "Multiple simultaneous fill triggers" (HIGH)

const _state = {
  filling: false
};

function isFilling() {
  return _state.filling;
}

function startFill() {
  if (_state.filling) return false; // already locked
  _state.filling = true;
  return true;
}

function endFill() {
  _state.filling = false;
}
```

**Usage pattern:**
```javascript
async function fillForm(profile) {
  if (!startFill()) return; // drop duplicate trigger
  try {
    // ... fill logic ...
  } finally {
    endFill(); // always release, even on error
  }
}
```

### Pattern 10: Type Dispatcher — fillField

**What:** Central dispatcher that routes to the correct fill primitive based on element type.

```javascript
function fillField(el, value) {
  const tag  = el.tagName.toLowerCase();
  const type = (el.type || '').toLowerCase();

  if (tag === 'textarea') return fillTextarea(el, value);
  if (tag === 'select')   return fillSelect(el, value);

  if (tag === 'input') {
    if (type === 'checkbox') return fillCheckbox(el, value);
    if (type === 'radio')    return fillRadio(el);
    if (type === 'file')     return false; // Phase 11 scope — stub only
    return fillInput(el, value); // text, email, tel, number, url, password
  }

  // contenteditable (some ATS rich text fields)
  if (el.isContentEditable) {
    el.textContent = value;
    el.dispatchEvent(new Event('input',  { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  }

  return false;
}
```

### Anti-Patterns to Avoid

- **Direct `.value =` assignment on React inputs:** Bypassed by React's property descriptor override. The field appears filled visually but React's state disagrees, causing the value to vanish on next render.
- **`dispatchEvent(new Event('input', { bubbles: false }))` :** Non-bubbling events are not caught by React's top-level delegated event listeners. Always use `bubbles: true`.
- **Caching the native setter across reloads:** The descriptor must be obtained fresh in each content script execution context. Stale references from a previous page load may point to the wrong prototype.
- **`el.setAttribute('value', ...)` instead of setter:** Updates the HTML attribute, not the DOM property. React reads the DOM property, not the attribute. Wrong approach.
- **Calling `fillField` inside MutationObserver callback synchronously per mutation:** Can trigger cascading mutations. Debounce or use a stable "fields present" signal before calling fill.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Shadow DOM query | Custom tree walker from scratch each use | `shadowQuery` / `shadowQueryAll` helpers (Pattern 7) | Needs to handle both `querySelector` and `querySelectorAll` semantics; recursive; reuse across platform modules |
| Async element waiting | `setTimeout` polling loop | `waitForElement` MutationObserver pattern (Pattern 8) | setTimeout polling wastes CPU and has race conditions; MutationObserver fires exactly when DOM changes |
| React value injection | Any approach other than native prototype setter | `Object.getOwnPropertyDescriptor(...).set.call(el, v)` | All other approaches are defeated by React's value descriptor override |

**Key insight:** The native prototype setter is the only approach that survives React 16, 17, and 18. It works because React overrides the instance-level value setter on controlled inputs, but the prototype-level original setter is untouched.

---

## Common Pitfalls

### Pitfall 1: ISOLATED World Prototype Reference
**What goes wrong:** Developer caches `nativeSetter` at module load time. Extension is updated, content script re-runs in a new isolated world context, but the cached reference points to the old world's prototype — which is now garbage-collected or mismatched.
**Why it happens:** Isolated world JS contexts have their own copies of built-in prototypes.
**How to avoid:** Obtain the descriptor inside the fill function, or at minimum inside the content script's own execution scope on each page load. Do not pass setter references across `postMessage` or `CustomEvent` channels.
**Warning signs:** Fill works on first page load but fails after extension reload without tab reload.

### Pitfall 2: Missing `bubbles: true` on Dispatched Events
**What goes wrong:** React uses top-level event delegation — it attaches a single listener on the document root, not on individual inputs. An event dispatched with `bubbles: false` never reaches React's root listener.
**Why it happens:** `new Event('input')` defaults to `bubbles: false`.
**How to avoid:** Always pass `{ bubbles: true }` explicitly.
**Warning signs:** Fill visually sets the value but React form validation treats the field as empty.

### Pitfall 3: Shadow Root `mode: "closed"`
**What goes wrong:** `shadowQuery` calls `el.shadowRoot` and gets `null` even though the element has a shadow root.
**Why it happens:** Shadow root was created with `mode: "closed"` — the `shadowRoot` property is intentionally hidden from external scripts.
**How to avoid:** Closed shadow roots cannot be pierced by content scripts without MAIN world injection. Detect this case and log a warning. Workday uses `mode: "open"` — but future ATS platforms may not.
**Warning signs:** `shadowQuery` returns null for an element that is visually present.

### Pitfall 4: `waitForElement` Resolving Stale Elements
**What goes wrong:** `waitForElement` resolves with an element that is immediately removed (e.g. a loading spinner). Caller tries to fill it and the element is detached.
**Why it happens:** DOM mutation triggered the observer but the target was transitional.
**How to avoid:** After `await waitForElement(...)`, check `document.contains(el)` before filling. Callers should handle `null` returns gracefully.

### Pitfall 5: File Input — Wrong World
**What goes wrong:** `fillField` reaches the `type === 'file'` branch and silently returns false, but the caller expected it to work.
**Why it happens:** File inputs require `DataTransfer` + `File` constructor from the MAIN world (FR-6.4). This is Phase 11 scope.
**How to avoid:** The stub `return false` for file inputs is intentional. Platform modules must check the return value and route file inputs to the MAIN world injector (Phase 11).

---

## Code Examples

### Minimal events.js Module Shape
```javascript
// utils/events.js
// Source: Pattern consolidation from REQUIREMENTS.md FR-2.8, CONCERNS.md ATS pitfalls

(function () {
  'use strict';

  const events = {
    fillInput,
    fillTextarea,
    fillSelect,
    fillCheckbox,
    fillRadio,
    dispatchInputChange,
    dispatchBlur,
  };

  function dispatchInputChange(el) {
    el.dispatchEvent(new Event('input',  { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function dispatchBlur(el) {
    el.dispatchEvent(new FocusEvent('blur', { bubbles: true }));
  }

  // ... implementations as above ...

  window.JobFill = window.JobFill || {};
  window.JobFill.events = events;
})();
```

### Minimal filler.js Module Shape
```javascript
// utils/filler.js
// Depends on: utils/events.js (window.JobFill.events must be loaded first)

(function () {
  'use strict';

  const filler = {
    fillField,
    waitForElement,
    shadowQuery,
    shadowQueryAll,
    isFilling,
    startFill,
    endFill,
  };

  // ... implementations as above ...

  window.JobFill = window.JobFill || {};
  window.JobFill.filler = filler;
})();
```

### Manifest Script Load Order
```json
"content_scripts": [{
  "js": [
    "utils/storage.js",
    "utils/events.js",
    "utils/filler.js",
    "content/detector.js",
    "content/main.js"
  ]
}]
```
`events.js` must load before `filler.js` because `filler.js` calls `window.JobFill.events.*`.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `el.value = x` + `el.dispatchEvent(new Event('change'))` | Native prototype setter + `input` then `change` with `bubbles: true` | React 16 (2017) introduced synthetic event delegation | Direct assignment silently fails on React-controlled inputs |
| `document.querySelector` for all selectors | `shadowQuery` recursive pierce for Shadow DOM hosts | Web Components / Shadow DOM v1 (Chrome 53, 2016) | Standard query is blocked at shadow boundaries |
| `setTimeout` polling for async elements | `MutationObserver` + Promise (`waitForElement`) | MutationObserver stable (Chrome 26, 2013) | Observer is instant + O(1) CPU vs polling loop |

**Deprecated/outdated:**
- `createEvent('HTMLEvents')` + `initEvent()`: Pre-ES6 event API. Replaced by `new Event(...)` constructor. Do not use.
- `el.fireEvent()`: IE-only. Irrelevant.

---

## Open Questions

1. **Angular-specific event requirements**
   - What we know: Angular's `[(ngModel)]` (template-driven) fires on `input` event; Angular reactive forms `FormControl` with `valueChanges` also fires on `input`.
   - What's unclear: Angular Material custom form controls may use `_controlValueAccessor` with different event expectations.
   - Recommendation: Test `fillInput` against Ashby (which uses React, not Angular) first. Angular-specific issues will surface in platform module testing (Phase 5+).

2. **`composed: true` for shadow-root-hosted inputs**
   - What we know: Events dispatched inside a shadow root do not cross the shadow boundary unless `composed: true` is set.
   - What's unclear: If a React/Angular app mounts its form inside a shadow root AND attaches listeners outside the shadow root, `bubbles: true` alone is insufficient.
   - Recommendation: Add `composed: true` to all dispatched events in `dispatchInputChange` and `dispatchBlur` as a precaution. No known downside.

3. **`waitForElement` timeout tuning**
   - What we know: NFR-3.2 requires fill to complete within 3 seconds; NFR-3.3 requires cascading dropdown poll max 3 seconds.
   - What's unclear: 5000ms default in Pattern 8 vs 3000ms NFR requirement.
   - Recommendation: Default `timeout` parameter to 3000ms to align with NFR-3.2/3.3. Expose it as a parameter so callers can override for specific cases.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None installed — Wave 0 must create test harness |
| Config file | None — see Wave 0 gaps |
| Quick run command | `node tests/unit/events.test.js` (tap/assert, no framework needed) |
| Full suite command | `node tests/run-all.js` |

**Rationale for no framework:** NFR-1.2 bans npm/node_modules. Tests must run with Node.js built-ins only (`assert`, `node:test` module available in Node 18+). Use `node:test` + `node:assert`.

### Phase Requirements to Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| FR-2.8 | `fillInput` calls native prototype setter, not direct `.value =` | unit | `node tests/unit/events.test.js` | Wave 0 |
| FR-2.8 | `fillInput` dispatches `input` event with `bubbles: true` | unit | `node tests/unit/events.test.js` | Wave 0 |
| FR-2.8 | `fillInput` dispatches `change` event with `bubbles: true` | unit | `node tests/unit/events.test.js` | Wave 0 |
| FR-2.4 | `fillSelect` exact match succeeds | unit | `node tests/unit/events.test.js` | Wave 0 |
| FR-2.4 | `fillSelect` case-insensitive match succeeds | unit | `node tests/unit/events.test.js` | Wave 0 |
| FR-2.4 | `fillSelect` returns false when no option matches | unit | `node tests/unit/events.test.js` | Wave 0 |
| FR-2.5 | `fillCheckbox` sets `.checked` and dispatches `change` | unit | `node tests/unit/events.test.js` | Wave 0 |
| FR-2.5 | `fillRadio` sets `.checked=true`, dispatches `change`, calls `.click()` | unit | `node tests/unit/events.test.js` | Wave 0 |
| NFR-5.1 | `startFill` returns false when fill already in progress | unit | `node tests/unit/filler.test.js` | Wave 0 |
| NFR-5.1 | `endFill` releases lock so next `startFill` succeeds | unit | `node tests/unit/filler.test.js` | Wave 0 |
| FR-2.2 | `shadowQuery` finds element inside open shadow root | unit | `node tests/unit/filler.test.js` | Wave 0 |
| FR-2.2 | `shadowQuery` returns null for element not in tree | unit | `node tests/unit/filler.test.js` | Wave 0 |
| NFR-3.3 | `waitForElement` resolves when element appears within timeout | unit | `node tests/unit/filler.test.js` | Wave 0 |
| NFR-3.3 | `waitForElement` rejects after timeout if element never appears | unit | `node tests/unit/filler.test.js` | Wave 0 |

**Note:** These tests run in Node.js with a lightweight DOM shim (jsdom or manual mock objects). No browser required. The native prototype setter test must mock `HTMLInputElement.prototype` because Node.js does not have it — test that `Object.getOwnPropertyDescriptor(..., 'value').set` was called via a spy.

### Grep-Verifiable Test Anchors

Each test file must contain these exact comment anchors so CI can verify coverage:

```
// TEST: FR-2.8 native-setter
// TEST: FR-2.8 input-event-bubbles
// TEST: FR-2.8 change-event-bubbles
// TEST: FR-2.4 select-exact-match
// TEST: FR-2.4 select-case-insensitive
// TEST: FR-2.4 select-no-match-returns-false
// TEST: FR-2.5 checkbox-checked-and-change
// TEST: FR-2.5 radio-checked-click-change
// TEST: NFR-5.1 fill-lock-blocks-concurrent
// TEST: NFR-5.1 end-fill-releases-lock
// TEST: FR-2.2 shadow-query-open-root
// TEST: FR-2.2 shadow-query-not-found
// TEST: NFR-3.3 wait-resolves-on-appear
// TEST: NFR-3.3 wait-rejects-on-timeout
```

Verify all anchors present:
```bash
grep -r "// TEST:" tests/unit/ | wc -l
# Expected: 14
```

### Sampling Rate
- **Per task commit:** `node tests/unit/events.test.js && node tests/unit/filler.test.js`
- **Per wave merge:** `node tests/run-all.js`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/unit/events.test.js` — covers FR-2.8, FR-2.4, FR-2.5
- [ ] `tests/unit/filler.test.js` — covers NFR-5.1, FR-2.2, NFR-3.3
- [ ] `tests/run-all.js` — test runner that executes all unit files
- [ ] `tests/helpers/dom-mock.js` — minimal DOM mock (HTMLInputElement, Event, MutationObserver stubs) for Node.js
- [ ] No framework install needed — uses Node.js built-in `node:test` and `node:assert` (Node 18+)

---

## Sources

### Primary (HIGH confidence)
- CONCERNS.md (this project) — ATS Platform Pitfalls: React controlled component rejection, Shadow DOM traversal, MutationObserver memory leak, fill lock
- REQUIREMENTS.md (this project) — FR-2.8 (React/Angular event dispatch), NFR-5.1 (fill lock), NFR-3.2/3.3 (timing)

### Secondary (MEDIUM confidence)
- React issue #14694 (github.com/facebook/react/issues/14694) — native setter + bubbling input event requirement, verified HIGH in CONCERNS.md
- wavebeem.com/blog/2024/querying-shadow-dom/ — shadow DOM recursive traversal patterns, cited in CONCERNS.md
- job_app_filler open-source extension (github.com/berellevy/job_app_filler) — real-world React autofill reference implementation

### Tertiary (LOW confidence)
- Angular reactive forms event behavior — inferred from Angular docs pattern, not directly verified for this project's specific ATS targets

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — pure vanilla JS, zero deps, matches NFR-1.2
- Architecture: HIGH — patterns sourced from CONCERNS.md (HIGH confidence items) and verified React issue
- Pitfalls: HIGH — all critical pitfalls directly referenced in project CONCERNS.md with HIGH confidence ratings
- Validation: MEDIUM — test file structure is new (Wave 0 gaps), but test cases map directly to requirements

**Research date:** 2026-03-14
**Valid until:** 2026-09-14 (stable browser APIs — these patterns have been stable since Chrome 53/React 16)
