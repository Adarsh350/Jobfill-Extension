# Phase 3: Background Service Worker - Research

**Researched:** 2026-03-14
**Domain:** Chrome MV3 Service Worker — message routing, keyboard commands, session storage initialization
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| BGW-01 | `chrome.storage.session.setAccessLevel({ accessLevel: 'TRUSTED_AND_UNTRUSTED_CONTEXTS' })` called at top level on SW startup | Verified in STACK.md §3 — must run before any content script calls `chrome.storage.session` |
| BGW-02 | `chrome.runtime.onMessage` listener registered synchronously at top level, NOT async | Verified in STACK.md §4 — async listener returns Promise, Chrome treats it as falsy, closes channel immediately |
| BGW-03 | Handle `TRIGGER_FILL`: query active tab, send `DO_FILL` to content script, forward response to popup | Two-hop pattern confirmed in STACK.md §5 |
| BGW-04 | Handle `GET_STATUS`: read `lastFillStatus` from session storage via `storage.js`, return to popup | `getFillStatus(tabId)` available in `utils/storage.js` Phase 2 output |
| BGW-05 | Handle `EXPORT_DATA`: read profile + answer bank, return as JSON object | `getProfile()` + `getAnswerBank()` available in `utils/storage.js` |
| BGW-06 | Handle `IMPORT_DATA`: validate + write profile + answer bank | `saveProfile()` + `saveAnswerBank()` available; validation must be inline (no external deps) |
| BGW-07 | `chrome.commands.onCommand` listener for `"fill-form"` keyboard shortcut — same flow as TRIGGER_FILL | `commands` permission + manifest `"fill-form": { "suggested_key": { "default": "Alt+Shift+F" } }` already in manifest |
| BGW-08 | Error handling: tab not found, content script not responding, extension context invalidated | Must wrap `chrome.tabs.sendMessage` calls; check `chrome.runtime.lastError` |
</phase_requirements>

---

## Summary

Phase 3 implements `background.js` as a pure MV3 service worker — a stateless message router with no persistent in-memory state. Its three responsibilities are: (1) call `chrome.storage.session.setAccessLevel` at startup so content scripts can read/write session storage, (2) route messages between the popup and content scripts since the popup cannot reach content scripts directly, and (3) fire the same fill flow when the `Alt+Shift+F` keyboard shortcut is pressed.

All implementation constraints are already well-documented from Phase 1/2 research. The critical rules are: never mark the `onMessage` listener `async`, always `return true` from async branches, register all listeners synchronously at the top level, and never cache data in module-level variables. The `utils/storage.js` from Phase 2 provides all storage operations — `background.js` calls those functions directly.

The service worker has no DOM, no `window` object, and no `document`. It runs in a worker context with full access to Chrome extension APIs. For JobFill's routing-only pattern, 30-second termination is not a concern — each incoming message event resets the timer and completes fast.

**Primary recommendation:** Implement `background.js` as a single flat file (~120 lines) with top-level listener registration and async helper functions called from within synchronous listeners. No classes, no modules, no dynamic registration.

---

## Standard Stack

### Core APIs (no installation — built into Chrome MV3)

| API | Purpose | Critical Rule |
|-----|---------|---------------|
| `chrome.runtime.onMessage` | Receive messages from popup and content scripts | Listener MUST be non-async; `return true` for async branches |
| `chrome.tabs.query` | Find the active tab to route `DO_FILL` to content script | Requires `"tabs"` permission; already in manifest |
| `chrome.tabs.sendMessage` | Send `DO_FILL` message to content script | Must check `chrome.runtime.lastError` in callback |
| `chrome.storage.session` | Read/write `lastFillStatus`; `setAccessLevel` on startup | `setAccessLevel` must be top-level, not in a callback |
| `chrome.storage.sync` | Read profile + answer bank for EXPORT/IMPORT | Use async/await; wrap in try/catch for quota errors |
| `chrome.commands.onCommand` | Keyboard shortcut `"fill-form"` trigger | Listener registered at top level synchronously |
| `chrome.scripting.executeScript` | MAIN world fallback for resume file upload (Phase 11) | Requires `"scripting"` permission; already in manifest |

