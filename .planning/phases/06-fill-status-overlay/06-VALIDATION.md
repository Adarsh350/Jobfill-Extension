---
phase: 6
slug: fill-status-overlay
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-14
---

# Phase 6 — Validation Strategy

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Manual DevTools + node:test for overlay logic |
| **Quick run command** | `node tests/run-all.js` |
| **Full suite command** | Manual UAT on Greenhouse job page |
| **Estimated runtime** | ~60 seconds manual |

---

## Wave 0 Requirements

None — content.js and overlay.js are DOM-heavy; tested manually.

---

## Per-Task Verification Map

| Task | Plan | Wave | Test | Status |
|------|------|------|------|--------|
| content.js platform detect + onMessage | 06-01 | 1 | grep: `onMessage` + `return true` in content.js | ⬜ pending |
| MutationObserver + fill lock | 06-01 | 1 | grep: `MutationObserver` + `isFilling` in content.js | ⬜ pending |
| overlay.js Shadow DOM showButton | 06-02 | 1 | grep: `attachShadow` + `showButton` in overlay.js | ⬜ pending |
| overlay.js showResults | 06-02 | 1 | grep: `showResults` + `fillResults` in overlay.js | ⬜ pending |

---

## Manual-Only Verifications

| Behavior | Why Manual | Test Instructions |
|----------|------------|-------------------|
| Fill button appears on Greenhouse | Requires live page | Open Greenhouse job → verify indigo button bottom-right |
| Overlay shows fill results | Requires fill run | Trigger fill → overlay shows filled/skipped/failed counts |
| SPA navigation re-shows button | Requires navigation | Navigate between job listings → button re-appears |

---

## Validation Sign-Off

- [ ] content.js non-async onMessage with return true
- [ ] MutationObserver guards against own DOM changes
- [ ] overlay uses Shadow DOM (_container pattern)
- [ ] `nyquist_compliant: true`

**Approval:** pending
