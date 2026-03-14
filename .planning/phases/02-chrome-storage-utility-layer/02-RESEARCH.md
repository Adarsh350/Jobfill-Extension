# Phase 2: Chrome Storage Utility Layer — Research

**Researched:** 2026-03-14
**Domain:** Chrome Extension Storage APIs (MV3) — `chrome.storage.sync`, `.local`, `.session`
**Confidence:** HIGH — all critical claims verified against official Chrome for Developers documentation (see STACK.md and CONCERNS.md)

---

## Summary

Phase 2 builds `utils/storage.js`, the single module every other module in the extension will import. It wraps all three Chrome storage areas (`sync`, `local`, `session`) behind a clean `window.JobFill.storage` namespace. This is the most foundational utility in the project: getting it wrong causes silent data loss, quota overflows, or inaccessible session state.

The biggest non-obvious concern is `chrome.storage.session`. By default it is not accessible from content scripts — access must be explicitly unlocked by calling `setAccessLevel` from the service worker on startup (Phase 3). Storage.js must nonetheless expose `getFillStatus`/`saveFillStatus` because the content script overlay reads and writes that key directly. The session access unlock is a Phase 3 dependency that must be documented clearly for the planner.

All three storage areas now return native Promises in MV3 — no promisification wrappers needed. The only exception to using async/await cleanly is quota error detection on `sync.set()`, where `chrome.runtime.lastError` behavior differs between callback and Promise styles; the safe pattern is always `.catch()` on the returned Promise.

**Primary recommendation:** Implement all storage functions as `async` functions returning Promises, with explicit `.catch()` on every `sync.set()` call. Expose a single `window.JobFill.storage` object. Document the session `setAccessLevel` dependency clearly so Phase 3 picks it up.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `chrome.storage.sync` | Chrome MV3 built-in | Profile, settings, answer bank | Syncs across devices; 8,192 B/key, 102,400 B total |
| `chrome.storage.local` | Chrome MV3 built-in | Resume (base64 PDF) | 10 MB limit; device-local only |
| `chrome.storage.session` | Chrome MV3 built-in (Chrome 102+) | Fill status (ephemeral) | 10 MB; cleared on extension reload; no persistence needed |

No external libraries. Zero dependencies. All vanilla JS.

### Supporting
| Utility | Purpose | When to Use |
|---------|---------|-------------|
| `chrome.runtime.lastError` | Detect quota rejections in callback-style calls | Fallback if Promise .catch() is missed |
| `chrome.storage.sync.getBytesInUse()` | Quota monitoring for popup UI | Exposed as `getBytesInUse(key)` for usage bars |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `chrome.storage.sync` for answer bank | IndexedDB | IDB has no sync; overkill for <8 KB payloads |
| `chrome.storage.local` for resume | File System Access API | FSAA not available in extension context |
| Callback-style storage calls | Promise-based (chosen) | Promises are cleaner; native in MV3 |

**Installation:** No installation required — all built into Chrome MV3 runtime.

---

## Architecture Patterns

### Recommended File Structure
```
utils/
└── storage.js    # window.JobFill.storage — the ONLY file in this phase
```

### Pattern 1: Namespace Guard
**What:** Every JS file opens with `window.JobFill = window.JobFill || {}` before attaching its sub-object. This is mandatory because content scripts are classic scripts sharing one isolated world — a later file must not overwrite what an earlier file registered.

