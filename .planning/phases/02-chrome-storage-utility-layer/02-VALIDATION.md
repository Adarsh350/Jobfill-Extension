---
phase: 2
slug: chrome-storage-utility-layer
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-14
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Manual DevTools console — no test runner (vanilla JS, no npm) |
| **Config file** | none |
| **Quick run command** | DevTools console in Brave with extension loaded |
| **Full suite command** | Run all console assertions in order (see Per-Task map) |
| **Estimated runtime** | ~60 seconds manual |

---

## Sampling Rate

- **After every task commit:** Reload extension at `brave://extensions`, run quick console test
- **After every plan wave:** Run full console assertion sequence
- **Before `/gsd:verify-work`:** Full suite must produce expected return values
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | Manual Steps | Status |
|---------|------|------|-------------|-----------|-------------------|--------------|--------|
| 2-01-01 | 01 | 1 | storage namespace | manual | n/a | `window.JobFill.storage` in DevTools console → not undefined | ⬜ pending |
| 2-01-02 | 01 | 1 | getProfile/saveProfile | manual | n/a | `storage.saveProfile({firstName:"Test"})` then `storage.getProfile()` → `{firstName:"Test"}` | ⬜ pending |
| 2-01-03 | 01 | 1 | getAnswerBank/saveAnswerBank | manual | n/a | `storage.saveAnswerBank([{q:"test",a:"yes"}])` then `storage.getAnswerBank()` → array with 1 entry | ⬜ pending |
| 2-01-04 | 01 | 1 | getResume/saveResume/clearResume | manual | n/a | `storage.saveResume({name:"r.pdf",data:"base64..."})` then `storage.getResume()` → object | ⬜ pending |
| 2-01-05 | 01 | 1 | getSettings/saveSettings | manual | n/a | `storage.saveSettings({autofill:true})` then `storage.getSettings()` → `{autofill:true}` | ⬜ pending |
| 2-01-06 | 01 | 1 | getFillStatus/saveFillStatus | manual | n/a | Deferred to Phase 3 (requires session setAccessLevel in background.js) | ⬜ deferred |
| 2-01-07 | 01 | 1 | getBytesInUse | manual | n/a | `storage.getBytesInUse("profile")` → resolves to number | ⬜ pending |
| 2-01-08 | 01 | 1 | quota error handling | manual | n/a | All write calls return Promises and `.catch()` logs to console without throwing | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

None — no test framework required. All verification is via DevTools console on a live extension page.

*Existing infrastructure covers all phase requirements (manual console testing only).*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| `saveProfile` persists across page reload | sync storage durability | No test runner | Save profile, reload page, call `getProfile()`, verify data returned |
| Quota rejection caught | sync quota error handling | Requires oversized payload | Call `saveProfile` with 10KB+ string, verify `.catch()` logs error and does NOT throw |
| Resume stored in local (not sync) | local storage routing | chrome.storage area check | After `saveResume()`, open DevTools → Application → Extension Storage → Local: verify `resume` key present; sync: verify absent |
| `getFillStatus` deferred until Phase 3 | session setAccessLevel | Not callable until background.js sets access level | Skip until Phase 3 background.js implemented |

---

## Validation Sign-Off

- [ ] All tasks have manual verify steps defined
- [ ] Sampling continuity: reload extension after each task
- [ ] Resume correctly routes to chrome.storage.local
- [ ] All write functions return Promises with .catch() handlers
- [ ] Session storage deferred dependency documented
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
