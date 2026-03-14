# Phase 6: Content Script Coordinator & Fill Overlay — Research

**Researched:** 2026-03-14
**Domain:** Chrome MV3 Content Scripts, Shadow DOM, MutationObserver, Message Passing
**Confidence:** HIGH

---

## Summary

Phase 6 implements two files: `content.js` (the IIFE coordinator that boots platform detection, message handling, and SPA navigation watching) and `utils/overlay.js` (Shadow DOM floating UI — fill button and result overlay). All foundation utilities are already live: `window.JobFill.storage`, `window.JobFill.filler`, and `window.JobFill.events` are available when `content.js` runs because content script load order is guaranteed by manifest declaration order.

The central design decisions are already locked by prior research and requirements: Shadow DOM isolation for the overlay (FR-4.2, NFR-4.1), fill lock via `window.JobFill.filler.startFill()`/`endFill()` (NFR-5.1), non-async `onMessage` listener returning `true` (required by Chrome), and graceful "Extension context invalidated" handling (NFR-5.2, NFR-4.4). The MutationObserver must be disconnected when the overlay is dismissed to prevent memory leaks.

Platform modules (`window.JobFill.platforms`) are not yet available in Phase 6 (implemented in Phases 7–8). `content.js` must handle the no-platform-detected case by showing a generic fill button. The fill path in Phase 6 will call a placeholder `runFill()` that returns a mock result set; real platform fill logic integrates in later phases.

**Primary recommendation:** Build `utils/overlay.js` first (pure DOM/Shadow DOM, no Chrome API dependencies), then wire `content.js` to call it. Both files are self-contained IIFEs — test each in isolation by loading the extension and inspecting the Shadow DOM host element via DevTools.

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| FR-2.1 | Detect ATS platform by hostname | `Object.values(window.JobFill.platforms).find(p => p.matches(hostname))` — platforms object populated by Phase 7-8; content.js must handle empty object gracefully |
| FR-2.7 | Trigger fill via floating page button | overlay.showButton() in Shadow DOM; button click posts DO_FILL internally or calls runFill() directly |
| FR-4.1 | Floating overlay summarises fill results: filled/skipped/failed/needs-review | overlay.showResults(results) renders colour-coded rows inside Shadow DOM |
| FR-4.2 | Overlay in Shadow DOM — style isolation | attachShadow({ mode: 'open' }) on a host div appended to document.body |
| FR-4.3 | Each row: field label, status, value/reason | Data comes from fill result array shape in REQUIREMENTS.md data model |
| FR-4.4 | Needs-review items clickable → open answer bank entry | chrome.runtime.sendMessage({ type: 'OPEN_ANSWER_BANK', id }) from content script |
| FR-4.5 | Overlay dismissible; stores last fill status in session storage | X button calls overlay.dismiss(); storage.saveFillStatus() already implemented |
| FR-4.6 | Overlay position: bottom-right, draggable; position saved in settings | Drag via mousedown/mousemove/mouseup on overlay header; persist via storage.saveSettings() |
| NFR-4.4 | All chrome.runtime calls wrapped in try/catch | Applies to onMessage listener and any sendMessage calls in overlay click handlers |
| NFR-5.1 | Fill lock prevents concurrent fills | filler.startFill() / endFill() already implemented — content.js must check isFilling() before runFill() |
| NFR-5.2 | Extension context invalidated → show reload banner | Catch in onMessage; show non-crashing banner via overlay.showBanner() |
| NFR-3.1 | MutationObserver callback must be fast — no sync storage reads | Observer callback only checks for new inputs, then calls showButton() — never reads storage |
</phase_requirements>

---

## Standard Stack

### Core (all vanilla JS, no npm)

| Component | API / Pattern | Purpose | Confidence |
|-----------|--------------|---------|-----------|
| Shadow DOM | `attachShadow({ mode: 'open' })` | Scoped overlay styles; prevents ATS CSS bleed | HIGH |
| MutationObserver | `new MutationObserver(cb)` on `document.body` | Detect SPA form navigation, re-show fill button | HIGH |
| `chrome.runtime.onMessage` | Non-async listener, `return true` | Receive DO_FILL from background/popup trigger path | HIGH |
| `chrome.storage.session` | `window.JobFill.storage.saveFillStatus()` | Persist last fill results (already implemented) | HIGH |
| `chrome.storage.sync` | `window.JobFill.storage.getSettings()` / `saveSettings()` | Read/write overlay position (already implemented) | HIGH |
| `window.JobFill.filler` | `startFill()`, `endFill()`, `isFilling()` | Fill lock (already implemented in Phase 4) | HIGH |
| IIFE pattern | `(function(){ ... })()` | Module encapsulation, no build tools | HIGH |
| `window.JobFill` namespace | `window.JobFill = window.JobFill || {}` | Shared namespace across content script files | HIGH |