### Supporting Utilities (Phase 2 output — already exists)

| File | Namespace | Functions used by background.js |
|------|-----------|----------------------------------|
| `utils/storage.js` | `window.JobFill.storage` | NOT available in SW context — background.js must call `chrome.storage.*` directly or duplicate thin wrappers inline |

**IMPORTANT:** `utils/storage.js` uses `window.JobFill` namespace. Service workers have NO `window` object. `background.js` CANNOT import or use `utils/storage.js`. All storage calls in `background.js` must call `chrome.storage.*` APIs directly. The storage utility is for content scripts and popup only.

---

## Architecture Patterns

### Recommended File Structure

```
background.js          # single flat file, ~120 lines
                       # NO imports, NO window.* references
                       # All logic inline or in named async helper functions
```

### Pattern 1: Top-Level Listener Registration

**What:** All `chrome.*` event listeners are attached synchronously before any async code runs.
**When to use:** Always — this is the only correct pattern for MV3 service workers.

```js
// Source: STACK.md §4 / Chrome for Developers — Service Worker Lifecycle
// CORRECT
chrome.storage.session.setAccessLevel(
  { accessLevel: 'TRUSTED_AND_UNTRUSTED_CONTEXTS' },
  () => { if (chrome.runtime.lastError) console.warn('[JobFill BG] setAccessLevel:', chrome.runtime.lastError.message); }
);

chrome.runtime.onMessage.addListener(handleMessage);
chrome.commands.onCommand.addListener(handleCommand);

// WRONG — never do this
someAsyncCall().then(() => {
  chrome.runtime.onMessage.addListener(handleMessage); // missed on SW restart
});
```

### Pattern 2: Non-Async onMessage Listener with Async Helper

**What:** The listener function is synchronous and returns `true`; all async work is done in a separate helper.
**When to use:** Any `onMessage` handler that needs async storage reads or cross-tab messaging.

```js
// Source: STACK.md §4 / Chrome for Developers — Message Passing
function handleMessage(msg, sender, sendResponse) {
  if (msg.type === 'TRIGGER_FILL') {
    triggerFill(sendResponse);
    return true;  // MANDATORY — keeps response channel open
  }
  if (msg.type === 'GET_STATUS') {
    getStatus(msg.tabId, sendResponse);
    return true;
  }
  if (msg.type === 'EXPORT_DATA') {
    exportData(sendResponse);
    return true;
  }
  if (msg.type === 'IMPORT_DATA') {
    importData(msg.payload, sendResponse);
    return true;
  }
  // Unknown message — no return true needed
}
```

### Pattern 3: Two-Hop Fill Trigger

**What:** Popup sends `TRIGGER_FILL` to background; background queries active tab and sends `DO_FILL` to content script; background forwards content script response back to popup.
**When to use:** Any time popup needs to communicate with a content script.

```js
// Source: STACK.md §5 — Popup to content script two-hop pattern
async function triggerFill(sendResponse) {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) {
      sendResponse({ error: 'No active tab found' });
      return;
    }
    chrome.tabs.sendMessage(tab.id, { type: 'DO_FILL' }, (response) => {
      if (chrome.runtime.lastError) {
        sendResponse({ error: chrome.runtime.lastError.message });
        return;
      }
      sendResponse(response || { error: 'Content script did not respond' });
    });
  } catch (err) {
    sendResponse({ error: err.message });
  }
}
```

### Pattern 4: Keyboard Command Handler

**What:** `chrome.commands.onCommand` fires with the command name string. Reuse `triggerFill` but with no `sendResponse` (fire-and-forget from keyboard).
**When to use:** `"fill-form"` command (Alt+Shift+F).

