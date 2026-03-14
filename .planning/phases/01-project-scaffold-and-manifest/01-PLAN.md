---
phase: 01-project-scaffold-and-manifest
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - manifest.json
  - background.js
  - content.js
  - popup.html
  - popup.js
  - popup.css
  - icons/icon16.png
  - icons/icon48.png
  - icons/icon128.png
  - utils/storage.js
  - utils/matcher.js
  - utils/events.js
  - utils/filler.js
  - utils/overlay.js
  - platforms/greenhouse.js
  - platforms/lever.js
  - platforms/workday.js
  - platforms/ashby.js
  - platforms/icims.js
  - platforms/linkedin.js
  - platforms/bayt.js
  - platforms/generic.js
autonomous: false
requirements:
  - NFR-1.1
  - NFR-1.2
  - NFR-1.5
  - FR-2.7

must_haves:
  truths:
    - "Extension loads via chrome://extensions > Load Unpacked with zero errors"
    - "Extension icon appears in Chrome toolbar (not a grey puzzle piece)"
    - "Popup opens when toolbar icon is clicked and shows visible text"
    - "chrome://extensions shows no red error banners under the JobFill entry"
    - "All 22 files exist on disk at their declared paths"
  artifacts:
    - path: "manifest.json"
      provides: "Extension declaration — MV3, permissions, host_permissions, CSP object, content_scripts load order"
      contains: '"manifest_version": 3'
    - path: "background.js"
      provides: "Service worker entry point stub — Chrome registers it on load"
    - path: "popup.html"
      provides: "Extension popup shell — no inline scripts, loads popup.css and popup.js"
      contains: '<script src="popup.js"></script>'
    - path: "icons/icon16.png"
      provides: "Valid 16x16 PNG binary — Chrome toolbar icon"
    - path: "icons/icon48.png"
      provides: "Valid 48x48 PNG binary — chrome://extensions list icon"
    - path: "icons/icon128.png"
      provides: "Valid 128x128 PNG binary — Chrome Web Store listing icon"
    - path: "utils/storage.js"
      provides: "Stub — implemented Phase 2"
    - path: "utils/matcher.js"
      provides: "Stub — implemented Phase 5"
    - path: "utils/events.js"
      provides: "Stub — implemented Phase 4"
    - path: "utils/filler.js"
      provides: "Stub — implemented Phase 4"
    - path: "utils/overlay.js"
      provides: "Stub — implemented Phase 6"
    - path: "platforms/greenhouse.js"
      provides: "Stub — implemented Phase 7"
    - path: "platforms/lever.js"
      provides: "Stub — implemented Phase 7"
    - path: "platforms/workday.js"
      provides: "Stub — implemented Phase 8"
    - path: "platforms/ashby.js"
      provides: "Stub — implemented Phase 8"
    - path: "platforms/icims.js"
      provides: "Stub — implemented Phase 9"
    - path: "platforms/linkedin.js"
      provides: "Stub — implemented Phase 9"
    - path: "platforms/bayt.js"
      provides: "Stub — implemented Phase 9"
    - path: "platforms/generic.js"
      provides: "Stub — implemented Phase 10"
  key_links:
    - from: "manifest.json"
      to: "icons/icon16.png, icons/icon48.png, icons/icon128.png"
      via: "action.default_icon and icons fields"
      pattern: '"icons/icon(16|48|128)\.png"'
    - from: "manifest.json"
      to: "background.js"
      via: "background.service_worker field"
      pattern: '"service_worker": "background.js"'
    - from: "manifest.json"
      to: "popup.html"
      via: "action.default_popup field"
      pattern: '"default_popup": "popup.html"'
    - from: "manifest.json"
      to: "all 14 content script JS files"
      via: "content_scripts.js array — load order is a hard contract"
      pattern: '"content_scripts"'
    - from: "popup.html"
      to: "popup.js, popup.css"
      via: "script src and link rel=stylesheet"
      pattern: 'src="popup.js"'
---

<objective>
Create the complete directory structure and all 22 files that constitute the JobFill Chrome extension scaffold. After this plan executes, the extension can be loaded via `chrome://extensions > Load Unpacked` with zero errors and zero warnings.

Purpose: Establishes the file contract that all subsequent phases build against. Every path declared in manifest.json must correspond to a real file on disk — Chrome validates this at load time.