### Installation

No npm install needed. All vanilla JS loaded via manifest `content_scripts.js` array.

---

## Architecture Patterns

### Recommended File Structure

```
content.js                  # Coordinator IIFE — boots last, calls all utils
utils/
  overlay.js                # window.JobFill.overlay — Shadow DOM UI
  filler.js                 # window.JobFill.filler — fill lock, fillField (Phase 4, done)
  storage.js                # window.JobFill.storage — all storage ops (Phase 2, done)
  events.js                 # window.JobFill.events — React-safe event dispatch (Phase 3, done)
```

### Pattern 1: Non-Async onMessage Listener with Fill Lock

The `onMessage` listener in `content.js` MUST NOT be `async`. An async function returns a Promise, which Chrome treats as `undefined` (falsy) — the response channel closes immediately before `sendResponse` is called.

```js
// content.js
chrome.runtime.onMessage.addListener(function(msg, _sender, sendResponse) {
  if (msg.type === 'DO_FILL') {
    if (window.JobFill.filler.isFilling()) {
      sendResponse({ error: 'fill_in_progress' });
      return true;
    }
    runFill().then(sendResponse).catch(function(err) {
      sendResponse({ error: err.message });
    });
    return true; // MANDATORY — keeps channel open for async response
  }
});
```

Source: Chrome Docs — Message Passing (confirmed: `return true` is the only signal Chrome recognises)

### Pattern 2: Shadow DOM Overlay Host

Mount the overlay inside an open Shadow DOM so ATS page styles cannot reach extension elements.

```js
// utils/overlay.js — skeleton
window.JobFill.overlay = (function() {
  let _host = null;
  let _shadow = null;
  let _observer = null; // reference kept so content.js can disconnect

  function _ensureHost() {
    if (_host) return;
    _host = document.createElement('div');
    _host.id = 'jobfill-overlay-host';
    // position/z-index on the host element (outside shadow) is safe
    _host.style.cssText = 'position:fixed;bottom:16px;right:16px;z-index:2147483647;';
    document.body.appendChild(_host);
    _shadow = _host.attachShadow({ mode: 'open' });
    // inject scoped styles into shadow root
    const style = document.createElement('style');
    style.textContent = '/* all overlay styles here — scoped to shadow */';
    _shadow.appendChild(style);
  }

  function showButton() { /* render fill button in _shadow */ }
  function showResults(results) { /* render result rows */ }
  function showBanner(msg) { /* extension invalidated warning */ }
  function dismiss() { if (_host) _host.remove(); _host = null; _shadow = null; }
  function setObserverRef(obs) { _observer = obs; } // so dismiss() can disconnect it

  return { showButton, showResults, showBanner, dismiss, setObserverRef };
})();
```

### Pattern 3: MutationObserver with Disconnect-on-Dismiss

Observer fires on every DOM insertion on SPAs (Workday, LinkedIn). Keep callback fast — no storage reads inside it.

```js
// content.js
function startObserver() {
  const obs = new MutationObserver(function(mutations) {
    const hasInputs = mutations.some(function(m) {
      return Array.from(m.addedNodes).some(function(n) {
        return n.nodeType === 1 &&
          (n.matches('input,select,textarea') ||
           n.querySelector('input,select,textarea'));
      });
    });
    if (hasInputs) window.JobFill.overlay.showButton();
  });
  obs.observe(document.body, { childList: true, subtree: true });
  // Pass reference to overlay so dismiss() can call obs.disconnect()
  window.JobFill.overlay.setObserverRef(obs);
  return obs;
}
```

Source: MDN MutationObserver.disconnect() + CONCERNS.md §3 (MutationObserver memory leak)

### Pattern 4: Draggable Overlay with Persisted Position

Drag logic must live entirely inside the Shadow DOM event handlers. Position is saved to `chrome.storage.sync` via `storage.saveSettings()` on `mouseup`.

