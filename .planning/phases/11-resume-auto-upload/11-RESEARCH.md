# Phase 11: Resume Auto-Upload — Research

**Researched:** 2026-03-15
**Domain:** Synthetic file input population, Chrome extension MAIN world injection, DataTransfer API
**Confidence:** HIGH

---

## Summary

Phase 11 extends `utils/filler.js` with an `attachResume()` function that reads the stored resume (a base64 data URL in `chrome.storage.local`) and programmatically populates `<input type="file">` elements using the DataTransfer + File constructor pattern. The primary complication is that React-powered ATS forms (Greenhouse, Lever, Workday, Ashby) validate `inputEl.files` via their own internal `instanceof File` check. Because content scripts run in an ISOLATED world, the `File` constructor they use is NOT the same object as the page's `window.File`. React's synthetic event system will reject the file object as "not a real File". The fix is a MAIN world fallback: `chrome.scripting.executeScript({ world: 'MAIN' })` injects a small function into the page's own JS context where `File` and `DataTransfer` are the native page constructors, making `instanceof` checks pass.

The codebase is already wired for this. `manifest.json` includes `"scripting"` permission. `background.js` has a `RESUME_UPLOAD_FALLBACK` stub at line 24 awaiting implementation. `filler.js` has `type === 'file' → return false` at line 33, explicitly deferred to Phase 11.

**Primary recommendation:** Implement `attachResume()` in `filler.js` (ISOLATED world first). If `inputEl.files.length === 0` after the DataTransfer attempt, send `RESUME_UPLOAD_FALLBACK` to background which calls `chrome.scripting.executeScript({ world: 'MAIN' })`. Three-outcome result: `filled`, `filled_via_main_world`, `failed`.

---

## Standard Stack

### Core APIs (no npm dependencies — all browser-native)

| API | Source | Purpose | Trust |
|-----|--------|---------|-------|
| `DataTransfer` | Browser native | Container to hold File objects before assigning to `inputEl.files` | HIGH |
| `File` constructor | Browser native | Creates a synthetic File from a Blob and filename | HIGH |
| `FileReader` / `atob` | Browser native | Decode base64 data URL → binary → Blob | HIGH |
| `chrome.scripting.executeScript` | Chrome Extensions API (MV3) | Inject function into MAIN world for React compatibility | HIGH |
| `chrome.storage.local` | Chrome Extensions API | Resume already stored here (Phase 2) | HIGH |

### No External Libraries Needed
All required primitives are browser-native. No npm installs.

---

## Architecture Patterns

### Resume Storage Shape (confirmed from `utils/storage.js`)
`getResume()` returns from `chrome.storage.local` key `"resume"`. The stored object is:
```javascript
// resumeObj shape (set by popup.js in Phase 12)
{
  name: "Adarsh_Shankar_Resume.pdf",   // original filename
  dataUrl: "data:application/pdf;base64,JVBERi...",  // base64 data URL
  size: 204800,  // bytes
  mimeType: "application/pdf"
}
```
`getResume()` returns `null` if not set.

### Pattern 1: DataTransfer + File (ISOLATED world — works on vanilla/non-React inputs)

**What:** Convert base64 data URL to Blob, construct File, assign via DataTransfer.
**When to use:** First attempt, always. Works on vanilla HTML, Angular, and some React builds.

```javascript
// Source: MDN DataTransfer API + Chrome Extensions content script context
function base64ToBlob(dataUrl) {
  const [header, b64] = dataUrl.split(',');
  const mime = header.match(/:(.*?);/)[1];
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

async function attachResume(inputEl) {
  const resume = await window.JobFill.storage.getResume();
  if (!resume) return { status: 'skipped', reason: 'no_resume_stored' };

  // 5 MB guard
  if (resume.size > 5 * 1024 * 1024) {
    return { status: 'failed', reason: 'resume_too_large' };
  }

  const blob = base64ToBlob(resume.dataUrl);
  const file = new File([blob], resume.name, { type: resume.mimeType });
  const dt = new DataTransfer();
  dt.items.add(file);
  inputEl.files = dt.files;

  // Dispatch change event so framework detects the file
  inputEl.dispatchEvent(new Event('change', { bubbles: true }));
  inputEl.dispatchEvent(new Event('input', { bubbles: true }));

  if (inputEl.files.length > 0) {
    return { status: 'filled', field: inputEl.name || inputEl.id || 'file' };
  }
  // files.length still 0 — React instanceof isolation; trigger MAIN world fallback
  return null; // caller sends RESUME_UPLOAD_FALLBACK
}
```