Output:
- manifest.json — complete MV3 manifest, verbatim as specified
- 3 valid PNG icon binaries (not zero-byte placeholders)
- 5 utils stubs + 8 platform stubs + content.js stub
- background.js stub (service worker entry)
- popup.html shell + popup.js stub + popup.css stub (empty)
</objective>

<execution_context>
@~/.claude/get-shit-done/workflows/execute-plan.md
@~/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/research/STACK.md
@.planning/research/ARCHITECTURE.md
@.planning/phases/01-project-scaffold-and-manifest/01-RESEARCH.md
@.planning/phases/01-project-scaffold-and-manifest/01-VALIDATION.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create directory structure and manifest.json</name>

  <read_first>
    - .planning/phases/01-project-scaffold-and-manifest/01-RESEARCH.md — Pattern 1 (manifest) and anti-patterns section are authoritative. Read before writing any file.
    - .planning/research/STACK.md — Section 1 (manifest fields) and Section 5 (popup constraints) for CSP object syntax confirmation.
  </read_first>

  <files>
    manifest.json
    (directories: icons/, utils/, platforms/ — created implicitly when stub files are written in Task 2)
  </files>

  <action>
Create the three subdirectories first:

```bash
mkdir -p icons utils platforms
```

Then write manifest.json to the project root with EXACTLY this content (verbatim — do not paraphrase, reorder, or modify any field):

```json
{
  "manifest_version": 3,
  "name": "JobFill",
  "version": "1.0.0",
  "description": "Auto-fills job application forms on Greenhouse, Lever, Workday, Ashby, iCIMS, LinkedIn, and Bayt",
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
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  },
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
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
      "css": ["content.css"],
      "run_at": "document_idle",
      "all_frames": true
    }
  ],
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'none'"
  }
}
```

CRITICAL constraints the executor must not violate:
- `content_security_policy` MUST be an object with key `extension_pages` — NOT a string. A string is MV2 syntax; Chrome silently ignores it in MV3.
- `background` MUST use `service_worker` key — NOT `scripts`. The `scripts` array is MV2 syntax.
- URL patterns MUST live in `host_permissions` — NOT in `permissions`. Chrome grants no host access from the `permissions` array in MV3.
- No trailing commas anywhere — JSON does not allow them and Chrome rejects the manifest.
- The `commands` key declares `fill-form` with `Alt+Shift+F` — this satisfies requirement FR-2.7 (keyboard shortcut).
- `content.js` MUST be last in the `js` array. Load order is a hard runtime guarantee. Platform modules must load before the coordinator.
- NOTE on `all_frames: true`: The planning spec requires this for iCIMS cross-frame injection (FR-7.2). Phase 1 research recommended deferring to Phase 9, but the explicit planning_context requirement takes precedence. It is included here.
- NOTE on `css`: `content.css` is declared in the css array. Task 2 must create this file or Chrome will log a resource load error.
  </action>

  <verify>
    <automated>
      node -e "const m = JSON.parse(require('fs').readFileSync('manifest.json','utf8')); console.assert(m.manifest_version === 3, 'wrong version'); console.assert(typeof m.content_security_policy === 'object', 'CSP must be object'); console.assert(m.content_security_policy.extension_pages === \"script-src 'self'; object-src 'none'\", 'CSP value wrong'); console.assert(m.background.service_worker === 'background.js', 'SW key wrong'); console.assert(m.content_scripts[0].js[m.content_scripts[0].js.length-1] === 'content.js', 'content.js must be last'); console.assert(m.commands['fill-form'].suggested_key.default === 'Alt+Shift+F', 'shortcut wrong'); console.log('manifest.json valid')"
    </automated>
  </verify>

  <acceptance_criteria>
    - `node -e "JSON.parse(require('fs').readFileSync('manifest.json','utf8'))"` exits 0 (no JSON parse error)
    - `grep '"manifest_version": 3' manifest.json` returns a match
    - `grep '"extension_pages"' manifest.json` returns a match (confirms CSP is object form, not string)
    - `grep '"service_worker": "background.js"' manifest.json` returns a match
    - `grep '"fill-form"' manifest.json` returns a match (FR-2.7 keyboard shortcut declared)
    - `grep '"content.js"' manifest.json` returns a match and it appears last in the js array
    - `ls icons/ utils/ platforms/` exits 0 (directories exist)
  </acceptance_criteria>

  <done>manifest.json written to project root, passes JSON.parse, all Chrome-required fields present, directories created.</done>