```js
// Inside overlay.js showResults() / showButton() setup
header.addEventListener('mousedown', function(e) {
  let startX = e.clientX, startY = e.clientY;
  let origRight  = parseInt(_host.style.right)  || 16;
  let origBottom = parseInt(_host.style.bottom) || 16;

  function onMove(ev) {
    const dx = ev.clientX - startX;
    const dy = ev.clientY - startY;
    _host.style.right  = (origRight  - dx) + 'px';
    _host.style.bottom = (origBottom + dy) + 'px';
  }
  function onUp() {
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
    window.JobFill.storage.getSettings().then(function(s) {
      s.overlayRight  = _host.style.right;
      s.overlayBottom = _host.style.bottom;
      window.JobFill.storage.saveSettings(s);
    });
  }
  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', onUp);
});
```

Note: mousemove/mouseup listeners are on `document` (outside shadow), because mouse can leave the overlay during drag. This is standard drag implementation pattern.

### Pattern 5: Extension Context Invalidated Guard

Wrap every `chrome.runtime` call in content scripts.

```js
// content.js — reusable guard
function safeRuntimeCall(fn) {
  try {
    return fn();
  } catch (err) {
    if (err.message && err.message.includes('Extension context invalidated')) {
      window.JobFill.overlay.showBanner(
        'JobFill was updated — please reload this tab.'
      );
    } else {
      console.warn('[JobFill]', err.message);
    }
    return null;
  }
}
```

Source: CONCERNS.md §1 (Extension context invalidated) + NFR-5.2

### Anti-Patterns to Avoid

- **Async onMessage listener:** Returns a Promise instead of `true` — channel closes before response arrives.
- **Storage reads inside MutationObserver callback:** Violates NFR-3.1; blocks the mutation processing queue.
- **Appending overlay directly to `document.body` without Shadow DOM:** ATS page CSS (e.g., `* { box-sizing: border-box }`, `button { all: unset }`) bleeds into overlay.
- **Never disconnecting the MutationObserver:** Memory leak; accumulates records for the entire tab lifetime.
- **Relying on `window.JobFill.platforms` existing at init time:** Phase 6 runs before Phase 7-8 platform modules. Guard with `window.JobFill.platforms || {}`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Style isolation | Custom CSS reset / iframe | Shadow DOM `attachShadow` | Shadow root is a hard browser boundary; resets leak or break |
| Fill lock | Custom semaphore/queue | `filler.startFill()` / `endFill()` | Already implemented in Phase 4 |
| Storage persistence | Direct chrome.storage calls | `window.JobFill.storage.*` | Quota error handling already wrapped |
| Drag-and-drop library | Import any drag lib | 20-line mousedown/move/up pattern | Zero dependencies (NFR-1.4); libraries require bundler (NFR-1.2) |
| Message bus | Custom event system | `chrome.runtime.onMessage` | Chrome's built-in messaging is the only legal cross-context channel |

---

## Common Pitfalls

### Pitfall 1: Async onMessage Breaks Response Channel
**What goes wrong:** `async function(msg, _, sendResponse)` causes the listener to return a Promise. Chrome sees a falsy return, closes the channel. `sendResponse` is called into the void — popup/background never receives the fill result.
**How to avoid:** Non-async listener, explicit `return true`, inner async helper called via `.then(sendResponse)`.
**Warning signs:** Console shows "The message channel closed before a response was received."

### Pitfall 2: Shadow DOM Styles Don't Apply
**What goes wrong:** Styles added to `document.head` or the host element's `className` are not scoped into the shadow root. Shadow root has its own style scope.
**How to avoid:** Inject a `<style>` element directly into `_shadow` (the shadow root), not into `document.head`.
**Warning signs:** Overlay renders but has no styling; browser DevTools shows styles not applying.

### Pitfall 3: MutationObserver Fires on Overlay's Own DOM Changes
**What goes wrong:** Observer on `document.body` with `subtree: true` fires when `overlay.showButton()` appends elements to `_host`. The callback detects "new inputs" from its own overlay and calls `showButton()` again — infinite loop.
**How to avoid:** Check that detected inputs are not inside `_host` (the overlay host element). Guard: `if (n.closest('#jobfill-overlay-host')) return false`.
**Warning signs:** Browser tab freezes or DevTools shows thousands of MutationObserver calls per second.