### Pattern 2: MAIN World Fallback via chrome.scripting.executeScript

**What:** When ISOLATED world DataTransfer fails (React `instanceof File` check), background.js injects a serialized function into the page's MAIN JS world. There the `File` and `DataTransfer` constructors are the page's own — `instanceof File` passes.
**When to use:** When `attachResume()` returns null (files.length === 0 after first attempt).

**Key constraint:** Functions passed to `chrome.scripting.executeScript` must be self-contained — they cannot close over variables from the extension's scope. All data must pass through the `args` array.

```javascript
// In background.js — handles RESUME_UPLOAD_FALLBACK message
// Source: Chrome Extensions Scripting API docs (chrome.scripting.executeScript world: 'MAIN')

function attachResumeInMainWorld(resumeData, selector) {
  // This function runs in the PAGE's own JS context
  // File, DataTransfer, atob are all the page's native versions
  const el = document.querySelector(selector);
  if (!el) return { status: 'failed', reason: 'element_not_found' };

  const [header, b64] = resumeData.dataUrl.split(',');
  const mime = header.match(/:(.*?);/)[1];
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const blob = new Blob([bytes], { type: mime });
  const file = new File([blob], resumeData.name, { type: resumeData.mimeType });

  const dt = new DataTransfer();
  dt.items.add(file);
  el.files = dt.files;

  el.dispatchEvent(new Event('change', { bubbles: true }));
  el.dispatchEvent(new Event('input', { bubbles: true }));

  return el.files.length > 0
    ? { status: 'filled_via_main_world' }
    : { status: 'failed', reason: 'files_not_accepted' };
}

// Called from handleMessage RESUME_UPLOAD_FALLBACK:
const results = await chrome.scripting.executeScript({
  target: { tabId: msg.tabId },
  world: 'MAIN',
  func: attachResumeInMainWorld,
  args: [resumeData, msg.selector],
});
sendResponse(results[0].result);
```

### Pattern 3: File Input Disambiguation (multi-input pages)

**What:** Many ATS forms have multiple `<input type="file">` elements (cover letter, portfolio, etc.). Pick the one most likely to be the resume.
**When to use:** Whenever platform modules call `attachResume()`.

```javascript
// Source: project convention — score by name/id/accept/aria-label attributes
function findResumeFileInput(root) {
  root = root || document;
  const inputs = Array.from(root.querySelectorAll('input[type="file"]'));
  if (inputs.length === 0) return null;
  if (inputs.length === 1) return inputs[0];

  const RESUME_KEYWORDS = ['resume', 'cv', 'curriculum', 'upload', 'document'];
  const scored = inputs.map(el => {
    const haystack = [
      el.name, el.id, el.getAttribute('aria-label'),
      el.getAttribute('accept'), el.closest('label')?.textContent
    ].join(' ').toLowerCase();
    const score = RESUME_KEYWORDS.reduce((s, kw) => s + (haystack.includes(kw) ? 1 : 0), 0);
    return { el, score };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored[0].el; // highest scorer; ties go to DOM order (first)
}
```

### Message Flow for MAIN World Fallback

```
content.js (ISOLATED world)
  └─ attachResume(inputEl) → files.length === 0
       └─ chrome.runtime.sendMessage({ type: 'RESUME_UPLOAD_FALLBACK',
                                        tabId: window._jobfillTabId,
                                        selector: cssSelector,
                                        resumeData: resume })
            └─ background.js handleMessage RESUME_UPLOAD_FALLBACK
                 └─ chrome.scripting.executeScript({ world: 'MAIN', func: attachResumeInMainWorld, args })
                      └─ result → sendResponse → content.js → overlay result
```