```js
// Source: Chrome for Developers — chrome.commands API
function handleCommand(command) {
  if (command === 'fill-form') {
    // No sendResponse needed — keyboard trigger is fire-and-forget
    triggerFill(() => {});
  }
}
```

### Pattern 5: Import Validation (inline, no external deps)

**What:** Validate imported JSON before writing to storage. Check `schemaVersion`, required keys, and data types.
**When to use:** `IMPORT_DATA` message handler.

```js
// Source: FR-5.2, FR-5.5, NFR-5.3 from REQUIREMENTS.md
async function importData(payload, sendResponse) {
  try {
    // payload is already a parsed object (popup calls JSON.parse before sending)
    if (!payload || typeof payload !== 'object') {
      sendResponse({ error: 'Invalid import: not an object' });
      return;
    }
    if (payload.schemaVersion !== 1) {
      sendResponse({ error: 'Invalid import: unsupported schema version' });
      return;
    }
    if (payload.profile && typeof payload.profile === 'object') {
      await chrome.storage.sync.set({ profile: payload.profile });
    }
    if (Array.isArray(payload.answerBank)) {
      // Merge: get existing, deduplicate by id
      const existing = (await chrome.storage.sync.get('answerBank')).answerBank || [];
      const merged = mergeAnswerBank(existing, payload.answerBank);
      await chrome.storage.sync.set({ answerBank: merged });
    }
    sendResponse({ success: true });
  } catch (err) {
    sendResponse({ error: err.message });
  }
}

function mergeAnswerBank(existing, incoming) {
  const map = {};
  for (const e of existing) map[e.id] = e;
  for (const e of incoming) map[e.id] = e; // incoming wins on id collision
  return Object.values(map);
}
```

### Pattern 6: GET_STATUS Handler

**What:** Read `lastFillStatus` from session storage and return to popup. Filter by tabId so popup only sees results for the current tab.

```js
// Source: utils/storage.js Phase 2 — getFillStatus logic (replicated inline for SW context)
async function getStatus(tabId, sendResponse) {
  try {
    const r = await chrome.storage.session.get('lastFillStatus');
    const status = r.lastFillStatus || null;
    const result = (status && status.tabId === tabId) ? status : null;
    sendResponse({ status: result });
  } catch (err) {
    sendResponse({ error: err.message });
  }
}
```

### Anti-Patterns to Avoid

- **Async listener:** `chrome.runtime.onMessage.addListener(async (msg, sender, sendResponse) => {...})` — the Promise return closes the channel. Never do this.
- **Listeners in callbacks:** Registering listeners inside `.then()` or other async callbacks — they are never reached on SW re-activation.
- **Caching profile in SW variables:** `let cachedProfile = null` at module scope — reset to null on every SW restart.
- **`window.JobFill.storage` in background.js:** `window` does not exist in a service worker context. Calling it throws `ReferenceError`.
- **`return true` on synchronous paths:** Only needed on branches that call `sendResponse` asynchronously. Returning `true` on a path that calls `sendResponse` synchronously is harmless but unnecessary.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Message routing to content scripts | Custom event bus, postMessage relay | `chrome.tabs.sendMessage` + `chrome.runtime.onMessage` | Chrome's built-in message passing handles context lifetime, serialization, and cleanup |
| Keyboard shortcut detection | `document.addEventListener('keydown', ...)` in SW | `chrome.commands.onCommand` | No `document` in SW; commands API handles key capture across all contexts including non-extension pages |
| Session storage access from content scripts | Passing fill status via postMessage | `chrome.storage.session` with `setAccessLevel` | Purpose-built for cross-context ephemeral data; survives SW restart within same browser session |
| JSON schema validation library | Import ajv, zod, or similar | Inline type checks (`typeof`, `Array.isArray`, key presence) | No npm; no bundler; inline checks sufficient for a single known schema |