### Pitfall 4: Drag mousemove Listener Leaks
**What goes wrong:** If mouseup fires outside the overlay (common during fast drag), the mouseup listener registered on `document` never removes itself. Multiple drag-start actions accumulate `mousemove` handlers, causing jitter.
**How to avoid:** Always `document.removeEventListener('mousemove', onMove)` AND `document.removeEventListener('mouseup', onUp)` inside the `onUp` handler. Use named functions, not arrow function literals, so the same reference is passed to both `add` and `remove`.

### Pitfall 5: `chrome.storage.session` Inaccessible from Content Script
**What goes wrong:** `storage.saveFillStatus()` throws "Access denied to storage.session" because Phase 3 (background.js) must call `chrome.storage.session.setAccessLevel(...)` before session storage works from content scripts.
**How to avoid:** This is handled in Phase 3's background.js. Content script can assume it is available. If it fails, catch and log — do not crash.
**Warning signs:** `chrome.runtime.lastError` message mentions "TRUSTED_CONTEXTS".

### Pitfall 6: Overlay Not Visible Under ATS z-index Stacks
**What goes wrong:** Some ATS pages (LinkedIn modal, Workday full-screen overlay) set `z-index: 9999999` on their modal containers. The overlay host element sits behind them.
**How to avoid:** Set `z-index: 2147483647` (max 32-bit integer) on the host element's inline style. This is outside the Shadow DOM so it applies at page level.

---

## Code Examples

### Full content.js Skeleton

```js
// content.js — IIFE coordinator, loaded last in content_scripts array
(function() {
  'use strict';

  window.JobFill = window.JobFill || {};

  const hostname = window.location.hostname;
  const platforms = window.JobFill.platforms || {};

  // Detect platform — may be undefined if Phase 7-8 not yet loaded
  let _platform = Object.values(platforms).find(function(p) {
    return p.matches(hostname);
  }) || null;

  // --- Fill entry point ---
  async function runFill() {
    if (!window.JobFill.filler.startFill()) {
      return { error: 'fill_in_progress' };
    }
    try {
      const profile = await window.JobFill.storage.getProfile();
      if (!profile) return { error: 'no_profile' };

      let results;
      if (_platform) {
        const answerBank = await window.JobFill.storage.getAnswerBank();
        results = await _platform.fill(profile, answerBank);
      } else {
        // Generic fill placeholder — Phase 9 implements real generic filler
        results = [{ field: 'Platform', status: 'skipped', reason: 'Platform not detected' }];
      }

      // Persist and show overlay
      await window.JobFill.storage.saveFillStatus(null, results);
      window.JobFill.overlay.showResults(results);
      return { ok: true, count: results.length };
    } catch (err) {
      return { error: err.message };
    } finally {
      window.JobFill.filler.endFill();
    }
  }

  // --- Message listener (non-async, return true for async response) ---
  chrome.runtime.onMessage.addListener(function(msg, _sender, sendResponse) {
    try {
      if (msg.type === 'DO_FILL') {
        runFill().then(sendResponse).catch(function(err) {
          sendResponse({ error: err.message });
        });
        return true;
      }
    } catch (err) {
      if (err.message && err.message.includes('Extension context invalidated')) {
        window.JobFill.overlay.showBanner('JobFill was updated — please reload this tab.');
      }
    }
  });

  // --- SPA navigation watcher ---
  const _observer = new MutationObserver(function(mutations) {
    const hasNewInputs = mutations.some(function(m) {
      return Array.from(m.addedNodes).some(function(n) {
        return n.nodeType === 1 &&
          !n.closest('#jobfill-overlay-host') &&
          (n.matches('input,select,textarea') ||
           n.querySelector('input,select,textarea'));
      });
    });
    if (hasNewInputs) window.JobFill.overlay.showButton(runFill);
  });
  _observer.observe(document.body, { childList: true, subtree: true });
  window.JobFill.overlay.setObserverRef(_observer);

  // --- Initial render ---
  window.JobFill.overlay.showButton(runFill);

})();
```

### Shadow DOM Host Bootstrap (overlay.js)