**Note:** `resumeData` (the full base64 string) passes through the message. For a 400 KB PDF the base64 is ~533 KB — well within Chrome's message size limit (64 MB). Acceptable.

### Recommended Project Structure Change

No new files. `attachResume` and `findResumeFileInput` are added to `utils/filler.js`. `RESUME_UPLOAD_FALLBACK` handler is added to `background.js`. Platform modules call `filler.attachResume()` when they encounter `input[type="file"]`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| React file input | Custom React setState hacking | DataTransfer + MAIN world `executeScript` | React reads `inputEl.files` on change event; DataTransfer is the correct DOM primitive |
| Base64 → Blob | Custom base64 parser | `atob()` + `Uint8Array` | Browser-native, handles all encodings correctly |
| File size check | Read bytes after upload | Check `resume.size` before any File construction | Fail fast; avoids hanging on large files |

---

## Common Pitfalls

### Pitfall 1: `instanceof File` Cross-World Failure (THE critical pitfall)
**What goes wrong:** Content scripts run in Chrome's ISOLATED world. The `File` class in that world is NOT `=== window.File` in the page's MAIN world. React's internal file validation does `file instanceof File` using the page's `File`. The content script's `File` is a different object. The check fails silently — React sees the input as empty.
**Why it happens:** Chrome Extensions security model. Each world has its own JS globals.
**How to avoid:** Always check `inputEl.files.length > 0` after the ISOLATED world attempt. If 0, trigger the MAIN world fallback via `chrome.scripting.executeScript({ world: 'MAIN' })`.
**Warning signs:** `inputEl.files.length` is 0 immediately after `inputEl.files = dt.files`. Or the platform's upload UI shows no file selected despite the assignment.

### Pitfall 2: DataTransfer `items.add` vs `files` Direct Assignment
**What goes wrong:** `inputEl.files = dt.files` works; `inputEl.files.item(0)` without the DataTransfer assignment does not.
**Why it happens:** `FileList` is read-only on file inputs except when assigned via a `DataTransfer.files` object.
**How to avoid:** Always use the `DataTransfer` pattern — create `dt`, `dt.items.add(file)`, assign `inputEl.files = dt.files`.

### Pitfall 3: Missing `change` Event Dispatch
**What goes wrong:** File is attached to `inputEl.files` but the framework's upload handler never fires. The upload UI remains blank.
**Why it happens:** Frameworks listen to `change` (and sometimes `input`) events, not direct DOM property mutations.
**How to avoid:** After `inputEl.files = dt.files`, dispatch both `change` and `input` with `{ bubbles: true }`.

### Pitfall 4: `executeScript` Args Must Be Serializable
**What goes wrong:** Passing a `File` object or `Blob` in the `args` array to `executeScript` throws a serialization error — these objects cannot be structured-cloned across the extension/page boundary.
**Why it happens:** `chrome.scripting.executeScript` args are serialized via the structured clone algorithm. `File` and `Blob` are not structured-cloneable in this context.
**How to avoid:** Pass only the plain `resumeData` object `{ name, dataUrl, mimeType, size }` (all strings/numbers). Reconstruct the `File` inside `attachResumeInMainWorld`.

### Pitfall 5: `all_frames: true` and iframe Targets
**What goes wrong:** On iCIMS (Phase 9), the content script runs inside an iframe. `chrome.scripting.executeScript` with a `tabId` targets the top-level frame by default. The file input may be inside the iframe.
**Why it happens:** `executeScript` `target` defaults to `frameId: 0` (main frame).
**How to avoid:** Pass `frameId` in the `RESUME_UPLOAD_FALLBACK` message. Background uses `{ tabId, frameIds: [msg.frameId] }` in the `target`. Content script reads `frameId` from `sender` in the message listener (Phase 9 already handles this pattern).