**Key insight:** The service worker's job is routing and initialization only — no business logic. All fill logic lives in content scripts; all storage logic lives in `utils/storage.js` (for non-SW contexts). `background.js` is intentionally thin.

---

## Common Pitfalls

### Pitfall 1: Async `onMessage` Listener Closes Channel Immediately
**What goes wrong:** Marking the listener `async` causes it to return a Promise. Chrome only recognizes literal `true` to keep the channel open — a Promise is falsy, so the channel closes before `sendResponse` is called. `sendResponse` becomes a no-op; popup receives `undefined`.
**Why it happens:** Chrome's messaging API predates Promises; it uses the legacy boolean sentinel pattern.
**How to avoid:** The listener function must be a regular (non-async) function. Call an async helper inside it and `return true` synchronously.
**Warning signs:** Popup callback receives `undefined` or `chrome.runtime.lastError` "The message channel closed before a response was received."

### Pitfall 2: Listener Registration Inside Async Callback
**What goes wrong:** `chrome.storage.sync.get('settings').then(() => { chrome.runtime.onMessage.addListener(...) })` — on the first SW start it works. After a 30-second idle the SW is killed. On the next message wake-up, Chrome re-runs `background.js` synchronously top-to-bottom. The async `.then()` has not resolved yet when Chrome checks for registered listeners. The listener is never registered, message is silently dropped.
**Why it happens:** SW lifecycle — re-activation runs sync phase immediately, async callbacks run after.
**How to avoid:** All `addListener` calls at the top level of `background.js`, synchronous, before any `await`.
**Warning signs:** Works on first extension load, stops working after browser has been idle for ~30 seconds.

### Pitfall 3: `window.JobFill.storage` Not Available in SW
**What goes wrong:** `background.js` tries to call `window.JobFill.storage.getProfile()` — throws `ReferenceError: window is not defined`.
**Why it happens:** Service workers run in a worker context, not a browser page context. There is no `window` object.
**How to avoid:** Call `chrome.storage.sync.get('profile')` directly in background.js. The storage.js utility is for content scripts and popup.js only.
**Warning signs:** `ReferenceError: window is not defined` in the SW console.

### Pitfall 4: `chrome.tabs.sendMessage` with No Content Script Injected
**What goes wrong:** User opens a non-ATS tab (e.g. `chrome://extensions`) and presses Alt+Shift+F. Background queries active tab, sends `DO_FILL` to a tab with no content script. `chrome.runtime.lastError` is set: "Could not establish connection. Receiving end does not exist."
**Why it happens:** `chrome.tabs.sendMessage` fails silently if no listener is registered in the target tab.
**How to avoid:** Check `chrome.runtime.lastError` inside the `sendMessage` callback. Send a friendly `{ error: 'Content script not available on this page' }` response rather than letting the error propagate.
**Warning signs:** Keyboard shortcut appears to do nothing; `chrome.runtime.lastError` in SW console.

### Pitfall 5: `setAccessLevel` Called After Content Script Tries Session Read
**What goes wrong:** If `setAccessLevel` is called inside a callback or deferred, a content script that runs before the SW has settled may try to read `chrome.storage.session` and get an access denied error.
**Why it happens:** `setAccessLevel` is required before content scripts can access session storage. If it hasn't completed yet, reads fail.
**How to avoid:** Call `chrome.storage.session.setAccessLevel(...)` as the very first line of `background.js`, before any other code. Use the callback form (not await) so it fires as early as possible.
**Warning signs:** Content script console shows "Access to storage is not allowed from this context."