```js
// utils/overlay.js
window.JobFill = window.JobFill || {};

window.JobFill.overlay = (function() {
  'use strict';

  let _host = null;
  let _shadow = null;
  let _obs = null;

  const STATUS_COLORS = {
    filled:       '#22c55e',  // green
    skipped:      '#eab308',  // yellow
    failed:       '#ef4444',  // red
    needs_review: '#f97316',  // orange
  };

  function _ensureHost() {
    if (_host) return;
    _host = document.createElement('div');
    _host.id = 'jobfill-overlay-host';
    _host.style.cssText = [
      'position:fixed',
      'bottom:16px',
      'right:16px',
      'z-index:2147483647',
      'font-family:sans-serif',
    ].join(';');
    document.body.appendChild(_host);
    _shadow = _host.attachShadow({ mode: 'open' });
    const style = document.createElement('style');
    style.textContent = `
      .jf-panel { background:#fff; border:1px solid #e5e7eb; border-radius:8px;
                  box-shadow:0 4px 12px rgba(0,0,0,.15); min-width:280px; max-width:360px; }
      .jf-header { display:flex; justify-content:space-between; align-items:center;
                   padding:8px 12px; background:#6366f1; color:#fff; border-radius:8px 8px 0 0;
                   cursor:move; user-select:none; }
      .jf-close  { background:none; border:none; color:#fff; cursor:pointer; font-size:16px; }
      .jf-row    { display:flex; gap:8px; padding:6px 12px; border-bottom:1px solid #f3f4f6;
                   font-size:13px; align-items:baseline; }
      .jf-dot    { width:8px; height:8px; border-radius:50%; flex-shrink:0; margin-top:3px; }
      .jf-btn    { display:block; width:100%; padding:8px 0; background:#6366f1; color:#fff;
                   border:none; border-radius:8px; font-size:14px; cursor:pointer; text-align:center; }
    `;
    _shadow.appendChild(style);
  }

  function showButton(onFill) {
    _ensureHost();
    _shadow.innerHTML = '';  // clear previous content (re-adds style via _ensureHost re-entry guard — handle carefully)
    // Re-inject style after clearing
    const style = _shadow.querySelector('style') || document.createElement('style');
    // ... (attach button, wire click to onFill callback)
  }

  function showResults(results) { /* render rows */ }
  function showBanner(msg) { /* inline warning banner */ }
  function dismiss() {
    if (_obs) { _obs.disconnect(); _obs = null; }
    if (_host) { _host.remove(); _host = null; _shadow = null; }
  }
  function setObserverRef(obs) { _obs = obs; }

  return { showButton, showResults, showBanner, dismiss, setObserverRef };
})();
```

Note: `_shadow.innerHTML = ''` clears the injected `<style>` tag too. Correct pattern is to maintain a separate container element inside the shadow root and only clear the container, not the full shadow root.

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|-----------------|--------|
| Inject iframe for style isolation | Shadow DOM `attachShadow` | Shadow DOM is spec-native; iframe needs cross-origin messaging |
| Polling for new form elements (`setInterval`) | `MutationObserver` | MutationObserver fires synchronously on each DOM mutation batch; zero polling overhead |
| `element.value = x` for React inputs | Native prototype setter + bubbling events | React's internal fiber state is updated correctly |

---

## Validation Architecture

> `nyquist_validation` is `true` in `.planning/config.json` — section included.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Manual browser testing (no unit test framework detected in project) |
| Config file | none — load unpacked at `chrome://extensions` |
| Quick run command | Load extension, open Greenhouse test URL, open DevTools |
| Full suite command | Load extension, test each trigger path (popup button, keyboard shortcut, message) |

Note: The project uses vanilla JS with no bundler or test runner. Automated tests would require a browser automation tool (Playwright/Puppeteer) running against a real Chrome instance with the extension loaded — this is a separate test repo concern per CONCERNS.md §6. Phase 6 validation is manual browser smoke testing.

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Verification Method | Notes |
|--------|----------|-----------|---------------------|-------|
| FR-4.2 | Overlay in Shadow DOM | smoke | DevTools > Elements: `#jobfill-overlay-host` has `#shadow-root (open)` | Manual |
| FR-4.1 | Filled/skipped/failed/needs-review colour rows | smoke | Trigger fill on Greenhouse test form, inspect overlay rows | Manual |
| FR-4.3 | Each row shows field, status, value | smoke | Inspect overlay rows after fill | Manual |
| FR-4.5 | Dismiss button removes overlay | smoke | Click X; `document.getElementById('jobfill-overlay-host')` returns null | Manual |
| FR-4.6 | Draggable, position saved | smoke | Drag overlay; reload tab; verify position restored from settings | Manual |
| FR-2.7 | Floating fill button visible on ATS page | smoke | Navigate to Greenhouse job; verify button appears bottom-right | Manual |
| NFR-5.1 | Fill lock prevents double-trigger | smoke | Click fill button twice rapidly; only one fill runs (check console) | Manual |
| NFR-5.2 | Invalidated context shows reload banner | smoke | Reload extension while ATS tab open; click fill button; banner appears | Manual |
| NFR-3.1 | No storage reads in MutationObserver | code review | Inspect observer callback in content.js for any `chrome.storage` calls | Code review |
| FR-4.4 | Needs-review items clickable | smoke | Trigger fill with low-confidence answer bank match; click orange row | Requires Phase 5 answer bank data |

### Sampling Rate

- **Per task commit:** Load extension, navigate to any ATS URL, verify overlay host mounts and fill button appears
- **Per wave merge:** All 10 rows in the test map above
- **Phase gate:** All smoke tests green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] No automated test harness — all validation is manual load-unpacked browser testing
- [ ] `utils/overlay.js` is a stub (3 lines) — full implementation is Phase 6 Wave 1
- [ ] `content.js` is a stub (3 lines) — full implementation is Phase 6 Wave 1
- [ ] Needs-review click test (FR-4.4) depends on answer bank data from Phase 5