### Pitfall 6: Resume Not Stored Yet
**What goes wrong:** `getResume()` returns `null` — user hasn't uploaded a resume in the popup.
**How to avoid:** `attachResume()` returns `{ status: 'skipped', reason: 'no_resume_stored' }` immediately. Overlay shows instructional text: "No resume stored — upload in extension popup."

---

## Code Examples

### Base64 Data URL → Blob → File (verified pattern)
```javascript
// Source: MDN Blob constructor + atob (standard browser APIs)
function dataUrlToFile(dataUrl, filename, mimeType) {
  const b64 = dataUrl.split(',')[1];
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new File([new Blob([bytes], { type: mimeType })], filename, { type: mimeType });
}
```

### CSS Selector Generation for MAIN World Handoff
```javascript
// Generate a unique CSS selector string to pass as arg to executeScript
function getUniqueSelector(el) {
  if (el.id) return '#' + CSS.escape(el.id);
  if (el.name) return 'input[name="' + el.name + '"]';
  // Fallback: nth-of-type path (simple, sufficient for file inputs)
  const inputs = Array.from(document.querySelectorAll('input[type="file"]'));
  const idx = inputs.indexOf(el);
  return 'input[type="file"]:nth-of-type(' + (idx + 1) + ')';
}
```

### Background RESUME_UPLOAD_FALLBACK Handler Skeleton
```javascript
// In background.js — replaces the stub at line 24
case 'RESUME_UPLOAD_FALLBACK':
  handleResumeUploadFallback(msg, sender, sendResponse);
  return true;

async function handleResumeUploadFallback(msg, sender, sendResponse) {
  try {
    const { resume: resumeData } = await chrome.storage.local.get('resume');
    if (!resumeData) { sendResponse({ status: 'failed', reason: 'no_resume_stored' }); return; }
    const frameId = msg.frameId != null ? msg.frameId : 0;
    const results = await chrome.scripting.executeScript({
      target: { tabId: msg.tabId, frameIds: [frameId] },
      world: 'MAIN',
      func: attachResumeInMainWorld,
      args: [resumeData, msg.selector],
    });
    sendResponse(results[0]?.result || { status: 'failed', reason: 'no_result' });
  } catch (err) {
    sendResponse({ status: 'failed', reason: err.message });
  }
}
```

---

## ATS Platform File Input Survey

| Platform | Has file input | React-powered | MAIN world needed | Notes |
|----------|---------------|---------------|-------------------|-------|
| Greenhouse | Yes | Yes (React) | Likely yes | Standard `input[type="file"]`, name="resume" |
| Lever | Yes | Yes (React) | Likely yes | `input[type="file"]` within React form |
| Workday | Yes | Yes (Shadow DOM + React) | Yes | Shadow DOM — use `shadowQueryAll` to find input first |
| Ashby | Yes | Yes (React) | Likely yes | `input[type="file"]` with `data-field-type` attr |
| iCIMS | Yes | No (jQuery) | Unlikely | Runs in iframe; frameId must be passed |
| LinkedIn Easy Apply | Sometimes | Yes (React) | Likely yes | Resume upload not always shown in Easy Apply modal |
| Bayt | Yes | No (vanilla/jQuery) | Unlikely | Standard file input, attribute-based detection |
| Generic | Sometimes | Unknown | Best-effort | Always attempt MAIN world fallback if ISOLATED fails |

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| `inputEl.click()` and wait for OS file picker | DataTransfer synthetic assignment | Fully programmatic, no user interaction needed |
| `FormData` injection | Direct `inputEl.files` assignment via DataTransfer | Works with framework change event listeners |
| No cross-world handling | `chrome.scripting.executeScript({ world: 'MAIN' })` (MV3 only) | Solves React `instanceof File` without page script injection hacks |