### Pitfall 6: Import Payload Contains `resume` Key
**What goes wrong:** EXPORT_DATA (FR-5.1) explicitly excludes resume. But if a user manually edits the export JSON and adds a `resume` field, IMPORT_DATA writes a large base64 blob to `chrome.storage.sync`, exceeding the 8,192-byte per-item limit.
**Why it happens:** Import handler does not filter out keys it doesn't expect.
**How to avoid:** IMPORT_DATA handler only reads `profile`, `answerBank`, and `schemaVersion` from the payload. All other keys are silently ignored. Never write to `chrome.storage.sync` with keys outside those three.

---

## Code Examples

### Complete background.js Structure

```js
// Source: STACK.md §4, Chrome for Developers — Service Worker Lifecycle + Message Passing

// --- Initialization (top-level, runs synchronously on every SW activation) ---

chrome.storage.session.setAccessLevel(
  { accessLevel: 'TRUSTED_AND_UNTRUSTED_CONTEXTS' },
  () => {
    if (chrome.runtime.lastError) {
      console.warn('[JobFill BG] setAccessLevel failed:', chrome.runtime.lastError.message);
    }
  }
);

chrome.runtime.onMessage.addListener(handleMessage);
chrome.commands.onCommand.addListener(handleCommand);

// --- Message Router (synchronous entry point) ---

function handleMessage(msg, sender, sendResponse) {
  switch (msg.type) {
    case 'TRIGGER_FILL':  triggerFill(sendResponse);               return true;
    case 'GET_STATUS':    getStatus(msg.tabId, sendResponse);      return true;
    case 'EXPORT_DATA':   exportData(sendResponse);                return true;
    case 'IMPORT_DATA':   importData(msg.payload, sendResponse);   return true;
  }
  // Unknown message type — no async response needed
}

// --- Keyboard Command ---

function handleCommand(command) {
  if (command === 'fill-form') {
    triggerFill(() => {}); // fire-and-forget
  }
}

// --- Async Handlers (called from handleMessage; never registered directly) ---

async function triggerFill(sendResponse) { ... }
async function getStatus(tabId, sendResponse) { ... }
async function exportData(sendResponse) { ... }
async function importData(payload, sendResponse) { ... }
```

### Export Data Handler

```js
// Source: FR-5.1, FR-5.5 — REQUIREMENTS.md
async function exportData(sendResponse) {
  try {
    const { profile } = await chrome.storage.sync.get('profile');
    const { answerBank } = await chrome.storage.sync.get('answerBank');
    sendResponse({
      data: {
        schemaVersion: 1,
        exportedAt: new Date().toISOString(),
        profile: profile || {},
        answerBank: answerBank || [],
        // resume intentionally excluded (FR-5.1)
      }
    });
  } catch (err) {
    sendResponse({ error: err.message });
  }
}
```

### Error Handling Wrapper for Tab Message