---

## Open Questions

1. **`_shadow.innerHTML = ''` clears injected styles**
   - What we know: Setting `innerHTML` on a shadow root wipes all children including the `<style>` tag.
   - What's unclear: Best pattern for re-rendering without re-appending styles each time.
   - Recommendation: Keep a `_container` div inside the shadow root. Only clear `_container.innerHTML`. The `<style>` tag stays. Planner should specify this in the task.

2. **Overlay re-show after SPA navigation when previous overlay is still open**
   - What we know: `showButton()` is called by the MutationObserver when new inputs appear.
   - What's unclear: If overlay is already showing results, should `showButton()` replace it, add a second button, or do nothing?
   - Recommendation: Check `_host !== null` — if overlay already open, do not replace; let user dismiss first.

3. **`storage.saveFillStatus()` tabId parameter**
   - What we know: `storage.saveFillStatus(tabId, results)` requires a tabId. Content scripts do not have direct access to their own tab ID via Chrome API.
   - What's unclear: How does content.js know its own tabId?
   - Recommendation: Pass `null` as tabId from content.js (acceptable per storage.js implementation — it stores whatever is passed); or background.js injects tabId into the DO_FILL message payload. The latter is cleaner. Planner should decide.

---

## Sources

### Primary (HIGH confidence)
- Chrome Docs: Content Scripts — isolated world, available APIs, file ordering guarantee
- Chrome Docs: Message Passing — `return true` requirement, async response patterns
- Chrome Docs: chrome.storage API — session.setAccessLevel, sync quota limits
- MDN: `MutationObserver.disconnect()` — memory leak prevention
- MDN: `Element.attachShadow()` — Shadow DOM host, mode: 'open'
- Project STACK.md — content script architecture, window.JobFill namespace pattern
- Project CONCERNS.md — content script pitfalls, extension context invalidated handling
- Project REQUIREMENTS.md — FR-4.x and NFR-4.x requirements
- `utils/storage.js` (read directly) — saveFillStatus, getSettings, saveSettings signatures
- `utils/filler.js` (read directly) — startFill, endFill, isFilling API

### Secondary (MEDIUM confidence)
- Project FEATURES.md §2 — Shadow DOM overlay design decisions
- Project CONCERNS.md §3 — MutationObserver infinite loop risk from own DOM mutations

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all APIs are native browser/Chrome platform, verified against official docs and existing project code
- Architecture: HIGH — patterns derived from existing implemented utils (filler.js, storage.js) and official Chrome message passing docs
- Pitfalls: HIGH — MutationObserver loop risk and async onMessage are well-documented Chrome extension gotchas; confirmed in CONCERNS.md

**Research date:** 2026-03-14
**Valid until:** 2026-06-14 (Chrome platform is stable; re-verify if Chrome 136+ ships breaking Shadow DOM changes)
