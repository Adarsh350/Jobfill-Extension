---
phase: 1
slug: project-scaffold-and-manifest
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-14
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Manual — no test framework (vanilla JS extension, no build tools) |
| **Config file** | none |
| **Quick run command** | `ls -la` (file existence checks via Bash/Glob) |
| **Full suite command** | Manual: Load Unpacked in Chrome, verify zero errors |
| **Estimated runtime** | ~30 seconds (manual load check) |

---

## Sampling Rate

- **After every task commit:** Check file existence with `ls` or `Glob`
- **After every plan wave:** Verify `manifest.json` is valid JSON with `node -e "JSON.parse(require('fs').readFileSync('manifest.json','utf8'))"`
- **Before `/gsd:verify-work`:** Full manual load check in Chrome required
- **Max feedback latency:** ~30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | What it creates | Automated Command | Status |
|---------|------|------|-----------------|-------------------|--------|
| 1-01-01 | 01 | 1 | Directory structure | `ls icons/ utils/ platforms/` | ⬜ pending |
| 1-01-02 | 01 | 1 | manifest.json | `node -e "JSON.parse(require('fs').readFileSync('manifest.json','utf8'))"` | ⬜ pending |
| 1-01-03 | 01 | 1 | PNG icon files | `ls icons/icon16.png icons/icon48.png icons/icon128.png` | ⬜ pending |
| 1-01-04 | 01 | 1 | Stub JS files (14 files) | `ls utils/*.js platforms/*.js content.js background.js popup.js` | ⬜ pending |
| 1-01-05 | 01 | 1 | popup.html | `grep -l "popup.js" popup.html` | ⬜ pending |
| 1-01-06 | 01 | 1 | Chrome load (UAT) | Manual | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

None — this is a scaffold phase. All verification is file-existence checks or JSON parse validation. No test framework installation needed.

---

## Manual-Only Verifications

| Behavior | Why Manual | Test Instructions |
|----------|------------|-------------------|
| Extension icon appears in Chrome toolbar | Requires Chrome browser interaction | 1. Open `chrome://extensions` 2. Enable Developer mode 3. Click Load Unpacked → select project root 4. Verify icon appears in toolbar |
| `chrome://extensions` shows zero errors | Requires Chrome browser | After loading, check for red error text under extension entry |
| Popup opens (blank is fine) | Requires Chrome browser | Click extension toolbar icon, verify popup.html renders |
| No CSP violations in DevTools | Requires browser DevTools | Open DevTools console while popup is open, verify no CSP errors |

---

## Validation Sign-Off

- [ ] All tasks have file-existence or JSON-parse verification
- [ ] manifest.json passes `JSON.parse` without errors
- [ ] All 14 stub JS files exist
- [ ] All 3 PNG icons exist and are valid binary files (not zero-byte)
- [ ] popup.html loads external JS only (no inline scripts)
- [ ] `nyquist_compliant: true` set in frontmatter after manual Chrome UAT passes

**Approval:** pending
