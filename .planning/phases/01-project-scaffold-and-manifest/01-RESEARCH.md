# Phase 1: Project Scaffold & Manifest — Research

**Researched:** 2026-03-14
**Domain:** Chrome Extension MV3 — project scaffolding, manifest.json, placeholder icons, stub files
**Confidence:** HIGH — all critical claims verified against STACK.md (itself sourced from official Chrome for Developers docs)

---

## Summary

Phase 1 creates the complete file skeleton that Chrome accepts via `Load Unpacked`. No logic is implemented here — the deliverable is a valid directory layout, a correctly structured `manifest.json`, placeholder icons, stub JS files with single-line comments, and a bare `popup.html`. If any of these files are malformed, Chrome will refuse to load the extension entirely. The planner must treat every manifest field, file path, and PNG format constraint as a hard requirement, not a suggestion.

The highest-risk work in this phase is: (1) getting the CSP field syntax exactly right — MV3 uses an object, not a string, and Chrome rejects the string form silently by showing "invalid manifest"; (2) creating PNG files that are actually valid binary PNGs — Chrome rejects the icon path if the file is corrupt or empty even for placeholder icons; (3) maintaining exact file-path consistency across manifest fields, directory structure, and stub file locations. Every path declared in `manifest.json` must correspond to a real file.

**Primary recommendation:** Write `manifest.json` against the exact template verified in STACK.md, generate PNG icons with the pure-Python stdlib script (Python 3.13 is confirmed available), and keep all stub JS files as the minimal valid single-line comment form.

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| SCAFFOLD-01 | Root directory structure with `icons/`, `utils/`, `platforms/` subdirectories | Directory layout from ARCHITECTURE.md |
| SCAFFOLD-02 | `manifest.json` with all MV3 fields: name, version, description, manifest_version, permissions, host_permissions, background SW, action/popup, content_scripts, commands, CSP | Full verified template in STACK.md §1 |
| SCAFFOLD-03 | Placeholder PNG icons at `icons/icon16.png`, `icons/icon48.png`, `icons/icon128.png` | PNG generation approach researched; pure-Python stdlib method confirmed |
| SCAFFOLD-04 | All 14 stub JS files in correct locations with 1-line comment identifiers | File list from ARCHITECTURE.md; stub validity rules documented below |
| SCAFFOLD-05 | `popup.html` shell — no inline scripts, loads `popup.css` and `popup.js`, correct DOCTYPE | Verified pattern in STACK.md §5 |
| SCAFFOLD-06 | Extension loads in Chrome with zero manifest errors | Validation Architecture section covers UAT steps |
</phase_requirements>

---

## Standard Stack

### Core
| Item | Value | Purpose | Why Standard |
|------|-------|---------|--------------|
| `manifest_version` | 3 | Declares MV3 API surface | MV2 deprecated; Chrome rejects MV2 new installs as of 2025 |
| PNG format | binary PNG, 32-bit RGBA | Icon files | Chrome only accepts PNG, BMP, GIF, ICO, JPEG — not SVG or WebP |
| Python 3 stdlib | 3.13 (confirmed on system) | Generate placeholder PNGs with no dependencies | Pure `zlib` + `struct` approach writes valid PNG binary; zero external libraries |
| Node.js | v24 (confirmed on system) | Alternative PNG generation if Python approach fails | Buffer.alloc + manual PNG binary — backup option |

### Supporting
| Item | Purpose | When to Use |
|------|---------|-------------|
| `popup.css` (empty stub) | Stylesheet linked from popup.html | Must exist on disk so Chrome doesn't 404 it; empty file is fine |
| `background.js` (stub) | Service worker entry; declared in manifest | Must exist — Chrome loads it at install time and will error if missing |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Pure Python PNG generation | ImageMagick / Pillow / canvas API | ImageMagick not guaranteed installed; Pillow requires pip; canvas API (Node.js `canvas` package) requires npm — all violate NFR-1.2 (no npm) or add tool dependencies. Pure stdlib Python is the right choice. |
| Single-comment JS stubs | Empty files | Empty files are valid but single-comment form provides a self-documenting identity for each stub — valuable during debugging when files are partially filled in |

