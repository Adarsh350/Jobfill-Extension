# JobFill — Job Application Autofill Extension

A free, privacy-first Chrome/Brave extension that autofills job application forms. No account, no API keys, no data leaves your browser.

## Supported Platforms

| Platform | Status |
|----------|--------|
| Greenhouse | ✅ |
| Lever | ✅ |
| Workday | ✅ |
| Ashby | ✅ |
| iCIMS | ✅ |
| LinkedIn Easy Apply | ✅ |
| Bayt | ✅ |
| Generic fallback | ✅ |

## Features

- **Profile autofill** — stores your name, email, phone, location, LinkedIn, work auth, and 20+ fields
- **Resume upload** — auto-attaches your PDF/DOCX to file inputs
- **Smart Answer Bank** — keyword-matched answers with variable substitution (`{{company_name}}`, `{{job_title}}`)
- **Fill Status Overlay** — shows exactly which fields filled, skipped, or need review
- **Import / Export** — backup and restore your profile as JSON
- **100% offline** — zero external requests, zero telemetry

## Installation (Developer Mode)

1. Clone or download this repo
2. Open `chrome://extensions` (or `brave://extensions`)
3. Enable **Developer Mode** (top right)
4. Click **Load unpacked** → select this folder
5. Pin the JobFill icon to your toolbar

## Usage

1. Open any supported job application page
2. Click the **JobFill icon** → fill in your profile on first use
3. Click **Fill Form** (or press `Alt+Shift+F`)
4. Review the overlay — green = filled, yellow = needs review, red = failed

## Tech Stack

- Manifest V3, vanilla JS, zero build tools, zero dependencies
- `chrome.storage.sync` for profile, `chrome.storage.local` for resume
- Shadow DOM overlay (no CSS bleed)
- React/Angular-compatible via native prototype setter pattern

## Project Structure

```
├── manifest.json
├── popup.html / popup.js / popup.css
├── content.js
├── background.js
├── platforms/
│   ├── greenhouse.js
│   ├── lever.js
│   ├── workday.js
│   ├── ashby.js
│   ├── icims.js
│   ├── linkedin.js
│   ├── bayt.js
│   └── generic.js
├── utils/
│   ├── storage.js
│   ├── events.js
│   ├── filler.js
│   ├── matcher.js
│   └── overlay.js
└── icons/
```

## Privacy

All data is stored locally in your browser via `chrome.storage`. Nothing is ever sent to any server. See `manifest.json` for the exact permissions requested.

## License

MIT