</task>

<task type="auto">
  <name>Task 2: Create all stub JS/CSS files and popup.html</name>

  <read_first>
    - .planning/phases/01-project-scaffold-and-manifest/01-RESEARCH.md — Pattern 2 (stub JS content) and Pattern 3 (popup.html structure). These patterns are authoritative.
    - .planning/research/STACK.md — Section 5 (popup constraints): confirms no inline scripts allowed, script must be at end of body.
  </read_first>

  <files>
    background.js
    content.js
    content.css
    popup.html
    popup.js
    popup.css
    utils/storage.js
    utils/matcher.js
    utils/events.js
    utils/filler.js
    utils/overlay.js
    platforms/greenhouse.js
    platforms/lever.js
    platforms/workday.js
    platforms/ashby.js
    platforms/icims.js
    platforms/linkedin.js
    platforms/bayt.js
    platforms/generic.js
  </files>

  <action>
Write each file with the content specified below. Use the Write tool for each file — do not use shell heredocs.

--- popup.html ---
Write with EXACTLY this content:

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
    <p>JobFill popup — coming soon</p>
    <script src="popup.js"></script>
  </body>
</html>
```

CRITICAL: No `<script>` blocks in the body other than the external file reference. No `onclick` or other inline event handlers. The MV3 CSP blocks inline scripts — popup renders blank if violated.

--- popup.css ---
Write an empty file (zero bytes is valid — it just needs to exist so Chrome does not log a 404 resource error).

--- popup.js ---
Write with this content:
```js
// JobFill — popup.js
// Popup logic — implemented in Phase 12
window.JobFill = window.JobFill || {};
```

--- background.js ---
Write with this content:
```js
// JobFill — background.js
// Service worker — implemented in Phase 3
window.JobFill = window.JobFill || {};
```

--- content.js ---
Write with this content:
```js
// JobFill — content.js
// Content script coordinator — implemented in Phase 6
window.JobFill = window.JobFill || {};
```

--- content.css ---
Write an empty file (declared in manifest.json content_scripts css array — must exist on disk).

--- utils/storage.js ---
```js
// JobFill — utils/storage.js
// Storage utility layer — implemented in Phase 2
window.JobFill = window.JobFill || {};
```

--- utils/matcher.js ---
```js
// JobFill — utils/matcher.js
// Fuzzy matcher and answer bank engine — implemented in Phase 5
window.JobFill = window.JobFill || {};
```

--- utils/events.js ---
```js
// JobFill — utils/events.js
// React/Angular event dispatch helpers — implemented in Phase 4
window.JobFill = window.JobFill || {};
```

--- utils/filler.js ---
```js
// JobFill — utils/filler.js
// Generic fill primitives — implemented in Phase 4
window.JobFill = window.JobFill || {};
```

--- utils/overlay.js ---
```js
// JobFill — utils/overlay.js
// Fill status overlay (Shadow DOM) — implemented in Phase 6
window.JobFill = window.JobFill || {};
```

--- platforms/greenhouse.js ---
```js
// JobFill — platforms/greenhouse.js
// Greenhouse platform module — implemented in Phase 7
window.JobFill = window.JobFill || {};
```

--- platforms/lever.js ---
```js
// JobFill — platforms/lever.js
// Lever platform module — implemented in Phase 7
window.JobFill = window.JobFill || {};
```

--- platforms/workday.js ---
```js
// JobFill — platforms/workday.js
// Workday platform module — implemented in Phase 8
window.JobFill = window.JobFill || {};
```

--- platforms/ashby.js ---
```js
// JobFill — platforms/ashby.js
// Ashby platform module — implemented in Phase 8
window.JobFill = window.JobFill || {};
```

--- platforms/icims.js ---
```js
// JobFill — platforms/icims.js
// iCIMS platform module — implemented in Phase 9
window.JobFill = window.JobFill || {};
```

--- platforms/linkedin.js ---
```js
// JobFill — platforms/linkedin.js
// LinkedIn Easy Apply module — implemented in Phase 9
window.JobFill = window.JobFill || {};
```

--- platforms/bayt.js ---
```js
// JobFill — platforms/bayt.js
// Bayt platform module — implemented in Phase 9
window.JobFill = window.JobFill || {};
```

--- platforms/generic.js ---
```js
// JobFill — platforms/generic.js
// Generic fallback module — implemented in Phase 10
window.JobFill = window.JobFill || {};
```

WHY `window.JobFill = window.JobFill || {}` in every stub:
Chrome's content script loader runs each file in the same isolated world. The namespace guard ensures that if later phases add to `window.JobFill` from multiple files, no file overwrites another's contribution. Background.js and popup.js get the same guard for consistency, even though they run in separate contexts.
  </action>

  <verify>
    <automated>
      ls utils/storage.js utils/matcher.js utils/events.js utils/filler.js utils/overlay.js &amp;&amp; ls platforms/greenhouse.js platforms/lever.js platforms/workday.js platforms/ashby.js platforms/icims.js platforms/linkedin.js platforms/bayt.js platforms/generic.js &amp;&amp; ls background.js content.js content.css popup.html popup.js popup.css &amp;&amp; grep -l "popup.js" popup.html &amp;&amp; echo "All stub files present"
    </automated>
  </verify>

  <acceptance_criteria>
    - `ls utils/storage.js utils/matcher.js utils/events.js utils/filler.js utils/overlay.js` exits 0
    - `ls platforms/greenhouse.js platforms/lever.js platforms/workday.js platforms/ashby.js platforms/icims.js platforms/linkedin.js platforms/bayt.js platforms/generic.js` exits 0
    - `ls background.js content.js content.css popup.html popup.js popup.css` exits 0
    - `grep 'src="popup.js"' popup.html` returns a match (external script reference present)
    - `grep -v 'onclick\|<script>' popup.html | grep -c 'script'` returns exactly 1 (only the one `<script src=...>` tag, no inline scripts)
    - `grep 'window.JobFill = window.JobFill || {}' utils/storage.js` returns a match
    - `grep 'window.JobFill = window.JobFill || {}' platforms/generic.js` returns a match
    - No file in utils/ or platforms/ is zero-bytes: `find utils/ platforms/ -empty` returns no output
  </acceptance_criteria>

  <done>All 19 stub/shell files written. popup.html loads only external JS. namespace guard present in all JS stubs.</done>
</task>

<task type="auto">
  <name>Task 3: Generate valid PNG icon files</name>

  <read_first>
    - .planning/phases/01-project-scaffold-and-manifest/01-RESEARCH.md — "PNG generation script (use this exactly)" section and Pitfall 2 (empty/invalid PNG). The script is verified against Python 3 stdlib and PNG spec.
    - .planning/research/STACK.md — Section 7 (icon size requirements): 16, 48, 128 required.
  </read_first>

  <files>
    icons/icon16.png
    icons/icon48.png
    icons/icon128.png
  </files>

  <action>
Write a Python script to the project root named `create_icons.py` with EXACTLY this content, then execute it:

```python
# JobFill — create_icons.py
# Generates solid-color PNG placeholder icons using Python 3 stdlib only.
# Color: indigo #6366F1 (r=99, g=102, b=241) — placeholder until Phase 12 polish.
# PNG spec: signature + IHDR + IDAT (zlib-compressed rows) + IEND, all with CRC32.
import struct, zlib