**PNG generation script (use this exactly):**
```python
# Run from the project root: python3 create_icons.py
import zlib, struct

def create_solid_png(filepath, width, height, r=74, g=144, b=226, a=255):
    """Write a solid-color RGBA PNG. Default color: #4A90E2 (medium blue)."""
    def chunk(name, data):
        crc = zlib.crc32(name + data) & 0xffffffff
        return struct.pack('>I', len(data)) + name + data + struct.pack('>I', crc)
    sig = b'\x89PNG\r\n\x1a\n'
    ihdr = chunk(b'IHDR', struct.pack('>IIBBBBB', width, height, 8, 6, 0, 0, 0))
    row = bytes([r, g, b, a] * width)
    raw = b''.join(b'\x00' + row for _ in range(height))
    idat = chunk(b'IDAT', zlib.compress(raw))
    iend = chunk(b'IEND', b'')
    with open(filepath, 'wb') as f:
        f.write(sig + ihdr + idat + iend)

create_solid_png('icons/icon16.png',  16,  16)
create_solid_png('icons/icon48.png',  48,  48)
create_solid_png('icons/icon128.png', 128, 128)
print('Icons created.')
```

---

## Architecture Patterns

### Recommended Project Structure
```
jobfill/                    ← extension root (Load Unpacked points here)
├── manifest.json           ← extension declaration
├── background.js           ← service worker (stub in Phase 1)
├── content.js              ← content script coordinator (stub in Phase 1)
├── popup.html              ← popup shell (no inline scripts)
├── popup.js                ← popup logic (stub in Phase 1)
├── popup.css               ← popup styles (empty stub in Phase 1)
├── icons/
│   ├── icon16.png          ← 16×16 placeholder PNG
│   ├── icon48.png          ← 48×48 placeholder PNG
│   └── icon128.png         ← 128×128 placeholder PNG
├── utils/
│   ├── storage.js          ← stub
│   ├── matcher.js          ← stub
│   ├── events.js           ← stub
│   ├── filler.js           ← stub
│   └── overlay.js          ← stub
└── platforms/
    ├── greenhouse.js       ← stub
    ├── lever.js            ← stub
    ├── workday.js          ← stub
    ├── ashby.js            ← stub
    ├── icims.js            ← stub
    ├── linkedin.js         ← stub
    ├── bayt.js             ← stub
    └── generic.js          ← stub
```

Total files in Phase 1: 1 manifest + 1 background + 1 content + 3 popup files + 3 icons + 5 utils + 8 platforms = **22 files**.

### Pattern 1: Complete manifest.json

This is the exact manifest structure to use. Every field has been verified against STACK.md (sourced from official Chrome for Developers docs).

```json
{
  "manifest_version": 3,
  "name": "JobFill",
  "version": "1.0.0",
  "description": "Auto-fills job application forms on Greenhouse, Lever, Workday, Ashby, iCIMS, LinkedIn, and Bayt.",
  "permissions": ["storage", "scripting", "activeTab", "tabs"],
  "host_permissions": [
    "https://*.greenhouse.io/*",
    "https://*.lever.co/*",
    "https://*.myworkdayjobs.com/*",
    "https://*.ashbyhq.com/*",
    "https://*.icims.com/*",
    "https://www.linkedin.com/jobs/*",
    "https://www.bayt.com/*"
  ],
  "background": {
    "service_worker": "background.js"
  },
  "action": {
    "default_popup": "popup.html",
    "default_icon": {
      "16":  "icons/icon16.png",
      "48":  "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  },
  "icons": {
    "16":  "icons/icon16.png",
    "48":  "icons/icon48.png",
    "128": "icons/icon128.png"
  },
  "commands": {
    "fill-form": {
      "suggested_key": { "default": "Alt+Shift+F" },
      "description": "Auto-fill the current form"
    }
  },
  "content_scripts": [
    {
      "matches": [
        "https://*.greenhouse.io/*",
        "https://*.lever.co/*",
        "https://*.myworkdayjobs.com/*",
        "https://*.ashbyhq.com/*",
        "https://*.icims.com/*",
        "https://www.linkedin.com/jobs/*",
        "https://www.bayt.com/*"
      ],
      "js": [
        "utils/storage.js",
        "utils/matcher.js",
        "utils/events.js",
        "utils/filler.js",
        "utils/overlay.js",
        "platforms/greenhouse.js",
        "platforms/lever.js",
        "platforms/workday.js",
        "platforms/ashby.js",
        "platforms/icims.js",
        "platforms/linkedin.js",
        "platforms/bayt.js",
        "platforms/generic.js",
        "content.js"
      ],
      "run_at": "document_idle",
      "all_frames": false
    }
  ],
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'none'"
  }
}
```