**MV2 note:** The `world: 'MAIN'` option in `chrome.scripting.executeScript` is MV3-only. This project is MV3 — no concern.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | No automated test suite in Milestone 1 (per ROADMAP.md notes) |
| Config file | none |
| Quick run command | Manual UAT only |
| Full suite command | Manual UAT only |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Notes |
|--------|----------|-----------|-------|
| 11-01 | `attachResume()` attaches file to vanilla `input[type="file"]` | manual | Open Bayt/iCIMS, trigger fill, verify file appears |
| 11-02 | MAIN world fallback triggers on React inputs with `files.length === 0` | manual | Open Greenhouse, verify fallback path |
| 11-03 | 5 MB guard returns `failed` for oversized resume | manual | Store >5MB base64 in storage, verify skip |
| 11-04 | No resume stored → `skipped` result in overlay | manual | Clear resume from storage, trigger fill |
| 11-05 | Multi-file input page selects the resume input correctly | manual | Use a form with resume + cover letter inputs |
| 11-06 | iCIMS iframe scenario passes `frameId` correctly | manual | Test iCIMS fill after Phase 11 implementation |

### Wave 0 Gaps
None — ROADMAP.md explicitly states no automated test suite in Milestone 1. All validation is manual UAT against live ATS URLs.

---

## Open Questions

1. **Resume object shape from popup (Phase 12)**
   - What we know: `getResume()` returns whatever `saveResume(resumeObj)` was called with. Phase 12 (popup) hasn't been implemented yet.
   - What's unclear: Exact shape popup will write. Research assumes `{ name, dataUrl, mimeType, size }`.
   - Recommendation: Planner should define this shape contract in Phase 11 plan and have Phase 12 conform to it.

2. **Workday shadow DOM file input depth**
   - What we know: `shadowQueryAll` exists in `filler.js` and works recursively.
   - What's unclear: Whether Workday's file input is inside a shadow root.
   - Recommendation: Use `filler.shadowQueryAll(document, 'input[type="file"]')` instead of `querySelectorAll` for Workday.

3. **LinkedIn Easy Apply resume step**
   - What we know: LinkedIn Easy Apply is a multi-step modal. Resume upload may or may not appear depending on the user's LinkedIn profile completeness.
   - What's unclear: Whether the file input is present when profile already has a resume on LinkedIn.
   - Recommendation: Treat as best-effort. If `findResumeFileInput()` returns null, skip gracefully.

---

## Sources

### Primary (HIGH confidence)
- Chrome Extensions Scripting API — `chrome.scripting.executeScript`, `world: 'MAIN'` — https://developer.chrome.com/docs/extensions/reference/api/scripting
- `manifest.json` (project file) — confirmed `"scripting"` in permissions array
- `background.js` line 24 — confirmed `RESUME_UPLOAD_FALLBACK` stub exists
- `utils/filler.js` line 33 — confirmed `type === 'file' → return false` deferred stub
- `utils/storage.js` lines 43-59 — confirmed resume stored in `chrome.storage.local` key `"resume"`
- MDN DataTransfer API — https://developer.mozilla.org/en-US/docs/Web/API/DataTransfer
- MDN File constructor — https://developer.mozilla.org/en-US/docs/Web/API/File/File

### Secondary (MEDIUM confidence)
- Chrome extension content script world isolation behavior — documented in Chrome Extensions isolation model docs
- React `instanceof` cross-world failure pattern — well-established in Chrome extension dev community, consistent with Chrome's documented world isolation

### Tertiary (LOW confidence — validate during UAT)
- Per-platform "MAIN world needed" assessments in the ATS survey table — based on known React usage on those platforms, not directly tested

---

## Metadata

**Confidence breakdown:**
- DataTransfer + File pattern: HIGH — MDN documented, browser-native APIs
- MAIN world `executeScript` fix: HIGH — Chrome Extensions API, MV3, `scripting` permission confirmed present
- ATS platform React usage: MEDIUM — based on known platform stack, verify during UAT
- Resume storage shape: MEDIUM — inferred from existing `storage.js`, Phase 12 will be the writer

**Research date:** 2026-03-15
**Valid until:** 2026-06-15 (stable APIs — DataTransfer, File, chrome.scripting are not fast-moving)
