# JobFill — Job Application Autofill Chrome Extension

## What This Is

A free, fully offline Chrome extension that auto-fills job application forms across major ATS platforms (Greenhouse, Lever, Workday, Ashby, iCIMS, LinkedIn Easy Apply, Bayt) from a stored user profile. Handles custom/open-ended questions through a local answer bank with keyword matching and variable substitution — no APIs, no paid services, no network requests. A complete free replacement for Simplify Autofill, designed to eventually be published on the Chrome Web Store.

## Core Value

One-click form filling that correctly populates both standard profile fields and custom open-ended questions on any supported job application platform, saving 5-10 minutes per application.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] User profile storage with sync across devices (chrome.storage.sync for profile, chrome.storage.local for resume)
- [ ] Per-platform form detection and auto-fill for 8 targets (Greenhouse, Lever, Workday, Ashby, iCIMS, LinkedIn, Bayt, generic fallback)
- [ ] Smart answer bank with keyword matching, category scoring, and variable substitution
- [ ] Fill status overlay with colour-coded results and inline editing for answer bank fills
- [ ] Import/export of all data (profile + answer bank) as JSON
- [ ] Clean, modern popup UI with tabbed sections (Profile, Answer Bank, Import/Export)
- [ ] 10 pre-populated marketing-focused answer bank templates with {{variables}}
- [ ] Floating auto-fill button with Alt+Shift+F keyboard shortcut
- [ ] Resume auto-upload via programmatic file input attachment
- [ ] Fuzzy string matching for dropdowns (e.g., "United Arab Emirates" matches "UAE")
- [ ] React/Angular-compatible event triggering (synthetic events for framework state management)

### Out of Scope

- AI-powered question answering — replaced by offline answer bank with keyword matching
- External API calls or network requests of any kind — fully offline
- Mobile app or mobile browser support — Chrome desktop only
- Real-time chat or collaboration features
- Application tracking or analytics — this is a form filler, not a tracker
- Build tools (webpack, vite, rollup) — vanilla JS, load unpacked directly
- npm packages or external dependencies

## Context

- **User profile:** Adarsh is a marketing professional (Product Marketing, Email/Lifecycle, CRM) based in Abu Dhabi, UAE with Golden Visa status, actively job searching across UAE startups and international companies
- **Primary platforms by priority:** Greenhouse + Lever (most startup roles), Workday + iCIMS + Ashby (enterprise roles), then LinkedIn Easy Apply and Bayt (UAE-specific)
- **Answer bank templates:** Should be tailored to marketing/CRM/lifecycle roles, not generic professional templates
- **Technical approach:** Manifest V3, vanilla JS only, no build step, no npm — must load directly as unpacked Chrome extension with zero code edits
- **Storage strategy:** Split storage — profile data + answer bank in chrome.storage.sync (100KB limit), resume file (base64) in chrome.storage.local (device-only)
- **Publication intent:** Start as personal tool, polish for Chrome Web Store publication later

## Constraints

- **No build tools**: Vanilla JS, no bundlers, no npm — raw files loaded directly via chrome://extensions
- **No network requests**: Zero external API calls, fetch(), or XMLHttpRequest — fully offline after install
- **Manifest V3 only**: V2 is deprecated and will stop working
- **Storage limits**: chrome.storage.sync has 100KB total limit — resume must go in chrome.storage.local
- **Cost**: $0 to build and use — no API keys, subscriptions, or paid services
- **File structure**: Single flat directory, no nesting deeper than one level (platforms/, utils/, icons/)
- **Keyboard shortcut**: Alt+Shift+F (avoids Ctrl+Shift+F Chrome conflict)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Vanilla JS, no build tools | User is non-technical, needs zero-config loading | — Pending |
| Split storage (sync + local) | Resume exceeds sync 100KB limit; profile still syncs cross-device | — Pending |
| Per-platform modules (not generic) | Each ATS has unique DOM structures; generic detector is only fallback | — Pending |
| Keyword matching over AI | $0 cost, fully offline, no API dependency, handles 80% of questions | — Pending |
| Alt+Shift+F shortcut | Avoids Ctrl+Shift+F conflict with Chrome's formatted find | — Pending |
| Marketing-focused templates | Tailored to user's actual job search (Product Marketing/CRM/Email roles) | — Pending |

---
*Last updated: 2026-03-13 after initialization*