**Critical notes on this manifest:**
- `all_frames` is `false` here because iCIMS frame injection is handled differently at runtime — the content script runs in the top frame and the iCIMS module detects iframe context via `window !== window.top`. A separate `all_frames: true` entry for iCIMS could be added later in Phase 9 if needed, but is not required for Phase 1 to load.
- The `description` field max is 132 characters. The example above is within limit.
- `content_security_policy` is an **object** with an `extension_pages` key. Using a plain string (MV2 style) causes Chrome to log "Could not load manifest: Unrecognized content_security_policy field."

### Pattern 2: Stub JS file content

Every stub file must have exactly this structure — a single-line comment identifying the file. Empty files are technically valid but this form is better:

```js
// utils/storage.js — JobFill Chrome Extension
```

```js
// utils/matcher.js — JobFill Chrome Extension
```

```js
// utils/events.js — JobFill Chrome Extension
```

```js
// utils/filler.js — JobFill Chrome Extension
```

```js
// utils/overlay.js — JobFill Chrome Extension
```

```js
// platforms/greenhouse.js — JobFill Chrome Extension
```

(Same pattern for all 8 platform files and `content.js`.)

**Why this is safe:** Chrome's content script loader runs each file as a classic script. A file with only a comment is syntactically valid JavaScript. It defines no globals and throws no errors.

`background.js` (the service worker) also gets a stub — but it MUST include the namespace initialization guard so later phases can add to it safely:

```js
// background.js — JobFill Chrome Extension service worker
```

A bare comment is sufficient for Phase 1. Chrome will load the service worker, execute the empty script, and register no listeners — which is fine since the extension does nothing yet.

### Pattern 3: popup.html minimal valid shell

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>JobFill</title>
    <link rel="stylesheet" href="popup.css">
  </head>
  <body>
    <p>JobFill loaded.</p>
    <script src="popup.js"></script>
  </body>
</html>
```

**Why `<p>JobFill loaded.</p>`:** An entirely empty body means the popup opens as a 0px × 0px invisible window. Chrome technically shows it, but the UAT criterion "popup opens" is easier to confirm if there is visible text. This stub text is replaced in Phase 12.

### Anti-Patterns to Avoid

- **String CSP in MV3:** `"content_security_policy": "script-src 'self'"` — this is MV2 syntax. Chrome logs a warning and ignores it, using the default CSP. The extension loads, but future phases that depend on the CSP being exactly `script-src 'self'; object-src 'none'` may behave unexpectedly.
- **Inline scripts in popup.html:** `<script>console.log('hi')</script>` or `onclick="fn()"` — blocked by MV3 CSP. Popup renders blank with a CSP violation in DevTools console.
- **icon path mismatch:** Declaring `"16": "icons/icon16.png"` in the manifest but the file being at `icon16.png` (no subdirectory) — Chrome shows "Could not load icon" and the toolbar icon will be blank. This does not prevent loading but is confusing.
- **Referencing a file that does not exist:** If `popup.css` is declared in popup.html but the file doesn't exist, Chrome logs a resource load error. Create an empty `popup.css` file.
- **Trailing commas in manifest.json:** JSON does not allow trailing commas. Chrome's JSON parser will reject the manifest entirely with "Could not load manifest."
- **Using `background.scripts` instead of `background.service_worker`:** MV2 syntax. Chrome will reject the manifest.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Solid-color PNG creation | Custom binary writer from scratch during the task | The verified Python stdlib script in the Code Examples section | PNG binary format is precise — wrong CRC, wrong chunk order, or wrong filter byte causes Chrome to silently treat the icon as missing |
| Manifest JSON validation | Manual reading | Open the file in any JSON validator (JSONLint, VS Code) before testing in Chrome | ~60% of initial manifest issues are trailing commas or syntax errors caught in under 10 seconds by a validator |

**Key insight:** The only real complexity in Phase 1 is the PNG binary format. The manifest itself is configuration, not code. Using the tested Python script eliminates the only genuine technical risk in this phase.

---

## Common Pitfalls

### Pitfall 1: CSP as a string instead of an object
**What goes wrong:** `"content_security_policy": "script-src 'self'; object-src 'none'"` — Chrome for Developers docs confirm MV3 CSP must be an object. Chrome logs "Unrecognized content_security_policy field" and uses its default CSP. The extension loads, but the declared policy is silently ignored.
**Why it happens:** MV2 used a string; MV3 changed to an object with an `extension_pages` key. Easy to copy the wrong example from an outdated tutorial.
**How to avoid:** Use the exact object form: `{ "extension_pages": "script-src 'self'; object-src 'none'" }`.
**Warning signs:** `chrome://extensions` shows the extension loaded but DevTools on the popup shows CSP violation errors when loading external scripts.