```js
// Source: NFR-4.4, NFR-5.2 — REQUIREMENTS.md
async function triggerFill(sendResponse) {
  let tab;
  try {
    [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  } catch (err) {
    // chrome.runtime context invalidated
    sendResponse({ error: 'Extension context invalidated — reload the tab.' });
    return;
  }
  if (!tab) {
    sendResponse({ error: 'No active tab found.' });
    return;
  }
  chrome.tabs.sendMessage(tab.id, { type: 'DO_FILL' }, (response) => {
    if (chrome.runtime.lastError) {
      const msg = chrome.runtime.lastError.message;
      if (msg && msg.includes('invalidated')) {
        sendResponse({ error: 'Extension context invalidated — reload the tab.' });
      } else {
        sendResponse({ error: 'Content script not available on this page.' });
      }
      return;
    }
    sendResponse(response || { error: 'Content script returned no response.' });
  });
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| MV2 background page (persistent) | MV3 service worker (ephemeral) | Chrome 88 (MV3 launch) | No persistent state; listeners must re-register on every activation |
| MV3 5-minute hard stop | No hard stop (event-driven lifetime) | Chrome 110 | Message-routing workers are no longer at risk of mid-operation termination |
| Callback-only storage API | Promise-based storage API natively | Chrome 88+ / MV3 | `await chrome.storage.sync.get(key)` works without promisification wrapper |
| `chrome.extension.sendRequest` | `chrome.runtime.sendMessage` | Chrome 33 | Legacy API removed; `runtime.sendMessage` is the only correct API |

**Deprecated/outdated:**
- Background pages (`"background": { "page": "background.html" }`): MV2 only. Cannot be used in MV3.
- `chrome.extension.getBackgroundPage()`: MV2 only. No equivalent in MV3.
- `chrome.runtime.sendRequest()`: Deprecated since Chrome 33. Use `sendMessage`.

---

## Open Questions

1. **`chrome.tabs.sendMessage` timing for keyboard command on non-ATS pages**
   - What we know: Command fires on any tab, not just ATS tabs. If content script is not injected (e.g. user is on google.com), `sendMessage` will error.
   - What's unclear: Whether to silently ignore or show a Chrome notification.
   - Recommendation: Check `chrome.runtime.lastError` in the callback and log silently — no notification needed for keyboard command, as user will see no fill action and understand.

2. **`chrome.scripting.executeScript` for MAIN world resume fallback (Phase 11)**
   - What we know: `background.js` is where Phase 11 will handle `RESUME_UPLOAD_FALLBACK` messages using `chrome.scripting.executeScript({ world: 'MAIN' })`.
   - What's unclear: This is Phase 11 scope, not Phase 3.
   - Recommendation: Add a stub handler for `RESUME_UPLOAD_FALLBACK` in Phase 3 that returns `{ error: 'Not yet implemented' }` so the message type is registered and does not throw.

---

## Validation Architecture

> `nyquist_validation: true` in config.json — section included.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Manual DevTools inspection (no automated test suite in Milestone 1 — per ROADMAP.md notes) |
| Config file | none |
| Quick run command | Open `chrome://extensions > Inspect` on background service worker |
| Full suite command | UAT script below — manual steps against live extension |

Per ROADMAP.md: "No automated test suite in Milestone 1." All validation is manual DevTools inspection.

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | How to Verify | Infrastructure Exists? |
|--------|----------|-----------|---------------|------------------------|
| BGW-01 | `setAccessLevel` called on SW startup | DevTools inspection | In SW console: `await chrome.storage.session.get('lastFillStatus')` from content script returns data (not access error) | Manual — Wave 0 |
| BGW-02 | `onMessage` listener is non-async, returns `true` | Code review + smoke test | Send `TRIGGER_FILL` from popup; popup callback receives response (not undefined) | Manual — Wave 0 |
| BGW-03 | `TRIGGER_FILL` routes to content script and returns response | Integration test | Click Fill in popup on an ATS page; verify SW console shows tab query + `DO_FILL` sent | Manual — Wave 0 |
| BGW-04 | `GET_STATUS` returns `lastFillStatus` for correct tabId | Integration test | After a fill, open popup on same tab; verify status shown; open popup on different tab; verify null returned | Manual — Wave 0 |
| BGW-05 | `EXPORT_DATA` returns profile + answer bank, no resume | Smoke test | Run export from popup; verify JSON has `schemaVersion`, `profile`, `answerBank`; verify no `resume` key | Manual — Wave 0 |
| BGW-06 | `IMPORT_DATA` validates schema and merges answer bank | Smoke test | Import valid JSON; verify data appears in popup. Import invalid JSON; verify descriptive error displayed | Manual — Wave 0 |
| BGW-07 | Alt+Shift+F triggers fill on active ATS tab | Smoke test | Focus an ATS tab, press Alt+Shift+F; verify fill triggers (same as Fill button) | Manual — Wave 0 |
| BGW-08 | Error handling for tab not found / no content script | Negative test | Press Alt+Shift+F on `chrome://extensions`; verify no uncaught error in SW console | Manual — Wave 0 |

### Sampling Rate