**When to use:** Always. First line of every utils/*.js file.

```js
// utils/storage.js — line 1
window.JobFill = window.JobFill || {};

window.JobFill.storage = {
  getProfile,
  saveProfile,
  getAnswerBank,
  saveAnswerBank,
  getResume,
  saveResume,
  clearResume,
  getSettings,
  saveSettings,
  getFillStatus,
  saveFillStatus,
  getBytesInUse,
};
```

### Pattern 2: Promise-based sync.set with explicit error surface
**What:** Wrap `chrome.storage.sync.set()` in a try/catch that logs AND re-throws (or surfaces) the quota error. Never swallow it.

**When to use:** Every write to `chrome.storage.sync`.

```js
// Source: chrome.storage API Reference — developer.chrome.com
async function saveProfile(data) {
  try {
    await chrome.storage.sync.set({ profile: data });
  } catch (err) {
    // In MV3, quota violations reject the Promise (not lastError)
    console.error('[JobFill] saveProfile failed:', err.message);
    throw err; // caller can surface to user if needed
  }
}
```

### Pattern 3: get() returns undefined for missing key — always default
**What:** `chrome.storage.sync.get('profile')` returns `{}` if the key has never been set — NOT `{ profile: undefined }`. Destructuring without a default silently produces `undefined`.

**When to use:** Every read from any storage area.

```js
async function getProfile() {
  const result = await chrome.storage.sync.get('profile');
  return result.profile || null;  // explicit null, not undefined
}

async function getAnswerBank() {
  const result = await chrome.storage.sync.get('answerBank');
  return result.answerBank || [];  // default to empty array
}
```

### Pattern 4: session storage — read/write from content scripts
**What:** `chrome.storage.session` is accessible in content scripts ONLY after `setAccessLevel({ accessLevel: 'TRUSTED_AND_UNTRUSTED_CONTEXTS' })` has been called from the service worker. This call happens in Phase 3 (background.js). Storage.js implements the read/write functions regardless — they will throw if called before Phase 3 runs.

**When to use:** `getFillStatus` / `saveFillStatus` — called by content.js overlay.

```js
// Source: chrome.storage API Reference — developer.chrome.com
async function getFillStatus(tabId) {
  const result = await chrome.storage.session.get('lastFillStatus');
  const status = result.lastFillStatus || null;
  if (!status || status.tabId !== tabId) return null;
  return status;
}

async function saveFillStatus(tabId, results) {
  const status = {
    tabId,
    timestamp: new Date().toISOString(),
    results,
  };
  try {
    await chrome.storage.session.set({ lastFillStatus: status });
  } catch (err) {
    console.error('[JobFill] saveFillStatus failed:', err.message);
    throw err;
  }
}
```

### Pattern 5: getBytesInUse for quota monitoring
**What:** Wraps `chrome.storage.sync.getBytesInUse()` to return structured quota info for the popup UI usage bar.

```js
// Source: chrome.storage API Reference — developer.chrome.com
async function getBytesInUse(key) {
  return new Promise((resolve) => {
    chrome.storage.sync.getBytesInUse(key, (bytes) => {
      resolve({
        used: bytes,
        limit: 8192,
        percentFull: Math.round((bytes / 8192) * 100),
        nearLimit: bytes > 6144,   // warn at 75%
      });
    });
  });
}
```

Note: `getBytesInUse` does not have a native Promise form in all Chrome versions — use callback style here.

### Anti-Patterns to Avoid
- **Storing resume in sync storage:** Resume is a base64 PDF, easily 200–400 KB. The sync limit is 8,192 bytes per key. `saveResume` MUST use `chrome.storage.local`.
- **Using `chrome.storage.local` for profile:** Breaks cross-device sync. Profile must be in `sync`.
- **Silent catch blocks:** `catch (err) { }` — quota violations disappear. Always log and rethrow.
- **Assuming get() key exists:** `result.profile` is `undefined` if never set. Always use `|| defaultValue`.
- **Calling session storage from content scripts without Phase 3 running:** Will fail with "Access to storage is not allowed from this context". Document as cross-phase dependency.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Cross-device sync | Custom sync server | `chrome.storage.sync` | Built-in, free, automatic |
| Quota monitoring | Count bytes manually | `chrome.storage.sync.getBytesInUse()` | Chrome counts accurately including key overhead |
| Async storage wrapper | Promisify helper | Native Promise API (MV3) | MV3 storage already returns Promises |
| Data persistence | IndexedDB or localStorage | `chrome.storage.*` | localStorage not accessible across popup/content script/SW; IDB overkill |

**Key insight:** `chrome.storage` is the only storage mechanism that works uniformly across popup, content scripts, and service worker. `localStorage` and `sessionStorage` are page-scoped and not shared across extension contexts.

---

## Common Pitfalls

### Pitfall 1: Quota violation fails silently
**What goes wrong:** `await chrome.storage.sync.set({ answerBank: bigArray })` exceeds 8,192 bytes. In MV3 with the Promise API, this **rejects the Promise** — NOT sets `chrome.runtime.lastError`. If the rejection is unhandled (no `.catch()`, no `try/catch`), it becomes an invisible unhandled Promise rejection. The save never happened; no error is shown.

**Why it happens:** MV3 changed quota error delivery from `lastError` to Promise rejection for the async API. Old documentation and many Stack Overflow answers show the `lastError` pattern — which still works in callback style but is easily missed with async/await.

**How to avoid:** Wrap every `chrome.storage.sync.set()` in `try/catch`. Surface the error to the caller. Never use `sync.set()` without error handling.

**Warning signs:** Data disappears after saving without any console error.

### Pitfall 2: session storage inaccessible from content scripts
**What goes wrong:** `chrome.storage.session.get('lastFillStatus')` called from a content script throws "Access to storage is not allowed from this context" — even though `chrome.storage` is documented as available in content scripts.

**Why it happens:** `chrome.storage.session` has a default access level of `TRUSTED_CONTEXTS` only. Content scripts are considered `UNTRUSTED_CONTEXTS`. The service worker must call `setAccessLevel({ accessLevel: 'TRUSTED_AND_UNTRUSTED_CONTEXTS' })` to grant content scripts access.

**How to avoid:** This is a Phase 3 task (background.js startup). Storage.js implements the functions correctly; they will work once Phase 3 is in place. Document the dependency explicitly.

**Warning signs:** Content script throws on any `session` read/write; popup reads work fine.

### Pitfall 3: get() missing-key behavior
**What goes wrong:** First run of the extension — no profile saved yet. `const { profile } = await chrome.storage.sync.get('profile')` — `profile` is `undefined`. Code that immediately accesses `profile.firstName` throws "Cannot read property of undefined".

**Why it happens:** Chrome returns an empty object `{}` (not `{ profile: undefined }`) for missing keys. Destructuring `{}` for a key that doesn't exist gives `undefined`.

**How to avoid:** All get functions return a default: `return result.profile || null` or `return result.answerBank || []`.

### Pitfall 4: resume accidentally written to sync
**What goes wrong:** Resume base64 string (~300 KB) written to `chrome.storage.sync` immediately hits the 8,192-byte per-item limit and the 102,400-byte total limit. The write is rejected; resume is lost.

**Why it happens:** Developer uses `sync` uniformly for all data to simplify code.

**How to avoid:** `saveResume` / `getResume` / `clearResume` MUST exclusively use `chrome.storage.local`. Never touch `sync` for resume data.

### Pitfall 5: Missing clearResume
**What goes wrong:** User wants to remove their resume from storage. Without `clearResume()`, the only option is `saveResume(null)` which leaves the key set to null — not the same as removing it. Quota is not released.

**Why it happens:** Omitting a delete function seems harmless until storage fills up.

**How to avoid:** Implement `clearResume()` using `chrome.storage.local.remove('resume')`.

---

## Code Examples

Verified patterns from official sources:

### Complete storage.js skeleton
```js
// Source: chrome.storage API Reference — developer.chrome.com/docs/extensions/reference/api/storage
window.JobFill = window.JobFill || {};

window.JobFill.storage = (function () {

  // --- sync: profile ---
  async function getProfile() {
    const r = await chrome.storage.sync.get('profile');
    return r.profile || null;
  }
  async function saveProfile(data) {
    try {
      await chrome.storage.sync.set({ profile: data });
    } catch (err) {
      console.error('[JobFill] saveProfile quota error:', err.message);
      throw err;
    }
  }

  // --- sync: answerBank ---
  async function getAnswerBank() {
    const r = await chrome.storage.sync.get('answerBank');
    return r.answerBank || [];
  }
  async function saveAnswerBank(entries) {
    try {
      await chrome.storage.sync.set({ answerBank: entries });
    } catch (err) {
      console.error('[JobFill] saveAnswerBank quota error:', err.message);
      throw err;
    }
  }

  // --- local: resume ---
  async function getResume() {
    const r = await chrome.storage.local.get('resume');
    return r.resume || null;
  }
  async function saveResume(resumeObj) {
    try {
      await chrome.storage.local.set({ resume: resumeObj });
    } catch (err) {
      console.error('[JobFill] saveResume error:', err.message);
      throw err;
    }
  }
  async function clearResume() {
    await chrome.storage.local.remove('resume');
  }

  // --- sync: settings ---
  async function getSettings() {
    const r = await chrome.storage.sync.get('settings');
    return r.settings || {};
  }
  async function saveSettings(settings) {
    try {
      await chrome.storage.sync.set({ settings });
    } catch (err) {
      console.error('[JobFill] saveSettings error:', err.message);
      throw err;
    }
  }

  // --- session: fill status ---
  async function getFillStatus(tabId) {
    const r = await chrome.storage.session.get('lastFillStatus');
    const s = r.lastFillStatus || null;
    return (s && s.tabId === tabId) ? s : null;
  }
  async function saveFillStatus(tabId, results) {
    try {
      await chrome.storage.session.set({
        lastFillStatus: { tabId, timestamp: new Date().toISOString(), results }
      });
    } catch (err) {
      console.error('[JobFill] saveFillStatus error:', err.message);
      throw err;
    }
  }

  // --- quota monitoring ---
  async function getBytesInUse(key) {
    return new Promise((resolve) => {
      chrome.storage.sync.getBytesInUse(key, (bytes) => {
        resolve({
          used: bytes,
          limit: 8192,
          percentFull: Math.round((bytes / 8192) * 100),
          nearLimit: bytes > 6144,
        });
      });
    });
  }

  return {
    getProfile, saveProfile,
    getAnswerBank, saveAnswerBank,
    getResume, saveResume, clearResume,
    getSettings, saveSettings,
    getFillStatus, saveFillStatus,
    getBytesInUse,
  };
})();
```

### UAT console test sequence
```js
// DevTools console — run in order on any tab with content script loaded

// 1. Save and retrieve profile
await window.JobFill.storage.saveProfile({ firstName: 'Test', email: 'test@test.com' });
const p = await window.JobFill.storage.getProfile();
console.assert(p.firstName === 'Test', 'Profile save/get FAILED');
console.log('Profile OK:', p);

// 2. Save and retrieve answer bank
await window.JobFill.storage.saveAnswerBank([{ id: '1', question: 'Why?', answer: 'Because.' }]);
const ab = await window.JobFill.storage.getAnswerBank();
console.assert(ab.length === 1, 'AnswerBank save/get FAILED');
console.log('AnswerBank OK:', ab);

// 3. Quota check
const q = await window.JobFill.storage.getBytesInUse('profile');
console.log('Profile bytes:', q.used, 'of 8192 (', q.percentFull, '%)');

// 4. Session fill status (requires Phase 3 setAccessLevel to be running)
await window.JobFill.storage.saveFillStatus(1, [{ field: 'First Name', status: 'filled' }]);
const fs = await window.JobFill.storage.getFillStatus(1);
console.assert(fs !== null, 'FillStatus save/get FAILED');
console.log('FillStatus OK:', fs);
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Callback-only storage API | Native Promise support in MV3 | Chrome 88 / MV3 launch | Can use async/await directly |
| `chrome.runtime.lastError` for quota errors | Promise rejection for quota errors (async API) | MV3 | Must use .catch(), not lastError check |
| `session` storage not in content scripts | `setAccessLevel` unlocks it | Chrome 102 | Content scripts can read session after SW call |
| `storage.local` 5 MB limit | 10 MB limit | Chrome 113 | Resumes up to ~7.5 MB original PDF now safe |

**Not deprecated for this phase:** Everything in use is current as of Chrome 120+.

---

## Cross-Phase Dependencies

| Dependency | From Phase | Required By | Notes |
|------------|-----------|-------------|-------|
| `chrome.storage.session.setAccessLevel(...)` | Phase 3 (background.js) | `getFillStatus`, `saveFillStatus` | Must be called at SW top level before content scripts use session |
| `utils/storage.js` loaded before all other utils | manifest.json content_scripts order | All phases | storage.js must be first in the js array |

---

## Validation Architecture

`nyquist_validation: true` in config.json — this section is required.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Manual DevTools console tests (no automated test suite in Milestone 1 per ROADMAP.md) |
| Config file | None |
| Quick run command | Open DevTools on any ATS tab; paste UAT snippet from Code Examples above |
| Full suite command | Same — run all 4 assertions |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| FR-1.1 | saveProfile writes to sync["profile"] | Manual/DevTools | `await window.JobFill.storage.saveProfile({firstName:"Test"})` then `getProfile()` | Wave 0 |
| FR-1.2 | saveResume writes to local["resume"], never sync | Manual/DevTools | `await window.JobFill.storage.saveResume({name:"test.pdf",data:"..."})` then `getResume()` | Wave 0 |
| FR-3.1 | saveAnswerBank writes to sync["answerBank"] | Manual/DevTools | `await window.JobFill.storage.saveAnswerBank([...])` then `getAnswerBank()` | Wave 0 |
| FR-4.5 | saveFillStatus writes to session["lastFillStatus"] | Manual/DevTools | Requires Phase 3 session unlock; test after background.js complete | Wave 0 |
| NFR-2.1 | Resume never written to sync | Code review | Inspect saveResume — must call `chrome.storage.local.set` | N/A |
| NFR-2.2 | sync.set quota rejections caught | Manual/DevTools | Attempt saveAnswerBank with 10 KB string; verify error logged not swallowed | Wave 0 |

### Quota Overflow Test
```js
// DevTools — simulate quota violation for answerBank
const bigEntry = { id: '1', question: 'x'.repeat(4000), answer: 'y'.repeat(4100) };
try {
  await window.JobFill.storage.saveAnswerBank([bigEntry]);
  console.log('No quota error — check if data actually saved');
} catch (err) {
  console.log('Quota error surfaced correctly:', err.message);
}
```

### Session Access Test (after Phase 3 is running)
```js
// DevTools on content-script-injected page
// Phase 3 must be loaded first (background.js with setAccessLevel)
try {
  await window.JobFill.storage.saveFillStatus(99, []);
  console.log('Session access: OK');
} catch (err) {
  console.log('Session access blocked — Phase 3 not running:', err.message);
}
```

### Sampling Rate
- **Per task commit:** Run UAT snippet steps 1-3 (profile + answerBank + quota check) — session test deferred to Phase 3
- **Per wave merge:** All 4 UAT assertions green
- **Phase gate:** All 6 requirement rows passing before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `utils/storage.js` — the file itself (this is the implementation target)
- [ ] No test framework setup needed — manual DevTools tests only per ROADMAP.md

---

## Open Questions

1. **Session storage timing with Phase 3**
   - What we know: `getFillStatus`/`saveFillStatus` require `setAccessLevel` to be called from background.js first
   - What's unclear: If Phase 3 is not yet implemented when Phase 2 UAT runs, the session tests will fail — is that acceptable?
   - Recommendation: Mark session-related UAT as "deferred to Phase 3 integration" in the plan. Test profile/answerBank/local/settings in Phase 2. Test session after Phase 3.

2. **`getBytesInUse` callback vs Promise form**
   - What we know: The callback form is universally supported; the Promise form of `getBytesInUse` is not consistently documented across Chrome versions
   - What's unclear: Whether `await chrome.storage.sync.getBytesInUse(key)` works in current Chrome without callback
   - Recommendation: Use callback-wrapped-in-Promise for `getBytesInUse` to be safe (as shown in Code Examples).

---

## Sources

### Primary (HIGH confidence)
- [chrome.storage API Reference](https://developer.chrome.com/docs/extensions/reference/api/storage) — quota limits (8,192 / 102,400 / 512), session setAccessLevel, Promise support, getBytesInUse
- [Content Scripts — Chrome for Developers](https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts) — available APIs in content scripts, session access level
- [STACK.md](../../research/STACK.md) — Section 3: chrome.storage API (project-level research, already verified)
- [CONCERNS.md](../../research/CONCERNS.md) — Section 4: Storage Pitfalls (quota behavior, schema migration)

### Secondary (MEDIUM confidence)
- [CONCERNS.md](../../research/CONCERNS.md) — Section 1: Chrome Platform Pitfalls (Promise vs callback quota error discrepancy)

### Tertiary (LOW confidence)
- None for this phase — all claims covered by HIGH sources.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all three storage areas are Chrome built-ins, verified from official docs
- Architecture patterns: HIGH — namespace guard and Promise patterns verified from official docs and STACK.md
- Pitfalls: HIGH — quota behavior and session access level verified from official docs and CONCERNS.md
- Code examples: HIGH — all examples follow patterns from official Chrome storage API reference

**Research date:** 2026-03-14
**Valid until:** 2026-06-14 (stable platform — Chrome storage API is not changing rapidly)