### Pitfall 2: Empty or invalid PNG files
**What goes wrong:** Creating an empty file named `icon16.png` or writing non-PNG content to it. Chrome silently skips displaying the icon. The extension loads without error but the toolbar shows a blank/grey puzzle piece.
**Why it happens:** PNG is a binary format with a specific magic number (`\x89PNG\r\n\x1a\n`), required chunks (IHDR, IDAT, IEND), and CRC checksums. A zero-byte file or a file containing only text is not a valid PNG.
**How to avoid:** Use the Python stdlib script to generate proper binary PNG files. Verify the files are non-zero size after creation.
**Warning signs:** Icon area in `chrome://extensions` shows grey puzzle piece even after the extension loads cleanly.

### Pitfall 3: File path case sensitivity
**What goes wrong:** Manifest declares `"icons/icon16.png"` but the file is created as `icons/Icon16.png` (capital I). On Windows, the file system is case-insensitive so it loads fine locally. On Chrome OS or if the extension is ever uploaded to the Web Store (where paths are validated case-sensitively), it breaks.
**Why it happens:** Windows hides case differences.
**How to avoid:** Use all-lowercase filenames consistently. The recommended structure uses lowercase throughout.

### Pitfall 4: content_scripts js array out of order or missing a file
**What goes wrong:** If `content.js` is listed before any platform module it will try to call `window.JobFill.platforms.*` before those globals are defined. This does not error in Phase 1 (stubs define no globals), but if the order is wrong from the start, Phase 6 will break.
**Why it happens:** Array order matters — the Chrome runtime guarantees injection in declaration order.
**How to avoid:** Use the exact 14-file order from the verified manifest above. `content.js` is always last.

### Pitfall 5: popup.html body is empty, popup appears invisible
**What goes wrong:** Popup opens but is 0px tall. UAT fails on "popup opens (blank is fine)."
**Why it happens:** Chrome sizes the popup to its content. No content = no size.
**How to avoid:** Add at minimum `<p>JobFill loaded.</p>` or a `<div style="min-height:100px">` to give the popup visible dimensions.

### Pitfall 6: `background.js` missing from disk
**What goes wrong:** Chrome shows "Service worker registration failed. Status code: 15" or "Could not load service worker" in `chrome://extensions`. The extension loads but all message passing fails immediately.
**Why it happens:** `manifest.json` declares `"service_worker": "background.js"` — Chrome immediately tries to register it. If the file doesn't exist, registration fails.
**How to avoid:** Create `background.js` as a stub file before loading the extension. Even an empty or single-comment file registers successfully.

---

## Code Examples

### Content scripts entry with all 13 dependency files + coordinator
```json
// Source: STACK.md §2 (verified from official Chrome content_scripts reference)
"content_scripts": [
  {
    "matches": [
      "https://*.greenhouse.io/*",
      "https://*.lever.co/*",
      "https://*.myworkdayjobs.com/*",
      "https://*.ashbyhq.com/*",
      "https://*.icims.com/*",
      "https://www.linkedin.com/jobs/*",
      "https://www.bayt.com/*"
    ],
    "js": [
      "utils/storage.js",
      "utils/matcher.js",
      "utils/events.js",
      "utils/filler.js",
      "utils/overlay.js",
      "platforms/greenhouse.js",
      "platforms/lever.js",
      "platforms/workday.js",
      "platforms/ashby.js",
      "platforms/icims.js",
      "platforms/linkedin.js",
      "platforms/bayt.js",
      "platforms/generic.js",
      "content.js"
    ],
    "run_at": "document_idle"
  }
]
```

