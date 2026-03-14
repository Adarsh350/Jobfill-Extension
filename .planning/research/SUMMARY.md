# Research Summary: JobFill Chrome Extension

**Synthesized:** 2026-03-14
**Sources:** STACK.md (HIGH), ARCHITECTURE.md (HIGH), CONCERNS.md (HIGH), PROJECT.md
**FEATURES.md:** Pending (agent delayed by rate limit — key feature requirements covered below from other sources)

---

## 1. Platform & Stack Decisions (CONFIRMED)

**All critical technical claims verified against official Chrome for Developers documentation.**

### Manifest V3 Is the Correct Choice
- MV2 extensions no longer run in standard Chrome (2025–2026 sunset). MV3 is required.
- CSP is now an object, not a string: `{ "extension_pages": "script-src 'self'; object-src 'none'" }`
- `unsafe-inline` is **completely blocked** in MV3 — cannot be overridden. All popup JS must be in external files.
- `host_permissions` and `permissions` are now separate arrays — URL patterns go in `host_permissions` only.

### Content Script Loading Strategy
- ES modules (`import`/`export`) are **not supported** in the `content_scripts.js` array.
- Files execute in order — use a shared `window.JobFill` namespace object.
- All 13 files (5 utils + 7 platform modules + 1 coordinator) load as a single `content_scripts` entry.
- `run_at: "document_idle"` is correct — but SPAs (Workday, LinkedIn) require MutationObserver for step navigation.

### Storage Partitioning (FINAL)
| Key | Area | Limit | Contents |
|-----|------|-------|----------|
| `"profile"` | sync | 8KB/item | name, email, phone, location, work auth, LinkedIn, custom fields |
| `"answerBank"` | sync | 8KB/item | array of `{question, keywords[], answer, category}` — ~30 entries ≈ 6KB |
| `"settings"` | sync | tiny | shortcut prefs, overlay position |
| `"resume"` | local | 10MB | `{ name, type, data: "data:...;base64,..." }` |
| `"lastFillStatus"` | session | ephemeral | per-tab fill results for overlay |

**Critical:** `chrome.storage.session` requires `setAccessLevel({ accessLevel: 'TRUSTED_AND_UNTRUSTED_CONTEXTS' })` in background.js before content scripts can access it.

### Service Worker Rules
- Terminates after 30 seconds of inactivity (Chrome 110+ removed hard 5-min cap).
- **Never make `onMessage` listener `async`** — returns a Promise, Chrome ignores it, response channel closes.
- Must `return true` from listener for async responses.
- All listeners must be registered at **top level** of background.js (not in callbacks).
- No state in SW module-level variables — always read from `chrome.storage`.

---

## 2. Architecture (CONFIRMED)

### File Loading Order
```
utils/storage.js     → window.JobFill.storage
utils/matcher.js     → window.JobFill.matcher
utils/events.js      → window.JobFill.events
utils/filler.js      → window.JobFill.filler
utils/overlay.js     → window.JobFill.overlay
platforms/*.js       → window.JobFill.platforms.{name}
content.js           → coordinator (loads last, calls all above)
```

### Message Flow
```
Popup → chrome.runtime.sendMessage(TRIGGER_FILL)
     → background.js routes to active tab
     → chrome.tabs.sendMessage(tab.id, DO_FILL)
     → content.js → platform.fill() → sendResponse(results)
     → background forwards back to popup
```

### Platform Module Interface
Each platform module exposes:
```js
window.JobFill.platforms.{name} = {
  matches: (hostname) => boolean,
  fill: async (profile, answerBank) => { filled[], skipped[], failed[] },
  getJobDetails: () => { company_name, job_title }
}
```

### Fill Sequence (Per Platform)
1. Load profile + answer bank from storage
2. Detect form fields using platform-specific selectors
3. For each field: direct fill (profile fields) → dropdown fuzzy match → keyword match (answer bank) → DataTransfer (file input)
4. Dispatch React/Angular-compatible events
5. Collect results → render overlay → sendResponse

---

## 3. Critical Implementation Patterns

