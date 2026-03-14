---
phase: 3
slug: background-service-worker
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-14
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Manual DevTools — background page inspector + content script console |
| **Config file** | none |
| **Quick run command** | `brave://extensions` → JobFill → "Inspect views: service worker" |
| **Full suite command** | Background page DevTools console + popup message relay test |
| **Estimated runtime** | ~90 seconds manual |

---

## Sampling Rate

- **After every task commit:** Reload extension, open background DevTools, verify no console errors
- **After all tasks:** Run full message relay test sequence
- **Before `/gsd:verify-work`:** No errors in background page, all message handlers respond
- **Max feedback latency:** 90 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Manual Steps | Status |
|---------|------|------|-------------|-----------|--------------|--------|
| 3-01-01 | 01 | 1 | setAccessLevel on startup | manual | Reload extension → background DevTools → no `setAccessLevel` errors in console | ⬜ pending |
| 3-01-02 | 01 | 1 | onMessage listener (non-async, returns true) | grep | `background.js` contains `return true` inside `onMessage` listener | ⬜ pending |
| 3-01-03 | 01 | 1 | TRIGGER_FILL handler | manual | From popup DevTools: `chrome.runtime.sendMessage({type:'TRIGGER_FILL'})` → background logs attempt | ⬜ pending |
| 3-01-04 | 01 | 1 | GET_STATUS handler | manual | `chrome.runtime.sendMessage({type:'GET_STATUS'}, r => console.log(r))` → returns object | ⬜ pending |
| 3-01-05 | 01 | 1 | EXPORT_DATA handler | manual | `chrome.runtime.sendMessage({type:'EXPORT_DATA'}, r => console.log(r))` → returns profile+answerBank | ⬜ pending |
| 3-01-06 | 01 | 1 | IMPORT_DATA handler | manual | Send import payload → verify storage updated, resume key ignored | ⬜ pending |
| 3-01-07 | 01 | 1 | onCommand fill-form | manual | Alt+Shift+F on ATS tab → background logs triggerFill attempt | ⬜ pending |
| 3-01-08 | 01 | 1 | Error handling | grep | `background.js` contains `ERR_FAILED` or `Could not establish connection` catch block | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

None — no test framework. Manual DevTools only.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| No errors on SW startup | setAccessLevel | Runtime only | Reload ext → Inspect service worker → console clean |
| TRIGGER_FILL reaches content script | message routing | Requires live tab | Open LinkedIn job page → send TRIGGER_FILL → content script receives DO_FILL |
| Alt+Shift+F fires onCommand | keyboard shortcut | Requires key press | On ATS tab, press Alt+Shift+F → background DevTools shows triggerFill log |

---

## Validation Sign-Off

- [ ] setAccessLevel called at top level with no runtime errors
- [ ] onMessage is non-async and returns `true`
- [ ] All 4 message types handled
- [ ] onCommand registered for "fill-form"
- [ ] Error handling covers tab-not-found and content-script-not-responding
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