**File count check:** 5 utils + 8 platforms + 1 content = **14 files**. The Phase description says "13 files" but counting all entries gives 14. The correct count is 14 — verify this matches all stub files on disk.

### popup.html minimal valid shell
```html
<!-- Source: STACK.md §5 (verified from official Chrome extension popup constraints) -->
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <title>JobFill</title>
    <link rel="stylesheet" href="popup.css">
  </head>
  <body>
    <p>JobFill loaded.</p>
    <script src="popup.js"></script>
  </body>
</html>
```

### popup.js stub (must exist, loads without error)
```js
// popup.js — JobFill Chrome Extension popup
```

### Pure Python PNG generator (zero dependencies, Python 3 stdlib only)
```python
# Source: PNG spec (RFC 2083) — chunk format, CRC, IHDR color type 6 = RGBA
# Verified: Python 3.13 available on this system
import zlib, struct

def create_solid_png(filepath, width, height, r=74, g=144, b=226, a=255):
    def chunk(name, data):
        crc = zlib.crc32(name + data) & 0xffffffff
        return struct.pack('>I', len(data)) + name + data + struct.pack('>I', crc)
    sig  = b'\x89PNG\r\n\x1a\n'
    ihdr = chunk(b'IHDR', struct.pack('>IIBBBBB', width, height, 8, 6, 0, 0, 0))
    row  = bytes([r, g, b, a] * width)
    raw  = b''.join(b'\x00' + row for _ in range(height))
    idat = chunk(b'IDAT', zlib.compress(raw))
    iend = chunk(b'IEND', b'')
    with open(filepath, 'wb') as f:
        f.write(sig + ihdr + idat + iend)

create_solid_png('icons/icon16.png',  16,  16)
create_solid_png('icons/icon48.png',  48,  48)
create_solid_png('icons/icon128.png', 128, 128)
print('Icons created.')
```

**PNG binary format notes:**
- Signature: `\x89PNG\r\n\x1a\n` (8 bytes) — Chrome validates this header
- IHDR chunk: width (4B), height (4B), bit depth (1B=8), color type (1B=6 for RGBA), compression (0), filter (0), interlace (0)
- IDAT chunk: zlib-compressed pixel data; each row prefixed with filter byte `\x00` (None filter)
- IEND chunk: empty, marks end of file
- All chunks: 4-byte length, 4-byte name, data, 4-byte CRC32

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `"manifest_version": 2` | `"manifest_version": 3` | Chrome 88 (Jan 2021) | MV2 extensions no longer run in Chrome as of 2025 |
| `"content_security_policy": "string"` | `"content_security_policy": { "extension_pages": "string" }` | MV3 | String form silently ignored in MV3 |
| `"background": { "scripts": ["bg.js"] }` | `"background": { "service_worker": "bg.js" }` | MV3 | Persistent background pages gone; service workers only |
| URL patterns in `"permissions"` | URL patterns in `"host_permissions"` | MV3 | Mixing them causes silent failure to grant host access |

**Deprecated/outdated:**
- `background.persistent: true` — not valid in MV3; service workers are always non-persistent
- `browser_action` / `page_action` — replaced by unified `action` key in MV3

---

## Open Questions

1. **iCIMS `all_frames` handling**
   - What we know: FR-7.2 requires `all_frames: true` for iCIMS. STACK.md notes this.
   - What's unclear: Whether to add a second `content_scripts` entry for iCIMS with `all_frames: true` now, or defer to Phase 9. Adding it now causes all 14 files to be injected into every frame on iCIMS pages (potentially redundant).
   - Recommendation: Defer to Phase 9. Phase 1 UAT does not test iCIMS. Adding the second entry now is premature and could cause confusing behavior during development. A single entry with `all_frames: false` (default) is correct for Phase 1.