def make_png(size, r, g, b):
    def chunk(name, data):
        c = zlib.crc32(name + data) & 0xffffffff
        return struct.pack('>I', len(data)) + name + data + struct.pack('>I', c)

    # IHDR: width, height, bit_depth=8, color_type=2 (RGB), compression=0, filter=0, interlace=0
    ihdr = struct.pack('>IIBBBBB', size, size, 8, 2, 0, 0, 0)
    # Each row: filter byte 0x00 (None) + RGB pixels
    raw = b''.join(b'\x00' + bytes([r, g, b] * size) for _ in range(size))
    idat = zlib.compress(raw)

    return (b'\x89PNG\r\n\x1a\n' +
            chunk(b'IHDR', ihdr) +
            chunk(b'IDAT', idat) +
            chunk(b'IEND', b''))

for size in [16, 48, 128]:
    with open(f'icons/icon{size}.png', 'wb') as f:
        f.write(make_png(size, 99, 102, 241))

print('Icons created: icons/icon16.png, icons/icon48.png, icons/icon128.png')
```

Execute with: `python create_icons.py` (Windows) or `python3 create_icons.py` (Unix). Python 3.13 is confirmed available on this system.

CRITICAL technical notes on the PNG binary format — do not modify without understanding these:
- PNG signature is `\x89PNG\r\n\x1a\n` (8 bytes, exactly). Chrome validates this magic number.
- IHDR color_type=2 means RGB (3 bytes per pixel). This is correct for solid-color icons.
- Each row in the raw image data MUST be prefixed with `\x00` (filter type None). Missing this byte corrupts every row boundary.
- All chunks MUST have a valid CRC32 computed over (chunk_name_bytes + chunk_data_bytes). The `chunk()` helper computes this correctly.
- The `struct.pack('>IIBBBBB', ...)` format: `>` = big-endian, `I` = unsigned 4-byte int, `B` = unsigned 1-byte int. The two `I` fields are width and height, the five `B` fields are bit_depth, color_type, compression, filter, interlace.
- After running, each PNG file must be non-zero bytes. A zero-byte file is not a valid PNG and Chrome will silently show a grey puzzle piece instead of the icon.

DO NOT use an alternative PNG generation approach (no ImageMagick, no Node canvas, no third-party library). Those add unverified dependencies. The pure-Python stdlib script is the validated approach from RESEARCH.md.
  </action>

  <verify>
    <automated>
      python create_icons.py &amp;&amp; ls -la icons/icon16.png icons/icon48.png icons/icon128.png
    </automated>
  </verify>

  <acceptance_criteria>
    - `python create_icons.py` or `python3 create_icons.py` exits 0 and prints "Icons created: icons/icon16.png, icons/icon48.png, icons/icon128.png"
    - `ls -la icons/icon16.png` shows file size greater than 0 bytes (a 16x16 RGB PNG is ~90-150 bytes after zlib compression)
    - `ls -la icons/icon48.png` shows file size greater than 0 bytes
    - `ls -la icons/icon128.png` shows file size greater than 0 bytes (128x128 RGB PNG is ~500-2000 bytes compressed)
    - First 8 bytes of each PNG file match the PNG magic number: `python3 -c "f=open('icons/icon16.png','rb'); assert f.read(8)==b'\x89PNG\r\n\x1a\n', 'bad magic'; print('PNG signature valid')"` exits 0
    - `find icons/ -empty` returns no output (no zero-byte PNG files)
  </acceptance_criteria>

  <done>Three PNG files exist at icons/icon16.png, icons/icon48.png, icons/icon128.png. All are non-zero-byte valid PNG binaries with correct magic number.</done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <name>Task 4: UAT — Load extension in Chrome and verify zero errors</name>
  <action>Human verification required. Run automated pre-checks first, then perform manual UAT in Chrome as described in how-to-verify below.</action>
  <verify><automated>See how-to-verify steps below — manual UAT required for Chrome load validation.</automated></verify>
  <done>Extension loads with zero errors, icon visible in toolbar, popup opens showing text, no red error banners in chrome://extensions.</done>
  <what-built>
    Complete JobFill extension scaffold: manifest.json (MV3, all fields), 3 valid PNG icons, 19 stub/shell files (5 utils + 8 platforms + background.js + content.js + content.css + popup.html + popup.js + popup.css). Total: 22 files + create_icons.py helper.

    Pre-verification automated checks to run first (all must pass before manual UAT):
    1. `node -e "JSON.parse(require('fs').readFileSync('manifest.json','utf8')); console.log('JSON valid')"` — must exit 0
    2. `ls utils/storage.js utils/matcher.js utils/events.js utils/filler.js utils/overlay.js` — must exit 0
    3. `ls platforms/greenhouse.js platforms/lever.js platforms/workday.js platforms/ashby.js platforms/icims.js platforms/linkedin.js platforms/bayt.js platforms/generic.js` — must exit 0
    4. `find icons/ -empty` — must return no output
    5. `python3 -c "f=open('icons/icon16.png','rb'); assert f.read(8)==b'\x89PNG\r\n\x1a\n'; print('PNG valid')"` — must pass
  </what-built>

  <how-to-verify>
    1. Open Chrome and navigate to `chrome://extensions`
    2. Enable Developer Mode (toggle in top-right corner)
    3. Click "Load unpacked"
    4. Select the project root directory: `C:\Users\JobSearch\Documents\Projects`
    5. EXPECTED: JobFill appears in the extension list with no red error text underneath
    6. EXPECTED: The extension icon appears in the Chrome toolbar (a small indigo square, not a grey puzzle piece)
    7. Click the JobFill toolbar icon
    8. EXPECTED: A popup opens showing "JobFill popup — coming soon"
    9. Check `chrome://extensions` for any error banners under the JobFill entry — there should be none
    10. Optional: Open DevTools on any Greenhouse/Lever job listing URL and check the console for errors related to content script loading
  </how-to-verify>

  <resume-signal>
    Type "approved" if all 4 UAT criteria pass (loads with zero errors, icon in toolbar, popup opens, no red errors).
    Or describe any issues (e.g., "grey icon", "popup blank", specific error text from chrome://extensions").
  </resume-signal>
</task>

</tasks>

<verification>
Automated pre-UAT checks (run before the checkpoint):

```bash
# 1. manifest.json is valid JSON
node -e "JSON.parse(require('fs').readFileSync('manifest.json','utf8')); console.log('manifest: valid JSON')"

# 2. manifest.json has required MV3 fields
node -e "const m=JSON.parse(require('fs').readFileSync('manifest.json','utf8')); \
  console.assert(m.manifest_version===3,'mv3'); \
  console.assert(typeof m.content_security_policy==='object','csp object'); \
  console.assert(m.background.service_worker,'sw'); \
  console.assert(m.commands['fill-form'],'shortcut'); \
  console.assert(m.content_scripts[0].js.slice(-1)[0]==='content.js','order'); \
  console.log('manifest: all fields valid')"

# 3. All stub JS files exist
ls utils/storage.js utils/matcher.js utils/events.js utils/filler.js utils/overlay.js \
   platforms/greenhouse.js platforms/lever.js platforms/workday.js platforms/ashby.js \
   platforms/icims.js platforms/linkedin.js platforms/bayt.js platforms/generic.js \
   background.js content.js popup.js && echo "All JS stubs exist"

# 4. CSS and HTML files exist
ls popup.html popup.css content.css && echo "HTML/CSS files exist"

# 5. No empty stub JS files
find utils/ platforms/ -name "*.js" -empty && echo "WARNING: empty JS files found" || echo "No empty JS files"

# 6. popup.html has no inline scripts
grep -n 'onclick\|<script[^>]*>[^<]' popup.html && echo "WARNING: inline scripts found" || echo "No inline scripts in popup.html"

# 7. PNG files are valid (non-zero, correct magic number)
python3 -c "
for size in [16, 48, 128]:
    with open(f'icons/icon{size}.png', 'rb') as f:
        data = f.read()
    assert len(data) > 0, f'icon{size}.png is empty'
    assert data[:8] == b'\x89PNG\r\n\x1a\n', f'icon{size}.png has wrong magic number'
print('All 3 PNG icons valid')
"
```

Manual UAT (Phase gate — must pass before phase is complete):
- Extension loads via `chrome://extensions > Load Unpacked` with zero errors
- Extension icon appears in Chrome toolbar (not grey puzzle piece)
- Popup opens showing "JobFill popup — coming soon"
- No red error banners in `chrome://extensions` under JobFill entry
</verification>

<success_criteria>
Phase 1 is complete when:
1. All 22 files exist at their declared paths (22 = manifest.json + background.js + content.js + content.css + popup.html + popup.js + popup.css + 3 icons + 5 utils + 8 platforms)
2. `node -e "JSON.parse(require('fs').readFileSync('manifest.json','utf8'))"` exits 0
3. manifest.json contains `"manifest_version": 3`, `content_security_policy` as object, `"service_worker": "background.js"`, `"fill-form"` command with `Alt+Shift+F`
4. All PNG icons are valid binary files (non-zero, PNG magic number verified)
5. popup.html contains no inline scripts and references `popup.js` via external `<script src>`
6. Extension loads in Chrome with zero errors (manual UAT checkpoint approved)
7. Extension icon visible in Chrome toolbar (not grey puzzle piece)
8. Popup opens and shows text when toolbar icon is clicked
</success_criteria>

<output>
After the human-verify checkpoint is approved, create `.planning/phases/01-project-scaffold-and-manifest/01-PLAN-SUMMARY.md` with:
- Files created (list all 22)
- Decisions made (all_frames: true included per planning spec; iCIMS multi-frame support active from Phase 1)
- Deviations from research (none — all requirements satisfied)
- Verification result (Chrome load status, icon status, popup status)
- Next phase: Phase 2 — Chrome Storage Utility Layer (implements utils/storage.js)
</output>