### React/Angular Event Dispatch (MANDATORY)
```js
// Native setter bypasses React's internal tracker
const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
descriptor.set.call(element, value);
element.dispatchEvent(new Event('input',  { bubbles: true }));
element.dispatchEvent(new Event('change', { bubbles: true }));
```
`bubbles: true` is mandatory — React listens at document root, not on elements.

### File Upload (DataTransfer Pattern)
```js
const dt = new DataTransfer();
dt.items.add(new File([blob], name, { type }));
inputElement.files = dt.files;
inputElement.dispatchEvent(new Event('change', { bubbles: true }));
```
**Fallback for React file inputs:** `instanceof File` check fails across isolated/main world boundary — use `chrome.scripting.executeScript({ world: 'MAIN' })`.

### Fuzzy Matching Strategy
1. Exact match (value or text)
2. Case-insensitive `.includes()`
3. Alias map: `{ "UAE": "United Arab Emirates", "US": "United States", "UK": "United Kingdom" }`
4. Levenshtein distance ≤ 3 (typos only)
5. Below threshold → skip and flag to user

### Answer Bank Matching
- Score by keyword presence + category alignment
- Require threshold > 0.75 before autofilling
- Below threshold → leave blank, surface to user for manual input
- Variable substitution: `{{company_name}}`, `{{job_title}}`, `{{my_name}}`, `{{years_experience}}`

---

## 4. Top Pitfalls to Avoid (Priority Order)

1. **Async onMessage listener** → response channel closes silently. Never use `async` on the listener itself.
2. **Inline scripts in popup.html** → CSP violation, popup blank. All JS in external files.
3. **SPA navigation not detected** → Workday/LinkedIn step changes not seen. Use MutationObserver.
4. **React ignoring native value assignment** → Use native prototype setter pattern always.
5. **File instanceof File cross-world failure** → Detect and fallback to MAIN world injection.
6. **Storage quota rejection is silent** → Wrap all `sync.set()` in `.catch()`.
7. **Cascading dropdowns (country → state)** → Poll with MutationObserver after setting parent.
8. **Workday Shadow DOM** → `document.querySelector` returns null. Need shadow-piercing traversal.
9. **iCIMS iframe** → Add `all_frames: true`. Cross-origin iframes: document as unsupported.
10. **MutationObserver memory leak** → Disconnect when fill complete or overlay closed.

---

## 5. Platform-Specific Requirements

### Workday
- Shadow DOM traversal required (recursive `shadowRoot` walk)
- SPA step navigation via MutationObserver
- React controlled components → native setter pattern
- `onBlur` validation → dispatch `blur` event after fills

### iCIMS
- `all_frames: true` in manifest (form lives in iframe)
- Cross-origin iframes: show user warning, do not fail silently

### LinkedIn Easy Apply
- Multi-step modal: MutationObserver on modal container
- DOM structure changes frequently → fallback selector chains
- Per-field delay 50–200ms to avoid bot detection
- Never auto-submit

### Greenhouse / Lever / Ashby
- All React-based → native setter pattern always
- File uploads: MAIN world fallback
- Selector maintenance: primary + fallback array per field

### Bayt
- RTL/Arabic locale possible → prefer `name`/`id`/`type` over label text
- Confirm form is Bayt-hosted before attempting fill

---

## 6. Chrome Web Store Checklist (For Later)

- [ ] Icons: 16×16, 48×48, 128×128 PNG (32×32 recommended)
- [ ] Screenshots: 2× at 1280×800
- [ ] Privacy policy URL (required — extension handles personal data)
- [ ] Narrow `host_permissions` (7 specific domains only)
- [ ] Permission justification written for each permission
- [ ] Privacy practices questionnaire completed
- [ ] $5 developer account registration fee

---

## 7. What FEATURES.md Will Add

The FEATURES.md agent is still running (hit rate limit, resumed). It will cover:
- Detailed answer bank data model and matching engine design
- Fill Status Overlay component spec
- Import/Export JSON schema
- Pre-populated marketing-role answer templates
- Per-field fill UX behavior (skip vs overwrite logic)

**These are captured sufficiently in PROJECT.md requirements and CONCERNS.md for ROADMAP purposes.**