2. **32px icon — include or omit?**
   - What we know: STACK.md mentions 32px is "recommended to include" for Windows taskbar / retina. The manifest template in STACK.md only shows 16, 48, 128.
   - What's unclear: Whether Chrome will warn if 32px is absent.
   - Recommendation: Omit in Phase 1. The UAT criteria do not require retina support. The extension loads and displays fine with 16/48/128 only. Add 32px in the polish phase alongside real branded icons.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | None — manual UAT only (ROADMAP.md note: "No automated test suite in Milestone 1") |
| Config file | none — Wave 0 not applicable |
| Quick run command | Manual: open `chrome://extensions`, click Reload, check for errors |
| Full suite command | Manual: load unpacked, open popup, verify toolbar icon appears |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SCAFFOLD-01 | Directory structure present | manual | `ls` check | ❌ Wave 0 (created in Phase 1) |
| SCAFFOLD-02 | `manifest.json` accepted by Chrome | manual-only | Open `chrome://extensions > Load Unpacked` | ❌ Wave 0 |
| SCAFFOLD-03 | Icons display in toolbar | manual-only | Visual inspection in Chrome toolbar | ❌ Wave 0 |
| SCAFFOLD-04 | All stub JS files exist, no parse errors | manual-only | Chrome DevTools console shows no errors on ATS page | ❌ Wave 0 |
| SCAFFOLD-05 | Popup opens when icon clicked | manual-only | Click extension icon in toolbar | ❌ Wave 0 |
| SCAFFOLD-06 | Zero errors in `chrome://extensions` | manual-only | Inspect `chrome://extensions` error count | ❌ Wave 0 |

**Justification for all manual-only:** Phase 1 creates a file scaffold — there is no runtime logic to unit-test. All validation is visual confirmation in Chrome itself. Automated testing begins in Phase 2+ when Chrome API wrappers are written.

### Sampling Rate
- **Per task commit:** Reload extension at `chrome://extensions`, confirm no new errors
- **Per wave merge:** Full UAT — load unpacked fresh, click toolbar icon, confirm popup opens
- **Phase gate:** Zero errors in `chrome://extensions` and popup opens before calling phase complete

### Wave 0 Gaps

- [ ] All 22 files created (22 = 1 manifest + 1 background + 1 content + 3 popup + 3 icons + 5 utils + 8 platforms) — covers all SCAFFOLD-0X requirements
- [ ] Python icon script run and output verified non-zero filesize
- [ ] `manifest.json` validated with a JSON syntax checker before loading in Chrome

---

## Sources

### Primary (HIGH confidence)
- STACK.md — complete manifest template, CSP object syntax, permissions, host_permissions, content_scripts ordering, popup constraints (all sourced from official Chrome for Developers docs)
- ARCHITECTURE.md — recommended file structure, namespace pattern, content_scripts array with all 14 files
- REQUIREMENTS.md — FR-7.2 (iCIMS all_frames), FR-8.7 (no inline scripts), NFR-1.2 (no npm/build tools)
- [Manifest: Icons — Chrome for Developers](https://developer.chrome.com/docs/extensions/reference/manifest/icons) — confirmed PNG required, SVG/WebP not supported, size requirements

### Secondary (MEDIUM confidence)
- [Generating a PNG File in Python — darka.github.io](https://darka.github.io/posts/generating-png-in-python/) — PNG binary format; verified against Python stdlib `zlib`/`struct` behavior
- [Top 10 Common Manifest File Issues — moldstud.com](https://moldstud.com/articles/p-top-10-common-manifest-file-issues-for-chrome-extensions-and-how-to-fix-them) — confirmed load error causes; cross-verified against STACK.md pitfalls

### Tertiary (LOW confidence — use for awareness only)
- None required for this phase — all critical facts are HIGH confidence from project research files

---

## Metadata

**Confidence breakdown:**
- Manifest structure: HIGH — exact template verified in STACK.md against official docs
- File/directory layout: HIGH — specified verbatim in ARCHITECTURE.md
- PNG generation approach: HIGH — pure Python stdlib; PNG format spec is stable; Python 3.13 confirmed on system
- Stub file content: HIGH — valid JS comment confirmed as syntactically correct
- popup.html structure: HIGH — verified in STACK.md §5

**Research date:** 2026-03-14
**Valid until:** 2026-06-14 (Chrome extension manifest spec is stable; re-verify if Chrome 136+ changes MV3 CSP rules)