- **Per task commit:** Open SW inspector, verify no console errors after each background.js change
- **Per wave merge:** Full UAT sequence — all 8 requirement tests above
- **Phase gate:** All 8 tests pass, zero uncaught errors in SW console before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] No test infrastructure to create (Milestone 1 is manual DevTools only)
- [ ] DevTools background inspector URL: `chrome://extensions` > JobFill > "Inspect views: service worker"
- [ ] Verify SW is listed (not "inactive") after extension loads

### DevTools-Specific Test Commands

**Test BGW-01 — session access from content script:**
```js
// Run in any ATS page DevTools console (after SW has started)
chrome.storage.session.get('lastFillStatus', r => console.log(r));
// Expected: {} or { lastFillStatus: ... } — NOT an access error
```

**Test BGW-02/03 — TRIGGER_FILL round-trip:**
```js
// Run in SW inspector console
chrome.runtime.sendMessage({ type: 'TRIGGER_FILL' }, r => console.log('Response:', r));
// Expected: response object from content script, or { error: 'Content script not available...' }
// NOT: undefined or "message channel closed" error
```

**Test BGW-04 — GET_STATUS:**
```js
// Run in SW inspector console (after a fill on tab 123)
chrome.runtime.sendMessage({ type: 'GET_STATUS', tabId: 123 }, r => console.log(r));
```

**Test BGW-05 — EXPORT_DATA:**
```js
// Run in popup.js DevTools or SW inspector
chrome.runtime.sendMessage({ type: 'EXPORT_DATA' }, r => {
  console.log(JSON.stringify(r.data, null, 2));
  console.assert(!r.data.resume, 'Resume must not be in export');
  console.assert(r.data.schemaVersion === 1, 'Schema version must be 1');
});
```

**Test BGW-08 — no crash on non-ATS tab:**
```js
// Navigate to chrome://newtab, then in SW inspector:
chrome.runtime.sendMessage({ type: 'TRIGGER_FILL' }, r => {
  console.assert(r.error, 'Should return error, not crash');
  console.log('Error message:', r.error);
});
```

---

## Sources

### Primary (HIGH confidence)
- STACK.md §4 — Service Worker lifecycle, top-level registration rule, non-async onMessage pattern
- STACK.md §5 — Two-hop popup-to-content-script messaging pattern with `return true`
- STACK.md §3 — `chrome.storage.session.setAccessLevel` requirement and callback form
- CONCERNS.md §1 — SW global variable loss, pitfall table
- REQUIREMENTS.md FR-5.1/5.2/5.5 — Export/Import requirements, schema versioning, resume exclusion
- REQUIREMENTS.md NFR-4.4, NFR-5.2 — Error handling requirements for "Extension context invalidated"
- `utils/storage.js` (Phase 2) — Confirms `window.JobFill.storage` namespace, which is NOT available in SW; background.js must call `chrome.storage.*` directly
- [Extension Service Worker Lifecycle — Chrome for Developers](https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle) — 30s termination, Chrome 110 hard-cap removal
- [Message Passing — Chrome for Developers](https://developer.chrome.com/docs/extensions/develop/concepts/messaging) — `return true` requirement

### Secondary (MEDIUM confidence)
- ROADMAP.md Phase 3 plans — Canonical list of message types and handlers required
- ROADMAP.md Phase 11 — Confirms `RESUME_UPLOAD_FALLBACK` will be added to background.js later; stub recommended now

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all APIs verified in STACK.md against official Chrome docs
- Architecture: HIGH — patterns confirmed in STACK.md §4-5 with official source citations
- Pitfalls: HIGH — all 6 pitfalls traced to verified sources (STACK.md §8, CONCERNS.md §1)
- Validation: HIGH — DevTools test commands derived from Chrome runtime API behavior

**Research date:** 2026-03-14
**Valid until:** 2026-06-14 (Chrome extension APIs are stable; re-verify if Chrome ships major MV3 changes)
